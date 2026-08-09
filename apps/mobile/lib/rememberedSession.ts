import * as SecureStore from "expo-secure-store";

/**
 * Bank-style quick login: after an explicit logout we keep the account's refresh token in
 * hardware-encrypted storage (Keychain / Keystore) so the user can restore their session with
 * just Face ID / fingerprint instead of re-entering email or Google. The token is only ever
 * exchanged after a successful biometric prompt, and is cleared on account deletion or when the
 * user chooses to sign in with a different account.
 */
const REFRESH_TOKEN_KEY = "flarecare.rememberedRefreshToken";
const EMAIL_KEY = "flarecare.rememberedEmail";

export type RememberedSession = { refreshToken: string; email: string | null };

export async function rememberSession(session: RememberedSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
    if (session.email) {
      await SecureStore.setItemAsync(EMAIL_KEY, session.email);
    } else {
      await SecureStore.deleteItemAsync(EMAIL_KEY);
    }
  } catch {
    // non-fatal: quick login simply won't be offered next launch
  }
}

export async function readRememberedSession(): Promise<RememberedSession | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    const email = await SecureStore.getItemAsync(EMAIL_KEY);
    return { refreshToken, email: email ?? null };
  } catch {
    return null;
  }
}

export async function clearRememberedSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(EMAIL_KEY);
  } catch {
    // non-fatal
  }
}
