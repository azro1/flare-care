/** Must match Supabase Dashboard → Auth → Email → OTP expiry (seconds). */
export const OTP_EXPIRY_SECONDS = (() => {
  const raw = process.env.EXPO_PUBLIC_OTP_EXPIRY_SECONDS;
  const n = raw ? Number(raw) : 900;
  return Number.isFinite(n) && n > 0 ? n : 900;
})();

/** Resend taps allowed after the initial send (4 OTP emails total). */
export const OTP_MAX_RESENDS = 3;

export function formatOtpCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function otpRemainingSeconds(sentAtMs: number | null, nowMs: number = Date.now()): number {
  if (sentAtMs == null) return 0;
  const elapsed = Math.floor((nowMs - sentAtMs) / 1000);
  return Math.max(0, OTP_EXPIRY_SECONDS - elapsed);
}

export function isOtpExpired(sentAtMs: number | null, nowMs: number = Date.now()): boolean {
  if (sentAtMs == null) return false;
  return otpRemainingSeconds(sentAtMs, nowMs) <= 0;
}

export function otpVerifyErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (
    lower.includes("expired") ||
    lower.includes("expire") ||
    (lower.includes("invalid") && (lower.includes("otp") || lower.includes("token")))
  ) {
    return "That code has expired or is incorrect. Wait for the timer to finish, then tap Resend code for a new one.";
  }
  return errorMessage;
}

export function otpResendErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes("rate") || lower.includes("limit") || lower.includes("too many")) {
    return "Too many code requests. Please wait a few minutes before trying again.";
  }
  return errorMessage;
}
