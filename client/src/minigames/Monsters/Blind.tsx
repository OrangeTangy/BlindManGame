import { useEffect } from "react";
import type { MonstersBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const feedbackText: Record<MonstersBlindState["lastFeedback"], string> = {
  none: "Listen for the call…",
  hit:  "HIT!",
  miss: "Nothing there.",
  fail: "DOWN!",
};
const feedbackColor: Record<MonstersBlindState["lastFeedback"], string> = {
  none: "text-white/70",
  hit:  "text-lime-300",
  miss: "text-amber-200",
  fail: "text-rose-300",
};

export default function MonstersBlind({ state }: { state: MonstersBlindState }) {
  const strike = (side: "left" | "right") =>
    socket.emit("action", { action: { type: "strike", side } });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":  case "a": case "A": strike("left");  break;
        case "ArrowRight": case "d": case "D": strike("right"); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="card">
      <div className={clsx("text-center text-2xl font-black mb-1", feedbackColor[state.lastFeedback])}>
        {feedbackText[state.lastFeedback]}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-5">
        Monsters defeated: <span className="text-amber-300">{state.killed}</span> / {state.total}
        {state.betweenMonsters && (
          <span className="ml-3 text-cyan-300">(brace — next one incoming)</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          className="btn-fun h-40 text-3xl"
          onClick={() => strike("left")}
        >
          ◀ LEFT
        </button>
        <button
          className="btn-cool h-40 text-3xl"
          onClick={() => strike("right")}
        >
          RIGHT ▶
        </button>
      </div>
      <p className="text-center text-xs font-bold text-white/60 mt-4">
        Arrow keys also work · Wrong side = instant KO · Too slow = instant KO
      </p>
    </div>
  );
}
