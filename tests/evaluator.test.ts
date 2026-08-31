import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { questionById } from "../src/questions/bank.js";
import type { DimensionId, DimensionScore } from "../src/types.js";

const evaluator = new HeuristicEvaluator();
const question = questionById.get("architecture-bet")!;

function valueOf(scores: DimensionScore[], dimension: DimensionId): number {
  return scores.find((s) => s.dimension === dimension)!.value;
}

const PLATITUDE = `
I always believe in empowering my team. My philosophy is that you hire good
people and get out of their way, and at the end of the day the results follow.
We did great work together and the business improved.
`;

const EVIDENCED = `
When I took over the division in 2019 we were at a 4% margin on $180 million of
revenue with a team of 240 people. I decided to kill a $30 million product line.
As a result we went from 4% to 11% within 18 months. In hindsight I should have
moved six months earlier - I underestimated the cost of the delay.
`;

describe("HeuristicEvaluator", () => {
  it("scores all six dimensions", async () => {
    const scores = await evaluator.evaluate(question, EVIDENCED);
    expect(scores.map((s) => s.dimension).sort()).toEqual(
      ["ownership", "quantified-outcomes", "reflection", "scope-scale", "specificity", "structure"].sort(),
    );
  });

  it("keeps every score within 0-10", async () => {
    for (const answer of [PLATITUDE, EVIDENCED, "", "Yes."]) {
      const scores = await evaluator.evaluate(question, answer);
      for (const score of scores) {
        expect(score.value).toBeGreaterThanOrEqual(0);
        expect(score.value).toBeLessThanOrEqual(10);
      }
    }
  });

  it("rates an evidenced answer above a platitude answer on every dimension", async () => {
    const weak = await evaluator.evaluate(question, PLATITUDE);
    const strong = await evaluator.evaluate(question, EVIDENCED);

    for (const dimension of ["specificity", "scope-scale", "quantified-outcomes", "reflection", "structure"] as const) {
      expect(valueOf(strong, dimension)).toBeGreaterThan(valueOf(weak, dimension));
    }
  });

  it("bottoms out quantification when the answer has no numbers", async () => {
    const scores = await evaluator.evaluate(question, PLATITUDE);
    expect(valueOf(scores, "quantified-outcomes")).toBe(1);
  });

  it("penalises an answer that never says 'I'", async () => {
    const scores = await evaluator.evaluate(question, "We shipped it and we were pleased with our results.");
    expect(valueOf(scores, "ownership")).toBeLessThanOrEqual(3);
  });

  it("penalises an answer that gives the team no credit", async () => {
    const scores = await evaluator.evaluate(question, "I built it, I shipped it, I fixed my own mistakes.");
    expect(valueOf(scores, "ownership")).toBeLessThanOrEqual(5);
  });

  it("caps structure for an answer too short to be a story", async () => {
    const scores = await evaluator.evaluate(question, "I decided to cut the product line. As a result we grew.");
    expect(valueOf(scores, "structure")).toBeLessThanOrEqual(4);
  });

  it("cites spans that appear in the answer", async () => {
    const scores = await evaluator.evaluate(question, EVIDENCED);
    for (const score of scores) {
      for (const span of score.evidence) {
        expect(EVIDENCED.slice(span.start, span.end)).toBe(span.text);
      }
    }
  });
});
