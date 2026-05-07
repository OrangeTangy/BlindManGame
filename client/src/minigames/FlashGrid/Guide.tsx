import type { FlashGridGuideState } from "@blindman/shared";
import clsx from "clsx";

const LABELS = [
  "Top-L", "Top-C", "Top-R",
  "Mid-L", "Center", "Mid-R",
  "Bot-L", "Bot-C", "Bot-R",
];

export default function FlashGridGuide({ state }: { state: FlashGridGuideState }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-xl text-white">Flash Grid</h3>
        <span className={clsx(
          "badge text-sm",
          state.phase === "showing" ? "bg-amber-300 text-slate-900" : "bg-cyan-300 text-slate-900"
        )}>
          {state.phase === "showing" ? "MEMORISE!" : "CALL IT OUT!"}
        </span>
      </div>

      {/* 3x3 grid */}
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
        {Array.from({ length: 9 }, (_, i) => {
          const isTarget = state.target.includes(i);
          const isTapped = state.input.includes(i);
          return (
            <div
              key={i}
              className={clsx(
                "aspect-square rounded-2xl border-[3px] border-slate-900 flex items-center justify-center font-black text-lg transition-all duration-200",
                isTapped
                  ? "bg-lime-300 text-slate-900"
                  : isTarget && state.phase === "showing"
                  ? "bg-amber-300 text-slate-900 scale-105"
                  : isTarget
                  ? "bg-amber-300/30 text-amber-300 border-amber-400"
                  : "bg-slate-800 text-slate-500"
              )}
              style={{ boxShadow: isTarget && state.phase === "showing" ? "0 0 0 4px rgba(251,191,36,0.5)" : undefined }}
            >
              {LABELS[i]}
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm font-bold text-emerald-300">
        {state.phase === "showing"
          ? "Memorise the lit cells — describe them to your partner!"
          : `Tell them which ${state.target.length} cells to tap. Ghosted = still needed.`}
      </p>
      <p className="text-center text-xs font-bold text-white/50 mt-1">
        Remaining: {state.target.length - state.input.length} / {state.target.length}
      </p>
    </div>
  );
}
