import { socket } from "../../socket";
import { useAmoebaStore } from "../amoebaStore";

export default function AmoebaLobby({ onBack }: { onBack: () => void }) {
  const { room, myPlayerId } = useAmoebaStore();
  if (!room) return null;

  const isHost = room.hostId === myPlayerId;
  const canStart = room.players.length >= 3;

  const start = () => socket.emit("amoebaStartGame" as any);

  const updateDisplaySeconds = (v: number) =>
    socket.emit("amoebaUpdateSettings" as any, {
      settings: { answerDisplaySeconds: v },
    });

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 pop">
          <h1 className="display text-5xl text-cyan-400">🦠 Amoeba</h1>
          <p className="mt-2 text-white/60 font-semibold text-sm">
            Room code:{" "}
            <span className="text-amber-300 tracking-widest font-extrabold text-xl">
              {room.code}
            </span>
          </p>
        </div>

        <div className="card mb-4">
          <h2 className="heading text-white text-lg mb-3">
            Players ({room.players.length})
          </h2>
          <ul className="space-y-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    p.connected ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
                <span className="font-bold text-white">{p.name}</span>
                {p.isHost && (
                  <span className="text-xs text-amber-300 font-extrabold uppercase tracking-wide">
                    host
                  </span>
                )}
                {p.id === myPlayerId && (
                  <span className="text-xs text-cyan-400 font-extrabold uppercase tracking-wide">
                    you
                  </span>
                )}
              </li>
            ))}
          </ul>
          {room.players.length < 3 && (
            <p className="mt-3 text-sm text-white/50 font-semibold">
              Need at least 3 players to start.
            </p>
          )}
        </div>

        {isHost && (
          <div className="card mb-4">
            <h2 className="heading text-white text-sm mb-3">Settings</h2>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-2">
              Answer display time: {room.settings.answerDisplaySeconds}s
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={room.settings.answerDisplaySeconds}
              onChange={(e) => updateDisplaySeconds(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-xs text-white/40 font-semibold mt-1">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>
        )}

        {isHost ? (
          <button
            className="btn-primary w-full h-16 text-xl"
            onClick={start}
            disabled={!canStart}
          >
            Start Game
          </button>
        ) : (
          <div className="card text-center text-white/60 font-bold">
            Waiting for the host to start…
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onBack}
            className="text-amber-300 hover:text-amber-200 font-bold text-sm uppercase tracking-wide"
          >
            &larr; Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
