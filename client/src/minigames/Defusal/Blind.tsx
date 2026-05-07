import type { DefusalBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

export default function DefusalBlind({ state }: { state: DefusalBlindState }) {
  const stage = state.stage;

  const cut = (i: number) =>
    socket.emit("action", { action: { type: "cut", index: i } });
  const toggle = (i: number) =>
    socket.emit("action", { action: { type: "toggle", index: i } });
  const digit = (v: number) =>
    socket.emit("action", { action: { type: "digit", value: v } });
  const clearCode = () =>
    socket.emit("action", { action: { type: "clearCode" } });
  const submitCode = () =>
    socket.emit("action", { action: { type: "submitCode" } });

  return (
    <div className="card">
      <div className="h-6 mb-4 text-center font-semibold">
        {state.failed ? (
          <span className="text-rose-400">💥 BOOM</span>
        ) : state.feedback ? (
          <span className="text-emerald-400">{state.feedback}</span>
        ) : (
          <span className="text-slate-400">
            Stage: {stage.toUpperCase()} — wait for instructions
          </span>
        )}
      </div>

      {stage === "wires" && (
        <div>
          <div className="text-sm text-slate-400 mb-2 text-center">
            Cut ONE wire.
          </div>
          <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
            {Array.from({ length: state.wireCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => cut(i)}
                className="btn-ghost h-14 text-lg font-bold"
                disabled={state.failed}
              >
                Cut Wire {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "switches" && (
        <div>
          <div className="text-sm text-slate-400 mb-2 text-center">
            Toggle switches.
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            {state.switches.map((sw, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={clsx(
                  "h-16 rounded-xl font-bold text-sm transition",
                  sw.on
                    ? "bg-emerald-500 text-slate-900"
                    : "bg-slate-700 text-slate-200"
                )}
                disabled={state.failed}
              >
                {sw.label}
                <div className="text-xs font-normal">{sw.on ? "ON" : "OFF"}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "code" && (
        <div>
          <div className="text-sm text-slate-400 mb-2 text-center">
            Enter the 3-digit code.
          </div>
          <div className="text-center font-mono text-4xl tracking-[0.4em] mb-4">
            {state.digitsEntered.map((d) => d).join("") +
              "_".repeat(3 - state.digitsEntered.length)}
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => digit(n)}
                className="btn-ghost h-14 text-xl font-bold"
              >
                {n}
              </button>
            ))}
            <button onClick={clearCode} className="btn-ghost h-14 text-sm">
              CLR
            </button>
            <button onClick={() => digit(0)} className="btn-ghost h-14 text-xl font-bold">
              0
            </button>
            <button onClick={submitCode} className="btn-primary h-14 text-sm">
              OK
            </button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="text-center text-xl font-bold">
          {state.failed ? "Defeat." : "Defused."}
        </div>
      )}
    </div>
  );
}
