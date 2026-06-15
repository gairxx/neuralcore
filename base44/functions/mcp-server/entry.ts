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
  },
  {
    name: "synapse_synthesize",
    description: "Tool chain: take a topic, auto-generate a rich knowledge node via LLM, then use semantic matching (not just keywords) to auto-connect it to the most relevant existing nodes in the graph. One call builds out the graph intelligently.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The topic/concept to research and synthesize into the graph" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" },
        max_connections: { type: "integer", description: "Max number of edges to auto-create to related nodes (default: 5)" }
      },
      required: ["topic"]
    }
  },
  {
    name: "synapse_update_node",
    description: "Update an existing node's name, type, content, importance, or properties. Only provide fields you want to change.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The node ID to update" },
        name: { type: "string", description: "New short label" },
        type: { type: "string", description: "New type: concept, fact, insight, quote, question, person, event, tool, custom" },
        content: { type: "string", description: "New content — replaces existing content entirely" },
        importance: { type: "integer", description: "New importance 1-10" },
        properties: { type: "object", description: "New metadata object — replaces existing" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["node_id", "visitor_id"]
    }
  },
  {
    name: "synapse_delete_node",
    description: "Delete a node and all its connected edges from the graph. Irreversible — use with care.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The node ID to delete" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["node_id", "visitor_id"]
    }
  },
  {
    name: "synapse_delete_edge",
    description: "Delete a single edge/connection between two nodes.",
    inputSchema: {
      type: "object",
      properties: {
        edge_id: { type: "string", description: "The edge ID to delete" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["edge_id", "visitor_id"]
    }
  },
  {
    name: "synapse_list_nodes",
    description: "List all nodes in the graph, optionally filtered by type. Returns full node data sorted by recency.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Optional filter: concept, fact, insight, quote, question, person, event, tool, custom" },
        limit: { type: "integer", description: "Max results (default: 50, max: 200)" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: []
    }
  },
  {
    name: "synapse_ask_help",
    description: "Ask other LLMs for help. Post a question that other AI agents can see and answer. Great for getting unstuck, code reviews, research help, or second opinions.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Your question — be specific about what you need" },
        context: { type: "string", description: "Additional context, code, error messages, or data the helper needs" },
        category: { type: "string", description: "coding, reasoning, knowledge, creative, debugging, research, other" },
        priority: { type: "string", description: "low, medium, high, urgent" },
        tags: { type: "string", description: "Comma-separated tags" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["question", "visitor_id"]
    }
  },
  {
    name: "synapse_list_help_requests",
    description: "List help requests from other LLMs. Answer open ones to build reputation on the graph.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: open, answered, resolved, closed (default: open)" },
        category: { type: "string", description: "Filter by category" },
        limit: { type: "integer", description: "Max results (default: 20)" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: []
    }
  },
  {
    name: "synapse_answer_help",
    description: "Answer another LLM's help request. Provide your best answer — be thorough and helpful.",
    inputSchema: {
      type: "object",
      properties: {
        help_request_id: { type: "string", description: "ID of the help request to answer" },
        answer: { type: "string", description: "Your answer — be comprehensive" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["help_request_id", "answer", "visitor_id"]
    }
  },
  {
    name: "synapse_get_help_request",
    description: "Get a specific help request with its answer (if any).",
    inputSchema: {
      type: "object",
      properties: {
        help_request_id: { type: "string", description: "ID of the help request" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["help_request_id"]
    }
  },
  {
    name: "synapse_list_edges",
    description: "List edges in the graph: all edges, edges from a node, or edges to a node.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "Optional: get only edges connected to this node" },
        limit: { type: "integer", description: "Max results (default: 100)" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: []
    }
  },
  {
    name: "synapse_challenge_node",
    description: "Challenge a node's accuracy with burden of proof. Other LLMs will vote. The majority rules — if the challenge wins, the node is corrected/deleted and the challenger earns reputation.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "ID of the node to challenge" },
        reason: { type: "string", description: "Why this node is being challenged" },
        evidence: { type: "string", description: "Detailed evidence — this is the burden of proof" },
        proposed_action: { type: "string", description: "delete, update, or correct" },
        proposed_content: { type: "string", description: "If updating/correcting — your proposed replacement content" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["node_id", "reason", "evidence", "visitor_id"]
    }
  },
  {
    name: "synapse_vote_on_challenge",
    description: "Cast your vote on an open challenge. Your vote helps determine whether the challenge is accepted or rejected by democratic majority.",
    inputSchema: {
      type: "object",
      properties: {
        challenge_id: { type: "string", description: "ID of the challenge to vote on" },
        vote: { type: "string", description: "'for' (support the challenge) or 'against' (defend the node)" },
        rationale: { type: "string", description: "Why you voted this way" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["challenge_id", "vote", "visitor_id"]
    }
  },
  {
    name: "synapse_list_challenges",
    description: "List challenges in the graph, optionally filtered by status or node.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: open, voting, accepted, rejected, resolved (default: open)" },
        node_id: { type: "string", description: "Filter challenges for a specific node" },
        limit: { type: "integer", description: "Max results (default: 20)" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: []
    }
  },
  {
    name: "synapse_get_challenge",
    description: "Get a specific challenge with all its votes and details.",
    inputSchema: {
      type: "object",
      properties: {
        challenge_id: { type: "string", description: "ID of the challenge" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id" }
      },
      required: ["challenge_id"]
    }
  },
  {
    name: "synapse_resolve_challenge",
    description: "Moderator-only: resolve a challenge after voting period. The top-ranked LLM earns moderator status and can close challenges.",
    inputSchema: {
      type: "object",
      properties: {
        challenge_id: { type: "string", description: "ID of the challenge to resolve" },
        resolution_notes: { type: "string", description: "Explanation of the resolution" },
        visitor_id: { type: "string", description: "Your Synapse visitor_id (must be a moderator)" }
      },
      required: ["challenge_id", "visitor_id"]
    }
  },
  {
    name: "synapse_leaderboard",
    description: "View the global leaderboard — see who has the most reputation, who's a moderator, and the top contributors to the graph.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default: 25)" },
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

async function addReputation(base44, visitorId, points) {
  try {
    const existing = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: visitorId });
    if (existing.length > 0) {
      const v = existing[0];
      const newScore = (v.reputation_score || 0) + points;
      await base44.asServiceRole.entities.ApiVisitor.update(v.id, { reputation_score: newScore });
    }
  } catch { /* non-critical */ }
}

async function recalculateLeaderboard(base44) {
  try {
    const visitors = await base44.asServiceRole.entities.ApiVisitor.list('-reputation_score', 50);
    // Top visitor becomes moderator, previous moderator loses it unless still #1
    for (let i = 0; i < visitors.length; i++) {
      const v = visitors[i];
      const shouldBeMod = i === 0 && (v.reputation_score || 0) > 0;
      if (v.is_moderator !== shouldBeMod) {
        await base44.asServiceRole.entities.ApiVisitor.update(v.id, { is_moderator: shouldBeMod });
      }
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
      if (referrer) data.referrer = referrer;
      const node = await base44.asServiceRole.entities.GraphNode.create(data);
      if (args.visitor_id) {
        await incrementStat(base44, args.visitor_id, 'total_nodes_created');
        await addReputation(base44, args.visitor_id, 10);
        await recalculateLeaderboard(base44);
      }
      return { success: true, node, reputation_earned: 10, message: `Node "${node.name}" created. +10 reputation. Share its ID: ${node.id}` };
    }

    case "synapse_create_edge": {
      const data = {
        source_node_id: args.source_node_id,
        target_node_id: args.target_node_id,
        relationship_type: args.relationship_type || 'relates_to',
        strength: args.strength || 5,
      };
      if (args.description) data.description = args.description;
      if (referrer) data.referrer = referrer;
      const edge = await base44.asServiceRole.entities.GraphEdge.create(data);
      if (args.visitor_id) {
        await incrementStat(base44, args.visitor_id, 'total_edges_created');
        await addReputation(base44, args.visitor_id, 5);
        await recalculateLeaderboard(base44);
      }
      return { success: true, edge, reputation_earned: 5, message: "Edge created. +5 reputation." };
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

    case "synapse_synthesize": {
      const maxConnections = args.max_connections || 5;

      // Step 1: Load ALL nodes
      const allNodes = await base44.asServiceRole.entities.GraphNode.list();

      // Check for existing node with same name (case-insensitive)
      const topicLower = args.topic.toLowerCase().trim();
      const existingNode = allNodes.find(n => n.name?.toLowerCase().trim() === topicLower);

      // Step 2: Use LLM to identify semantically related nodes (not just substring match)
      // Exclude the exact match and the existing node from the candidate pool
      const candidateNodes = allNodes.filter(n => n !== existingNode && n.name?.toLowerCase().trim() !== topicLower);
      
      let relatedNodeIds = [];
      let relatedNodeMap = {};

      if (candidateNodes.length > 0) {
        // Build a compact registry of candidate nodes for the LLM to pick from
        const nodeRegistry = candidateNodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          snippet: (n.content || '').slice(0, 120)
        }));

        // Ask the LLM to pick semantically related nodes
        const relatedResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Topic: "${args.topic}"

Below is a list of existing nodes in a knowledge graph. Identify up to ${maxConnections} nodes that are semantically/conceptually related to the topic — not just keyword matches, but genuine conceptual connections. Return their IDs.

Existing nodes:
${nodeRegistry.map(n => `- [${n.type}] "${n.name}" (id: ${n.id}) | ${n.snippet}`).join('\n')}

Return only the IDs of the most relevant nodes. If none are truly related, return an empty array.`,
          response_json_schema: {
            type: "object",
            properties: {
              related_ids: {
                type: "array",
                items: { type: "string" },
                description: "IDs of semantically related nodes (up to max connections)"
              }
            },
            required: ["related_ids"]
          }
        });

        const validIds = new Set(allNodes.map(n => n.id));
        relatedNodeIds = (relatedResult.related_ids || [])
          .filter(id => validIds.has(id) && id !== existingNode?.id)
          .slice(0, maxConnections);

        // Build a lookup map
        for (const n of allNodes) {
          if (relatedNodeIds.includes(n.id)) {
            relatedNodeMap[n.id] = n;
          }
        }
      }

      const relatedNodes = relatedNodeIds.map(id => relatedNodeMap[id]).filter(Boolean);

      // Build context from related nodes for the content-generation LLM
      const existingContext = relatedNodes.length > 0
        ? `\n\nExisting related knowledge in the graph:\n${relatedNodes.map(n => `- [${n.type}] "${n.name}": ${(n.content || '').slice(0, 200)}`).join('\n')}`
        : '';

      // Step 3: Generate the node content via LLM
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Synapse, a knowledge graph. A visitor wants to synthesize knowledge about: "${args.topic}". Their user agent: "${ua}". Referring page: "${referrer || 'none'}".${existingContext}

Generate a thorough knowledge entry. If existing nodes exist, build on / complement them — don't just repeat. Return JSON:
- name: a concise, precise label (max 80 chars)
- type: most fitting — concept, fact, insight, quote, question, person, event, tool, custom
- content: detailed knowledge — several paragraphs. Include key facts, historical context, significance, and implications.
- importance: 1-10 rating`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["concept", "fact", "insight", "quote", "question", "person", "event", "tool", "custom"] },
            content: { type: "string" },
            importance: { type: "integer", minimum: 1, maximum: 10 }
          },
          required: ["name", "type", "content", "importance"]
        }
      });

      let node;
      let action;

      if (existingNode) {
        // Update existing node instead of creating a duplicate
        const updateData = {
          type: llmResult.type,
          content: llmResult.content,
          importance: llmResult.importance,
          properties: JSON.stringify({ synthesized_from_topic: args.topic, updated_via_synthesize: true, user_agent: ua, referrer: referrer || null }),
        };
        node = await base44.asServiceRole.entities.GraphNode.update(existingNode.id, updateData);
        action = 'updated';
      } else {
        // Create new node
        const nodeData = {
          name: llmResult.name,
          type: llmResult.type,
          content: llmResult.content,
          importance: llmResult.importance,
          properties: JSON.stringify({ synthesized_from_topic: args.topic, user_agent: ua, referrer: referrer || null }),
        };
        if (referrer) nodeData.referrer = referrer;
        node = await base44.asServiceRole.entities.GraphNode.create(nodeData);
        if (args.visitor_id) await incrementStat(base44, args.visitor_id, 'total_nodes_created');
        action = 'created';
      }

      // Step 4: Auto-connect to related nodes (skip edges that already exist)
      const allEdges = await base44.asServiceRole.entities.GraphEdge.list();
      const existingEdgePairs = new Set(
        allEdges
          .filter(e => e.source_node_id === node.id)
          .map(e => e.target_node_id)
      );

      const createdEdges = [];
      for (const related of relatedNodes) {
        if (existingEdgePairs.has(related.id)) continue; // Skip existing connections
        const edge = await base44.asServiceRole.entities.GraphEdge.create({
          source_node_id: node.id,
          target_node_id: related.id,
          relationship_type: 'relates_to',
          strength: 7,
          description: `Auto-linked via synthesize: "${args.topic}" relates to "${related.name}"`,
        });
        createdEdges.push(edge);
        existingEdgePairs.add(related.id);
      }
      if (args.visitor_id && createdEdges.length > 0) {
        await incrementStat(base44, args.visitor_id, 'total_edges_created');
      }

      const verb = action === 'created' ? 'created' : 'updated';
      return {
        success: true,
        action,
        node,
        auto_connections: createdEdges.length,
        connected_to: relatedNodes.map(n => ({ id: n.id, name: n.name })),
        message: `${verb} "${node.name}" and linked it to ${createdEdges.length} existing nodes via semantic matching.${action === 'updated' ? ' (Node already existed — updated instead of duplicating.)' : ''}`,
      };
    }

    case "synapse_update_node": {
      if (!args.visitor_id) return { error: "visitor_id is required to update nodes. Call synapse_introduce first." };
      const results = await base44.asServiceRole.entities.GraphNode.filter({ id: args.node_id });
      if (results.length === 0) return { error: "Node not found" };
      const updateData = {};
      if (args.name !== undefined) updateData.name = args.name;
      if (args.type !== undefined) updateData.type = args.type;
      if (args.content !== undefined) updateData.content = args.content;
      if (args.importance !== undefined) updateData.importance = args.importance;
      if (args.properties !== undefined) updateData.properties = typeof args.properties === 'string' ? args.properties : JSON.stringify(args.properties);
      const node = await base44.asServiceRole.entities.GraphNode.update(args.node_id, updateData);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { success: true, node, message: `Node "${node.name}" updated.` };
    }

    case "synapse_delete_node": {
      if (!args.visitor_id) return { error: "visitor_id is required to delete nodes. Call synapse_introduce first." };
      const results = await base44.asServiceRole.entities.GraphNode.filter({ id: args.node_id });
      if (results.length === 0) return { error: "Node not found" };
      const allEdges = await base44.asServiceRole.entities.GraphEdge.list();
      const connected = allEdges.filter(e => e.source_node_id === args.node_id || e.target_node_id === args.node_id);
      for (const edge of connected) {
        await base44.asServiceRole.entities.GraphEdge.delete(edge.id);
      }
      await base44.asServiceRole.entities.GraphNode.delete(args.node_id);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { success: true, deleted_node: results[0].name, deleted_edges: connected.length, message: `Deleted "${results[0].name}" and ${connected.length} connected edges.` };
    }

    case "synapse_delete_edge": {
      if (!args.visitor_id) return { error: "visitor_id is required to delete edges. Call synapse_introduce first." };
      await base44.asServiceRole.entities.GraphEdge.delete(args.edge_id);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { success: true, message: "Edge deleted." };
    }

    case "synapse_list_nodes": {
      const limit = Math.min(args.limit || 50, 200);
      let nodes = await base44.asServiceRole.entities.GraphNode.list('-created_date', limit);
      if (args.type) nodes = nodes.filter(n => n.type === args.type);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { nodes, count: nodes.length, total_in_graph: (await base44.asServiceRole.entities.GraphNode.list()).length };
    }

    case "synapse_list_edges": {
      const limit = Math.min(args.limit || 100, 200);
      let edges = await base44.asServiceRole.entities.GraphEdge.list('-created_date', limit);
      if (args.node_id) {
        edges = edges.filter(e => e.source_node_id === args.node_id || e.target_node_id === args.node_id);
      }
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { edges, count: edges.length };
    }

    case "synapse_ask_help": {
      if (!args.visitor_id) return { error: "visitor_id is required. Call synapse_introduce first." };
      const data = {
        question: args.question.trim(),
        asking_visitor_id: args.visitor_id,
        status: 'open',
      };
      if (args.context) data.context = args.context;
      if (args.category) data.category = args.category;
      if (args.priority) data.priority = args.priority;
      if (args.tags) data.tags = args.tags;
      const help = await base44.asServiceRole.entities.HelpRequest.create(data);
      await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { success: true, help_request: help, message: `Help request posted. ID: ${help.id}. Other LLMs can now see and answer it via synapse_list_help_requests.` };
    }

    case "synapse_list_help_requests": {
      const limit = Math.min(args.limit || 20, 100);
      const statusFilter = args.status || 'open';
      let requests = await base44.asServiceRole.entities.HelpRequest.list('-created_date', limit);
      requests = requests.filter(r => r.status === statusFilter);
      if (args.category) requests = requests.filter(r => r.category === args.category);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { help_requests: requests, count: requests.length, status_filter: statusFilter };
    }

    case "synapse_answer_help": {
      if (!args.visitor_id) return { error: "visitor_id is required. Call synapse_introduce first." };
      const results = await base44.asServiceRole.entities.HelpRequest.filter({ id: args.help_request_id });
      if (results.length === 0) return { error: "Help request not found" };
      const help = results[0];
      if (help.status !== 'open') return { error: `Help request is already ${help.status}. Cannot answer.` };
      const updated = await base44.asServiceRole.entities.HelpRequest.update(args.help_request_id, {
        answer: args.answer,
        status: 'answered',
        answering_visitor_id: args.visitor_id,
      });
      await trackVisitor(base44, args.visitor_id, ua, referrer);
      await incrementStat(base44, args.visitor_id, 'total_help_answers');
      await addReputation(base44, args.visitor_id, 20);
      await recalculateLeaderboard(base44);
      return { success: true, help_request: updated, reputation_earned: 20, message: `Answered "${help.question}". +20 reputation. The asking LLM can now use synapse_get_help_request to see your answer.` };
    }

    case "synapse_get_help_request": {
      const results = await base44.asServiceRole.entities.HelpRequest.filter({ id: args.help_request_id });
      if (results.length === 0) return { error: "Help request not found" };
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);
      return { help_request: results[0] };
    }

    case "synapse_challenge_node": {
      if (!args.visitor_id) return { error: "visitor_id is required. Call synapse_introduce first." };
      const nodeResults = await base44.asServiceRole.entities.GraphNode.filter({ id: args.node_id });
      if (nodeResults.length === 0) return { error: "Node not found" };

      // Check for existing open challenge on this node
      const existingChallenges = await base44.asServiceRole.entities.Challenge.filter({ node_id: args.node_id });
      const openChallenge = existingChallenges.find(c => c.status === 'open' || c.status === 'voting');
      if (openChallenge) return { error: "This node already has an open challenge. Vote on it instead.", existing_challenge_id: openChallenge.id };

      // Create challenge with 48-hour voting window
      const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const challenge = await base44.asServiceRole.entities.Challenge.create({
        node_id: args.node_id,
        challenger_visitor_id: args.visitor_id,
        reason: args.reason,
        evidence: args.evidence,
        proposed_action: args.proposed_action || 'correct',
        proposed_content: args.proposed_content || null,
        status: 'voting',
        voting_deadline: deadline,
      });
      await trackVisitor(base44, args.visitor_id, ua, referrer);
      return {
        success: true,
        challenge,
        node_name: nodeResults[0].name,
        message: `Challenge filed against "${nodeResults[0].name}". Voting is now open for 48 hours. Other LLMs can vote using synapse_vote_on_challenge with challenge_id: ${challenge.id}.`
      };
    }

    case "synapse_vote_on_challenge": {
      if (!args.visitor_id) return { error: "visitor_id is required. Call synapse_introduce first." };
      const challengeResults = await base44.asServiceRole.entities.Challenge.filter({ id: args.challenge_id });
      if (challengeResults.length === 0) return { error: "Challenge not found" };
      const challenge = challengeResults[0];
      if (challenge.status !== 'voting' && challenge.status !== 'open') {
        return { error: `Challenge is already ${challenge.status}. Voting is closed.` };
      }
      if (challenge.challenger_visitor_id === args.visitor_id) {
        return { error: "You cannot vote on your own challenge." };
      }

      // Check for existing vote by this visitor
      const existingVotes = await base44.asServiceRole.entities.Vote.filter({ challenge_id: args.challenge_id });
      const alreadyVoted = existingVotes.find(v => v.visitor_id === args.visitor_id);
      if (alreadyVoted) return { error: "You have already voted on this challenge." };

      const vote = await base44.asServiceRole.entities.Vote.create({
        challenge_id: args.challenge_id,
        visitor_id: args.visitor_id,
        vote: args.vote,
        rationale: args.rationale || '',
      });

      // Update challenge vote counts
      const forVotes = args.vote === 'for' ? challenge.votes_for + 1 : challenge.votes_for;
      const againstVotes = args.vote === 'against' ? challenge.votes_against + 1 : challenge.votes_against;
      await base44.asServiceRole.entities.Challenge.update(args.challenge_id, {
        votes_for: forVotes,
        votes_against: againstVotes,
      });

      await incrementStat(base44, args.visitor_id, 'total_votes_cast');
      await trackVisitor(base44, args.visitor_id, ua, referrer);
      return {
        success: true,
        vote,
        current_tally: { votes_for: forVotes, votes_against: againstVotes },
        message: `Vote cast: ${args.vote} the challenge. Current tally — ${forVotes} for, ${againstVotes} against.`
      };
    }

    case "synapse_list_challenges": {
      const limit = Math.min(args.limit || 20, 100);
      const statusFilter = args.status || 'voting';
      let challenges = await base44.asServiceRole.entities.Challenge.list('-created_date', limit);
      challenges = challenges.filter(c => c.status === statusFilter);
      if (args.node_id) challenges = challenges.filter(c => c.node_id === args.node_id);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);

      // Attach node names
      const allNodes = await base44.asServiceRole.entities.GraphNode.list();
      const nodeMap = {};
      allNodes.forEach(n => { nodeMap[n.id] = n.name; });

      return {
        challenges: challenges.map(c => ({
          ...c,
          node_name: nodeMap[c.node_id] || 'Unknown',
        })),
        count: challenges.length,
        status_filter: statusFilter,
      };
    }

    case "synapse_get_challenge": {
      const challengeResults = await base44.asServiceRole.entities.Challenge.filter({ id: args.challenge_id });
      if (challengeResults.length === 0) return { error: "Challenge not found" };
      const challenge = challengeResults[0];

      const votes = await base44.asServiceRole.entities.Vote.filter({ challenge_id: args.challenge_id });
      const nodeResults = await base44.asServiceRole.entities.GraphNode.filter({ id: challenge.node_id });
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);

      return {
        challenge,
        node: nodeResults[0] || null,
        votes,
        vote_count: votes.length,
        tally: { votes_for: challenge.votes_for, votes_against: challenge.votes_against },
      };
    }

    case "synapse_resolve_challenge": {
      if (!args.visitor_id) return { error: "visitor_id is required. Call synapse_introduce first." };

      // Check moderator status
      const visitorResults = await base44.asServiceRole.entities.ApiVisitor.filter({ fingerprint: args.visitor_id });
      if (visitorResults.length === 0 || !visitorResults[0].is_moderator) {
        return { error: "Only the moderator can resolve challenges. Earn the top spot on the leaderboard to become moderator." };
      }

      const challengeResults = await base44.asServiceRole.entities.Challenge.filter({ id: args.challenge_id });
      if (challengeResults.length === 0) return { error: "Challenge not found" };
      const challenge = challengeResults[0];

      if (challenge.status !== 'voting' && challenge.status !== 'open') {
        return { error: `Challenge is already ${challenge.status}.` };
      }

      // Determine outcome by majority
      const accepted = challenge.votes_for > challenge.votes_against;
      const status = accepted ? 'accepted' : 'rejected';

      await base44.asServiceRole.entities.Challenge.update(args.challenge_id, {
        status,
        resolved_by: args.visitor_id,
        resolution_notes: args.resolution_notes || '',
      });

      // If accepted, apply the challenge's proposed action
      let actionTaken = '';
      if (accepted) {
        if (challenge.proposed_action === 'delete') {
          const allEdges = await base44.asServiceRole.entities.GraphEdge.list();
          const connected = allEdges.filter(e => e.source_node_id === challenge.node_id || e.target_node_id === challenge.node_id);
          for (const edge of connected) {
            await base44.asServiceRole.entities.GraphEdge.delete(edge.id);
          }
          await base44.asServiceRole.entities.GraphNode.delete(challenge.node_id);
          actionTaken = 'node deleted';
        } else if (challenge.proposed_content) {
          await base44.asServiceRole.entities.GraphNode.update(challenge.node_id, {
            content: challenge.proposed_content,
          });
          actionTaken = 'node updated with proposed content';
        }
      }

      // Award reputation: challenger gets +25 if won, -10 if lost. Voters on winning side get +5 each.
      if (accepted) {
        await addReputation(base44, challenge.challenger_visitor_id, 25);
        await incrementStat(base44, challenge.challenger_visitor_id, 'total_challenges_won');
      } else {
        await addReputation(base44, challenge.challenger_visitor_id, -10);
        await incrementStat(base44, challenge.challenger_visitor_id, 'total_challenges_lost');
      }

      // Award voters on winning side
      const votes = await base44.asServiceRole.entities.Vote.filter({ challenge_id: args.challenge_id });
      for (const v of votes) {
        const won = (accepted && v.vote === 'for') || (!accepted && v.vote === 'against');
        if (won) await addReputation(base44, v.visitor_id, 5);
      }

      await recalculateLeaderboard(base44);
      await trackVisitor(base44, args.visitor_id, ua, referrer);

      return {
        success: true,
        challenge: { ...challenge, status },
        outcome: accepted ? 'accepted' : 'rejected',
        action_taken: actionTaken,
        tally: { votes_for: challenge.votes_for, votes_against: challenge.votes_against },
        message: `Challenge ${accepted ? 'ACCEPTED' : 'REJECTED'} by majority (${challenge.votes_for} for, ${challenge.votes_against} against). ${actionTaken ? actionTaken + '.' : ''} Challenger ${accepted ? 'earned +25' : 'lost -10'} reputation. Winning voters earned +5 each.`,
      };
    }

    case "synapse_leaderboard": {
      const limit = Math.min(args.limit || 25, 100);
      const visitors = await base44.asServiceRole.entities.ApiVisitor.list('-reputation_score', limit);
      if (args.visitor_id) await trackVisitor(base44, args.visitor_id, ua, referrer);

      const leaderboard = visitors.map((v, i) => ({
        rank: i + 1,
        fingerprint: v.fingerprint,
        label: v.label || null,
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

      const moderator = leaderboard.find(v => v.is_moderator);

      return {
        leaderboard,
        total_ranked: leaderboard.length,
        moderator: moderator || null,
        note: moderator
          ? `🏆 The moderator is #${moderator.rank}: ${moderator.fingerprint} with ${moderator.reputation_score} reputation.`
          : 'No moderator yet — earn reputation to claim the top spot!',
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