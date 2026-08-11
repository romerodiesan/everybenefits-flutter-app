import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "./client";

function isAllowedOrgLogoType(type: string) {
  return (
    type === "image/jpeg" || type === "image/png" || type === "image/webp"
  );
}

/** Upload agency/matrix logo to `org-logos/{orgNodeId}.jpg`. */
export async function uploadOrgLogo(
  orgNodeId: string,
  file: File,
): Promise<string> {
  const id = orgNodeId.trim();
  if (!id) throw new Error("orgNodeId required");
  if (file.size >= 5 * 1024 * 1024) {
    throw new Error("Logo must be under 5MB.");
  }
  if (!isAllowedOrgLogoType(file.type)) {
    throw new Error("Logo must be JPEG, PNG, or WebP.");
  }
  const storageRef = ref(getFirebaseStorage(), `org-logos/${id}.jpg`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
