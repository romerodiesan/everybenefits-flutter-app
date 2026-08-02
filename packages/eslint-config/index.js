/** Shared ESLint pieces for Pulse Next.js apps (flat config). */

export const pulseGlobalIgnores = [
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
];

/** Firebase subscribe / localStorage hydrate patterns used across Pulse. */
export const pulseReactHooksRules = {
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/refs": "off",
};
