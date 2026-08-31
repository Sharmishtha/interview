import { describe, expect, it } from "vitest";
import {
  buildScorecard,
  compositeFor,
  overallScore,
  rollUpCompetencies,
  scoreAnswers,
} from "../src/scoring/scorer.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { createSession, recordAnswer } from "../src/panel/session.js";
import { PILLAR_ORDER, questionBank, questionById, selectQuestions } from "../src/questions/bank.js";
import { competencies, competencyById, pillars } from "../src/rubric/competencies.js";
import { dimensions } from "../src/rubric/dimensions.js";
import type { AnswerScore, DimensionScore } from "../src/types.js";

function flat(value: number): DimensionScore[] {
  return dimensions.map((d) => ({ dimension: d.id, value, rationale: "", evidence: [] }));
}

describe("rubric integrity", () => {
  it("competency weights sum to 1", () => {
    const total = competencies.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBeCloseTo(1);
  });

  it("dimension weights sum to 1", () => {
    const total = dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBeCloseTo(1);
  });

  it("gives every competency five ascending bands covering 0-10", () => {
    for (const competency of competencies) {
      expect(competency.bands).toHaveLength(5);
      const maxes = competency.bands.map((b) => b.max);
      expect(maxes).toEqual([...maxes].sort((a, b) => a - b));
      expect(maxes.at(-1)).toBe(10);
    }
  });

  it("gives every question a competency, a pillar, and probes", () => {
    for (const question of questionBank) {
      expect(competencies.some((c) => c.id === question.competency)).toBe(true);
      expect(question.pillar).toBe(competencyById.get(question.competency)!.pillar);
      expect(question.probes.length).toBeGreaterThan(0);
    }
  });

  it("covers all nine principles with one question each", () => {
    expect(questionBank).toHaveLength(9);
    expect(new Set(questionBank.map((q) => q.competency)).size).toBe(9);
  });

  it("puts three competencies in each pillar", () => {
    for (const pillar of pillars) {
      expect(competencies.filter((c) => c.pillar === pillar.id)).toHaveLength(3);
    }
  });

  it("carries the guide's positive and negative signals on every competency", () => {
    for (const competency of competencies) {
      expect(competency.positiveSignals.length).toBeGreaterThan(0);
      expect(competency.negativeSignals.length).toBeGreaterThan(0);
    }
  });
});

describe("compositeFor", () => {
  it("returns the flat value when every dimension scores the same", () => {
    expect(compositeFor(flat(7))).toBeCloseTo(7);
  });

  it("throws on an unknown dimension", () => {
    expect(() =>
      compositeFor([{ dimension: "nonexistent" as never, value: 5, rationale: "", evidence: [] }]),
    ).toThrow(/Unknown evidence dimension/);
  });
});

describe("rollUpCompetencies", () => {
  it("maps each answer to the competency its question assesses", () => {
    const questions = [questionById.get("makes-smart-decisions")!, questionById.get("be-real")!];
    const answerScores: AnswerScore[] = [
      { questionId: "makes-smart-decisions", dimensionScores: [], composite: 8 },
      { questionId: "be-real", dimensionScores: [], composite: 4 },
    ];

    const scores = rollUpCompetencies(answerScores, questions);

    expect(scores.find((s) => s.competency === "makes-smart-decisions")!.value).toBeCloseTo(8);
    expect(scores.find((s) => s.competency === "be-real")!.value).toBeCloseTo(4);
    expect(scores.find((s) => s.competency === "be-real")!.pillar).toBe("prioritize-people");
  });

  it("averages when one competency is assessed more than once", () => {
    const scores = rollUpCompetencies(
      [
        { questionId: "be-real", dimensionScores: [], composite: 8 },
        { questionId: "be-real", dimensionScores: [], composite: 4 },
      ],
      [questionById.get("be-real")!],
    );
    expect(scores.find((s) => s.competency === "be-real")!.value).toBeCloseTo(6);
  });

  it("attaches the matching behavioural band descriptor", () => {
    const questions = [questionById.get("makes-smart-decisions")!];
    const scores = rollUpCompetencies(
      [{ questionId: "makes-smart-decisions", dimensionScores: [], composite: 9.5 }],
      questions,
    );
    const strategic = competencies.find((c) => c.id === "makes-smart-decisions")!;
    expect(scores.find((s) => s.competency === "makes-smart-decisions")!.band).toBe(
      strategic.bands.at(-1)!.descriptor,
    );
  });

  it("omits competencies no question assessed", () => {
    const scores = rollUpCompetencies(
      [{ questionId: "raise-the-bar", dimensionScores: [], composite: 7 }],
      [questionById.get("raise-the-bar")!],
    );
    expect(scores.some((s) => s.competency === "grow-groundbreakers")).toBe(false);
  });
});

