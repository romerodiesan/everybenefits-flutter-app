"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { canAuthorCourses } from "@/lib/roles";
import { headlineName, listDirectory } from "@/lib/firebase/users";
import type { UserProfile } from "@/lib/types";

export type InstructorOption = {
  uid: string;
  label: string;
};

type Props = {
  value: string[];
  onChange: (ids: string[], teacherName: string) => void;
  disabled?: boolean;
};

export function InstructorMultiSelect({ value, onChange, disabled }: Props) {
  const t = useTranslations();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDirectory(undefined, 120)
      .then((profiles) => {
        if (cancelled) return;
        setCandidates(
          profiles.filter((profile) => canAuthorCourses(profile.role)),
        );
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const byId = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const profile of candidates) map.set(profile.uid, profile);
    return map;
  }, [candidates]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((profile) => {
      const label = headlineName(profile).toLowerCase();
      const email = (profile.email ?? "").toLowerCase();
      return label.includes(needle) || email.includes(needle);
    });
  }, [candidates, query]);

  const selectedLabels = useMemo(
    () =>
      value.map((uid) => {
        const profile = byId.get(uid);
        return profile ? headlineName(profile) : uid;
      }),
    [value, byId],
  );

  const summary =
    selectedLabels.length === 0
      ? t("instructorSelectPlaceholder")
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : t("instructorSelectCount", { count: selectedLabels.length });

  const emit = (next: string[]) => {
    const names = next.map((id) => {
      const profile = byId.get(id);
      return profile ? headlineName(profile) : id;
    });
    onChange(next, names.join(", "));
  };

  const toggle = (uid: string) => {
    if (disabled) return;
    emit(
      value.includes(uid)
        ? value.filter((id) => id !== uid)
        : [...value, uid],
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-glass-border bg-sheet px-3 text-left text-sm text-ink outline-none transition hover:border-brand/40 focus:border-brand disabled:opacity-50"
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedLabels.length === 0 ? "text-muted" : ""
          }`}
        >
          {loading ? t("instructorLoading") : summary}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((uid, index) => (
            <button
              key={uid}
              type="button"
              disabled={disabled}
              onClick={() => emit(value.filter((id) => id !== uid))}
              className="inline-flex items-center gap-1 rounded-lg border border-glass-border bg-sheet px-2 py-1 text-xs text-ink hover:border-danger/50 disabled:opacity-50"
              title={t("actionRemoveInstructor")}
            >
              <span className="max-w-[10rem] truncate">
                {selectedLabels[index]}
              </span>
              <span className="text-muted">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          aria-label={t("fieldTeacher")}
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-glass-border bg-sheet shadow-lg"
        >
          <div className="border-b border-glass-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("instructorSearch")}
              className="h-9 w-full rounded-lg border border-glass-border bg-transparent px-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">
                {t("instructorEmpty")}
              </li>
            ) : (
              filtered.map((profile) => {
                const checked = value.includes(profile.uid);
                return (
                  <li key={profile.uid}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                        checked
                          ? "bg-brand/12 text-brand"
                          : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                      onClick={() => toggle(profile.uid)}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          checked
                            ? "border-brand bg-brand text-on-brand"
                            : "border-glass-border text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {headlineName(profile)}
                      </span>
                      {profile.email ? (
                        <span className="max-w-[9rem] shrink-0 truncate text-[11px] text-muted">
                          {profile.email}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Resolve display names for known instructor uids (for lesson selects). */
export function instructorLabel(
  uid: string,
  profiles: InstructorOption[],
): string {
  return profiles.find((p) => p.uid === uid)?.label ?? uid;
}
