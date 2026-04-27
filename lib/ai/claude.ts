import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt } from "@/lib/ai/prompt";
import type { Answers } from "@/lib/questions/definitions";
import { getRequiredEnv } from "@/lib/env";

export async function generateWithClaude(answers: Answers) {
  const anthropic = new Anthropic({
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
  });
  const { system, user } = buildPrompt(answers);
  const model = process.env.CLAUDE_MODEL ?? "claude-opus-4-7";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 900,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: user,
          },
        ],
      },
    ],
  });

  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return {
    content,
    model,
    provider: "claude" as const,
  };
}
