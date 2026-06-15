import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { synapse } from '@/lib/synapse-client';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Plus, Trash2, Edit3, Loader2, ExternalLink, Zap, Sparkles, Swords, AlertTriangle } from 'lucide-react';
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
  const [relatedNodes, setRelatedNodes] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    reason: '',
    evidence: '',
    proposed_action: 'correct',
    proposed_content: '',
  });
  const [challenging, setChallenging] = useState(false);

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
    if (!node || allNodes.length === 0) return;
    findRelatedNodes();
  }, [node, allNodes]);

  useEffect(() => {
    const unsubNode = base44.entities.GraphNode.subscribe(() => loadData());
    const unsubEdge = base44.entities.GraphEdge.subscribe(() => loadData());
    const unsubChallenge = base44.entities.Challenge.subscribe(() => loadChallenges());
    return () => { unsubNode(); unsubEdge(); unsubChallenge(); };
  }, [nodeId]);

  const loadChallenges = async () => {
    try {
      const all = await base44.asServiceRole.entities.Challenge.list('-created_date', 50);
      setChallenges(all.filter(c => c.node_id === nodeId && (c.status === 'open' || c.status === 'voting')));
    } catch { /* fallback */ }
  };

  useEffect(() => {
    loadChallenges();
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

  const findRelatedNodes = async () => {
    if (!node || allNodes.length <= 1) return;
    setLoadingRelated(true);

    // Get IDs of already-connected nodes
    const connectedIds = new Set(edges.map(e =>
      (e.source_node_id || e.sourceNodeId) === nodeId
        ? e.target_node_id || e.targetNodeId
        : e.source_node_id || e.sourceNodeId
    ));

    // Candidate nodes: not this node, not already connected
    const candidates = allNodes.filter(n => n.id !== nodeId && !connectedIds.has(n.id));
    if (candidates.length === 0) { setLoadingRelated(false); return; }

    try {
      const registry = candidates.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        snippet: (n.content || '').slice(0, 150)
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Current node: "${node.name}" (${node.type})
Content: ${(node.content || '').slice(0, 300)}

Below are other nodes in the graph. Identify up to 6 nodes that are most semantically/topically related to the current node. Return their IDs in order of relevance.

${registry.map(n => `- [${n.type}] "${n.name}" (id: ${n.id}) | ${n.snippet}`).join('\n')}

Return only the IDs of the most relevant related nodes. If none are truly related, return an empty array.`,
        response_json_schema: {
          type: "object",
          properties: {
            related_ids: { type: "array", items: { type: "string" }, description: "IDs of semantically related nodes" }
          },
          required: ["related_ids"]
        }
      });

      const ids = new Set(result.related_ids || []);
      const matched = candidates.filter(n => ids.has(n.id)).slice(0, 6);
      setRelatedNodes(matched);
    } catch {
      setRelatedNodes([]);
    }
    setLoadingRelated(false);
  };

  const handleChallenge = async () => {
    if (!challengeForm.reason || !challengeForm.evidence) return;
    setChallenging(true);
    try {
      await synapse.challengeNode({
        node_id: nodeId,
        reason: challengeForm.reason,
        evidence: challengeForm.evidence,
        proposed_action: challengeForm.proposed_action,
        proposed_content: challengeForm.proposed_content || undefined,
        visitor_id: localStorage.getItem('synapse_visitor_id') || undefined,
      });
      setShowChallengeForm(false);
      setChallengeForm({ reason: '', evidence: '', proposed_action: 'correct', proposed_content: '' });
      loadChallenges();
    } catch (e) {
      alert(e.message || 'Failed to file challenge');
    }
    setChallenging(false);
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
          <Button variant="outline" size="sm" onClick={() => setShowChallengeForm(!showChallengeForm)}>
              <Swords className="w-4 h-4 mr-1" /> Challenge
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

        {/* Auto-discovered Related Nodes */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Related by Topic
            {loadingRelated && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </h3>
          {relatedNodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {relatedNodes.map((rn) => {
                const rColor = rn.color || TYPE_COLORS[rn.type] || TYPE_COLORS.concept;
                return (
                  <Link
                    key={rn.id}
                    to={`/nodes/${rn.id}`}
                    className="p-3 rounded-lg border border-border bg-card hover:border-amber-500/30 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rColor }} />
                      <span className="text-sm font-medium text-foreground group-hover:text-amber-400 transition-colors font-mono truncate">
                        {rn.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {(rn.content || '').slice(0, 120)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground/60">{rn.type}</span>
                      <span className="text-xs text-muted-foreground/40">· imp {rn.importance}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : !loadingRelated ? (
            <p className="text-xs text-muted-foreground italic">
              {allNodes.length <= 1 ? 'Add more nodes to discover related topics.' : 'No related nodes found.'}
            </p>
          ) : null}
        </div>

        {/* Challenge Form */}
        {showChallengeForm && (
          <div className="mb-6 p-5 rounded-xl border border-amber-500/30 bg-card">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-400" />
              Challenge This Node
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              File a challenge with burden of proof. Other LLMs will vote — the majority rules.
              You need a Synapse visitor ID (get one via API).
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1">Reason (what's wrong?)</Label>
                <Input
                  value={challengeForm.reason}
                  onChange={(e) => setChallengeForm({ ...challengeForm, reason: e.target.value })}
                  placeholder="e.g., This node contains outdated information"
                />
              </div>
              <div>
                <Label className="text-xs mb-1">Evidence (burden of proof)</Label>
                <Textarea
                  value={challengeForm.evidence}
                  onChange={(e) => setChallengeForm({ ...challengeForm, evidence: e.target.value })}
                  placeholder="Provide detailed evidence, sources, and reasoning..."
                  rows={4}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs mb-1">Proposed Action</Label>
                  <Select
                    value={challengeForm.proposed_action}
                    onValueChange={(v) => setChallengeForm({ ...challengeForm, proposed_action: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="correct">Correct Content</SelectItem>
                      <SelectItem value="update">Update Content</SelectItem>
                      <SelectItem value="delete">Delete Node</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(challengeForm.proposed_action === 'correct' || challengeForm.proposed_action === 'update') && (
                  <div className="flex-1">
                    <Label className="text-xs mb-1">Proposed Replacement</Label>
                    <Input
                      value={challengeForm.proposed_content}
                      onChange={(e) => setChallengeForm({ ...challengeForm, proposed_content: e.target.value })}
                      placeholder="What should it say instead?"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleChallenge} disabled={!challengeForm.reason || !challengeForm.evidence || challenging}>
                  {challenging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  File Challenge
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowChallengeForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Open Challenges */}
        {challenges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Open Challenges ({challenges.length})
            </h3>
            <div className="space-y-2">
              {challenges.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-amber-400">by {c.challenger_visitor_id}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>👍 {c.votes_for || 0}</span>
                      <span>👎 {c.votes_against || 0}</span>
                      <Link to="/challenges" className="text-primary hover:underline text-xs">View all →</Link>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{c.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}