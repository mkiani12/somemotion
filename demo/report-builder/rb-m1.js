/* Milestone 1 «اولین نمودار مشتری» (PM, 2026-11-03): the report builder's milestone-1 version is this same page with ?m=1
   (v12.html?m=1&type=trend), so it can never drift from the full version. This file only HIDES what milestone 1 doesn't ship;
   it adds no behaviour. Features in scope: A42's labeled events group in the event picker, B01 frame and trend chart, B02 event picker, B03 per-event filters, B04 breakdown,
   B16 breakdown table, B10 date range and interval, B14 visualizations, B15 chart settings, B17 save, B18 export and copy link.
   Hidden: the other report types and «۸ نوع دیگر» (Metric Explorer included), the templates card, live events, user groups and
   «تفکیک گروه‌ها», the advanced measures, «پیشرفته» and the formula, compare to a past period, «تحلیل کن», «افزودن به…», share, the
   alert bell, the assistant, the validation-errors line, anomaly and annotations in chart settings; in the event picker «با دستیار
   پیدا کن», «تعریف متریک جدید…» (A32) and «+ ایونت ترکیبی» (A25), and «ذخیره به‌عنوان ایونت ترکیبی…» in an event's ⋯ menu; in the
   side list, the pages of later milestones (cohorts, computations, profiles, groups, predictions, templates, alerts, releases), and
   in the main menu the funnel, retention and flows entries. Also hidden: «دستیار و بافت کسب‌وکار» in chart settings, the labeled event group
   of the picker (PM 2026-11-16: the combined-events group is hidden as well, since creating one is A25), saved metrics that can't be drawn as a trend series (funnel, formula, retention), and in the
   chart's ⋯ menu move, alert, save as metric, notebook, searchable, official, archive and delete.
   Audit of features 8–16 (numbered 5–13 before the 2026-11-04 merge) (PM, 2026-11-03: «نه کمتر نه بیشتر»): refresh (B19), the chart-wide «فیلترها» panel, realtime ranges (B12),
   «امروز»/«دیروز» and the minute, hourly and quarterly intervals (B11), the compare tab of the date range (B13), historical count (B09)
   in breakdowns and filters (user properties at event time, B05, are milestone 2: shown in ?m=2 with its badge, 2026-11-15), and in the save dialog team spaces, «افزودن به داشبورد»,
   «افزودن به نوت‌بوک» and «قابل جستجو برای دیگران». Drag-to-zoom (B19) stays: it has no control to hide. */
/* Milestone 2 (PM, 2026-11-15): ?m=2 is this same cut plus milestone 2's parts, each with a «مایل‌استون ۲» badge (assets/shahin-mbadge.js);
   ?m=1 stays as it was while the team builds milestone 1. Here, only in ?m=2: user properties at event time in breakdowns and filters (A44, B05),
   «پروفایل‌ها» and the profile page (C24, C25; ?view=profiles), without the deletion request (milestone 14).
   PM 2026-11-15 (second call): part of the cohorts joins milestone 2, each entry with its badge: the «کوهورت‌ها» list (?view=cohorts) and the
   behavioural cohort page and builder (C26, also «ساختن ▸ کوهورت»), a cohort from a list of IDs (C28), a saved cohort in a chart's segments
   (C29: the segment module shows only «+ در کوهورت», more segments, and per-segment clear/duplicate/remove) and the profile's «کوهورت‌ها» tab (the membership
   check). Still out (milestone 7): static cohorts from a chart point or a segment (C27: Microscope «ساختن کوهورت», «ذخیره به‌عنوان کوهورت»,
   historical count, which makes a cohort static, and cohorts made from charts in the list), computations (C30: computed-property conditions),
   organization cohorts (groups), cohorts on dashboards (C13, milestone 9) and team discoverability. Milestone 3 keeps the segment module's
   other conditions (who, unit, saved segments, «+ فیلتر», «+ انجام ایونت», «تفکیک گروه‌ها»); «پیش از فیلتر کوهورت» lives under «پیشرفته», which stays hidden. */
