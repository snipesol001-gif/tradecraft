// Reads and verifies the session cookie on the server. checkRevoked=true
// does a network check against Firebase (used at gates), false is a fast
// local check (used for display).

import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebase-admin";

export type SessionUser = {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
  privacyAccepted: boolean;
  onboarded: boolean;
  premium: boolean;
  provider: string;
};

export async function getSessionUser(checkRevoked = true): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return null;
  try {
    const decoded = await getAuth(getAdminApp()).verifySessionCookie(session, checkRevoked);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      privacyAccepted: decoded.pv === true,
      onboarded: decoded.onb === true,
      premium: decoded.premium === true,
      provider:
        decoded.firebase?.sign_in_provider === "google.com"
          ? "Google"
          : "Email and password",
    };
  } catch {
    return null;
  }
}