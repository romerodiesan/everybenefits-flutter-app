export type CampaignLocale = "en" | "es";

export type LocalizedCopy = { en: string; es: string };

/** If one locale is blank, mirror the filled locale so save doesn't 400. */
export function fillLocalized(value: LocalizedCopy): LocalizedCopy {
  const en = value.en.trim();
  const es = value.es.trim();
  return { en: en || es, es: es || en };
}

export function functionsErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.trim()
      : "";
  return (
    message
      .replace(/^FirebaseError:\s*/i, "")
      .replace(/^functions\/[\w-]+:\s*/i, "")
      .trim() || fallback
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function millisToDatetimeLocal(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "";
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToMillis(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = new Date(trimmed).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function mergeCampaignItem<T extends { id: string }>(
  items: T[],
  next: T,
): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index < 0) return [next, ...items];
  const copy = items.slice();
  copy[index] = next;
  return copy;
}
