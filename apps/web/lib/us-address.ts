/** Compose a US mailing address string from structured fields. */
export function composeUsAddress(parts: {
  street?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const s = parts.street?.trim() ?? "";
  const a = parts.apt?.trim() ?? "";
  const c = parts.city?.trim() ?? "";
  const st = (parts.state?.trim() ?? "").toUpperCase();
  const z = parts.zip?.trim() ?? "";
  const line1 = [s, a].filter(Boolean).join(", ");
  const stateZip = [st, z].filter(Boolean).join(" ");
  const line2 = [c, stateZip].filter(Boolean).join(", ");
  if (!line1 && !line2) return null;
  if (!line1) return line2;
  if (!line2) return line1;
  return `${line1}\n${line2}`;
}
