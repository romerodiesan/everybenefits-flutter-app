import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  appearanceAccentFrom,
  canParticipateInChats,
  normalizeSearchQueryToken,
  parseRole,
  sanitizeProfileBadgeInput,
  toPublicProfileBadge,
  userSearchIndexFields,
} from "@pulse/shared";
import { blockedWithCaller } from "./social";
import { sanitizeBio } from "./social-helpers";
import { db, callableOpts } from "./init";
import { isUserApprovedForJoin, requireCaller } from "./auth";

type PrivacyPrefs = {
  discoverableInDirectory: boolean;
  searchableByEmail: boolean;
  searchableByNpn: boolean;
  showEmailInSearch: boolean;
  showNpnInSearch: boolean;
  allowDirectMessages: boolean;
};

function readPrivacy(raw: unknown): PrivacyPrefs {
  const data =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    discoverableInDirectory: data.discoverableInDirectory !== false,
    searchableByEmail: data.searchableByEmail !== false,
    searchableByNpn: data.searchableByNpn !== false,
    showEmailInSearch: data.showEmailInSearch !== false,
    showNpnInSearch: data.showNpnInSearch !== false,
    allowDirectMessages: data.allowDirectMessages !== false,
  };
}

function adminRoleBadge(
  role: DocumentData | undefined,
): { text: string; icon?: string; color?: string | null } | undefined {
  const text =
    typeof role?.badgeText === "string" ? role.badgeText.trim() : "";
  if (!text || !role) return undefined;
  return {
    text,
    icon: typeof role.badgeIcon === "string" ? role.badgeIcon : undefined,
    color: typeof role.badgeColor === "string" ? role.badgeColor : null,
  };
}

function publicBadgeFor(
  data: DocumentData,
  roleFallback?: { text: string; icon?: string; color?: string | null },
) {
  return toPublicProfileBadge(
    sanitizeProfileBadgeInput(data.profileBadge),
    appearanceAccentFrom(data.appearance),
    roleFallback,
  );
}

async function roleBadgeById(
  roleIds: Iterable<string>,
): Promise<Map<string, ReturnType<typeof adminRoleBadge>>> {
  const unique = [...new Set(roleIds)];
  const snaps = await Promise.all(
    unique.map((id) => db.doc(`roles/${id}`).get()),
  );
  return new Map(
    unique.map((id, index) => [id, adminRoleBadge(snaps[index].data())]),
  );
}

