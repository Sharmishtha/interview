import { beforeEach, describe, expect, it, vi } from "vitest";

const parse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class AnthropicError extends Error {}
  class Anthropic {
    messages = { parse };
    static AuthenticationError = class extends AnthropicError {};
    static RateLimitError = class extends AnthropicError {};
  }
  return {
    default: Anthropic,
    AuthenticationError: AnthropicError,
    RateLimitError: AnthropicError,
  };
});

const { app } = await import("../server/app.js");
const { questionById } = await import("../src/questions/bank.js");
const { dimensions } = await import("../src/rubric/dimensions.js");

const BANK_ID = [...questionById.keys()][0]!;

const ANSWER =
  "At Gracenote in 2021 I owned 40 engineers and moved us from 210 channels to 10,000 in nine months. Priya pushed back and she was right. What I learned was to size the smallest fix first.";

/** A well-formed model response, so a permitted request gets all the way through. */
function modelReply() {
  return {
    parsed_output: {
      headline: "A headline.",
      scores: dimensions.map((d) => ({
        dimension: d.id,
        value: 7,
        rationale: "Because.",
        quotes: [],
      })),
    },
  };
}

function post(path: string, body: unknown, env: Record<string, string>) {
  return app.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const CUSTOM = {
  id: "custom-abc",
  text: "Tell me about a time you shut down a project your team believed in.",
  competency: "act-with-courage",
  askedBy: "ceo",
};

const KEYED = { ANTHROPIC_API_KEY: "sk-ant-test" };
const OFFERED = { ...KEYED, SECOND_OPINION: "on" };

beforeEach(() => {
  vi.clearAllMocks();
  parse.mockResolvedValue(modelReply());
});

describe("what /api/health advertises", () => {
  it("separates model scoring from the paid panel", async () => {
    const body = await (
      await app.fetch(new Request("http://localhost/api/health"), OFFERED)
    ).json();
    expect(body).toMatchObject({ llmScoring: true, secondOpinion: true });
  });

  it("keeps the panel off where the flag is not set, even with a key", async () => {
    const body = await (await app.fetch(new Request("http://localhost/api/health"), KEYED)).json();
    expect(body).toMatchObject({ llmScoring: true, secondOpinion: false });
  });

  it("fails closed on a value that is not exactly on", async () => {
    for (const value of ["ON", "true", "yes", "1", " on", ""]) {
      const env = { ...KEYED, SECOND_OPINION: value };
      const body = await (await app.fetch(new Request("http://localhost/api/health"), env)).json();
      expect(body.secondOpinion, `SECOND_OPINION=${JSON.stringify(value)}`).toBe(false);
    }
  });
});

describe("the second opinion, with the panel switched off", () => {
  it("refuses a bank interview, because posting to a route needs no button", async () => {
    const response = await post(
      "/api/score/llm",
      { answers: [{ questionId: BANK_ID, answer: ANSWER, turns: [] }] },
      KEYED,
    );

    expect(response.status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("still scores a question the candidate wrote, which is a different feature", async () => {
    const response = await post(
      "/api/score/llm",
      {
        answers: [{ questionId: CUSTOM.id, answer: ANSWER, turns: [] }],
        customQuestions: [CUSTOM],
      },
      KEYED,
    );

    expect(response.status).toBe(200);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("refuses a bank question smuggled in beside a custom one", async () => {
    const response = await post(
      "/api/score/llm",
      {
        answers: [
          { questionId: CUSTOM.id, answer: ANSWER, turns: [] },
          { questionId: BANK_ID, answer: ANSWER, turns: [] },
        ],
        customQuestions: [CUSTOM],
      },
      KEYED,
    );

    expect(response.status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("the second opinion, with the panel switched on", () => {
  it("scores a bank interview", async () => {
    const response = await post(
      "/api/score/llm",
      { answers: [{ questionId: BANK_ID, answer: ANSWER, turns: [] }] },
      OFFERED,
    );

    expect(response.status).toBe(200);
  });
});

describe("with no key at all", () => {
  it("spends nothing and says so, flag or no flag", async () => {
    const response = await post(
      "/api/score/llm",
      { answers: [{ questionId: BANK_ID, answer: ANSWER, turns: [] }] },
      { SECOND_OPINION: "on" },
    );

    expect(response.status).toBe(503);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("the free scorecard", () => {
  it("is unaffected by any of this and needs no key", async () => {
    const response = await post(
      "/api/score",
      { answers: [{ questionId: BANK_ID, answer: ANSWER, turns: [] }] },
      {},
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.evaluatedBy.name).toBe("heuristic");
    expect(body.guidance[0].rubric).toHaveLength(dimensions.length);
  });
});
