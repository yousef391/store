export interface YalidineAccount {
  id: string; // "1" | "2"
  name: string;
  api_id: string;
  api_token: string;
}

export const DEFAULT_YALIDINE_ACCOUNTS: YalidineAccount[] = [
  { id: "1", name: "Compte 1", api_id: "", api_token: "" },
  { id: "2", name: "Compte 2", api_id: "", api_token: "" },
];

/**
 * Extracts all Yalidine accounts from store_settings, checking both
 * direct columns (yalidine_api_id/yalidine_api_token, yalidine_api_id_2/yalidine_api_token_2)
 * and the extensible zone_prices.yalidine_account_2 / zone_prices.yalidine_accounts JSON.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getYalidineAccountsFromSettings(settings: any): YalidineAccount[] {
  if (!settings) return DEFAULT_YALIDINE_ACCOUNTS;

  const zp = settings.zone_prices && typeof settings.zone_prices === "object" ? settings.zone_prices : {};
  const storedAccounts: YalidineAccount[] = Array.isArray(zp.yalidine_accounts) ? zp.yalidine_accounts : [];

  // Account 1
  const acc1Stored = storedAccounts.find((a) => a.id === "1") || storedAccounts[0];
  const acc1Id = settings.yalidine_api_id || acc1Stored?.api_id || "";
  const acc1Token = settings.yalidine_api_token || acc1Stored?.api_token || "";
  const acc1Name = acc1Stored?.name || "Compte 1";

  // Account 2
  const acc2Stored = zp.yalidine_account_2 || storedAccounts.find((a) => a.id === "2") || storedAccounts[1];
  const acc2Id = settings.yalidine_api_id_2 || acc2Stored?.api_id || "";
  const acc2Token = settings.yalidine_api_token_2 || acc2Stored?.api_token || "";
  const acc2Name = acc2Stored?.name || "Compte 2";

  return [
    { id: "1", name: acc1Name, api_id: acc1Id, api_token: acc1Token },
    { id: "2", name: acc2Name, api_id: acc2Id, api_token: acc2Token },
  ];
}

/**
 * Gets credentials for the requested Yalidine account (1 or 2).
 * Falls back gracefully to the other account if the requested one is empty.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getYalidineAccount(settings: any, requestedAccountId: string | number = "1"): YalidineAccount {
  const accounts = getYalidineAccountsFromSettings(settings);
  const targetId = String(requestedAccountId || "1");

  const requested = accounts.find((a) => a.id === targetId);
  if (requested && requested.api_id && requested.api_token) {
    return requested;
  }

  // If requested account has no credentials, fallback to the other account with credentials
  const validAlternative = accounts.find((a) => a.api_id && a.api_token);
  if (validAlternative) {
    return validAlternative;
  }

  return requested || accounts[0] || { id: "1", name: "Compte 1", api_id: "", api_token: "" };
}
