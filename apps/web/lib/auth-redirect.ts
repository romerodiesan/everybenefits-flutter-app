import type { User } from "firebase/auth";
import { isSafeInternalPath } from "@/lib/sso";
import { needsProfileCompletion } from "@/lib/roles";
import type { UserProfile } from "@/lib/types";

/**
 * Read `?next=` for post-login navigation.
 * Unlike `safeInternalPath`, returns null when missing — never invents `/`.
 */
export function readLoginNext(
  raw: string | null | undefined,
): string | null {
  if (!raw || !isSafeInternalPath(raw)) return null;
  return raw;
}

/** Destination after a successful sign-in (deep link or /home). */
export function postLoginPath(
  rawNext: string | null | undefined,
  fallback = "/home",
): string {
  return readLoginNext(rawNext) ?? fallback;
}

/** Encode `?next=` when a safe deep link is present. */
export function nextQuery(rawNext: string | null | undefined): string {
  const next = readLoginNext(rawNext);
  return next ? `?next=${encodeURIComponent(next)}` : "";
}

export type PostAuthDestination =
  | { kind: "set-password"; path: string }
  | { kind: "complete-profile"; path: string }
  | { kind: "home"; path: string };

/**
 * Single post-auth resolver for login / register / shell gates.
 * Preserves `?next=` through set-password and complete-profile.
 */
export function resolvePostAuthDestination(opts: {
  user: Pick<User, "isAnonymous" | "email"> | null;
  profile: UserProfile | null;
  next?: string | null;
  hasPassword: boolean;
}): PostAuthDestination {
  const q = nextQuery(opts.next);
  const home = postLoginPath(opts.next);
  const user = opts.user;
  if (!user) return { kind: "home", path: home };

  if (!user.isAnonymous && !opts.hasPassword && user.email) {
    return { kind: "set-password", path: `/set-password${q}` };
  }
  if (
    opts.profile &&
    !opts.profile.isAnonymous &&
    needsProfileCompletion(opts.profile)
  ) {
    return { kind: "complete-profile", path: `/complete-profile${q}` };
  }
  return { kind: "home", path: home };
}
