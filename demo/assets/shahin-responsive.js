/*
SHAHIN Wireframe Design System — Global Responsive Behaviour
Loaded as the LAST script on every page (after shahin-nav.js / shahin.js /
echarts). Two jobs:
  1. Grid auto-collapse — page-level CSS grids with fixed column counts
     get their columns reduced when the container can no longer fit them
     (≤760px: single column). Original template is restored on widen.
  2. ECharts resize — all chart instances resize on viewport change, on
     .sh-content resize (nav collapse / tablet overlay) and after grid
     collapse, so canvases never overflow their cards.
  3. Component-width helpers — .sh-alert / .sh-rec with actions get .is-narrow below 620px of
     their OWN width (messaging convention); wide .sh-table tables get .sh-cardify + data-label
     so they render as «label: value» cards below 1280 (mobile table convention).
The mobile nav drawer belongs to shahin-nav.js — it owns the hamburger, the
scrim and every open/close path, so there is exactly one owner of that state.
*/
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* run after other DOMContentLoaded handlers (nav injection) settle */
  ready(function () { setTimeout(init, 0); });

  function init() {
    /* ── 1. grid auto-collapse ────────────────────────────────────── */
    var MIN_TRACK = 180;   /* px a column needs to stay readable */
    var MOBILE = 760;      /* below this, multi-column grids stack */
    var grids = [];

    function collectGrids() {
      grids = [];
      var all = document.body.getElementsByTagName('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        /* skip injected chrome + chart internals */
        if (el.closest('.sh-rail,.sh-pane,.sh-topbar,svg,canvas')) continue;
        if (getComputedStyle(el).display === 'grid') grids.push(el);
      }
    }

    function trackCount(el) {
      var v = getComputedStyle(el).gridTemplateColumns;
      if (!v || v === 'none') return 0;
      return v.trim().split(/\s+/).length;
    }

    function applyGrids() {
      grids.forEach(function (el) {
        /* restore first so measurement uses the page's own template */
        if (el.dataset.shRespCols !== undefined) {
          el.style.gridTemplateColumns = el.dataset.shRespCols;
          delete el.dataset.shRespCols;
        }
      });
      grids.forEach(function (el) {
        if (!el.offsetParent && el.offsetWidth === 0) return; /* hidden */
        var tracks = trackCount(el);
        if (tracks < 2) return;
        var w = el.clientWidth;
        var minTrack = parseInt(el.dataset.minTrack, 10) || MIN_TRACK;
        var want = tracks;
        if (window.innerWidth <= MOBILE) want = 1;
        else if (tracks * minTrack > w) want = Math.max(1, Math.floor(w / minTrack));
        if (want < tracks) {
          el.dataset.shRespCols = el.style.gridTemplateColumns || '';
          el.style.gridTemplateColumns = want === 1 ? 'minmax(0,1fr)'
            : 'repeat(' + want + ',minmax(0,1fr))';
        }
      });
    }

    /* ── 3a. messaging: action layout follows the component's own width (≥620 one row, <620 actions under the text) */
    var NARROW = 620;
    var narrowRO = window.ResizeObserver ? new ResizeObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-narrow', e.target.getBoundingClientRect().width < NARROW); });
    }) : null;
    function watchNarrow(root) {
      if (!narrowRO) return;
      (root || document).querySelectorAll('.sh-alert, .sh-rec').forEach(function (el) {
        if (el.__shNarrow || !el.querySelector('.sh-alert-acts, .sh-rec-a')) return;
        el.__shNarrow = true; narrowRO.observe(el);
      });
    }

    /* ── 3b. mobile table cards for plain .sh-table grids ─────────────────── */
    var NOCARD = '.legtbl,.sh-mini-tbl,.mini-table,.av-tree,.cv-static,.rb-tbl,.sh-dt,[data-no-cards]';
    function cellText(th) {
      var c = th.cloneNode(true);
      c.querySelectorAll('svg,.info-icon,.info,.sh-dt-caret,button,[data-tip-fa],[data-tip]').forEach(function (n) { n.remove(); });
      return c.textContent.replace(/\s+/g, ' ').trim();
    }
    function plainGrid(t) {
      if (t.matches(NOCARD) || t.closest('table table') || t.tFoot || !t.tHead || t.tHead.rows.length !== 1) return false;
      var head = t.tHead.rows[0].cells, n = head.length, i, r, rows;
      if (!n) return false;
      for (i = 0; i < n; i++) if (head[i].colSpan > 1 || head[i].rowSpan > 1) return false;
      rows = t.tBodies.length === 1 ? t.tBodies[0].rows : null;
      if (!rows) return false;
      for (r = 0; r < rows.length; r++) {
        if (rows[r].cells.length !== n) return false;
        for (i = 0; i < n; i++) if (rows[r].cells[i].colSpan > 1 || rows[r].cells[i].rowSpan > 1) return false;
      }
      return true;
    }
    function cardify(root) {
      (root || document).querySelectorAll('table.sh-table').forEach(function (t) {
        var ok = plainGrid(t);
        t.classList.toggle('sh-cardify', ok);
        if (!ok) return;
        var labels = [].map.call(t.tHead.rows[0].cells, cellText);
        [].forEach.call(t.tBodies[0].rows, function (tr) {
          [].forEach.call(tr.cells, function (td, i) { if (td.getAttribute('data-label') !== labels[i]) td.setAttribute('data-label', labels[i]); });
        });
      });
    }
    var enhT;
    function enhance() { clearTimeout(enhT); enhT = setTimeout(function () { watchNarrow(); cardify(); }, 60); }
    if (window.MutationObserver) new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) { if (ms[i].target.closest && ms[i].target.closest('.sh-toast')) continue; enhance(); return; }
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('shahin:lang', enhance);
    watchNarrow(); cardify();

    /* ── 2. ECharts resize ────────────────────────────────────────── */
    function resizeCharts() {
      if (!window.echarts) return;
      var hosts = document.querySelectorAll('[_echarts_instance_]');
      for (var i = 0; i < hosts.length; i++) {
        var inst = window.echarts.getInstanceByDom(hosts[i]);
        if (inst) inst.resize();
      }
    }

    var t;
    function onResize() {
      clearTimeout(t);
      t = setTimeout(function () { applyGrids(); resizeCharts(); }, 120);
    }
    window.addEventListener('resize', onResize);
    /* the content box also changes width without a window resize — collapsing
       the nav panel, or the tablet overlay opening — so watch the box itself */
    var contentBox = document.querySelector('.sh-content');
    if (contentBox && window.ResizeObserver) new ResizeObserver(onResize).observe(contentBox);
    /* tabs / drill-down panels reveal grids that were hidden at load */
    document.addEventListener('click', function () {
      clearTimeout(t);
      t = setTimeout(function () { collectGrids(); applyGrids(); resizeCharts(); }, 250);
    });

    collectGrids();
    applyGrids();
    /* charts init in page scripts that may run after us — settle late */
    setTimeout(resizeCharts, 60);
    setTimeout(function () { collectGrids(); applyGrids(); resizeCharts(); }, 500);
  }
})();
