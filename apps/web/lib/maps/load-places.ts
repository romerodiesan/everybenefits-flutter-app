/**
 * Lazy-load Maps JS + Places for US address autocomplete.
 * Returns null when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset (manual entry only).
 *
 * Important: with `loading=async`, the script `load` event does NOT mean the API
 * is ready — Google requires a `callback` (or the dynamic import bootstrap).
 */

export type UsAddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
};

/** Minimal Maps typings so we don't require @types/google.maps at build time. */
export type AddressComponent = {
  long_name?: string;
  short_name?: string;
  longText?: string;
  shortText?: string;
  types: string[];
};

type PlaceResult = {
  address_components?: AddressComponent[];
  addressComponents?: AddressComponent[];
  formatted_address?: string;
  formattedAddress?: string;
};

type PlacePrediction = {
  placeId?: string;
  place_id?: string;
  text?: { toString?: () => string; text?: string } | string;
  toPlace?: () => { id?: string };
};

type AutocompleteSuggestionApi = {
  fetchAutocompleteSuggestions: (request: {
    input: string;
    includedRegionCodes?: string[];
    language?: string;
  }) => Promise<{
    suggestions?: Array<{ placePrediction?: PlacePrediction | null }>;
  }>;
};

type AutocompleteServiceApi = {
  getPlacePredictions: (
    request: {
      input: string;
      componentRestrictions?: { country: string | string[] };
      types?: string[];
    },
    callback: (
      results: Array<{ place_id?: string; description?: string }> | null,
      status: string,
    ) => void,
  ) => void;
};

type PlacesServiceApi = {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (place: PlaceResult | null, status: string) => void,
  ) => void;
};

type PlaceClass = new (opts: { id: string }) => {
  fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
  addressComponents?: AddressComponent[];
};

export type PlacesLibrary = {
  Autocomplete?: unknown;
  AutocompleteSuggestion?: AutocompleteSuggestionApi;
  AutocompleteService?: new () => AutocompleteServiceApi;
  PlacesService?: new (attrContainer: HTMLElement) => PlacesServiceApi;
  Place?: PlaceClass;
};

type MapsNamespace = {
  importLibrary: (name: string) => Promise<unknown>;
  places?: PlacesLibrary;
};

type GoogleNamespace = {
  maps: MapsNamespace;
};

type GoogleMapsWindow = Window & {
  google?: GoogleNamespace;
  __pulseMapsPlacesPromise?: Promise<PlacesLibrary | null>;
  __pulseInitGoogleMaps?: () => void;
};

function mapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
}

export function mapsPlacesConfigured() {
  return Boolean(mapsApiKey());
}

function placesUsable(places: PlacesLibrary | null | undefined): places is PlacesLibrary {
  return Boolean(
    places?.AutocompleteSuggestion ||
      places?.AutocompleteService ||
      places?.Place ||
      places?.Autocomplete,
  );
}

