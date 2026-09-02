import { competencyById } from "../rubric/competencies.js";
import { dimensionById } from "../rubric/dimensions.js";
import { deflectionSpans, starElements, STAR_ELEMENTS } from "./evaluator.js";
import type {
  AnswerGuidance,
  AnswerScore,
  DimensionScore,
  InterviewQuestion,
  Lift,
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

function suggestionFor(score: DimensionScore, answer: string): string {
  switch (score.dimension) {
    case "specificity":
      return score.rationale.includes("general-philosophy")
        ? "Cut the philosophy and open with one named situation instead: the business, the year, and who was involved. 'When I joined X in 2021' beats 'I always believe'."
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
      return "State the Result as a number with a before and an after - 'from X to Y in Z months'. The guide's assessors listen for outcomes, and an unquantified result reads as activity.";

    case "learning":
      return "Close with the Learning. What did this teach you, and what would you do differently? Several principles list this explicitly as a positive signal, and leaving it out reads as an inability to grow from the experience.";

    case "story-shape":
      return score.rationale.includes("no scene")
        ? "You have the turn but not the moment. Put the interviewer in the room for one sentence - where you were, who was there, what was said - then let the turn land."
        : score.rationale.includes("summary")
          ? "This is a summary, not a story. Find the moment something went wrong or changed on you, and build the answer around that turn rather than listing what happened in order."
          : "Sharpen the turn: name the point where it stopped going to plan.";

    case "memorability":
      return "Add one detail nobody else could have supplied - the name of the person who pushed back, a line someone actually said, an odd specific like 'a 2-second granularity across millions of devices'. The interviewer will forget your competencies by Friday; they will still be able to retell the detail, and that is what they argue from in the debrief.";

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
  const covered = keywords.filter((word) => haystack.includes(word.slice(0, Math.max(4, word.length - 2))));
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
): AnswerGuidance {
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
