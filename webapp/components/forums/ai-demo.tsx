"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { demoAiPrompts } from "@/lib/demo";
import { Badge, Button, Input } from "@/components/ui/primitives";

type Msg = { role: "user" | "assistant"; text: string };

export function AiDemo() {
  const t = useTranslations();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "assistant", text: t("aiReply") },
    ]);
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{t("aiTitle")}</h1>
        <Badge>{t("aiDemoBadge")}</Badge>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {!messages.length && (
          <div>
            <p className="text-muted">{t("aiEmpty")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {demoAiPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="pulse-sheet h-8 rounded-lg px-3 text-xs font-semibold"
                  onClick={() => send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[85%] px-4 py-3 ${
              message.role === "user"
                ? "ml-auto bubble-mine"
                : "bubble-other"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{message.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("aiPlaceholder")}
        />
        <Button type="submit">{t("chatsSend")}</Button>
      </form>
    </div>
  );
}
