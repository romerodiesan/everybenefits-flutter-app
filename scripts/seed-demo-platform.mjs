#!/usr/bin/env node
/**
 * Large demo seed for Pulse / Studio / Admin against Firebase emulators.
 *
 * Creates Auth users, Firestore profiles/orgs/courses/forums/enrollments/
 * notifications, and RTDB chats so the apps look populated (~5k users,
 * ~100 courses by default).
 *
 * Usage:
 *   ./scripts/start-emulators.sh          # other terminal
 *   ./scripts/seed-demo.sh                # defaults: 5000 users, 100 courses
 *   ./scripts/seed-demo.sh --quick        # ~80 users, 12 courses (smoke test)
 *   SEED_USERS=2000 SEED_COURSES=50 ./scripts/seed-demo.sh
 *
 * Env:
 *   FIRESTORE_EMULATOR_HOST   required (default set by seed-demo.sh)
 *   FIREBASE_AUTH_EMULATOR_HOST
 *   FIREBASE_DATABASE_EMULATOR_HOST
 *   GCLOUD_PROJECT            default every-insurance
 *   SEED_PASSWORD             default PulseDemo123!
 *   SEED_USERS / SEED_COURSES / SEED_THREADS
 *
 * Safety: refuses to run without emulator hosts unless --force-production.
 *
 * Login after seed (password = SEED_PASSWORD):
 *   admin@everybenefits.demo
 *   manager01@everybenefits.demo
 *   instructor01@everybenefits.demo
 *   agent0001@everybenefits.demo
 *   student0001@everybenefits.demo
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AGENCIES,
  COURSE_TOPICS,
  FORUM_TAGS,
  SAMPLE_VIDEOS,
  THREAD_STARTERS,
  createRng,
  daysAgo,
  displayName,
  npn,
  pad,
  phone,
  pick,
  usAddress,
} from './seed-demo/catalog.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const functionsPkg = path.resolve(__dirname, '../apps/functions/package.json');
if (!fs.existsSync(functionsPkg)) {
  console.error('apps/functions/package.json missing.');
  process.exit(1);
}
if (
  !fs.existsSync(
    path.resolve(__dirname, '../apps/functions/node_modules/firebase-admin'),
  )
) {
  console.error(
    'firebase-admin missing. Run: pnpm --prefix apps/functions install',
  );
  process.exit(1);
}

// Resolve modular entry points from apps/functions/ (firebase-admin v14+).
const requireFn = createRequire(functionsPkg);
const { initializeApp, getApps } = requireFn('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = requireFn(
  'firebase-admin/firestore',
);
const { getAuth } = requireFn('firebase-admin/auth');
const { getDatabase } = requireFn('firebase-admin/database');

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const FORCE_PROD = args.includes('--force-production');
const SKIP_AUTH = args.includes('--skip-auth');
const SKIP_RTDB = args.includes('--skip-rtdb');

const PROJECT =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  'every-insurance';
const PASSWORD = process.env.SEED_PASSWORD || 'PulseDemo123!';

function argNum(flag, fallback) {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1]) return Number(args[i + 1]);
  return fallback;
}

const USER_COUNT = Number(
  process.env.SEED_USERS ||
    (QUICK ? 80 : argNum('--users', 5000)),
);
const COURSE_COUNT = Number(
  process.env.SEED_COURSES ||
    (QUICK ? 12 : argNum('--courses', 100)),
);
const THREAD_COUNT = Number(
  process.env.SEED_THREADS ||
    (QUICK ? 30 : argNum('--threads', 250)),
);
const AUTH_CONCURRENCY = Number(process.env.SEED_AUTH_CONCURRENCY || 40);

function requireEmulators() {
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if ((!fsHost || !authHost) && !FORCE_PROD) {
    console.error(
      'Refusing to seed: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST,\n' +
        'or use ./scripts/seed-demo.sh. Pass --force-production to override (dangerous).',
    );
    process.exit(1);
  }
  if (FORCE_PROD && !fsHost) {
    console.warn('WARNING: seeding WITHOUT emulators (--force-production).');
  }
}

function initAdmin() {
  if (getApps().length) return;
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `http://127.0.0.1:9000?ns=${PROJECT}`;
  initializeApp({
    projectId: PROJECT,
    databaseURL,
  });
}

class BatchWriter {
  constructor(db, label, size = 400) {
    this.db = db;
    this.label = label;
    this.size = size;
    this.batch = db.batch();
    this.ops = 0;
    this.total = 0;
  }

  set(ref, data, options) {
    if (options) this.batch.set(ref, data, options);
    else this.batch.set(ref, data);
    this.ops += 1;
    this.total += 1;
    if (this.ops >= this.size) return this.flush();
    return Promise.resolve();
  }

  update(ref, data) {
    this.batch.update(ref, data);
    this.ops += 1;
    this.total += 1;
    if (this.ops >= this.size) return this.flush();
    return Promise.resolve();
  }

  async flush() {
    if (this.ops === 0) return;
    await this.batch.commit();
    process.stdout.write(`\r  ${this.label}: ${this.total} writes`);
    this.batch = this.db.batch();
    this.ops = 0;
  }

  async done() {
    await this.flush();
    if (this.total) console.log(`\r  ${this.label}: ${this.total} writes ✓`);
  }
}

async function mapPool(items, concurrency, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

function rolePlan(total) {
  const adminN = Math.max(5, Math.round(total * 0.0016));
  const managerN = Math.max(10, Math.round(total * 0.008));
  const instructorN = Math.max(15, Math.round(total * 0.016));
  const pendingN = Math.max(8, Math.round(total * 0.01));
  const deactivatedN = Math.max(5, Math.round(total * 0.006));
  const agentN = Math.round(total * 0.62);
  let studentN =
    total - adminN - managerN - instructorN - agentN - pendingN - deactivatedN;
  if (studentN < 0) {
    return {
      admin: adminN,
      manager: managerN,
      instructor: instructorN,
      agent: Math.max(0, agentN + studentN),
      student: 0,
      pending: pendingN,
      deactivated: deactivatedN,
    };
  }
  return {
    admin: adminN,
    manager: managerN,
    instructor: instructorN,
    agent: agentN,
    student: studentN,
    pending: pendingN,
    deactivated: deactivatedN,
  };
}

function buildUserSpecs(rng, count) {
  const plan = rolePlan(count);
  /** @type {Array<{uid:string,email:string,role:string,approvalStatus:string,accountStatus:string,index:number,label:string}>} */
  const specs = [];
  let seq = 1;

  const pushMany = (n, role, approvalStatus, accountStatus, emailFn) => {
    for (let i = 1; i <= n; i++) {
      const uid = `seedu${pad(seq, 5)}`;
      specs.push({
        uid,
        email: emailFn(i),
        role,
        approvalStatus,
        accountStatus,
        index: i,
        label: `${role}${i}`,
      });
      seq += 1;
    }
  };

  pushMany(plan.admin, 'admin', 'approved', 'active', (i) =>
    i === 1 ? 'admin@everybenefits.demo' : `admin${pad(i, 2)}@everybenefits.demo`,
  );
  pushMany(plan.manager, 'manager', 'approved', 'active', (i) =>
    `manager${pad(i, 2)}@everybenefits.demo`,
  );
  pushMany(plan.instructor, 'instructor', 'approved', 'active', (i) =>
    `instructor${pad(i, 2)}@everybenefits.demo`,
  );
  pushMany(plan.agent, 'agent', 'approved', 'active', (i) =>
    `agent${pad(i, 4)}@everybenefits.demo`,
  );
  pushMany(plan.student, 'student', 'approved', 'active', (i) =>
    `student${pad(i, 4)}@everybenefits.demo`,
  );
  pushMany(plan.pending, 'agent', 'pending', 'active', (i) =>
    `pending${pad(i, 3)}@everybenefits.demo`,
  );
  pushMany(plan.deactivated, 'agent', 'approved', 'deactivated', (i) =>
    `deactivated${pad(i, 3)}@everybenefits.demo`,
  );

  // Shuffle lightly for mixed createdAt later, keep first admin first.
  const head = specs[0];
  const rest = specs.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [head, ...rest];
}

