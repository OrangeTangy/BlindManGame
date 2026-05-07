import type { GauntletNotification } from "@blindman/shared";
import clsx from "clsx";

export default function NotificationsTicker({
  items,
  limit = 6,
  highlightDuoId,
}: {
  items: GauntletNotification[];
  limit?: number;
  highlightDuoId?: string | null;
}) {
  const recent = items.slice(-limit).reverse();
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
        Live feed
      </div>
      <ul className="space-y-1 text-xs leading-snug">
        {recent.length === 0 && (
          <li className="text-slate-500">No activity yet…</li>
        )}
        {recent.map((n) => (
          <li
            key={n.id}
            className={clsx(
              "px-2 py-1 rounded",
              n.kind === "stage_complete" && "text-emerald-300 bg-emerald-900/30",
              n.kind === "stage_failed" && "text-rose-300 bg-rose-900/30",
              n.kind === "run_complete" && "text-amber-300 bg-amber-900/30 font-bold",
              n.kind === "start" && "text-slate-300 bg-slate-800/60",
              n.duoId === highlightDuoId && "ring-1 ring-amber-500/40"
            )}
          >
            {n.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
