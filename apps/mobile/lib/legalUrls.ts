const cleanBase = (value?: string) => (value || "").trim().replace(/\/$/, "");

/** Canonical site for legal pages when env is unset (App Store / Play links). */
const DEFAULT_LEGAL_BASE = "https://flarecare.com";

/** HTTPS base for store listings / web only — mobile shows legal text in-app. */
export function getLegalBaseUrl(): string {
  const explicit = cleanBase(process.env.EXPO_PUBLIC_LEGAL_BASE_URL);
  if (explicit) return explicit;

  const webApi = cleanBase(process.env.EXPO_PUBLIC_WEB_API_BASE_URL);
  if (webApi.startsWith("https://")) return webApi;

  return DEFAULT_LEGAL_BASE;
}

export const legalUrls = {
  privacy: () => `${getLegalBaseUrl()}/privacy`,
  terms: () => `${getLegalBaseUrl()}/terms`,
} as const;
