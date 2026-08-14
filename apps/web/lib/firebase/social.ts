import { parsePublicProfileBadge } from "@pulse/shared";
import { callCloudFunction } from "./call-function";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "./client";
import { parseRole } from "../roles";
import type { UserProfile } from "../types";

export type SocialRelationshipStatus =
  | "none"
  | "outgoing"
  | "incoming"
  | "contact";

export type SocialRelationship = {
  status: SocialRelationshipStatus;
  muted: boolean;
  blockedByMe: boolean;
  isSelf: boolean;
};

function mapCard(entry: Record<string, unknown>): UserProfile {
  return {
    uid: String(entry.uid ?? ""),
    email: (entry.email as string) ?? null,
    displayName: (entry.displayName as string) ?? null,
    username: (entry.username as string) ?? null,
    photoUrl: (entry.photoUrl as string) ?? null,
    role: parseRole(entry.role),
    isAnonymous: false,
    profileCompleted: (entry.profileCompleted as boolean) ?? true,
    phoneCountryCode: null,
    phoneNumber: null,
    npn: (entry.npn as string) ?? null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: (entry.agency as string) ?? null,
    bio: (entry.bio as string) ?? null,
    profileBadge: parsePublicProfileBadge(entry.profileBadge),
    createdAt: null,
    updatedAt: null,
  };
}

const CLAIMED_HANDLE = /^[a-z0-9_]{3,20}$/;

function claimedHandle(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  return CLAIMED_HANDLE.test(value) ? value : null;
}

async function resolveProfileUid(
  handleOrUid: string,
): Promise<string | null> {
  const db = getFirebaseDb();
  const raw = handleOrUid.trim();
  if (!raw) return null;
  const handle = claimedHandle(raw);
  if (handle) {
    try {
      const reserved = await getDoc(doc(db, "usernames", handle));
      const reservedUid = String(reserved.data()?.uid ?? "").trim();
      if (reserved.exists() && reservedUid) return reservedUid;
    } catch {
      // Reservation read can fail if rules lag; try the public card next.
    }
    const hits = await getDocs(
      query(
        collection(db, "publicProfiles"),
        where("username", "==", handle),
        limit(1),
      ),
    );
    if (!hits.empty) return hits.docs[0].id;
  }
  return raw;
}

export async function fetchPublicProfile(
  handleOrUid: string,
): Promise<UserProfile | null> {
  const uid = await resolveProfileUid(handleOrUid);
  if (!uid) return null;
  const snap = await getDoc(doc(getFirebaseDb(), "publicProfiles", uid));
  if (!snap.exists()) return null;
  return mapCard({ ...snap.data(), uid: snap.id });
}

export async function getSocialRelationship(
  otherUid: string,
): Promise<SocialRelationship> {
  const data = await callCloudFunction<SocialRelationship>(
    "getSocialRelationship",
    { otherUid },
  );
  return {
    status: data.status ?? "none",
    muted: Boolean(data.muted),
    blockedByMe: Boolean(data.blockedByMe),
    isSelf: Boolean(data.isSelf),
  };
}

export async function sendContactRequest(otherUid: string) {
  return callCloudFunction<{ status: SocialRelationshipStatus }>(
    "sendContactRequest",
    { otherUid },
  );
}

export async function acceptContactRequest(otherUid: string) {
  return callCloudFunction<{ status: SocialRelationshipStatus }>(
    "acceptContactRequest",
    { otherUid },
  );
}

export async function declineContactRequest(otherUid: string) {
  return callCloudFunction("declineContactRequest", { otherUid });
}

export async function cancelContactRequest(otherUid: string) {
  return callCloudFunction("cancelContactRequest", { otherUid });
}

export async function removeContact(otherUid: string) {
  return callCloudFunction("removeContact", { otherUid });
}

export async function setBlocked(otherUid: string, blocked: boolean) {
  return callCloudFunction("setBlocked", { otherUid, blocked });
}

export async function setMuted(otherUid: string, muted: boolean) {
  return callCloudFunction("setMuted", { otherUid, muted });
}

export async function listContacts(): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>("listContacts", {});
  return (data?.profiles ?? []).map(mapCard).filter((p) => p.uid);
}

export async function listIncomingContactRequests(): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>("listIncomingContactRequests", {});
  return (data?.profiles ?? []).map(mapCard).filter((p) => p.uid);
}
