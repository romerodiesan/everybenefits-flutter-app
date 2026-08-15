"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
} from "@/components/forums/forum-ui";

const ROLE_KEY: Record<UserRole, string> = {
  guest: "roleGuest",
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
    const replies = threads.reduce((sum, item) => sum + (item.replyCount ?? 0), 0);
    const likes = threads.reduce((sum, item) => sum + Math.max(0, item.score), 0);
    return { posts, replies, likes };
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
      <div className="mx-auto w-full max-w-[720px] px-3 py-10 md:px-4">
        <div className="profile-cover animate-pulse" />
        <p className="mt-6 text-sm text-muted">{t("loading")}</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10">
        <p className="mt-3 text-sm text-muted">{t("memberNotFound")}</p>
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

  return (
    <div className="mx-auto w-full max-w-[720px] px-3 pb-16 pt-4 md:px-4">
      <article className="overflow-hidden rounded-[22px] border border-glass-border bg-sheet">
        <div
          className="profile-cover"
          style={
            coverTint
              ? ({ ["--profile-cover-tint"]: coverTint } as CSSProperties)
              : undefined
          }
        />
        <div className="px-4 pb-5 md:px-5">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <div className="rounded-full bg-sheet p-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-2 ring-sheet">
              <Avatar
                name={headlineName(person)}
                photoUrl={person.photoUrl}
                size={96}
              />
            </div>
            <div className="mb-1 flex flex-wrap items-center justify-end gap-2">
              {isSelf ? (
                <Link href="/account">
                  <Button variant="secondary" className="h-9 px-4 text-xs">
                    {t("memberEditProfile")}
                  </Button>
                </Link>
              ) : (
                <>
                  {rel && !rel.blockedByMe ? (
                    <Button
                      variant={rel.following ? "secondary" : "primary"}
                      className="h-9 px-4 text-xs"
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
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 text-lg"
                  aria-label={t("profileMore")}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  ⋯
                </Button>
                {menuOpen ? (
                  <div className="absolute right-0 z-20 mt-1 min-w-[13rem] overflow-hidden rounded-xl border border-glass-border bg-sheet py-1 shadow-lg">
                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        void shareProfile();
                      }}
                    >
                      {t("profileShare")}
                    </MenuItem>
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
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {headlineName(person)}
              </h1>
              <RoleBadgeView compact badge={person.profileBadge} />
              <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
                {t(ROLE_KEY[person.role])}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-muted">@{atHandle}</p>
            {isSelf && !hasClaimedUsername(person.username) ? (
              <Link
                href="/account"
                className="mt-1 inline-block text-xs font-bold text-brand"
              >
                {t("usernameChoose")}
              </Link>
            ) : null}
            {person.agency ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                <span aria-hidden>◎</span>
                {person.agency}
              </p>
            ) : null}
            {location ? (
              <p className="mt-1 text-sm text-muted">{location}</p>
            ) : null}
            {person.bio ? (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed">
                {person.bio}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-1 border-y border-glass-border py-3">
            <Stat value={stats.posts} label={t("profileStatPosts")} />
            <Stat value={stats.replies} label={t("profileStatReplies")} />
            <Stat value={stats.likes} label={t("profileStatLikes")} />
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
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          ) : null}
          {notice ? (
            <p className="mt-3 text-sm text-brand">{notice}</p>
          ) : null}
        </div>
      </article>

      <div className="profile-tabs mt-5 px-1" role="tablist">
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
        <section className="mt-1">
          {threads.length === 0 ? (
            <p className="mt-3 px-1 text-sm text-muted">{t("profilePostsEmpty")}</p>
          ) : (
            <div>
              {threads.map((thread) => {
                const preview = excerpt(thread.body);
                return (
                  <Link
                    key={thread.id}
                    href={`/home/${thread.id}`}
                    className="profile-post"
                  >
                    <p className="profile-post-title line-clamp-2">{thread.title}</p>
                    {preview ? (
                      <p className="profile-post-excerpt line-clamp-2">{preview}</p>
                    ) : null}
                    <div className="profile-post-meta">
                      <span className="tabular-nums">
                        {formatRelative(thread.createdAt, t("forumsJustNow"))}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconHeart width={12} height={12} />
                        {Math.max(0, thread.score)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconComment width={12} height={12} />
                        {thread.replyCount}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-2 px-1">
          <AboutRow label={t("profileRole")} value={t(ROLE_KEY[person.role])} />
          {person.agency ? (
            <AboutRow label={t("agency")} value={person.agency} />
          ) : null}
          {location ? (
            <AboutRow label={t("profileLocation")} value={location} />
          ) : null}
          {joined ? (
            <AboutRow
              label={t("profileJoined", { date: joined })}
              value={null}
            />
          ) : null}
          {person.bio ? (
            <p className="mt-4 text-[15px] leading-relaxed">{person.bio}</p>
          ) : null}
        </section>
      )}

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
      <span className="font-display text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="profile-stat profile-stat-btn flex-1" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="profile-stat flex-1">{inner}</div>;
}

function AboutRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="profile-about-row">
      <p className="min-w-[6rem] text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
        {value ? label : null}
      </p>
      <p className="text-sm font-semibold">{value ?? label}</p>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
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
      <Button
        variant="secondary"
        className="h-9 px-4 text-xs"
        disabled={busy}
        onClick={onAdd}
      >
        {t("memberAddContact")}
      </Button>
    );
  }
  if (rel.status === "outgoing") {
    return (
      <Button
        variant="secondary"
        className="h-9 px-4 text-xs"
        disabled={busy}
        onClick={onCancel}
      >
        {t("memberCancelRequest")}
      </Button>
    );
  }
  if (rel.status === "incoming") {
    return (
      <>
        <Button className="h-9 px-4 text-xs" disabled={busy} onClick={onAccept}>
          {t("memberAcceptRequest")}
        </Button>
        <Button
          variant="secondary"
          className="h-9 px-4 text-xs"
          disabled={busy}
          onClick={onDecline}
        >
          {t("memberDeclineRequest")}
        </Button>
      </>
    );
  }
  if (rel.status === "contact") {
    return (
      <Button
        className="h-9 px-4 text-xs"
        disabled={busy || !canMessage}
        onClick={onMessage}
      >
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
              className="h-9 flex-1 text-xs"
              onClick={onClose}
            >
              {t("dialogClose")}
            </Button>
            <Button type="submit" className="h-9 flex-1 text-xs" disabled={busy}>
              {t("profileReportSubmit")}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
