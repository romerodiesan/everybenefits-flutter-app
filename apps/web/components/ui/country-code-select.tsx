"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  filterPhoneCountries,
  resolvePhoneCountry,
  type PhoneCountry,
} from "@/lib/phone-countries";
import { AnchoredPopover } from "@/components/ui/anchored-popover";

type ControlSize = "md" | "sm";

const triggerSize: Record<ControlSize, string> = {
  md: "h-10 rounded-xl px-3 text-sm",
  sm: "h-8 rounded-lg px-2.5 text-xs",
};

export function CountryCodeSelect({
  value,
  iso2,
  onChange,
  disabled,
  size = "md",
}: {
  value: string;
  iso2?: string | null;
  onChange: (dialCode: string, nextIso2: string) => void;
  disabled?: boolean;
  size?: ControlSize;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => resolvePhoneCountry({ iso2, dialCode: value }),
    [iso2, value],
  );
  const options = useMemo(
    () => filterPhoneCountries(query, locale),
    [query, locale],
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (country: PhoneCountry) => {
    onChange(country.dialCode, country.iso2);
    close();
  };

  const labelFor = (country: PhoneCountry) =>
    locale.startsWith("es") ? country.nameEs : country.name;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 border border-glass-border bg-sheet text-ink outline-none transition hover:border-brand/40 focus:border-brand disabled:opacity-50 ${triggerSize[size]}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-base leading-none" aria-hidden>
            {selected.flag}
          </span>
          <span className="font-semibold tabular-nums">{selected.dialCode}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnchoredPopover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        id={listId}
        minWidth={288}
        aria-label={t("phoneCountryPickerTitle")}
      >
        <div className="border-b border-glass-border p-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("phoneCountrySearch")}
            className="h-9 w-full rounded-lg border border-glass-border bg-transparent px-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              {t("phoneCountryEmpty")}
            </li>
          ) : (
            options.map((country) => {
              const active = country.iso2 === selected.iso2;
              return (
                <li key={country.iso2}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-brand/12 text-brand"
                        : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                    }`}
                    onClick={() => pick(country)}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {country.flag}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {labelFor(country)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {country.dialCode}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </AnchoredPopover>
    </div>
  );
}
