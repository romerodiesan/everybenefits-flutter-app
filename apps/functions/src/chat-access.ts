/** Recipient opt-out is bypassed only by its dedicated permission. */
export function canOpenDirectMessage({
  canOverrideRecipientOptOut,
  recipientAllowsDirectMessages,
}: {
  canOverrideRecipientOptOut: boolean;
  recipientAllowsDirectMessages: boolean;
}): boolean {
  return canOverrideRecipientOptOut || recipientAllowsDirectMessages;
}

/** Existing DMs may be re-enabled for contacts or directory-wide staff. */
export function canResumeDirectMessage({
  canAccessAllContacts,
  mutualContacts,
}: {
  canAccessAllContacts: boolean;
  mutualContacts: boolean;
}): boolean {
  return canAccessAllContacts || mutualContacts;
}
