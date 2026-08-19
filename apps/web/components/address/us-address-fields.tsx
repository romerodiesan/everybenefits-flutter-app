"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input, Label } from "@/components/ui/primitives";
import { AnchoredPopover } from "@/components/ui/anchored-popover";
import {
  mapsPlacesConfigured,
  resolveUsPlaceAddress,
  suggestUsAddresses,
  type AddressSuggestion,
} from "@/lib/maps/load-places";

export type UsAddressValue = {
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
};

type Props = {
  value: UsAddressValue;
  onChange: (next: UsAddressValue) => void;
  disabled?: boolean;
  required?: boolean;
};

type PlacesStatus = "off" | "ready" | "error";

/**
 * US address fields with optional Place Autocomplete on the street line.
 * Suggestions render in a body portal (not Google's clipped pac-container).
 * Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, behaves as plain inputs.
 */
export function UsAddressFields({
  value,
  onChange,
  disabled,
  required,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const listId = useId();
  const streetInputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const [placesStatus, setPlacesStatus] = useState<PlacesStatus>(() =>
    mapsPlacesConfigured() ? "ready" : "off",
  );
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapsPlacesConfigured() || disabled) {
      setPlacesStatus(mapsPlacesConfigured() ? "ready" : "off");
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const query = value.street.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await suggestUsAddresses(query, locale);
          if (cancelled) return;
          setPlacesStatus("ready");
          setSuggestions(rows);
          setOpen(rows.length > 0 && document.activeElement === streetInputRef.current);
        } catch {
          if (!cancelled) {
            setPlacesStatus("error");
            setSuggestions([]);
            setOpen(false);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value.street, disabled, locale]);

  async function pick(suggestion: AddressSuggestion) {
    setOpen(false);
    setSuggestions([]);
    const parts = await resolveUsPlaceAddress(suggestion.id);
    if (!parts) {
      onChangeRef.current({ ...valueRef.current, street: suggestion.label });
      return;
    }
    onChangeRef.current({
      ...valueRef.current,
      street: parts.street || suggestion.label,
      city: parts.city || valueRef.current.city,
      state: parts.state || valueRef.current.state,
      zip: parts.zip || valueRef.current.zip,
    });
  }

  const showHint = placesStatus === "ready" || loading;

  return (
    <div className="space-y-3">
      <div>
        <Label>{t("addressStreet")}</Label>
        <Input
          ref={streetInputRef}
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          autoComplete="off"
          disabled={disabled}
          required={required}
          aria-autocomplete={placesStatus === "ready" ? "list" : undefined}
          aria-controls={listId}
          aria-expanded={open}
          placeholder={
            showHint ? t("addressStreetAutocompleteHint") : undefined
          }
        />
        {loading ? (
          <p className="mt-1 text-xs text-muted">{t("addressAutocompleteLoading")}</p>
        ) : null}
        {placesStatus === "error" ? (
          <p className="mt-1 text-xs text-red-400">{t("addressAutocompleteError")}</p>
        ) : placesStatus === "ready" && !loading ? (
          <p className="mt-1 text-xs text-muted">{t("addressAutocompleteHint")}</p>
        ) : null}
        <AnchoredPopover
          open={open && suggestions.length > 0}
          onClose={() => setOpen(false)}
          anchorRef={streetInputRef}
          id={listId}
        >
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {suggestions.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full px-3 py-2 text-left text-sm text-ink transition hover:bg-brand/10"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void pick(row)}
                >
                  {row.label}
                </button>
              </li>
            ))}
          </ul>
        </AnchoredPopover>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("addressApt")}</Label>
          <Input
            value={value.apt}
            onChange={(e) => onChange({ ...value, apt: e.target.value })}
            autoComplete="address-line2"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>{t("addressCity")}</Label>
          <Input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            autoComplete="address-level2"
            disabled={disabled}
            required={required}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("addressState")}</Label>
          <Input
            value={value.state}
            onChange={(e) =>
              onChange({
                ...value,
                state: e.target.value.toUpperCase().slice(0, 2),
              })
            }
            autoComplete="address-level1"
            maxLength={2}
            disabled={disabled}
            required={required}
          />
        </div>
        <div>
          <Label>{t("addressZip")}</Label>
          <Input
            value={value.zip}
            onChange={(e) => onChange({ ...value, zip: e.target.value })}
            autoComplete="postal-code"
            disabled={disabled}
            required={required}
          />
        </div>
      </div>
    </div>
  );
}
