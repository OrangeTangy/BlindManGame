import { useEffect, useRef, useState } from "react";
import type { TapVoidBlindState } from "@blindman/shared";
import { socket } from "../../socket";
import clsx from "clsx";

export default function TapVoidBlind({ state }: { state: TapVoidBlindState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, [state.lastFeedback, state.cleared]);

  const onTap = (e: React.MouseEvent | React.TouchEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let cx: number; let cy: number;
    if ("touches" in e && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else if ("changedTouches" in e && e.changedTouches.length > 0) {
      cx = e.changedTouches[0].clientX;
      cy = e.changedTouches[0].clientY;
    } else {
      cx = (e as React.MouseEvent).clientX;
      cy = (e as React.MouseEvent).clientY;
    }
    const x = (cx - rect.left) / rect.width;
    const y = (cy - rect.top) / rect.height;
    socket.emit("action", { action: { type: "tapAt", x, y } });
  };

  const feedbackText = {
    none: "Tap somewhere…",
    warmer: "WARMER",
    colder: "Colder",
    hit: "HIT!",
  }[state.lastFeedback];
  const feedbackColor = {
    none: "text-white/70",
    warmer: "text-amber-300",
    colder: "text-sky-300",
    hit: "text-lime-300",
  }[state.lastFeedback];

  return (
    <div className="card">
      <div
        key={tick}
        className={clsx("text-center text-3xl font-black mb-2 pop", feedbackColor)}
      >
        {feedbackText}
      </div>
      <div className="text-center text-sm font-bold text-white/70 mb-3">
        Hits <span className="text-lime-300">{state.cleared}</span> / {state.total}
      </div>
      <div
        ref={ref}
        onMouseDown={onTap}
        onTouchStart={(e) => { e.preventDefault(); onTap(e); }}
        className="relative w-full rounded-2xl border-[3px] border-slate-900 bg-black select-none cursor-crosshair"
        style={{ aspectRatio: "1 / 1", touchAction: "none" }}
      />
      <p className="text-center text-xs font-bold text-white/50 mt-3">
        Tap blind. Listen for "warmer" or "colder".
      </p>
    </div>
  );
}
