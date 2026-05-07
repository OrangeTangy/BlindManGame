import type { SequenceBlindState, ColorKey } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

const colorClasses: Record<ColorKey, string> = {
  red: "bg-rose-500 hover:bg-rose-400",
  green: "bg-emerald-500 hover:bg-emerald-400",
  blue: "bg-sky-500 hover:bg-sky-400",
  yellow: "bg-amber-400 hover:bg-amber-300",
  purple: "bg-fuchsia-500 hover:bg-fuchsia-400",
  orange: "bg-orange-500 hover:bg-orange-400",
};

export default function SequenceBlind({ state }: { state: SequenceBlindState }) {
  const press = (c: ColorKey) =>
    socket.emit("action", { action: { type: "press", color: c } });

  return (
    <div className="card">
      <div className="flex justify-between text-sm text-slate-400 mb-3">
        <span>Correct: {state.progress}</span>
        <span>Mistakes: {state.mistakes} / 3</span>
      </div>
      <div className="h-6 mb-4 text-center font-semibold">
        {state.lastPress === null ? (
          <span className="text-slate-400">Awaiting instructions…</span>
        ) : state.lastPressOk ? (
          <span className="text-emerald-400">Correct</span>
        ) : (
          <span className="text-rose-400">Wrong!</span>
        )}
      </div>
      <div
        className={clsx(
          "grid gap-3 mx-auto",
          state.palette.length <= 4
            ? "grid-cols-2 max-w-sm"
            : "grid-cols-3 max-w-md"
        )}
      >
        {state.palette.map((c) => (
          <button
            key={c}
            onClick={() => press(c)}
            className={clsx(
              "h-24 rounded-2xl text-slate-900 font-black text-lg shadow-lg active:scale-95 transition",
              colorClasses[c]
            )}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500 mt-4">
        Your guide will call out a color sequence. Press in order.
      </p>
    </div>
  );
}
