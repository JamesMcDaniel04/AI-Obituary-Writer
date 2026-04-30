import type { CaseRow } from "@/lib/db/queries";

export type CaseWorkflowStage =
  | "awaiting_family"
  | "ready_to_generate"
  | "editing"
  | "delivered";

export type CaseProgress = {
  answered: number;
  total: number;
  complete: boolean;
};

export type TrackedCase = {
  caseId: string;
  familyName: string;
  fullName: string | null;
  status: CaseRow["status"];
  createdAt: string;
  updatedAt: string;
  progress: CaseProgress;
  responseCount: number;
  hasDraft: boolean;
  hasCompletedDraft: boolean;
  editCount: number;
  lastResponseAt: string | null;
  lastEditAt: string | null;
  draftUpdatedAt: string | null;
  completedAt: string | null;
  activityAt: string;
  stage: CaseWorkflowStage;
};

export type CaseActivity = {
  caseId: string;
  label: string;
  detail: string;
  at: string;
};

export type CaseDashboardSummary = {
  total: number;
  active: number;
  awaitingFamily: number;
  readyToGenerate: number;
  editing: number;
  delivered: number;
};

export function getCaseStage({
  status,
  progress,
  hasDraft,
}: Pick<TrackedCase, "status" | "progress" | "hasDraft">): CaseWorkflowStage {
  if (status === "delivered") {
    return "delivered";
  }

  if (hasDraft) {
    return "editing";
  }

  if (progress.complete) {
    return "ready_to_generate";
  }

  return "awaiting_family";
}

export function getCaseStageLabel(stage: CaseWorkflowStage) {
  switch (stage) {
    case "awaiting_family":
      return "Awaiting family";
    case "ready_to_generate":
      return "Ready for draft";
    case "editing":
      return "Draft in progress";
    case "delivered":
      return "Delivered";
  }
}

export function getCaseStageTone(stage: CaseWorkflowStage) {
  switch (stage) {
    case "editing":
      return "success" as const;
    case "awaiting_family":
    case "ready_to_generate":
      return "warning" as const;
    case "delivered":
      return "default" as const;
  }
}

export function getCaseStageDescription(trackedCase: TrackedCase) {
  switch (trackedCase.stage) {
    case "awaiting_family":
      return trackedCase.progress.answered > 0
        ? "The family has started answering the intake."
        : "The questionnaire link is ready to send.";
    case "ready_to_generate":
      return "All required responses are in. The draft can be generated now.";
    case "editing":
      return trackedCase.editCount > 0
        ? "A draft exists and has already been edited."
        : "A draft exists and is ready for review.";
    case "delivered":
      return trackedCase.hasCompletedDraft
        ? "A delivered snapshot has been archived for this case."
        : "This case has been marked delivered.";
  }
}

export function buildCaseDashboardSummary(
  cases: TrackedCase[],
): CaseDashboardSummary {
  return cases.reduce<CaseDashboardSummary>(
    (summary, trackedCase) => {
      summary.total += 1;

      if (trackedCase.stage !== "delivered") {
        summary.active += 1;
      }

      switch (trackedCase.stage) {
        case "awaiting_family":
          summary.awaitingFamily += 1;
          break;
        case "ready_to_generate":
          summary.readyToGenerate += 1;
          break;
        case "editing":
          summary.editing += 1;
          break;
        case "delivered":
          summary.delivered += 1;
          break;
      }

      return summary;
    },
    {
      total: 0,
      active: 0,
      awaitingFamily: 0,
      readyToGenerate: 0,
      editing: 0,
      delivered: 0,
    },
  );
}

function pushActivity(
  feed: CaseActivity[],
  trackedCase: TrackedCase,
  at: string | null,
  label: string,
  detail: string,
) {
  if (!at) {
    return;
  }

  feed.push({
    caseId: trackedCase.caseId,
    label,
    detail,
    at,
  });
}

export function buildCaseActivityFeed(cases: TrackedCase[]) {
  const feed: CaseActivity[] = [];

  for (const trackedCase of cases) {
    const caseLabel = trackedCase.fullName ?? trackedCase.familyName;

    pushActivity(
      feed,
      trackedCase,
      trackedCase.completedAt,
      "Marked delivered",
      `${caseLabel} was archived as a delivered obituary.`,
    );
    pushActivity(
      feed,
      trackedCase,
      trackedCase.lastEditAt,
      "Draft edited",
      `${caseLabel} has fresh director changes.`,
    );
    pushActivity(
      feed,
      trackedCase,
      trackedCase.draftUpdatedAt,
      "Draft ready",
      `${caseLabel} has a generated obituary draft on file.`,
    );
    pushActivity(
      feed,
      trackedCase,
      trackedCase.lastResponseAt,
      trackedCase.progress.complete
        ? "Questionnaire completed"
        : "Questionnaire updated",
      trackedCase.progress.complete
        ? `${caseLabel} is ready for draft generation.`
        : `${caseLabel} has new family intake details.`,
    );
    pushActivity(
      feed,
      trackedCase,
      trackedCase.createdAt,
      "Case created",
      `${trackedCase.familyName} was opened in the workspace.`,
    );
  }

  return feed
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 12);
}
