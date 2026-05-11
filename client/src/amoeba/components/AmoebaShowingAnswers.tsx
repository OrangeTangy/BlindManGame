import { useEffect, useState } from "react";
import { socket } from "../../socket";
import { useAmoebaStore } from "../amoebaStore";

export default function AmoebaShowingAnswers() {
  const { room, myPlayerId } = useAmoebaStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!room) return null;

  const isHost = room.hostId === myPlayerId;
  const endsAt = room.answerRevealEndsAt ?? 0;
  const secsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));

  const skip = () => socket.emit("amoebaFinishAnswerReveal" as any);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 pop">
          <h2 className="display text-4xl text-cyan-400 mb-2">Memorise the Answers!</h2>
          <p className="text-white/60 font-bold text-sm">
            They'll hide in{" "}
            <span className={`font-extrabold ${secsLeft <= 5 ? "text-rose-400" : "text-amber-300"}`}>
              {secsLeft}s
            </span>
          </p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                secsLeft <= 5 ? "bg-rose-400" : "bg-cyan-400"
              }`}
              style={{
                width: `${(secsLeft / (room.settings.answerDisplaySeconds)) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="card mb-4 pop">
          <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-3">
            The Prompt
          </p>
          <p className="text-white font-extrabold text-lg">{room.prompt}</p>
        </div>

        <div className="space-y-3 pop">
          {(room.anonymousAnswers ?? []).map((answer, i) => (
            <div key={i} className="card border-slate-600">
              <p className="text-white font-bold text-base">{answer}</p>
            </div>
          ))}
        </div>

        {isHost && (
          <button className="btn-ghost w-full h-12 mt-6 text-sm" onClick={skip}>
            Skip reveal →
          </button>
        )}
      </div>
    </div>
  );
}
