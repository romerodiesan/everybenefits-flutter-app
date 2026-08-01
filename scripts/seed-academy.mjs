#!/usr/bin/env node
// Seeds the Academy catalog into the Firestore emulator.
//
// Usage: node scripts/seed-academy.mjs
// Env:   FIRESTORE_EMULATOR_HOST (default 127.0.0.1:8080)
//        GCLOUD_PROJECT          (default every-insurance)
//
// Video lessons point at public sample MP4s so the player works without
// uploading anything to Storage. Real courses store `videoPath` instead and the
// app resolves a download URL at play time. Reading lessons carry Markdown, and
// quiz lessons keep their answer key in `lessons/{id}/secure/answerKey`.

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const PROJECT = process.env.GCLOUD_PROJECT ?? 'every-insurance';
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

const SEED_AUTHOR = 'seed-admin';

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encode) } };
  }
  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'object':
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, encode(v)]),
          ),
        },
      };
    default:
      throw new Error(`Unsupported seed value: ${typeof value}`);
  }
}

async function setDoc(path, data) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, encode(v)]),
      ),
    }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${await res.text()}`);
  }
}

const SAMPLES = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

// A lesson is either a plain string (video) or an object with an explicit type.
const COURSES = [
  {
    id: 'seed-life-basics',
    title: 'Fundamentos de seguros de vida',
    description:
      'Comprende los productos de vida, para quién son y cómo explicarlos con claridad en la primera conversación con un cliente.',
    teacherName: 'Elena Vargas',
    level: 'basic',
    modules: [
      {
        title: 'Bases del producto',
        lessons: [
          '¿Qué cubre un seguro de vida?',
          {
            type: 'reading',
            title: 'Vida temporal vs vida entera',
            body: [
              '# Temporal o entera',
              '',
              'Los dos productos protegen a la familia, pero resuelven necesidades distintas.',
              '',
              '## Vida temporal',
              '',
              '- Cubre un plazo definido: 10, 20 o 30 años.',
              '- Prima **más baja** para la misma suma asegurada.',
              '- Ideal cuando la deuda o los hijos tienen fecha de salida.',
              '',
              '## Vida entera',
              '',
              '- Cubre toda la vida y acumula valor en efectivo.',
              '- Prima más alta, pero *nivelada* desde el inicio.',
              '',
              '> Si el cliente duda, empieza por el plazo de la necesidad, no por el precio.',
            ].join('\n'),
          },
          'Beneficiarios y designaciones',
        ],
      },
      {
        title: 'Conversación con el cliente',
        lessons: [
          'Detectar la necesidad real',
          'Explicar la prima sin jerga',
          {
            type: 'quiz',
            title: 'Comprueba lo aprendido',
            passPercent: 70,
            questions: [
              {
                prompt: '¿Qué caracteriza a un seguro de vida temporal?',
                mode: 'single',
                options: [
                  'Cubre un plazo definido',
                  'Acumula valor en efectivo',
                  'Nunca vence',
                ],
                correct: [0],
              },
              {
                prompt: '¿Cuáles son señales de una necesidad real?',
                mode: 'multi',
                options: [
                  'Tiene deudas a plazo',
                  'Tiene hijos dependientes',
                  'Le gustó el color del folleto',
                ],
                correct: [0, 1],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'seed-objections',
    title: 'Objeciones en ventas consultivas',
    description:
      'Un método repetible para escuchar, clasificar y responder las objeciones más comunes sin sonar a guion.',
    teacherName: 'Diego Solano',
    level: 'intermediate',
    modules: [
      {
        title: 'Escuchar antes de responder',
        lessons: ['Tipos de objeción', 'La pausa que cierra ventas'],
      },
      {
        title: 'Respuestas que funcionan',
        lessons: ['"Está muy caro"', '"Lo voy a pensar"', '"Ya tengo uno"'],
      },
    ],
  },
  {
    id: 'seed-compliance',
    title: 'Compliance y ética del agente',
    description:
      'Lo que puedes y no puedes prometer, cómo documentar cada venta y por qué la ética es tu mejor herramienta comercial.',
    teacherName: 'Patricia Gómez',
    level: 'basic',
    modules: [
      {
        title: 'Marco regulatorio',
        lessons: [
          {
            type: 'reading',
            title: 'Deberes del agente',
            body: [
              '# Lo que sí y lo que no',
              '',
              'Tu licencia te obliga a poner el interés del cliente antes de la comisión.',
              '',
              '1. Explica coberturas y exclusiones antes de firmar.',
              '2. No prometas rendimientos que no estén en el contrato.',
              '3. Documenta cada recomendación y su motivo.',
              '',
              'Consulta la circular vigente en el [portal regulatorio](https://example.com/compliance).',
            ].join('\n'),
          },
          'Publicidad y promesas',
        ],
      },
      {
        title: 'Documentación',
        lessons: [
          'Expediente del cliente',
          'Manejo de datos personales',
          {
            type: 'quiz',
            title: 'Evaluación de compliance',
            passPercent: 80,
            questions: [
              {
                prompt: '¿Puedes prometer un rendimiento fuera del contrato?',
                mode: 'single',
                options: ['Nunca', 'Sí, si el cliente insiste'],
                correct: [0],
              },
              {
                prompt: '¿Qué debe quedar documentado en el expediente?',
                mode: 'multi',
                options: [
                  'La recomendación y su motivo',
                  'Coberturas y exclusiones explicadas',
                  'La contraseña del cliente',
                ],
                correct: [0, 1],
              },
              {
                prompt: 'Los datos personales del cliente se comparten…',
                mode: 'single',
                options: [
                  'Solo con autorización y fin declarado',
                  'Con cualquier colega del equipo',
                ],
                correct: [0],
              },
            ],
          },
        ],
      },
    ],
  },
];

const PATHS = [
  {
    id: 'seed-path-new-agent',
    title: 'Agente nuevo',
    description:
      'Tu primer mes: entiende los productos, aprende a hablar con clientes y cierra tu primera venta con criterio.',
    level: 'basic',
    order: 0,
    courseIds: ['seed-life-basics', 'seed-compliance', 'seed-objections'],
  },
  {
    id: 'seed-path-closing',
    title: 'Cierre y objeciones',
    description:
      'Para quien ya prospecta pero se queda a mitad del camino: técnica de cierre y manejo de objeciones.',
    level: 'intermediate',
    order: 1,
    courseIds: ['seed-objections', 'seed-life-basics'],
  },
];

/** Rough reading time, mirroring `estimateReadingSeconds` in the webapp. */
function readingSeconds(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(30, Math.round((words / 200) * 60));
}

async function main() {
  const now = new Date();
  let sample = 0;

  for (const course of COURSES) {
    const lessons = [];

    let order = 0;
    for (let m = 0; m < course.modules.length; m++) {
      const mod = course.modules[m];
      const moduleId = `m${m + 1}`;

      for (const entry of mod.lessons) {
        const raw = typeof entry === 'string' ? { title: entry } : entry;
        const type = raw.type ?? 'video';
        const lesson = {
          id: `l${order + 1}`,
          moduleId,
          title: raw.title,
          order,
          type,
          videoPath: null,
          videoUrl: null,
          bodyMarkdown: null,
          questions: [],
          passPercent: raw.passPercent ?? 70,
          durationSeconds: 0,
          answerKey: null,
        };

        if (type === 'reading') {
          lesson.bodyMarkdown = raw.body;
          lesson.durationSeconds = readingSeconds(raw.body);
        } else if (type === 'quiz') {
          lesson.questions = raw.questions.map((question, index) => ({
            id: `q${index + 1}`,
            prompt: question.prompt,
            selectionMode: question.mode ?? 'single',
            options: question.options,
          }));
          lesson.answerKey = Object.fromEntries(
            raw.questions.map((question, index) => [
              `q${index + 1}`,
              question.correct,
            ]),
          );
          lesson.durationSeconds = raw.questions.length * 45;
        } else {
          // Sample clips are short; keep a believable duration for the UI.
          lesson.durationSeconds = 480;
          lesson.videoUrl = SAMPLES[sample % SAMPLES.length];
          sample++;
        }

        lessons.push(lesson);
        order++;
      }
    }

    const totalSeconds = lessons.reduce(
      (sum, lesson) => sum + lesson.durationSeconds,
      0,
    );

    await setDoc(`courses/${course.id}`, {
      title: course.title,
      description: course.description,
      teacherName: course.teacherName,
      level: course.level,
      status: 'published',
      coverPath: null,
      lessonCount: lessons.length,
      durationMinutes: Math.round(totalSeconds / 60),
      studentCount: 0,
      createdBy: SEED_AUTHOR,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });

    for (let m = 0; m < course.modules.length; m++) {
      await setDoc(`courses/${course.id}/modules/m${m + 1}`, {
        title: course.modules[m].title,
        order: m,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const lesson of lessons) {
      const { id, answerKey, ...fields } = lesson;
      await setDoc(`courses/${course.id}/lessons/${id}`, {
        ...fields,
        createdAt: now,
        updatedAt: now,
      });
      if (answerKey) {
        await setDoc(`courses/${course.id}/lessons/${id}/secure/answerKey`, {
          answers: answerKey,
          updatedAt: now,
        });
      }
    }

    const byType = lessons.reduce((counts, lesson) => {
      counts[lesson.type] = (counts[lesson.type] ?? 0) + 1;
      return counts;
    }, {});
    const summary = Object.entries(byType)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    console.log(`seeded course ${course.id} (${summary})`);
  }

  for (const path of PATHS) {
    await setDoc(`paths/${path.id}`, {
      title: path.title,
      description: path.description,
      level: path.level,
      status: 'published',
      order: path.order,
      courseIds: path.courseIds,
      createdBy: SEED_AUTHOR,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`seeded path ${path.id}`);
  }

  console.log(`\nDone. Firestore emulator at ${HOST}, project ${PROJECT}.`);
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  console.error('Is the Firestore emulator running? scripts/start-emulators.sh');
  process.exit(1);
});
