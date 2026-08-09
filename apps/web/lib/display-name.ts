/** Display name for UI chrome (profile / chats / forums). */
export function headlineName(profile: {
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
}) {
  if (profile.displayName?.trim()) return profile.displayName.trim();
  if (profile.email) return profile.email;
  return profile.isAnonymous ? "Guest" : "User";
}
