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

/** Minimal Maps typings so we don't require @types/google.maps at build time. */
type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type PlaceResult = {
  address_components?: AddressComponent[];
  formatted_address?: string;
};

type MapsEventListener = { remove: () => void };

type PlacesAutocomplete = {
  addListener: (
    eventName: string,
    handler: () => void,
  ) => MapsEventListener;
  getPlace: () => PlaceResult;
};

export type PlacesLibrary = {
  Autocomplete: new (
    inputField: HTMLInputElement,
    opts?: {
      componentRestrictions?: { country: string | string[] };
      fields?: string[];
      types?: string[];
    },
  ) => PlacesAutocomplete;
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

export async function loadGoogleMapsPlaces(): Promise<PlacesLibrary | null> {
  if (typeof window === "undefined") return null;
  const key = mapsApiKey();
  if (!key) return null;

  const w = window as GoogleMapsWindow;
  if (w.google?.maps?.places?.Autocomplete) {
    return w.google.maps.places;
  }
  if (w.__pulseMapsPlacesPromise) return w.__pulseMapsPlacesPromise;

  w.__pulseMapsPlacesPromise = new Promise((resolve) => {
    const finish = async () => {
      try {
        const g = (window as GoogleMapsWindow).google;
        if (!g?.maps?.importLibrary) {
          console.error(
            "[pulse] google.maps.importLibrary missing after Maps callback",
          );
          w.__pulseMapsPlacesPromise = undefined;
          resolve(null);
          return;
        }
        const places = (await g.maps.importLibrary(
          "places",
        )) as PlacesLibrary;
        if (!places?.Autocomplete) {
          console.error("[pulse] Places library loaded without Autocomplete");
          w.__pulseMapsPlacesPromise = undefined;
          resolve(null);
          return;
        }
        g.maps.places = places;
        resolve(places);
      } catch (err) {
        console.error("[pulse] Failed to load Google Places", err);
        w.__pulseMapsPlacesPromise = undefined;
        resolve(null);
      }
    };

    // Prefer Google's required callback when using loading=async.
    w.__pulseInitGoogleMaps = () => {
      void finish();
    };

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-pulse-maps]",
    );
    if (existing) {
      if ((window as GoogleMapsWindow).google?.maps?.importLibrary) {
        void finish();
      }
      // Otherwise wait for the global callback already wired on the script URL.
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
        w.__pulseMapsPlacesPromise = undefined;
        resolve(null);
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return w.__pulseMapsPlacesPromise;
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

  for (const component of components) {
    const types = component.types ?? [];
    if (types.includes("street_number")) streetNumber = component.long_name;
    if (types.includes("route")) {
      route = component.short_name || component.long_name;
    }
    if (types.includes("locality")) city = component.long_name;
    if (types.includes("postal_town") && !city) city = component.long_name;
    if (types.includes("sublocality_level_1") && !city) {
      city = component.long_name;
    }
    if (types.includes("administrative_area_level_1")) {
      state = component.short_name;
    }
    if (types.includes("postal_code")) zip = component.long_name;
    if (types.includes("postal_code_suffix")) zipSuffix = component.long_name;
  }

  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  if (!street || !city || !state || !zip) return null;

  return {
    street,
    city,
    state: state.toUpperCase().slice(0, 2),
    zip: zipSuffix ? `${zip}-${zipSuffix}` : zip,
  };
}
