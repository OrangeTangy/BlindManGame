import { socket } from "../../socket";
import { useAmoebaStore } from "../amoebaStore";

export default function AmoebaGameOver() {
  const { room, myPlayerId } = useAmoebaStore();
  if (!room) return null;

  const isHost = room.hostId === myPlayerId;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const didIWin = room.winnerId === myPlayerId;

  const playAgain = () => socket.emit("amoebaPlayAgain" as any);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 pop">
          <div className="text-7xl mb-4">{didIWin ? "🏆" : "🦠"}</div>
          <h2 className="display text-5xl text-amber-300 mb-2">
            {didIWin ? "You Win!" : `${winner?.name ?? "?"} Wins!`}
          </h2>
          <p className="text-white/60 font-semibold">
            {didIWin
              ? "Your amoeba absorbed everyone!"
              : `${winner?.name}'s amoeba was the last one standing.`}
          </p>
        </div>

        {/* The prompt */}
        <div className="card mb-4">
          <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-2">
            The prompt was
          </p>
          <p className="text-white font-extrabold text-lg">{room.prompt}</p>
          <p className="text-white/50 font-semibold text-sm mt-1">
            Written by{" "}
            <span className="text-amber-300 font-bold">
              {room.players.find((p) => p.id === room.promptWriterId)?.name ?? "?"}
            </span>
          </p>
        </div>

        {/* All revealed answers */}
        {room.revealedAnswers.length > 0 && (
          <div className="card mb-6">
            <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-3">
              All Answers
            </p>
            <div className="space-y-3">
              {room.revealedAnswers.map((r) => (
                <div key={r.playerId} className="flex items-start gap-3">
                  <span className="font-extrabold text-white w-24 shrink-0 truncate">
                    {r.playerName}
                  </span>
                  <span className="text-white/70 font-semibold text-sm">
                    "{r.answer}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isHost ? (
          <button className="btn-primary w-full h-16 text-xl" onClick={playAgain}>
            Play Again
          </button>
        ) : (
          <div className="card text-center text-white/50 font-semibold">
            Waiting for the host to start another round…
          </div>
        )}
      </div>
    </div>
  );
}
