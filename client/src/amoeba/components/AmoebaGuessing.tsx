import { useState } from "react";
import { socket } from "../../socket";
import { useAmoebaStore } from "../amoebaStore";
import type { Amoeba, AmoebaLogEntry } from "@blindman/shared";

const AMOEBA_COLORS: string[] = [
  "bg-cyan-500",
  "bg-rose-500",
  "bg-amber-400",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-orange-500",
  "bg-fuchsia-500",
];

const AMOEBA_TEXT: string[] = [
  "text-cyan-400",
  "text-rose-400",
  "text-amber-400",
  "text-emerald-400",
  "text-violet-400",
  "text-sky-400",
  "text-orange-400",
  "text-fuchsia-400",
];

const AMOEBA_BORDER: string[] = [
  "border-cyan-500",
  "border-rose-500",
  "border-amber-400",
  "border-emerald-500",
  "border-violet-500",
  "border-sky-500",
  "border-orange-500",
  "border-fuchsia-500",
];

export default function AmoebaGuessing() {
  const { room, myPlayerId } = useAmoebaStore();

  if (!room) return null;

  const isMyCaptain = room.currentCaptainId === myPlayerId;
  const currentCaptain = room.players.find((p) => p.id === room.currentCaptainId);
  const myAmoeba = room.amoebas.find((a) => a.memberIds.includes(myPlayerId ?? ""));

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-4 pt-6">
      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Header */}
        <div className="text-center pop">
          <h2 className="display text-3xl text-cyan-400">🦠 Guessing Phase</h2>
          <p className="mt-1 text-white/60 font-semibold text-sm">
            Prompt:{" "}
            <span className="text-white font-bold">{room.prompt}</span>
          </p>
        </div>

        {/* Who's guessing */}
        <div className="card text-center">
          <p className="text-white/70 font-semibold text-sm mb-1">Current guesser</p>
          <p className="text-2xl font-extrabold text-amber-300">
            {currentCaptain?.name ?? "?"}
            {isMyCaptain ? " (you!)" : ""}
          </p>
          {!isMyCaptain && (
            <p className="mt-1 text-white/50 text-sm font-semibold">
              Waiting for them to guess…
            </p>
          )}
        </div>

        {/* Captain UI */}
        {isMyCaptain && (
          <GuessingForm room={room} myPlayerId={myPlayerId!} myAmoeba={myAmoeba} />
        )}

        {/* Revealed answers so far */}
        {room.revealedAnswers.length > 0 && (
          <div className="card">
            <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-3">
              Revealed
            </p>
            <div className="space-y-2">
              {room.revealedAnswers.map((r) => (
                <div key={r.playerId} className="flex items-center gap-3">
                  <span className="text-emerald-400 font-extrabold">✓</span>
                  <span className="font-bold text-white">{r.playerName}</span>
                  <span className="text-white/50 font-semibold text-sm">"{r.answer}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game log */}
        <GameLog log={room.log} />
      </div>

      {/* Sidebar — amoeba teams */}
      <div className="lg:w-64 flex flex-col gap-3">
        <h3 className="heading text-white text-sm uppercase tracking-widest text-center lg:text-left">
          Teams
        </h3>
        {room.amoebas.map((a) => (
          <AmoebaSidebarCard key={a.id} amoeba={a} room={room} myPlayerId={myPlayerId} />
        ))}
      </div>
    </div>
  );
}

function GuessingForm({
  room,
  myPlayerId,
  myAmoeba,
}: {
  room: import("@blindman/shared").AmoebaRoomPublic;
  myPlayerId: string;
  myAmoeba: Amoeba | undefined;
}) {
  const [targetId, setTargetId] = useState<string>("");
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const { setToast } = useAmoebaStore();

  const revealedIds = new Set(room.revealedAnswers.map((r) => r.playerId));
  const guessable = room.players.filter(
    (p) =>
      p.id !== myPlayerId &&
      p.id !== room.promptWriterId &&
      !myAmoeba?.memberIds.includes(p.id) &&
      !revealedIds.has(p.id)
  );

  const submit = () => {
    if (!targetId || !guess.trim()) return;
    setBusy(true);
    socket.emit(
      "amoebaMakeGuess" as any,
      { targetPlayerId: targetId, guessedAnswer: guess.trim() },
      () => {}
    );
    // Reset form optimistically; server will broadcast result
    setTimeout(() => {
      setBusy(false);
      setGuess("");
      setTargetId("");
    }, 400);
  };

  if (guessable.length === 0) {
    return (
      <div className="card text-center text-white/50 font-semibold">
        No more players to guess!
      </div>
    );
  }

  return (
    <div className="card pop">
      <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-3">
        Your turn to guess
      </p>

      {/* Target picker */}
      <p className="text-sm font-bold text-white/70 mb-2">Who wrote an answer?</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {guessable.map((p) => (
          <button
            key={p.id}
            onClick={() => setTargetId(p.id)}
            className={`px-4 py-2 rounded-lg border-2 font-extrabold text-sm transition-all ${
              targetId === p.id
                ? "bg-cyan-500 border-cyan-400 text-slate-900"
                : "bg-slate-700 border-slate-600 text-white hover:border-cyan-500"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Answer input */}
      <p className="text-sm font-bold text-white/70 mb-2">What did they write?</p>
      <input
        className="input mb-4"
        placeholder="Their answer…"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
        disabled={busy}
      />

      <button
        className="btn-go w-full h-14 text-lg"
        onClick={submit}
        disabled={!targetId || !guess.trim() || busy}
      >
        Make Guess
      </button>
    </div>
  );
}

function AmoebaSidebarCard({
  amoeba,
  room,
  myPlayerId,
}: {
  amoeba: Amoeba;
  room: import("@blindman/shared").AmoebaRoomPublic;
  myPlayerId: string | null;
}) {
  const colorBg = AMOEBA_COLORS[amoeba.colorIndex % AMOEBA_COLORS.length];
  const colorText = AMOEBA_TEXT[amoeba.colorIndex % AMOEBA_TEXT.length];
  const colorBorder = AMOEBA_BORDER[amoeba.colorIndex % AMOEBA_BORDER.length];
  const isCurrent = room.currentCaptainId === amoeba.captainId;

  return (
    <div
      className={`card border-2 ${colorBorder} ${isCurrent ? "ring-2 ring-amber-400" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${colorBg}`} />
        <span className={`font-extrabold text-sm ${colorText}`}>
          {room.players.find((p) => p.id === amoeba.captainId)?.name ?? "?"} 👑
        </span>
        {isCurrent && (
          <span className="ml-auto text-xs text-amber-300 font-extrabold">← now</span>
        )}
      </div>
      <div className="space-y-0.5">
        {amoeba.memberIds
          .filter((id) => id !== amoeba.captainId)
          .map((id) => {
            const p = room.players.find((pl) => pl.id === id);
            return (
              <div key={id} className="text-sm text-white/70 font-semibold pl-5">
                {p?.name ?? "?"}
                {id === myPlayerId ? " (you)" : ""}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function GameLog({ log }: { log: AmoebaLogEntry[] }) {
  const kindClass: Record<AmoebaLogEntry["kind"], string> = {
    info: "text-white/60",
    correct: "text-emerald-400",
    incorrect: "text-rose-400",
    merge: "text-cyan-400",
    win: "text-amber-300",
    system: "text-white/40",
  };

  const recent = [...log].reverse().slice(0, 20);

  return (
    <div className="card">
      <p className="text-xs font-extrabold uppercase tracking-widest text-white/30 mb-3">
        Log
      </p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {recent.map((entry) => (
          <p key={entry.id} className={`text-sm font-semibold ${kindClass[entry.kind]}`}>
            {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}
