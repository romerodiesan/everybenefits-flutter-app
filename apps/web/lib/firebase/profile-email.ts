import {
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@pulse/firebase-client";

function requireUser(): User {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user;
}

/**
 * Sends a verification link to the new email. After the user confirms,
 * Auth.email updates; callers should sync Firestore on next refresh.
 */
export async function startEmailChange(newEmail: string): Promise<void> {
  const user = requireUser();
  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Invalid email");
  }
  await verifyBeforeUpdateEmail(user, email);
}
