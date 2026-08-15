const PUBLIC_BIO_MAX = 280;
export type SocialRelationshipStatus =
  | "none"
  | "outgoing"
  | "incoming"
  | "contact";

export type SocialRelationship = {
  status: SocialRelationshipStatus;
  muted: boolean;
  blockedByMe: boolean;
  isSelf: boolean;
  following: boolean;
};

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export function sanitizeBio(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, PUBLIC_BIO_MAX);
  return trimmed.length ? trimmed : null;
}

export function dmMessagingEnabledValue(options: {
  isGroup: boolean;
  mutualContacts: boolean;
  blocked: boolean;
}): boolean {
  if (options.isGroup) return true;
  return options.mutualContacts && !options.blocked;
}

export function computeRelationship(options: {
  viewerUid: string;
  otherUid: string;
  theyBlockedViewer: boolean;
  viewerBlockedOther: boolean;
  muted: boolean;
  isContact: boolean;
  hasOutgoing: boolean;
  hasIncoming: boolean;
  following?: boolean;
}): SocialRelationship {
  if (options.viewerUid === options.otherUid) {
    return {
      status: "contact",
      muted: false,
      blockedByMe: false,
      isSelf: true,
      following: false,
    };
  }
  if (options.theyBlockedViewer) {
    return {
      status: "none",
      muted: false,
      blockedByMe: false,
      isSelf: false,
      following: false,
    };
  }
  if (options.viewerBlockedOther) {
    return {
      status: "none",
      muted: options.muted,
      blockedByMe: true,
      isSelf: false,
      following: false,
    };
  }
  let status: SocialRelationshipStatus = "none";
  if (options.isContact) status = "contact";
  else if (options.hasOutgoing) status = "outgoing";
  else if (options.hasIncoming) status = "incoming";
  return {
    status,
    muted: options.muted,
    blockedByMe: false,
    isSelf: false,
    following: options.following === true,
  };
}
