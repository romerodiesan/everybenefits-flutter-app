"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { headlineName } from "@/lib/display-name";
import { GROUP_SEED_ROLES } from "@/lib/roles";
import type { UserProfile, UserRole } from "@/lib/types";
import { Button, Input, Avatar } from "@/components/ui/primitives";
import { ChatDirectorySkeleton } from "@/components/ui/skeleton";

const ROLE_LABEL_KEYS: Record<
  Exclude<UserRole, "guest">,
  | "chatsRoleStudent"
  | "chatsRoleAgent"
  | "chatsRoleInstructor"
  | "chatsRoleManager"
  | "chatsRoleAdmin"
  | "roleSystem"
> = {
  student: "chatsRoleStudent",
  agent: "chatsRoleAgent",
  instructor: "chatsRoleInstructor",
  manager: "chatsRoleManager",
  admin: "chatsRoleAdmin",
  system: "roleSystem",
};

function contactSubtitle(person: UserProfile) {
  const parts = [
    person.email?.trim() || null,
    person.npn?.trim() ? `NPN ${person.npn.trim()}` : null,
    person.role,
  ].filter(Boolean);
  return parts.join(" · ");
}

export type NewChatComposerProps = {
  mode: "dm" | "group";
  canAutoJoin: boolean;
  composerError: string | null;
  composerBusy: boolean;
  directoryLoading: boolean;
  searchLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  groupTitle: string;
  onGroupTitleChange: (value: string) => void;
  seedRoles: UserRole[];
  onToggleSeedRole: (role: UserRole) => void;
  autoJoin: boolean;
  onAutoJoinChange: (value: boolean) => void;
  selectedMembers: string[];
  selectedPeople: Record<string, UserProfile>;
  directory: UserProfile[];
  visibleDirectory: UserProfile[];
  onToggleMember: (person: UserProfile) => void;
  onStartDm: (person: UserProfile) => void;
  onStartGroup: (e: FormEvent) => void;
  onClose: () => void;
};

export function NewChatComposer({
  mode,
  canAutoJoin,
  composerError,
  composerBusy,
  directoryLoading,
  searchLoading,
  searchQuery,
  onSearchQueryChange,
  groupTitle,
  onGroupTitleChange,
  seedRoles,
  onToggleSeedRole,
  autoJoin,
  onAutoJoinChange,
  selectedMembers,
  selectedPeople,
  directory,
  visibleDirectory,
  onToggleMember,
  onStartDm,
  onStartGroup,
  onClose,
}: NewChatComposerProps) {
  const t = useTranslations();

  return (
    <div className="flex max-h-[min(70vh,32rem)] flex-col border-b border-glass-border">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <p className="text-sm font-semibold">
          {mode === "group" ? t("chatsNewGroup") : t("chatsPickContact")}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-muted hover:text-ink"
          onClick={onClose}
        >
          {t("chatsCloseComposer")}
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto px-4 pb-4 pt-2">
        {composerError && (
          <p className="text-sm text-red-400">{composerError}</p>
        )}

        {mode === "group" && (
          <form onSubmit={onStartGroup} className="space-y-3">
            <Input
              size="sm"
              placeholder={t("chatsGroupName")}
              value={groupTitle}
              onChange={(e) => onGroupTitleChange(e.target.value)}
              required
              disabled={composerBusy}
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
                      disabled={composerBusy}
                      onClick={() => onToggleSeedRole(role)}
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
              {seedRoles.length > 0 && (
                <p className="mt-1.5 text-[11px] text-muted">
                  {t("chatsRoleSeedHint")}
                </p>
              )}
            </div>

            {canAutoJoin && seedRoles.length > 0 && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={autoJoin}
                  disabled={composerBusy}
                  onChange={(e) => onAutoJoinChange(e.target.checked)}
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

            <Button
              type="submit"
              disabled={
                composerBusy ||
                (!selectedMembers.length && !seedRoles.length)
              }
            >
              {composerBusy
                ? t("loading")
                : `${t("chatsCreateGroup")}${
                    selectedMembers.length
                      ? ` · ${t("chatsSelectedCount", {
                          count: selectedMembers.length,
                        })}`
                      : ""
                  }`}
            </Button>
          </form>
        )}

        {mode === "group" && selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedMembers.map((id) => {
              const person =
                selectedPeople[id] ??
                directory.find((d) => d.uid === id) ??
                visibleDirectory.find((d) => d.uid === id);
              if (!person) return null;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={composerBusy}
                  onClick={() => onToggleMember(person)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand"
                >
                  <span className="truncate">{headlineName(person)}</span>
                  <span aria-hidden>×</span>
                </button>
              );
            })}
          </div>
        )}

        <Input
          size="sm"
          placeholder={t("chatsSearchContacts")}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          disabled={composerBusy}
          autoComplete="off"
        />

        {(directoryLoading || searchLoading) && <ChatDirectorySkeleton />}

        {!directoryLoading &&
          !searchLoading &&
          searchQuery.trim().length === 1 && (
            <p className="py-2 text-sm text-muted">
              {t("chatsSearchMinChars")}
            </p>
          )}

        {!directoryLoading &&
          !searchLoading &&
          searchQuery.trim().length >= 2 &&
          visibleDirectory.length === 0 && (
            <p className="py-2 text-sm text-muted">{t("chatsSearchEmpty")}</p>
          )}

        {!directoryLoading &&
          !searchLoading &&
          searchQuery.trim().length < 2 &&
          !directory.length &&
          !composerError && (
            <p className="py-2 text-sm text-muted">{t("chatsNoContacts")}</p>
          )}

        {!directoryLoading && !searchLoading && (
          <div className="space-y-0.5">
            {visibleDirectory.map((person) => {
              const checked = selectedMembers.includes(person.uid);
              return (
                <button
                  key={person.uid}
                  type="button"
                  disabled={composerBusy}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    if (mode === "dm") {
                      onStartDm(person);
                      return;
                    }
                    onToggleMember(person);
                  }}
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
                  {mode === "group" && (
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        checked
                          ? "bg-brand text-on-brand"
                          : "bg-white/[0.06] text-muted"
                      }`}
                    >
                      {checked ? "✓" : "+"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
