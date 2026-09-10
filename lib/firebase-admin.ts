// Server-side Firebase Admin initialization.
//
// This module grants FULL admin power over the Firebase project. It must
// never be imported from any code that runs in the browser. Its values come
// from .env.local (and later from Vercel's environment variables), and none
// of them have the NEXT_PUBLIC_ prefix, which is what keeps them server-only.

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Check .env.local, then restart the dev server.`
    );
  }
  return value;
}

function getAdminCredential() {
  return cert({
    projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
    // The private key is stored on one line with literal \n sequences,
    // because an environment file cannot hold real line breaks inside a
    // value. This line converts them back into real newlines, which is
    // what the key needs to be valid. Losing the quotes or the \n
    // sequences during pasting is the classic cause of failures here.
    privateKey: requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
  });
}

// Initialize once per server process, under a fixed name, reusing it if it
// already exists (the same pattern as the client-side firebase.ts).
export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === "tradeCraftAdmin");
  if (existing) return existing;
  return initializeApp({ credential: getAdminCredential() }, "tradeCraftAdmin");
}