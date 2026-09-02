import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { competencyById } from "../rubric/competencies.js";
import { dimensions } from "../rubric/dimensions.js";
import type { DimensionId, DimensionScore, EvidenceSpan, InterviewQuestion } from "../types.js";
import type { Evaluator } from "./evaluator.js";

/**
 * The paid evaluator. Where {@link HeuristicEvaluator} matches patterns, this one
 * reads the answer and judges it against the same eight dimensions, so the two
 * can be shown side by side and disagree in public.
 *
 * The contract the heuristic evaluator holds itself to holds here too: every
 * score cites spans, and `answer.slice(span.start, span.end) === span.text` for
 * each one. A model cannot count characters reliably, so it is asked for
 * *quotations* and this module locates them. A quotation that is not in the
 * answer is dropped rather than trusted - the model does not get to invent
 * evidence, even by paraphrase.
 */

/** Kept here rather than in an env var: changing the judge changes the scores. */
export const LLM_EVALUATOR_MODEL = "claude-opus-5";

export class LlmEvaluatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmEvaluatorError";
  }
}

// ---------------------------------------------------------------------------
// The shape we ask the model for
// ---------------------------------------------------------------------------

const dimensionIds = dimensions.map((d) => d.id) as [DimensionId, ...DimensionId[]];

const reviewSchema = z.object({
  headline: z
    .string()
    .describe(
      "One or two sentences to the candidate, in plain English, naming the single thing that most held this answer back. No rubric jargon.",
    ),
  scores: z
    .array(
      z.object({
        dimension: z.enum(dimensionIds),
        value: z.number().min(0).max(10).describe("0 to 10. Half points are fine."),
        rationale: z
          .string()
          .describe("One sentence on why this score and not one point higher or lower."),
        quotes: z
          .array(z.string())
          .describe(
            "Up to three passages copied VERBATIM from the answer, character for character, that this score rests on. Copy, never paraphrase or tidy. Empty if the answer contains nothing to cite - which is itself evidence for a low score.",
          ),
      }),
    )
    .describe("Exactly one entry per dimension, in the order the dimensions were listed."),
});

type Review = z.infer<typeof reviewSchema>;

/** What the evaluator produces before it is narrowed to the `Evaluator` contract. */
export interface LlmReview {
  dimensionScores: DimensionScore[];
  /** Plain-language summary, used by the report's coaching panel. */
  headline: string;
  /** Quotations the model supplied that are not actually in the answer. */
  unverifiedQuotes: string[];
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = [
  "You are assessing a rehearsal answer from someone practising for a VP of Engineering interview at a public company. The panel is a CTO and a CEO.",
  "",
  "You are not deciding whether to hire anyone. Nobody is being screened, ranked against another candidate, or reported on to an employer. Your only job is to help this person tell a better story next time.",
  "",
  "Score the answer on each of these dimensions, 0 to 10:",
  ...dimensions.map((d) => `- ${d.id} (${d.name}): ${d.description}`),
  "",
  "Anchors, so scores mean the same thing every time:",
  "- 0-2: the dimension is absent.",
  "- 3-4: gestured at, unevidenced.",
  "- 5-6: present but generic - true of many candidates.",
  "- 7-8: clearly evidenced and specific to this person.",
  "- 9-10: the answer an interviewer repeats to a colleague afterwards.",
  "",
  "Be a hard marker. A fluent answer with no numbers, no named situation and no learning is a 4, not a 7. Length is not evidence.",
  "",
  "Every quote must be copied from the answer character for character, including its punctuation and capitalisation. Do not repair grammar, expand contractions, or join two separate passages with an ellipsis. A quote that does not appear verbatim in the answer is discarded and your score loses its support.",
].join("\n");

function userPrompt(question: InterviewQuestion, answer: string): string {
  const competency = competencyById.get(question.competency);
  const parts = [
    `Question asked: ${question.text}`,
    `Competency under assessment: ${competency?.name ?? question.competency}`,
  ];

  if (competency) {
    parts.push(
      "",
      "What an interviewer is listening for:",
      ...competency.positiveSignals.map((signal) => `- ${signal}`),
      "",
      "What counts against the answer:",
      ...competency.negativeSignals.map((signal) => `- ${signal}`),
    );
  }

  parts.push("", "The answer, verbatim:", "<answer>", answer, "</answer>");
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Locating quotations in the answer
// ---------------------------------------------------------------------------

/**
 * Finds a quotation in the answer and returns it as a span.
 *
 * Tries an exact match first. Failing that, it matches with whitespace collapsed
 * and case ignored, because a model re-wrapping a long quotation across lines is
 * a formatting artefact rather than a fabrication. Anything looser than that is
 * refused: the span must be text the candidate actually said.
 */
export function locateQuote(answer: string, quote: string): EvidenceSpan | null {
  const needle = quote.trim();
  if (!needle) return null;

  const exact = answer.indexOf(needle);
  if (exact !== -1) return { start: exact, end: exact + needle.length, text: needle };

  const { normalized, offsets } = normalizeWithOffsets(answer);
  const target = normalizeWithOffsets(needle).normalized;
  if (!target) return null;

  const at = normalized.indexOf(target);
  if (at === -1) return null;

  const start = offsets[at]!;
  const end = offsets[at + target.length - 1]! + 1;
  return { start, end, text: answer.slice(start, end) };
}

/** Lower-cased with runs of whitespace collapsed, plus each character's index in the original. */
function normalizeWithOffsets(text: string): { normalized: string; offsets: number[] } {
  let normalized = "";
  const offsets: number[] = [];
  let inWhitespace = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (/\s/.test(char)) {
      if (inWhitespace || normalized.length === 0) continue;
      normalized += " ";
      offsets.push(i);
      inWhitespace = true;
    } else {
      normalized += char.toLowerCase();
      offsets.push(i);
      inWhitespace = false;
    }
  }

  // A trailing space would never be part of a match anyway, and dropping it
  // keeps `offsets` aligned with `normalized`.
  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    offsets.pop();
  }

