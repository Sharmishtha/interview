import type { Competency, CompetencyId, Pillar, PillarId, RubricBand } from "../types.js";

export const pillars: Pillar[] = [
  {
    id: "plan-with-purpose",
    name: "Plan with Purpose",
    description: "Sets direction, decides under uncertainty, and creates energy behind the plan.",
    },
  {
    id: "pursue-excellence",
    name: "Pursue Excellence",
    description: "Drives results, says the hard thing, and holds up through sustained pressure.",
  },
  {
    id: "prioritize-people",
    name: "Prioritize People",
    description: "Builds trust, works across the organisation, and grows other leaders.",
  },
];

export const pillarById = new Map<PillarId, Pillar>(pillars.map((p) => [p.id, p]));

/**
 * The nine Executive Leadership Principles competencies, three per pillar.
 *
 * Positive and negative signals are taken from the interview guide and drive the
 * band descriptors: the bottom bands describe the guide's negative signals, the
 * top bands describe its positive signals fully realised. All nine carry equal
 * weight because the guide treats the three pillars as equally required and asks
 * one question per pillar.
 */
const EQUAL_WEIGHT = 1 / 9;

export const competencies: Competency[] = [
  // -------------------------------------------------------------------------
  // Plan with Purpose
  // -------------------------------------------------------------------------
  {
    id: "turns-vision-into-action",
    name: "Turns Vision Into Action",
    pillar: "plan-with-purpose",
    description: "Sets a strategy in response to a threat or opportunity, and sells it.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Connects their vision and plan to the broader company strategy and objectives",
      "Communicates strategies that connect big goals to next steps",
      "Strategic thinking is evident and integrated throughout their responses",
    ],
    negativeSignals: [
      "Focused on the tactical here and now",
      "Confuses goals with strategy",
      "Cannot articulate a coherent vision of the future",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Cannot articulate a coherent vision. Stays in the tactical here and now." },
      { max: 4, label: "Emerging", descriptor: "Describes goals as though they were strategy, with no path from one to the other." },
      { max: 6, label: "Solid", descriptor: "Sets out a real strategy and connects the big goal to the next steps." },
      { max: 8, label: "Strong", descriptor: "Ties the vision to the broader company strategy, and shows how progress was tracked against it." },
      { max: 10, label: "Positive signal", descriptor: "Strategic thinking runs through the whole answer: the external trigger, the discovery process, the plan, and how the organisation was brought along." },
    ],
  },
  {
    id: "makes-smart-decisions",
    name: "Makes Smart Decisions",
    pillar: "plan-with-purpose",
    description: "Decides without complete information when waiting is not an option.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Demonstrates the ability to make a sound decision, even in the absence of complete information, with a clear, repeatable, and logical decision-making framework",
      "Includes input from stakeholders to make decisions",
      "Shows an understanding of when to be decisive and when to be deliberative",
    ],
    negativeSignals: [
      "Makes decisions based on assumptions or haphazardly, delaying decision making",
      "Ignores different points of view or struggles to make decisions without group consensus",
      "Cannot clearly articulate the rationale behind key decisions or the alternatives that they considered",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Decides on assumptions, or defers until the decision makes itself." },
      { max: 4, label: "Emerging", descriptor: "Reached a decision but cannot explain the rationale or name any alternative considered." },
      { max: 6, label: "Solid", descriptor: "Explains the stakes, the core question, and the alternatives weighed." },
      { max: 8, label: "Strong", descriptor: "Shows a repeatable decision framework and the stakeholder input that fed it." },
      { max: 10, label: "Positive signal", descriptor: "All of the above, plus a clear sense of when to be decisive versus deliberative, and what they would have needed to decide differently." },
    ],
  },
  {
    id: "energizes-the-team",
    name: "Energizes the Team",
    pillar: "plan-with-purpose",
    description: "Creates organisation-wide energy and optimism for the future.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Talks about future possibilities in a positive way",
      "Is an inspiring storyteller who can articulate a vision in a way that is both ambitious and relatable",
      "Is able to create energy and optimism",
    ],
    negativeSignals: [
      "Has difficulty describing the vision in a compelling way - may be generic, uninspiring or purely financial",
      "Struggles to energize and build excitement",
      "Communicates at too high of a level",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Communicates at altitude only. Nothing here would move an audience." },
      { max: 4, label: "Emerging", descriptor: "The vision is generic, or framed purely in financial terms." },
      { max: 6, label: "Solid", descriptor: "Describes a real effort to build energy, with a concrete approach." },
      { max: 8, label: "Strong", descriptor: "Tells the story in a way that is ambitious and relatable, and cites the effect on engagement or morale." },
      { max: 10, label: "Positive signal", descriptor: "An inspiring storyteller: the vision lands, the energy is measurable, and the optimism survived contact with the organisation." },
    ],
  },

  // -------------------------------------------------------------------------
  // Pursue Excellence
  // -------------------------------------------------------------------------
  {
    id: "raise-the-bar",
    name: "Raise the Bar",
    pillar: "pursue-excellence",
    description: "Leads a turnaround of an underperforming part of the business.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Pushes self and others to achieve results",
      "Defines what success looks like and removes barriers to allow their team to achieve it",
      "Can articulate not just the result, but the process and perseverance required to achieve it",
    ],
    negativeSignals: [
      "Is reluctant to push teams for results or seems to give up easily when faced with obstacles",
      "Goes for results at all costs without appropriate concern for people, teams, due process, or values",
      "Focuses on activity rather than outcomes",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Describes activity rather than outcomes, or gave up when it got hard." },
      { max: 4, label: "Emerging", descriptor: "States a result but not the plan, the obstacles, or the perseverance behind it." },
      { max: 6, label: "Solid", descriptor: "Defines what success looked like and describes how progress was tracked." },
      { max: 8, label: "Strong", descriptor: "Pushes for results while removing barriers, with the outcome and the process both clear." },
      { max: 10, label: "Positive signal", descriptor: "All of the above, plus what the experience taught them about driving performance at scale - and results achieved without trampling people or values." },
    ],
  },
  {
    id: "act-with-courage",
    name: "Act with Courage",
    pillar: "pursue-excellence",
    description: "Gives difficult feedback to a peer or senior colleague.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Addresses conflicts and difficult conversations directly and with respect",
      "Willing to take calculated risks for the good of the organization",
      "Demonstrates a strong willingness to stand for their beliefs",
    ],
    negativeSignals: [
      "Avoids or postpones conflict or difficult issues",
      "Fails to take a stand on important issues",
      "Communicates bluntly or fails to recognize the impact on relationships with others",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Avoided the conversation, or let someone else have it." },
      { max: 4, label: "Emerging", descriptor: "Raised the issue but softened it to the point of no effect." },
      { max: 6, label: "Solid", descriptor: "Had the conversation directly, and can say what made it risky." },
      { max: 8, label: "Strong", descriptor: "Prepared deliberately, spoke plainly and with respect, and owns the outcome whether or not it worked." },
      { max: 10, label: "Positive signal", descriptor: "Took a real personal risk for the good of the organisation, held the position under pressure, and preserved the relationship." },
    ],
  },
  {
    id: "build-resilience",
    name: "Build Resilience",
    pillar: "pursue-excellence",
    description: "Leads through a prolonged period of change or uncertainty.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Displays confidence when facing change, pressure or uncertainty",
      "Clearly articulates what they learned and how they grew from the experience",
      "Encourages team to grow and learn from the experience",
    ],
    negativeSignals: [
      "Gets easily rattled, appearing stressed, defensive or emotional when discussing times of change",
      "Shifts the blame to external factors or other people",
      "Seems unable to extract positive learnings from negative experiences",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Blames external factors or other people, and takes nothing from the experience." },
      { max: 4, label: "Emerging", descriptor: "Recounts the difficulty but shows no growth and little composure." },
      { max: 6, label: "Solid", descriptor: "Describes how they communicated with the team to hold morale and focus." },
      { max: 8, label: "Strong", descriptor: "Confident about the period, clear on what they learned, and specific about the long-term impact." },
      { max: 10, label: "Positive signal", descriptor: "All of the above, plus deliberate work to help the team grow through it, and honesty about what it cost." },
    ],
  },

  // -------------------------------------------------------------------------
  // Prioritize People
  // -------------------------------------------------------------------------
  {
    id: "be-real",
    name: "Be Real",
    pillar: "prioritize-people",
    description: "Communicates and builds trust with the broader team.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Follows through on commitments",
      "Seen as open, direct, truthful, and authentic",
      "Speaks to the importance of authenticity and can provide powerful examples of it in action",
    ],
    negativeSignals: [
      "Covers up or deflects blame for mistakes or failures",
      "Fails to build rapport or connect with team on a personal level",
      "Appear slick or inauthentic",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Deflects blame, or the answer reads as slick rather than genuine." },
      { max: 4, label: "Emerging", descriptor: "Speaks about trust in the abstract with no example of it being tested." },
      { max: 6, label: "Solid", descriptor: "Gives a real example of communicating openly, including a hard message." },
      { max: 8, label: "Strong", descriptor: "Direct and truthful under pressure, followed through on the commitment, and can say what it cost." },
      { max: 10, label: "Positive signal", descriptor: "A powerful, specific example of authenticity in action, including a mistake they owned publicly." },
    ],
  },
  {
    id: "lead-across",
    name: "Lead Across",
    pillar: "prioritize-people",
    description: "Uses relationships across functions to drive a complex cross-functional effort.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Builds strong relationships across a variety of business functions and locations, drawing upon them to exchange ideas, resources or know-how",
      "Partners with others to make decisions, trade-offs and prioritize work",
      "Provides specific examples of how their relationships created tangible value for their organization",
    ],
    negativeSignals: [
      "Builds limited relationships with different groups",
      "Has difficulty determining who to contact to get things done",
      "Gives examples that are superficial or lack strategic impact",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Works inside their own function. Cannot say who to go to elsewhere." },
      { max: 4, label: "Emerging", descriptor: "Names cross-functional work, but the example is superficial or low-stakes." },
      { max: 6, label: "Solid", descriptor: "Drove a real cross-functional effort and can describe how the relationships were built." },
      { max: 8, label: "Strong", descriptor: "Explains how they identified the right people, framed the ask compellingly, and made trade-offs jointly." },
      { max: 10, label: "Positive signal", descriptor: "All of the above, plus a specific account of the tangible business value those relationships created." },
    ],
  },
  {
    id: "grow-groundbreakers",
    name: "Grow Groundbreakers",
    pillar: "prioritize-people",
    description: "Builds and develops a leadership team.",
    weight: EQUAL_WEIGHT,
    positiveSignals: [
      "Places a high priority on developing others and can articulate a clear strategy for it",
      "Thinks in terms of building organizational capability and leadership bench",
      "Is a passionate coach and mentor",
    ],
    negativeSignals: [
      "Views team development as just an HR function",
      "Cannot provide specific examples of people they have developed",
      "Appears more focused on their own career than on the growth of others",
    ],
    bands: [
      { max: 2, label: "Negative signal", descriptor: "Treats development as HR's job, or talks mainly about their own progression." },
      { max: 4, label: "Emerging", descriptor: "Believes in developing people but cannot name anyone they actually developed." },
      { max: 6, label: "Solid", descriptor: "Names the traits they hire and develop for, with real examples of both." },
      { max: 8, label: "Strong", descriptor: "Has a clear, articulable strategy for building the leadership bench, not just filling roles." },
      { max: 10, label: "Positive signal", descriptor: "A passionate coach: specific people they grew, where those people are now, and the organisational capability left behind." },
    ],
  },
];

export const competencyById = new Map<CompetencyId, Competency>(competencies.map((c) => [c.id, c]));

export function competenciesInPillar(pillar: PillarId): Competency[] {
  return competencies.filter((c) => c.pillar === pillar);
}

/** Returns the behaviourally-anchored band a 0-10 score falls into. */
export function bandFor(competency: Competency, value: number): RubricBand {
  return competency.bands.find((b) => value <= b.max) ?? competency.bands[competency.bands.length - 1];
}
