import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

const SEVERITY_CONFIG = {
  high: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'High' },
  medium: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Low' },
};

export default function PriorityFixes({ scan }) {
  let fixes = [];
  try { fixes = JSON.parse(scan.priority_fixes || '[]'); } catch { /* */ }
  if (fixes.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Priority Fixes</h3>
        <p className="text-sm text-emerald-400">No issues detected — this site is AI-ready!</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">Priority Fixes</h3>
      <div className="space-y-3">
        {fixes.map((fix, i) => {
          const cfg = SEVERITY_CONFIG[fix.severity] || SEVERITY_CONFIG.low;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`p-3 rounded-lg border ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{cfg.label}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5">{fix.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fix.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}