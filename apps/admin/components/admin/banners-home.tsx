"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  FORMATS_BY_SURFACE,
  PROMO_BANNER_AUDIENCES,
  PROMO_BANNER_LIMITS,
  PROMO_BANNER_SURFACES,
  PROMO_BANNER_TYPES,
  defaultFormatForSurface,
  formatsForSurface,
  imageTargetForFormat,
  withBannerCompatDefaults,
  type PromoBanner,
  type PromoBannerAudience,
  type PromoBannerFormat,
  type PromoBannerLocale,
  type PromoBannerLocalizedString,
  type PromoBannerSurface,
  type PromoBannerType,
} from "@pulse/shared";
import { useAlerts } from "@/lib/providers/alert-provider";
import { useAccess } from "@/lib/providers/auth-provider";
import { canManagePlatform } from "@/lib/roles";
import { useRouter } from "@/i18n/navigation";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { reshapeBannerImage } from "@/lib/banner-image-reshape";
import { Button, Input, Label } from "@/components/ui/primitives";
import {
  BannerPreview,
  PreviewDeviceFrame,
} from "@/components/admin/banner-preview";

type FormState = {
  id: string;
  active: boolean;
  type: PromoBannerType;
  format: PromoBannerFormat;
  surface: PromoBannerSurface;
  audiences: PromoBannerAudience[];
  dismissible: boolean;
  showCta: boolean;
  showImage: boolean;
  eyebrow: PromoBannerLocalizedString;
  title: PromoBannerLocalizedString;
  body: PromoBannerLocalizedString;
  ctaLabel: PromoBannerLocalizedString;
  href: string;
  imageUrl: string;
  bumpVersion: boolean;
};

const emptyForm = (): FormState => ({
  id: "",
  active: true,
  type: "promo",
  format: "card",
  surface: "home",
  audiences: ["all"],
  dismissible: true,
  showCta: true,
  showImage: true,
  eyebrow: { en: "New", es: "Nuevo" },
  title: { en: "", es: "" },
  body: { en: "", es: "" },
  ctaLabel: { en: "Learn more", es: "Saber más" },
  href: "/academy",
  imageUrl: "",
  bumpVersion: false,
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

/** If one locale is blank, mirror the filled locale so save doesn't 400. */
function fillLocalized(
  value: PromoBannerLocalizedString,
): PromoBannerLocalizedString {
  const en = value.en.trim();
  const es = value.es.trim();
  return {
    en: en || es,
    es: es || en,
  };
}

function functionsErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.trim()
      : "";
  // Firebase Functions client: "FirebaseError: …" or "invalid-argument: …"
  const cleaned = message
    .replace(/^FirebaseError:\s*/i, "")
    .replace(/^functions\/[\w-]+:\s*/i, "")
    .trim();
  return cleaned || fallback;
}

type ImageProcessMeta = {
  width: number;
  height: number;
  aspectLabel: string;
  format: PromoBannerFormat;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-glass-border bg-panel/60 p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-glass-border text-muted hover:border-brand/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-glass-border px-3 py-2.5">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  return (
    <span
      className={`text-[10px] tabular-nums ${
        len > max ? "text-danger" : "text-muted"
      }`}
    >
      {len}/{max}
    </span>
  );
}

