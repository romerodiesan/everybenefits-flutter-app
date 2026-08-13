import { z } from "zod";
import {
  FORMATS_BY_SURFACE,
  PROMO_BANNER_AUDIENCES,
  PROMO_BANNER_FORMATS,
  PROMO_BANNER_LIMITS,
  PROMO_BANNER_LOCALES,
  PROMO_BANNER_SURFACES,
  PROMO_BANNER_TYPES,
  isFormatAllowedForSurface,
} from "./types";

const localizedEyebrowSchema = z.object({
  en: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.eyebrow),
  es: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.eyebrow),
});

const localizedTitleSchema = z.object({
  en: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.title),
  es: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.title),
});

const localizedBodySchema = z.object({
  en: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.body),
  es: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.body),
});

const localizedCtaSchema = z.object({
  en: z.string().trim().max(PROMO_BANNER_LIMITS.ctaLabel),
  es: z.string().trim().max(PROMO_BANNER_LIMITS.ctaLabel),
});

const localizedCtaRequiredSchema = z.object({
  en: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.ctaLabel),
  es: z.string().trim().min(1).max(PROMO_BANNER_LIMITS.ctaLabel),
});

/** Internal path or absolute https URL (or empty when CTA off). */
export const promoBannerHrefSchema = z
  .string()
  .trim()
  .max(PROMO_BANNER_LIMITS.href)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/") ||
      /^https:\/\//i.test(value),
    "Href must be an internal path or https URL",
  );

const baseUpsertFields = {
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,62}$/i, "Invalid banner id")
    .optional(),
  version: z.number().int().min(1).max(10_000).optional(),
  active: z.boolean().optional(),
  type: z.enum(PROMO_BANNER_TYPES).optional(),
  format: z.enum(PROMO_BANNER_FORMATS).optional(),
  surface: z.enum(PROMO_BANNER_SURFACES),
  audiences: z
    .array(z.enum(PROMO_BANNER_AUDIENCES))
    .min(1)
    .max(PROMO_BANNER_AUDIENCES.length),
  dismissible: z.boolean().optional(),
  showCta: z.boolean().optional(),
  showImage: z.boolean().optional(),
  eyebrow: localizedEyebrowSchema,
  title: localizedTitleSchema,
  body: localizedBodySchema,
  ctaLabel: localizedCtaSchema.optional(),
  href: promoBannerHrefSchema.optional(),
  imageUrl: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.union([
      z.null(),
      z
        .string()
        .trim()
        .max(2048)
        .refine(
          (value) =>
            /^https?:\/\//i.test(value) || value.startsWith("gs://"),
          "imageUrl must be an http(s) or gs:// URL",
        ),
    ]),
  ).optional(),
  imagePath: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.union([z.null(), z.string().trim().max(512)]),
  ).optional(),
  startsAt: z.number().int().nullable().optional(),
  endsAt: z.number().int().nullable().optional(),
  /** When true, increments `version` so dismissed clients see the banner again. */
  bumpVersion: z.boolean().optional(),
};

export const promoBannerUpsertSchema = z
  .object(baseUpsertFields)
  .superRefine((data, ctx) => {
    const format = data.format;
    if (format && !isFormatAllowedForSurface(data.surface, format)) {
      ctx.addIssue({
        code: "custom",
        message: `Format "${format}" is not allowed on surface "${data.surface}". Allowed: ${FORMATS_BY_SURFACE[data.surface].join(", ")}`,
        path: ["format"],
      });
    }

    const showCta = data.showCta !== false;
    if (showCta) {
      const href = (data.href ?? "").trim();
      if (!href) {
        ctx.addIssue({
          code: "custom",
          message: "Href required when CTA is enabled",
          path: ["href"],
        });
      } else if (!href.startsWith("/") && !/^https:\/\//i.test(href)) {
        ctx.addIssue({
          code: "custom",
          message: "Href must be an internal path or https URL",
          path: ["href"],
        });
      }
      const cta = data.ctaLabel;
      if (!cta?.en?.trim() || !cta?.es?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "CTA label required when CTA is enabled",
          path: ["ctaLabel"],
        });
      }
    }
  });

export type PromoBannerUpsertInput = z.infer<typeof promoBannerUpsertSchema>;

export const promoBannerDocSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  active: z.boolean(),
  type: z.enum(PROMO_BANNER_TYPES),
  format: z.enum(PROMO_BANNER_FORMATS),
  surface: z.enum(PROMO_BANNER_SURFACES),
  audiences: z.array(z.enum(PROMO_BANNER_AUDIENCES)).min(1),
  dismissible: z.boolean(),
  showCta: z.boolean(),
  showImage: z.boolean(),
  eyebrow: localizedEyebrowSchema,
  title: localizedTitleSchema,
  body: localizedBodySchema,
  ctaLabel: localizedCtaRequiredSchema.or(localizedCtaSchema),
  href: promoBannerHrefSchema,
  imageUrl: z.string().nullable(),
  imagePath: z.string().nullable(),
  startsAt: z.number().int().nullable(),
  endsAt: z.number().int().nullable(),
  createdAt: z.number().int().nullable(),
  updatedAt: z.number().int().nullable(),
  updatedBy: z.string().nullable(),
});

export { PROMO_BANNER_LOCALES };
