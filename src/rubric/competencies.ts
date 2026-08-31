import type { Competency, CompetencyId, RubricBand } from "../types.js";

/**
 * Five behaviourally-anchored bands per competency. Written descriptors - rather
 * than a bare 0-10 scale - are what keep scoring consistent between sessions and
 * between scorers.
 */
export const competencies: Competency[] = [
  {
    id: "strategic-thinking",
    name: "Strategic thinking",
    description: "Reasons about multi-year horizons, market dynamics, and tradeoffs under uncertainty.",
    weight: 0.2,
    bands: [
      {
        max: 2,
        label: "Absent",
        descriptor: "Describes activities, not strategy. No market or competitive context.",
      },
      {
        max: 4,
        label: "Emerging",
        descriptor: "States a plan but not the 'why now', and no alternatives considered.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Clear strategy with tradeoffs named and some competitive context.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Reasons across multiple horizons, names the alternatives rejected, and quantifies the bet.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus explicit reasoning under uncertainty, second-order effects, and the disconfirming evidence they watched for.",
      },
    ],
  },
  {
    id: "leadership-talent",
    name: "Leadership & talent",
    description: "Builds, develops, and prunes senior teams; raises the hiring bar; plans succession.",
    weight: 0.18,
    bands: [
      { max: 2, label: "Absent", descriptor: "Talks about teams abstractly. No named hires or exits." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Mentions hiring and developing people but no bar, no hard calls, no outcomes.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Concrete hires and development stories; has managed someone out.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Built a senior bench deliberately, raised the bar measurably, and can say where those people went next.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus succession planning, a track record of alumni now running things, and candour about a hire they got wrong.",
      },
    ],
  },
  {
    id: "business-acumen",
    name: "Business & financial acumen",
    description: "Owns a P&L; understands unit economics, capital allocation, and the levers that move them.",
    weight: 0.15,
    bands: [
      { max: 2, label: "Absent", descriptor: "No financial vocabulary. Cannot size what they owned." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Cites top-line numbers only; no grasp of margin structure or cost drivers.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Describes a P&L they owned with revenue, cost, and the main lever.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Fluent in unit economics; explains which lever they pulled, by how much, and the tradeoff it cost.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus capital-allocation reasoning across competing investments and what they chose not to fund.",
      },
    ],
  },
  {
    id: "execution-rigor",
    name: "Execution & operational rigor",
    description: "Converts strategy into outcomes through metrics, cadence, and accountability.",
    weight: 0.15,
    bands: [
      { max: 2, label: "Absent", descriptor: "Strategy stops at the idea. No delivery mechanism." },
      { max: 4, label: "Emerging", descriptor: "Describes plans and effort, but no operating rhythm or metrics." },
      {
        max: 6,
        label: "Solid",
        descriptor: "Names the metrics tracked and the cadence used to hold the org accountable.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Built the operating system: leading indicators, clear owners, and a story of catching a miss early.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus a case where execution failed, the root cause they found, and the systemic fix.",
      },
    ],
  },
  {
    id: "stakeholder-influence",
    name: "Board & stakeholder influence",
    description: "Communicates with boards, investors, and peers; navigates disagreement without authority.",
    weight: 0.12,
    bands: [
      { max: 2, label: "Absent", descriptor: "No exposure to boards, investors, or executive peers." },
      { max: 4, label: "Emerging", descriptor: "Has presented to senior stakeholders but only reported status." },
      {
        max: 6,
        label: "Solid",
        descriptor: "Has carried a real recommendation to a board or peer group and handled pushback.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Changed a senior stakeholder's mind on a consequential decision; can explain how they built the coalition.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus a case where they were overruled, how they committed anyway, and what it cost them.",
      },
    ],
  },
  {
    id: "change-leadership",
    name: "Change leadership",
    description: "Leads through transformation, crisis, and sustained ambiguity.",
    weight: 0.1,
    bands: [
      { max: 2, label: "Absent", descriptor: "Only steady-state experience." },
      { max: 4, label: "Emerging", descriptor: "Lived through a change someone else led." },
      { max: 6, label: "Solid", descriptor: "Led a real change effort and can describe the resistance met." },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Can state the day-one and day-500 condition of the org in concrete terms, and what they sequenced first.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus how they sustained it after the urgency faded and what regressed when they stopped pushing.",
      },
    ],
  },
  {
    id: "judgment-self-awareness",
    name: "Judgment & self-awareness",
    description: "Decision quality, accountability for failure, and an accurate read of their own limits.",
    weight: 0.1,
    bands: [
      { max: 2, label: "Absent", descriptor: "Failures are attributed to others or to circumstance." },
      { max: 4, label: "Emerging", descriptor: "Admits a mistake but a safe, low-stakes one." },
      {
        max: 6,
        label: "Solid",
        descriptor: "Owns a costly mistake plainly and states what they learned.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Owns the mistake, identifies the flaw in their own reasoning that caused it, and shows the changed behaviour since.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus an accurate account of the conditions under which they are the wrong leader for a job.",
      },
    ],
  },
];

export const competencyById = new Map<CompetencyId, Competency>(competencies.map((c) => [c.id, c]));

/** Returns the behaviourally-anchored band a 0-10 score falls into. */
export function bandFor(competency: Competency, value: number): RubricBand {
  return competency.bands.find((b) => value <= b.max) ?? competency.bands[competency.bands.length - 1];
}
