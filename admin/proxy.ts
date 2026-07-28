import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Catch bare paths like /courses so next-intl can redirect to /en/... or /es/...
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
