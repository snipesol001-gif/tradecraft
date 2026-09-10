// Route gate. Runs before a page loads and checks that a session cookie
// exists for protected routes. This is the cheap first layer, presence only.
// The real cryptographic verification happens in the protected page itself
// (see app/dashboard/page.tsx), which is where security actually matters.

import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("__session")?.value);

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};