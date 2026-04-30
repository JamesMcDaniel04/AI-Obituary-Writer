import { FileClock, FilePenLine, FileStack, Send } from "lucide-react";
import type { CaseDashboardSummary } from "@/lib/cases/tracking";
import { Card } from "@/components/ui/card";

type DashboardMetricsProps = {
  summary: CaseDashboardSummary;
};

const metricCards = [
  {
    key: "active",
    label: "Active cases",
    icon: FileStack,
    field: "active",
  },
  {
    key: "awaitingFamily",
    label: "Awaiting family",
    icon: Send,
    field: "awaitingFamily",
  },
  {
    key: "readyToGenerate",
    label: "Ready for draft",
    icon: FileClock,
    field: "readyToGenerate",
  },
  {
    key: "editing",
    label: "In editing",
    icon: FilePenLine,
    field: "editing",
  },
] as const;

export function DashboardMetrics({ summary }: DashboardMetricsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon;

        return (
          <Card
            key={metric.key}
            className="fade-up rounded-[1.75rem] bg-white/82 p-6 md:p-7"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted">
              {metric.label}
            </p>
            <p className="mt-2 font-serif text-4xl leading-none text-foreground">
              {summary[metric.field]}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
