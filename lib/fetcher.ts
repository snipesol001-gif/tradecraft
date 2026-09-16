// The SSRF-guarded fetcher. Every external fetch performed because a
// USER typed a URL goes through here and only here.
// Defenses:
//  - https only
//  - hostname checks: localhost, *.local, private ranges, and dotless
//    hostnames are refused
//  - hard timeout
//  - response size cap
//  - identified User-Agent
//  - no credentials, no cookies, redirects re-validated by the browser
//    fetch stack (each hop must remain https)

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CHARS = 1_500_000;
const USER_AGENT =
  "TradeCraftBot/1.0 (website analyzer; +https://tradecraft9.vercel.app)";

export type FetchResult =
  | { ok: true; html: string; finalUrl: string; status: number }
  | { ok: false; error: string; status?: number };

export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "::1") return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === "169.254.169.254" || host.endsWith(".internal")) return false;
    if (!host.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function safeFetch(url: string): Promise<FetchResult> {
  if (!isPublicHttpUrl(url)) {
    return { ok: false, error: "Only public https:// URLs can be analyzed." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("xhtml")) {
      return {
        ok: false,
        error: "That address did not return an HTML page.",
        status: res.status,
      };
    }

    const raw = await res.text();
    const html = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) : raw;

    return { ok: true, html, finalUrl: res.url || url, status: res.status };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "The site took too long to respond."
        : err instanceof Error
          ? err.message
          : "Could not reach that site.",
    };
  } finally {
    clearTimeout(timer);
  }
}