import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, FieldValue, log } from "./admin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.resolve(__dirname, "../../../apps/functions/package.json"),
);

const {
  BUILTIN_ROLE_IDS,
  ALL_PERMISSION_KEYS,
  ROLE_SEED_CONFIG_PATH,
  builtinRoleSeedDoc,
  builtinRoleSeedVersion,
  mergeBuiltinRolePermissions,
} = requireFromFunctions("@pulse/shared");

export async function seedBuiltinRoles(firestore, timestamps, actor = "seed") {
  const version = builtinRoleSeedVersion();
  const refs = BUILTIN_ROLE_IDS.map((id) => firestore.doc(`roles/${id}`));
  const existingSnaps = await Promise.all(refs.map((ref) => ref.get()));
  const batch = firestore.batch();
  let created = 0;
  let updated = 0;

  for (let i = 0; i < BUILTIN_ROLE_IDS.length; i += 1) {
    const id = BUILTIN_ROLE_IDS[i];
    const ref = refs[i];
    const existing = existingSnaps[i];
    const payload = {
      ...builtinRoleSeedDoc(id),
      updatedAt: timestamps.serverTimestamp(),
      updatedBy: actor,
    };
    if (!existing.exists) {
      batch.set(ref, {
        ...payload,
        createdAt: timestamps.serverTimestamp(),
      });
      created += 1;
      continue;
    }
    const current = Array.isArray(existing.data()?.permissions)
      ? existing.data().permissions.map(String)
      : [];
    batch.set(
      ref,
      {
        ...payload,
        permissions: mergeBuiltinRolePermissions(id, current),
      },
      { merge: true },
    );
    updated += 1;
  }

  batch.set(
    firestore.doc(ROLE_SEED_CONFIG_PATH),
    {
      version,
      roleCount: BUILTIN_ROLE_IDS.length,
      permissionCount: ALL_PERMISSION_KEYS.length,
      updatedAt: timestamps.serverTimestamp(),
      updatedBy: actor,
    },
    { merge: true },
  );
  await batch.commit();
  return {
    version,
    created,
    updated,
    permissionCount: ALL_PERMISSION_KEYS.length,
  };
}

export async function seedRoles() {
  const result = await seedBuiltinRoles(db(), FieldValue, "mega-seed");
  log(
    "roles",
    `version=${result.version} created=${result.created} updated=${result.updated} permissions=${result.permissionCount}`,
  );
  return result;
}
