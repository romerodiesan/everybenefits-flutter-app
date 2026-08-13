/**
 * Client-side banner image reshape (canvas).
 *
 * Perfect frame fill without losing the subject:
 * 1) Blurred cover background → no empty margins
 * 2) Sharp contain of the full source → entire photo visible (even if huge)
 * Output is always the exact format pixel size.
 */

import {
  PROMO_BANNER_LIMITS,
  computeContainFit,
  computeCoverCrop,
  imageTargetForFormat,
  type PromoBannerFormat,
} from "@pulse/shared";

export type ReshapeBannerImageResult = {
  file: File;
  width: number;
  height: number;
  aspectLabel: string;
  format: PromoBannerFormat;
};

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image."));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode resized image."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Reshape a local image for a promo banner format.
 * Full photo stays visible; frame stays edge-to-edge via blurred bleed.
 */
export async function reshapeBannerImage(
  source: File,
  format: PromoBannerFormat,
): Promise<ReshapeBannerImageResult> {
  const target = imageTargetForFormat(format);
  if (!target) {
    throw new Error("Text banners do not accept images.");
  }

  const img = await loadImageElement(source);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const { width: tw, height: th } = target;

  const cover = computeCoverCrop(srcW, srcH, target.aspectRatio);
  const fit = computeContainFit(srcW, srcH, tw, th);

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1) Soft cover bleed — fills the frame (and upscales tiny sources).
  const padX = tw * 0.1;
  const padY = th * 0.1;
  ctx.save();
  ctx.filter = "blur(32px)";
  ctx.drawImage(
    img,
    cover.sx,
    cover.sy,
    cover.sw,
    cover.sh,
    -padX,
    -padY,
    tw + padX * 2,
    th + padY * 2,
  );
  ctx.restore();

  // Slight vignette so the sharp subject reads clearer on mismatched aspects.
  ctx.fillStyle = "rgba(8, 20, 14, 0.14)";
  ctx.fillRect(0, 0, tw, th);

  // 2) Full photo, fitted — never cropped.
  ctx.drawImage(img, 0, 0, srcW, srcH, fit.dx, fit.dy, fit.dw, fit.dh);

  let quality = 0.9;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > PROMO_BANNER_LIMITS.imageMaxBytes && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToJpegBlob(canvas, quality);
  }
  if (blob.size > PROMO_BANNER_LIMITS.imageMaxBytes) {
    throw new Error("Resized image still exceeds the 5MB limit.");
  }

  const baseName = source.name.replace(/\.[^.]+$/, "") || "banner";
  const file = new File([blob], `${baseName}-${format}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return {
    file,
    width: tw,
    height: th,
    aspectLabel: target.label,
    format,
  };
}
