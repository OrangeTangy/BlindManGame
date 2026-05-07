import type { SignalGuideState } from "@blindman/shared";
import clsx from "clsx";

export default function SignalGuide({ state }: { state: SignalGuideState }) {
  const { current, target, locked } = state;
  const inBand = current >= target.lo && current <= target.hi;
  const near = current >= target.lo - 5 && current <= target.hi + 5;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-xl text-white">Signal Tuner</h3>
        <span className={clsx(
          "badge text-sm font-black",
          inBand ? "bg-lime-300 text-slate-900 glow" : near ? "bg-amber-300 text-slate-900" : "bg-slate-600 text-white"
        )}>
          {locked ? "LOCKED" : inBand ? "IN ZONE — LOCK IT!" : near ? "CLOSE!" : "SEARCHING…"}
        </span>
      </div>

      {/* Frequency bar */}
      <div className="relative w-full h-12 rounded-2xl bg-slate-800 border-[3px] border-slate-900 overflow-hidden mb-3">
        {/* Target band */}
        <div
          className="absolute top-0 bottom-0 bg-lime-400/50 border-x-2 border-lime-400"
          style={{ left: `${target.lo}%`, width: `${target.hi - target.lo}%` }}
        />
        {/* Current position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-[3px] border-slate-900 transition-all duration-150"
          style={{
            left: `${current}%`,
            background: inBand ? "rgb(163 230 53)" : "rgb(251 191 36)",
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs font-bold text-white/50 px-1 mb-4">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="card-bright bg-slate-700 text-white text-sm">
          <div className="text-xs font-bold text-white/60 mb-1">TARGET</div>
          <div className="font-black text-lime-300 text-lg">{target.lo}–{target.hi}</div>
        </div>
        <div className="card-bright bg-slate-700 text-white text-sm">
          <div className="text-xs font-bold text-white/60 mb-1">CURRENT</div>
          <div className={clsx("font-black text-lg", inBand ? "text-lime-300" : "text-amber-300")}>{current}</div>
        </div>
        <div className="card-bright bg-slate-700 text-white text-sm">
          <div className="text-xs font-bold text-white/60 mb-1">DELTA</div>
          <div className={clsx("font-black text-lg", Math.abs(current - (target.lo + target.hi) / 2) < 5 ? "text-lime-300" : "text-rose-300")}>
            {current < target.lo ? `${target.lo - current} →` : current > target.hi ? `← ${current - target.hi}` : "IN!"}
          </div>
        </div>
      </div>

      <p className="text-center text-sm font-bold text-emerald-300 mt-3">
        Guide them in with LEFT / RIGHT · Call "LOCK" when they're in the green zone
      </p>
    </div>
  );
}
