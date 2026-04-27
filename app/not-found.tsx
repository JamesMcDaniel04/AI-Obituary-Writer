import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="panel fade-up shell max-w-xl rounded-[2rem] p-10 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          Not Found
        </p>
        <h1 className="mt-4 font-serif text-4xl text-foreground">
          That page no longer has a live case behind it.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          The questionnaire link may have been copied incorrectly, or the case
          is not available to this account.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
