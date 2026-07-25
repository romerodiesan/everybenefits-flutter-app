"use client";

import { useEffect, useState, type ReactNode, type SVGProps } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { useThemeSettings } from "@/lib/providers/theme-provider";
import { signOutUser } from "@/lib/firebase/auth";
import { getOrCreateSupportChat } from "@/lib/firebase/chats";
import { Button } from "@/components/ui/primitives";

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function IconHome({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 3.2 3.8 10.2c-.4.3-.3.9.2 1V20c0 .6.4 1 1 1h5v-6h4v6h5c.6 0 1-.4 1-1v-8.8c.5-.1.6-.7.2-1L12 3.2Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        />
      )}
    </svg>
  );
}

function IconChat({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H9.2L5.4 20.4c-.5.4-1.2 0-1.2-.6V5.5Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-3.8 2.8c-.5.4-1.2 0-1.2-.6V6.5A2.5 2.5 0 0 1 6.5 4Z"
        />
      )}
    </svg>
  );
}

function IconAi({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
      />
    </svg>
  );
}

function IconSchool({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 3 2.5 8.2 12 13.4l8-4.4V16h1.5V8.2L12 3Zm-6 9.2v3.3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.3l-6 3.3-6-3.3Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M12 4 3 9l9 5 7.2-4V16H21V9L12 4Zm-5.5 8.6v2.9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-2.9"
        />
      )}
    </svg>
  );
}

function IconPerson({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <>
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />
          <path
            fill="currentColor"
            d="M5.5 19.2c.4-3.2 3-5.2 6.5-5.2s6.1 2 6.5 5.2c.1.5-.4 1-1 1H6.5c-.6 0-1.1-.5-1-1Z"
          />
        </>
      ) : (
        <>
          <circle
            cx="12"
            cy="8"
            r="3.2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M6.2 18.5c.6-2.8 2.9-4.3 5.8-4.3s5.2 1.5 5.8 4.3"
          />
        </>
      )}
    </svg>
  );
}

function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M18.5 14.2A7.2 7.2 0 0 1 9.8 5.5 7.4 7.4 0 1 0 18.5 14.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeToggle() {
  const t = useTranslations();
  const { resolvedDark, setMode } = useThemeSettings();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={resolvedDark}
      aria-label={
        resolvedDark ? t("profileThemeLight") : t("profileThemeDark")
      }
      title={resolvedDark ? t("profileThemeLight") : t("profileThemeDark")}
      onClick={() => setMode(resolvedDark ? "light" : "dark")}
      className="relative flex h-8 w-[3.75rem] items-center rounded-full bg-ink/[0.06] p-0.5 transition-colors hover:bg-ink/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
    >
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full bg-sheet shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out ${
          resolvedDark ? "translate-x-[1.55rem]" : "translate-x-0"
        }`}
      />
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center transition-colors ${
          !resolvedDark ? "text-ink" : "text-muted"
        }`}
      >
        <IconSun width={14} height={14} />
      </span>
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center transition-colors ${
          resolvedDark ? "text-ink" : "text-muted"
        }`}
      >
        <IconMoon width={14} height={14} />
      </span>
    </button>
  );
}

const NAV = [
  { href: "/home", key: "navHome" as const, Icon: IconHome },
  { href: "/chats", key: "navChats" as const, Icon: IconChat },
  { href: "/ai", key: "navAi" as const, Icon: IconAi },
  { href: "/academy", key: "navAcademy" as const, Icon: IconSchool },
  { href: "/profile", key: "navProfile" as const, Icon: IconPerson },
];

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [supportBusy, setSupportBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && !profile.profileCompleted && !profile.isAnonymous) {
      router.replace("/complete-profile");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || !profile) {
    return (
      <div className="mesh-bg flex min-h-[100svh] items-center justify-center text-muted">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="mesh-bg flex h-[100svh] flex-col overflow-hidden lg:flex-row">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-glass-border bg-sheet p-3 lg:flex">
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/home"
            className="font-display text-lg font-bold tracking-tight"
          >
            {t("brandShort")}
          </Link>
          <ThemeToggle />
        </div>
        <nav className="mt-6 space-y-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand/10 text-ink"
                    : "text-muted hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <Icon
                  filled={active}
                  className={active ? "text-brand" : "text-muted"}
                  width={20}
                  height={20}
                />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={async () => {
              await signOutUser();
              router.replace("/");
            }}
          >
            {t("navLogout")}
          </Button>
        </div>
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px)+0.35rem)] lg:hidden">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>

        {profile.isAnonymous && (
          <div className="shrink-0 border-b border-brand/30 bg-brand/10 px-4 py-1.5 text-xs text-ink">
            {t("guestBanner")}{" "}
            <Link href="/login" className="font-semibold text-brand underline">
              {t("navLogin")}
            </Link>
          </div>
        )}

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(48px+env(safe-area-inset-bottom,0px)+16px)] lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-1.5 lg:hidden"
        aria-label="Primary"
      >
        <div className="pointer-events-auto pulse-tab-pill mx-auto flex max-w-lg items-center px-0.5 py-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-xl transition ${
                  active
                    ? "max-w-[7rem] flex-[1.2] bg-brand/10 text-ink"
                    : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={t(item.key)}
              >
                <Icon
                  filled={active}
                  className={active ? "text-brand" : "text-muted"}
                  width={20}
                  height={20}
                />
                {active && (
                  <span className="truncate text-[11px] font-semibold tracking-tight">
                    {t(item.key)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {!profile.isAnonymous &&
        pathname !== "/chats" &&
        !pathname.startsWith("/chats/") && (
        <button
          type="button"
          disabled={supportBusy}
          aria-label={t("profileSupport")}
          title={t("chatsSupport")}
          onClick={async () => {
            if (supportBusy) return;
            setSupportBusy(true);
            try {
              const chat = await getOrCreateSupportChat(
                profile,
                "Support Assistant",
                "Hi — how can we help?",
              );
              router.push(`/chats/${chat.id}`);
            } catch (error) {
              console.error(error);
            } finally {
              setSupportBusy(false);
            }
          }}
          className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg transition hover:brightness-110 disabled:opacity-60 right-4 bottom-[calc(52px+env(safe-area-inset-bottom,0px)+12px)] lg:bottom-6 lg:right-6"
        >
          <IconChat filled width={22} height={22} />
        </button>
      )}
    </div>
  );
}
