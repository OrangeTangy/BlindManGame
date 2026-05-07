import { socket } from "../socket";
import { useStore } from "../store";
import { teamPalette } from "../components/teamColors";
import clsx from "clsx";

export default function Lobby() {
  const { room, myPlayerId, myDuoId } = useStore();
  if (!room) return null;
  const me = room.players.find((p) => p.id === myPlayerId);
  const amHost = me?.id === room.hostId;

  const toggleReady = () => socket.emit("setReady", { ready: !me?.ready });
  const leave = () => {
    socket.emit("leaveRoom");
    localStorage.removeItem("blindman:lastRoom");
    useStore.getState().reset();
  };
  const start = () => socket.emit("startGame");
  const switchDuo = (duoId: string) => socket.emit("switchDuo", { duoId });

  const allReady = room.players.every((p) => p.ready || !p.connected);
  const completeDuos = room.duos.filter((d) => d.playerIds.length === 2).length;
  const canStart = amHost && allReady && completeDuos >= 1;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="display text-4xl text-white">Lobby</h2>
            <p className="text-white/80 text-sm mt-2 font-semibold flex items-center gap-3 flex-wrap">
              <span>Room code</span>
              <span className="tile bg-amber-300 text-slate-900 font-mono text-2xl tracking-[0.35em]">
                {room.code}
              </span>
              <button
                className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4"
                onClick={() => navigator.clipboard?.writeText(room.code)}
              >
                copy
              </button>
            </p>
            <p className="text-white/60 text-xs mt-2 font-semibold">
              Gauntlet mode · {room.totalStages} minigames · fastest duo wins.
            </p>
            <p className="text-amber-300/80 text-xs mt-1 font-semibold">
              Tip: sit next to your partner — voice chat is the whole game.
            </p>
          </div>
          <button className="btn-danger" onClick={leave}>
            Leave
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {room.duos.map((d, idx) => {
            const pal = teamPalette(idx);
            const players = d.playerIds.map((pid) =>
              room.players.find((p) => p.id === pid)
            );
            const isMine = d.id === myDuoId;
            return (
              <div
                key={d.id}
                className={clsx(
                  "card-bright",
                  pal.bg,
                  isMine && "ring-4 ring-white"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-black">{d.label}</h3>
                  {!isMine && d.playerIds.length < 2 && (
                    <button
                      className="btn-ghost text-xs h-10 px-3"
                      onClick={() => switchDuo(d.id)}
                    >
                      Join team
                    </button>
                  )}
                  {isMine && (
                    <span className="badge bg-slate-900 text-white">YOU</span>
                  )}
                </div>
                <div className="space-y-2">
                  {[0, 1].map((i) => {
                    const p = players[i];
                    if (!p)
                      return (
                        <div
                          key={i}
                          className="rounded-2xl border-[3px] border-dashed border-slate-900/60 p-3 text-slate-900/70 text-sm font-bold bg-white/30"
                        >
                          Open slot
                        </div>
                      );
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl bg-slate-900 text-white px-3 py-2 flex items-center justify-between border-[3px] border-slate-900"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold">{p.name}</span>
                          {p.isHost && (
                            <span className="badge bg-amber-300 text-slate-900">HOST</span>
                          )}
                          {p.role && (
                            <span
                              className={clsx(
                                "badge",
                                p.role === "blind"
                                  ? "bg-indigo-400 text-slate-900"
                                  : "bg-emerald-400 text-slate-900"
                              )}
                            >
                              {p.role.toUpperCase()}
                            </span>
                          )}
                          {!p.connected && (
                            <span className="badge bg-slate-600 text-white">offline</span>
                          )}
                        </div>
                        <span
                          className={clsx(
                            "text-xs font-extrabold uppercase tracking-wider",
                            p.ready ? "text-emerald-300" : "text-white/50"
                          )}
                        >
                          {p.ready ? "Ready" : "Not ready"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="text-sm text-white/80 font-semibold">
            <p>
              <span className="text-amber-300 font-extrabold">{completeDuos}</span> complete{" "}
              {completeDuos === 1 ? "duo" : "duos"} ·{" "}
              <span className="text-cyan-300 font-extrabold">{room.players.length}</span> players
              · <span className="text-fuchsia-300 font-extrabold">{room.totalStages}</span> minigames
            </p>
            <p className="mt-1 text-white/60">
              Roles assign automatically when a duo is full. Race the same 10 minigames —
              shortest total time wins.
            </p>
            <p className="mt-2 text-white/60">
              Tip: sit next to your partner — voice chat is the whole game.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className={clsx(me?.ready ? "btn-ghost" : "btn-go", "h-14 text-lg")}
              onClick={toggleReady}
            >
              {me?.ready ? "Unready" : "I'm Ready"}
            </button>
            {amHost && (
              <button
                className={clsx("btn-primary h-14 text-lg", canStart && "glow")}
                disabled={!canStart}
                onClick={start}
                title={!canStart ? "Need a complete duo and all players ready" : ""}
              >
                Start Gauntlet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
