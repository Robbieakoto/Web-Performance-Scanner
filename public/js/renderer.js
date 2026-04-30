// renderer.js — DOM rendering helpers

const CATEGORY_META = {
  news:       { label: 'News',       emoji: '📰', cls: 'badge-news' },
  banking:    { label: 'Banking',    emoji: '🏦', cls: 'badge-banking' },
  ecommerce:  { label: 'E-Commerce', emoji: '🛒', cls: 'badge-ecommerce' },
  government: { label: 'Government', emoji: '🏛️', cls: 'badge-government' },
};

const ISSUE_SHORT = {
  unoptimized_images:       'Images',
  render_blocking_resources:'Render-blocking',
  unused_javascript:        'Unused JS',
  unused_css:               'Unused CSS',
  no_https:                 'No HTTPS',
  no_text_compression:      'No Gzip',
  missing_alt_text:         'Alt Text',
  large_network_payload:    'Large Payload',
  no_lazy_loading:          'No Lazy Load',
  no_cdn:                   'No CDN',
};

function scoreClass(score) {
  if (score >= 90) return 'score-good';
  if (score >= 50) return 'score-medium';
  return 'score-poor';
}

function lcpClass(val)  { return val <= 2.5 ? 'metric-good' : val <= 4.0 ? 'metric-warn' : 'metric-bad'; }
function clsClass(val)  { return val <= 0.1 ? 'metric-good' : val <= 0.25 ? 'metric-warn' : 'metric-bad'; }
function fcpClass(val)  { return val <= 1.8 ? 'metric-good' : val <= 3.0 ? 'metric-warn' : 'metric-bad'; }
function ttfbClass(val) { return val <= 0.8 ? 'metric-good' : val <= 1.8 ? 'metric-warn' : 'metric-bad'; }

function renderTable(sites) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  // Sort by performance descending by default
  const sorted = [...sites].sort((a, b) => b.scores.performance - a.scores.performance);

  tbody.innerHTML = sorted.map((site, i) => {
    const cat = CATEGORY_META[site.category] || {};
    const failedAudits = Object.entries(site.audits).filter(([, v]) => v);
    const shownIssues = failedAudits.slice(0, 3);
    const extra = failedAudits.length - shownIssues.length;

    return `
      <tr style="animation-delay:${i * 0.04}s">
        <td class="td-rank">${i + 1}</td>
        <td>
          <div class="td-site">
            <span class="site-name">${site.name}</span>
            <span class="site-url">${site.url.replace('https://','').replace('www.','')}</span>
          </div>
        </td>
        <td>
          <span class="category-badge ${cat.cls}">
            ${cat.emoji} ${cat.label}
          </span>
        </td>
        <td class="score-cell">
          <div class="score-ring ${scoreClass(site.scores.performance)}">
            ${site.scores.performance}
          </div>
        </td>
        <td class="metric-cell">
          <span class="metric-value ${lcpClass(site.metrics.lcp)}">${site.metrics.lcp}s</span>
        </td>
        <td class="metric-cell">
          <span class="metric-value ${clsClass(site.metrics.cls)}">${site.metrics.cls}</span>
        </td>
        <td class="metric-cell">
          <span class="metric-value ${fcpClass(site.metrics.fcp)}">${site.metrics.fcp}s</span>
        </td>
        <td class="metric-cell">
          <span class="metric-value ${ttfbClass(site.metrics.ttfb)}">${site.metrics.ttfb}s</span>
        </td>
        <td>
          <div class="issues-cell">
            ${shownIssues.map(([k]) => `<span class="issue-chip">${ISSUE_SHORT[k] || k}</span>`).join('')}
            ${extra > 0 ? `<span class="issue-chip-count">+${extra}</span>` : ''}
          </div>
        </td>
        <td class="metric-cell">
          <span class="metric-value ${scoreClass(site.scores.accessibility)}" style="font-size:0.8rem;">
            ${site.scores.accessibility}
          </span>
        </td>
      </tr>`;
  }).join('');
}

function renderSummaryCards(sites) {
  const best  = [...sites].sort((a,b) => b.scores.performance - a.scores.performance)[0];
  const worst = [...sites].sort((a,b) => a.scores.performance - b.scores.performance)[0];
  const top   = getMostCommonIssue();
  const fs    = getFastestSector();
  const sectorLabels = { news:'News', banking:'Banking', ecommerce:'E-Commerce', government:'Government' };

  setText('bestSite',  best.name);
  setText('bestScore', `Score: ${best.scores.performance}`);
  setText('worstSite',  worst.name);
  setText('worstScore', `Score: ${worst.scores.performance}`);
  setText('topIssue',   top.label);
  setText('topIssueAffected', `${top.count} of 20 sites affected`);
  setText('fastestSector', sectorLabels[fs.name] || fs.name);
  setText('fastestSectorScore', `Avg score: ${fs.avg}`);
}

function renderHeroStats() {
  const avg    = getAvgScore();
  const pass   = getPassingCWV();
  const issues = getTopCommonIssueCount();

  animateCounter(document.getElementById('avgScore'), avg);
  animateCounter(document.getElementById('passingCount'), pass);
  animateCounter(document.getElementById('topIssueCount'), issues);
  animateCounter(document.querySelector('[data-target="20"]'), 20);
}

