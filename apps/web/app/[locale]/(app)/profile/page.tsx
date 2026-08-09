import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

/** Legacy path — account settings live at `/account` (ADR-006). */
export default async function ProfileRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value) && value[0]) q.set(key, value[0]);
  }
  const qs = q.toString();
  redirect({
    href: qs ? `/account?${qs}` : "/account",
    locale,
  });
}
