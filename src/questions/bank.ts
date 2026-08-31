import type { CompetencyId, InterviewQuestion } from "../types.js";

/**
 * Question bank for a VP of Engineering candidate at a publicly traded company.
 *
 * Every question carries its probes - the follow-ups that turn a rehearsed
 * narrative into evidence. Probing is where these interviews are won or lost, so
 * probes are stored data, not improvisation.
 */
export const questionBank: InterviewQuestion[] = [
  {
    id: "arc",
    text: "Walk me through how you got to running engineering at this scale. What were the two or three inflection points, and what did you choose at each one?",
    competencies: ["judgment-self-awareness", "org-design-talent"],
    askedBy: "ceo",
    kind: "warmup",
    probes: [
      { trigger: "lists roles without reasons", question: "What were you turning down each time?" },
      { trigger: "no inflection identified", question: "Which of those moves would you not make again?" },
    ],
  },
  {
    id: "architecture-bet",
    text: "Tell me about the most consequential architecture decision you have owned. What were you choosing between, and what did it cost you?",
    competencies: ["technical-judgment"],
    askedBy: "cto",
    kind: "core",
    probes: [
      { trigger: "no alternatives named", question: "What was the strongest case for the option you rejected?" },
      { trigger: "no reversibility framing", question: "Was that a one-way door? What would it have taken to undo?" },
      { trigger: "no cost acknowledged", question: "How many engineer-months did the migration actually take?" },
    ],
  },
  {
    id: "missed-date",
    text: "Tell me about a release you committed to and missed. What did you tell me, and when did you tell me?",
    competencies: ["delivery-predictability", "judgment-self-awareness"],
    askedBy: "ceo",
    kind: "stress",
    probes: [
      { trigger: "blames another function", question: "Set product and sales aside - what failed inside engineering?" },
      { trigger: "no early signal", question: "What was the earliest indicator you had, and why did you not act on it then?" },
      { trigger: "no external consequence", question: "Was that date tied to anything we had said publicly?" },
    ],
  },
  {
    id: "predictability-system",
    text: "How do you know, week to week, whether engineering will hit its commitments? Walk me through your actual planning and tracking cadence.",
    competencies: ["delivery-predictability"],
    askedBy: "ceo",
    kind: "core",
    probes: [
      { trigger: "lagging indicators only", question: "Which of those is leading rather than lagging?" },
      { trigger: "no hit rate", question: "What percentage of committed dates did your org actually hit last year?" },
      { trigger: "no escalation path", question: "What happens the third week a team is red?" },
    ],
  },
  {
    id: "org-design",
    text: "Describe how you structured your last engineering organisation. Why that shape, and what did you change about it?",
    competencies: ["org-design-talent", "scaling-change"],
    askedBy: "cto",
    kind: "core",
    probes: [
      { trigger: "no rationale for shape", question: "How did the team boundaries map to the architecture?" },
      { trigger: "no numbers", question: "How many engineers, how many teams, and what span of control for your managers?" },
      { trigger: "no leveling view", question: "How did you calibrate levels so a senior engineer meant the same thing across teams?" },
    ],
  },
  {
    id: "underperformer",
    text: "Tell me about a senior engineering leader on your team who was not working out. How long did you wait, and why that long?",
    competencies: ["org-design-talent", "judgment-self-awareness"],
    askedBy: "cto",
    kind: "stress",
    probes: [
      { trigger: "blames the individual entirely", question: "What part of that was a hiring or management failure on your side?" },
      { trigger: "no timeline", question: "When did you first know? What did you do in the gap?" },
      { trigger: "no team impact", question: "What did the delay cost the people underneath them?" },
    ],
  },
  {
    id: "incident",
    text: "Take me to your worst production incident. What was your personal role during it, and what changed afterwards?",
    competencies: ["reliability-quality-risk"],
    askedBy: "cto",
    kind: "stress",
    probes: [
      { trigger: "narrates the team's actions", question: "What did you personally do and say, and to whom, first?" },
      { trigger: "no numbers", question: "How long was the outage, how many customers, and what did availability look like before and after?" },
      { trigger: "no systemic fix", question: "What changed structurally so it could not recur?" },
      { trigger: "public company context missing", question: "Was that ever a disclosure conversation?" },
    ],
  },
  {
    id: "tech-debt",
    text: "How have you funded work that customers never see - platform, tooling, debt paydown - when every quarter has revenue pressure on it?",
    competencies: ["reliability-quality-risk", "cross-functional-influence"],
    askedBy: "cto",
    kind: "core",
    probes: [
      { trigger: "asserts a percentage with no mechanism", question: "How did you defend that allocation the quarter it got squeezed?" },
      { trigger: "no business framing", question: "How did you express the cost of that debt in terms the CFO cared about?" },
      { trigger: "no outcome", question: "What measurably improved once it landed?" },
    ],
  },
  {
    id: "rd-budget",
    text: "Take me through the R&D budget you have owned. What were the main cost drivers, and where did you find efficiency?",
    competencies: ["rd-efficiency"],
    askedBy: "ceo",
    kind: "core",
    probes: [
      { trigger: "headcount only", question: "What did cloud and tooling run you, and how did that trend per engineer?" },
      { trigger: "no ratio", question: "What was R&D as a percentage of revenue, and how did that compare to your peers?" },
      { trigger: "no capitalisation view", question: "How much of that engineering work was capitalised versus expensed?" },
      { trigger: "no tradeoff", question: "What did you choose not to fund?" },
    ],
  },
  {
    id: "product-conflict",
    text: "Tell me about a time you and the product organisation fundamentally disagreed about the roadmap. How did it resolve?",
    competencies: ["cross-functional-influence"],
    askedBy: "ceo",
    kind: "core",
    probes: [
      { trigger: "candidate won every time", question: "Tell me about one where you lost. How did you carry it out afterwards?" },
      { trigger: "no coalition work", question: "Who did you talk to before that meeting, and what did you change as a result?" },
    ],
  },
  {
    id: "board-technical",
    text: "You need the board to fund a two-year platform investment with no visible feature output. How do you make that case?",
    competencies: ["cross-functional-influence", "rd-efficiency"],
    askedBy: "ceo",
    kind: "stress",
    probes: [
      { trigger: "speaks in engineering terms", question: "Say that again without using a single technical term." },
      { trigger: "no quantification", question: "What number would you put in front of them to make it concrete?" },
      { trigger: "no risk framing", question: "What happens to the business if the board says no?" },
    ],
  },
  {
    id: "scaling",
    text: "Describe the largest scaling change you have led - growing an org, a migration, or integrating an acquisition. What was the state on day one and day five hundred?",
    competencies: ["scaling-change", "delivery-predictability"],
    askedBy: "cto",
    kind: "core",
    probes: [
      { trigger: "no baseline state", question: "Give me the day-one numbers - headcount, teams, attrition, whatever you were watching." },
      { trigger: "no sequencing rationale", question: "What did you deliberately do first, and what did you leave until later?" },
      { trigger: "no shipping story", question: "What did you keep delivering while that was underway?" },
      { trigger: "no durability", question: "What regressed once you stopped pushing on it?" },
    ],
  },
  {
    id: "expensive-mistake",
    text: "What is the most expensive technical or organisational mistake you have made? Give me the number.",
    competencies: ["judgment-self-awareness", "technical-judgment"],
    askedBy: "cto",
    kind: "stress",
    probes: [
      { trigger: "no figure given", question: "Put a number on it - dollars, engineer-months, or attrition." },
      { trigger: "no reasoning flaw identified", question: "What was wrong with how you were thinking at the time?" },
      { trigger: "humblebrag answer", question: "That sounds like a success story. Give me one that actually cost you." },
    ],
  },
];

export const questionById = new Map(questionBank.map((q) => [q.id, q]));

/** Selects a balanced set covering as many competencies as possible, warmup first. */
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
