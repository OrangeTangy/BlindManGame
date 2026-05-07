import { useEffect, useState } from "react";
import type { SymbolScribeBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";
import Glyph from "./Glyph";

export default function SymbolScribeBlind({ state }: { state: SymbolScribeBlindState }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, [state.lastFeedback, state.cleared]);

  const pick = (id: number) => socket.emit("action", { action: { type: "pick", glyphId: id } });

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
        {state.lastFeedback === "correct" ? "Got it!"
          : state.lastFeedback === "wrong" ? "Wrong glyph!"
          : "Pick the glyph your guide describes"}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-4">
        Picked <span className="text-lime-300">{state.cleared}</span> / {state.total}
      </div>

      <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
        {state.candidates.map((id) => (
          <button
            key={id}
            onClick={() => pick(id)}
            className="aspect-square rounded-2xl border-[3px] border-slate-900 bg-slate-800 hover:bg-slate-700 active:translate-y-[2px] flex items-center justify-center transition-transform"
            style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
          >
            <Glyph id={id} size={56} />
          </button>
        ))}
      </div>
    </div>
  );
}
