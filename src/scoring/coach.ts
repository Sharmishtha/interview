import { competencyById } from "../rubric/competencies.js";
import { dimensionById, dimensions } from "../rubric/dimensions.js";
import { deflectionSpans, starElements, STAR_ELEMENTS } from "./evaluator.js";
import type {
  AnswerGuidance,
  AnswerScore,
  DimensionId,
  DimensionScore,
  InterviewQuestion,
  Lift,
  RubricRow,
} from "../types.js";

/** The score a candidate is coached towards. */
export const TARGET_SCORE = 8;

/** How many lifts to surface. Three concrete changes is actionable; ten is noise. */
const MAX_LIFTS = 3;

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

const STAR_LABELS: Record<(typeof STAR_ELEMENTS)[number], string> = {
  situation: "the Situation (where you were and what shape it was in)",
  task: "the Task (what you were specifically expected to deliver)",
  action: "the Action (what you personally decided and did)",
  result: "the Result (what changed, in numbers)",
  learning: "the Learning (what it taught you)",
};

/**
 * What to change, and what it sounds like when it is right.
 *
 * A rationale tells you the gap; on its own it leaves you to invent the fix.
 * Every dimension therefore carries both a suggestion and a worked example,
 * because "quantify the outcome" and "from 210 channels to 10,000 in nine
 * months" are not the same instruction.
 */
export interface Coaching {
  /** The change to make, in the second person. */
  suggestion: string;
  /** A phrase in the shape of the fix. Not a script - a target to aim at. */
  example: string;
}

/** What good sounds like on each dimension. Deliberately concrete and unglamorous. */
const EXAMPLES: Record<DimensionId, string> = {
  specificity:
    "\u201cWhen I joined Gracenote in 2021, the ingest pipeline was three days behind and Priya was running it alone.\u201d",
  "scope-scale":
    "\u201cI owned 40 engineers across three sites and a $12m budget, against a P&L of about $90m.\u201d",
  ownership:
    "\u201cI decided to stop the rewrite. The team had argued for it and they were right about the risk - so the call, and the fallout, were mine.\u201d",
  "quantified-outcomes":
    "\u201cChurn went from 9% to 3.5% over two quarters, and we held it there for a year.\u201d",
  learning:
    "\u201cWhat it taught me was that I had let it run six months past the point I already knew. Now I put a date on the decision before I start.\u201d",
  "star-structure":
    "\u201cWe were three days behind (situation). I had to get it under an hour (task). I rebuilt only the ingest path (action). We hit 40 minutes (result). And I learned to size the smallest fix first (learning).\u201d",
  "story-shape":
    "\u201cTwo weeks in, the numbers stopped making sense. I pulled the raw logs myself on a Sunday, and that is when I found we had been double-counting since March.\u201d",
  memorability:
    "\u201cPriya said, in front of everyone, \u2018you are asking us to rebuild the plane mid-flight.\u2019 She was right, and it changed what I did next.\u201d",
};

