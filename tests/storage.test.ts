import { beforeEach, describe, expect, it } from "vitest";

/** A localStorage good enough to exercise the module, plus a failing variant. */
function fakeStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

let store = fakeStore();
// The module reads `window.localStorage` at call time, not import time.
(globalThis as unknown as { window: unknown }).window = {
  get localStorage() {
    return store;
  },
};

const { clearHistory, history, recordSecondOpinion, saveAttempt, trendFor } =
  await import("../web/src/storage.js");

function scorecard(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "s1",
    candidateName: "Test",
    answerScores: [
      {
        questionId: "q1",
        composite: 6,
        dimensionScores: [
          { dimension: "learning", value: 4, rationale: "", evidence: [] },
          { dimension: "ownership", value: 8, rationale: "", evidence: [] },
        ],
      },
      {
        questionId: "q2",
        composite: 5,
        dimensionScores: [
          { dimension: "learning", value: 6, rationale: "", evidence: [] },
          { dimension: "ownership", value: 8, rationale: "", evidence: [] },
        ],
      },
    ],
    competencyScores: [
      {
        competency: "be-real",
        pillar: "prioritize-people",
        value: 5.5,
        band: "",
        questionIds: ["q1"],
      },
    ],
    overall: 5.5,
    strengths: [],
    gaps: [],
    guidance: [],
    narrative: { headline: "A headline.", reads: [], oneThing: null },
    ...overrides,
  } as never;
}

const QUESTIONS = [
  {
    id: "q1",
    text: "Question one?",
    competency: "be-real",
    pillar: "p",
    askedBy: "cto",
    probes: [],
  },
  {
    id: "q2",
    text: "Question two?",
    competency: "be-real",
    pillar: "p",
    askedBy: "cto",
    probes: [],
  },
];

beforeEach(() => {
  store = fakeStore();
});

describe("saving an attempt", () => {
  it("averages each dimension across the answers, which is what a trend needs", () => {
    const entry = saveAttempt(scorecard(), QUESTIONS, "guide");

    expect(entry.dimensions).toContainEqual({ dimension: "learning", value: 5 });
    expect(entry.dimensions).toContainEqual({ dimension: "ownership", value: 8 });
  });

  it("keeps the question text, so an old attempt reads without the bank", () => {
    const entry = saveAttempt(scorecard(), QUESTIONS, "custom");
    expect(entry.questions.map((q) => q.text)).toEqual(["Question one?", "Question two?"]);
    expect(entry.kind).toBe("custom");
  });

  it("replaces a re-score of the same session rather than stacking it up", () => {
    saveAttempt(scorecard(), QUESTIONS, "guide");
    saveAttempt(scorecard({ overall: 7.1 }), QUESTIONS, "guide");

    expect(history()).toHaveLength(1);
    expect(history()[0]!.overall).toBe(7.1);
  });

  it("puts the newest attempt first", () => {
    saveAttempt(scorecard({ sessionId: "old" }), QUESTIONS, "guide");
    saveAttempt(scorecard({ sessionId: "new" }), QUESTIONS, "guide");

    expect(history().map((e) => e.id)).toEqual(["new", "old"]);
  });
});

describe("the second opinion", () => {
  it("attaches to the attempt it was run on", () => {
    saveAttempt(scorecard(), QUESTIONS, "guide");
    recordSecondOpinion("s1", 7.4);

    expect(history()[0]!.llmOverall).toBe(7.4);
  });

  it("ignores a session that is not in the history", () => {
    saveAttempt(scorecard(), QUESTIONS, "guide");
    recordSecondOpinion("nope", 7.4);

    expect(history()[0]!.llmOverall).toBeUndefined();
  });
});

describe("trends", () => {
  it("is null on one attempt, because one score is not a trend", () => {
    saveAttempt(scorecard(), QUESTIONS, "guide");
    expect(trendFor("learning")).toBeNull();
  });

  it("reads oldest first, so a line runs left to right in time", () => {
    saveAttempt(scorecard({ sessionId: "a" }), QUESTIONS, "guide");
    saveAttempt(
      scorecard({
        sessionId: "b",
        answerScores: [
          {
            questionId: "q1",
            composite: 8,
            dimensionScores: [{ dimension: "learning", value: 9, rationale: "", evidence: [] }],
          },
        ],
      }),
      QUESTIONS,
      "guide",
    );

    expect(trendFor("learning")).toEqual([5, 9]);
  });
});

describe("a hostile store", () => {
  it("survives junk under its key rather than taking the app down", () => {
    store._map.set("interview.history.v1", "{not json");
    expect(history()).toEqual([]);
  });

  it("survives a store that refuses to write, as in private browsing", () => {
    store.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => saveAttempt(scorecard(), QUESTIONS, "guide")).not.toThrow();
  });

  it("clears everything on request", () => {
    saveAttempt(scorecard(), QUESTIONS, "guide");
    clearHistory();
    expect(history()).toEqual([]);
  });
});
