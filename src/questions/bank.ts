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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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
    intensity: "guide",
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

/**
 * Harder variants on the same nine competencies. Each one requires owning a
 * failure rather than narrating a success, which is where the guide's negative
 * signals - blame-shifting, avoiding conflict, activity over outcomes - actually
 * surface. A polished candidate can carry the guide questions on rehearsed
 * material; these are the ones that separate.
 */
export const pressureQuestions: InterviewQuestion[] = [
  {
    id: "failed-strategy",
    competency: "turns-vision-into-action",
    pillar: "plan-with-purpose",
    askedBy: "ceo",
    text: "Tell me about a strategy you set that failed. What did you get wrong about the market, or about your own organisation?",
    intensity: "pressure",
    probes: [
      { trigger: "blames execution only", question: "Set execution aside - what was wrong with the strategy itself?" },
      { trigger: "no early signal", question: "When did you first suspect it was not working, and what did you do that week?" },
      { trigger: "no cost", question: "What did that cost the company in money and in time?" },
    ],
  },
  {
    id: "bad-decision",
    competency: "makes-smart-decisions",
    pillar: "plan-with-purpose",
    askedBy: "ceo",
    text: "Tell me about a decision you got badly wrong. What was the flaw in your reasoning at the time?",
    intensity: "pressure",
    probes: [
      { trigger: "no figure", question: "Put a number on what it cost - dollars, months, or people." },
      { trigger: "externalises the cause", question: "What information did you have that you discounted?" },
      { trigger: "no changed behaviour", question: "What do you do differently now because of it?" },
    ],
  },
  {
    id: "failed-to-rally",
    competency: "energizes-the-team",
    pillar: "plan-with-purpose",
    askedBy: "ceo",
    text: "Tell me about a time you tried to rally an organisation behind something and it did not land. Why not?",
    intensity: "pressure",
    probes: [
      { trigger: "blames the audience", question: "What was wrong with how you told it, rather than how they heard it?" },
      { trigger: "no evidence of failure", question: "How did you know it had not landed?" },
      { trigger: "no second attempt", question: "What did you change the next time you had to do this?" },
    ],
  },
  {
    id: "missed-target",
    competency: "raise-the-bar",
    pillar: "pursue-excellence",
    askedBy: "cto",
    text: "Tell me about a target you set that your team missed. Was the target wrong, or was the execution wrong?",
    intensity: "pressure",
    probes: [
      { trigger: "no numbers", question: "What was the target, and what was the actual?" },
      { trigger: "protects the team or himself", question: "Which part of that miss was yours?" },
      { trigger: "no consequence", question: "What happened to the people who missed it?" },
    ],
  },
  {
    id: "stayed-silent",
    competency: "act-with-courage",
    pillar: "pursue-excellence",
    askedBy: "cto",
    text: "Tell me about a time you stayed silent when you should have spoken up. What stopped you?",
    intensity: "pressure",
    probes: [
      { trigger: "deflects to a safe example", question: "What was the most senior room you have held your tongue in?" },
      { trigger: "no cost named", question: "What went wrong that might not have, if you had spoken?" },
      { trigger: "no change", question: "What is different about how you handle that now?" },
    ],
  },
  {
    id: "personal-resilience",
    competency: "build-resilience",
    pillar: "pursue-excellence",
    askedBy: "cto",
    text: "Tell me about a period where you personally struggled to stay resilient. What did your team see of that?",
    intensity: "pressure",
    probes: [
      { trigger: "denies struggling", question: "What did it cost you personally?" },
      { trigger: "no visible effect", question: "How would your directs describe you during that period?" },
      { trigger: "no recovery", question: "What did you put in place so it did not happen the same way again?" },
    ],
  },
  {
    id: "broken-commitment",
    competency: "be-real",
    pillar: "prioritize-people",
    askedBy: "cto",
    text: "Tell me about a commitment you made to your team and then could not keep. How did you handle it?",
    intensity: "pressure",
    probes: [
      { trigger: "no specific promise", question: "What exactly had you told them, and in what forum?" },
      { trigger: "hides behind circumstance", question: "Did you go back and say it yourself, or did they find out another way?" },
      { trigger: "no trust cost", question: "What did that do to your credibility, and how long did it take to rebuild?" },
    ],
  },
  {
    id: "damaged-relationship",
    competency: "lead-across",
    pillar: "prioritize-people",
    askedBy: "ceo",
    text: "Tell me about a cross-functional relationship you damaged. What was your part in it?",
    intensity: "pressure",
    probes: [
      { trigger: "blames the counterpart", question: "Describe it from their side of the table." },
      { trigger: "no business impact", question: "What did the business lose while that relationship was broken?" },
      { trigger: "no repair", question: "What did you do to repair it, and did it work?" },
    ],
  },
  {
    id: "promotion-that-failed",
    competency: "grow-groundbreakers",
    pillar: "prioritize-people",
    askedBy: "cto",
    text: "Tell me about someone you promoted who then failed in the role. What did you miss?",
    intensity: "pressure",
    probes: [
      { trigger: "blames the individual", question: "What did you see in them that you over-weighted?" },
      { trigger: "no support given", question: "What support did you put around them, and was it enough?" },
      { trigger: "no resolution", question: "Where did that person end up, and how did you handle it with them?" },
    ],
  },
];

/** Every question, guide and pressure alike. */
export const allQuestions: InterviewQuestion[] = [...questionBank, ...pressureQuestions];

export const questionById = new Map(allQuestions.map((q) => [q.id, q]));

export const PILLAR_ORDER: PillarId[] = [
  "plan-with-purpose",
  "pursue-excellence",
  "prioritize-people",
];

/**
 * The guide's process: choose one top-line question from each pillar. Selection
 * rotates by default so repeat sessions do not always draw the same three.
 */
/**
 * One question per pillar, as the guide's process requires.
 *
 * `intensity` chooses the pool: "guide" for the guide's own questions, "pressure"
 * for the harder failure-owning variants, and "mixed" to draw from both.
 */
export function selectQuestions(
  seed = Date.now(),
  intensity: "guide" | "pressure" | "mixed" = "guide",
): InterviewQuestion[] {
  const pool =
    intensity === "guide" ? questionBank : intensity === "pressure" ? pressureQuestions : allQuestions;

  return PILLAR_ORDER.map((pillar, index) => {
    const options = pool.filter((q) => q.pillar === pillar);
    return options[pick(seed, index) % options.length];
  });
}

/**
 * Mixes the pillar index into the seed so the three choices are independent.
 * Indexing every pillar with the same value made the picks move in lockstep and
 * left only three of the twenty-seven possible interviews reachable.
 */
function pick(seed: number, salt: number): number {
  let hash = Math.abs(Math.floor(seed / 1000)) + salt * 0x9e3779b1;
  hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return Math.abs(hash ^ (hash >>> 16));
}

/** Deterministic selection, for tests and reproducible sessions. */
export function questionsForPillars(ids: string[]): InterviewQuestion[] {
  return ids.map((id) => {
    const question = questionById.get(id);
    if (!question) throw new Error(`Unknown question: ${id}`);
    return question;
  });
}
