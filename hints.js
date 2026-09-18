export function getAvailableHints(hints = [], elapsedMilliseconds = 0) {
  const elapsedSeconds = Math.max(0, Number(elapsedMilliseconds) || 0) / 1000;

  return hints
    .map((hint) => normalizeHint(hint))
    .filter((hint) => hint && elapsedSeconds >= hint.afterSeconds);
}

function normalizeHint(hint) {
  if (typeof hint === "string") {
    return { afterSeconds: 0, text: hint };
  }

  if (!hint || typeof hint.text !== "string") {
    return null;
  }

  return {
    afterSeconds: Math.max(0, Number(hint.afterSeconds) || 0),
    text: hint.text,
  };
}