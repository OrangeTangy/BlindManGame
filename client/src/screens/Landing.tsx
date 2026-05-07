import { useState } from "react";
import { socket } from "../socket";
import { useStore } from "../store";

const GAME_CHIPS: { label: string; bg: string }[] = [
  { label: "Maze", bg: "bg-fuchsia-400" },
  { label: "Sequence", bg: "bg-cyan-400" },
  { label: "Defusal", bg: "bg-rose-400" },
  { label: "Runner", bg: "bg-amber-400" },
  { label: "Parkour", bg: "bg-emerald-400" },
  { label: "Monsters", bg: "bg-violet-400" },
  { label: "Signal", bg: "bg-sky-400" },
  { label: "Flash Grid", bg: "bg-lime-400" },
];

export default function Landing() {
  const { myName, setName, setToast } = useStore();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const create = () => {
    if (!myName.trim()) return setToast("Enter a name first.");
    setBusy(true);
    socket.emit("createRoom", { name: myName.trim() }, (res: any) => {
      setBusy(false);
      if (!res.ok) setToast(res.error);
    });
  };
  const join = () => {
    if (!myName.trim()) return setToast("Enter a name first.");
    if (!code.trim()) return setToast("Enter a room code.");
    setBusy(true);
    socket.emit(
      "joinRoom",
      { code: code.trim().toUpperCase(), name: myName.trim() },
      (res: any) => {
        setBusy(false);
        if (!res.ok) setToast(res.error);
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8 pop">
          <h1 className="display text-6xl sm:text-7xl tracking-tight leading-none">
            <span className="text-amber-300">Blind</span>
            <span className="text-white"> &amp; </span>
            <span className="text-cyan-300">Guide</span>
          </h1>
          <p className="mt-4 text-lg font-bold text-white/80">
            One sees. One acts. Talk fast — the clock is running.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {GAME_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className={`tile text-slate-900 font-extrabold text-sm ${chip.bg}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="card pop">
          <label className="block text-xs font-extrabold uppercase tracking-widest text-amber-300 mb-2">
            Your name
          </label>
          <input
            className="input mb-5 text-center text-lg"
            placeholder="e.g. Alex"
            maxLength={20}
            value={myName}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          {mode === "menu" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                className="btn-primary h-16 text-xl"
                onClick={() => setMode("create")}
                disabled={busy}
              >
                Create Room
              </button>
              <button
                className="btn-cool h-16 text-xl"
                onClick={() => setMode("join")}
                disabled={busy}
              >
                Join Room
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <p className="text-white/80 text-sm font-semibold">
                You'll be the host. Share the room code with your friends.
              </p>
              <div className="flex gap-3">
                <button className="btn-primary flex-1 h-14 text-lg" onClick={create} disabled={busy}>
                  Create
                </button>
                <button className="btn-ghost h-14 px-5" onClick={() => setMode("menu")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <input
                className="input uppercase tracking-[0.4em] text-center text-2xl"
                placeholder="CODE"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <div className="flex gap-3">
                <button className="btn-go flex-1 h-14 text-lg" onClick={join} disabled={busy}>
                  Join
                </button>
                <button className="btn-ghost h-14 px-5" onClick={() => setMode("menu")}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-white/60 font-semibold">
          <p>Two players per duo · roles auto-assigned · 10 minigames, fastest wins.</p>
          <p className="mt-1">Sit next to your partner — talk out loud, no voice chat needed.</p>
        </div>
      </div>
    </div>
  );
}
