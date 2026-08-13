import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "./client";

/**
 * Active platform audience for proportional Spotlight (excludes deactivated /
 * pending-deletion accounts). Backed by `platformStats/overview`.
 */
export async function fetchForumAudienceSize(): Promise<number> {
  const snap = await getDoc(doc(getFirebaseDb(), "platformStats", "overview"));
  if (!snap.exists()) return 0;
  const data = snap.data() as Record<string, unknown>;
  const total = Number(data.totalUsers ?? 0) || 0;
  const deactivated = Number(data.deactivated ?? 0) || 0;
  const pendingDeletion = Number(data.pendingDeletion ?? 0) || 0;
  return Math.max(0, total - deactivated - pendingDeletion);
}
