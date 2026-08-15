"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { setReaction } from "@/lib/firebase/chats";
import { REACTION_EMOJIS, type ChatMessage } from "@/lib/types";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

type ReactionsProps = {
  chatId: string;
  message: ChatMessage;
  uid: string;
  mine: boolean;
};

function useReactionCounts(reactions: Record<string, string> | undefined) {
  return useMemo(() => {
    const map = new Map<string, number>();
    for (const emoji of Object.values(reactions ?? {})) {
      map.set(emoji, (map.get(emoji) ?? 0) + 1);
    }
    // Preserve the canonical emoji order for a stable layout.
    return REACTION_EMOJIS.filter((emoji) => map.has(emoji)).map((emoji) => ({
      emoji,
      count: map.get(emoji) ?? 0,
    }));
  }, [reactions]);
}

function useToggleReaction({
  chatId,
  messageId,
  uid,
  myEmoji,
}: {
  chatId: string;
  messageId: string;
  uid: string;
  myEmoji: string | null;
}) {
  return (emoji: string) => {
    void setReaction({
      chatId,
      messageId,
      uid,
      emoji: myEmoji === emoji ? null : emoji,
    }).catch(() => undefined);
  };
}

/** Count chips sit just under the bubble, still outside its fill. */
export function ReactionChips({
  chatId,
  message,
  uid,
  mine,
}: ReactionsProps) {
  const myEmoji = message.reactions?.[uid] ?? null;
  const counts = useReactionCounts(message.reactions);
  const toggle = useToggleReaction({
    chatId,
    messageId: message.id,
    uid,
    myEmoji,
  });

  if (counts.length === 0) return null;

  return (
    <div
      className={`mt-1 flex flex-wrap items-center gap-1 ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      {counts.map(({ emoji, count }) => {
        const active = myEmoji === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none transition ${
              active
                ? "border-brand/50 bg-brand/15 text-ink"
                : "border-glass-border bg-white/[0.04] text-muted hover:text-ink"
            }`}
            aria-pressed={active}
          >
            <span className="text-sm">{emoji}</span>
            {count > 1 && <span className="font-semibold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Rect of the closest ancestor that would clip an overflowing popover. */
function clipRectFor(element: HTMLElement) {
  let node = element.parentElement;
  while (node) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (overflowX !== "visible" || overflowY !== "visible") {
      return node.getBoundingClientRect();
    }
    node = node.parentElement;
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

/**
 * Gray "add reaction" trigger that lives beside the bubble, on the side facing
 * the middle of the page. The picker unfurls sideways, away from the message.
 */
export function AddReactionButton({
  chatId,
  message,
  uid,
  mine,
  className = "",
}: ReactionsProps & { className?: string }) {
  const t = useTranslations();
  const reduceMotion = useSafeReducedMotion();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const myEmoji = message.reactions?.[uid] ?? null;
  const toggle = useToggleReaction({
    chatId,
    messageId: message.id,
    uid,
    myEmoji,
  });

  // Nudge the picker back inside the scroll pane when it runs past an edge.
  useLayoutEffect(() => {
    const picker = pickerRef.current;
    if (!open || !picker) return;
    const bounds = clipRectFor(picker);
    const rect = picker.getBoundingClientRect();
    const margin = 8;
    if (rect.left < bounds.left + margin) {
      setShift(bounds.left + margin - rect.left);
    } else if (rect.right > bounds.right - margin) {
      setShift(bounds.right - margin - rect.right);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (emoji: string) => {
    toggle(emoji);
    setOpen(false);
  };

  const toggleOpen = () => {
    setShift(0);
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative shrink-0 self-end pb-0.5 ${className}`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={t("chatReactAdd")}
        aria-expanded={open}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.06] hover:text-ink ${
          open ? "bg-white/[0.06] text-ink" : ""
        }`}
      >
        <AddReactionIcon />
      </button>

      <AnimatePresence>
        {open && (
          <div
            ref={pickerRef}
            className={`absolute top-1/2 z-30 ${
              mine ? "right-full mr-1" : "left-full ml-1"
            }`}
            style={{ transform: `translate(${shift}px, -50%)` }}
          >
            <motion.div
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scaleX: 0.35, scaleY: 0.8 }
              }
              animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scaleX: 0.5, scaleY: 0.85 }
              }
              transition={{ type: "spring", stiffness: 520, damping: 32 }}
              style={{ transformOrigin: mine ? "right center" : "left center" }}
              className="pulse-sheet flex gap-0.5 rounded-full px-1.5 py-1 shadow-lg"
              role="menu"
            >
              {REACTION_EMOJIS.map((emoji, index) => {
                // Unfurl outward: for my messages the picker grows leftwards,
                // so the emoji closest to the button is the last one.
                const step = mine ? REACTION_EMOJIS.length - 1 - index : index;
                return (
                  <motion.button
                    key={emoji}
                    type="button"
                    onClick={() => pick(emoji)}
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, x: mine ? 10 : -10, scale: 0.5 }
                    }
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            delay: step * 0.03,
                            type: "spring",
                            stiffness: 600,
                            damping: 24,
                          }
                    }
                    whileHover={
                      reduceMotion ? undefined : { scale: 1.25, y: -2 }
                    }
                    whileTap={{ scale: 0.9 }}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors ${
                      myEmoji === emoji ? "bg-brand/15" : "hover:bg-white/[0.06]"
                    }`}
                    role="menuitem"
                    aria-label={emoji}
                  >
                    {emoji}
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddReactionIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5A8.38 8.38 0 0 1 12.5 20 8.5 8.5 0 1 1 20 7.5" />
      <path d="M8.5 10h.01M14 9.5h.01" />
      <path d="M8.5 14a4 4 0 0 0 5 1.2" />
      <path d="M19 3v4M17 5h4" />
    </svg>
  );
}
