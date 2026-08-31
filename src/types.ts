export interface Panelist {
  id: string;
  name: string;
  role: string;
  expertiseAreas: string[];
  /** ElevenLabs voice ID used to speak this panelist's questions aloud. */
  voiceId?: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  askedBy: Panelist["id"];
}

export interface CandidateResponse {
  questionId: InterviewQuestion["id"];
  transcript: string;
}

export interface ScoreCriterion {
  name: string;
  description: string;
  /** Relative weight of this criterion; weights across a rubric should sum to 1. */
  weight: number;
}

export interface CriterionScore {
  criterion: ScoreCriterion["name"];
  /** Score from 0 (worst) to 10 (best). */
  value: number;
  rationale: string;
}

export interface ResponseScore {
  questionId: InterviewQuestion["id"];
  scores: CriterionScore[];
  weightedTotal: number;
}

export interface InterviewSession {
  id: string;
  candidateName: string;
  panelists: Panelist[];
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  responseScores: ResponseScore[];
  overallScore?: number;
}
