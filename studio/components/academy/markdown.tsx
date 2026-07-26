"use client";

import { createContext, Fragment, useContext, type ReactNode } from "react";

/** Lets Pulse AI turn its `[S1]` markers into clickable source chips. */
const CitationContext = createContext<((ref: string) => ReactNode) | null>(null);

/**
 * Minimal Markdown renderer for reading lessons.
 *
 * Supports the subset the Studio documents: `#`–`###` headings, `-`/`*` and
 * `1.` lists, `>` quotes, `---` rules, plus inline `**bold**`, `*italic*`,
 * `` `code` `` and `[text](url)`. Output is React elements, never raw HTML, so
 * authored content cannot inject markup.
 */
export function Markdown({
  source,
  className = "space-y-3 text-[15px] leading-relaxed text-ink",
  renderCitation,
}: {
  source: string;
  className?: string;
  /** Called for each `[S1]`-style marker; return null to drop it. */
  renderCitation?: (ref: string) => ReactNode;
}) {
  const blocks = parseBlocks(source);
  if (blocks.length === 0) return null;

  return (
    <CitationContext.Provider value={renderCitation ?? null}>
      <div className={className}>
        {blocks.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </div>
    </CitationContext.Provider>
  );
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "rule" }
  | { kind: "list"; ordered: boolean; items: string[] };

function Block({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      const size =
        block.level === 1
          ? "text-2xl"
          : block.level === 2
            ? "text-xl"
            : "text-lg";
      return (
        <p className={`font-display font-bold ${size} pt-1`}>
          <Inline text={block.text} />
        </p>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-2 border-brand/50 pl-3 text-muted">
          <Inline text={block.text} />
        </blockquote>
      );
    case "rule":
      return <hr className="border-glass-border" />;
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-5">
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline text={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
  }
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushAll();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushAll();
      blocks.push({ kind: "rule" });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushAll();
      blocks.push({ kind: "quote", text: quote[1] });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}

/** Splits a line into bold / italic / code / link / citation spans. */
function Inline({ text }: { text: string }) {
  const renderCitation = useContext(CitationContext);
  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\[S\d+\])/g;
  const parts = text.split(pattern).filter((part) => part !== "");

  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part.slice(0, 8)}`;

        const citation = /^\[(S\d+)\]$/.exec(part);
        if (citation && renderCitation) {
          return <Fragment key={key}>{renderCitation(citation[1])}</Fragment>;
        }

        if (
          (part.startsWith("**") && part.endsWith("**")) ||
          (part.startsWith("__") && part.endsWith("__"))
        ) {
          return (
            <strong key={key} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (
          part.length > 2 &&
          ((part.startsWith("*") && part.endsWith("*")) ||
            (part.startsWith("_") && part.endsWith("_")))
        ) {
          return <em key={key}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={key}
              className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[13px] dark:bg-white/[0.08]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link && /^(https?:|mailto:)/i.test(link[2])) {
          return (
            <a
              key={key}
              href={link[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand underline underline-offset-2"
            >
              {link[1]}
            </a>
          );
        }

        return <Fragment key={key}>{part as ReactNode}</Fragment>;
      })}
    </>
  );
}
