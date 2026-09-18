import { GAME_PHASES } from "./game.js";
import { createRevealEngine } from "./reveal.js";
import { getContentQuestions, QUESTION_CATEGORIES } from "./questions.js";
import { createZoneEditor } from "./zone-editor.js";
import { createZipBlob } from "./zip.js";

export function createUi(appElement, game) {
  let currentView = "welcome";
  let draft = createDraft();
  let draftImageFile = null;
  let draftImage = null;
  let isPreviewing = false;
  let zoneEditor = null;
  let selectedDraftZoneIndex = 0;
  let displayedAnswerStatus = null;
  let pauseButton = null;
  let revealEngine = null;
  let timerElement = null;
  let displayedRemainingSeconds = null;
  let displayedHintCount = 0;
  let displayedPhase = null;
  let selectedQuestionId = "";
  let sessionRevealMode = "mosaic";
  let sessionMessage = "";

  game.subscribe(handleGameState);

  function render() {
    const state = game.getState();

    appElement.innerHTML = renderCurrentView(state);

    pauseButton = appElement.querySelector("[data-action='pause']");
    timerElement = appElement.querySelector("[data-role='timer']");
    displayedAnswerStatus = state.answerStatus;
    displayedPhase = state.phase;
    displayedRemainingSeconds = null;
    displayedHintCount = state.revealedHints.length;

    appElement
      .querySelector("[data-action='start-session']")
      ?.addEventListener("submit", startGame);
    appElement
      .querySelector("[data-action='random-question']")
      ?.addEventListener("click", selectRandomQuestion);
    appElement
      .querySelector("[data-action='session-reveal-mode']")
      ?.addEventListener("change", selectSessionRevealMode);
    pauseButton?.addEventListener("click", togglePause);
    appElement
      .querySelector("[data-action='restart']")
      ?.addEventListener("click", restartQuestion);
    appElement
      .querySelector("[data-action='reveal-mode']")
      ?.addEventListener("change", selectRevealMode);
    appElement
      .querySelector("[data-action='submit-answer']")
      ?.addEventListener("submit", submitAnswer);
    appElement
      .querySelector("[data-action='next-question']")
      ?.addEventListener("click", nextQuestion);
    appElement
      .querySelector("[data-action='new-game']")
      ?.addEventListener("click", returnToConfiguration);
    appElement
      .querySelector("[data-action='resume-reveal']")
      ?.addEventListener("click", resumeReveal);
    appElement
      .querySelector("[data-action='cancel-answer']")
      ?.addEventListener("click", resumeReveal);
    appElement
      .querySelector("[data-action='open-editor']")
      ?.addEventListener("click", openEditor);
    appElement
      .querySelector("[data-action='close-editor']")
      ?.addEventListener("click", closeEditor);
    appElement
      .querySelector("[data-action='draft-image']")
      ?.addEventListener("change", loadDraftImage);
    appElement.querySelector("[data-action='add-zone']")?.addEventListener("click", addZone);
    appElement
      .querySelector("[data-action='delete-zone']")
      ?.addEventListener("click", deleteZone);
    appElement
      .querySelector("[data-action='remove-last-point']")
      ?.addEventListener("click", removeLastPoint);
    appElement
      .querySelector("[data-action='select-zone']")
      ?.addEventListener("change", selectZone);
    appElement
      .querySelector("[data-action='zone-type']")
      ?.addEventListener("change", selectZoneType);
    appElement
      .querySelector("[data-action='preview-draft']")
      ?.addEventListener("click", previewDraft);
    appElement
      .querySelector("[data-action='export-draft']")
      ?.addEventListener("click", exportDraft);
    appElement
      .querySelector("[data-action='return-editor']")
      ?.addEventListener("click", returnToEditor);
    appElement
      .querySelector("[data-action='enter-fullscreen']")
      ?.addEventListener("click", requestFullscreen);

    if (currentView === "game") {
      setupReveal(state);
      updateTimer(state);
      appElement
        .querySelector("[data-role='reveal-canvas']")
        ?.addEventListener("pointerdown", pauseForAnswer);

      if (state.phase === GAME_PHASES.PAUSED || state.phase === GAME_PHASES.TIME_UP) {
        appElement.querySelector("[data-role='answer-input']")?.focus();
      }
    }

    if (currentView === "editor") {
      setupZoneEditor();
    }
  }

  function startGame(event) {
    event?.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = getContentQuestions().find(
      (availableQuestion) => availableQuestion.id === formData.get("question"),
    );
    const durationSeconds = getConfiguredDuration(formData);

    if (!question || !durationSeconds) {
      sessionMessage = "Choisis une question disponible et une durée comprise entre 1 minute et 23 heures 59 minutes.";
      render();
      return;
    }

    sessionMessage = "";
    requestFullscreen();
    game.setRevealMode(sessionRevealMode);
    game.startSession(question, durationSeconds, String(formData.get("players") ?? "").split(/[\n,]/));
    isPreviewing = false;
    currentView = "game";
    render();
  }

  function togglePause() {
    game.togglePause();
    render();
  }

  function pauseForAnswer() {
    game.pauseForAnswer();
  }

  function resumeReveal() {
    game.resumeReveal();
  }

  function returnToConfiguration() {
    game.abandonQuestion();
    isPreviewing = false;
    currentView = "welcome";
    render();
  }

  function selectRandomQuestion() {
    const questions = getContentQuestions();
    if (questions.length === 0) {
      sessionMessage = "Aucune question n'est encore disponible dans content/index.json.";
      render();
      return;
    }

    selectedQuestionId = questions[Math.floor(Math.random() * questions.length)].id;
    sessionMessage = "Question aléatoire sélectionnée.";
    render();
  }

  function selectSessionRevealMode(event) {
    sessionRevealMode = event.currentTarget.value;
  }

  function getConfiguredDuration(formData) {
    const hours = Number(formData.get("hours"));
    const minutes = Number(formData.get("minutes"));

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      hours + minutes === 0
    ) {
      return null;
    }

    return hours * 60 * 60 + minutes * 60;
  }

  function requestFullscreen() {
    const request = appElement.requestFullscreen?.();
    request?.catch(() => {});
  }

  function restartQuestion() {
    game.restartQuestion();
    render();
  }

  function selectRevealMode(event) {
    game.setRevealMode(event.currentTarget.value);
  }

  function submitAnswer(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    game.submitAnswer(formData.get("answer"));
  }

  function nextQuestion() {
    game.nextQuestion();
    render();
  }

  function openEditor() {
    game.abandonQuestion();
    isPreviewing = false;
    currentView = "editor";
    render();
  }

  function closeEditor() {
    zoneEditor?.destroy();
    zoneEditor = null;
    currentView = "welcome";
    render();
  }

  function returnToEditor() {
    game.abandonQuestion();
    isPreviewing = false;
    currentView = "editor";
    render();
  }

  function handleGameState(state) {
    if (currentView !== "game") {
      return;
    }

    if (
      displayedAnswerStatus !== state.answerStatus ||
      displayedHintCount !== state.revealedHints.length ||
      displayedPhase !== state.phase
    ) {
      render();
      return;
    }

    updateTimer(state);
  }

  function setupReveal(state) {
    const canvas = appElement.querySelector("[data-role='reveal-canvas']");

    if (!canvas || !state.currentQuestion.image) {
      return;
    }

    revealEngine?.destroy();
    revealEngine = null;

    const image = new Image();
    image.addEventListener("load", () => {
      if (canvas.isConnected === false) {
        return;
      }

      revealEngine = createRevealEngine(canvas, {
        columns: getMosaicColumns(state.sessionDurationSeconds, state.revealMode),
        durationSeconds: state.sessionDurationSeconds,
        image,
        mode: state.revealMode,
        zones: state.currentQuestion.zones,
      });
      game.setRevealEngine(revealEngine);
    });
    image.src = state.currentQuestion.image;
  }

  function getMosaicColumns(durationSeconds, revealMode) {
    if (revealMode !== "mosaic") {
      return undefined;
    }

    return Math.min(40, Math.max(10, Math.round(10 * Math.sqrt(durationSeconds / 60))));
  }

  function updateTimer(state) {
    if (!timerElement || displayedRemainingSeconds === state.timer.remainingSeconds) {
      return;
    }

    displayedRemainingSeconds = state.timer.remainingSeconds;
    timerElement.textContent = formatTime(state.timer.remainingSeconds);
    timerElement.setAttribute(
      "aria-label",
      `Temps restant : ${state.timer.remainingSeconds} secondes`,
    );

    if (pauseButton) {
      pauseButton.textContent = state.isFinished
        ? "Partie terminee"
        : state.timer.isRunning
          ? "Mettre en pause"
          : "Reprendre";
      pauseButton.disabled = state.timer.isComplete || state.isFinished;
    }
  }

  function formatTime(remainingSeconds) {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formattedMinutes = String(minutes % 60).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");
    return hours > 0
      ? `${String(hours).padStart(2, "0")}:${formattedMinutes}:${formattedSeconds}`
      : `${formattedMinutes}:${formattedSeconds}`;
  }

  function renderWelcome() {
    const questions = getContentQuestions();
    const selectedId = selectedQuestionId || questions[0]?.id || "";
    selectedQuestionId = selectedId;

    return `
      <section class="screen welcome-screen session-screen" aria-labelledby="game-title">
        <p class="eyebrow">Nouvelle session</p>
        <h1 id="game-title">Photo Mystere</h1>
        <form class="session-form" data-action="start-session">
          <label>
            <span>Heures</span>
            <input name="hours" type="number" min="0" max="23" value="0" inputmode="numeric" required />
          </label>
          <label>
            <span>Minutes</span>
            <input name="minutes" type="number" min="0" max="59" value="1" inputmode="numeric" required />
          </label>
          <label>
            <span>Choisir une question</span>
            <select name="question" ${questions.length === 0 ? "disabled" : ""}>
              ${questions.length > 0 ? questions.map((question) => `<option value="${escapeHtml(question.id)}" ${question.id === selectedId ? "selected" : ""}>${escapeHtml(question.title)}</option>`).join("") : '<option>Aucune question disponible</option>'}
            </select>
          </label>
          <label>
            <span>Mode de révélation</span>
            <select data-action="session-reveal-mode">
              <option value="mosaic" ${sessionRevealMode === "mosaic" ? "selected" : ""}>Mosaïque</option>
              <option value="blur" ${sessionRevealMode === "blur" ? "selected" : ""}>Flou progressif</option>
              <option value="bands" ${sessionRevealMode === "bands" ? "selected" : ""}>Bandes horizontales</option>
            </select>
          </label>
          <button class="secondary-action random-action" type="button" data-action="random-question">🎲 Aléatoire</button>
          <label class="players-control" for="players">
            <span>Joueurs</span>
            <textarea
              id="players"
              name="players"
              rows="3"
              placeholder="Lina, Samir, Zoé"
            ></textarea>
          </label>
          ${sessionMessage ? `<p class="session-message" role="status">${escapeHtml(sessionMessage)}</p>` : ""}
          <button class="primary-action" type="submit" ${questions.length === 0 ? "disabled" : ""}>Lancer la partie</button>
        </form>
        <button class="secondary-action" type="button" data-action="open-editor">
          Créer une photo mystère
        </button>
      </section>
    `;
  }

  function renderCurrentView(state) {
    if (currentView === "editor") {
      return renderEditor();
    }

    if (currentView === "game") {
      return renderGame(state);
    }

    return renderWelcome();
  }

  function renderEditor() {
    const zoneState = zoneEditor?.getState() ?? {
      selectedZoneIndex: selectedDraftZoneIndex,
      zones: draft.zones,
    };
    draft.zones = zoneState.zones;

    return `
      <section class="screen editor-screen" aria-labelledby="editor-title">
        <header class="editor-header">
          <div>
            <p class="eyebrow">Atelier local</p>
            <h1 id="editor-title">Créer une photo mystère</h1>
          </div>
          <button class="secondary-action" type="button" data-action="close-editor">Fermer</button>
        </header>
        <p class="editor-status">Le brouillon reste en mémoire jusqu'à l'export.</p>
        <form class="editor-form" data-action="editor-form">
          <label>
            <span>1. Image</span>
            <input type="file" accept="image/*" data-action="draft-image" />
          </label>
          <label>
            <span>2. ID</span>
            <input name="id" type="text" value="${escapeHtml(draft.id)}" placeholder="tour-eiffel" required />
          </label>
          <label>
            <span>3. Titre / question</span>
            <input name="title" type="text" value="${escapeHtml(draft.title)}" placeholder="Quel est ce monument ?" required />
          </label>
          <label>
            <span>4. Réponse</span>
            <input name="answer" type="text" value="${escapeHtml(draft.answer)}" required />
          </label>
          <label>
            <span>5. Réponses acceptées</span>
            <textarea name="acceptableAnswers" rows="4" placeholder="tour eiffel; la tour eiffel; eiffel tower">${escapeHtml(draft.acceptableAnswers.join(";\n"))}</textarea>
          </label>
          <label>
            <span>6. Catégorie</span>
            <select name="category">${QUESTION_CATEGORIES.map(
              (category) => `<option value="${category}" ${draft.category === category ? "selected" : ""}>${category}</option>`,
            ).join("")}</select>
          </label>
          <label>
            <span>7. Temps (secondes)</span>
            <input name="durationSeconds" type="number" min="10" max="300" value="${draft.durationSeconds}" required />
          </label>
          <label>
            <span>8. Mode de révélation</span>
            <select name="revealMode">
              <option value="mosaic" ${draft.revealMode === "mosaic" ? "selected" : ""}>Mosaïque</option>
              <option value="blur" ${draft.revealMode === "blur" ? "selected" : ""}>Flou progressif</option>
              <option value="bands" ${draft.revealMode === "bands" ? "selected" : ""}>Bandes horizontales</option>
            </select>
          </label>
          <fieldset class="zone-editor">
            <legend>9. Zones de révélation</legend>
            <p>Ajoute une zone ou touche l'image pour créer des points. Fais glisser une zone pour la déplacer ou un point pour la redimensionner.</p>
            <label>
              <span>Zone à modifier</span>
              <select data-action="select-zone">${renderZoneOptions(zoneState)}</select>
            </label>
            <label>
              <span>Type de zone</span>
              <select data-action="zone-type">
                ${["main", "secondary", "normal"].map((type) => `<option value="${type}" ${zoneState.zones[zoneState.selectedZoneIndex]?.type === type ? "selected" : ""}>${formatZoneType(type)}</option>`).join("")}
              </select>
            </label>
            <p class="zone-point-count" data-role="zone-point-count">${formatZonePointCount(zoneState)}</p>
            <canvas class="zone-editor-canvas" data-role="zone-editor" aria-label="Image pour dessiner les zones"></canvas>
            <div class="editor-actions">
              <button class="secondary-action" type="button" data-action="add-zone">Ajouter une zone</button>
              <button class="secondary-action" type="button" data-action="remove-last-point" ${isZoneEmpty(zoneState) ? "disabled" : ""}>Supprimer le dernier point</button>
              <button class="secondary-action" type="button" data-action="delete-zone">Supprimer la zone</button>
            </div>
          </fieldset>
          <label>
            <span>10. Indices progressifs</span>
            <textarea name="hints" rows="4" placeholder="20 | C'est en Europe.\n35 | C'est en France.">${escapeHtml(formatDraftHints())}</textarea>
          </label>
          <label>
            <span>11. Explication pédagogique</span>
            <textarea name="explanation" rows="4" required>${escapeHtml(draft.explanation)}</textarea>
          </label>
          ${draft.message ? `<p class="editor-message" role="status">${escapeHtml(draft.message)}</p>` : ""}
          <div class="editor-actions">
            <button class="secondary-action" type="button" data-action="preview-draft">Prévisualiser</button>
            <button class="primary-action" type="button" data-action="export-draft">Télécharger le contenu</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderZoneOptions(zoneState) {
    return zoneState.zones
      .map(
        (zone, index) => {
          return `<option value="${index}" ${index === zoneState.selectedZoneIndex ? "selected" : ""}>${formatZoneType(zone.type)} ${index + 1}</option>`;
        },
      )
      .join("");
  }

  function loadDraftImage(event) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    draftImageFile = file;
    draft.image = URL.createObjectURL(file);
    loadImageForEditor();
  }

  function loadImageForEditor() {
    if (!draft.image) {
      return;
    }

    draftImage = new Image();
    draftImage.addEventListener("load", () => {
      zoneEditor?.destroy();
      zoneEditor = null;
      render();
    });
    draftImage.src = draft.image;
  }

  function setupZoneEditor() {
    const canvas = appElement.querySelector("[data-role='zone-editor']");

    if (!canvas || !draftImage?.complete || !draftImage.naturalWidth) {
      return;
    }

    zoneEditor?.destroy();
    zoneEditor = createZoneEditor(canvas, {
      image: draftImage,
      zones: draft.zones,
      onChange: (zoneState) => {
        selectedDraftZoneIndex = zoneState.selectedZoneIndex;
        draft.zones = zoneState.zones;
        updateZoneDetails(zoneState);
      },
    });
    zoneEditor.setSelectedZone(selectedDraftZoneIndex);
  }

  function updateZoneDetails(zoneState) {
    const count = appElement.querySelector("[data-role='zone-point-count']");
    const removeLastPointButton = appElement.querySelector(
      "[data-action='remove-last-point']",
    );

    if (count) {
      count.textContent = formatZonePointCount(zoneState);
    }

    if (removeLastPointButton) {
      removeLastPointButton.disabled = isZoneEmpty(zoneState);
    }
  }

  function formatZonePointCount(zoneState) {
    const count = zoneState.zones[zoneState.selectedZoneIndex]?.points.length ?? 0;
    return `${count} ${count === 1 ? "point" : "points"} définis`;
  }

  function isZoneEmpty(zoneState) {
    return (zoneState.zones[zoneState.selectedZoneIndex]?.points.length ?? 0) === 0;
  }

  function addZone() {
    readDraftForm();
    zoneEditor?.addZone("secondary");
    selectedDraftZoneIndex = zoneEditor?.getState().selectedZoneIndex ?? selectedDraftZoneIndex;
    draft.zones = zoneEditor?.getState().zones ?? draft.zones;
    render();
  }

  function removeLastPoint() {
    zoneEditor?.removeLastPoint();
    draft.zones = zoneEditor?.getState().zones ?? draft.zones;
    render();
  }

  function deleteZone() {
    zoneEditor?.deleteSelectedZone();
    draft.zones = zoneEditor?.getState().zones ?? draft.zones;
    render();
  }

  function selectZone(event) {
    selectedDraftZoneIndex = Number(event.currentTarget.value);
    zoneEditor?.setSelectedZone(selectedDraftZoneIndex);
    render();
  }

  function selectZoneType(event) {
    zoneEditor?.setSelectedZoneType(event.currentTarget.value);
    draft.zones = zoneEditor?.getState().zones ?? draft.zones;
    render();
  }

  function previewDraft() {
    const question = buildDraftQuestion();

    if (!question) {
      render();
      return;
    }

    isPreviewing = true;
    currentView = "game";
    game.startQuestion(question);
    render();
  }

  async function exportDraft() {
    const question = buildDraftQuestion();

    if (!question) {
      render();
      return;
    }

    try {
      const imageName = "image.jpg";
      const imageBlob = await getExportImageBlob();
      const questionJson = new Blob(
        [JSON.stringify({ ...question, image: imageName }, null, 2)],
        { type: "application/json" },
      );
      const archive = await createZipBlob([
        { data: imageBlob, name: `${question.id}/${imageName}` },
        { data: questionJson, name: `${question.id}/question.json` },
      ]);

      downloadFile(archive, `${question.id}.zip`);
      draft.message = `Le fichier ${question.id}.zip a été téléchargé.`;
    } catch {
      draft.message = "Le téléchargement a échoué. Vérifie l'image et réessaie.";
    }
    render();
  }

  function buildDraftQuestion() {
    readDraftForm();
    const mainZone = draft.zones.find((zone) => zone.type === "main");

    if (!draftImageFile || !draft.id || !draft.title || !draft.answer || !draft.explanation) {
      draft.message = "Ajoute une image, un ID, un titre, une réponse et une explication avant de continuer.";
      return null;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) {
      draft.message = "Utilise un ID en minuscules avec des chiffres ou des tirets, par exemple tour-eiffel.";
      return null;
    }

    if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 10 || draft.durationSeconds > 300) {
      draft.message = "Choisis une durée comprise entre 10 et 300 secondes.";
      return null;
    }

    if (!mainZone || mainZone.points.length < 3 || draft.zones.some((zone) => zone.points.length < 3)) {
      draft.message = "Chaque zone, dont la zone principale, a besoin d'au moins trois points.";
      return null;
    }

    draft.message = "";
    return {
      id: draft.id,
      title: draft.title,
      category: draft.category,
      image: draft.image,
      answer: draft.answer,
      acceptableAnswers: draft.acceptableAnswers,
      durationSeconds: draft.durationSeconds,
      revealMode: draft.revealMode,
      zones: draft.zones.map((zone) => ({ ...zone, points: [...zone.points] })),
      hints: draft.hints,
      explanation: draft.explanation,
    };
  }

  function readDraftForm() {
    const form = appElement.querySelector("[data-action='editor-form']");

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    draft.id = String(formData.get("id") ?? "").trim();
    draft.title = String(formData.get("title") ?? "").trim();
    draft.answer = String(formData.get("answer") ?? "").trim();
    draft.acceptableAnswers = String(formData.get("acceptableAnswers") ?? "")
      .split(/[;\n]/)
      .map((answer) => answer.trim())
      .filter(Boolean);
    draft.category = String(formData.get("category") ?? QUESTION_CATEGORIES[0]);
    draft.durationSeconds = Number(formData.get("durationSeconds"));
    draft.revealMode = String(formData.get("revealMode") ?? "mosaic");
    draft.hints = parseDraftHints(String(formData.get("hints") ?? ""));
    draft.explanation = String(formData.get("explanation") ?? "").trim();
  }

  function parseDraftHints(value) {
    return value
      .split("\n")
      .map((line) => line.split("|"))
      .map(([afterSeconds, ...text]) => ({
        afterSeconds: Number(afterSeconds.trim()),
        text: text.join("|").trim(),
      }))
      .filter((hint) => Number.isFinite(hint.afterSeconds) && hint.afterSeconds >= 0 && hint.text);
  }

  function formatDraftHints() {
    return draft.hints.map((hint) => `${hint.afterSeconds} | ${hint.text}`).join("\n");
  }

  function getExportImageBlob() {
    const canvas = document.createElement("canvas");
    canvas.width = draftImage.naturalWidth;
    canvas.height = draftImage.naturalHeight;
    canvas.getContext("2d").drawImage(draftImage, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Unable to convert the selected image."));
      }, "image/jpeg", 0.92);
    });
  }

  function downloadFile(file, name) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderGame(state) {
    return `
      <section class="screen game-screen ${isAnswerPhase(state.phase) ? "is-answering" : ""}" aria-labelledby="question-title">
        <div class="photo-stage">
          <canvas
            class="photo-canvas"
            data-role="reveal-canvas"
            aria-label="${getCanvasLabel(state.phase)}"
          ></canvas>
          <button class="fullscreen-action" type="button" data-action="enter-fullscreen">
            Plein écran
          </button>
          <p class="timer" aria-live="polite">
            <span class="timer-label">${getGameStateLabel(state.phase)}</span>
            <strong class="timer-value" data-role="timer">${formatTime(
              state.timer.remainingSeconds,
            )}</strong>
          </p>
        </div>
        <h1 class="game-prompt" id="question-title">${getGamePrompt(state.phase)}</h1>
        ${renderAnswerArea(state)}
        ${state.phase === GAME_PHASES.ANSWERED ? '<button class="primary-action" type="button" data-action="new-game">Nouvelle partie</button>' : ""}
        ${isPreviewing ? '<button class="secondary-action" type="button" data-action="return-editor">Retour à l’éditeur</button>' : ""}
      </section>
    `;
  }

  function renderAnswerArea(state) {
    if (state.answerStatus === "correct") {
      return `
        <section class="answer-result answer-result-success" aria-live="polite">
          <p class="eyebrow">Bonne réponse !</p>
          <h2>${state.currentQuestion.answer}</h2>
          <p>${state.currentQuestion.explanation}</p>
          ${renderRoundScore(state)}
        </section>
        ${renderDiscoveryCard(state.currentQuestion)}
      `;
    }

    if (!isAnswerPhase(state.phase)) {
      return "";
    }

    return `
      <div class="answer-modal" role="presentation">
        <form class="answer-form answer-dialog" data-action="submit-answer" role="dialog" aria-modal="true" aria-labelledby="answer-title">
          ${state.phase === GAME_PHASES.PAUSED ? '<button class="modal-close" type="button" data-action="cancel-answer" aria-label="Annuler la proposition et reprendre la révélation">×</button>' : ""}
          <h2 id="answer-title">${state.phase === GAME_PHASES.TIME_UP ? "Temps écoulé" : "Image en pause"}</h2>
          <label for="answer">Ta réponse</label>
          <div class="answer-controls">
            <input
              id="answer"
              name="answer"
              type="text"
              autocomplete="off"
              autocapitalize="words"
              enterkeyhint="done"
              data-role="answer-input"
              required
            />
            <button class="primary-action" type="submit">Valider</button>
          </div>
          ${
            state.phase === GAME_PHASES.TIME_UP
              ? `<p class="answer-feedback" role="status">L'image est entièrement révélée.</p>${state.answerStatus === "incorrect" ? '<p class="answer-feedback" role="status">Ce n\'est pas la bonne réponse.</p>' : ""}`
              : state.answerStatus === "incorrect"
                ? '<p class="answer-feedback" role="status">Ce n\'est pas la bonne réponse.</p>'
                : ""
          }
        </form>
      </div>
    `;
  }

  function isAnswerPhase(phase) {
    return phase === GAME_PHASES.PAUSED || phase === GAME_PHASES.TIME_UP;
  }

  function getGameStateLabel(phase) {
    if (phase === GAME_PHASES.PAUSED) {
      return "PAUSE";
    }

    if (phase === GAME_PHASES.TIME_UP) {
      return "Temps écoulé";
    }

    return "Temps restant";
  }

  function getGamePrompt(phase) {
    if (phase === GAME_PHASES.PLAYING) {
      return "Touche l'image pour répondre";
    }

    if (phase === GAME_PHASES.PAUSED) {
      return "Image en pause";
    }

    if (phase === GAME_PHASES.TIME_UP) {
      return "Temps écoulé";
    }

    return "Bonne réponse !";
  }

  function getCanvasLabel(phase) {
    if (phase === GAME_PHASES.PLAYING) {
      return "Photo mystere en cours de revelation, touche l'image pour répondre";
    }

    if (phase === GAME_PHASES.TIME_UP) {
      return "Photo mystere entièrement révélée, temps écoulé";
    }

    return "Photo mystere en pause";
  }

  function renderPlayers(state) {
    return `
      <ul class="players-score" aria-label="Scores des joueurs">
        ${state.scoreState.players
          .map(
            (player, index) => `
              <li class="${index === state.currentPlayerIndex ? "is-current" : ""}">
                <span>${player.name}</span>
                <strong>${formatPoints(player.score)}</strong>
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function renderHints(state) {
    if (state.revealedHints.length === 0) {
      return "";
    }

    return `
      <section class="hint-control" aria-live="polite" aria-label="Indices disponibles">
        <p class="eyebrow">Indices</p>
        <ol class="progressive-hints">
          ${state.revealedHints
            .map(
              (hint, index) => `<li><strong>Indice ${index + 1}</strong>${hint.text}</li>`,
            )
            .join("")}
        </ol>
      </section>
    `;
  }

  function renderRoundScore(state) {
    return `<p class="round-score"><span>Points gagnes</span><strong>${formatPoints(
      state.lastPoints,
    )}</strong></p>`;
  }

  function formatPoints(points) {
    return `${points} ${points === 1 ? "point" : "points"}`;
  }

  function renderDiscoveryCard(question) {
    const discovery = question.discovery;

    if (!discovery) {
      return "";
    }

    const facts = Array.isArray(discovery.facts) ? discovery.facts : [];

    return `
      <section class="discovery-card" aria-labelledby="discovery-title">
        <p class="eyebrow">À découvrir</p>
        ${
          question.image
            ? `<img class="discovery-image" src="${question.image}" alt="${question.title}" />`
            : ""
        }
        <h2 id="discovery-title">${question.title}</h2>
        <p class="discovery-category">${question.category}</p>
        ${discovery.summary ? `<p>${discovery.summary}</p>` : ""}
        ${
          discovery.date || discovery.location
            ? `
              <dl class="discovery-details">
                ${discovery.date ? `<div><dt>Date</dt><dd>${discovery.date}</dd></div>` : ""}
                ${
                  discovery.location
                    ? `<div><dt>Lieu</dt><dd>${discovery.location}</dd></div>`
                    : ""
                }
              </dl>
            `
            : ""
        }
        ${
          facts.length > 0
            ? `<ul class="discovery-facts">${facts
                .map((fact) => `<li>${fact}</li>`)
                .join("")}</ul>`
            : ""
        }
        ${
          discovery.surprisingFact
            ? `<p class="discovery-surprise">${discovery.surprisingFact}</p>`
            : ""
        }
      </section>
    `;
  }

  return { render };
}

function createDraft(message = "") {
  return {
    answer: "",
    acceptableAnswers: [],
    category: QUESTION_CATEGORIES[0],
    durationSeconds: 60,
    explanation: "",
    hints: [],
    id: "",
    image: "",
    message,
    revealMode: "mosaic",
    title: "",
    zones: [{ type: "main", points: [] }],
  };
}

function formatZoneType(type) {
  if (type === "main") {
    return "Principale";
  }
  if (type === "secondary") {
    return "Secondaire";
  }
  return "Normale";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
