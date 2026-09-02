import { competencyById } from "../rubric/competencies.js";
import type {
  AnswerGuidance,
  AnswerScore,
  CompetencyScore,
  DimensionId,
  InterviewQuestion,
} from "../types.js";

/**
 * The plain-language layer over the numbers.
 *
 * A scorecard that opens with "5.8 / 10" tells you where you came; it does not
 * tell you anything you can act on tonight. This module says the same thing a
 * coach would say first - which answer was your best, what each one did well and
 * where it stopped, and the single change worth making next time - so the numbers
 * become supporting evidence rather than the message.
 *
 * Every sentence is derived from a score that was actually computed. Nothing here
 * is encouragement the evidence does not support.
 */

export interface CompetencyRead {
  competency: CompetencyScore["competency"];
  /** One line, second person, no rubric vocabulary. */
  text: string;
}

export interface OneThing {
  dimension: DimensionId;
  /** What to change, in the coach's words. */
  prose: string;
  /** What it is worth on that answer's composite. */
  gain: number;
  questionId: string;
}

export interface Narrative {
  /** The first thing you read: a sentence about you, not a label. */
  headline: string;
  reads: CompetencyRead[];
  /** The highest-value single change across every answer, or null if none is left. */
  oneThing: OneThing | null;
}

// ---------------------------------------------------------------------------
// Phrasebook
// ---------------------------------------------------------------------------

/** What a strong dimension sounds like, said to the candidate. */
const PRAISE: Record<DimensionId, string> = {
  specificity: "Grounded in a real situation",
  "scope-scale": "Clear about the size of what you owned",
  ownership: "Your own decisions are visible in it",
  "quantified-outcomes": "The result lands as a number",
  learning: "It ends with what the experience taught you",
  "star-structure": "Easy to follow from start to finish",
  "story-shape": "Told as a story rather than a summary",
  memorability: "It carries a detail worth repeating",
};

/** What a weak dimension costs, phrased as the next move rather than a fault. */
const SHORTFALL: Record<DimensionId, string> = {
  specificity: "it needs one named situation to stand on",
  "scope-scale": "size what you owned and the level calibrates instantly",
  ownership: "say what you decided, not only what the team did",
  "quantified-outcomes": "the result still needs a number",
  learning: "it stops just before saying what you learned",
  "star-structure": "a listener loses the thread partway through",
  "story-shape": "it reads as a summary rather than a story",
  memorability: "nothing in it is yours alone to tell",
};

// ---------------------------------------------------------------------------
// Naming the answer
// ---------------------------------------------------------------------------

const SENTENCE_START = /(?:^|[.!?]\s+|\n)$/;

/**
 * The name an interviewer would use for this answer in the debrief - "your
 * Gracenote story" rather than "your Build Resilience answer".
 *
 * Takes the proper noun the candidate leaned on most, ignoring anything that
 * merely started a sentence, since a capital there says nothing. Returns null
 * when the answer named nothing, which is itself worth knowing: an answer with no
 * proper noun in it is an answer nobody can retell.
 */
export function storyLabel(answer: string): string | null {
  const counts = new Map<string, number>();
  const pattern = /\b[A-Z][A-Za-z'&-]{2,}\b/g;

  for (const match of answer.matchAll(pattern)) {
    const before = answer.slice(0, match.index);
    if (SENTENCE_START.test(before) || before === "") continue;
    if (STOP_NAMES.has(match[0])) continue;
    counts.set(match[0], (counts.get(match[0]) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

/** Capitalised mid-sentence but not a name: months, days, and the pronoun. */
const STOP_NAMES = new Set([
  "January",
  "February",
  "March",
  "April",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

// ---------------------------------------------------------------------------

export function narrativeFor(
  answerScores: AnswerScore[],
  competencyScores: CompetencyScore[],
  guidance: AnswerGuidance[],
  questions: InterviewQuestion[],
  answers: Map<string, string>,
): Narrative {
  return {
    headline: headlineFor(answerScores, questions, answers),
    reads: competencyScores.map((score) => ({
      competency: score.competency,
      text: readFor(score, answerScores, questions),
    })),
    oneThing: oneThingFor(guidance, questions, answers),
  };
}

function headlineFor(
  answerScores: AnswerScore[],
  questions: InterviewQuestion[],
  answers: Map<string, string>,
): string {
  if (answerScores.length === 0) return "Nothing was answered, so there is nothing to read yet.";

  const best = [...answerScores].sort((a, b) => b.composite - a.composite)[0]!;
  const label = describeAnswer(best.questionId, questions, answers);

  // Below 4 nothing was "strongest" in any sense worth congratulating. Saying so
  // plainly is more useful than a compliment the score contradicts.
  if (best.composite < 4) {
    return "There is a real answer in each of these - none of them is out loud yet.";
  }

  if (answerScores.length === 1) {
    return `Your ${label} came in at ${best.composite.toFixed(1)} out of 10.`;
  }

  return `Your ${label} was the strongest of the ${count(answerScores.length)}.`;
}

/** "Gracenote story" where a name was given, "answer on Be Real" where none was. */
function describeAnswer(
  questionId: string,
  questions: InterviewQuestion[],
  answers: Map<string, string>,
): string {
  const label = storyLabel(answers.get(questionId) ?? "");
  if (label) return `${label} story`;

  const question = questions.find((q) => q.id === questionId);
  const competency = question ? competencyById.get(question.competency) : undefined;
  return competency ? `answer on ${competency.name}` : "answer";
}

function readFor(
  score: CompetencyScore,
  answerScores: AnswerScore[],
  questions: InterviewQuestion[],
): string {
  const ids = new Set(questions.filter((q) => q.competency === score.competency).map((q) => q.id));
  const dimensionScores = answerScores
    .filter((a) => ids.has(a.questionId))
    .flatMap((a) => a.dimensionScores);

  if (dimensionScores.length === 0) return score.band;

  const ranked = [...dimensionScores].sort((a, b) => b.value - a.value);
  const strongest = ranked[0]!;
  const weakest = ranked[ranked.length - 1]!;

  // An answer that is uniformly weak has no strength to lead with, and pretending
  // otherwise is the thing that makes coaching feel worthless.
  if (strongest.value < 4) {
    return capitalise(`${SHORTFALL[weakest.dimension]}.`);
  }
  if (weakest.value >= 7) {
    return `${PRAISE[strongest.dimension]}, with nothing obviously missing.`;
  }
  return `${PRAISE[strongest.dimension]} - ${SHORTFALL[weakest.dimension]}.`;
}

function oneThingFor(
  guidance: AnswerGuidance[],
  questions: InterviewQuestion[],
  answers: Map<string, string>,
): OneThing | null {
  const lifts = guidance.flatMap((entry) =>
    entry.lifts.map((lift) => ({ lift, questionId: entry.questionId })),
  );
  if (lifts.length === 0) return null;

  const best = lifts.sort((a, b) => b.lift.compositeGain - a.lift.compositeGain)[0]!;
  const label = describeAnswer(best.questionId, questions, answers);

  return {
    dimension: best.lift.dimension,
    prose: `Start with your ${label}. ${best.lift.suggestion}`,
    gain: best.lift.compositeGain,
    questionId: best.questionId,
  };
}

function count(n: number): string {
  return ["none", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
