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
import { can, canManagePlatform } from "@/lib/roles";
import { useRouter } from "@/i18n/navigation";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { reshapeBannerImage } from "@/lib/banner-image-reshape";
import {
  datetimeLocalToMillis,
  fillLocalized,
  functionsErrorMessage,
  mergeCampaignItem,
  millisToDatetimeLocal,
} from "@/lib/campaign-form";
import { Button, Input, Label } from "@/components/ui/primitives";
import {
  BannerPreview,
  PreviewDeviceFrame,
} from "@/components/admin/banner-preview";
import {
  CampaignFilterBar,
  CampaignLibraryItem,
  CampaignWorkspace,
} from "@/components/admin/campaign-workspace";

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
  startsAt: number | null;
  endsAt: number | null;
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
  startsAt: null,
  endsAt: null,
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
  const canRead =
    can(access, "admin.banners.read") || canManagePlatform(access);
  const canWrite =
    can(access, "admin.banners.write") || canManagePlatform(access);

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
  const [canvasTab, setCanvasTab] = useState<"compose" | "preview">("compose");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "draft">(
    "all",
  );

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
    if (!canRead) router.replace("/");
  }, [canRead, router]);

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
    if (!canRead) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const sorted = useMemo(
    () => [...banners].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [banners],
  );
  const visibleBanners = useMemo(
    () =>
      sorted.filter((banner) =>
        statusFilter === "all"
          ? true
          : statusFilter === "live"
            ? banner.active
            : !banner.active,
      ),
    [sorted, statusFilter],
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

  if (!canRead) return null;

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
      startsAt: banner.startsAt,
      endsAt: banner.endsAt,
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
    if (!canWrite) return;
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
        startsAt: form.startsAt,
        endsAt: form.endsAt,
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
      setBanners((prev) => mergeCampaignItem(prev, saved));
    } catch (error) {
      const message = functionsErrorMessage(error, t("bannersSaveError"));
      setError(message);
      alerts.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onDeactivate = async (id: string) => {
    if (!canWrite) return;
    setBusy(true);
    try {
      await getAdminRepository().deletePromoBanner(id, false);
      alerts.success(t("bannersDeactivated"));
      setBanners((prev) =>
        prev.map((banner) =>
          banner.id === id ? { ...banner, active: false } : banner,
        ),
      );
      if (editingId === id) setForm((prev) => ({ ...prev, active: false }));
    } catch {
      alerts.error(t("bannersSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const composeFields = (
            <div className="space-y-4">
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
                    disabled={!canWrite}
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
                      disabled={!canWrite}
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
                      disabled={!canWrite}
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
                  disabled={imageProcessing || busy || !canWrite}
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
            </div>
  );

  return (
    <CampaignWorkspace
      eyebrow={t("bannersWorkspaceEyebrow")}
      title={t("bannersTitle")}
      subtitle={t("bannersSubtitle")}
      createLabel={t("bannersCreate")}
      onCreate={openCreate}
      createDisabled={!canWrite}
      error={error}
      library={
        <>
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t("bannersList")}
            </p>
            <span className="text-[10px] tabular-nums text-muted">
              {visibleBanners.length}
            </span>
          </div>
          <CampaignFilterBar
            value={statusFilter}
            onChange={setStatusFilter}
            labels={{
              all: t("campaignFilter_all"),
              live: t("campaignFilter_live"),
              draft: t("campaignFilter_draft"),
            }}
          />
          <div className="mt-3">
            {loading ? (
              <div className="space-y-2 py-1" aria-label={t("loading")}>
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-rail" />
                ))}
              </div>
            ) : visibleBanners.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted">{t("bannersEmpty")}</p>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                {visibleBanners.map((banner) => (
                  <li key={banner.id}>
                    <CampaignLibraryItem
                      title={banner.title.en || banner.id}
                      meta={`${banner.surface} · ${banner.format}`}
                      active={banner.active}
                      selected={editingId === banner.id}
                      onClick={() => openEdit(banner)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      }
      canvasTabs={[
        { id: "compose", label: t("campaignTabCompose") },
        { id: "preview", label: t("campaignTabPreview") },
      ]}
      canvasTab={canvasTab}
      onCanvasTabChange={(id) => setCanvasTab(id as "compose" | "preview")}
      canvas={
        canvasTab === "preview" ? (
          <div className="space-y-4">
            <PreviewDeviceFrame surface={form.surface}>
              <BannerPreview
                banner={previewBanner}
                locale={copyLocale}
                imagePreviewUrl={imageObjectUrl}
              />
            </PreviewDeviceFrame>
            <p className="text-[11px] leading-relaxed text-muted">
              {t("bannersPreviewHint")}
            </p>
          </div>
        ) : (
          composeFields
        )
      }
      inspector={
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {editingId ? t("bannersEdit") : t("bannersCreate")}
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {editingId || t("campaignUnsaved")}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                form.active ? "bg-ok/15 text-ok" : "bg-muted/15 text-muted"
              }`}
            >
              {form.active ? t("bannersActive") : t("bannersInactive")}
            </span>
          </div>

            <Section title={t("bannersSectionPlacement")}>
              {!editingId ? (
                <div>
                  <Label>{t("bannersId")}</Label>
                  <Input
                    value={form.id}
                    disabled={!canWrite}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, id: e.target.value }))
                    }
                    placeholder="spring-academy"
                  />
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {t("bannersSurface")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROMO_BANNER_SURFACES.map((surface) => (
                    <Chip
                      key={surface}
                      active={form.surface === surface}
                      onClick={() => canWrite && setSurface(surface)}
                    >
                      {t(`bannersSurface_${surface}`)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {t("bannersFormat")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allowedFormats.map((format) => (
                    <Chip
                      key={format}
                      active={form.format === format}
                      onClick={() => canWrite && setFormat(format)}
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
                    onClick={() =>
                      canWrite && setForm((prev) => ({ ...prev, type }))
                    }
                  >
                    {t(`bannersType_${type}`)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={t("bannersSectionBehavior")}>
              <div className="grid gap-2">
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

            <Section title={t("campaignSchedule")}>
              <label className="block text-xs">
                {t("campaignStartsAt")}
                <Input
                  type="datetime-local"
                  className="mt-1"
                  disabled={!canWrite}
                  value={millisToDatetimeLocal(form.startsAt)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      startsAt: datetimeLocalToMillis(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs">
                {t("campaignEndsAt")}
                <Input
                  type="datetime-local"
                  className="mt-1"
                  disabled={!canWrite}
                  value={millisToDatetimeLocal(form.endsAt)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      endsAt: datetimeLocalToMillis(event.target.value),
                    }))
                  }
                />
              </label>
            </Section>

            <Section title={t("bannersSectionAudience")}>
              <div className="flex flex-wrap gap-2">
                {PROMO_BANNER_AUDIENCES.map((audience) => (
                  <Chip
                    key={audience}
                    active={form.audiences.includes(audience)}
                    onClick={() => canWrite && toggleAudience(audience)}
                  >
                    {audience}
                  </Chip>
                ))}
              </div>
            </Section>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || imageProcessing || !canWrite}
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
                  disabled={busy || !canWrite}
                  onClick={() => void onDeactivate(editingId)}
                >
                  {t("bannersDeactivate")}
                </Button>
              ) : null}
            </div>
        </>
      }
    />
  );
}

