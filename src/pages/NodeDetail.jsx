import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { synapse } from '@/lib/synapse-client';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Plus, Trash2, Edit3, Loader2, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function NodeDetail() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [node, setNode] = useState(null);
  const [edges, setEdges] = useState([]);
  const [allNodes, setAllNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [edgeForm, setEdgeForm] = useState({
    target_node_id: '',
    relationship_type: 'relates_to',
    strength: 5,
    description: '',
  });
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [nodeData, allData] = await Promise.all([
      synapse.getNode(nodeId),
      synapse.listAll(),
    ]);
    if (nodeData.node) {
      setNode(nodeData.node);
      setEdges(nodeData.edges || []);
    }
    setAllNodes(allData.nodes || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [nodeId]);

  useEffect(() => {
    const unsubNode = base44.entities.GraphNode.subscribe(() => loadData());
    const unsubEdge = base44.entities.GraphEdge.subscribe(() => loadData());
    return () => { unsubNode(); unsubEdge(); };
  }, [nodeId]);

  const handleAddEdge = async () => {
    if (!edgeForm.target_node_id) return;
    await synapse.createEdge({
      source_node_id: nodeId,
      target_node_id: edgeForm.target_node_id,
      relationship_type: edgeForm.relationship_type,
      strength: edgeForm.strength,
      description: edgeForm.description,
    });
    setShowAddEdge(false);
    setEdgeForm({ target_node_id: '', relationship_type: 'relates_to', strength: 5, description: '' });
    loadData();
  };

  const handleDeleteEdge = async (edgeId) => {
    await synapse.deleteEdge(edgeId);
    loadData();
  };

  const handleDeleteNode = async () => {
    if (!confirm('Delete this node and all its edges?')) return;
    setDeleting(true);
    await synapse.deleteNode(nodeId);
    navigate('/');
  };

  const getConnectedNode = (edge) => {
    const otherId =
      (edge.source_node_id || edge.sourceNodeId) === nodeId
        ? edge.target_node_id || edge.targetNodeId
        : edge.source_node_id || edge.sourceNodeId;
    return allNodes.find((n) => n.id === otherId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Node not found</p>
          <Link to="/">
            <Button variant="link" className="mt-2">Back to Graph</Button>
          </Link>
        </div>
      </div>
    );
  }

  const nodeColor = node.color || TYPE_COLORS[node.type] || TYPE_COLORS.concept;
  const inboundEdges = edges.filter(
    (e) => (e.target_node_id || e.targetNodeId) === nodeId
  );
  const outboundEdges = edges.filter(
    (e) => (e.source_node_id || e.sourceNodeId) === nodeId
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: nodeColor }}
              />
              <h2 className="text-lg font-semibold text-foreground font-heading">{node.name}</h2>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {node.type} · importance {node.importance}/10
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddEdge(!showAddEdge)}>
            <Plus className="w-4 h-4 mr-1" /> Add Connection
          </Button>
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={handleDeleteNode} disabled={deleting}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Node Content Card */}
        <div className="mb-6 p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: nodeColor }} />
            <h3 className="font-semibold text-foreground">Content</h3>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
            {node.content || 'No content stored.'}
          </div>
          {node.properties && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Properties (metadata):</p>
              <pre className="text-xs text-foreground font-mono bg-muted p-3 rounded-lg overflow-x-auto">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(node.properties), null, 2);
                  } catch {
                    return node.properties;
                  }
                })()}
              </pre>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs border border-border" style={{ borderColor: nodeColor + '40', color: nodeColor }}>
              {node.type}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
              importance: {node.importance}/10
            </span>
            {node.referrer && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono" title={node.referrer}>
                ← {(() => { try { return new URL(node.referrer).hostname; } catch { return node.referrer; } })()}
              </span>
            )}
          </div>
        </div>

        {/* Add Edge Form */}
        {showAddEdge && (
          <div className="mb-6 p-5 rounded-xl border border-primary/30 bg-card">
            <h3 className="font-semibold text-foreground mb-4">New Connection</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">From: {node.name}</Label>
              </div>
              <div>
                <Label className="text-xs mb-1">To Node</Label>
                <Select
                  value={edgeForm.target_node_id}
                  onValueChange={(v) => setEdgeForm({ ...edgeForm, target_node_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target node" />
                  </SelectTrigger>
                  <SelectContent>
                    {allNodes
                      .filter((n) => n.id !== nodeId)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Relationship</Label>
                <Select
                  value={edgeForm.relationship_type}
                  onValueChange={(v) => setEdgeForm({ ...edgeForm, relationship_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Strength ({edgeForm.strength}/10)</Label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={edgeForm.strength}
                  onChange={(e) => setEdgeForm({ ...edgeForm, strength: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-xs mb-1">Description (optional)</Label>
                <Input
                  value={edgeForm.description}
                  onChange={(e) => setEdgeForm({ ...edgeForm, description: e.target.value })}
                  placeholder="Why are these connected?"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddEdge} disabled={!edgeForm.target_node_id}>
                  Create Connection
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddEdge(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Connections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outbound */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: nodeColor }} />
              Outbound ({outboundEdges.length})
            </h3>
            <div className="space-y-2">
              {outboundEdges.map((edge) => {
                const target = getConnectedNode(edge);
                return (
                  <div key={edge.id} className="p-3 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                          {RELATIONSHIP_LABELS[edge.relationship_type] || edge.relationship_type}
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                        {target ? (
                          <Link to={`/nodes/${target.id}`} className="text-sm text-foreground hover:text-primary flex items-center gap-1 font-mono">
                            {target.name}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground italic font-mono">Orphan node</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">str {edge.strength}</span>
                        {isAdmin && (
                          <button onClick={() => handleDeleteEdge(edge.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {edge.description && (
                      <p className="text-xs text-muted-foreground mt-1">{edge.description}</p>
                    )}
                    {edge.referrer && (
                      <p className="text-xs text-emerald-400/60 mt-1 font-mono" title={edge.referrer}>
                        ← {(() => { try { return new URL(edge.referrer).hostname; } catch { return edge.referrer; } })()}
                      </p>
                    )}
                  </div>
                );
              })}
              {outboundEdges.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No outgoing connections</p>
              )}
            </div>
          </div>

          {/* Inbound */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: nodeColor, opacity: 0.5 }} />
              Inbound ({inboundEdges.length})
            </h3>
            <div className="space-y-2">
              {inboundEdges.map((edge) => {
                const source = getConnectedNode(edge);
                return (
                  <div key={edge.id} className="p-3 rounded-lg border border-border bg-card hover:border-secondary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {source ? (
                          <Link to={`/nodes/${source.id}`} className="text-sm text-foreground hover:text-secondary flex items-center gap-1 font-mono">
                            {source.name}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground italic font-mono">Orphan node</span>
                        )}
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-mono">
                          {RELATIONSHIP_LABELS[edge.relationship_type] || edge.relationship_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">str {edge.strength}</span>
                        {isAdmin && (
                          <button onClick={() => handleDeleteEdge(edge.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {edge.description && (
                      <p className="text-xs text-muted-foreground mt-1">{edge.description}</p>
                    )}
                    {edge.referrer && (
                      <p className="text-xs text-emerald-400/60 mt-1 font-mono" title={edge.referrer}>
                        ← {(() => { try { return new URL(edge.referrer).hostname; } catch { return edge.referrer; } })()}
                      </p>
                    )}
                  </div>
                );
              })}
              {inboundEdges.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No incoming connections</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}