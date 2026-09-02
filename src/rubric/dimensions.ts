import type { DimensionGroup, DimensionId, EvidenceDimension } from "../types.js";

/**
 * How a single answer is graded. Weights sum to 1.
 *
 * The guide instructs interviewers to establish the Situation, Task, Action,
 * Result and Learning, so structure and learning carry real weight here.
 *
 * **The substance / story split is a decision, not an accident.** Substance is
 * what the answer contains; story is how it lands. Story is a quarter of the
 * composite - see GROUP_WEIGHTS - which is enough to change a grade and not
 * enough to let a beautifully told empty answer beat a substantive one. That is
 * the right way round for an executive interview: an assessor who cannot retell
 * your story will not argue for you in the debrief, but one who can retell a
 * story with nothing in it will not either.
 *
 * STAR-L structure is filed under substance. It is a judgement call - an arc is
 * a narrative property - but what it actually measures is whether all five
 * elements are *present*, which is a completeness test.
 */
export const dimensions: EvidenceDimension[] = [
  {
    id: "specificity",
    name: "Specificity",
    description:
      "Names a concrete situation, decision, and people rather than stating a general philosophy.",
    group: "substance",
    weight: 0.14,
  },
  {
    id: "scope-scale",
    name: "Scope & scale",
    description:
      "Conveys the size of what was owned - headcount, budget, revenue, market. Calibrates seniority.",
    group: "substance",
    weight: 0.08,
  },
  {
    id: "ownership",
    name: "Ownership",
    description:
      "Distinguishes personal action from the team's, and holds accountability rather than shifting blame.",
    group: "substance",
    weight: 0.13,
  },
  {
    id: "quantified-outcomes",
    name: "Quantified outcomes",
    description: "States the Result as numbers, with a before and an after.",
    group: "substance",
    weight: 0.14,
  },
  {
    id: "learning",
    name: "Learning",
    description:
      "The fifth element of STAR-L: what they took from the experience and would do differently.",
    group: "substance",
    weight: 0.12,
  },
  {
    id: "star-structure",
    name: "STAR-L structure",
    description:
      "Situation, Task, Action, Result and Learning are all present and a listener can follow them.",
    group: "substance",
    weight: 0.14,
  },
  {
    id: "story-shape",
    name: "Story shape",
    description:
      "Reads as a story rather than a summary: a scene, something that went wrong or changed, and a turn - not a list of activities in order.",
    group: "story",
    weight: 0.12,
  },
  {
    id: "memorability",
    name: "Memorability",
    description:
      "Carries at least one detail nobody else could have supplied - a named person, an odd specific, a line worth quoting - so the interviewer can retell it a week later.",
    group: "story",
    weight: 0.13,
  },
];

/**
 * The intended balance. Asserted by the test suite, so changing a single
 * dimension's weight cannot quietly move the balance of the whole rubric.
 */
export const GROUP_WEIGHTS: Record<DimensionGroup, number> = {
  substance: 0.75,
  story: 0.25,
};

export const dimensionById = new Map<DimensionId, EvidenceDimension>(
  dimensions.map((d) => [d.id, d]),
);

export function dimensionsIn(group: DimensionGroup): EvidenceDimension[] {
  return dimensions.filter((d) => d.group === group);
}

/** What a group actually contributes, for checking against GROUP_WEIGHTS. */
export function weightOf(group: DimensionGroup): number {
  return Number(
    dimensionsIn(group)
      .reduce((sum, d) => sum + d.weight, 0)
      .toFixed(4),
  );
}
