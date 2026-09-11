import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;
  const name = feature ?? "This feature";

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <Card className="max-w-sm text-center">
        <CardBody className="p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-sunken text-text-muted">
            <Construction size={20} />
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-text-primary">
            {name} is coming soon
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            The link is real, the feature is not built yet. We show an honest
            placeholder instead of a fake screen.
          </p>
          <Link href="/dashboard" className="mt-6 block">
            <Button variant="secondary" className="w-full">
              Back to dashboard
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}