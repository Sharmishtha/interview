import type { DimensionId, DimensionScore, EvidenceSpan, InterviewQuestion } from "../types.js";

/**
 * Scores one answer across every evidence dimension.
 *
 * Two implementations: the heuristic evaluator below, which is deterministic and
 * needs no API key, and `LlmEvaluator`, which reads the answer. Both must cite
 * spans, so a score can always be traced back to words the candidate actually
 * said.
 */
export interface Evaluator {
  readonly name: string;
  /**
   * Dimensions this evaluator can only approximate, and must therefore admit to.
   *
   * Not every dimension is measurable the same way. Whether a number is present
   * is a fact a regex can establish; whether an answer is worth retelling is a
   * judgement, and a regex counting proper nouns is standing in for a reader.
   * Both evaluators return a score for every dimension - the composite is a
   * weighted sum and a gap would silently deflate it - so the honest thing is to
   * say which of those scores are estimates rather than to withhold them.
   */
  readonly approximates: readonly DimensionId[];
  evaluate(question: InterviewQuestion, answer: string): Promise<DimensionScore[]>;
}

// ---------------------------------------------------------------------------
// Signal patterns
// ---------------------------------------------------------------------------

/**
 * Outcomes are stated in whatever unit the business uses, so currency and
 * percentages alone are not enough. A survey score moving "up by 12 points" and
 * a capability going "from 210 channels to 10,000" are both hard results, and an
 * earlier, narrower list scored both as entirely unquantified.
 */
const METRIC_PATTERNS = [
  /\$\s?\d[\d,.]*\s?(?:k|m|bn?|million|billion|thousand)?/gi,
  /\d[\d,.]*\s?%/g,
  /\b\d+(?:\.\d+)?\s?x\b/gi,
  /\b\d[\d,.]*\s?(?:bps|basis points)\b/gi,
  // Before-and-after movement, in any unit.
  /\bfrom \d[\d,.]*[^.]{0,24}?\bto \d[\d,.]*/gi,
  /\b(?:up|down|rose|fell|grew|increased|decreased|reduced|improved)\b[^.]{0,15}?\bby \d[\d,.]*/gi,
  /\b\d[\d,.]*\s?(?:points?|pts)\b/gi,
  // Time and magnitude.
  /\b\d[\d,.]*\s?(?:seconds?|minutes?|hours?|days?|weeks?|months?|quarters?|years?)\b/gi,
  /\b\d[\d,.]*\s?(?:million|billion|thousand)\b/gi,
  // Countable business units.
  /\b\d[\d,.]*\s?(?:engineer[- ]months?|incidents?|sev\s?\d|outages?|deploys?)\b/gi,
  /\b\d[\d,.]*\s?(?:channels?|devices?|projects?|accounts?|markets?|tickets?|releases?|teams?|hires?)\b/gi,
];

