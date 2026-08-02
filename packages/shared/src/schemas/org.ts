import { z } from "zod";
import { ORG_NODE_TYPES } from "../org";

export const orgNodeTypeSchema = z.enum(ORG_NODE_TYPES);

export const orgNodeFixtureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: orgNodeTypeSchema,
  depth: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
  ]),
  parentId: z.string().nullable(),
  path: z.array(z.string()),
  managerUids: z.array(z.string()),
  active: z.boolean(),
});

export type OrgNodeFixture = z.infer<typeof orgNodeFixtureSchema>;
