/** Agent tools shown in the Pulse nav dropdown. */
export const AGENT_TOOLS = [
  {
    id: "afc",
    href: "/tools/afc",
    titleKey: "afcQuoteCardTitle" as const,
  },
] as const;

export type AgentTool = (typeof AGENT_TOOLS)[number];
