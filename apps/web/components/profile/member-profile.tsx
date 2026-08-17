"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { headlineName } from "@/lib/display-name";
import { getOrCreateDm } from "@/lib/firebase/chats";
import { queryThreads } from "@/lib/firebase/forums";
import {
  acceptContactRequest,
  cancelContactRequest,
  declineContactRequest,
  fetchPublicProfile,
  followUser,
  getSocialRelationship,
  listFollowers,
  listFollowing,
  removeContact,
  reportMember,
  sendContactRequest,
  setBlocked,
  setMuted,
  unfollowUser,
  type MemberReportReason,
  type SocialRelationship,
} from "@/lib/firebase/social";
import { mapCallableError } from "@/lib/firebase/callable-errors";
import type { ForumThread, UserProfile, UserRole } from "@/lib/types";
import { Avatar, Button, Panel } from "@/components/ui/primitives";
import { RoleBadgeView } from "@/components/profile/role-badge";
import { displayHandle, hasClaimedUsername, memberPath } from "@pulse/shared";
import {
  formatRelative,
  IconComment,
  IconHeart,
  IconShare,
} from "@/components/forums/forum-ui";

const ROLE_KEY: Record<UserRole, string> = {
  student: "roleStudent",
  agent: "roleAgent",
  agency_owner: "roleAgencyOwner",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
  system: "roleSystem",
};

const REPORT_REASONS: MemberReportReason[] = [
  "spam",
  "harassment",
  "impersonation",
  "other",
];

type TabId = "posts" | "about";
type ListKind = "followers" | "following";

