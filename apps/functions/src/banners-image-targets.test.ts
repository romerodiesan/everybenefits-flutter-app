import { describe, expect, it } from "vitest";
import {
  PROMO_BANNER_IMAGE_TARGETS,
  computeContainFit,
  computeCoverCrop,
} from "@pulse/shared";

describe("computeCoverCrop", () => {
  it("crops width for landscape wider than target", () => {
    const crop = computeCoverCrop(2000, 1000, 16 / 9);
    expect(crop.sh).toBe(1000);
    expect(crop.sw).toBeCloseTo(1000 * (16 / 9));
    expect(crop.sx).toBeCloseTo((2000 - crop.sw) / 2);
    expect(crop.sy).toBe(0);
  });

  it("crops height for portrait / taller sources", () => {
    const crop = computeCoverCrop(800, 1200, 4 / 3);
    expect(crop.sw).toBe(800);
    expect(crop.sh).toBeCloseTo(800 / (4 / 3));
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBeCloseTo((1200 - crop.sh) / 2);
  });

  it("keeps full frame when aspect already matches", () => {
    const crop = computeCoverCrop(1200, 675, 16 / 9);
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 675 });
  });
});

describe("computeContainFit", () => {
  it("letterboxes a wide source inside 16:9", () => {
    const fit = computeContainFit(2000, 1000, 1200, 675);
    expect(fit.dw).toBe(1200);
    expect(fit.dh).toBeCloseTo(1200 * (1000 / 2000));
    expect(fit.dx).toBe(0);
    expect(fit.dy).toBeCloseTo((675 - fit.dh) / 2);
  });

  it("pillarboxes a tall source inside 4:3", () => {
    const fit = computeContainFit(800, 1200, 800, 600);
    expect(fit.dh).toBe(600);
    expect(fit.dw).toBeCloseTo(600 * (800 / 1200));
    expect(fit.dy).toBe(0);
    expect(fit.dx).toBeCloseTo((800 - fit.dw) / 2);
  });

  it("fills the frame when aspect already matches", () => {
    const fit = computeContainFit(1200, 675, 1200, 675);
    expect(fit).toEqual({ dx: 0, dy: 0, dw: 1200, dh: 675 });
  });
});

describe("PROMO_BANNER_IMAGE_TARGETS", () => {
  it("matches declared width/height aspect", () => {
    for (const target of Object.values(PROMO_BANNER_IMAGE_TARGETS)) {
      expect(target.width / target.height).toBeCloseTo(target.aspectRatio, 5);
    }
  });
});
