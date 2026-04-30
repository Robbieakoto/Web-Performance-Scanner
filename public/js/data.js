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

function getPassingCWV() {
  return SITES.filter(s =>
    s.metrics.lcp <= 2.5 &&
    s.metrics.cls <= 0.1
  ).length;
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
    no_cdn:                   'No CDN Used',
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
