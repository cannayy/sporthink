/* ── TEMA: GRAFİK RENKLERİ & CHART.JS DEFAULTS ── */

function _temaRenkleri() {
  const dark = document.body.classList.contains('dark');
  return {
    text:          dark ? '#B5B5B1' : '#374151',
    textMuted:     dark ? '#85857F' : '#6B7280',
    grid:          dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    gridBorder:    dark ? '#2D2D32' : '#E5E7EB',
    tooltipBg:     dark ? '#2A2A30' : '#FFFFFF',
    tooltipBorder: dark ? '#383840' : '#E5E7EB',
    tooltipText:   dark ? '#DEDEDA' : '#18181B',
    red:           dark ? '#C84238' : '#D64545',
    redDeep:       dark ? '#8E2820' : '#C0392B',
    green:         dark ? '#4E8A66' : '#22C55E',
    blue:          dark ? '#5270A6' : '#3B82F6',
    yellow:        dark ? '#D9B470' : '#FBBF24',
    purple:        dark ? '#D9B470' : '#7C3AED',
    barBg:         dark ? '#27272B' : '#F3F4F6',
  };
}

function temayiGrafiklereUygula() {
  if (typeof Chart === 'undefined') return;
  const c = _temaRenkleri();
  Chart.defaults.color = c.text;
  Chart.defaults.borderColor = c.gridBorder;
  Object.values(Chart.instances || {}).forEach(chart => {
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.ticks)  scale.ticks.color  = c.textMuted;
        if (scale.grid) { scale.grid.color   = c.grid; scale.grid.borderColor = c.gridBorder; }
        if (scale.title) scale.title.color   = c.text;
      });
    }
    if (chart.options.plugins?.tooltip) {
      const t = chart.options.plugins.tooltip;
      t.backgroundColor = c.tooltipBg;
      t.titleColor = c.tooltipText;
      t.bodyColor = c.tooltipText;
      t.borderColor = c.tooltipBorder;
      t.borderWidth = 1;
    }
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = c.text;
    }
    chart.update('none');
  });
  if (typeof donutChart !== 'undefined' && donutChart) {
    const dark = document.body.classList.contains('dark');
    const meta = donutChart._donutMeta || {};
    const pal = _donutPalette(meta.isDrillDown || false);
    const othersColor = dark ? '#6B6B70' : '#d1d5db';
    const borderCol   = dark ? '#232328' : '#FDF2F2';
    if (donutChart.data.datasets[0]) {
      donutChart.data.datasets[0].backgroundColor =
        (meta.data || []).map((d, i) => d._isOthers ? othersColor : pal[i % pal.length]);
      donutChart.data.datasets[0].borderColor = borderCol;
    }
    donutChart.update('none');
  }
  if (typeof renderBS === 'function' && _bsData && _bsData.length) renderBS(_bsData);
  if (typeof renderWS === 'function' && _wsData && _wsData.length) renderWS(_wsData);
  if (markaBarChart) {
    const mc = _temaRenkleri();
    if (markaBarChart.data.datasets[0]) markaBarChart.data.datasets[0].backgroundColor = mc.red;
    if (markaBarChart.data.datasets[1]) markaBarChart.data.datasets[1].backgroundColor = document.body.classList.contains('dark') ? DONUT_COLORS_DARK[1] : DONUT_COLORS[1];
  }
  if (_lollipopData.length) _renderLollipop(_lollipopData);
}

if (typeof Chart !== 'undefined') {
  const c = _temaRenkleri();
  Chart.defaults.color = c.text;
  Chart.defaults.borderColor = c.gridBorder;
}
