import { parsePublicProfileBadge } from "@pulse/shared";
import { callCloudFunction } from "./call-function";
import { doc, getDoc } from "firebase/firestore";
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

export async function fetchPublicProfile(
  uid: string,
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "publicProfiles", uid));
  if (!snap.exists()) return null;
  return mapCard({ uid: snap.id, ...snap.data() });
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
