"use client";

// Signs the user out everywhere: clears the server session cookie and
// signs out of Firebase's browser session, then returns to the login page.

import { signOutUser } from "@/lib/auth";

export default function SignOutButton() {
  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOutUser();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
    >
      Sign out
    </button>
  );
}