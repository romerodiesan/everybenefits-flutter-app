import {
  createAdminRepository,
  type AdminRepository,
} from "@pulse/firebase-web";
import { getFirebaseFunctions } from "../firebase/client";

let cached: AdminRepository | null = null;

export function getAdminRepository(): AdminRepository {
  if (!cached) {
    cached = createAdminRepository(getFirebaseFunctions());
  }
  return cached;
}
