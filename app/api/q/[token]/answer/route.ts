import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCaseByToken, getResponsesByCaseId, rowsToAnswerMap } from "@/lib/db/queries";
import { assertValidAnswer, getQuestionnaireProgress, nextQuestion } from "@/lib/questions/engine";

const requestSchema = z.object({
  questionKey: z.string().min(1),
  answer: z.string(),
});

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const parsed = requestSchema.parse(await request.json());
    const caseRecord = await getCaseByToken(token);

    if (!caseRecord) {
      return NextResponse.json({ error: "Invalid questionnaire link." }, { status: 404 });
    }

    const responses = await getResponsesByCaseId(caseRecord.id);
    const answers = rowsToAnswerMap(responses);
    const currentQuestion = nextQuestion(answers);

    if (!currentQuestion) {
      return NextResponse.json({
        done: true,
        nextQuestion: null,
        progress: getQuestionnaireProgress(answers),
      });
    }

    if (currentQuestion.key !== parsed.questionKey) {
      return NextResponse.json(
        { error: "That answer is out of sequence for this questionnaire." },
        { status: 409 },
      );
    }

    const question = assertValidAnswer(parsed.questionKey, parsed.answer);
    const normalizedAnswer = question.optional ? parsed.answer.trim() : parsed.answer.trim();
    const admin = createAdminSupabaseClient();

    const { error: upsertError } = await admin
      .from("questionnaire_responses")
      .upsert(
        {
          case_id: caseRecord.id,
          question_key: parsed.questionKey,
          answer: normalizedAnswer,
        },
        {
          onConflict: "case_id,question_key",
        },
      );

    if (upsertError) {
      throw upsertError;
    }

    const updatedAnswers = {
      ...answers,
      [parsed.questionKey]: normalizedAnswer,
    };
    const progress = getQuestionnaireProgress(updatedAnswers);
    const upcomingQuestion = nextQuestion(updatedAnswers);

    if (progress.complete && caseRecord.status !== "delivered") {
      const { error: statusError } = await admin
        .from("cases")
        .update({ status: "draft_ready" })
        .eq("id", caseRecord.id);

      if (statusError) {
        throw statusError;
      }
    }

    return NextResponse.json({
      done: progress.complete,
      nextQuestion: upcomingQuestion,
      progress,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save the answer.",
      },
      { status: 400 },
    );
  }
}
