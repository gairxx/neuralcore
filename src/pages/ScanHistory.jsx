import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { History, Globe, Loader2, Radar } from 'lucide-react';

export default function ScanHistory() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await base44.entities.SiteScan.list('-updated_date', 100);
        setScans(results);
      } catch { /* */ }
      setLoading(false);
    };
    load();
    const unsub = base44.entities.SiteScan.subscribe(() => load());
    return unsub;
  }, []);

  const scoreColor = (score) => score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground font-heading">Scan History</h1>
        </div>
        {scans.length === 0 ? (
          <div className="text-center py-20">
            <Radar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No scans yet. Run your first scan from the home page.</p>
            <button onClick={() => navigate('/')} className="mt-3 text-sm text-primary hover:underline">Go to Scanner</button>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <button
                key={scan.id}
                onClick={() => navigate(`/?scan=${scan.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{scan.title || scan.domain}</p>
                  <p className="text-xs text-muted-foreground truncate">{scan.domain}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-bold ${scoreColor(scan.overall_score)}`}>{scan.overall_score}</p>
                  <p className="text-xs text-muted-foreground">{new Date(scan.updated_date || scan.created_date).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}