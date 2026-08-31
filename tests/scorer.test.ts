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
    // Both questions are tagged technical-judgment; only expensive-mistake is
    // tagged judgment-self-awareness.
    const questions = [questionById.get("architecture-bet")!, questionById.get("expensive-mistake")!];
    const answerScores: AnswerScore[] = [
      { questionId: "architecture-bet", dimensionScores: [], composite: 8 },
      { questionId: "expensive-mistake", dimensionScores: [], composite: 4 },
    ];

    const scores = rollUpCompetencies(answerScores, questions);

    expect(scores.find((s) => s.competency === "technical-judgment")!.value).toBeCloseTo(6);
    expect(scores.find((s) => s.competency === "judgment-self-awareness")!.value).toBeCloseTo(4);
  });

  it("attaches the matching behavioural band descriptor", () => {
    const questions = [questionById.get("architecture-bet")!];
    const scores = rollUpCompetencies(
      [{ questionId: "architecture-bet", dimensionScores: [], composite: 9.5 }],
      questions,
    );
    const strategic = competencies.find((c) => c.id === "technical-judgment")!;
    expect(scores.find((s) => s.competency === "technical-judgment")!.band).toBe(
      strategic.bands.at(-1)!.descriptor,
    );
  });

  it("omits competencies no question assessed", () => {
    const scores = rollUpCompetencies(
      [{ questionId: "rd-budget", dimensionScores: [], composite: 7 }],
      [questionById.get("rd-budget")!],
    );
    expect(scores.some((s) => s.competency === "scaling-change")).toBe(false);
  });
});

describe("overallScore", () => {
  it("returns 0 with nothing assessed", () => {
    expect(overallScore([])).toBe(0);
  });

  it("renormalises weights over the competencies actually assessed", () => {
    // Two competencies whose weights do not sum to 1; equal scores must yield that score.
    const scores = overallScore([
      { competency: "technical-judgment", value: 6, band: "", questionIds: [] },
      { competency: "scaling-change", value: 6, band: "", questionIds: [] },
    ]);
    expect(scores).toBeCloseTo(6);
  });

  it("weights the heavier competency more", () => {
    const strategicHigh = overallScore([
      { competency: "technical-judgment", value: 10, band: "", questionIds: [] },
      { competency: "scaling-change", value: 0, band: "", questionIds: [] },
    ]);
    const changeHigh = overallScore([
      { competency: "technical-judgment", value: 0, band: "", questionIds: [] },
      { competency: "scaling-change", value: 10, band: "", questionIds: [] },
    ]);
    expect(strategicHigh).toBeGreaterThan(changeHigh);
  });
});

describe("session", () => {
  it("rejects an answer to a question not in the session", () => {
    const session = createSession({ id: "s", candidateName: "T", questions: [questionById.get("rd-budget")!] });
    expect(() =>
      recordAnswer(session, { questionId: "incident", answer: "...", turns: [] }),
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
      questions: [questionById.get("architecture-bet")!, questionById.get("scaling")!],
    });
    session = recordAnswer(session, {
      questionId: "architecture-bet",
      answer: "I always believe in empowering my team. My philosophy is that results follow.",
      turns: [],
    });
    session = recordAnswer(session, {
      questionId: "scaling",
      answer:
        "When I took over in 2019 we had 140 engineers across 6 teams and deploys took 90 minutes. I decided to split the monolith. As a result we went from 90 minutes to 11 minutes within 18 months. In hindsight I should have moved earlier.",
      turns: [],
    });

    const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
    const scorecard = buildScorecard(session, answerScores);

    const weak = answerScores.find((a) => a.questionId === "architecture-bet")!;
    const strong = answerScores.find((a) => a.questionId === "scaling")!;
    expect(strong.composite).toBeGreaterThan(weak.composite);

    expect(scorecard.overall).toBeGreaterThan(0);
    expect(scorecard.strengths.length).toBeGreaterThan(0);
    expect(scorecard.gaps.length).toBeGreaterThan(0);
    expect(scorecard.strengths).not.toEqual(scorecard.gaps);
  });

  it("throws when an answer references a question outside the session", async () => {
    const session = {
      ...createSession({ id: "s2", candidateName: "T", questions: [questionById.get("rd-budget")!] }),
      answers: [{ questionId: "ghost", answer: "x", turns: [] }],
    };
    await expect(scoreAnswers(session, new HeuristicEvaluator())).rejects.toThrow(
      /unknown question/,
    );
  });
});
