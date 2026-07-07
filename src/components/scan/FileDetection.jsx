import { Check, X, FileText, ExternalLink } from 'lucide-react';

const FILES = [
  { key: 'has_robots_txt', label: 'robots.txt' },
  { key: 'has_llms_txt', label: 'llms.txt' },
  { key: 'has_llms_full_txt', label: 'llms-full.txt' },
  { key: 'has_agents_json', label: 'agents.json' },
  { key: 'has_mcp_json', label: 'mcp.json' },
  { key: 'has_sitemap', label: 'sitemap.xml' },
  { key: 'has_markdown_alternate', label: 'Markdown alternate' },
];

export default function FileDetection({ scan }) {
  let docs = [];
  try { docs = JSON.parse(scan.detected_docs || '[]'); } catch { /* */ }
  const docUrls = {};
  docs.forEach(d => { docUrls[d.name] = d.url; });

  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">Discovery Files</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FILES.map((file) => {
          const found = scan[file.key];
          const url = docUrls[file.label];
          return (
            <div key={file.key} className={`flex items-center gap-2 p-2.5 rounded-lg border ${found ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-muted/30'}`}>
              {found ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${found ? 'text-foreground' : 'text-muted-foreground'}`}>{file.label}</span>
              {found && url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
      {scan.mcp_endpoints && scan.mcp_endpoints !== '[]' && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">MCP Endpoints</p>
          {JSON.parse(scan.mcp_endpoints).map((ep, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-mono text-foreground truncate">{ep}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}