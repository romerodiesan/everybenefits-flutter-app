"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label } from "@/components/ui/primitives";
import {
  loadGoogleMapsPlaces,
  mapsPlacesConfigured,
  parsePlaceAddressComponents,
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

type AutocompleteHandle = {
  addListener: (eventName: string, handler: () => void) => { remove: () => void };
  getPlace: () => {
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  };
};

type PlacesStatus = "off" | "loading" | "ready" | "error";

/**
 * US address fields with optional Place Autocomplete on the street line.
 * Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, behaves as plain inputs.
 */
export function UsAddressFields({
  value,
  onChange,
  disabled,
  required,
}: Props) {
  const t = useTranslations();
  const streetRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const [placesStatus, setPlacesStatus] = useState<PlacesStatus>(() =>
    mapsPlacesConfigured() ? "loading" : "off",
  );

  // Attach Autocomplete once per input mount. Do NOT depend on `onChange` —
  // an unstable callback would tear down the widget on every keystroke.
  useEffect(() => {
    if (!mapsPlacesConfigured()) {
      setPlacesStatus("off");
      return;
    }
    const input = streetRef.current;
    if (!input || disabled) return;

    let autocomplete: AutocompleteHandle | null = null;
    let listener: { remove: () => void } | null = null;
    let cancelled = false;
    setPlacesStatus("loading");

    void (async () => {
      const places = await loadGoogleMapsPlaces();
      if (cancelled || !streetRef.current) return;
      if (!places?.Autocomplete) {
        setPlacesStatus("error");
        return;
      }

      autocomplete = new places.Autocomplete(streetRef.current, {
        componentRestrictions: { country: "us" },
        fields: ["address_components", "formatted_address"],
        types: ["address"],
      }) as AutocompleteHandle;

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete?.getPlace();
        const parts = parsePlaceAddressComponents(place?.address_components);
        if (!parts) return;
        onChangeRef.current({
          ...valueRef.current,
          street: parts.street,
          city: parts.city,
          state: parts.state,
          zip: parts.zip,
        });
      });

      setPlacesStatus("ready");
    })();

    return () => {
      cancelled = true;
      listener?.remove();
      autocomplete = null;
    };
  }, [disabled]);

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("addressStreet")}</Label>
        <Input
          ref={streetRef}
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          // Avoid browser autofill covering Google's suggestion list.
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={
            placesStatus === "ready" || placesStatus === "loading"
              ? t("addressStreetAutocompleteHint")
              : undefined
          }
        />
        {placesStatus === "loading" ? (
          <p className="mt-1 text-xs text-muted">{t("addressAutocompleteLoading")}</p>
        ) : null}
        {placesStatus === "error" ? (
          <p className="mt-1 text-xs text-red-400">{t("addressAutocompleteError")}</p>
        ) : null}
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
