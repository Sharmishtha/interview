// ---------------------------------------------------------------------------
// Executive Leadership Principles
// ---------------------------------------------------------------------------

export type PillarId = "plan-with-purpose" | "pursue-excellence" | "prioritize-people";

export interface Pillar {
  id: PillarId;
  name: string;
  description: string;
}

/** Three competencies per pillar, nine in total. */
export type CompetencyId =
  // Plan with Purpose
  | "turns-vision-into-action"
  | "makes-smart-decisions"
  | "energizes-the-team"
  // Pursue Excellence
  | "raise-the-bar"
  | "act-with-courage"
  | "build-resilience"
  // Prioritize People
  | "be-real"
  | "lead-across"
  | "grow-groundbreakers";

/** A behaviourally-anchored band: what a score in this range actually looks like. */
export interface RubricBand {
  /** Upper bound of the band on the 0-10 scale, inclusive. */
  max: number;
  label: string;
  descriptor: string;
}

export interface Competency {
  id: CompetencyId;
  name: string;
  pillar: PillarId;
  description: string;
  /** Relative weight in the overall score; weights across the rubric sum to 1. */
  weight: number;
  /** What the interviewer is listening for, verbatim from the interview guide. */
  positiveSignals: string[];
  /** What counts against the candidate, verbatim from the interview guide. */
  negativeSignals: string[];
  bands: RubricBand[];
}

/**
 * Evidence dimensions are *how* an individual answer is graded. Competencies are
 * *what* is being assessed. The guide asks interviewers to establish the
 * Situation, Task, Action, Result and Learning, so the dimensions are aligned to
 * that structure.
 */
export type DimensionId =
  | "specificity"
  | "scope-scale"
  | "ownership"
  | "quantified-outcomes"
  | "learning"
  | "star-structure"
  | "story-shape"
  | "memorability";

/**
 * What a dimension is measuring.
 *
 * "substance" is what the answer contains - the situation, the numbers, what you
 * personally owned, what you took from it. "story" is how it lands: whether it
 * has a turn in it and whether anyone could retell it a week later.
 *
 * The split matters because only substance can be honestly pattern-matched. A
 * regex can see that a number is present; it cannot tell whether the strategy
 * was sound or whether the story was worth hearing. See `Evaluator.approximates`.
 */
export type DimensionGroup = "substance" | "story";

export interface EvidenceDimension {
  id: DimensionId;
  name: string;
  description: string;
  group: DimensionGroup;
  /** Relative weight within an answer's composite; weights sum to 1. */
  weight: number;
}

// ---------------------------------------------------------------------------
// Panel and questions
// ---------------------------------------------------------------------------

export interface Panelist {
  id: string;
  name: string;
  role: string;
  /** What this panelist pushes on, used to generate their agent prompt later. */
  focus: string;
  /** ElevenLabs voice ID used to speak this panelist's questions aloud. */
  voiceId?: string;
}

/** An optional probing question from the guide, used to dig into an answer. */
export interface Probe {
  /** Plain-language condition, e.g. "claims a turnaround without a starting number". */
  trigger: string;
  question: string;
}

export interface InterviewQuestion {
  id: string;
  /** The top-line question, asked as written in the guide. */
  text: string;
  competency: CompetencyId;
  pillar: PillarId;
  askedBy: Panelist["id"];
  probes: Probe[];
  /**
   * "guide" questions are the interview guide's own top-line questions.
   * "pressure" questions are harder variants on the same competency: each one
   * requires owning a failure, which is where the negative signals show up.
   * "custom" questions are written by the candidate to rehearse something
   * specific they expect to be asked.
   */
  intensity: "guide" | "pressure" | "custom";
}

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

export interface Turn {
  speaker: "panelist" | "candidate";
  speakerId?: string;
  text: string;
  /** Milliseconds from the start of the session. */
  startedAtMs?: number;
}

