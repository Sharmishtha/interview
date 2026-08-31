import type { InterviewQuestion, PillarId } from "../types.js";

/**
 * The Executive Leadership Principles question bank: one top-line question per
 * competency, nine in total, with the guide's optional probing questions.
 *
 * The guide's process is one question per pillar, so a session is three
 * questions - see selectQuestions.
 */
export const questionBank: InterviewQuestion[] = [
  // -------------------------------------------------------------------------
  // Plan with Purpose
  // -------------------------------------------------------------------------
  {
    id: "turns-vision-into-action",
    competency: "turns-vision-into-action",
    pillar: "plan-with-purpose",
    askedBy: "ceo",
    text: "Tell me about a time you had to completely change a business's strategy because of a major threat or opportunity. How did you create and sell the new vision to get everyone on board?",
    probes: [
      {
        trigger: "no external trigger established",
        question: "What were the external and internal conditions that created the need for a new strategy?",
      },
      {
        trigger: "jumps to the answer without showing the work",
        question: "What was your discovery process, and can you share more on your approach?",
      },
      {
        trigger: "no follow-through on the plan",
        question: "How did you track progress against the strategic plan?",
      },
    ],
  },
  {
    id: "makes-smart-decisions",
    competency: "makes-smart-decisions",
    pillar: "plan-with-purpose",
    askedBy: "ceo",
    text: "Can you give me an example of a time you had to make a big decision without all the facts, where waiting wasn't an option? How did you balance moving fast with being thorough?",
    probes: [
      {
        trigger: "stakes and urgency unclear",
        question: "What were the stakes involved in this decision? What was the time pressure?",
      },
      {
        trigger: "no clear decision question",
        question: "What was the core question you needed to answer with your decision?",
      },
      {
        trigger: "no alternatives named",
        question: "What were the key factors, variables, and risks you considered? What alternatives did you evaluate?",
      },
    ],
  },
  {
    id: "energizes-the-team",
    competency: "energizes-the-team",
    pillar: "plan-with-purpose",
    askedBy: "ceo",
    text: "Walk me through your most successful effort to create organization-wide energy and optimism for the future.",
    probes: [
      { trigger: "no method described", question: "What was your approach?" },
      { trigger: "vision stated but not shown", question: "How did you articulate the vision?" },
      {
        trigger: "no measured effect",
        question: "What was the impact on employee engagement, morale, and alignment?",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Pursue Excellence
  // -------------------------------------------------------------------------
  {
    id: "raise-the-bar",
    competency: "raise-the-bar",
    pillar: "pursue-excellence",
    askedBy: "cto",
    text: "Describe a time you led a major turnaround for an underperforming part of the business. What was your approach to drive a big improvement in your results?",
    probes: [
      {
        trigger: "no target or result stated",
        question: "What was the specific outcome you were expected to deliver, and what was the result? Why were they challenging to achieve?",
      },
      {
        trigger: "no plan or tracking",
        question: "What was your plan of action? How did you track progress?",
      },
      {
        trigger: "no learning",
        question: "What did this experience teach you about driving performance in a large-scale, complex organization?",
      },
    ],
  },
  {
    id: "act-with-courage",
    competency: "act-with-courage",
    pillar: "pursue-excellence",
    askedBy: "cto",
    text: "Tell me about the most difficult feedback you've ever given to a peer or senior colleague regarding a decision they were making.",
    probes: [
      { trigger: "risk not established", question: "What made this so challenging or risky?" },
      { trigger: "no preparation described", question: "How did you prepare for the situation?" },
      {
        trigger: "no outcome",
        question: "What was the outcome? Was your action successful?",
      },
    ],
  },
  {
    id: "build-resilience",
    competency: "build-resilience",
    pillar: "pursue-excellence",
    askedBy: "cto",
    text: "Describe a time you were leading through a prolonged period of change or uncertainty. Can you give me an example of how you fostered resilience on your team during that time?",
    probes: [
      { trigger: "change not characterised", question: "What was the nature of the change?" },
      {
        trigger: "no communication approach",
        question: "How did you communicate with your team to maintain morale and focus?",
      },
      {
        trigger: "no resolution or lasting effect",
        question: "How did the situation resolve? What was the long term impact?",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Prioritize People
  // -------------------------------------------------------------------------
  {
    id: "be-real",
    competency: "be-real",
    pillar: "prioritize-people",
    askedBy: "cto",
    text: "Tell me about how you effectively communicate and build trust with your broader team.",
    probes: [
      { trigger: "no starting state", question: "What was the current sentiment of the team?" },
      { trigger: "no relational effect", question: "What is the impact on your relationships?" },
      {
        trigger: "no hard message",
        question: "Did you ever have to communicate hard messages? What did you learn from that?",
      },
    ],
  },
  {
    id: "lead-across",
    competency: "lead-across",
    pillar: "prioritize-people",
    askedBy: "ceo",
    text: "Tell me about a time you used your relationships across different functions and business units to drive a complex, cross-functional project to success.",
    probes: [
      {
        trigger: "no approach to silos",
        question: "What's your approach to building the necessary relationships to overcome organizational silos and build trust with them?",
      },
      {
        trigger: "no targeting or framing",
        question: "What was your strategy for identifying and approaching the right people? How did you frame your request to make it compelling?",
      },
      {
        trigger: "no business impact",
        question: "What was the outcome? How did it impact the business?",
      },
    ],
  },
  {
    id: "grow-groundbreakers",
    competency: "grow-groundbreakers",
    pillar: "prioritize-people",
    askedBy: "cto",
    text: "How do you build and develop your leadership team?",
    probes: [
      {
        trigger: "no situation",
        question: "What was the situation - building a new team, or coming into an existing one?",
      },
      {
        trigger: "no traits named",
        question: "What traits do you look for, or look to develop, in a leader?",
      },
      {
        trigger: "no specific people developed",
        question: "Did you develop and/or hire the team? How did you do so?",
      },
    ],
  },
];

export const questionById = new Map(questionBank.map((q) => [q.id, q]));

export const PILLAR_ORDER: PillarId[] = [
  "plan-with-purpose",
  "pursue-excellence",
  "prioritize-people",
];

/**
 * The guide's process: choose one top-line question from each pillar. Selection
 * rotates by default so repeat sessions do not always draw the same three.
 */
export function selectQuestions(seed = Date.now()): InterviewQuestion[] {
  return PILLAR_ORDER.map((pillar) => {
    const options = questionBank.filter((q) => q.pillar === pillar);
    return options[Math.abs(Math.floor(seed / 1000)) % options.length];
  });
}

/** Deterministic selection, for tests and reproducible sessions. */
export function questionsForPillars(ids: string[]): InterviewQuestion[] {
  return ids.map((id) => {
    const question = questionById.get(id);
    if (!question) throw new Error(`Unknown question: ${id}`);
    return question;
  });
}
