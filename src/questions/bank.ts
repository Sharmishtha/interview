import type { CompetencyId, InterviewQuestion } from "../types.js";

/**
 * The executive question bank. Every question carries its probes - the follow-ups
 * that turn a rehearsed narrative into evidence. Probing is where executive
 * interviews are actually won or lost, so probes are data, not improvisation.
 */
export const questionBank: InterviewQuestion[] = [
  {
    id: "arc",
    text: "Walk me through your career arc. What were the two or three inflection points, and what did you choose at each one?",
    competencies: ["judgment-self-awareness", "strategic-thinking"],
    askedBy: "board-chair",
    kind: "warmup",
    probes: [
      { trigger: "describes moves without reasons", question: "What were you turning down each time?" },
      { trigger: "no inflection identified", question: "Which of those moves would you not make again?" },
    ],
  },
  {
    id: "strategic-bet",
    text: "Tell me about the most consequential strategic bet you have made. What were you choosing between, and what did you give up to make it?",
    competencies: ["strategic-thinking", "business-acumen"],
    askedBy: "board-chair",
    kind: "core",
    probes: [
      { trigger: "no alternatives named", question: "What was the strongest case for the option you rejected?" },
      { trigger: "no disconfirming evidence", question: "What would have told you, six months in, that you were wrong?" },
      { trigger: "no magnitude given", question: "How much capital and how many people were behind that bet?" },
    ],
  },
  {
    id: "pnl",
    text: "Take me through a P&L you have owned. What were the unit economics, and which lever moved them most?",
    competencies: ["business-acumen", "execution-rigor"],
    askedBy: "cfo",
    kind: "core",
    probes: [
      { trigger: "top-line only", question: "What did the margin structure look like underneath that revenue?" },
      { trigger: "no lever identified", question: "If you had to move margin five points in two quarters, what would you pull first?" },
      { trigger: "vague cost story", question: "What did you stop funding, and who was unhappy about it?" },
    ],
  },
  {
    id: "team-built",
    text: "Describe the strongest team you have built. Who did you hire, how did you raise the bar, and where are those people now?",
    competencies: ["leadership-talent"],
    askedBy: "chro",
    kind: "core",
    probes: [
      { trigger: "no named roles", question: "Which single hire changed the most, and what did you see in them that others missed?" },
      { trigger: "no bar-raising mechanism", question: "What did you change about how you hired, concretely?" },
      { trigger: "no exits mentioned", question: "Who did you have to move out to make room for that bar?" },
    ],
  },
  {
    id: "senior-exit",
    text: "Tell me about a time you had to remove a senior leader. How long did you wait, and why that long?",
    competencies: ["leadership-talent", "judgment-self-awareness"],
    askedBy: "chro",
    kind: "stress",
    probes: [
      { trigger: "blames the individual entirely", question: "What part of that was a hiring or management failure on your side?" },
      { trigger: "no timeline", question: "When did you first know? What did you do in the gap?" },
    ],
  },
  {
    id: "execution-failure",
    text: "Describe a strategy you still believe was right, but that you failed to execute. What actually broke?",
    competencies: ["execution-rigor", "judgment-self-awareness"],
    askedBy: "ceo",
    kind: "stress",
    probes: [
      { trigger: "blames external factors", question: "Set the market aside - what was the failure inside your own operating model?" },
      { trigger: "no systemic fix", question: "What did you change structurally so it could not recur?" },
      { trigger: "no early signal", question: "What was the earliest indicator you missed?" },
    ],
  },
  {
    id: "operating-system",
    text: "How do you know, week to week, whether your organisation is on track? Walk me through your actual operating cadence.",
    competencies: ["execution-rigor"],
    askedBy: "ceo",
    kind: "core",
    probes: [
      { trigger: "lagging indicators only", question: "Which of those metrics is leading rather than lagging?" },
      { trigger: "no accountability mechanism", question: "What happens in that meeting when a number is red for the third week?" },
    ],
  },
  {
    id: "board-disagreement",
    text: "Tell me about a time the board or your CEO disagreed with your recommendation. What did you do?",
    competencies: ["stakeholder-influence", "judgment-self-awareness"],
    askedBy: "board-chair",
    kind: "stress",
    probes: [
      { trigger: "candidate won every time", question: "Tell me about one where you were overruled. How did you carry it out?" },
      { trigger: "no coalition work", question: "Who did you talk to before that meeting, and what did you change as a result?" },
    ],
  },
  {
    id: "transformation",
    text: "Describe the hardest transformation you have led. What was the state of the organisation on day one, and on day five hundred?",
    competencies: ["change-leadership", "execution-rigor"],
    askedBy: "ceo",
    kind: "core",
    probes: [
      { trigger: "no baseline state", question: "Give me the numbers on day one - headcount, attrition, revenue, whatever you were watching." },
      { trigger: "no sequencing rationale", question: "What did you deliberately do first, and what did you leave until later?" },
      { trigger: "no durability", question: "What regressed once you stopped pushing on it?" },
    ],
  },
  {
    id: "crisis",
    text: "Take me to the worst week of your leadership career. What was happening, and what did you personally do on the Monday?",
    competencies: ["change-leadership", "judgment-self-awareness"],
    askedBy: "chro",
    kind: "stress",
    probes: [
      { trigger: "abstract narration", question: "What did you actually say, and to whom, first?" },
      { trigger: "no cost acknowledged", question: "What did that week cost you and your team?" },
    ],
  },
  {
    id: "expensive-mistake",
    text: "What is the most expensive mistake you have made as a leader? Give me the number.",
    competencies: ["judgment-self-awareness", "business-acumen"],
    askedBy: "cfo",
    kind: "stress",
    probes: [
      { trigger: "no figure given", question: "Put a number on it - dollars, months, or people." },
      { trigger: "no reasoning flaw identified", question: "What was wrong with how you were thinking at the time?" },
    ],
  },
  {
    id: "hard-feedback",
    text: "What is the hardest piece of feedback you have received? Who gave it to you, and what changed?",
    competencies: ["judgment-self-awareness", "leadership-talent"],
    askedBy: "chro",
    kind: "core",
    probes: [
      { trigger: "humblebrag answer", question: "What is the criticism of you that you think is fair but still resist?" },
      { trigger: "no behavioural change", question: "What would your last team say is different about you now?" },
    ],
  },
];

export const questionById = new Map(questionBank.map((q) => [q.id, q]));

/** Selects a balanced set covering every competency, warmup first. */
export function selectQuestions(count = 6): InterviewQuestion[] {
  const covered = new Set<CompetencyId>();
  const chosen: InterviewQuestion[] = [];
  const ordered = [...questionBank].sort((a, b) => rank(a.kind) - rank(b.kind));

  for (const question of ordered) {
    if (chosen.length >= count) break;
    const addsCoverage = question.competencies.some((c) => !covered.has(c));
    if (addsCoverage || question.kind === "warmup") {
      chosen.push(question);
      question.competencies.forEach((c) => covered.add(c));
    }
  }

  for (const question of ordered) {
    if (chosen.length >= count) break;
    if (!chosen.includes(question)) chosen.push(question);
  }

  return chosen.slice(0, count);
}

function rank(kind: InterviewQuestion["kind"]): number {
  return kind === "warmup" ? 0 : kind === "core" ? 1 : 2;
}
