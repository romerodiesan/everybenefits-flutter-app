/**
 * Same-origin relative path only. Rejects protocol-relative (`//evil`),
 * backslashes, and schemes — blocks open redirects via `?next=`.
 */
export declare function isSafeInternalPath(path: string | null | undefined): path is string;
/** Returns a safe internal path or `fallback` (default `/`). */
export declare function safeInternalPath(path: string | null | undefined, fallback?: string): string;
//# sourceMappingURL=paths.d.ts.map