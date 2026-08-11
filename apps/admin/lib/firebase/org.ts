import { getAdminRepository } from "@/lib/repositories/admin-repository";

function isAllowedOrgLogoType(type: string) {
  return (
    type === "image/jpeg" || type === "image/png" || type === "image/webp"
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read logo file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload agency/matrix logo via trusted callable (Admin SDK).
 * Avoids client Storage rules that depend on firestore.get() (often 403).
 */
export async function uploadOrgLogo(
  orgNodeId: string,
  file: File,
): Promise<string> {
  const id = orgNodeId.trim();
  if (!id) throw new Error("orgNodeId required");
  if (file.size >= 5 * 1024 * 1024) {
    throw new Error("Logo must be under 5MB.");
  }
  const contentType = isAllowedOrgLogoType(file.type)
    ? file.type
    : "image/jpeg";
  if (!isAllowedOrgLogoType(contentType)) {
    throw new Error("Logo must be JPEG, PNG, or WebP.");
  }

  const bytesBase64 = await fileToBase64(file);
  const result = await getAdminRepository().uploadOrgLogo({
    orgNodeId: id,
    contentType,
    bytesBase64,
  });
  if (!result?.downloadUrl) {
    throw new Error("Logo upload failed.");
  }
  return result.downloadUrl;
}
