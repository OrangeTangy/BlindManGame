import { useEffect, useState } from "react";
import type { WordSniperBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

export default function WordSniperBlind({ state }: { state: WordSniperBlindState }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick((t) => t + 1);
  }, [state.lastFeedback, state.hits, state.misses]);

  const fire = () => socket.emit("action", { action: { type: "fire" } });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        fire();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="card">
      <div
        key={tick}
        className={clsx(
          "text-center text-2xl font-black mb-2 pop",
          state.lastFeedback === "hit" ? "text-lime-300"
            : state.lastFeedback === "miss" ? "text-rose-300"
            : "text-white/70"
        )}
      >
        {state.lastFeedback === "hit" ? "HIT!"
          : state.lastFeedback === "miss" ? "Miss…"
          : "Wait for NOW"}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-5">
        Hits <span className="text-lime-300">{state.hits}</span> / {state.hitsRequired} ·
        Misses <span className="text-rose-300">{state.misses}</span> / {state.missesAllowed}
      </div>
      <button
        onClick={fire}
        onTouchStart={(e) => { e.preventDefault(); fire(); }}
        className="btn-danger w-full h-40 text-5xl"
      >
        FIRE
      </button>
      <p className="text-center text-xs font-bold text-white/50 mt-3">
        Space / Enter / tap — fire when guide says NOW
      </p>
    </div>
  );
}
