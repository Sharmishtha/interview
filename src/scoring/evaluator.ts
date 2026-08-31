import type { DimensionId, DimensionScore, EvidenceSpan, InterviewQuestion } from "../types.js";

/**
 * Scores one answer across every evidence dimension.
 *
 * Two implementations are planned: the heuristic evaluator below, which is
 * deterministic and needs no API key, and an LLM evaluator (phase 4) that reads
 * the rubric bands. Both must cite spans, so a score can always be traced back to
 * words the candidate actually said.
 */
export interface Evaluator {
  readonly name: string;
  evaluate(question: InterviewQuestion, answer: string): Promise<DimensionScore[]>;
}

// ---------------------------------------------------------------------------
// Signal patterns
// ---------------------------------------------------------------------------

const METRIC_PATTERNS = [
  /\$\s?\d[\d,.]*\s?(?:k|m|bn?|million|billion|thousand)?/gi,
  /\d[\d,.]*\s?%/g,
  /\b\d+(?:\.\d+)?\s?x\b/gi,
  /\b\d[\d,.]*\s?(?:bps|basis points)\b/gi,
];

const SCALE_PATTERNS = [
  /\bteam of \d[\d,]*/gi,
  /\b\d[\d,]*\s?(?:people|employees|engineers|reports|headcount|staff)\b/gi,
  /\$\s?\d[\d,.]*\s?(?:k|m|bn?|million|billion)\b/gi,
  /\bP&L\b/gi,
  /\b(?:ARR|EBITDA|run[- ]rate)\b/gi,
];

const PLATITUDE_PATTERNS = [
  /\bi (?:always|never)\b/gi,
  /\bmy philosophy\b/gi,
  /\bi (?:strongly )?believe in\b/gi,
  /\bi like to\b/gi,
  /\bgenerally speaking\b/gi,
  /\bat the end of the day\b/gi,
  /\bempower(?:ing|ed)?\s+(?:my |the |our )?(?:team|people)\b/gi,
];

const CONCRETE_PATTERNS = [
  /\bin (?:19|20)\d{2}\b/gi,
  /\bQ[1-4]\b/g,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
  /\bwhen i (?:joined|took over|arrived|started)\b/gi,
];

const REFLECTION_PATTERNS = [
  /\bin hindsight\b/gi,
  /\blooking back\b/gi,
  /\bi(?:'d| would)(?: have)? done? [^.]{0,25}differently\b/gi,
  /\bwhat i learned\b/gi,
  /\bi was wrong\b/gi,
  /\bmy mistake\b/gi,
  /\bi should have\b/gi,
  /\bi underestimated\b/gi,
  /\bif i had to do it again\b/gi,
];

const SITUATION_PATTERNS = [
  /\bwhen i (?:joined|took over|arrived|started)\b/gi,
  /\bat the time\b/gi,
  /\bthe (?:situation|business) was\b/gi,
  /\bwe were\b/gi,
];

const ACTION_PATTERNS = [
  /\bi (?:decided|launched|restructured|hired|cut|built|moved|shut|rebuilt|replaced|reorganised|reorganized)\b/gi,
  /\bi personally\b/gi,
  /\bmy first move\b/gi,
];

const RESULT_PATTERNS = [
  /\bas a result\b/gi,
  /\bthe outcome\b/gi,
  /\bwe (?:ended up|went from)\b/gi,
  /\bby the end\b/gi,
  /\bwithin \d+\s?(?:days|weeks|months|quarters|years)\b/gi,
];

const FIRST_SINGULAR = /\b(?:i|my|me)\b/gi;
const FIRST_PLURAL = /\b(?:we|our|us)\b/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.max(0, Math.min(10, Number(value.toFixed(2))));
}

/** Collects every match of every pattern as a citable span, deduped by offset. */
export function findSpans(text: string, patterns: RegExp[]): EvidenceSpan[] {
  const spans: EvidenceSpan[] = [];
  const seen = new Set<number>();

  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if (!seen.has(match.index)) {
        seen.add(match.index);
        spans.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
      }
    }
  }

  return spans.sort((a, b) => a.start - b.start);
}

