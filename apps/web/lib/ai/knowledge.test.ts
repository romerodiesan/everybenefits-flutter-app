import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  hashContent,
  markdownToPlainText,
  splitIntoChunks,
  tokenize,
} from "./knowledge";
import { isAllowedOfficialUrl, publisherOf } from "./official-sources";

describe("tokenize", () => {
  it("drops stopwords and short tokens", () => {
    expect(tokenize("The Medicare Advantage plan covers the claim")).toEqual(
      expect.arrayContaining(["medicare", "advantage", "plan", "covers", "claim"]),
    );
    expect(tokenize("The Medicare Advantage plan covers the claim")).not.toContain(
      "the",
    );
  });
});

describe("detectLanguage", () => {
  it("prefers Spanish when markers dominate", () => {
    expect(
      detectLanguage("¿Cómo funciona la póliza de seguro de vida en Florida?"),
    ).toBe("es");
    expect(
      detectLanguage("How does a term life insurance policy work in Florida?"),
    ).toBe("en");
  });
});

describe("splitIntoChunks", () => {
  it("keeps short text intact and splits long text with overlap", () => {
    expect(splitIntoChunks("Short passage.")).toEqual(["Short passage."]);
    const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. Detail about coverage.`).join(
      "\n\n",
    );
    const chunks = splitIntoChunks(long, { maxChars: 200, overlapChars: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 200)).toBe(true);
  });
});

describe("hashContent", () => {
  it("is stable and sensitive to content changes", () => {
    expect(hashContent("a", "b")).toBe(hashContent("a", "b"));
    expect(hashContent("a", "b")).not.toBe(hashContent("a", "c"));
  });
});

describe("markdownToPlainText", () => {
  it("strips markup for embeddings", () => {
    expect(markdownToPlainText("## Title\n\nSee [CMS](https://cms.gov).")).toContain(
      "CMS",
    );
    expect(markdownToPlainText("## Title\n\nSee [CMS](https://cms.gov).")).not.toContain(
      "https://",
    );
  });
});

describe("isAllowedOfficialUrl", () => {
  it("allows regulator domains and blocks lookalikes", () => {
    expect(isAllowedOfficialUrl("https://www.cms.gov/medicare")).toBe(true);
    expect(isAllowedOfficialUrl("https://content.naic.org/cipr")).toBe(true);
    expect(isAllowedOfficialUrl("http://www.cms.gov/medicare")).toBe(false);
    expect(isAllowedOfficialUrl("https://cms.gov.evil.com/medicare")).toBe(false);
    expect(isAllowedOfficialUrl("https://translate.google.com/cms.gov")).toBe(false);
  });

  it("extracts a publisher host", () => {
    expect(publisherOf("https://www.medicare.gov/basics")).toBe("medicare.gov");
  });
});
