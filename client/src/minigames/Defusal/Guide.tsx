import type { DefusalPublicState, WireColor } from "@blindman/shared";
import clsx from "clsx";

const wireClass: Record<WireColor, string> = {
  red: "bg-rose-500",
  blue: "bg-sky-500",
  yellow: "bg-amber-400 text-slate-900",
  white: "bg-slate-100 text-slate-900",
  black: "bg-slate-900 border border-slate-600",
};

export default function DefusalGuide({ state }: { state: DefusalPublicState }) {
  return (
    <div className="card space-y-5">
      <div>
        <h3 className="font-bold mb-2">📜 Defusal Manual</h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
          {state.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="font-bold text-sm uppercase text-slate-400 mb-1">
          Stage 1 — Wires
        </h4>
        <div className="space-y-1">
          {state.wires.map((w, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-white font-bold",
                wireClass[w],
                state.cutIndex === i && "opacity-40 line-through"
              )}
            >
              <span className="w-16 font-mono text-xs">Wire {i + 1}</span>
              <span className="flex-1">{w.toUpperCase()}</span>
            </div>
          ))}
        </div>
        {state.cutIndex === null && (
          <p className="text-xs text-emerald-300 mt-2">
            Work out which wire matches the rules and tell them "Cut Wire X".
          </p>
        )}
      </div>

      {state.stage !== "wires" && (
        <div>
          <h4 className="font-bold text-sm uppercase text-slate-400 mb-1">
            Stage 2 — Switches
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {state.switches.map((sw, i) => (
              <div
                key={i}
                className={clsx(
                  "rounded-lg p-2 text-sm flex justify-between items-center",
                  sw.on === sw.target ? "bg-emerald-900/50" : "bg-slate-800"
                )}
              >
                <span className="font-bold">{sw.label}</span>
                <span className="text-xs">
                  want: <b>{sw.target ? "ON" : "OFF"}</b> · now:{" "}
                  <b>{sw.on ? "ON" : "OFF"}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.stage === "code" || state.stage === "done" ? (
        <div>
          <h4 className="font-bold text-sm uppercase text-slate-400 mb-1">
            Stage 3 — Code
          </h4>
          <div className="font-mono text-3xl tracking-[0.4em]">
            {state.digitsTarget.join("")}
          </div>
          <p className="text-xs text-emerald-300 mt-1">
            Say each digit one at a time; they press the keypad.
          </p>
        </div>
      ) : null}
    </div>
  );
}
