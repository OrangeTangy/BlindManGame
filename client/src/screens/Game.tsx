import { useEffect, useState } from "react";
import { useStore } from "../store";
import GlobalTimer from "../components/GlobalTimer";
import NotificationsTicker from "../components/NotificationsTicker";
import RaceProgress from "../components/RaceProgress";
import MazeBlind from "../minigames/Maze/Blind";
import MazeGuide from "../minigames/Maze/Guide";
import SequenceBlind from "../minigames/Sequence/Blind";
import SequenceGuide from "../minigames/Sequence/Guide";
import DefusalBlind from "../minigames/Defusal/Blind";
import DefusalGuide from "../minigames/Defusal/Guide";
import RunnerBlind from "../minigames/Runner/Blind";
import RunnerGuide from "../minigames/Runner/Guide";
import ParkourBlind from "../minigames/Parkour/Blind";
import ParkourGuide from "../minigames/Parkour/Guide";
import MonstersBlind from "../minigames/Monsters/Blind";
import SignalBlind from "../minigames/Signal/Blind";
import SignalGuide from "../minigames/Signal/Guide";
import MonstersGuide from "../minigames/Monsters/Guide";
import FlashGridBlind from "../minigames/FlashGrid/Blind";
import FlashGridGuide from "../minigames/FlashGrid/Guide";
import TapVoidBlind from "../minigames/TapVoid/Blind";
import TapVoidGuide from "../minigames/TapVoid/Guide";
import SymbolScribeBlind from "../minigames/SymbolScribe/Blind";
import SymbolScribeGuide from "../minigames/SymbolScribe/Guide";
import LiarLiarBlind from "../minigames/LiarLiar/Blind";
import LiarLiarGuide from "../minigames/LiarLiar/Guide";
import MemoryTowerBlind from "../minigames/MemoryTower/Blind";
import MemoryTowerGuide from "../minigames/MemoryTower/Guide";
import WordSniperBlind from "../minigames/WordSniper/Blind";
import WordSniperGuide from "../minigames/WordSniper/Guide";
import ErrorBoundary from "../components/ErrorBoundary";
import clsx from "clsx";

