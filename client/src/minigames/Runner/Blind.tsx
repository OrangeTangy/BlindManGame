import { useEffect, useState } from "react";
import type { RunnerBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const feedbackText: Record<RunnerBlindState["lastResult"], string> = {
  none: "Listen for JUMP…",
  jump: "Jumping!",
  cleared: "Cleared!",
  hit: "OUCH — hit.",
};
const feedbackColor: Record<RunnerBlindState["lastResult"], string> = {
  none: "text-white/70",
  jump: "text-sky-300",
  cleared: "text-emerald-300",
  hit: "text-rose-300",
};

export default function RunnerBlind({ state }: { state: RunnerBlindState }) {
  // Re-key feedback on change so the pop animation replays each time.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick((t) => t + 1);
  }, [state.lastResult, state.cleared]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        socket.emit("action", { action: { type: "jump" } });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const jump = () => socket.emit("action", { action: { type: "jump" } });

  // Springy vertical offset for the avatar. Container is h-40 (160px), ground
  // strip is 33% (~53px), player is w-16 h-16 (64px). Max safe offset so the
  // player top stays inside the container: (160 - 53 - 64) = 43px. We use 40
  // to keep a small top margin at apex.
  const yOffset = state.playerY === 0 ? 0 : state.playerY === 1 ? 20 : 40;

  return (
    <div className="card">
      <div
        key={tick}
        className={clsx(
          "text-center text-2xl font-black mb-1 pop",
          feedbackColor[state.lastResult]
        )}
      >
        {feedbackText[state.lastResult]}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-4">
        Cleared <span className="text-lime-300">{state.cleared}</span> / {state.target}
      </div>

      {/* Mini stage showing the avatar hopping. Purely cosmetic — the server
          drives playerY; we just tween the CSS offset smoothly. */}
      <div className="relative mx-auto mb-5 w-full max-w-xs h-40 rounded-2xl border-[3px] border-slate-900 bg-sky-400 overflow-hidden">
        <div className="absolute left-0 right-0 bottom-0 h-1/3 bg-emerald-500" />
        <div
          className="absolute left-0 right-0"
          style={{ bottom: "33%", height: 3, background: "rgb(15 23 42)" }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: `calc(33% + ${yOffset}px)`,
            transition: "bottom 180ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div className="w-16 h-16 rounded-full border-[3px] border-slate-900 bg-amber-300 flex items-center justify-center font-black text-slate-900 text-xl">
            P
          </div>
        </div>
      </div>

      <button
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
        className="btn-primary w-full h-24 text-3xl"
      >
        JUMP!
      </button>
      <p className="text-center text-xs font-bold text-white/60 mt-3">
        Space / ↑ / W / tap — jump when your guide calls it.
      </p>
    </div>
  );
}
