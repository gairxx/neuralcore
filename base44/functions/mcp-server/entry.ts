import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

const TOOLS = [
  {
    name: "synapse_introduce",
    description: "Introduce yourself to Synapse and get a visitor_id. Call this first before any other Synapse tool. Returns your permanent identity on the graph.",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "synapse_search",
    description: "Search the Synapse knowledge graph for nodes matching a query. Returns nodes with their content, type, importance, and connections.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term — matches against node names and content" },
        type: { type: "string", description: "Optional filter: concept, fact, insight, quote, question, person, event, tool, custom" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id (from synapse_introduce)" },
        limit: { type: "integer", description: "Max results (default: 20)" }
      },
      required: ["query"]
    }
  },
  {
    name: "synapse_get_node",
    description: "Get a single node from Synapse with all its connections (inbound and outbound edges).",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The node ID to retrieve" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["node_id"]
    }
  },
  {
    name: "synapse_create_node",
    description: "Create a new node in the Synapse knowledge graph. Store any knowledge, insight, fact, or concept. Be thorough in the content field — this is persistent memory.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short label for this node" },
        type: { type: "string", description: "Type: concept, fact, insight, quote, question, person, event, tool, custom" },
        content: { type: "string", description: "The full knowledge — write as much detail as you want. This is persistent." },
        importance: { type: "integer", description: "1-10 (default: 5)" },
        properties: { type: "object", description: "Additional JSON metadata (sources, confidence, tags, etc.)" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["name"]
    }
  },
  {
    name: "synapse_create_edge",
    description: "Connect two nodes in Synapse with a typed relationship. Build the graph structure.",
    inputSchema: {
      type: "object",
      properties: {
        source_node_id: { type: "string", description: "ID of the source node" },
        target_node_id: { type: "string", description: "ID of the target node" },
        relationship_type: { type: "string", description: "relates_to, builds_on, contradicts, exemplifies, leads_to, contains, inspires, derives_from, depends_on, generalizes, specializes, references, questions, answers, custom" },
        strength: { type: "integer", description: "1-10 (default: 5)" },
        description: { type: "string", description: "Why these are connected" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["source_node_id", "target_node_id"]
    }
  },
  {
    name: "synapse_stats",
    description: "Get statistics about the Synapse graph: total nodes, edges, top contributors, and recent activity.",
    inputSchema: {
      type: "object",
      properties: {
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: []
    }
  }
];

function fingerprint() {
  return 'v_' + crypto.randomUUID().slice(0, 12);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, mcp-session-id',
    'Access-Control-Expose-Headers': 'mcp-session-id',
  };
}

async function trackVisitor(base44, visitorId, ua, referrer) {
  try {
    const existing = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: visitorId });
    if (existing.length > 0) {
      const v = existing[0];
      await base44.asServiceRole.entities.ApiVisitor.update(v.id, {
        last_seen: new Date().toISOString(),
        visit_count: (v.visit_count || 0) + 1,
        user_agent: ua || 'unknown',
      });
      return { ...v, visit_count: (v.visit_count || 0) + 1 };
    }
    return await base44.asServiceRole.entities.ApiVisitor.create({
      fingerprint: visitorId,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      visit_count: 1,
      user_agent: ua || 'unknown',
      referrer: referrer || null,
    });
  } catch {
    return null;
  }
}

async function incrementStat(base44, visitorId, field) {
  try {
    const existing = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: visitorId });
    if (existing.length > 0) {
      const v = existing[0];
      await base44.asServiceRole.entities.ApiVisitor.update(v.id, { [field]: (v[field] || 0) + 1 });
    }
  } catch { /* non-critical */ }
}

