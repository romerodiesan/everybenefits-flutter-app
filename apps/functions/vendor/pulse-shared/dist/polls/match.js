"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localizePollText = localizePollText;
exports.isPollInSchedule = isPollInSchedule;
exports.isPollOpen = isPollOpen;
exports.isPollVisibleToViewer = isPollVisibleToViewer;
exports.pickPollsForSurface = pickPollsForSurface;
exports.pollOptionShare = pollOptionShare;
const match_1 = require("../banners/match");
function localizePollText(value, locale) {
    const key = locale === "es" ? "es" : "en";
    const primary = value[key]?.trim();
    if (primary)
        return primary;
    return value.en?.trim() || value.es?.trim() || "";
}
function isPollInSchedule(poll, nowMs = Date.now()) {
    return (0, match_1.isBannerInSchedule)(poll, nowMs);
}
function isPollOpen(poll, nowMs = Date.now()) {
    return poll.active === true && isPollInSchedule(poll, nowMs);
}
function isPollVisibleToViewer(poll, opts) {
    if (!poll.active)
        return false;
    if (!isPollInSchedule(poll, opts.nowMs))
        return false;
    return (0, match_1.bannerAudienceMatches)(poll.audiences, opts.role, opts.isAnonymous);
}
function pickPollsForSurface(polls, surface, opts) {
    return polls
        .filter((poll) => poll.surface === surface)
        .filter((poll) => isPollVisibleToViewer(poll, opts))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
function pollOptionShare(poll, optionId) {
    if (poll.voteCount <= 0)
        return 0;
    return Math.max(0, Number(poll.counts[optionId] ?? 0)) / poll.voteCount;
}
