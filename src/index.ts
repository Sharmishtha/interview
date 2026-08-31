import { defaultPanel } from "./panel/panelist.js";
import { createSession, recordResponse } from "./panel/session.js";
import { defaultRubric } from "./scoring/criteria.js";
import { scoreResponse, scoreSession } from "./scoring/scorer.js";
import type { InterviewQuestion } from "./types.js";

const questions: InterviewQuestion[] = [
  {
    id: "q1",
    text: "Walk me through how you would design a rate limiter.",
    category: "system design",
    difficulty: "medium",
    askedBy: "panelist-tech",
  },
];

const session = createSession({
  id: "session-1",
  candidateName: "Jordan Candidate",
  panelists: defaultPanel,
  questions,
});

const withResponse = recordResponse(session, {
  questionId: "q1",
  transcript: "I'd use a token bucket per client, backed by Redis for shared state...",
});

const responseScore = scoreResponse(
  "q1",
  [
    { criterion: "correctness", value: 8, rationale: "Token bucket is a valid approach." },
    { criterion: "communication", value: 7, rationale: "Clear but could be more structured." },
    { criterion: "depth", value: 6, rationale: "Did not discuss edge cases like clock skew." },
  ],
  defaultRubric,
);

withResponse.responseScores.push(responseScore);
withResponse.overallScore = scoreSession(withResponse);

console.log(`${withResponse.candidateName} scored ${withResponse.overallScore.toFixed(2)}/10`);
