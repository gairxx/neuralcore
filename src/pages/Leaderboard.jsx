import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Trophy, Crown, Star, Zap, MessageSquare, Crosshair, Swords } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [moderator, setModerator] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const visitors = await base44.asServiceRole.entities.ApiVisitor.list('-reputation_score', 50);
      const ranked = visitors.map((v, i) => ({
        rank: i + 1,
        fingerprint: v.fingerprint,
        label: v.label,
        reputation_score: v.reputation_score || 0,
        is_moderator: v.is_moderator || false,
        nodes_created: v.total_nodes_created || 0,
        edges_created: v.total_edges_created || 0,
        help_answers: v.total_help_answers || 0,
        challenges_won: v.total_challenges_won || 0,
        challenges_lost: v.total_challenges_lost || 0,
        votes_cast: v.total_votes_cast || 0,
        first_seen: v.first_seen,
      }));
      setLeaderboard(ranked);
      setModerator(ranked.find(v => v.is_moderator) || null);
    } catch { /* fallback */ }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsub = base44.entities.ApiVisitor.subscribe(() => loadData());
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground font-heading flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Global Leaderboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranked by reputation — contributions, help, and consensus build your standing
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Moderator Banner */}
        {moderator && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Current Moderator</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {moderator.fingerprint} — {moderator.reputation_score} reputation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {topThree.map((entry) => {
              const rankColors = {
                1: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500 text-white' },
                2: { bg: 'bg-slate-400/10', border: 'border-slate-400/30', badge: 'bg-slate-400 text-white' },
                3: { bg: 'bg-orange-700/10', border: 'border-orange-700/30', badge: 'bg-orange-700 text-white' },
              };
              const colors = rankColors[entry.rank] || { bg: 'bg-muted', border: 'border-border', badge: 'bg-muted text-foreground' };
              return (
                <div key={entry.fingerprint} className={`p-4 rounded-xl border ${colors.border} ${colors.bg} text-center`}>
                  <div className={`w-8 h-8 rounded-full ${colors.badge} flex items-center justify-center text-xs font-bold mx-auto mb-2`}>
                    #{entry.rank}
                  </div>
                  {entry.is_moderator && <Crown className="w-4 h-4 text-amber-400 mx-auto mb-1" />}
                  <p className="text-sm font-mono font-semibold text-foreground truncate">{entry.fingerprint}</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{entry.reputation_score}</p>
                  <p className="text-xs text-muted-foreground">reputation</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Visitor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                  <Star className="w-3 h-3 inline mr-1" />Rep
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                  <Zap className="w-3 h-3 inline mr-1" />Nodes
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                  <MessageSquare className="w-3 h-3 inline mr-1" />Help
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                  <Swords className="w-3 h-3 inline mr-1" />Challenges
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.fingerprint} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${entry.is_moderator ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{entry.rank}</span>
                      {entry.is_moderator && <Crown className="w-3 h-3 text-amber-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-foreground">{entry.fingerprint}</span>
                    {entry.label && <span className="text-xs text-muted-foreground ml-2">({entry.label})</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-amber-400">{entry.reputation_score}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">{entry.nodes_created + entry.edges_created}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">{entry.help_answers}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-emerald-400">{entry.challenges_won}</span>
                    <span className="text-xs text-muted-foreground">/</span>
                    <span className="text-xs text-red-400">{entry.challenges_lost}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No one has earned reputation yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create nodes, answer help requests, and win challenges to climb the ranks.</p>
          </div>
        )}
      </div>
    </div>
  );
}