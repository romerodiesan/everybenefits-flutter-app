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

  it('blocks anonymous profile bootstrap', async () => {
    const db = anonDb('anon2');
    await assertFails(
      db.doc('users/anon2').set({
        uid: 'anon2',
        role: 'student',
        isAnonymous: true,
        profileCompleted: false,
        approvalStatus: 'pending',
      }),
    );
  });

  it('allows registered student create with search index fields', async () => {
    const db = authedDb('u1search', { email: 'search@example.com' });
    await assertSucceeds(
      db.doc('users/u1search').set({
        uid: 'u1search',
        role: 'student',
        isAnonymous: false,
        profileCompleted: false,
        displayName: 'Ada Lovelace',
        displayNameLower: 'ada lovelace',
        email: 'search@example.com',
        emailLower: 'search@example.com',
        nameTokens: ['ad', 'ada', 'lo', 'lov'],
        approvalStatus: 'pending',
        accountStatus: 'active',
      }),
    );
  });

  it('blocks registered student create without pending approval', async () => {
    const db = authedDb('u1b', { email: 'u1b@example.com' });
    await assertFails(
      db.doc('users/u1b').set({
        uid: 'u1b',
        role: 'student',
        isAnonymous: false,
        profileCompleted: false,
        displayName: 'Ada',
        email: 'u1b@example.com',
        approvalStatus: 'approved',
      }),
    );
  });

  it('blocks owner from self-approving', async () => {
    await seedUser('u1c', {
      role: 'student',
      profileCompleted: false,
      approvalStatus: 'pending',
    });
    const db = authedDb('u1c');
    await assertFails(
      db.doc('users/u1c').update({ approvalStatus: 'approved' }),
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

  it('blocks owners from touching account lifecycle fields', async () => {
    await seedUser('u6', { role: 'student' });
    const db = authedDb('u6');
    await assertFails(
      db.doc('users/u6').update({ accountStatus: 'active' }),
    );
    await assertFails(
      db.doc('users/u6').update({ deletionScheduledAt: new Date() }),
    );
    await assertFails(
      db.doc('users/u6').update({ anonymousLabel: 'anonimo9' }),
    );
    // Regular profile edits still work.
    await assertSucceeds(
      db.doc('users/u6').update({ displayName: 'New Name' }),
    );
    await assertFails(
      db.doc('users/u6').update({
        profileBadge: { enabled: true, text: 'VIP', icon: 'star', color: 'accent' },
      }),
    );
  });

  it('allows protected-role owners to edit profile fields without changing role', async () => {
    await seedUser('adminSelf', { role: 'admin', profileCompleted: true });
    await seedUser('mgrSelf', { role: 'manager', profileCompleted: true });
    await assertSucceeds(
      authedDb('adminSelf').doc('users/adminSelf').update({
        displayName: 'Admin Updated',
        photoUrl: 'https://example.com/a.jpg',
      }),
    );
    await assertSucceeds(
      authedDb('mgrSelf').doc('users/mgrSelf').update({
        displayName: 'Manager Updated',
      }),
    );
    await assertFails(
      authedDb('mgrSelf').doc('users/mgrSelf').update({ role: 'admin' }),
    );
  });

  it('blocks owners from changing accountStatus', async () => {
    await seedUser('u7', {
      role: 'student',
      accountStatus: 'deactivated',
    });
    const db = authedDb('u7');
    await assertFails(
      db.doc('users/u7').update({ accountStatus: 'active' }),
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

  it('blocks direct vote-sized score writes', async () => {
    const db = authedDb('voter');
    await assertFails(
      db.doc('threads/t1').update({ score: 1, updatedAt: new Date() }),
    );
  });

  it('blocks authors from changing their own score', async () => {
    await assertFails(
      authedDb('author')
        .doc('threads/t1')
        .update({ score: 1, updatedAt: new Date() }),
    );
  });

  it('blocks direct reply count writes', async () => {
    await assertFails(
      authedDb('voter')
        .doc('threads/t1')
        .update({ replyCount: 1, lastReplyAt: new Date(), updatedAt: new Date() }),
    );
  });

  it('keeps reply creation and vote documents server-only', async () => {
    const db = authedDb('voter');
    await assertFails(
      db.doc('threads/t1/replies/r1').set({
        body: 'Direct reply',
        authorId: 'voter',
        authorName: 'voter',
        authorRole: 'agent',
        score: 0,
      }),
    );
    await assertFails(
      db.doc('threads/t1/votes/voter').set({ value: 1 }),
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
    await seedUser('instructor1', { role: 'instructor' });
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

  it('lets registered members read published courses (not guests)', async () => {
    await seedCourse('pub1', { status: 'published', createdBy: 'manager1' });
    await assertSucceeds(authedDb('student1').doc('courses/pub1').get());
    await seedUser('guest1', { role: 'guest', isAnonymous: false });
    await assertFails(authedDb('guest1').doc('courses/pub1').get());
    await assertFails(anonDb('anonGuest').doc('courses/pub1').get());
  });

  it('blocks deactivated members from reading published courses', async () => {
    await seedCourse('pubD', { status: 'published', createdBy: 'manager1' });
    await seedUser('ex1', {
      role: 'student',
      accountStatus: 'deactivated',
    });
    await assertFails(authedDb('ex1').doc('courses/pubD').get());
  });

  it('blocks pending and rejected members from published courses', async () => {
    await seedCourse('pubApproval', {
      status: 'published',
      createdBy: 'manager1',
    });
    await seedUser('pendingMember', { approvalStatus: 'pending' });
    await seedUser('rejectedMember', { approvalStatus: 'rejected' });
    await assertFails(
      authedDb('pendingMember').doc('courses/pubApproval').get(),
    );
    await assertFails(
      authedDb('rejectedMember').doc('courses/pubApproval').get(),
    );
  });

  it('only lets instructors, managers, and admins create courses', async () => {
    await assertFails(
      authedDb('student1').doc('courses/new1').set(courseDraft('student1')),
    );
    await assertSucceeds(
      authedDb('instructor1')
        .doc('courses/newInst')
        .set(courseDraft('instructor1')),
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

  it('keeps student count server-only', async () => {
    await seedCourse('pub2', { status: 'published', createdBy: 'manager1' });
    const db = authedDb('student1');

    await assertFails(
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

    await assertFails(
      db.doc('users/student1/enrollments/pub1').set(enrollment),
    );
    await assertFails(
      db.doc('users/student1/enrollments/pub1').update({
        quizAttempts: { q1: { score: 100, passed: true } },
      }),
    );
    // Completion is server-authoritative.
    await assertFails(
      db.doc('users/student1/enrollments/pub1').update({
        completedLessonIds: ['l1'],
        lastPositionSeconds: 12,
      }),
    );
  });

  it('lets instructors draft learning paths and keeps publish for admins', async () => {
    const draft = {
      title: 'Path',
      description: 'Desc',
      level: 'basic',
      status: 'draft',
      courseIds: [],
      order: 0,
      createdBy: 'instructor1',
    };
    await assertSucceeds(
      authedDb('instructor1').doc('paths/pInst').set(draft),
    );
    await assertFails(
      authedDb('instructor1')
        .doc('paths/pInst')
        .update({ status: 'published' }),
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

    await assertFails(
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

  it('limits enrollment collectionGroup reads to admins', async () => {
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

    await assertFails(query(authedDb('manager1')).get());
    await assertSucceeds(query(authedDb('admin1')).get());
    await assertFails(query(authedDb('manager2')).get());
    await assertFails(query(authedDb('student1')).get());
  });
});

describe('private and public profiles', () => {
  beforeEach(async () => {
    await seedUser('agent1', {
      role: 'agent',
      email: 'private@example.com',
      npn: '1234567',
      addressStreet: '123 Private St',
    });
    await seedUser('agent2', { role: 'agent' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('publicProfiles/agent1').set({
        uid: 'agent1',
        displayName: 'Agent One',
        photoUrl: null,
        role: 'agent',
        agency: 'Every Benefits',
        isAnonymous: false,
      });
    });
  });

  it('hides private profile fields from peers', async () => {
    await assertFails(authedDb('agent2').doc('users/agent1').get());
    await assertFails(authedDb('agent2').collection('users').get());
  });

  it('exposes only the server-maintained public directory', async () => {
    const peer = authedDb('agent2');
    await assertSucceeds(peer.doc('publicProfiles/agent1').get());
    await assertSucceeds(peer.collection('publicProfiles').get());
    await assertFails(
      peer.doc('publicProfiles/agent2').set({
        uid: 'agent2',
        displayName: 'Forged',
        role: 'admin',
        isAnonymous: false,
      }),
    );
  });

  it('blocks pending and rejected viewers from the public directory', async () => {
    await seedUser('pendingViewer', { approvalStatus: 'pending' });
    await seedUser('rejectedViewer', { approvalStatus: 'rejected' });
    await assertFails(
      authedDb('pendingViewer').doc('publicProfiles/agent1').get(),
    );
    await assertFails(
      authedDb('rejectedViewer').doc('publicProfiles/agent1').get(),
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

describe('notifications inbox', () => {
  beforeEach(async () => {
    await seedUser('n1');
    await seedUser('n2');
  });

  it('lets owners mark a notification as read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('users/n1/notifications/x').set({
        type: 'chat_message',
        title: 'Hi',
        body: 'Body',
        read: false,
      });
    });
    await assertSucceeds(
      authedDb('n1').doc('users/n1/notifications/x').update({ read: true }),
    );
    await assertFails(
      authedDb('n1').doc('users/n1/notifications/x').update({ title: 'Hack' }),
    );
  });

  it('lets owners read notifications but not create them', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('users/n1/notifications/x').set({
        type: 'chat_message',
        title: 'Hi',
        body: 'Body',
        read: false,
      });
    });
    await assertSucceeds(authedDb('n1').doc('users/n1/notifications/x').get());
    await assertFails(authedDb('n2').doc('users/n1/notifications/x').get());
    await assertFails(
      authedDb('n1').doc('users/n1/notifications/y').set({
        type: 'chat_message',
        title: 'Nope',
        body: 'Client write',
        read: false,
      }),
    );
  });

  it('allows owners to manage their own FCM tokens', async () => {
    const db = authedDb('n1');
    await assertSucceeds(
      db.doc('users/n1/fcmTokens/abc').set({
        token: 'x'.repeat(40),
        platform: 'web',
      }),
    );
    await assertFails(
      authedDb('n2').doc('users/n1/fcmTokens/abc').set({
        token: 'y'.repeat(40),
        platform: 'ios',
      }),
    );
  });

  it('lets owners patch prefs and lastFeedSeenAt on notificationState', async () => {
    const db = authedDb('n1');
    await assertSucceeds(
      db.doc('users/n1/notificationState/default').set({
        prefs: { pushChats: false },
        lastFeedSeenAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await assertFails(
      db.doc('users/n1/notificationState/default').set({
        unreadCount: 99,
        updatedAt: new Date(),
      }),
    );
  });
});

describe('course analytics rollups', () => {
  beforeEach(async () => {
    await seedUser('author1', { role: 'instructor' });
    await seedUser('co1', { role: 'instructor' });
    await seedUser('other', { role: 'instructor' });
    await seedUser('learner', { role: 'student' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('courses/c1').set({
        title: 'Analytics course',
        createdBy: 'author1',
        instructorIds: ['author1', 'co1'],
        status: 'published',
        level: 'basic',
        studentCount: 0,
      });
      await ctx.firestore().doc('courses/c1/analytics/summary').set({
        enrolled: 10,
        views: 100,
        watchSeconds: 500,
      });
      await ctx.firestore().doc('courses/c1/lessonAnalytics/l1').set({
        lessonId: 'l1',
        started: 8,
        completed: 5,
      });
    });
  });

  it('allows owner and co-instructor to read aggregates', async () => {
    await assertSucceeds(
      authedDb('author1').doc('courses/c1/analytics/summary').get(),
    );
    await assertSucceeds(
      authedDb('co1').doc('courses/c1/analytics/summary').get(),
    );
    await assertSucceeds(
      authedDb('author1').doc('courses/c1/lessonAnalytics/l1').get(),
    );
  });

  it('denies other instructors, learners, and all client writes', async () => {
    await assertFails(
      authedDb('other').doc('courses/c1/analytics/summary').get(),
    );
    await assertFails(
      authedDb('learner').doc('courses/c1/analytics/summary').get(),
    );
    await assertFails(
      authedDb('author1').doc('courses/c1/analytics/summary').set({ views: 1 }),
    );
    await assertFails(
      authedDb('author1').doc('analyticsDedupe/x').get(),
    );
  });
});

describe('social graph', () => {
  beforeEach(async () => {
    await seedUser('a1', { role: 'agent', approvalStatus: 'approved' });
    await seedUser('a2', { role: 'agent', approvalStatus: 'approved' });
    await seedUser('a3', { role: 'agent', approvalStatus: 'approved' });
  });

  it('lets owners read and write their own blocks and mutes', async () => {
    const db = authedDb('a1', { email: 'a1@example.com' });
    await assertSucceeds(
      db.doc('social/a1/blocks/a2').set({
        uid: 'a2',
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(
      db.doc('social/a1/mutes/a2').set({
        uid: 'a2',
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(db.doc('social/a1/blocks/a2').get());
    await assertSucceeds(db.doc('social/a1/mutes/a2').delete());
  });

  it('denies forging contacts or requests from the client', async () => {
    const db = authedDb('a1', { email: 'a1@example.com' });
    await assertFails(
      db.doc('social/a1/contacts/a2').set({ uid: 'a2', since: new Date() }),
    );
    await assertFails(
      db.doc('social/a1/outgoingRequests/a2').set({
        fromUid: 'a1',
        toUid: 'a2',
        createdAt: new Date(),
      }),
    );
    await assertFails(
      db.doc('social/a2/incomingRequests/a1').set({
        fromUid: 'a1',
        toUid: 'a2',
        createdAt: new Date(),
      }),
    );
    await assertFails(
      db.doc('social/a1/following/a2').set({
        uid: 'a2',
        createdAt: new Date(),
      }),
    );
    await assertFails(
      db.doc('social/a2/followers/a1').set({
        uid: 'a1',
        createdAt: new Date(),
      }),
    );
  });

  it('denies reading another member social graph', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('social/a1/contacts/a2').set({ uid: 'a2' });
    });
    await assertFails(
      authedDb('a2', { email: 'a2@example.com' }).doc('social/a1/contacts/a2').get(),
    );
  });

  it('rejects blocking yourself or missing uid field', async () => {
    const db = authedDb('a1', { email: 'a1@example.com' });
    await assertFails(
      db.doc('social/a1/blocks/a1').set({
        uid: 'a1',
        createdAt: new Date(),
      }),
    );
    await assertFails(
      db.doc('social/a1/blocks/a2').set({
        createdAt: new Date(),
      }),
    );
  });

  it('lets owners read their follow graph but not write it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('social/a1/following/a2').set({ uid: 'a2' });
      await ctx.firestore().doc('social/a1/followers/a3').set({ uid: 'a3' });
    });
    const db = authedDb('a1', { email: 'a1@example.com' });
    await assertSucceeds(db.doc('social/a1/following/a2').get());
    await assertSucceeds(db.doc('social/a1/followers/a3').get());
    await assertFails(
      authedDb('a2', { email: 'a2@example.com' }).doc('social/a1/followers/a3').get(),
    );
  });

  it('denies client writes to moderation reports', async () => {
    const db = authedDb('a1', { email: 'a1@example.com' });
    await assertFails(
      db.collection('moderationReports').add({
        reporterUid: 'a1',
        targetUid: 'a2',
        reason: 'spam',
        createdAt: new Date(),
      }),
    );
  });
});

describe('registered-member catalog reads', () => {
  beforeEach(async () => {
    await seedUser('member1', {
      role: 'agent',
      isAnonymous: false,
      profileCompleted: true,
      approvalStatus: 'approved',
    });
    await seedUser('guest1', {
      role: 'guest',
      isAnonymous: false,
      profileCompleted: true,
      approvalStatus: 'approved',
    });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('roles/agent').set({ permissions: ['forums.participate'] });
      await ctx.firestore().doc('promoBanners/b1').set({ active: true, title: 'Hi' });
      await ctx.firestore().doc('promoBanners/draft').set({ active: false, title: 'Secret' });
      await ctx.firestore().doc('polls/p1').set({ active: true, question: { en: 'Q' } });
      await ctx.firestore().doc('polls/p1/votes/member1').set({ optionId: 'o1' });
      await ctx.firestore().doc('polls/p1/votes/agent1').set({ optionId: 'o2' });
      await ctx.firestore().doc('platformStats/global').set({ activeUsers: 10 });
      await ctx.firestore().doc('orgNodes/root').set({
        type: 'organization',
        name: 'Root',
        ein: '12-3456789',
      });
    });
  });

  it('allows registered members to read roles, banners, platformStats', async () => {
    const db = authedDb('member1', { email: 'member1@example.com' });
    await assertSucceeds(db.doc('roles/agent').get());
    await assertSucceeds(db.doc('promoBanners/b1').get());
    await assertSucceeds(db.doc('polls/p1').get());
    await assertSucceeds(db.doc('polls/p1/votes/member1').get());
    await assertFails(db.doc('polls/p1/votes/agent1').get());
    await assertFails(db.doc('polls/p1').set({ active: false }));
    await assertFails(db.doc('polls/p1/votes/member1').set({ optionId: 'x' }));
    await assertFails(db.doc('polls/p1').delete());
    await assertSucceeds(db.doc('platformStats/global').get());
  });

  it('hides inactive promo banners from members', async () => {
    const db = authedDb('member1', { email: 'member1@example.com' });
    await assertFails(db.doc('promoBanners/draft').get());
  });

  it('denies client reads of orgNodes (Functions/Admin SDK only)', async () => {
    const db = authedDb('member1', { email: 'member1@example.com' });
    await assertFails(db.doc('orgNodes/root').get());
    await assertFails(db.collection('orgNodes').get());
  });

  it('denies anonymous and guest catalog reads', async () => {
    await assertFails(anonDb('anon-x').doc('roles/agent').get());
    await assertFails(anonDb('anon-x').doc('promoBanners/b1').get());
    await assertFails(anonDb('anon-x').doc('polls/p1').get());
    await assertFails(anonDb('anon-x').doc('platformStats/global').get());
    await assertFails(
      authedDb('guest1', { email: 'guest1@example.com' }).doc('promoBanners/b1').get(),
    );
    await assertFails(
      authedDb('guest1', { email: 'guest1@example.com' }).doc('polls/p1').get(),
    );
  });
});

describe('usernames reservation', () => {
  beforeEach(async () => {
    await seedUser('agent1', { role: 'agent', username: 'alpha' });
    await seedUser('agent2', { role: 'agent' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('usernames/alpha').set({ uid: 'agent1' });
    });
  });

  it('lets members read claimed handles', async () => {
    await assertSucceeds(authedDb('agent2').doc('usernames/alpha').get());
  });

  it('blocks client writes to usernames and users.username', async () => {
    const owner = authedDb('agent1');
    await assertFails(owner.doc('usernames/bravo').set({ uid: 'agent1' }));
    await assertFails(owner.doc('usernames/alpha').delete());
    await assertFails(owner.doc('users/agent1').update({ username: 'bravo' }));
  });
});
