import { describe, expect, it } from "vitest";
import { runEval } from "../src/eval/harness.js";
import { evalCases, tierBounds } from "../src/eval/cases.js";
import { questionById } from "../src/questions/bank.js";

const report = await runEval();

describe("eval corpus", () => {
  it("references only questions that exist in the bank", () => {
    for (const evalCase of evalCases) {
      expect(questionById.get(evalCase.questionId), `${evalCase.id}`).toBeDefined();
    }
  });

  it("covers every tier", () => {
    const tiers = new Set(evalCases.map((c) => c.tier));
    expect(tiers).toContain("weak");
    expect(tiers).toContain("mixed");
    expect(tiers).toContain("strong");
  });

  it("documents every known limitation with a reason", () => {
    for (const evalCase of evalCases.filter((c) => c.knownLimitation)) {
      expect(evalCase.knownLimitation!.length).toBeGreaterThan(20);
    }
  });
});

describe("heuristic evaluator against the corpus", () => {
  it("meets every per-case expectation", () => {
    const failed = report.enforced.filter((r) => r.failures.length > 0);
    const detail = failed.map((r) => `${r.case.id}: ${r.failures.join("; ")}`).join("\n");
    expect(detail).toBe("");
  });

  it("separates the tiers in the right order", () => {
    expect(report.meanByTier.strong).toBeGreaterThan(report.meanByTier.mixed);
    expect(report.meanByTier.mixed).toBeGreaterThan(report.meanByTier.weak);
  });

  it("keeps a wide margin between strong and weak answers", () => {
    expect(report.meanByTier.strong - report.meanByTier.weak).toBeGreaterThan(3);
  });

  it("ranks every strong answer above every weak answer", () => {
    expect(report.rankingAccuracy).toBe(1);
  });

  it("scores each enforced case inside its tier bounds", () => {
    for (const result of report.enforced) {
      const bounds = tierBounds[result.case.tier];
      expect(result.composite, `${result.case.id}`).toBeGreaterThanOrEqual(bounds.min);
      expect(result.composite, `${result.case.id}`).toBeLessThanOrEqual(bounds.max);
    }
  });

  it("passes overall", () => {
    expect(report.passed).toBe(true);
  });
});

describe("known limitations", () => {
  it("still scores the keyword-stuffed answer high, which is why phase 4 exists", () => {
    const stuffed = report.results.find((r) => r.case.id === "keyword-stuffed")!;
    // Documents the gap rather than asserting it away: a semantically empty answer
    // that hits every surface pattern outscores genuine mid-tier answers.
    expect(stuffed.composite).toBeGreaterThan(report.meanByTier.mixed);
  });
});
