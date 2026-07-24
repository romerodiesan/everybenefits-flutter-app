"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { FORUM_TAGS } from "@/lib/types";
import { normalizeForumTags } from "@/lib/roles";

/** Quiet single-tag filter for the feed header. */
export function TagFilterSelect({
  value,
  onChange,
  extraOptions = [],
}: {
  value: string;
  onChange: (tag: string) => void;
  extraOptions?: string[];
}) {
  const t = useTranslations();
  const options = useMemo(() => {
    const seen = new Set<string>(FORUM_TAGS);
    const extras = extraOptions.filter((tag) => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
    return [...FORUM_TAGS, ...extras];
  }, [extraOptions]);

  return (
    <label className="flex min-w-0 flex-1 items-center gap-2">
      <span className="sr-only">{t("createThreadTags")}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full max-w-[14rem] rounded-lg border border-glass-border bg-sheet px-2.5 text-xs font-semibold text-ink outline-none focus:border-brand"
      >
        <option value="">{t("forumsAllTags")}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            #{item}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Multi-select tags with suggestions + create-your-own (max 5). */
export function TagEditor({
  value,
  onChange,
  max = 5,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return FORUM_TAGS.filter(
      (tag) => !value.includes(tag) && (!q || tag.includes(q)),
    );
  }, [draft, value]);

  function addTag(raw: string) {
    const [normalized] = normalizeForumTags([raw]);
    if (!normalized) return;
    if (value.includes(normalized) || value.length >= max) {
      setDraft("");
      setOpen(false);
      return;
    }
    onChange([...value, normalized]);
    setDraft("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const atLimit = value.length >= max;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted">
          {t("createThreadTags")}
        </span>
        <span className="text-[11px] text-muted">
          {value.length}/{max}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => removeTag(tag)}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-brand/14 px-2 text-xs font-semibold text-brand"
            title={t("forumsRemoveTag")}
          >
            #{tag}
            <span aria-hidden className="opacity-70">
              ×
            </span>
          </button>
        ))}
      </div>

      {!atLimit && (
        <div className="relative mt-2">
          <div className="flex gap-1.5">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                // Allow click on suggestion before closing.
                window.setTimeout(() => setOpen(false), 120);
              }}
              onKeyDown={onKeyDown}
              placeholder={t("forumsTagPlaceholder")}
              className="h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs text-ink outline-none placeholder:text-muted focus:border-brand"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => {
                if (draft.trim()) addTag(draft);
              }}
              disabled={!draft.trim()}
              className="h-8 shrink-0 rounded-lg bg-brand/14 px-3 text-xs font-semibold text-brand disabled:opacity-40"
            >
              {t("forumsAddTag")}
            </button>
          </div>

          {open && (suggestions.length > 0 || draft.trim()) && (
            <ul className="pulse-sheet absolute z-20 mt-1 max-h-40 w-full overflow-y-auto py-1 shadow-lg">
              {suggestions.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-brand/[0.08]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addTag(tag)}
                  >
                    #{tag}
                  </button>
                </li>
              ))}
              {draft.trim() &&
                (() => {
                  const created = normalizeForumTags([draft])[0];
                  if (!created) return null;
                  if (value.includes(created)) return null;
                  if (suggestions.includes(created as (typeof FORUM_TAGS)[number]))
                    return null;
                  return (
                    <li>
                      <button
                        type="button"
                        className="block w-full px-3 py-1.5 text-left text-xs font-medium text-brand hover:bg-brand/[0.08]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addTag(draft)}
                      >
                        {t("forumsCreateTag", { tag: created })}
                      </button>
                    </li>
                  );
                })()}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
