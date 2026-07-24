export type DemoCourse = {
  id: string;
  title: string;
  teacher: string;
  level: "basic" | "intermediate" | "advanced";
  hours: string;
  students: string;
  color: string;
  progress?: number;
};

export const demoCourses: DemoCourse[] = [
  {
    id: "c1",
    title: "Fundamentos de seguros de vida",
    teacher: "Elena Vargas",
    level: "basic",
    hours: "8h",
    students: "1.2k",
    color: "#98CA3F",
    progress: 0.45,
  },
  {
    id: "c2",
    title: "Objeciones en ventas consultivas",
    teacher: "Diego Solano",
    level: "intermediate",
    hours: "6h",
    students: "890",
    color: "#33B1FF",
  },
  {
    id: "c3",
    title: "Compliance y ética del agente",
    teacher: "Patricia Gómez",
    level: "basic",
    hours: "4h",
    students: "2.4k",
    color: "#FF6B6B",
  },
  {
    id: "c4",
    title: "Pitch de productos Every",
    teacher: "Andrés Quirós",
    level: "advanced",
    hours: "10h",
    students: "640",
    color: "#FFB84D",
    progress: 0.12,
  },
];

export const demoAiPrompts = [
  "Resumen de objeciones comunes",
  "Script para llamada en frío",
  "Explicar deducible simple",
  "Comparar vida vs gastos médicos",
];
