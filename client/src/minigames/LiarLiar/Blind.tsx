import { useEffect, useState } from "react";
import type { LiarLiarBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const COLOR_BG: Record<string, string> = {
  red: "bg-rose-500",
  blue: "bg-sky-500",
  yellow: "bg-amber-300",
  green: "bg-emerald-400",
};

export default function LiarLiarBlind({ state }: { state: LiarLiarBlindState }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, [state.feedback, state.cuts.length]);

  const cut = (i: number) => socket.emit("action", { action: { type: "cutLL", index: i } });

  return (
    <div className="card">
      <div
        key={tick}
        className={clsx(
          "text-center text-2xl font-black mb-3 pop",
          state.feedback === "correct" ? "text-lime-300"
            : state.feedback === "wrong" ? "text-rose-300"
            : "text-white/70"
        )}
      >
        {state.feedback === "correct" ? "Click."
          : state.feedback === "wrong" ? "BOOM!"
          : "Wait for instructions"}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-4">
        Cut <span className="text-lime-300">{state.cuts.length}</span> / {state.wires.length}
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {state.wires.map((color, i) => {
          const isCut = state.cuts.includes(i);
          return (
            <button
              key={i}
              onClick={() => cut(i)}
              disabled={isCut}
              className={clsx(
                "h-24 rounded-2xl border-[3px] border-slate-900 font-black text-xl uppercase transition-transform",
                isCut ? "bg-slate-700 text-white/40 line-through" : `${COLOR_BG[color]} text-slate-900 active:translate-y-[2px]`
              )}
              style={{ boxShadow: isCut ? "none" : "0 6px 0 0 rgb(15 23 42)" }}
            >
              {color}
            </button>
          );
        })}
      </div>
    </div>
  );
}
