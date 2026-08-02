#!/usr/bin/env node
/**
 * Import Entrenamiento ManhattanLife into Academy (every-benefits-us).
 *
 * Source: scripts/data/manhattanlife-course.json (extracted from the HTML
 * training; Cotizador / Simulador intentionally omitted).
 *
 * Usage:
 *   node scripts/import-manhattanlife-course.mjs              # dry-run
 *   node scripts/import-manhattanlife-course.mjs --dry-run
 *   node scripts/import-manhattanlife-course.mjs --apply
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS  path to service account JSON
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const functionsAdminPath = path.resolve(
  __dirname,
  '../functions/node_modules/firebase-admin',
);
const admin = fs.existsSync(functionsAdminPath)
  ? require(functionsAdminPath)
  : require('firebase-admin');

const PROJECT_ID = 'every-benefits-us';
const DEFAULT_SA =
  '/Users/diesanromero/Documents/every-benefits-us-firebase-adminsdk-647hy-e905aa3d4e.json';
const CREATED_BY = 'Iv02YNrGBSgoChPjhHONDAhCyNL2';
const TEACHER_NAME = 'Every Benefits';
const COURSE_ID = 'manhattanlife-entrenamiento';
const PATH_ID = 'training';
const DATA_PATH = path.join(__dirname, 'data', 'manhattanlife-course.json');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY;

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
  });
}

function readingSeconds(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(30, Math.round((words / 200) * 60));
}

function escCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

function mdList(items) {
  return (items || []).map((item) => `- ${item}`).join('\n');
}

function mdTableFromPairs(filas) {
  if (!filas?.length) return '';
  const lines = ['| Concepto | Detalle |', '| --- | --- |'];
  for (const row of filas) {
    if (Array.isArray(row)) {
      lines.push(`| ${escCell(row[0])} | ${escCell(row[1])} |`);
    } else if (row && typeof row === 'object') {
      lines.push(
        `| ${escCell(row.label)} | ${escCell((row.valores || []).join(' · ') || row.valor || '')} |`,
      );
    }
  }
  return lines.join('\n');
}

function mdTierTable(tabla) {
  const cols = tabla.columnas || [];
  const header = ['Beneficio', ...cols].map(escCell);
  const sep = header.map(() => '---');
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
  ];
  for (const fila of tabla.filas || []) {
    if (Array.isArray(fila)) {
      lines.push(`| ${fila.map(escCell).join(' | ')} |`);
      continue;
    }
    const vals = fila.valores || [];
    lines.push(
      `| ${escCell(fila.label)} | ${vals.map(escCell).join(' | ')} |`,
    );
  }
  return lines.join('\n');
}

function mdTabla(tabla) {
  const parts = [`### ${tabla.titulo}`];
  if (tabla.tipo === 'tier' && tabla.columnas?.length) {
    parts.push('', mdTierTable(tabla));
  } else {
    parts.push('', mdTableFromPairs(tabla.filas));
  }
  if (tabla.nota) {
    parts.push('', `> ${tabla.nota}`);
  }
  return parts.join('\n');
}

function rebuildProductMarkdown(product) {
  const parts = [
    `# ${product.name}`,
    '',
    `**${product.short}** · ${product.insurer}`,
    '',
    `> ${product.tagline}`,
    '',
    '## Resumen',
    '',
    product.resumen,
    '',
    '## ¿Quién se beneficia?',
    '',
    product.quienSeBeneficia,
    '',
    '## Beneficios destacados',
    '',
    mdList(product.destacados),
  ];

  if (product.clasificacion?.length) {
    parts.push(
      '',
      '## Clasificación / tipos de cobertura',
      '',
      mdList(product.clasificacion),
    );
  }

  if (product.tablas?.length) {
    parts.push('', '## Tablas de montos y beneficios');
    for (const tabla of product.tablas) {
      parts.push('', mdTabla(tabla));
    }
  }

  if (product.elegibilidad) {
    parts.push(
      '',
      '## Elegibilidad y suscripción',
      '',
      Array.isArray(product.elegibilidad)
        ? mdList(product.elegibilidad)
        : String(product.elegibilidad),
    );
  }

  if (product.estados) {
    parts.push(
      '',
      '## Estados disponibles',
      '',
      Array.isArray(product.estados)
        ? mdList(product.estados)
        : String(product.estados),
    );
  }

  if (product.procesamiento) {
    parts.push(
      '',
      '## Procesamiento y solicitud',
      '',
      Array.isArray(product.procesamiento)
        ? mdList(product.procesamiento)
        : String(product.procesamiento),
    );
  }

  if (product.reclamos) {
    parts.push(
      '',
      '## Reclamos',
      '',
      Array.isArray(product.reclamos)
        ? mdList(product.reclamos)
        : String(product.reclamos),
    );
  }

  if (product.ejemplos?.length) {
    parts.push('', '## Ejemplos de pago');
    for (const ejemplo of product.ejemplos) {
      parts.push('', `### ${ejemplo.titulo}`);
      if (ejemplo.perfil) parts.push('', `**Perfil:** ${ejemplo.perfil}`);
      if (ejemplo.escenario) parts.push('', ejemplo.escenario);
      if (ejemplo.filas?.length) {
        parts.push('', mdTableFromPairs(ejemplo.filas));
      }
      if (ejemplo.total) parts.push('', `**Total:** ${ejemplo.total}`);
      if (ejemplo.notaFinal) parts.push('', `> ${ejemplo.notaFinal}`);
    }
  }

  if (product.objeciones?.length) {
    parts.push('', '## Objeciones comunes del cliente');
    for (const item of product.objeciones) {
      parts.push('', `### ${item.obj}`, '', item.resp);
    }
  }

  return parts.join('\n').trim() + '\n';
}

function fundamentosMarkdown(data) {
  const parts = [
    '# Fundamentos del portafolio ManhattanLife',
    '',
    'Antes de vender, entiende el lenguaje del seguro y en qué se diferencia cada producto.',
    '',
    '## ¿Qué tipo de producto es cada uno?',
    '',
    '| Producto | Qué cubre | Tipo |',
    '| --- | --- | --- |',
  ];
  for (const row of data.comparativa) {
    parts.push(
      `| ${escCell(row.producto)} | ${escCell(row.cubre)} | ${escCell(row.tipo)} |`,
    );
  }
  parts.push('', '## Glosario', '');
  for (const term of data.glosario) {
    parts.push(`### ${term.t}`, '', term.d, '');
  }
  return parts.join('\n').trim() + '\n';
}

function empresaMarkdown(empresa) {
  const parts = [
    '# Sobre ManhattanLife',
    '',
    `> ${empresa.lema}`,
    '',
    `Fundada en **${empresa.fundacion}** · ${empresa.antiguedad}`,
    '',
    empresa.resumen,
    '',
  ];
  if (empresa.identidad) {
    parts.push('## Identidad', '', empresa.identidad, '');
  }
  if (empresa.paraProductores) {
    parts.push('## Para productores', '', empresa.paraProductores, '');
  }
  if (empresa.filosofiaReclamos) {
    parts.push('## Filosofía de reclamos', '', empresa.filosofiaReclamos, '');
  }
  if (empresa.datos?.length) {
    parts.push('## Datos clave', '', mdTableFromPairs(
      empresa.datos.map((d) => [d.label, d.value]),
    ), '');
  }
  return parts.join('\n').trim() + '\n';
}

function networkMarkdown(data) {
  const info = data.networkInfo;
  const parts = [
    '# Red de atención y servicios auxiliares',
    '',
    info.intro,
    '',
  ];
  if (info.aviso) {
    parts.push(`> ${info.aviso}`, '');
  }
  parts.push('## Servicios incluidos', '');
  for (const svc of data.networkServices) {
    parts.push(`### ${svc.nombre}`, '', `*${svc.tagline}*`, '', svc.quees, '');
    if (svc.datos?.length) parts.push(mdList(svc.datos), '');
    if (svc.nota) parts.push(`> ${svc.nota}`, '');
    if (svc.sitio) parts.push(`Sitio: ${svc.sitio}`, '');
  }
  if (info.disclosureSitio) {
    parts.push('## Aviso', '', info.disclosureSitio, '');
  }
  return parts.join('\n').trim() + '\n';
}

function buildCourse(data) {
  const modules = [];
  const lessons = [];
  let lessonOrder = 0;

  function addModule(title) {
    const order = modules.length;
    const id = `m${order + 1}`;
    modules.push({ id, title, order });
    return id;
  }

  function addReading(moduleId, title, bodyMarkdown) {
    const id = `l${lessonOrder + 1}`;
    lessons.push({
      id,
      moduleId,
      title,
      order: lessonOrder,
      type: 'reading',
      durationSeconds: readingSeconds(bodyMarkdown),
      videoPath: null,
      videoUrl: null,
      bodyMarkdown,
      questions: [],
      passPercent: 70,
      answerKey: null,
    });
    lessonOrder += 1;
  }

  function addQuiz(moduleId, title, quiz) {
    const id = `l${lessonOrder + 1}`;
    const questions = quiz.map((q, index) => ({
      id: `q${index + 1}`,
      prompt: q.q,
      selectionMode: 'single',
      options: q.options,
    }));
    const answerKey = Object.fromEntries(
      quiz.map((q, index) => [`q${index + 1}`, [q.correct]]),
    );
    lessons.push({
      id,
      moduleId,
      title,
      order: lessonOrder,
      type: 'quiz',
      durationSeconds: quiz.length * 45,
      videoPath: null,
      videoUrl: null,
      bodyMarkdown: null,
      questions,
      passPercent: 70,
      answerKey,
    });
    lessonOrder += 1;
  }

  const m1 = addModule('Fundamentos');
  addReading(m1, 'Glosario y comparativa de productos', fundamentosMarkdown(data));

  const m2 = addModule('Sobre ManhattanLife');
  addReading(m2, 'La compañía detrás del portafolio', empresaMarkdown(data.empresa));

  for (const product of data.products) {
    const mid = addModule(product.short);
    addReading(
      mid,
      `${product.short}: ficha del producto`,
      rebuildProductMarkdown(product),
    );
    if (product.quiz?.length) {
      addQuiz(mid, `Quiz ${product.short}`, product.quiz);
    }
  }

  const mNet = addModule('Red de Atención');
  addReading(
    mNet,
    'Servicios auxiliares y red de proveedores',
    networkMarkdown(data),
  );

  const totalSeconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
  const now = new Date();

  return {
    course: {
      title: 'Entrenamiento ManhattanLife',
      description:
        'Portafolio de salud, vida y accidentes de ManhattanLife: fundamentos, fichas de producto, objeciones y quizzes de certificación. Sin cotizador (disponible en Herramientas).',
      teacherName: TEACHER_NAME,
      level: 'basic',
      status: 'published',
      coverPath: null,
      coverUrl: null,
      lessonCount: lessons.length,
      durationMinutes: Math.max(1, Math.round(totalSeconds / 60)),
      studentCount: 0,
      createdBy: CREATED_BY,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      source: 'manhattanlife-html-entrenamiento',
    },
    modules,
    lessons,
  };
}

async function applyPlan(db, plan) {
  const courseRef = db.collection('courses').doc(COURSE_ID);
  const batch = db.batch();

  batch.set(courseRef, plan.course, { merge: true });

  for (const mod of plan.modules) {
    const { id, ...fields } = mod;
    batch.set(courseRef.collection('modules').doc(id), {
      title: fields.title,
      order: fields.order,
      updatedAt: plan.course.updatedAt,
    });
  }

  for (const lesson of plan.lessons) {
    const { id, answerKey, ...fields } = lesson;
    batch.set(courseRef.collection('lessons').doc(id), {
      ...fields,
      updatedAt: plan.course.updatedAt,
    });
    if (answerKey) {
      batch.set(
        courseRef.collection('lessons').doc(id).collection('secure').doc('answerKey'),
        {
          answers: answerKey,
          updatedAt: plan.course.updatedAt,
        },
      );
    }
  }

  const pathRef = db.collection('paths').doc(PATH_ID);
  batch.set(
    pathRef,
    {
      courseIds: admin.firestore.FieldValue.arrayUnion(COURSE_ID),
      updatedAt: plan.course.updatedAt,
    },
    { merge: true },
  );

  await batch.commit();
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Missing data file: ${DATA_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const plan = buildCourse(data);

  const quizLessons = plan.lessons.filter((l) => l.type === 'quiz');
  const readingLessons = plan.lessons.filter((l) => l.type === 'reading');
  const quizQs = quizLessons.reduce((n, l) => n + l.questions.length, 0);

  console.log(`${DRY_RUN ? '[dry-run]' : '[apply]'} course ${COURSE_ID}`);
  console.log(`  title: ${plan.course.title}`);
  console.log(`  modules: ${plan.modules.length}`);
  console.log(
    `  lessons: ${plan.lessons.length} (${readingLessons.length} reading, ${quizLessons.length} quiz)`,
  );
  console.log(`  quiz questions: ${quizQs}`);
  console.log(`  durationMinutes: ${plan.course.durationMinutes}`);
  console.log(`  path: ${PATH_ID} ← arrayUnion(${COURSE_ID})`);
  console.log('  modules:');
  for (const mod of plan.modules) {
    const modLessons = plan.lessons.filter((l) => l.moduleId === mod.id);
    console.log(
      `    ${mod.id} ${mod.title}: ${modLessons.map((l) => `${l.type}:${l.title}`).join(' | ')}`,
    );
  }

  // Sanity: no cotizador content
  const blob = JSON.stringify(plan).toLowerCase();
  if (blob.includes('simulador') || blob.includes('cotizador afc')) {
    throw new Error('Plan unexpectedly contains cotizador/simulador content');
  }

  if (DRY_RUN) {
    console.log('\nDry-run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  initAdmin();
  const db = admin.firestore();
  await applyPlan(db, plan);

  const snap = await db.collection('courses').doc(COURSE_ID).get();
  const pathSnap = await db.collection('paths').doc(PATH_ID).get();
  console.log('\nVerified:');
  console.log(`  course.status=${snap.data()?.status} lessonCount=${snap.data()?.lessonCount}`);
  console.log(
    `  path.training.courseIds includes course: ${Array.isArray(pathSnap.data()?.courseIds) && pathSnap.data().courseIds.includes(COURSE_ID)}`,
  );
  console.log('Done.');
}

main().catch((error) => {
  console.error(`\nImport failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
