import ScoreGauge from './ScoreGauge';

export default function ScoreGrid({ scan }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <h3 className="text-sm font-semibold text-foreground mb-5">Machine Readiness</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreGauge label="Overall" score={scan.overall_score} />
        <ScoreGauge label="Readable" score={scan.readable_score} />
        <ScoreGauge label="Callable" score={scan.callable_score} />
        <ScoreGauge label="Commerce" score={scan.commerce_score} />
        <ScoreGauge label="Payment" score={scan.payment_score} />
      </div>
    </div>
  );
}