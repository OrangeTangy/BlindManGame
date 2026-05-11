import { useEffect, useState } from "react";
import { socket } from "./socket";
import { useStore } from "./store";
import Home from "./screens/Home";
import Landing from "./screens/Landing";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import MatchSummary from "./screens/MatchSummary";
import Connecting from "./screens/Connecting";
import CoupApp from "./coup/CoupApp";
import AmoebaApp from "./amoeba/AmoebaApp";

export type ActiveGame = "none" | "blindman" | "coup" | "amoeba";

export default function App() {
  const [activeGame, setActiveGame] = useState<ActiveGame>(() => {
    const saved = localStorage.getItem("hub:activeGame");
    if (saved === "blindman" || saved === "coup" || saved === "amoeba") return saved;
    return "none";
  });
  const [connected, setConnectedState] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setConnectedState(true);
      setConnectionError(null);
    };
    const onDisconnect = () => setConnectedState(false);
    const onConnectError = (err: Error) =>
      setConnectionError(err.message || "connection error");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  const selectGame = (game: ActiveGame) => {
    localStorage.setItem("hub:activeGame", game);
    setActiveGame(game);
  };

  const goHome = () => {
    localStorage.removeItem("hub:activeGame");
    setActiveGame("none");
  };

  if (!connected) return <Connecting error={connectionError} />;

  if (activeGame === "blindman") {
    return <BlindManApp onBack={goHome} />;
  }
  if (activeGame === "coup") {
    return <CoupApp onBack={goHome} />;
  }
  if (activeGame === "amoeba") {
    return <AmoebaApp onBack={goHome} />;
  }

  return <Home onSelectGame={selectGame} />;
}

function BlindManApp({ onBack }: { onBack: () => void }) {
  const {
    screen, room,
    setConnected, setConnectionError, setRoom, setYouAre,
    setMinigameState, setStage, setStageFlash, setStageEndToast,
    setToast, setScreen, setClockSkew, reset,
  } = useStore();

  useEffect(() => {
    const onRoom = (r: any) => {
      if (r.serverNow) setClockSkew(r.serverNow - Date.now());
      setRoom(r);
      localStorage.setItem("blindman:lastRoom", r.code);
      setScreen("room");
    };
    const onYouAre = (p: any) => setYouAre(p);
    const onMini = (p: any) => setMinigameState(p.state);
    const onStageStart = (p: any) => {
      setStage(p.stage, p.startedAt);
      setStageFlash({
        duoId: p.duoId, stage: p.stage, startedAt: p.startedAt, shownAt: Date.now(),
      });
      setMinigameState(null);
      setTimeout(() => {
        const cur = useStore.getState().stageFlash;
        if (cur && cur.stage.index === p.stage.index) setStageFlash(null);
      }, 1000);
    };
    const onStageEnd = (p: any) => {
      const me = useStore.getState();
      if (p.duoId === me.myDuoId) {
        setStageEndToast({ ...p, createdAt: Date.now() });
        setTimeout(() => {
          const cur = useStore.getState().stageEndToast;
          if (cur && cur.stageIndex === p.stageIndex) setStageEndToast(null);
        }, 1800);
      }
    };
    const onError = (p: any) => {
      setToast(p.message);
      setTimeout(() => setToast(null), 3000);
    };

    socket.on("room", onRoom);
    socket.on("youAre", onYouAre);
    socket.on("minigameState", onMini);
    socket.on("stageStart", onStageStart);
    socket.on("stageEnd", onStageEnd);
    socket.on("errorMessage", onError);

    // Try rejoin
    const last = localStorage.getItem("blindman:lastRoom");
    const name = localStorage.getItem("blindman:name");
    if (last && name) {
      socket.emit("rejoinRoom", { code: last, name }, (res: any) => {
        if (res?.ok) setScreen("room");
        else localStorage.removeItem("blindman:lastRoom");
      });
    }

    return () => {
      socket.off("room", onRoom);
      socket.off("youAre", onYouAre);
      socket.off("minigameState", onMini);
      socket.off("stageStart", onStageStart);
      socket.off("stageEnd", onStageEnd);
      socket.off("errorMessage", onError);
    };
  }, []);

  const handleBack = () => {
    socket.emit("leaveRoom");
    reset();
    onBack();
  };

  let body: JSX.Element;
  if (screen === "landing" || !room) body = <Landing onBack={handleBack} />;
  else {
    switch (room.phase) {
      case "lobby":
        body = <Lobby />;
        break;
      case "gauntlet":
        body = <Game />;
        break;
      case "match_summary":
        body = <MatchSummary />;
        break;
      default:
        body = <Lobby />;
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      {body}
      <Toast />
    </div>
  );
}

function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg z-50">
      {toast}
    </div>
  );
}
