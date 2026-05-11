import { socket } from "../../socket";
import { useCoupStore } from "../coupStore";

export default function CoupLobby({ onBack }: { onBack: () => void }) {
  const { room, myPlayerId } = useCoupStore();
  if (!room) return null;

  const isHost = room.hostId === myPlayerId;
  const playerCount = room.players.length;

  const startGame = () => socket.emit("coupStartGame" as any);
  const leave = () => {
    socket.emit("coupLeaveRoom" as any);
    useCoupStore.getState().reset();
    onBack();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 pop">
          <h1 className="display text-4xl text-rose-400">Coup Lobby</h1>
          <div className="mt-3 flex justify-center">
            <span className="tile bg-amber-400 text-slate-900 font-extrabold text-xl tracking-[0.3em]">
              {room.code}
            </span>
          </div>
          <p className="mt-2 text-white/60 text-sm font-bold">
            Share this code with friends to join
          </p>
        </div>

        <div className="card mb-6">
          <h2 className="heading text-lg text-white mb-3">
            Players ({playerCount}/6)
          </h2>
          <div className="space-y-2">
            {room.players.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-lg px-4 py-3 border-2 border-slate-700 ${
                  p.id === myPlayerId ? "bg-slate-800" : "bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-white">{p.name}</span>
                  {p.isHost && (
                    <span className="badge bg-amber-400 text-slate-900">Host</span>
                  )}
                  {p.id === myPlayerId && (
                    <span className="badge bg-cyan-400 text-slate-900">You</span>
                  )}
                </div>
                {!p.connected && (
                  <span className="text-xs text-rose-400 font-bold">Disconnected</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isHost && (
            <button
              className="btn-primary w-full h-14 text-lg"
              onClick={startGame}
              disabled={playerCount < 2}
            >
              {playerCount < 2 ? "Need 2+ Players" : "Start Game"}
            </button>
          )}
          {!isHost && (
            <p className="text-center text-white/60 font-bold text-sm">
              Waiting for host to start...
            </p>
          )}
          <button className="btn-ghost w-full h-12" onClick={leave}>
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
