import { describe, expect, it } from "vitest";
import { executivePanel } from "../src/panel/panelist.js";
import { questionById } from "../src/questions/bank.js";
import { dimensions, dimensionsIn, GROUP_WEIGHTS, weightOf } from "../src/rubric/dimensions.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { buildScorecard, scoreAnswers } from "../src/scoring/scorer.js";
import type { InterviewSession } from "../src/types.js";

describe("the weights", () => {
  it("sum to 1, or every composite is on a different scale", () => {
    const total = dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(Number(total.toFixed(6))).toBe(1);
  });

  it("splits substance and story the way the rubric says it does", () => {
    // The point of this test: changing one dimension's weight cannot quietly
    // move the balance of the whole rubric without failing here first.
    expect(weightOf("substance")).toBe(GROUP_WEIGHTS.substance);
    expect(weightOf("story")).toBe(GROUP_WEIGHTS.story);
  });

  it("gives story enough weight to change a grade and not enough to carry one", () => {
    // A quarter of the composite: a perfectly told empty answer tops out around
    // 2.5 of 10, and a substantive answer told flat still loses a grade band.
    expect(weightOf("story")).toBeGreaterThanOrEqual(0.2);
    expect(weightOf("story")).toBeLessThanOrEqual(0.3);
  });

  it("puts every dimension in exactly one group", () => {
    expect(dimensionsIn("substance").length + dimensionsIn("story").length).toBe(dimensions.length);
  });
});

describe("what each evaluator will admit to", () => {
  it("has the heuristic own up to the story dimensions and only those", () => {
    const approximated = [...new HeuristicEvaluator().approximates];
    const story = dimensionsIn("story").map((d) => d.id);

    expect([...approximated].sort()).toEqual([...story].sort());
  });

  it("scores every dimension anyway, because a gap would deflate the composite", async () => {
    const scores = await new HeuristicEvaluator().evaluate(
      [...questionById.values()][0]!,
      "We rebuilt the pipeline at Gracenote and cut latency by 40% over two quarters.",
    );

    expect(scores.map((s) => s.dimension).sort()).toEqual(dimensions.map((d) => d.id).sort());
  });
});

describe("the scorecard", () => {
  it("says which evaluator produced it and what that evaluator estimated", async () => {
    const question = [...questionById.values()][0]!;
    const session: InterviewSession = {
      id: "s1",
      candidateName: "Test",
      panelists: executivePanel,
      questions: [question],
      answers: [
        {
          questionId: question.id,
          answer: "At Gracenote I moved us from 210 channels to 10,000 in nine months.",
          turns: [],
        },
      ],
      startedAt: new Date().toISOString(),
    };

    const evaluator = new HeuristicEvaluator();
    const card = buildScorecard(session, await scoreAnswers(session, evaluator), evaluator);

    expect(card.evaluatedBy.name).toBe("heuristic");
    expect(card.evaluatedBy.approximates).toContain("story-shape");
    expect(card.evaluatedBy.approximates).toContain("memorability");
  });
});
