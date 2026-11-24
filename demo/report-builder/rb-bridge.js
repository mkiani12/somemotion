/* ═════════ ready dashboards ⇄ report builder (phase 4, Decision 7) ═════════
   "Every dashboard card opens in the report builder" with the same date range and filters, and dashboards sit on the
   report-builder engine so the two never disagree. One helper for every ready dashboard:
   - numbers: a hidden same-origin report-builder/v12.html iframe answers through RBAmp.tile / compute / funnel — the very
     functions the builder draws from — so a card and the chart it opens show the same number by construction;
   - the bridge: ShahinRB.href(spec) → v12.html?q=<base64url JSON { type, amp, range, filters, title, from, dropped }>;
     v12 opens it as a new, unsaved report with a way back (rb-shell.js openBridge);
   - range and filters are read from the shared filter bar at click / compute time (it dispatches no event), and the
     drawer's plain values are mapped explicitly to engine properties; what has no equivalent is not carried and is named.
   Usage on a page:  <script src="../report-builder/rb-bridge.js"></script>
     ShahinRB.ready(function(){ … ShahinRB.tile(spec) … });  ShahinRB.decorate(cardEl, spec);  ShahinRB.onChange(renderAll); */
(function(){
'use strict';
var BASE=(function(){ var s=document.currentScript&&document.currentScript.src||''; return s.replace(/rb-bridge\.js.*$/,''); })();
function L(){ return document.documentElement.lang==='en'?'en':'fa'; }
function T(fa, en){ return L()==='en'?en:fa; }

/* ── the compute host ── */
var frame=null, win=null, waiting=[], failed=false;
function boot(){
  if(frame) return;
  frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true'); frame.tabIndex=-1; frame.title='report-builder engine';
  frame.style.cssText='position:fixed;width:1px;height:1px;inset-inline-start:0;top:0;border:0;opacity:0;pointer-events:none;visibility:hidden';   /* fixed: never widens the page (absolute at -9999px did, in RTL) */
  frame.src=BASE+'v12.html?engine=1';
  var t0=Date.now();
  frame.addEventListener('load', function(){ var tries=0;
    (function poll(){ try{ var w=frame.contentWindow; if(w && w.RBAmp && w.RBAmp.tile && w.RB && w.RB.SAVED){ win=w; var q=waiting; waiting=[]; q.forEach(function(f){ try{ f(); }catch(e){ console.error(e); } }); return; } }catch(e){}
      if(++tries>200){ failed=true; console.warn('rb-bridge: engine not ready after', Date.now()-t0, 'ms'); return; } setTimeout(poll, 50); })(); });
  (document.body||document.documentElement).appendChild(frame);
}
function ready(cb){ if(win) cb(); else { waiting.push(cb); boot(); } }
/* lexicon b: transformations and drop filters apply here too, as in Amplitude; the page says so */
function defsNote(){ try{ if(!win||!win.RBDefs||!win.RBDefs.active()||document.getElementById('rbDefsNote')) return;
  var m=document.querySelector('.sh-content')||document.querySelector('main'); if(!m) return; var d=document.createElement('div'); d.id='rbDefsNote'; d.className='sh-alert'; d.style.marginBottom='12px';
  d.innerHTML='<span class="sh-alert-icon">ⓘ</span><span>'+T('تبدیل داده فعال است: عددهای این صفحه با ادغام‌ها، تغییر نام‌ها و فیلترهای پنهان‌سازی «ایونت‌ها» محاسبه شده‌اند.','A data transformation is active: this page’s numbers include the merges, renames and drop filters set on the Events page.')+'</span>';
  m.insertBefore(d, m.firstChild); }catch(e){} }
waiting.push(defsNote);

/* ── range and filters from the shared filter bar ── */
var RANGE_OK={ '7d':1, '30d':1, '3m':1, '6m':1, '12m':1, today:1 };
var rangeGetter=null;
function range(){ if(rangeGetter){ var g=rangeGetter(); if(g) return g; }
  var r=document.querySelector('input[name="drRange"]:checked'); var v=r&&r.value; return RANGE_OK[v]?v:'7d'; }
/* drawer value → engine property; null = no equivalent (named in the dropped list) */
var MAP={
  page:{ '/':['page_path','/'], '/checkout':['page_path','/checkout'], '/products':['page_path','/product/*'] },
  /* a value list per project: the first one the project's engine has is used (Bamdad's sources are the Media dashboard's) */
  channel:{ organic:['referrer_type',['Organic','Search']], social:['referrer_type','Social'], email:['referrer_type','Mail'], direct:['referrer_type',['Direct','Direct & messengers']] },
  device:{ desktop:['device_type','Desktop'], mobile:['device_type','Mobile'], tablet:['device_type','Tablet'],
    chrome:['browser','Chrome'], safari:['browser','Safari'], firefox:['browser','Firefox'], samsung:['browser','Samsung Internet'],
    windows:['os','Windows'], ios:['os','iOS'], android:['os','Android'] },
  location:{ ir:['country','Iran'], tehran:['city','Tehran'] },
  user:{ returning:['is_new_user','Returning'], 'new':['is_new_user','New'] },
  /* the video dashboard's own drawer sections */
  video:{ vid_8841:['video_title','Special report — 1405 budget'], vid_7710:['video_title','Technical analysis tutorial — Ep. 3'], vid_9023:['video_title','Match highlights: Persepolis vs Esteghlal'],
    vid_8312:['video_title','Short documentary: Zayandeh-Rud'], vid_9120:['video_title','Product intro video'], vid_7745:['video_title','10 home cooking hacks'], vid_6610:['video_title','Yalda night online concert'],
    vid_5532:['video_title','Iran wildlife documentary'], vid_4418:['video_title','Solar panel install tutorial'] },
  trigger:{ manual:['play_trigger','Manual'], autoplay:['play_trigger','Autoplay'], recommendation:['play_trigger','Suggested'] },
  carrier:{ irancell:['isp_name','Irancell'], mci:['isp_name','Hamrah-e-Aval'], tci:['isp_name','TCI'], shatel:['isp_name','Shatel'] },
  category:{ education:['content_category','Education'], entertainment:['content_category','Entertainment'], news:['content_category','News'] }
};
var SECS=[['صفحه','page'],['ارجاع‌دهنده','channel'],['دستگاه','device'],['موقعیت','location'],['برچسب','tag'],['نوع کاربر','user'],['ربات','bot'],['ویدیو','video'],['شروع پخش','trigger'],['اپراتور','carrier'],['دسته','category'],['مدت ویدیو','duration']];
function secKey(sec){ var s=sec.getAttribute('data-sum-fa')||''; var hit=SECS.filter(function(x){ return x[0]===s; })[0]; return hit?hit[1]:(s==='UTM'?'utm':''); }
/* the mapped value if this project's engine has it (else the filter isn't carried, and is named) */
function pick(prop, v){ var c=Array.isArray(v)?v:[v], P=win&&win.RB&&win.RB.PROPS[prop]; if(!P) return c[0];
  return c.filter(function(x){ return P.vals.some(function(y){ return y[1]===x; }); })[0]||null; }
function filters(){
  var out={}, dropped=[], mega=document.getElementById('shMega');
  function add(prop, val){ (out[prop]=out[prop]||[]); if(out[prop].indexOf(val)<0) out[prop].push(val); }
  if(mega) mega.querySelectorAll('.sh-mega-sec').forEach(function(sec){
    var k=secKey(sec), label=[sec.getAttribute('data-sum-fa')||'', sec.getAttribute('data-sum-en')||''];
    sec.querySelectorAll('input[type=checkbox]:checked').forEach(function(c){
      var v=c.value, m=MAP[k]&&MAP[k][v], txt=(c.parentNode&&c.parentNode.textContent||v).trim();
      if(k==='user'&&v==='all') return;
      var hv=m&&pick(m[0], m[1]);
      if(hv) add(m[0], hv); else dropped.push({ fa:label[0]+': '+txt, en:label[1]+': '+txt }); });
    sec.querySelectorAll('input[type=radio]:checked').forEach(function(r){ if(k==='bot'&&r.value!=='exclude') dropped.push({ fa:'ربات: نمایش هم', en:'Bot: include' }); });
    sec.querySelectorAll('.sh-valinput').forEach(function(inp){ var v=(inp.value||'').trim(); if(!v) return;
      var pane=inp.closest('[data-pane-body]'), p=pane&&pane.getAttribute('data-pane-body'), prop=k==='utm'?({ campaign:'utm_campaign', source:'utm_source', medium:'utm_medium' })[p]:k==='channel'?({ source:'utm_source', domain:'referrer_domain' })[p]:null;
      var E=win&&win.RB&&prop?win.RB.PROPS[prop]:null, hit=E&&E.vals.filter(function(x){ return x[1].toLowerCase()===v.toLowerCase()||x[0]===v; })[0];
      if(hit) add(prop, hit[1]); else dropped.push({ fa:label[0]+': '+v, en:label[1]+': '+v }); }); });
  return { filters:Object.keys(out).map(function(p){ return { prop:p, op:'in', vals:out[p] }; }), dropped:dropped }; }

/* ── computation (all through the builder's own functions) ── */
function ctx(spec){ var f=filters(); return { range:spec.range||range(), filters:(spec.filters||[]).concat(f.filters) }; }
function tile(spec){ if(!win) return null; var c=ctx(spec);
  try{ return win.RBAmp.tile({ amp:spec.amp, range:c.range, filters:[] }, c, spec.type||'trend'); }catch(e){ console.error('rb-bridge tile', e); return null; } }
function compute(spec){ if(!win) return null; try{ return win.RBAmp.computeFor(spec.amp, ctx(spec)); }catch(e){ console.error('rb-bridge compute', e); return null; } }
function mex(spec){ if(!win) return null; try{ return win.RBAmp.mex(spec.amp, ctx(spec)); }catch(e){ console.error('rb-bridge mex', e); return null; } }
function table(spec){ if(!win) return null; try{ return win.RBAmp.table(spec.amp, ctx(spec)); }catch(e){ console.error('rb-bridge table', e); return null; } }
function funnel(spec){ if(!win) return null; try{ return win.RBAmp.funnel(spec.amp, ctx(spec)); }catch(e){ console.error('rb-bridge funnel', e); return null; } }
/* a sum of several trend totals (e.g. a formula: net = purchases − refunds) */
function total(spec){ var r=compute(spec); return r&&r.overall[0]?r.overall[0].total:null; }

/* ── the link ── */
function b64(o){ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
/* the way back carries the range and the drawer's ticked values, so the dashboard reopens as it was */
function ticked(){ var out=[], mega=document.getElementById('shMega'); if(!mega) return out;
  mega.querySelectorAll('.sh-mega-sec').forEach(function(sec){ var k=secKey(sec); sec.querySelectorAll('input[type=checkbox]:checked').forEach(function(c){ out.push(k+':'+c.value); }); }); return out; }
function here(){ var u=new URL(location.href); u.searchParams.set('range', range()); u.searchParams.set('project', project()); var t=ticked(); if(t.length) u.searchParams.set('f', t.join(',')); else u.searchParams.delete('f'); u.hash=''; return u.pathname+u.search; }
function href(spec){ var f=filters(), page=window.SHAHIN_PAGE_META&&SHAHIN_PAGE_META.title||{ fa:document.title, en:document.title };
  return BASE+'v12.html?project='+project()+'&q='+b64({ type:spec.type||'trend', amp:spec.amp, range:spec.range||range(), filters:(spec.filters||[]).concat(f.filters),
    title:spec.title||null, from:{ fa:page.fa, en:page.en, href:here() }, dropped:f.dropped, project:project() }); }
/* the page's project (topbar switcher); the builder opens on the same one */
function project(){ try{ var v=JSON.parse(localStorage.getItem('shahin-nav-project')); return v>=0&&v<=3?v:0; }catch(e){ return 0; } }
function open(spec){ location.href=href(spec); }

/* ── the card button ── */
var ICON='<svg viewBox="0 0 256 256" aria-hidden="true" width="14" height="14"><path fill="currentColor" d="M224 104a8 8 0 0 1-16 0V59.32l-66.33 66.34a8 8 0 0 1-11.32-11.32L196.68 48H152a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-40 24a8 8 0 0 0-8 8v72H48V80h72a8 8 0 0 0 0-16H48a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-72a8 8 0 0 0-8-8"/></svg>';   /* Phosphor arrow-square-out, verbatim from design-system/assets/ph-icons.js */
function css(){ if(document.getElementById('rbBridgeCss')) return; var st=document.createElement('style'); st.id='rbBridgeCss';
  st.textContent='.rbb-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--sh-border);background:var(--sh-surface);color:var(--sh-text-2,var(--sh-text));border-radius:8px;padding:2px 8px;font:inherit;font-size:11px;cursor:pointer;white-space:nowrap;margin-inline-start:auto;transition:border-color var(--sh-duration-fast,140ms) var(--sh-ease-standard,ease),color var(--sh-duration-fast,140ms) var(--sh-ease-standard,ease)}'+
    '.rbb-btn:hover,.rbb-btn:focus-visible{border-color:var(--sh-brand);color:var(--sh-brand)}.rbb-btn[aria-disabled=true]{opacity:.55;cursor:not-allowed}.rbb-btn[aria-disabled=true]:hover{border-color:var(--sh-border);color:inherit}'+
    '.rbb-in{float:inline-end;margin-inline-start:8px;margin-top:-1px;font-weight:400}.rbb-ico{padding:3px 5px}.rbb-wait{opacity:.45;transition:opacity var(--sh-duration-fast,140ms) var(--sh-ease-standard,ease)}'+
    '@media (max-width:560px){.rbb-in span{display:none}.rbb-in{padding:3px 6px}}@media (prefers-reduced-motion:reduce){.rbb-btn,.rbb-wait{transition:none}}';
  document.head.appendChild(st); }
function label(){ return T('باز کردن در گزارش‌ساز','Open in report builder'); }
function button(spec){ css(); var b=document.createElement('button'); b.type='button'; b.className='rbb-btn'; b.setAttribute('data-rbb','1');
  if(spec.none){ b.setAttribute('aria-disabled','true'); b.title=T(spec.none[0], spec.none[1]); b.innerHTML=ICON+(spec.compact?'':'<span>'+label()+'</span>'); if(spec.compact) b.classList.add('rbb-ico');
    b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); if(window.Shahin&&Shahin.toast) Shahin.toast(spec.none[0], spec.none[1]); }); return b; }
  b.title=T('همین کارت با همین بازه و فیلترها در گزارش‌ساز باز می‌شود','Opens this card in the report builder with the same range and filters');
  b.innerHTML=ICON+(spec.compact?'':'<span>'+label()+'</span>'); if(spec.compact){ b.classList.add('rbb-ico'); b.setAttribute('aria-label', label()); }
  b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); open(spec); });
  return b; }
