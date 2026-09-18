export async function loadContentCatalogue(indexUrl = "content/index.json") {
  const indexResponse = await fetch(indexUrl);

  if (!indexResponse.ok) {
    throw new Error(`Unable to load content index: ${indexResponse.status}`);
  }

  const questionPaths = await indexResponse.json();
  if (!Array.isArray(questionPaths)) {
    throw new TypeError("The content index must be an array.");
  }

  const questions = await Promise.all(
    questionPaths.map(async (questionPath) => {
      const questionResponse = await fetch(`content/${questionPath}`);
      if (!questionResponse.ok) {
        throw new Error(`Unable to load question: ${questionPath}`);
      }

      const question = await questionResponse.json();
      const directory = questionPath.slice(0, questionPath.lastIndexOf("/") + 1);
      return { ...question, image: `content/${directory}${question.image}` };
    }),
  );

  return questions;
}
