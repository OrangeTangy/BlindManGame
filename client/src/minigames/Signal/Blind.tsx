import { useEffect, useState } from "react";
import type { SignalBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

export default function SignalBlind({ state }: { state: SignalBlindState }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick(t => t + 1); }, [state.lastFeedback]);

  const tune = (type: "tuneBig" | "tuneSmall", dir: "left" | "right") =>
    socket.emit("action", { action: { type, dir } });
  const lock = () => socket.emit("action", { action: { type: "lock" } });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":  case "a": case "A": tune("tuneSmall", "left");  break;
        case "ArrowRight": case "d": case "D": tune("tuneSmall", "right"); break;
        case "q": case "Q": tune("tuneBig", "left");  break;
        case "e": case "E": tune("tuneBig", "right"); break;
        case " ": case "Enter": lock(); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const feedbackText = {
    none: "Tune the signal…",
    tune: "Tuning…",
    success: "LOCKED IN!",
    fail: "MISSED — wrong frequency!",
  }[state.lastFeedback];

  const feedbackColor = {
    none: "text-white/70",
    tune: "text-sky-300",
    success: "text-lime-300",
    fail: "text-rose-300",
  }[state.lastFeedback];

  return (
    <div className="card">
      <div key={tick} className={clsx("text-center text-2xl font-black mb-3 pop", feedbackColor)}>
        {feedbackText}
      </div>

      {/* Signal bars — 11 bars, filled = current position (coarse) */}
      <div className="flex items-end justify-center gap-1 mb-5 h-14">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className={clsx(
              "w-5 rounded-t-lg border-[2px] border-slate-900 transition-all duration-150",
              i <= state.bars ? "bg-amber-300" : "bg-slate-700"
            )}
            style={{ height: `${30 + i * 6}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-3">
        <button className="btn-ghost h-16 text-lg col-span-1" onClick={() => tune("tuneBig", "left")}>◀◀</button>
        <button className="btn-ghost h-16 col-span-1" onClick={() => tune("tuneSmall", "left")}>◀</button>
        <button
          className="btn-primary h-16 text-lg font-black col-span-1"
          onClick={lock}
          disabled={state.locked}
        >
          LOCK
        </button>
        <button className="btn-ghost h-16 col-span-1" onClick={() => tune("tuneSmall", "right")}>▶</button>
        <button className="btn-ghost h-16 text-lg col-span-1" onClick={() => tune("tuneBig", "right")}>▶▶</button>
      </div>

      <p className="text-center text-xs font-bold text-white/50">
        A/D = fine tune · Q/E = big jump · Space/Enter = LOCK
      </p>
    </div>
  );
}
