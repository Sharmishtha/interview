import { describe, expect, it } from "vitest";
import { createCustomQuestion, CustomQuestionError, MAX_CUSTOM_QUESTION } from "../src/questions/custom.js";
import { competencyById } from "../src/rubric/competencies.js";

const valid = { text: "Tell me about a reorg you led that did not land.", competency: "raise-the-bar" as const };

describe("createCustomQuestion", () => {
  it("builds a question the panel can ask", () => {
    const question = createCustomQuestion(valid);
    expect(question.text).toBe(valid.text);
    expect(question.intensity).toBe("custom");
    expect(question.probes.length).toBeGreaterThan(0);
  });

  it("takes the pillar from the chosen principle rather than trusting the caller", () => {
    const question = createCustomQuestion({ ...valid, competency: "grow-groundbreakers" });
    expect(question.pillar).toBe(competencyById.get("grow-groundbreakers")!.pillar);
  });

  it("normalises whitespace", () => {
    expect(createCustomQuestion({ ...valid, text: "  Tell   me\nabout a hard call.  " }).text).toBe(
      "Tell me about a hard call.",
    );
  });

  it("rejects a question too short to be one", () => {
    expect(() => createCustomQuestion({ ...valid, text: "why?" })).toThrow(CustomQuestionError);
  });

  it("rejects an essay pasted in as a question", () => {
    expect(() => createCustomQuestion({ ...valid, text: "x".repeat(MAX_CUSTOM_QUESTION + 1) })).toThrow(
      /under \d+ characters/,
    );
  });

  it("rejects an unknown principle", () => {
    expect(() => createCustomQuestion({ ...valid, competency: "not-a-principle" as never })).toThrow(
      /Unknown principle/,
    );
  });

  it("only ever seats a real panelist", () => {
    expect(createCustomQuestion({ ...valid, askedBy: "ceo" }).askedBy).toBe("ceo");
    expect(createCustomQuestion({ ...valid, askedBy: "somebody-else" }).askedBy).toBe("cto");
  });

  it("gives each question a distinct id unless one is supplied", () => {
    expect(createCustomQuestion({ ...valid, id: "fixed" }).id).toBe("fixed");
    expect(createCustomQuestion(valid).id).toMatch(/^custom-/);
  });
});
