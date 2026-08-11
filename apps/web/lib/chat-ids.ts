/** Stable DM key for two UIDs (order-independent). */
export function dmKeyFor(a: string, b: string) {
  return [a, b].sort().join("_");
}
