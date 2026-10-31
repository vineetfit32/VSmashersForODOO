import type { ReactNode } from "react";

export function WorkspaceFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-muted-foreground">{description}</p>
        </div>
      </header>
      {children ? <div className="mx-auto max-w-5xl px-6 py-8">{children}</div> : null}
    </main>
  );
}
