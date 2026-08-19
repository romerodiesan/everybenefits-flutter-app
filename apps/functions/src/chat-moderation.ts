import { actorHasPermission } from "./guards";

/** Moderators may clear chats they belong to; group managers may clear any group. */
export function canClearChatThread(opts: {
  uid: string;
  permissions: readonly string[];
  members: Record<string, unknown>;
  isGroup: boolean;
}): boolean {
  if (!actorHasPermission(opts.permissions, "chats.messages.moderate")) {
    return false;
  }
  if (opts.members[opts.uid] === true) return true;
  return (
    opts.isGroup === true &&
    actorHasPermission(opts.permissions, "chats.groups.manage")
  );
}
