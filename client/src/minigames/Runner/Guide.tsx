import { useEffect, useRef, useState } from "react";
import type { RunnerGuideState } from "@blindman/shared";
import clsx from "clsx";

/**
 * Smooth guide track. The server advances scrollX in whole cells on its tick
 * cadence. We keep a fractional `virtualScroll` on the client that eases
 * toward the authoritative value via RAF, so obstacles slide continuously
 * (no cell-snap) while the server remains the source of truth for
 * collisions, success, and failure. The player likewise animates its Y
 * offset with a springy CSS transition between the discrete 0/1/2 states.
 */
export default function RunnerGuide({ state }: { state: RunnerGuideState }) {
  const cols = state.trackLength;
  const advanceMs = Math.max(120, state.ticksPerAdvance * 100);
  const cellsPerMs = 1 / advanceMs;

  // Fractional scroll that chases state.scrollX.
  const [virtualScroll, setVirtualScroll] = useState(state.scrollX);
  const targetRef = useRef(state.scrollX);
  targetRef.current = state.scrollX;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      setVirtualScroll((v) => {
        const target = targetRef.current;
        if (v >= target) return target;
        const step = dt * cellsPerMs;
        const next = v + step;
        // If the server jumped ahead by several cells (e.g. after a rejoin),
        // snap rather than crawl — feels right to the player.
        if (target - v > 3) return target;
        return next > target ? target : next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cellsPerMs]);

  // Visible window: [virtualScroll - 1, virtualScroll + cols + 2] so incoming
  // obstacles glide in from off-screen right.
  const leftEdge = virtualScroll - 1;
  const windowCols = cols + 3;

  const obstacles = state.obstacles.filter(
    (o) => o.x >= Math.floor(leftEdge) - 1 && o.x < leftEdge + windowCols + 1
  );

  // Player column in window coords. We use the *authoritative* scrollX (not
  // the smoothed virtualScroll) as the reference point, so the player stays
  // rock-still at its home column while the world scrolls smoothly beneath
  // it. Using virtualScroll here caused a visible wobble: on every server
  // tick the player would jump one cell right then glide back left as the
  // scroll eased in.
  const playerWinCol = state.playerX - state.scrollX + 1;
  const playerLeftPct = (playerWinCol / windowCols) * 100;
  const cellWidthPct = (1 / windowCols) * 100;

  // Player Y maps 0/1/2 → ground / mid / apex. Kept under ~50% of the
  // container so the sprite never clips the top edge.
  const jumpPct = state.playerY === 0 ? 0 : state.playerY === 1 ? 24 : 46;

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-black text-xl text-white">Incoming obstacles</h3>
        <div className="text-sm font-bold text-white/80">
          Cleared <span className="text-lime-300">{state.cleared}</span> / {state.target}
        </div>
      </div>

      <div
        className="relative w-full rounded-2xl overflow-hidden border-[3px] border-slate-900 bg-sky-400"
        style={{ aspectRatio: `${cols} / 6` }}
      >
        {/* Parallax sun disc just for mood */}
        <div className="absolute top-3 right-4 w-10 h-10 rounded-full bg-amber-200 border-[3px] border-slate-900" />

        {/* Ground strip */}
        <div className="absolute left-0 right-0 bottom-0 h-1/3 bg-emerald-500" />
        <div
          className="absolute left-0 right-0"
          style={{ bottom: "33%", height: 3, background: "rgb(15 23 42)" }}
        />

        {/* Obstacles layer — each one absolutely positioned by its absX,
            using the smoothed virtualScroll. */}
        {obstacles.map((o) => {
          const winX = o.x - leftEdge;
          const leftPct = (winX / windowCols) * 100;
          return (
            <div
              key={`o-${o.x}`}
              className={clsx(
                "absolute rounded-lg border-[3px] border-slate-900",
                o.high ? "bg-rose-500" : "bg-rose-400"
              )}
              style={{
                left: `${leftPct}%`,
                width: `${cellWidthPct}%`,
                bottom: "33%",
                height: o.high ? "48%" : "24%",
              }}
            />
          );
        })}

        {/* Player — fixed column on screen, animated vertically */}
        <div
          className="absolute"
          style={{
            left: `${playerLeftPct}%`,
            width: `${cellWidthPct}%`,
            bottom: `calc(33% + ${jumpPct}%)`,
            transition: "bottom 180ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div
            className="w-full rounded-full border-[3px] border-slate-900 bg-amber-300 flex items-center justify-center font-black text-slate-900"
            style={{ aspectRatio: "1 / 1" }}
          >
            P
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-emerald-300 font-bold mt-3">
        Watch the distance — call "JUMP" in time.
      </p>
    </div>
  );
}
