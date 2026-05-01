// data.js — loads results.json and exposes helpers

let SITES = [];

async function loadData() {
  const res = await fetch('data/results.json');
  const json = await res.json();
  SITES = json.sites;
  return SITES;
}

function getAvgScore() {
  return Math.round(SITES.reduce((a, s) => a + s.scores.performance, 0) / SITES.length);
}

function getBest()  { return [...SITES].sort((a,b) => b.scores.performance - a.scores.performance)[0]; }
function getWorst() { return [...SITES].sort((a,b) => a.scores.performance - b.scores.performance)[0]; }

// Google CWV thresholds (all three must pass for a "Good" rating):
//   LCP  ≤ 2.5s  — Largest Contentful Paint
//   INP  ≤ 200ms — Interaction to Next Paint  (replaces FID since March 2024)
//   CLS  ≤ 0.1   — Cumulative Layout Shift
//
// When inp is null (metric not captured in this audit run), the INP gate is
// skipped rather than auto-failing — "unknown" ≠ "failed".
function getPassingCWV() {
  return SITES.filter(s => {
    const { lcp, inp, cls } = s.metrics;
    const lcpPass = lcp  != null && lcp <= 2.5;
    const clsPass = cls  != null && cls <= 0.1;
    const inpPass = inp  == null  || inp <= 200;   // skip if not captured
    return lcpPass && clsPass && inpPass;
  }).length;
}

// How many sites have confirmed INP data vs. still null
function getINPCoverage() {
  return {
    captured: SITES.filter(s => s.metrics.inp != null).length,
    total:    SITES.length,
  };
}

// Populates the INP methodology card with a live coverage count.
// Called from app.js after data loads — this is what keeps getINPCoverage() off the dead-code list.
function renderINPMethodologyNote() {
  const card = document.getElementById('inpMethodCard');
  if (!card) return;
  const { captured, total } = getINPCoverage();
  const p = card.querySelector('p');
  if (!p) return;
  const coveragePhrase = captured === 0
    ? `None of the ${total} sites`
    : `Only ${captured} of ${total} sites`;
  p.innerHTML =
    `INP (Interaction to Next Paint) requires <em>real user interaction</em> to measure and is ` +
    `not available via Lighthouse lab simulation &mdash; which is why the INP column shows ` +
    `<strong>N/A</strong> across all ${total} sites in this audit. ` +
    `CWV pass/fail is evaluated on LCP and CLS, the two metrics Lighthouse <em>can</em> simulate. ` +
    `${coveragePhrase} had INP lab data available at scan time. ` +
    `INP field data for sites with sufficient real-user traffic is accessible via the ` +
    `<a href="https://developers.google.com/speed/docs/insights/v5/about" target="_blank" rel="noopener">Chrome UX Report (CrUX)</a>.`;
}



function getSectorAvg(category) {
  const filtered = SITES.filter(s => s.category === category);
  return Math.round(filtered.reduce((a, s) => a + s.scores.performance, 0) / filtered.length);
}

function getFastestSector() {
  const sectors = ['news', 'banking', 'ecommerce', 'government'];
  return sectors.reduce((best, sec) => {
    const avg = getSectorAvg(sec);
    return avg > best.avg ? { name: sec, avg } : best;
  }, { name: '', avg: 0 });
}

// Count how many sites fail each audit
function getAuditFailureCounts() {
  const keys = Object.keys(SITES[0].audits);
  return keys.map(key => ({
    key,
    count: SITES.filter(s => s.audits[key]).length,
    label: auditLabel(key)
  })).sort((a, b) => b.count - a.count);
}

function auditLabel(key) {
  const map = {
    unoptimized_images:       'Unoptimized Images',
    render_blocking_resources:'Render-Blocking Resources',
    unused_javascript:        'Unused JavaScript',
    unused_css:               'Unused CSS',
    no_https:                 'No HTTPS',
    no_text_compression:      'No Text Compression',
    missing_alt_text:         'Missing Alt Text',
    large_network_payload:    'Large Network Payload',
    no_lazy_loading:          'No Lazy Loading',
    poor_cache_ttl:           'Poor Cache TTL',
  };
  return map[key] || key;
}

function getMostCommonIssue() {
  return getAuditFailureCounts()[0];
}

function getTopCommonIssueCount() {
  const counts = getAuditFailureCounts();
  return counts.filter(a => a.count >= 14).length;
}

function filterSites(category) {
  if (category === 'all') return SITES;
  return SITES.filter(s => s.category === category);
}
