import { z } from "zod";
import { PROMO_BANNER_LOCALES } from "./types";
/** Internal path or absolute https URL (or empty when CTA off). */
export declare const promoBannerHrefSchema: z.ZodString;
export declare const promoBannerUpsertSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodOptional<z.ZodEnum<{
        promo: "promo";
        product_update: "product_update";
        education: "education";
    }>>;
    format: z.ZodOptional<z.ZodEnum<{
        text: "text";
        card: "card";
        tile: "tile";
        strip: "strip";
    }>>;
    surface: z.ZodEnum<{
        home: "home";
        rail: "rail";
        academy: "academy";
    }>;
    audiences: z.ZodArray<z.ZodEnum<{
        all: "all";
        admin: "admin";
        guest: "guest";
        manager: "manager";
        agency_owner: "agency_owner";
        agent: "agent";
        student: "student";
        instructor: "instructor";
    }>>;
    dismissible: z.ZodOptional<z.ZodBoolean>;
    showCta: z.ZodOptional<z.ZodBoolean>;
    showImage: z.ZodOptional<z.ZodBoolean>;
    eyebrow: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    title: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    ctaLabel: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>>;
    href: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodNull, z.ZodString]>>>;
    imagePath: z.ZodOptional<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodNull, z.ZodString]>>>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bumpVersion: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type PromoBannerUpsertInput = z.infer<typeof promoBannerUpsertSchema>;
export declare const promoBannerDocSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
    active: z.ZodBoolean;
    type: z.ZodEnum<{
        promo: "promo";
        product_update: "product_update";
        education: "education";
    }>;
    format: z.ZodEnum<{
        text: "text";
        card: "card";
        tile: "tile";
        strip: "strip";
    }>;
    surface: z.ZodEnum<{
        home: "home";
        rail: "rail";
        academy: "academy";
    }>;
    audiences: z.ZodArray<z.ZodEnum<{
        all: "all";
        admin: "admin";
        guest: "guest";
        manager: "manager";
        agency_owner: "agency_owner";
        agent: "agent";
        student: "student";
        instructor: "instructor";
    }>>;
    dismissible: z.ZodBoolean;
    showCta: z.ZodBoolean;
    showImage: z.ZodBoolean;
    eyebrow: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    title: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    ctaLabel: z.ZodUnion<[z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>]>;
    href: z.ZodString;
    imageUrl: z.ZodNullable<z.ZodString>;
    imagePath: z.ZodNullable<z.ZodString>;
    startsAt: z.ZodNullable<z.ZodNumber>;
    endsAt: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodNullable<z.ZodNumber>;
    updatedAt: z.ZodNullable<z.ZodNumber>;
    updatedBy: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export { PROMO_BANNER_LOCALES };
//# sourceMappingURL=schemas.d.ts.map