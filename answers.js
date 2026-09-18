const LEADING_ARTICLES = /^(le|la|les)\s+/;

export function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim()
    .replace(/\s+/g, " ")
    .replace(LEADING_ARTICLES, "");
}

export function isAnswerCorrect(answer, acceptableAnswers = []) {
  const normalizedAnswer = normalizeAnswer(answer);

  if (!normalizedAnswer) {
    return false;
  }

  return acceptableAnswers.some(
    (acceptableAnswer) => normalizeAnswer(acceptableAnswer) === normalizedAnswer,
  );
}
