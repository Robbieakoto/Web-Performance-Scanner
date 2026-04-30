#!/usr/bin/env node
/**
 * run_audit.js
 * ─────────────────────────────────────────────────────────────────
 * Fetches real PageSpeed Insights data for all 20 Ghanaian websites
 * and writes the results to public/data/results.json
 *
 * Setup:
 *   1. Copy .env.example to .env
 *   2. Fill in your PSI_API_KEY in .env
 *   3. Run: node scripts/run_audit.js
 *
 * Get a free API key at:
 *   https://developers.google.com/speed/docs/insights/v5/get-started
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// Auto-load .env from project root (if it exists)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn('⚠️  No .env file found. Copy .env.example → .env and fill in your keys.\n');
}

// ── CONFIG ────────────────────────────────────────────────────────
const API_KEY  = process.env.PSI_API_KEY || '';
const STRATEGY = 'mobile'; // 'mobile' | 'desktop'
const DELAY_MS = 2500;     // Pause between requests (PSI rate-limit: ~200 req/100s)
const OUT_FILE = path.join(__dirname, '..', 'public', 'data', 'results.json');

if (!API_KEY) {
  console.error('\n❌  PSI_API_KEY is not set.');
  console.error('   1. Copy .env.example to .env');
  console.error('   2. Open .env and paste your API key next to PSI_API_KEY=');
  console.error('   3. Run this script again: node scripts/run_audit.js\n');
  process.exit(1);
}


// ── SITES LIST ────────────────────────────────────────────────────
const SITES = [
  // News
  { id: 1,  name: 'MyJoyOnline',       url: 'https://www.myjoyonline.com',    category: 'news' },
  { id: 2,  name: 'GhanaWeb',          url: 'https://www.ghanaweb.com',        category: 'news' },
  { id: 3,  name: 'Graphic Online',    url: 'https://www.graphic.com.gh',      category: 'news' },
  { id: 4,  name: 'Citinewsroom',      url: 'https://citinewsroom.com',        category: 'news' },
  { id: 5,  name: 'Pulse Ghana',       url: 'https://www.pulse.com.gh',        category: 'news' },
  // Banking
  { id: 6,  name: 'GCB Bank',          url: 'https://www.gcbbank.com.gh',      category: 'banking' },
  { id: 7,  name: 'Absa Ghana',        url: 'https://www.absa.com.gh',         category: 'banking' },
  { id: 8,  name: 'Stanbic Ghana',     url: 'https://www.stanbicbank.com.gh',  category: 'banking' },
  { id: 9,  name: 'Ecobank Ghana',     url: 'https://www.ecobank.com',         category: 'banking' },
  { id: 10, name: 'MTN Ghana',         url: 'https://www.mtn.com.gh',          category: 'banking' },
  // E-Commerce
  { id: 11, name: 'Jumia Ghana',       url: 'https://www.jumia.com.gh',        category: 'ecommerce' },
  { id: 12, name: 'Tonaton',           url: 'https://tonaton.com',             category: 'ecommerce' },
  { id: 13, name: 'Melcom Ghana',      url: 'https://melcom.com',              category: 'ecommerce' },
  { id: 14, name: 'Hubtel',            url: 'https://hubtel.com',              category: 'ecommerce' },
  { id: 15, name: 'Paystack',          url: 'https://paystack.com',            category: 'ecommerce' },
  // Government / Education
  { id: 16, name: 'Ghana.gov.gh',      url: 'https://ghana.gov.gh',            category: 'government' },
  { id: 17, name: 'GRA Ghana',         url: 'https://gra.gov.gh',              category: 'government' },
  { id: 18, name: 'University of Ghana', url: 'https://www.ug.edu.gh',         category: 'government' },
  { id: 19, name: 'KNUST',             url: 'https://www.knust.edu.gh',        category: 'government' },
  { id: 20, name: 'NHIS Ghana',        url: 'https://nhis.gov.gh',             category: 'government' },
];

// ── HELPERS ───────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function num(val, decimals = 2) {
  return val != null ? parseFloat(val.toFixed(decimals)) : null;
}

// ── PSI PARSER ────────────────────────────────────────────────────
function parsePSI(site, psiData) {
  const cats      = psiData.lighthouseResult?.categories || {};
  const audits    = psiData.lighthouseResult?.audits || {};
  const metrics   = audits['metrics']?.details?.items?.[0] || {};

  const score = key => Math.round((cats[key]?.score || 0) * 100);

  // Core Web Vitals & timing (values in ms from Lighthouse, convert to seconds)
  const ms = key => num((metrics[key] || 0) / 1000);

  const lcp  = ms('largestContentfulPaint');
  const fcp  = ms('firstContentfulPaint');
  const si   = ms('speedIndex');
  const tti  = ms('interactive');
  const tbt  = num(metrics['totalBlockingTime'] || 0, 0);

  // CLS is already a unitless score
  const cls  = num(audits['cumulative-layout-shift']?.numericValue || 0);

  // TTFB from the server-response-time audit (in ms)
  const ttfb = num((audits['server-response-time']?.numericValue || 0) / 1000);

  // Audit flags
  function failed(id) {
    const a = audits[id];
    if (!a) return false;
    return a.score !== null && a.score < 1;
  }

  return {
    id: site.id,
    name: site.name,
    url: site.url,
    category: site.category,
    scores: {
      performance:    score('performance'),
      accessibility:  score('accessibility'),
      best_practices: score('best-practices'),
      seo:            score('seo'),
    },
    metrics: {
      fcp,
      lcp,
      cls,
      ttfb,
      speed_index:  si,
      tti,
      tbt,
    },
    audits: {
      unoptimized_images:        failed('uses-optimized-images'),
      render_blocking_resources: failed('render-blocking-resources'),
      unused_javascript:         failed('unused-javascript'),
      unused_css:                failed('unused-css-rules'),
      no_https:                  failed('is-on-https'),
      no_text_compression:       failed('uses-text-compression'),
      missing_alt_text:          failed('image-alt'),
      large_network_payload:     failed('total-byte-weight'),
      no_lazy_loading:           failed('offscreen-images'),
      no_cdn:                    failed('uses-long-cache-ttl'),
    },
  };
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🇬🇭  Ghana Web Performance Scanner — PSI Audit Runner`);
  console.log(`    Strategy: ${STRATEGY.toUpperCase()} | Sites: ${SITES.length}\n`);

  const results = [];
  const errors  = [];

  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[i];
    const progress = `[${i + 1}/${SITES.length}]`;

    process.stdout.write(`${progress} Scanning ${site.name} (${site.url})... `);

    const apiUrl = [
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
      `?url=${encodeURIComponent(site.url)}`,
      `&strategy=${STRATEGY}`,
      `&category=performance`,
      `&category=accessibility`,
      `&category=best-practices`,
      `&category=seo`,
      `&key=${API_KEY}`,
    ].join('');

    try {
      const data   = await fetchJSON(apiUrl);
      if (data.error) throw new Error(data.error.message);

      const parsed = parsePSI(site, data);
      results.push(parsed);

      const score = parsed.scores.performance;
      const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴';
      console.log(`${emoji} Score: ${score} | LCP: ${parsed.metrics.lcp}s | CLS: ${parsed.metrics.cls}`);
    } catch (err) {
      console.error(`❌ Failed: ${err.message}`);
      errors.push({ site: site.name, error: err.message });
    }

    // Wait between requests (skip delay after last site)
    if (i < SITES.length - 1) {
      process.stdout.write(`    ⏳ Waiting ${DELAY_MS / 1000}s before next request...\r`);
      await sleep(DELAY_MS);
    }
  }

  // Write output
  const output = {
    meta: {
      scanned_at:   new Date().toISOString(),
      strategy:     STRATEGY,
      api_version:  'v5',
      total_sites:  results.length,
      errors:       errors.length,
    },
    sites: results,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅  Audit complete!`);
  console.log(`    Sites scanned: ${results.length}/${SITES.length}`);
  if (errors.length > 0) {
    console.log(`    ⚠️  Errors: ${errors.length}`);
    errors.forEach(e => console.log(`       - ${e.site}: ${e.error}`));
  }
  console.log(`    Output: ${OUT_FILE}\n`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
