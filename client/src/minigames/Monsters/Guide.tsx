import { useEffect, useRef, useState } from "react";
import type { MonstersGuideState } from "@blindman/shared";
import { useStore } from "../../store";
import clsx from "clsx";

/**
 * Guide arena. Player sits in the center. Incoming monster slides in from
 * LEFT or RIGHT over approachMs. Animation is driven by RAF using the
 * server-side spawnAt/reachAt timestamps + our estimated clock skew so it
 * stays accurate without re-rendering from server ticks.
 */
export default function MonstersGuide({ state }: { state: MonstersGuideState }) {
  const skew = useStore((s) => s.clockSkewMs);
  // Tick 30fps for smooth animation without burning cycles.
  const [, setNow] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const loop = () => {
      setNow((x) => x + 1);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const now = Date.now() + skew;
  const c = state.current;
  let progress = 0; // 0 = just spawned, 1 = reaches player
  if (c) {
    const dur = Math.max(1, c.reachAt - c.spawnAt);
    progress = Math.max(0, Math.min(1, (now - c.spawnAt) / dur));
  }
  const urgent = progress > 0.66;

  // Left side occupies x from 0 (edge) to 0.5 (center). Right side 0.5 to 1.
  // Monster starts at the edge (0 or 1) and moves toward 0.5.
  const monsterLeftPct = c
    ? c.side === "left"
      ? 5 + progress * 40      // 5% → 45%
      : 95 - progress * 40     // 95% → 55%
    : 50;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-xl text-white">Monster Arena</h3>
        <div className="text-sm font-bold text-white/80">
          Killed <span className="text-lime-300">{state.killed}</span> / {state.total}
        </div>
      </div>

      {/* Arena */}
      <div
        className={clsx(
          "relative w-full aspect-[2/1] rounded-2xl overflow-hidden border-[3px] border-slate-900/80",
          urgent ? "bg-rose-500" : "bg-indigo-500"
        )}
      >
        {/* Danger ring growing as progress increases */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/70"
          style={{
            width: `${30 + progress * 40}%`,
            height: `${60 + progress * 80}%`,
            opacity: c ? 0.35 + progress * 0.5 : 0.15,
          }}
        />
        {/* LEFT / RIGHT labels */}
        <div className="absolute left-3 top-2 text-white font-black text-lg tracking-widest">LEFT</div>
        <div className="absolute right-3 top-2 text-white font-black text-lg tracking-widest">RIGHT</div>
        {/* Center player */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-amber-300 border-[4px] border-slate-900 flex items-center justify-center font-black text-slate-900">
          YOU
        </div>
        {/* Incoming monster */}
        {c && (
          <div
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-[4px] border-slate-900 flex items-center justify-center font-black",
              c.side === "left" ? "bg-fuchsia-400" : "bg-cyan-300"
            )}
            style={{
              left: `${monsterLeftPct}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {c.side === "left" ? "◀" : "▶"}
          </div>
        )}
        {!c && (
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 text-white font-black text-sm tracking-widest">
            …INCOMING…
          </div>
        )}
      </div>

      {/* Call-out */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={clsx(
            "card-bright !p-3 text-center text-xl font-black transition",
            c?.side === "left" ? "bg-fuchsia-400 scale-105" : "bg-slate-700 text-white/60"
          )}
        >
          CALL "LEFT"
        </div>
        <div
          className={clsx(
            "card-bright !p-3 text-center text-xl font-black transition",
            c?.side === "right" ? "bg-cyan-300 scale-105" : "bg-slate-700 text-white/60"
          )}
        >
          CALL "RIGHT"
        </div>
      </div>

      {/* Upcoming preview */}
      {state.upcoming.length > 0 && (
        <div className="mt-4 text-center text-xs font-bold text-white/70">
          NEXT:{" "}
          {state.upcoming.map((s, i) => (
            <span
              key={i}
              className={clsx(
                "inline-block mx-1 px-2 py-0.5 rounded-lg border-2 border-slate-900/80",
                s === "left" ? "bg-fuchsia-400 text-slate-900" : "bg-cyan-300 text-slate-900"
              )}
            >
              {s === "left" ? "◀ L" : "R ▶"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
