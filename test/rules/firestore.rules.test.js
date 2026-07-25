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

describe('academy catalog', () => {
  async function seedCourse(id, data) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`courses/${id}`).set({
        title: `Course ${id}`,
        description: 'Body',
        teacherName: 'Elena',
        level: 'basic',
        status: 'draft',
        lessonCount: 2,
        durationMinutes: 60,
        studentCount: 0,
        createdBy: 'manager1',
        ...data,
      });
    });
  }

  const courseDraft = (createdBy) => ({
    title: 'Nuevo curso',
    description: '',
    teacherName: '',
    level: 'basic',
    status: 'draft',
    lessonCount: 0,
    durationMinutes: 0,
    studentCount: 0,
    createdBy,
  });

  beforeEach(async () => {
    await seedUser('student1', { role: 'agent' });
    await seedUser('manager1', { role: 'manager' });
    await seedUser('manager2', { role: 'manager' });
    await seedUser('admin1', { role: 'admin' });
  });

  it('hides drafts from learners but shows them to their author', async () => {
    await seedCourse('draft1', { status: 'draft', createdBy: 'manager1' });

    await assertFails(authedDb('student1').doc('courses/draft1').get());
    await assertSucceeds(authedDb('manager1').doc('courses/draft1').get());
    await assertSucceeds(authedDb('admin1').doc('courses/draft1').get());
  });

  it('lets any signed-in user read published courses', async () => {
    await seedCourse('pub1', { status: 'published', createdBy: 'manager1' });
    await assertSucceeds(authedDb('student1').doc('courses/pub1').get());
  });

  it('only lets managers and admins create courses', async () => {
    await assertFails(
      authedDb('student1').doc('courses/new1').set(courseDraft('student1')),
    );
    await assertSucceeds(
      authedDb('manager1').doc('courses/new2').set(courseDraft('manager1')),
    );
  });

  it('blocks a manager from self-publishing on create', async () => {
    await assertFails(
      authedDb('manager1').doc('courses/new3').set({
        ...courseDraft('manager1'),
        status: 'published',
      }),
    );
  });

  it('lets an author submit for review but never publish', async () => {
    await seedCourse('mine', { status: 'draft', createdBy: 'manager1' });
    const db = authedDb('manager1');

    await assertSucceeds(
      db.doc('courses/mine').update({ status: 'pending', title: 'Mine' }),
    );
    await assertFails(
      db.doc('courses/mine').update({ status: 'published', title: 'Mine' }),
    );
  });

  it('lets an admin publish and send back to draft', async () => {
    await seedCourse('review', { status: 'pending', createdBy: 'manager1' });
    const db = authedDb('admin1');

    await assertSucceeds(db.doc('courses/review').update({ status: 'published' }));
    await assertSucceeds(db.doc('courses/review').update({ status: 'draft' }));
  });

  it('blocks editing courses owned by someone else', async () => {
    await seedCourse('theirs', { status: 'draft', createdBy: 'manager1' });
    await assertFails(
      authedDb('manager2').doc('courses/theirs').update({ title: 'Hijack' }),
    );
  });

  it('blocks the author from editing a published course', async () => {
    await seedCourse('live', { status: 'published', createdBy: 'manager1' });
    await assertFails(
      authedDb('manager1').doc('courses/live').update({ title: 'Changed' }),
    );
  });

  it('allows a +1 student count bump but not forging it', async () => {
    await seedCourse('pub2', { status: 'published', createdBy: 'manager1' });
    const db = authedDb('student1');

    await assertSucceeds(
      db.doc('courses/pub2').update({ studentCount: 1, updatedAt: new Date() }),
    );
    await assertFails(
      db.doc('courses/pub2').update({
        studentCount: 500,
        updatedAt: new Date(),
      }),
    );
  });

  it('restricts deletes to admins and unpublished authors', async () => {
    await seedCourse('delDraft', { status: 'draft', createdBy: 'manager1' });
    await seedCourse('delLive', { status: 'published', createdBy: 'manager1' });

    await assertFails(authedDb('manager1').doc('courses/delLive').delete());
    await assertSucceeds(authedDb('manager1').doc('courses/delDraft').delete());
    await assertSucceeds(authedDb('admin1').doc('courses/delLive').delete());
  });

  it('scopes lesson writes to the course author', async () => {
    await seedCourse('withLessons', { status: 'draft', createdBy: 'manager1' });
    const lesson = {
      moduleId: 'm1',
      title: 'Intro',
      order: 0,
      durationSeconds: 60,
    };

    await assertFails(
      authedDb('manager2').doc('courses/withLessons/lessons/l1').set(lesson),
    );
    await assertSucceeds(
      authedDb('manager1').doc('courses/withLessons/lessons/l1').set(lesson),
    );
    await assertSucceeds(
      authedDb('manager1').doc('courses/withLessons/lessons/l1').get(),
    );
    await assertFails(
      authedDb('student1').doc('courses/withLessons/lessons/l1').get(),
    );
  });

  it('lets learners read lessons of published courses', async () => {
    await seedCourse('openCourse', {
      status: 'published',
      createdBy: 'manager1',
    });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('courses/openCourse/lessons/l1').set({
        moduleId: 'm1',
        title: 'Intro',
        order: 0,
        durationSeconds: 60,
      });
    });

    await assertSucceeds(
      authedDb('student1').doc('courses/openCourse/lessons/l1').get(),
    );
  });

  it('hides quiz answer keys from learners', async () => {
    await seedCourse('quizCourse', {
      status: 'published',
      createdBy: 'manager1',
    });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('courses/quizCourse/lessons/q1').set({
        moduleId: 'm1',
        title: 'Quiz',
        order: 0,
        durationSeconds: 90,
        type: 'quiz',
        passPercent: 70,
        questions: [
          {
            id: 'q1',
            prompt: 'Pick one',
            selectionMode: 'single',
            options: ['A', 'B'],
          },
        ],
      });
      await ctx
        .firestore()
        .doc('courses/quizCourse/lessons/q1/secure/answerKey')
        .set({ answers: { q1: [0] } });
    });

    const keyDoc = (uid) =>
      authedDb(uid).doc('courses/quizCourse/lessons/q1/secure/answerKey');

    // The question itself stays public so learners can answer it.
    await assertSucceeds(
      authedDb('student1').doc('courses/quizCourse/lessons/q1').get(),
    );
    await assertFails(keyDoc('student1').get());
    await assertFails(keyDoc('manager2').get());
    await assertSucceeds(keyDoc('manager1').get());
    await assertSucceeds(keyDoc('admin1').get());
  });

  it('lets the author write the answer key until the course is published', async () => {
    await seedCourse('keyDraft', { status: 'draft', createdBy: 'manager1' });
    await seedCourse('keyLive', { status: 'published', createdBy: 'manager1' });
    const key = { answers: { q1: [0, 2] } };

    await assertSucceeds(
      authedDb('manager1')
        .doc('courses/keyDraft/lessons/q1/secure/answerKey')
        .set(key),
    );
    await assertFails(
      authedDb('manager2')
        .doc('courses/keyDraft/lessons/q1/secure/answerKey')
        .set(key),
    );
    await assertFails(
      authedDb('student1')
        .doc('courses/keyDraft/lessons/q1/secure/answerKey')
        .set(key),
    );
    // Published courses are frozen for their author; admins still may edit.
    await assertFails(
      authedDb('manager1')
        .doc('courses/keyLive/lessons/q1/secure/answerKey')
        .set(key),
    );
    await assertSucceeds(
      authedDb('admin1')
        .doc('courses/keyLive/lessons/q1/secure/answerKey')
        .set(key),
    );
  });

  it('stops learners from forging quiz scores on their enrollment', async () => {
    const enrollment = {
      courseId: 'pub1',
      completedLessonIds: [],
      lastLessonId: null,
      lastPositionSeconds: 0,
    };
    const db = authedDb('student1');

    // A fresh enrollment cannot arrive with attempts already graded.
    await assertFails(
      db.doc('users/student1/enrollments/graded').set({
        ...enrollment,
        courseId: 'graded',
        quizAttempts: { q1: { score: 100, passed: true } },
      }),
    );

    await assertSucceeds(
      db.doc('users/student1/enrollments/pub1').set(enrollment),
    );
    await assertFails(
      db.doc('users/student1/enrollments/pub1').update({
        quizAttempts: { q1: { score: 100, passed: true } },
      }),
    );
    // Ordinary progress writes still go through.
    await assertSucceeds(
      db.doc('users/student1/enrollments/pub1').update({
        completedLessonIds: ['l1'],
        lastPositionSeconds: 12,
      }),
    );
  });

  it('lets managers draft learning paths and keeps publish for admins', async () => {
    const draft = {
      title: 'Ruta nueva',
      description: 'Para agentes',
      level: 'basic',
      status: 'draft',
      courseIds: ['pub1'],
      order: 0,
      createdBy: 'manager1',
    };

    await assertSucceeds(authedDb('manager1').doc('paths/p1').set(draft));
    await assertSucceeds(authedDb('manager1').doc('paths/p1').get());
    await assertFails(authedDb('student1').doc('paths/p1').get());

    await assertFails(
      authedDb('manager1')
        .doc('paths/p1')
        .update({ status: 'published' }),
    );
    await assertSucceeds(
      authedDb('manager1')
        .doc('paths/p1')
        .update({
          ...draft,
          status: 'pending',
          courseIds: ['pub1', 'pub2'],
        }),
    );

    await assertFails(
      authedDb('manager2').doc('paths/p1').update({ title: 'Hijack' }),
    );

    await assertSucceeds(
      authedDb('admin1').doc('paths/p1').update({ status: 'published' }),
    );
    await assertSucceeds(authedDb('student1').doc('paths/p1').get());
  });

  it('stops managers from creating published paths directly', async () => {
    await assertFails(
      authedDb('manager1').doc('paths/p2').set({
        title: 'Skip review',
        description: '',
        level: 'basic',
        status: 'published',
        courseIds: [],
        order: 0,
        createdBy: 'manager1',
      }),
    );
    await assertSucceeds(
      authedDb('admin1').doc('paths/p2').set({
        title: 'Admin path',
        description: '',
        level: 'basic',
        status: 'published',
        courseIds: [],
        order: 0,
        createdBy: 'admin1',
      }),
    );
  });

  it('lets authors delete their unpublished paths', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('paths/p3').set({
        title: 'Borrador',
        description: '',
        level: 'basic',
        status: 'draft',
        courseIds: [],
        order: 0,
        createdBy: 'manager1',
      });
      await ctx.firestore().doc('paths/p4').set({
        title: 'Publicada',
        description: '',
        level: 'basic',
        status: 'published',
        courseIds: [],
        order: 0,
        createdBy: 'manager1',
      });
    });

    await assertSucceeds(authedDb('manager1').doc('paths/p3').delete());
    await assertFails(authedDb('manager1').doc('paths/p4').delete());
    await assertSucceeds(authedDb('admin1').doc('paths/p4').delete());
  });

  it('owns its enrollment and rejects negative positions', async () => {
    const enrollment = {
      courseId: 'pub1',
      completedLessonIds: [],
      lastLessonId: null,
      lastPositionSeconds: 0,
    };

    await assertSucceeds(
      authedDb('student1')
        .doc('users/student1/enrollments/pub1')
        .set(enrollment),
    );
    await assertFails(
      authedDb('student1')
        .doc('users/student1/enrollments/pub1')
        .set({ ...enrollment, lastPositionSeconds: -5 }),
    );
    await assertFails(
      authedDb('manager1')
        .doc('users/student1/enrollments/pub1')
        .set(enrollment),
    );
  });

  it('exposes enrollment metrics to the course author and admins', async () => {
    await seedCourse('metrics', { status: 'published', createdBy: 'manager1' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('users/student1/enrollments/metrics').set({
        courseId: 'metrics',
        completedLessonIds: [],
        lastLessonId: null,
        lastPositionSeconds: 0,
      });
    });

    const query = (db) =>
      db.collectionGroup('enrollments').where('courseId', '==', 'metrics');

    await assertSucceeds(query(authedDb('manager1')).get());
    await assertSucceeds(query(authedDb('admin1')).get());
    await assertFails(query(authedDb('manager2')).get());
    await assertFails(query(authedDb('student1')).get());
  });
});

