import type { Competency, CompetencyId, RubricBand } from "../types.js";

/**
 * Rubric for a VP of Engineering at a publicly traded company.
 *
 * Five behaviourally-anchored bands per competency. Written descriptors - rather
 * than a bare 0-10 scale - are what keep scoring consistent between sessions.
 */
export const competencies: Competency[] = [
  {
    id: "technical-judgment",
    name: "Technical judgment",
    description:
      "Architecture, build-versus-buy, and platform decisions at scale. Depth without doing the IC's job.",
    weight: 0.16,
    bands: [
      {
        max: 2,
        label: "Absent",
        descriptor: "Defers all technical calls to others, or is still operating as a senior IC.",
      },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Describes what was built but not why, and no alternative was seriously weighed.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Owns a significant architecture decision and can name the tradeoff it cost.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Names the options rejected and why, ties the decision to a business constraint, and states what would have changed their mind.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus a reversible-versus-irreversible framing, the migration cost they accepted up front, and a decision they later reversed on evidence.",
      },
    ],
  },
  {
    id: "org-design-talent",
    name: "Org design & talent",
    description:
      "Team structure, hiring bar, leveling, span of control, attrition, and senior succession.",
    weight: 0.16,
    bands: [
      { max: 2, label: "Absent", descriptor: "Talks about teams abstractly. No structure, no named hires or exits." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Has hired engineers but shows no view on leveling, span of control, or the bar.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor:
          "Designed a team structure with a rationale, hired against a defined bar, and has managed someone out.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Reshaped an org deliberately - Conway's-law reasoning, span of control, leveling calibration - and can cite attrition and internal promotion numbers.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus a senior bench they built who now run orgs elsewhere, and candour about a leadership hire they got wrong and why.",
      },
    ],
  },
  {
    id: "delivery-predictability",
    name: "Delivery predictability",
    description:
      "Shipping to committed dates. At a public company, roadmap credibility is tied to guidance, so misses are expensive.",
    weight: 0.16,
    bands: [
      { max: 2, label: "Absent", descriptor: "No commitment discipline. Dates are aspirations." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Tracks delivery but only lagging indicators; surprises land late and unexplained.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Runs a real planning cadence, hits most commitments, and escalates slips before the deadline.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Can quote a hit rate against committed dates, uses leading indicators to catch slips early, and has renegotiated scope rather than quietly missing.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus explicit handling of a date tied to external guidance - how they raised it, what they cut, and what they told the CEO and when.",
      },
    ],
  },
  {
    id: "reliability-quality-risk",
    name: "Reliability, quality & risk",
    description:
      "SLOs, incident response, security posture, tech debt, and the audit and compliance obligations of a public issuer.",
    weight: 0.13,
    bands: [
      { max: 2, label: "Absent", descriptor: "No ownership of uptime, quality, or security." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Reacts to incidents but has no SLOs, no postmortem discipline, no debt strategy.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Runs blameless postmortems against defined SLOs and has a stated position on tech debt.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Led through a severe incident with a clear personal role, drove the systemic fix, and can cite the reliability numbers before and after.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus fluency in the public-company overlay - change management and access controls under SOX, and when an incident becomes a disclosure question.",
      },
    ],
  },
  {
    id: "rd-efficiency",
    name: "R&D efficiency",
    description:
      "Owning an R&D budget: headcount planning, cost per outcome, cloud spend, and capitalised versus expensed engineering work.",
    weight: 0.12,
    bands: [
      { max: 2, label: "Absent", descriptor: "No budget vocabulary. Cannot size the spend they controlled." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Knows their headcount but not the cost, and treats budget as someone else's problem.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Owned an R&D budget and can describe headcount planning and the main cost drivers.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Quotes R&D as a percentage of revenue or cost per engineer, has made a real efficiency tradeoff, and knows what they chose not to fund.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus capitalisation-versus-expense reasoning and how engineering choices landed in the reported numbers.",
      },
    ],
  },
  {
    id: "cross-functional-influence",
    name: "Cross-functional & executive influence",
    description:
      "Working with product, sales, and finance; translating technical investment for a CEO, board, or analysts.",
    weight: 0.12,
    bands: [
      { max: 2, label: "Absent", descriptor: "Engineering operates in isolation. No peer or executive exposure." },
      {
        max: 4,
        label: "Emerging",
        descriptor: "Presents status to executives but has never carried a contested recommendation.",
      },
      {
        max: 6,
        label: "Solid",
        descriptor: "Has resolved a real roadmap conflict with product or sales and handled pushback.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Won funding for unglamorous work by framing it in business terms, and changed a peer executive's mind on something consequential.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus board or analyst-facing communication, and a case where they were overruled, committed anyway, and said what it cost.",
      },
    ],
  },
  {
    id: "scaling-change",
    name: "Scaling & change leadership",
    description: "Growing or shrinking an org, platform migrations, and integrating an acquisition.",
    weight: 0.08,
    bands: [
      { max: 2, label: "Absent", descriptor: "Only steady-state experience at one size." },
      { max: 4, label: "Emerging", descriptor: "Lived through scaling someone else led." },
      {
        max: 6,
        label: "Solid",
        descriptor: "Led a real scaling or migration effort and can describe what broke.",
      },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "States the before and after in concrete terms - headcount, teams, architecture - and what they sequenced first and why.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus how they kept shipping through it, and what regressed once the push stopped.",
      },
    ],
  },
  {
    id: "judgment-self-awareness",
    name: "Judgment & self-awareness",
    description: "Decision quality, accountability for failure, and an accurate read of their own limits.",
    weight: 0.07,
    bands: [
      { max: 2, label: "Absent", descriptor: "Failures belong to other teams, prior leadership, or the market." },
      { max: 4, label: "Emerging", descriptor: "Admits a mistake, but a safe and low-stakes one." },
      { max: 6, label: "Solid", descriptor: "Owns a costly mistake plainly and states what they learned." },
      {
        max: 8,
        label: "Strong",
        descriptor:
          "Owns it, identifies the flaw in their own reasoning that caused it, and shows the changed behaviour since.",
      },
      {
        max: 10,
        label: "Exceptional",
        descriptor:
          "All of the above, plus an accurate account of the conditions under which they are the wrong leader for the job.",
      },
    ],
  },
];

export const competencyById = new Map<CompetencyId, Competency>(competencies.map((c) => [c.id, c]));

/** Returns the behaviourally-anchored band a 0-10 score falls into. */
export function bandFor(competency: Competency, value: number): RubricBand {
  return competency.bands.find((b) => value <= b.max) ?? competency.bands[competency.bands.length - 1];
}
