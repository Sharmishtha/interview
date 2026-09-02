import type { Question, Scorecard } from "./types";

/**
 * Practice history, kept in this browser and nowhere else.
 *
 * Deliberately local. A transcript of someone rehearsing their worst management
 * decisions is about as sensitive as work writing gets, and storing it on a
 * server turns a practice tool into a data-retention question - consent, export,
 * deletion, and who at the company can read it. None of that has been answered
 * yet, so until it is, the record stays on the machine that made it, where
 * clearing site data is a complete delete.
 *
 * The trade-off is real and worth stating: history does not follow you to
 * another device, and it disappears with the browser profile.
 */

const KEY = "interview.history.v1";

/** Keeps a long history from growing without bound in a 5MB store. */
const MAX_ENTRIES = 50;

export interface StoredAttempt {
  id: string;
  /** ISO timestamp of when the scorecard was produced. */
  at: string;
  candidateName: string;
  overall: number;
  /** "guide" for the standard three, "custom" for a question they wrote. */
  kind: "guide" | "custom";
  /** The questions asked, so an attempt can be re-read without the bank. */
  questions: { id: string; text: string; competency: string }[];
  /** What each answer scored per dimension - the part worth trending over time. */
  dimensions: { dimension: string; value: number }[];
  competencies: { competency: string; value: number }[];
  headline: string;
  /** Present when the second opinion was run on this attempt. */
  llmOverall?: number;
}

function read(): StoredAttempt[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAttempt[]) : [];
  } catch {
    // Private browsing, a disabled store, or something else's data under our
    // key. History is a convenience; never let it break the app.
    return [];
  }
}

function write(entries: StoredAttempt[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota exceeded or storage denied. Nothing to do and nothing worth saying.
  }
}

/** Newest first. */
export function history(): StoredAttempt[] {
  return read();
}

export function saveAttempt(
  scorecard: Scorecard,
  questions: Question[],
  kind: "guide" | "custom",
): StoredAttempt {
  // Averaged across answers, because a trend line per dimension is the whole
  // point of keeping these: "your Learning score moved 2.5 to 6.1 over four runs".
  const totals = new Map<string, { sum: number; count: number }>();
  for (const answer of scorecard.answerScores) {
    for (const dimension of answer.dimensionScores) {
      const bucket = totals.get(dimension.dimension) ?? { sum: 0, count: 0 };
      bucket.sum += dimension.value;
      bucket.count += 1;
      totals.set(dimension.dimension, bucket);
    }
  }

  const entry: StoredAttempt = {
    id: scorecard.sessionId,
    at: new Date().toISOString(),
    candidateName: scorecard.candidateName,
    overall: scorecard.overall,
    kind,
    questions: questions.map((q) => ({ id: q.id, text: q.text, competency: q.competency })),
    dimensions: [...totals].map(([dimension, { sum, count }]) => ({
      dimension,
      value: Number((sum / count).toFixed(2)),
    })),
    competencies: scorecard.competencyScores.map((c) => ({
      competency: c.competency,
      value: c.value,
    })),
    headline: scorecard.narrative.headline,
  };

  // Replacing by id keeps a re-score of the same session from stacking up.
  write([entry, ...read().filter((e) => e.id !== entry.id)]);
  return entry;
}

/** Records the second opinion against an attempt already saved. */
export function recordSecondOpinion(sessionId: string, overall: number): void {
  write(read().map((e) => (e.id === sessionId ? { ...e, llmOverall: overall } : e)));
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing stored, or storage denied. Either way there is nothing to clear.
  }
}

/**
 * Movement on one dimension across attempts, oldest first, for a trend line.
 * Returns null until there are two points, since a single score is not a trend.
 */
export function trendFor(dimension: string, entries = read()): number[] | null {
  const points = [...entries]
    .reverse()
    .map((entry) => entry.dimensions.find((d) => d.dimension === dimension)?.value)
    .filter((value): value is number => value !== undefined);

  return points.length >= 2 ? points : null;
}
