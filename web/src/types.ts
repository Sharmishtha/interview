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
  competencies: string[];
  askedBy: string;
  kind: "warmup" | "core" | "stress";
  probes: Probe[];
}

export interface RubricEntry {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface Interview {
  panelists: Panelist[];
  questions: Question[];
  rubric: { competencies: RubricEntry[]; dimensions: RubricEntry[] };
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
  value: number;
  band: string;
  questionIds: string[];
}

export interface Scorecard {
  sessionId: string;
  candidateName: string;
  answerScores: AnswerScore[];
  competencyScores: CompetencyScore[];
  overall: number;
  strengths: string[];
  gaps: string[];
}

export interface AnswerRecord {
  questionId: string;
  answer: string;
  turns: { speaker: "panelist" | "candidate"; speakerId?: string; text: string }[];
}
