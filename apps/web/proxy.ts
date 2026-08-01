import createMiddleware from "next-intl/middleware";
import { routing } from "@pulse/i18n";

export default createMiddleware(routing);

export const config = {
  // Catch bare paths like /home so next-intl can redirect to /en/home or /es/home.
  // Skip API, Next internals, and static files (paths with a dot).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
