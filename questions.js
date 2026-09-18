export const QUESTION_CATEGORIES = Object.freeze([
  "monde",
  "personnalites",
  "art",
  "monuments",
  "animaux",
  "histoire",
  "sciences",
  "culture",
]);

let contentQuestions = [];

const questions = [
  {
    id: "tour-eiffel",
    title: "Tour Eiffel",
    category: "monuments",
    image: "assets/tour-eiffel.svg",
    answer: "Tour Eiffel",
    acceptableAnswers: ["tour eiffel", "la tour eiffel"],
    durationSeconds: 60,
    revealMode: "mosaic",
    zones: [],
    hints: [
      { afterSeconds: 20, text: "C'est en Europe." },
      { afterSeconds: 35, text: "C'est en France." },
      { afterSeconds: 45, text: "C'est a Paris." },
    ],
    explanation:
      "La tour Eiffel a ete construite pour l'Exposition universelle de Paris en 1889.",
    discovery: {
      summary:
        "La tour Eiffel est un grand monument de fer construit a Paris pour une exposition tres speciale.",
      facts: [
        "Elle mesure 330 metres de haut, avec son antenne.",
        "Elle est faite de plus de 18 000 pieces de metal assemblees.",
        "Des millions de personnes la visitent chaque annee.",
      ],
      date: "1889",
      location: "Paris, France",
      surprisingFact:
        "Elle devait etre demontee apres vingt ans, mais elle a ete gardee pour ses antennes utiles aux communications.",
    },
  },
];

export function getRandomQuestion() {
  const availableQuestions = [...questions, ...contentQuestions];
  const index = Math.floor(Math.random() * availableQuestions.length);
  return availableQuestions[index];
}

export function getContentQuestions() {
  return [...contentQuestions];
}

export function setContentQuestions(nextQuestions) {
  contentQuestions = Array.isArray(nextQuestions) ? nextQuestions : [];
}
