import { redirect } from "next/navigation";

/** Fallback if middleware is bypassed; prefer Accept-Language via proxy.ts. */
export default function RootPage() {
  redirect("/en");
}
