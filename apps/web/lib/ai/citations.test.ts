import { describe, expect, it } from "vitest";
import {
  CitationRegistry,
  formatChunkForModel,
  inAppPath,
  localizeUrl,
} from "./citations";
import type { PulseSourceType } from "./types";

/** Minimal stand-in so the test never pulls `server-only` retrieval code. */
type TestChunk = {
  id: string;
  sourceType: PulseSourceType;
  sourceId: string;
  parentId: string | null;
  title: string;
  content: string;
  tags: string[];
  language: "en" | "es";
  url: string;
  publisher: string | null;
  trustWeight: number;
  score: number;
};

function chunk(
  partial: Partial<TestChunk> & Pick<TestChunk, "sourceType" | "sourceId">,
): TestChunk {
  return {
    id: `${partial.sourceType}:${partial.sourceId}`,
    parentId: null,
    title: "Sample",
    content: "Sample content about Medicare Part B.",
    tags: [],
    language: "en",
    url: "/academy/course-1",
    publisher: null,
    trustWeight: 0.8,
    score: 1,
    ...partial,
  };
}

describe("inAppPath", () => {
  it("builds destinations from typed ids", () => {
    expect(inAppPath("accepted_forum_answer", "t1", null)).toBe("/home/t1");
    expect(inAppPath("course", "c1", null)).toBe("/academy/c1");
    expect(inAppPath("path", "p1", null)).toBe("/academy/paths/p1");
    expect(inAppPath("lesson", "l1", "c1")).toBe(
      "/academy/c1/learn?lesson=l1",
    );
  });
});

describe("localizeUrl", () => {
  it("prefixes relative paths and leaves absolute URLs alone", () => {
    expect(localizeUrl("/academy/c1", "es")).toBe("/es/academy/c1");
    expect(localizeUrl("https://www.cms.gov/medicare", "es")).toBe(
      "https://www.cms.gov/medicare",
    );
  });
});

describe("CitationRegistry", () => {
  it("issues stable refs and ignores inventados", () => {
    const registry = new CitationRegistry("en");
    const first = registry.register(
      chunk({ sourceType: "course", sourceId: "c1", title: "Medicare 101" }),
    );
    const again = registry.register(
      chunk({ sourceType: "course", sourceId: "c1", title: "Medicare 101" }),
    );
    expect(first.ref).toBe("S1");
    expect(again.ref).toBe("S1");

    const second = registry.register(
      chunk({
        sourceType: "accepted_forum_answer",
        sourceId: "t9",
        title: "AEP tip",
        url: "/home/t9",
      }),
    );
    expect(second.ref).toBe("S2");

    const answer = "Use AEP windows carefully [S2]. Ignore [S99].";
    expect(registry.usedIn(answer).map((source) => source.ref)).toEqual(["S2"]);
    expect(registry.invalidRefsIn(answer)).toEqual(["S99"]);
  });

  it("never lets the model invent titles or urls", () => {
    const registry = new CitationRegistry("en");
    const source = registry.register(
      chunk({
        sourceType: "official",
        sourceId: "cms-medicare",
        title: "Medicare & You",
        url: "https://www.medicare.gov",
        publisher: "medicare.gov",
        content: "Part B covers outpatient care.",
      }),
    );
    const forModel = formatChunkForModel(
      source,
      chunk({
        sourceType: "official",
        sourceId: "cms-medicare",
        content: "Part B covers outpatient care. ".repeat(200),
      }),
      40,
    );
    expect(forModel.ref).toBe("S1");
    expect(forModel.title).toBe("Medicare & You");
    expect(forModel.content.length).toBeLessThanOrEqual(40);
  });
});
