import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { questionById } from "../src/questions/bank.js";
import { dimensions } from "../src/rubric/dimensions.js";
import type { DimensionId, DimensionScore } from "../src/types.js";

const evaluator = new HeuristicEvaluator();
const question = questionById.get("makes-smart-decisions")!;

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
  it("scores every dimension in the rubric", async () => {
    const scores = await evaluator.evaluate(question, EVIDENCED);
    expect(scores.map((s) => s.dimension).sort()).toEqual(dimensions.map((d) => d.id).sort());
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

    for (const dimension of ["specificity", "scope-scale", "quantified-outcomes", "learning", "star-structure"] as const) {
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
    expect(valueOf(scores, "star-structure")).toBeLessThanOrEqual(4);
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

// Phrasings drawn from a real practice session that the first pattern sets missed
// entirely. Each one is a genuine signal that scored as if it were absent.
describe("signals the narrower patterns used to miss", () => {
  const learning = async (answer: string) =>
    valueOf(await evaluator.evaluate(question, answer), "learning");
  const quantified = async (answer: string) =>
    valueOf(await evaluator.evaluate(question, answer), "quantified-outcomes");

  it.each([
    ["I wish I could have talked to our CEO at that time instead of a month later."],
    ["If I would handle something differently, it is learning more about why companies get acquired."],
    ["What did I learn about it is this is always a hard communication to have."],
    ["Knowing what I know now, I would have moved sooner."],
    ["I misjudged how long the migration would take."],
    ["Next time I would bring sales into the discovery earlier."],
    ["That taught me a slow decision is more expensive than a wrong one."],
  ])("reads reflection in %j", async (answer) => {
    expect(await learning(answer)).toBeGreaterThan(4);
  });

  it.each([
    ["The engagement scores went up by 12 points, the highest growth in years."],
    ["We were only harvesting about 210 channels. With them we could do about 10,000 channels."],
    ["Our score moved from 58 to 79 over the year."],
    ["Attrition came down by 11 points."],
  ])("reads a quantified outcome in %j", async (answer) => {
    expect(await quantified(answer)).toBeGreaterThan(3);
  });

  it("still reports no numbers when an answer genuinely has none", async () => {
    expect(await quantified("We improved things a lot and everyone was pleased.")).toBe(1);
  });

  it("still reports no learning when an answer genuinely has none", async () => {
    expect(await learning("We shipped it, it went well, and the team was proud.")).toBeLessThan(3);
  });
});

describe("story shape and memorability", () => {
  const dim = async (answer: string, id: DimensionId) =>
    valueOf(await evaluator.evaluate(question, answer), id);

  const STORY = `I remember the Tuesday. When I joined in 2021 we were at 14 incidents a quarter.
    But then I pulled the data and found the programme had shipped nothing in two years.
    Anders said to me, "you have been here four months." I killed it anyway.`;
  const SUMMARY = `I was asked to reduce incidents. Analysis of the delivery data showed one
    programme was not shipping customer value. I recommended cancelling it and the sponsor
    initially disagreed. Incidents subsequently fell.`;

  it("rates the same facts higher when they are told as a story", async () => {
    expect(await dim(STORY, "story-shape")).toBeGreaterThan(await dim(SUMMARY, "story-shape"));
    expect(await dim(STORY, "memorability")).toBeGreaterThan(await dim(SUMMARY, "memorability"));
  });

  it("credits a quoted line as something only this person could have said", async () => {
    // Long enough to clear the short-answer cap - a memorable answer has to be a
    // real answer first.
    const quoted = `When I joined Halden in 2021 the board was split on the platform programme
      and nobody wanted to be the one to say it. Anders said to me, "you have been here four
      months, and you want to cancel my programme." He was not wrong about the four months. I
      decided to show him the delivery numbers anyway, in front of the room, and we killed it
      that afternoon. Priya took over what was left of the team.`;
    expect(await dim(quoted, "memorability")).toBeGreaterThan(5);
  });

  it("does not credit a story it cannot see", async () => {
    expect(await dim("We executed the plan and delivered the outcome.", "story-shape")).toBeLessThan(4);
    expect(await dim("We executed the plan and delivered the outcome.", "memorability")).toBeLessThan(4);
  });

  it("caps both on an answer too short to tell anything", async () => {
    expect(await dim("But then it went wrong. I remember.", "story-shape")).toBeLessThanOrEqual(3.5);
  });
});
