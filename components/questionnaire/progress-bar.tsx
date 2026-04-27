type ProgressBarProps = {
  answered: number;
  total: number;
};

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const percentage = Math.min(100, (answered / safeTotal) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
        <span>
          {Math.min(answered + 1, safeTotal)} of {safeTotal}
        </span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-accent-soft">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