function suggestionTextFor(score: DimensionScore, answer: string): string {
  switch (score.dimension) {
    case "specificity":
      return score.rationale.includes("general-philosophy")
        ? "Cut the philosophy and open with one named situation instead: the business, the year, and who was involved."
        : "Anchor the story. Name the company or division, when it happened, and at least one other person by name.";

    case "scope-scale":
      return "Size what you owned inside the first two sentences - headcount, budget, revenue, or customers. Without it the interviewer cannot calibrate the level you were operating at.";

    case "ownership":
      if (score.rationale.includes('entirely "we"') || score.rationale.includes('Leans on "we"')) {
        return "Too much of this is 'we'. Say what you personally decided, argued for, or chose to stop - then credit the team for the execution.";
      }
      if (score.rationale.includes('Heavily "I"') || score.rationale.includes("no team credit")) {
        return "This is almost all 'I'. Name what your team did, so the answer reads as leadership rather than individual heroics.";
      }
      return "Make the line between your decisions and your team's execution explicit.";

    case "quantified-outcomes":
      return "State the Result as a number with a before and an after. The guide's assessors listen for outcomes, and an unquantified result reads as activity.";

    case "learning":
      return "Close with the Learning. What did this teach you, and what would you do differently? Several principles list this explicitly as a positive signal, and leaving it out reads as an inability to grow from the experience.";

    case "story-shape":
      return score.rationale.includes("no scene")
        ? "You have the turn but not the moment. Put the interviewer in the room for one sentence - where you were, who was there, what was said - then let the turn land."
        : score.rationale.includes("summary")
          ? "This is a summary, not a story. Find the moment something went wrong or changed on you, and build the answer around that turn rather than listing what happened in order."
          : "Sharpen the turn: name the point where it stopped going to plan.";

    case "memorability":
      return "Add one detail nobody else could have supplied - the name of the person who pushed back, a line someone actually said, an odd specific. The interviewer will forget your competencies by Friday; they will still be able to retell the detail, and that is what they argue from in the debrief.";

    case "star-structure": {
      const found = starElements(answer);
      const missing = STAR_ELEMENTS.filter((element) => found[element].length === 0);
      return missing.length
        ? `Add ${missing.map((m) => STAR_LABELS[m]).join(", then ")}. The interviewer is explicitly working to establish all five.`
        : "Tighten the arc so each of the five STAR-L beats is easy to follow.";
    }

    default:
      return "Add more evidence here.";
  }
}

/**
 * Coaching for one dimension, whatever it scored.
 *
 * A dimension already at target gets a note on what is holding it up rather
 * than a fix it does not need - the point is that the whole rubric is
 * answerable, not that everything is a problem.
 */
export function coachingFor(
  score: DimensionScore,
  answer: string,
  target = TARGET_SCORE,
): Coaching {
  if (score.value >= target) {
    return {
      suggestion:
        "Already carrying this one. Keep it when you retell the story - it is doing work.",
      example: EXAMPLES[score.dimension],
    };
  }
  return { suggestion: suggestionTextFor(score, answer), example: EXAMPLES[score.dimension] };
}

function suggestionFor(score: DimensionScore, answer: string): string {
  return suggestionTextFor(score, answer);
}

// ---------------------------------------------------------------------------
// Negative signal detection
// ---------------------------------------------------------------------------

interface Detector {
  applies: (scores: Map<string, number>, answer: string) => boolean;
  /** Keywords used to find the guide's own wording on this competency. */
  match: string[];
  fallback: string;
}

const DETECTORS: Detector[] = [
  {
    applies: (_scores, answer) => deflectionSpans(answer).length >= 2,
    match: ["blame"],
    fallback: "Shifts the blame to external factors or other people",
  },
  {
    applies: (scores) => (scores.get("specificity") ?? 10) <= 2,
    match: ["specific examples", "cannot provide"],
    fallback: "Cannot provide specific examples",
  },
  {
    applies: (scores) => (scores.get("quantified-outcomes") ?? 10) <= 2,
    match: ["activity rather than outcomes"],
    fallback: "Focuses on activity rather than outcomes",
  },
  {
    applies: (scores) => (scores.get("learning") ?? 10) <= 3,
    match: ["learnings", "learned"],
    fallback: "Does not extract learnings from the experience",
  },
  {
    applies: (scores) => (scores.get("scope-scale") ?? 10) <= 2,
    match: ["too high of a level", "superficial", "tactical"],
    fallback: "Gives examples that are superficial or lack strategic impact",
  },
];

