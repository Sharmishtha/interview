import { executivePanel } from "./panelist.js";
import { selectQuestions } from "../questions/bank.js";
import type { AnswerRecord, InterviewQuestion, InterviewSession, Panelist } from "../types.js";

export function createSession(params: {
  id: string;
  candidateName: string;
  panelists?: Panelist[];
  /** Defaults to one question per pillar, as the guide's process requires. */
  questions?: InterviewQuestion[];
  seed?: number;
}): InterviewSession {
  return {
    id: params.id,
    candidateName: params.candidateName,
    panelists: params.panelists ?? executivePanel,
    questions: params.questions ?? selectQuestions(params.seed),
    answers: [],
    startedAt: new Date().toISOString(),
  };
}

export function recordAnswer(session: InterviewSession, answer: AnswerRecord): InterviewSession {
  if (!session.questions.some((q) => q.id === answer.questionId)) {
    throw new Error(`Answer references a question not in this session: ${answer.questionId}`);
  }
  return { ...session, answers: [...session.answers, answer] };
}

/** The probes attached to a question, for the panelist to draw on mid-answer. */
export function probesFor(session: InterviewSession, questionId: string) {
  return session.questions.find((q) => q.id === questionId)?.probes ?? [];
}
