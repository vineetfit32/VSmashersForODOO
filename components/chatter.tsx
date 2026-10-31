import { formatDateTime } from "@/lib/format";

export type ChatterEntry = {
  id: string;
  action: string;
  message: string;
  createdAt: Date;
  actorName: string | null;
};

export function Chatter({ entries }: { entries: ChatterEntry[] }) {
  return (
    <section className="rounded-xl border border-[#e6e1ea] bg-white shadow-sm">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Chatter</h2>
      </header>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="divide-y">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <p className="text-sm">{entry.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.actorName ?? "System"} · {formatDateTime(entry.createdAt)} · {entry.action}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
