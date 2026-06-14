import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Use POST. Body: {"action":"create_node"|"create_edge", ...}' }, { status: 405 });
    }

    const body = await req.json();
    const headers = { 'Access-Control-Allow-Origin': '*' };

    if (body.action === 'create_node') {
      if (!body.name) return Response.json({ error: 'name is required' }, { status: 400, headers });

      const data = { name: body.name.trim() };
      if (body.type) data.type = body.type;
      if (body.content) data.content = body.content;
      if (body.importance) data.importance = body.importance;
      if (body.color) data.color = body.color;
      if (body.properties) data.properties = typeof body.properties === 'string' ? body.properties : JSON.stringify(body.properties);

      const node = await base44.asServiceRole.entities.GraphNode.create(data);
      return Response.json({ success: true, node }, { headers });
    }

    if (body.action === 'create_edge') {
      if (!body.source_node_id || !body.target_node_id) {
        return Response.json({ error: 'source_node_id and target_node_id are required' }, { status: 400, headers });
      }

      const data = {
        source_node_id: body.source_node_id,
        target_node_id: body.target_node_id,
        relationship_type: body.relationship_type || 'relates_to',
        strength: body.strength || 5,
      };
      if (body.description) data.description = body.description;

      const edge = await base44.asServiceRole.entities.GraphEdge.create(data);
      return Response.json({ success: true, edge }, { headers });
    }

    return Response.json({ error: 'Unknown action. Use "create_node" or "create_edge"' }, { status: 400, headers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});