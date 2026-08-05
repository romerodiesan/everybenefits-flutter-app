import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { updateProfile, type User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "./client";
import { listPublicProfiles } from "./functions";
import type { UserProfile } from "../types";
import { DEFAULT_AGENCY } from "../types";
import { composeUsAddress, headlineName, parseRole } from "../roles";
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const fn = (value as { toDate: () => Date }).toDate;
    if (typeof fn === "function") return fn.call(value);
  }
  return null;
}

export function profileFromData(
  uid: string,
  data: Record<string, unknown>,
): UserProfile {
  return {
    uid: (data.uid as string) ?? uid,
    email: (data.email as string) ?? null,
    displayName: (data.displayName as string) ?? null,
    photoUrl: (data.photoUrl as string) ?? null,
    role: parseRole(data.role),
    isAnonymous: Boolean(data.isAnonymous),
    profileCompleted: (data.profileCompleted as boolean) ?? true,
    phoneCountryCode: (data.phoneCountryCode as string) ?? null,
    phoneNumber: (data.phoneNumber as string) ?? null,
    npn: (data.npn as string) ?? null,
    address: (data.address as string) ?? null,
    addressStreet: (data.addressStreet as string) ?? null,
    addressApt: (data.addressApt as string) ?? null,
    addressCity: (data.addressCity as string) ?? null,
    addressState: (data.addressState as string) ?? null,
    addressZip: (data.addressZip as string) ?? null,
    agency: (data.agency as string) ?? null,
    orgNodeId: (data.orgNodeId as string) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    accountStatus:
      data.accountStatus === "deactivated" ||
      data.accountStatus === "pendingDeletion"
        ? data.accountStatus
        : "active",
    deletionScheduledAt: toDate(data.deletionScheduledAt),
    approvalStatus:
      data.approvalStatus === "pending" ||
      data.approvalStatus === "approved" ||
      data.approvalStatus === "rejected"
        ? data.approvalStatus
        : undefined,
    appearance: appearanceFrom(data.appearance),
  };
}

function appearanceFrom(
  raw: unknown,
): UserProfile["appearance"] {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const theme = data.theme;
  const accent = data.accent;
  if (
    (theme === "system" || theme === "light" || theme === "dark") &&
    typeof accent === "string"
  ) {
    return { theme, accent };
  }
  return null;
}

export async function ensureProfile(user: User): Promise<UserProfile> {
  const refDoc = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(refDoc);
  if (snap.exists()) {
    return profileFromData(user.uid, snap.data() as Record<string, unknown>);
  }

  const isAnonymous = user.isAnonymous;
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    role: isAnonymous ? "guest" : "student",
    isAnonymous,
    profileCompleted: isAnonymous,
    phoneCountryCode: null,
    phoneNumber: null,
    npn: null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: isAnonymous ? null : DEFAULT_AGENCY,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvalStatus: isAnonymous ? "approved" : "pending",
  };

  await setDoc(refDoc, {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    role: profile.role,
    isAnonymous: profile.isAnonymous,
    profileCompleted: profile.profileCompleted,
    phoneCountryCode: null,
    phoneNumber: null,
    npn: null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: profile.agency,
    approvalStatus: profile.approvalStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export function watchProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "users", uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(profileFromData(uid, snap.data() as Record<string, unknown>));
    },
    (error) => onError?.(error),
  );
}

export async function updateUserProfile(
  profile: UserProfile,
  patch: Partial<UserProfile>,
): Promise<void> {
  const next = { ...profile, ...patch };
  const address =
    composeUsAddress({
      street: next.addressStreet,
      apt: next.addressApt,
      city: next.addressCity,
      state: next.addressState,
      zip: next.addressZip,
    }) ?? next.address;

  await updateDoc(doc(getFirebaseDb(), "users", profile.uid), {
    email: next.email,
    displayName: next.displayName,
    photoUrl: next.photoUrl,
    role: next.role,
    isAnonymous: next.isAnonymous,
    profileCompleted: next.profileCompleted,
    phoneCountryCode: next.phoneCountryCode,
    phoneNumber: next.phoneNumber,
    npn: next.npn,
    address,
    addressStreet: next.addressStreet,
    addressApt: next.addressApt,
    addressCity: next.addressCity,
    addressState: next.addressState,
    addressZip: next.addressZip,
    agency: next.agency,
    updatedAt: serverTimestamp(),
  });

  // Keep Firebase Auth in sync for fields that also live on the Auth user.
  if ("displayName" in patch || "photoUrl" in patch) {
    const authUser = getFirebaseAuth().currentUser;
    if (authUser && authUser.uid === profile.uid) {
      await updateProfile(authUser, {
        ...("displayName" in patch
          ? { displayName: next.displayName?.trim() || null }
          : {}),
        ...("photoUrl" in patch ? { photoURL: next.photoUrl || null } : {}),
      });
    }
  }
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), `avatars/${uid}.jpg`);
  const contentType =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
      ? file.type
      : "image/jpeg";
  await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(storageRef);
}

export async function listDirectory(excludeUid?: string, max = 80) {
  const profiles = await listPublicProfiles(max + (excludeUid ? 1 : 0));
  return profiles
    .filter((p) => p.uid !== excludeUid && p.role !== "guest")
    .slice(0, max)
    .sort((a, b) =>
      headlineName(a).toLowerCase().localeCompare(headlineName(b).toLowerCase()),
    );
}

export { headlineName };
