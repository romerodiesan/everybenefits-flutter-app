"use client";

import Image from "next/image";

export function BrandMark({
  size = 28,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/pulse-logo.png"
      alt="Pulse"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-lg object-contain ${className}`}
    />
  );
}
