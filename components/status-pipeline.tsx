import { titleStatus } from "@/lib/format";
import { cn } from "cn";

const SUBSCRIPTION_FLOW = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"];
const INVOICE_FLOW = ["DRAFT", "CONFIRMED", "PAID"];

export function subscriptionStages(status: string) {
  if (status === "PAUSED") return ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"];
  return SUBSCRIPTION_FLOW;
}

export function invoiceStages(status: string) {
  if (status === "OVERDUE") return ["DRAFT", "CONFIRMED", "OVERDUE", "PAID"];
  if (status === "CANCELLED") return ["DRAFT", "CANCELLED"];
  return INVOICE_FLOW;
}

export function StatusPipeline({ stages, current }: { stages: string[]; current: string }) {
  const currentIndex = Math.max(0, stages.indexOf(current));

  return (
    <ol className="flex min-w-0 flex-1 overflow-x-auto py-0.5" aria-label="Status">
      {stages.map((stage, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={stage}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "relative px-5 py-2 text-center text-xs font-medium tracking-wide uppercase",
              index === 0 ? "rounded-l-md" : "-ml-2 pl-7",
              index === stages.length - 1 && "rounded-r-md",
              "transition-colors duration-200",
              state === "current" && "bg-[#5c3d56] text-white",
              state === "done" && "bg-[#d9ead3] text-[#27500a]",
              state === "upcoming" && "bg-[#eceff1] text-[#5f6368]",
            )}
            style={{ clipPath: chevron(index === 0, index === stages.length - 1) }}
          >
            {titleStatus(stage)}
          </li>
        );
      })}
    </ol>
  );
}

function chevron(first: boolean, last: boolean) {
  if (first && last) return undefined;
  if (first) return "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)";
  if (last) return "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)";
  return "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
}
