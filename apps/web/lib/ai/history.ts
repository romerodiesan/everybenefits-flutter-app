import type { ModelMessage } from "ai";

type StoredTurn = {
  role?: unknown;
  text?: unknown;
  createdAt?: unknown;
};

export function toServerModelHistory(
  turns: StoredTurn[],
  limit: number,
): ModelMessage[] {
  return turns
    .filter(
      (turn): turn is StoredTurn & { role: "user" | "assistant"; text: string } =>
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.text === "string" &&
        turn.text.trim().length > 0,
    )
    .slice(-Math.max(0, limit))
    .map((turn) => ({
      role: turn.role,
      content: turn.text.trim(),
    }));
}
