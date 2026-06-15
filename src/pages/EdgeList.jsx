import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { synapse } from '@/lib/synapse-client';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Trash2, Loader2, ExternalLink } from 'lucide-react';

const RELATIONSHIP_LABELS = {
  relates_to: 'Relates To',
  builds_on: 'Builds On',
  contradicts: 'Contradicts',
  exemplifies: 'Exemplifies',
  leads_to: 'Leads To',
  contains: 'Contains',
  inspires: 'Inspires',
  derives_from: 'Derives From',
  depends_on: 'Depends On',
  generalizes: 'Generalizes',
  specializes: 'Specializes',
  references: 'References',
  questions: 'Questions',
  answers: 'Answers',
  custom: 'Custom',
};

export default function EdgeList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [edges, setEdges] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const data = await synapse.listAll();
    setEdges(data.edges || []);
    setNodes(data.nodes || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubNode = base44.entities.GraphNode.subscribe(() => loadData());
    const unsubEdge = base44.entities.GraphEdge.subscribe(() => loadData());
    return () => { unsubNode(); unsubEdge(); };
  }, []);

  const getNodeName = (id) => {
    const node = nodes.find((n) => n.id === id);
    return node ? node.name : 'Unknown Node';
  };

  const handleDelete = async (edgeId) => {
    await synapse.deleteEdge(edgeId);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground font-heading">All Edges ({edges.length})</h2>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-2">
          {edges.map((edge) => {
            const sId = edge.source_node_id || edge.sourceNodeId;
            const tId = edge.target_node_id || edge.targetNodeId;
            return (
              <div key={edge.id} className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link to={`/nodes/${sId}`} className="text-sm text-primary hover:underline font-mono flex items-center gap-1">
                    {getNodeName(sId)}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                    {RELATIONSHIP_LABELS[edge.relationship_type] || edge.relationship_type}
                  </span>
                  <Link to={`/nodes/${tId}`} className="text-sm text-secondary hover:underline font-mono flex items-center gap-1">
                    {getNodeName(tId)}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">strength: {edge.strength}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(edge.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {edges.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No edges yet. Create connections from node detail pages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}