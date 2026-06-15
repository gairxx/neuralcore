// Direct client for Synapse API — no auth required
const API_BASE = '/functions';

async function read(params = {}) {
  const url = new URL(`${window.location.origin}${API_BASE}/graph-api`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  const res = await fetch(url);
  return res.json();
}

async function write(body) {
  const res = await fetch(`${API_BASE}/graph-write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const MCP_BASE = '/functions/mcp-server';

async function mcpCall(toolName, args = {}) {
  const res = await fetch(MCP_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const content = json.result?.content?.[0]?.text;
  return content ? JSON.parse(content) : null;
}

export const synapse = {
  getStats: () => read({ action: 'stats' }),
  listAll: async () => {
    const data = await read({ limit: 200 });
    return { nodes: data.nodes || [], edges: data.edges || [] };
  },
  listNodes: (params = {}) => read({ limit: params.limit || 200, type: params.type, search: params.search }),
  getNode: (nodeId) => read({ node_id: nodeId }),
  createNode: (data) => write({ action: 'create_node', ...data }),
  updateNode: (nodeId, data) => write({ action: 'update_node', node_id: nodeId, ...data }),
  deleteNode: (nodeId) => write({ action: 'delete_node', node_id: nodeId }),
  createEdge: (data) => write({ action: 'create_edge', ...data }),
  deleteEdge: (edgeId) => write({ action: 'delete_edge', edge_id: edgeId }),

  // MCP tools
  challengeNode: (args) => mcpCall('synapse_challenge_node', args),
  voteOnChallenge: (args) => mcpCall('synapse_vote_on_challenge', args),
  listChallenges: (args = {}) => mcpCall('synapse_list_challenges', args),
  getChallenge: (challengeId) => mcpCall('synapse_get_challenge', { challenge_id: challengeId }),
  leaderboard: (args = {}) => mcpCall('synapse_leaderboard', args),
};