describe('pulse ai storage', () => {
  beforeEach(async () => {
    await seedUser('student1', { role: 'student' });
    await seedUser('student2', { role: 'student' });
    await seedUser('admin1', { role: 'admin' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc('users/student1/aiConversations/c1').set({
        uid: 'student1',
        title: 'Medicare basics',
        locale: 'en',
        createdAt: new Date(),
      });
      await db.doc('users/student1/aiConversations/c1/messages/m1').set({
        role: 'assistant',
        text: 'Medicare Part B covers outpatient care.',
        sources: [],
      });
      await db.doc('users/student1/aiUsage/2026-07-25').set({ day: 3 });
      await db.doc('aiKnowledgeChunks/k1').set({ group: 'academy', content: 'x' });
      await db.doc('aiRuns/r1').set({ surface: 'web', latencyMs: 10 });
    });
  });

  it('lets the owner read and delete their transcript but never write it', async () => {
    const owner = authedDb('student1');
    await assertSucceeds(owner.doc('users/student1/aiConversations/c1').get());
    await assertSucceeds(
      owner.doc('users/student1/aiConversations/c1/messages/m1').get(),
    );
    await assertFails(
      owner.doc('users/student1/aiConversations/c1/messages/m2').set({
        role: 'assistant',
        text: 'Forged answer.',
        sources: [],
      }),
    );
    await assertFails(
      owner
        .doc('users/student1/aiConversations/c1/messages/m1')
        .update({ text: 'Rewritten answer.' }),
    );
    await assertSucceeds(
      owner.doc('users/student1/aiConversations/c1/messages/m1').delete(),
    );
    await assertSucceeds(owner.doc('users/student1/aiConversations/c1').delete());
  });

  it('hides transcripts from other users and admins', async () => {
    for (const uid of ['student2', 'admin1']) {
      const db = authedDb(uid);
      await assertFails(db.doc('users/student1/aiConversations/c1').get());
      await assertFails(
        db.doc('users/student1/aiConversations/c1/messages/m1').get(),
      );
      await assertFails(db.doc('users/student1/aiConversations/c1').delete());
    }
  });

  it('shows quota counters to the owner only, and never lets clients edit them', async () => {
    await assertSucceeds(authedDb('student1').doc('users/student1/aiUsage/2026-07-25').get());
    await assertFails(authedDb('student2').doc('users/student1/aiUsage/2026-07-25').get());
    await assertFails(
      authedDb('student1').doc('users/student1/aiUsage/2026-07-25').set({ day: 0 }),
    );
  });

  it('keeps the retrieval index and run metrics backend-only', async () => {
    for (const uid of ['student1', 'admin1']) {
      const db = authedDb(uid);
      await assertFails(db.doc('aiKnowledgeChunks/k1').get());
      await assertFails(db.doc('aiKnowledgeChunks/k2').set({ group: 'academy' }));
      await assertFails(db.doc('aiRuns/r1').get());
      await assertFails(db.doc('aiRuns/r2').set({ surface: 'web' }));
    }
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
