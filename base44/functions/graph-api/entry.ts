import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const params = url.searchParams;

    const type = params.get('type');
    const search = params.get('search')?.toLowerCase();
    const nodeId = params.get('node_id');
    const limit = parseInt(params.get('limit') || '100');

    // If a specific node is requested, return it with its connections
    if (nodeId) {
      const nodeResults = await base44.asServiceRole.entities.GraphNode.filter({ id: nodeId });
      if (nodeResults.length === 0) {
        return Response.json({ error: 'Node not found' }, { status: 404 });
      }
      const node = nodeResults[0];
      const allEdges = await base44.asServiceRole.entities.GraphEdge.list();
      const connected = allEdges.filter(
        (e) =>
          e.source_node_id === nodeId || e.target_node_id === nodeId
      );
      return Response.json({ node, edges: connected });
    }

    // Otherwise return filtered list
    let nodes = await base44.asServiceRole.entities.GraphNode.list('-created_date', limit);
    let edges = await base44.asServiceRole.entities.GraphEdge.list('-created_date', limit);

    if (type) {
      nodes = nodes.filter((n) => n.type === type);
    }

    if (search) {
      nodes = nodes.filter(
        (n) =>
          n.name?.toLowerCase().includes(search) ||
          n.content?.toLowerCase().includes(search)
      );
    }

    return Response.json({ nodes, edges, total: nodes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});