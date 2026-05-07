import type { WordSniperGuideState } from "@blindman/shared";
import clsx from "clsx";

const LANES = 3;

export default function WordSniperGuide({ state }: { state: WordSniperGuideState }) {
  const [zoneLo, zoneHi] = state.fireZone;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-xl text-white">Word Sniper</h3>
        <span className="text-sm font-bold text-white/80">
          Hits <span className="text-lime-300">{state.hits}</span>/{state.hitsRequired} ·
          Miss <span className="text-rose-300">{state.misses}</span>/{state.missesAllowed}
        </span>
      </div>

      <div
        className="relative w-full rounded-2xl border-[3px] border-slate-900 bg-slate-950 overflow-hidden"
        style={{ aspectRatio: "16 / 9" }}
      >
        {/* Fire zone band */}
        <div
          className="absolute top-0 bottom-0 bg-amber-300/20 border-x-2 border-amber-300"
          style={{ left: `${zoneLo * 100}%`, width: `${(zoneHi - zoneLo) * 100}%` }}
        />
        {/* Lane separators */}
        {Array.from({ length: LANES - 1 }, (_, i) => (
          <div
            key={`sep-${i}`}
            className="absolute left-0 right-0 border-t border-slate-700"
            style={{ top: `${((i + 1) / LANES) * 100}%` }}
          />
        ))}
        {/* Words. x=0 means right edge (entry); x=1 means left edge (exit). */}
        {state.words.map((w) => {
          const leftPct = (1 - w.x) * 100;
          const topPct = ((w.lane + 0.5) / LANES) * 100;
          return (
            <div
              key={w.id}
              className={clsx(
                "absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-lg border-[3px] border-slate-900 font-black text-sm whitespace-nowrap",
                w.target ? "bg-amber-300 text-slate-900" : "bg-slate-700 text-white/80"
              )}
              style={{ left: `${leftPct}%`, top: `${topPct}%`, transition: "left 100ms linear" }}
            >
              {w.text}
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm font-bold text-emerald-300 mt-3">
        Targets are gold. Yell "NOW!" when one hits the band.
      </p>
    </div>
  );
}
