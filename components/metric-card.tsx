import Link from "next/link";

export function MetricCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "warning";
}) {
  const className = [
    "block rounded-xl border bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200",
    href ? "hover:-translate-y-0.5 hover:shadow-md" : "",
    tone === "warning" ? "border-red-200" : "border-[#e6e1ea]",
  ].join(" ");

  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#1f1a24]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
}
