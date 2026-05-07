import type { LiarLiarGuideState } from "@blindman/shared";
import clsx from "clsx";

const COLOR_BG: Record<string, string> = {
  red: "bg-rose-500",
  blue: "bg-sky-500",
  yellow: "bg-amber-300",
  green: "bg-emerald-400",
};

export default function LiarLiarGuide({ state }: { state: LiarLiarGuideState }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-xl text-white">Liar Liar</h3>
        <span className="text-sm font-bold text-white/80">
          Cut <span className="text-lime-300">{state.cuts.length}</span> / {state.wires.length}
        </span>
      </div>

      {/* Wires */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {state.wires.map((c, i) => {
          const isCut = state.cuts.includes(i);
          const cutPos = isCut ? state.cuts.indexOf(i) + 1 : null;
          return (
            <div
              key={i}
              className={clsx(
                "h-16 rounded-xl border-[3px] border-slate-900 flex flex-col items-center justify-center font-black uppercase text-sm",
                isCut ? "bg-slate-700 text-white/50 line-through" : `${COLOR_BG[c]} text-slate-900`
              )}
            >
              <span>{c}</span>
              {cutPos !== null && <span className="text-xs">#{cutPos}</span>}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest font-black text-amber-300">
          Rules — exactly ONE is a lie
        </div>
        {state.rules.map((r, i) => (
          <div
            key={i}
            className="rounded-xl border-[3px] border-slate-900 bg-slate-800 text-white px-4 py-3 font-bold"
            style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
          >
            {i + 1}. {r}
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-bold text-emerald-300 mt-3">
        Cross-check the rules. Find the contradiction. Then call out the cut order.
      </p>
    </div>
  );
}
