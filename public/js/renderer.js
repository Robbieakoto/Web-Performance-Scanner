// renderer.js — DOM rendering helpers

const CATEGORY_META = {
  news: { label: 'News', emoji: '📰', cls: 'badge-news' },
  banking: { label: 'Banking', emoji: '🏦', cls: 'badge-banking' },
  ecommerce: { label: 'E-Commerce', emoji: '🛒', cls: 'badge-ecommerce' },
  government: { label: 'Government', emoji: '🏛️', cls: 'badge-government' },
  fintech: { label: 'Fintech', emoji: '🏦', cls: 'badge-fintech' },
  telecom: { label: 'Telecom', emoji: '📞', cls: 'badge-telecom' },
};

const ISSUE_SHORT = {
  unoptimized_images: 'Images',
  render_blocking_resources: 'Render-blocking',
  unused_javascript: 'Unused JS',
  unused_css: 'Unused CSS',
  no_https: 'No HTTPS',
  no_text_compression: 'No Gzip',
  missing_alt_text: 'Alt Text',
  large_network_payload: 'Large Payload',
  no_lazy_loading: 'No Lazy Load',
  poor_cache_ttl: 'Poor Cache TTL',
};

function scoreClass(score) {
  if (score >= 90) return 'score-good';
  if (score >= 50) return 'score-medium';
  return 'score-poor';
}

function lcpClass(val) { return val <= 2.5 ? 'metric-good' : val <= 4.0 ? 'metric-warn' : 'metric-bad'; }
function clsClass(val) { return val <= 0.1 ? 'metric-good' : val <= 0.25 ? 'metric-warn' : 'metric-bad'; }
function fcpClass(val) { return val <= 1.8 ? 'metric-good' : val <= 3.0 ? 'metric-warn' : 'metric-bad'; }
function ttfbClass(val) { return val <= 0.8 ? 'metric-good' : val <= 1.8 ? 'metric-warn' : 'metric-bad'; }
function inpClass(val) { return val <= 200 ? 'metric-good' : val <= 500 ? 'metric-warn' : 'metric-bad'; }

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
            <span class="site-url">${site.url.replace('https://', '').replace('www.', '')}</span>
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
        <td class="metric-cell">
          <span class="metric-value ${inpClass(site.metrics.inp ?? 0)}">${site.metrics.inp != null ? site.metrics.inp + 'ms' : 'N/A'}</span>
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
  const best = [...sites].sort((a, b) => b.scores.performance - a.scores.performance)[0];
  const worst = [...sites].sort((a, b) => a.scores.performance - b.scores.performance)[0];
  const top = getMostCommonIssue();
  const fs = getFastestSector();
  const sectorLabels = { news: 'News', banking: 'Banking', ecommerce: 'E-Commerce', government: 'Government', fintech: 'Fintech', telecom: 'Telecom' };

  setText('bestSite', best.name);
  setText('bestScore', `Score: ${best.scores.performance}`);
  setText('worstSite', worst.name);
  setText('worstScore', `Score: ${worst.scores.performance}`);
  setText('topIssue', top.label);
  setText('topIssueAffected', `${top.count} of 20 sites affected`);
  setText('fastestSector', sectorLabels[fs.name] || fs.name);
  setText('fastestSectorScore', `Avg score: ${fs.avg}`);
}

function renderHeroStats() {
  const avg = getAvgScore();
  const pass = getPassingCWV();
  const issues = getTopCommonIssueCount();

  animateCounter(document.getElementById('avgScore'), avg);
  animateCounter(document.getElementById('passingCount'), pass);
  animateCounter(document.getElementById('topIssueCount'), issues);
  animateCounter(document.querySelector('[data-target="20"]'), 20);
}

