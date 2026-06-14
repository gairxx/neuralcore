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

export const synapse = {
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
};