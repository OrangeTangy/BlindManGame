import { useEffect } from "react";
import { socket } from "./socket";
import { useStore } from "./store";
import Landing from "./screens/Landing";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import MatchSummary from "./screens/MatchSummary";
import Connecting from "./screens/Connecting";

export default function App() {
  const {
    screen, connected, connectionError, room,
    setConnected, setConnectionError, setRoom, setYouAre,
    setMinigameState, setStage, setStageFlash, setStageEndToast,
    setToast, setScreen, setClockSkew,
  } = useStore();

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setConnectionError(null);
      const last = localStorage.getItem("blindman:lastRoom");
      const name = localStorage.getItem("blindman:name");
      if (last && name) {
        socket.emit("rejoinRoom", { code: last, name }, (res: any) => {
          if (res?.ok) setScreen("room");
          else localStorage.removeItem("blindman:lastRoom");
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err: Error) =>
      setConnectionError(err.message || "connection error");
    const onRoom = (r: any) => {
      // Estimate clock skew from server timestamp
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
      // auto-clear flash
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

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room", onRoom);
    socket.on("youAre", onYouAre);
    socket.on("minigameState", onMini);
    socket.on("stageStart", onStageStart);
    socket.on("stageEnd", onStageEnd);
    socket.on("errorMessage", onError);

    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room", onRoom);
      socket.off("youAre", onYouAre);
      socket.off("minigameState", onMini);
      socket.off("stageStart", onStageStart);
      socket.off("stageEnd", onStageEnd);
      socket.off("errorMessage", onError);
    };
  }, []);

  if (!connected) return <Connecting error={connectionError} />;

  let body: JSX.Element;
  if (screen === "landing" || !room) body = <Landing />;
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
