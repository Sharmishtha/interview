// The API is the contract between server and browser, so the frontend declares
// its own view of the payloads rather than importing server-side domain code.

export interface Panelist {
  id: string;
  name: string;
  role: string;
  focus: string;
}

export interface Probe {
  trigger: string;
  question: string;
}

export interface Question {
  id: string;
  text: string;
  competency: string;
  pillar: string;
  askedBy: string;
  probes: Probe[];
}

export interface Pillar {
  id: string;
  name: string;
  description: string;
}

export interface RubricEntry {
  id: string;
  name: string;
  pillar?: string;
  description: string;
  positiveSignals?: string[];
}

export interface Interview {
  panelists: Panelist[];
  questions: Question[];
  rubric: { pillars: Pillar[]; competencies: RubricEntry[]; dimensions: RubricEntry[] };
}

export interface EvidenceSpan {
  start: number;
  end: number;
  text: string;
}

export interface DimensionScore {
  dimension: string;
  value: number;
  rationale: string;
  evidence: EvidenceSpan[];
}

export interface AnswerScore {
  questionId: string;
  dimensionScores: DimensionScore[];
  composite: number;
}

export interface CompetencyScore {
  competency: string;
  pillar: string;
  value: number;
  band: string;
  questionIds: string[];
}

export interface Lift {
  dimension: string;
  from: number;
  to: number;
  compositeGain: number;
  suggestion: string;
}

export interface AnswerGuidance {
  questionId: string;
  composite: number;
  target: number;
  reachable: number;
  lifts: Lift[];
  probes: { question: string; likelyUncovered: boolean }[];
  listeningFor: string[];
  flags: string[];
}

export interface Scorecard {
  sessionId: string;
  candidateName: string;
  answerScores: AnswerScore[];
  competencyScores: CompetencyScore[];
  overall: number;
  strengths: string[];
  gaps: string[];
  guidance: AnswerGuidance[];
}

export interface AnswerRecord {
  questionId: string;
  answer: string;
  turns: { speaker: "panelist" | "candidate"; speakerId?: string; text: string }[];
}
