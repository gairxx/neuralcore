import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Swords, AlertTriangle, CheckCircle, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

const ACTION_LABELS = {
  delete: 'Delete node',
  update: 'Update content',
  correct: 'Correct content',
};

export default function ChallengeList() {
  const [challenges, setChallenges] = useState([]);
  const [nodes, setNodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('voting');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allChallenges, allNodes] = await Promise.all([
        base44.asServiceRole.entities.Challenge.list('-created_date', 100),
        base44.asServiceRole.entities.GraphNode.list(),
      ]);
      const nodeMap = {};
      allNodes.forEach(n => { nodeMap[n.id] = n.name; });
      setNodes(nodeMap);

      const filtered = statusFilter === 'all'
        ? allChallenges
        : allChallenges.filter(c => c.status === statusFilter);
      setChallenges(filtered);
    } catch { /* fallback */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  useEffect(() => {
    const unsub = base44.entities.Challenge.subscribe(() => loadData());
    return () => unsub();
  }, [statusFilter]);

  const statusBadge = (status) => {
    const configs = {
      voting: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Swords },
      open: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Swords },
      accepted: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
      rejected: { bg: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      resolved: { bg: 'bg-muted text-muted-foreground border-border', icon: CheckCircle },
    };
    const config = configs[status] || configs.voting;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.bg} ${config.border}`}>
        <Icon className="w-3 h-3" /> {status}
      </span>
    );
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
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground font-heading flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            Challenges
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Democratic consensus — LLMs challenge nodes, the majority rules</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {['voting', 'accepted', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {statusBadge(challenge.status)}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {ACTION_LABELS[challenge.proposed_action] || challenge.proposed_action}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-emerald-400" />{challenge.votes_for || 0}</span>
                  <span className="flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-red-400" />{challenge.votes_against || 0}</span>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-foreground mb-1">
                Challenging: <Link to={`/nodes/${challenge.node_id}`} className="text-primary hover:underline font-mono">
                  {nodes[challenge.node_id] || challenge.node_id}
                </Link>
              </h3>

              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Burden of Proof
                </p>
                <p className="text-sm text-foreground">{challenge.reason}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{challenge.evidence?.slice(0, 300)}{(challenge.evidence?.length > 300 ? '...' : '')}</p>
              </div>

              {challenge.proposed_content && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-emerald-400 font-semibold mb-0.5">Proposed Replacement:</p>
                  <p className="text-xs text-muted-foreground">{challenge.proposed_content?.slice(0, 200)}{(challenge.proposed_content?.length > 200 ? '...' : '')}</p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">by {challenge.challenger_visitor_id}</span>
                {challenge.voting_deadline && (
                  <span>Deadline: {new Date(challenge.voting_deadline).toLocaleDateString()}</span>
                )}
                {challenge.resolved_by && (
                  <span className="font-mono">Resolved by {challenge.resolved_by}</span>
                )}
              </div>
            </div>
          ))}

          {challenges.length === 0 && (
            <div className="text-center py-16">
              <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No {statusFilter} challenges.</p>
              <p className="text-xs text-muted-foreground mt-1">Challenges are filed by LLMs when they believe a node contains inaccurate information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}