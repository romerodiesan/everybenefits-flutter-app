import { describe, expect, it } from "vitest";
import {
  isBannerVisibleToViewer,
  isFormatAllowedForSurface,
  pickBannerForSurface,
  pickBannersForSurface,
  resolveBannerFormat,
  withBannerCompatDefaults,
  type PromoBanner,
} from "@pulse/shared";

function banner(partial: Partial<PromoBanner> & Pick<PromoBanner, "id">): PromoBanner {
  return withBannerCompatDefaults({
    version: 1,
    active: true,
    surface: "home",
    audiences: ["all"],
    eyebrow: { en: "New", es: "Nuevo" },
    title: { en: "Title", es: "Título" },
    body: { en: "Body", es: "Cuerpo" },
    ctaLabel: { en: "Go", es: "Ir" },
    href: "/academy",
    imageUrl: null,
    imagePath: null,
    startsAt: null,
    endsAt: null,
    createdAt: null,
    updatedAt: 100,
    updatedBy: null,
    ...partial,
  });
}

describe("promo banner matching", () => {
  it("hides inactive or out-of-schedule banners", () => {
    const inactive = banner({ id: "a", active: false });
    expect(
      isBannerVisibleToViewer(inactive, { role: "agent", isAnonymous: false }),
    ).toBe(false);

    const future = banner({
      id: "b",
      startsAt: Date.now() + 60_000,
    });
    expect(
      isBannerVisibleToViewer(future, { role: "agent", isAnonymous: false }),
    ).toBe(false);
  });

  it("matches guest audience for anonymous viewers", () => {
    const promo = banner({ id: "g", audiences: ["guest"] });
    expect(
      isBannerVisibleToViewer(promo, { role: "guest", isAnonymous: true }),
    ).toBe(true);
    expect(
      isBannerVisibleToViewer(promo, { role: "agent", isAnonymous: false }),
    ).toBe(false);
  });

  it("lists all matching banners for a surface (carousel order)", () => {
    const older = banner({ id: "old", updatedAt: 10, surface: "home" });
    const newer = banner({ id: "new", updatedAt: 20, surface: "home" });
    const rail = banner({ id: "rail", surface: "rail", updatedAt: 99 });
    const list = pickBannersForSurface([older, newer, rail], "home", {
      role: "student",
      isAnonymous: false,
    });
    expect(list.map((b) => b.id)).toEqual(["new", "old"]);
  });

  it("picks one banner per surface by newest updatedAt", () => {
    const older = banner({ id: "old", updatedAt: 10, surface: "home" });
    const newer = banner({ id: "new", updatedAt: 20, surface: "home" });
    const rail = banner({ id: "rail", surface: "rail", updatedAt: 99 });
    const picked = pickBannerForSurface([older, newer, rail], "home", {
      role: "student",
      isAnonymous: false,
    });
    expect(picked?.id).toBe("new");
  });
});

describe("promo banner format matrix", () => {
  it("allows text on every surface and card only on home", () => {
    expect(isFormatAllowedForSurface("home", "card")).toBe(true);
    expect(isFormatAllowedForSurface("home", "text")).toBe(true);
    expect(isFormatAllowedForSurface("rail", "tile")).toBe(true);
    expect(isFormatAllowedForSurface("rail", "card")).toBe(false);
    expect(isFormatAllowedForSurface("academy", "strip")).toBe(true);
  });

  it("resolves legacy banners without format from surface", () => {
    expect(
      resolveBannerFormat({ surface: "rail", format: "card" }),
    ).toBe("tile");
    expect(
      resolveBannerFormat({ surface: "academy", format: "strip" }),
    ).toBe("strip");
  });

  it("applies compat defaults", () => {
    const doc = withBannerCompatDefaults({
      id: "x",
      surface: "home",
      eyebrow: { en: "A", es: "A" },
      title: { en: "T", es: "T" },
      body: { en: "B", es: "B" },
      active: true,
    });
    expect(doc.type).toBe("promo");
    expect(doc.format).toBe("card");
    expect(doc.dismissible).toBe(true);
    expect(doc.showCta).toBe(true);
  });
});
