import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT, buildPrompt } from "@/lib/ai/prompt";

describe("buildPrompt", () => {
  it("keeps the system prompt stable and formats ordered facts", () => {
    const prompt = buildPrompt({
      full_name: "Jane Doe",
      hometown: "Denver, Colorado",
      wanted_line: "She left every room warmer.",
    });

    expect(prompt.system).toBe(SYSTEM_PROMPT);
    expect(prompt.user).toContain("What was their full name: Jane Doe");
    expect(prompt.user).toContain(
      "What city or town did they call home: Denver, Colorado",
    );
    expect(prompt.user).toContain(
      "What is a line they would have wanted said about them: She left every room warmer.",
    );
  });
});
