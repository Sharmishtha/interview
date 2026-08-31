import { Hono } from "hono";
import type { Context } from "hono";
import { executivePanel, panelistById } from "../src/panel/panelist.js";
import { questionById, selectQuestions } from "../src/questions/bank.js";
import { competencies, pillars } from "../src/rubric/competencies.js";
import { dimensions } from "../src/rubric/dimensions.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { buildScorecard, scoreAnswers } from "../src/scoring/scorer.js";
import { synthesize } from "../src/tts/elevenlabs.js";
import { transcribe } from "../src/stt/elevenlabs.js";
import type { AnswerRecord, InterviewSession } from "../src/types.js";

export interface Env {
  ELEVENLABS_API_KEY?: string;
}

type Ctx = Context<{ Bindings: Env }>;

/**
 * Secrets arrive differently on each platform: bound to the request context on
 * Cloudflare Workers, and through the environment on Node.
 */
function apiKey(c: Ctx): string {
  const bound = c.env?.ELEVENLABS_API_KEY;
  if (bound) return bound;
  return typeof process !== "undefined" ? (process.env.ELEVENLABS_API_KEY ?? "") : "";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The API. Mounted by both the Node server and the Cloudflare Worker. */
export const app = new Hono<{ Bindings: Env }>();

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

    const result = await transcribe(
      apiKey(c),
      audio,
      c.req.header("content-type") ?? "audio/webm",
    );
    return c.json(result);
  } catch (error) {
    return c.json({ error: message(error) }, 502);
  }
});

/** Scores a completed set of answers and returns the scorecard. */
app.post("/api/score", async (c) => {
  try {
    const { candidateName, answers } = await c.req.json<{
      candidateName?: string;
      answers?: AnswerRecord[];
    }>();

    if (!Array.isArray(answers) || answers.length === 0) {
      return c.json({ error: "answers is required" }, 400);
    }

    const questions = answers
      .map((a) => questionById.get(a.questionId))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    if (questions.length !== answers.length) {
      return c.json({ error: "One or more answers reference an unknown question." }, 400);
    }

    const session: InterviewSession = {
      id: `session-${Date.now()}`,
      candidateName: candidateName?.trim() || "Practice run",
      panelists: executivePanel,
      questions,
      answers,
      startedAt: new Date().toISOString(),
    };

    const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
    return c.json(buildScorecard(session, answerScores));
  } catch (error) {
    return c.json({ error: message(error) }, 500);
  }
});

app.get("/api/health", (c) => c.json({ ok: true, elevenlabs: Boolean(apiKey(c)) }));
