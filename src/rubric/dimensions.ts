import type { DimensionId, EvidenceDimension } from "../types.js";

/** How a single answer is graded. Weights sum to 1. */
export const dimensions: EvidenceDimension[] = [
  {
    id: "specificity",
    name: "Specificity",
    description:
      "Names concrete situations, decisions, and people rather than stating a general philosophy.",
    weight: 0.2,
  },
  {
    id: "scope-scale",
    name: "Scope & scale",
    description:
      "Conveys the size of what was owned - headcount, budget, revenue, market. Calibrates seniority.",
    weight: 0.15,
  },
  {
    id: "ownership",
    name: "Ownership",
    description:
      "Distinguishes personal action from the team's, and holds accountability for failures rather than deflecting.",
    weight: 0.15,
  },
  {
    id: "quantified-outcomes",
    name: "Quantified outcomes",
    description: "States results as numbers, with a before and an after.",
    weight: 0.2,
  },
  {
    id: "reflection",
    name: "Reflection",
    description:
      "Shows what was learned, what they would do differently, and second-order consequences.",
    weight: 0.15,
  },
  {
    id: "structure",
    name: "Structure",
    description:
      "Follows a clear situation - complication - action - result arc that a listener can follow.",
    weight: 0.15,
  },
];

export const dimensionById = new Map<DimensionId, EvidenceDimension>(
  dimensions.map((d) => [d.id, d]),
);
