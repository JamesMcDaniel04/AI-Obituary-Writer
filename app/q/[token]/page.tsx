import { notFound, redirect } from "next/navigation";
import { QuestionnaireFlow } from "@/components/questionnaire/questionnaire-flow";
import {
  getBrandingForCaseToken,
  getCaseByToken,
  getResponsesByCaseIdAdmin,
  rowsToAnswerMap,
} from "@/lib/db/queries";
import { getQuestionnaireProgress, nextQuestion } from "@/lib/questions/engine";

export const dynamic = "force-dynamic";

type QuestionnairePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function QuestionnairePage({
  params,
}: Readonly<QuestionnairePageProps>) {
  const { token } = await params;
  const caseRecord = await getCaseByToken(token);

  if (!caseRecord) {
    notFound();
  }

  const responses = await getResponsesByCaseIdAdmin(caseRecord.id);
  const answers = rowsToAnswerMap(responses);
  const currentQuestion = nextQuestion(answers);

  if (!currentQuestion) {
    redirect(`/q/${token}/done`);
  }

  const progress = getQuestionnaireProgress(answers);
  const branding = await getBrandingForCaseToken(token);

  return (
    <QuestionnaireFlow
      token={token}
      familyName={caseRecord.family_name}
      initialQuestion={currentQuestion}
      initialProgress={progress}
      branding={
        branding
          ? {
              organizationName: branding.organization_name,
              logoUrl: branding.logo_url,
            }
          : null
      }
    />
  );
}
