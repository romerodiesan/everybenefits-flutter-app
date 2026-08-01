/** Current Pulse product-tour version. Bump to re-show a “what’s new” tour. */
export const PRODUCT_TOUR_VERSION = 2;

const LOCAL_KEY = "pulse_product_tour_v1";

export type ProductTourGateProfile = {
  isAnonymous: boolean;
  profileCompleted: boolean;
  productTourVersion?: number | null;
};

export function shouldShowProductTour(
  profile: ProductTourGateProfile | null | undefined,
  options?: { profileReady?: boolean },
): boolean {
  // While profile is still hydrating, never flash the walkthrough.
  if (options?.profileReady === false) return false;
  if (!profile) return false;
  if (profile.isAnonymous) return false;
  if (!profile.profileCompleted) return false;
  const seen = Number(profile.productTourVersion ?? 0);
  if (seen >= PRODUCT_TOUR_VERSION) return false;
  if (readLocalTourDone()) return false;
  return true;
}

export function readLocalTourDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LOCAL_KEY) === String(PRODUCT_TOUR_VERSION);
  } catch {
    return false;
  }
}

export function markLocalTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, String(PRODUCT_TOUR_VERSION));
  } catch {
    // ignore quota / private mode
  }
}

export function clearLocalTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
}
