/* ═══════════════════════════════════════════════════════════════════════════
   Shahin — IN-PLACE PAGE ORIENTATION CARD (shared component)
   ---------------------------------------------------------------------------
   Phase-2 · Gate 1 · Step 2 ("معرفی درجای هر صفحه"). On first entry to a demo
   route, a slim dismissible card introduces the page: one line "what this page
   does" (summarized from the Help Center — the single source of truth) plus
   one checkable pointer into this page's live data. No modal, no tour, no
   forced sequence. Runbook: /shahinhub/marketingagent/page-orientation/

   USAGE (per page):
     <div data-shahin-orient
          data-key="overview"                    key for dismissal memory
          data-what-fa="…" data-what-en="…"      line 1 — what this page does
          data-see-fa="…"  data-see-en="…"       line 2 — one thing to check
          data-target="#shOrientTarget"></div>   element the pointer scrolls to
     <script src="/assets/shahin-orient.js"></script>   <!-- before shahin.js -->

   Behavior:
     · shown once per route; dismissal remembered (localStorage sh-orient-<key>)
     · ?orient=show forces display, ?orient=reset clears all dismissals (QA)
     · pointer click scrolls to the target and softly emphasizes it
   Runs synchronously at parse time so shahin.js applyLang picks up the
   data-fa/data-en spans. Idempotent — safe if included twice.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__shahinOrientInjected) return;
  window.__shahinOrientInjected = true;

  var mount = document.querySelector('[data-shahin-orient]');
  if (!mount) return;

  var qs = new URLSearchParams(location.search);
  var mode = qs.get('orient'); /* show | reset | null */
  var key = 'sh-orient-' + (mount.getAttribute('data-key') || location.pathname);

  try {
    if (mode === 'reset') {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sh-orient-') === 0) localStorage.removeItem(k); });
    }
    if (mode !== 'show' && mode !== 'reset' && localStorage.getItem(key) === 'off') { mount.remove(); return; }
  } catch (e) {}

  /* ── scoped styles (tokens only) ── */
  var STYLE = ''
    + '.sh-orient{display:flex;align-items:flex-start;gap:12px;margin:0 0 14px;padding:11px 14px;'
    + 'background:var(--sh-brand-soft);border:1px solid var(--sh-brand-border);border-radius:12px;position:relative}'
    + '.sh-orient-ic{flex:0 0 auto;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;'
    + 'background:var(--sh-surface, var(--sh-bg));border:1px solid var(--sh-brand-border);color:var(--sh-brand);margin-top:1px}'
    + '.sh-orient-ic svg{width:17px;height:17px}'
    + '.sh-orient-tx{flex:1 1 auto;min-width:0}'
    + '.sh-orient-what{margin:0;font-size:.82rem;font-weight:700;line-height:1.75;color:var(--sh-text)}'
    + '.sh-orient-see{margin:2px 0 0;font-size:.8rem;line-height:1.7}'
    + '.sh-orient-see a{color:var(--sh-brand);font-weight:700;text-decoration:none;border-bottom:1px dashed var(--sh-brand-border);cursor:pointer}'
    + '.sh-orient-see a:hover{border-bottom-style:solid}'
    + '.sh-orient-see .arr{display:inline-block;margin-inline-start:4px}'
    + '[dir="ltr"] .sh-orient-see .arr{transform:scaleX(-1)}'
    + '.sh-orient-x{flex:0 0 auto;background:none;border:0;color:var(--sh-muted);font-size:1.05rem;line-height:1;'
    + 'cursor:pointer;padding:2px 4px;border-radius:6px;margin-top:1px}'
    + '.sh-orient-x:hover{color:var(--sh-text);background:var(--sh-hover, transparent)}'
    + '.sh-orient-glow{outline:2px solid var(--sh-brand);outline-offset:3px;border-radius:10px;'
    + 'transition:outline-color .9s ease .9s}'
    + '@media(max-width:640px){.sh-orient{align-items:flex-start;padding:10px 12px}.sh-orient-ic{display:none}}';
  var st = document.createElement('style');
  st.textContent = STYLE;
  document.head.appendChild(st);

  /* Phosphor "compass" (regular) — raw path per icon convention */
  var ICON = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm47.58-140.42a8,8,0,0,0-8.4-1.84l-64,24a8,8,0,0,0-4.76,4.76l-24,64a8,8,0,0,0,10.24,10.24l64-24a8,8,0,0,0,4.76-4.76l24-64A8,8,0,0,0,175.58,75.58Zm-42.34,78.51-40.32,15.12,15.12-40.32,40.32-15.12Z"/></svg>';

  var g = function (a) { return mount.getAttribute(a) || ''; };
  var target = g('data-target');

  var card = document.createElement('aside');
  card.className = 'sh-orient';
  card.setAttribute('role', 'note');
  card.innerHTML =
      '<span class="sh-orient-ic">' + ICON + '</span>'
    + '<div class="sh-orient-tx">'
    + '<p class="sh-orient-what"><span data-fa="' + g('data-what-fa') + '" data-en="' + g('data-what-en') + '"></span></p>'
    + '<p class="sh-orient-see"><a href="' + (target || '#') + '" data-orient-see>'
    + '<span data-fa="' + g('data-see-fa') + '" data-en="' + g('data-see-en') + '"></span><span class="arr">←</span></a></p>'
    + '</div>'
    + '<button class="sh-orient-x" type="button" aria-label="بستن راهنما" title="بستن">✕</button>';
  mount.replaceWith(card);

  card.querySelector('.sh-orient-x').addEventListener('click', function () {
    card.remove();
    try { localStorage.setItem(key, 'off'); } catch (e) {}
    /* measurement event: orient_dismissed (wired to Shahin analytics in production) */
  });

  card.querySelector('[data-orient-see]').addEventListener('click', function (e) {
    e.preventDefault();
    var el = target ? document.querySelector(target) : null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('sh-orient-glow');
    setTimeout(function () { el.style.outlineColor = 'transparent'; }, 1400);
    setTimeout(function () { el.classList.remove('sh-orient-glow'); el.style.outlineColor = ''; }, 2600);
    /* measurement event: orient_pointer_clicked */
  });
  /* measurement event: orient_shown */
})();
