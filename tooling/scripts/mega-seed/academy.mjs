import { config } from "./config.mjs";
import { commitInBatches, db, FieldValue, log } from "./admin.mjs";

const SAMPLES = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

const LEVELS = ["basic", "intermediate", "advanced"];
const TOPICS = [
  "Life basics",
  "Medicare SEP",
  "ACA subsidy",
  "Compliance",
  "Objections",
  "Closing",
  "Annuities",
  "Disability",
  "Group benefits",
  "Underwriting",
];

function readingSeconds(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(30, Math.round((words / 200) * 60));
}

function buildCourseSpec(index) {
  const topic = TOPICS[index % TOPICS.length];
  const level = LEVELS[index % LEVELS.length];
  return {
    id: `course-${String(index).padStart(3, "0")}`,
    title: `${topic} ${Math.floor(index / TOPICS.length) + 1}`,
    description: `Load-test course on ${topic.toLowerCase()}. Generated for mega-seed volume.`,
    level,
    modules: [
      {
        title: "Introducción",
        lessons: [
          `${topic}: panorama`,
          {
            type: "reading",
            title: `Guía rápida: ${topic}`,
            body: `## ${topic}\n\nContenido de lectura para pruebas de carga. Incluye listas, énfasis y suficiente texto para el estimado de lectura.\n\n- Punto uno\n- Punto dos\n- Punto tres\n\nFin del módulo introductorio.`,
          },
        ],
      },
      {
        title: "Práctica",
        lessons: [
          `${topic}: casos`,
          {
            type: "quiz",
            title: `Quiz: ${topic}`,
            passPercent: 70,
            questions: [
              {
                prompt: `¿Cuál es el objetivo principal al explicar ${topic}?`,
                mode: "single",
                options: ["Claridad y cumplimiento", "Promesas fuera de contrato"],
                correct: [0],
              },
              {
                prompt: "Documenta siempre…",
                mode: "multi",
                options: [
                  "La recomendación",
                  "Coberturas explicadas",
                  "La contraseña del cliente",
                ],
                correct: [0, 1],
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * @param {{ byRole: Record<string,string[]>, fixtures: Record<string,string> }} userCtx
 */
export async function seedAcademy(userCtx) {
  log("academy", `${config.courses} courses, ${config.paths} paths`);
  const firestore = db();
  const now = new Date();
  const authorUid =
    userCtx.fixtures["instructor@pulse.local"] ||
    userCtx.byRole.instructor[0] ||
    userCtx.fixtures["admin@pulse.local"];
  const instructorPool = [
    ...(userCtx.byRole.instructor ?? []),
    ...(userCtx.byRole.admin ?? []).slice(0, 5),
  ].filter(Boolean);
  if (!authorUid) throw new Error("No instructor/admin uid for academy author");

  const ops = [];
  /** @type {Array<{id:string, lessonIds:string[], lessonMeta:Array<{id:string,type:string}>}>} */
  const courses = [];
  let sample = 0;

  for (let c = 0; c < config.courses; c++) {
    const spec = buildCourseSpec(c);
    const lessons = [];
    let order = 0;
    for (let m = 0; m < spec.modules.length; m++) {
      const mod = spec.modules[m];
      const moduleId = `m${m + 1}`;
      for (const entry of mod.lessons) {
        const raw = typeof entry === "string" ? { title: entry } : entry;
        const type = raw.type ?? "video";
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
        if (type === "reading") {
          lesson.bodyMarkdown = raw.body;
          lesson.durationSeconds = readingSeconds(raw.body);
        } else if (type === "quiz") {
          lesson.questions = raw.questions.map((q, qi) => ({
            id: `q${qi + 1}`,
            prompt: q.prompt,
            selectionMode: q.mode ?? "single",
            options: q.options,
          }));
          lesson.answerKey = Object.fromEntries(
            raw.questions.map((q, qi) => [`q${qi + 1}`, q.correct]),
          );
          lesson.durationSeconds = raw.questions.length * 45;
        } else {
          lesson.durationSeconds = 480;
          lesson.videoUrl = SAMPLES[sample % SAMPLES.length];
          sample++;
        }
        lessons.push(lesson);
        order++;
      }
    }

    const totalSeconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
    const instructorIds = [
      authorUid,
      instructorPool[c % Math.max(1, instructorPool.length)],
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    ops.push({
      type: "set",
      ref: firestore.doc(`courses/${spec.id}`),
      data: {
        title: spec.title,
        description: spec.description,
        teacherName: "Ira Instructor",
        instructorIds,
        level: spec.level,
        status: c % 11 === 0 ? "draft" : "published",
        coverPath: null,
        lessonCount: lessons.length,
        durationMinutes: Math.round(totalSeconds / 60),
        studentCount: 0,
        createdBy: authorUid,
        createdAt: now,
        updatedAt: now,
        publishedAt: c % 11 === 0 ? null : now,
      },
    });

    for (let m = 0; m < spec.modules.length; m++) {
      ops.push({
        type: "set",
        ref: firestore.doc(`courses/${spec.id}/modules/m${m + 1}`),
        data: {
          title: spec.modules[m].title,
          order: m,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    for (const lesson of lessons) {
      const { id, answerKey, ...fields } = lesson;
      ops.push({
        type: "set",
        ref: firestore.doc(`courses/${spec.id}/lessons/${id}`),
        data: { ...fields, createdAt: now, updatedAt: now },
      });
      if (answerKey) {
        ops.push({
          type: "set",
          ref: firestore.doc(`courses/${spec.id}/lessons/${id}/secure/answerKey`),
          data: { answers: answerKey, updatedAt: now },
        });
      }
    }

    courses.push({
      id: spec.id,
      lessonIds: lessons.map((l) => l.id),
      lessonMeta: lessons.map((l) => ({ id: l.id, type: l.type })),
      published: c % 11 !== 0,
    });
  }

  const publishedIds = courses.filter((c) => c.published).map((c) => c.id);
  for (let p = 0; p < config.paths; p++) {
    const slice = publishedIds.slice(
      (p * 3) % Math.max(1, publishedIds.length),
      (p * 3) % Math.max(1, publishedIds.length) + 4,
    );
    const courseIds =
      slice.length > 0
        ? slice
        : publishedIds.slice(0, Math.min(3, publishedIds.length));
    ops.push({
      type: "set",
      ref: firestore.doc(`paths/path-${String(p).padStart(2, "0")}`),
      data: {
        title: `Learning path ${p + 1}`,
        description: "Mega-seed learning path for catalog/path UI load.",
        level: LEVELS[p % LEVELS.length],
        status: "published",
        order: p,
        courseIds,
        createdBy: authorUid,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  await commitInBatches(ops);

  // Enrollments (sparse): fraction of users × published courses
  const enrollOps = [];
  const studentCounts = Object.fromEntries(publishedIds.map((id) => [id, 0]));
  const candidates = userCtx.users.filter(
    (u) => u.approvalStatus === "approved" && u.role !== "admin",
  );
  const enrollUserCount = Math.floor(candidates.length * config.enrollRate);
  for (let i = 0; i < enrollUserCount; i++) {
    const user = candidates[i];
    const course = courses.filter((c) => c.published)[i % Math.max(1, publishedIds.length)];
    if (!course) continue;
    const done = i % 5 === 0 ? course.lessonIds : course.lessonIds.slice(0, 1 + (i % course.lessonIds.length));
    const completed =
      done.length >= course.lessonIds.length ? now : null;
    enrollOps.push({
      type: "set",
      ref: firestore.doc(`users/${user.uid}/enrollments/${course.id}`),
      data: {
        courseId: course.id,
        completedLessonIds: done,
        lastLessonId: done[done.length - 1] ?? null,
        lastPositionSeconds: 120 + (i % 200),
        maxPositionSeconds: 200 + (i % 280),
        watchSeconds: 300 + (i % 900),
        enrolledAt: now,
        updatedAt: now,
        completedAt: completed,
        quizAttempts: {},
      },
    });
    studentCounts[course.id] = (studentCounts[course.id] ?? 0) + 1;
  }

  for (const [courseId, count] of Object.entries(studentCounts)) {
    if (count <= 0) continue;
    enrollOps.push({
      type: "update",
      ref: firestore.doc(`courses/${courseId}`),
      data: { studentCount: count, updatedAt: FieldValue.serverTimestamp() },
    });
  }

  await commitInBatches(enrollOps);
  log(
    "academy",
    `${courses.length} courses, ${config.paths} paths, ${enrollOps.filter((o) => o.type === "set").length} enrollments`,
  );
  return { courses };
}
