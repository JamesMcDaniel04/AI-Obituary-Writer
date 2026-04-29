import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getCaseByToken = vi.fn();
  const getResponsesByCaseIdAdmin = vi.fn();
  const rowsToAnswerMap = vi.fn();
  const assertValidAnswer = vi.fn();
  const getQuestionnaireProgress = vi.fn();
  const nextQuestion = vi.fn();
  const upsert = vi.fn();
  const statusUpdateEq = vi.fn();
  const statusUpdate = vi.fn(() => ({ eq: statusUpdateEq }));
  const from = vi.fn((table: string) => {
    if (table === "questionnaire_responses") {
      return { upsert };
    }

    return {
      update: statusUpdate,
    };
  });
  const applyQuestionnaireRateLimit = vi.fn();

  return {
    getCaseByToken,
    getResponsesByCaseIdAdmin,
    rowsToAnswerMap,
    assertValidAnswer,
    getQuestionnaireProgress,
    nextQuestion,
    upsert,
    statusUpdateEq,
    statusUpdate,
    from,
    applyQuestionnaireRateLimit,
  };
});

vi.mock("@/lib/db/queries", () => ({
  getCaseByToken: mocks.getCaseByToken,
  getResponsesByCaseIdAdmin: mocks.getResponsesByCaseIdAdmin,
  rowsToAnswerMap: mocks.rowsToAnswerMap,
}));

vi.mock("@/lib/questions/engine", () => ({
  assertValidAnswer: mocks.assertValidAnswer,
  getQuestionnaireProgress: mocks.getQuestionnaireProgress,
  nextQuestion: mocks.nextQuestion,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

vi.mock("@/lib/questionnaire/rate-limit", () => ({
  applyQuestionnaireRateLimit: mocks.applyQuestionnaireRateLimit,
}));

import { POST } from "@/app/api/q/[token]/answer/route";

describe("POST /api/q/[token]/answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCaseByToken.mockResolvedValue({
      id: "case-1",
      status: "questionnaire_sent",
    });
    mocks.getResponsesByCaseIdAdmin.mockResolvedValue([]);
    mocks.rowsToAnswerMap.mockReturnValue({});
    mocks.assertValidAnswer.mockReturnValue({
      key: "full_name",
      optional: false,
      type: "text",
    });
    mocks.applyQuestionnaireRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
    });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.statusUpdateEq.mockResolvedValue({ error: null });
  });

  it("saves the current answer and completes the questionnaire when finished", async () => {
    mocks.nextQuestion
      .mockReturnValueOnce({
        key: "full_name",
        prompt: "What was their full name?",
        type: "text",
      })
      .mockReturnValueOnce(null);
    mocks.getQuestionnaireProgress.mockReturnValue({
      answered: 10,
      total: 10,
      complete: true,
    });

    const response = await POST(
      new Request("http://localhost/api/q/token/answer", {
        method: "POST",
        body: JSON.stringify({
          questionKey: "full_name",
          answer: "Jane Doe",
        }),
      }),
      { params: Promise.resolve({ token: "token" }) },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalled();
    expect(body.done).toBe(true);
  });

  it("rejects out-of-order answers", async () => {
    mocks.nextQuestion.mockReturnValue({
      key: "full_name",
      prompt: "What was their full name?",
      type: "text",
    });

    const response = await POST(
      new Request("http://localhost/api/q/token/answer", {
        method: "POST",
        body: JSON.stringify({
          questionKey: "date_of_birth",
          answer: "January 1, 1940",
        }),
      }),
      { params: Promise.resolve({ token: "token" }) },
    );

    expect(response.status).toBe(409);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    mocks.applyQuestionnaireRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 30_000).toISOString(),
    });

    const response = await POST(
      new Request("http://localhost/api/q/token/answer", {
        method: "POST",
        body: JSON.stringify({
          questionKey: "full_name",
          answer: "Jane Doe",
        }),
      }),
      { params: Promise.resolve({ token: "token" }) },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
