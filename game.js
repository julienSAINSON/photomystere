import { isAnswerCorrect } from "./answers.js";
import { getAvailableHints } from "./hints.js";
import { getRandomQuestion } from "./questions.js";
import { calculatePoints, createScore } from "./scoring.js";
import { createTimer } from "./timer.js";

const DEFAULT_DURATION_SECONDS = 30;
const DEFAULT_REVEAL_MODE = "mosaic";
export const GAME_PHASES = Object.freeze({
  ANSWERED: "ANSWERED",
  PAUSED: "PAUSED",
  PLAYING: "PLAYING",
  TIME_UP: "TIME_UP",
});

export function createGame() {
  let answerStatus = null;
  let currentQuestion = null;
  let currentPlayerIndex = 0;
  let lastPoints = 0;
  let revealedHints = [];
  let revealEngine = null;
  let revealMode = DEFAULT_REVEAL_MODE;
  let sessionDurationSeconds = DEFAULT_DURATION_SECONDS;
  let phase = null;
  let timer = null;
  const listeners = new Set();
  const score = createScore();

  function start(playerNames) {
    const names = Array.isArray(playerNames)
      ? playerNames
      : score.getState().players.map((player) => player.name);
    score.configurePlayers(names);
    currentPlayerIndex = 0;
    beginQuestion(getRandomQuestion());
  }

  function startQuestion(question, playerNames, durationSeconds) {
    if (!question || typeof question !== "object") {
      throw new TypeError("A question object is required.");
    }

    const names = Array.isArray(playerNames)
      ? playerNames
      : score.getState().players.map((player) => player.name);
    score.configurePlayers(names);
    currentPlayerIndex = 0;
    beginQuestion(question, durationSeconds);
  }

  function startSession(question, durationSeconds, playerNames) {
    startQuestion(question, playerNames, durationSeconds);
  }

  function abandonQuestion() {
    timer?.destroy();
    timer = null;
    answerStatus = null;
    currentQuestion = null;
    lastPoints = 0;
    revealedHints = [];
    phase = null;
  }

  function restartQuestion() {
    if (!currentQuestion || phase === GAME_PHASES.ANSWERED) {
      return;
    }

    answerStatus = null;
    lastPoints = 0;
    revealedHints = [];
    phase = GAME_PHASES.PLAYING;
    startTimer();
  }

  function nextQuestion() {
    if (!currentQuestion || !isFinished()) {
      return;
    }

    const players = score.getState().players;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    currentQuestion = getRandomQuestion();
    answerStatus = null;
    lastPoints = 0;
    revealedHints = [];
    phase = GAME_PHASES.PLAYING;
    startTimer();
  }

  function togglePause() {
    if (!timer || timer.getState().isComplete || phase !== GAME_PHASES.PLAYING) {
      return;
    }

    if (timer.getState().isRunning) {
      timer.pause();
      return;
    }

    timer.start();
  }

  function setRevealEngine(nextRevealEngine) {
    if (
      nextRevealEngine !== null &&
      typeof nextRevealEngine?.update !== "function"
    ) {
      throw new TypeError("The reveal engine must expose update().");
    }

    revealEngine = nextRevealEngine;
    const timerState = timer?.getState();
    syncReveal(
      isFinished()
        ? timerState?.durationMilliseconds ?? 0
        : timerState?.elapsedMilliseconds ?? 0,
    );
  }

  function setRevealMode(nextRevealMode) {
    revealMode = nextRevealMode;
    notifyListeners();
  }

  function submitAnswer(answer) {
    if (!currentQuestion || !canSubmitAnswer()) {
      return;
    }

    const acceptableAnswers = Array.isArray(currentQuestion.acceptableAnswers)
      ? currentQuestion.acceptableAnswers
      : [];
    if (
      isAnswerCorrect(answer, [
        currentQuestion.answer,
        ...acceptableAnswers,
      ])
    ) {
      answerStatus = "correct";
      const timerState = timer.getState();
      updateRevealedHints(timerState);
      lastPoints = score.awardPoints(
        currentPlayerIndex,
        calculatePoints({
          durationMilliseconds: timerState.durationMilliseconds,
          hintUsed: revealedHints.length > 0,
          remainingMilliseconds: timerState.remainingMilliseconds,
        }),
      );
      timer.pause();
      syncReveal(timerState.durationMilliseconds);
      phase = GAME_PHASES.ANSWERED;
      notifyListeners();
      return;
    }

    answerStatus = "incorrect";
    notifyListeners();
  }

  function pauseForAnswer() {
    if (!timer || phase !== GAME_PHASES.PLAYING || timer.getState().isComplete) {
      return;
    }

    timer.pause();
    phase = GAME_PHASES.PAUSED;
    notifyListeners();
  }

  function resumeReveal() {
    if (!timer || phase !== GAME_PHASES.PAUSED) {
      return;
    }

    answerStatus = null;
    phase = GAME_PHASES.PLAYING;
    timer.start();
    notifyListeners();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getState() {
    const scoreState = score.getState();
    const totalScore = scoreState.players.reduce(
      (total, player) => total + player.score,
      0,
    );

    return {
      currentQuestion,
      answerStatus,
      isFinished: isFinished(),
      currentPlayer: scoreState.players[currentPlayerIndex] ?? null,
      currentPlayerIndex,
      hasStarted: currentQuestion !== null,
      lastPoints,
      phase,
      revealMode,
      revealedHints,
      sessionDurationSeconds,
      score: totalScore,
      scoreState,
      timer: timer?.getState() ?? getInitialTimerState(),
    };
  }

  function destroy() {
    timer?.destroy();
    listeners.clear();
  }

  function startTimer() {
    timer?.destroy();
    timer = createTimer({
      durationSeconds: sessionDurationSeconds,
      onTick: (timerState) => {
        syncReveal(timerState.elapsedMilliseconds);
        updateRevealedHints(timerState);
        notifyListeners();
      },
      onComplete: (timerState) => {
        syncReveal(timerState.elapsedMilliseconds);
        updateRevealedHints(timerState);
        answerStatus = "time-ended";
        phase = GAME_PHASES.TIME_UP;
        notifyListeners();
      },
    });
    syncReveal(0);
    timer.start();
  }

  function beginQuestion(question, durationSeconds) {
    currentQuestion = question;
    answerStatus = null;
    lastPoints = 0;
    revealedHints = [];
    phase = GAME_PHASES.PLAYING;
    sessionDurationSeconds = getSessionDuration(durationSeconds, question);
    startTimer();
  }

  function getSessionDuration(durationSeconds, question) {
    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
      return durationSeconds;
    }

    return question.durationSeconds ?? DEFAULT_DURATION_SECONDS;
  }

  function syncReveal(elapsedMilliseconds) {
    revealEngine?.update(elapsedMilliseconds);
  }

  function updateRevealedHints(timerState) {
    revealedHints = getAvailableHints(
      currentQuestion?.hints,
      timerState.elapsedMilliseconds,
    );
  }

  function isFinished() {
    return phase === GAME_PHASES.ANSWERED;
  }

  function canSubmitAnswer() {
    return phase === GAME_PHASES.PAUSED || phase === GAME_PHASES.TIME_UP;
  }

  function notifyListeners() {
    const state = getState();
    listeners.forEach((listener) => listener(state));
  }

  return {
    abandonQuestion,
    destroy,
    getState,
    nextQuestion,
    pauseForAnswer,
    restartQuestion,
    resumeReveal,
    setRevealEngine,
    setRevealMode,
    start,
    startQuestion,
    startSession,
    subscribe,
    submitAnswer,
    togglePause,
  };
}

function getInitialTimerState() {
  return {
    durationMilliseconds: 0,
    elapsedMilliseconds: 0,
    remainingMilliseconds: 0,
    remainingSeconds: 0,
    isComplete: false,
    isRunning: false,
  };
}
