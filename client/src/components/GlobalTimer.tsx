import { useEffect, useState } from "react";

/** Elapsed wall-clock since `startedAt` (epoch ms). Shown mm:ss.cs. */
export default function GlobalTimer({
  startedAt,
  frozenAt,
  label = "RUN",
  penaltyMs = 0,
}: {
  startedAt: number | null;
  frozenAt?: number | null;
  label?: string;
  penaltyMs?: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (frozenAt != null) return;
    const t = setInterval(() => setNow(Date.now()), 67);
    return () => clearInterval(t);
  }, [frozenAt]);

  if (!startedAt) {
    return (
      <div className="text-right">
        <div className="text-[10px] uppercase text-slate-400 tracking-widest">
          {label}
        </div>
        <div className="font-mono text-2xl text-slate-500">--:--.--</div>
      </div>
    );
  }

  const ref = frozenAt ?? now;
  const elapsed = Math.max(0, ref - startedAt) + penaltyMs;
  const mm = Math.floor(elapsed / 60_000);
  const ss = Math.floor((elapsed % 60_000) / 1000);
  const cs = Math.floor((elapsed % 1000) / 10);
  const fmt =
    `${mm.toString().padStart(2, "0")}:` +
    `${ss.toString().padStart(2, "0")}.` +
    `${cs.toString().padStart(2, "0")}`;
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase text-slate-400 tracking-widest">
        {label}
        {penaltyMs > 0 && (
          <span className="ml-1 text-rose-400">
            +{(penaltyMs / 1000).toFixed(0)}s
          </span>
        )}
      </div>
      <div
        className={
          "font-mono text-2xl sm:text-3xl font-black tabular-nums " +
          (frozenAt != null ? "text-emerald-400" : "text-amber-400")
        }
      >
        {fmt}
      </div>
    </div>
  );
}
