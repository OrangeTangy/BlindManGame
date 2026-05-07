import { useEffect, useRef, useState } from "react";
import type { ParkourGuideState } from "@blindman/shared";
import clsx from "clsx";

/**
 * Guide view. Tiles render as a CSS grid (stable); the player renders as an
 * absolutely-positioned dot that CSS-tweens between cells so discrete grid
 * moves feel fluid. On landings / collisions we add a short scale-pop.
 *
 * IMPORTANT: the *positioning* wrapper must persist across renders so the
 * CSS `transition: left/top` can actually interpolate between old and new
 * values. Remounting the positioning node (via `key`) would skip the
 * transition. We therefore put the re-key on the *inner* art node only, so
 * the pop animation replays without disturbing the outer tween.
 */
export default function ParkourGuide({ state }: { state: ParkourGuideState }) {
  const { width, height, solid, hazards, goal, playerPos, onGround } = state;

  // Track the previous position to detect "moved" for the pop fx.
  const prev = useRef<[number, number]>(playerPos);
  const [popKey, setPopKey] = useState(0);
  useEffect(() => {
    if (prev.current[0] !== playerPos[0] || prev.current[1] !== playerPos[1]) {
      prev.current = playerPos;
      setPopKey((k) => k + 1);
    }
  }, [playerPos[0], playerPos[1]]);

  const cellW = 100 / width;
  const cellH = 100 / height;

  return (
    <div className="card">
      <h3 className="font-black text-xl mb-3 text-white">Parkour — guide them to the goal</h3>

      <div
        className="relative mx-auto rounded-2xl overflow-hidden border-[3px] border-slate-900 bg-slate-950"
        style={{ maxWidth: "min(100%, 460px)", aspectRatio: `${width} / ${height}` }}
      >
        {/* Grid of cells */}
        <div
          className="absolute inset-0 grid gap-[2px] p-[2px]"
          style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: height }).flatMap((_, y) =>
            Array.from({ length: width }).map((_, x) => {
              const isSolid = solid[y][x];
              const isHazard = hazards[y][x];
              const isGoal = x === goal[0] && y === goal[1];
              return (
                <div
                  key={`${x},${y}`}
                  className={clsx(
                    "rounded-[4px] flex items-center justify-center text-[10px] font-black",
                    isSolid ? "bg-slate-400" : "bg-slate-900",
                    isHazard && "bg-rose-500 text-white",
                    isGoal && "bg-amber-300 text-slate-900"
                  )}
                >
                  {isGoal ? "★" : isHazard ? "▲" : ""}
                </div>
              );
            })
          )}
        </div>

        {/* Animated player dot. Outer node persists across renders so the
            `left/top` CSS transition actually interpolates; inner node is
            re-keyed to replay the pop animation on each move. */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `calc(${playerPos[0] * cellW}% + 2px)`,
            top: `calc(${playerPos[1] * cellH}% + 2px)`,
            width: `calc(${cellW}% - 4px)`,
            height: `calc(${cellH}% - 4px)`,
            transition:
              "left 160ms cubic-bezier(0.34,1.56,0.64,1), top 160ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div
            key={popKey}
            className={clsx(
              "w-full h-full rounded-lg border-[3px] border-slate-900 flex items-center justify-center font-black text-slate-900",
              onGround ? "bg-sky-300" : "bg-sky-200"
            )}
            style={{ animation: "parkourPop 180ms ease-out" }}
          >
            ●
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center text-xs font-bold text-white/80 mt-4 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-300 border-2 border-slate-900" />
          Player {onGround ? "(grounded)" : "(airborne)"}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-400 border-2 border-slate-900" />
          Platform
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500 border-2 border-slate-900" />
          Spike
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-300 border-2 border-slate-900" />
          Goal
        </span>
      </div>
      <p className="text-center text-sm text-emerald-300 font-bold mt-3">
        Call out LEFT / RIGHT / JUMP. Diagonal jumps (Q/E) move up-and-over.
      </p>
    </div>
  );
}
