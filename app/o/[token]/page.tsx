import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCompletedDraftByDeliveryToken } from "@/lib/db/queries";
import { htmlToText } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ObituaryPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function buildPreviewSnippet(content: string) {
  const text = htmlToText(content).replaceAll(/\s+/g, " ").trim();
  if (text.length <= 200) return text;
  return `${text.slice(0, 200).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: ObituaryPageProps): Promise<Metadata> {
  const { token } = await params;
  const view = await getCompletedDraftByDeliveryToken(token).catch(() => null);

  if (!view) {
    return {
      title: "Obituary",
      robots: { index: false, follow: false, nocache: true },
    };
  }

  const title = view.branding?.organization_name
    ? `${view.fullName} — ${view.branding.organization_name}`
    : `${view.fullName} — Obituary`;
  const description = buildPreviewSnippet(view.completed.content);

  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: view.branding?.organization_name ?? undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicObituaryPage({
  params,
}: Readonly<ObituaryPageProps>) {
  const { token } = await params;
  const view = await getCompletedDraftByDeliveryToken(token);

  if (!view) {
    notFound();
  }

  const { case: caseRecord, completed, fullName, branding } = view;

  return (
    <div className="min-h-screen bg-[#fffdf9] py-12 text-foreground">
      <article className="mx-auto w-full max-w-2xl px-6">
        <header className="flex flex-col items-center gap-3 pb-10 text-center">
          {branding?.logo_url ? (
            <Image
              src={branding.logo_url}
              alt={branding.organization_name ?? "Funeral home logo"}
              width={140}
              height={56}
              unoptimized
              className="max-h-14 w-auto object-contain"
            />
          ) : null}
          {branding?.organization_name ? (
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              {branding.organization_name}
            </p>
          ) : null}
        </header>

        <section className="text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Obituary
          </p>
          <h1 className="mt-4 font-serif text-4xl text-foreground md:text-5xl">
            {fullName}
          </h1>
          <div className="mx-auto mt-6 h-px w-24 bg-accent/40" />
        </section>

        <section
          className="editor-content mt-10 font-serif text-lg leading-8 text-foreground"
          dangerouslySetInnerHTML={{ __html: completed.content }}
        />

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted">
          <span>
            {caseRecord.family_name} family
          </span>
          <a
            href={`/o/${token}/pdf`}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/30"
          >
            Download PDF
          </a>
        </footer>
      </article>
    </div>
  );
}
