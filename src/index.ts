import { createSession, recordAnswer } from "./panel/session.js";
import { questionBank } from "./questions/bank.js";
import { renderScorecard } from "./report/render.js";
import { HeuristicEvaluator } from "./scoring/evaluator.js";
import { buildScorecard, scoreAnswers } from "./scoring/scorer.js";
import type { InterviewSession } from "./types.js";

// A weak answer and a strong answer to the same kind of question, so the
// difference the rubric detects is visible without running a live interview.
const WEAK_ANSWER = `
I always believe in empowering my team to do their best work. My philosophy is
that if you hire good people and get out of their way, the results follow. We
did a lot of great work together and at the end of the day the business improved
quite a bit. We were all really proud of what we accomplished.
`;

const STRONG_ANSWER = `
When I took over the Nordics division in 2019 it was running at a 4% operating
margin on $180 million of revenue, and we were losing share to Kesko every
quarter. The situation was that we had 3 overlapping product lines and a team of
altogether 240 people supporting them. I decided to kill the middle line
entirely, which was about $30 million of revenue, because the unit economics
never worked - we were paying 60% of gross margin back out in channel rebates.
I personally took that recommendation to the board and Anders pushed back hard.
As a result we went from 4% to 11% operating margin within 18 months, and share
stabilised by Q3 of the second year. In hindsight I should have moved on the
product line six months earlier - I underestimated how much the ambiguity was
costing us in the sales org, and what I learned is that a slow kill is more
expensive than a fast one.
`;

async function main(): Promise<void> {
  const questions = questionBank.filter((q) => q.id === "strategic-bet" || q.id === "transformation");

  let session: InterviewSession = createSession({
    id: "demo-session",
    candidateName: "Practice run",
    questions,
  });

  session = recordAnswer(session, {
    questionId: "strategic-bet",
    answer: WEAK_ANSWER,
    turns: [{ speaker: "candidate", text: WEAK_ANSWER }],
  });
  session = recordAnswer(session, {
    questionId: "transformation",
    answer: STRONG_ANSWER,
    turns: [{ speaker: "candidate", text: STRONG_ANSWER }],
  });

  const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
  console.log(renderScorecard(buildScorecard(session, answerScores)));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
