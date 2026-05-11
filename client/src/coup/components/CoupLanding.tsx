import { useState } from "react";
import { socket } from "../../socket";
import { useCoupStore } from "../coupStore";

export default function CoupLanding({ onBack }: { onBack: () => void }) {
  const { myName, setName, setToast } = useCoupStore();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const create = () => {
    if (!myName.trim()) return setToast("Enter a name first.");
    setBusy(true);
    socket.emit("coupCreateRoom" as any, { name: myName.trim() }, (res: any) => {
      setBusy(false);
      if (!res.ok) setToast(res.error);
    });
  };
  const join = () => {
    if (!myName.trim()) return setToast("Enter a name first.");
    if (!code.trim()) return setToast("Enter a room code.");
    setBusy(true);
    socket.emit(
      "coupJoinRoom" as any,
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
            <span className="text-rose-400">Coup</span>
          </h1>
          <p className="mt-4 text-lg font-bold text-white/80">
            Bluff. Steal. Survive. Last player standing wins.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Duke", "Assassin", "Captain", "Ambassador", "Contessa"].map((c) => (
              <span
                key={c}
                className={`tile text-slate-900 font-extrabold text-sm ${cardColor(c)}`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="card pop">
          <label className="block text-xs font-extrabold uppercase tracking-widest text-rose-400 mb-2">
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
          <p>2-6 players · bluff with hidden influence cards · last player alive wins.</p>
          <button
            onClick={onBack}
            className="mt-4 text-amber-300 hover:text-amber-200 font-bold text-sm uppercase tracking-wide"
          >
            &larr; Back to Game Hub
          </button>
        </div>
      </div>
    </div>
  );
}

function cardColor(name: string): string {
  switch (name.toLowerCase()) {
    case "duke": return "bg-violet-400";
    case "assassin": return "bg-slate-400";
    case "captain": return "bg-sky-400";
    case "ambassador": return "bg-emerald-400";
    case "contessa": return "bg-rose-400";
    default: return "bg-gray-400";
  }
}
