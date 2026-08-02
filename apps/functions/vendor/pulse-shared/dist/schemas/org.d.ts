import { z } from "zod";
export declare const orgNodeTypeSchema: z.ZodEnum<{
    organization: "organization";
    division: "division";
    region: "region";
    agency: "agency";
    sub_agency: "sub_agency";
    team: "team";
    unit: "unit";
}>;
export declare const orgNodeFixtureSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        organization: "organization";
        division: "division";
        region: "region";
        agency: "agency";
        sub_agency: "sub_agency";
        team: "team";
        unit: "unit";
    }>;
    depth: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>, z.ZodLiteral<7>]>;
    parentId: z.ZodNullable<z.ZodString>;
    path: z.ZodArray<z.ZodString>;
    managerUids: z.ZodArray<z.ZodString>;
    active: z.ZodBoolean;
}, z.core.$strip>;
export type OrgNodeFixture = z.infer<typeof orgNodeFixtureSchema>;
//# sourceMappingURL=org.d.ts.map