function detectFlags(
  question: InterviewQuestion,
  dimensionScores: DimensionScore[],
  answer: string,
): string[] {
  const byId = new Map(dimensionScores.map((s) => [s.dimension as string, s.value]));
  const negatives = competencyById.get(question.competency)?.negativeSignals ?? [];
  const flags: string[] = [];

  for (const detector of DETECTORS) {
    if (!detector.applies(byId, answer)) continue;
    // Prefer the guide's exact wording for this competency where it matches.
    const guideWording = negatives.find((signal) =>
      detector.match.some((keyword) => signal.toLowerCase().includes(keyword)),
    );
    const flag = guideWording ?? detector.fallback;
    if (!flags.includes(flag)) flags.push(flag);
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Open probes
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "what",
  "were",
  "your",
  "with",
  "this",
  "that",
  "them",
  "they",
  "have",
  "about",
  "there",
  "which",
  "would",
  "could",
  "their",
  "more",
  "into",
  "from",
  "make",
  "made",
  "when",
  "where",
  "share",
  "give",
  "you",
  "did",
  "was",
  "and",
  "the",
]);

/**
 * A hint that the answer never touched a probe's distinctive words. Probes and
 * answers often use different vocabulary for the same idea, so this is shown as
 * a nudge for rehearsal rather than asserted as a gap.
 */
function isProbeLikelyUncovered(probeQuestion: string, answer: string): boolean {
  const haystack = answer.toLowerCase();
  const keywords = probeQuestion
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  if (keywords.length === 0) return false;
  const covered = keywords.filter((word) =>
    haystack.includes(word.slice(0, Math.max(4, word.length - 2))),
  );
  return covered.length / keywords.length < 0.34;
}

// ---------------------------------------------------------------------------

/**
 * Builds coaching for one answer: the highest-leverage changes, what each is
 * worth on the composite, and where that would land the score.
 *
 * Because the composite is a weighted sum of the dimensions, the value of any
 * single improvement is exactly computable rather than guessed at.
 */
export function guidanceFor(
  answerScore: AnswerScore,
  question: InterviewQuestion,
  answer: string,
  target = TARGET_SCORE,
  estimated: readonly DimensionId[] = [],
): AnswerGuidance {
  const wasEstimated = new Set(estimated);

  // Every dimension, in rubric order rather than sorted by score: the table is
  // the same shape on every answer, which is what makes it readable across
  // three of them.
  const rubric: RubricRow[] = dimensions.map((dimension) => {
    const score = answerScore.dimensionScores.find((s) => s.dimension === dimension.id);
    const value = score?.value ?? 0;
    const coaching = score
      ? coachingFor(score, answer, target)
      : { suggestion: "Not scored.", example: "" };

    return {
      dimension: dimension.id,
      value,
      rationale: score?.rationale ?? "",
      suggestion: coaching.suggestion,
      example: coaching.example,
      compositeGain: value >= target ? 0 : round((target - value) * dimension.weight),
      atTarget: value >= target,
      estimated: wasEstimated.has(dimension.id),
    };
  });

  const lifts: Lift[] = answerScore.dimensionScores
    .filter((score) => score.value < target)
    .map((score) => {
      const weight = dimensionById.get(score.dimension)?.weight ?? 0;
      return {
        dimension: score.dimension,
        from: score.value,
        to: target,
        compositeGain: round((target - score.value) * weight),
        suggestion: suggestionFor(score, answer),
      };
    })
    .sort((a, b) => b.compositeGain - a.compositeGain)
    .slice(0, MAX_LIFTS);

  const reachable = round(
    answerScore.composite + lifts.reduce((sum, lift) => sum + lift.compositeGain, 0),
  );

  return {
    questionId: answerScore.questionId,
    composite: answerScore.composite,
    target,
    reachable: Math.min(reachable, 10),
    lifts,
    rubric,
    probes: question.probes.map((probe) => ({
      question: probe.question,
      likelyUncovered: isProbeLikelyUncovered(probe.question, answer),
    })),
    listeningFor: competencyById.get(question.competency)?.positiveSignals ?? [],
    flags: detectFlags(question, answerScore.dimensionScores, answer),
  };
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
