import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';

export default function MarkdownPreview({ scan }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const content = scan.markdown_content || '';
  const preview = expanded ? content : content.slice(0, 2000);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content) return null;

  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Cached Markdown
        </h3>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs text-muted-foreground font-mono bg-muted/50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">{preview}</pre>
      {content.length > 2000 && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-primary hover:underline">
          {expanded ? 'Show less' : `Show all (${content.length.toLocaleString()} chars)`}
        </button>
      )}
    </div>
  );
}