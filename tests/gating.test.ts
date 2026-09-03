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
  it("offers the second opinion only with a key and the flag on", async () => {
    const body = await (
      await app.fetch(new Request("http://localhost/api/health"), OFFERED)
    ).json();
    expect(body.secondOpinion).toBe(true);
  });

  it("keeps it off where the flag is not set, even with a key", async () => {
    const body = await (await app.fetch(new Request("http://localhost/api/health"), KEYED)).json();
    expect(body.secondOpinion).toBe(false);
  });

  it("fails closed on a value that is not exactly on", async () => {
    for (const value of ["ON", "true", "yes", "1", " on", ""]) {
      const env = { ...KEYED, SECOND_OPINION: value };
      const body = await (await app.fetch(new Request("http://localhost/api/health"), env)).json();
      expect(body.secondOpinion, `SECOND_OPINION=${JSON.stringify(value)}`).toBe(false);
    }
  });
});

describe("with the second opinion switched off", () => {
  it("refuses a bank interview, because posting to a route needs no button", async () => {
    const response = await post(
      "/api/score/llm",
      { answers: [{ questionId: BANK_ID, answer: ANSWER, turns: [] }] },
      KEYED,
    );

    expect(response.status).toBe(503);
    expect(parse).not.toHaveBeenCalled();
  });

  it("refuses a custom question too - it is one button, not a back door", async () => {
    const response = await post(
      "/api/score/llm",
      {
        answers: [{ questionId: CUSTOM.id, answer: ANSWER, turns: [] }],
        customQuestions: [CUSTOM],
      },
      KEYED,
    );

    expect(response.status).toBe(503);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("with the second opinion switched on", () => {
  it("scores a bank interview", async () => {
    const response = await post(
      "/api/score/llm",
      { answers: [{ questionId: BANK_ID, answer: ANSWER, turns: [] }] },
      OFFERED,
    );

    expect(response.status).toBe(200);
  });

  it("scores a question the candidate wrote", async () => {
    const response = await post(
      "/api/score/llm",
      {
        answers: [{ questionId: CUSTOM.id, answer: ANSWER, turns: [] }],
        customQuestions: [CUSTOM],
      },
      OFFERED,
    );

    expect(response.status).toBe(200);
    expect(parse).toHaveBeenCalledTimes(1);
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
  it("is the default for every answer, needs no key, and is unaffected by the flag", async () => {
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

  it("scores a question the candidate wrote, with no model anywhere near it", async () => {
    const response = await post(
      "/api/score",
      {
        answers: [{ questionId: CUSTOM.id, answer: ANSWER, turns: [] }],
        customQuestions: [CUSTOM],
      },
      {},
    );

    expect(response.status).toBe(200);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("the sponsor slot", () => {
  const health = async (env: Record<string, string>) =>
    (await app.fetch(new Request("http://localhost/api/health"), env)).json();

  const ON = { SPONSOR_SLOT: "on" };

  const COPY = JSON.stringify({
    title: "Rehearsal Room Weekly",
    body: "One question, broken down, every Thursday.",
  });

  it("is absent by default, so no empty advertisement frame is ever shown", async () => {
    expect((await health({})).sponsor).toBeNull();
  });

  it("stays off when the flag is off, however good the copy is", async () => {
    expect((await health({ SPONSOR: COPY })).sponsor).toBeNull();
    expect((await health({ SPONSOR: COPY, SPONSOR_SLOT: "off" })).sponsor).toBeNull();
  });

  it("fails closed on a flag value that is not exactly on", async () => {
    for (const value of ["ON", "true", "yes", "1", " on", ""]) {
      const body = await health({ SPONSOR: COPY, SPONSOR_SLOT: value });
      expect(body.sponsor, `SPONSOR_SLOT=${JSON.stringify(value)}`).toBeNull();
    }
  });

  it("renders nothing when the flag is on but there is no copy", async () => {
    expect((await health(ON)).sponsor).toBeNull();
  });

  it("carries a well-formed sponsor through", async () => {
    const body = await health({
      ...ON,
      SPONSOR: JSON.stringify({
        title: "Rehearsal Room Weekly",
        body: "One question, broken down, every Thursday.",
        url: "https://example.com/x",
        linkText: "See a sample",
      }),
    });

    expect(body.sponsor).toMatchObject({
      title: "Rehearsal Room Weekly",
      url: "https://example.com/x",
      linkText: "See a sample",
    });
  });

  it("refuses a javascript: href, which is how a text slot becomes an exploit", async () => {
    const body = await health({
      ...ON,
      SPONSOR: JSON.stringify({ title: "T", body: "B", url: "javascript:alert(1)" }),
    });

    expect(body.sponsor).toBeNull();
  });

  it("refuses data: and other schemes for the same reason", async () => {
    for (const url of ["data:text/html,<script>", "file:///etc/passwd", "not-a-url"]) {
      const body = await health({ ...ON, SPONSOR: JSON.stringify({ title: "T", body: "B", url }) });
      expect(body.sponsor, url).toBeNull();
    }
  });

  it("shows nothing rather than something broken when the JSON is malformed", async () => {
    expect((await health({ ...ON, SPONSOR: "{not json" })).sponsor).toBeNull();
    expect((await health({ ...ON, SPONSOR: "   " })).sponsor).toBeNull();
    expect(
      (await health({ ...ON, SPONSOR: JSON.stringify({ title: "only a title" }) })).sponsor,
    ).toBeNull();
  });

  it("caps the copy, so the slot cannot grow into a billboard", async () => {
    const body = await health({
      ...ON,
      SPONSOR: JSON.stringify({ title: "T".repeat(500), body: "B".repeat(900) }),
    });

    expect(body.sponsor.title).toHaveLength(60);
    expect(body.sponsor.body).toHaveLength(160);
  });

  it("is fine without a link at all", async () => {
    const body = await health({
      ...ON,
      SPONSOR: JSON.stringify({ title: "T", body: "Body text here." }),
    });
    expect(body.sponsor).toMatchObject({ title: "T" });
    expect(body.sponsor.url).toBeUndefined();
  });
});
