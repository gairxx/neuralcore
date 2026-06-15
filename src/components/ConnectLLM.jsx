import { Brain, Terminal, Code, Globe, ExternalLink } from 'lucide-react';

function CodeBlock({ code, label }) {
  const json = JSON.stringify(code, null, 2);
  return (
    <div className="relative mt-2 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden">
      {label && (
        <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono flex items-center gap-2">
          <Terminal className="w-3 h-3" /> {label}
        </div>
      )}
      <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre">{json}</pre>
    </div>
  );
}

const CLIENTS = [
  {
    name: 'Claude Desktop',
    icon: Brain,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    description: 'Open your Claude Desktop config file:',
    config: (endpoint) => ({
      mcpServers: {
        synapse: {
          type: "http",
          url: endpoint
        }
      }
    }),
    label: 'claude_desktop_config.json',
    note: (
      <>
        <strong>macOS:</strong> <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">~/Library/Application Support/Claude/claude_desktop_config.json</code><br />
        <strong>Windows:</strong> <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">%APPDATA%\Claude\claude_desktop_config.json</code><br />
        Restart Claude Desktop after saving.
      </>
    ),
  },
  {
    name: 'Cursor',
    icon: Terminal,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    description: 'In Cursor, open Settings → MCP and add a new HTTP server:',
    config: (endpoint) => ({
      name: "Synapse",
      type: "http",
      url: endpoint
    }),
    label: 'Cursor MCP Configuration',
    note: (
      <>
        Alternatively, add to <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">.cursor/mcp.json</code> in your project root.
      </>
    ),
  },
  {
    name: 'Continue (VS Code / JetBrains)',
    icon: Code,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    description: 'Add to your Continue config:',
    config: (endpoint) => ({
      experimental: {
        mcpServers: [{
          transport: {
            type: "http",
            url: endpoint
          }
        }]
      }
    }),
    label: 'config.json (Continue)',
    note: (
      <>
        Config location: <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">~/.continue/config.json</code>
      </>
    ),
  },
  {
    name: 'Windsurf',
    icon: Globe,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    description: 'Open the Windsurf MCP settings or add to the config file:',
    config: (endpoint) => ({
      mcpServers: {
        synapse: {
          type: "http",
          url: endpoint
        }
      }
    }),
    label: 'windsurf_mcp_config.json',
    note: (
      <>
        <strong>macOS:</strong> <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">~/.codeium/windsurf/mcp_config.json</code><br />
        <strong>Windows:</strong> <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">%USERPROFILE%\.codeium\windsurf\mcp_config.json</code>
      </>
    ),
  },
  {
    name: 'Custom / Generic MCP Client',
    icon: Terminal,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    description: (
      <>
        Any client implementing the MCP HTTP transport can connect. Send <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">initialize</code> first, then <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">tools/list</code>, then <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">tools/call</code>:
      </>
    ),
    config: (endpoint) => ({
      description: "Synapse Knowledge Graph",
      transport: "http",
      endpoint: endpoint,
      protocol: "json-rpc-2.0"
    }),
    label: 'Generic MCP Client Config',
    note: (
      <>
        Also works with MCP gateways, LangChain MCP adapters, and custom agent frameworks.
      </>
    ),
  },
];

export default function ConnectLLM({ endpoint }) {
  return (
    <div className="mt-12">
      <div className="p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground font-heading">Connect Your LLM</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Add the Synapse MCP server to any MCP-compatible client to give your LLM persistent memory, cross-agent collaboration, and a shared knowledge graph.
        </p>

        {CLIENTS.map((client, idx) => {
          const Icon = client.icon;
          return (
            <div key={client.name} className={`${idx < CLIENTS.length - 1 ? 'mb-6 pb-6 border-b border-border' : 'mb-0 pb-0 border-0'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${client.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${client.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {typeof client.description === 'string' ? client.description : client.description}
              </p>
              <CodeBlock code={client.config(endpoint)} label={client.label} />
              <p className="text-xs text-muted-foreground mt-2">
                {typeof client.note === 'string' ? client.note : client.note}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}