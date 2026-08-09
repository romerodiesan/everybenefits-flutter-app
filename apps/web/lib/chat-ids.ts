/** Stable DM key for two UIDs (order-independent). */
export function dmKeyFor(a: string, b: string) {
  return [a, b].sort().join("_");
}

/** RTDB chat id for a user's support thread. */
export function supportChatIdFor(uid: string) {
  return `support_${uid}`;
}
