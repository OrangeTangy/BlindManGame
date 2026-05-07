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
  const { room, myRole, myDuoId, minigameState, stageEndToast, clockSkewMs } = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  if (!room) return null;
  const myDuo = room.duos.find((d) => d.id === myDuoId);
  if (!myDuo) return <SpectatorMode />;

  const finished = myDuo.runEndedAt !== null;
  const stage =
    !finished && room.plan && myDuo.stageIndex >= 0 && myDuo.stageIndex < room.plan.length
      ? room.plan[myDuo.stageIndex]
      : null;
  const isBlind = myRole === "blind";

  // Pre-stage intro phase: server set duo.stageStartedAt to a future
  // timestamp (introMs in the future). While the server clock has not yet
  // reached that timestamp, the engine isn't ticking and actions are
  // rejected — so we show the rules overlay instead of the panel.
  const serverNow = now + clockSkewMs;
  const inIntro =
    !!stage &&
    !finished &&
    myDuo.stageStartedAt !== null &&
    serverNow < myDuo.stageStartedAt;

  // Render the minigame panel if we have state and a stage.
  let panel: JSX.Element | null = null;
  if (finished) {
    panel = (
      <div className="card text-center py-10">
        <div className="text-sm uppercase text-slate-400 tracking-widest mb-2">
          Your run is complete
        </div>
        <div className="display text-5xl text-amber-400 mb-2">
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
    panel = <div className="card text-slate-400 text-center">Loading stage…</div>;
  }

  // During the intro phase we render ONLY the overlay — no top bar, no
  // race progress, no notifications. Everything else is intentionally hidden
  // so the player's whole attention is on the rules.
  if (inIntro && stage && myDuo.stageStartedAt !== null) {
    return (
      <StageIntro
        stage={stage}
        role={isBlind ? "blind" : "guide"}
        opensAt={myDuo.stageStartedAt}
        now={serverNow}
        totalStages={room.totalStages}
      />
    );
  }

  return (
    <div
      className={clsx(
        "min-h-screen p-4 sm:p-6 relative",
        isBlind ? "bg-indigo-900" : "bg-emerald-900"
      )}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-6">
        {/* Main column */}
        <div>
          {/* Streamlined top bar: stage tag + role pill on left, timers on right.
              Player names are intentionally not shown here. */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {stage && (
                <span
                  className={clsx(
                    "tile heading text-sm",
                    KIND_COLOR[stage.kind] ?? "bg-amber-400",
                    "text-slate-900"
                  )}
                >
                  {KIND_LABEL[stage.kind] ?? stage.kind} · {stage.index + 1}/{room.totalStages}
                </span>
              )}
              <span
                className={clsx(
                  "badge text-sm",
                  isBlind ? "bg-indigo-400 text-slate-900" : "bg-emerald-400 text-slate-900"
                )}
              >
                {isBlind ? "Blind" : "Guide"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {stage && myDuo.stageStartedAt && !finished && (
                <StageCountdown
                  startedAt={myDuo.stageStartedAt}
                  durationMs={stage.durationMs}
                />
              )}
              <GlobalTimer
                startedAt={myDuo.runStartedAt}
                frozenAt={myDuo.runEndedAt}
                penaltyMs={myDuo.penaltyMs}
                label={finished ? "Final" : "Run"}
              />
            </div>
          </div>

          {/* Restriction banner — only the guide sees it. */}
          {!isBlind && stage && stage.restrictions.length > 0 && !finished && (
            <div
              className="rounded-lg border-[3px] border-slate-900 bg-amber-300 text-slate-900 px-4 py-2 mb-3"
              style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
            >
              <div className="heading text-xs mb-0.5">
                Rule{stage.restrictions.length > 1 ? "s" : ""}
              </div>
              <ul>
                {stage.restrictions.map((r, i) => (
                  <li key={i} className="text-sm font-bold">· {r}</li>
                ))}
              </ul>
            </div>
          )}

          <ErrorBoundary
            resetKey={`${myDuo.stageIndex}:${(minigameState as { kind?: string } | null)?.kind ?? ""}`}
          >
            {panel}
          </ErrorBoundary>
        </div>

        {/* Right column — kept compact: race progress and recent events. */}
        <div className="space-y-3">
          <RaceProgress room={room} highlightDuoId={myDuoId} />
          <NotificationsTicker items={room.notifications} highlightDuoId={myDuoId} limit={4} />
        </div>
      </div>

      {/* Stage-end toast */}
      {stageEndToast && (
        <div
          key={`toast-${stageEndToast.timeMs}-${stageEndToast.penaltyMs}`}
          className={clsx(
            "fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg heading z-40 border-[3px] border-slate-900 text-xl",
            stageEndToast.success ? "bg-lime-300 text-slate-900 celebrate" : "bg-rose-500 text-white shake"
          )}
          style={{ boxShadow: "0 8px 0 0 rgb(15 23 42)" }}
        >
          {stageEndToast.success
            ? `Stage cleared — ${(stageEndToast.timeMs / 1000).toFixed(1)}s`
            : `Stage failed — +${(stageEndToast.penaltyMs / 1000).toFixed(0)}s`}
        </div>
      )}
    </div>
  );
}

// ---------- Per-game rules text ----------
// Two short sentences per role per game. These show full-screen during the
// intro window, replacing the old micro "STAGE FLASH" overlay.
type GameRules = { headline: string; blind: string[]; guide: string[] };
const RULES: Record<string, GameRules> = {
  maze: {
    headline: "Walk the maze.",
    blind: [
      "Press the arrow your guide calls.",
      "Walls bump. Spikes are instant fail.",
    ],
    guide: [
      "You see the maze, the spikes, and the goal.",
      "Steer them safely to the star.",
    ],
  },
  sequence: {
    headline: "Match the sequence.",
    blind: [
      "Press colours in the order your guide says.",
      "Three mistakes and you're out.",
    ],
    guide: [
      "You see the colour sequence.",
      "Read it out loud, one colour at a time.",
    ],
  },
  defusal: {
    headline: "Defuse the bomb.",
    blind: [
      "Wires, switches, a keypad. Do exactly what your guide says.",
      "One wrong move and it blows.",
    ],
    guide: [
      "You have the rule book and the target codes.",
      "Read each step. They press the buttons.",
    ],
  },
  runner: {
    headline: "Don't trip.",
    blind: [
      "Just hit JUMP when your guide yells NOW.",
      "Time it wrong and you crash.",
    ],
    guide: [
      "You see obstacles racing toward your runner.",
      "Yell JUMP at the right instant.",
    ],
  },
  parkour: {
    headline: "Climb to the goal.",
    blind: [
      "LEFT, RIGHT, JUMP, Q for jump-left, E for jump-right.",
      "Spikes kill. Falls kill. Listen carefully.",
    ],
    guide: [
      "You see platforms, spikes, and the goal flag.",
      "Tell them when to walk, when to leap, and which direction.",
    ],
  },
  monsters: {
    headline: "Strike the right side.",
    blind: [
      "Hit LEFT or RIGHT exactly when your guide says.",
      "Wrong side = instant fail. Too slow = also fail.",
    ],
    guide: [
      "Monsters charge from left or right.",
      "Yell the side at the moment of impact.",
    ],
  },
  flashgrid: {
    headline: "Memorise. Repeat.",
    blind: [
      "Tap the grid cells your guide names.",
      "One wrong tap and the round ends.",
    ],
    guide: [
      "Cells will flash on a 3×3 grid for 2 seconds.",
      "Memorise their positions, then describe them.",
    ],
  },
  signal: {
    headline: "Tune the signal.",
    blind: [
      "Tune left or right. Hit LOCK only when your guide says.",
      "You see signal bars, but not the actual frequency.",
    ],
    guide: [
      "You see the dial and the target band.",
      "Direct them in, then call LOCK in the green zone.",
    ],
  },
  tapvoid: {
    headline: "Tap the void.",
    blind: [
      "Your screen is BLACK. Tap blind to find the hidden target.",
      "After each tap you'll hear warmer or colder.",
    ],
    guide: [
      "You see the target and the blind's last tap.",
      "Direct them onto the green ring — no directional words allowed.",
    ],
  },
  symbolscribe: {
    headline: "Pick the glyph.",
    blind: [
      "Twelve abstract symbols. Pick the one your guide describes.",
      "Two wrong picks and the round fails.",
    ],
    guide: [
      "You see one weird glyph at a time.",
      "Describe it without saying what it looks like — invent words.",
    ],
  },
  liarliar: {
    headline: "Find the lie.",
    blind: [
      "Cut the wires in the order your guide says.",
      "One wrong cut and it explodes.",
    ],
    guide: [
      "Five rules describe the cut order. Exactly ONE rule is a lie.",
      "Cross-check, find the contradiction, then call out the cuts.",
    ],
  },
  memorytower: {
    headline: "Stack the tower.",
    blind: [
      "Tap icons in the order your guide reads them.",
      "One wrong tap collapses the whole stack.",
    ],
    guide: [
      "You see the target stack from bottom up.",
      "Read the icons in order. They tap.",
    ],
  },
  wordsniper: {
    headline: "Snipe the targets.",
    blind: [
      "Hit FIRE when your guide yells NOW.",
      "Misses cost. Don't spam the button.",
    ],
    guide: [
      "Target words flow across in gold.",
      "Yell NOW the moment a target enters the band.",
    ],
  },
};

// ---------- Game-kind metadata ----------
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

// ---------- Pre-stage intro ----------
import type { GauntletStage } from "@blindman/shared";

function StageIntro({
  stage,
  role,
  opensAt,
  now,
  totalStages,
}: {
  stage: GauntletStage;
  role: "blind" | "guide";
  opensAt: number;
  now: number;
  totalStages: number;
}) {
  const remainingMs = Math.max(0, opensAt - now);
  const seconds = Math.ceil(remainingMs / 1000);

  const rules = RULES[stage.kind] ?? {
    headline: stage.kind.toUpperCase(),
    blind: ["Listen to your guide. Press what they say."],
    guide: ["Tell your blind partner what to press."],
  };
  const lines = role === "blind" ? rules.blind : rules.guide;
  const colourClass = KIND_COLOR[stage.kind] ?? "bg-amber-400";
  const label = KIND_LABEL[stage.kind] ?? stage.kind;

  return (
    <div
      className={clsx(
        "min-h-screen flex items-center justify-center p-6",
        role === "blind" ? "bg-indigo-900" : "bg-emerald-900"
      )}
    >
      <div className="w-full max-w-2xl intro-in text-center">
        {/* Stage tag */}
        <div className="mb-4 flex justify-center">
          <span className={clsx("tile heading text-base text-slate-900", colourClass)}>
            Stage {stage.index + 1} / {totalStages}
          </span>
        </div>

        {/* Massive game name */}
        <h1 className="display text-6xl sm:text-7xl text-white mb-3 leading-none">
          {label}
        </h1>

        {/* Headline tagline */}
        <p className="heading text-2xl text-amber-300 mb-8">{rules.headline}</p>

        {/* Role tag */}
        <div className="mb-4 flex justify-center">
          <span
            className={clsx(
              "badge text-sm px-4 py-2",
              role === "blind" ? "bg-indigo-400 text-slate-900" : "bg-emerald-400 text-slate-900"
            )}
          >
            You are the {role === "blind" ? "Blind" : "Guide"}
          </span>
        </div>

        {/* Rules — two big lines, easy to scan in 5 seconds */}
        <div className="space-y-3 mb-6">
          {lines.map((line, i) => (
            <div
              key={i}
              className="rounded-lg border-[3px] border-slate-900 bg-slate-900/80 px-5 py-4 text-xl font-bold text-white"
              style={{ boxShadow: "0 5px 0 0 rgb(15 23 42)" }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Guide-only restrictions, surfaced here as well so they land before
            the round starts. */}
        {role === "guide" && stage.restrictions.length > 0 && (
          <div
            className="rounded-lg border-[3px] border-slate-900 bg-amber-300 text-slate-900 px-4 py-3 mb-6"
            style={{ boxShadow: "0 5px 0 0 rgb(15 23 42)" }}
          >
            <div className="heading text-sm mb-1">
              Rule{stage.restrictions.length > 1 ? "s" : ""}
            </div>
            <ul className="space-y-1">
              {stage.restrictions.map((r, i) => (
                <li key={i} className="text-base font-bold">· {r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Pulsing countdown digit */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase tracking-[0.3em] text-white/70 heading">
            Starts in
          </div>
          <div className="display text-7xl text-amber-300 countdown-pulse">
            {seconds}
          </div>
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
  const serverNow = now + clockSkewMs;
  const remaining = Math.max(0, startedAt + durationMs - serverNow);
  const secs = (remaining / 1000).toFixed(1);
  const danger = remaining < 5000;
  const warn = remaining < 10000 && !danger;
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-widest text-slate-300 heading">
        Stage
      </div>
      <div
        className={clsx(
          "timer text-lg font-bold tabular-nums",
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
        <h2 className="display text-3xl text-white mb-4">Spectating</h2>
        <RaceProgress room={room} />
        <div className="mt-4">
          <NotificationsTicker items={room.notifications} limit={12} />
        </div>
      </div>
    </div>
  );
}
