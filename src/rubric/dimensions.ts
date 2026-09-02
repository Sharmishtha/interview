import type { DimensionId, EvidenceDimension } from "../types.js";

/**
 * How a single answer is graded. Weights sum to 1.
 *
 * The guide instructs interviewers to establish the Situation, Task, Action,
 * Result and Learning, so structure and learning carry real weight here.
 *
 * Story shape and memorability were added because a technically complete answer
 * can still be forgotten by the afternoon. An interviewer sits through many of
 * these; the one they argue for later is the one they can still retell.
 */
export const dimensions: EvidenceDimension[] = [
  {
    id: "specificity",
    name: "Specificity",
    description:
      "Names a concrete situation, decision, and people rather than stating a general philosophy.",
    weight: 0.14,
  },
  {
    id: "scope-scale",
    name: "Scope & scale",
    description:
      "Conveys the size of what was owned - headcount, budget, revenue, market. Calibrates seniority.",
    weight: 0.08,
  },
  {
    id: "ownership",
    name: "Ownership",
    description:
      "Distinguishes personal action from the team's, and holds accountability rather than shifting blame.",
    weight: 0.13,
  },
  {
    id: "quantified-outcomes",
    name: "Quantified outcomes",
    description: "States the Result as numbers, with a before and an after.",
    weight: 0.14,
  },
  {
    id: "learning",
    name: "Learning",
    description:
      "The fifth element of STAR-L: what they took from the experience and would do differently.",
    weight: 0.13,
  },
  {
    id: "star-structure",
    name: "STAR-L structure",
    description:
      "Situation, Task, Action, Result and Learning are all present and a listener can follow them.",
    weight: 0.15,
  },
  {
    id: "story-shape",
    name: "Story shape",
    description:
      "Reads as a story rather than a summary: a scene, something that went wrong or changed, and a turn - not a list of activities in order.",
    weight: 0.11,
  },
  {
    id: "memorability",
    name: "Memorability",
    description:
      "Carries at least one detail nobody else could have supplied - a named person, an odd specific, a line worth quoting - so the interviewer can retell it a week later.",
    weight: 0.12,
  },
];

export const dimensionById = new Map<DimensionId, EvidenceDimension>(
  dimensions.map((d) => [d.id, d]),
);
