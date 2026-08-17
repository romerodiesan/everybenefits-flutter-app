"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  pickBannersForSurface,
  type PromoBanner,
  type PromoBannerSurface,
} from "@pulse/shared";
import { useAuth } from "@/lib/providers/auth-provider";
import { watchActivePromoBanners } from "@/lib/firebase/promo-banners";
import {
  dismissPromoBanner,
  isPromoBannerDismissed,
} from "@/lib/promo-banner-dismiss";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";

/**
 * Active promos for a surface (carousel when multiple).
 * Respects audience, schedule, and local dismiss.
 * Non-dismissible banners ignore localStorage dismiss state.
 */
export function usePromoBanners(surface: PromoBannerSurface) {
  const { profile } = useAuth();
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [dismissTick, setDismissTick] = useState(0);
  const [index, setIndex] = useState(0);

  useVisibleSubscription(true, () => {
    return watchActivePromoBanners(setBanners, () => setBanners([]));
  }, []);

  const visible = useMemo(() => {
    void dismissTick;
    return pickBannersForSurface(banners, surface, {
      role: profile?.role ?? null,
      isAnonymous: profile?.isAnonymous === true,
    }).filter((banner) => {
      if (banner.dismissible === false) return true;
      return !isPromoBannerDismissed(banner.id, banner.version);
    });
  }, [banners, surface, profile?.role, profile?.isAnonymous, dismissTick]);

  const count = visible.length;

  useEffect(() => {
    setIndex((current) => {
      if (count === 0) return 0;
      return Math.min(current, count - 1);
    });
  }, [count]);

  const banner = visible[index] ?? null;

  const dismiss = useCallback(() => {
    if (!banner || banner.dismissible === false) return;
    dismissPromoBanner(banner.id, banner.version);
    setDismissTick((n) => n + 1);
  }, [banner]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count === 0) return;
      const wrapped = ((nextIndex % count) + count) % count;
      setIndex(wrapped);
    },
    [count],
  );

  const next = useCallback(() => {
    setIndex((current) => {
      if (count === 0) return 0;
      return (current + 1) % count;
    });
  }, [count]);

  const prev = useCallback(() => {
    setIndex((current) => {
      if (count === 0) return 0;
      return (current - 1 + count) % count;
    });
  }, [count]);

  return {
    banners: visible,
    banner,
    index,
    count,
    dismiss,
    goTo,
    next,
    prev,
  };
}