const SCALE_PATTERNS = [
  /\bteam of \d[\d,]*/gi,
  /\b\d[\d,.]*\s?(?:million|billion|k|m)?\s?(?:people|employees|engineers|developers|reports|headcount|staff|users|customers|actives)\b/gi,
  /\$\s?\d[\d,.]*\s?(?:k|m|bn?|million|billion)?\b/gi,
  /\b\d[\d,.]*\s?(?:million|billion)\b/gi,
  /\b(?:millions?|thousands?|hundreds?) of \w+/gi,
  /\b\d[\d,.]*\s?(?:channels?|devices?|markets?|accounts?|countries|regions)\b/gi,
  /\b(?:P&L|ARR|EBITDA|MAU|DAU|run[- ]rate)\b/gi,
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

/** The "T" of STAR-L: what they were specifically expected to deliver. */
const TASK_PATTERNS = [
  /\bi was (?:asked|brought in|hired|tasked)\b/gi,
  /\bmy (?:mandate|remit|brief|charge|job was)\b/gi,
  /\bi was responsible for\b/gi,
  /\bthe (?:goal|target|mandate|brief|objective) was\b/gi,
  /\bexpected to deliver\b/gi,
  /\bwe had committed to\b/gi,
];

/** Shifting blame outward, a negative signal under Build Resilience and Be Real. */
const DEFLECTION_PATTERNS = [
  /\bnot (?:really )?(?:a|an|my|our)[^.]{0,20}\b(?:problem|fault|issue)\b/gi,
  /\bout of (?:my|our) control\b/gi,
  /\bwe were given\b/gi,
  /\bkept changing\b/gi,
  /\bnobody (?:told|asked|agreed)\b/gi,
  /\bhad already promised\b/gi,
  /\bwith what we were given\b/gi,
];

/**
 * The "L" of STAR-L. People signal reflection in far more ways than a fixed
 * handful of stock phrases, and a real transcript exposed that: "I wish I could
 * have talked to our CEO" and "if I would handle something differently" are
 * among the most reflective things anyone can say, and an earlier, narrower list
 * scored both as no learning at all.
 */
const LEARNING_PATTERNS = [
  // Retrospective framing
  /\b(?:in|with) hindsight\b/gi,
  /\blooking back\b/gi,
  /\bknowing what i know now\b/gi,
  /\bat the time i (?:thought|believed|assumed)\b/gi,
  // Counterfactuals - what they would change
  /\bi wish i (?:had|could|would|'d)\b/gi,
  /\bif i (?:had|were|would|could)\b[^.]{0,50}?\b(?:again|differently|over|back)\b/gi,
  /\b(?:do|did|done|handle|handled|approach|approached|play|played)\b[^.]{0,25}\bdifferently\b/gi,
  /\bnext time\b/gi,
  /\bi (?:should|could) have\b/gi,
  /\bwould have (?:been better|helped)\b/gi,
  // Naming the lesson
  /\bwhat (?:i|did i) learn(?:ed)?\b/gi,
  /\bi learn(?:ed|t)\b/gi,
  /\b(?:it|that|this|the experience) taught me\b/gi,
  /\bthe lesson\b/gi,
  /\bmy (?:takeaway|learning)\b/gi,
  /\bwhat i took (?:away )?from\b/gi,
  // Owning the error
  /\bi (?:was|got it|got that) wrong\b/gi,
  /\bmy (?:mistake|error|fault)\b/gi,
  /\bi regret\b/gi,
  /\bi (?:underestimated|overestimated|misjudged|misread|missed)\b/gi,
  /\bi realis(?:ed|e)\b|\bi realiz(?:ed|e)\b/gi,
  /\bi (?:grew|have grown)\b/gi,
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

/**
 * A story has a turn in it - something went wrong, changed, or surprised them.
 * A summary just lists what happened in order.
 */
const TURN_PATTERNS = [
  /\bbut then\b/gi,
  /\bwhat (?:we|i) (?:did ?n[o']t|didn't) (?:know|expect|see)\b/gi,
  /\bthe problem was\b/gi,
  /\bthat (?:all )?changed when\b/gi,
  /\bhalfway through\b/gi,
  /\bthen (?:everything|it all|things)\b/gi,
  /\buntil\b[^.]{0,30}\b(?:broke|failed|walked|quit|called|resigned)\b/gi,
  /\bwent wrong\b/gi,
  /\bblew up\b/gi,
  /\bnobody (?:expected|saw)\b/gi,
  /\bto my surprise\b/gi,
  /\bwhat i had ?n[o']?t\b/gi,
];

/** Scene-setting: a specific moment rather than a general period. */
const SCENE_PATTERNS = [
  /\bon (?:a |the )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\bthat (?:morning|afternoon|evening|night|week|day)\b/gi,
  /\bi remember\b/gi,
  /\bi walked (?:in|into|out)\b/gi,
  /\bsat (?:down |there )?(?:with|across)\b/gi,
  /\bin the room\b/gi,
  /\bpicked up the phone\b/gi,
  /\bthe first thing i (?:did|said)\b/gi,
];

/** Something only this person could have said - the retellable detail. */
const VIVID_PATTERNS = [
  /\b(?:told|said to|asked) (?:me|him|her|them)\b/gi,
  /\bhe (?:said|told|asked)\b|\bshe (?:said|told|asked)\b|\bthey (?:said|told|asked)\b/gi,
  /"[^"]{8,120}"/g,
  /\bcalled it\b/gi,
  /\bthe (?:joke|line|phrase|nickname) was\b/gi,
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

function plural(count: number): string {
  return count === 1 ? "" : "s";
}

/** "a", "a and b", "a, b, and c" */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
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
  /**
   * The story dimensions. Story shape is inferred from turn and scene phrases,
   * and memorability from named entities and vivid language - both are proxies
   * for something only a reader can settle. The eval corpus documents the cost:
   * `keyword-stuffed` still scores in the sevens because every surface feature
   * it looks for is present and none of it means anything.
   */
  readonly approximates = ["story-shape", "memorability"] as const;

  readonly name = "heuristic";

  async evaluate(_question: InterviewQuestion, answer: string): Promise<DimensionScore[]> {
    return [
      this.specificity(answer),
      this.scopeScale(answer),
      this.ownership(answer),
      this.quantifiedOutcomes(answer),
      this.learning(answer),
      this.starStructure(answer),
      this.storyShape(answer),
      this.memorability(answer),
    ];
  }

  private specificity(answer: string): DimensionScore {
    const concrete = findSpans(answer, CONCRETE_PATTERNS);
    const platitudes = findSpans(answer, PLATITUDE_PATTERNS);
    const proper = properNounSpans(answer);

    const value =
      3.5 +
      Math.min(concrete.length, 4) * 0.9 +
      Math.min(proper.length, 4) * 0.7 -
      platitudes.length * 1.8;

    const anchors = [
      concrete.length ? `${concrete.length} time/place marker${plural(concrete.length)}` : null,
      proper.length ? `${proper.length} named entit${proper.length === 1 ? "y" : "ies"}` : null,
    ].filter(Boolean);

    const rationale = platitudes.length
      ? `${platitudes.length} general-philosophy phrase${plural(platitudes.length)} instead of a named situation, e.g. "${platitudes[0].text}".`
      : anchors.length
        ? `Anchored in specifics: ${list(anchors as string[])}.`
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

  private learning(answer: string): DimensionScore {
    const spans = findSpans(answer, LEARNING_PATTERNS);
    const value = spans.length === 0 ? 2.5 : 5 + spans.length * 2;
    const rationale = spans.length
      ? `Learning is stated, e.g. "${spans[0].text}".`
      : "No hindsight and no learning - the L of STAR-L is missing.";

    return score("learning", value, rationale, spans);
  }

  private starStructure(answer: string): DimensionScore {
    const found = starElements(answer);
    const present = STAR_ELEMENTS.filter((element) => found[element].length > 0);
    const missing = STAR_ELEMENTS.filter((element) => found[element].length === 0);
    const words = wordCount(answer);

    let value = 2 + present.length * 1.6;
    let note = "";

    if (words < 40) {
      value = Math.min(value, 4);
      note = ` Answer is only ${words} words - too thin for an executive story.`;
    } else if (words > 600) {
      value -= 1;
      note = ` At ${words} words it rambles; tighten to the decision and the result.`;
    }

    const rationale =
      (missing.length
        ? `Missing ${list([...missing])} in the STAR-L arc.`
        : "Complete Situation - Task - Action - Result - Learning arc.") + note;

    return score(
      "star-structure",
      value,
      rationale,
      present.flatMap((element) => found[element]),
    );
  }

  /**
   * A story has a turn in it. Detecting one lexically is genuinely hard - this
   * looks for the language people use when something changed on them, and for
   * scene-setting that places the listener at a moment rather than over a
   * period. It will miss a well-told story that uses none of these words, which
   * is squarely the kind of judgement a semantic evaluator makes better.
   */
  private storyShape(answer: string): DimensionScore {
    const turns = findSpans(answer, TURN_PATTERNS);
    const scenes = findSpans(answer, SCENE_PATTERNS);
    const words = wordCount(answer);

    let value = 2.5 + Math.min(turns.length, 2) * 2.6 + Math.min(scenes.length, 2) * 1.5;
    if (words < 60) value = Math.min(value, 3.5);

    const rationale = turns.length
      ? scenes.length
        ? `Told as a story: a turn ("${turns[0].text.trim()}") and a scene to place it in.`
        : `There is a turn ("${turns[0].text.trim()}"), but no scene - the listener is told about it rather than put in it.`
      : scenes.length
        ? "Sets a scene, but nothing goes wrong or changes - it reads as a summary of what happened."
        : "Reads as a summary rather than a story: no moment where something changed or went wrong.";

    return score("story-shape", value, rationale, [...turns, ...scenes]);
  }

  /**
   * Would the interviewer still be able to retell this next week? What survives
   * is the odd specific - a named person, a quoted line, a number nobody would
   * invent - not the competency being demonstrated.
   */
  private memorability(answer: string): DimensionScore {
    const vivid = findSpans(answer, VIVID_PATTERNS);
    const named = properNounSpans(answer);
    const odd = findSpans(answer, METRIC_PATTERNS);

    const distinct = Math.min(named.length, 4) + Math.min(vivid.length, 3) * 1.5;
    let value = 1.5 + distinct * 1.1 + Math.min(odd.length, 3) * 0.5;
    if (wordCount(answer) < 60) value = Math.min(value, 3);

    const held: string[] = [];
    if (named.length)
      held.push(
        `${named.length} named ${named.length === 1 ? "person or place" : "people or places"}`,
      );
    if (vivid.length) held.push("someone actually speaking");
    if (odd.length) held.push("a figure that sticks");

    const rationale = held.length
      ? `Retellable: ${list(held)}.`
      : "Nothing here that only you could have said - no names, no quoted line, no odd specific. It will blur into the other candidates.";

    return score("memorability", value, rationale, [...vivid, ...named.slice(0, 4)]);
  }
}

export const STAR_ELEMENTS = ["situation", "task", "action", "result", "learning"] as const;

export type StarElement = (typeof STAR_ELEMENTS)[number];

/** Which parts of the STAR-L arc appear in an answer, with the spans that show them. */
export function starElements(answer: string): Record<StarElement, EvidenceSpan[]> {
  return {
    situation: findSpans(answer, SITUATION_PATTERNS),
    task: findSpans(answer, TASK_PATTERNS),
    action: findSpans(answer, ACTION_PATTERNS),
    result: findSpans(answer, RESULT_PATTERNS),
    learning: findSpans(answer, LEARNING_PATTERNS),
  };
}

/** Detects blame-shifting language, which the guide lists as a negative signal. */
export function deflectionSpans(answer: string): EvidenceSpan[] {
  return findSpans(answer, DEFLECTION_PATTERNS);
}
