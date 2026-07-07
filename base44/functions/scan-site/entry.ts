import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL is required' }, { status: 400, headers: corsHeaders });
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    let urlObj;
    try {
      urlObj = new URL(targetUrl);
    } catch {
      return Response.json({ error: 'Invalid URL' }, { status: 400, headers: corsHeaders });
    }
    const domain = urlObj.hostname;
    const baseUrl = `${urlObj.protocol}//${domain}`;

    // Fetch homepage with timeout
    const homepageHtml = await fetchWithTimeout(targetUrl, 15000);
    const html = await homepageHtml.text();

    // Extract metadata
    const title = extractTag(html, 'title') || domain;
    const description = extractMetaTag(html, 'description') || '';
    const hasMarkdownAlternate = /<link[^>]*rel=["']alternate["'][^>]*type=["']text\/markdown["'][^>]*>/i.test(html) ||
      /<link[^>]*type=["']text\/markdown["'][^>]*rel=["']alternate["'][^>]*>/i.test(html);

    // Convert to markdown
    const markdown = htmlToMarkdown(html);

    // Check discovery files in parallel
    const fileResults = await Promise.allSettled([
      fetchWithTimeout(`${baseUrl}/robots.txt`, 8000),
      fetchWithTimeout(`${baseUrl}/llms.txt`, 8000),
      fetchWithTimeout(`${baseUrl}/llms-full.txt`, 8000),
      fetchWithTimeout(`${baseUrl}/.well-known/agents.json`, 8000),
      fetchWithTimeout(`${baseUrl}/.well-known/mcp.json`, 8000),
      fetchWithTimeout(`${baseUrl}/sitemap.xml`, 8000),
    ]);

    const hasRobots = fileResults[0].status === 'fulfilled' && fileResults[0].value.ok;
    const hasLlmsTxt = fileResults[1].status === 'fulfilled' && fileResults[1].value.ok;
    const hasLlmsFull = fileResults[2].status === 'fulfilled' && fileResults[2].value.ok;
    const hasAgentsJson = fileResults[3].status === 'fulfilled' && fileResults[3].value.ok;
    const hasMcpJson = fileResults[4].status === 'fulfilled' && fileResults[4].value.ok;
    const hasSitemap = fileResults[5].status === 'fulfilled' && fileResults[5].value.ok;

    // Extract MCP endpoints from robots.txt and mcp.json
    const mcpEndpoints = [];
    if (hasRobots) {
      try {
        const robotsText = await fileResults[0].value.text();
        const mcpMatch = robotsText.match(/MCP-endpoint:\s*(.+)/i);
        if (mcpMatch) mcpEndpoints.push(mcpMatch[1].trim());
      } catch { /* ignore */ }
    }
    if (hasMcpJson) {
      try {
        const mcpJson = await fileResults[4].value.json();
        if (mcpJson.mcp?.endpoint) mcpEndpoints.push(mcpJson.mcp.endpoint);
        if (mcpJson.endpoints?.mcp) mcpEndpoints.push(mcpJson.endpoints.mcp);
      } catch { /* ignore */ }
    }

    // Detect API docs link in HTML
    const hasApiDocs = /<a[^>]*href=["'][^"']*(api|docs|developer)[^"']*["'][^>]*>/i.test(html);

    // Detect commerce/payment signals
    const lowerHtml = html.toLowerCase();
    const hasCommerce = lowerHtml.includes('pricing') || lowerHtml.includes('plans') || lowerHtml.includes('cart') || lowerHtml.includes('checkout');
    const hasPayment = lowerHtml.includes('stripe') || lowerHtml.includes('paypal') || lowerHtml.includes('payment') || lowerHtml.includes('apple pay') || lowerHtml.includes('google pay');

    // Calculate scores
    let readable = 0;
    if (hasRobots) readable += 15;
    if (hasLlmsTxt) readable += 25;
    if (hasLlmsFull) readable += 25;
    if (hasMarkdownAlternate) readable += 20;
    if (description) readable += 15;

    let callable = 0;
    if (hasAgentsJson) callable += 25;
    if (hasMcpJson) callable += 25;
    if (mcpEndpoints.length > 0) callable += 30;
    if (hasApiDocs) callable += 20;

    let commerce = 0;
    if (lowerHtml.includes('pricing') || lowerHtml.includes('plans')) commerce += 30;
    if (lowerHtml.includes('cart') || lowerHtml.includes('checkout')) commerce += 30;
    if (lowerHtml.includes('buy') || lowerHtml.includes('purchase')) commerce += 20;
    if (lowerHtml.includes('product')) commerce += 20;

    let payment = 0;
    if (lowerHtml.includes('stripe')) payment += 25;
    if (lowerHtml.includes('paypal')) payment += 25;
    if (lowerHtml.includes('payment')) payment += 25;
    if (lowerHtml.includes('apple pay') || lowerHtml.includes('google pay')) payment += 25;

    const overall = Math.round(readable * 0.35 + callable * 0.25 + commerce * 0.2 + payment * 0.2);

    // Generate priority fixes
    const fixes = [];
    if (!hasLlmsTxt) fixes.push({ severity: 'high', title: 'No llms.txt detected', description: 'AI systems have no root-level reading guide for your canonical docs, product pages, or policy pages.' });
    if (!hasLlmsFull) fixes.push({ severity: 'high', title: 'No llms-full.txt published', description: 'There is no deeper single-fetch markdown reference for agents that need fuller context.' });
    if (!hasMarkdownAlternate) fixes.push({ severity: 'medium', title: 'Markdown alternate link missing', description: 'Agents can find the HTML page, but are not told where the matching markdown source lives.' });
    if (!hasAgentsJson) fixes.push({ severity: 'medium', title: 'No agents.json', description: 'There is no machine-readable place for agents to discover safe public actions or declared capabilities.' });
    if (mcpEndpoints.length === 0) fixes.push({ severity: 'medium', title: 'No MCP endpoint detected', description: 'No callable MCP server found. Agents cannot programmatically interact with the site.' });
    if (!hasRobots) fixes.push({ severity: 'low', title: 'No robots.txt', description: 'No crawl directives for bots and AI systems.' });
    if (commerce === 0) fixes.push({ severity: 'low', title: 'No agent-ready sales flow', description: 'No machine-readable commerce surface detected for agent-driven purchasing.' });

    const detectedDocs = [];
    if (hasRobots) detectedDocs.push({ name: 'robots.txt', url: `${baseUrl}/robots.txt` });
    if (hasLlmsTxt) detectedDocs.push({ name: 'llms.txt', url: `${baseUrl}/llms.txt` });
    if (hasLlmsFull) detectedDocs.push({ name: 'llms-full.txt', url: `${baseUrl}/llms-full.txt` });
    if (hasAgentsJson) detectedDocs.push({ name: 'agents.json', url: `${baseUrl}/.well-known/agents.json` });
    if (hasMcpJson) detectedDocs.push({ name: 'mcp.json', url: `${baseUrl}/.well-known/mcp.json` });
    if (hasSitemap) detectedDocs.push({ name: 'sitemap.xml', url: `${baseUrl}/sitemap.xml` });

    // Check for existing scan by domain — update if exists, create if not
    const existing = await base44.asServiceRole.entities.SiteScan.filter({ domain });
    const scanData = {
      url: targetUrl,
      domain,
      title,
      description,
      markdown_content: markdown.slice(0, 50000),
      overall_score: Math.min(overall, 100),
      readable_score: Math.min(readable, 100),
      callable_score: Math.min(callable, 100),
      commerce_score: Math.min(commerce, 100),
      payment_score: Math.min(payment, 100),
      has_robots_txt: hasRobots,
      has_llms_txt: hasLlmsTxt,
      has_llms_full_txt: hasLlmsFull,
      has_agents_json: hasAgentsJson,
      has_mcp_json: hasMcpJson,
      has_sitemap: hasSitemap,
      has_markdown_alternate: hasMarkdownAlternate,
      mcp_endpoints: JSON.stringify([...new Set(mcpEndpoints)]),
      priority_fixes: JSON.stringify(fixes),
      detected_docs: JSON.stringify(detectedDocs),
      scan_status: 'completed',
      error_message: null,
    };

    let scan;
    if (existing.length > 0) {
      scan = await base44.asServiceRole.entities.SiteScan.update(existing[0].id, scanData);
    } else {
      scan = await base44.asServiceRole.entities.SiteScan.create(scanData);
    }

    return Response.json({ success: true, scan }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SynapseScan/1.0 (AI Readiness Scanner)' },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

function extractMetaTag(html, name) {
  const match = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
  return match ? match[1].trim() : null;
}

function htmlToMarkdown(html) {
  let md = html;
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');
  md = md.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  md = md.replace(/<\/div>/gi, '\n');
  md = md.replace(/<div[^>]*>/gi, '');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&#x27;/g, "'");
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}