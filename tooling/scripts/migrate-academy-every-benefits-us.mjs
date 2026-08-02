#!/usr/bin/env node
/**
 * In-place Academy migration for every-benefits-us.
 *
 * Transforms legacy collections:
 *   academy_categories → paths/{id}
 *   academy_cursos     → courses/{id}
 *   academy_lessons    → courses/{trackId}/modules + lessons
 *
 * Usage:
 *   node scripts/migrate-academy-every-benefits-us.mjs              # dry-run (default)
 *   node scripts/migrate-academy-every-benefits-us.mjs --dry-run
 *   node scripts/migrate-academy-every-benefits-us.mjs --apply
 *   node scripts/migrate-academy-every-benefits-us.mjs --apply --limit=2
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS  path to service account JSON
 *   (or default Documents path for every-benefits-us admin SDK)
 *   MIGRATION_BACKUP_DIR            where to write migration-manifest.json
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer firebase-admin from functions/ (already installed).
const functionsAdminPath = path.resolve(
  __dirname,
  '../apps/functions/node_modules/firebase-admin',
);
const admin = fs.existsSync(functionsAdminPath)
  ? require(functionsAdminPath)
  : require('firebase-admin');

const PROJECT_ID = 'every-benefits-us';
const DEFAULT_SA =
  '/Users/diesanromero/Documents/every-benefits-us-firebase-adminsdk-647hy-e905aa3d4e.json';
const CREATED_BY = 'Iv02YNrGBSgoChPjhHONDAhCyNL2'; // diesanromero@gmail.com (admin)
const TEACHER_NAME = 'Every Benefits';
const MODULE_ID = 'content-0';
const MODULE_TITLE = 'Contenido';
const DEFAULT_DURATION_SECONDS = 600; // 10 min placeholder when unknown

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY;
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : null;

const BACKUP_DIR =
  process.env.MIGRATION_BACKUP_DIR ||
  findLatestBackupDir() ||
  path.join(
    process.env.HOME || '',
    'Documents',
    `academy-migration-backup-${PROJECT_ID}`,
  );

function findLatestBackupDir() {
  const docs = path.join(process.env.HOME || '', 'Documents');
  if (!fs.existsSync(docs)) return null;
  const matches = fs
    .readdirSync(docs)
    .filter((n) => n.startsWith(`academy-migration-backup-${PROJECT_ID}`))
    .map((n) => path.join(docs, n))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort();
  return matches.length ? matches[matches.length - 1] : null;
}

function pickLocale(obj, preferEn = false) {
  if (!obj || typeof obj !== 'object') return '';
  if (preferEn) return String(obj.en || obj.es || '').trim();
  return String(obj.es || obj.en || '').trim();
}

function mapLevel(type) {
  if (type === 'contracting') return 'intermediate';
  return 'basic';
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (value?.toDate) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value?.__type === 'Timestamp' && value.iso) return new Date(value.iso);
  return null;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_SA;
  if (!fs.existsSync(saPath)) {
    throw new Error(
      `Service account not found at ${saPath}. Set GOOGLE_APPLICATION_CREDENTIALS.`,
    );
  }
  const sa = require(saPath);
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  });
}

async function loadLegacy(db) {
  const [cats, cursos, lessons] = await Promise.all([
    db.collection('academy_categories').get(),
    db.collection('academy_cursos').get(),
    db.collection('academy_lessons').get(),
  ]);
  return {
    categories: cats.docs.map((d) => ({ id: d.id, ...d.data() })),
    cursos: cursos.docs.map((d) => ({ id: d.id, ...d.data() })),
    lessons: lessons.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

function buildPlan(legacy) {
  const lessonsByTrack = new Map();
  for (const lesson of legacy.lessons) {
    const trackId = lesson.trackId;
    if (!trackId) continue;
    if (!lessonsByTrack.has(trackId)) lessonsByTrack.set(trackId, []);
    lessonsByTrack.get(trackId).push(lesson);
  }
  for (const list of lessonsByTrack.values()) {
    list.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  }

  let cursos = [...legacy.cursos].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
  );
  if (LIMIT != null && Number.isFinite(LIMIT)) {
    cursos = cursos.slice(0, LIMIT);
  }
  const courseIdSet = new Set(cursos.map((c) => c.id));

  const courses = cursos.map((curso) => {
    const preferEn = curso.id === 'training-aca-english' || curso.language === 'en';
    const trackLessons = (lessonsByTrack.get(curso.id) || []).filter(
      (l) => l.active !== false,
    );
    const now = new Date();
    const published =
      curso.active !== false
        ? toDate(curso.publishedAt) || toDate(curso.createdAt) || now
        : null;

    const lessonDocs = trackLessons.map((lesson, index) => {
      const title = pickLocale(lesson.title, preferEn) || `Lección ${index + 1}`;
      const description = pickLocale(lesson.description, preferEn);
      return {
        id: lesson.id,
        moduleId: MODULE_ID,
        title,
        order: index,
        durationSeconds: DEFAULT_DURATION_SECONDS,
        type: 'video',
        videoPath: null,
        videoUrl: lesson.videoUrl?.trim() || null,
        bodyMarkdown: description || null,
        questions: [],
        passPercent: 70,
        legacyOrder: Number(lesson.order ?? index + 1),
        active: lesson.active !== false,
      };
    });

    const durationMinutes = Math.round(
      (lessonDocs.reduce((s, l) => s + l.durationSeconds, 0) || 0) / 60,
    );

    return {
      id: curso.id,
      doc: {
        title: pickLocale(curso.title, preferEn) || curso.id,
        description: pickLocale(curso.description, preferEn) || '',
        teacherName: TEACHER_NAME,
        level: mapLevel(curso.type),
        status: curso.active !== false ? 'published' : 'draft',
        coverPath: null,
        coverUrl: null,
        lessonCount: lessonDocs.length,
        durationMinutes,
        studentCount: 0,
        createdBy: CREATED_BY,
        publishedAt: published,
        // Preserve legacy linkage for debugging / cleanup later
        legacyCategoryId: curso.categoryId || null,
        legacyType: curso.type || null,
        legacySource: 'academy_cursos',
      },
      module: {
        id: MODULE_ID,
        title: MODULE_TITLE,
        order: 0,
      },
      lessons: lessonDocs,
      categoryId: curso.categoryId || null,
    };
  });

  const paths = legacy.categories
    .map((cat) => {
      const courseIds = courses
        .filter((c) => c.categoryId === cat.id)
        .map((c) => c.id);
      // When --limit slices courses, still create path only if it has courses
      // in scope OR (no limit) include empty paths for completeness.
      if (LIMIT != null && courseIds.length === 0) return null;
      if (LIMIT == null && courseIds.length === 0) {
        // Include all category courses even if somehow not in cursos list
        const fromAll = legacy.cursos
          .filter((c) => c.categoryId === cat.id && c.active !== false)
          .map((c) => c.id);
        if (fromAll.length && ![...courseIdSet].some((id) => fromAll.includes(id))) {
          // limited run skipped these — skip path
          return null;
        }
      }
      return {
        id: cat.id,
        doc: {
          title: pickLocale(cat.name) || cat.slug || cat.id,
          description: pickLocale(cat.description) || '',
          level: 'basic',
          status: cat.active !== false ? 'published' : 'draft',
          courseIds:
            courseIds.length > 0
              ? courseIds
              : legacy.cursos
                  .filter((c) => c.categoryId === cat.id)
                  .map((c) => c.id),
          order: Number(cat.order ?? 0),
          createdBy: CREATED_BY,
          legacySource: 'academy_categories',
          legacySlug: cat.slug || null,
        },
      };
    })
    .filter(Boolean);

  return { courses, paths, enrollments: [], storageCopies: [] };
}

async function applyPlan(db, plan, FieldValue) {
  const now = FieldValue.serverTimestamp();
  const manifest = {
    project: PROJECT_ID,
    appliedAt: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'apply',
    createdBy: CREATED_BY,
    courses: [],
    paths: [],
    lessons: [],
    modules: [],
    enrollments: [],
    storage: [],
    errors: [],
  };

  for (const course of plan.courses) {
    const courseRef = db.collection('courses').doc(course.id);
    const coursePayload = {
      ...course.doc,
      createdAt: now,
      updatedAt: now,
      publishedAt: course.doc.publishedAt
        ? admin.firestore.Timestamp.fromDate(course.doc.publishedAt)
        : null,
    };

    manifest.courses.push({
      source: `academy_cursos/${course.id}`,
      dest: `courses/${course.id}`,
      lessonCount: course.lessons.length,
      status: course.doc.status,
    });

    if (!DRY_RUN) {
      await courseRef.set(coursePayload, { merge: true });
    }

    const moduleRef = courseRef.collection('modules').doc(course.module.id);
    manifest.modules.push({
      dest: `courses/${course.id}/modules/${course.module.id}`,
    });
    if (!DRY_RUN) {
      await moduleRef.set(
        {
          title: course.module.title,
          order: course.module.order,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    // Batch lessons in chunks of 400
    const chunkSize = 400;
    for (let i = 0; i < course.lessons.length; i += chunkSize) {
      const chunk = course.lessons.slice(i, i + chunkSize);
      if (!DRY_RUN) {
        const batch = db.batch();
        for (const lesson of chunk) {
          const lessonRef = courseRef.collection('lessons').doc(lesson.id);
          batch.set(
            lessonRef,
            {
              moduleId: lesson.moduleId,
              title: lesson.title,
              order: lesson.order,
              durationSeconds: lesson.durationSeconds,
              type: lesson.type,
              videoPath: lesson.videoPath,
              videoUrl: lesson.videoUrl,
              bodyMarkdown: lesson.bodyMarkdown,
              questions: lesson.questions,
              passPercent: lesson.passPercent,
              createdAt: now,
              updatedAt: now,
              legacySource: 'academy_lessons',
            },
            { merge: true },
          );
        }
        await batch.commit();
      }
      for (const lesson of chunk) {
        manifest.lessons.push({
          source: `academy_lessons/${lesson.id}`,
          dest: `courses/${course.id}/lessons/${lesson.id}`,
          videoUrlKept: Boolean(lesson.videoUrl),
        });
      }
    }

    console.log(
      `${DRY_RUN ? '[dry-run]' : '[apply]'} course ${course.id}: ${course.lessons.length} lessons, status=${course.doc.status}`,
    );
  }

  for (const p of plan.paths) {
    manifest.paths.push({
      source: `academy_categories/${p.id}`,
      dest: `paths/${p.id}`,
      courseIds: p.doc.courseIds,
    });
    if (!DRY_RUN) {
      await db
        .collection('paths')
        .doc(p.id)
        .set(
          {
            ...p.doc,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
    }
    console.log(
      `${DRY_RUN ? '[dry-run]' : '[apply]'} path ${p.id}: ${p.doc.courseIds.length} courses`,
    );
  }

  // No enrollments in legacy shape — recorded explicitly.
  manifest.enrollments.push({
    note: 'Skipped: no users/{uid}/enrollments or equivalent progress found',
  });
  manifest.storage.push({
    note: 'Skipped copy: lessons retain tokenized videoUrl pointing at training|contratation|tutorials|states prefixes',
  });

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const manifestPath = path.join(
    BACKUP_DIR,
    DRY_RUN ? 'migration-manifest-dry-run.json' : 'migration-manifest.json',
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written: ${manifestPath}`);
  return manifest;
}

async function verify(db) {
  const [courses, paths, published] = await Promise.all([
    db.collection('courses').get(),
    db.collection('paths').get(),
    db.collection('courses').where('status', '==', 'published').get(),
  ]);
  console.log('\n=== VERIFY ===');
  console.log('courses total:', courses.size);
  console.log('courses published:', published.size);
  console.log('paths:', paths.size);

  let lessonTotal = 0;
  for (const c of courses.docs) {
    const lessons = await c.ref.collection('lessons').get();
    const modules = await c.ref.collection('modules').get();
    lessonTotal += lessons.size;
    const sample = lessons.docs[0]?.data();
    console.log(
      `  ${c.id}: modules=${modules.size} lessons=${lessons.size} status=${c.data().status} sampleVideo=${Boolean(sample?.videoUrl)}`,
    );
  }
  console.log('lessons total:', lessonTotal);
  return { courses: courses.size, published: published.size, paths: paths.size, lessonTotal };
}

async function main() {
  console.log(`Academy migration — project=${PROJECT_ID}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'APPLY'}`);
  if (LIMIT != null) console.log(`Limit: ${LIMIT} course(s)`);
  console.log(`Backup/manifest dir: ${BACKUP_DIR}`);

  initAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const legacy = await loadLegacy(db);
  console.log(
    `Legacy loaded: categories=${legacy.categories.length} cursos=${legacy.cursos.length} lessons=${legacy.lessons.length}`,
  );

  const plan = buildPlan(legacy);
  console.log(
    `Plan: ${plan.courses.length} courses, ${plan.paths.length} paths, ${plan.courses.reduce((s, c) => s + c.lessons.length, 0)} lessons`,
  );

  await applyPlan(db, plan, FieldValue);

  if (!DRY_RUN) {
    await verify(db);
  } else {
    console.log(
      '\nDry-run complete. Re-run with --apply to write courses/paths/lessons.',
    );
  }
}

main().catch((err) => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
