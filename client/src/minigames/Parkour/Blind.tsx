import { useEffect, useState } from "react";
import type { ParkourBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const feedbackText: Record<ParkourBlindState["lastFeedback"], string> = {
  none: "Awaiting instructions…",
  move: "Moved.",
  bump: "BUMP — blocked.",
  jump: "Jumped!",
  fall: "Falling…",
  goal: "REACHED GOAL!",
};
const feedbackColor: Record<ParkourBlindState["lastFeedback"], string> = {
  none: "text-white/70",
  move: "text-emerald-300",
  bump: "text-rose-300",
  jump: "text-sky-300",
  fall: "text-amber-200",
  goal: "text-amber-300",
};

type Action =
  | { type: "left" }
  | { type: "right" }
  | { type: "jumpUp" }
  | { type: "jumpLeft" }
  | { type: "jumpRight" };

export default function ParkourBlind({ state }: { state: ParkourBlindState }) {
  const act = (a: Action) => socket.emit("action", { action: a });

  // Re-key the feedback line when it changes so the pop animation replays.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick((t) => t + 1);
  }, [state.lastFeedback]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":  case "a": case "A": act({ type: "left" }); break;
        case "ArrowRight": case "d": case "D": act({ type: "right" }); break;
        case "ArrowUp":    case "w": case "W": case " ": act({ type: "jumpUp" }); break;
        case "q": case "Q": act({ type: "jumpLeft" }); break;
        case "e": case "E": act({ type: "jumpRight" }); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="card">
      <div
        key={tick}
        className={clsx(
          "text-center text-2xl font-black mb-1 pop",
          feedbackColor[state.lastFeedback]
        )}
      >
        {feedbackText[state.lastFeedback]}
      </div>
      <div className="text-center text-sm font-bold mb-5">
        <span
          className={clsx(
            "inline-block rounded-full px-3 py-1 border-[3px] border-slate-900",
            state.onGround ? "bg-emerald-300 text-slate-900" : "bg-amber-300 text-slate-900"
          )}
        >
          {state.onGround ? "On solid ground" : "Airborne!"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        <button className="btn-fun h-20 text-sm" onClick={() => act({ type: "jumpLeft" })}>
          ↖ JUMP-L
        </button>
        <button className="btn-primary h-20 text-lg" onClick={() => act({ type: "jumpUp" })}>
          ↑ JUMP
        </button>
        <button className="btn-cool h-20 text-sm" onClick={() => act({ type: "jumpRight" })}>
          JUMP-R ↗
        </button>
        <button className="btn-ghost h-20 text-2xl" onClick={() => act({ type: "left" })}>
          ◀
        </button>
        <div />
        <button className="btn-ghost h-20 text-2xl" onClick={() => act({ type: "right" })}>
          ▶
        </button>
      </div>
      <p className="text-center text-xs font-bold text-white/60 mt-4">
        Arrow keys = move · W/Space = jump · Q/E = diagonal jump
      </p>
    </div>
  );
}
