import type { ScoreCriterion } from "../types.js";

/** Default rubric; weights must sum to 1. */
export const defaultRubric: ScoreCriterion[] = [
  {
    name: "correctness",
    description: "The response is technically accurate and solves the problem asked.",
    weight: 0.4,
  },
  {
    name: "communication",
    description: "The response is clear, structured, and easy to follow.",
    weight: 0.3,
  },
  {
    name: "depth",
    description: "The response shows depth of understanding beyond the surface answer.",
    weight: 0.3,
  },
];
