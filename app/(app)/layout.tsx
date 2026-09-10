import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import AppShell from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser(true);
  if (!user) {
    redirect("/login");
  }
  // Gate order matters: identity first, then verification, then onboarding.
  if (!user.emailVerified) {
    redirect("/verify-email");
  }
  if (!user.onboarded) {
    redirect("/onboarding");
  }
  return <AppShell email={user.email ?? "your account"}>{children}</AppShell>;
}