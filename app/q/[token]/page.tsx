import { notFound, redirect } from "next/navigation";
import { QuestionnaireFlow } from "@/components/questionnaire/questionnaire-flow";
import { getCaseByToken, getResponsesByCaseId, rowsToAnswerMap } from "@/lib/db/queries";
import { getQuestionnaireProgress, nextQuestion } from "@/lib/questions/engine";

export const dynamic = "force-dynamic";

type QuestionnairePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function QuestionnairePage({
  params,
}: QuestionnairePageProps) {
  const { token } = await params;
  const caseRecord = await getCaseByToken(token);

  if (!caseRecord) {
    notFound();
  }

  const responses = await getResponsesByCaseId(caseRecord.id);
  const answers = rowsToAnswerMap(responses);
  const currentQuestion = nextQuestion(answers);

  if (!currentQuestion) {
    redirect(`/q/${token}/done`);
  }

  const progress = getQuestionnaireProgress(answers);

  return (
    <QuestionnaireFlow
      token={token}
      familyName={caseRecord.family_name}
      initialQuestion={currentQuestion}
      initialProgress={progress}
    />
  );
}