export const syncPublicProfile = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    const ref = db.doc(`publicProfiles/${uid}`);
    if (!after?.exists) {
      await ref.delete();
      return;
    }
    const data = after.data() ?? {};
    const privacy = readPrivacy(data.privacy);

    // Keep searchable fields indexed for Admin / Chats (self-heal legacy docs).
    const search = userSearchIndexFields(
      typeof data.displayName === "string" ? data.displayName : null,
      typeof data.email === "string" ? data.email : null,
    );
    const existingTokens = Array.isArray(data.nameTokens)
      ? data.nameTokens.map(String)
      : [];
    const searchStale =
      data.displayNameLower !== search.displayNameLower ||
      data.emailLower !== search.emailLower ||
      JSON.stringify(existingTokens) !== JSON.stringify(search.nameTokens);
    if (searchStale) {
      await after.ref.set(
        {
          ...search,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const roleId = String(data.role ?? "student");
    const roleSnap = await db.doc(`roles/${roleId}`).get();
    const profileBadge = publicBadgeFor(data, adminRoleBadge(roleSnap.data()));

    await ref.set({
      uid,
      displayName:
        typeof data.displayName === "string" ? data.displayName.slice(0, 120) : null,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
      role: String(data.role ?? "student"),
      agency: typeof data.agency === "string" ? data.agency.slice(0, 120) : null,
      bio: sanitizeBio(data.bio),
      profileBadge,
      isAnonymous: data.isAnonymous === true,
      discoverableInDirectory: privacy.discoverableInDirectory,
      allowDirectMessages: privacy.allowDirectMessages,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);

export const listPublicProfiles = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listPublicProfiles");
  const requestedLimit = Math.round(Number(request.data?.limit ?? 80));
  const max = Math.max(1, Math.min(100, requestedLimit));
  // Oversample so privacy filters still fill the page.
  const snap = await db
    .collection("users")
    .where("isAnonymous", "==", false)
    .limit(Math.min(300, max * 3 + 10))
    .get();
  const visible = snap.docs.filter((profile) => {
    if (profile.id === uid) return false;
    const privacy = readPrivacy(profile.data().privacy);
    return privacy.discoverableInDirectory;
  });
  const blocked = await blockedWithCaller(
    uid,
    visible.map((profile) => profile.id),
  );
  const page = visible
    .filter((profile) => !blocked.has(profile.id))
    .slice(0, max);
  const roleBadges = await roleBadgeById(
    page.map((profile) => String(profile.data().role ?? "student")),
  );
  const profiles = page.map((profile) => {
      const data = profile.data();
      const privacy = readPrivacy(data.privacy);
      const roleId = String(data.role ?? "student");
      return {
        uid: profile.id,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: roleId,
        agency: typeof data.agency === "string" ? data.agency : null,
        bio: sanitizeBio(data.bio),
        profileBadge: publicBadgeFor(data, roleBadges.get(roleId)),
        isAnonymous: false,
        profileCompleted: data.profileCompleted !== false,
        allowDirectMessages: privacy.allowDirectMessages,
      };
    });
  return { profiles };
});

/**
 * Directory search for chats (name, email, NPN). Returns PII for org members
 * who can participate in chats — respecting each target's privacy prefs.
 *
 * Uses indexed prefix queries (`displayNameLower` / `emailLower`) and
 * `nameTokens` array-contains so results are not limited to a loaded page.
 */
export const searchDirectory = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "searchDirectory");
  const caller = await db.doc(`users/${uid}`).get();
  const callerData = caller.data();
  if (
    !canParticipateInChats(
      parseRole(callerData?.role),
      callerData?.isAnonymous === true,
    )
  ) {
    throw new HttpsError("permission-denied", "Chats not available.");
  }

  const rawQuery = String(request.data?.query ?? "").trim();
  if (rawQuery.length < 2) {
    return { profiles: [] };
  }
  const limit = Math.max(
    1,
    Math.min(40, Math.round(Number(request.data?.limit ?? 40))),
  );
  const q = rawQuery.toLowerCase();
  const folded = normalizeSearchQueryToken(rawQuery);
  const npnDigits = rawQuery.replace(/\D/g, "");
  const looksEmail = q.includes("@");
  const looksNpn = npnDigits.length >= 5 && /^\d[\d\s-]*$/.test(rawQuery);
  const token =
    folded.split(/[@.\s]+/).filter(Boolean)[0] ?? folded;
  const rangeKey = folded || q;
  const end = `${rangeKey}\uf8ff`;

  const matched = new Map<string, Record<string, unknown>>();

  const pushDoc = (
    doc: {
      id: string;
      data: () => DocumentData;
    },
    matchKind: "email" | "npn" | "general",
  ) => {
    if (doc.id === uid || matched.has(doc.id)) return;
    if (matched.size >= limit) return;
    const data = doc.data();
    if (data.isAnonymous === true) return;
    const role = parseRole(data.role);
    if (role === "guest") return;
    if (!isUserApprovedForJoin(data) && String(data.approvalStatus ?? "") === "rejected") {
      return;
    }
    if (!isUserApprovedForJoin(data)) return;
    const privacy = readPrivacy(data.privacy);
    if (!privacy.discoverableInDirectory) return;
    if (matchKind === "email" && !privacy.searchableByEmail) return;
    if (matchKind === "npn" && !privacy.searchableByNpn) return;
    matched.set(doc.id, data);
  };

  const snaps = await Promise.all([
    looksEmail
      ? db.collection("users").where("email", "==", q).limit(limit).get()
      : Promise.resolve(null),
    looksEmail && rangeKey
      ? db
          .collection("users")
          .where("emailLower", ">=", rangeKey)
          .where("emailLower", "<=", end)
          .orderBy("emailLower", "asc")
          .limit(limit)
          .get()
      : Promise.resolve(null),
    looksNpn
      ? db.collection("users").where("npn", "==", npnDigits).limit(limit).get()
      : Promise.resolve(null),
    rangeKey
      ? db
          .collection("users")
          .where("displayNameLower", ">=", rangeKey)
          .where("displayNameLower", "<=", end)
          .orderBy("displayNameLower", "asc")
          .limit(limit)
          .get()
      : Promise.resolve(null),
    !looksEmail && rangeKey
      ? db
          .collection("users")
          .where("emailLower", ">=", rangeKey)
          .where("emailLower", "<=", end)
          .orderBy("emailLower", "asc")
          .limit(limit)
          .get()
      : Promise.resolve(null),
    token.length >= 2
      ? db
          .collection("users")
          .where("nameTokens", "array-contains", token)
          .limit(limit)
          .get()
      : Promise.resolve(null),
  ]);

  for (const [index, snap] of snaps.entries()) {
    if (!snap) continue;
    const kind: "email" | "npn" | "general" =
      index <= 1 ? "email" : index === 2 ? "npn" : "general";
    for (const doc of snap.docs) {
      pushDoc(doc, kind);
    }
  }

  const blocked = await blockedWithCaller(uid, [...matched.keys()]);
  const visible = [...matched.entries()].filter(([id]) => !blocked.has(id));
  const roleBadges = await roleBadgeById(
    visible.map(([, data]) => String(data.role ?? "student")),
  );
  const profiles = visible.map(([id, data]) => {
    const privacy = readPrivacy(data.privacy);
    const roleId = String(data.role ?? "student");
    return {
      uid: id,
      displayName:
        typeof data.displayName === "string" ? data.displayName : null,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
      role: roleId,
      agency: typeof data.agency === "string" ? data.agency : null,
      bio: sanitizeBio(data.bio),
      profileBadge: publicBadgeFor(data, roleBadges.get(roleId)),
      email:
        privacy.showEmailInSearch && typeof data.email === "string"
          ? data.email
          : null,
      npn:
        privacy.showNpnInSearch && typeof data.npn === "string"
          ? data.npn
          : null,
      isAnonymous: false,
      profileCompleted: data.profileCompleted !== false,
      allowDirectMessages: privacy.allowDirectMessages,
    };
  });

  profiles.sort((a, b) => {
    const an = (a.displayName ?? a.email ?? "").toLowerCase();
    const bn = (b.displayName ?? b.email ?? "").toLowerCase();
    const aPrefix = an.startsWith(q);
    const bPrefix = bn.startsWith(q);
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
    return an.localeCompare(bn);
  });

  return { profiles: profiles.slice(0, limit) };
});
