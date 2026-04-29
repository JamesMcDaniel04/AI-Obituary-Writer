type ProgressBarProps = {
  answered: number;
  total: number;
};

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const currentStep = Math.min(answered + 1, safeTotal);
  const percentage = Math.min(100, (answered / safeTotal) * 100);
  const segmentWidth = `calc((100% - ${(safeTotal - 1) * 6}px) / ${safeTotal})`;

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.26em] text-white/58">
            Story progress
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-serif text-4xl leading-none tabular-nums text-white/96">
              {String(currentStep).padStart(2, "0")}
            </span>
            <span className="pb-1 text-sm uppercase tracking-[0.2em] text-white/60">
              of {safeTotal}
            </span>
          </div>
        </div>

        <div className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/50">
            Complete
          </p>
          <p className="mt-1 text-lg font-medium tabular-nums text-white/92">
            {Math.round(percentage)}%
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div
          className="relative h-4 overflow-hidden rounded-full border border-white/10 bg-[rgba(255,244,235,0.09)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-8px_18px_rgba(38,20,12,0.16)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={safeTotal}
          aria-valuenow={answered}
          aria-label={`Question ${currentStep} of ${safeTotal}`}
        >
          <div className="absolute inset-y-[3px] left-[3px] right-[3px] flex items-center justify-between">
            {Array.from({ length: safeTotal }).map((_, index) => (
              <span
                key={`${safeTotal}-${index}`}
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  index < answered ? "bg-white/18" : "bg-white/8"
                }`}
                style={{ width: segmentWidth }}
              />
            ))}
          </div>

          <div
            className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          >
            <div className="relative h-full w-full rounded-full bg-[linear-gradient(90deg,#f7d2ad_0%,#efb785_46%,#d67a4a_100%)] shadow-[0_0_30px_rgba(243,182,129,0.28)]">
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 10%, rgba(255,255,255,0.08) 34%, rgba(255,255,255,0.48) 50%, rgba(255,255,255,0.08) 66%, transparent 90%)",
                  backgroundSize: "200% 100%",
                  animation: "progress-shimmer 2.8s linear infinite",
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[0.68rem] uppercase tracking-[0.22em] text-white/46">
          <span>Beginning</span>
          <span>Ready</span>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-white/10 bg-black/8 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <p className="text-sm leading-6 text-white/74">
          One clear question at a time, with each answer moving the obituary
          draft forward.
        </p>
      </div>
    </div>
  );
}
