import { bandFor, competencies, competencyById } from "../rubric/competencies.js";
import { dimensionById } from "../rubric/dimensions.js";
import type {
  AnswerScore,
  CompetencyId,
  CompetencyScore,
  DimensionScore,
  InterviewQuestion,
  InterviewSession,
  Scorecard,
} from "../types.js";
import { guidanceFor, TARGET_SCORE } from "./coach.js";
import { narrativeFor } from "./narrative.js";
import type { Evaluator } from "./evaluator.js";

/** Weighted roll-up of an answer's dimension scores into a single 0-10 composite. */
export function compositeFor(dimensionScores: DimensionScore[]): number {
  const total = dimensionScores.reduce((sum, score) => {
    const dimension = dimensionById.get(score.dimension);
    if (!dimension) {
      throw new Error(`Unknown evidence dimension: ${score.dimension}`);
    }
    return sum + score.value * dimension.weight;
  }, 0);

  return round(total);
}

/** Scores every answer in the session with the supplied evaluator. */
export async function scoreAnswers(
  session: InterviewSession,
  evaluator: Evaluator,
): Promise<AnswerScore[]> {
  const questions = new Map(session.questions.map((q) => [q.id, q]));

  return Promise.all(
    session.answers.map(async (record) => {
      const question = questions.get(record.questionId);
      if (!question) {
        throw new Error(`Answer references unknown question: ${record.questionId}`);
      }
      const dimensionScores = await evaluator.evaluate(question, record.answer);
      return {
        questionId: record.questionId,
        dimensionScores,
        composite: compositeFor(dimensionScores),
      };
    }),
  );
}

/**
 * Rolls answer composites up into the competency each question assesses. The
 * guide asks one question per pillar, so normally each competency is assessed by
 * exactly one answer.
 */
export function rollUpCompetencies(
  answerScores: AnswerScore[],
  questions: InterviewQuestion[],
): CompetencyScore[] {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const buckets = new Map<CompetencyId, { values: number[]; questionIds: string[] }>();

  for (const answerScore of answerScores) {
    const question = questionById.get(answerScore.questionId);
    if (!question) continue;

    const bucket = buckets.get(question.competency) ?? { values: [], questionIds: [] };
    bucket.values.push(answerScore.composite);
    bucket.questionIds.push(answerScore.questionId);
    buckets.set(question.competency, bucket);
  }

  return competencies
    .filter((competency) => buckets.has(competency.id))
    .map((competency) => {
      const bucket = buckets.get(competency.id)!;
      const value = round(mean(bucket.values));
      return {
        competency: competency.id,
        pillar: competency.pillar,
        value,
        band: bandFor(competency, value).descriptor,
        questionIds: bucket.questionIds,
      };
    });
}

/**
 * Overall score, weighted by competency. Weights are renormalised across the
 * competencies actually assessed, so a three-question session is not penalised
 * for the six questions it did not reach.
 */
export function overallScore(competencyScores: CompetencyScore[]): number {
  const totalWeight = competencyScores.reduce(
    (sum, score) => sum + (competencyById.get(score.competency)?.weight ?? 0),
    0,
  );
  if (totalWeight === 0) return 0;

  const weighted = competencyScores.reduce(
    (sum, score) => sum + score.value * (competencyById.get(score.competency)?.weight ?? 0),
    0,
  );

  return round(weighted / totalWeight);
}

export function buildScorecard(
  session: InterviewSession,
  answerScores: AnswerScore[],
  evaluator?: Pick<Evaluator, "name" | "approximates">,
): Scorecard {
  const competencyScores = rollUpCompetencies(answerScores, session.questions);
  const ranked = [...competencyScores].sort((a, b) => b.value - a.value);
  const take = Math.min(2, Math.floor(ranked.length / 2));

  const questionById = new Map(session.questions.map((q) => [q.id, q]));
  const answerById = new Map(session.answers.map((a) => [a.questionId, a.answer]));

  const guidance = answerScores.flatMap((answerScore) => {
    const question = questionById.get(answerScore.questionId);
    if (!question) return [];
    return [
      guidanceFor(
        answerScore,
        question,
        answerById.get(answerScore.questionId) ?? "",
        TARGET_SCORE,
        // So each rubric row can say whether its score was measured or estimated.
        evaluator?.approximates ?? [],
      ),
    ];
  });

  return {
    sessionId: session.id,
    candidateName: session.candidateName,
    answerScores,
    competencyScores,
    overall: overallScore(competencyScores),
    strengths: ranked.slice(0, take).map((s) => s.competency),
    gaps: ranked
      .slice(ranked.length - take)
      .reverse()
      .map((s) => s.competency),
    guidance,
    narrative: narrativeFor(
      answerScores,
      competencyScores,
      guidance,
      session.questions,
      answerById,
    ),
    evaluatedBy: {
      name: evaluator?.name ?? "unknown",
      approximates: [...(evaluator?.approximates ?? [])],
    },
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
