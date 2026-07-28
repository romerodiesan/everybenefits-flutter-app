"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Lets Pulse AI turn its `[S1]` markers into clickable source chips. */
const CitationContext = createContext<((ref: string) => ReactNode) | null>(null);

const CITATION_SCHEME = "pulse-cite:";

/**
 * GFM Markdown renderer for reading lessons (and Pulse AI answers).
 *
 * Supports GitHub Flavored Markdown: headings, lists, tables, blockquotes,
 * fenced code, strikethrough, autolinks, plus inline bold/italic/code/links.
 * Output is React elements via react-markdown — no raw HTML (`rehype-raw`
 * is not used), so authored content cannot inject markup.
 *
 * Pulse citation markers `[S1]` are rewritten to a private link scheme and
 * resolved through `renderCitation` when provided.
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
  const trimmed = source.trim();
  if (!trimmed) return null;

  const prepared = prepareCitations(trimmed);

  return (
    <CitationContext.Provider value={renderCitation ?? null}>
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={safeUrlTransform}
          components={markdownComponents}
        >
          {prepared}
        </ReactMarkdown>
      </div>
    </CitationContext.Provider>
  );
}

/** Turns `[S1]` into a private markdown link so react-markdown can hand it off. */
function prepareCitations(source: string): string {
  return source.replace(/\[(S\d+)\]/g, "[$1](pulse-cite:$1)");
}

function safeUrlTransform(url: string): string {
  if (url.startsWith(CITATION_SCHEME)) return url;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return "";
}

type MdProps<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T>;

const markdownComponents = {
  h1: ({ children }: MdProps<"h1">) => (
    <h1 className="font-display pt-1 text-2xl font-bold">{children}</h1>
  ),
  h2: ({ children }: MdProps<"h2">) => (
    <h2 className="font-display pt-1 text-xl font-bold">{children}</h2>
  ),
  h3: ({ children }: MdProps<"h3">) => (
    <h3 className="font-display pt-1 text-lg font-bold">{children}</h3>
  ),
  h4: ({ children }: MdProps<"h4">) => (
    <h4 className="font-display pt-1 text-base font-bold">{children}</h4>
  ),
  h5: ({ children }: MdProps<"h5">) => (
    <h5 className="font-display pt-1 text-sm font-bold">{children}</h5>
  ),
  h6: ({ children }: MdProps<"h6">) => (
    <h6 className="font-display pt-1 text-sm font-semibold">{children}</h6>
  ),
  p: ({ children }: MdProps<"p">) => <p>{children}</p>,
  strong: ({ children }: MdProps<"strong">) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: MdProps<"em">) => <em>{children}</em>,
  del: ({ children }: MdProps<"del">) => (
    <del className="text-muted line-through">{children}</del>
  ),
  blockquote: ({ children }: MdProps<"blockquote">) => (
    <blockquote className="border-l-2 border-brand/50 pl-3 text-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-glass-border" />,
  ul: ({ children }: MdProps<"ul">) => (
    <ul className="list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }: MdProps<"ol">) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }: MdProps<"li">) => <li>{children}</li>,
  a: function MarkdownLink({ href, children }: MdProps<"a">) {
    const renderCitation = useContext(CitationContext);
    if (href?.startsWith(CITATION_SCHEME)) {
      const ref = href.slice(CITATION_SCHEME.length);
      if (renderCitation) return <>{renderCitation(ref)}</>;
      return <span>[{ref}]</span>;
    }
    if (!href) return <span>{children}</span>;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  code: function MarkdownCode({
    className,
    children,
    ...props
  }: MdProps<"code">) {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code
          className={`${className ?? ""} block overflow-x-auto rounded-lg bg-ink/[0.06] p-3 font-mono text-[13px] leading-relaxed dark:bg-white/[0.08]`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[13px] dark:bg-white/[0.08]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: MdProps<"pre">) => (
    <pre className="overflow-x-auto rounded-lg">{children}</pre>
  ),
  table: ({ children }: MdProps<"table">) => (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-left text-[13.5px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: MdProps<"thead">) => (
    <thead className="bg-ink/[0.04] dark:bg-white/[0.06]">{children}</thead>
  ),
  tbody: ({ children }: MdProps<"tbody">) => <tbody>{children}</tbody>,
  tr: ({ children }: MdProps<"tr">) => (
    <tr className="border-b border-glass-border">{children}</tr>
  ),
  th: ({ children }: MdProps<"th">) => (
    <th className="whitespace-nowrap border border-glass-border px-2.5 py-1.5 font-semibold text-ink">
      {children}
    </th>
  ),
  td: ({ children }: MdProps<"td">) => (
    <td className="border border-glass-border px-2.5 py-1.5 align-top text-ink">
      {children}
    </td>
  ),
};
