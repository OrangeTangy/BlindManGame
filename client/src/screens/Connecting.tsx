export default function Connecting({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Connecting…</h1>
        <p className="text-slate-400">
          {error
            ? `Could not reach the server: ${error}. Retrying automatically…`
            : "Talking to the game server."}
        </p>
      </div>
    </div>
  );
}
