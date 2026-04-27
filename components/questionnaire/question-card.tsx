"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionPayload } from "@/lib/questions/definitions";

type QuestionCardProps = {
  question: QuestionPayload;
  pending?: boolean;
  onSubmit: (answer: string) => void;
};

export function QuestionCard({
  question,
  pending = false,
  onSubmit,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState("");

  if (question.type === "choice") {
    return (
      <div className="panel fade-up rounded-[2rem] p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          Family questionnaire
        </p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">
          {question.prompt}
        </h2>
        <div className="mt-8 grid gap-3">
          {question.options?.map((option) => (
            <Button
              key={option}
              variant="secondary"
              className="justify-start rounded-[1.5rem] px-6 py-5 text-left capitalize"
              disabled={pending}
              onClick={() => onSubmit(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel fade-up rounded-[2rem] p-8">
      <p className="text-sm uppercase tracking-[0.24em] text-muted">
        Family questionnaire
      </p>
      <h2 className="mt-3 font-serif text-4xl leading-tight text-foreground">
        {question.prompt}
      </h2>
      <div className="mt-8">
        {question.type === "longtext" ? (
          <Textarea
            autoFocus
            placeholder={question.placeholder}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        ) : (
          <Input
            autoFocus
            placeholder={question.placeholder}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => onSubmit(answer)}>
          {pending ? "Saving..." : "Continue"}
        </Button>
        {question.optional ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => onSubmit("")}
          >
            Skip this
          </Button>
        ) : null}
      </div>
    </div>
  );
}
