// TEMPORARY production diagnostic. Reports whether the server-side admin
// credentials work, and the exact error if they do not. Shows shapes and
// lengths, never the secret values themselves. DELETE after fixing.

import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";

  const report = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ? "present" : "MISSING",
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? "present" : "MISSING",
    privateKey: key ? "present" : "MISSING",
    keyStart: key.startsWith("-----BEGIN") ? "correct" : "DOES NOT start with -----BEGIN",
    keyEnd: key.trimEnd().endsWith("-----") ? "correct" : "DOES NOT end with markers",
    keyHasBackslashN: key.includes("\\n") ? "yes" : "no",
    keyLength: String(key.length),
  };

  try {
    const app =
      getApps().find((a) => a.name === "diag") ??
      initializeApp(
        {
          credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: key.replace(/\\n/g, "\n"),
          }),
        },
        "diag"
      );
    await getAuth(app).listUsers(1);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      report,
      error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error",
    });
  }
}