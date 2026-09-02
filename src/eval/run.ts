import { runEval } from "./harness.js";
import { dimensions } from "../rubric/dimensions.js";
import type { DimensionId } from "../types.js";

const SHORT: Record<DimensionId, string> = {
  specificity: "spec",
  "scope-scale": "scale",
  ownership: "own",
  "quantified-outcomes": "quant",
  learning: "learn",
  "star-structure": "starl",
  "story-shape": "story",
  memorability: "memo",
};

async function main(): Promise<void> {
  const report = await runEval();

  console.log("\nEvaluator: heuristic");
  console.log("=".repeat(88));
  console.log(
    "case".padEnd(26) +
      "tier".padEnd(8) +
      "score".padStart(6) +
      "  " +
      dimensions.map((d) => SHORT[d.id].padStart(6)).join(""),
  );
  console.log("-".repeat(88));

  for (const result of report.enforced) {
    const cells = dimensions
      .map((d) => {
        const score = result.dimensionScores.find((s) => s.dimension === d.id);
        return (score?.value.toFixed(1) ?? "-").padStart(6);
      })
      .join("");

    const status = result.failures.length ? "FAIL" : "ok";
    console.log(
      result.case.id.padEnd(26) +
        result.case.tier.padEnd(8) +
        result.composite.toFixed(2).padStart(6) +
        "  " +
        cells +
        "  " +
        status,
    );

    for (const failure of result.failures) {
      console.log(`${" ".repeat(26)}  -> ${failure}`);
    }
  }

  console.log("-".repeat(88));
  console.log(
    `means   weak ${report.meanByTier.weak.toFixed(2)}   ` +
      `mixed ${report.meanByTier.mixed.toFixed(2)}   ` +
      `strong ${report.meanByTier.strong.toFixed(2)}   ` +
      `separation ${(report.meanByTier.strong - report.meanByTier.weak).toFixed(2)}`,
  );
  console.log(`ranking accuracy (every strong > every weak): ${(report.rankingAccuracy * 100).toFixed(0)}%`);

  if (report.knownLimitations.length) {
    console.log("\nKnown limitations (reported, not enforced)");
    console.log("-".repeat(88));
    for (const result of report.knownLimitations) {
      console.log(`${result.case.id.padEnd(26)}scored ${result.composite.toFixed(2)}`);
      console.log(`${" ".repeat(26)}${result.case.knownLimitation}`);
    }
  }

  console.log(`\n${report.passed ? "PASS" : "FAIL"}\n`);
  if (!report.passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
