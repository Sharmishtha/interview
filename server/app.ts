import { Hono } from "hono";
import type { Context } from "hono";
import { executivePanel, panelistById } from "../src/panel/panelist.js";
import { questionById, selectQuestions } from "../src/questions/bank.js";
import { createCustomQuestion, CustomQuestionError } from "../src/questions/custom.js";
import { competencies, pillars } from "../src/rubric/competencies.js";
import { dimensions } from "../src/rubric/dimensions.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { llmEvaluatorFor, LlmEvaluatorError } from "../src/scoring/llm-evaluator.js";
import { buildScorecard, compositeFor, scoreAnswers } from "../src/scoring/scorer.js";
import { synthesize } from "../src/tts/elevenlabs.js";
import { transcribe } from "../src/stt/elevenlabs.js";
import type {
  AnswerRecord,
  CompetencyId,
  InterviewQuestion,
  InterviewSession,
} from "../src/types.js";

export interface Env {
  ELEVENLABS_API_KEY?: string;
  /** Enables LLM scoring at all. Absent means no request ever leaves for a model. */
  ANTHROPIC_API_KEY?: string;
  /**
   * Whether the paid "second opinion" is offered on this deployment. "off"
   * anywhere but the exact string "on" - so a missing or misspelt value fails
   * closed rather than quietly enabling a thing that costs money.
   */
  SECOND_OPINION?: string;
  /**
   * Whether the sponsor slot exists on this deployment at all. "off" anywhere
   * but the exact string "on", so it fails closed like SECOND_OPINION.
   */
  SPONSOR_SLOT?: string;
  /**
   * The sponsor itself, as JSON: {"title","body","url","linkText"}. Ignored
   * entirely unless SPONSOR_SLOT is on.
   */
  SPONSOR?: string;
  /** When set, the whole app sits behind a password. See server/gate.ts. */
  APP_PASSWORD?: string;
  /** Cloudflare static assets binding. Absent under Node. */
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

type Ctx = Context<{ Bindings: Env }>;

/**
 * Secrets arrive differently on each platform: bound to the request context on
 * Cloudflare Workers, and through the environment on Node.
 */
type EnvName =
  "ELEVENLABS_API_KEY" | "ANTHROPIC_API_KEY" | "SECOND_OPINION" | "SPONSOR_SLOT" | "SPONSOR";

function secret(c: Ctx, name: EnvName): string {
  const bound = c.env?.[name];
  if (bound) return bound;
  return typeof process !== "undefined" ? (process.env[name] ?? "") : "";
}

function apiKey(c: Ctx): string {
  return secret(c, "ELEVENLABS_API_KEY");
}

/**
 * Whether this deployment offers the model evaluator.
 *
 * Two conditions, both required. No ANTHROPIC_API_KEY means no model call can
 * happen at all. SECOND_OPINION anything but the exact string "on" means the
 * deployment has a key but does not offer the feature - production ships that
 * way, so a key can sit there for staging parity without putting a paid button
 * in front of anyone.
 *
 * Nothing else reaches a model. Every answer is scored by the free evaluator
 * first; this is the second step, and it only happens when someone asks for it.
 */
function secondOpinionOffered(c: Ctx): boolean {
  return Boolean(secret(c, "ANTHROPIC_API_KEY")) && secret(c, "SECOND_OPINION") === "on";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The API. Mounted by both the Node server and the Cloudflare Worker. */
export const app = new Hono<{ Bindings: Env }>();

export interface Sponsor {
  title: string;
  body: string;
  url?: string;
  linkText?: string;
}

/**
 * The sponsor, if this deployment has the slot switched on and something valid
 * to put in it.
 *
 * Two conditions on purpose. The flag is the product decision - does this
 * deployment carry sponsorship at all - and it is reviewable in a diff because
 * it lives in wrangler.toml. The content is a secret that can change without a
 * deploy. Either missing means the slot does not render, and there is no state
 * in which an empty advertisement frame appears.
 */
function sponsorFor(c: Ctx): Sponsor | null {
  if (secret(c, "SPONSOR_SLOT") !== "on") return null;
  return sponsorFrom(secret(c, "SPONSOR"));
}

/**
 * Parses the configured sponsor, or returns null.
 *
 * Everything is validated and length-capped here rather than trusted: this is
 * the one string in the app that a third party's copy ends up inside, and the
 * slot is meant to stay a small quiet box. A URL must be http(s) - a `javascript:`
 * or `data:` href in a link the page renders is the obvious way this goes wrong.
 */
function sponsorFrom(raw: string): Sponsor | null {
  if (!raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Sponsor>;
    const title = String(parsed.title ?? "").trim();
    const body = String(parsed.body ?? "").trim();
    if (!title || !body) return null;

    let url: string | undefined;
    if (parsed.url) {
      const candidate = new URL(String(parsed.url));
      if (candidate.protocol !== "https:" && candidate.protocol !== "http:") return null;
      url = candidate.toString();
    }

    return {
      title: title.slice(0, 60),
      body: body.slice(0, 160),
      url,
      linkText: parsed.linkText ? String(parsed.linkText).trim().slice(0, 30) : undefined,
    };
  } catch {
    // Malformed JSON or an unparseable URL. A broken sponsor shows nothing,
    // which is the right failure: the app is not about the box.
    return null;
  }
}

/** The interview to run: panel, questions, and the rubric it will be scored against. */
app.get("/api/interview", (c) => {
  // The guide's process: one top-line question per pillar.
  const seed = Number(c.req.query("seed") ?? Date.now());
  // ?intensity=pressure draws the harder failure-owning variants instead.
  const requested = c.req.query("intensity");
  const intensity =
    requested === "pressure" || requested === "mixed" ? requested : ("guide" as const);

  return c.json({
    panelists: executivePanel,
    questions: selectQuestions(Number.isFinite(seed) ? seed : Date.now(), intensity),
    rubric: {
      pillars,
      competencies: competencies.map(({ id, name, pillar, description, positiveSignals }) => ({
        id,
        name,
        pillar,
        description,
        positiveSignals,
      })),
      dimensions,
    },
    sponsor: sponsorFor(c),
  });
});

/** Speaks a panelist's line. The API key stays here and never reaches the browser. */
app.post("/api/tts", async (c) => {
  try {
    const { text, panelistId } = await c.req.json<{ text?: string; panelistId?: string }>();
    if (!text?.trim()) {
      return c.json({ error: "text is required" }, 400);
    }

    const audio = await synthesize(
      apiKey(c),
      text,
      panelistId ? panelistById.get(panelistId)?.voiceId : undefined,
    );

    return c.body(audio as unknown as ArrayBuffer, 200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    });
  } catch (error) {
    return c.json({ error: message(error) }, 502);
  }
});

/** Transcribes a recorded answer. Body is the raw audio blob from MediaRecorder. */
app.post("/api/stt", async (c) => {
  try {
    const audio = new Uint8Array(await c.req.arrayBuffer());
    if (audio.length === 0) {
      return c.json({ error: "Expected a non-empty audio body." }, 400);
    }

    const result = await transcribe(apiKey(c), audio, c.req.header("content-type") ?? "audio/webm");
    return c.json(result);
  } catch (error) {
    return c.json({ error: message(error) }, 502);
  }
});

/** A request body rejected before any scoring happens. */
interface Refusal {
  error: string;
  status: 400;
}

interface ScoreRequest {
  candidateName?: string;
  answers?: AnswerRecord[];
  /** Questions the candidate wrote, which the bank has never heard of. */
  customQuestions?: InterviewQuestion[];
}

/**
 * Rebuilds the session a scoring request describes. Shared by both evaluators so
 * they score exactly the same thing and can be compared honestly.
 */
function sessionFrom(body: ScoreRequest): InterviewSession | Refusal {
  const { candidateName, answers, customQuestions } = body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return { error: "answers is required", status: 400 };
  }

