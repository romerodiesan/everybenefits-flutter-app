"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import Image from "next/image";
export function BrandMark({ size = 28, className = "", priority = false, alt = "Pulse", }) {
    return (_jsx(Image, { src: "/brand/pulse-logo.png", alt: alt, width: size, height: size, priority: priority, className: `rounded-lg object-contain ${className}` }));
}
