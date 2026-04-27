import OpenAI from "openai";
import { buildPrompt } from "@/lib/ai/prompt";
import type { Answers } from "@/lib/questions/definitions";
import { getRequiredEnv } from "@/lib/env";

export async function generateWithOpenAI(answers: Answers) {
  const openai = new OpenAI({
    apiKey: getRequiredEnv("OPENAI_API_KEY"),
  });
  const { system, user } = buildPrompt(answers);
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1";

  const response = await openai.responses.create({
    model,
    max_output_tokens: 900,
    input: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ],
  });

  return {
    content: response.output_text.trim(),
    model,
    provider: "openai" as const,
  };
}
