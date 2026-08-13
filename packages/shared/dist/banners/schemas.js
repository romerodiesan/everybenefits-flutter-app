"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMO_BANNER_LOCALES = exports.promoBannerDocSchema = exports.promoBannerUpsertSchema = exports.promoBannerHrefSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
Object.defineProperty(exports, "PROMO_BANNER_LOCALES", { enumerable: true, get: function () { return types_1.PROMO_BANNER_LOCALES; } });
const localizedEyebrowSchema = zod_1.z.object({
    en: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.eyebrow),
    es: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.eyebrow),
});
const localizedTitleSchema = zod_1.z.object({
    en: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.title),
    es: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.title),
});
const localizedBodySchema = zod_1.z.object({
    en: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.body),
    es: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.body),
});
const localizedCtaSchema = zod_1.z.object({
    en: zod_1.z.string().trim().max(types_1.PROMO_BANNER_LIMITS.ctaLabel),
    es: zod_1.z.string().trim().max(types_1.PROMO_BANNER_LIMITS.ctaLabel),
});
const localizedCtaRequiredSchema = zod_1.z.object({
    en: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.ctaLabel),
    es: zod_1.z.string().trim().min(1).max(types_1.PROMO_BANNER_LIMITS.ctaLabel),
});
/** Internal path or absolute https URL (or empty when CTA off). */
exports.promoBannerHrefSchema = zod_1.z
    .string()
    .trim()
    .max(types_1.PROMO_BANNER_LIMITS.href)
    .refine((value) => value === "" ||
    value.startsWith("/") ||
    /^https:\/\//i.test(value), "Href must be an internal path or https URL");
const baseUpsertFields = {
    id: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]{0,62}$/i, "Invalid banner id")
        .optional(),
    version: zod_1.z.number().int().min(1).max(10000).optional(),
    active: zod_1.z.boolean().optional(),
    type: zod_1.z.enum(types_1.PROMO_BANNER_TYPES).optional(),
    format: zod_1.z.enum(types_1.PROMO_BANNER_FORMATS).optional(),
    surface: zod_1.z.enum(types_1.PROMO_BANNER_SURFACES),
    audiences: zod_1.z
        .array(zod_1.z.enum(types_1.PROMO_BANNER_AUDIENCES))
        .min(1)
        .max(types_1.PROMO_BANNER_AUDIENCES.length),
    dismissible: zod_1.z.boolean().optional(),
    showCta: zod_1.z.boolean().optional(),
    showImage: zod_1.z.boolean().optional(),
    eyebrow: localizedEyebrowSchema,
    title: localizedTitleSchema,
    body: localizedBodySchema,
    ctaLabel: localizedCtaSchema.optional(),
    href: exports.promoBannerHrefSchema.optional(),
    imageUrl: zod_1.z.preprocess((value) => (value === "" || value === undefined ? null : value), zod_1.z.union([
        zod_1.z.null(),
        zod_1.z
            .string()
            .trim()
            .max(2048)
            .refine((value) => /^https?:\/\//i.test(value) || value.startsWith("gs://"), "imageUrl must be an http(s) or gs:// URL"),
    ])).optional(),
    imagePath: zod_1.z.preprocess((value) => (value === "" || value === undefined ? null : value), zod_1.z.union([zod_1.z.null(), zod_1.z.string().trim().max(512)])).optional(),
    startsAt: zod_1.z.number().int().nullable().optional(),
    endsAt: zod_1.z.number().int().nullable().optional(),
    /** When true, increments `version` so dismissed clients see the banner again. */
    bumpVersion: zod_1.z.boolean().optional(),
};
exports.promoBannerUpsertSchema = zod_1.z
    .object(baseUpsertFields)
    .superRefine((data, ctx) => {
    const format = data.format;
    if (format && !(0, types_1.isFormatAllowedForSurface)(data.surface, format)) {
        ctx.addIssue({
            code: "custom",
            message: `Format "${format}" is not allowed on surface "${data.surface}". Allowed: ${types_1.FORMATS_BY_SURFACE[data.surface].join(", ")}`,
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
        }
        else if (!href.startsWith("/") && !/^https:\/\//i.test(href)) {
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
exports.promoBannerDocSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    version: zod_1.z.number().int().min(1),
    active: zod_1.z.boolean(),
    type: zod_1.z.enum(types_1.PROMO_BANNER_TYPES),
    format: zod_1.z.enum(types_1.PROMO_BANNER_FORMATS),
    surface: zod_1.z.enum(types_1.PROMO_BANNER_SURFACES),
    audiences: zod_1.z.array(zod_1.z.enum(types_1.PROMO_BANNER_AUDIENCES)).min(1),
    dismissible: zod_1.z.boolean(),
    showCta: zod_1.z.boolean(),
    showImage: zod_1.z.boolean(),
    eyebrow: localizedEyebrowSchema,
    title: localizedTitleSchema,
    body: localizedBodySchema,
    ctaLabel: localizedCtaRequiredSchema.or(localizedCtaSchema),
    href: exports.promoBannerHrefSchema,
    imageUrl: zod_1.z.string().nullable(),
    imagePath: zod_1.z.string().nullable(),
    startsAt: zod_1.z.number().int().nullable(),
    endsAt: zod_1.z.number().int().nullable(),
    createdAt: zod_1.z.number().int().nullable(),
    updatedAt: zod_1.z.number().int().nullable(),
    updatedBy: zod_1.z.string().nullable(),
});
