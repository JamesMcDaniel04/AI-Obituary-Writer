import {
  QUESTIONS,
  getQuestionByKey,
  toQuestionPayload,
  type Answers,
  type Question,
} from "@/lib/questions/definitions";

function hasAnswered(question: Question, answers: Answers) {
  return Object.prototype.hasOwnProperty.call(answers, question.key);
}

export function getVisibleQuestions(answers: Answers) {
  return QUESTIONS.filter((question) => !question.skipIf?.(answers));
}

export function nextQuestion(answers: Answers) {
  const question = getVisibleQuestions(answers).find(
    (candidate) => !hasAnswered(candidate, answers),
  );

  return question ? toQuestionPayload(question) : null;
}

export function getQuestionnaireProgress(answers: Answers) {
  const visibleQuestions = getVisibleQuestions(answers);
  const answered = visibleQuestions.filter((question) =>
    hasAnswered(question, answers),
  ).length;

  return {
    answered,
    total: visibleQuestions.length,
    complete: visibleQuestions.length > 0 && answered >= visibleQuestions.length,
  };
}

export function assertValidAnswer(questionKey: string, answer: string) {
  const question = getQuestionByKey(questionKey);

  if (!question) {
    throw new Error("Unknown questionnaire field.");
  }

  if (!question.optional && answer.trim().length === 0) {
    throw new Error("This question requires an answer.");
  }

  if (question.type === "choice" && question.options && !question.options.includes(answer)) {
    throw new Error("That option is not valid for this question.");
  }

  return question;
}
