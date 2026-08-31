import { bandFor, competencyById, pillarById } from "../rubric/competencies.js";
import { dimensionById } from "../rubric/dimensions.js";
import { questionById } from "../questions/bank.js";
import type { Scorecard } from "../types.js";

/** Renders a scorecard, with coaching, as plain text for the terminal. */
export function renderScorecard(scorecard: Scorecard): string {
  const lines: string[] = [];

  lines.push(`Executive Leadership Principles - ${scorecard.candidateName}`);
  lines.push("=".repeat(76));
  lines.push(`Overall: ${scorecard.overall.toFixed(1)}/10`);
  lines.push("");

  for (const score of scorecard.competencyScores) {
    const competency = competencyById.get(score.competency);
    const pillar = pillarById.get(score.pillar)?.name ?? score.pillar;
    const label = competency ? bandFor(competency, score.value).label : "";

    lines.push(`${pillar.toUpperCase()}`);
    lines.push(
      `${(competency?.name ?? score.competency).padEnd(30)} ${score.value.toFixed(1).padStart(4)}  ${bar(score.value)}  ${label}`,
    );
    lines.push(`  ${score.band}`);
    lines.push("");
  }

  if (scorecard.strengths.length) {
    lines.push(`Strengths: ${scorecard.strengths.map(nameOf).join(", ")}`);
  }
  if (scorecard.gaps.length) {
    lines.push(`Work on:   ${scorecard.gaps.map(nameOf).join(", ")}`);
  }

  lines.push("");
  lines.push("How to reach 8+");
  lines.push("-".repeat(76));

  for (const guidance of scorecard.guidance) {
    const question = questionById.get(guidance.questionId);
    lines.push(`[${guidance.composite.toFixed(1)} -> ${guidance.reachable.toFixed(1)}] ${question?.text ?? guidance.questionId}`);

    for (const lift of guidance.lifts) {
      const name = dimensionById.get(lift.dimension)?.name ?? lift.dimension;
      lines.push(`   +${lift.compositeGain.toFixed(2)}  ${name} ${lift.from.toFixed(1)} -> ${lift.to}`);
      lines.push(`          ${wrap(lift.suggestion, 66, 10)}`);
    }

    if (guidance.flags.length) {
      lines.push(`   Negative signals: ${guidance.flags.join("; ")}`);
    }
    if (guidance.probes.length) {
      lines.push(`   Be ready for these follow-ups (* = likely not covered):`);
      for (const probe of guidance.probes) {
        lines.push(`     ${probe.likelyUncovered ? "*" : "-"} ${wrap(probe.question, 66, 7)}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function nameOf(id: Scorecard["strengths"][number]): string {
  return competencyById.get(id)?.name ?? id;
}

function bar(value: number, width = 20): string {
  const filled = Math.round((value / 10) * width);
  return "#".repeat(filled) + ".".repeat(width - filled);
}

function wrap(text: string, width: number, indent: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + word).length > width) {
      lines.push(current.trimEnd());
      current = "";
    }
    current += `${word} `;
  }
  if (current.trim()) lines.push(current.trimEnd());

  return lines.join(`\n${" ".repeat(indent)}`);
}
