import { describe, expect, it } from "vitest";
import {
  PRODUCT_TOUR_VERSION,
  shouldShowProductTour,
} from "@/lib/product-tour";

describe("shouldShowProductTour", () => {
  it("shows for completed member who has not seen the tour", () => {
    expect(
      shouldShowProductTour({
        isAnonymous: false,
        profileCompleted: true,
        productTourVersion: 0,
      }),
    ).toBe(true);
  });

  it("shows when user saw an older tour version", () => {
    expect(
      shouldShowProductTour({
        isAnonymous: false,
        profileCompleted: true,
        productTourVersion: PRODUCT_TOUR_VERSION - 1,
      }),
    ).toBe(true);
  });

  it("hides for anonymous guests", () => {
    expect(
      shouldShowProductTour({
        isAnonymous: true,
        profileCompleted: true,
        productTourVersion: 0,
      }),
    ).toBe(false);
  });

  it("hides when profile incomplete", () => {
    expect(
      shouldShowProductTour({
        isAnonymous: false,
        profileCompleted: false,
        productTourVersion: 0,
      }),
    ).toBe(false);
  });

  it("hides when version already current", () => {
    expect(
      shouldShowProductTour({
        isAnonymous: false,
        profileCompleted: true,
        productTourVersion: PRODUCT_TOUR_VERSION,
      }),
    ).toBe(false);
  });
});
