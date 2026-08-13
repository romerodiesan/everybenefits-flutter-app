/** localStorage key for dismissed promo banner id → version map. */
const DISMISS_KEY = "pulse_promo_dismiss_v1";

type DismissMap = Record<string, number>;

function readMap(): DismissMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: DismissMap = {};
    for (const [id, version] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof version === "number" && Number.isFinite(version)) {
        out[id] = version;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: DismissMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

/** True when the user dismissed this banner id at the same or higher version. */
export function isPromoBannerDismissed(
  bannerId: string,
  version: number,
): boolean {
  const seen = readMap()[bannerId];
  if (seen == null) return false;
  return seen >= version;
}

/**
 * Persist dismiss for `{bannerId, version}`.
 * Admin bumpVersion re-shows the banner to clients with a lower stored version.
 */
export function dismissPromoBanner(bannerId: string, version: number) {
  const map = readMap();
  map[bannerId] = version;
  writeMap(map);
}
