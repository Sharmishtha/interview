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
import { questionBank, questionById, selectQuestions } from "../src/questions/bank.js";
import { competencies } from "../src/rubric/competencies.js";
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

  it("tags every question with at least one competency and one probe", () => {
    for (const question of questionBank) {
      expect(question.competencies.length).toBeGreaterThan(0);
      expect(question.probes.length).toBeGreaterThan(0);
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
  it("averages the answers tagged with each competency", () => {
    const questions = [questionById.get("strategic-bet")!, questionById.get("pnl")!];
    const answerScores: AnswerScore[] = [
      { questionId: "strategic-bet", dimensionScores: [], composite: 8 },
      { questionId: "pnl", dimensionScores: [], composite: 4 },
    ];

    const scores = rollUpCompetencies(answerScores, questions);
    const acumen = scores.find((s) => s.competency === "business-acumen")!;

    // business-acumen is tagged on both questions, so it is the mean of 8 and 4.
    expect(acumen.value).toBeCloseTo(6);
    expect(scores.find((s) => s.competency === "strategic-thinking")!.value).toBeCloseTo(8);
  });

  it("attaches the matching behavioural band descriptor", () => {
    const questions = [questionById.get("strategic-bet")!];
    const scores = rollUpCompetencies(
      [{ questionId: "strategic-bet", dimensionScores: [], composite: 9.5 }],
      questions,
    );
    const strategic = competencies.find((c) => c.id === "strategic-thinking")!;
    expect(scores.find((s) => s.competency === "strategic-thinking")!.band).toBe(
      strategic.bands.at(-1)!.descriptor,
    );
  });

  it("omits competencies no question assessed", () => {
    const scores = rollUpCompetencies(
      [{ questionId: "pnl", dimensionScores: [], composite: 7 }],
      [questionById.get("pnl")!],
    );
    expect(scores.some((s) => s.competency === "change-leadership")).toBe(false);
  });
});

describe("overallScore", () => {
  it("returns 0 with nothing assessed", () => {
    expect(overallScore([])).toBe(0);
  });

  it("renormalises weights over the competencies actually assessed", () => {
    // Two competencies whose weights do not sum to 1; equal scores must yield that score.
    const scores = overallScore([
      { competency: "strategic-thinking", value: 6, band: "", questionIds: [] },
      { competency: "change-leadership", value: 6, band: "", questionIds: [] },
    ]);
    expect(scores).toBeCloseTo(6);
  });

  it("weights the heavier competency more", () => {
    const strategicHigh = overallScore([
      { competency: "strategic-thinking", value: 10, band: "", questionIds: [] },
      { competency: "change-leadership", value: 0, band: "", questionIds: [] },
    ]);
    const changeHigh = overallScore([
      { competency: "strategic-thinking", value: 0, band: "", questionIds: [] },
      { competency: "change-leadership", value: 10, band: "", questionIds: [] },
    ]);
    expect(strategicHigh).toBeGreaterThan(changeHigh);
  });
});

describe("session", () => {
  it("rejects an answer to a question not in the session", () => {
    const session = createSession({ id: "s", candidateName: "T", questions: [questionById.get("pnl")!] });
    expect(() =>
      recordAnswer(session, { questionId: "crisis", answer: "...", turns: [] }),
    ).toThrow(/not in this session/);
  });

  it("selects a question set covering distinct competencies", () => {
    const selected = selectQuestions(6);
    expect(selected).toHaveLength(6);
    const covered = new Set(selected.flatMap((q) => q.competencies));
    expect(covered.size).toBeGreaterThanOrEqual(6);
  });
});

describe("buildScorecard", () => {
  it("ranks a strong answer above a weak one and names gaps", async () => {
    let session = createSession({
      id: "s1",
      candidateName: "Practice",
      questions: [questionById.get("strategic-bet")!, questionById.get("transformation")!],
    });
    session = recordAnswer(session, {
      questionId: "strategic-bet",
      answer: "I always believe in empowering my team. My philosophy is that results follow.",
      turns: [],
    });
    session = recordAnswer(session, {
      questionId: "transformation",
      answer:
        "When I took over in 2019 we ran a 4% margin on $180 million with a team of 240 people. I decided to cut a $30 million line. As a result we went from 4% to 11% within 18 months. In hindsight I should have moved earlier.",
      turns: [],
    });

    const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
    const scorecard = buildScorecard(session, answerScores);

    const weak = answerScores.find((a) => a.questionId === "strategic-bet")!;
    const strong = answerScores.find((a) => a.questionId === "transformation")!;
    expect(strong.composite).toBeGreaterThan(weak.composite);

    expect(scorecard.overall).toBeGreaterThan(0);
    expect(scorecard.strengths.length).toBeGreaterThan(0);
    expect(scorecard.gaps.length).toBeGreaterThan(0);
    expect(scorecard.strengths).not.toEqual(scorecard.gaps);
  });

  it("throws when an answer references a question outside the session", async () => {
    const session = {
      ...createSession({ id: "s2", candidateName: "T", questions: [questionById.get("pnl")!] }),
      answers: [{ questionId: "ghost", answer: "x", turns: [] }],
    };
    await expect(scoreAnswers(session, new HeuristicEvaluator())).rejects.toThrow(
      /unknown question/,
    );
  });
});
