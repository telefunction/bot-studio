/**
 * Minimal cookie helpers. Used to remember that a visitor has already seen (and dismissed) the
 * privacy notice, so it doesn't reappear on every visit. Intentionally tiny — this app has no
 * backend and no cookie consent surface of its own to manage, so a full cookie library would be
 * overkill for a single boolean flag.
 */

export const PRIVACY_NOTICE_COOKIE = 'bot-studio.privacy-notice-seen';

export function getCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function setCookie(name: string, value: string, days: number): void {
  // Browsers clamp cookie max-age to ~400 days regardless of what's requested here; that's fine
  // for this use case (the notice can simply reappear and be dismissed again after that long).
  const maxAgeSeconds = days * 86400;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}
