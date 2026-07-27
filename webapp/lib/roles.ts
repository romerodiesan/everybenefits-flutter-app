export type { UserRole } from "@pulse/shared";

export {
  parseRole,
  canAuthorCourses,
  canAuthorPaths,
  canManageCourses,
  canEditCourse,
  canEditPath,
  belongsInDefaultAgentGroup,
  canParticipateInForums,
  canParticipateInChats,
  canCreateChatGroups,
  ALL_ROLES,
  FORUM_ROLES,
  DEFAULT_GROUP_ROLES,
  GROUP_CREATOR_ROLES,
} from "@pulse/shared";

export function headlineName(profile: {
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
}) {
  if (profile.displayName?.trim()) return profile.displayName.trim();
  if (profile.email) return profile.email;
  return profile.isAnonymous ? "Guest" : "User";
}

export function composeUsAddress(parts: {
  street?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const s = parts.street?.trim() ?? "";
  const a = parts.apt?.trim() ?? "";
  const c = parts.city?.trim() ?? "";
  const st = (parts.state?.trim() ?? "").toUpperCase();
  const z = parts.zip?.trim() ?? "";
  const line1 = [s, a].filter(Boolean).join(", ");
  const stateZip = [st, z].filter(Boolean).join(" ");
  const line2 = [c, stateZip].filter(Boolean).join(", ");
  if (!line1 && !line2) return null;
  if (!line1) return line2;
  if (!line2) return line1;
  return `${line1}\n${line2}`;
}

export function dmKeyFor(a: string, b: string) {
  return [a, b].sort().join("_");
}

export function supportChatIdFor(uid: string) {
  return `support_${uid}`;
}

export function normalizeForumTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 5) break;
  }
  return out;
}
