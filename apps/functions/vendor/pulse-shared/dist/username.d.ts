/** Public handle: lowercase, unique via `usernames/{username}`. */
export declare const USERNAME_MIN = 3;
export declare const USERNAME_MAX = 20;
export declare const USERNAME_PATTERN: RegExp;
export type UsernameIssue = "invalid";
export declare function parseUsername(raw: unknown): {
    ok: true;
    value: string;
} | {
    ok: false;
    issue: UsernameIssue;
};
/** Fallback handle when `username` is unset: email local-part, else `user` + uid prefix. */
export declare function displayHandle(input: {
    username?: string | null;
    email?: string | null;
    uid: string;
}): string;
export declare function hasClaimedUsername(username?: string | null): boolean;
/** Public profile path: `/members/{username}` when claimed, else `/members/{uid}`. */
export declare function memberPath(input: {
    uid: string;
    username?: string | null;
}): string;
/** Claimed @handles in a message body (unique, lowercase). */
export declare function parseMentions(body: string): string[];
export type MentionQuery = {
    /** Index of `@`. */
    start: number;
    prefix: string;
};
/** Active `@prefix` at [cursor], or null if not composing a mention. */
export declare function mentionQueryAt(text: string, cursor: number): MentionQuery | null;
export declare function insertMention(text: string, cursor: number, handle: string): {
    text: string;
    cursor: number;
};
export type MentionCandidate = {
    uid: string;
    username: string;
    name: string;
};
export declare function filterMentionCandidates(members: MentionCandidate[], prefix: string, viewerUid: string): MentionCandidate[];
export type ChatBodySpan = {
    kind: "text";
    value: string;
} | {
    kind: "url";
    value: string;
} | {
    kind: "mention";
    handle: string;
    raw: string;
};
/** Split a chat body into text, URLs, and @handles for rendering. */
export declare function splitChatBody(text: string): ChatBodySpan[];
//# sourceMappingURL=username.d.ts.map