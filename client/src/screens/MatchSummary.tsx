import { socket } from "../socket";
import { useStore } from "../store";
import { teamPalette } from "../components/teamColors";
import clsx from "clsx";

function fmt(ms: number | null) {
  if (ms == null || !isFinite(ms)) return "DNF";
  const mm = Math.floor(ms / 60_000);
  const ss = Math.floor((ms % 60_000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

export default function MatchSummary() {
  const { room, myPlayerId, myDuoId } = useStore();
  if (!room) return null;
  const me = room.players.find((p) => p.id === myPlayerId);
  const amHost = me?.id === room.hostId;

  // Preserve each duo's original index so team colors stay consistent
  // with the Lobby even after we sort the list by finish time.
  const rows = room.duos
    .filter((d) => d.playerIds.length === 2)
    .map((d) => ({ d, origIdx: room.duos.findIndex((x) => x.id === d.id) }))
    .slice()
    .sort((a, b) => (a.d.totalTimeMs ?? Infinity) - (b.d.totalTimeMs ?? Infinity));
  const winner = rows[0];
  const winnerPal = winner ? teamPalette(winner.origIdx) : null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 pop">
          <div className="text-sm font-extrabold uppercase text-white/70 tracking-[0.3em]">
            Gauntlet Complete
          </div>
          <h1 className="display text-5xl sm:text-6xl mt-2 text-white">
            <span className={clsx(winnerPal?.textOn ?? "text-amber-300")}>
              {winner?.d.label}
            </span>{" "}
            wins!
          </h1>
          <p className="mt-3 text-lg font-extrabold text-amber-300">
            Congratulations to {winner?.d.label} — fastest hands in the room!
          </p>
          <div className="text-white/80 mt-3 font-bold">
            Final time{" "}
            <span className="font-mono font-black text-amber-300 text-2xl ml-1">
              {fmt(winner?.d.totalTimeMs ?? null)}
            </span>
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="text-xl font-black mb-4 text-white">Final Standings</h3>
          <ul className="space-y-3">
            {rows.map(({ d, origIdx }, i) => {
              const pal = teamPalette(origIdx);
              const mine = d.id === myDuoId;
              const clears = d.stageResults.filter((r) => r.success).length;
              return (
                <li
                  key={d.id}
                  className={clsx(
                    "card-bright flex justify-between items-center !p-4",
                    pal.bg,
                    mine && "ring-4 ring-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black w-12 text-center">
                      #{i + 1}
                    </span>
                    <div>
                      <div className="text-xl font-black flex items-center gap-2">
                        {d.label}
                        {i === 0 && (
                          <span className="badge bg-amber-300 text-slate-900 ml-1">WINNER</span>
                        )}
                        {mine && (
                          <span className="badge bg-slate-900 text-white ml-1">YOU</span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900/70">
                        {clears}/{room.totalStages} cleared
                        {d.penaltyMs > 0 && (
                          <span className="ml-2 text-rose-700">
                            +{(d.penaltyMs / 1000).toFixed(0)}s penalty
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-2xl">
                    {fmt(d.totalTimeMs)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex justify-center gap-3 flex-wrap">
          {amHost && (
            <button className="btn-primary h-14 text-lg glow" onClick={() => socket.emit("playAgain")}>
              Play Again
            </button>
          )}
          <button
            className="btn-ghost h-14 text-lg"
            onClick={() => {
              socket.emit("leaveRoom");
              localStorage.removeItem("blindman:lastRoom");
              useStore.getState().reset();
            }}
          >
            Leave Room
          </button>
        </div>
        {!amHost && (
          <p className="text-center text-white/70 text-sm mt-4 font-bold">
            Waiting for host to start another gauntlet…
          </p>
        )}
      </div>
    </div>
  );
}