export async function loadGoogleMapsPlaces(): Promise<PlacesLibrary | null> {
  if (typeof window === "undefined") return null;
  const key = mapsApiKey();
  if (!key) return null;

  const w = window as GoogleMapsWindow;
  if (placesUsable(w.google?.maps?.places)) {
    return w.google!.maps.places!;
  }
  if (w.__pulseMapsPlacesPromise) return w.__pulseMapsPlacesPromise;

  w.__pulseMapsPlacesPromise = new Promise((resolve) => {
    let settled = false;
    const done = (value: PlacesLibrary | null) => {
      if (settled) return;
      settled = true;
      if (!value) w.__pulseMapsPlacesPromise = undefined;
      resolve(value);
    };

    const finish = async () => {
      try {
        const g = (window as GoogleMapsWindow).google;
        if (!g?.maps?.importLibrary) {
          console.error(
            "[pulse] google.maps.importLibrary missing after Maps callback",
          );
          done(null);
          return;
        }
        const places = (await g.maps.importLibrary("places")) as PlacesLibrary;
        if (!placesUsable(places)) {
          console.error("[pulse] Places library loaded without autocomplete APIs");
          done(null);
          return;
        }
        g.maps.places = places;
        done(places);
      } catch (err) {
        console.error("[pulse] Failed to load Google Places", err);
        done(null);
      }
    };

    w.__pulseInitGoogleMaps = () => {
      void finish();
    };

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-pulse-maps]",
    );
    if (existing) {
      if ((window as GoogleMapsWindow).google?.maps?.importLibrary) {
        void finish();
        return;
      }
      const started = Date.now();
      const timer = window.setInterval(() => {
        if ((window as GoogleMapsWindow).google?.maps?.importLibrary) {
          window.clearInterval(timer);
          void finish();
        } else if (Date.now() - started > 15_000) {
          window.clearInterval(timer);
          console.error("[pulse] Timed out waiting for Maps JS");
          done(null);
        }
      }, 50);
      return;
    }

    const script = document.createElement("script");
    script.dataset.pulseMaps = "1";
    script.async = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(key)}` +
      `&v=weekly&loading=async&libraries=places` +
      `&callback=__pulseInitGoogleMaps`;
    script.addEventListener(
      "error",
      () => {
        console.error("[pulse] Maps JS script failed to load");
        done(null);
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return w.__pulseMapsPlacesPromise;
}

let autocompleteService: AutocompleteServiceApi | null = null;
let placesService: PlacesServiceApi | null = null;
let newPlacesBlocked = false;

function getAutocompleteService(
  places: PlacesLibrary,
): AutocompleteServiceApi | null {
  if (!places.AutocompleteService) return null;
  autocompleteService ??= new places.AutocompleteService();
  return autocompleteService;
}

function getPlacesService(places: PlacesLibrary): PlacesServiceApi | null {
  if (!places.PlacesService || typeof document === "undefined") return null;
  if (!placesService) {
    const attr = document.createElement("div");
    attr.setAttribute("aria-hidden", "true");
    attr.style.display = "none";
    document.body.appendChild(attr);
    placesService = new places.PlacesService(attr);
  }
  return placesService;
}

function isPlacesNewBlocked(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return /blocked|PERMISSION_DENIED|API_KEY_SERVICE_DENIED/i.test(text);
}

function predictionLabel(prediction: PlacePrediction): string {
  const text = prediction.text;
  if (typeof text === "string") return text;
  if (text?.text) return text.text;
  if (typeof text?.toString === "function") {
    const value = text.toString();
    if (value && value !== "[object Object]") return value;
  }
  return "";
}

function predictionId(prediction: PlacePrediction): string {
  return (
    prediction.placeId ||
    prediction.place_id ||
    prediction.toPlace?.()?.id ||
    ""
  );
}

/**
 * Prefer the legacy Places AutocompleteService. This project's browser key
 * typically has Places API (legacy) enabled, while Places API (New) —
 * AutocompleteSuggestion / Place.fetchFields — is often blocked.
 */
async function suggestViaLegacy(
  places: PlacesLibrary,
  query: string,
): Promise<AddressSuggestion[] | null> {
  const service = getAutocompleteService(places);
  if (!service) return null;
  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "us" },
        types: ["address"],
      },
      (predictions, status) => {
        if (status === "OK") {
          resolve(
            (predictions ?? [])
              .map((row) =>
                row.place_id && row.description
                  ? { id: row.place_id, label: row.description }
                  : null,
              )
              .filter((row): row is AddressSuggestion => Boolean(row)),
          );
          return;
        }
        if (status === "ZERO_RESULTS") {
          resolve([]);
          return;
        }
        resolve(null);
      },
    );
  });
}

async function suggestViaPlacesNew(
  places: PlacesLibrary,
  query: string,
  language?: string,
): Promise<AddressSuggestion[]> {
  if (newPlacesBlocked || !places.AutocompleteSuggestion) return [];
  try {
    const { suggestions } =
      await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedRegionCodes: ["us"],
        ...(language ? { language } : {}),
      });
    return (suggestions ?? [])
      .map((row) => {
        const pred = row.placePrediction;
        if (!pred) return null;
        const id = predictionId(pred);
        const label = predictionLabel(pred);
        return id && label ? { id, label } : null;
      })
      .filter((row): row is AddressSuggestion => Boolean(row));
  } catch (err) {
    if (isPlacesNewBlocked(err)) {
      newPlacesBlocked = true;
      return [];
    }
    console.error("[pulse] AutocompleteSuggestion failed", err);
    return [];
  }
}

export async function suggestUsAddresses(
  input: string,
  language?: string,
): Promise<AddressSuggestion[]> {
  const query = input.trim();
  if (query.length < 3) return [];
  const places = await loadGoogleMapsPlaces();
  if (!places) return [];

  const legacy = await suggestViaLegacy(places, query);
  if (legacy !== null) return legacy;
  return suggestViaPlacesNew(places, query, language);
}

async function resolveViaLegacy(
  places: PlacesLibrary,
  placeId: string,
): Promise<UsAddressParts | null | undefined> {
  const service = getPlacesService(places);
  if (!service) return undefined;
  const details = await new Promise<PlaceResult | null>((resolve) => {
    service.getDetails(
      { placeId, fields: ["address_components", "formatted_address"] },
      (place, status) => {
        resolve(status === "OK" ? place : null);
      },
    );
  });
  if (!details) return null;
  return parsePlaceAddressComponents(
    details.address_components ?? details.addressComponents,
  );
}

export async function resolveUsPlaceAddress(
  placeId: string,
): Promise<UsAddressParts | null> {
  const places = await loadGoogleMapsPlaces();
  if (!places) return null;

  const legacy = await resolveViaLegacy(places, placeId);
  if (legacy !== undefined) return legacy;

  if (newPlacesBlocked || !places.Place) return null;
  try {
    const place = new places.Place({ id: placeId });
    await place.fetchFields({ fields: ["addressComponents"] });
    return parsePlaceAddressComponents(place.addressComponents);
  } catch (err) {
    if (isPlacesNewBlocked(err)) {
      newPlacesBlocked = true;
      return null;
    }
    console.error("[pulse] Place.fetchFields failed", err);
    return null;
  }
}

function componentLong(component: AddressComponent): string {
  return (
    component.long_name ||
    component.longText ||
    component.short_name ||
    component.shortText ||
    ""
  );
}

function componentShort(component: AddressComponent): string {
  return (
    component.short_name ||
    component.shortText ||
    component.long_name ||
    component.longText ||
    ""
  );
}

export function parsePlaceAddressComponents(
  components: AddressComponent[] | undefined,
): UsAddressParts | null {
  if (!components?.length) return null;

  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";
  let zipSuffix = "";
  let premise = "";

  for (const component of components) {
    const types = component.types ?? [];
    if (types.includes("street_number")) streetNumber = componentLong(component);
    if (types.includes("route")) route = componentShort(component);
    if (types.includes("premise") && !premise) premise = componentLong(component);
    if (types.includes("locality")) city = componentLong(component);
    if (types.includes("postal_town") && !city) city = componentLong(component);
    if (types.includes("sublocality_level_1") && !city) {
      city = componentLong(component);
    }
    if (types.includes("sublocality") && !city) city = componentLong(component);
    if (types.includes("neighborhood") && !city) city = componentLong(component);
    if (types.includes("administrative_area_level_2") && !city) {
      city = componentLong(component);
    }
    if (types.includes("administrative_area_level_1")) {
      state = componentShort(component);
    }
    if (types.includes("postal_code")) zip = componentLong(component);
    if (types.includes("postal_code_suffix")) {
      zipSuffix = componentLong(component);
    }
  }

  const street = [streetNumber, route].filter(Boolean).join(" ").trim() || premise;
  if (!street && !city) return null;

  return {
    street,
    city,
    state: state.toUpperCase().slice(0, 2),
    zip: zipSuffix ? `${zip}-${zipSuffix}` : zip,
  };
}
