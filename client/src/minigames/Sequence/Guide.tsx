import type { SequencePublicState, ColorKey } from "@blindman/shared";
import clsx from "clsx";

const colorClasses: Record<ColorKey, string> = {
  red: "bg-rose-500",
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  yellow: "bg-amber-400",
  purple: "bg-fuchsia-500",
  orange: "bg-orange-500",
};

export default function SequenceGuide({ state }: { state: SequencePublicState }) {
  return (
    <div className="card">
      <h3 className="font-bold mb-3">Call out this sequence to your partner</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {state.target.map((c, i) => {
          const done = i < state.progress;
          const current = i === state.progress;
          return (
            <div
              key={i}
              className={clsx(
                "w-16 h-16 rounded-xl text-slate-900 font-black flex items-center justify-center text-sm",
                colorClasses[c],
                done && "opacity-30 line-through",
                current && "ring-4 ring-white glow"
              )}
            >
              {c.toUpperCase()}
            </div>
          );
        })}
      </div>
      <div className="text-sm text-slate-400">
        Progress: {state.progress} / {state.target.length} · Mistakes:{" "}
        <span className={state.mistakes >= 2 ? "text-rose-400" : ""}>
          {state.mistakes} / 3
        </span>
      </div>
      <div className="mt-4">
        <div className="text-xs text-slate-500 mb-1">Their buttons (for reference):</div>
        <div className="flex flex-wrap gap-2">
          {state.palette.map((c) => (
            <div
              key={c}
              className={clsx(
                "px-3 py-1 rounded-full text-slate-900 font-bold text-xs",
                colorClasses[c]
              )}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
