"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votePollSchema = exports.pollUpsertSchema = exports.pollOptionSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
const localizedQuestionSchema = zod_1.z.object({
    en: zod_1.z.string().trim().min(1).max(types_1.POLL_LIMITS.question),
    es: zod_1.z.string().trim().min(1).max(types_1.POLL_LIMITS.question),
});
const localizedOptionSchema = zod_1.z.object({
    en: zod_1.z.string().trim().min(1).max(types_1.POLL_LIMITS.option),
    es: zod_1.z.string().trim().min(1).max(types_1.POLL_LIMITS.option),
});
exports.pollOptionSchema = zod_1.z.object({
    id: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]{0,23}$/i, "Invalid option id"),
    label: localizedOptionSchema,
});
exports.pollUpsertSchema = zod_1.z
    .object({
    id: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]{0,62}$/i, "Invalid poll id")
        .optional(),
    version: zod_1.z.number().int().min(1).max(10000).optional(),
    active: zod_1.z.boolean().optional(),
    surface: zod_1.z.enum(types_1.POLL_SURFACES),
    audiences: zod_1.z
        .array(zod_1.z.enum(types_1.POLL_AUDIENCES))
        .min(1)
        .max(types_1.POLL_AUDIENCES.length),
    question: localizedQuestionSchema,
    options: zod_1.z
        .array(exports.pollOptionSchema)
        .min(types_1.POLL_LIMITS.minOptions)
        .max(types_1.POLL_LIMITS.maxOptions),
    allowChange: zod_1.z.boolean().optional(),
    showResultsBeforeVote: zod_1.z.boolean().optional(),
    dismissible: zod_1.z.boolean().optional(),
    startsAt: zod_1.z.number().int().nullable().optional(),
    endsAt: zod_1.z.number().int().nullable().optional(),
    bumpVersion: zod_1.z.boolean().optional(),
})
    .superRefine((data, ctx) => {
    const ids = data.options.map((option) => option.id.toLowerCase());
    if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
            code: "custom",
            message: "Option ids must be unique.",
            path: ["options"],
        });
    }
    if (data.startsAt != null &&
        data.endsAt != null &&
        data.endsAt < data.startsAt) {
        ctx.addIssue({
            code: "custom",
            message: "endsAt must be after startsAt.",
            path: ["endsAt"],
        });
    }
});
exports.votePollSchema = zod_1.z.object({
    pollId: zod_1.z.string().trim().min(1).max(64),
    optionId: zod_1.z.string().trim().min(1).max(24),
});
