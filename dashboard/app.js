// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts), renders the
// ranked board as a sortable filterable table, and opens a detail panel per protocol with the radar-2
// model's own numbers and the farm plan. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA || typeof DATA !== 'object') {
    // data.js did not load (not built, or opened from the wrong place): say so instead of a blank page.
    var banner = document.getElementById('no-data');
    if (banner) banner.hidden = false;
    ['model', 'controls', 'board', 'detail'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.hidden = true;
    });
    return;
  }
  DATA.rows = DATA.rows || [];
  DATA.live = DATA.live || [];

  var state = { q: '', category: 'all', chain: 'all', tab: 'pre', sort: 'rank', dir: 1, selected: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(d)) + 'd';
  }

  // The radar-2 model in one function: the page recomputes a row from snapshot figures and the model
  // constants data.js carries, so the page's arithmetic and board.json's numbers are visibly the same.
  function impliedOf(row, model) {
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d));
    var growthM = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days;
    var ramp = Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days;
    var maturityM = model.maturity_floor + ramp * model.maturity_range;
    var scarcityM = 1 + ramp * model.scarcity_weight;
    return { growthM: growthM, maturityM: maturityM, scarcityM: scarcityM, implied: Math.max(1, Math.round(row.tvl_usd * model.base_multiple * growthM * maturityM * scarcityM)) };
  }

  // A row the model cannot score: no usable age, 7-day change or TVL. The lib layer lists such protocols
  // in `unrankable`; the page never invents a figure for them, it shows the reason.
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function unrankableReasonOf(row) {
    var list = DATA.unrankable || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === row.slug) return list[i].reason;
    if (!isNum(row.age_days)) return 'has no usable listed_at date';
    if (!isNum(row.change_7d)) return 'has no change_7d figure';
    if (!isNum(row.tvl_usd) || !(row.tvl_usd > 0)) return 'has a TVL that is not above zero';
    return null;
  }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    if (html) node.innerHTML = html;
    return node;
  }

  // ---- header metadata ----------------------------------------------------
  function renderMeta() {
    var meta = $('meta');
    meta.innerHTML = '';
    var items = [
      ['As of', DATA.as_of],
      ['Protocols', String(DATA.protocols_count || DATA.rows.length + DATA.live.length)],
      ['Board', String(DATA.board_size)],
      ['Watchlist', String(DATA.watchlist_size)],
    ];
    items.forEach(function (it) {
      var dd = el('dd', { text: it[1] });
      meta.appendChild(el('div', null, '<dt>' + esc(it[0]) + '</dt>' + dd.outerHTML));
    });
  }

  // ---- model strip ---------------------------------------------------------
  function renderModel() {
    var m = DATA.model;
    $('model-version').textContent = DATA.model_version;
    $('formula').innerHTML =
      'implied = tvl × <span class="v">' + m.base_multiple + '</span> × growth × maturity × scarcity' +
      '&nbsp;&nbsp;·&nbsp;&nbsp;' +
      'growth = 1 + clamp(7d, ' + m.growth_floor + '%, ' + m.growth_cap + '%) × ' + m.growth_weight +
      '&nbsp;·&nbsp;maturity = ' + m.maturity_floor + ' + age/' + m.maturity_days + ' × ' + m.maturity_range +
      '&nbsp;·&nbsp;scarcity = 1 + age/' + m.maturity_days + ' × ' + m.scarcity_weight;
    var live = DATA.live_size > 0 ? ' ' + DATA.live_size + ' live-token protocols sit in their own view, priced by the market.' : '';
    $('model-note').textContent =
      'Every term comes from the sealed snapshot: TVL, 7-day change and days since ' + DATA.as_of +
      '. A protocol that has run long with no token carries higher optionality (maturity × scarcity).' + live;
  }

  // ---- filter inputs -------------------------------------------------------
  function fillSelect(select, values) {
    var seen = {};
    values.forEach(function (v) { seen[v] = true; });
    Object.keys(seen).sort().forEach(function (v) {
      var o = el('option', { value: v, text: v });
      select.appendChild(o);
    });
  }
  function buildFilters() {
    fillSelect($('category'), DATA.rows.map(function (r) { return r.category || 'Other'; }));
    var chains = {};
    DATA.rows.forEach(function (r) { r.chains.forEach(function (c) { chains[c] = true; }); });
    fillSelect($('chain'), Object.keys(chains));
    $('q').addEventListener('input', function () { state.q = this.value.toLowerCase(); render(); });
    $('category').addEventListener('change', function () { state.category = this.value; render(); });
    $('chain').addEventListener('change', function () { state.chain = this.value; render(); });
    $('reset').addEventListener('click', function () {
      state.q = ''; state.category = 'all'; state.chain = 'all'; state.sort = 'rank'; state.dir = 1;
      $('q').value = ''; $('category').value = 'all'; $('chain').value = 'all';
      render();
    });
    $('tab-pre').addEventListener('click', function () { state.tab = 'pre'; renderTabs(); render(); });
    $('tab-live').addEventListener('click', function () { state.tab = 'live'; renderTabs(); render(); });
  }
  function renderTabs() {
    $('tab-pre').setAttribute('aria-pressed', String(state.tab === 'pre'));
    $('tab-live').setAttribute('aria-pressed', String(state.tab === 'live'));
    $('chain').disabled = state.tab === 'live';
    $('category').disabled = state.tab === 'live';
    // Category and chain describe the pre-token board; they do not filter Live rows. Say so, rather than
    // leaving two greyed selects with no explanation.
    var note = $('filter-note');
    if (note) note.hidden = state.tab !== 'live';
  }

  // ---- table ----------------------------------------------------------------
  var COLS = [
    { key: 'rank', label: 'Rank', num: true },
    { key: 'name', label: 'Protocol' },
    { key: 'category', label: 'Category' },
    { key: 'chain', label: 'Chain' },
    { key: 'tvl', label: 'TVL', num: true },
    { key: 'change', label: '7d', num: true },
    { key: 'age', label: 'Age', num: true },
    { key: 'implied', label: 'Implied', num: true },
  ];

  function rows() {
    var isLive = state.tab === 'live';
    var list = isLive ? DATA.live : DATA.rows;
    var q = state.q;
    return list.filter(function (r) {
      if (q) {
        var hay = ((r.name || '') + ' ' + (r.slug || '') + ' ' + (r.category || '') + ' ' + (r.chains || []).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      // Pre-token filters (category, chain) never apply to Live rows.
      if (isLive) return true;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) === -1) return false;
      return true;
    });
  }

  // A sort key, or null when the row has none. Nulls sort last in both directions (see sortRows).
  function num(n) { return isNum(n) ? n : null; }
  function str(x) { return x === null || x === undefined ? null : String(x).toLowerCase(); }
  function value(r, key) {
    var live = state.tab === 'live';
    switch (key) {
      case 'rank': return live ? 0 : num(r.rank);
      case 'name': return str(r.name);
      case 'category': return str(r.category || 'Other');
      case 'chain': return str((r.chains || [])[0] || '');
      case 'tvl': return num(r.tvl_usd);
      case 'change': return num(r.change_7d);
      case 'age': return live ? 0 : num(r.age_days);
      case 'implied': return live ? num(r.mcap_usd) : num(r.implied_value_usd);
    }
    return 0;
  }

  function sortRows(list) {
    var key = state.sort, dir = state.dir;
    return list.slice().sort(function (a, b) {
      var va = value(a, key), vb = value(b, key);
      if (va === null && vb !== null) return 1;
      if (vb === null && va !== null) return -1;
      if (va !== null && vb !== null) {
        if (va < vb) return -dir;
        if (va > vb) return dir;
      }
      var na = a.name === null || a.name === undefined ? '' : String(a.name);
      var nb = b.name === null || b.name === undefined ? '' : String(b.name);
      return (a.rank || 0) - (b.rank || 0) || (na < nb ? -1 : na > nb ? 1 : 0);
    });
  }

  function renderHead() {
    var head = $('head');
    head.innerHTML = '';
    var tr = el('tr');
    COLS.forEach(function (c) {
      var th = el('th', {
        class: (c.num ? 'num ' : '') + 'sortable',
        scope: 'col',
        'aria-sort': state.sort === c.key ? (state.dir === 1 ? 'ascending' : 'descending') : 'none',
        onclick: function () {
          if (state.sort === c.key) state.dir = -state.dir;
          else { state.sort = c.key; state.dir = c.key === 'rank' ? 1 : -1; }
          render();
        },
        text: c.label,
      });
      tr.appendChild(th);
    });
    head.appendChild(tr);
  }

  function cell(html, cls) {
    return '<td class="' + (cls || '') + '">' + html + '</td>';
  }

  function rowHtml(r) {
    var slug = esc(r.slug), name = esc(r.name), cat = esc(r.category || 'Other');
    var chains = esc((r.chains || []).join(', ') || '—');
    if (state.tab === 'live') {
      var chgL = r.change_7d !== null && r.change_7d >= 0 ? 'up' : 'down';
      return [
        cell('<span class="rank">' + r.rank + '</span>', 'num'),
        cell('<b>' + name + '</b><small>' + slug + '</small>', 'name'),
        cell(cat, 'cat'),
        cell(chains, 'chain'),
        cell('<span class="num">' + fmtUsd(r.tvl_usd) + '</span>', 'num'),
        cell('<span class="num ' + chgL + '">' + fmtPct(r.change_7d) + '</span>', 'num'),
        cell('<span class="num">—</span>', 'num'),
        cell('<span class="num implied">' + fmtUsd(r.mcap_usd) + '</span>', 'num'),
      ].join('');
    }
    var chg = r.change_7d !== null && r.change_7d >= 0 ? 'up' : 'down';
    return [
      cell('<span class="rank">' + r.rank + '</span>', 'num'),
      cell('<b>' + name + '</b><small>' + slug + '</small>', 'name'),
      cell(cat, 'cat'),
      cell(chains, 'chain'),
      cell('<span class="num">' + fmtUsd(r.tvl_usd) + '</span>', 'num'),
      cell('<span class="num ' + chg + '">' + fmtPct(r.change_7d) + '</span>', 'num'),
      cell('<span class="num">' + fmtAge(r.age_days) + '</span>', 'num'),
      cell('<span class="num implied">' + fmtUsd(r.implied_value_usd) + '</span>', 'num'),
    ].join('');
  }

  function render() {
    var list = sortRows(rows());
    $('caption').textContent =
      (state.tab === 'live' ? 'Live token view · market cap' : 'Pre-token board · ' + DATA.rows.length + ' rows ranked by implied value') +
      (list.length !== (state.tab === 'live' ? DATA.live.length : DATA.rows.length) ? ' · showing ' + list.length : '');
    $('empty').hidden = list.length > 0;
    $('empty').textContent = 'No protocols match the filters.';
    var body = $('body');
    body.innerHTML = '';
    list.forEach(function (r) {
      var tr = el('tr', {
        class: state.selected === r.slug ? 'selected' : '',
        onclick: function () { openDetail(r); },
      });
      tr.innerHTML = rowHtml(r);
      body.appendChild(tr);
    });
    renderHead();
    var foot = 'Board counts ' + DATA.rows.length + ' pre-token protocols (' + DATA.early_size + ' below the ' +
      fmtUsd(DATA.floor_usd) + ' watchlist floor) and sets ' + DATA.live_size + ' live-token protocols aside. Data sealed ' +
      DATA.as_of + ' from ' + DATA.source + '.';
    // Older data.js files carry neither field: only say what the data says.
    if (Array.isArray(DATA.watchlist_excluded)) {
      foot += ' Watchlist excluded: ' + DATA.watchlist_excluded.length +
        (DATA.watchlist_excluded.length ? ' (' + DATA.watchlist_excluded.join(', ') + ')' : '') + '.';
    }
    if (Array.isArray(DATA.unrankable)) {
      foot += ' Unrankable: ' + DATA.unrankable.length +
        (DATA.unrankable.length ? ' (' + DATA.unrankable.map(function (u) { return u.slug + ' ' + u.reason; }).join('; ') + ')' : '') + '.';
    }
    $('foot-note').textContent = foot;
  }

  // ---- detail panel ---------------------------------------------------------
  function kv(dt, dd) {
    return '<dt>' + esc(dt) + '</dt><dd>' + esc(dd) + '</dd>';
  }

  function closeDetail() {
    state.selected = null;
    $('detail').hidden = true;
    $('detail').innerHTML = '';
    render();
  }

  function openDetail(r) {
    state.selected = r.slug;
    var d = $('detail');
    d.hidden = false;
    var isLive = state.tab === 'live';
    var m = DATA.model;
    var reason = isLive ? null : unrankableReasonOf(r);
    var calc = isLive || reason !== null ? null : impliedOf(r, m);
    var chains = r.chains || [];
    var html = '';
    html += '<button type="button" class="close">Close</button>';
    html += '<h2>' + esc(r.name === null || r.name === undefined ? r.slug : r.name) + '</h2>';
    html += '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Other') + ' · ' + esc(chains.join(', ') || '—') + '</p>';
    html += '<div class="grid"><section><h3>Snapshot</h3><dl class="kv">';
    html += kv('TVL', fmtUsd(r.tvl_usd));
    html += kv('7-day change', fmtPct(r.change_7d));
    html += kv('Age', r.age_days === null || r.age_days === undefined ? 'unknown' : (Math.round(r.age_days / 30.4 * 10) / 10) + ' months');
    html += kv('Listed', r.listed_at || 'n/a');
    if (isLive) html += kv('Market cap', fmtUsd(r.mcap_usd));
    var mismatch = false;
    if (!isLive && calc) {
      mismatch = calc.implied !== r.implied_value_usd;
      html += kv('Implied (snapshot)', fmtUsd(r.implied_value_usd));
      html += '<dt>Implied (recomputed)</dt><dd>' + esc(fmtUsd(calc.implied)) +
        (mismatch ? ' <span class="mismatch" role="alert" style="color:#c33;font-weight:600">⚠ mismatch: the snapshot says ' + esc(fmtUsd(r.implied_value_usd)) + '</span>' : ' <span class="match" style="opacity:.65">matches</span>') + '</dd>';
    }
    html += '</dl>';
    if (!isLive && !calc) {
      html += '<div class="breakdown unrankable"><h3>Unrankable</h3><p>This protocol ' + esc(reason) + ', so the model does not score it and the page does not recompute it.</p></div>';
    }
    if (!isLive && calc) {
      html += '<h3>Radar-2 breakdown</h3><div class="breakdown">';
      html += '<code>implied = ' + fmtUsd(r.tvl_usd) + ' × ' + m.base_multiple;
      html += ' × ' + calc.growthM.toFixed(4) + ' × ' + calc.maturityM.toFixed(4) + ' × ' + calc.scarcityM.toFixed(4) + '</code>';
      html += '<div class="step">' + 'growth = 1 + clamp(' + r.change_7d + '%, ' + m.growth_floor + '%, ' + m.growth_cap + '%) × ' + m.growth_weight + ' → ' + calc.growthM.toFixed(4) + '</div>';
      html += '<div class="step">' + 'maturity = ' + m.maturity_floor + ' + min(' + r.age_days + ', ' + m.maturity_days + ')/' + m.maturity_days + ' × ' + m.maturity_range + ' → ' + calc.maturityM.toFixed(4) + '</div>';
      html += '<div class="step">' + 'scarcity = 1 + ' + r.age_days + '/' + m.maturity_days + ' × ' + m.scarcity_weight + ' → ' + calc.scarcityM.toFixed(4) + '</div>';
      html += '<div class="step">' + '<b>Implied value: ' + fmtUsd(calc.implied) + '</b></div>';
      html += '</div>';
    }
    html += '</section><section><h3>Farm plan</h3>';
    html += '<p class="plantext">' + (isLive ? 'Underlying already trades; the plan targets the airdrop and points programs as they evolve.' : 'A plan sized to this protocol, with what each step costs and how long it takes.') + '</p>';
    html += '<ol class="farm">';
    if (isLive) {
      html += '<li><p>Track the token\'s own claims page; register an address if the protocol posts one.</p><p class="cost">Cost: $0 to register. Time: 15 minutes.</p></li>';
      html += '<li><p>Hold a minimum position sized from its TVL on one chain.</p><p class="cost">Cost: from $' + (isNum(r.tvl_usd) && r.tvl_usd >= 1e9 ? 150 : 50) + ' of capital. Time: 20 minutes.</p></li>';
      html += '<li><p>Repeat one qualifying action a month and log it.</p><p class="cost">Cost: about $2 of gas a month. Time: 10 minutes a month.</p></li>';
    } else {
      var steps = r.farm_steps || [];
      if (!steps.length) {
        steps = [
          'Open the protocol page and read only the instructions it publishes. Cost: $0. Time: 10 minutes.',
          'Deposit what the plan sizes from its TVL and keep the position. Cost: capital plus gas. Time: 30 days held.',
          'Claim rewards only from the link the protocol itself posts. Cost: gas only. Time: 15 minutes.',
        ];
      }
      steps.slice(0, 6).forEach(function (s) {
        html += '<li><p>' + esc(s) + '</p></li>';
      });
    }
    html += '</ol></section></div>';
    d.innerHTML = html;
    d.querySelector('.close').addEventListener('click', closeDetail);
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    render();
  }

  // ---- boot -----------------------------------------------------------------
  function boot() {
    renderModel();
    renderMeta();
    buildFilters();
    renderTabs();
    render();
  }
  boot();
})();