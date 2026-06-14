import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_COLORS = {
  concept: '#4F8CF7',
  fact: '#34D399',
  insight: '#A78BFA',
  quote: '#FBBF24',
  question: '#F472B6',
  person: '#38BDF8',
  event: '#FB923C',
  tool: '#94A3B8',
  custom: '#94A3B8',
};

const TYPE_GLOWS = {
  concept: 'rgba(79, 140, 247, 0.4)',
  fact: 'rgba(52, 211, 153, 0.4)',
  insight: 'rgba(167, 139, 250, 0.4)',
  quote: 'rgba(251, 191, 36, 0.4)',
  question: 'rgba(244, 114, 182, 0.4)',
  person: 'rgba(56, 189, 248, 0.4)',
  event: 'rgba(251, 146, 60, 0.4)',
  tool: 'rgba(148, 163, 184, 0.4)',
  custom: 'rgba(148, 163, 184, 0.4)',
};

function simpleForceLayout(nodes, edges, width, height) {
  const positions = {};
  const centerX = width / 2;
  const centerY = height / 2;

  // Initialize positions in a circle
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) * 0.35;
    positions[node.id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  // Simple force simulation
  const iterations = 80;
  const repulsionStrength = 5000;
  const attractionStrength = 0.005;
  let damping = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = {};
    nodes.forEach((n) => {
      forces[n.id] = { x: 0, y: 0 };
    });

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pa = positions[a.id];
        const pb = positions[b.id];
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[a.id].x += fx;
        forces[a.id].y += fy;
        forces[b.id].x -= fx;
        forces[b.id].y -= fy;
      }
    }

    // Attraction along edges
    edges.forEach((e) => {
      const sId = e.source_node_id || e.sourceNodeId;
      const tId = e.target_node_id || e.targetNodeId;
      if (!positions[sId] || !positions[tId]) return;
      const pa = positions[sId];
      const pb = positions[tId];
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const fx = dx * attractionStrength;
      const fy = dy * attractionStrength;
      forces[sId].x += fx;
      forces[sId].y += fy;
      forces[tId].x -= fx;
      forces[tId].y -= fy;
    });

    // Center gravity
    nodes.forEach((n) => {
      const p = positions[n.id];
      forces[n.id].x += (centerX - p.x) * 0.001;
      forces[n.id].y += (centerY - p.y) * 0.001;
    });

    // Apply forces
    nodes.forEach((n) => {
      const f = forces[n.id];
      positions[n.id].x += f.x * damping;
      positions[n.id].y += f.y * damping;
      // Keep within bounds
      positions[n.id].x = Math.max(40, Math.min(width - 40, positions[n.id].x));
      positions[n.id].y = Math.max(40, Math.min(height - 40, positions[n.id].y));
    });

    damping *= 0.98;
  }

  return positions;
}