describe("overallScore", () => {
  it("returns 0 with nothing assessed", () => {
    expect(overallScore([])).toBe(0);
  });

  it("renormalises weights over the competencies actually assessed", () => {
    // Two competencies whose weights do not sum to 1; equal scores must yield that score.
    const scores = overallScore([
      { competency: "makes-smart-decisions", pillar: "plan-with-purpose", value: 6, band: "", questionIds: [] },
      { competency: "grow-groundbreakers", pillar: "prioritize-people", value: 6, band: "", questionIds: [] },
    ]);
    expect(scores).toBeCloseTo(6);
  });

  it("weights all nine principles equally, as the guide treats the pillars", () => {
    // Swapping which competency scores high must not change the overall.
    const oneHigh = overallScore([
      { competency: "makes-smart-decisions", pillar: "plan-with-purpose", value: 10, band: "", questionIds: [] },
      { competency: "grow-groundbreakers", pillar: "prioritize-people", value: 0, band: "", questionIds: [] },
    ]);
    const otherHigh = overallScore([
      { competency: "makes-smart-decisions", pillar: "plan-with-purpose", value: 0, band: "", questionIds: [] },
      { competency: "grow-groundbreakers", pillar: "prioritize-people", value: 10, band: "", questionIds: [] },
    ]);
    expect(oneHigh).toBeCloseTo(otherHigh);
    expect(oneHigh).toBeCloseTo(5);
  });
});

describe("session", () => {
  it("rejects an answer to a question not in the session", () => {
    const session = createSession({ id: "s", candidateName: "T", questions: [questionById.get("raise-the-bar")!] });
    expect(() =>
      recordAnswer(session, { questionId: "lead-across", answer: "...", turns: [] }),
    ).toThrow(/not in this session/);
  });

  it("selects exactly one question per pillar, as the guide's process requires", () => {
    for (const seed of [0, 1000, 2000, Date.now()]) {
      const selected = selectQuestions(seed);
      expect(selected).toHaveLength(3);
      expect(new Set(selected.map((q) => q.pillar))).toEqual(new Set(PILLAR_ORDER));
    }
  });

  it("can reach every combination of questions across seeds", () => {
    // Indexing all three pillars with the same value made the picks move in
    // lockstep, leaving only 3 of the 27 sets reachable.
    const combinations = new Set<string>();
    for (let seed = 0; seed < 1_000_000; seed += 1000) {
      combinations.add(
        selectQuestions(seed)
          .map((q) => q.id)
          .join("+"),
      );
    }
    expect(combinations.size).toBe(27);
  });

  it("returns the same questions for the same seed", () => {
    expect(selectQuestions(4242).map((q) => q.id)).toEqual(selectQuestions(4242).map((q) => q.id));
  });
});

describe("buildScorecard", () => {
  it("ranks a strong answer above a weak one and names gaps", async () => {
    let session = createSession({
      id: "s1",
      candidateName: "Practice",
      questions: [questionById.get("makes-smart-decisions")!, questionById.get("grow-groundbreakers")!],
    });
    session = recordAnswer(session, {
      questionId: "makes-smart-decisions",
      answer: "I always believe in empowering my team. My philosophy is that results follow.",
      turns: [],
    });
    session = recordAnswer(session, {
      questionId: "grow-groundbreakers",
      answer:
        "When I took over in 2019 we had 140 engineers across 6 teams and deploys took 90 minutes. I decided to split the monolith. As a result we went from 90 minutes to 11 minutes within 18 months. In hindsight I should have moved earlier.",
      turns: [],
    });

    const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
    const scorecard = buildScorecard(session, answerScores);

    const weak = answerScores.find((a) => a.questionId === "makes-smart-decisions")!;
    const strong = answerScores.find((a) => a.questionId === "grow-groundbreakers")!;
    expect(strong.composite).toBeGreaterThan(weak.composite);

    expect(scorecard.overall).toBeGreaterThan(0);
    expect(scorecard.strengths.length).toBeGreaterThan(0);
    expect(scorecard.gaps.length).toBeGreaterThan(0);
    expect(scorecard.strengths).not.toEqual(scorecard.gaps);
  });

  it("throws when an answer references a question outside the session", async () => {
    const session = {
      ...createSession({ id: "s2", candidateName: "T", questions: [questionById.get("raise-the-bar")!] }),
      answers: [{ questionId: "ghost", answer: "x", turns: [] }],
    };
    await expect(scoreAnswers(session, new HeuristicEvaluator())).rejects.toThrow(
      /unknown question/,
    );
  });
});
