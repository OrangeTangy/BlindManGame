import { useState } from "react";
import { socket } from "../../socket";
import { useCoupStore } from "../coupStore";
import type { CoupCard, CoupPlayerPublic, CoupActionType } from "@blindman/shared";

const ACTION_BLOCKERS: Partial<Record<CoupActionType, CoupCard[]>> = {
  foreign_aid: ["duke"],
  assassinate: ["contessa"],
  steal: ["captain", "ambassador"],
};

const CARD_COLORS: Record<CoupCard, string> = {
  duke: "bg-violet-500",
  assassin: "bg-slate-600",
  captain: "bg-sky-500",
  ambassador: "bg-emerald-500",
  contessa: "bg-rose-500",
};

const CARD_BG_LIGHT: Record<CoupCard, string> = {
  duke: "bg-violet-400",
  assassin: "bg-slate-400",
  captain: "bg-sky-400",
  ambassador: "bg-emerald-400",
  contessa: "bg-rose-400",
};

function CardBadge({ card, size = "sm" }: { card: CoupCard; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "px-4 py-2 text-base" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-block rounded-md ${cls} font-extrabold uppercase tracking-wider border-2 border-slate-900 text-white ${CARD_COLORS[card]}`}
    >
      {card}
    </span>
  );
}

export default function CoupGame() {
  const { room, myPlayerId, myInfluences, exchangeCards } = useCoupStore();
  if (!room) return null;

  const me = room.players.find((p) => p.id === myPlayerId);
  const isMyTurn = room.currentPlayerId === myPlayerId;
  const pa = room.pendingAction;

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="heading text-2xl text-rose-400">Coup</h1>
          <span className="tile bg-slate-800 text-white/60 font-extrabold text-xs">
            {room.code}
          </span>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {room.players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isMe={p.id === myPlayerId}
            isCurrent={p.id === room.currentPlayerId}
            myInfluences={p.id === myPlayerId ? myInfluences : undefined}
          />
        ))}
      </div>

      {/* My influences (big) */}
      {me?.isAlive && myInfluences.length > 0 && (
        <div className="card mb-4">
          <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300 mb-2">
            Your Influences
          </div>
          <div className="flex gap-3">
            {myInfluences.map((card, i) => (
              <div
                key={i}
                className={`${CARD_COLORS[card]} rounded-lg border-[3px] border-slate-900 px-6 py-4 text-white font-extrabold text-lg uppercase tracking-wide`}
                style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
              >
                {card}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action area */}
      <div className="card mb-4">
        <ActionArea
          room={room}
          myPlayerId={myPlayerId}
          isMyTurn={isMyTurn}
          myInfluences={myInfluences}
          exchangeCards={exchangeCards}
        />
      </div>

      {/* Game log */}
      <div className="card">
        <div className="text-xs font-extrabold uppercase tracking-widest text-white/40 mb-2">
          Game Log
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
          {room.log
            .slice()
            .reverse()
            .map((entry) => (
              <div key={entry.id} className="text-white/70 font-medium">
                {entry.text}
              </div>
            ))}
          {room.log.length === 0 && (
            <div className="text-white/30 font-medium">No actions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  isMe,
  isCurrent,
  myInfluences,
}: {
  player: CoupPlayerPublic;
  isMe: boolean;
  isCurrent: boolean;
  myInfluences?: CoupCard[];
}) {
  return (
    <div
      className={`rounded-lg border-[3px] p-3 ${
        isCurrent
          ? "border-amber-400 bg-slate-800"
          : player.isAlive
          ? "border-slate-700 bg-slate-900"
          : "border-slate-800 bg-slate-900/50 opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-extrabold text-sm ${isMe ? "text-cyan-300" : "text-white"}`}>
          {player.name}
          {isMe && " (you)"}
        </span>
        {isCurrent && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <div className="text-amber-300 font-bold text-xs mb-1">
        {player.coins} coin{player.coins !== 1 ? "s" : ""}
      </div>
      <div className="flex gap-1 flex-wrap">
        {/* Hidden cards */}
        {Array.from({ length: player.influenceCount }).map((_, i) =>
          isMe && myInfluences ? (
            <CardBadge key={`h${i}`} card={myInfluences[i]} />
          ) : (
            <span
              key={`h${i}`}
              className="inline-block rounded-md px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider border-2 border-slate-600 text-slate-400 bg-slate-700"
            >
              Hidden
            </span>
          )
        )}
        {/* Revealed cards */}
        {player.revealedInfluences.map((card, i) => (
          <span
            key={`r${i}`}
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider border-2 border-slate-900 text-white/50 ${CARD_COLORS[card]} opacity-40 line-through`}
          >
            {card}
          </span>
        ))}
      </div>
      {!player.isAlive && (
        <div className="text-rose-400 text-xs font-bold mt-1">Eliminated</div>
      )}
    </div>
  );
}

function ActionArea({
  room,
  myPlayerId,
  isMyTurn,
  myInfluences,
  exchangeCards,
}: {
  room: NonNullable<ReturnType<typeof useCoupStore.getState>["room"]>;
  myPlayerId: string | null;
  isMyTurn: boolean;
  myInfluences: CoupCard[];
  exchangeCards: CoupCard[] | undefined;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const pa = room.pendingAction;
  const me = room.players.find((p) => p.id === myPlayerId);
  const currentPlayerName =
    room.players.find((p) => p.id === room.currentPlayerId)?.name ?? "?";

  // Awaiting action — show action buttons for current player
  if (room.turnPhase === "awaiting_action") {
    if (!isMyTurn) {
      return (
        <div className="text-center text-white/60 font-bold py-4">
          Waiting for <span className="text-amber-300">{currentPlayerName}</span> to
          act...
        </div>
      );
    }

    const mustCoup = (me?.coins ?? 0) >= 10;
    const targets = room.players.filter(
      (p) => p.isAlive && p.id !== myPlayerId
    );

    return (
      <div>
        <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300 mb-3">
          Your Turn — Choose an Action
        </div>
        {mustCoup && (
          <div className="text-rose-400 font-bold text-sm mb-3">
            You have 10+ coins — you must coup!
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {!mustCoup && (
            <>
              <ActionButton
                label="Income (+1)"
                sub="No one can block"
                onClick={() => emit("income")}
              />
              <ActionButton
                label="Foreign Aid (+2)"
                sub="Blockable by Duke"
                onClick={() => emit("foreign_aid")}
              />
              <ActionButton
                label="Tax (+3)"
                sub="Claim Duke"
                color="bg-violet-500 hover:bg-violet-400"
                onClick={() => emit("tax")}
              />
              <ActionButton
                label="Exchange"
                sub="Claim Ambassador"
                color="bg-emerald-500 hover:bg-emerald-400"
                onClick={() => emit("exchange")}
              />
            </>
          )}
        </div>

        {/* Targeted actions */}
        {targets.length > 0 && (
          <div>
            {!mustCoup && (
              <div className="text-xs text-white/40 font-bold uppercase mb-2 mt-4">
                Targeted Actions
              </div>
            )}
            <div className="flex gap-2 mb-2 flex-wrap">
              {targets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTarget(t.id === selectedTarget ? null : t.id)}
                  className={`px-3 py-1.5 rounded-lg border-2 font-bold text-sm transition-colors ${
                    t.id === selectedTarget
                      ? "border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border-slate-600 text-white/60 hover:border-slate-400"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            {selectedTarget && (
              <div className="grid grid-cols-3 gap-2">
                <ActionButton
                  label="Coup (-7)"
                  sub="Unblockable"
                  color="bg-rose-600 hover:bg-rose-500"
                  disabled={(me?.coins ?? 0) < 7}
                  onClick={() => emit("coup", selectedTarget)}
                />
                {!mustCoup && (
                  <>
                    <ActionButton
                      label="Assassinate (-3)"
                      sub="Claim Assassin"
                      color="bg-slate-600 hover:bg-slate-500"
                      disabled={(me?.coins ?? 0) < 3}
                      onClick={() => emit("assassinate", selectedTarget)}
                    />
                    <ActionButton
                      label="Steal"
                      sub="Claim Captain"
                      color="bg-sky-500 hover:bg-sky-400"
                      disabled={
                        (room.players.find((p) => p.id === selectedTarget)?.coins ?? 0) === 0
                      }
                      onClick={() => emit("steal", selectedTarget)}
                    />
                  </>
                )}
              </div>
            )}
            {!selectedTarget && (
              <div className="text-white/40 text-sm font-medium">
                Select a target above for Coup, Assassinate, or Steal.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Awaiting challenge
  if (room.turnPhase === "awaiting_challenge" && pa) {
    const actorName = room.players.find((p) => p.id === pa.playerId)?.name ?? "?";
    const amActor = pa.playerId === myPlayerId;
    const alreadyPassed = pa.passedPlayers.includes(myPlayerId!);

    return (
      <div>
        <div className="text-white font-bold mb-3">
          <span className="text-amber-300">{actorName}</span> claims{" "}
          <span className="text-violet-300">{pa.claimedRole}</span> to {pa.type}.
        </div>
        {!amActor && me?.isAlive && !alreadyPassed ? (
          <div className="flex gap-3">
            <button
              className="btn-danger flex-1 h-12"
              onClick={() => socket.emit("coupChallenge" as any)}
            >
              Challenge!
            </button>
            <button
              className="btn-ghost flex-1 h-12"
              onClick={() => socket.emit("coupPassChallenge" as any)}
            >
              Pass
            </button>
          </div>
        ) : (
          <div className="text-white/40 font-bold text-sm">
            {amActor ? "Waiting for others to decide..." : "Waiting for other players..."}
          </div>
        )}
        <PassTracker players={room.players} passedIds={pa.passedPlayers} excludeId={pa.playerId} />
      </div>
    );
  }

  // Awaiting block
  if (room.turnPhase === "awaiting_block" && pa) {
    const actorName = room.players.find((p) => p.id === pa.playerId)?.name ?? "?";
    const blockerCards = ACTION_BLOCKERS[pa.type] ?? [];
    const amActor = pa.playerId === myPlayerId;
    const alreadyPassed = pa.passedPlayers.includes(myPlayerId!);

    // For targeted actions, only target can block
    const canBlock =
      me?.isAlive &&
      !amActor &&
      !alreadyPassed &&
      (pa.type === "foreign_aid" || pa.targetId === myPlayerId);

    return (
      <div>
        <div className="text-white font-bold mb-3">
          <span className="text-amber-300">{actorName}</span> is performing{" "}
          <span className="text-cyan-300">{pa.type.replace("_", " ")}</span>.
          {blockerCards.length > 0 && (
            <span className="text-white/60">
              {" "}
              Can be blocked by {blockerCards.join(" or ")}.
            </span>
          )}
        </div>
        {canBlock ? (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {blockerCards.map((card) => (
                <button
                  key={card}
                  className={`btn text-white h-12 ${CARD_COLORS[card]} hover:opacity-90`}
                  onClick={() =>
                    socket.emit("coupBlock" as any, { claimedRole: card })
                  }
                >
                  Block as {card}
                </button>
              ))}
            </div>
            <button
              className="btn-ghost w-full h-10"
              onClick={() => socket.emit("coupPassBlock" as any)}
            >
              Pass (don't block)
            </button>
          </div>
        ) : (
          <div className="text-white/40 font-bold text-sm">
            {amActor ? "Waiting for block window..." : "Waiting..."}
          </div>
        )}
        <PassTracker
          players={room.players}
          passedIds={pa.passedPlayers}
          excludeId={pa.playerId}
          onlyIds={pa.type !== "foreign_aid" && pa.targetId ? [pa.targetId] : undefined}
        />
      </div>
    );
  }

  // Awaiting block challenge
  if (room.turnPhase === "awaiting_block_challenge" && pa) {
    const blockerName = room.players.find((p) => p.id === pa.blockerId)?.name ?? "?";
    const amBlocker = pa.blockerId === myPlayerId;
    const alreadyPassed = pa.passedPlayers.includes(myPlayerId!);

    return (
      <div>
        <div className="text-white font-bold mb-3">
          <span className="text-amber-300">{blockerName}</span> claims{" "}
          <span className="text-violet-300">{pa.blockerClaimedRole}</span> to block.
        </div>
        {!amBlocker && me?.isAlive && !alreadyPassed ? (
          <div className="flex gap-3">
            <button
              className="btn-danger flex-1 h-12"
              onClick={() => socket.emit("coupChallengeBlock" as any)}
            >
              Challenge Block!
            </button>
            <button
              className="btn-ghost flex-1 h-12"
              onClick={() => socket.emit("coupPassBlockChallenge" as any)}
            >
              Pass
            </button>
          </div>
        ) : (
          <div className="text-white/40 font-bold text-sm">
            {amBlocker ? "Waiting for others to decide..." : "Waiting..."}
          </div>
        )}
        <PassTracker
          players={room.players}
          passedIds={pa.passedPlayers}
          excludeId={pa.blockerId!}
        />
      </div>
    );
  }

  // Awaiting lose influence
  if (room.turnPhase === "awaiting_lose_influence" && pa) {
    const loserId = pa.loseInfluencePlayerId;
    const loserName = room.players.find((p) => p.id === loserId)?.name ?? "?";
    const amLoser = loserId === myPlayerId;

    if (amLoser) {
      return (
        <div>
          <div className="text-rose-400 font-bold mb-3">
            You must lose an influence. Choose which card to reveal:
          </div>
          <div className="flex gap-3">
            {myInfluences.map((card, i) => (
              <button
                key={i}
                className={`${CARD_COLORS[card]} rounded-lg border-[3px] border-slate-900 px-6 py-4 text-white font-extrabold text-lg uppercase tracking-wide hover:opacity-90 transition-opacity cursor-pointer`}
                style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
                onClick={() =>
                  socket.emit("coupLoseInfluence" as any, { card })
                }
              >
                {card}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="text-white/60 font-bold py-4 text-center">
        Waiting for <span className="text-amber-300">{loserName}</span> to choose
        which influence to lose...
      </div>
    );
  }

  // Awaiting exchange
  if (room.turnPhase === "awaiting_exchange" && pa) {
    const amExchanger = pa.playerId === myPlayerId;
    if (amExchanger && exchangeCards) {
      return <ExchangePicker cards={exchangeCards} keepCount={myInfluences.length} />;
    }
    const exchangerName = room.players.find((p) => p.id === pa.playerId)?.name ?? "?";
    return (
      <div className="text-white/60 font-bold py-4 text-center">
        Waiting for <span className="text-amber-300">{exchangerName}</span> to
        complete exchange...
      </div>
    );
  }

  return (
    <div className="text-white/40 font-bold py-4 text-center">Waiting...</div>
  );
}

function emit(action: CoupActionType, targetId?: string) {
  socket.emit("coupAction" as any, { action, targetId });
}

function ActionButton({
  label,
  sub,
  color = "bg-slate-700 hover:bg-slate-600",
  disabled = false,
  onClick,
}: {
  label: string;
  sub: string;
  color?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${color} text-white rounded-lg border-2 border-slate-900 px-3 py-3 text-left transition-opacity ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{ boxShadow: "0 3px 0 0 rgb(15 23 42)" }}
    >
      <div className="font-extrabold text-sm">{label}</div>
      <div className="text-xs text-white/60 font-medium">{sub}</div>
    </button>
  );
}

function PassTracker({
  players,
  passedIds,
  excludeId,
  onlyIds,
}: {
  players: CoupPlayerPublic[];
  passedIds: string[];
  excludeId: string;
  onlyIds?: string[];
}) {
  const relevant = players.filter(
    (p) =>
      p.isAlive &&
      p.id !== excludeId &&
      (!onlyIds || onlyIds.includes(p.id))
  );
  if (relevant.length === 0) return null;

  return (
    <div className="mt-3 flex gap-2 flex-wrap">
      {relevant.map((p) => (
        <span
          key={p.id}
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            passedIds.includes(p.id)
              ? "bg-slate-700 text-slate-400 line-through"
              : "bg-slate-800 text-white/60"
          }`}
        >
          {p.name} {passedIds.includes(p.id) ? "passed" : "..."}
        </span>
      ))}
    </div>
  );
}

function ExchangePicker({
  cards,
  keepCount,
}: {
  cards: CoupCard[];
  keepCount: number;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const returnCount = cards.length - keepCount;

  const toggle = (idx: number) => {
    setSelected((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : prev.length < returnCount
        ? [...prev, idx]
        : prev
    );
  };

  const confirm = () => {
    const returnCards = selected.map((i) => cards[i]);
    socket.emit("coupExchangeReturn" as any, { returnCards });
  };

  return (
    <div>
      <div className="text-amber-300 font-bold mb-2">
        Exchange: select {returnCount} card{returnCount > 1 ? "s" : ""} to return
        to the deck.
      </div>
      <div className="flex gap-2 flex-wrap mb-3">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`${CARD_COLORS[card]} rounded-lg border-[3px] px-5 py-3 text-white font-extrabold text-base uppercase tracking-wide transition-all ${
              selected.includes(i)
                ? "border-rose-400 opacity-50 scale-95"
                : "border-slate-900"
            }`}
            style={{ boxShadow: "0 4px 0 0 rgb(15 23 42)" }}
          >
            {card}
            {selected.includes(i) && (
              <span className="block text-xs text-rose-200 mt-0.5">Return</span>
            )}
          </button>
        ))}
      </div>
      <button
        className="btn-primary h-12 w-full"
        disabled={selected.length !== returnCount}
        onClick={confirm}
      >
        Confirm Exchange
      </button>
    </div>
  );
}
