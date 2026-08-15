"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLL_LIMITS = exports.POLL_AUDIENCES = exports.POLL_SURFACES = void 0;
exports.emptyPollCounts = emptyPollCounts;
exports.withPollCompatDefaults = withPollCompatDefaults;
const types_1 = require("../banners/types");
exports.POLL_SURFACES = types_1.PROMO_BANNER_SURFACES;
exports.POLL_AUDIENCES = types_1.PROMO_BANNER_AUDIENCES;
exports.POLL_LIMITS = {
    question: 140,
    option: 48,
    minOptions: 2,
    maxOptions: 6,
};
function emptyPollCounts(options) {
    return Object.fromEntries(options.map((option) => [option.id, 0]));
}
function withPollCompatDefaults(partial) {
    const options = partial.options?.length
        ? partial.options
        : [
            { id: "o1", label: { en: "", es: "" } },
            { id: "o2", label: { en: "", es: "" } },
        ];
    const counts = { ...emptyPollCounts(options), ...(partial.counts ?? {}) };
    for (const option of options) {
        counts[option.id] = Math.max(0, Number(counts[option.id] ?? 0));
    }
    return {
        id: partial.id,
        version: partial.version ?? 1,
        active: partial.active === true,
        surface: partial.surface ?? "home",
        audiences: partial.audiences?.length ? partial.audiences : ["all"],
        question: partial.question,
        options,
        allowChange: partial.allowChange === true,
        showResultsBeforeVote: partial.showResultsBeforeVote === true,
        dismissible: partial.dismissible !== false,
        counts,
        voteCount: Math.max(0, Number(partial.voteCount ?? 0)),
        startsAt: partial.startsAt ?? null,
        endsAt: partial.endsAt ?? null,
        createdAt: partial.createdAt ?? null,
        updatedAt: partial.updatedAt ?? null,
        updatedBy: partial.updatedBy ?? null,
    };
}
