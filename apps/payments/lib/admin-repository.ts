import { createAdminRepository } from "@pulse/firebase-web";
import { getFirebaseFunctions } from "./firebase/client";

let cached: ReturnType<typeof createAdminRepository> | null = null;

export function getPaymentsAdminRepository() {
  if (!cached) {
    cached = createAdminRepository(getFirebaseFunctions());
  }
  return cached;
}
