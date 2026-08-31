// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export type CompetencyId =
  | "strategic-thinking"
  | "leadership-talent"
  | "business-acumen"
  | "execution-rigor"
  | "stakeholder-influence"
  | "change-leadership"
  | "judgment-self-awareness";

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
  description: string;
  /** Relative weight in the overall score; weights across the rubric sum to 1. */
  weight: number;
  bands: RubricBand[];
}

/**
 * Evidence dimensions are *how* an individual answer is graded. Competencies are
 * *what* is being assessed. Every answer is scored on all six dimensions; those
 * scores then roll up into the competencies the question was tagged with.
 */
export type DimensionId =
  | "specificity"
  | "scope-scale"
  | "ownership"
  | "quantified-outcomes"
  | "reflection"
  | "structure";

export interface EvidenceDimension {
  id: DimensionId;
  name: string;
  description: string;
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

/** A follow-up the panelist should ask when the trigger condition is met. */
export interface Probe {
  /** Plain-language condition, e.g. "claims a turnaround without a starting number". */
  trigger: string;
  question: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  /** Competencies this question rolls up into. */
  competencies: CompetencyId[];
  askedBy: Panelist["id"];
  kind: "warmup" | "core" | "stress";
  probes: Probe[];
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
  value: number;
  /** The band descriptor this score landed in. */
  band: string;
  questionIds: InterviewQuestion["id"][];
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
}

export interface InterviewSession {
  id: string;
  candidateName: string;
  panelists: Panelist[];
  questions: InterviewQuestion[];
  answers: AnswerRecord[];
  startedAt: string;
}