/** Capitalised words mid-sentence: a rough proxy for named people, products, companies. */
function properNounSpans(text: string): EvidenceSpan[] {
  const spans: EvidenceSpan[] = [];
  const re = /\b[A-Z][a-zA-Z]{2,}\b/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const before = text.slice(0, match.index).trimEnd();
    const startsSentence = before === "" || /[.!?]$/.test(before);
    if (!startsSentence) {
      spans.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  }

  return spans;
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function score(
  dimension: DimensionId,
  value: number,
  rationale: string,
  evidence: EvidenceSpan[],
): DimensionScore {
  return { dimension, value: clamp(value), rationale, evidence };
}

// ---------------------------------------------------------------------------
// Heuristic evaluator
// ---------------------------------------------------------------------------

/**
 * A deterministic first-pass evaluator. It does not understand the answer - it
 * detects the surface features that separate strong executive answers from weak
 * ones, which is enough to give useful rehearsal feedback and to regression-test
 * the scoring pipeline without burning API calls.
 */
export class HeuristicEvaluator implements Evaluator {
  readonly name = "heuristic";

  async evaluate(_question: InterviewQuestion, answer: string): Promise<DimensionScore[]> {
    return [
      this.specificity(answer),
      this.scopeScale(answer),
      this.ownership(answer),
      this.quantifiedOutcomes(answer),
      this.reflection(answer),
      this.structure(answer),
    ];
  }

  private specificity(answer: string): DimensionScore {
    const concrete = findSpans(answer, CONCRETE_PATTERNS);
    const platitudes = findSpans(answer, PLATITUDE_PATTERNS);
    const proper = properNounSpans(answer);

    const value =
      3.5 + Math.min(concrete.length, 4) * 0.9 + Math.min(proper.length, 4) * 0.7 - platitudes.length * 1.8;

    const rationale = platitudes.length
      ? `${platitudes.length} general-philosophy phrase(s) instead of a named situation, e.g. "${platitudes[0].text}".`
      : concrete.length || proper.length
        ? `Anchored in specifics: ${concrete.length} time/place marker(s), ${proper.length} named entit(ies).`
        : "No dates, names, or concrete situations to anchor the story.";

    return score("specificity", value, rationale, [...concrete, ...platitudes]);
  }

  private scopeScale(answer: string): DimensionScore {
    const spans = findSpans(answer, SCALE_PATTERNS);
    const value = spans.length === 0 ? 2 : 4 + spans.length * 1.7;
    const rationale = spans.length
      ? `Scale is legible: ${spans.map((s) => `"${s.text.trim()}"`).join(", ")}.`
      : "Never sizes what was owned - no headcount, budget, or revenue figure.";

    return score("scope-scale", value, rationale, spans);
  }

  private ownership(answer: string): DimensionScore {
    const singular = countMatches(answer, FIRST_SINGULAR);
    const plural = countMatches(answer, FIRST_PLURAL);
    const total = singular + plural;

    if (total === 0) {
      return score("ownership", 3, "No first-person narrative - unclear what this person did.", []);
    }

    const ratio = singular / total;
    let value: number;
    let rationale: string;

    if (ratio < 0.2) {
      value = 3;
      rationale = `Almost entirely "we" (${singular} vs ${plural}). Their personal contribution is invisible.`;
    } else if (ratio < 0.45) {
      value = 6;
      rationale = `Leans on "we" (${singular} vs ${plural}). Could be clearer about their own decisions.`;
    } else if (ratio <= 0.75) {
      value = 9;
      rationale = `Healthy balance of personal action and team credit (${singular} "I" vs ${plural} "we").`;
    } else if (ratio <= 0.9) {
      value = 7;
      rationale = `Heavily "I" (${singular} vs ${plural}) - gives the team little credit.`;
    } else {
      value = 5;
      rationale = `Almost no team credit (${singular} "I" vs ${plural} "we"), which reads poorly at executive level.`;
    }

    return score("ownership", value, rationale, []);
  }

  private quantifiedOutcomes(answer: string): DimensionScore {
    const spans = findSpans(answer, METRIC_PATTERNS);
    const value = spans.length === 0 ? 1 : 3.5 + spans.length * 1.6;
    const rationale = spans.length
      ? `${spans.length} quantified figure(s): ${spans.map((s) => `"${s.text.trim()}"`).join(", ")}.`
      : "No numbers anywhere. The result is asserted, not measured.";

    return score("quantified-outcomes", value, rationale, spans);
  }

  private reflection(answer: string): DimensionScore {
    const spans = findSpans(answer, REFLECTION_PATTERNS);
    const value = spans.length === 0 ? 2.5 : 5 + spans.length * 2;
    const rationale = spans.length
      ? `Reflective language present, e.g. "${spans[0].text}".`
      : "No hindsight, no learning, nothing they would do differently.";

    return score("reflection", value, rationale, spans);
  }

  private structure(answer: string): DimensionScore {
    const situation = findSpans(answer, SITUATION_PATTERNS);
    const action = findSpans(answer, ACTION_PATTERNS);
    const result = findSpans(answer, RESULT_PATTERNS);

    const parts = [situation, action, result];
    const present = parts.filter((p) => p.length > 0).length;
    const words = wordCount(answer);

    let value = 2 + present * 2.5;
    let note = "";

    if (words < 40) {
      value = Math.min(value, 4);
      note = ` Answer is only ${words} words - too thin for an executive story.`;
    } else if (words > 600) {
      value -= 1;
      note = ` At ${words} words it rambles; tighten to the decision and the result.`;
    }

    const missing = [
      situation.length ? null : "situation",
      action.length ? null : "action",
      result.length ? null : "result",
    ].filter(Boolean);

    const rationale =
      (missing.length
        ? `Missing ${missing.join(" and ")} in the narrative arc.`
        : "Complete situation - action - result arc.") + note;

    return score("structure", value, rationale, [...situation, ...action, ...result]);
  }
}