/* put one button in the card's header (idempotent: re-decorating replaces it, so a language toggle keeps it) */
/* the button sits inside the card's title, at its end; a language toggle rewrites titles, so pages re-decorate after it */
function decorate(card, spec, title){ if(!card) return null; var t=title||card.querySelector('.sh-card-title, .sec-title, h3')||card;
  var old=t.querySelector('[data-rbb]'); if(old) old.remove();
  var b=button(spec); b.classList.add('rbb-in'); t.appendChild(b); return b; }

/* ── re-render hooks: range radios, drawer inputs, language ── */
function onChange(fn){ var t=null; function go(){ clearTimeout(t); t=setTimeout(fn, 60); }
  document.addEventListener('change', function(e){ var x=e.target; if(!x) return; if(x.name==='drRange' || (x.closest&&x.closest('#shMega'))) go(); }, true);
  document.addEventListener('input', function(e){ var x=e.target; if(x&&x.classList&&x.classList.contains('sh-valinput')) go(); }, true);
  document.addEventListener('click', function(e){ var x=e.target; if(x&&x.closest&&x.closest('[data-mega-apply],[data-mega-clear],.sh-chip-x')) go(); }, true); }
/* a page link may carry ?range= back from the builder: select it in the bar */
function restoreRange(){ var qs=new URLSearchParams(location.search), v=qs.get('range'), f=qs.get('f'), pj=qs.get('project');
  if(pj!=null && /^[0-3]$/.test(pj) && +pj!==project()){ try{ localStorage.setItem('shahin-nav-project', pj); }catch(e){} location.reload(); return; }   /* back from the builder on the project it opened on */
  if(v&&RANGE_OK[v]){ var r=document.querySelector('input[name="drRange"][value="'+v+'"]'); if(r&&!r.checked){ r.checked=true; r.dispatchEvent(new Event('change',{ bubbles:true })); } }
  var mega=document.getElementById('shMega'); if(f&&mega) f.split(',').forEach(function(x){ var i=x.indexOf(':'), k=x.slice(0,i), val=x.slice(i+1);
    mega.querySelectorAll('.sh-mega-sec').forEach(function(sec){ if(secKey(sec)!==k) return; sec.querySelectorAll('input[type=checkbox]').forEach(function(c){ if(c.value===val&&!c.checked){ c.checked=true; c.dispatchEvent(new Event('change',{ bubbles:true })); } }); }); }); }
