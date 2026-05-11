import { useEffect } from "react";
import { socket } from "../socket";
import { useAmoebaStore } from "./amoebaStore";
import AmoebaLanding from "./components/AmoebaLanding";
import AmoebaLobby from "./components/AmoebaLobby";
import AmoebaWritingPrompt from "./components/AmoebaWritingPrompt";
import AmoebaSubmittingAnswers from "./components/AmoebaSubmittingAnswers";
import AmoebaShowingAnswers from "./components/AmoebaShowingAnswers";
import AmoebaGuessing from "./components/AmoebaGuessing";
import AmoebaGameOver from "./components/AmoebaGameOver";

export default function AmoebaApp({ onBack }: { onBack: () => void }) {
  const { screen, room, setRoom, setMyPlayerId, setScreen, setToast, reset } =
    useAmoebaStore();

  useEffect(() => {
    const onRoom = (r: any) => {
      setRoom(r);
      localStorage.setItem("amoeba:lastRoom", r.code);
      setScreen("room");
    };
    const onYouAre = (p: any) => setMyPlayerId(p.playerId);
    const onError = (p: any) => {
      setToast(p.message);
      setTimeout(() => setToast(null), 3000);
    };

    socket.on("amoebaRoom" as any, onRoom);
    socket.on("amoebaYouAre" as any, onYouAre);
    socket.on("amoebaError" as any, onError);

    const last = localStorage.getItem("amoeba:lastRoom");
    const name = localStorage.getItem("amoeba:name");
    if (last && name) {
      socket.emit("amoebaRejoinRoom" as any, { code: last, name }, (res: any) => {
        if (res?.ok) setScreen("room");
        else localStorage.removeItem("amoeba:lastRoom");
      });
    }

    return () => {
      socket.off("amoebaRoom" as any, onRoom);
      socket.off("amoebaYouAre" as any, onYouAre);
      socket.off("amoebaError" as any, onError);
    };
  }, []);

  const handleBack = () => {
    socket.emit("amoebaLeaveRoom" as any);
    reset();
    onBack();
  };

  let body: JSX.Element;
  if (screen === "landing" || !room) {
    body = <AmoebaLanding onBack={handleBack} />;
  } else {
    switch (room.phase) {
      case "lobby":
        body = <AmoebaLobby onBack={handleBack} />;
        break;
      case "writing_prompt":
        body = <AmoebaWritingPrompt />;
        break;
      case "submitting_answers":
        body = <AmoebaSubmittingAnswers />;
        break;
      case "showing_answers":
        body = <AmoebaShowingAnswers />;
        break;
      case "guessing":
        body = <AmoebaGuessing />;
        break;
      case "game_over":
        body = <AmoebaGameOver />;
        break;
      default:
        body = <AmoebaLobby onBack={handleBack} />;
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      {body}
      <AmoebaToast />
    </div>
  );
}

function AmoebaToast() {
  const { toast } = useAmoebaStore();
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-bold">
      {toast}
    </div>
  );
}
