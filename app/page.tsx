import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6">
      <p className="text-sm font-medium text-muted-foreground">Billpilot Software</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Subscription Management
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Recurring billing for software, add-ons, and plans. Catalog, quotations,
        invoices, and revenue live in this workspace.
      </p>
      <div className="mt-2 flex gap-3">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Create account</Link>
        </Button>
      </div>
    </main>
  );
}
