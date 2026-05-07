import { useEffect, useState } from "react";

export default function Timer({ endsAt }: { endsAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const remainingMs = Math.max(0, endsAt - now);
  const seconds = Math.ceil(remainingMs / 1000);
  const critical = remainingMs < 10_000;
  return (
    <div
      className={
        "font-mono text-3xl font-bold " +
        (critical ? "text-rose-400 animate-pulse" : "text-amber-400")
      }
    >
      {seconds}s
    </div>
  );
}
