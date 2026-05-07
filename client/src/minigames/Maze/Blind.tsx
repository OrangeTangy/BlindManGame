import { useEffect } from "react";
import type { MazeBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const feedbackText: Record<MazeBlindState["lastFeedback"], string> = {
  none: "Awaiting instructions…",
  move: "Moved.",
  bump: "BUMP! Wall.",
  hazard: "HAZARD HIT!",
  goal: "GOAL REACHED!",
};
const feedbackColor: Record<MazeBlindState["lastFeedback"], string> = {
  none: "text-white/70",
  move: "text-emerald-300",
  bump: "text-rose-300",
  hazard: "text-rose-400",
  goal: "text-amber-300",
};

type Dir = "up" | "down" | "left" | "right";
function move(dir: Dir) {
  socket.emit("action", { action: { type: "move", dir } });
}

export default function MazeBlind({ state }: { state: MazeBlindState }) {
  // Scoped keyboard binding. Cleanup on unmount is critical — a leaked
  // listener from this screen used to fire { type: "move" } during other
  // minigames and spam ignored actions at the server.
  useEffect(() => {
    const map: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const feedbackKey = `${state.lastFeedback}:${state.stepsTaken}`;

  return (
    <div className="card">
      <div
        key={feedbackKey}
        className={clsx(
          "text-center text-2xl font-black mb-2 pop",
          feedbackColor[state.lastFeedback]
        )}
      >
        {feedbackText[state.lastFeedback]}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-6">
        Steps taken: <span className="text-amber-300">{state.stepsTaken}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto select-none">
        <div />
        <button className="btn-ghost h-20 text-3xl" onClick={() => move("up")}>
          ▲
        </button>
        <div />
        <button className="btn-ghost h-20 text-3xl" onClick={() => move("left")}>
          ◀
        </button>
        <div className="h-20" />
        <button className="btn-ghost h-20 text-3xl" onClick={() => move("right")}>
          ▶
        </button>
        <div />
        <button className="btn-ghost h-20 text-3xl" onClick={() => move("down")}>
          ▼
        </button>
        <div />
      </div>
      <p className="text-center text-xs font-bold text-white/60 mt-4">
        Arrow keys or WASD also work.
      </p>
    </div>
  );
}
