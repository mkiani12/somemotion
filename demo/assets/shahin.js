/* ═══════════════════════════════════════════════════════════════════
   SHAHIN Wireframe Design System — Runtime
   Provides: theme (dark/light), i18n (fa/en), bilingual tooltip engine,
   page-version switcher, side-panel helpers.

   Page contract — declare BEFORE this script:
     window.SHAHIN_PAGE = {
       id: 'pages',                                  // dir name
       title: { fa:'صفحه‌ها', en:'Pages' },
       version: 'v2',                                // this file's version
       versions: [                                   // never remove entries
         { id:'v1', fa:'نسخه ۱ — جدول‌محور', en:'V1 — Table-first', file:'v1.html' },
         { id:'v2', fa:'نسخه ۲ — کارت‌محور', en:'V2 — Card-first',  file:'v2.html' },
         { id:'v3', fa:'نسخه ۳ — روایت‌محور', en:'V3 — Story-first', file:'v3.html' }
       ]
     };

   Markup contract:
     - translatable text:  data-fa / data-en  (element text is swapped)
     - localized numbers:  data-num="12345"   (fa-IR / en-US digits)
     - tooltips:           data-tip-fa / data-tip-en on the titled element
     - topbar:             <header class="sh-topbar"> … <div class="sh-topbar-actions"></div>
   ═══════════════════════════════════════════════════════════════════ */
/* Impersonation (assets/shahin-impersonate.js): while a «ورود به‌جای کاربر» session is open — or
   one has just ended — every page needs its banner/toast, so the module is pulled in here.
   Does nothing when no session state exists; pages that start sessions load it themselves. */
