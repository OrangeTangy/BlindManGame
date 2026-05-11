import { useState } from "react";
import { socket } from "../../socket";
import { useAmoebaStore } from "../amoebaStore";

export default function AmoebaSubmittingAnswers() {
  const { room, myPlayerId } = useAmoebaStore();
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!room) return null;

  const isWriter = room.promptWriterId === myPlayerId;
  const hasSubmitted = room.submittedPlayerIds.includes(myPlayerId ?? "");
  const answerers = room.players.filter((p) => p.id !== room.promptWriterId);
  const submitCount = room.submittedPlayerIds.length;

  const submit = () => {
    const text = answer.trim();
    if (!text) return;
    setSubmitted(true);
    socket.emit("amoebaSubmitAnswer" as any, { answer: text });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 pop">
          <h2 className="display text-4xl text-cyan-400 mb-3">Answer the Prompt</h2>
          <div className="card bg-slate-700/60 border-cyan-500/40 border-2">
            <p className="text-white font-extrabold text-xl leading-snug">
              {room.prompt}
            </p>
          </div>
        </div>

        {isWriter ? (
          <div className="card text-center pop">
            <div className="text-5xl mb-3">👀</div>
            <p className="text-white/80 font-bold text-lg">
              You wrote the prompt — no answer needed from you.
            </p>
            <p className="mt-2 text-white/50 font-semibold text-sm">
              Waiting for others… ({submitCount}/{answerers.length} submitted)
            </p>
            <ProgressBar done={submitCount} total={answerers.length} />
          </div>
        ) : hasSubmitted || submitted ? (
          <div className="card text-center pop">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-white font-bold text-lg">Answer submitted!</p>
            <p className="mt-2 text-white/50 font-semibold text-sm">
              Waiting for others… ({submitCount}/{answerers.length} submitted)
            </p>
            <ProgressBar done={submitCount} total={answerers.length} />
          </div>
        ) : (
          <div className="card pop">
            <textarea
              className="input min-h-[80px] resize-none text-lg w-full"
              placeholder="Your answer…"
              maxLength={150}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoFocus
            />
            <div className="flex justify-between items-center mt-1 mb-3">
              <span className="text-xs text-white/30 font-semibold">
                {submitCount}/{answerers.length} submitted
              </span>
              <span className="text-xs text-white/30 font-semibold">
                {answer.length}/150
              </span>
            </div>
            <button
              className="btn-primary w-full h-14 text-xl"
              onClick={submit}
              disabled={!answer.trim()}
            >
              Submit Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-cyan-400 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
