import { describe, expect, it } from "vitest";
import { getQuestionnaireProgress, nextQuestion } from "@/lib/questions/engine";

describe("nextQuestion", () => {
  it("starts at the first question", () => {
    expect(nextQuestion({})?.key).toBe("full_name");
  });

  it("skips the career question for private personalities", () => {
    const answers = {
      full_name: "Jane Doe",
      date_of_birth: "January 1, 1940",
      date_of_passing: "April 1, 2026",
      hometown: "Denver",
      personality: "private",
      family_left_behind: "Her family",
    };

    expect(nextQuestion(answers)?.key).toBe("favorite_memory");
  });
});

describe("getQuestionnaireProgress", () => {
  it("marks a private flow complete without the skipped career question", () => {
    const answers = {
      full_name: "Jane Doe",
      date_of_birth: "January 1, 1940",
      date_of_passing: "April 1, 2026",
      hometown: "Denver",
      personality: "private",
      family_left_behind: "Her family",
      favorite_memory: "Sunday dinners.",
      passions: "Birdwatching.",
      service_details: "",
      wanted_line: "She loved deeply.",
      anything_missing: "",
    };

    expect(getQuestionnaireProgress(answers)).toEqual({
      answered: 11,
      total: 11,
      complete: true,
    });
  });
});
