import type { CriterionScore, InterviewSession, ResponseScore, ScoreCriterion } from "../types.js";

export function scoreResponse(
  questionId: string,
  scores: CriterionScore[],
  rubric: ScoreCriterion[],
): ResponseScore {
  const weightByCriterion = new Map(rubric.map((c) => [c.name, c.weight]));

  const weightedTotal = scores.reduce((total, score) => {
    const weight = weightByCriterion.get(score.criterion);
    if (weight === undefined) {
      throw new Error(`Unknown scoring criterion: ${score.criterion}`);
    }
    return total + score.value * weight;
  }, 0);

  return { questionId, scores, weightedTotal };
}

/** Averages per-question weighted totals into a single 0-10 session score. */
export function scoreSession(session: InterviewSession): number {
  if (session.responseScores.length === 0) {
    return 0;
  }
  const sum = session.responseScores.reduce((total, r) => total + r.weightedTotal, 0);
  return sum / session.responseScores.length;
}
