/**
 * Auto-seeds built-in `roles/{id}` docs when a new Functions version boots.
 * Catalog changes bump `builtinRoleSeedVersion()` so missing permission keys
 * land in every environment without a manual Admin action.
 */
import { onInit } from "firebase-functions/v2/core";
import { ensureBuiltinRolesSeeded } from "./role-management";

onInit(async () => {
  try {
    const result = await ensureBuiltinRolesSeeded(null);
    if (result.seeded) {
      console.log(`[role-seed] seeded builtin roles version=${result.version}`);
    }
  } catch (error) {
    console.error("[role-seed] failed to ensure builtin roles", error);
  }
});
