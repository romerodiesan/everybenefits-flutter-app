/**
 * Storage security rules tests.
 * Requires the Storage emulator on 127.0.0.1:9199.
 *
 * Cross-service `firestore.get()` / `firestore.exists()` in storage.rules are
 * not evaluated by the Storage emulator (Firebase limitation). Tests below
 * cover paths the emulator can enforce: unauthenticated access and the
 * Admin-SDK-only write denials (`allow write: if false`).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_RULES = readFileSync(join(__dirname, "../../storage.rules"), "utf8");
const PROJECT_ID = "every-insurance-storage-rules-test";
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: STORAGE_RULES, host: "127.0.0.1", port: 9199 },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

function authedStorage(uid, { provider = "password" } = {}) {
  return testEnv
    .authenticatedContext(uid, {
      firebase: { sign_in_provider: provider },
    })
    .storage();
}

function unauthedStorage() {
  return testEnv.unauthenticatedContext().storage();
}

describe("unauthenticated", () => {
  it("denies reads and writes without auth", async () => {
    const storage = unauthedStorage();
    await assertFails(getBytes(ref(storage, "avatars/alice.jpg")));
    await assertFails(
      uploadBytes(ref(storage, "avatars/alice.jpg"), JPEG, {
        contentType: "image/jpeg",
      }),
    );
    await assertFails(getBytes(ref(storage, "org-logos/agency1.jpg")));
    await assertFails(getBytes(ref(storage, "courses/c1/cover.jpg")));
  });
});

describe("org-logos and banners (Admin SDK writes only)", () => {
  it("denies client writes to org-logos even when signed in", async () => {
    const storage = authedStorage("admin1");
    await assertFails(
      uploadBytes(ref(storage, "org-logos/agency1.jpg"), JPEG, {
        contentType: "image/jpeg",
      }),
    );
  });

  it("denies client writes to promo banner objects", async () => {
    const storage = authedStorage("admin1");
    await assertFails(
      uploadBytes(ref(storage, "banners/b1/cover.jpg"), JPEG, {
        contentType: "image/jpeg",
      }),
    );
  });
});

describe("avatars", () => {
  it("denies writing another user's avatar path", async () => {
    const storage = authedStorage("alice");
    await assertFails(
      uploadBytes(ref(storage, "avatars/bob.jpg"), JPEG, {
        contentType: "image/jpeg",
      }),
    );
  });

  it("denies deleting without auth", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), "avatars/alice.jpg"), JPEG, {
        contentType: "image/jpeg",
      });
    });
    await assertFails(deleteObject(ref(unauthedStorage(), "avatars/alice.jpg")));
  });
});