function renderRecommendations() {
  const recs = [
    {
      priority: 'critical',
      title: 'Compress & Convert Images to WebP/AVIF',
      desc: '19 of 20 sites serve unoptimized images. Switching to modern formats (WebP or AVIF) with proper compression can reduce image payload by 40–80%, directly improving LCP.',
      affected: '19/20 sites',
      impact: 'LCP −2–8s',
      effort: 'Low–Medium',
    },
    {
      priority: 'critical',
      title: 'Eliminate Render-Blocking Resources',
      desc: '19 sites have scripts or stylesheets blocking initial render. Defer non-critical JS with `async`/`defer`, and inline critical CSS to unblock paint immediately.',
      affected: '19/20 sites',
      impact: 'FCP −1–4s',
      effort: 'Medium',
    },
    {
      priority: 'high',
      title: 'Remove Unused JavaScript',
      desc: '18 sites ship large JS bundles where a significant portion is never executed. Use code-splitting, tree-shaking, or remove unused third-party scripts to reduce TBT.',
      affected: '18/20 sites',
      impact: 'TBT −30–70%',
      effort: 'Medium–High',
    },
    {
      priority: 'high',
      title: 'Add Lazy Loading to Off-Screen Images',
      desc: '15 sites load all images eagerly. Adding `loading="lazy"` to off-screen images defers their download, reducing initial page weight and improving LCP for above-the-fold content.',
      affected: '15/20 sites',
      impact: 'LCP −1–3s',
      effort: 'Low (1 attribute)',
    },
    {
      priority: 'high',
      title: 'Deploy a CDN (Content Delivery Network)',
      desc: '14 sites serve assets directly from a single origin server. Using a CDN like Cloudflare (free tier) moves assets geographically closer to users, slashing TTFB by 50–80%.',
      affected: '14/20 sites',
      impact: 'TTFB −50–80%',
      effort: 'Low (DNS change)',
    },
    {
      priority: 'high',
      title: 'Enable Text Compression (Gzip/Brotli)',
      desc: '6 sites — mostly government — serve HTML, CSS, and JS without compression. Enabling Gzip or Brotli on the web server takes minutes and can reduce transfer size by 70%.',
      affected: '6/20 sites',
      impact: 'Payload −50–70%',
      effort: 'Very Low',
    },
    {
      priority: 'medium',
      title: 'Reduce Cumulative Layout Shift (CLS)',
      desc: 'Most sites show CLS > 0.1, causing visible layout jumps. Fix by setting explicit width/height on images and iframes, and avoiding dynamically injected content above the fold.',
      affected: '16/20 sites',
      impact: 'CLS to < 0.1',
      effort: 'Low–Medium',
    },
    {
      priority: 'medium',
      title: 'Add Alt Text to All Images',
      desc: '13 sites are missing alt attributes on images, hurting both accessibility (WCAG 2.1) and SEO. This is a quick win — audit with axe DevTools and fix in an afternoon.',
      affected: '13/20 sites',
      impact: 'A11y +10–20pts',
      effort: 'Very Low',
    },
  ];

  const grid = document.getElementById('recsGrid');
  if (!grid) return;
  grid.innerHTML = recs.map((r, i) => `
    <div class="rec-card priority-${r.priority} fade-in" style="animation-delay:${i*0.07}s">
      <div class="rec-number">${i + 1}</div>
      <div class="rec-body">
        <span class="rec-priority">${r.priority}</span>
        <h3 class="rec-title">${r.title}</h3>
        <p class="rec-desc">${r.desc}</p>
        <div class="rec-meta">
          <div class="rec-meta-item">🎯 <strong>${r.affected}</strong></div>
          <div class="rec-meta-item">📈 <strong>${r.impact}</strong></div>
          <div class="rec-meta-item">⚙️ Effort: <strong>${r.effort}</strong></div>
        </div>
      </div>
    </div>
  `).join('');
}

// Helpers
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function animateCounter(el, target) {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// Table sorting
let currentSort = { col: 'performance', dir: 'desc' };
let currentFilter = 'all';

function setupTableSort() {
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
      } else {
        currentSort.col = col;
        currentSort.dir = 'desc';
      }
      document.querySelectorAll('.sortable').forEach(t => {
        t.classList.remove('active-sort');
        t.querySelector('.sort-icon').textContent = '⇅';
      });
      th.classList.add('active-sort');
      th.querySelector('.sort-icon').textContent = currentSort.dir === 'desc' ? '↓' : '↑';

      const filtered = filterSites(currentFilter);
      const sorted   = sortSites(filtered, currentSort.col, currentSort.dir);
      renderTable(sorted);
    });
  });
}

function sortSites(sites, col, dir) {
  return [...sites].sort((a, b) => {
    let va, vb;
    const metricKeys = ['lcp','fcp','cls','ttfb','speed_index'];
    if (metricKeys.includes(col)) {
      va = a.metrics[col]; vb = b.metrics[col];
    } else if (['performance','accessibility','best_practices','seo'].includes(col)) {
      va = a.scores[col]; vb = b.scores[col];
    } else {
      va = a[col] || ''; vb = b[col] || '';
    }
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return dir === 'asc' ? va - vb : vb - va;
  });
}
