import { evalCases } from "./eval/cases.js";
import { createSession, recordAnswer } from "./panel/session.js";
import { questionById } from "./questions/bank.js";
import { renderScorecard } from "./report/render.js";
import { HeuristicEvaluator } from "./scoring/evaluator.js";
import { buildScorecard, scoreAnswers } from "./scoring/scorer.js";
import type { InterviewSession } from "./types.js";

/**
 * Scores a weak and a strong answer side by side so the rubric's discrimination
 * is visible without running a live interview. The answers come from the eval
 * corpus, so the demo and the eval suite never drift apart.
 */
const DEMO_CASE_IDS = ["platitude-delivery", "architecture-evidenced", "missed-date-owned"];

async function main(): Promise<void> {
  const cases = DEMO_CASE_IDS.map((id) => {
    const found = evalCases.find((c) => c.id === id);
    if (!found) throw new Error(`Unknown eval case: ${id}`);
    return found;
  });

  const questions = [...new Set(cases.map((c) => c.questionId))].map((id) => {
    const question = questionById.get(id);
    if (!question) throw new Error(`Unknown question: ${id}`);
    return question;
  });

  let session: InterviewSession = createSession({
    id: "demo-session",
    candidateName: "Practice run",
    questions,
  });

  for (const evalCase of cases) {
    session = recordAnswer(session, {
      questionId: evalCase.questionId,
      answer: evalCase.answer,
      turns: [{ speaker: "candidate", text: evalCase.answer }],
    });
  }

  const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
  console.log(renderScorecard(buildScorecard(session, answerScores)));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
