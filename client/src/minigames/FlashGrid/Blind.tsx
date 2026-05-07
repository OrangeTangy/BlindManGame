import { useEffect, useState } from "react";
import type { FlashGridBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const LABEL_SHORT = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function FlashGridBlind({ state }: { state: FlashGridBlindState }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick(t => t + 1); }, [state.lastFeedback]);

  const tap = (i: number) => socket.emit("action", { action: { type: "tap", index: i } });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) tap(n - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const waiting = state.phase === "showing";

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
        {waiting
          ? "Wait for it…"
          : state.lastFeedback === "correct"
          ? "Correct!"
          : state.lastFeedback === "wrong"
          ? "WRONG!"
          : "Tap the cells your guide calls!"}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-4">
        {waiting ? "Cells are flashing…" : `${state.remaining} cell${state.remaining !== 1 ? "s" : ""} remaining`}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {Array.from({ length: 9 }, (_, i) => {
          const tapped = state.input.includes(i);
          return (
            <button
              key={i}
              className={clsx(
                "aspect-square rounded-2xl border-[3px] border-slate-900 font-black text-2xl transition-all",
                tapped ? "bg-lime-300 text-slate-900" : waiting ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "btn-ghost"
              )}
              disabled={waiting || tapped}
              onClick={() => tap(i)}
            >
              {LABEL_SHORT[i]}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs font-bold text-white/50 mt-4">
        Number keys 1–9 also work
      </p>
    </div>
  );
}
