/* Milestone 1 · feature 3 «وضعیت جمع‌آوری در داشبوردهای آماده» (PM, 2026-11-03: «دقیقا کاری که با فهرست ایونت‌ها کردیم»).
   A cut of v7 that only HIDES what is out of milestone 1's scope; v7 stays the full reference and nothing here adds behaviour.
   Shown: the gallery and the starter pages as the frame, with each event's real per-project status on its role card and on the preview
   tiles, the «کد را اضافه کردم» handshake, the schema, the collection summary card and the status filters «همه در حال دریافت» and
   «منتظر کد شما». Hidden (milestone 11, templates): search, «اخیرا دیده‌شده», «قالب‌های دیگر در گزارش‌ساز» and «ذخیره به‌عنوان
   داشبورد» with its save modal and callouts. */
/* PM 2026-11-03, v8 is the single template gallery: the scope below keeps milestone 1 to Shahin's business-type dashboards, so the
   use-case templates, the project's own templates and «ساخته شما» (milestone 11) are not rendered at all; v8 reads it before it paints. */
/* PM 2026-11-14: milestone 1 follows the v9/v10 gallery — Shahin's templates tagged by industry and by use case, with both filters;
   only the project's own templates, «ساخته شما» and the custom section (milestone 11) stay out. The page is v10.html?m=1.
   PM 2026-11-14: the page is renamed «گالری تمپلیت‌ها» and milestone 1 is now v11.html?m=1; this scope is unchanged.
   PM 2026-11-14: milestone 1 is now v12.html?m=1 (no dashboard preview on a template page); this scope is unchanged.
   PM 2026-11-16: milestone 1 is now v13.html?m=1 (the gallery as Amplitude's: use case and industry are nav categories, no chips); this scope is unchanged.
   PM 2026-11-16 (#480): role binding («افزودن ایونت») and «باز کردن داشبورد تمپلیت» are in milestone 1, so neither is hidden here; the usage line «N بار استفاده» is (it only counts saves, which wait for milestone 11). */
window.CAP_SCOPE = { only:'shahin' };
(function(){
  var css = [
    '.tg-nav label:has(#capQ),.tg-nav #capQ,.tg-nav .rbx-item[data-sec="recent"],.tg-nav a.rbx-item{display:none!important}',
    '#capSave,#capSaved,#capNoSave,.tg-nosave{display:none!important}',
    /* PM 2026-11-16 (#480): no save in milestone 1, so the usage line «N بار استفاده» would always read zero */
    '.i13-u,.i8-tmeta .i8-use{display:none!important}',
    /* the assistant ships in a later milestone; the other milestone-1 pages hide the same button */
    '#shask-fab{display:none!important}'
  ].join('');
  var st = document.createElement('style'); st.id = 'esStartM1Css'; st.textContent = css; document.head.appendChild(st);
  /* :has() fallback — hide the search box's own wrapper when the browser lacks :has() */
  function hideSearchWrap(){
    var q = document.getElementById('capQ'); if(!q) return;
    var w = q.parentElement; if(w && w.classList && !w.classList.contains('tg-nav')) w.style.display = 'none';
  }
  function boot(){ hideSearchWrap(); new MutationObserver(hideSearchWrap).observe(document.getElementById('capMain') || document.body, { childList:true, subtree:true }); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 60); });
  else setTimeout(boot, 60);
})();
