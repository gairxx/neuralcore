import ScoreGrid from './ScoreGrid';
import PriorityFixes from './PriorityFixes';
import FileDetection from './FileDetection';
import MarkdownPreview from './MarkdownPreview';
import { Globe, Clock } from 'lucide-react';

export default function ScanResults({ scan }) {
  return (
    <div className="space-y-4">
      {/* Site header */}
      <div className="p-5 rounded-xl border border-border bg-card flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{scan.title || scan.domain}</h2>
          <a href={scan.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
            {scan.url}
          </a>
          {scan.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{scan.description}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(scan.updated_date || scan.created_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      <ScoreGrid scan={scan} />
      <PriorityFixes scan={scan} />
      <FileDetection scan={scan} />
      <MarkdownPreview scan={scan} />
    </div>
  );
}