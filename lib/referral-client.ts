// Client-side referral capture helpers. Runs in the browser only.
// Persists a referral code from ?ref= in localStorage plus a 30-day cookie,
// so attribution survives page changes and the Google OAuth round trip.

const STORAGE_KEY = "tc_ref";
const COOKIE_NAME = "tc_ref";
const COOKIE_DAYS = 30;

// Loose shape check on the client (6 to 12 letters/digits). The server
// enforces the strict 8-character pattern; this only filters obvious junk.
function looksLikeCode(value: string): boolean {
  return /^[a-zA-Z0-9]{6,12}$/.test(value.trim());
}

function setCookie(code: string): void {
  const expires = new Date(
    Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000
  ).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Called on every page load (by a tiny component in the root layout).
// If the URL carries ?ref=CODE, store it and clean the URL, so the code
// does not leak into every link the visitor copies afterwards.
export function captureRefFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (!ref || !looksLikeCode(ref)) return;
  const code = ref.trim().toUpperCase();
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private browsing modes can block storage. The cookie still works.
  }
  setCookie(code);
  params.delete("ref");
  const qs = params.toString();
  const clean = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
  window.history.replaceState(null, "", clean);
}

export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && looksLikeCode(ls)) return ls;
  } catch {
    // fall through to the cookie
  }
  const c = getCookie();
  return c && looksLikeCode(c) ? c : null;
}

export function clearStoredRef(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

// Attempts capture after a session exists. Deliberately non-blocking:
// signup never fails because of a referral problem. On any definitive
// server outcome (captured, already attributed, self, invalid, window
// passed) the stored code is wiped so it can never be retried.
export async function attemptReferralCapture(codeOverride?: string): Promise<void> {
  const raw = (codeOverride ?? getStoredRef()) ?? "";
  const code = raw.trim().toUpperCase();
  if (!looksLikeCode(code)) return;
  try {
    const res = await fetch("/api/referral/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && (data.captured === true || typeof data.reason === "string")) {
      clearStoredRef();
    }
  } catch {
    // Network trouble: keep the stored code so a later session can retry.
  }
}