export default function Game() {
  const { room, myRole, myDuoId, minigameState, stageFlash, stageEndToast } = useStore();
  if (!room) return null;
  const myDuo = room.duos.find((d) => d.id === myDuoId);
  if (!myDuo) return <SpectatorMode />;

  const finished = myDuo.runEndedAt !== null;
  const stage =
    !finished && room.plan && myDuo.stageIndex >= 0 && myDuo.stageIndex < room.plan.length
      ? room.plan[myDuo.stageIndex]
      : null;
  const isBlind = myRole === "blind";

  // Render the minigame panel if we have state and a stage.
  let panel: JSX.Element | null = null;
  if (finished) {
    panel = (
      <div className="card text-center py-10">
        <div className="text-sm uppercase text-slate-400 tracking-widest mb-2">
          Your run is complete
        </div>
        <div className="text-5xl font-black text-amber-400 mb-2">
          {((myDuo.totalTimeMs ?? 0) / 1000).toFixed(2)}s
        </div>
        <div className="text-slate-300">
          Rank <b className="text-amber-300">#{myDuo.rank}</b> · waiting for the other teams…
        </div>
        {myDuo.penaltyMs > 0 && (
          <div className="text-rose-400 text-sm mt-2">
            (including +{(myDuo.penaltyMs / 1000).toFixed(0)}s in penalties)
          </div>
        )}
      </div>
    );
  } else if (stage && minigameState) {
    // Route by the state's discriminator, NOT stage.kind. During a stage
    // transition the two can briefly disagree (new stage dispatched before
    // the matching state snapshot arrives, or vice-versa), and rendering
    // e.g. a MazeBlind with a RunnerBlindState shaped object used to blow up
    // and black-screen the page. Matching on state.kind guarantees the
    // component always receives a state of the exact shape it expects.
    const k = (minigameState as { kind?: string }).kind;
    if (k === "maze") panel = isBlind ? <MazeBlind state={minigameState as any} /> : <MazeGuide state={minigameState as any} />;
    else if (k === "sequence") panel = isBlind ? <SequenceBlind state={minigameState as any} /> : <SequenceGuide state={minigameState as any} />;
    else if (k === "defusal") panel = isBlind ? <DefusalBlind state={minigameState as any} /> : <DefusalGuide state={minigameState as any} />;
    else if (k === "runner") panel = isBlind ? <RunnerBlind state={minigameState as any} /> : <RunnerGuide state={minigameState as any} />;
    else if (k === "parkour") panel = isBlind ? <ParkourBlind state={minigameState as any} /> : <ParkourGuide state={minigameState as any} />;
    else if (k === "monsters") panel = isBlind ? <MonstersBlind state={minigameState as any} /> : <MonstersGuide state={minigameState as any} />;
    else if (k === "signal") panel = isBlind ? <SignalBlind state={minigameState as any} /> : <SignalGuide state={minigameState as any} />;
    else if (k === "flashgrid") panel = isBlind ? <FlashGridBlind state={minigameState as any} /> : <FlashGridGuide state={minigameState as any} />;
    else if (k === "tapvoid") panel = isBlind ? <TapVoidBlind state={minigameState as any} /> : <TapVoidGuide state={minigameState as any} />;
    else if (k === "symbolscribe") panel = isBlind ? <SymbolScribeBlind state={minigameState as any} /> : <SymbolScribeGuide state={minigameState as any} />;
    else if (k === "liarliar") panel = isBlind ? <LiarLiarBlind state={minigameState as any} /> : <LiarLiarGuide state={minigameState as any} />;
    else if (k === "memorytower") panel = isBlind ? <MemoryTowerBlind state={minigameState as any} /> : <MemoryTowerGuide state={minigameState as any} />;
    else if (k === "wordsniper") panel = isBlind ? <WordSniperBlind state={minigameState as any} /> : <WordSniperGuide state={minigameState as any} />;
    else panel = <div className="card text-slate-400 text-center">Loading stage…</div>;
  } else {
    panel = (
      <div className="card text-slate-400 text-center">
        Loading stage…
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "min-h-screen p-4 sm:p-6 relative",
        isBlind ? "bg-indigo-900" : "bg-emerald-900"
      )}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6">
        {/* Main column */}
        <div>
          {/* Top bar */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                {stage
                  ? `Stage ${stage.index + 1} / ${room.totalStages} · ${stage.kind.toUpperCase()}`
                  : finished
                  ? "Complete"
                  : "..."}
              </div>
              <div className="text-2xl font-black">
                You are{" "}
                <span className={isBlind ? "text-indigo-300" : "text-emerald-300"}>
                  {isBlind ? "BLIND" : "GUIDE"}
                </span>{" "}
                <span className="text-slate-500 text-sm font-normal">
                  · {myDuo.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <GlobalTimer
                startedAt={myDuo.runStartedAt}
                frozenAt={myDuo.runEndedAt}
                penaltyMs={myDuo.penaltyMs}
                label={finished ? "FINAL" : "RUN TIME"}
              />
              {stage && myDuo.stageStartedAt && !finished && (
                <StageCountdown
                  startedAt={myDuo.stageStartedAt}
                  durationMs={stage.durationMs}
                />
              )}
            </div>
          </div>

          {/* Honour-system communication restriction banner — only the
              guide sees it; blind doesn't need to know the rule. */}
          {!isBlind && stage && stage.restrictions.length > 0 && !finished && (
            <div
              className="rounded-2xl border-[3px] border-slate-900 bg-amber-300 text-slate-900 px-4 py-3 mb-3 font-black"
              style={{ boxShadow: "0 6px 0 0 rgb(15 23 42)" }}
            >
              <div className="text-[10px] uppercase tracking-[0.25em] mb-1">
                Stage Rule{stage.restrictions.length > 1 ? "s" : ""}
              </div>
              <ul className="space-y-0.5">
                {stage.restrictions.map((r, i) => (
                  <li key={i} className="text-sm">· {r}</li>
                ))}
              </ul>
            </div>
          )}

          <ErrorBoundary resetKey={`${myDuo.stageIndex}:${(minigameState as { kind?: string } | null)?.kind ?? ""}`}>
            {panel}
          </ErrorBoundary>

          {/* Role hint */}
          <div className={clsx("card mt-4 text-xs text-slate-400 leading-relaxed", isBlind ? "border-l-4 border-indigo-400" : "border-l-4 border-emerald-400")}>
            {isBlind ? (
              <>
                <p className="font-bold text-indigo-300 mb-1">You are the Blind.</p>
                <p>
                  You can't see the puzzle. Listen to your guide and press the
                  buttons they tell you to press. Next minigame starts the
                  instant this one ends — keep your focus.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-emerald-300 mb-1">You are the Guide.</p>
                <p>
                  Your partner only has the action buttons. Speak fast, speak
                  clearly — the clock never stops.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <RaceProgress room={room} highlightDuoId={myDuoId} />
          <NotificationsTicker
            items={room.notifications}
            highlightDuoId={myDuoId}
          />
        </div>
      </div>

      {/* Stage flash overlay */}
      {stageFlash && (
        <StageFlash kind={stageFlash.stage.kind} index={stageFlash.stage.index} total={room.totalStages} />
      )}
      {/* Stage end toast — chunky party-game banner with pop/shake. */}
      {stageEndToast && (
        <div
          key={`toast-${stageEndToast.timeMs}-${stageEndToast.penaltyMs}`}
          className={clsx(
            "fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-black z-40 border-[3px] border-slate-900 text-xl",
            stageEndToast.success ? "bg-lime-300 text-slate-900 celebrate" : "bg-rose-500 text-white shake"
          )}
          style={{ boxShadow: "0 8px 0 0 rgb(15 23 42)" }}
        >
          {stageEndToast.success
            ? `STAGE CLEARED — ${(stageEndToast.timeMs / 1000).toFixed(1)}s`
            : `STAGE FAILED — +${(stageEndToast.penaltyMs / 1000).toFixed(0)}s`}
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  maze: "Maze",
  sequence: "Sequence",
  defusal: "Defusal",
  runner: "Runner",
  parkour: "Parkour",
  monsters: "Monsters",
  signal: "Signal",
  flashgrid: "Flash Grid",
  tapvoid: "Tap the Void",
  symbolscribe: "Symbol Scribe",
  liarliar: "Liar Liar",
  memorytower: "Memory Tower",
  wordsniper: "Word Sniper",
};
const KIND_COLOR: Record<string, string> = {
  maze: "bg-fuchsia-400",
  sequence: "bg-cyan-400",
  defusal: "bg-rose-400",
  runner: "bg-amber-400",
  parkour: "bg-emerald-400",
  monsters: "bg-violet-400",
  signal: "bg-sky-400",
  flashgrid: "bg-lime-400",
  tapvoid: "bg-slate-400",
  symbolscribe: "bg-orange-400",
  liarliar: "bg-red-400",
  memorytower: "bg-teal-400",
  wordsniper: "bg-yellow-400",
};

function StageFlash({ kind, index, total }: { kind: string; index: number; total: number }) {
  const color = KIND_COLOR[kind] ?? "bg-amber-400";
  const label = KIND_LABEL[kind] ?? kind.toUpperCase();
  return (
    <div className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div
        className={clsx(
          "rounded-3xl border-[4px] border-slate-900 px-14 py-10 text-center stage-slam",
          color
        )}
        style={{ boxShadow: "0 10px 0 0 rgb(15 23 42)" }}
      >
        <div className="text-xs uppercase tracking-[0.25em] text-slate-900/80 font-black mb-2">
          Stage {index + 1} / {total}
        </div>
        <div className="text-6xl font-black text-slate-900 display">
          {label.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

/** Per-stage countdown with pressure pulse under 5s. */
function StageCountdown({
  startedAt,
  durationMs,
}: {
  startedAt: number;
  durationMs: number;
}) {
  const clockSkewMs = useStore((s) => s.clockSkewMs);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  // startedAt is a server epoch — correct for clock skew so the display
  // stays in sync with the server-side deadline.
  const serverNow = now + clockSkewMs;
  const remaining = Math.max(0, startedAt + durationMs - serverNow);
  const secs = (remaining / 1000).toFixed(1);
  const danger = remaining < 5000;
  const warn = remaining < 10000 && !danger;
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">
        Stage
      </div>
      <div
        className={clsx(
          "font-mono text-lg font-black tabular-nums",
          danger ? "pressure" : warn ? "text-amber-300" : "text-slate-200"
        )}
      >
        {secs}s
      </div>
    </div>
  );
}

function SpectatorMode() {
  const { room } = useStore();
  if (!room) return null;
  return (
    <div className="min-h-screen p-6 bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-black mb-4">Spectating</h2>
        <RaceProgress room={room} />
        <div className="mt-4">
          <NotificationsTicker items={room.notifications} limit={12} />
        </div>
      </div>
    </div>
  );
}
