"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERNAME_PATTERN = exports.USERNAME_MAX = exports.USERNAME_MIN = void 0;
exports.parseUsername = parseUsername;
exports.displayHandle = displayHandle;
exports.hasClaimedUsername = hasClaimedUsername;
exports.memberPath = memberPath;
exports.parseMentions = parseMentions;
exports.mentionQueryAt = mentionQueryAt;
exports.insertMention = insertMention;
exports.filterMentionCandidates = filterMentionCandidates;
exports.splitChatBody = splitChatBody;
/** Public handle: lowercase, unique via `usernames/{username}`. */
exports.USERNAME_MIN = 3;
exports.USERNAME_MAX = 20;
exports.USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
function parseUsername(raw) {
    const value = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (!exports.USERNAME_PATTERN.test(value))
        return { ok: false, issue: "invalid" };
    return { ok: true, value };
}
/** Fallback handle when `username` is unset: email local-part, else `user` + uid prefix. */
function displayHandle(input) {
    const claimed = String(input.username ?? "")
        .trim()
        .toLowerCase();
    if (exports.USERNAME_PATTERN.test(claimed))
        return claimed;
    const local = String(input.email ?? "")
        .split("@")[0]
        ?.trim()
        .toLowerCase();
    if (local)
        return local;
    const prefix = String(input.uid ?? "").slice(0, 4) || "0000";
    return `user${prefix}`;
}
function hasClaimedUsername(username) {
    return exports.USERNAME_PATTERN.test(String(username ?? "").trim().toLowerCase());
}
/** Public profile path: `/members/{username}` when claimed, else `/members/{uid}`. */
function memberPath(input) {
    const claimed = String(input.username ?? "")
        .trim()
        .toLowerCase();
    if (exports.USERNAME_PATTERN.test(claimed))
        return `/members/${claimed}`;
    return `/members/${input.uid}`;
}
const MENTION_IN_BODY = /(^|[^a-z0-9_])@([a-z0-9_]{1,20})(?![a-z0-9_])/gi;
const URL_IN_BODY = /https?:\/\/[^\s]+/gi;
/** Claimed @handles in a message body (unique, lowercase). */
function parseMentions(body) {
    const found = new Set();
    const re = new RegExp(MENTION_IN_BODY.source, "gi");
    let match;
    while ((match = re.exec(String(body ?? "")))) {
        const parsed = parseUsername(match[2]);
        if (parsed.ok)
            found.add(parsed.value);
    }
    return [...found];
}
/** Active `@prefix` at [cursor], or null if not composing a mention. */
function mentionQueryAt(text, cursor) {
    const safeCursor = Math.max(0, Math.min(cursor, text.length));
    const upto = text.slice(0, safeCursor);
    const match = upto.match(/(^|[^a-z0-9_])@([a-z0-9_]{0,20})$/i);
    if (!match)
        return null;
    const prefix = (match[2] ?? "").toLowerCase();
    const start = safeCursor - prefix.length - 1;
    return { start, prefix };
}
function insertMention(text, cursor, handle) {
    const parsed = parseUsername(handle);
    const token = parsed.ok ? parsed.value : handle.trim().toLowerCase();
    const insert = `@${token} `;
    const query = mentionQueryAt(text, cursor);
    if (!query) {
        const at = Math.max(0, Math.min(cursor, text.length));
        const next = text.slice(0, at) + insert + text.slice(at);
        return { text: next, cursor: at + insert.length };
    }
    const next = text.slice(0, query.start) + insert + text.slice(cursor);
    return { text: next, cursor: query.start + insert.length };
}
function filterMentionCandidates(members, prefix, viewerUid) {
    const q = prefix.trim().toLowerCase();
    return members.filter((member) => {
        if (member.uid === viewerUid)
            return false;
        if (!exports.USERNAME_PATTERN.test(member.username.trim().toLowerCase())) {
            return false;
        }
        if (!q)
            return true;
        const username = member.username.trim().toLowerCase();
        const name = member.name.trim().toLowerCase();
        return username.startsWith(q) || name.includes(q);
    });
}
/** Split a chat body into text, URLs, and @handles for rendering. */
function splitChatBody(text) {
    const source = String(text ?? "");
    if (!source)
        return [{ kind: "text", value: "" }];
    const hits = [];
    const urlRe = new RegExp(URL_IN_BODY.source, "gi");
    let match;
    while ((match = urlRe.exec(source))) {
        hits.push({
            start: match.index,
            end: match.index + match[0].length,
            span: { kind: "url", value: match[0] },
        });
    }
    const mentionRe = new RegExp(MENTION_IN_BODY.source, "gi");
    while ((match = mentionRe.exec(source))) {
        const parsed = parseUsername(match[2]);
        if (!parsed.ok)
            continue;
        const handle = parsed.value;
        const at = match.index + match[1].length;
        const end = at + 1 + match[2].length;
        if (hits.some((hit) => at < hit.end && end > hit.start))
            continue;
        hits.push({
            start: at,
            end,
            span: { kind: "mention", handle, raw: `@${handle}` },
        });
    }
    hits.sort((a, b) => a.start - b.start);
    const out = [];
    let last = 0;
    for (const hit of hits) {
        if (hit.start < last)
            continue;
        if (hit.start > last) {
            out.push({ kind: "text", value: source.slice(last, hit.start) });
        }
        out.push(hit.span);
        last = hit.end;
    }
    if (last < source.length) {
        out.push({ kind: "text", value: source.slice(last) });
    }
    return out.length ? out : [{ kind: "text", value: source }];
}
