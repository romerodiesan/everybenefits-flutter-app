/**
 * Ensures the signed-in staff member is in the default community RTDB chat.
 * Soft no-op when Cloud Functions / emulator are unavailable.
 */
export async function ensureDefaultAgentGroup(uid?: string) {
  try {
    const { callCloudFunction } = await import("@pulse/firebase-client");
    await callCloudFunction("ensureDefaultAgentGroup", uid ? { uid } : {});
  } catch {
    // Soft no-op: function not deployed / emulator down / staff-only.
  }
}
