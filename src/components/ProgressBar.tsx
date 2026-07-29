export function ProgressBar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">
          {value} / {target} {unit}
          <span className="ml-1.5 font-medium text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
