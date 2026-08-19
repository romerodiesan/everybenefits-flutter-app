/**
 * Realtime Database security rules tests via the emulator REST API.
 * Requires the database emulator on 127.0.0.1:9000.
 *
 * @firebase/rules-unit-testing v4 still calls the compat `app.database()`
 * API, which Firebase JS SDK 11 does not attach in Node. Rules are loaded
 * through initializeTestEnvironment; reads/writes go through REST so we do
 * not need the compat SDK.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(join(__dirname, "../../database.rules.json"), "utf8");
const PROJECT_ID = "every-insurance-rtdb-rules-test";
const RTDB = "http://127.0.0.1:9000";

let testEnv;

function mockIdToken(uid, provider = "password") {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      iat: now,
      exp: now + 3600,
      auth_time: now,
      sub: uid,
      user_id: uid,
      uid,
      provider_id: provider,
      firebase: {
        identities: {},
        sign_in_provider: provider,
      },
    }),
  ).toString("base64url");
  return `${header}.${payload}.`;
}

function rtdbUrl(path, { auth, owner = false } = {}) {
  const url = new URL(`${RTDB}/${String(path).replace(/^\/+/, "")}.json`);
  url.searchParams.set("ns", PROJECT_ID);
  if (auth) url.searchParams.set("auth", mockIdToken(auth.uid, auth.provider));
  return { url, headers: owner ? { Authorization: "Bearer owner" } : {} };
}

async function rtdbRequest(path, { method = "GET", body, auth, owner = false } = {}) {
  const { url, headers } = rtdbUrl(path, { auth, owner });
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function userAuth(uid, provider = "password") {
  return {
    uid,
    provider,
    token: { firebase: { sign_in_provider: provider } },
  };
}

async function seed(path, value) {
  const res = await rtdbRequest(path, { method: "PUT", body: value, owner: true });
  assert.equal(res.ok, true, `seed ${path} failed: ${res.status}`);
}

async function clearDb() {
  const res = await rtdbRequest("", { method: "PUT", body: null, owner: true });
  assert.equal(res.ok, true, `clear failed: ${res.status}`);
}

function expectOk(res) {
  assert.ok(res.ok, `expected 2xx, got ${res.status}`);
}

function expectDenied(res) {
  assert.ok(
    res.status === 401 || res.status === 403,
    `expected 401/403, got ${res.status}`,
  );
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { rules: RULES, host: "127.0.0.1", port: 9000 },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await clearDb();
  await seed("chatAccess", { alice: true, bob: true, eve: true });
});

describe("chats and messages", () => {
  it("allows a member to read an existing chat", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: false,
      dmMessagingEnabled: true,
    });
    expectOk(
      await rtdbRequest("chats/c1", { auth: userAuth("alice") }),
    );
  });

  it("blocks a non-member from reading an existing chat", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: false,
      dmMessagingEnabled: true,
    });
    expectDenied(
      await rtdbRequest("chats/c1", { auth: userAuth("eve") }),
    );
  });

  it("blocks a member whose live chat permission was revoked", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: false,
      dmMessagingEnabled: true,
    });
    await seed("chatAccess/alice", false);
    expectDenied(
      await rtdbRequest("chats/c1", { auth: userAuth("alice") }),
    );
    expectDenied(
      await rtdbRequest("messages/c1/m1", {
        method: "PUT",
        auth: userAuth("alice"),
        body: {
          senderId: "alice",
          body: "blocked",
          senderName: "Alice",
          createdAt: Date.now(),
        },
      }),
    );
  });

  it("allows a member to post a message as themselves", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: false,
      dmMessagingEnabled: true,
    });
    expectOk(
      await rtdbRequest("messages/c1/m1", {
        method: "PUT",
        auth: userAuth("alice"),
        body: {
          senderId: "alice",
          body: "hello",
          senderName: "Alice",
          createdAt: Date.now(),
        },
      }),
    );
  });

  it("blocks posting as another member", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: false,
      dmMessagingEnabled: true,
    });
    expectDenied(
      await rtdbRequest("messages/c1/m1", {
        method: "PUT",
        auth: userAuth("alice"),
        body: {
          senderId: "bob",
          body: "spoof",
          senderName: "Bob",
          createdAt: Date.now(),
        },
      }),
    );
  });

  it("blocks client writes to the chat document itself", async () => {
    expectDenied(
      await rtdbRequest("chats/c1", {
        method: "PUT",
        auth: userAuth("alice"),
        body: { members: { alice: true }, isGroup: true },
      }),
    );
  });

  it("lets a member hide a message only for themselves", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: true,
    });
    expectOk(
      await rtdbRequest("hiddenMessages/alice/c1/m1", {
        method: "PUT",
        auth: userAuth("alice"),
        body: true,
      }),
    );
    expectDenied(
      await rtdbRequest("hiddenMessages/bob/c1/m1", {
        method: "PUT",
        auth: userAuth("alice"),
        body: true,
      }),
    );
  });

  it("keeps message deletion server-only", async () => {
    await seed("chats/c1", {
      members: { alice: true, bob: true },
      isGroup: true,
    });
    await seed("messages/c1/m1", {
      senderId: "alice",
      body: "hello",
      senderName: "Alice",
      createdAt: Date.now(),
    });
    expectDenied(
      await rtdbRequest("messages/c1/m1", {
        method: "DELETE",
        auth: userAuth("alice"),
      }),
    );
  });
});

describe("online and presence", () => {
  it("lets a non-anonymous member read the online index", async () => {
    await seed("online/bob", true);
    expectOk(await rtdbRequest("online", { auth: userAuth("alice") }));
  });

  it("blocks anonymous from reading the online index", async () => {
    expectDenied(
      await rtdbRequest("online", { auth: userAuth("anon1", "anonymous") }),
    );
  });

  it("lets a user set their own online flag", async () => {
    expectOk(
      await rtdbRequest("online/alice", {
        method: "PUT",
        auth: userAuth("alice"),
        body: true,
      }),
    );
  });

  it("blocks setting someone else's online flag", async () => {
    expectDenied(
      await rtdbRequest("online/bob", {
        method: "PUT",
        auth: userAuth("alice"),
        body: true,
      }),
    );
  });

  it("lets a user write their own presence and not others", async () => {
    expectOk(
      await rtdbRequest("presence/alice/web", {
        method: "PUT",
        auth: userAuth("alice"),
        body: { at: Date.now() },
      }),
    );
    expectDenied(
      await rtdbRequest("presence/bob/web", {
        method: "PUT",
        auth: userAuth("alice"),
        body: { at: Date.now() },
      }),
    );
  });
});

describe("autoJoinGroups", () => {
  it("denies client reads and writes", async () => {
    expectDenied(await rtdbRequest("autoJoinGroups", { auth: userAuth("alice") }));
    expectDenied(
      await rtdbRequest("autoJoinGroups/agent", {
        method: "PUT",
        auth: userAuth("alice"),
        body: ["chat1"],
      }),
    );
  });
});