export function BannersHome() {
  const t = useTranslations();
  const router = useRouter();
  const alerts = useAlerts();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);

  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSourceFile, setImageSourceFile] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageProcessMeta | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const reshapeTokenRef = useRef(0);
  const [copyLocale, setCopyLocale] = useState<PromoBannerLocale>("en");
  const [previewLocale, setPreviewLocale] = useState<PromoBannerLocale>("en");

  const imageObjectUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  const applyReshape = async (source: File, format: PromoBannerFormat) => {
    if (format === "text") {
      setImageFile(null);
      setImageMeta(null);
      return;
    }
    const token = ++reshapeTokenRef.current;
    setImageProcessing(true);
    setError(null);
    try {
      const result = await reshapeBannerImage(source, format);
      if (token !== reshapeTokenRef.current) return;
      setImageFile(result.file);
      setImageMeta({
        width: result.width,
        height: result.height,
        aspectLabel: result.aspectLabel,
        format: result.format,
      });
    } catch {
      if (token !== reshapeTokenRef.current) return;
      setImageFile(null);
      setImageMeta(null);
      setError(t("bannersImageReshapeError"));
      alerts.error(t("bannersImageReshapeError"));
    } finally {
      if (token === reshapeTokenRef.current) {
        setImageProcessing(false);
      }
    }
  };

  const onPickImage = (file: File | null) => {
    if (!file) {
      reshapeTokenRef.current += 1;
      setImageSourceFile(null);
      setImageFile(null);
      setImageMeta(null);
      setImageProcessing(false);
      return;
    }
    setImageSourceFile(file);
    void applyReshape(file, form.format);
  };

  useEffect(() => {
    if (!isAdmin) router.replace("/");
  }, [isAdmin, router]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getAdminRepository().listPromoBanners();
      setBanners(result.banners);
    } catch {
      setBanners([]);
      alerts.error(t("bannersLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const sorted = useMemo(
    () => [...banners].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [banners],
  );

  const allowedFormats = formatsForSurface(form.surface);

  const previewBanner: PromoBanner = useMemo(
    () =>
      withBannerCompatDefaults({
        id: editingId || form.id || "preview",
        version: 1,
        active: form.active,
        type: form.type,
        format: form.format,
        surface: form.surface,
        audiences: form.audiences,
        dismissible: form.dismissible,
        showCta: form.showCta,
        showImage: form.showImage && form.format !== "text",
        eyebrow: form.eyebrow,
        title: form.title,
        body: form.body,
        ctaLabel: form.ctaLabel,
        href: form.href,
        imageUrl: form.imageUrl || null,
        imagePath: null,
      }),
    [editingId, form],
  );

  if (!isAdmin) return null;

  const setSurface = (surface: PromoBannerSurface) => {
    const nextFormats = FORMATS_BY_SURFACE[surface];
    const prevFormat = form.format;
    const nextFormat = nextFormats.includes(prevFormat)
      ? prevFormat
      : defaultFormatForSurface(surface);
    setForm((prev) => ({
      ...prev,
      surface,
      format: nextFormat,
      showImage: nextFormat === "text" ? false : prev.showImage,
    }));
    if (imageSourceFile && nextFormat !== prevFormat) {
      void applyReshape(imageSourceFile, nextFormat);
    }
  };

  const setFormat = (format: PromoBannerFormat) => {
    setForm((prev) => ({
      ...prev,
      format,
      showImage: format === "text" ? false : prev.showImage,
    }));
    if (imageSourceFile) {
      void applyReshape(imageSourceFile, format);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    reshapeTokenRef.current += 1;
    setImageSourceFile(null);
    setImageFile(null);
    setImageMeta(null);
    setImageProcessing(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setError(null);
  };

  const openEdit = (banner: PromoBanner) => {
    setEditingId(banner.id);
    setForm({
      id: banner.id,
      active: banner.active,
      type: banner.type,
      format: banner.format,
      surface: banner.surface,
      audiences: banner.audiences.length ? banner.audiences : ["all"],
      dismissible: banner.dismissible,
      showCta: banner.showCta,
      showImage: banner.showImage,
      eyebrow: banner.eyebrow,
      title: banner.title,
      body: banner.body,
      ctaLabel: banner.ctaLabel,
      href: banner.href,
      imageUrl: banner.imageUrl ?? "",
      bumpVersion: false,
    });
    reshapeTokenRef.current += 1;
    setImageSourceFile(null);
    setImageFile(null);
    setImageMeta(null);
    setImageProcessing(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setError(null);
  };

  const toggleAudience = (audience: PromoBannerAudience) => {
    setForm((prev) => {
      if (audience === "all") return { ...prev, audiences: ["all"] };
      const withoutAll = prev.audiences.filter((a) => a !== "all");
      const next = withoutAll.includes(audience)
        ? withoutAll.filter((a) => a !== audience)
        : [...withoutAll, audience];
      return { ...prev, audiences: next.length ? next : ["all"] };
    });
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const repo = getAdminRepository();
      const bannerId =
        (editingId ?? form.id.trim().toLowerCase()) ||
        `promo-${Date.now().toString(36)}`;

      const eyebrow = fillLocalized(form.eyebrow);
      const title = fillLocalized(form.title);
      const body = fillLocalized(form.body);
      const ctaLabel = form.showCta
        ? fillLocalized(form.ctaLabel)
        : { en: "", es: "" };

      if (!title.en || !body.en || !eyebrow.en) {
        throw new Error(t("bannersValidationCopy"));
      }
      if (form.showCta) {
        if (!form.href.trim()) throw new Error(t("bannersValidationHref"));
        if (!ctaLabel.en) throw new Error(t("bannersValidationCta"));
      }

      let imageUrl = form.imageUrl.trim() || null;
      let imagePath: string | null = null;
      const wantImage = form.showImage && form.format !== "text";

      if (wantImage && imageFile) {
        const uploaded = await repo.uploadPromoBannerImage({
          bannerId,
          contentType: "image/jpeg",
          bytesBase64: await fileToBase64(imageFile),
        });
        if (!uploaded?.downloadUrl) throw new Error("upload failed");
        imageUrl = uploaded.downloadUrl;
        imagePath = uploaded.path;
      }

      const saved = await repo.upsertPromoBanner({
        id: bannerId,
        active: form.active,
        type: form.type,
        format: form.format,
        surface: form.surface,
        audiences: form.audiences,
        dismissible: form.dismissible,
        showCta: form.showCta,
        showImage: wantImage,
        eyebrow,
        title,
        body,
        ctaLabel,
        href: form.showCta ? form.href.trim() : "",
        ...(wantImage
          ? {
              ...(imageUrl ? { imageUrl } : {}),
              ...(imagePath ? { imagePath } : {}),
            }
          : { imageUrl: null, imagePath: null }),
        bumpVersion: form.bumpVersion,
      });
      if (!saved) throw new Error("save failed");
      alerts.success(t("bannersSaved"));
      setEditingId(saved.id);
      setForm((prev) => ({
        ...prev,
        id: saved.id,
        eyebrow,
        title,
        body,
        ctaLabel: form.showCta ? ctaLabel : prev.ctaLabel,
        imageUrl: saved.imageUrl ?? "",
        format: saved.format,
        type: saved.type,
      }));
      setImageFile(null);
      await load();
    } catch (error) {
      const message = functionsErrorMessage(error, t("bannersSaveError"));
      setError(message);
      alerts.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onDeactivate = async (id: string) => {
    setBusy(true);
    try {
      await getAdminRepository().deletePromoBanner(id, false);
      alerts.success(t("bannersDeactivated"));
      await load();
    } catch {
      alerts.error(t("bannersSaveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            {t("bannersWorkspaceEyebrow")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            {t("bannersTitle")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {t("bannersSubtitle")}
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          {t("bannersCreate")}
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="studio-panel h-fit space-y-2 p-3 xl:sticky xl:top-4">
          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {t("bannersList")}
          </p>
          {loading ? (
            <p className="px-2 py-6 text-sm text-muted">{t("loading")}</p>
          ) : sorted.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted">{t("bannersEmpty")}</p>
          ) : (
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {sorted.map((banner) => (
                <li key={banner.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(banner)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      editingId === banner.id
                        ? "bg-brand/10 ring-1 ring-brand/30"
                        : "hover:bg-rail/80"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-ink">
                      {banner.title.en || banner.id}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {banner.surface} · {banner.format} · {banner.type}
                      {banner.active ? "" : ` · ${t("bannersInactive")}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div className="studio-panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {editingId ? t("bannersEdit") : t("bannersCreate")}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {editingId
                    ? `${t("bannersId")}: ${editingId}`
                    : t("bannersWorkspaceHint")}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  form.active
                    ? "bg-ok/15 text-ok"
                    : "bg-muted/15 text-muted"
                }`}
              >
                {form.active ? t("bannersActive") : t("bannersInactive")}
              </span>
            </div>

            <Section title={t("bannersSectionPlacement")}>
              {!editingId ? (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>{t("bannersId")}</Label>
                  </div>
                  <Input
                    value={form.id}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, id: e.target.value }))
                    }
                    placeholder="spring-academy"
                  />
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t("bannersSurface")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROMO_BANNER_SURFACES.map((surface) => (
                    <Chip
                      key={surface}
                      active={form.surface === surface}
                      onClick={() => setSurface(surface)}
                    >
                      {t(`bannersSurface_${surface}`)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t("bannersFormat")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allowedFormats.map((format) => (
                    <Chip
                      key={format}
                      active={form.format === format}
                      onClick={() => setFormat(format)}
                    >
                      {t(`bannersFormat_${format}`)}
                    </Chip>
                  ))}
                </div>
              </div>
            </Section>

            <Section title={t("bannersSectionIntent")}>
              <div className="flex flex-wrap gap-2">
                {PROMO_BANNER_TYPES.map((type) => (
                  <Chip
                    key={type}
                    active={form.type === type}
                    onClick={() => setForm((prev) => ({ ...prev, type }))}
                  >
                    {t(`bannersType_${type}`)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={t("bannersSectionBehavior")}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  checked={form.active}
                  onChange={(active) =>
                    setForm((prev) => ({ ...prev, active }))
                  }
                  label={t("bannersActive")}
                  hint={t("bannersActiveHint")}
                />
                <Toggle
                  checked={form.dismissible}
                  onChange={(dismissible) =>
                    setForm((prev) => ({ ...prev, dismissible }))
                  }
                  label={t("bannersDismissible")}
                  hint={t("bannersDismissibleHint")}
                />
                <Toggle
                  checked={form.showCta}
                  onChange={(showCta) =>
                    setForm((prev) => ({ ...prev, showCta }))
                  }
                  label={t("bannersShowCta")}
                  hint={t("bannersShowCtaHint")}
                />
                <Toggle
                  checked={form.showImage && form.format !== "text"}
                  onChange={(showImage) =>
                    setForm((prev) => ({ ...prev, showImage }))
                  }
                  label={t("bannersShowImage")}
                  hint={
                    form.format === "text"
                      ? t("bannersShowImageTextHint")
                      : t("bannersShowImageHint")
                  }
                />
              </div>
              {editingId ? (
                <Toggle
                  checked={form.bumpVersion}
                  onChange={(bumpVersion) =>
                    setForm((prev) => ({ ...prev, bumpVersion }))
                  }
                  label={t("bannersBumpVersion")}
                  hint={t("bannersBumpVersionHint")}
                />
              ) : null}
            </Section>

            <Section title={t("bannersSectionCopy")}>
              <div className="flex gap-2">
                {(["en", "es"] as const).map((locale) => (
                  <Chip
                    key={locale}
                    active={copyLocale === locale}
                    onClick={() => setCopyLocale(locale)}
                  >
                    {locale.toUpperCase()}
                  </Chip>
                ))}
              </div>
              {(
                [
                  ["eyebrow", PROMO_BANNER_LIMITS.eyebrow],
                  ["title", PROMO_BANNER_LIMITS.title],
                  ["body", PROMO_BANNER_LIMITS.body],
                ] as const
              ).map(([field, max]) => (
                <div key={field}>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>{t(`bannersField_${field}`)}</Label>
                    <CharCount value={form[field][copyLocale]} max={max} />
                  </div>
                  <Input
                    value={form[field][copyLocale]}
                    maxLength={max}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [field]: {
                          ...prev[field],
                          [copyLocale]: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
              {form.showCta ? (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>{t("bannersField_ctaLabel")}</Label>
                      <CharCount
                        value={form.ctaLabel[copyLocale]}
                        max={PROMO_BANNER_LIMITS.ctaLabel}
                      />
                    </div>
                    <Input
                      value={form.ctaLabel[copyLocale]}
                      maxLength={PROMO_BANNER_LIMITS.ctaLabel}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ctaLabel: {
                            ...prev.ctaLabel,
                            [copyLocale]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("bannersHref")}</Label>
                    <Input
                      value={form.href}
                      maxLength={PROMO_BANNER_LIMITS.href}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, href: e.target.value }))
                      }
                      placeholder="/academy"
                    />
                  </div>
                </>
              ) : null}
            </Section>

            {form.showImage && form.format !== "text" ? (
              <Section title={t("bannersSectionMedia")}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-muted"
                  disabled={imageProcessing || busy}
                  onChange={(e) =>
                    onPickImage(e.target.files?.[0] ?? null)
                  }
                />
                {imageProcessing ? (
                  <p className="text-[11px] text-muted">
                    {t("bannersImageReshaping")}
                  </p>
                ) : null}
                {imageMeta ? (
                  <p className="text-[11px] font-medium text-ink">
                    {t("bannersImageReshaped", {
                      width: imageMeta.width,
                      height: imageMeta.height,
                      aspect: imageMeta.aspectLabel,
                      format: t(`bannersFormat_${imageMeta.format}`),
                    })}
                  </p>
                ) : null}
                {form.imageUrl && !imageFile ? (
                  <p className="truncate text-[11px] text-muted">
                    {form.imageUrl}
                  </p>
                ) : null}
                <p className="text-[11px] text-muted">
                  {(() => {
                    const target = imageTargetForFormat(form.format);
                    return target
                      ? t("bannersImageHintAuto", {
                          width: target.width,
                          height: target.height,
                          aspect: target.label,
                        })
                      : t("bannersImageHint");
                  })()}
                </p>
              </Section>
            ) : null}

            <Section title={t("bannersSectionAudience")}>
              <div className="flex flex-wrap gap-2">
                {PROMO_BANNER_AUDIENCES.map((audience) => (
                  <Chip
                    key={audience}
                    active={form.audiences.includes(audience)}
                    onClick={() => toggleAudience(audience)}
                  >
                    {audience}
                  </Chip>
                ))}
              </div>
            </Section>

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || imageProcessing}
                onClick={() => void onSave()}
              >
                {busy
                  ? t("bannersSaving")
                  : imageProcessing
                    ? t("bannersImageReshaping")
                    : t("bannersSave")}
              </Button>
              {editingId && form.active ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onDeactivate(editingId)}
                >
                  {t("bannersDeactivate")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="studio-panel h-fit space-y-4 p-4 lg:sticky lg:top-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold tracking-tight">
                {t("bannersPreviewTitle")}
              </h2>
              <div className="flex gap-1.5">
                {(["en", "es"] as const).map((locale) => (
                  <Chip
                    key={locale}
                    active={previewLocale === locale}
                    onClick={() => setPreviewLocale(locale)}
                  >
                    {locale.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </div>
            <PreviewDeviceFrame surface={form.surface}>
              <BannerPreview
                banner={previewBanner}
                locale={previewLocale}
                imagePreviewUrl={imageObjectUrl}
              />
            </PreviewDeviceFrame>
            <p className="text-[11px] leading-relaxed text-muted">
              {t("bannersPreviewHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