function excerpt(body: string, max = 140) {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function splitDisplayName(name: string): [string, string | null] {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return [trimmed || "—", null];
  return [trimmed.slice(0, space), trimmed.slice(space + 1).trim() || null];
}

function publicLocation(person: UserProfile) {
  const city = person.addressCity?.trim() ?? "";
  const state = person.addressState?.trim().toUpperCase() ?? "";
  if (!city && !state) return null;
  if (!city) return state;
  if (!state) return city;
  return `${city}, ${state}`;
}

export function MemberProfile({ handle }: { handle: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { profile: me } = useAuth();
  const [person, setPerson] = useState<UserProfile | null>(null);
  const [rel, setRel] = useState<SocialRelationship | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listKind, setListKind] = useState<ListKind | null>(null);
  const [listItems, setListItems] = useState<UserProfile[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const card = await fetchPublicProfile(handle);
      if (!card) {
        setPerson(null);
        setRel(null);
        setThreads([]);
        return;
      }
      if (
        hasClaimedUsername(card.username) &&
        card.username &&
        handle !== card.username
      ) {
        router.replace(memberPath({ uid: card.uid, username: card.username }));
      }
      const [relationship, page] = await Promise.all([
        getSocialRelationship(card.uid),
        queryThreads({ authorId: card.uid, pageSize: 24, sort: "recent" }),
      ]);
      setPerson(card);
      setRel(relationship);
      setThreads(page.threads);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [handle, router, t]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const stats = useMemo(() => {
    const posts = threads.length;
    return { posts };
  }, [threads]);

  function errMessage(caught: unknown) {
    return mapCallableError(caught, {
      generic: t("errorGeneric"),
      auth: t("errorAuth"),
      permissionDenied: t("errorGeneric"),
      dmBlocked: t("privacyDmBlocked"),
      notContacts: t("chatsNeedContacts"),
    });
  }

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function shareUrl() {
    if (!person) return "";
    return `${window.location.origin}/${locale}${memberPath({
      uid: person.uid,
      username: person.username,
    })}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(t("errorGeneric"));
    }
  }

  async function shareProfile() {
    const url = shareUrl();
    if (typeof navigator.share === "function" && person) {
      try {
        await navigator.share({ title: headlineName(person), url });
        return;
      } catch {
        // Cancelled or unsupported — fall through to copy.
      }
    }
    await copyLink();
  }

  async function openList(kind: ListKind) {
    if (!person) return;
    setListKind(kind);
    setListLoading(true);
    setListItems([]);
    try {
      const items =
        kind === "followers"
          ? await listFollowers(person.uid)
          : await listFollowing(person.uid);
      setListItems(items);
    } catch (e) {
      setError(errMessage(e));
      setListKind(null);
    } finally {
      setListLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-stage animate-pulse" />
        <p className="mt-8 px-5 text-sm text-muted">{t("loading")}</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="profile-page px-5 py-10">
        <p className="text-sm text-muted">{t("memberNotFound")}</p>
      </div>
    );
  }

  const uid = person.uid;
  const isSelf = rel?.isSelf || me?.uid === uid;
  const canMessage = rel?.status === "contact" && !rel.blockedByMe;
  const atHandle = displayHandle({
    username: person.username,
    email: person.email,
    uid,
  });
  const location = publicLocation(person);
  const joined = person.createdAt
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        person.createdAt,
      )
    : null;
  const coverTint = person.profileBadge?.backgroundColor;
  const givenName = headlineName(person);
  const [firstName, lastName] = splitDisplayName(givenName);
  const mark = (firstName.trim() || givenName).charAt(0).toUpperCase();
  const metaLine = [t(ROLE_KEY[person.role]), location, person.agency]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" · ");
  const quote = person.bio?.trim() ?? "";

  return (
    <div
      className="profile-page"
      style={
        coverTint
          ? ({ ["--profile-cover-tint"]: coverTint } as CSSProperties)
          : undefined
      }
    >
      <div className="profile-stage">
        {person.photoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- emulator/LAN photo URLs */}
            <img
              src={person.photoUrl}
              alt=""
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <span className="profile-stage-wash" aria-hidden />
          </>
        ) : (
          <>
            <span className="profile-stage-mark" aria-hidden>
              {mark}
            </span>
            <span className="profile-stage-orb profile-stage-orb-a" aria-hidden />
            <span className="profile-stage-orb profile-stage-orb-b" aria-hidden />
          </>
        )}
        {person.profileBadge ? (
          <div className="profile-stage-stamp">
            <RoleBadgeView compact badge={person.profileBadge} />
          </div>
        ) : null}
        <div className="profile-stage-tools" ref={menuRef}>
          <button
            type="button"
            className="profile-tool"
            aria-label={t("profileMore")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 min-w-[13rem] overflow-hidden rounded-xl border border-glass-border bg-sheet py-1 shadow-lg">
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  void copyLink();
                }}
              >
                {copied ? t("profileLinkCopied") : t("profileCopyLink")}
              </MenuItem>
              {!isSelf && rel ? (
                <>
                  {rel.status === "contact" ? (
                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        void run(() => removeContact(uid));
                      }}
                    >
                      {t("memberRemoveContact")}
                    </MenuItem>
                  ) : null}
                  {!rel.blockedByMe ? (
                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        void run(() => setMuted(uid, !rel.muted));
                      }}
                    >
                      {rel.muted ? t("memberUnmute") : t("memberMute")}
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    danger
                    onClick={() => {
                      setMenuOpen(false);
                      void run(() => setBlocked(uid, !rel.blockedByMe));
                    }}
                  >
                    {rel.blockedByMe ? t("memberUnblock") : t("memberBlock")}
                  </MenuItem>
                  <MenuItem
                    danger
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                  >
                    {t("profileReport")}
                  </MenuItem>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="profile-stage-scrim">
          <p className="profile-kicker">@{atHandle}</p>
          <h1 className="profile-name">
            <span>{firstName}</span>
            {lastName ? <span>{lastName}</span> : null}
          </h1>
          {isSelf && !hasClaimedUsername(person.username) ? (
            <Link href="/account" className="profile-username-cta">
              {t("usernameChoose")}
            </Link>
          ) : null}
          {metaLine ? <p className="profile-meta">{metaLine}</p> : null}
          {quote ? (
            <blockquote className="profile-quote">
              <p className="line-clamp-2">{quote}</p>
            </blockquote>
          ) : null}
          <div className="profile-stats">
            <Stat
              value={person.followerCount ?? 0}
              label={t("profileStatFollowers")}
              onClick={() => void openList("followers")}
            />
            <Stat
              value={person.followingCount ?? 0}
              label={t("profileStatFollowing")}
              onClick={() => void openList("following")}
            />
            <Stat value={stats.posts} label={t("profileStatPosts")} />
          </div>
        </div>
      </div>

      <div className="profile-sheet">
        <div className="profile-dock">
          {isSelf ? (
            <Link href="/account" className="profile-dock-primary">
              <Button variant="secondary" className="w-full">
                {t("memberEditProfile")}
              </Button>
            </Link>
          ) : (
            <>
              {rel && !rel.blockedByMe ? (
                <Button
                  variant={rel.following ? "secondary" : "primary"}
                  className="profile-dock-primary"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      rel.following ? unfollowUser(uid) : followUser(uid),
                    )
                  }
                >
                  {rel.following ? t("profileFollowing") : t("profileFollow")}
                </Button>
              ) : null}
              <ActionRow
                busy={busy}
                rel={rel}
                canMessage={canMessage}
                onAdd={() => run(() => sendContactRequest(uid))}
                onCancel={() => run(() => cancelContactRequest(uid))}
                onAccept={() => run(() => acceptContactRequest(uid))}
                onDecline={() => run(() => declineContactRequest(uid))}
                onMessage={async () => {
                  if (!me || !canMessage) return;
                  setBusy(true);
                  try {
                    const chat = await getOrCreateDm(me, person);
                    router.push(`/chats/${chat.id}`);
                  } catch (e) {
                    setError(errMessage(e));
                    setBusy(false);
                  }
                }}
              />
            </>
          )}
          <Button
            variant="secondary"
            className="h-10 w-10 shrink-0 px-0"
            aria-label={t("profileShare")}
            onClick={() => void shareProfile()}
          >
            <IconShare width={16} height={16} />
          </Button>
        </div>

        {error ? (
          <p className="mt-3 px-[1.15rem] text-sm text-red-400 md:px-6">{error}</p>
        ) : null}
        {notice ? (
          <p className="mt-3 px-[1.15rem] text-sm text-brand md:px-6">{notice}</p>
        ) : null}

        <div className="profile-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="profile-tab"
            aria-selected={tab === "posts"}
            onClick={() => setTab("posts")}
          >
            {t("profilePosts")}
          </button>
          <button
            type="button"
            role="tab"
            className="profile-tab"
            aria-selected={tab === "about"}
            onClick={() => setTab("about")}
          >
            {t("profileAbout")}
          </button>
        </div>

        {tab === "posts" ? (
          <section className="profile-mosaic">
            {threads.length === 0 ? (
              <div className="feed-card profile-empty">
                <p className="font-display text-2xl font-extrabold tracking-tight">
                  {t("profilePosts")}
                </p>
                <p className="mt-1 text-sm text-muted">{t("profilePostsEmpty")}</p>
              </div>
            ) : (
              threads.map((thread) => {
                const preview = excerpt(thread.body);
                return (
                  <Link
                    key={thread.id}
                    href={`/home/${thread.id}`}
                    className="profile-post feed-card"
                  >
                    <p className="profile-post-title line-clamp-3">{thread.title}</p>
                    {preview ? (
                      <p className="profile-post-excerpt line-clamp-3">{preview}</p>
                    ) : null}
                    <div className="profile-post-meta">
                      <span className="tabular-nums">
                        {formatRelative(thread.createdAt, t("forumsJustNow"))}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconHeart width={13} height={13} />
                        {Math.max(0, thread.score)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconComment width={13} height={13} />
                        {thread.replyCount}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </section>
        ) : (
          <section className="profile-about">
            <AboutBlock
              kicker={t("profileRole")}
              value={t(ROLE_KEY[person.role])}
            />
            {person.agency ? (
              <AboutBlock kicker={t("agency")} value={person.agency} />
            ) : null}
            {location ? (
              <AboutBlock kicker={t("profileLocation")} value={location} />
            ) : null}
            {joined ? (
              <AboutBlock value={t("profileJoined", { date: joined })} />
            ) : null}
            {quote ? (
              <AboutBlock kicker={t("profileAbout")} value={quote} body />
            ) : null}
          </section>
        )}
      </div>

      {listKind ? (
        <MemberListSheet
          title={
            listKind === "followers"
              ? t("profileStatFollowers")
              : t("profileStatFollowing")
          }
          empty={
            listKind === "followers"
              ? t("profileFollowersEmpty")
              : t("profileFollowingEmpty")
          }
          loading={listLoading}
          items={listItems}
          onClose={() => setListKind(null)}
        />
      ) : null}

      {reportOpen ? (
        <ReportDialog
          busy={busy}
          onClose={() => setReportOpen(false)}
          onSubmit={(reason, details) =>
            run(async () => {
              await reportMember(uid, reason, details);
              setReportOpen(false);
              setNotice(t("profileReportSent"));
            })
          }
        />
      ) : null}
    </div>
  );
}

function Stat({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="font-display text-[1.85rem] font-extrabold tabular-nums leading-none tracking-tight md:text-[2.15rem]">
        {value}
      </span>
      <span className="profile-stat-label">{label}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="profile-stat-btn" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="profile-stat">{inner}</div>;
}

function AboutBlock({
  kicker,
  value,
  body = false,
}: {
  kicker?: string;
  value: string;
  body?: boolean;
}) {
  return (
    <div>
      {kicker ? <p className="profile-about-kicker">{kicker}</p> : null}
      <p className={body ? "profile-about-bio" : "profile-about-value"}>{value}</p>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-white/5 ${
        danger ? "text-red-400" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionRow({
  busy,
  rel,
  canMessage,
  onAdd,
  onCancel,
  onAccept,
  onDecline,
  onMessage,
}: {
  busy: boolean;
  rel: SocialRelationship | null;
  canMessage: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onMessage: () => void;
}) {
  const t = useTranslations();
  if (!rel) return null;
  if (rel.status === "none" && !rel.blockedByMe) {
    return (
      <Button variant="secondary" disabled={busy} onClick={onAdd}>
        {t("memberAddContact")}
      </Button>
    );
  }
  if (rel.status === "outgoing") {
    return (
      <Button variant="secondary" disabled={busy} onClick={onCancel}>
        {t("memberCancelRequest")}
      </Button>
    );
  }
  if (rel.status === "incoming") {
    return (
      <>
        <Button disabled={busy} onClick={onAccept}>
          {t("memberAcceptRequest")}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onDecline}>
          {t("memberDeclineRequest")}
        </Button>
      </>
    );
  }
  if (rel.status === "contact") {
    return (
      <Button disabled={busy || !canMessage} onClick={onMessage}>
        {t("memberMessage")}
      </Button>
    );
  }
  return null;
}

function MemberListSheet({
  title,
  empty,
  loading,
  items,
  onClose,
}: {
  title: string;
  empty: string;
  loading: boolean;
  items: UserProfile[];
  onClose: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("dialogClose")}
        onClick={onClose}
      />
      <Panel className="relative z-10 max-h-[80svh] w-full max-w-md overflow-hidden !p-0">
        <div className="border-b border-glass-border p-5">
          <h2 className="font-display text-xl font-bold">{title}</h2>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-sm text-muted">{t("loading")}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted">{empty}</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.uid}
                href={memberPath({ uid: item.uid, username: item.username })}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5"
              >
                <Avatar
                  name={headlineName(item)}
                  photoUrl={item.photoUrl}
                  size={40}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {headlineName(item)}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    @{displayHandle({
                      username: item.username,
                      email: item.email,
                      uid: item.uid,
                    })}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-glass-border p-4">
          <Button variant="secondary" size="sm" className="w-full" onClick={onClose}>
            {t("dialogClose")}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function ReportDialog({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: MemberReportReason, details: string) => void;
}) {
  const t = useTranslations();
  const [reason, setReason] = useState<MemberReportReason>("spam");
  const [details, setDetails] = useState("");
  const labels: Record<MemberReportReason, string> = {
    spam: t("profileReportSpam"),
    harassment: t("profileReportHarassment"),
    impersonation: t("profileReportImpersonation"),
    other: t("profileReportOther"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("dialogClose")}
        onClick={onClose}
      />
      <Panel className="relative z-10 w-full max-w-md overflow-hidden !p-0">
        <form
          className="p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(reason, details);
          }}
        >
          <h2 className="font-display text-xl font-bold">{t("profileReportTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("profileReportHint")}</p>
          <div className="mt-4 space-y-2">
            {REPORT_REASONS.map((item) => (
              <label
                key={item}
                className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
              >
                <input
                  type="radio"
                  name="report-reason"
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {labels[item]}
              </label>
            ))}
          </div>
          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {t("profileReportDetails")}
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, 500))}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              {t("dialogClose")}
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {t("profileReportSubmit")}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
