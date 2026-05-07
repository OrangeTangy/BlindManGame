import type { SymbolScribeGuideState } from "@blindman/shared";
import Glyph from "./Glyph";

export default function SymbolScribeGuide({ state }: { state: SymbolScribeGuideState }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-xl text-white">Symbol Scribe</h3>
        <span className="text-sm font-bold text-white/80">
          Sent <span className="text-lime-300">{state.cleared}</span> / {state.total}
        </span>
      </div>

      <div className="flex justify-center my-6">
        <div
          className="rounded-3xl border-[3px] border-slate-900 bg-slate-100 p-6"
          style={{ boxShadow: "0 8px 0 0 rgb(15 23 42)" }}
        >
          <Glyph id={state.target} size={180} />
        </div>
      </div>

      <p className="text-center text-sm font-bold text-emerald-300">
        Describe this glyph. Don't say what it looks like — invent a name.
      </p>
    </div>
  );
}
