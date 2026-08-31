import { questionById } from "../questions/bank.js";
import { HeuristicEvaluator, type Evaluator } from "../scoring/evaluator.js";
import { compositeFor } from "../scoring/scorer.js";
import type { DimensionId, DimensionScore } from "../types.js";
import { evalCases, tierBounds, type EvalCase, type Tier } from "./cases.js";

export interface CaseResult {
  case: EvalCase;
  composite: number;
  dimensionScores: DimensionScore[];
  /** Expectation failures. Empty means the case passed. */
  failures: string[];
}

export interface EvalReport {
  results: CaseResult[];
  /** Cases whose expectations are enforced (known limitations are excluded). */
  enforced: CaseResult[];
  knownLimitations: CaseResult[];
  meanByTier: Record<Tier, number>;
  /** Fraction of strong/weak pairs the evaluator ranked correctly. */
  rankingAccuracy: number;
  passed: boolean;
}

function valueOf(scores: DimensionScore[], dimension: DimensionId): number {
  return scores.find((s) => s.dimension === dimension)?.value ?? 0;
}

function checkExpectations(evalCase: EvalCase, composite: number, scores: DimensionScore[]): string[] {
  const failures: string[] = [];
  const expect = evalCase.expect;
  if (!expect) return failures;

  if (expect.compositeMin !== undefined && composite < expect.compositeMin) {
    failures.push(`composite ${composite.toFixed(2)} < expected min ${expect.compositeMin}`);
  }
  if (expect.compositeMax !== undefined && composite > expect.compositeMax) {
    failures.push(`composite ${composite.toFixed(2)} > expected max ${expect.compositeMax}`);
  }

  for (const [dimension, bounds] of Object.entries(expect.dimensions ?? {})) {
    const value = valueOf(scores, dimension as DimensionId);
    if (bounds?.min !== undefined && value < bounds.min) {
      failures.push(`${dimension} ${value.toFixed(2)} < expected min ${bounds.min}`);
    }
    if (bounds?.max !== undefined && value > bounds.max) {
      failures.push(`${dimension} ${value.toFixed(2)} > expected max ${bounds.max}`);
    }
  }

  return failures;
}

export async function runEval(evaluator: Evaluator = new HeuristicEvaluator()): Promise<EvalReport> {
  const results: CaseResult[] = await Promise.all(
    evalCases.map(async (evalCase) => {
      const question = questionById.get(evalCase.questionId);
      if (!question) {
        throw new Error(`Eval case ${evalCase.id} references unknown question ${evalCase.questionId}`);
      }

      const dimensionScores = await evaluator.evaluate(question, evalCase.answer);
      const composite = compositeFor(dimensionScores);

      return {
        case: evalCase,
        composite,
        dimensionScores,
        failures: checkExpectations(evalCase, composite, dimensionScores),
      };
    }),
  );

  const knownLimitations = results.filter((r) => r.case.knownLimitation);
  const enforced = results.filter((r) => !r.case.knownLimitation);

  const meanByTier = {} as Record<Tier, number>;
  for (const tier of ["weak", "mixed", "strong"] as Tier[]) {
    const inTier = enforced.filter((r) => r.case.tier === tier);
    meanByTier[tier] = inTier.length
      ? Number((inTier.reduce((sum, r) => sum + r.composite, 0) / inTier.length).toFixed(2))
      : 0;
  }

  // Every strong answer should outscore every weak answer.
  const strong = enforced.filter((r) => r.case.tier === "strong");
  const weak = enforced.filter((r) => r.case.tier === "weak");
  const pairs = strong.length * weak.length;
  const correct = strong.reduce(
    (count, s) => count + weak.filter((w) => s.composite > w.composite).length,
    0,
  );
  const rankingAccuracy = pairs === 0 ? 1 : Number((correct / pairs).toFixed(3));

  const separated =
    meanByTier.strong > meanByTier.mixed && meanByTier.mixed > meanByTier.weak;

  return {
    results,
    enforced,
    knownLimitations,
    meanByTier,
    rankingAccuracy,
    passed: enforced.every((r) => r.failures.length === 0) && rankingAccuracy === 1 && separated,
  };
}

export { tierBounds };
