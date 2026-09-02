import type { AnswerRecord, Interview, Question, Scorecard, SecondOpinion } from "./types";

async function failure(response: Response): Promise<never> {
  let detail = response.statusText;
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) detail = body.error;
  } catch {
    // Non-JSON error body; the status text is the best we have.
  }
  throw new Error(detail);
}

export async function fetchInterview(seed?: number): Promise<Interview> {
  const query = seed === undefined ? "" : `?seed=${seed}`;
  const response = await fetch(`/api/interview${query}`);
  if (!response.ok) return failure(response);
  return (await response.json()) as Interview;
}

/** Returns MP3 audio of a panelist speaking. Throws if voice is unavailable. */
export async function speak(text: string, panelistId: string): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, panelistId }),
  });
  if (!response.ok) return failure(response);
  return response.blob();
}

export async function transcribe(audio: Blob): Promise<string> {
  const response = await fetch("/api/stt", {
    method: "POST",
    headers: { "Content-Type": audio.type || "audio/webm" },
    body: audio,
  });
  if (!response.ok) return failure(response);
  const body = (await response.json()) as { text: string };
  return body.text;
}

/**
 * Builds a one-question interview from something the candidate wrote.
 *
 * The question is rebuilt server-side here and again at scoring time. The client
 * never gets to define what is scored - it only says what it would like asked.
 */
export async function customQuestion(params: {
  text: string;
  competency: string;
  askedBy: string;
}): Promise<Interview> {
  const response = await fetch("/api/custom-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) return failure(response);
  return (await response.json()) as Interview;
}

/**
 * Custom questions travel with the request because the server's question bank
 * has never heard of them. It rebuilds each one from the text and principle
 * rather than trusting what is sent.
 */
export async function score(
  candidateName: string,
  answers: AnswerRecord[],
  customQuestions: Question[] = [],
): Promise<Scorecard> {
  const response = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateName, answers, customQuestions }),
  });
  if (!response.ok) return failure(response);
  return (await response.json()) as Scorecard;
}

/**
 * The second opinion, which costs money per run and may not be configured at
 * all. Kept separate from `score` so the free scorecard never waits on it.
 */
export async function secondOpinion(
  candidateName: string,
  answers: AnswerRecord[],
  customQuestions: Question[] = [],
): Promise<SecondOpinion> {
  const response = await fetch("/api/score/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateName, answers, customQuestions }),
  });
  if (!response.ok) return failure(response);
  return (await response.json()) as SecondOpinion;
}

/** Whether this deployment offers the model evaluator behind its own button. */
export async function capabilities(): Promise<{ secondOpinion: boolean }> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return { secondOpinion: false };
    const body = (await response.json()) as { secondOpinion?: boolean };
    return { secondOpinion: Boolean(body.secondOpinion) };
  } catch {
    // A button that cannot work is worse than no button.
    return { secondOpinion: false };
  }
}
