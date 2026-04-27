import { QUESTIONS, type Answers } from "@/lib/questions/definitions";

export const SYSTEM_PROMPT =
  "You are writing a respectful obituary draft for a funeral home. Write 250 to 400 words in polished plain prose with a warm, traditional funeral-home voice. Do not use headings, bullet points, or placeholders. Use only the facts provided. If details are sparse, stay graceful and concise rather than inventing specifics.";

export function buildPrompt(answers: Answers) {
  const orderedFacts = QUESTIONS.filter((question) =>
    Object.prototype.hasOwnProperty.call(answers, question.key),
  )
    .map((question) => {
      const label = question.prompt.replace(/\?$/, "");
      const value = answers[question.key] || "Not provided";
      return `${label}: ${value}`;
    })
    .join("\n");

  return {
    system: SYSTEM_PROMPT,
    user: `${orderedFacts}\n\nPlease write the obituary now.`,
  };
}
