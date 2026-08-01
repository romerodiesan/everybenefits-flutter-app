import { createNavigation } from "next-intl/navigation";
import { routing } from "@pulse/i18n";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