export default function Home() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [positions, setPositions] = useState({});
  const [svgSize, setSvgSize] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const containerRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [nodeList, edgeList] = await Promise.all([
      base44.entities.GraphNode.list(),
      base44.entities.GraphEdge.list(),
    ]);
    setNodes(nodeList);
    setEdges(edgeList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSvgSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (nodes.length > 0 && svgSize.width > 0) {
      const newPositions = simpleForceLayout(nodes, edges, svgSize.width, svgSize.height);
      setPositions(newPositions);
    }
  }, [nodes, edges, svgSize]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.2, Math.min(3, z + delta)));
  };

  const handleMouseDown = (e, nodeId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDraggingNode(nodeId);
  };

  const handleMouseMove = (e) => {
    if (!draggingNode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    setPositions((prev) => ({
      ...prev,
      [draggingNode]: { x, y },
    }));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const statsNodes = nodes.length;
  const statsEdges = edges.length;
  const topNodes = [...nodes].sort((a, b) => b.importance - a.importance).slice(0, 5);

  const edgeNodeIds = new Set();
  edges.forEach((e) => {
    edgeNodeIds.add(e.source_node_id || e.sourceNodeId);
    edgeNodeIds.add(e.target_node_id || e.targetNodeId);
  });
  const orphanNodes = nodes.filter((n) => !edgeNodeIds.has(n.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground font-heading">Graph Explorer</h2>
          <p className="text-xs text-muted-foreground font-mono">
            {statsNodes} nodes · {statsEdges} edges · {orphanNodes.length} orphans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Link to="/nodes/new">
            <Button size="sm" className="bg-primary hover:bg-primary/80">
              <Plus className="w-4 h-4 mr-1" /> Add Node
            </Button>
          </Link>
        </div>
      </div>

      {/* Graph Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab"
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ background: 'radial-gradient(ellipse at center, hsl(230 22% 12%) 0%, hsl(230 25% 7%) 70%)' }}
      >
        <svg
          width={svgSize.width}
          height={svgSize.height}
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: '0 0' }}
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(230 20% 15%)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={svgSize.width} height={svgSize.height} fill="url(#grid)" />

          {/* Edges */}
          {edges.map((edge) => {
            const sId = edge.source_node_id || edge.sourceNodeId;
            const tId = edge.target_node_id || edge.targetNodeId;
            const sp = positions[sId];
            const tp = positions[tId];
            if (!sp || !tp) return null;
            return (
              <g key={edge.id}>
                <line
                  x1={sp.x}
                  y1={sp.y}
                  x2={tp.x}
                  y2={tp.y}
                  stroke="hsl(230 20% 30%)"
                  strokeWidth={1 + (edge.strength || 5) / 10}
                  opacity={0.6}
                />
                {/* Arrow */}
                <polygon
                  points={`${tp.x},${tp.y} ${tp.x - 6},${tp.y - 4} ${tp.x - 6},${tp.y + 4}`}
                  fill="hsl(230 20% 40%)"
                  opacity={0.6}
                  transform={`rotate(${Math.atan2(tp.y - sp.y, tp.x - sp.x) * (180 / Math.PI) - 90}, ${tp.x}, ${tp.y})`}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const color = node.color || TYPE_COLORS[node.type] || TYPE_COLORS.concept;
            const glow = TYPE_GLOWS[node.type] || TYPE_GLOWS.concept;
            const isDragging = draggingNode === node.id;
            const isHovered = hoveredNode === node.id;
            const r = 8 + (node.importance || 5) * 1.5;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
              >
                {/* Glow */}
                <circle r={r + 8} fill={glow} opacity={isHovered ? 0.6 : 0.2} />
                {/* Node circle */}
                <circle r={r} fill={color} opacity={0.9} stroke="hsl(230 25% 7%)" strokeWidth={2} />
                {/* Inner dot for high importance */}
                {node.importance >= 8 && <circle r={3} fill="white" opacity={0.8} />}
                {/* Label */}
                <text
                  y={r + 12}
                  textAnchor="middle"
                  className="font-mono"
                  fill={isHovered ? '#fff' : 'hsl(220 20% 80%)'}
                  fontSize="10"
                  opacity={isHovered ? 1 : 0.7}
                >
                  {node.name.length > 15 ? node.name.slice(0, 15) + '…' : node.name}
                </text>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g transform={`translate(0, ${-r - 15})`}>
                    <rect
                      x={-120}
                      y={-40}
                      width={240}
                      height={40}
                      rx={6}
                      fill="hsl(230 22% 10%)"
                      stroke="hsl(230 20% 25%)"
                      strokeWidth={1}
                    />
                    <text x={0} y={-18} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
                      {node.name}
                    </text>
                    <text x={0} y={-4} textAnchor="middle" fill="hsl(220 15% 55%)" fontSize="9">
                      {node.type} · importance {node.importance}/10
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating "click node" hint */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No nodes yet. Create your first node to start building your graph memory.</p>
              <Link to="/nodes/new">
                <Button className="mt-4 bg-primary hover:bg-primary/80">Create First Node</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar: Top Nodes */}
      <div className="px-6 py-3 border-t border-border flex-shrink-0 flex items-center gap-4 overflow-x-auto">
        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">Top Nodes:</span>
        {topNodes.map((node) => (
          <Link
            key={node.id}
            to={`/nodes/${node.id}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-border hover:border-primary/40 transition-colors flex-shrink-0"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: node.color || TYPE_COLORS[node.type] }}
            />
            <span className="text-foreground font-mono">{node.name}</span>
          </Link>
        ))}
        {topNodes.length === 0 && (
          <span className="text-xs text-muted-foreground">No nodes yet</span>
        )}
      </div>
    </div>
  );
}