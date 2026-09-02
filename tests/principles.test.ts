import { describe, expect, it } from "vitest";
import { competencies, pillars } from "../src/rubric/competencies.js";
import { PRINCIPLE_GROUPS, PRINCIPLES } from "../web/src/principles.js";

/**
 * The compose screen ships the principle list rather than fetching it, so this
 * is the test that stops the copy from drifting away from the guide. If it
 * fails, `web/src/principles.ts` is the file to fix - never this test, and never
 * the rubric.
 */
describe("the frontend's copy of the principles", () => {
  it("names the same pillars, in the same order", () => {
    expect(PRINCIPLE_GROUPS.map((g) => ({ pillar: g.pillar, name: g.name }))).toEqual(
      pillars.map((p) => ({ pillar: p.id, name: p.name })),
    );
  });

  it("names the same principles, in the same order, under the same pillars", () => {
    expect(PRINCIPLES.map((p) => p.id)).toEqual(competencies.map((c) => c.id));

    for (const group of PRINCIPLE_GROUPS) {
      for (const principle of group.principles) {
        const competency = competencies.find((c) => c.id === principle.id);
        expect(competency, `unknown principle ${principle.id}`).toBeDefined();
        expect(competency!.name).toBe(principle.name);
        expect(competency!.pillar).toBe(group.pillar);
      }
    }
  });

  it("gives every principle a cue, so the label alone is enough to choose by", () => {
    for (const principle of PRINCIPLES) {
      expect(principle.about.length, principle.id).toBeGreaterThan(20);
    }
  });
});
