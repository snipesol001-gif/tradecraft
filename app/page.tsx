import Link from "next/link";
import { BRAND } from "@/lib/brand";

const features = [
  {
    title: "Opportunity discovery",
    body: "Real opportunities from curated sources, continuously scouted, classified and scored by AI, so work that fits your skills finds you first.",
  },
  {
    title: "Professional network",
    body: "Follow the people worth following. Share opportunities with your network, and repost the right work to the right skill sets.",
  },
  {
    title: "Professional tools",
    body: "A website analyzer, an AI prompt workspace, and more premium tools built to turn attention into clients.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">{BRAND.name}</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 text-center">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            For freelancers and digital professionals
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            {BRAND.tagline}
          </h1>
          <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
            {BRAND.name} is the operating system for independent professionals
            discover real opportunities, build a network around your craft, and run
            your work with AI-powered tools.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium hover:opacity-90"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-md border border-neutral-300 dark:border-neutral-700 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6"
              >
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <span>
            © {new Date().getFullYear()} {BRAND.name}
          </span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-neutral-200">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-200">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}