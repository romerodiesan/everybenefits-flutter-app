import { describe, expect, it } from "vitest";
import {
  PRODUCTION_APP_ORIGINS,
  isAppHostingPreviewOrigin,
  productionAppOriginsCsp,
} from "./origins";
import { buildContentSecurityPolicy } from "./csp";

describe("origins inventory", () => {
  it("includes production custom domains", () => {
    expect(PRODUCTION_APP_ORIGINS).toContain("https://pulse.everybenefits.us");
    expect(PRODUCTION_APP_ORIGINS).toContain("https://admin.everybenefits.us");
    expect(PRODUCTION_APP_ORIGINS).toContain(
      "https://payments.everybenefits.us",
    );
  });

  it("recognizes App Hosting preview hosts", () => {
    expect(
      isAppHostingPreviewOrigin(
        "https://pulse-web-app--pr12-abcd-every-benefits-us.us-central1.hosted.app",
      ),
    ).toBe(true);
    expect(isAppHostingPreviewOrigin("https://evil.example")).toBe(false);
  });

  it("adds production origins to CSP connect/form-action", () => {
    const csp = buildContentSecurityPolicy({ includeEmulators: false });
    expect(csp).toContain("https://pulse.everybenefits.us");
    expect(productionAppOriginsCsp()).toContain("https://studio.everybenefits.us");
  });
});
