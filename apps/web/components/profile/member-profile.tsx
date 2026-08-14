"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  getSocialRelationship,
  removeContact,
  sendContactRequest,
  setBlocked,
  setMuted,
  type SocialRelationship,
} from "@/lib/firebase/social";
import { mapCallableError } from "@/lib/firebase/callable-errors";
import type { ForumThread, UserProfile } from "@/lib/types";
import { Avatar, Button } from "@/components/ui/primitives";
import { RoleBadgeView } from "@/components/profile/role-badge";
import {
  formatRelative,
  IconComment,
  IconHeart,
} from "@/components/forums/forum-ui";

function handleFrom(person: UserProfile) {
  const local = person.email?.split("@")[0]?.trim();
  if (local) return local;
  return person.uid.slice(0, 8);
}

export function MemberProfile({ uid }: { uid: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile: me } = useAuth();
  const [person, setPerson] = useState<UserProfile | null>(null);
  const [rel, setRel] = useState<SocialRelationship | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [card, relationship, page] = await Promise.all([
        fetchPublicProfile(uid),
        getSocialRelationship(uid),
        queryThreads({ authorId: uid, pageSize: 24, sort: "recent" }),
      ]);
      setPerson(card);
      setRel(relationship);
      setThreads(page.threads);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [uid, t]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const posts = threads.length;
    const replies = threads.reduce((sum, item) => sum + (item.replyCount ?? 0), 0);
    const likes = threads.reduce((sum, item) => sum + Math.max(0, item.score), 0);
    return { posts, replies, likes };
  }, [threads]);

  function errMessage(error: unknown) {
    return mapCallableError(error, {
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
    try {
      await action();
      await reload();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-3 py-10 md:px-4">
        <div className="profile-cover animate-pulse" />
        <p className="mt-6 text-sm text-muted">{t("loading")}</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 py-10">
        <p className="text-sm text-muted">{t("memberNotFound")}</p>
      </div>
    );
  }

  const isSelf = rel?.isSelf || me?.uid === uid;
  const canMessage = rel?.status === "contact" && !rel.blockedByMe;
  const handle = handleFrom(person);

  return (
    <div className="mx-auto w-full max-w-[640px] px-3 pb-16 pt-4 md:px-4">
      <article className="overflow-hidden rounded-[22px] border border-glass-border bg-sheet">
        <div className="profile-cover" />
        <div className="px-4 pb-5 md:px-5">
          <div className="-mt-11 flex items-end justify-between gap-3">
            <div className="rounded-full bg-sheet p-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-2 ring-sheet">
              <Avatar
                name={headlineName(person)}
                photoUrl={person.photoUrl}
                size={88}
              />
            </div>
            <div className="mb-1 flex flex-wrap justify-end gap-2">
              {isSelf ? (
                <Link href="/account">
                  <Button variant="secondary" className="h-9 px-4 text-xs">
                    {t("memberEditProfile")}
                  </Button>
                </Link>
              ) : (
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
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {headlineName(person)}
              </h1>
              <RoleBadgeView compact badge={person.profileBadge} />
            </div>
            <p className="mt-0.5 text-sm font-semibold text-muted">@{handle}</p>
            {person.agency ? (
              <p className="mt-1 text-sm text-muted">◎ {person.agency}</p>
            ) : null}
            {person.bio ? (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed">
                {person.bio}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex gap-1 border-y border-glass-border py-3">
            <Stat value={stats.posts} label={t("profileStatPosts")} />
            <Stat value={stats.replies} label={t("profileStatReplies")} />
            <Stat value={stats.likes} label={t("profileStatLikes")} />
          </div>

          {!isSelf && rel ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {rel.status === "contact" ? (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => run(() => removeContact(uid))}
                >
                  {t("memberRemoveContact")}
                </Button>
              ) : null}
              {!rel.blockedByMe ? (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => run(() => setMuted(uid, !rel.muted))}
                >
                  {rel.muted ? t("memberUnmute") : t("memberMute")}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="h-8 px-3 text-xs text-red-400"
                disabled={busy}
                onClick={() => run(() => setBlocked(uid, !rel.blockedByMe))}
              >
                {rel.blockedByMe ? t("memberUnblock") : t("memberBlock")}
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          ) : null}
        </div>
      </article>

      <section className="mt-6">
        <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
          {t("profilePosts")}
        </h2>
        {threads.length === 0 ? (
          <p className="mt-4 px-1 text-sm text-muted">{t("profilePostsEmpty")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/home/${thread.id}`}
                className="profile-post"
              >
                <p className="font-display text-[17px] font-bold leading-snug tracking-tight">
                  {thread.title}
                </p>
                {thread.body.trim() ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
                    {thread.body}
                  </p>
                ) : null}
                {thread.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {thread.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-3 text-[12px] font-semibold text-muted">
                  <span className="inline-flex items-center gap-1">
                    <IconHeart width={14} height={14} />
                    {Math.max(0, thread.score)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconComment width={14} height={14} />
                    {thread.replyCount}
                  </span>
                  <span className="ml-auto tabular-nums">
                    {formatRelative(thread.createdAt, t("forumsJustNow"))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="profile-stat flex-1">
      <span className="font-display text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
    </div>
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
      <Button className="h-9 px-4 text-xs" disabled={busy} onClick={onAdd}>
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
