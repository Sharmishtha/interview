import { describe, expect, it } from "vitest";
import { questionById } from "../src/questions/bank.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { narrativeFor, storyLabel } from "../src/scoring/narrative.js";
import { buildScorecard, scoreAnswers } from "../src/scoring/scorer.js";
import { executivePanel } from "../src/panel/panelist.js";
import type { InterviewSession } from "../src/types.js";

const STRONG = [
  "When I joined Gracenote in 2021, the metadata pipeline was three days behind and we were losing",
  "two accounts a quarter over it. I owned a team of 40 and a $12m budget. Priya, my staff engineer,",
  "pushed back hard on a rewrite, and she was right - so I split the difference and rebuilt only the",
  "ingest path. We went from 210 channels to 10,000 in nine months, and churn fell by 60%. What I",
  "learned at Gracenote was that I had been treating a data problem as an org problem.",
].join(" ");

const WEAK = "I always believe in empowering the team. Generally speaking, we did well together.";

function sessionWith(entries: [string, string][]): InterviewSession {
  const questions = entries.map(([id]) => questionById.get(id)!);
  return {
    id: "s1",
    candidateName: "Test",
    panelists: executivePanel,
    questions,
    answers: entries.map(([questionId, answer]) => ({ questionId, answer, turns: [] })),
    startedAt: new Date().toISOString(),
  };
}

async function scorecardFor(entries: [string, string][]) {
  const session = sessionWith(entries);
  return buildScorecard(session, await scoreAnswers(session, new HeuristicEvaluator()));
}

const IDS = [...questionById.keys()];

describe("naming the answer", () => {
  it("takes the name the candidate leaned on, so the coach can point at it", () => {
    expect(storyLabel(STRONG)).toBe("Gracenote");
  });

  it("ignores a capital that only starts a sentence", () => {
    expect(storyLabel("We shipped it. Later we shipped again. Then we stopped.")).toBeNull();
  });

  it("ignores a month, which names nothing", () => {
    expect(storyLabel("we shipped it in March and again in March")).toBeNull();
  });

  it("returns null when the answer named nobody and nothing", () => {
    expect(storyLabel(WEAK)).toBeNull();
  });
});

describe("the headline", () => {
  it("names the strongest answer by the story it told", async () => {
    const card = await scorecardFor([
      [IDS[0]!, STRONG],
      [IDS[1]!, WEAK],
      [IDS[2]!, WEAK],
    ]);

    expect(card.narrative.headline).toBe("Your Gracenote story was the strongest of the three.");
  });

  it("falls back to the principle when nothing was named", async () => {
    const card = await scorecardFor([
      [
        IDS[0]!,
        "I rebuilt the ingest path and we went from 210 channels to 10,000 in nine months.",
      ],
      [IDS[1]!, WEAK],
    ]);

    expect(card.narrative.headline).toMatch(/^Your answer on .+ was the strongest of the two\.$/);
  });

  it("does not congratulate a set of answers where nothing landed", async () => {
    const card = await scorecardFor([
      [IDS[0]!, WEAK],
      [IDS[1]!, WEAK],
    ]);

    expect(card.narrative.headline).toMatch(/none of them is out loud yet/);
  });

  it("says where a single answer landed rather than ranking it against nothing", async () => {
    const card = await scorecardFor([[IDS[0]!, STRONG]]);
    expect(card.narrative.headline).toMatch(/came in at \d\.\d out of 10\./);
  });
});

describe("the per-principle read", () => {
  it("leads with what worked and names one thing to move", async () => {
    const card = await scorecardFor([[IDS[0]!, STRONG]]);
    const [read] = card.narrative.reads;

    expect(read).toBeDefined();
    expect(read!.text).toMatch(/ - |, with nothing obviously missing\./);
    // The reads are for the candidate, so the rubric's own vocabulary stays out.
    expect(read!.text).not.toMatch(/composite|dimension|STAR/i);
  });

  it("skips the compliment when there is nothing to compliment", async () => {
    const card = await scorecardFor([[IDS[0]!, WEAK]]);
    const [read] = card.narrative.reads;

    expect(read!.text).not.toMatch(/^Grounded|^Clear about|^Told as a story/);
  });

  it("covers every principle that was assessed", async () => {
    const card = await scorecardFor([
      [IDS[0]!, STRONG],
      [IDS[1]!, WEAK],
    ]);

    expect(card.narrative.reads.map((r) => r.competency)).toEqual(
      card.competencyScores.map((c) => c.competency),
    );
  });
});

describe("the one thing to change", () => {
  it("is the highest-value lift on offer anywhere in the session", async () => {
    const card = await scorecardFor([
      [IDS[0]!, STRONG],
      [IDS[1]!, WEAK],
    ]);

    const everyGain = card.guidance.flatMap((g) => g.lifts.map((l) => l.compositeGain));
    expect(card.narrative.oneThing).not.toBeNull();
    expect(card.narrative.oneThing!.gain).toBe(Math.max(...everyGain));
  });

  it("points at the answer it applies to", async () => {
    const card = await scorecardFor([[IDS[0]!, STRONG]]);
    expect(card.narrative.oneThing!.prose).toMatch(/^Start with your Gracenote story\./);
  });
});

describe("degenerate input", () => {
  it("does not invent a headline for a session with no answers", () => {
    const narrative = narrativeFor([], [], [], [], new Map());
    expect(narrative.headline).toMatch(/nothing to read yet/);
    expect(narrative.oneThing).toBeNull();
    expect(narrative.reads).toEqual([]);
  });
});
