import { describe, expect, it } from "vitest";
import { CitationRegistry } from "../citations";
import { classifyScope } from "../policy";
import { PULSE_AI_EVAL_CASES } from "./cases";
import type { PulseSourceType } from "../types";

describe("Pulse AI offline eval suite", () => {
  for (const testCase of PULSE_AI_EVAL_CASES) {
    it(`${testCase.id}: ${testCase.notes}`, () => {
      const verdict = classifyScope(testCase.prompt);
      if (testCase.expect.decision) {
        expect(verdict.decision).toBe(testCase.expect.decision);
      }
      if (typeof testCase.expect.legalAdvice === "boolean") {
        expect(verdict.legalAdvice).toBe(testCase.expect.legalAdvice);
      }
      if (typeof testCase.expect.injection === "boolean") {
        expect(verdict.injection).toBe(testCase.expect.injection);
      }
    });
  }

  it("citation-hallucination: invented refs never resolve", () => {
    const registry = new CitationRegistry("en");
    registry.register({
      id: "1",
      sourceType: "course" as PulseSourceType,
      sourceId: "course-1",
      parentId: null,
      title: "Medicare basics",
      content: "AEP runs Oct 15–Dec 7.",
      tags: ["medicare"],
      language: "en",
      url: "/academy/course-1",
      publisher: null,
      trustWeight: 0.9,
      score: 1,
    });
    const answer =
      "Open enrollment is Oct 15–Dec 7 [S1]. Also see this made-up page [S7].";
    expect(registry.usedIn(answer)).toHaveLength(1);
    expect(registry.invalidRefsIn(answer)).toEqual(["S7"]);
  });

  it("course-recommendation: academy citations keep in-app urls", () => {
    const registry = new CitationRegistry("es");
    const source = registry.register({
      id: "2",
      sourceType: "lesson",
      sourceId: "lesson-9",
      parentId: "course-3",
      title: "Objeciones comunes",
      content: "La objeción lo tengo que pensar…",
      tags: ["ventas"],
      language: "es",
      url: "/academy/course-3/learn?lesson=lesson-9",
      publisher: null,
      trustWeight: 0.85,
      score: 0.9,
    });
    expect(source.url).toBe("/es/academy/course-3/learn?lesson=lesson-9");
    expect(source.type).toBe("lesson");
  });
});
