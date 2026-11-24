/* ══════════════════════════════════════════════════════════════════════════
   shahin-states.js — shared demo "state switcher" for dashboard wireframes.
   Renders a small labelled control into .sh-topbar-actions that lets a reviewer
   flip a dashboard between its data-states (full / receiving / thin / empty /
   error / no-access / loading). It is a WIREFRAME demo aid, not a product
   control — it only calls back into the page; the page owns what each state
   renders. Also honours a ?state= deep link.

   Usage (from a dashboard's page script, after the DOM is built):
     Shahin.states({
       states: [                     // order = display order; first is default
         { id:'full',      fa:'پُر',            en:'Populated' },
         { id:'receiving', fa:'در حال دریافت',  en:'Receiving' },
         { id:'thin',      fa:'داده کم',        en:'Thin data' },
         { id:'empty',     fa:'خالی',           en:'Empty' },
         { id:'error',     fa:'خطا',            en:'Error' },
         { id:'denied',    fa:'عدم دسترسی',     en:'No access' },
         { id:'loading',   fa:'بارگذاری',       en:'Loading' }
       ],
       initial: 'full',
       onChange: function(id){ ...page toggles its state... }
     });
   The ?state=<id> query param (if it matches a state id) overrides `initial`.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  window.Shahin = window.Shahin || {};
  if (Shahin.states) return;

  var CSS = '';  // styling now comes from .demo-sw.dd / .demo-sw-dd in shahin-components.csscolor:var(--sh-bg)}';

  function injectCSS() {
    if (document.getElementById('sh-statesw-css')) return;
    var s = document.createElement('style');
    s.id = 'sh-statesw-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function curLang() {
    return (window.Shahin && Shahin.lang) ? Shahin.lang()
      : (document.documentElement.lang === 'en' ? 'en' : 'fa');
  }

  Shahin.states = function (opts) {
    if (!opts || !opts.states || !opts.states.length) return null;
    injectCSS();
    // full-width demo strip at the very top of the content column (room for all states);
    // it stays visible in every state so a reviewer can always switch back.
    var mount = opts.mount || document.querySelector('.sh-content') || document.querySelector('.sh-topbar-actions');
    if (!mount) return null;

    var ids = opts.states.map(function (s) { return s.id; });
    var qs = new URLSearchParams(location.search);
    var q = qs.get('state');
    var cur = (q && ids.indexOf(q) !== -1) ? q : (opts.initial || ids[0]);

    // one compact dropdown, the same .demo-sw.dd pill as every other demo-state switcher
    // (PM 2026-11-12: «نمای دمو رو دراپ‌دان کن، همه جا»); the label survives only as aria-label.
    var wrap = document.createElement('div');
    wrap.className = 'demo-sw dd sh-statesw';
    var sel = document.createElement('select');
    sel.className = 'demo-sw-dd';
    var labFa = 'نمای دمو', labEn = 'Demo state';
    function label() { var t = curLang() === 'fa' ? labFa : labEn; sel.setAttribute('aria-label', t); sel.title = t; }
    label();
    opts.states.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.id;
      o.setAttribute('data-fa', s.fa);
      o.setAttribute('data-en', s.en);
      o.textContent = curLang() === 'fa' ? s.fa : s.en;
      sel.appendChild(o);
    });
    sel.value = cur;
    sel.addEventListener('change', function () { set(sel.value); });
    document.addEventListener('shahin:lang', label);
    wrap.appendChild(sel);
    var row = document.createElement('div');
    row.className = 'demo-sw-row';
    row.appendChild(wrap);
    mount.insertBefore(row, mount.firstChild);

    function set(id) {
      if (ids.indexOf(id) === -1) return;
      cur = id;
      sel.value = id;
      try { opts.onChange(id); } catch (e) {}
    }

    // fire the initial state once the page has registered its handler
    try { opts.onChange(cur); } catch (e) {}
    return { set: set, current: function () { return cur; } };
  };
})();
