/**
 * Firestore security rules unit tests (Phase 1).
 * Requires emulators: firebase emulators:start --only firestore,auth
 * Or: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(join(__dirname, '../../firestore.rules'), 'utf8');
const PROJECT_ID = 'every-insurance-rules-test';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function authedDb(uid, { provider = 'password', email } = {}) {
  const token = {
    firebase: { sign_in_provider: provider },
  };
  if (email) token.email = email;
  return testEnv.authenticatedContext(uid, token).firestore();
}

function anonDb(uid) {
  return authedDb(uid, { provider: 'anonymous' });
}

async function seedUser(uid, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`users/${uid}`).set({
      uid,
      email: `${uid}@example.com`,
      displayName: uid,
      role: 'student',
      isAnonymous: false,
      profileCompleted: true,
      ...data,
    });
  });
}

describe('users create', () => {
  it('blocks anonymous escalate to agent', async () => {
    const db = anonDb('anon1');
    await assertFails(
      db.doc('users/anon1').set({
        uid: 'anon1',
        role: 'agent',
        isAnonymous: true,
        profileCompleted: true,
      }),
    );
  });

  it('allows anonymous guest bootstrap', async () => {
    const db = anonDb('anon2');
    await assertSucceeds(
      db.doc('users/anon2').set({
        uid: 'anon2',
        role: 'guest',
        isAnonymous: true,
        profileCompleted: true,
      }),
    );
  });

  it('allows registered student create', async () => {
    const db = authedDb('u1', { email: 'u1@example.com' });
    await assertSucceeds(
      db.doc('users/u1').set({
        uid: 'u1',
        role: 'student',
        isAnonymous: false,
        profileCompleted: false,
        displayName: 'Ada',
        email: 'u1@example.com',
      }),
    );
  });

  it('blocks registered agent create', async () => {
    const db = authedDb('u1a', { email: 'u1a@example.com' });
    await assertFails(
      db.doc('users/u1a').set({
        uid: 'u1a',
        role: 'agent',
        isAnonymous: false,
        profileCompleted: false,
        displayName: 'Ada',
        email: 'u1a@example.com',
      }),
    );
  });

  it('blocks owner role self-promotion on update', async () => {
    await seedUser('u2', { role: 'student' });
    const db = authedDb('u2');
    await assertFails(
      db.doc('users/u2').update({ role: 'admin' }),
    );
  });

  it('allows one-time student→agent on profile completion', async () => {
    await seedUser('u3', {
      role: 'student',
      profileCompleted: false,
    });
    const db = authedDb('u3');
    await assertSucceeds(
      db.doc('users/u3').update({
        role: 'agent',
        profileCompleted: true,
        displayName: 'Agent Now',
      }),
    );
  });

  it('blocks agent→student downgrade', async () => {
    await seedUser('u4', { role: 'agent', profileCompleted: true });
    const db = authedDb('u4');
    await assertFails(
      db.doc('users/u4').update({ role: 'student' }),
    );
  });

  it('blocks student→agent after profile is completed', async () => {
    await seedUser('u5', { role: 'student', profileCompleted: true });
    const db = authedDb('u5');
    await assertFails(
      db.doc('users/u5').update({ role: 'agent' }),
    );
  });
});

describe('thread score forge', () => {
  beforeEach(async () => {
    await seedUser('author', { displayName: 'author', role: 'agent' });
    await seedUser('voter', { displayName: 'voter', role: 'agent' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('threads/t1').set({
        authorId: 'author',
        authorName: 'author',
        authorRole: 'agent',
        title: 'Hello',
        body: 'World body long enough',
        tags: ['general'],
        replyCount: 0,
        score: 0,
        acceptedReplyId: null,
      });
    });
  });

  it('blocks forging score by +100', async () => {
    const db = authedDb('voter');
    await assertFails(
      db.doc('threads/t1').update({ score: 100, updatedAt: new Date() }),
    );
  });

  it('allows vote-sized score delta', async () => {
    const db = authedDb('voter');
    await assertSucceeds(
      db.doc('threads/t1').update({ score: 1, updatedAt: new Date() }),
    );
  });

  it('blocks non-author accept reply', async () => {
    const db = authedDb('voter');
    await assertFails(
      db.doc('threads/t1').update({ acceptedReplyId: 'r1', updatedAt: new Date() }),
    );
  });

  it('allows author accept reply', async () => {
    const db = authedDb('author');
    await assertSucceeds(
      db.doc('threads/t1').update({ acceptedReplyId: 'r1', updatedAt: new Date() }),
    );
  });
});

describe('chats moved to Realtime Database', () => {
  it('denies all Firestore chat writes', async () => {
    await seedUser('a', { displayName: 'a', role: 'manager' });
    const db = authedDb('a');
    await assertFails(
      db.doc('chats/any').set({
        memberIds: ['a', 'b'],
        isGroup: false,
        createdBy: 'a',
        lastMessage: '',
      }),
    );
  });
});
