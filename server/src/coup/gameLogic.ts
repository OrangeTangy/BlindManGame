import type {
  CoupCard,
  CoupPlayer,
  CoupPlayerPublic,
  CoupRoomPublic,
  CoupRoomPrivate,
  CoupActionType,
  CoupTurnPhase,
  CoupGamePhase,
  CoupPendingAction,
  CoupLogEntry,
} from "@blindman/shared";
import { ALL_COUP_CARDS, ACTION_CHARACTER_CLAIM, ACTION_BLOCKERS } from "@blindman/shared";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export interface CoupGameState {
  code: string;
  hostId: string;
  phase: CoupGamePhase;
  players: CoupPlayer[];
  deck: CoupCard[];
  currentPlayerIndex: number;
  turnPhase: CoupTurnPhase | null;
  pendingAction: CoupPendingAction | null;
  log: CoupLogEntry[];
  winnerId: string | null;
}

function buildDeck(): CoupCard[] {
  const deck: CoupCard[] = [];
  for (const card of ALL_COUP_CARDS) {
    deck.push(card, card, card);
  }
  return deck;
}

function shuffleDeck(deck: CoupCard[]): CoupCard[] {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(code: string, players: CoupPlayer[]): CoupGameState {
  let deck = shuffleDeck(buildDeck());

  for (const p of players) {
    p.influences = [deck.pop()!, deck.pop()!];
    p.revealedInfluences = [];
    p.coins = 2;
    p.isAlive = true;
  }

  return {
    code,
    hostId: players[0].id,
    phase: "playing",
    players,
    deck,
    currentPlayerIndex: 0,
    turnPhase: "awaiting_action",
    pendingAction: null,
    log: [],
    winnerId: null,
  };
}

export function addLog(game: CoupGameState, text: string) {
  game.log.push({ id: genId(), text, at: Date.now() });
  if (game.log.length > 50) game.log.splice(0, game.log.length - 50);
}

function getPlayer(game: CoupGameState, id: string): CoupPlayer | undefined {
  return game.players.find((p) => p.id === id);
}

function alivePlayers(game: CoupGameState): CoupPlayer[] {
  return game.players.filter((p) => p.isAlive);
}

function currentPlayer(game: CoupGameState): CoupPlayer {
  return game.players[game.currentPlayerIndex];
}

function nextTurn(game: CoupGameState) {
  game.pendingAction = null;
  const alive = alivePlayers(game);
  if (alive.length <= 1) {
    game.phase = "game_over";
    game.winnerId = alive[0]?.id ?? null;
    game.turnPhase = null;
    if (alive[0]) addLog(game, `${alive[0].name} wins!`);
    return;
  }
  let idx = game.currentPlayerIndex;
  do {
    idx = (idx + 1) % game.players.length;
  } while (!game.players[idx].isAlive);
  game.currentPlayerIndex = idx;
  game.turnPhase = "awaiting_action";
}

function playerLosesInfluence(game: CoupGameState, playerId: string, card: CoupCard): boolean {
  const player = getPlayer(game, playerId);
  if (!player) return false;
  const idx = player.influences.indexOf(card);
  if (idx === -1) return false;
  player.influences.splice(idx, 1);
  player.revealedInfluences.push(card);
  if (player.influences.length === 0) {
    player.isAlive = false;
    addLog(game, `${player.name} has been eliminated.`);
  }
  return true;
}

function otherAlivePlayers(game: CoupGameState, excludeId: string): CoupPlayer[] {
  return game.players.filter((p) => p.isAlive && p.id !== excludeId);
}

// Who needs to pass for a challenge/block phase to resolve
function allRelevantPassed(game: CoupGameState): boolean {
  if (!game.pendingAction) return false;
  const pa = game.pendingAction;
  const phase = game.turnPhase;

  if (phase === "awaiting_challenge") {
    const others = otherAlivePlayers(game, pa.playerId);
    return others.every((p) => pa.passedPlayers.includes(p.id));
  }
  if (phase === "awaiting_block") {
    // Only the target can block (for targeted actions) or any player (for foreign aid)
    if (pa.type === "foreign_aid") {
      const others = otherAlivePlayers(game, pa.playerId);
      return others.every((p) => pa.passedPlayers.includes(p.id));
    }
    if (pa.targetId) {
      return pa.passedPlayers.includes(pa.targetId);
    }
    return true;
  }
  if (phase === "awaiting_block_challenge") {
    const others = otherAlivePlayers(game, pa.blockerId!);
    return others.every((p) => pa.passedPlayers.includes(p.id));
  }
  return false;
}

export function performAction(
  game: CoupGameState,
  playerId: string,
  actionType: CoupActionType,
  targetId?: string
): string | null {
  if (game.phase !== "playing") return "Game is not in progress.";
  if (game.turnPhase !== "awaiting_action") return "Not awaiting an action.";
  const cp = currentPlayer(game);
  if (cp.id !== playerId) return "Not your turn.";

  // Must coup if >= 10 coins
  if (cp.coins >= 10 && actionType !== "coup") return "You must coup when you have 10+ coins.";

  const target = targetId ? getPlayer(game, targetId) : undefined;

  switch (actionType) {
    case "income":
      cp.coins += 1;
      addLog(game, `${cp.name} takes income (+1 coin).`);
      nextTurn(game);
      return null;

    case "foreign_aid":
      addLog(game, `${cp.name} attempts foreign aid (+2 coins).`);
      game.pendingAction = {
        type: "foreign_aid",
        playerId,
        passedPlayers: [],
      };
      game.turnPhase = "awaiting_block";
      return null;

    case "coup":
      if (cp.coins < 7) return "Need 7 coins to coup.";
      if (!target || !target.isAlive) return "Invalid target.";
      if (target.id === playerId) return "Cannot target yourself.";
      cp.coins -= 7;
      addLog(game, `${cp.name} coups ${target.name}.`);
      game.pendingAction = {
        type: "coup",
        playerId,
        targetId: target.id,
        loseInfluencePlayerId: target.id,
        passedPlayers: [],
      };
      game.turnPhase = "awaiting_lose_influence";
      return null;

    case "tax":
      addLog(game, `${cp.name} claims Duke and taxes (+3 coins).`);
      game.pendingAction = {
        type: "tax",
        playerId,
        claimedRole: "duke",
        passedPlayers: [],
      };
      game.turnPhase = "awaiting_challenge";
      return null;

    case "assassinate":
      if (cp.coins < 3) return "Need 3 coins to assassinate.";
      if (!target || !target.isAlive) return "Invalid target.";
      if (target.id === playerId) return "Cannot target yourself.";
      cp.coins -= 3;
      addLog(game, `${cp.name} claims Assassin to assassinate ${target.name}.`);
      game.pendingAction = {
        type: "assassinate",
        playerId,
        targetId: target.id,
        claimedRole: "assassin",
        passedPlayers: [],
      };
      game.turnPhase = "awaiting_challenge";
      return null;

    case "steal":
      if (!target || !target.isAlive) return "Invalid target.";
      if (target.id === playerId) return "Cannot target yourself.";
      if (target.coins === 0) return "Target has no coins to steal.";
      addLog(game, `${cp.name} claims Captain to steal from ${target.name}.`);
      game.pendingAction = {
        type: "steal",
        playerId,
        targetId: target.id,
        claimedRole: "captain",
        passedPlayers: [],
      };
      game.turnPhase = "awaiting_challenge";
      return null;

    case "exchange":
      addLog(game, `${cp.name} claims Ambassador to exchange cards.`);
      game.pendingAction = {
        type: "exchange",
        playerId,
        claimedRole: "ambassador",
        passedPlayers: [],
      };
      game.turnPhase = "awaiting_challenge";
      return null;

    default:
      return "Unknown action.";
  }
}

export function handleChallenge(game: CoupGameState, challengerId: string): string | null {
  if (game.turnPhase !== "awaiting_challenge") return "No action to challenge.";
  const pa = game.pendingAction;
  if (!pa) return "No pending action.";
  if (challengerId === pa.playerId) return "Cannot challenge your own action.";
  const challenger = getPlayer(game, challengerId);
  const actor = getPlayer(game, pa.playerId);
  if (!challenger?.isAlive || !actor?.isAlive) return "Invalid player.";

  const claimedRole = pa.claimedRole;
  if (!claimedRole) return "This action cannot be challenged.";

  addLog(game, `${challenger.name} challenges ${actor.name}'s ${claimedRole} claim!`);

  if (actor.influences.includes(claimedRole)) {
    // Challenge fails: actor had the card
    addLog(game, `${actor.name} reveals ${claimedRole} — challenge fails!`);

    // Actor shuffles the card back and draws a new one
    const cardIdx = actor.influences.indexOf(claimedRole);
    actor.influences.splice(cardIdx, 1);
    game.deck.push(claimedRole);
    game.deck = shuffleDeck(game.deck);
    actor.influences.push(game.deck.pop()!);

    // Challenger must lose influence
    pa.loseInfluencePlayerId = challengerId;
    pa.passedPlayers = [];
    game.turnPhase = "awaiting_lose_influence";
    return null;
  } else {
    // Challenge succeeds: actor was bluffing
    addLog(game, `${actor.name} does not have ${claimedRole} — challenge succeeds!`);

    // Refund coins for assassinate if it was bluffed
    if (pa.type === "assassinate") actor.coins += 3;

    // Actor loses influence
    pa.loseInfluencePlayerId = pa.playerId;
    pa.passedPlayers = [];
    game.turnPhase = "awaiting_lose_influence";
    return null;
  }
}

export function handlePassChallenge(game: CoupGameState, playerId: string): string | null {
  if (game.turnPhase !== "awaiting_challenge") return "Not in challenge phase.";
  const pa = game.pendingAction;
  if (!pa) return "No pending action.";
  const player = getPlayer(game, playerId);
  if (!player?.isAlive) return "Invalid player.";
  if (playerId === pa.playerId) return "You can't pass on your own action.";
  if (pa.passedPlayers.includes(playerId)) return "Already passed.";

  pa.passedPlayers.push(playerId);

  if (allRelevantPassed(game)) {
    // No one challenged — action proceeds
    resolveUnchallengedAction(game);
  }
  return null;
}

function resolveUnchallengedAction(game: CoupGameState) {
  const pa = game.pendingAction!;
  const actor = getPlayer(game, pa.playerId)!;

  // For actions that can be blocked, move to block phase
  const blockers = ACTION_BLOCKERS[pa.type];
  if (blockers && blockers.length > 0 && game.turnPhase === "awaiting_challenge") {
    pa.passedPlayers = [];
    game.turnPhase = "awaiting_block";
    return;
  }

  // Execute the action
  executeAction(game);
}

function executeAction(game: CoupGameState) {
  const pa = game.pendingAction!;
  const actor = getPlayer(game, pa.playerId)!;

  switch (pa.type) {
    case "foreign_aid":
      actor.coins += 2;
      addLog(game, `${actor.name} takes foreign aid (+2 coins).`);
      nextTurn(game);
      break;

    case "tax":
      actor.coins += 3;
      addLog(game, `${actor.name} collects tax (+3 coins).`);
      nextTurn(game);
      break;

    case "assassinate": {
      const target = getPlayer(game, pa.targetId!);
      if (target?.isAlive) {
        pa.loseInfluencePlayerId = target.id;
        pa.passedPlayers = [];
        game.turnPhase = "awaiting_lose_influence";
      } else {
        nextTurn(game);
      }
      break;
    }

    case "steal": {
      const target = getPlayer(game, pa.targetId!);
      if (target) {
        const stolen = Math.min(2, target.coins);
        target.coins -= stolen;
        actor.coins += stolen;
        addLog(game, `${actor.name} steals ${stolen} coin(s) from ${target.name}.`);
      }
      nextTurn(game);
      break;
    }

    case "exchange": {
      // Draw 2 cards from deck
      const drawn: CoupCard[] = [];
      for (let i = 0; i < 2 && game.deck.length > 0; i++) {
        drawn.push(game.deck.pop()!);
      }
      pa.exchangeCards = [...actor.influences, ...drawn];
      pa.passedPlayers = [];
      game.turnPhase = "awaiting_exchange";
      break;
    }

    default:
      nextTurn(game);
  }
}

export function handleBlock(
  game: CoupGameState,
  blockerId: string,
  claimedRole: CoupCard
): string | null {
  if (game.turnPhase !== "awaiting_block") return "Not in block phase.";
  const pa = game.pendingAction;
  if (!pa) return "No pending action.";
  const blocker = getPlayer(game, blockerId);
  if (!blocker?.isAlive) return "Invalid player.";
  if (blockerId === pa.playerId) return "Cannot block your own action.";

  const validBlockers = ACTION_BLOCKERS[pa.type];
  if (!validBlockers || !validBlockers.includes(claimedRole)) {
    return `${claimedRole} cannot block ${pa.type}.`;
  }

  // For targeted actions, only the target can block
  if (pa.type !== "foreign_aid" && pa.targetId && blockerId !== pa.targetId) {
    return "Only the target can block this action.";
  }

  addLog(game, `${blocker.name} claims ${claimedRole} to block.`);
  pa.blockerId = blockerId;
  pa.blockerClaimedRole = claimedRole;
  pa.passedPlayers = [];
  game.turnPhase = "awaiting_block_challenge";
  return null;
}

export function handlePassBlock(game: CoupGameState, playerId: string): string | null {
  if (game.turnPhase !== "awaiting_block") return "Not in block phase.";
  const pa = game.pendingAction;
  if (!pa) return "No pending action.";
  const player = getPlayer(game, playerId);
  if (!player?.isAlive) return "Invalid player.";
  if (playerId === pa.playerId) return "You can't pass on blocking your own action.";
  if (pa.passedPlayers.includes(playerId)) return "Already passed.";

  pa.passedPlayers.push(playerId);

  if (allRelevantPassed(game)) {
    // No one blocked — execute the action
    executeAction(game);
  }
  return null;
}

export function handleChallengeBlock(game: CoupGameState, challengerId: string): string | null {
  if (game.turnPhase !== "awaiting_block_challenge") return "Not in block challenge phase.";
  const pa = game.pendingAction;
  if (!pa || !pa.blockerId || !pa.blockerClaimedRole) return "No block to challenge.";
  if (challengerId === pa.blockerId) return "Cannot challenge your own block.";
  const challenger = getPlayer(game, challengerId);
  const blocker = getPlayer(game, pa.blockerId);
  if (!challenger?.isAlive || !blocker?.isAlive) return "Invalid player.";

  addLog(game, `${challenger.name} challenges ${blocker.name}'s ${pa.blockerClaimedRole} block!`);

  if (blocker.influences.includes(pa.blockerClaimedRole)) {
    // Block challenge fails: blocker had the card
    addLog(game, `${blocker.name} reveals ${pa.blockerClaimedRole} — block stands!`);

    // Blocker shuffles card back and draws replacement
    const cardIdx = blocker.influences.indexOf(pa.blockerClaimedRole);
    blocker.influences.splice(cardIdx, 1);
    game.deck.push(pa.blockerClaimedRole);
    game.deck = shuffleDeck(game.deck);
    blocker.influences.push(game.deck.pop()!);

    // Challenger loses influence, and action is blocked (cancelled)
    pa.loseInfluencePlayerId = challengerId;
    pa.passedPlayers = [];
    // After challenger loses influence, action is cancelled (block succeeded)
    game.turnPhase = "awaiting_lose_influence";
    return null;
  } else {
    // Block challenge succeeds: blocker was bluffing
    addLog(game, `${blocker.name} does not have ${pa.blockerClaimedRole} — block fails!`);

    // Blocker loses influence
    pa.loseInfluencePlayerId = pa.blockerId;
    pa.passedPlayers = [];
    game.turnPhase = "awaiting_lose_influence";
    return null;
  }
}

export function handlePassBlockChallenge(game: CoupGameState, playerId: string): string | null {
  if (game.turnPhase !== "awaiting_block_challenge") return "Not in block challenge phase.";
  const pa = game.pendingAction;
  if (!pa) return "No pending action.";
  const player = getPlayer(game, playerId);
  if (!player?.isAlive) return "Invalid player.";
  if (playerId === pa.blockerId) return "You can't pass on challenging your own block.";
  if (pa.passedPlayers.includes(playerId)) return "Already passed.";

  pa.passedPlayers.push(playerId);

  if (allRelevantPassed(game)) {
    // No one challenged the block — block succeeds, action cancelled
    addLog(game, `No one challenges the block. Action cancelled.`);
    nextTurn(game);
  }
  return null;
}

export function handleLoseInfluence(
  game: CoupGameState,
  playerId: string,
  card: CoupCard
): string | null {
  if (game.turnPhase !== "awaiting_lose_influence") return "Not awaiting influence loss.";
  const pa = game.pendingAction;
  if (!pa) return "No pending action.";
  if (pa.loseInfluencePlayerId !== playerId) return "Not your turn to lose influence.";

  if (!playerLosesInfluence(game, playerId, card)) {
    return "You don't have that card.";
  }

  addLog(game, `${getPlayer(game, playerId)!.name} reveals and loses ${card}.`);

  // Determine what happens next based on context
  // Was this from a failed challenge on the original action?
  if (pa.claimedRole && pa.blockerId === undefined) {
    // Someone challenged the action
    const challengerLost = pa.loseInfluencePlayerId !== pa.playerId;
    if (challengerLost) {
      // Challenger lost — action continues
      // Check if action can be blocked
      const blockers = ACTION_BLOCKERS[pa.type];
      if (blockers && blockers.length > 0) {
        pa.passedPlayers = [];
        game.turnPhase = "awaiting_block";
      } else {
        executeAction(game);
      }
    } else {
      // Actor lost (was bluffing) — action cancelled
      nextTurn(game);
    }
    return null;
  }

  // Was this from a block challenge?
  if (pa.blockerId !== undefined) {
    const blockerLost = pa.loseInfluencePlayerId === pa.blockerId;
    if (blockerLost) {
      // Blocker was bluffing — block fails, action executes
      executeAction(game);
    } else {
      // Challenger of block lost — block succeeds, action cancelled
      nextTurn(game);
    }
    return null;
  }

  // Regular lose influence (from assassination or coup)
  nextTurn(game);
  return null;
}

export function handleExchangeReturn(
  game: CoupGameState,
  playerId: string,
  returnCards: CoupCard[]
): string | null {
  if (game.turnPhase !== "awaiting_exchange") return "Not in exchange phase.";
  const pa = game.pendingAction;
  if (!pa || pa.playerId !== playerId) return "Not your exchange.";
  if (!pa.exchangeCards) return "No exchange cards available.";

  const player = getPlayer(game, playerId)!;
  const keepCount = player.influences.length;

  if (returnCards.length !== pa.exchangeCards.length - keepCount) {
    return `Must return exactly ${pa.exchangeCards.length - keepCount} card(s).`;
  }

  // Validate that returned cards are in the available pool
  const available = [...pa.exchangeCards];
  for (const card of returnCards) {
    const idx = available.indexOf(card);
    if (idx === -1) return "Invalid card selection.";
    available.splice(idx, 1);
  }

  // Keep the remaining cards
  player.influences = available;

  // Return cards to deck
  for (const card of returnCards) {
    game.deck.push(card);
  }
  game.deck = shuffleDeck(game.deck);

  addLog(game, `${player.name} completes the exchange.`);
  nextTurn(game);
  return null;
}

export function toPublicRoom(game: CoupGameState): CoupRoomPublic {
  return {
    code: game.code,
    hostId: game.hostId,
    phase: game.phase,
    players: game.players.map(toPublicPlayer),
    currentPlayerId: game.phase === "playing" ? currentPlayer(game).id : null,
    turnPhase: game.turnPhase,
    pendingAction: game.pendingAction
      ? { ...game.pendingAction, exchangeCards: undefined }
      : null,
    log: game.log,
    winnerId: game.winnerId,
  };
}

function toPublicPlayer(p: CoupPlayer): CoupPlayerPublic {
  const { influences, ...rest } = p;
  return { ...rest, influenceCount: influences.length };
}

export function toPrivateData(game: CoupGameState, playerId: string): CoupRoomPrivate {
  const player = getPlayer(game, playerId);
  const pa = game.pendingAction;
  return {
    myInfluences: player?.influences ?? [],
    exchangeCards:
      pa?.playerId === playerId && game.turnPhase === "awaiting_exchange"
        ? pa.exchangeCards
        : undefined,
  };
}
