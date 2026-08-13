"use client";

import { useEffect, useState } from "react";
import { bannerShouldShowImage, type PromoBanner } from "@pulse/shared";
import { getStorageUrl } from "@/lib/firebase/courses";

const useEmulators =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

/**
 * Resolve banner art for the current environment.
 * Honors showImage / text format; under emulators resolves imagePath via Storage SDK.
 */
export function useBannerImageUrl(banner: PromoBanner | null): string | null {
  const allowImage = banner ? bannerShouldShowImage(banner) : false;
  const imagePath = allowImage ? banner?.imagePath?.trim() || null : null;
  const imageUrl = allowImage ? banner?.imageUrl?.trim() || null : null;
  const [resolved, setResolved] = useState<{ path: string; url: string } | null>(
    null,
  );

  const preferPath =
    Boolean(imagePath) &&
    (useEmulators ||
      !imageUrl ||
      /firebasestorage\.googleapis\.com/i.test(imageUrl));

  useEffect(() => {
    if (!preferPath || !imagePath) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    getStorageUrl(imagePath)
      .then((url) => {
        if (!cancelled) setResolved({ path: imagePath, url });
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [preferPath, imagePath]);

  if (!allowImage) return null;
  if (preferPath) {
    return resolved?.path === imagePath ? resolved.url : null;
  }
  return imageUrl;
}