export interface AnswerRecord {
  questionId: InterviewQuestion["id"];
  /** The candidate's full answer, including anything said in response to probes. */
  answer: string;
  turns: Turn[];
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

/** A citable region of the answer that a score rests on. */
export interface EvidenceSpan {
  start: number;
  end: number;
  text: string;
}

export interface DimensionScore {
  dimension: DimensionId;
  /** 0 (worst) to 10 (best). */
  value: number;
  rationale: string;
  evidence: EvidenceSpan[];
}

export interface AnswerScore {
  questionId: InterviewQuestion["id"];
  dimensionScores: DimensionScore[];
  /** Weighted roll-up of the dimension scores. */
  composite: number;
}

export interface CompetencyScore {
  competency: CompetencyId;
  pillar: PillarId;
  value: number;
  /** The band descriptor this score landed in. */
  band: string;
  questionIds: InterviewQuestion["id"][];
}

// ---------------------------------------------------------------------------
// Coaching
// ---------------------------------------------------------------------------

/** One concrete change, and what it is worth on the 0-10 composite. */
export interface Lift {
  dimension: DimensionId;
  from: number;
  to: number;
  /** How much this single change adds to the answer's composite score. */
  compositeGain: number;
  suggestion: string;
}

/**
 * One line of the rubric for one answer: what it scored, why, and what to do
 * about it. Every dimension gets a row, including the ones already strong - the
 * table is how someone reads their own answer back, so a blank row is a dead end.
 */
export interface RubricRow {
  dimension: DimensionId;
  /** 0-10, as scored. */
  value: number;
  /** Why this score - the gap, stated plainly. */
  rationale: string;
  /** What to change. */
  suggestion: string;
  /** A phrase in the shape of the fix, so "quantify it" has something to aim at. */
  example: string;
  /** What taking this dimension to target adds to the composite. 0 when at target. */
  compositeGain: number;
  atTarget: boolean;
  /** True when the evaluator estimated this rather than measuring it. */
  estimated: boolean;
}

export interface AnswerGuidance {
  questionId: InterviewQuestion["id"];
  composite: number;
  target: number;
  /** Where the composite lands if the listed lifts are applied. */
  reachable: number;
  /** Highest-leverage changes first. A subset of `rubric`, kept for the summary. */
  lifts: Lift[];
  /** Every dimension, in rubric order. The scorecard people actually read. */
  rubric: RubricRow[];
  /**
   * The guide's optional probes for this question, so the candidate can rehearse
   * them. `likelyUncovered` is a keyword-overlap hint, not a claim of fact.
   */
  probes: { question: string; likelyUncovered: boolean }[];
  /** What the interviewer is listening for on this question's competency. */
  listeningFor: string[];
  /** Negative signals this answer appears to trigger. */
  flags: string[];
}

/** The plain-language read of the scorecard. Built in scoring/narrative.ts. */
export interface ScorecardNarrative {
  headline: string;
  reads: { competency: CompetencyId; text: string }[];
  oneThing: {
    dimension: DimensionId;
    prose: string;
    gain: number;
    questionId: InterviewQuestion["id"];
  } | null;
}

export interface Scorecard {
  sessionId: string;
  candidateName: string;
  answerScores: AnswerScore[];
  competencyScores: CompetencyScore[];
  /** Weighted roll-up of the competency scores. */
  overall: number;
  strengths: CompetencyId[];
  gaps: CompetencyId[];
  guidance: AnswerGuidance[];
  /** What a coach would say before quoting any of the numbers above. */
  narrative: ScorecardNarrative;
  /**
   * Which evaluator produced these scores, and which of its dimension scores are
   * estimates. Shown to the candidate rather than kept internal: a score you are
   * being coached against should say how confident it is entitled to be.
   */
  evaluatedBy: { name: string; approximates: DimensionId[] };
}

export interface InterviewSession {
  id: string;
  candidateName: string;
  panelists: Panelist[];
  questions: InterviewQuestion[];
  answers: AnswerRecord[];
  startedAt: string;
}
