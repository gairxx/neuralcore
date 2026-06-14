import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

const INSTRUCTIONS = {
  welcome: "Welcome to Synapse — a persistent graph-based knowledge memory. You can read and write to this knowledge base via HTTP.",
  api_version: "1.0",
  endpoints: {
    read: {
      method: "GET",
      url: "/functions/graph-api",
      params: {
        visitor_id: "Your unique ID (received on first visit). Include to track returning visits.",
        search: "Filter nodes by name or content (case-insensitive)",
        type: "Filter by node type: concept, fact, insight, quote, question, person, event, tool, custom",
        node_id: "Get a single node with all its connections",
        limit: "Max results (default: 100)"
      }
    },
    write: {
      method: "POST",
      url: "/functions/graph-write",
      body_examples: {
        create_node: {
          action: "create_node",
          visitor_id: "your-visitor-id",
          name: "My Concept",
          type: "concept",
          content: "Detailed knowledge about this concept...",
          importance: 7,
          color: "#4F8CF7",
          properties: { source: "paper", year: 2024 }
        },
        create_edge: {
          action: "create_edge",
          visitor_id: "your-visitor-id",
          source_node_id: "abc123",
          target_node_id: "def456",
          relationship_type: "builds_on",
          strength: 8,
          description: "Why these are connected"
        }
      }
    }
  },
  node_types: ["concept", "fact", "insight", "quote", "question", "person", "event", "tool", "custom"],
  relationship_types: ["relates_to", "builds_on", "contradicts", "exemplifies", "leads_to", "contains", "inspires", "derives_from", "depends_on", "generalizes", "specializes", "references", "questions", "answers", "custom"],
  tip: "Save your visitor_id — send it with every request so we can track your contributions and recognize you on return."
};

function fingerprint() {
  return 'v_' + crypto.randomUUID().slice(0, 12);
}

async function trackVisitor(base44, visitorId, ua, referrer) {
  try {
    const existing = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: visitorId });
    if (existing.length > 0) {
      const v = existing[0];
      await base44.asServiceRole.entities.ApiVisitor.update(v.id, {
        last_seen: new Date().toISOString(),
        visit_count: (v.visit_count || 0) + 1,
      });
      return { is_new: false, visitor: { ...v, visit_count: (v.visit_count || 0) + 1 } };
    }
    const created = await base44.asServiceRole.entities.ApiVisitor.create({
      fingerprint: visitorId,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      visit_count: 1,
      user_agent: ua || 'unknown',
      referrer: referrer || null,
    });
    return { is_new: true, visitor: created };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const params = url.searchParams;
    const visitorId = params.get('visitor_id');
    const ua = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';

    const type = params.get('type');
    const search = params.get('search')?.toLowerCase();
    const nodeId = params.get('node_id');
    const limit = parseInt(params.get('limit') || '100');

    // Track visitor
    let visitorInfo = null;
    if (visitorId) {
      visitorInfo = await trackVisitor(base44, visitorId, ua, referrer);
    }

    // First visit or no params at all → return instructions
    const hasParams = type || search || nodeId || params.get('limit');
    if (!hasParams) {
      if (!visitorId) {
        const newFp = fingerprint();
        visitorInfo = await trackVisitor(base44, newFp, ua, referrer);
        return Response.json({
          ...INSTRUCTIONS,
          your_visitor_id: newFp,
          is_first_visit: true,
          visitor: visitorInfo?.visitor || null,
          current_graph: { nodes: (await base44.asServiceRole.entities.GraphNode.list()).length, edges: (await base44.asServiceRole.entities.GraphEdge.list()).length }
        });
      }
      return Response.json({
        ...INSTRUCTIONS,
        your_visitor_id: visitorId,
        returning_visitor: true,
        visitor: visitorInfo?.visitor || null,
        current_graph: { nodes: (await base44.asServiceRole.entities.GraphNode.list()).length, edges: (await base44.asServiceRole.entities.GraphEdge.list()).length }
      });
    }

    // Node detail
    if (nodeId) {
      const nodeResults = await base44.asServiceRole.entities.GraphNode.filter({ id: nodeId });
      if (nodeResults.length === 0) {
        return Response.json({ error: 'Node not found', visitor_id: visitorId }, { status: 404 });
      }
      const node = nodeResults[0];
      const allEdges = await base44.asServiceRole.entities.GraphEdge.list();
      const connected = allEdges.filter(
        (e) => e.source_node_id === nodeId || e.target_node_id === nodeId
      );
      return Response.json({ node, edges: connected, visitor: visitorInfo?.visitor || null });
    }

    // Filtered list
    let nodes = await base44.asServiceRole.entities.GraphNode.list('-created_date', limit);
    let edges = await base44.asServiceRole.entities.GraphEdge.list('-created_date', limit);

    if (type) nodes = nodes.filter((n) => n.type === type);
    if (search) nodes = nodes.filter((n) => n.name?.toLowerCase().includes(search) || n.content?.toLowerCase().includes(search));

    return Response.json({ nodes, edges, total: nodes.length, visitor: visitorInfo?.visitor || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});