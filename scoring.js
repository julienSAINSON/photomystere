const DEFAULT_PLAYER_NAME = "Joueur 1";
const HINT_PENALTY = 150;
const MAX_REVEAL_POINTS = 300;
const MAX_TIME_POINTS = 600;

export function calculatePoints({
  durationMilliseconds,
  hintUsed = false,
  remainingMilliseconds,
}) {
  const duration = Math.max(0, Number(durationMilliseconds) || 0);
  const remaining = Math.min(
    duration,
    Math.max(0, Number(remainingMilliseconds) || 0),
  );

  if (duration === 0) {
    return 0;
  }

  const remainingRatio = remaining / duration;
  const revealedRatio = 1 - remainingRatio;
  const timePoints = Math.round(MAX_TIME_POINTS * remainingRatio);
  const revealPoints = Math.round(MAX_REVEAL_POINTS * (1 - revealedRatio));
  const points = timePoints + revealPoints - (hintUsed ? HINT_PENALTY : 0);

  return Math.max(0, points);
}

export function createScore() {
  let players = [{ name: DEFAULT_PLAYER_NAME, score: 0 }];

  function configurePlayers(playerNames = []) {
    const names = playerNames
      .map((name) => String(name).trim())
      .filter(Boolean);
    const uniqueNames = [...new Set(names)];

    players = (uniqueNames.length > 0 ? uniqueNames : [DEFAULT_PLAYER_NAME]).map(
      (name) => ({ name, score: 0 }),
    );
  }

  function awardPoints(playerIndex, points) {
    const player = players[playerIndex];

    if (!player) {
      return 0;
    }

    const awardedPoints = Math.max(0, Math.round(Number(points) || 0));
    player.score += awardedPoints;
    return awardedPoints;
  }

  function getState() {
    const copiedPlayers = players.map((player) => ({ ...player }));
    const bestPerformance = Math.max(
      0,
      ...copiedPlayers.map((player) => player.score),
    );

    return { bestPerformance, players: copiedPlayers };
  }

  return { awardPoints, configurePlayers, getState };
}
