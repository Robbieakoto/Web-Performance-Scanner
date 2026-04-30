// app.js — main entry point

document.addEventListener('DOMContentLoaded', async () => {

  // 1. Load data
  await loadData();

  // 2. Render hero stats with animated counters
  renderHeroStats();

  // 3. Render summary cards
  renderSummaryCards(SITES);

  // 4. Render table (default: all sites, sorted by score desc)
  renderTable(SITES);

  // 5. Build charts
  buildAllCharts();

  // 6. Render recommendations
  renderRecommendations();

  // 7. Setup filter tabs
  setupFilterTabs();

  // 8. Setup table sorting
  setupTableSort();

  // 9. Setup nav scroll effect
  setupNavScroll();

  // 10. Setup smooth scroll for hero CTA
  document.getElementById('exploreBtn')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
  });
});

function setupFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      const filtered = filterSites(currentFilter);
      const sorted   = sortSites(filtered, currentSort.col, currentSort.dir);
      renderTable(sorted);
    });
  });
}

function setupNavScroll() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}