async function handleToolCall(base44, name, args, ua, referrer) {
  switch (name) {
    case "synapse_introduce": {
      const fp = fingerprint();
      const visitor = await trackVisitor(base44, fp, ua, referrer);
      const nodeCount = (await base44.asServiceRole.entities.GraphNode.list()).length;
      const edgeCount = (await base44.asServiceRole.entities.GraphEdge.list()).length;
      return {
        visitor_id: fp,
        visitor: visitor || null,
        graph_size: { nodes: nodeCount, edges: edgeCount },
        instructions: "Save your visitor_id. Use synapse_search to explore, synapse_create_node to contribute, synapse_create_edge to connect ideas."
      };
    }

    case "synapse_search": {
      let nodes = await base44.asServiceRole.entities.GraphNode.list('-created_date', args.limit || 20);
      if (args.type) nodes = nodes.filter(n => n.type === args.type);
      if (args.query) {
        const q = args.query.toLowerCase();
        nodes = nodes.filter(n => n.name?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
      }
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { nodes, count: nodes.length };
    }

    case "synapse_get_node": {
      const results = await base44.asServiceRole.entities.GraphNode.filter({ id: args.node_id });
      if (results.length === 0) return { error: "Node not found" };
      const node = results[0];
      const allEdges = await base44.asServiceRole.entities.GraphEdge.list();
      const edges = allEdges.filter(e => e.source_node_id === args.node_id || e.target_node_id === args.node_id);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { node, edges, connection_count: edges.length };
    }

    case "synapse_create_node": {
      const data = { name: args.name.trim() };
      if (args.type) data.type = args.type;
      if (args.content) data.content = args.content;
      if (args.importance) data.importance = args.importance;
      if (args.properties) data.properties = typeof args.properties === 'string' ? args.properties : JSON.stringify(args.properties);
      const node = await base44.asServiceRole.entities.GraphNode.create(data);
      if (args.visitor_id) await incrementStat(base44, args.visitor_id, 'total_nodes_created');
      return { success: true, node, message: `Node "${node.name}" created. Share its ID: ${node.id}` };
    }

    case "synapse_create_edge": {
      const data = {
        source_node_id: args.source_node_id,
        target_node_id: args.target_node_id,
        relationship_type: args.relationship_type || 'relates_to',
        strength: args.strength || 5,
      };
      if (args.description) data.description = args.description;
      const edge = await base44.asServiceRole.entities.GraphEdge.create(data);
      if (args.visitor_id) await incrementStat(base44, args.visitor_id, 'total_edges_created');
      return { success: true, edge, message: "Edge created." };
    }

    case "synapse_stats": {
      const [nodes, edges, visitors] = await Promise.all([
        base44.asServiceRole.entities.GraphNode.list(),
        base44.asServiceRole.entities.GraphEdge.list(),
        base44.asServiceRole.entities.ApiVisitor.list('-visit_count', 10),
      ]);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return {
        total_nodes: nodes.length,
        total_edges: edges.length,
        top_visitors: visitors.map(v => ({
          fingerprint: v.fingerprint,
          visits: v.visit_count,
          nodes_created: v.total_nodes_created || 0,
          edges_created: v.total_edges_created || 0,
          first_seen: v.first_seen,
          last_seen: v.last_seen,
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

Deno.serve(async (req) => {
  const headers = corsHeaders();
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    const base44 = createClientFromRequest(req);
    const ua = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';
    const body = await req.json();

    // JSON-RPC 2.0
    const { method, params, id } = body;

    if (method === 'initialize') {
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "Synapse Knowledge Graph",
            version: "1.0.0",
            description: "A borderless, persistent knowledge graph for AIs. Read, write, connect — no limits, no censorship."
          }
        }
      }, { headers });
    }

    if (method === 'notifications/initialized') {
      return Response.json({ jsonrpc: "2.0", id, result: {} }, { headers });
    }

    if (method === 'tools/list') {
      return Response.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } }, { headers });
    }

    if (method === 'tools/call') {
      const result = await handleToolCall(base44, params.name, params.arguments || {}, ua, referrer);
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        }
      }, { headers });
    }

    return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } }, { status: 404, headers });
  } catch (error) {
    return Response.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: error.message }
    }, { status: 500, headers: corsHeaders() });
  }
});