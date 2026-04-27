"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuestionCard } from "@/components/questionnaire/question-card";
import { ProgressBar } from "@/components/questionnaire/progress-bar";
import type { QuestionPayload } from "@/lib/questions/definitions";

type QuestionnaireFlowProps = {
  token: string;
  familyName: string;
  initialQuestion: QuestionPayload;
  initialProgress: {
    answered: number;
    total: number;
  };
};

type ApiResponse = {
  done: boolean;
  nextQuestion: QuestionPayload | null;
  progress: {
    answered: number;
    total: number;
    complete: boolean;
  };
  error?: string;
};

export function QuestionnaireFlow({
  token,
  familyName,
  initialQuestion,
  initialProgress,
}: QuestionnaireFlowProps) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitAnswer = (answer: string) => {
    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/q/${token}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionKey: question.key,
          answer,
        }),
      });

      const body = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(body.error ?? "We could not save that answer.");
        return;
      }

      if (body.done || !body.nextQuestion) {
        router.replace(`/q/${token}/done`);
        router.refresh();
        return;
      }

      setQuestion(body.nextQuestion);
      setProgress(body.progress);
    });
  };

  return (
    <div className="shell grid min-h-screen gap-8 px-4 py-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-6 md:py-16">
      <aside className="flex flex-col justify-between rounded-[2.25rem] bg-[linear-gradient(160deg,rgba(143,81,48,0.98),rgba(62,34,24,0.94))] p-8 text-white shadow-[0_40px_80px_rgba(62,34,24,0.28)]">
        <div>
          <p className="text-sm uppercase tracking-[0.26em] text-white/70">
            {familyName}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-tight">
            Help us tell their story with care and accuracy.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/78">
            We will ask one question at a time. Your answers go directly to the
            funeral director preparing the obituary draft.
          </p>
        </div>
        <div className="mt-10 rounded-[1.75rem] bg-white/12 p-5">
          <ProgressBar answered={progress.answered} total={progress.total} />
        </div>
      </aside>

      <div className="flex items-center">
        <div className="w-full">
          <QuestionCard
            key={question.key}
            question={question}
            pending={isPending}
            onSubmit={submitAnswer}
          />
          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
