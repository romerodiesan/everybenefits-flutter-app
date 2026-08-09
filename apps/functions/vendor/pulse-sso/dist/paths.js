"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSafeInternalPath = isSafeInternalPath;
exports.safeInternalPath = safeInternalPath;
/**
 * Same-origin relative path only. Rejects protocol-relative (`//evil`),
 * backslashes, and schemes — blocks open redirects via `?next=`.
 */
function isSafeInternalPath(path) {
    if (!path)
        return false;
    if (!path.startsWith("/"))
        return false;
    if (path.startsWith("//"))
        return false;
    if (path.includes("\\"))
        return false;
    if (path.includes("://"))
        return false;
    return true;
}
/** Returns a safe internal path or `fallback` (default `/`). */
function safeInternalPath(path, fallback = "/") {
    return isSafeInternalPath(path) ? path : fallback;
}
