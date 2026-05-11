import { useEffect } from "react";
import { socket } from "../socket";
import { useCoupStore } from "./coupStore";
import CoupLanding from "./components/CoupLanding";
import CoupLobby from "./components/CoupLobby";
import CoupGame from "./components/CoupGame";
import CoupGameOver from "./components/CoupGameOver";

export default function CoupApp({ onBack }: { onBack: () => void }) {
  const {
    screen, room, setRoom, setPrivate, setMyPlayerId,
    setScreen, setToast, reset,
  } = useCoupStore();

  useEffect(() => {
    const onRoom = (r: any) => {
      setRoom(r);
      localStorage.setItem("coup:lastRoom", r.code);
      setScreen("room");
    };
    const onPrivate = (d: any) => setPrivate(d);
    const onYouAre = (p: any) => setMyPlayerId(p.playerId);
    const onError = (p: any) => {
      setToast(p.message);
      setTimeout(() => setToast(null), 3000);
    };

    socket.on("coupRoom" as any, onRoom);
    socket.on("coupPrivate" as any, onPrivate);
    socket.on("coupYouAre" as any, onYouAre);
    socket.on("coupError" as any, onError);

    // Try rejoin
    const last = localStorage.getItem("coup:lastRoom");
    const name = localStorage.getItem("coup:name");
    if (last && name) {
      socket.emit("coupRejoinRoom" as any, { code: last, name }, (res: any) => {
        if (res?.ok) setScreen("room");
        else localStorage.removeItem("coup:lastRoom");
      });
    }

    return () => {
      socket.off("coupRoom" as any, onRoom);
      socket.off("coupPrivate" as any, onPrivate);
      socket.off("coupYouAre" as any, onYouAre);
      socket.off("coupError" as any, onError);
    };
  }, []);

  const handleBack = () => {
    socket.emit("coupLeaveRoom" as any);
    reset();
    onBack();
  };

  let body: JSX.Element;
  if (screen === "landing" || !room) {
    body = <CoupLanding onBack={handleBack} />;
  } else {
    switch (room.phase) {
      case "lobby":
        body = <CoupLobby onBack={handleBack} />;
        break;
      case "playing":
        body = <CoupGame />;
        break;
      case "game_over":
        body = <CoupGameOver />;
        break;
      default:
        body = <CoupLobby onBack={handleBack} />;
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      {body}
      <CoupToast />
    </div>
  );
}

function CoupToast() {
  const { toast } = useCoupStore();
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 font-bold">
      {toast}
    </div>
  );
}
