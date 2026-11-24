/* The «مایل‌استون N» badge of a milestone cut (PM, 2026-11-15). A milestone version is cumulative: milestone 2's parts are shown inside
   the milestone-1 version (?m=1) itself, with no new version, and each entry point of a part that ships in a later milestone carries
   this badge so design and the planning meeting see which milestone it belongs to. Loaded only by the scope scripts (es-m1.js, rb-m1.js).
   ShahinMBadge.add(el, n) appends one badge to el (idempotent); the text follows the page language. */
(function(){
  if (window.ShahinMBadge) return;
  /* m2 design pass (2026-11-15): a quiet one-line tag in the nav chip's scale (sh-nav-chip, 9px): it never wraps, never grows the
     tab or side item it sits in (fixed 16px box, centred on the label), and stays neutral so it reads as a note, not a state */
  var css = '.sh-mbadge{display:inline-flex;align-items:center;justify-content:center;flex:none;align-self:center;box-sizing:border-box;height:16px;'+
    'margin-inline-start:6px;padding:0 6px;border-radius:var(--sh-radius-pill,999px);font-size:10px;font-weight:600;line-height:1;letter-spacing:0;'+
    'white-space:nowrap;vertical-align:middle;text-transform:none;background:var(--sh-neutral-bg);color:var(--sh-text-2);border:1px solid var(--sh-border);cursor:default}';
  var st = document.createElement('style'); st.id = 'shMBadgeCss'; st.textContent = css; document.head.appendChild(st);
  var FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  function fa(){ return (localStorage.getItem('shahin-lang') || 'fa') === 'fa'; }
  function txt(n){ return fa() ? 'مایل‌استون ' + String(n).replace(/\d/g, function(d){ return FA[d]; }) : 'Milestone ' + n; }
  function add(el, n){
    if (!el) return null;
    var b = el.querySelector(':scope > .sh-mbadge');
    if (!b){ b = document.createElement('span'); b.className = 'sh-mbadge'; b.setAttribute('data-mbadge', n); el.appendChild(b); }
    var t = txt(n); if (b.textContent !== t) b.textContent = t;
    if (b.title !== 'Milestone ' + n) b.title = 'Milestone ' + n;   /* the visible text names it; a role-less span takes no aria-label */
    return b;
  }
  document.addEventListener('shahin:lang', function(){
    setTimeout(function(){ document.querySelectorAll('.sh-mbadge').forEach(function(b){ var t = txt(b.getAttribute('data-mbadge')); if (b.textContent !== t) b.textContent = t; }); }, 60);
  });
  window.ShahinMBadge = { add:add };
})();
