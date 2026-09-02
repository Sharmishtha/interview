import { beforeEach, describe, expect, it, vi } from "vitest";

const parse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class AnthropicError extends Error {}
  class AuthenticationError extends AnthropicError {}
  class RateLimitError extends AnthropicError {}

  class Anthropic {
    messages = { parse };
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
  }

  return { default: Anthropic, AuthenticationError, RateLimitError };
});

import Anthropic from "@anthropic-ai/sdk";
import { questionById } from "../src/questions/bank.js";
import { dimensions } from "../src/rubric/dimensions.js";
import {
  LLM_EVALUATOR_MODEL,
  LlmEvaluatorError,
  llmEvaluatorFor,
  locateQuote,
} from "../src/scoring/llm-evaluator.js";
import type { DimensionId } from "../src/types.js";

const QUESTION = [...questionById.values()][0]!;

const ANSWER = [
  "When I joined Gracenote in 2021 the metadata pipeline was three days behind.",
  "Priya pushed back hard on rewriting it, and she was right about the risk.",
  "I moved us from 210 channels to 10,000 over nine months.",
].join(" ");

/** A complete, well-formed model response, with per-dimension overrides. */
function response(overrides: Partial<Record<DimensionId, unknown>> = {}, headline = "Good bones.") {
  return {
    parsed_output: {
      headline,
      scores: dimensions.map((dimension) => ({
        dimension: dimension.id,
        value: 7,
        rationale: `Rationale for ${dimension.id}.`,
        quotes: [],
        ...((overrides[dimension.id] as object | undefined) ?? {}),
      })),
    },
  };
}

function evaluator() {
  const built = llmEvaluatorFor("test-key");
  if (!built) throw new Error("expected an evaluator");
  return built;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("configuration", () => {
  it("is absent rather than broken when no key is set", () => {
    expect(llmEvaluatorFor(undefined)).toBeNull();
    expect(llmEvaluatorFor("   ")).toBeNull();
  });
});

describe("the request", () => {
  it("asks the pinned model for a schema-checked review of this question", async () => {
    parse.mockResolvedValue(response());
    await evaluator().evaluate(QUESTION, ANSWER);

    expect(parse).toHaveBeenCalledTimes(1);
    const params = parse.mock.calls[0]![0];
    expect(params.model).toBe(LLM_EVALUATOR_MODEL);
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.messages[0].role).toBe("user");
    expect(params.messages[0].content).toContain(ANSWER);
    expect(params.messages[0].content).toContain(QUESTION.text);
    // The system prompt has to name every dimension, or the model cannot return one.
    for (const dimension of dimensions) {
      expect(params.system).toContain(dimension.id);
    }
  });

  it("does not spend a call on an empty answer", async () => {
    await expect(evaluator().evaluate(QUESTION, "   ")).rejects.toThrow(LlmEvaluatorError);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("evidence spans", () => {
  it("locates a verbatim quote so the span indexes back into the answer", async () => {
    parse.mockResolvedValue(
      response({ specificity: { quotes: ["When I joined Gracenote in 2021"] } }),
    );

    const scores = await evaluator().evaluate(QUESTION, ANSWER);
    const [span] = scores.find((s) => s.dimension === "specificity")!.evidence;

    expect(span).toBeDefined();
    expect(ANSWER.slice(span!.start, span!.end)).toBe(span!.text);
    expect(span!.text).toBe("When I joined Gracenote in 2021");
  });

  it("holds the slice invariant for every dimension of every score", async () => {
    parse.mockResolvedValue(
      response(
        Object.fromEntries(
          dimensions.map((d) => [d.id, { quotes: ["Priya pushed back hard", "210 channels"] }]),
        ) as Partial<Record<DimensionId, unknown>>,
      ),
    );

    const scores = await evaluator().evaluate(QUESTION, ANSWER);
    for (const score of scores) {
      expect(score.evidence.length).toBeGreaterThan(0);
      for (const span of score.evidence) {
        expect(ANSWER.slice(span.start, span.end)).toBe(span.text);
      }
    }
  });

  it("forgives re-wrapped whitespace but keeps the answer's own text", () => {
    const answer = "I moved us\n  from 210 channels   to 10,000.";
    const span = locateQuote(answer, "from 210 channels to 10,000");

    expect(span).not.toBeNull();
    expect(answer.slice(span!.start, span!.end)).toBe(span!.text);
    expect(span!.text).toBe("from 210 channels   to 10,000");
  });

  it("drops a quote the candidate never said, and says which", async () => {
    parse.mockResolvedValue(
      response({
        memorability: { quotes: ["I doubled revenue in a quarter", "Priya pushed back hard"] },
      }),
    );

    const review = await evaluator().review(QUESTION, ANSWER);
    const memorability = review.dimensionScores.find((s) => s.dimension === "memorability")!;

    expect(memorability.evidence).toHaveLength(1);
    expect(memorability.evidence[0]!.text).toBe("Priya pushed back hard");
    expect(review.unverifiedQuotes).toEqual(["I doubled revenue in a quarter"]);
  });

  it("refuses a paraphrase, which is the fabrication that reads as plausible", () => {
    expect(locateQuote(ANSWER, "Priya disagreed with the rewrite")).toBeNull();
  });
});

describe("the returned scores", () => {
  it("returns every dimension, in rubric order, so the composite is complete", async () => {
    parse.mockResolvedValue(response());
    const scores = await evaluator().evaluate(QUESTION, ANSWER);

    expect(scores.map((s) => s.dimension)).toEqual(dimensions.map((d) => d.id));
  });

  it("rejects a partial response rather than silently deflating the composite", async () => {
    const partial = response();
    partial.parsed_output.scores = partial.parsed_output.scores.slice(1);
    parse.mockResolvedValue(partial);

    await expect(evaluator().evaluate(QUESTION, ANSWER)).rejects.toThrow(/did not score/i);
  });

  it("clamps a score that lands outside the scale", async () => {
    parse.mockResolvedValue(response({ ownership: { value: 14 }, learning: { value: -3 } }));
    const scores = await evaluator().evaluate(QUESTION, ANSWER);

    expect(scores.find((s) => s.dimension === "ownership")!.value).toBe(10);
    expect(scores.find((s) => s.dimension === "learning")!.value).toBe(0);
  });

  it("carries the plain-language headline through for the report", async () => {
    parse.mockResolvedValue(
      response({}, "  Your Gracenote story was the strongest of the three. "),
    );
    const review = await evaluator().review(QUESTION, ANSWER);

    expect(review.headline).toBe("Your Gracenote story was the strongest of the three.");
  });
});

describe("failures", () => {
  it("reports a rejected key in words a user can act on", async () => {
    parse.mockRejectedValue(new Anthropic.AuthenticationError("401"));
    await expect(evaluator().evaluate(QUESTION, ANSWER)).rejects.toThrow(/key was rejected/i);
  });

  it("distinguishes rate limiting, which is worth retrying", async () => {
    parse.mockRejectedValue(new Anthropic.RateLimitError("429"));
    await expect(evaluator().evaluate(QUESTION, ANSWER)).rejects.toThrow(/rate limited/i);
  });

  it("does not pass off an unparseable response as a score", async () => {
    parse.mockResolvedValue({ parsed_output: null });
    await expect(evaluator().evaluate(QUESTION, ANSWER)).rejects.toThrow(/score schema/i);
  });
});
