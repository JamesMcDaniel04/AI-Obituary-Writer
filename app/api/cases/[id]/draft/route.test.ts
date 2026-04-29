import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getCurrentAppSession = vi.fn();
  const maybeSingle = vi.fn();
  const eqId = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: eqId }));

  const getLatestDraftForCase = vi.fn();
  const getResponsesByCaseId = vi.fn();
  const rowsToAnswerMap = vi.fn();
  const getQuestionnaireProgress = vi.fn();
  const generateObituary = vi.fn();

  const draftUpsert = vi.fn();
  const statusUpdateEq = vi.fn();
  const statusUpdate = vi.fn(() => ({ eq: statusUpdateEq }));
  const draftUpdateEq = vi.fn();
  const draftUpdate = vi.fn(() => ({ eq: draftUpdateEq }));
  const editInsert = vi.fn();
  const fromServer = vi.fn((table: string) => {
    if (table === "cases") {
      return {
        select,
        update: statusUpdate,
      };
    }

    if (table === "obituary_drafts") {
      return {
        upsert: draftUpsert,
        update: draftUpdate,
      };
    }

    if (table === "obituary_edits") {
      return {
        insert: editInsert,
      };
    }

    return { select };
  });

  return {
    getCurrentAppSession,
    maybeSingle,
    eqId,
    select,
    fromServer,
    getLatestDraftForCase,
    getResponsesByCaseId,
    rowsToAnswerMap,
    getQuestionnaireProgress,
    generateObituary,
    draftUpsert,
    statusUpdateEq,
    statusUpdate,
    draftUpdateEq,
    draftUpdate,
    editInsert,
  };
});

vi.mock("@/lib/auth/session", () => ({
  getCurrentAppSession: mocks.getCurrentAppSession,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mocks.fromServer,
  })),
}));

vi.mock("@/lib/db/queries", () => ({
  getLatestDraftForCase: mocks.getLatestDraftForCase,
  getResponsesByCaseId: mocks.getResponsesByCaseId,
  rowsToAnswerMap: mocks.rowsToAnswerMap,
}));

vi.mock("@/lib/questions/engine", () => ({
  getQuestionnaireProgress: mocks.getQuestionnaireProgress,
}));

vi.mock("@/lib/ai/provider", () => ({
  generateObituary: mocks.generateObituary,
}));

import { PATCH, POST } from "@/app/api/cases/[id]/draft/route";

describe("draft route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentAppSession.mockResolvedValue({
      user: {
        id: "director-1",
      },
    });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "case-1",
        director_id: "director-1",
      },
      error: null,
    });
  });

  it("generates and stores the initial draft", async () => {
    mocks.getLatestDraftForCase.mockResolvedValue(null);
    mocks.getResponsesByCaseId.mockResolvedValue([]);
    mocks.rowsToAnswerMap.mockReturnValue({ full_name: "Jane Doe" });
    mocks.getQuestionnaireProgress.mockReturnValue({
      answered: 10,
      total: 10,
      complete: true,
    });
    mocks.generateObituary.mockResolvedValue({
      content: "Jane Doe lived well.",
      provider: "claude",
      model: "claude-opus-4-7",
    });
    mocks.draftUpsert.mockResolvedValue({ error: null });
    mocks.statusUpdateEq.mockResolvedValue({ error: null });

    const response = await POST(
      new Request("http://localhost/api/cases/case-1/draft", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "case-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.generateObituary).toHaveBeenCalled();
    expect(mocks.draftUpsert).toHaveBeenCalled();
    expect(mocks.statusUpdateEq).toHaveBeenCalled();
  });

  it("skips audit insertion when content has not changed", async () => {
    mocks.getLatestDraftForCase.mockResolvedValue({
      case_id: "case-1",
      content: "<p>Same draft</p>",
    });

    const response = await PATCH(
      new Request("http://localhost/api/cases/case-1/draft", {
        method: "PATCH",
        body: JSON.stringify({
          content: "<p>Same draft</p>",
        }),
      }),
      { params: Promise.resolve({ id: "case-1" }) },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.saved).toBe(false);
    expect(mocks.editInsert).not.toHaveBeenCalled();
  });
});
