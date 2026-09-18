import { createGame } from "./game.js";
import { createUi } from "./ui.js";
import { loadContentCatalogue } from "./content-loader.js";
import { setContentQuestions } from "./questions.js";

const appElement = document.querySelector("#app");
const game = createGame();
const ui = createUi(appElement, game);

ui.render();

loadContentCatalogue()
	.then((questions) => {
		setContentQuestions(questions);
		ui.render();
	})
	.catch(() => {});
