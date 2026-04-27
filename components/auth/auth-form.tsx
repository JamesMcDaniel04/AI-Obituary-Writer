"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthFormProps = {
  nextPath?: string;
};

export function AuthForm({ nextPath = "/dashboard" }: AuthFormProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const runAction = (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await action();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Something went wrong.",
        );
      } finally {
        setPending(false);
      }
    });
  };

  const authCallbackUrl =
    typeof window === "undefined"
      ? "/auth/callback"
      : `${window.location.origin}/auth/callback`;

  return (
    <div className="panel fade-up w-full rounded-[2rem] p-8 shadow-[0_24px_70px_rgba(75,42,25,0.12)]">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          Director Access
        </p>
        <h1 className="font-serif text-4xl text-foreground">
          Write a first draft while the details are still fresh.
        </h1>
        <p className="text-sm leading-7 text-muted">
          Directors log in, send one secure questionnaire link, and receive a
          draft ready for review.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Email</span>
          <Input
            autoComplete="email"
            placeholder="director@chapel.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Password</span>
          <Input
            autoComplete="current-password"
            placeholder="At least 6 characters"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>

      {(error || message) && (
        <div
          className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
            error
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            runAction(async () => {
              const { error: signInError } =
                await supabase.auth.signInWithPassword({
                  email,
                  password,
                });

              if (signInError) {
                throw signInError;
              }

              router.replace(nextPath);
              router.refresh();
            })
          }
        >
          {pending ? "Working..." : "Sign in"}
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              runAction(async () => {
                const { error: signUpError } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    emailRedirectTo: authCallbackUrl,
                  },
                });

                if (signUpError) {
                  throw signUpError;
                }

                setMessage(
                  "Account created. If email confirmation is enabled, check your inbox next.",
                );
              })
            }
          >
            Create account
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              runAction(async () => {
                const { error: otpError } = await supabase.auth.signInWithOtp({
                  email,
                  options: {
                    emailRedirectTo: authCallbackUrl,
                  },
                });

                if (otpError) {
                  throw otpError;
                }

                setMessage("Magic link sent. Check your inbox.");
              })
            }
          >
            Email magic link
          </Button>
        </div>
      </div>
    </div>
  );
}
