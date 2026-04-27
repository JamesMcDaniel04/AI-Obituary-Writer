export type Answers = Record<string, string>;

export type Question = {
  key: string;
  prompt: string;
  type: "text" | "longtext" | "choice";
  options?: string[];
  optional?: boolean;
  placeholder?: string;
  skipIf?: (answers: Answers) => boolean;
};

export type QuestionPayload = Omit<Question, "skipIf">;

export const QUESTIONS: Question[] = [
  {
    key: "full_name",
    prompt: "What was their full name?",
    type: "text",
    placeholder: "Full legal or commonly used name",
  },
  {
    key: "date_of_birth",
    prompt: "When were they born?",
    type: "text",
    placeholder: "March 14, 1942",
  },
  {
    key: "date_of_passing",
    prompt: "When did they pass?",
    type: "text",
    placeholder: "April 23, 2026",
  },
  {
    key: "hometown",
    prompt: "What city or town did they call home?",
    type: "text",
    placeholder: "Denver, Colorado",
  },
  {
    key: "personality",
    prompt: "Were they more private or more public in how they lived?",
    type: "choice",
    options: ["private", "public"],
  },
  {
    key: "family_left_behind",
    prompt: "Who do they leave behind?",
    type: "longtext",
    placeholder: "Family members, close loved ones, or anyone they would want named.",
  },
  {
    key: "career",
    prompt: "What kind of work did they do, or how did they spend their days?",
    type: "longtext",
    placeholder: "Career, vocation, military service, or community role.",
    skipIf: (answers) => answers.personality === "private",
  },
  {
    key: "favorite_memory",
    prompt: "What is one memory or moment that captures who they were?",
    type: "longtext",
    placeholder: "A story, ritual, habit, or moment that feels unmistakably like them.",
  },
  {
    key: "passions",
    prompt: "What hobbies, passions, or causes mattered to them?",
    type: "longtext",
    placeholder: "Anything from gardening to church to a favorite team or cause.",
  },
  {
    key: "service_details",
    prompt: "Would you like to include service details?",
    type: "longtext",
    optional: true,
    placeholder: "Date, time, place, visitation details, or memorial instructions.",
  },
  {
    key: "wanted_line",
    prompt: "What is a line they would have wanted said about them?",
    type: "longtext",
    placeholder: "How they wanted to be remembered, in your own words.",
  },
  {
    key: "anything_missing",
    prompt: "Is there anything important we have missed?",
    type: "longtext",
    optional: true,
    placeholder: "Any final context, people, places, or details.",
  },
];

export function toQuestionPayload(question: Question): QuestionPayload {
  return {
    key: question.key,
    prompt: question.prompt,
    type: question.type,
    options: question.options,
    optional: question.optional,
    placeholder: question.placeholder,
  };
}

export function getQuestionByKey(key: string) {
  return QUESTIONS.find((question) => question.key === key) ?? null;
}
