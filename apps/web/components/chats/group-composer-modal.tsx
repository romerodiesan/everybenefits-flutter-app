"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import {
  createGroupChat,
  updateGroupChat,
  uploadGroupAvatar,
} from "@/lib/firebase/chats";
import {
  listDirectory,
  searchDirectoryContacts,
  headlineName,
} from "@/lib/firebase/users";
import {
  canConfigureGroupAutoJoin,
  GROUP_SEED_ROLES,
} from "@/lib/roles";
import type { ChatConversation, UserProfile, UserRole } from "@/lib/types";
import {
  Avatar,
  Button,
  Input,
  Modal,
} from "@pulse/ui";
import { ChatDirectorySkeleton } from "@/components/ui/skeleton";

const ROLE_LABEL_KEYS: Record<
  Exclude<UserRole, "guest">,
  | "chatsRoleStudent"
  | "chatsRoleAgent"
  | "chatsRoleInstructor"
  | "chatsRoleManager"
  | "chatsRoleAdmin"
> = {
  student: "chatsRoleStudent",
  agent: "chatsRoleAgent",
  instructor: "chatsRoleInstructor",
  manager: "chatsRoleManager",
  admin: "chatsRoleAdmin",
};

function contactSubtitle(person: UserProfile) {
  const parts = [
    person.email?.trim() || null,
    person.npn?.trim() ? `NPN ${person.npn.trim()}` : null,
    person.role,
  ].filter(Boolean);
  return parts.join(" · ");
}

