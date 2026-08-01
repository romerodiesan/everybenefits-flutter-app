"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createThread } from "@/lib/firebase/forums";
import { headlineName } from "@/lib/roles";
import { FORUM_TAGS, type UserProfile } from "@/lib/types";
import {
  Avatar,
  Button,
  Input,
  Label,
  TextArea,
} from "@pulse/ui";
import { TagEditor } from "@/components/forums/tag-controls";
import { IconSpark } from "@/components/forums/forum-thread-list";

export function ForumComposer({
  profile,
  canPost,
  reduceMotion,
  open,
  onOpenChange,
}: {
  profile: UserProfile;
  canPost: boolean;
  reduceMotion: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["general"]);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    try {
      const id = await createThread({ title, body, tags, author: profile });
      onOpenChange(false);
      setTitle("");
      setBody("");
      setTags(["general"]);
      router.push(`/home/${id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!canPost) return null;

  return (
    <AnimatePresence mode="wait">
      {!open ? (
        <motion.button
          key="composer-idle"
          type="button"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          onClick={() => onOpenChange(true)}
          className="feed-card flex w-full items-center gap-3 p-3.5 text-left transition hover:ring-1 hover:ring-brand/25"
        >
          <Avatar
            name={headlineName(profile)}
            photoUrl={profile.photoUrl}
            size={42}
          />
          <span className="flex h-11 flex-1 items-center rounded-2xl border border-dashed border-glass-border bg-mesh/60 px-4 text-sm text-muted">
            {t("forumsComposerPrompt")}
          </span>
          <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-brand/12 text-brand sm:inline-flex">
            <IconSpark />
          </span>
        </motion.button>
      ) : (
        <motion.form
          key="composer-open"
          onSubmit={onCreate}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
          className="feed-card space-y-3 p-4 ring-1 ring-brand/20"
        >
          <div className="flex items-center gap-2.5">
            <Avatar
              name={headlineName(profile)}
              photoUrl={profile.photoUrl}
              size={36}
            />
            <div>
              <p className="font-display text-sm font-bold">
                {t("createThreadTitle")}
              </p>
              <p className="text-[11px] text-muted">
                {t("forumsComposerHint")}
              </p>
            </div>
          </div>
          <div>
            <Label>{t("createThreadTitle")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
              placeholder={t("forumsComposerTitleHint")}
            />
          </div>
          <div>
            <Label>{t("createThreadBody")}</Label>
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder={t("forumsComposerBodyHint")}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FORUM_TAGS.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setTags((prev) =>
                    prev.includes(item)
                      ? prev
                      : [...prev.slice(0, 4), item],
                  )
                }
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  tags.includes(item)
                    ? "bg-brand text-on-brand"
                    : "bg-brand/10 text-brand hover:bg-brand/16"
                }`}
              >
                #{item}
              </button>
            ))}
          </div>
          <TagEditor value={tags} onChange={setTags} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("forumsComposerCancel")}
            </Button>
            <Button type="submit" disabled={busy || !tags.length}>
              {t("createThreadSubmit")}
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