  // A custom question is rebuilt here rather than trusted as sent: the client
  // could otherwise post arbitrary text as a question and have it scored.
  const custom = new Map<string, InterviewQuestion>();
  for (const supplied of customQuestions ?? []) {
    try {
      const rebuilt = createCustomQuestion({
        text: supplied?.text ?? "",
        competency: supplied?.competency,
        askedBy: supplied?.askedBy,
        id: supplied?.id,
      });
      custom.set(rebuilt.id, rebuilt);
    } catch (error) {
      if (error instanceof CustomQuestionError) {
        return { error: error.message, status: 400 };
      }
      throw error;
    }
  }

  const questions = answers
    .map((a) => questionById.get(a.questionId) ?? custom.get(a.questionId))
    .filter((q): q is InterviewQuestion => Boolean(q));

  if (questions.length !== answers.length) {
    return { error: "One or more answers reference an unknown question.", status: 400 };
  }

  return {
    id: `session-${Date.now()}`,
    candidateName: candidateName?.trim() || "Practice run",
    panelists: executivePanel,
    questions,
    answers,
    startedAt: new Date().toISOString(),
  };
}

function isRefusal(result: InterviewSession | Refusal): result is Refusal {
  return "error" in result;
}

/** Scores a completed set of answers and returns the scorecard. */
app.post("/api/score", async (c) => {
  try {
    const session = sessionFrom(await c.req.json<ScoreRequest>());
    if (isRefusal(session)) return c.json({ error: session.error }, session.status);

    const evaluator = new HeuristicEvaluator();
    const answerScores = await scoreAnswers(session, evaluator);
    return c.json(buildScorecard(session, answerScores, evaluator));
  } catch (error) {
    return c.json({ error: message(error) }, 500);
  }
});

