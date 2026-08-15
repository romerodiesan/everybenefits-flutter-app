import { z } from "zod";
import { POLL_AUDIENCES, POLL_LIMITS, POLL_SURFACES } from "./types";

const localizedQuestionSchema = z.object({
  en: z.string().trim().min(1).max(POLL_LIMITS.question),
  es: z.string().trim().min(1).max(POLL_LIMITS.question),
});

const localizedOptionSchema = z.object({
  en: z.string().trim().min(1).max(POLL_LIMITS.option),
  es: z.string().trim().min(1).max(POLL_LIMITS.option),
});

export const pollOptionSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,23}$/i, "Invalid option id"),
  label: localizedOptionSchema,
});

export const pollUpsertSchema = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{0,62}$/i, "Invalid poll id")
      .optional(),
    version: z.number().int().min(1).max(10_000).optional(),
    active: z.boolean().optional(),
    surface: z.enum(POLL_SURFACES),
    audiences: z
      .array(z.enum(POLL_AUDIENCES))
      .min(1)
      .max(POLL_AUDIENCES.length),
    question: localizedQuestionSchema,
    options: z
      .array(pollOptionSchema)
      .min(POLL_LIMITS.minOptions)
      .max(POLL_LIMITS.maxOptions),
    allowChange: z.boolean().optional(),
    showResultsBeforeVote: z.boolean().optional(),
    dismissible: z.boolean().optional(),
    startsAt: z.number().int().nullable().optional(),
    endsAt: z.number().int().nullable().optional(),
    bumpVersion: z.boolean().optional(),
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
    if (
      data.startsAt != null &&
      data.endsAt != null &&
      data.endsAt < data.startsAt
    ) {
      ctx.addIssue({
        code: "custom",
        message: "endsAt must be after startsAt.",
        path: ["endsAt"],
      });
    }
  });

export type PollUpsertInput = z.infer<typeof pollUpsertSchema>;

export const votePollSchema = z.object({
  pollId: z.string().trim().min(1).max(64),
  optionId: z.string().trim().min(1).max(24),
});
