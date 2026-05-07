import type { TapVoidGuideState } from "@blindman/shared";

export default function TapVoidGuide({ state }: { state: TapVoidGuideState }) {
  const { target, lastTap, cleared, total, threshold } = state;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-xl text-white">Tap the Void</h3>
        <span className="text-sm font-bold text-white/80">
          Hits <span className="text-lime-300">{cleared}</span> / {total}
        </span>
      </div>
      <div
        className="relative w-full rounded-2xl border-[3px] border-slate-900 bg-slate-950 overflow-hidden"
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Threshold ring around the target */}
        <div
          className="absolute rounded-full border-[2px] border-lime-300/60"
          style={{
            left: `${(target.x - threshold) * 100}%`,
            top: `${(target.y - threshold) * 100}%`,
            width: `${threshold * 200}%`,
            height: `${threshold * 200}%`,
          }}
        />
        {/* Target dot */}
        <div
          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300 border-[3px] border-slate-900"
          style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
        />
        {/* Last tap dot */}
        {lastTap && (
          <div
            className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 border-[3px] border-slate-900"
            style={{ left: `${lastTap.x * 100}%`, top: `${lastTap.y * 100}%` }}
          />
        )}
      </div>
      <p className="text-center text-sm font-bold text-emerald-300 mt-3">
        Their screen is BLACK. Guide them onto the green ring.
      </p>
    </div>
  );
}
