import { titleStatus } from "@/lib/format";
import { cn } from "cn";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        status === "ACTIVE" || status === "PAID" ? "bg-emerald-100 text-emerald-800" : "",
        status === "OVERDUE" || status === "CANCELLED" ? "bg-red-100 text-red-800" : "",
        status === "CONFIRMED" || status === "QUOTATION" ? "bg-amber-100 text-amber-900" : "",
        status === "DRAFT" || status === "PAUSED" || status === "CLOSED" ? "bg-slate-100 text-slate-700" : "",
      )}
    >
      {titleStatus(status)}
    </span>
  );
}
