import type { ActiveGame } from "../App";

const GAMES = [
  {
    id: "blindman" as ActiveGame,
    title: "Blind & Guide",
    subtitle: "One sees. One acts. Talk fast.",
    description: "Communication-driven party game for duos. Guide your blindfolded partner through 10 minigames.",
    color: "bg-fuchsia-500",
    hoverColor: "hover:bg-fuchsia-400",
    players: "2-12 (duos)",
    icon: "👁️",
  },
  {
    id: "coup" as ActiveGame,
    title: "Coup",
    subtitle: "Bluff. Steal. Survive.",
    description: "Deception and deduction card game. Lie about your influence to eliminate opponents.",
    color: "bg-rose-600",
    hoverColor: "hover:bg-rose-500",
    players: "2-6",
    icon: "🗡️",
  },
  {
    id: "amoeba" as ActiveGame,
    title: "Amoeba",
    subtitle: "Answer. Guess. Absorb.",
    description: "Write anonymous answers to a prompt. Captains guess who wrote what — correct guesses absorb rivals into your amoeba. Last amoeba standing wins.",
    color: "bg-cyan-600",
    hoverColor: "hover:bg-cyan-500",
    players: "3-12",
    icon: "🦠",
  },
];

export default function Home({ onSelectGame }: { onSelectGame: (game: ActiveGame) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10 pop">
          <h1 className="display text-5xl sm:text-6xl tracking-tight leading-none text-amber-300">
            Game Hub
          </h1>
          <p className="mt-4 text-lg font-bold text-white/80">
            Pick a game. Share the room code. Play with friends.
          </p>
        </div>

        <div className="grid gap-6">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`card text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`${game.color} rounded-lg border-[3px] border-slate-900 w-16 h-16 flex items-center justify-center text-3xl shrink-0`}
                  style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
                >
                  {game.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="heading text-2xl text-white">{game.title}</h2>
                  <p className="text-amber-300 font-extrabold text-sm mt-0.5">{game.subtitle}</p>
                  <p className="text-white/70 font-medium text-sm mt-2">{game.description}</p>
                  <span
                    className={`inline-block mt-3 ${game.color} text-white text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-md border-2 border-slate-900`}
                  >
                    {game.players} players
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-white/50 font-semibold">
          <p>More games coming soon.</p>
        </div>
      </div>
    </div>
  );
}
