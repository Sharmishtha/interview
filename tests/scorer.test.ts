import { describe, expect, it } from "vitest";
import { scoreResponse, scoreSession } from "../src/scoring/scorer.js";
import { defaultRubric } from "../src/scoring/criteria.js";
import type { InterviewSession } from "../src/types.js";

describe("scoreResponse", () => {
  it("computes a weighted total from the rubric", () => {
    const result = scoreResponse(
      "q1",
      [
        { criterion: "correctness", value: 10, rationale: "" },
        { criterion: "communication", value: 10, rationale: "" },
        { criterion: "depth", value: 10, rationale: "" },
      ],
      defaultRubric,
    );
    expect(result.weightedTotal).toBeCloseTo(10);
  });

  it("throws for an unknown criterion", () => {
    expect(() =>
      scoreResponse("q1", [{ criterion: "nonexistent", value: 5, rationale: "" }], defaultRubric),
    ).toThrow(/Unknown scoring criterion/);
  });
});

describe("scoreSession", () => {
  it("returns 0 when there are no scored responses", () => {
    const session: InterviewSession = {
      id: "s1",
      candidateName: "Test",
      panelists: [],
      questions: [],
      responses: [],
      responseScores: [],
    };
    expect(scoreSession(session)).toBe(0);
  });

  it("averages weighted totals across responses", () => {
    const session: InterviewSession = {
      id: "s1",
      candidateName: "Test",
      panelists: [],
      questions: [],
      responses: [],
      responseScores: [
        { questionId: "q1", scores: [], weightedTotal: 8 },
        { questionId: "q2", scores: [], weightedTotal: 6 },
      ],
    };
    expect(scoreSession(session)).toBe(7);
  });
});