(function () {
  var me = document.currentScript;
  try { if (!sessionStorage.getItem('sh-imp') && !sessionStorage.getItem('sh-imp-ended')) return; } catch (e) { return; }
  if (window.ShahinImp || !me) return;
  var base = me.src.replace(/shahin\.js(\?.*)?$/, '');
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'shahin-impersonate.css';
  document.head.appendChild(css);
  [base + 'sh-icons.js', base + 'shahin-impersonate.js'].forEach(function (src) {
    if (/sh-icons\.js$/.test(src) && window.SH_ICON) return;
    var s = document.createElement('script'); s.src = src; s.async = false; document.head.appendChild(s);
  });
})();
(function () {
  'use strict';

  var LS_THEME = 'shahin-theme', LS_LANG = 'shahin-lang';

  /* phosphor-style inline icons (production: ~icons/ph/*) */
  var SVG = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    user:      '<svg ' + SVG + ' width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.7-3.5 4.5-5.3 7.5-5.3s5.8 1.8 7.5 5.3"/></svg>',
    translate: '<svg ' + SVG + ' width="18" height="18"><path d="M3.5 5.5h8M7.5 3.5v2M5 5.5c.6 3.4 2.6 6.2 5.8 8.1"/><path d="M10 5.5c-.6 3.4-2.6 6.2-5.8 8.1"/><path d="M12.5 20.5 17 10.5l4.5 10M14 17h6"/></svg>',
    moon:      '<svg ' + SVG + ' width="18" height="18"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>',
    sun:       '<svg ' + SVG + ' width="18" height="18"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
    signout:   '<svg ' + SVG + ' width="18" height="18"><path d="M13.5 4H6v16h7.5"/><path d="M10.5 12H21M17.5 8l3.5 4-3.5 4"/></svg>'
  };

  /* ── THEME ── */
  function getTheme(){ return localStorage.getItem(LS_THEME) || 'dark'; }
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(LS_THEME, t);
    var sw = document.getElementById('sh-theme-switch');
    if (sw) sw.classList.toggle('on', t === 'dark');
    var ico = document.getElementById('sh-theme-ico');
    if (ico) ico.innerHTML = t === 'dark' ? ICONS.moon : ICONS.sun;
  }

  /* ── I18N ── */
  function getLang(){ return localStorage.getItem(LS_LANG) || 'en'; }
  function applyLang(lang){
    localStorage.setItem(LS_LANG, lang);
    var html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-fa]').forEach(function (el) {
      var txt = el.getAttribute(lang === 'fa' ? 'data-fa' : 'data-en');
      if (txt !== null) {
        // innerHTML so copy may carry inline markup; re-attach injected ⓘ icon
        var icon = el.querySelector(':scope > .info-icon');
        el.innerHTML = txt;
        if (icon) el.appendChild(icon);
      }
    });
    document.querySelectorAll('[data-num]').forEach(function (el) {
      var n = Number(el.getAttribute('data-num'));
      if (!isNaN(n)) el.textContent = n.toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US');
    });
    var sel = document.getElementById('sh-lang-select');
    if (sel) sel.value = lang;
    closeTip();
    document.dispatchEvent(new CustomEvent('shahin:lang', { detail: { lang: lang } }));
  }

  /* ── KPI-card convention: render the delta direction as a +/− sign, not an arrow
        (matches the Shahin Figma analytics-card). Rewrites the data-fa/data-en once
        so every applyLang() renders the signed form; color stays goodness-based. ── */
  function normalizeMetricDeltas(){
    document.querySelectorAll('.sh-metric-delta').forEach(function (el) {
      ['data-fa', 'data-en'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v) el.setAttribute(a, v.replace(/▲\s*/g, '+').replace(/▼\s*/g, '−'));
      });
      if (!el.querySelector('*')) {
        el.textContent = el.textContent.replace(/▲\s*/g, '+').replace(/▼\s*/g, '−');
      }
    });
  }

  /* ── TOPBAR CONTROLS (version switcher + online users + user menu) ── */
  function buildControls(){
    var host = document.querySelector('.sh-topbar-actions');
    if (!host) return;

    var page = window.SHAHIN_PAGE;
    /* single-version pages get no switcher — it only renders with ≥2 versions */
    if (page && Array.isArray(page.versions) && page.versions.length > 1) {
      var vbox = document.createElement('div');
      vbox.className = 'sh-versions';
      vbox.setAttribute('role', 'tablist');
      page.versions.forEach(function (v) {
        var b = document.createElement('button');
        b.className = 'sh-version-btn' + (v.id === page.version ? ' active' : '');
        /* button label stays short (version name only); the full changelog
           lives in data-tip/title so it never blows out the topbar. */
        var num = (String(v.id).match(/\d+/) || [''])[0];
        var faDigits = num.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
        var labelFa = v.labelFa || (num ? 'نسخه ' + faDigits : (v.fa || v.id));
        var labelEn = v.labelEn || (num ? 'V' + num : (v.en || v.id));
        b.setAttribute('data-fa', labelFa);
        b.setAttribute('data-en', labelEn);
        /* full changelog on hover (native title) — kept off data-tip so the
           switcher doesn't grow an ⓘ icon inside each button. */
        b.title = (v.fa || v.id) + '\n\n' + (v.en || v.id);
        if (v.id !== page.version) {
          b.addEventListener('click', function(){ location.href = v.file; });
        }
        vbox.appendChild(b);
      });
      host.appendChild(vbox);
    }

    /* the hub link lives in the rail now (shahin-nav.js) — it is only built
       here for pages that carry no rail, e.g. the Concept B menu page. */
    if (!document.querySelector('.sh-rail')) {
      var hub = document.createElement('button');
      hub.className = 'sh-toggle';
      hub.setAttribute('data-fa', '⌂ هاب');
      hub.setAttribute('data-en', '⌂ Hub');
      hub.addEventListener('click', function(){ location.href = '/shahinhub/'; });
      host.appendChild(hub);
    }

    /* The online-users counter (production UserMenu/Status.vue) is deliberately
       NOT in this topbar: the design team's final header carries breadcrumbs,
       search, notifications, help and the identity row — nothing else. The
       .sh-live styles stay in the design system for pages that want it. */

    /* user menu — production layout/UserMenu (index.vue + List.vue) */
    var wrap = document.createElement('div'); wrap.className = 'sh-user-wrap';

    var ubtn = document.createElement('button');
    /* the design team's final shows the signed-in identity, not a bare icon:
       round initials + name over role + caret (name/role drop below 1100px) */
    ubtn.className = 'sh-user-btn';
    ubtn.innerHTML =
      '<span class="sh-uavatar">SA</span>' +
      '<span class="sh-umeta">' +
        '<span class="sh-uname" data-fa="سارا احمدی" data-en="Sara Ahmadi">سارا احمدی</span>' +
        '<span class="sh-urole" data-fa="سوپر ادمین" data-en="Super Admin">سوپر ادمین</span>' +
      '</span>' +
      '<svg class="sh-ucaret" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    ubtn.title = 'حساب کاربری / Account';
    ubtn.setAttribute('aria-haspopup', 'menu');
    ubtn.setAttribute('aria-expanded', 'false');

    var menu = document.createElement('div'); menu.className = 'sh-user-menu';
    function setMenu(open){
      menu.classList.toggle('open', open);
      ubtn.setAttribute('aria-expanded', String(open));
    }

    /* Language */
    var rLang = document.createElement('div'); rLang.className = 'sh-user-item';
    rLang.innerHTML = ICONS.translate +
      '<span class="sh-user-label" data-fa="زبان" data-en="Language">زبان</span>';
    var sel = document.createElement('select'); sel.id = 'sh-lang-select';
    sel.innerHTML = '<option value="fa">فارسی</option><option value="en">English</option>';
    sel.value = getLang();
    sel.addEventListener('change', function(){ applyLang(sel.value); setMenu(false); });
    rLang.appendChild(sel);

    /* Dark Theme */
    var rTheme = document.createElement('div'); rTheme.className = 'sh-user-item';
    rTheme.innerHTML =
      '<span id="sh-theme-ico" style="display:inline-flex">' + (getTheme() === 'dark' ? ICONS.moon : ICONS.sun) + '</span>' +
      '<span class="sh-user-label" data-fa="تم تیره" data-en="Dark Theme">تم تیره</span>' +
      '<span class="sh-switch' + (getTheme() === 'dark' ? ' on' : '') + '" id="sh-theme-switch" role="switch"><i></i></span>';
    rTheme.addEventListener('click', function(){
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
      setMenu(false);
    });

    var divider = document.createElement('div'); divider.className = 'sh-user-divider';

    /* Account — navigates to /profile in production */
    var rAcc = document.createElement('div'); rAcc.className = 'sh-user-item';
    rAcc.innerHTML = ICONS.user.replace('width="16" height="16"', 'width="18" height="18"') +
      '<span class="sh-user-label" data-fa="حساب کاربری" data-en="Account">حساب کاربری</span>';
    rAcc.addEventListener('click', function(){
      setMenu(false);
      toast('در پروداکت: رفتن به صفحهٔ حساب کاربری (/profile)',
            'In production: navigates to the Account page (/profile)');
    });

    /* Logout */
    var rOut = document.createElement('div'); rOut.className = 'sh-user-item';
    rOut.innerHTML = ICONS.signout +
      '<span class="sh-user-label" data-fa="خروج" data-en="Logout">خروج</span>';
    rOut.addEventListener('click', function(){
      setMenu(false);
      toast('در پروداکت: خروج از حساب و بازگشت به صفحهٔ ورود',
            'In production: signs out and returns to the login page');
    });

    menu.appendChild(rLang); menu.appendChild(rTheme);
    menu.appendChild(divider);
    menu.appendChild(rAcc); menu.appendChild(rOut);

    ubtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!menu.classList.contains('open'));
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function(){ setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    wrap.appendChild(ubtn); wrap.appendChild(menu);
    host.appendChild(wrap);
  }

  /* ── TOAST — wireframe-only feedback for production-navigation actions ── */
  var toastEl = null, toastTimer = null;
  /* Notification Bar (messaging convention): tone icon + text + at most one action.
     opts = { tone: 'info'|'good'|'warn'|'bad', action: { fa, en, run }, closable: bool, duration: ms } — all optional. */
  var TOAST_IC = {
    info: 'M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m16-40a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m-32-92a12 12 0 1 1 12 12a12 12 0 0 1-12-12',
    good: 'M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88',
    warn: 'M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12',
    bad: 'M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88'
  };
  function toast(fa, en, opts){
    opts = opts || {};
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    var tone = TOAST_IC[opts.tone] ? opts.tone : 'info', x = null;
    toastEl.className = 'sh-toast ' + tone;
    toastEl.innerHTML = '<span class="sh-toast-ic"><svg viewBox="0 0 256 256" aria-hidden="true"><path d="' + TOAST_IC[tone] + '"/></svg></span><span class="sh-toast-tx"></span>';
    toastEl.querySelector('.sh-toast-tx').textContent = getLang() === 'fa' ? fa : en;
    if (opts.closable) {
      var x = document.createElement('button');
      x.className = 'sh-toast-x'; x.setAttribute('aria-label', getLang() === 'fa' ? 'بستن' : 'Close');
      x.innerHTML = '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></svg>';
      x.addEventListener('click', function(){ toastEl.classList.remove('show'); });
    }
    if (opts.action) {
      var b = document.createElement('button');
      b.className = 'sh-toast-act';
      b.textContent = getLang() === 'fa' ? opts.action.fa : opts.action.en;
      b.addEventListener('click', function(){ toastEl.classList.remove('show'); if (opts.action.run) opts.action.run(); });
      toastEl.appendChild(b);
    }
    if (x) toastEl.appendChild(x);
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, opts.duration || 2600);
  }

  /* ── TOOLTIP ENGINE — click ⓘ (no hover), bilingual ── */
  var gtt = null, openIcon = null, tipsWired = false;
  function closeTip(){ if (gtt){ gtt.style.display = 'none'; openIcon = null; } }
  function buildTooltips(){
    gtt = document.getElementById('gtt');
    if (!gtt) { gtt = document.createElement('div'); gtt.id = 'gtt'; document.body.appendChild(gtt); }

    /* Anchor below the ⓘ with a clear gap so the panel never sits on top of the
       control it explains; flip above only when the viewport leaves no room. */
    function place(icon){
      gtt.style.display = 'block';
      var r = icon.getBoundingClientRect();
      var tw = gtt.offsetWidth || 260, th = gtt.offsetHeight || 80;
      var GAP = 10;
      var x = (getLang() === 'fa') ? r.right - tw : r.left;   /* align to the reading edge */
      if (x + tw > innerWidth - 8) x = innerWidth - tw - 8;
      if (x < 8) x = 8;
      var y = r.bottom + GAP;
      if (y + th > innerHeight - 8) {
        var above = r.top - th - GAP;
        y = (above >= 8) ? above : Math.max(8, innerHeight - th - 8);
      }
      gtt.style.left = x + 'px'; gtt.style.top = y + 'px';
    }

    document.querySelectorAll('[data-tip-fa],[data-tip]').forEach(function (el) {
      if (el.classList.contains('info-icon')) return;
      /* idempotent: pages that render rows/cards from JS call Shahin.tooltips()
         again after each repaint, and must not collect a second ⓘ per element */
      if (el.querySelector(':scope > .info-icon')) return;
      var ic = document.createElement('span');
      ic.className = 'info-icon'; ic.textContent = 'ⓘ';
      ic.setAttribute('role', 'button'); ic.setAttribute('aria-label', 'توضیح / definition');
      el.appendChild(ic);
      ic.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (openIcon === ic) { closeTip(); return; }
        var lang = getLang();
        var tip = el.getAttribute(lang === 'fa' ? 'data-tip-fa' : 'data-tip-en')
               || el.getAttribute('data-tip');
        if (!tip) return;
        gtt.innerHTML = tip;
        gtt.style.direction = lang === 'fa' ? 'rtl' : 'ltr';
        gtt.style.textAlign = lang === 'fa' ? 'right' : 'left';
        openIcon = ic; place(ic);
      });
    });
    /* document-level wiring is global, so it is bound on the first pass only */
    if (tipsWired) return;
    tipsWired = true;
    document.addEventListener('click', closeTip);
    gtt.addEventListener('click', function (e) { e.stopPropagation(); });
    addEventListener('scroll', closeTip, true);
    addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTip(); });
  }

  /* ── SIDE PANEL helpers ── */
  window.shahinPanel = {
    open: function(){ document.body.classList.add('sh-panel-open'); },
    close: function(){ document.body.classList.remove('sh-panel-open'); }
  };
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.body.classList.remove('sh-panel-open');
  });

  /* ── ABOUT / DASHBOARD INTRO — collapsible on-entry explainer ──
     Any element `.sh-about[data-about="<page-id>"]` with a `.sh-about-panel`
     (full card) and a `.sh-about-chip` (collapsed affordance). Open by default
     on first visit; the open/closed choice is persisted per page id so a
     returning user who collapsed it stays collapsed but can always reopen.
     Toggle hooks: `[data-about-open]` inside the chip, `[data-about-close]` inside the panel. */
  function buildAbout(){
    document.querySelectorAll('.sh-about').forEach(function(root){
      var id  = root.getAttribute('data-about') || 'default';
      var key = 'sh_about_' + id;
      var stored = localStorage.getItem(key);            // null on first visit
      function set(open){
        root.classList.toggle('open', open);
        try { localStorage.setItem(key, open ? 'open' : 'closed'); } catch (e) {}
      }
      set(stored === null ? true : stored === 'open');   // first visit → open
      root.querySelectorAll('[data-about-open]').forEach(function(b){
        b.addEventListener('click', function(){ set(true); });
      });
      root.querySelectorAll('[data-about-close]').forEach(function(b){
        b.addEventListener('click', function(){ set(false); });
      });
    });
  }

  /* ── METRIC LEGEND-CHIPS — unified multi-select metric selector ──
     PM convention 2026-06-13 for all drill-down side panel trends.
     metricChips(host, {
       metrics: [{id, fa, en, unit:'count'|'pct'|'dur', color:'--sh-c1'}, …],
       defaultId: 'sessions', max: 3,
       onChange: function(selectedIds){ … }   // fired on init + every change
     })
     Rules: min 1 active (last chip can't deselect); max 3 lines, picking a
     4th replaces the oldest (FIFO); counts share the left axis, % rates and
     duration share the right axis but never together — the conflicting
     family's chips disable with an explanatory title. Reset shows only
     when selection ≠ default. */
  function metricChips(host, opts){
    var metrics = opts.metrics, max = opts.max || 3;
    var defId = opts.defaultId || metrics[0].id;
    var sel = [defId], chips = {};
    function byId(id){ for (var i = 0; i < metrics.length; i++) if (metrics[i].id === id) return metrics[i]; }
    function wouldBe(id){
      var s = sel.slice();
      if (s.length >= max) s = s.slice(1);
      s.push(id); return s;
    }
    function conflict(ids){
      var u = ids.map(function(i){ return byId(i).unit; });
      return u.indexOf('pct') > -1 && u.indexOf('dur') > -1;
    }
    function render(fire){
      metrics.forEach(function(m){
        var c = chips[m.id], on = sel.indexOf(m.id) > -1;
        var dis = !on && conflict(wouldBe(m.id));
        c.classList.toggle('on', on);
        c.classList.toggle('disabled', dis);
        c.setAttribute('aria-pressed', String(on));
        c.title = dis
          ? (getLang() === 'fa'
              ? 'عدم امکان نمایش هم‌زمان متریک‌های زمانی و درصدی روی محور عمودی.'
              : 'Cannot plot time duration and percentage metrics simultaneously on the vertical axis.')
          : '';
      });
      resetBtn.hidden = (sel.length === 1 && sel[0] === defId);
      if (fire !== false) opts.onChange(sel.slice());
    }
    host.classList.add('sh-mchips');
    metrics.forEach(function(m){
      var c = document.createElement('button');
      c.className = 'sh-mchip';
      c.style.setProperty('--mc', 'var(' + m.color + ')');
      c.innerHTML = '<span class="mc-dot"></span><span data-fa="' + m.fa + '" data-en="' + m.en + '">' +
        (getLang() === 'fa' ? m.fa : m.en) + '</span>';
      c.addEventListener('click', function(){
        if (c.classList.contains('disabled')) return;
        var i = sel.indexOf(m.id);
        if (i > -1){ if (sel.length > 1) sel.splice(i, 1); else return; }
        else sel = wouldBe(m.id);
        render();
      });
      chips[m.id] = c;
      host.appendChild(c);
    });
    var resetBtn = document.createElement('button');
    resetBtn.className = 'sh-mchips-reset';
    resetBtn.setAttribute('data-fa', 'بازنشانی');
    resetBtn.setAttribute('data-en', 'Reset');
    resetBtn.textContent = getLang() === 'fa' ? 'بازنشانی' : 'Reset';
    resetBtn.hidden = true;
    resetBtn.addEventListener('click', function(){ sel = [defId]; render(); });
    host.appendChild(resetBtn);
    document.addEventListener('shahin:lang', function(){ render(false); });
    render();
    return {
      selection: function(){ return sel.slice(); },
      set: function(ids){ sel = ids.slice(0, max); render(); }
    };
  }

  /* ── TREND CHART — dual-axis multi-line SVG for side panel trends ──
     trendChart(host, {
       labels: {fa:[…], en:[…]},                       // x-axis labels
       series: [{id, color:'--sh-c1', unit, values:[…]}, …]
     })
     Pure render: call again on chip change / lang change. Counts scale on
     the left axis; % and duration on the right. Time axis stays LTR. */
  function trendChart(host, cfg){
    var W = 560, H = 190, PL = 50, PR = 50, PT = 12, PB = 26;
    var lang = getLang(), loc = lang === 'fa' ? 'fa-IR' : 'en-US';
    var labels = (cfg.labels && cfg.labels[lang]) || cfg.labels || [];
    var series = cfg.series || [];
    var leftS = series.filter(function(s){ return s.unit === 'count'; });
    var rightS = series.filter(function(s){ return s.unit !== 'count'; });
    function maxOf(arr){
      var m = 0;
      arr.forEach(function(s){ s.values.forEach(function(v){ if (v > m) m = v; }); });
      return m || 1;
    }
    var lMax = maxOf(leftS) * 1.15, rMax = maxOf(rightS) * 1.15;
    var n = series.length ? series[0].values.length : 0;
    function x(i){ return PL + (W - PL - PR) * (n > 1 ? i / (n - 1) : 0.5); }
    function y(v, unit){
      var mx = unit === 'count' ? lMax : rMax;
      return PT + (H - PT - PB) * (1 - v / mx);
    }
    function fmt(v, unit){
      if (unit === 'pct') return Number(v).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (lang === 'fa' ? '٪' : '%');
      if (unit === 'dur'){
        var m = Math.floor(v / 60), s = Math.round(v % 60);
        return m.toLocaleString(loc) + ':' + (s < 10 ? (0).toLocaleString(loc) : '') + s.toLocaleString(loc);
      }
      return v >= 10000 ? Math.round(v / 1000).toLocaleString(loc) + 'k' : Math.round(v).toLocaleString(loc);
    }
    var sv = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img">';
    [0, 0.5, 1].forEach(function(f){
      var gy = PT + (H - PT - PB) * f;
      sv += '<line x1="' + PL + '" y1="' + gy + '" x2="' + (W - PR) + '" y2="' + gy +
            '" stroke="var(--sh-border)" stroke-width="1"/>';
      if (leftS.length)
        sv += '<text x="' + (PL - 6) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="var(--sh-muted-2)">' +
              fmt(lMax * (1 - f), 'count') + '</text>';
      if (rightS.length)
        sv += '<text x="' + (W - PR + 6) + '" y="' + (gy + 3) + '" text-anchor="start" font-size="9" fill="var(--sh-muted-2)">' +
              fmt(rMax * (1 - f), rightS[0].unit) + '</text>';
    });
    labels.forEach(function(lb, i){
      if (n > 8 && i % 2) return;
      sv += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="var(--sh-muted-2)">' + lb + '</text>';
    });
    series.forEach(function(s){
      var pts = s.values.map(function(v, i){ return x(i) + ',' + y(v, s.unit); }).join(' ');
      sv += '<polyline points="' + pts + '" fill="none" stroke="var(' + s.color + ')" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round"/>';
      s.values.forEach(function(v, i){
        sv += '<circle cx="' + x(i) + '" cy="' + y(v, s.unit) + '" r="2.6" fill="var(' + s.color + ')"/>';
      });
    });
    sv += '</svg>';
    host.classList.add('sh-trend');
    host.innerHTML = sv;
  }

  /* ── SEARCHABLE MULTI-SELECT (sh-msel) ──
     Global filter control. Auto-inits every .sh-msel[data-msel]; reads its
     options declaratively from markup so each page populates its own list.
     Behaviour: click trigger to open, type to filter, check to multi-select,
     "select all / clear" shortcuts, summary count in the trigger, closes on
     outside-click and Escape, re-summarizes on FA↔EN switch. */
  function buildMultiSelects(){
    document.querySelectorAll('.sh-msel[data-msel]').forEach(initMsel);
  }
  function initMsel(root){
    if (root.__msel) return; root.__msel = true;
    var trigger = root.querySelector('.sh-msel-trigger');
    var textEl  = root.querySelector('.sh-msel-text');
    var menu    = root.querySelector('.sh-msel-menu');
    var search  = root.querySelector('.sh-msel-search');
    var list    = root.querySelector('.sh-msel-list');
    var empty   = root.querySelector('.sh-msel-empty');
    if (!trigger || !textEl || !menu || !list) return;
    var opts  = Array.prototype.slice.call(list.querySelectorAll('.sh-msel-opt'));
    var boxes = opts.map(function(o){ return o.querySelector('input[type=checkbox]'); });

    function setOpen(o){
      root.classList.toggle('open', o);
      trigger.setAttribute('aria-expanded', String(o));
      if (o && search){ search.value = ''; filter(''); setTimeout(function(){ search.focus(); }, 0); }
    }
    function summarize(){
      var lang = getLang();
      var chosen = boxes.filter(function(b){ return b.checked; });
      if (chosen.length === 0 || chosen.length === opts.length){
        textEl.textContent = lang === 'fa' ? 'همه' : 'All';
        textEl.classList.remove('has');
      } else if (chosen.length === 1){
        var sp = opts[boxes.indexOf(chosen[0])].querySelector('span');
        textEl.textContent = sp.getAttribute(lang === 'fa' ? 'data-fa' : 'data-en') || sp.textContent;
        textEl.classList.add('has');
      } else {
        var n = chosen.length.toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US');
        textEl.textContent = lang === 'fa' ? (n + ' مورد') : (n + ' selected');
        textEl.classList.add('has');
      }
    }
    function filter(q){
      q = (q || '').trim().toLowerCase();
      var any = false;
      opts.forEach(function(o){
        var sp = o.querySelector('span');
        var hay = ((sp.getAttribute('data-fa') || '') + ' ' + (sp.getAttribute('data-en') || '') + ' ' + sp.textContent).toLowerCase();
        var show = !q || hay.indexOf(q) > -1;
        o.style.display = show ? '' : 'none';
        if (show) any = true;
      });
      if (empty) empty.hidden = any;
    }

    trigger.addEventListener('click', function(e){ e.stopPropagation(); setOpen(!root.classList.contains('open')); });
    menu.addEventListener('click', function(e){ e.stopPropagation(); });
    if (search) search.addEventListener('input', function(){ filter(search.value); });
    boxes.forEach(function(b){ b.addEventListener('change', summarize); });
    var allBtn = root.querySelector('.sh-msel-all');
    var clrBtn = root.querySelector('.sh-msel-clear');
    if (allBtn) allBtn.addEventListener('click', function(e){
      e.stopPropagation();
      opts.forEach(function(o, i){ if (o.style.display !== 'none') boxes[i].checked = true; });
      summarize();
    });
    if (clrBtn) clrBtn.addEventListener('click', function(e){
      e.stopPropagation(); boxes.forEach(function(b){ b.checked = false; }); summarize();
    });
    document.addEventListener('click', function(){ setOpen(false); });
    addEventListener('keydown', function(e){ if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('shahin:lang', function(){
      summarize();
      if (search){
        var ph = search.getAttribute(getLang() === 'fa' ? 'data-fa-ph' : 'data-en-ph');
        if (ph) search.placeholder = ph;
      }
    });
    summarize();
    if (search){
      var ph0 = search.getAttribute(getLang() === 'fa' ? 'data-fa-ph' : 'data-en-ph');
      if (ph0) search.placeholder = ph0;
    }
  }

  /* ── UNIFIED FILTER PANEL (sh-mega) ──
     Wires one panel per page: trigger [data-mega-trigger] opens #shMega.
     Controls are declarative in markup (segmented .sh-seg-opt, toggle chips
     .sh-chip.tog, checkboxes, .sh-mega-search). Edits are a draft — Save
     commits (updates the count badge + on-page applied-summary), Cancel /
     Escape / overlay / ✕ discard and revert. Counting is per-section. */
  function buildMegaFilters(){
    var trig    = document.querySelector('[data-mega-trigger]');
    var overlay = document.getElementById('shMega');
    if (!trig || !overlay) return;
    var drawer  = overlay.querySelector('.sh-mega');
    var badge   = trig.querySelector('.sh-filterbtn-badge');
    var summary = document.querySelector('[data-mega-summary]');
    var snap = null;

    var boxes = function(){ return overlay.querySelectorAll('.sh-mega-body input[type=checkbox]'); };
    var chips = function(){ return overlay.querySelectorAll('.sh-mega-body .sh-chip.tog'); };
    var segs  = function(){ return overlay.querySelectorAll('.sh-mega-body .sh-seg-opt'); };
    var radios = function(){ return overlay.querySelectorAll('.sh-mega-body input[type=radio]'); };
    var vals   = function(){ return overlay.querySelectorAll('.sh-mega-body .sh-valinput'); };

    /* a segmented group with [data-panes] swaps which pane is visible */
    function syncPanes(){
      overlay.querySelectorAll('.sh-seg[data-panes]').forEach(function(group){
        var c = document.getElementById(group.getAttribute('data-panes'));
        var on = group.querySelector('.sh-seg-opt.on');
        if (!c || !on) return;
        var pane = on.getAttribute('data-pane');
        c.querySelectorAll('[data-pane-body]').forEach(function(p){ p.hidden = p.getAttribute('data-pane-body') !== pane; });
      });
    }

    function takeSnap(){
      snap = {
        b: [].map.call(boxes(),  function(c){ return c.checked; }),
        c: [].map.call(chips(),  function(c){ return c.classList.contains('on'); }),
        s: [].map.call(segs(),   function(c){ return c.classList.contains('on'); }),
        r: [].map.call(radios(), function(c){ return c.checked; }),
        v: [].map.call(vals(),   function(c){ return c.value; })
      };
    }
    function revert(){
      if (!snap) return;
      [].forEach.call(boxes(),  function(c, i){ c.checked = snap.b[i]; });
      [].forEach.call(chips(),  function(c, i){ c.classList.toggle('on', snap.c[i]); c.classList.toggle('off', !snap.c[i]); });
      [].forEach.call(segs(),   function(c, i){ c.classList.toggle('on', snap.s[i]); });
      [].forEach.call(radios(), function(c, i){ c.checked = snap.r[i]; });
      [].forEach.call(vals(),   function(c, i){ c.value = snap.v[i]; });
      syncPanes();
    }
    function setOpen(o){
      overlay.classList.toggle('open', o);
      trig.setAttribute('aria-expanded', String(o));
    }
    function open(){ takeSnap(); setOpen(true); }
    function cancel(){ revert(); setOpen(false); }

    function secActive(sec){
      if (sec.querySelector('input[type=checkbox]:checked')) return true;
      if (sec.querySelector('.sh-chip.tog.on')) return true;
      var on = sec.querySelector('.sh-seg-opt.on');
      if (on && !on.hasAttribute('data-default') && !sec.hasAttribute('data-seg-mode')) return true;
      var r = sec.querySelector('input[type=radio]:checked');
      if (r && !r.hasAttribute('data-default')) return true;
      var v = sec.querySelector('.sh-valinput');
      if (v && v.value.trim()) return true;
      return false;
    }
    function clearSection(sec){
      sec.querySelectorAll('input[type=checkbox]').forEach(function(c){ c.checked = false; });
      sec.querySelectorAll('.sh-chip.tog').forEach(function(c){ c.classList.remove('on'); c.classList.add('off'); });
      sec.querySelectorAll('.sh-valinput').forEach(function(v){ v.value = ''; });
      sec.querySelectorAll('input[type=radio]').forEach(function(r){ r.checked = r.hasAttribute('data-default'); });
    }
    /* Active filters render as removable chips in a row below the bar, with a
       Clear All at the end. Each chip's ✕ clears that section; Clear All clears
       every active section — both re-apply immediately (badge + row refresh). */
    function renderSummary(){
      if (!summary) return;
      var lang = getLang();
      var active = [];
      [].forEach.call(overlay.querySelectorAll('.sh-mega-sec'), function(sec){
        var lbl = sec.getAttribute(lang === 'fa' ? 'data-sum-fa' : 'data-sum-en');
        var forced = sec.hasAttribute('data-sum-always');
        if (!lbl || (!secActive(sec) && !forced)) return;
        var val = '';
        var n = sec.querySelectorAll('input[type=checkbox]:checked').length + sec.querySelectorAll('.sh-chip.tog.on').length;
        var vinp = sec.querySelector('.sh-valinput');
        var radio = sec.querySelector('input[type=radio]:checked');
        var dateSeg = sec.hasAttribute('data-seg-mode') ? null : sec.querySelector('.sh-seg-opt.on');
        if (n) val = lang === 'fa' ? (n.toLocaleString('fa-IR') + ' مورد') : (n + ' selected');
        else if (vinp && vinp.value.trim()) val = vinp.value.trim();
        else if (radio && !radio.hasAttribute('data-default')) { var rl = radio.parentNode.querySelector('span'); val = rl ? (rl.getAttribute(lang === 'fa' ? 'data-fa' : 'data-en') || rl.textContent.trim()) : ''; }
        else if (dateSeg) val = dateSeg.getAttribute(lang === 'fa' ? 'data-fa' : 'data-en') || dateSeg.textContent.trim();
        active.push({ sec: sec, lbl: lbl, val: val });
      });
      if (!active.length){ summary.innerHTML = ''; summary.classList.remove('has'); return; }
      summary.classList.add('has');
      var html = '';
      active.forEach(function(a, i){
        html += '<span class="sh-fchip">' + a.lbl + (a.val ? '<span class="sh-fchip-v">: ' + a.val + '</span>' : '')
             + '<button class="sh-fchip-x" type="button" data-clear-idx="' + i + '" aria-label="' + (lang === 'fa' ? 'حذف این فیلتر' : 'Remove filter') + '">✕</button></span>';
      });
      html += '<button class="sh-fclear" type="button" data-clear-all>' + (lang === 'fa' ? 'پاک‌کردن همه' : 'Clear All') + '</button>';
      summary.innerHTML = html;
      summary.querySelectorAll('[data-clear-idx]').forEach(function(b){
        b.addEventListener('click', function(e){ e.stopPropagation(); clearSection(active[+b.getAttribute('data-clear-idx')].sec); syncPanes(); refresh(); });
      });
      var ca = summary.querySelector('[data-clear-all]');
      if (ca) ca.addEventListener('click', function(e){ e.stopPropagation(); active.forEach(function(a){ clearSection(a.sec); }); syncPanes(); refresh(); });
    }
    function refresh(){
      var n = 0;
      [].forEach.call(overlay.querySelectorAll('.sh-mega-sec'), function(s){ if (secActive(s)) n++; });
      if (badge){
        badge.textContent = getLang() === 'fa' ? n.toLocaleString('fa-IR') : String(n);
        badge.style.display = n > 0 ? '' : 'none';
      }
      renderSummary();
    }
    function save(){ setOpen(false); refresh(); toast('فیلترها اعمال شد ✓', 'Filters applied ✓'); }

    trig.addEventListener('click', function(e){ e.stopPropagation(); open(); });
    if (summary) summary.addEventListener('click', open);
    drawer.addEventListener('click', function(e){ e.stopPropagation(); });
    overlay.addEventListener('click', cancel);
    addEventListener('keydown', function(e){ if (e.key === 'Escape' && overlay.classList.contains('open')) cancel(); });
    overlay.querySelectorAll('[data-mega-x],[data-mega-cancel]').forEach(function(b){ b.addEventListener('click', cancel); });
    overlay.querySelectorAll('[data-mega-save]').forEach(function(b){ b.addEventListener('click', save); });

    /* control interactions */
    [].forEach.call(chips(), function(c){
      c.addEventListener('click', function(){ c.classList.toggle('on'); c.classList.toggle('off'); });
    });
    overlay.querySelectorAll('.sh-seg').forEach(function(group){
      group.querySelectorAll('.sh-seg-opt').forEach(function(opt){
        opt.addEventListener('click', function(){
          group.querySelectorAll('.sh-seg-opt').forEach(function(o){ o.classList.remove('on'); });
          opt.classList.add('on');
          if (group.hasAttribute('data-panes')) syncPanes();
        });
      });
    });
    syncPanes();
    overlay.querySelectorAll('.sh-mega-search[data-target]').forEach(function(inp){
      var list = document.getElementById(inp.getAttribute('data-target'));
      if (!list) return;
      var items = list.querySelectorAll('.sh-cb');
      var empty = list.parentNode.querySelector('.sh-mega-empty');
      function setPh(){ var ph = inp.getAttribute(getLang() === 'fa' ? 'data-fa-ph' : 'data-en-ph'); if (ph) inp.placeholder = ph; }
      setPh(); document.addEventListener('shahin:lang', setPh);
      inp.addEventListener('input', function(){
        var q = inp.value.trim().toLowerCase(), any = false;
        items.forEach(function(it){
          var sp = it.querySelector('span');
          var hay = ((sp.getAttribute('data-fa') || '') + ' ' + (sp.getAttribute('data-en') || '') + ' ' + sp.textContent).toLowerCase();
          var show = !q || hay.indexOf(q) > -1;
          it.style.display = show ? '' : 'none'; if (show) any = true;
        });
        if (empty) empty.hidden = any;
      });
    });

    /* bilingual placeholders for every panel input (search + value inputs) */
    overlay.querySelectorAll('[data-fa-ph]').forEach(function(inp){
      function ph(){ var p = inp.getAttribute(getLang() === 'fa' ? 'data-fa-ph' : 'data-en-ph'); if (p) inp.placeholder = p; }
      ph(); document.addEventListener('shahin:lang', ph);
    });

    document.addEventListener('shahin:lang', refresh);
    refresh();
  }

  /* ── DATE RANGE (sh-daterange) ──
     Standalone bar control with a two-tab popover (Date Range presets +
     Compare). The Compare toggle enables/disables its three radios. The
     trigger label reflects the chosen preset and re-localizes on FA↔EN. */
  function buildDateRanges(){
    document.querySelectorAll('.sh-daterange[data-daterange]').forEach(initDateRange);
  }
  function initDateRange(root){
    if (root.__dr) return; root.__dr = true;
    var trigger = root.querySelector('.sh-dr-trigger');
    var label   = root.querySelector('.sh-dr-label');
    var pop     = root.querySelector('.sh-dr-pop');
    if (!trigger || !label || !pop) return;

    function setOpen(o){ root.classList.toggle('open', o); trigger.setAttribute('aria-expanded', String(o)); }
    function syncLabel(){
      var r = root.querySelector('input[name="' + (root.getAttribute('data-range-name') || 'drRange') + '"]:checked');
      if (!r) return;
      var sp = r.parentNode.querySelector('span');
      if (sp) label.textContent = sp.getAttribute(getLang() === 'fa' ? 'data-fa' : 'data-en') || sp.textContent;
    }
    /* tabs */
    root.querySelectorAll('.sh-dr-tab').forEach(function(tab){
      tab.addEventListener('click', function(e){
        e.stopPropagation();
        root.querySelectorAll('.sh-dr-tab').forEach(function(t){ t.classList.remove('on'); });
        tab.classList.add('on');
        var which = tab.getAttribute('data-tab');
        root.querySelectorAll('[data-tab-body]').forEach(function(b){ b.hidden = b.getAttribute('data-tab-body') !== which; });
      });
    });
    /* preset selection updates the trigger label */
    root.querySelectorAll('.sh-dr-body input[type=radio]').forEach(function(rb){
      rb.addEventListener('change', syncLabel);
    });
    /* compare toggle enables/disables the compare radios */
    var toggle = root.querySelector('[data-dr-compare-toggle]');
    var opts   = root.querySelector('.sh-dr-compareopts');
    function applyToggle(){
      if (!opts) return;
      var on = toggle.classList.contains('on');
      opts.classList.toggle('disabled', !on);
      opts.querySelectorAll('input').forEach(function(i){ i.disabled = !on; });
    }
    if (toggle){
      toggle.addEventListener('click', function(e){ e.stopPropagation(); toggle.classList.toggle('on'); applyToggle(); });
      applyToggle();
    }

    trigger.addEventListener('click', function(e){ e.stopPropagation(); setOpen(!root.classList.contains('open')); });
    pop.addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('click', function(){ setOpen(false); });
    addEventListener('keydown', function(e){ if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('shahin:lang', syncLabel);
    syncLabel();
  }

  /* ── PUBLIC API ── */
  window.Shahin = {
    lang: getLang, setLang: applyLang,
    theme: getTheme, setTheme: applyTheme,
    toast: toast,
    /* Pages that build their content in JS call these after every repaint:
       tooltips() attaches ⓘ to freshly injected [data-tip-*] nodes (idempotent),
       i18n() re-applies the current language to freshly injected [data-fa]. */
    tooltips: buildTooltips,
    i18n: function () { applyLang(getLang()); },
    about: buildAbout,
    metricChips: metricChips,
    multiSelects: buildMultiSelects,
    megaFilters: buildMegaFilters,
    dateRanges: buildDateRanges,
    trendChart: trendChart,
    demoDropdowns: buildDemoDropdowns,
    /* Shahin sparkline (redesign): one fixed colour (--sh-chart-1), light fill, no end marker. w × h default 60 × 24 */
    sparkline: function (vals, o) {
      o = o || {}; var w = o.w || 60, h = o.h || 24, top = 4, mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), step = (w - 4) / (vals.length - 1);
      var pts = vals.map(function (v, i) { return [+(2 + i * step).toFixed(1), +(mx === mn ? h / 2 : top + (mx - v) / (mx - mn) * (h - top - 4)).toFixed(1)]; });
      var line = pts.map(function (p) { return p.join(','); }).join(' ');
      return '<svg class="sh-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polygon points="2,' + (h - 2) + ' ' + line + ' ' + (w - 2) + ',' + (h - 2) + '" fill="var(--sh-chart-1)" fill-opacity=".12"/><polyline points="' + line + '" fill="none" stroke="var(--sh-chart-1)" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    },
    fmt: function (n) { return Number(n).toLocaleString(getLang() === 'fa' ? 'fa-IR' : 'en-US'); }
  };

  /* ── DEMO-STATE DROPDOWNS — wireframe-only preview strips (.demo-sw) become one compact <select> each
     (PM 2026-11-10 on project-settings, 2026-11-12 «همه جا»). The segmented buttons and their handlers stay;
     the select clicks the matching button, and adjacent strips share one row. ── */
  function buildDemoDropdowns() {
  document.querySelectorAll('.demo-sw:not(.dd)').forEach(function (sw) {
    var seg = sw.querySelector(':scope > .sh-seg');
    if (!seg) return;
    var opts = Array.prototype.slice.call(seg.querySelectorAll('.sh-seg-opt'));
    if (!opts.length) return;
    var sel = document.createElement('select');
    sel.className = 'demo-sw-dd';
    var lbl = sw.querySelector(':scope > .demo-sw-lbl');
    if (lbl) { var t = lbl.textContent.replace(/[:：]\s*$/, ''); sel.setAttribute('aria-label', t); sel.title = t; }
    opts.forEach(function (b, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.setAttribute('data-fa', b.getAttribute('data-fa') || b.textContent);
      o.setAttribute('data-en', b.getAttribute('data-en') || b.textContent);
      o.textContent = b.textContent.trim();
      sel.appendChild(o);
    });
    function sync() {
      var i = opts.findIndex(function (b) { return b.classList.contains('on'); });
      if (i >= 0) sel.value = String(i);
    }
    sync();
    new MutationObserver(sync).observe(seg, { subtree: true, attributes: true, attributeFilter: ['class'] });
    sel.addEventListener('change', function () { opts[+sel.value].click(); });
    seg.insertAdjacentElement('afterend', sel);
    sw.classList.add('dd');
  });
  /* strips that are direct siblings share one row */
  document.querySelectorAll('.demo-sw.dd').forEach(function (sw) {
    if (sw.parentElement.classList.contains('demo-sw-row')) return;
    var row = document.createElement('div');
    row.className = 'demo-sw-row';
    sw.parentElement.insertBefore(row, sw);
    var cur = sw;
    while (cur && cur.classList && cur.classList.contains('demo-sw') && cur.classList.contains('dd')) {
      var next = cur.nextElementSibling;
      row.appendChild(cur);
      cur = next;
    }
  });
  }

  /* ── BOOT ── */
  applyTheme(getTheme()); // before paint of body content transition
  document.addEventListener('DOMContentLoaded', function () {
    buildControls();
    buildMultiSelects();
    buildMegaFilters();
    buildDateRanges();
    buildDemoDropdowns();
    buildTooltips();
    buildAbout();
    normalizeMetricDeltas();
    applyLang(getLang());
    loadAsk();
  });

  /* ── GLOBAL ASK BUBBLE ──
     PM decision 2026-08-20: the «بپرس» bubble rides on every page. It is
     bootstrapped from here rather than by adding an include to 178 pages, so
     every page that already loads shahin.js inherits it — and so does any
     page added later. Same omnipresence contract as shahin-nav.js.
     A page opts out with <body data-no-ask>: the بپرس page itself (a shortcut
     to the thing you are already inside is noise) and landing/presentation
     decks, which are not product surfaces. */
  function loadAsk() {
    if (document.body.hasAttribute('data-no-ask')) return;
    if (window.shahinAsk || document.getElementById('sh-ask-js')) return;
    var self = document.querySelector('script[src*="shahin.js"]');
    if (!self) return;
    var s = document.createElement('script');
    s.id = 'sh-ask-js';
    s.src = self.getAttribute('src').replace(/shahin\.js(\?.*)?$/, 'shahin-ask.js');
    document.body.appendChild(s);
  }
})();
