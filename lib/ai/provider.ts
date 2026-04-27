import { generateWithClaude } from "@/lib/ai/claude";
import { generateWithOpenAI } from "@/lib/ai/openai";
import type { Answers } from "@/lib/questions/definitions";

export async function generateObituary(answers: Answers) {
  const provider = process.env.AI_PROVIDER ?? "claude";

  if (provider === "openai") {
    return generateWithOpenAI(answers);
  }

  return generateWithClaude(answers);
}
