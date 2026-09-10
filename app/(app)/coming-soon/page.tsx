import Link from "next/link";

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;
  const name = feature ?? "This feature";

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold">{name} is coming soon</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          The link is real, the feature is not built yet. We show an honest
          placeholder instead of a fake screen.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}