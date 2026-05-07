import { useEffect, useState } from "react";
import type { MemoryTowerBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";
import { ICONS, ICON_BG } from "./icons";

export default function MemoryTowerBlind({ state }: { state: MemoryTowerBlindState }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, [state.lastFeedback, state.built.length]);

  const place = (i: number) =>
    socket.emit("action", { action: { type: "place", index: i } });

  return (
    <div className="card">
      <div
        key={tick}
        className={clsx(
          "text-center text-2xl font-black mb-2 pop",
          state.lastFeedback === "correct" ? "text-lime-300"
            : state.lastFeedback === "wrong" ? "text-rose-300"
            : "text-white/70"
        )}
      >
        {state.lastFeedback === "correct" ? "Stacked!"
          : state.lastFeedback === "wrong" ? "COLLAPSE!"
          : "Stack the icons"}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-4">
        <span className="text-lime-300">{state.built.length}</span> placed · {state.remaining} to go
      </div>

      {/* Current stack rendered bottom-up */}
      <div className="flex flex-col-reverse items-center gap-1 mb-5 min-h-[120px]">
        {state.built.length === 0 ? (
          <div className="text-white/40 text-sm font-bold py-6">empty foundation</div>
        ) : (
          state.built.map((idx, i) => (
            <div
              key={i}
              className={clsx(
                "w-20 h-10 rounded-xl border-[3px] border-slate-900 flex items-center justify-center text-2xl font-black text-slate-900",
                ICON_BG[idx]
              )}
            >
              {ICONS[idx]}
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {ICONS.map((icon, i) => (
          <button
            key={i}
            onClick={() => place(i)}
            className={clsx(
              "aspect-square rounded-2xl border-[3px] border-slate-900 text-4xl font-black text-slate-900 active:translate-y-[2px] transition-transform",
              ICON_BG[i]
            )}
            style={{ boxShadow: "0 6px 0 0 rgb(15 23 42)" }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
