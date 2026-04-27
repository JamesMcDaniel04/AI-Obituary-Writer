import Link from "next/link";

export default function QuestionnaireDonePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="panel fade-up shell max-w-xl rounded-[2rem] p-10 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          Thank you
        </p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">
          Your answers have been saved.
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          The funeral director can now review your responses and prepare the
          obituary draft.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-white"
        >
          Close this page
        </Link>
      </section>
    </main>
  );
}
