import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getCaseByToken = vi.fn();
  const getResponsesByCaseId = vi.fn();
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

  return {
    getCaseByToken,
    getResponsesByCaseId,
    rowsToAnswerMap,
    assertValidAnswer,
    getQuestionnaireProgress,
    nextQuestion,
    upsert,
    statusUpdateEq,
    statusUpdate,
    from,
  };
});

vi.mock("@/lib/db/queries", () => ({
  getCaseByToken: mocks.getCaseByToken,
  getResponsesByCaseId: mocks.getResponsesByCaseId,
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

import { POST } from "@/app/api/q/[token]/answer/route";

describe("POST /api/q/[token]/answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCaseByToken.mockResolvedValue({
      id: "case-1",
      status: "questionnaire_sent",
    });
    mocks.getResponsesByCaseId.mockResolvedValue([]);
    mocks.rowsToAnswerMap.mockReturnValue({});
    mocks.assertValidAnswer.mockReturnValue({
      key: "full_name",
      optional: false,
      type: "text",
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
});