/**
 * The second opinion: the same answers, scored by a model reading them rather
 * than by pattern matching. Kept on its own route because it costs money and is
 * slow, so it happens only when the candidate asks for it.
 */
app.post("/api/score/llm", async (c) => {
  // Checked before the body is even read. Hiding a button stops nobody from
  // posting to a route, so the switch has to live here.
  if (!secondOpinionOffered(c)) {
    return c.json({ error: "The second opinion is not available on this deployment." }, 503);
  }

  const evaluator = llmEvaluatorFor(secret(c, "ANTHROPIC_API_KEY"));
  if (!evaluator) {
    return c.json({ error: "Model scoring is not configured on this deployment." }, 503);
  }

  try {
    const session = sessionFrom(await c.req.json<ScoreRequest>());
    if (isRefusal(session)) return c.json({ error: session.error }, session.status);

    const byId = new Map(session.questions.map((q) => [q.id, q]));
    const reviews = await Promise.all(
      session.answers.map(async (record) => ({
        record,
        review: await evaluator.review(byId.get(record.questionId)!, record.answer),
      })),
    );

    const answerScores = reviews.map(({ record, review }) => ({
      questionId: record.questionId,
      dimensionScores: review.dimensionScores,
      composite: compositeFor(review.dimensionScores),
    }));

    return c.json({
      ...buildScorecard(session, answerScores, evaluator),
      evaluator: evaluator.name,
      headlines: reviews.map(({ record, review }) => ({
        questionId: record.questionId,
        headline: review.headline,
        // Surfaced rather than hidden: a model quoting words the candidate did
        // not say is the failure mode worth knowing about.
        unverifiedQuotes: review.unverifiedQuotes,
      })),
    });
  } catch (error) {
    if (error instanceof LlmEvaluatorError) {
      return c.json({ error: error.message }, 502);
    }
    return c.json({ error: message(error) }, 500);
  }
});

/**
 * Builds a one-question interview from something the candidate wrote, for
 * rehearsing a specific question they expect to be asked.
 */
app.post("/api/custom-question", async (c) => {
  try {
    const { text, competency, askedBy } = await c.req.json<{
      text?: string;
      competency?: string;
      askedBy?: string;
    }>();

    // No default principle. The same answer reads differently depending on what
    // the interviewer was listening for, so picking one on the candidate's
    // behalf would silently score them against a rubric they did not choose.
    if (!competency) {
      return c.json(
        { error: "Choose which principle this question should be scored against." },
        400,
      );
    }

    const question = createCustomQuestion({
      text: text ?? "",
      competency: competency as CompetencyId,
      askedBy,
    });

    return c.json({
      panelists: executivePanel,
      questions: [question],
      rubric: {
        pillars,
        competencies: competencies.map(({ id, name, pillar, description, positiveSignals }) => ({
          id,
          name,
          pillar,
          description,
          positiveSignals,
        })),
        dimensions,
      },
      sponsor: sponsorFor(c),
    });
  } catch (error) {
    if (error instanceof CustomQuestionError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: message(error) }, 500);
  }
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    elevenlabs: Boolean(apiKey(c)),
    /** Whether the second-opinion button is offered. The UI hides it otherwise. */
    secondOpinion: secondOpinionOffered(c),
    /** Null on every deployment until SPONSOR is set. */
    sponsor: sponsorFor(c),
  }),
);
