export const FIREBASE_SERVER_EXTERNAL_PACKAGES: string[];
export function firebaseResolveAliases(dir: string): Record<string, string>;
export function applyFirebaseWebpackAliases<T extends { resolve?: { alias?: unknown } }>(
  config: T,
  dir: string,
): T;
