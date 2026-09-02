import { competencyById } from "../rubric/competencies.js";
import type { CompetencyId, InterviewQuestion, Probe } from "../types.js";

/** Cap on a written question, so one cannot be used to smuggle in an essay. */
export const MAX_CUSTOM_QUESTION = 400;

/**
 * Probes that apply to any behavioural question, used when the candidate writes
 * their own. The guide's probes are specific to its own questions, so a custom
 * question gets the generic three that push for evidence on every answer.
 */
const GENERIC_PROBES: Probe[] = [
  { trigger: "no situation established", question: "Where were you, roughly when, and what shape was it in?" },
  { trigger: "no personal action", question: "What did you personally decide or do, as against the team?" },
  { trigger: "no result or learning", question: "What changed as a result, and what did it teach you?" },
];

export class CustomQuestionError extends Error {}

/**
 * Turns something the candidate typed into a question the panel can ask.
 *
 * They choose which principle it should be scored against: the same answer reads
 * differently depending on what the interviewer was listening for, and guessing
 * on their behalf would silently score them against the wrong rubric.
 */
export function createCustomQuestion(params: {
  text: string;
  competency: CompetencyId;
  askedBy?: string;
  id?: string;
}): InterviewQuestion {
  const text = params.text.trim().replace(/\s+/g, " ");

  if (text.length < 12) {
    throw new CustomQuestionError("Write out the full question you want to be asked.");
  }
  if (text.length > MAX_CUSTOM_QUESTION) {
    throw new CustomQuestionError(
      `Keep the question under ${MAX_CUSTOM_QUESTION} characters - this is the question, not the answer.`,
    );
  }

  const competency = competencyById.get(params.competency);
  if (!competency) {
    throw new CustomQuestionError(`Unknown principle: ${params.competency}`);
  }

  return {
    id: params.id ?? `custom-${Date.now().toString(36)}`,
    text,
    competency: competency.id,
    pillar: competency.pillar,
    askedBy: params.askedBy === "ceo" ? "ceo" : "cto",
    intensity: "custom",
    probes: GENERIC_PROBES,
  };
}
