import { socket } from "../../socket";
import { useCoupStore } from "../coupStore";

export default function CoupGameOver() {
  const { room, myPlayerId } = useCoupStore();
  if (!room) return null;

  const winner = room.players.find((p) => p.id === room.winnerId);
  const isHost = room.hostId === myPlayerId;
  const isWinner = room.winnerId === myPlayerId;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="pop">
          <h1 className="display text-5xl text-amber-300 mb-4">Game Over</h1>
          {winner && (
            <div className="card mb-6">
              <div className="text-3xl mb-2">
                {isWinner ? "🎉" : "👑"}
              </div>
              <h2 className="heading text-3xl text-white mb-2">{winner.name}</h2>
              <p className="text-amber-300 font-bold text-lg">Wins!</p>
            </div>
          )}

          <div className="card mb-6">
            <div className="text-xs font-extrabold uppercase tracking-widest text-white/40 mb-3">
              Final Standings
            </div>
            <div className="space-y-2">
              {room.players
                .slice()
                .sort((a, b) => {
                  if (a.id === room.winnerId) return -1;
                  if (b.id === room.winnerId) return 1;
                  return (b.revealedInfluences.length < a.revealedInfluences.length ? -1 : 1);
                })
                .map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-4 py-2 border-2 ${
                      p.id === room.winnerId
                        ? "border-amber-400 bg-amber-400/10"
                        : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    <span className="font-bold text-white">
                      {p.id === room.winnerId ? "👑 " : ""}
                      {p.name}
                      {p.id === myPlayerId ? " (you)" : ""}
                    </span>
                    <span className={`text-sm font-bold ${p.isAlive ? "text-emerald-400" : "text-rose-400"}`}>
                      {p.isAlive ? "Survived" : "Eliminated"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Game log */}
          <div className="card mb-6 text-left">
            <div className="text-xs font-extrabold uppercase tracking-widest text-white/40 mb-2">
              Game Log
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
              {room.log
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="text-white/60 font-medium">
                    {entry.text}
                  </div>
                ))}
            </div>
          </div>

          {isHost ? (
            <button
              className="btn-primary w-full h-14 text-lg"
              onClick={() => socket.emit("coupPlayAgain" as any)}
            >
              Play Again
            </button>
          ) : (
            <p className="text-white/50 font-bold text-sm">
              Waiting for host to start a new game...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
