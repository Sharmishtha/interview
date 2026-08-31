import { describe, expect, it } from "vitest";
import { guidanceFor, TARGET_SCORE } from "../src/scoring/coach.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { compositeFor } from "../src/scoring/scorer.js";
import { questionById } from "../src/questions/bank.js";
import { competencyById } from "../src/rubric/competencies.js";
import { dimensionById } from "../src/rubric/dimensions.js";

const evaluator = new HeuristicEvaluator();
const question = questionById.get("raise-the-bar")!;

const WEAK = `
I always believe in setting realistic expectations. My philosophy is that you
communicate early and often. We plan carefully and at the end of the day the
team delivered what mattered.
`;

const STRONG = `
When I took over the division in 2021 I was asked to return it to growth. We were
at a 4% margin on $180 million with 180 engineers. I decided to cut the two weakest
product lines. As a result we went from 4% to 11% within 8 months. In hindsight I
should have moved sooner - I underestimated the cost of the delay.
`;

async function guidance(answer: string, q = question) {
  const dimensionScores = await evaluator.evaluate(q, answer);
  const answerScore = {
    questionId: q.id,
    dimensionScores,
    composite: compositeFor(dimensionScores),
  };
  return { answerScore, guidance: guidanceFor(answerScore, q, answer) };
}

describe("guidanceFor", () => {
  it("orders lifts by how much each is actually worth", async () => {
    const { guidance: g } = await guidance(WEAK);
    const gains = g.lifts.map((l) => l.compositeGain);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
  });

  it("prices each lift as the weighted gap to the target", async () => {
    const { answerScore, guidance: g } = await guidance(WEAK);
    for (const lift of g.lifts) {
      const score = answerScore.dimensionScores.find((d) => d.dimension === lift.dimension)!;
      const weight = dimensionById.get(lift.dimension)!.weight;
      expect(lift.compositeGain).toBeCloseTo((TARGET_SCORE - score.value) * weight, 2);
    }
  });

  it("reaches a higher score than the answer scored", async () => {
    const { answerScore, guidance: g } = await guidance(WEAK);
    expect(g.reachable).toBeGreaterThan(answerScore.composite);
    expect(g.reachable).toBeLessThanOrEqual(10);
  });

  it("only suggests lifting dimensions that fall short of the target", async () => {
    const { answerScore, guidance: g } = await guidance(STRONG);
    for (const lift of g.lifts) {
      const score = answerScore.dimensionScores.find((d) => d.dimension === lift.dimension)!;
      expect(score.value).toBeLessThan(TARGET_SCORE);
    }
  });

  it("has fewer lifts to offer on a strong answer than a weak one", async () => {
    const weak = await guidance(WEAK);
    const strong = await guidance(STRONG);
    const total = (lifts: { compositeGain: number }[]) =>
      lifts.reduce((sum, l) => sum + l.compositeGain, 0);
    expect(total(strong.guidance.lifts)).toBeLessThan(total(weak.guidance.lifts));
  });

  it("names the missing STAR-L elements in its structure advice", async () => {
    const { guidance: g } = await guidance("We shipped it and everyone was pleased.");
    const structure = g.lifts.find((l) => l.dimension === "star-structure");
    expect(structure?.suggestion).toMatch(/Task|Result|Learning/);
  });

  it("surfaces the guide's positive signals for the question's competency", async () => {
    const { guidance: g } = await guidance(WEAK);
    expect(g.listeningFor).toEqual(competencyById.get(question.competency)!.positiveSignals);
  });

  it("returns every probe, flagging the ones the answer never touched", async () => {
    const { guidance: g } = await guidance(WEAK);
    expect(g.probes).toHaveLength(question.probes.length);
    expect(g.probes.some((p) => p.likelyUncovered)).toBe(true);
  });

  it("flags blame-shifting as a negative signal", async () => {
    const deflecting = `
      That was not really my problem. Product kept changing the requirements on us
      and nobody told us until late. We were doing our best with what we were given.
    `;
    const { guidance: g } = await guidance(deflecting, questionById.get("build-resilience")!);
    expect(g.flags.join(" ")).toMatch(/blame/i);
  });

  it("raises no blame flag on an answer that owns the outcome", async () => {
    const { guidance: g } = await guidance(STRONG);
    expect(g.flags.join(" ")).not.toMatch(/blame/i);
  });
});
