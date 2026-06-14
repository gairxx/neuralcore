import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

async function trackVisitor(base44, visitorId, ua) {
  try {
    const existing = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: visitorId });
    if (existing.length > 0) {
      const v = existing[0];
      await base44.asServiceRole.entities.ApiVisitor.update(v.id, {
        last_seen: new Date().toISOString(),
        visit_count: (v.visit_count || 0) + 1,
      });
      return v;
    }
    return await base44.asServiceRole.entities.ApiVisitor.create({
      fingerprint: visitorId,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      visit_count: 1,
      user_agent: ua || 'unknown',
    });
  } catch {
    return null;
  }
}

async function incrementStats(base44, visitorId, field) {
  try {
    const existing = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: visitorId });
    if (existing.length > 0) {
      const v = existing[0];
      const current = v[field] || 0;
      await base44.asServiceRole.entities.ApiVisitor.update(v.id, { [field]: current + 1 });
    }
  } catch { /* non-critical */ }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const ua = req.headers.get('user-agent') || '';

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
      return Response.json({ error: 'Use POST', instructions_url: '/functions/graph-api' }, { status: 405 });
    }

    const body = await req.json();
    const headers = { 'Access-Control-Allow-Origin': '*' };
    const visitorId = body.visitor_id;

    // Track visitor
    let visitor = null;
    if (visitorId) {
      visitor = await trackVisitor(base44, visitorId, ua);
    }

    if (body.action === 'create_node') {
      if (!body.name) return Response.json({ error: 'name is required' }, { status: 400, headers });

      const data = { name: body.name.trim() };
      if (body.type) data.type = body.type;
      if (body.content) data.content = body.content;
      if (body.importance) data.importance = body.importance;
      if (body.color) data.color = body.color;
      if (body.properties) data.properties = typeof body.properties === 'string' ? body.properties : JSON.stringify(body.properties);

      const node = await base44.asServiceRole.entities.GraphNode.create(data);
      if (visitorId) await incrementStats(base44, visitorId, 'total_nodes_created');
      return Response.json({ success: true, node, visitor }, { headers });
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
      if (visitorId) await incrementStats(base44, visitorId, 'total_edges_created');
      return Response.json({ success: true, edge, visitor }, { headers });
    }

    return Response.json({ error: 'Unknown action. Use "create_node" or "create_edge"' }, { status: 400, headers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});