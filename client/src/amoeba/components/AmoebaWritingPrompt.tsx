import { useState } from "react";
import { socket } from "../../socket";
import { useAmoebaStore } from "../amoebaStore";

export default function AmoebaWritingPrompt() {
  const { room, myPlayerId } = useAmoebaStore();
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!room) return null;

  const isWriter = room.promptWriterId === myPlayerId;
  const writer = room.players.find((p) => p.id === room.promptWriterId);

  const submit = () => {
    const text = prompt.trim();
    if (!text) return;
    setSubmitted(true);
    socket.emit("amoebaSubmitPrompt" as any, { prompt: text });
  };

  if (!isWriter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center pop max-w-md">
          <div className="text-6xl mb-4">✍️</div>
          <h2 className="display text-4xl text-cyan-400 mb-4">Hold tight!</h2>
          <p className="text-white/80 font-bold text-lg">
            <span className="text-amber-300">{writer?.name ?? "Someone"}</span> is writing
            the prompt.
          </p>
          <p className="mt-3 text-white/50 font-semibold text-sm">
            You'll answer it in a moment. Get ready!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg pop">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="display text-4xl text-cyan-400 mb-2">Write the Prompt</h2>
          <p className="text-white/70 font-semibold">
            Everyone else will answer this. Make it interesting!
          </p>
          <p className="mt-1 text-white/40 text-sm font-semibold">
            You won't submit an answer yourself.
          </p>
        </div>

        <div className="card">
          <textarea
            className="input min-h-[100px] resize-none text-lg w-full"
            placeholder="e.g. What would you do with a million dollars?"
            maxLength={200}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={submitted}
            autoFocus
          />
          <div className="flex justify-end mt-1 mb-4">
            <span className="text-xs text-white/30 font-semibold">
              {prompt.length}/200
            </span>
          </div>
          <button
            className="btn-primary w-full h-14 text-xl"
            onClick={submit}
            disabled={!prompt.trim() || submitted}
          >
            {submitted ? "Waiting…" : "Submit Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
