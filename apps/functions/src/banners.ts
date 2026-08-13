import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import {
  canManagePlatform,
  defaultFormatForSurface,
  promoBannerUpsertSchema,
  withBannerCompatDefaults,
  type PromoBanner,
  type PromoBannerAudience,
  type PromoBannerFormat,
  type PromoBannerLocalizedString,
  type PromoBannerSurface,
  type PromoBannerType,
} from "@pulse/shared";
import { requireCaller } from "./auth";
import { db, callableOpts, storageBucket } from "./init";
import { loadPermissionsForUid } from "./permissions";

const COLLECTION = "promoBanners";
const BANNER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function millisOrNull(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") return fn.call(value);
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asLocalized(
  value: unknown,
  fallback: PromoBannerLocalizedString = { en: "", es: "" },
): PromoBannerLocalizedString {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : fallback.en,
    es: typeof record.es === "string" ? record.es : fallback.es,
  };
}

function asAudiences(value: unknown): PromoBannerAudience[] {
  if (!Array.isArray(value)) return ["all"];
  return value.map(String).filter(Boolean) as PromoBannerAudience[];
}

export function mapPromoBanner(id: string, data: DocumentData): PromoBanner {
  return withBannerCompatDefaults({
    id,
    version: typeof data.version === "number" ? data.version : 1,
    active: data.active === true,
    type: data.type as PromoBannerType | undefined,
    format: data.format as PromoBannerFormat | undefined,
    surface: (data.surface as PromoBannerSurface) ?? "home",
    audiences: asAudiences(data.audiences),
    dismissible: data.dismissible !== false,
    showCta: data.showCta !== false,
    showImage:
      typeof data.showImage === "boolean" ? data.showImage : undefined,
    eyebrow: asLocalized(data.eyebrow),
    title: asLocalized(data.title),
    body: asLocalized(data.body),
    ctaLabel: asLocalized(data.ctaLabel),
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

async function requireBannerAdmin(
  request: { auth?: { uid: string } },
  operation: string,
): Promise<string> {
  const uid = await requireCaller(request, operation);
  const { permissions } = await loadPermissionsForUid(uid);
  if (!canManagePlatform(permissions)) {
    throw new HttpsError("permission-denied", "Platform admin required.");
  }
  return uid;
}

function slugId(input?: string): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (raw) return raw;
  return `promo-${randomUUID().slice(0, 8)}`;
}

/** Admin list — all banners, including inactive. */
export const listPromoBanners = onCall(callableOpts, async (request) => {
  await requireBannerAdmin(request, "listPromoBanners");
  const snap = await db.collection(COLLECTION).orderBy("updatedAt", "desc").get();
  const banners = snap.docs.map((doc) => mapPromoBanner(doc.id, doc.data()));
  return { banners };
});

/** Create or update a promo banner. */
export const upsertPromoBanner = onCall(callableOpts, async (request) => {
  const uid = await requireBannerAdmin(request, "upsertPromoBanner");
  const parsed = promoBannerUpsertSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) =>
        issue.path.length
          ? `${issue.path.join(".")}: ${issue.message}`
          : issue.message,
      )
      .join("; ");
    throw new HttpsError(
      "invalid-argument",
      detail || "Invalid banner payload.",
    );
  }
  const input = parsed.data;
  if (
    input.startsAt != null &&
    input.endsAt != null &&
    input.endsAt < input.startsAt
  ) {
    throw new HttpsError(
      "invalid-argument",
      "endsAt must be after startsAt.",
    );
  }

  const id = slugId(input.id);
  const ref = db.doc(`${COLLECTION}/${id}`);
  const existing = await ref.get();
  const prevVersion =
    typeof existing.data()?.version === "number"
      ? Number(existing.data()?.version)
      : 1;
  const nextVersion = input.bumpVersion
    ? prevVersion + 1
    : typeof input.version === "number"
      ? input.version
      : prevVersion;

  const active = input.active ?? existing.data()?.active === true;
  const showCta = input.showCta !== false;
  const format =
    input.format ??
    (existing.data()?.format as PromoBannerFormat | undefined) ??
    defaultFormatForSurface(input.surface);
  const showImage =
    format === "text"
      ? false
      : (input.showImage ??
        existing.data()?.showImage ??
        Boolean(input.imageUrl || input.imagePath || existing.data()?.imageUrl));

  const payload: Record<string, unknown> = {
    version: nextVersion,
    active,
    type: input.type ?? existing.data()?.type ?? "promo",
    format,
    surface: input.surface,
    audiences: input.audiences,
    dismissible: input.dismissible !== false,
    showCta,
    showImage,
    eyebrow: input.eyebrow,
    title: input.title,
    body: input.body,
    ctaLabel: showCta
      ? (input.ctaLabel ?? { en: "", es: "" })
      : { en: "", es: "" },
    href: showCta ? (input.href ?? "").trim() : "",
    imageUrl: showImage
      ? (input.imageUrl ?? existing.data()?.imageUrl ?? null)
      : null,
    imagePath: showImage
      ? (input.imagePath ?? existing.data()?.imagePath ?? null)
      : null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };

  if (!existing.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
    await ref.set(payload);
  } else {
    await ref.set(payload, { merge: true });
  }

  // Multiple active banners per surface are allowed — Pulse shows a carousel.

  const fresh = await ref.get();
  return { banner: mapPromoBanner(id, fresh.data() ?? {}) };
});

/** Soft-deactivate or hard-delete a banner. */
export const deletePromoBanner = onCall(callableOpts, async (request) => {
  await requireBannerAdmin(request, "deletePromoBanner");
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required.");
  const hard = request.data?.hard === true;
  const ref = db.doc(`${COLLECTION}/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Banner not found.");
  if (hard) {
    await ref.delete();
    return { ok: true, deleted: true };
  }
  await ref.set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true, deleted: false };
});

/** Upload banner image via Admin SDK (avoids Storage rule Firestore lookups). */
export const uploadPromoBannerImage = onCall(
  { ...callableOpts, memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    await requireBannerAdmin(request, "uploadPromoBannerImage");
    const bannerId = String(request.data?.bannerId ?? "")
      .trim()
      .toLowerCase();
    if (!bannerId || bannerId.length > 64) {
      throw new HttpsError("invalid-argument", "bannerId required.");
    }

    const contentType = String(request.data?.contentType ?? "image/jpeg").trim();
    if (!BANNER_IMAGE_TYPES.has(contentType)) {
      throw new HttpsError(
        "invalid-argument",
        "Image must be JPEG, PNG, or WebP.",
      );
    }

    const base64 = String(request.data?.bytesBase64 ?? "");
    if (!base64 || base64.length > 7_000_000) {
      throw new HttpsError(
        "invalid-argument",
        "Image payload missing or too large.",
      );
    }
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length >= 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image must be under 5MB.");
    }

    const ext =
      contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg";
    const path = `banners/${bannerId}/cover.${ext}`;
    const token = randomUUID();
    const file = storageBucket().file(path);
    await file.save(buffer, {
      resumable: false,
      contentType,
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const bucket = file.bucket.name;
    const encoded = encodeURIComponent(path);
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim();
    const downloadUrl = emulatorHost
      ? `http://${emulatorHost}/v0/b/${bucket}/o/${encoded}?alt=media&token=${token}`
      : `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${token}`;

    const ref = db.doc(`${COLLECTION}/${bannerId}`);
    if ((await ref.get()).exists) {
      await ref.set(
        {
          imageUrl: downloadUrl,
          imagePath: path,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return { downloadUrl, path };
  },
);
