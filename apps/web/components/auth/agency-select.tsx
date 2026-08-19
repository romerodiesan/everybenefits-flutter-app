"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/primitives";
import { AnchoredPopover } from "@/components/ui/anchored-popover";
import {
  AGENCY_OWN_ID,
  AGENCY_OWN_VALUE,
  AGENCY_SOLO_ID,
  AGENCY_SOLO_VALUE,
  listAgenciesForProfile,
  type AgencyOption,
} from "@/lib/firebase/agencies";

export type AgencySelectValue = {
  /** Resolved string stored on `users.agency`. */
  agency: string;
  /** Selected org node id when chosen from the directory; otherwise null. */
  orgNodeId: string | null;
};

type ControlSize = "md" | "sm";

const triggerSize: Record<ControlSize, string> = {
  md: "h-10 rounded-xl px-3.5 text-sm",
  sm: "h-8 rounded-lg px-2.5 text-xs",
};

type Props = {
  value: string;
  onChange: (next: AgencySelectValue) => void;
  disabled?: boolean;
  required?: boolean;
  size?: ControlSize;
};

function resolveSelectedId(agency: string, agencies: AgencyOption[]): string {
  const trimmed = agency.trim();
  if (!trimmed) return "";
  if (trimmed === AGENCY_SOLO_VALUE) return AGENCY_SOLO_ID;
  if (trimmed === AGENCY_OWN_VALUE) return AGENCY_OWN_ID;
  const match = agencies.find(
    (row) => row.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.id ?? "";
}

/**
 * Searchable agency picker: org directory + "I run solo" + "I have my own agency".
 * One control only — no secondary text field.
 */
export function AgencySelect({
  value,
  onChange,
  disabled,
  required,
  size = "md",
}: Props) {
  const t = useTranslations();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const rows = await listAgenciesForProfile();
        if (cancelled) return;
        setAgencies(rows);
        setSelectedId(resolveSelectedId(value, rows));
      } catch {
        if (!cancelled) {
          setAgencies([]);
          setSelectedId(resolveSelectedId(value, []));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount — parent `value` is seeded from profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount hydrate only
  }, []);

  // Re-sync when parent value changes while the picker is closed.
  useEffect(() => {
    if (open) return;
    setSelectedId(resolveSelectedId(value, agencies));
  }, [value, agencies, open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agencies;
    return agencies.filter((row) => row.name.toLowerCase().includes(q));
  }, [agencies, query]);

  const labelForSelected = () => {
    if (selectedId === AGENCY_SOLO_ID) return t("agencySolo");
    if (selectedId === AGENCY_OWN_ID) return t("agencyOwn");
    const match = agencies.find((row) => row.id === selectedId);
    if (match) return match.name;
    if (loading) return t("loading");
    return t("agencySelectPlaceholder");
  };

  const pick = (id: string) => {
    setSelectedId(id);
    close();
    if (id === AGENCY_SOLO_ID) {
      onChange({ agency: AGENCY_SOLO_VALUE, orgNodeId: null });
      return;
    }
    if (id === AGENCY_OWN_ID) {
      onChange({ agency: AGENCY_OWN_VALUE, orgNodeId: null });
      return;
    }
    const match = agencies.find((row) => row.id === id);
    onChange({
      agency: match?.name ?? "",
      orgNodeId: match?.id ?? null,
    });
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 border border-glass-border bg-sheet text-ink outline-none transition hover:border-brand/40 focus:border-brand disabled:opacity-50 ${triggerSize[size]}`}
      >
        <span
          className={`min-w-0 truncate text-left ${
            selectedId ? "text-ink" : "text-muted"
          }`}
        >
          {labelForSelected()}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      <AnchoredPopover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        id={listId}
      >
        <div className="border-b border-glass-border p-2">
          <Input
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("agencySearchPlaceholder")}
            autoFocus
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              {t("agencySearchEmpty")}
            </li>
          ) : (
            filtered.map((row) => {
              const active = row.id === selectedId;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`flex w-full px-3 py-2 text-left text-sm transition hover:bg-brand/10 ${
                      active ? "bg-brand/14 font-semibold text-brand" : ""
                    }`}
                    onClick={() => pick(row.id)}
                  >
                    {row.name}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t border-glass-border py-1">
          <button
            type="button"
            role="option"
            aria-selected={selectedId === AGENCY_SOLO_ID}
            className={`flex w-full px-3 py-2 text-left text-sm transition hover:bg-brand/10 ${
              selectedId === AGENCY_SOLO_ID
                ? "bg-brand/14 font-semibold text-brand"
                : ""
            }`}
            onClick={() => pick(AGENCY_SOLO_ID)}
          >
            {t("agencySolo")}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={selectedId === AGENCY_OWN_ID}
            className={`flex w-full px-3 py-2 text-left text-sm transition hover:bg-brand/10 ${
              selectedId === AGENCY_OWN_ID
                ? "bg-brand/14 font-semibold text-brand"
                : ""
            }`}
            onClick={() => pick(AGENCY_OWN_ID)}
          >
            {t("agencyOwn")}
          </button>
        </div>
      </AnchoredPopover>
    </div>
  );
}