  return { normalized, offsets };
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export class LlmEvaluator implements Evaluator {
  readonly name = `llm:${LLM_EVALUATOR_MODEL}`;

  /**
   * Nothing. A model reading the answer judges story shape and memorability the
   * way the rubric means them, which is the reason this evaluator exists - not
   * a claim that it is right, only that it is not standing in for a reader.
   */
  readonly approximates = [] as const;

  constructor(private readonly client: Anthropic) {}

  async evaluate(question: InterviewQuestion, answer: string): Promise<DimensionScore[]> {
    return (await this.review(question, answer)).dimensionScores;
  }

  /** The full result, including the narrative the report shows above the numbers. */
  async review(question: InterviewQuestion, answer: string): Promise<LlmReview> {
    if (!answer.trim()) {
      throw new LlmEvaluatorError("There is no answer to score.");
    }

    let parsed: Review | null;
    try {
      const response = await this.client.messages.parse({
        model: LLM_EVALUATOR_MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt(question, answer) }],
        output_config: {
          // Judging an answer is worth reasoning about; it is not worth `high`.
          effort: "medium",
          format: zodOutputFormat(reviewSchema),
        },
      });
      parsed = response.parsed_output;
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LlmEvaluatorError("The Anthropic API key was rejected.");
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new LlmEvaluatorError("The evaluator is rate limited. Try again in a moment.");
      }
      throw new LlmEvaluatorError(
        `The evaluator could not be reached: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!parsed) {
      throw new LlmEvaluatorError("The evaluator returned nothing that matched the score schema.");
    }

    return toReview(parsed, answer);
  }
}

function toReview(parsed: Review, answer: string): LlmReview {
  const byDimension = new Map(parsed.scores.map((score) => [score.dimension, score]));
  const unverifiedQuotes: string[] = [];

  // Driven by `dimensions` rather than by the response, so a missing dimension
  // is an error rather than a silently deflated composite - the composite is a
  // weighted sum and an absent dimension would just remove its weight.
  const dimensionScores = dimensions.map((dimension) => {
    const score = byDimension.get(dimension.id);
    if (!score) {
      throw new LlmEvaluatorError(`The evaluator did not score ${dimension.name}.`);
    }

    const evidence: EvidenceSpan[] = [];
    for (const quote of score.quotes.slice(0, 3)) {
      const span = locateQuote(answer, quote);
      if (span) evidence.push(span);
      else unverifiedQuotes.push(quote);
    }

    return {
      dimension: dimension.id,
      value: round(Math.min(10, Math.max(0, score.value))),
      rationale: score.rationale.trim(),
      evidence,
    };
  });

  return { dimensionScores, headline: parsed.headline.trim(), unverifiedQuotes };
}

/**
 * Builds an evaluator, or returns null when no key is configured. Returning null
 * rather than throwing lets the server advertise the feature as unavailable
 * instead of failing a request the user did not ask to make.
 */
export function llmEvaluatorFor(apiKey: string | undefined): LlmEvaluator | null {
  if (!apiKey?.trim()) return null;
  return new LlmEvaluator(new Anthropic({ apiKey }));
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
