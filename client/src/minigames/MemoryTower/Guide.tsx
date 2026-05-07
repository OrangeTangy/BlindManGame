import type { MemoryTowerGuideState } from "@blindman/shared";
import clsx from "clsx";
import { ICONS, ICON_BG } from "./icons";

export default function MemoryTowerGuide({ state }: { state: MemoryTowerGuideState }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-xl text-white">Memory Tower</h3>
        <span className="text-sm font-bold text-white/80">
          <span className="text-lime-300">{state.built.length}</span> / {state.target.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Target stack */}
        <div>
          <div className="text-xs uppercase tracking-widest font-black text-amber-300 mb-2 text-center">
            Target
          </div>
          <div className="flex flex-col-reverse items-center gap-1 p-3 rounded-2xl bg-slate-800 border-[3px] border-slate-900">
            {state.target.map((idx, i) => (
              <div
                key={i}
                className={clsx(
                  "w-16 h-9 rounded-lg border-[3px] border-slate-900 flex items-center justify-center text-xl font-black text-slate-900",
                  ICON_BG[idx]
                )}
              >
                {ICONS[idx]}
              </div>
            ))}
          </div>
        </div>

        {/* Built stack */}
        <div>
          <div className="text-xs uppercase tracking-widest font-black text-emerald-300 mb-2 text-center">
            Built
          </div>
          <div className="flex flex-col-reverse items-center gap-1 p-3 rounded-2xl bg-slate-800 border-[3px] border-slate-900 min-h-full">
            {state.built.length === 0 ? (
              <div className="text-white/40 text-sm font-bold py-6">empty</div>
            ) : (
              state.built.map((idx, i) => (
                <div
                  key={i}
                  className={clsx(
                    "w-16 h-9 rounded-lg border-[3px] border-slate-900 flex items-center justify-center text-xl font-black text-slate-900",
                    ICON_BG[idx]
                  )}
                >
                  {ICONS[idx]}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-sm font-bold text-emerald-300 mt-3">
        Read the next icon. Wrong tap = full collapse.
      </p>
    </div>
  );
}
