import type { DocumentData } from "firebase-admin/firestore";

export function headlineName(data: DocumentData | undefined): string {
  const display =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  if (display) return display;
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (email) return email;
  return "Usuario";
}

export function isUserApprovedForJoin(data: DocumentData | undefined) {
  if (!data || data.isAnonymous === true) return false;
  const status = String(data.approvalStatus ?? "approved");
  return status === "approved";
}
