import type { RoomPublic } from "@blindman/shared";
import clsx from "clsx";

export default function RaceProgress({
  room,
  highlightDuoId,
}: {
  room: RoomPublic;
  highlightDuoId?: string | null;
}) {
  const total = room.totalStages;
  const rows = room.duos
    .filter((d) => d.playerIds.length === 2)
    .slice()
    .sort((a, b) => {
      // finished first (rank), then by stageIndex desc, then by label
      if (a.runEndedAt && b.runEndedAt) return (a.rank ?? 0) - (b.rank ?? 0);
      if (a.runEndedAt) return -1;
      if (b.runEndedAt) return 1;
      return b.stageIndex - a.stageIndex;
    });
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
        Race progress
      </div>
      <ul className="space-y-2">
        {rows.map((d) => {
          const idx = Math.max(0, Math.min(d.stageIndex, total));
          const pct = (idx / total) * 100;
          const finished = d.runEndedAt !== null;
          const stageNow = room.plan?.[d.stageIndex];
          return (
            <li
              key={d.id}
              className={clsx(
                "text-xs",
                d.id === highlightDuoId && "ring-1 ring-amber-500/40 rounded"
              )}
            >
              <div className="flex justify-between mb-0.5">
                <span className="font-bold">
                  {d.label}
                  {finished && (
                    <span className="ml-1 text-amber-300">#{d.rank}</span>
                  )}
                </span>
                <span className="text-slate-400">
                  {finished
                    ? `${((d.totalTimeMs ?? 0) / 1000).toFixed(1)}s`
                    : stageNow
                    ? `${idx + 1}/${total} · ${stageNow.kind}`
                    : "—"}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all duration-500",
                    finished ? "bg-amber-400" : "bg-emerald-500"
                  )}
                  style={{ width: `${finished ? 100 : pct}%` }}
                />
              </div>
              {d.penaltyMs > 0 && (
                <div className="text-[10px] text-rose-400 mt-0.5">
                  penalty +{(d.penaltyMs / 1000).toFixed(0)}s
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
