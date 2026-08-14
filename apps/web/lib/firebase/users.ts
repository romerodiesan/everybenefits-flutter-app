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
import { mapUserProfile, toDate } from "@pulse/firebase-web";
import { userSearchIndexFields } from "@pulse/shared";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "./client";
import { listPublicProfiles, searchDirectory as searchDirectoryFn } from "./functions";
import type { UserProfile } from "../types";
import { DEFAULT_AGENCY } from "../types";
import { headlineName } from "../display-name";
import { composeUsAddress } from "../us-address";
import { parseApprovalStatus } from "../roles";
import { readPrivacyPrefs } from "../privacy/prefs";

export function profileFromData(
  uid: string,
  data: Record<string, unknown>,
): UserProfile {
  const mapped = mapUserProfile(uid, data);
  return {
    ...mapped,
    productTourVersion:
      typeof data.productTourVersion === "number"
        ? data.productTourVersion
        : Number(data.productTourVersion) || 0,
    phoneVerified: Boolean(data.phoneVerified),
    deletionScheduledAt: toDate(data.deletionScheduledAt),
    approvalStatus: parseApprovalStatus(data.approvalStatus) ?? undefined,
    appearance: appearanceFrom(data.appearance),
    privacy: readPrivacyPrefs(data.privacy),
  };
}

function appearanceFrom(
  raw: unknown,
): UserProfile["appearance"] {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const theme = data.theme;
  const accent = data.accent;
  if (theme !== "system" && theme !== "light" && theme !== "dark") {
    return null;
  }
  return {
    theme,
    accent: typeof accent === "string" && accent ? accent : "green",
  };
}

export async function ensureProfile(user: User): Promise<UserProfile> {
  const refDoc = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(refDoc);
  if (snap.exists()) {
    const data = snap.data() as Record<string, unknown>;
    const profile = profileFromData(user.uid, data);
    const search = userSearchIndexFields(profile.displayName, profile.email);
    const tokens = Array.isArray(data.nameTokens)
      ? data.nameTokens.map(String)
      : [];
    const needsSearchBackfill =
      data.displayNameLower !== search.displayNameLower ||
      data.emailLower !== search.emailLower ||
      JSON.stringify(tokens) !== JSON.stringify(search.nameTokens);
    if (needsSearchBackfill) {
      await updateDoc(refDoc, {
        ...search,
        updatedAt: serverTimestamp(),
      });
    }
    return profile;
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
    productTourVersion: 0,
    phoneCountryCode: null,
    phoneNumber: null,
    phoneVerified: false,
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
    ...userSearchIndexFields(profile.displayName, profile.email),
    photoUrl: profile.photoUrl,
    role: profile.role,
    isAnonymous: profile.isAnonymous,
    profileCompleted: profile.profileCompleted,
    productTourVersion: 0,
    phoneCountryCode: null,
    phoneNumber: null,
    phoneVerified: false,
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

const EDITABLE_PROFILE_KEYS = [
  "displayName",
  "photoUrl",
  "profileCompleted",
  "productTourVersion",
  "phoneCountryCode",
  "phoneNumber",
  "phoneVerified",
  "npn",
  "addressStreet",
  "addressApt",
  "addressCity",
  "addressState",
  "addressZip",
  "agency",
  "bio",
  "privacy",
  "role",
] as const satisfies readonly (keyof UserProfile)[];

type EditableProfileKey = (typeof EDITABLE_PROFILE_KEYS)[number];

const ADDRESS_PATCH_KEYS = [
  "addressStreet",
  "addressApt",
  "addressCity",
  "addressState",
  "addressZip",
] as const satisfies readonly EditableProfileKey[];

export async function updateUserProfile(
  profile: UserProfile,
  patch: Partial<UserProfile>,
): Promise<void> {
  const data: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  for (const key of EDITABLE_PROFILE_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (key === "productTourVersion") {
      data[key] = Number(value ?? 0);
    } else if (key === "phoneVerified") {
      data[key] = Boolean(value);
    } else if (key === "displayName") {
      const fields = userSearchIndexFields(
        typeof value === "string" ? value : null,
        profile.email,
      );
      data.displayName = fields.displayName;
      data.displayNameLower = fields.displayNameLower;
      data.nameTokens = fields.nameTokens;
      data.emailLower = fields.emailLower;
    } else {
      data[key] = value;
    }
  }

  const addressTouched = ADDRESS_PATCH_KEYS.some((key) => key in patch);
  if (addressTouched) {
    const next = { ...profile, ...patch };
    data.address =
      composeUsAddress({
        street: next.addressStreet,
        apt: next.addressApt,
        city: next.addressCity,
        state: next.addressState,
        zip: next.addressZip,
      }) ?? next.address;
  }

  const authUser = getFirebaseAuth().currentUser;
  if (
    ("displayName" in patch || "photoUrl" in patch) &&
    (!authUser || authUser.uid !== profile.uid)
  ) {
    throw new Error("Signed-in user required to update Auth profile fields.");
  }

  // Keep Firebase Auth + Firestore users/{uid} in lockstep for identity fields.
  const authPatch =
    authUser && ("displayName" in patch || "photoUrl" in patch)
      ? updateProfile(authUser, {
          ...("displayName" in patch
            ? {
                displayName:
                  typeof patch.displayName === "string"
                    ? patch.displayName.trim() || null
                    : null,
              }
            : {}),
          ...("photoUrl" in patch
            ? { photoURL: patch.photoUrl || null }
            : {}),
        })
      : Promise.resolve();

  await Promise.all([
    updateDoc(doc(getFirebaseDb(), "users", profile.uid), data),
    authPatch,
  ]);
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), `avatars/${uid}.jpg`);
  const contentType = isAllowedAvatarType(file.type)
    ? file.type
    : "image/jpeg";
  await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(storageRef);
}

function isAllowedAvatarType(type: string) {
  return (
    type === "image/jpeg" || type === "image/png" || type === "image/webp"
  );
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

export async function searchDirectoryContacts(query: string, max = 40) {
  return searchDirectoryFn(query, max);
}
