// charts.js — Chart.js chart builders

const COLORS = {
  gold:  '#FCD116',
  green: '#00A550',
  red:   '#CE1126',
  good:  '#22C55E',
  warn:  '#F59E0B',
  bad:   '#EF4444',
  blue:  '#60A5FA',
  purple:'#C084FC',
  orange:'#FB923C',
  muted: '#8B95A7',
};

Chart.defaults.color = '#8B95A7';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding  = 16;

function buildIssuesChart(sites) {
  const counts = getAuditFailureCounts();
  const ctx = document.getElementById('issuesChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: counts.map(c => c.label),
      datasets: [{
        label: 'Sites Affected',
        data: counts.map(c => c.count),
        backgroundColor: counts.map(c =>
          c.count >= 18 ? 'rgba(239,68,68,0.75)' :
          c.count >= 14 ? 'rgba(245,158,11,0.75)' :
          c.count >= 10 ? 'rgba(252,209,22,0.75)' :
                          'rgba(34,197,94,0.75)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x} of 20 sites affected`
          }
        }
      },
      scales: {
        x: {
          max: 20,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { stepSize: 5 }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12 } }
        }
      }
    }
  });
}

function buildScoreDistChart() {
  const buckets = [
    { label: '0–20',  range: [0,20],  color: COLORS.bad },
    { label: '21–40', range: [21,40], color: '#F97316' },
    { label: '41–60', range: [41,60], color: COLORS.warn },
    { label: '61–80', range: [61,80], color: '#84CC16' },
    { label: '81–100',range: [81,100],color: COLORS.good },
  ];
  const counts = buckets.map(b =>
    SITES.filter(s => s.scores.performance >= b.range[0] && s.scores.performance <= b.range[1]).length
  );
  const ctx = document.getElementById('scoreDistChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: buckets.map(b => b.label),
      datasets: [{
        label: 'Sites',
        data: counts,
        backgroundColor: buckets.map(b => b.color + 'BF'),
        borderColor: buckets.map(b => b.color),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.y} site${ctx.parsed.y !== 1 ? 's' : ''}` }
        }
      },
      scales: {
        y: {
          max: 10,
          ticks: { stepSize: 2 },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function buildSectorChart() {
  const sectors = ['news', 'banking', 'ecommerce', 'government'];
  const labels  = ['News', 'Banking', 'E-Commerce', 'Government'];
  const scoreTypes = [
    { key: 'performance',   label: 'Performance', color: COLORS.gold },
    { key: 'accessibility', label: 'Accessibility', color: COLORS.blue },
    { key: 'seo',           label: 'SEO', color: COLORS.green },
  ];

  const ctx = document.getElementById('sectorChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: scoreTypes.map(st => ({
        label: st.label,
        data: sectors.map(sec => {
          const filtered = SITES.filter(s => s.category === sec);
          return Math.round(filtered.reduce((a,s) => a + s.scores[st.key], 0) / filtered.length);
        }),
        backgroundColor: st.color + '99',
        borderColor: st.color,
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}` } }
      },
      scales: {
        y: {
          max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { stepSize: 25 }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function buildCWVBubbleChart() {
  const ctx = document.getElementById('cwvBubbleChart');
  if (!ctx) return;

  const sectorColors = {
    news:       COLORS.blue,
    banking:    COLORS.green,
    ecommerce:  COLORS.purple,
    government: COLORS.orange,
  };

  const sectors = ['news','banking','ecommerce','government'];
  const sectorLabels = { news:'News', banking:'Banking', ecommerce:'E-Commerce', government:'Government' };

  const datasets = sectors.map(sec => ({
    label: sectorLabels[sec],
    data: SITES
      .filter(s => s.category === sec)
      .map(s => ({
        x: s.metrics.lcp,
        y: s.metrics.cls,
        r: Math.max(6, s.scores.performance / 8),
        name: s.name,
        score: s.scores.performance,
      })),
    backgroundColor: sectorColors[sec] + '88',
    borderColor: sectorColors[sec],
    borderWidth: 2,
  }));

  // ── Custom inline plugin: threshold lines drawn in afterDraw ─────
  const cwvThresholdPlugin = {
    id: 'cwvThresholds',
    afterDraw(chart) {
      const { ctx: c, chartArea, scales } = chart;
      const { left, right, top, bottom } = chartArea;
      const xScale = scales.x;
      const yScale = scales.y;
      if (!xScale || !yScale) return;

      c.save();

      // Shaded pass zone: LCP ≤ 2.5s AND CLS ≤ 0.1
      const pxLcp = Math.min(xScale.getPixelForValue(2.5), right);
      const pxCls = Math.max(yScale.getPixelForValue(0.1), top);
      c.fillStyle = 'rgba(34, 197, 94, 0.07)';
      c.fillRect(left, pxCls, pxLcp - left, bottom - pxCls);

      // Vertical line — LCP = 2.5s (green, dashed)
      if (pxLcp >= left && pxLcp <= right) {
        c.beginPath();
        c.setLineDash([6, 4]);
        c.lineWidth = 1.5;
        c.strokeStyle = '#22C55E';
        c.moveTo(pxLcp, top);
        c.lineTo(pxLcp, bottom);
        c.stroke();

        c.setLineDash([]);
        c.fillStyle = '#22C55E';
        c.font = '600 11px Inter, sans-serif';
        c.textAlign = 'center';
        c.fillText('LCP 2.5s', pxLcp, top + 13);
      }

      // Horizontal line — CLS = 0.1 (amber, dashed)
      if (pxCls >= top && pxCls <= bottom) {
        c.beginPath();
        c.setLineDash([6, 4]);
        c.lineWidth = 1.5;
        c.strokeStyle = '#F59E0B';
        c.moveTo(left, pxCls);
        c.lineTo(right, pxCls);
        c.stroke();

        c.setLineDash([]);
        c.fillStyle = '#F59E0B';
        c.font = '600 11px Inter, sans-serif';
        c.textAlign = 'left';
        c.fillText('CLS 0.1', left + 6, pxCls - 5);
      }

      // "✓ Pass zone" label in bottom-left of pass quadrant
      if (pxLcp > left + 50) {
        c.fillStyle = 'rgba(34, 197, 94, 0.45)';
        c.font = '500 10px Inter, sans-serif';
        c.textAlign = 'right';
        c.fillText('✓ Pass zone', pxLcp - 6, bottom - 6);
      }

      c.restore();
    }
  };

  new Chart(ctx, {
    type: 'bubble',
    data: { datasets },
    plugins: [cwvThresholdPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const d = ctx.raw;
              return [' ' + d.name, ' LCP: ' + d.x + 's | CLS: ' + d.y + ' | Score: ' + d.score];
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'LCP (seconds) \u2014 lower is better', color: COLORS.muted },
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: function(v) { return v + 's'; } }
        },
        y: {
          title: { display: true, text: 'CLS \u2014 lower is better', color: COLORS.muted },
          grid: { color: 'rgba(255,255,255,0.05)' },
        }
      }
    }
  });
}

function buildAllCharts() {
  buildIssuesChart(SITES);
  buildScoreDistChart();
  buildSectorChart();
  buildCWVBubbleChart();
}
