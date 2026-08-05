export type PrivacyPrefs = {
  discoverableInDirectory: boolean;
  searchableByEmail: boolean;
  searchableByNpn: boolean;
  showEmailInSearch: boolean;
  showNpnInSearch: boolean;
  allowDirectMessages: boolean;
};

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  discoverableInDirectory: true,
  searchableByEmail: true,
  searchableByNpn: true,
  showEmailInSearch: true,
  showNpnInSearch: true,
  allowDirectMessages: true,
};

export function readPrivacyPrefs(
  raw: unknown,
): PrivacyPrefs {
  const data =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    discoverableInDirectory: data.discoverableInDirectory !== false,
    searchableByEmail: data.searchableByEmail !== false,
    searchableByNpn: data.searchableByNpn !== false,
    showEmailInSearch: data.showEmailInSearch !== false,
    showNpnInSearch: data.showNpnInSearch !== false,
    allowDirectMessages: data.allowDirectMessages !== false,
  };
}
