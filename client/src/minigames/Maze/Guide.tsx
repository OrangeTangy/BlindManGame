import type { MazePublicState } from "@blindman/shared";
import clsx from "clsx";

export default function MazeGuide({ state }: { state: MazePublicState }) {
  const { width, height, grid, start, goal, hazards, playerPos } = state;
  const isHazard = (x: number, y: number) =>
    hazards.some(([hx, hy]) => hx === x && hy === y);
  return (
    <div className="card">
      <h3 className="font-bold mb-3">Guide view — the maze</h3>
      <div
        className="grid gap-[2px] mx-auto"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
          maxWidth: "min(100%, 540px)",
        }}
      >
        {grid.flatMap((row, y) =>
          row.map((cell, x) => {
            const isStart = x === start[0] && y === start[1];
            const isGoal = x === goal[0] && y === goal[1];
            const isPlayer = x === playerPos[0] && y === playerPos[1];
            const hazard = isHazard(x, y);
            return (
              <div
                key={`${x},${y}`}
                className={clsx(
                  "aspect-square rounded-sm flex items-center justify-center text-[10px] font-bold",
                  cell === 1 ? "bg-slate-800" : "bg-slate-600",
                  isStart && "bg-emerald-700",
                  isGoal && "bg-amber-500 text-slate-900",
                  hazard && "bg-rose-700 text-white",
                  isPlayer && "bg-indigo-400 text-slate-900 ring-2 ring-white"
                )}
              >
                {isPlayer ? "●" : isGoal ? "★" : hazard ? "✖" : ""}
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-4 justify-center text-xs text-slate-400 mt-4 flex-wrap">
        <span>
          <span className="inline-block w-3 h-3 bg-indigo-400 align-middle mr-1" />
          Blind player
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-amber-500 align-middle mr-1" />
          Goal
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-rose-700 align-middle mr-1" />
          Hazard (instant fail)
        </span>
      </div>
      <p className="text-center text-sm text-emerald-300 mt-3">
        Tell them: up, down, left, right — step by step.
      </p>
    </div>
  );
}
