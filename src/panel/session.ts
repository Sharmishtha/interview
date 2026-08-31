import type {
  CandidateResponse,
  InterviewQuestion,
  InterviewSession,
  Panelist,
} from "../types.js";

export function createSession(params: {
  id: string;
  candidateName: string;
  panelists: Panelist[];
  questions: InterviewQuestion[];
}): InterviewSession {
  return {
    ...params,
    responses: [],
    responseScores: [],
  };
}

export function recordResponse(
  session: InterviewSession,
  response: CandidateResponse,
): InterviewSession {
  return {
    ...session,
    responses: [...session.responses, response],
  };
}
