import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  withBannerCompatDefaults,
  type PromoBanner,
  type PromoBannerAudience,
  type PromoBannerFormat,
  type PromoBannerLocalizedString,
  type PromoBannerSurface,
  type PromoBannerType,
} from "@pulse/shared";
import { getFirebaseDb } from "./client";

function localized(value: unknown): PromoBannerLocalizedString {
  if (!value || typeof value !== "object") return { en: "", es: "" };
  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : "",
    es: typeof record.es === "string" ? record.es : "",
  };
}

function millisOrNull(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") return fn.call(value);
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapBanner(
  id: string,
  data: Record<string, unknown>,
): PromoBanner {
  return withBannerCompatDefaults({
    id,
    version: typeof data.version === "number" ? data.version : 1,
    active: data.active === true,
    type: data.type as PromoBannerType | undefined,
    format: data.format as PromoBannerFormat | undefined,
    surface: (data.surface as PromoBannerSurface) ?? "home",
    audiences: Array.isArray(data.audiences)
      ? (data.audiences.map(String) as PromoBannerAudience[])
      : ["all"],
    dismissible: data.dismissible !== false,
    showCta: data.showCta !== false,
    showImage:
      typeof data.showImage === "boolean" ? data.showImage : undefined,
    eyebrow: localized(data.eyebrow),
    title: localized(data.title),
    body: localized(data.body),
    ctaLabel: localized(data.ctaLabel),
    href: typeof data.href === "string" ? data.href : "",
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
    imagePath: typeof data.imagePath === "string" ? data.imagePath : null,
    startsAt: millisOrNull(data.startsAt),
    endsAt: millisOrNull(data.endsAt),
    createdAt: millisOrNull(data.createdAt),
    updatedAt: millisOrNull(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  });
}

/** Watch active promo banners (one query; client filters by surface/audience). */
export function watchActivePromoBanners(
  onChange: (banners: PromoBanner[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "promoBanners"),
    where("active", "==", true),
  );
  return onSnapshot(
    q,
    (snap) => {
      const banners = snap.docs.map((doc) =>
        mapBanner(doc.id, doc.data() as Record<string, unknown>),
      );
      onChange(banners);
    },
    (error) => {
      onError?.(error);
      onChange([]);
    },
  );
}
