"use client";

import { useLayoutEffect } from "react";
import { clearInvisibleRecaptcha } from "@/lib/firebase/recaptcha-verifier";

/**
 * Mounts the Firebase Phone Auth reCAPTCHA host on document.body so the
 * challenge is not clipped by overflow-hidden settings sheets.
 */
export function PhoneRecaptchaHost({ containerId }: { containerId: string }) {
  useLayoutEffect(() => {
    let node = document.getElementById(containerId);
    const created = !node;
    if (!node) {
      node = document.createElement("div");
      node.id = containerId;
      node.setAttribute("aria-hidden", "true");
      Object.assign(node.style, {
        position: "fixed",
        left: "0px",
        bottom: "0px",
        width: "1px",
        height: "1px",
        overflow: "visible",
        zIndex: "2147483646",
      });
      document.body.appendChild(node);
    }
    return () => {
      clearInvisibleRecaptcha(containerId);
      if (created) node?.remove();
    };
  }, [containerId]);

  return null;
}
