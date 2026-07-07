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

    // Get up to 20 scans, oldest-updated first (most stale markdown)
    const scans = await base44.asServiceRole.entities.SiteScan.list('updated_date', 20);

    const results = [];
    for (const scan of scans) {
      try {
        // Re-invoke the scan function which re-fetches, re-scores, and updates the graph node
        await base44.asServiceRole.functions.invoke('scan-site', { url: scan.url });
        results.push({ domain: scan.domain, status: 'updated' });
      } catch (e) {
        results.push({ domain: scan.domain, status: 'error', error: e.message });
      }
    }

    return Response.json({
      success: true,
      refreshed: results.filter(r => r.status === 'updated').length,
      total: results.length,
      results,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});