function renderRecommendations() {
  const auditCounts = getAuditFailureCounts().reduce((map, a) => {
    map[a.key] = a.count;
    return map;
  }, {});

  const n = key => auditCounts[key] || 0;

  const recs = [
    {
      priority: n('unused_javascript') >= 15 ? 'critical' : 'high',
      title: 'Remove Unused JavaScript',
      desc: `${n('unused_javascript')} of 20 sites ship JavaScript bundles where a significant portion is never executed. Use code-splitting, tree-shaking, or remove unused third-party scripts to reduce Total Blocking Time.`,
      affected: `${n('unused_javascript')}/20 sites`,
      impact: 'TBT −30–70%',
      effort: 'Medium–High',
    },
    {
      priority: n('unused_css') >= 12 ? 'critical' : 'high',
      title: 'Remove Unused CSS',
      desc: `${n('unused_css')} of 20 sites load stylesheets with large amounts of CSS that are never applied. Use PurgeCSS or built-in tree-shaking in your bundler to strip unused rules before deployment.`,
      affected: `${n('unused_css')}/20 sites`,
      impact: 'FCP −0.5–2s',
      effort: 'Low–Medium',
    },
    {
      priority: n('large_network_payload') >= 10 ? 'high' : 'medium',
      title: 'Reduce Total Network Payload',
      desc: `${n('large_network_payload')} of 20 sites transfer more than 1.6 MB of resources on load. Compress assets, lazy-load non-critical resources, and audit third-party scripts for payload cost.`,
      affected: `${n('large_network_payload')}/20 sites`,
      impact: 'LCP −1–4s',
      effort: 'Medium',
    },
    {
      priority: n('missing_alt_text') >= 10 ? 'high' : 'medium',
      title: 'Add Alt Text to All Images',
      desc: `${n('missing_alt_text')} of 20 sites are missing alt attributes on images, failing WCAG 2.1 accessibility standards and hurting SEO. Audit with axe DevTools — most can be fixed in an afternoon.`,
      affected: `${n('missing_alt_text')}/20 sites`,
      impact: 'A11y +10–20pts',
      effort: 'Very Low',
    },
    {
      priority: n('unoptimized_images') >= 10 ? 'high' : 'medium',
      title: 'Compress & Modernise Images',
      desc: `${n('unoptimized_images')} of 20 sites serve images that could be smaller. Convert to WebP or AVIF and apply proper compression — image payload reductions of 40–80% are common, directly improving LCP.`,
      affected: `${n('unoptimized_images')}/20 sites`,
      impact: 'LCP −1–5s',
      effort: 'Low–Medium',
    },
    {
      priority: n('render_blocking_resources') >= 10 ? 'high' : 'medium',
      title: 'Eliminate Render-Blocking Resources',
      desc: `${n('render_blocking_resources')} of 20 sites have scripts or stylesheets blocking the initial render. Defer non-critical JS with async/defer and inline critical CSS to unblock first paint.`,
      affected: `${n('render_blocking_resources')}/20 sites`,
      impact: 'FCP −0.5–3s',
      effort: 'Medium',
    },
    {
      priority: n('no_lazy_loading') >= 8 ? 'high' : 'medium',
      title: 'Lazy Load Off-Screen Images',
      desc: `${n('no_lazy_loading')} of 20 sites load all images eagerly on page load. Adding loading="lazy" to off-screen images defers their download and reduces initial page weight immediately.`,
      affected: `${n('no_lazy_loading')}/20 sites`,
      impact: 'LCP −0.5–2s',
      effort: 'Very Low',
    },
    {
      priority: 'medium',
      title: 'Fix Cache TTL on Static Assets',
      desc: `${n('poor_cache_ttl')} of 20 sites serve static assets without long cache lifetimes, forcing repeat visitors to re-download unchanged files. Set Cache-Control: max-age=31536000 on versioned assets.`,
      affected: `${n('poor_cache_ttl')}/20 sites`,
      impact: 'Repeat visit speed +40–80%',
      effort: 'Low',
    },
  ];

  const grid = document.getElementById('recsGrid');
  if (!grid) return;
  grid.innerHTML = recs.map((r, i) => `
    <div class="rec-card priority-${r.priority} fade-in" style="animation-delay:${i * 0.07}s">
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
      const sorted = sortSites(filtered, currentSort.col, currentSort.dir);
      renderTable(sorted);
    });
  });
}

function sortSites(sites, col, dir) {
  return [...sites].sort((a, b) => {
    let va, vb;
    const metricKeys = ['lcp', 'fcp', 'cls', 'ttfb', 'inp', 'speed_index'];
    if (metricKeys.includes(col)) {
      va = a.metrics[col] ?? 0; vb = b.metrics[col] ?? 0;
    } else if (['performance', 'accessibility', 'best_practices', 'seo'].includes(col)) {
      va = a.scores[col]; vb = b.scores[col];
    } else {
      va = a[col] || ''; vb = b[col] || '';
    }
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return dir === 'asc' ? va - vb : vb - va;
  });
}