async function seedOrg(db, rng) {
  console.log('→ Org tree');
  const writer = new BatchWriter(db, 'orgNodes');
  const rootId = 'org-every-benefits';
  const now = FieldValue.serverTimestamp();
  await writer.set(db.doc(`orgNodes/${rootId}`), {
    name: 'Every Benefits',
    type: 'organization',
    depth: 1,
    parentId: null,
    path: [rootId],
    managerUids: [],
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  /** @type {string[]} */
  const agencyIds = [];
  /** @type {string[]} */
  const leafIds = [];

  for (let a = 0; a < AGENCIES.length; a++) {
    const agencyId = `org-agency-${pad(a + 1, 2)}`;
    agencyIds.push(agencyId);
    await writer.set(db.doc(`orgNodes/${agencyId}`), {
      name: AGENCIES[a],
      type: 'agency',
      depth: 2,
      parentId: rootId,
      path: [rootId, agencyId],
      managerUids: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const subCount = 2 + Math.floor(rng() * 2);
    for (let s = 0; s < subCount; s++) {
      const subId = `${agencyId}-sub-${s + 1}`;
      await writer.set(db.doc(`orgNodes/${subId}`), {
        name: `${AGENCIES[a].split(' ')[0]} Sub-${s + 1}`,
        type: 'sub_agency',
        depth: 3,
        parentId: agencyId,
        path: [rootId, agencyId, subId],
        managerUids: [],
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      leafIds.push(subId);
    }
  }

  await writer.done();
  return { rootId, agencyIds, assignableIds: [...agencyIds, ...leafIds] };
}

async function seedAuthUsers(specs) {
  if (SKIP_AUTH) {
    console.log('→ Auth skipped (--skip-auth)');
    return;
  }
  console.log(`→ Auth users (${specs.length}, concurrency ${AUTH_CONCURRENCY})`);
  let done = 0;
  await mapPool(specs, AUTH_CONCURRENCY, async (spec) => {
    try {
      await getAuth().createUser({
        uid: spec.uid,
        email: spec.email,
        password: PASSWORD,
        displayName: spec.label,
        emailVerified: true,
        disabled: spec.accountStatus === 'deactivated',
      });
    } catch (err) {
      if (err?.code === 'auth/uid-already-exists' || err?.code === 'auth/email-already-exists') {
        try {
          await getAuth().updateUser(spec.uid, {
            email: spec.email,
            password: PASSWORD,
            emailVerified: true,
            disabled: spec.accountStatus === 'deactivated',
          });
        } catch {
          // email collision under different uid — ignore for re-runs
        }
      } else {
        throw err;
      }
    }
    done += 1;
    if (done % 100 === 0 || done === specs.length) {
      process.stdout.write(`\r  auth: ${done}/${specs.length}`);
    }
  });
  console.log(`\r  auth: ${specs.length}/${specs.length} ✓`);
}

async function seedUsers(db, rng, specs, org) {
  console.log(`→ Firestore users + publicProfiles (${specs.length})`);
  const writer = new BatchWriter(db, 'users');
  const teachers = specs.filter((s) =>
    ['instructor', 'manager', 'admin'].includes(s.role),
  );

  for (const spec of specs) {
    const name = displayName(rng);
    spec.displayName = name;
    const created = daysAgo(rng, 540);
    const addr = usAddress(rng);
    const needsLicense = ['agent', 'instructor', 'manager', 'admin'].includes(
      spec.role,
    );
    let orgNodeId = org.rootId;
    let agencyName = 'Every Benefits';
    if (spec.role !== 'admin') {
      const agencyId = pick(rng, org.agencyIds);
      agencyName = AGENCIES[org.agencyIds.indexOf(agencyId)] || agencyId;
      if (spec.role === 'manager') {
        orgNodeId = agencyId;
      } else {
        orgNodeId = pick(rng, org.assignableIds);
        const matchedAgency = org.agencyIds.find(
          (id) => orgNodeId === id || orgNodeId.startsWith(`${id}-`),
        );
        if (matchedAgency) {
          agencyName =
            AGENCIES[org.agencyIds.indexOf(matchedAgency)] || agencyName;
        }
      }
    }

    const profile = {
      uid: spec.uid,
      email: spec.email,
      displayName: name,
      photoUrl: null,
      role: spec.role,
      isAnonymous: false,
      profileCompleted: spec.approvalStatus === 'approved',
      productTourVersion: 4,
      phoneCountryCode: '+1',
      phoneNumber: phone(rng),
      phoneVerified: rng() < 0.7,
      npn: needsLicense ? npn(rng) : null,
      ...addr,
      agency: agencyName,
      orgNodeId,
      accountStatus: spec.accountStatus,
      approvalStatus: spec.approvalStatus,
      appearance: {
        theme: pick(rng, ['system', 'light', 'dark']),
        accent: pick(rng, ['teal', 'blue', 'green', 'orange']),
        locale: pick(rng, ['en', 'es', 'inherit']),
      },
      createdAt: Timestamp.fromDate(created),
      updatedAt: Timestamp.fromDate(created),
    };
    if (spec.approvalStatus === 'approved') {
      profile.approvedBy = teachers[0]?.uid || specs[0].uid;
      profile.approvedAt = Timestamp.fromDate(created);
    }

    await writer.set(db.doc(`users/${spec.uid}`), profile);
    await writer.set(db.doc(`publicProfiles/${spec.uid}`), {
      uid: spec.uid,
      displayName: name,
      photoUrl: null,
      role: spec.role,
      agency: agencyName,
      isAnonymous: false,
      updatedAt: Timestamp.fromDate(created),
    });
  }
  await writer.done();
  return teachers;
}

function buildCourseBlueprint(index, rng, teacherName) {
  const [baseTitle, baseDesc] = COURSE_TOPICS[index % COURSE_TOPICS.length];
  const level = pick(rng, ['basic', 'intermediate', 'advanced']);
  const variant = Math.floor(index / COURSE_TOPICS.length) + 1;
  const title =
    variant > 1 ? `${baseTitle} (${level} · v${variant})` : `${baseTitle}`;
  const moduleCount = 2 + Math.floor(rng() * 2);
  const modules = [];
  let lessonOrdinal = 0;
  for (let m = 0; m < moduleCount; m++) {
    const lessonCount = 3 + Math.floor(rng() * 3);
    const lessons = [];
    for (let l = 0; l < lessonCount; l++) {
      lessonOrdinal += 1;
      const roll = rng();
      if (roll < 0.15 && l === lessonCount - 1) {
        lessons.push({
          type: 'quiz',
          title: `Evaluación módulo ${m + 1}`,
          passPercent: 70,
          questions: [
            {
              prompt: `Pregunta clave sobre ${baseTitle.toLowerCase()}`,
              mode: 'single',
              options: [
                'La opción correcta y compliant',
                'Una promesa fuera de contrato',
                'Ignorar la necesidad del cliente',
              ],
              correct: [0],
            },
            {
              prompt: '¿Qué debes documentar?',
              mode: 'multi',
              options: [
                'Recomendación y motivo',
                'Coberturas explicadas',
                'El color favorito del cliente',
              ],
              correct: [0, 1],
            },
          ],
        });
      } else if (roll < 0.35) {
        lessons.push({
          type: 'reading',
          title: `Lectura ${lessonOrdinal}: ${baseTitle.split(' ')[0]}`,
          body: [
            `# ${baseTitle}`,
            '',
            baseDesc,
            '',
            '## Puntos clave',
            '',
            '- Explica el valor antes del precio.',
            '- Documenta cada recomendación.',
            '- Usa lenguaje simple y verificado.',
            '',
            `> Variante seed #${index + 1}, módulo ${m + 1}.`,
          ].join('\n'),
        });
      } else {
        lessons.push(`Lección ${lessonOrdinal}: ${baseTitle}`);
      }
    }
    modules.push({ title: `Módulo ${m + 1}`, lessons });
  }
  return {
    id: `demo-course-${pad(index + 1, 3)}`,
    title,
    description: baseDesc,
    teacherName,
    level,
    modules,
  };
}

async function seedCourses(db, rng, teachers) {
  console.log(`→ Courses (${COURSE_COUNT}) + paths`);
  const writer = new BatchWriter(db, 'courses');
  const courseMeta = [];
  const teacherNames = teachers.map((t) => t.label);

  for (let i = 0; i < COURSE_COUNT; i++) {
    const teacher =
      teachers[i % Math.max(1, teachers.length)] || {
        uid: 'seedu00001',
        label: 'Seed Admin',
      };
    const bp = buildCourseBlueprint(
      i,
      rng,
      displayName(rng) || teacherNames[i % teacherNames.length] || 'Instructor Demo',
    );
    const status =
      i < COURSE_COUNT - Math.max(3, Math.floor(COURSE_COUNT * 0.05))
        ? 'published'
        : pick(rng, ['draft', 'pending']);
    const created = daysAgo(rng, 400);
    const lessonIds = [];
    let order = 0;
    let durationMinutes = 0;

    for (let mi = 0; mi < bp.modules.length; mi++) {
      const mod = bp.modules[mi];
      const moduleId = `m${mi + 1}`;
      await writer.set(db.doc(`courses/${bp.id}/modules/${moduleId}`), {
        title: mod.title,
        order: mi,
        createdAt: Timestamp.fromDate(created),
        updatedAt: Timestamp.fromDate(created),
      });

      for (let li = 0; li < mod.lessons.length; li++) {
        const raw = mod.lessons[li];
        const lessonId = `l${order + 1}`;
        lessonIds.push(lessonId);
        const isObj = raw && typeof raw === 'object';
        const type = isObj ? raw.type : 'video';
        const title = isObj ? raw.title : String(raw);
        const durationSeconds =
          type === 'quiz' ? 300 : type === 'reading' ? 240 : 420 + Math.floor(rng() * 480);
        durationMinutes += Math.round(durationSeconds / 60);

        const lessonDoc = {
          moduleId,
          title,
          order,
          type,
          durationSeconds,
          videoPath: null,
          videoUrl:
            type === 'video' ? SAMPLE_VIDEOS[order % SAMPLE_VIDEOS.length] : null,
          bodyMarkdown: type === 'reading' ? raw.body : null,
          questions:
            type === 'quiz'
              ? raw.questions.map((q, qi) => ({
                  id: `q${qi + 1}`,
                  prompt: q.prompt,
                  selectionMode: q.mode,
                  options: q.options,
                }))
              : [],
          passPercent: type === 'quiz' ? raw.passPercent || 70 : 70,
          createdAt: Timestamp.fromDate(created),
          updatedAt: Timestamp.fromDate(created),
        };
        await writer.set(
          db.doc(`courses/${bp.id}/lessons/${lessonId}`),
          lessonDoc,
        );
        if (type === 'quiz') {
          const answers = {};
          raw.questions.forEach((q, qi) => {
            answers[`q${qi + 1}`] = q.correct;
          });
          await writer.set(
            db.doc(`courses/${bp.id}/lessons/${lessonId}/secure/answerKey`),
            { answers },
          );
        }
        order += 1;
      }
    }

    const studentCountHint = 20 + Math.floor(rng() * 400);
    await writer.set(db.doc(`courses/${bp.id}`), {
      title: bp.title,
      description: bp.description,
      teacherName: bp.teacherName,
      level: bp.level,
      status,
      coverPath: null,
      coverUrl: null,
      lessonCount: lessonIds.length,
      durationMinutes,
      studentCount: status === 'published' ? studentCountHint : 0,
      createdBy: teacher.uid,
      createdAt: Timestamp.fromDate(created),
      updatedAt: Timestamp.fromDate(created),
      publishedAt:
        status === 'published'
          ? Timestamp.fromDate(created)
          : null,
    });

    courseMeta.push({
      id: bp.id,
      lessonIds,
      status,
      studentCount: status === 'published' ? studentCountHint : 0,
    });
  }

  // Learning paths
  const published = courseMeta.filter((c) => c.status === 'published');
  const pathCount = Math.min(12, Math.max(3, Math.floor(COURSE_COUNT / 8)));
  for (let p = 0; p < pathCount; p++) {
    const size = 3 + Math.floor(rng() * 4);
    const courseIds = [];
    for (let k = 0; k < size; k++) {
      courseIds.push(published[(p * 3 + k) % published.length].id);
    }
    const created = daysAgo(rng, 300);
    await writer.set(db.doc(`paths/demo-path-${pad(p + 1, 2)}`), {
      title: `Ruta demos ${p + 1}`,
      description: 'Camino de aprendizaje generado por el seed de demo.',
      level: pick(rng, ['basic', 'intermediate', 'advanced']),
      status: 'published',
      order: p,
      courseIds,
      createdBy: teachers[0]?.uid || 'seedu00001',
      createdAt: Timestamp.fromDate(created),
      updatedAt: Timestamp.fromDate(created),
    });
  }

  await writer.done();
  return courseMeta;
}

async function seedEnrollments(db, rng, specs, courses) {
  const published = courses.filter((c) => c.status === 'published');
  const learners = specs.filter(
    (s) =>
      s.accountStatus === 'active' &&
      s.approvalStatus === 'approved' &&
      ['student', 'agent', 'instructor', 'manager'].includes(s.role),
  );
  console.log(
    `→ Enrollments (~${learners.length} learners × courses for Studio metrics)`,
  );
  const writer = new BatchWriter(db, 'enrollments');
  // Recalculate studentCount from actual enrollments for published courses.
  const counts = Object.fromEntries(published.map((c) => [c.id, 0]));

  for (const user of learners) {
    const n = QUICK
      ? 2 + Math.floor(rng() * 3)
      : 3 + Math.floor(rng() * 10);
    const chosen = new Set();
    for (let i = 0; i < n && chosen.size < published.length; i++) {
      chosen.add(pick(rng, published));
    }
    for (const course of chosen) {
      const enrolledAt = daysAgo(rng, 200);
      const progressRoll = rng();
      let completedLessonIds = [];
      let completedAt = null;
      let lastLessonId = null;
      const quizAttempts = {};

      if (progressRoll < 0.12) {
        // not started beyond enroll
        completedLessonIds = [];
      } else if (progressRoll < 0.55) {
        const k = 1 + Math.floor(rng() * Math.max(1, course.lessonIds.length - 1));
        completedLessonIds = course.lessonIds.slice(0, k);
        lastLessonId = completedLessonIds[completedLessonIds.length - 1];
      } else if (progressRoll < 0.85) {
        completedLessonIds = course.lessonIds.slice(
          0,
          Math.max(1, Math.floor(course.lessonIds.length * (0.5 + rng() * 0.4))),
        );
        lastLessonId = completedLessonIds[completedLessonIds.length - 1];
      } else {
        completedLessonIds = [...course.lessonIds];
        lastLessonId = course.lessonIds[course.lessonIds.length - 1];
        completedAt = Timestamp.fromDate(daysAgo(rng, 60));
      }

      // Fake quiz attempts on any lesson id ending pattern — mark last quiz-like id
      for (const lid of course.lessonIds) {
        if (rng() < 0.2) {
          quizAttempts[lid] = {
            score: 60 + Math.floor(rng() * 40),
            passed: rng() < 0.75,
            at: Timestamp.fromDate(daysAgo(rng, 90)),
          };
        }
      }

      counts[course.id] = (counts[course.id] || 0) + 1;
      await writer.set(db.doc(`users/${user.uid}/enrollments/${course.id}`), {
        courseId: course.id,
        completedLessonIds,
        lastLessonId,
        lastPositionSeconds: lastLessonId ? Math.floor(rng() * 300) : 0,
        quizAttempts,
        enrolledAt: Timestamp.fromDate(enrolledAt),
        updatedAt: Timestamp.fromDate(enrolledAt),
        completedAt,
      });
    }
  }
  await writer.done();

  const updater = new BatchWriter(db, 'course studentCount');
  for (const [courseId, n] of Object.entries(counts)) {
    await updater.update(db.doc(`courses/${courseId}`), { studentCount: n });
  }
  await updater.done();
}

async function seedForums(db, rng, specs) {
  console.log(`→ Forum threads (${THREAD_COUNT})`);
  const authors = specs.filter(
    (s) =>
      s.accountStatus === 'active' &&
      s.approvalStatus === 'approved' &&
      s.role !== 'guest',
  );
  const writer = new BatchWriter(db, 'forums');

  for (let i = 0; i < THREAD_COUNT; i++) {
    const author = pick(rng, authors);
    const starter = THREAD_STARTERS[i % THREAD_STARTERS.length];
    const created = daysAgo(rng, 180);
    const threadId = `demo-thread-${pad(i + 1, 4)}`;
    const replyCount = 1 + Math.floor(rng() * (QUICK ? 4 : 8));
    const score = Math.floor(rng() * 40) - 5;
    const closed = rng() < 0.08;

    await writer.set(db.doc(`threads/${threadId}`), {
      tags: [pick(rng, FORUM_TAGS)],
      title: `${starter[0]} (#${i + 1})`,
      body: starter[1],
      authorId: author.uid,
      authorName: author.displayName || author.label,
      authorPhotoUrl: null,
      authorRole: author.role,
      replyCount,
      score,
      acceptedReplyId: null,
      closed,
      createdAt: Timestamp.fromDate(created),
      updatedAt: Timestamp.fromDate(created),
      lastReplyAt: Timestamp.fromDate(created),
    });

    await writer.set(db.doc(`threads/${threadId}/participants/${author.uid}`), {
      uid: author.uid,
      joinedAt: Timestamp.fromDate(created),
    });

    // A few votes on the thread
    for (let v = 0; v < 3; v++) {
      const voter = pick(rng, authors);
      await writer.set(db.doc(`threads/${threadId}/votes/${voter.uid}`), {
        value: rng() < 0.8 ? 1 : -1,
      });
    }

    for (let r = 0; r < replyCount; r++) {
      const replyAuthor = pick(rng, authors);
      const replyId = `r${r + 1}`;
      const replyAt = new Date(created.getTime() + r * 3600_000);
      await writer.set(db.doc(`threads/${threadId}/replies/${replyId}`), {
        body: pick(rng, [
          'Totalmente de acuerdo — así lo hago en campo.',
          'Agregaría documentar la objeción en el CRM el mismo día.',
          'En mi agencia usamos un checklist corto de 5 puntos.',
          'Cuidado con promesas fuera de contrato; compliance primero.',
          '¿Tienen un script corto que puedan compartir?',
        ]),
        authorId: replyAuthor.uid,
        authorName: replyAuthor.displayName || replyAuthor.label,
        authorPhotoUrl: null,
        authorRole: replyAuthor.role,
        score: Math.floor(rng() * 15),
        createdAt: Timestamp.fromDate(replyAt),
        updatedAt: Timestamp.fromDate(replyAt),
      });
      await writer.set(
        db.doc(`threads/${threadId}/participants/${replyAuthor.uid}`),
        {
          uid: replyAuthor.uid,
          joinedAt: Timestamp.fromDate(replyAt),
        },
      );
    }
  }
  await writer.done();
}

async function seedNotifications(db, rng, specs) {
  const sample = specs
    .filter((s) => s.accountStatus === 'active' && s.approvalStatus === 'approved')
    .slice(0, QUICK ? 20 : 200);
  console.log(`→ Notifications for ${sample.length} users`);
  const writer = new BatchWriter(db, 'notifications');
  for (const user of sample) {
    const unread = 1 + Math.floor(rng() * 5);
    for (let i = 0; i < unread + 2; i++) {
      const created = daysAgo(rng, 30);
      const id = `n${i + 1}`;
      const type = pick(rng, [
        'forum_reply',
        'forum_new_thread',
        'course_published',
        'admin_broadcast',
        'chat_message',
      ]);
      await writer.set(db.doc(`users/${user.uid}/notifications/${id}`), {
        type,
        title: pick(rng, [
          'Nueva respuesta en el foro',
          'Curso publicado',
          'Mensaje de chat',
          'Aviso de administración',
        ]),
        body: 'Notificación de demo generada por el seed.',
        href: type.startsWith('forum') ? '/forums' : type.startsWith('course') ? '/academy' : '/notifications',
        deepLink: null,
        ref: {},
        read: i >= unread,
        groupKey: `${type}-demo`,
        count: 1,
        actors: [],
        createdAt: Timestamp.fromDate(created),
        updatedAt: Timestamp.fromDate(created),
      });
    }
    await writer.set(db.doc(`users/${user.uid}/notificationState/default`), {
      unreadCount: unread,
      unreadForumCount: Math.floor(unread / 2),
      openGroups: {},
      prefs: {
        pushChats: true,
        pushForums: true,
        pushAcademy: true,
        pushSupport: true,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await writer.done();
}

async function seedPlatformConfig(db) {
  console.log('→ platformConfig');
  await db.doc('platformConfig/pulseAi').set({
    enabled: true,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seedu00001',
  });
}

async function seedRtdb(rng, specs) {
  if (SKIP_RTDB) {
    console.log('→ RTDB skipped (--skip-rtdb)');
    return;
  }
  console.log('→ RTDB chats + messages');
  const rtdb = getDatabase();
  const agents = specs.filter(
    (s) =>
      s.accountStatus === 'active' &&
      ['agent', 'instructor', 'manager', 'admin'].includes(s.role),
  );
  // Cap default group membership for RTDB payload size.
  const defaultMembers = agents.slice(0, QUICK ? 40 : 400);
  const members = {};
  const memberNames = {};
  const unreadCounts = {};
  for (const u of defaultMembers) {
    members[u.uid] = true;
    memberNames[u.uid] = u.displayName || u.label;
    unreadCounts[u.uid] = Math.floor(rng() * 3);
  }
  const now = Date.now();
  await rtdb.ref(`chats/agents-default`).set({
    members,
    memberNames,
    isGroup: true,
    title: 'Agentes Every Benefits',
    dmKey: null,
    lastMessage: 'Bienvenidos al grupo de agentes (seed demo).',
    lastMessageAt: now - 60_000,
    lastMessageSenderId: defaultMembers[0]?.uid || 'seedu00001',
    unreadCounts,
    pinnedBy: {},
    createdAt: now - 86_400_000 * 30,
    createdBy: defaultMembers[0]?.uid || 'seedu00001',
    isDefaultAgentGroup: true,
    isSupportChat: false,
    autoJoinRoles: {
      agent: true,
      instructor: true,
      manager: true,
      admin: true,
    },
    photoUrl: null,
    memberCount: defaultMembers.length,
  });

  const msgUpdates = {};
  for (let i = 0; i < (QUICK ? 8 : 40); i++) {
    const sender = pick(rng, defaultMembers);
    const mid = `m${pad(i + 1, 3)}`;
    msgUpdates[`messages/agents-default/${mid}`] = {
      body: pick(rng, [
        '¿Alguien tiene el one-pager de temporal vs entera?',
        'Recordatorio: compliance antes de cerrar.',
        'Buen cierre hoy con un referido 🙌',
        '¿Quién cubre Texas esta semana?',
        'Comparto tip: anclar en la necesidad, no en la prima.',
      ]),
      senderId: sender.uid,
      senderName: sender.displayName || sender.label,
      createdAt: now - (40 - i) * 120_000,
    };
  }
  await rtdb.ref().update(msgUpdates);

  const userChatUpdates = {};
  for (const u of defaultMembers) {
    userChatUpdates[`userChats/${u.uid}/agents-default`] = {
      lastMessageAt: now - 60_000,
    };
  }
  // Chunk RTDB updates
  const entries = Object.entries(userChatUpdates);
  for (let i = 0; i < entries.length; i += 200) {
    const chunk = Object.fromEntries(entries.slice(i, i + 200));
    await rtdb.ref().update(chunk);
  }

  // Extra group chats
  const groupCount = QUICK ? 4 : 25;
  for (let g = 0; g < groupCount; g++) {
    const chatId = `demo-group-${pad(g + 1, 2)}`;
    const size = 4 + Math.floor(rng() * 10);
    const groupUsers = [];
    for (let i = 0; i < size; i++) groupUsers.push(pick(rng, agents));
    const gMembers = {};
    const gNames = {};
    const gUnread = {};
    for (const u of groupUsers) {
      gMembers[u.uid] = true;
      gNames[u.uid] = u.displayName || u.label;
      gUnread[u.uid] = 0;
    }
    await rtdb.ref(`chats/${chatId}`).set({
      members: gMembers,
      memberNames: gNames,
      isGroup: true,
      title: `Grupo demo ${g + 1}`,
      dmKey: null,
      lastMessage: 'Hola equipo',
      lastMessageAt: now - g * 10_000,
      lastMessageSenderId: groupUsers[0].uid,
      unreadCounts: gUnread,
      pinnedBy: {},
      createdAt: now - 86_400_000 * (g + 1),
      createdBy: groupUsers[0].uid,
      isDefaultAgentGroup: false,
      isSupportChat: false,
      autoJoinRoles: {},
      photoUrl: null,
      memberCount: groupUsers.length,
    });
    await rtdb.ref(`messages/${chatId}/m001`).set({
      body: 'Mensaje inicial del grupo demo.',
      senderId: groupUsers[0].uid,
      senderName: groupUsers[0].displayName || groupUsers[0].label,
      createdAt: now - g * 10_000,
    });
    const uc = {};
    for (const u of groupUsers) {
      uc[`userChats/${u.uid}/${chatId}`] = { lastMessageAt: now - g * 10_000 };
    }
    await rtdb.ref().update(uc);
  }

  // A handful of DMs
  const dmCount = QUICK ? 5 : 40;
  for (let d = 0; d < dmCount; d++) {
    const a = pick(rng, agents);
    let b = pick(rng, agents);
    if (b.uid === a.uid) b = agents[(agents.indexOf(a) + 1) % agents.length];
    const ids = [a.uid, b.uid].sort();
    const dmKey = `${ids[0]}_${ids[1]}`;
    const chatId = `demo-dm-${pad(d + 1, 3)}`;
    await rtdb.ref(`chats/${chatId}`).set({
      members: { [a.uid]: true, [b.uid]: true },
      memberNames: { [a.uid]: a.displayName || a.label, [b.uid]: b.displayName || b.label },
      isGroup: false,
      title: null,
      dmKey,
      lastMessage: '¿Nos sincronizamos mañana?',
      lastMessageAt: now - d * 5000,
      lastMessageSenderId: a.uid,
      unreadCounts: { [a.uid]: 0, [b.uid]: 1 },
      pinnedBy: {},
      createdAt: now - 86_400_000,
      createdBy: a.uid,
      isDefaultAgentGroup: false,
      isSupportChat: false,
      autoJoinRoles: {},
      photoUrl: null,
      memberCount: 2,
    });
    await rtdb.ref(`dmIndex/${dmKey}`).set(chatId);
    await rtdb.ref(`messages/${chatId}/m001`).set({
      body: '¿Nos sincronizamos mañana?',
      senderId: a.uid,
      senderName: a.displayName || a.label,
      createdAt: now - d * 5000,
    });
    await rtdb.ref().update({
      [`userChats/${a.uid}/${chatId}`]: { lastMessageAt: now - d * 5000 },
      [`userChats/${b.uid}/${chatId}`]: { lastMessageAt: now - d * 5000 },
    });
  }
  console.log('  rtdb chats ✓');
}

async function main() {
  requireEmulators();
  initAdmin();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  const rng = createRng(20260730);
  console.log('');
  console.log('Pulse demo seed');
  console.log(`  project:  ${PROJECT}`);
  console.log(`  users:    ${USER_COUNT}`);
  console.log(`  courses:  ${COURSE_COUNT}`);
  console.log(`  threads:  ${THREAD_COUNT}`);
  console.log(`  password: ${PASSWORD}`);
  console.log('');

  const started = Date.now();
  const specs = buildUserSpecs(rng, USER_COUNT);
  const org = await seedOrg(db, rng);
  await seedAuthUsers(specs);
  const teachers = await seedUsers(db, rng, specs, org);
  const courses = await seedCourses(db, rng, teachers.length ? teachers : specs.slice(0, 5));
  await seedEnrollments(db, rng, specs, courses);
  await seedForums(db, rng, specs);
  await seedNotifications(db, rng, specs);
  await seedPlatformConfig(db);
  await seedRtdb(rng, specs);

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log('');
  console.log(`Done in ${secs}s`);
  console.log('');
  console.log('Sign in with password:', PASSWORD);
  console.log('  admin@everybenefits.demo');
  console.log('  manager01@everybenefits.demo');
  console.log('  instructor01@everybenefits.demo');
  console.log('  agent0001@everybenefits.demo');
  console.log('  student0001@everybenefits.demo');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).then(() => {
  // Admin SDK keeps RTDB/Firestore sockets open; force exit after success.
  process.exit(0);
});
