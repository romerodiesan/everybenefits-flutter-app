"use client";

import Image from "next/image";

export function BrandMark({
  size = 28,
  className = "",
  priority = false,
  alt = "Pulse",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/brand/pulse-logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`rounded-lg object-contain ${className}`}
    />
  );
}
