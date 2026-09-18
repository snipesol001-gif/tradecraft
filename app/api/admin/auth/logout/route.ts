// Ends the admin console session. The user session is untouched.

import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-auth";

export async function POST() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}