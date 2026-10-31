export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-[#1f1a24]">{title}</h1>
      {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
    </header>
  );
}