document.addEventListener('DOMContentLoaded', function(){ setTimeout(restoreRange, 0); });

/* ── formatting in the page's own language (the iframe keeps the language it booted with) ── */
function num(x, dec){ var n=Number(x)||0; return n.toLocaleString(L()==='fa'?'fa-IR':'en-US', { maximumFractionDigits:dec==null?0:dec }); }
function pct(x, dec){ return num(x, dec==null?1:dec)+T('٪','%'); }
function money(x){ var n=Number(x)||0, a=Math.abs(n); if(a>=1e9) return num(n/1e9,1)+T(' میلیارد ت',' B T'); if(a>=1e6) return num(n/1e6,1)+T(' میلیون ت','M T'); if(a>=1e3) return num(n/1e3,0)+T(' هزار ت','K T'); return num(n)+T(' ت',' T'); }

/* switching project in the topbar reloads the dashboard (and its hidden engine) on the new project */
document.addEventListener('click', function(e){ if(e.target&&e.target.closest&&e.target.closest('[data-proj-opt]')) setTimeout(function(){ location.reload(); }, 60); });
window.ShahinRB={ project:project, ready:ready, failed:function(){ return failed; }, range:range, setRange:function(fn){ rangeGetter=fn; }, filters:filters,
  tile:tile, compute:compute, table:table, funnel:funnel, mex:mex, total:total, href:href, open:open, button:button, decorate:decorate, onChange:onChange,
  num:num, pct:pct, money:money, engine:function(){ return win; } };
})();