function callableErrorMessage(
  error: unknown,
  t: (key: string) => string,
) {
  if (!error || typeof error !== "object") return t("errorGeneric");
  const code =
    "code" in error && typeof error.code === "string"
      ? error.code.replace(/^functions\//, "")
      : "";
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.trim()
      : "";
  if (message && message !== code && !message.startsWith("functions/")) {
    return message;
  }
  if (code === "permission-denied") return t("chatsCreateGroupDenied");
  if (code === "unauthenticated") return t("errorAuth");
  return message || t("errorGeneric");
}

export function GroupComposerModal({
  mode,
  profile,
  initialChat = null,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  profile: UserProfile;
  initialChat?: ChatConversation | null;
  onClose: () => void;
  onSaved: (chat: ChatConversation) => void;
}) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const canAutoJoin = canConfigureGroupAutoJoin(profile.role);

  const [groupTitle, setGroupTitle] = useState(
    () => initialChat?.title?.trim() || "",
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() =>
    (initialChat?.memberIds ?? []).filter((id) => id !== profile.uid),
  );
  const [selectedPeople, setSelectedPeople] = useState<
    Record<string, UserProfile>
  >({});
  const [seedRoles, setSeedRoles] = useState<UserRole[]>(() =>
    mode === "edit" ? [...(initialChat?.autoJoinRoles ?? [])] : [],
  );
  const [autoJoin, setAutoJoin] = useState(
    () => Boolean(initialChat?.autoJoinRoles?.length),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    () => initialChat?.photoUrl ?? null,
  );
  const [removePhoto, setRemovePhoto] = useState(false);

  const [directory, setDirectory] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[] | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleDirectory = searchResults ?? directory;
  const titleId = "group-composer-title";

  useEffect(() => {
    let cancelled = false;
    setDirectoryLoading(true);
    listDirectory(profile.uid)
      .then((people) => {
        if (cancelled) return;
        setDirectory(people);
        if (initialChat) {
          const seeded: Record<string, UserProfile> = {};
          for (const person of people) {
            if (initialChat.memberIds.includes(person.uid)) {
              seeded[person.uid] = person;
            }
          }
          // Fallback stubs for members not in the directory sample.
          for (const id of initialChat.memberIds) {
            if (id === profile.uid || seeded[id]) continue;
            seeded[id] = {
              uid: id,
              email: null,
              displayName: initialChat.memberNames[id] ?? id,
              photoUrl: null,
              role: "student",
              isAnonymous: false,
              profileCompleted: true,
              phoneCountryCode: null,
              phoneNumber: null,
              npn: null,
              address: null,
              addressStreet: null,
              addressApt: null,
              addressCity: null,
              addressState: null,
              addressZip: null,
              agency: null,
              createdAt: null,
              updatedAt: null,
            };
          }
          setSelectedPeople(seeded);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(t("chatsDirectoryError"));
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.uid, initialChat, t]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      searchDirectoryContacts(q)
        .then((people) => {
          if (!cancelled) setSearchResults(people);
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) {
            setSearchResults([]);
            setError(t("chatsDirectoryError"));
          }
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, t]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const selectedChips = useMemo(() => {
    return selectedMembers
      .map((id) => selectedPeople[id] ?? directory.find((d) => d.uid === id))
      .filter((person): person is UserProfile => Boolean(person));
  }, [selectedMembers, selectedPeople, directory]);

  function onPickPhoto(file: File | null) {
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(initialChat?.photoUrl ?? null);
      setRemovePhoto(false);
      return;
    }
    setPhotoFile(file);
    setRemovePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function toggleMember(person: UserProfile) {
    setSelectedMembers((prev) => {
      const checked = prev.includes(person.uid);
      if (checked) {
        setSelectedPeople((map) => {
          const next = { ...map };
          delete next[person.uid];
          return next;
        });
        return prev.filter((id) => id !== person.uid);
      }
      setSelectedPeople((map) => ({ ...map, [person.uid]: person }));
      return [...prev, person.uid];
    });
  }

  function toggleSeedRole(role: UserRole) {
    setSeedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!groupTitle.trim()) {
      setError(t("chatsGroupNameRequired"));
      return;
    }
    if (mode === "create" && !selectedMembers.length && !seedRoles.length) {
      setError(t("chatsGroupMembersRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const members = selectedChips;
      if (mode === "create") {
        let chat = await createGroupChat({
          creator: profile,
          title: groupTitle,
          members,
          seedRoles,
          autoJoin: Boolean(canAutoJoin && autoJoin),
        });
        if (photoFile) {
          const url = await uploadGroupAvatar(chat.id, photoFile);
          await updateGroupChat({ chatId: chat.id, photoUrl: url });
          chat = { ...chat, photoUrl: url };
        }
        onSaved(chat);
        onClose();
        return;
      }

      if (!initialChat) throw new Error(t("errorGeneric"));
      const initialIds = new Set(
        initialChat.memberIds.filter((id) => id !== profile.uid),
      );
      const nextIds = new Set(selectedMembers);
      const addMemberIds = [...nextIds].filter((id) => !initialIds.has(id));
      const removeMemberIds = [...initialIds].filter((id) => !nextIds.has(id));

      let photoUrl: string | null | undefined = undefined;
      if (photoFile) {
        photoUrl = await uploadGroupAvatar(initialChat.id, photoFile);
      } else if (removePhoto) {
        photoUrl = null;
      }

      const result = await updateGroupChat({
        chatId: initialChat.id,
        title: groupTitle.trim(),
        addMemberIds,
        removeMemberIds,
        seedRoles: mode === "edit" ? [] : seedRoles,
        autoJoin: Boolean(canAutoJoin && autoJoin),
        autoJoinRoles: canAutoJoin
          ? autoJoin
            ? seedRoles
            : []
          : undefined,
        photoUrl,
      });

      const memberIds = [
        profile.uid,
        ...selectedMembers,
      ].sort();
      const memberNames: Record<string, string> = {
        ...initialChat.memberNames,
        [profile.uid]: headlineName(profile),
      };
      for (const person of members) {
        memberNames[person.uid] = headlineName(person);
      }

      onSaved({
        ...initialChat,
        title: String(result?.title ?? groupTitle.trim()),
        memberIds,
        memberNames,
        photoUrl:
          photoUrl === undefined
            ? initialChat.photoUrl
            : (photoUrl as string | null),
        autoJoinRoles: (result?.autoJoinRoles ?? []).map(String) as UserRole[],
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(callableErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3">
        <h2 id={titleId} className="font-display text-lg font-bold">
          {mode === "edit" ? t("chatsEditGroup") : t("chatsNewGroup")}
        </h2>
        <button
          type="button"
          className="text-xs font-semibold text-muted hover:text-ink"
          onClick={onClose}
        >
          {t("chatsCloseComposer")}
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="relative shrink-0 overflow-hidden rounded-full ring-2 ring-brand/30 transition hover:ring-brand"
            >
              <Avatar
                name={groupTitle.trim() || t("chatsNewGroup")}
                photoUrl={removePhoto ? null : photoPreview}
                size={64}
              />
            </button>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-semibold text-muted">
                {t("chatsGroupPhoto")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {t("chatsGroupPhotoPick")}
                </Button>
                {(photoPreview || photoFile) && !removePhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 text-xs"
                    disabled={busy}
                    onClick={() => {
                      if (photoPreview?.startsWith("blob:")) {
                        URL.revokeObjectURL(photoPreview);
                      }
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      setRemovePhoto(true);
                    }}
                  >
                    {t("chatsGroupPhotoRemove")}
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <Input
            placeholder={t("chatsGroupName")}
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            required
            disabled={busy}
          />

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t("chatsIncludeRoles")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_SEED_ROLES.map((role) => {
                const on = seedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleSeedRole(role)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      on
                        ? "bg-brand text-on-brand"
                        : "bg-white/[0.06] text-muted hover:bg-white/[0.1] hover:text-ink"
                    }`}
                  >
                    {t(ROLE_LABEL_KEYS[role])}
                  </button>
                );
              })}
            </div>
            {seedRoles.length > 0 && mode === "create" && (
              <p className="mt-1.5 text-[11px] text-muted">
                {t("chatsRoleSeedHint")}
              </p>
            )}
          </div>

          {canAutoJoin && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={autoJoin}
                disabled={busy || seedRoles.length === 0}
                onChange={(e) => setAutoJoin(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold">
                  {t("chatsAutoJoin")}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  {t("chatsAutoJoinHint")}
                </span>
              </span>
            </label>
          )}

          {selectedChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedChips.map((person) => (
                <button
                  key={person.uid}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleMember(person)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand"
                >
                  <span className="truncate">{headlineName(person)}</span>
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}

          <Input
            placeholder={t("chatsSearchContacts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />

          {(directoryLoading || searchLoading) && <ChatDirectorySkeleton />}

          {!directoryLoading &&
            !searchLoading &&
            searchQuery.trim().length === 1 && (
              <p className="py-2 text-sm text-muted">{t("chatsSearchMinChars")}</p>
            )}

          {!directoryLoading &&
            !searchLoading &&
            searchQuery.trim().length >= 2 &&
            visibleDirectory.length === 0 && (
              <p className="py-2 text-sm text-muted">{t("chatsSearchEmpty")}</p>
            )}

          {!directoryLoading && !searchLoading && (
            <div className="space-y-0.5">
              {visibleDirectory.map((person) => {
                const checked = selectedMembers.includes(person.uid);
                return (
                  <button
                    key={person.uid}
                    type="button"
                    disabled={busy}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04] disabled:opacity-50"
                    onClick={() => toggleMember(person)}
                  >
                    <Avatar
                      name={headlineName(person)}
                      photoUrl={person.photoUrl}
                      size={40}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {headlineName(person)}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {contactSubtitle(person)}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        checked
                          ? "bg-brand text-on-brand"
                          : "bg-white/[0.06] text-muted"
                      }`}
                    >
                      {checked ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-glass-border p-4">
          <Button
            type="submit"
            className="w-full"
            disabled={
              busy ||
              (mode === "create" &&
                !selectedMembers.length &&
                !seedRoles.length)
            }
          >
            {busy
              ? t("loading")
              : mode === "edit"
                ? t("chatsSaveGroup")
                : t("chatsCreateGroup")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
