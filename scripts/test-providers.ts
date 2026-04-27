import answers from "../lib/ai/__fixtures__/answers.json";
import { generateWithClaude } from "../lib/ai/claude";
import { generateWithOpenAI } from "../lib/ai/openai";

async function main() {
  const [claude, openai] = await Promise.all([
    generateWithClaude(answers),
    generateWithOpenAI(answers),
  ]);

  console.log("\n=== Claude ===\n");
  console.log(`Model: ${claude.model}`);
  console.log(claude.content);

  console.log("\n=== OpenAI ===\n");
  console.log(`Model: ${openai.model}`);
  console.log(openai.content);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
