import { z } from "zod";
export declare const pollOptionSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const pollUpsertSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
    surface: z.ZodEnum<{
        home: "home";
        rail: "rail";
        academy: "academy";
    }>;
    audiences: z.ZodArray<z.ZodEnum<{
        all: "all";
        admin: "admin";
        student: "student";
        manager: "manager";
        agency_owner: "agency_owner";
        agent: "agent";
        instructor: "instructor";
    }>>;
    question: z.ZodObject<{
        en: z.ZodString;
        es: z.ZodString;
    }, z.core.$strip>;
    options: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            es: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    allowChange: z.ZodOptional<z.ZodBoolean>;
    showResultsBeforeVote: z.ZodOptional<z.ZodBoolean>;
    dismissible: z.ZodOptional<z.ZodBoolean>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bumpVersion: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type PollUpsertInput = z.infer<typeof pollUpsertSchema>;
export declare const votePollSchema: z.ZodObject<{
    pollId: z.ZodString;
    optionId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map