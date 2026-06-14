import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { synapse } from '@/lib/synapse-client';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TYPE_COLORS = {
  concept: '#4F8CF7',
  fact: '#34D399',
  insight: '#A78BFA',
  quote: '#FBBF24',
  question: '#F472B6',
  person: '#38BDF8',
  event: '#FB923C',
  tool: '#94A3B8',
  custom: '#94A3B8',
};

export default function NodeList() {
  const [nodes, setNodes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    synapse.listNodes().then((data) => {
      setNodes(data.nodes || []);
      setLoading(false);
    });
  }, []);

  const filtered = nodes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.name?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.type?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground font-heading">All Nodes ({nodes.length})</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="pl-9 font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((node) => {
            const color = node.color || TYPE_COLORS[node.type] || TYPE_COLORS.concept;
            return (
              <Link
                key={node.id}
                to={`/nodes/${node.id}`}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className="font-semibold text-foreground text-sm font-heading group-hover:text-primary transition-colors">
                      {node.name}
                    </h3>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {node.content && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 font-mono">
                    {node.content}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs border border-border" style={{ borderColor: color + '40', color }}>
                    {node.type}
                  </span>
                  <span className="text-xs text-muted-foreground">imp: {node.importance}</span>
                </div>
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {search.trim() ? 'No nodes match your search.' : 'No nodes yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}