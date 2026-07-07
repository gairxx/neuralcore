export default function ScoreGauge({ label, score, max = 100 }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(score / max, 1);
  const dashOffset = circumference * (1 - percentage);
  const color = score >= 70 ? '#34D399' : score >= 40 ? '#FBBF24' : '#F87171';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1.5 font-medium">{label}</span>
    </div>
  );
}