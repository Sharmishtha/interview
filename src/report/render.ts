import { bandFor, competencyById } from "../rubric/competencies.js";
import { dimensionById } from "../rubric/dimensions.js";
import { questionById } from "../questions/bank.js";
import type { AnswerScore, Scorecard } from "../types.js";

/** Renders a scorecard as plain text for the terminal. */
export function renderScorecard(scorecard: Scorecard): string {
  const lines: string[] = [];

  lines.push(`Executive interview scorecard - ${scorecard.candidateName}`);
  lines.push("=".repeat(64));
  lines.push(`Overall: ${scorecard.overall.toFixed(1)}/10`);
  lines.push("");

  lines.push("Competencies");
  lines.push("-".repeat(64));
  for (const score of scorecard.competencyScores) {
    const competency = competencyById.get(score.competency);
    const name = competency?.name ?? score.competency;
    const label = competency ? bandFor(competency, score.value).label : "";
    lines.push(`${name.padEnd(32)} ${score.value.toFixed(1).padStart(4)}  ${bar(score.value)}  ${label}`);
    lines.push(`  ${score.band}`);
  }
  lines.push("");

  if (scorecard.strengths.length) {
    lines.push(`Strengths: ${scorecard.strengths.map(nameOf).join(", ")}`);
  }
  if (scorecard.gaps.length) {
    lines.push(`Work on:   ${scorecard.gaps.map(nameOf).join(", ")}`);
  }
  lines.push("");

  lines.push("Answer-level feedback");
  lines.push("-".repeat(64));
  for (const answer of scorecard.answerScores) {
    lines.push(`[${answer.composite.toFixed(1)}] ${questionById.get(answer.questionId)?.text ?? answer.questionId}`);
    for (const dimension of weakestFirst(answer)) {
      const label = dimensionById.get(dimension.dimension)?.name ?? dimension.dimension;
      lines.push(`   ${label} ${dimension.value.toFixed(1)} - ${dimension.rationale}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Weakest dimensions first: that is where the coaching value is. */
function weakestFirst(answer: AnswerScore, limit = 3) {
  return [...answer.dimensionScores].sort((a, b) => a.value - b.value).slice(0, limit);
}

function nameOf(id: Scorecard["strengths"][number]): string {
  return competencyById.get(id)?.name ?? id;
}

function bar(value: number, width = 20): string {
  const filled = Math.round((value / 10) * width);
  return "#".repeat(filled) + ".".repeat(width - filled);
}