(function(){
  var M2 = window.SHAHIN_M === '2';
  var css = [
    '#rbzTabs .rbz-tab:not([data-rbztype="trend"]),#rbzMore{display:none!important}',
    'aside.rbz-panel>.rbz-tplbtn,.rbz-modx:has(.rbz-live),.rbz-live{display:none!important}',
    (M2?'':'.rbz-mod:has([data-modtog="seg"]),')+'.rbz-sub2:has(.lb),#rbzAdv,.rbz-fx{display:none!important}',
    '.rbz-mgrid button[data-meas="freq"],.rbz-mgrid button[data-meas="prop"],.rbz-mgrid button[data-meas="arpau"]{display:none!important}',
    '#rbzCmp,#rbzCmp+.rbx-tipdot,#rbzAnalyze,#rbxAddTo,#rbxShare,#rbxBell,#shask-fab,.rbz-invnote{display:none!important}',
    '.rbz-setrow[data-setgo="anom"],.rbz-setrow[data-setgo="ann"],#rbzAiCtx{display:none!important}',
    '#rbzEvAi,#rbzEvAiBox,[data-mdefine],.rbz-evitem.off[data-mpick]{display:none!important}',
    '.sh-nav-item[data-nav="rb-funnel"],.sh-nav-item[data-nav="rb-retention"],.sh-nav-item[data-nav="rb-flows"],.sh-nav-item[data-nav="rb-home"]{display:none!important}',   /* Home ships later (C04) */
    /* «پروفایل‌ها» (C24) and the profile page (C25) are shown only in ?m=2 */
    (M2?'':'.rbx-item[data-nav="cohorts"],.rbx-item[data-nav="profiles"],')+'.rbx-item[data-nav="computations"],.rbx-item[data-nav="groups"],',
    '.rbx-item[data-nav="predictions"],.rbx-item[data-nav="gallery"],.rbx-item[data-nav="alerts"],.rbx-item[data-nav="releases"]{display:none!important}',
    /* B19 refresh, the chart-wide «فیلترها» panel, realtime (B12), today/yesterday by the hour (B11) and compare (B13) in the date range */
    '#rbzRefresh,.rbz-drslot .sh-filterhead-r,.rbz-drlive,.sh-dr-tab[data-tab="compare"]{display:none!important}',
    '.sh-dr-pop label.sh-radio:has(input[value="today"]),.sh-dr-pop label.sh-radio:has(input[value="yesterday"]){display:none!important}',
    /* the save dialog: the personal space only (team spaces, dashboards, notebooks and discoverability ship later) */
    '#rbxSvS .rbx-pickrow:not([data-ps="me"]),.rbx-field:has(#rbxSvA),.rbx-field:has(#rbxSvNb),.rbx-togrow:has(#rbxSvDisc){display:none!important}',
    /* PM 2026-11-04: «بازگشت» lands on a plain «فضای شخصی» list, where a saved chart is opened again (feature 16). Home (C04, milestone 22),
       All content and its search (C02, milestone 10), recent and favorites, team spaces and folders (C05, milestone 9) are hidden */
    '.rbx-side .rbx-search,.rbx-side [data-nav="home"],.rbx-side [data-nav="content"],.rbx-side [data-side="recent"],.rbx-side [data-side="favs"],',
    '.rbx-side .rbx-seclink[data-nav="spaces"],.rbx-side .rbx-spkids,.rbx-side .rbx-chevbtn,.rbx-side .rbx-spgroup:not(:has([data-sp="me"])),.rbx-side [data-newspace]{display:none!important}',
    '.v-space .rbx-crumbs,.v-space [data-spmore],.v-space .rbx-tabs,.v-space .rbx-toolbar,.v-space .rbx-gsec,.v-space .rbx-head .rbx-sub,.v-space .rbx-pager,.v-space [data-imenu],.v-space [data-moveinto]{display:none!important}',
    /* the profile page: no deletion request (milestone 14); the «کوهورت‌ها» tab (membership check) is milestone 2 */
    (M2?'':'.rbc [data-ptab="coh"],')+'.rbc .rbc-del[data-pdel]{display:none!important}',
    /* the cohort page's «مقایسه» tab shows week-1 retention (milestone 5) and organization properties (milestone 18): hidden in milestone 2 (PM 2026-11-16) */
    M2?'.rbc [data-cotab="cmp"]{display:none!important}':'',   /* only the profile's deletion request; the cohort builder's remove-condition button shares .rbc-del */
    /* C29 in milestone 2: the segment module keeps «+ در کوهورت» only; the rest of it is milestone 3 */
    M2?'#rbzWho,#rbzWho+.rbx-tipdot,#rbzUnit,#rbzUnit+.rbx-tipdot,.rbz-orgtip,#rbzSaved,[data-sfadd],[data-spadd],[data-spadd]+.rbx-tipdot,[data-spsave],.rbz-fieldrow:has([data-gsadd]){display:none!important}':'',
    /* the cohort page in milestone 2: no organization cohorts (groups) and no team discoverability (the save dialog drops it too) */
    M2?'.rbc-unit,#rbcDisc{display:none!important}':'',
    /* the ⋯ menu's owner line (Amplitude's «Owned by / Can edit») is not in F08's list: full version only */
    '.rbx-menu .rbx-mfootnote{display:none!important}',
    '.m1-out{display:none!important}'
  ].join('');
  var st = document.createElement('style'); st.id = 'rbM1Css'; st.textContent = css; document.head.appendChild(st);
  /* controls that carry no id: matched by their label (first line, both languages) */
  var OUT_TXT = /^(\+ ایونت ترکیبی|\+ Combined event|ذخیره به‌عنوان ایونت ترکیبی…|Save as a combined event…)$/;
  /* the chart's ⋯ menu keeps save as, copy, copy link, colour theme, revert and the exports; the rest belong to later milestones */
  var OUT_MORE = /^(انتقال…|Move…|ساختن هشدار|Create alert|ذخیره به‌عنوان متریک|Save as metric|نمای نوت‌بوک|Open notebook view|Notebook view|قابل جستجو کن|Make discoverable|علامت «رسمی»|Mark as [Oo]fficial|بایگانی|Archive|حذف|Delete)/;
  /* labeled events (feature 6, A42) are in milestone 1 since the PM merged milestones 1 and 2 (2026-11-04).
     PM 2026-11-16: the combined-events group is hidden too — creating one is a later milestone (A25), so in milestone 1 no customer
     has a combined event to pick */
  var OUT_GRP = /^(ایونت‌های ترکیبی|Combined events)/;
  /* autocapture kinds outside milestone 1 (PM 2026-11-14, until #696 is answered): the same kinds es-m1.js hides on the events page */
  var OUT_EV = ['scroll_depth_reached', 'form_started', 'form_submitted', 'file_download'];
  /* interval: B10 ships auto, daily, weekly and monthly; minute, hourly and quarterly are B11 */
  var OUT_GRAN = /^(دقیقه‌ای|ساعتی|فصلی|By minute|Hourly|Quarterly)/;
  /* breakdowns and filters: historical count is B09, user properties at event time are B05 */
  /* user properties at event time (B05) joined with milestone 2 (PM 2026-11-15): their group is shown with the badge */
  var OUT_PROP = /^(بار چندمِ انجام این ایونت|Historical count)/, OUT_UHEAD = M2 ? /(?!)/ : /^(ویژگی‌های کاربر|User properties)/, M2_UHEAD = /^(ویژگی‌های کاربر|User properties)/;
  /* a milestone badge inside a control is not part of its label */
  function label(b){ var t=((b.innerText || b.textContent || '').split('\n')[0] || ''), bd=b.querySelector && b.querySelector('.sh-mbadge'); if (bd) t=t.replace(bd.textContent, ''); return t.replace(/\s+/g, ' ').trim(); }
  function mark(el, out){ if (el.classList.contains('m1-out') !== out) el.classList.toggle('m1-out', out); }
  var busy = false;
  function apply(){
    if (busy) return; busy = true;
    try{
      document.querySelectorAll('.rbx-mfoot button, .rbx-menu button').forEach(function(b){ if (OUT_TXT.test(label(b))) mark(b, true); });
      if (M2) scopeM2();
      /* milestone 1 has no cohorts at all (PM 2026-11-16): the chart point's «ساختن کوهورت» items are hidden here too */
      else document.querySelectorAll('.rbx-menu .rbx-mi').forEach(function(b){ if (OUT_M2.test(label(b))) mark(b, true); });
      document.querySelectorAll('.rbx-menuwrap').forEach(function(w){ if (!w.querySelector('#rbxRMore')) return;
        w.querySelectorAll('.rbx-menu button').forEach(function(b){ if (OUT_MORE.test(label(b))) mark(b, true); }); });
      document.querySelectorAll('.rbx-menuwrap').forEach(function(w){ if (!w.querySelector('#rbzGran')) return;
        w.querySelectorAll('.rbx-menu button').forEach(function(b){ if (OUT_GRAN.test(label(b))) mark(b, true); }); });
      document.querySelectorAll('.rbx-menu').forEach(function(m){ var out = false; [].slice.call(m.children).forEach(function(c){
        if (c.classList.contains('rbx-mh')){ out = OUT_UHEAD.test((c.textContent || '').trim()); if (M2 && window.ShahinMBadge && M2_UHEAD.test((c.textContent || '').trim())) ShahinMBadge.add(c, 2); }
        if (out || (c.classList.contains('rbx-mi') && OUT_PROP.test(label(c)))) mark(c, true); }); });
      var fp = document.getElementById('rbzFp');
      if (fp){ var tr = (!M2 && window.RBId && RBId.traits) ? (RBId.traits() || []).map(function(t){ return Array.isArray(t) ? t[0] : (t && t.id) || t; }) : [];
        [].slice.call(fp.querySelectorAll('option')).forEach(function(o){ var out = o.value === '_hcount' || tr.indexOf(o.value) > -1; if (o.hidden !== out) o.hidden = out; }); }
      /* milestone 2 entry points */
      if (M2 && window.ShahinMBadge){ ShahinMBadge.add(document.querySelector('.rbx-side .rbx-item[data-nav="profiles"]'), 2);
        var v = window.RBShell && RBShell.view ? RBShell.view() : '';
        if (v === 'person') ShahinMBadge.add(document.querySelector('.rbc .rbc-title'), 2);
        if (v === 'profiles') ShahinMBadge.add(document.querySelector('.rbx-main .rbx-head .rbx-title, .rbx-head .rbx-title'), 2); }
      scopeSpace();
      /* milestone 1 has no cohorts: a deep link to them (?view=cohorts) lands on the personal space */
      if (!M2 && window.RBShell && RBShell.view && /^(cohorts|cohort)$/.test(RBShell.view())) setTimeout(function(){ RBShell.go('home'); }, 0);
      document.querySelectorAll('.rbx-menu').forEach(tidy);
      var list = document.getElementById('rbzEvList');
      /* PM 2026-11-16: marking a metric official («علامت رسمی») is a later milestone, so the official tick «✓» is not shown in milestone 1 */
      if (list) [].slice.call(list.querySelectorAll('[data-mpick] .nm')).forEach(function(n){ if (/ ✓$/.test(n.textContent)) n.textContent = n.textContent.replace(/ ✓$/, ''); });
      if (list){ var out = false; [].slice.call(list.children).forEach(function(c){
        if (c.classList.contains('rbz-evgrp')) out = OUT_GRP.test((c.textContent || '').trim());
        mark(c, out || OUT_EV.indexOf(c.getAttribute('data-pick')) > -1); }); }
    } finally { setTimeout(function(){ busy = false; }, 0); }
  }
  /* ── milestone 2's cohorts (PM 2026-11-15): what stays out, and the badges ── */
  var OUT_M2 = /^(ساختن کوهورت|Create cohort|ساختن کوهورت از کاربران این نشست‌ها|Create cohort from these sessions’ users|ذخیره به‌عنوان گروه ذخیره‌شده…|Save as a saved segment…)$/;
  var OUT_COMORE = /^(افزودن به داشبورد…|Add to dashboard…)$/;
  function propOut(id){ var P = window.RB && RB.PROPS && RB.PROPS[id]; return !!P && (P.grp === 'computed' || P.grp === 'org'); }
  function hideOpt(o, out){ if (o.hidden !== out) o.hidden = out; }
  function scopeM2(){
    /* C27: cohorts from a chart point (Microscope) and saved segments (milestone 3) */
    document.querySelectorAll('.rbx-menu .rbx-mi').forEach(function(b){ if (OUT_M2.test(label(b))) mark(b, true); });
    document.querySelectorAll('.rbx-menuwrap').forEach(function(w){ if (!w.querySelector('#rbcMore')) return;
      w.querySelectorAll('.rbx-menu .rbx-mi').forEach(function(b){ if (OUT_COMORE.test(label(b))) mark(b, true); }); });
    /* the cohort builder: no computed (C30) or organization properties, no historical count (it makes a cohort static, C27) */
    document.querySelectorAll('select[data-cprop] option, select[data-cmp="cprop"] option').forEach(function(o){ hideOpt(o, propOut(o.value)); });
    document.querySelectorAll('select[data-cmp="cmp"] option').forEach(function(o){ hideOpt(o, /^prop:/.test(o.value) && propOut(o.value.slice(5))); });
    document.querySelectorAll('select[data-cwith] option[value="hist"]').forEach(function(o){ hideOpt(o, true); });
    if (!window.ShahinMBadge) return;
    var B = function(el){ if (el) ShahinMBadge.add(el, 2); };
    B(document.querySelector('.rbx-side .rbx-item[data-nav="cohorts"]'));
    var v = window.RBShell && RBShell.view ? RBShell.view() : '';
    if (v === 'cohorts') B(document.querySelector('.rbx-main .rbx-head .rbx-title'));
    if (v === 'cohort') B(document.querySelector('.rbc-co .rbc-title'));
    B(document.querySelector('.rbc-dr .rbc-title'));   /* the create drawer (PM 2026-11-16) opens over any view */
    B(document.querySelector('.rbc [data-ptab="coh"]'));
    document.querySelectorAll('[data-scadd]').forEach(B);
    B(document.querySelector('.rbz-modtog[data-modtog="seg"]'));
    document.querySelectorAll('.rbx-menuwrap').forEach(function(w){ if (!w.querySelector('#rbxCreate')) return;
      w.querySelectorAll('.rbx-menu .rbx-mi').forEach(function(b){ if (/^(کوهورت|Cohort)$/.test(label(b))) B(b.querySelector('.grow') || b); }); });
  }
  /* C27: cohorts made from a chart are not listed in milestone 2 (the ID-list cohort, C28, is) */
  if (M2) window.RB_M_COHORT = function(c){ return c.src !== 'chart'; };
  /* M1 parity (2026-11-16): a menu separator or head whose items are all hidden is hidden too (no orphan line at the foot of ⋯) */
  function tidy(m){ var segs=[[]], seen=false;
    [].slice.call(m.children).forEach(function(c){ if(c.classList.contains('rbx-msep')) segs.push([c]); else segs[segs.length-1].push(c); });
    segs.forEach(function(seg){ var live=seg.some(function(c){ return c.classList.contains('rbx-mi') && !c.classList.contains('m1-out'); });
      seg.forEach(function(c){ if(c.classList.contains('rbx-msep')) mark(c, !live || !seen); else if(c.classList.contains('rbx-mh') && !live) mark(c, true); });
      if(live) seen=true; }); }
  /* annotations on the chart ship in a later milestone: rb-amp-builder.js draws none while this flag is set */
  window.RB_HIDE_ANN = true;
  /* no Home or All content in a milestone cut: rb-shell.js sends every way there to the personal space */
  window.RB_M_HOME = true;
  /* the Create menu keeps «روند» only; the personal space lists only saved trend charts (other types and dashboards ship later) */
  var KEEP_CREATE = M2 ? /^(روند|Trend|کوهورت|Cohort)$/ : /^(روند|Trend)$/;   /* milestone 2 adds «کوهورت» (C26) */
  function scopeSpace(){
    document.querySelectorAll('.rbx-menuwrap').forEach(function(w){ if (!w.querySelector('#rbxCreate')) return;
      w.querySelectorAll('.rbx-menu .rbx-mi').forEach(function(b){ if (!KEEP_CREATE.test(label(b))) mark(b, true); }); });
  }
  /* listings show saved trend charts only (rb-shell.js filters its items with this), so an empty personal space shows its own empty state */
  window.RB_M_ITEMS = function(r){ return r.kind === 'report' && r.type === 'trend'; };
  /* the menu's «فضاها» lands on the personal space, the only space in this milestone, so it reads «فضای شخصی» (PM 2026-11-05) */
  function navLabel(){ var it=document.querySelector('.sh-nav-item[data-nav="rb-spaces"]'); if(!it) return;
    var fa=(document.documentElement.lang||'fa')!=='en', want=fa?'فضای شخصی':'Personal space';
    var w=document.createTreeWalker(it,NodeFilter.SHOW_TEXT,null), n; while((n=w.nextNode())){ var t=n.nodeValue.trim(); if(t==='فضاها'||t==='Spaces'){ n.nodeValue=n.nodeValue.replace(t,want); } } }
  document.addEventListener('shahin:lang', function(){ setTimeout(navLabel, 80); });
  function boot(){ navLabel(); apply(); if (window.RBShell && RBShell.view && (M2 ? /^(home|content)$/ : /^(home|content|cohorts|cohort)$/).test(RBShell.view())) RBShell.go('home'); else if (window.RBShell && RBShell.rerender) RBShell.rerender(); new MutationObserver(apply).observe(document.body, { childList:true, subtree:true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 60); });
  else setTimeout(boot, 60);
})();
