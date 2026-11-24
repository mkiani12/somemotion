/* ═════════ Template gallery, batch a (after phase 4) — v12 only ═════════
   Spec: research-notes/…/35-template-gallery-spec.md (G1–G6). PM decisions 2026-10-20:
   - the gallery lives in the report-builder shell (Amplitude's «Dashboard Templates»), reached from the side list, Create ▸ Dashboard and
     the new-dashboard start screen;
   - Shahin's templates carry roles (phase plan 6.5): a role binds itself to the registry or pack event the project already sends
     (level 1); a role with no match shows a picker of the project's events and, when its registry event isn't sent, the track() call
     to add (level 2);
   - «ذخیره به‌عنوان داشبورد» stays disabled while any role is empty, as in Amplitude;
   - the copy is the user's own: charts are duplicated into a new dashboard in the chosen space (personal by default); later edits to
     the template don't reach it;
   - the experts section exists with an empty state until real authors are named; customer-made templates are batch b (below).
   Every chart is an ordinary builder chart, computed by RBAmp.tile (Decision 7), so the preview and the saved copy show the same number. */
(function(){
'use strict';
if(!window.RBShell || !RBShell.nb || !window.RBAmp || !window.RBTplCatalog) return;
var U=RBShell.ui, T=U.T, esc=U.esc, tip=U.tip, N=U.N, L=RBShell.lib;
/* Phosphor (regular) icons the shell's set doesn't carry, from design-system/assets/ph-icons.js */
var XI={"coins":"<path fill=\"currentColor\" d=\"M184 89.57V84c0-25.08-37.83-44-88-44S8 58.92 8 84v40c0 20.89 26.25 37.49 64 42.46V172c0 25.08 37.83 44 88 44s88-18.92 88-44v-40c0-20.7-25.42-37.32-64-42.43M232 132c0 13.22-30.79 28-72 28c-3.73 0-7.43-.13-11.08-.37C170.49 151.77 184 139 184 124v-18.26c29.87 4.45 48 16.53 48 26.26M72 150.25v-23.79A184 184 0 0 0 96 128a184 184 0 0 0 24-1.54v23.79A163 163 0 0 1 96 152a163 163 0 0 1-24-1.75m96-40.32V124c0 8.39-12.41 17.4-32 22.87V123.5c12.91-3.13 23.84-7.79 32-13.57M96 56c41.21 0 72 14.78 72 28s-30.79 28-72 28s-72-14.78-72-28s30.79-28 72-28m-72 68v-14.07c8.16 5.78 19.09 10.44 32 13.57v23.37C36.41 141.4 24 132.39 24 124m64 48v-4.17c2.63.1 5.29.17 8 .17c3.88 0 7.67-.13 11.39-.35a122 122 0 0 0 12.61 3.76v23.46c-19.59-5.47-32-14.48-32-22.87m48 26.25V174.4a179.5 179.5 0 0 0 24 1.6a184 184 0 0 0 24-1.54v23.79a165.5 165.5 0 0 1-48 0m64-3.38V171.5c12.91-3.13 23.84-7.79 32-13.57V172c0 8.39-12.41 17.4-32 22.87\"/>","storefront":"<path fill=\"currentColor\" d=\"M232 96a8 8 0 0 0-.3-2.2l-14.35-50.2A16.07 16.07 0 0 0 202 32H54a16.07 16.07 0 0 0-15.35 11.6L24.31 93.8A8 8 0 0 0 24 96v16a40 40 0 0 0 16 32v72a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8v-72a40 40 0 0 0 16-32zM54 48h148l11.42 40H42.61Zm50 56h48v8a24 24 0 0 1-48 0Zm-16 0v8a24 24 0 0 1-35.12 21.26a8 8 0 0 0-1.82-1.06A24 24 0 0 1 40 112v-8Zm112 104H56v-56.8a40.6 40.6 0 0 0 8 .8a40 40 0 0 0 32-16a40 40 0 0 0 64 0a40 40 0 0 0 32 16a40.6 40.6 0 0 0 8-.8Zm4.93-75.8a8 8 0 0 0-1.8 1.05A24 24 0 0 1 168 112v-8h48v8a24 24 0 0 1-11.07 20.2\"/>","newspaper":"<path fill=\"currentColor\" d=\"M88 112a8 8 0 0 1 8-8h80a8 8 0 0 1 0 16H96a8 8 0 0 1-8-8m8 40h80a8 8 0 0 0 0-16H96a8 8 0 0 0 0 16m136-88v120a24 24 0 0 1-24 24H32a24 24 0 0 1-24-23.89V88a8 8 0 0 1 16 0v96a8 8 0 0 0 16 0V64a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16m-16 0H56v120a23.8 23.8 0 0 1-1.37 8H208a8 8 0 0 0 8-8Z\"/>","gauge":"<path fill=\"currentColor\" d=\"M207.06 72.67A111.24 111.24 0 0 0 128 40h-.4C66.07 40.21 16 91 16 153.13V176a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16v-24a111.25 111.25 0 0 0-32.94-79.33M224 176H119.71l54.76-75.3a8 8 0 0 0-12.94-9.42L99.92 176H32v-22.87c0-3.08.15-6.12.43-9.13H56a8 8 0 0 0 0-16H35.27c10.32-38.86 44-68.24 84.73-71.66V80a8 8 0 0 0 16 0V56.33A96.14 96.14 0 0 1 221 128h-21a8 8 0 0 0 0 16h23.67c.21 2.65.33 5.31.33 8Z\"/>","compass":"<path fill=\"currentColor\" d=\"M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m44.42-143.16l-64 32a8.05 8.05 0 0 0-3.58 3.58l-32 64A8 8 0 0 0 80 184a8.1 8.1 0 0 0 3.58-.84l64-32a8.05 8.05 0 0 0 3.58-3.58l32-64a8 8 0 0 0-10.74-10.74M138 138l-40.11 20.11L118 118l40.15-20.07Z\"/>","pulse":"<path fill=\"currentColor\" d=\"M240 128a8 8 0 0 1-8 8h-27.06l-37.78 75.58A8 8 0 0 1 160 216h-.4a8 8 0 0 1-7.08-5.14L95.35 60.76l-32.07 70.55A8 8 0 0 1 56 136H24a8 8 0 0 1 0-16h26.85l37.87-83.31a8 8 0 0 1 14.76.46l57.51 151l31.85-63.71A8 8 0 0 1 200 120h32a8 8 0 0 1 8 8\"/>","rocket-launch":"<path fill=\"currentColor\" d=\"M223.85 47.12a16 16 0 0 0-15-15c-12.58-.75-44.73.4-71.41 27.07L132.69 64H74.36A15.9 15.9 0 0 0 63 68.68L28.7 103a16 16 0 0 0 9.07 27.16l38.47 5.37l44.21 44.21l5.37 38.49a15.94 15.94 0 0 0 10.78 12.92a16.1 16.1 0 0 0 5.1.83a15.9 15.9 0 0 0 11.3-4.68l34.32-34.3a15.9 15.9 0 0 0 4.68-11.36v-58.33l4.77-4.77c26.68-26.68 27.83-58.83 27.08-71.42M74.36 80h42.33l-39.53 39.52L40 114.34Zm74.41-9.45a76.65 76.65 0 0 1 59.11-22.47a76.46 76.46 0 0 1-22.42 59.16L128 164.68L91.32 128ZM176 181.64L141.67 216l-5.19-37.17L176 139.31Zm-74.16 9.5C97.34 201 82.29 224 40 224a8 8 0 0 1-8-8c0-42.29 23-57.34 32.86-61.85a8 8 0 0 1 6.64 14.56c-6.43 2.93-20.62 12.36-23.12 38.91c26.55-2.5 36-16.69 38.91-23.12a8 8 0 1 1 14.56 6.64Z\"/>","article":"<path fill=\"currentColor\" d=\"M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 160H40V56h176zM184 96a8 8 0 0 1-8 8H80a8 8 0 0 1 0-16h96a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H80a8 8 0 0 1 0-16h96a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H80a8 8 0 0 1 0-16h96a8 8 0 0 1 8 8\"/>","target":"<path fill=\"currentColor\" d=\"M221.87 83.16A104.1 104.1 0 1 1 195.67 49l22.67-22.68a8 8 0 0 1 11.32 11.32l-96 96a8 8 0 0 1-11.32-11.32l27.72-27.72a40 40 0 1 0 17.87 31.09a8 8 0 1 1 16-.9a56 56 0 1 1-22.38-41.65l22.75-22.75a87.88 87.88 0 1 0 23.13 29.67a8 8 0 0 1 14.44-6.9\"/>","student":"<path fill=\"currentColor\" d=\"m226.53 56.41l-96-32a8 8 0 0 0-5.06 0l-96 32A8 8 0 0 0 24 64v80a8 8 0 0 0 16 0V75.1l33.59 11.19a64 64 0 0 0 20.65 88.05c-18 7.06-33.56 19.83-44.94 37.29a8 8 0 1 0 13.4 8.74C77.77 197.25 101.57 184 128 184s50.23 13.25 65.3 36.37a8 8 0 0 0 13.4-8.74c-11.38-17.46-27-30.23-44.94-37.29a64 64 0 0 0 20.65-88l44.12-14.7a8 8 0 0 0 0-15.18ZM176 120a48 48 0 1 1-86.65-28.45l36.12 12a8 8 0 0 0 5.06 0l36.12-12A47.9 47.9 0 0 1 176 120m-48-32.43L57.3 64L128 40.43L198.7 64Z\"/>","link-break":"<path fill=\"currentColor\" d=\"M198.63 57.37a32 32 0 0 0-45.19-.06l-11.65 12.21a8 8 0 0 1-11.58-11l11.72-12.29a2 2 0 0 1 .13-.13a48 48 0 0 1 67.88 67.88a2 2 0 0 1-.13.13l-12.29 11.72a8 8 0 0 1-11-11.58l12.21-11.65a32 32 0 0 0-.1-45.23m-84.42 129.11l-11.65 12.21a32 32 0 0 1-45.25-45.25l12.21-11.65a8 8 0 0 0-11-11.58l-12.33 11.72a2 2 0 0 0-.13.13a48 48 0 0 0 67.88 67.88a2 2 0 0 0 .13-.13l11.72-12.29a8 8 0 1 0-11.58-11ZM216 152h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16M40 104h24a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16m120 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8M96 72a8 8 0 0 0 8-8V40a8 8 0 0 0-16 0v24a8 8 0 0 0 8 8\"/>","layout":"<path fill=\"currentColor\" d=\"M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 16v40H40V56ZM40 112h56v88H40Zm176 88H112v-88h104z\"/>"};
function ic(k){ return XI[k]?'<svg viewBox="0 0 256 256" aria-hidden="true">'+XI[k]+'</svg>':U.ic(k); }
function $(id){ return document.getElementById(id); }
/* PM 2026-10-28, TD-2: a dashboard made from a template saves its charts, so only the project owner or an admin saves one; members and
   viewers still open a template and see it computed on this project's data. One gate and one reason, from rb-shell.js. */
function canSave(){ return !RBShell.canSaveChart || RBShell.canSaveChart(); }
function noSave(){ return RBShell.noSaveWhy ? RBShell.noSaveWhy() : ['ذخیره نمودار فعلا فقط برای مالک و ادمین پروژه است','Saving charts is for the project owner and admins for now']; }
function noSaveNote(){ var w=noSave(); return '<div class="rbx-callout tg-nosave">'+ic('lock-simple')+'<span>'+esc(T(w[0],w[1]))+'</span></div>'; }

/* the catalog (templates, card helpers, GRP, REG) lives in rb-tpl-catalog.js, shared with events-start v8 (PM 2026-11-03) */
var CAT=window.RBTplCatalog, TR=CAT.TR, FU=CAT.FU, RT=CAT.RT, TPL=CAT.TPL, GRP=CAT.GRP, REG=CAT.REG;

/* ── state ── */
var G={ sec:'all', q:'', cur:null, bind:{}, auto:{}, recent:[], scroll:0 };
function tpl(id){ return TPL.filter(function(t){ return t.id===id; })[0]; }
function ev(id){ return RB.evById(id); }
function sent(id){ var e=ev(id); return !!(e && e.w>0); }
function evName(id){ var e=ev(id); return e?T(e.fa,e.en):id; }
function sentList(){ return RB.EVENTS.filter(function(e){ return e.w>0 && !e.deleted && e.id!=='video_heartbeat'; }); }
/* level 1: each role takes the first registry or pack event the project sends; recomputed per project, kept once the user picks */
/* PM 2026-10-25, TG-10: a manual pick persists for this user, in this project and this template (localStorage); it never changes what
   colleagues see. A stored pick of an event the project no longer sends is ignored and the automatic binding stands. */
function picks(){ return CAT.picks(RB.PROJECT||0); }   /* read live: the project may change without a reload */
function savePick(t, rid, evId){ CAT.savePick(RB.PROJECT||0, t.id, rid, evId); }
function bindings(t){
  var k=RB.PROJECT+':'+t.id, b=G.bind[k];
  if(!b){ var x=CAT.bind(t, sent, sentList().map(function(e){ return e.id; }), picks()[t.id]); b=G.bind[k]=x.b; G.auto[k]=x.auto; }
  return b; }
function isAuto(t, rid){ var a=G.auto[RB.PROJECT+':'+t.id]; return !!(a&&a[rid]); }
function unbound(t){ var b=bindings(t); return t.roles.filter(function(r){ return !b[r.id]; }); }
var fill=CAT.fill, uses=CAT.uses, charts=CAT.charts;
var typeLbl=CAT.typeLbl;

/* ── gallery tiles: a small drawing from the template's own chart types (Amplitude's cards are illustrations, not live data) ── */
function thumb(t){
  var ty=charts(t).map(function(c){ return c.type; }), h='<svg viewBox="0 0 160 72" aria-hidden="true" preserveAspectRatio="xMidYMid meet">';
  ty.slice(0,3).forEach(function(k, i){ var x=4+i*52;
    h+='<rect x="'+x+'" y="4" width="48" height="64" rx="6" class="tg-pane"/>';
    if(k==='funnel') [40,30,20,12].forEach(function(v,j){ h+='<rect x="'+(x+6+j*10)+'" y="'+(62-v)+'" width="7" height="'+v+'" rx="1.5" class="tg-c'+(j===0?1:2)+'"/>'; });
    else if(k==='retention') for(var r=0;r<4;r++) for(var c=0;c<4-r;c++) h+='<rect x="'+(x+6+c*9.5)+'" y="'+(16+r*11)+'" width="8" height="9" rx="1.5" class="tg-c1" opacity="'+(0.9-c*0.2)+'"/>';
    else if(k==='stick') [12,22,30,36].forEach(function(v,j){ h+='<rect x="'+(x+6+j*10)+'" y="'+(62-v)+'" width="7" height="'+v+'" rx="1.5" class="tg-c2"/>'; });
    else h+='<polyline points="'+[0,1,2,3,4].map(function(j){ return (x+6+j*9)+','+(54-[6,18,12,28,22][(j+i)%5]); }).join(' ')+'" class="tg-line"/>';
  });
  return h+'</svg>'; }
/* PM 2026-10-25, TG-15: usage is counted per project and template; «آخرین استفاده» is the last save by anyone in this project */
function usage(t){ return CAT.used(RB.PROJECT||0, t.id); }
function lastUsed(t){ var u=usage(t); return u.last==null?T('هنوز استفاده نشده','Not used yet'):T('آخرین استفاده: ','Last used ')+L.ago(u.last); }
function card(t){
  var n=charts(t).length;
  return '<button class="tg-card" data-tpl="'+t.id+'" type="button"><span class="tg-thumb">'+thumb(t)+'</span>'+
    '<span class="tg-cbody"><span class="tg-ctitle">'+ic(t.icon)+'<b>'+esc(T(t.fa,t.en))+'</b></span>'+
    '<span class="tg-cdesc">'+esc(T(t.dFa,t.dEn))+'</span>'+
    '<span class="tg-cmeta"><span class="rbx-badge">'+T(GRP[t.grp][0],GRP[t.grp][1])+'</span><span>'+N(n)+' '+T('نمودار',n===1?'chart':'charts')+'</span>'+
      (t.roles.length?'<span>'+N(t.roles.length)+' '+T('نقش',t.roles.length===1?'role':'roles')+'</span>':'<span>'+T('بدون تنظیم','No setup')+'</span>')+
      (t.grp!=='expert'?'<span>'+N(usage(t).n)+' '+T('بار استفاده',usage(t).n===1?'use':'uses')+'</span>':'')+'</span>'+
    '<span class="tg-cfoot"><span>'+(t.author?esc(T(t.author[0],t.author[1]))+(t.sample?' <span class="rbx-badge tg-sample"'+tip("<span class='tip-title'>نمونه</span>این قالب نمونه است تا ببینید بخش متخصصان چه چیزی ارائه می‌دهد؛ نویسنده‌های واقعی بعداً جایش را می‌گیرند.","<span class='tip-title'>Sample</span>This template is a sample that shows what the Experts section offers; real authors will replace it later.")+'>'+T('نمونه','Sample')+'</span>':''):T('ساختهٔ شاهین','By Shahin'))+'</span><span>'+lastUsed(t)+'</span></span></span></button>'; }
var SECS=[['all','همهٔ قالب‌ها','All templates','squares-four'],['recent','اخیرا دیده‌شده','Recently viewed','clock-counter-clockwise'],
  {head:['ساختهٔ شاهین','Made by Shahin']},['usecase','کاربرد','Use case','target'],['industry','نوع کسب‌وکار','Business type','storefront'],
  {head:['جامعه','Community']},['expert','متخصصان','Experts','student'],
  {head:['قالب‌های سفارشی','Custom templates']},['project','این پروژه','This project','folder-simple'],['mine','ساخته شما','Made by you','user-circle']];
function mineTpls(){ return orgTpls().filter(function(b){ return b.tpl.by==='me'||b.owner==='me'; }); }
function projTpls(){ return orgTpls().filter(function(b){ return b.tpl.pub; }); }
function orgHit(b, q){ return (b.fa+' '+b.en+' '+(b.tpl.instr||'')).toLowerCase().indexOf(q)>-1; }
function secCount(k){ return k==='project'?projTpls().length:k==='mine'?mineTpls().length:k==='all'?TPL.length+projTpls().length:k==='recent'?G.recent.length:k==='usecase'||k==='industry'||k==='expert'?TPL.filter(function(t){ return t.grp===k; }).length:0; }
function empty(icon, tf, te, hf, he){ return '<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic(icon)+'</div><div class="sh-state-title">'+T(tf,te)+'</div><div class="sh-state-hint">'+T(hf,he)+'</div></div></div>'; }
function galleryView(){
  var h='<div class="rbx-head"><span class="rbx-title">'+T('گالری قالب‌ها','Template gallery')+'</span><span class="rbx-tipdot"'+
    tip("<span class='tip-title'>گالری قالب‌ها</span>تمپلیت‌هایی که شاهین آماده کرده و با ایونت‌های همین پروژه پر می‌شوند. با «ذخیره به‌عنوان داشبورد» یک کپی مستقل می‌سازید که مال خودتان است.","<span class='tip-title'>Template gallery</span>Templates Shahin has prepared, filled with this project’s own events. «Save as dashboard» makes an independent copy that is yours.")+'></span>'+
    '<span class="rbx-spacer"></span><span class="rbx-sub">'+/* PM 2026-10-28, TG-14 */T('قالب‌ها در همین پروژه‌اند؛ برای استفاده در پروژه دیگر، «کپی به پروژه دیگر» را بزنید','Templates stay in this project; to use one elsewhere, choose “Copy to another project”')+'</span></div>';
  h+='<div class="tg-wrap"><nav class="tg-nav" aria-label="'+T('دسته‌های قالب','Template categories')+'"><label class="rbx-search">'+ic('magnifying-glass')+'<input id="tgQ" type="search" placeholder="'+T('جستجوی قالب…','Search templates…')+'" value="'+esc(G.q)+'"/></label>';
  SECS.forEach(function(s){ if(s.head){ h+='<span class="tg-navh">'+T(s.head[0],s.head[1])+'</span>'; return; }
    var c=secCount(s[0]); h+='<button class="rbx-item'+(G.sec===s[0]?' on':'')+'" data-tgsec="'+s[0]+'" type="button"'+(G.sec===s[0]?' aria-current="page"':'')+'>'+ic(s[3])+'<span class="nm">'+T(s[1],s[2])+'</span>'+'<span class="ct">'+N(c)+'</span>'+'</button>'; });
  h+='</nav><div class="tg-main">';
  var list=G.sec==='recent'?G.recent.map(tpl).filter(Boolean):TPL.filter(function(t){ return G.sec==='all'||t.grp===G.sec; });
  if(G.q){ var q=G.q.toLowerCase(); list=(G.sec==='expert'||G.sec==='project'||G.sec==='mine'?TPL:list).filter(function(t){ return (t.fa+' '+t.en+' '+t.dFa+' '+t.dEn).toLowerCase().indexOf(q)>-1; }); }
  var org=G.sec==='project'?projTpls():G.sec==='mine'?mineTpls():G.sec==='all'?projTpls():[];
  if(G.q) org=(G.sec==='expert'||G.sec==='usecase'||G.sec==='industry'||G.sec==='recent'?[]:org).filter(function(b){ return orgHit(b, G.q.toLowerCase()); });
  if((G.sec==='project'||G.sec==='mine') && org.length) h+='<div class="tg-grid">'+org.map(orgCard).join('')+'</div>';
  else if(G.sec==='expert' && !G.q && !list.length) h+=empty('student','قالب‌های متخصصان به‌زودی این‌جا می‌آیند','Expert templates arrive here soon','داشبوردهایی که متخصصان تحلیل داده برای سایت‌هایی مثل سایت شما ساخته‌اند.','Dashboards that analytics experts build for sites like yours.');
  else if(G.sec==='project'||G.sec==='mine') h+=G.q?empty('magnifying-glass','قالبی پیدا نشد','No templates found','عبارت دیگری جستجو کنید یا دستهٔ دیگری را ببینید.','Try another search or another category.'):empty(G.sec==='mine'?'user-circle':'folder-simple', G.sec==='mine'?'هنوز قالبی نساخته‌اید':'هنوز قالبی در این پروژه ساخته نشده', G.sec==='mine'?'You haven’t made a template yet':'No templates in this project yet',
    /* PM 2026-10-28, TG-3: only the project owner or an admin turns dashboards into templates, so others get a hint that says who does */
    canPublish()?'هر داشبورد را با «تبدیل به قالب…» در منوی ⋯ آن به قالب تبدیل کنید تا تیم با یک کلیک از آن داشبورد تازه بسازد.':'مالک یا ادمین پروژه داشبوردها را به قالب تبدیل می‌کند؛ قالب‌هایی که می‌سازند این‌جا می‌آیند.',
    canPublish()?'Turn any dashboard into a template with «Turn into a template…» in its ⋯ menu, so your team can build a new dashboard from it in one click.':'The project owner or an admin turns dashboards into templates; the templates they make show up here.');
  else if(!list.length && !org.length) h+=G.q?empty('magnifying-glass','قالبی پیدا نشد','No templates found','عبارت دیگری جستجو کنید یا دستهٔ دیگری را ببینید.','Try another search or another category.'):
    empty('clock-counter-clockwise','هنوز قالبی را باز نکرده‌اید','You haven’t opened a template yet','قالب‌هایی که باز می‌کنید این‌جا می‌مانند تا دوباره پیدایشان کنید.','Templates you open stay here so you can find them again.');
  else {
    if(!list.length && org.length){ h+='<div class="tg-grid">'+org.map(orgCard).join('')+'</div>'; org=[]; }
    var sub=G.sec==='all'&&!G.q?['usecase','industry','expert']:[null];
    sub.forEach(function(g){ var part=g?list.filter(function(t){ return t.grp===g; }):list; if(!part.length) return;
      if(g) h+='<div class="rb-hubhead"><span class="rb-hubtitle">'+T(GRP[g][0],GRP[g][1])+'</span></div>';
      h+='<div class="tg-grid">'+part.map(card).join('')+'</div>'; });
    if(G.sec==='all' && org.length) h+='<div class="rb-hubhead"><span class="rb-hubtitle">'+T('قالب‌های این پروژه','This project’s templates')+'</span></div><div class="tg-grid">'+org.map(orgCard).join('')+'</div>';
  }
  return h+'</div></div>'; }

/* ── one template: role cards on the side, the live dashboard on the canvas (Amplitude's starter-template page) ── */
function tileHtml(t, c, b){
  var span=c.k==='text'?12:6, h='<div class="rbx-tile tg-tile" style="grid-column:span '+span+'">';
  if(c.k==='text') return h+'<div class="rbx-tile-h"><span class="rbx-tile-d" style="flex:1">'+ic('text-t')+T('متن','Text')+'</span></div><div class="rbx-textcard">'+T(c.fa,c.en)+'</div></div>';
  var miss=t.roles.filter(function(r){ return uses(c, r.id) && !b[r.id]; });
  /* PM 2026-10-25, TG-9: a project with no data shows the no-data line on every chart card, never a zero (checked before the role wait) */
  var nod=noData();
  h+='<div class="rbx-tile-h"><span class="rbx-tile-t">'+esc(T(c.fa,c.en))+'</span></div><div class="rbx-tile-d"><span class="rb-typechip '+c.type+'">'+T(typeLbl(c.type)[0],typeLbl(c.type)[1])+'</span><span>'+rangeLbl(c.range)+'</span></div>';
  if(nod) return h+'<div class="rbx-tile-sub">'+T('این نمودار برای این بازه داده‌ای ندارد.','This chart has no data for this range.')+'</div></div>';
  if(miss.length) return h+'<div class="tg-wait">'+ic('link-break')+'<span>'+T('منتظر ایونت برای نقش ','Waiting for an event for ')+miss.map(function(r){ return '«'+esc(T(r.fa,r.en))+'»'; }).join(T('، ',', '))+'</span></div></div>';
  var d=null; try{ d=RBAmp.tile({ amp:fill(c.amp, b), range:c.range, filters:[] }, { range:c.range, filters:[] }, c.type); }catch(e){ d=null; }
  if(!d) return h+'<div class="rbx-tile-sub">'+T('این نمودار برای این بازه داده‌ای ندارد.','This chart has no data for this range.')+'</div></div>';
  return h+'<div class="rbx-tile-v">'+d.val+'</div><div class="rbx-tile-sub">'+d.sub+'</div>'+(d.viz?'<div class="rbx-tile-viz">'+d.viz+'</div>':'')+'</div>'; }
function rangeLbl(r){ return { today:T('امروز','Today'), '7d':T('۷ روز اخیر','Last 7 days'), '30d':T('۳۰ روز اخیر','Last 30 days'), '3m':T('۳ ماه اخیر','Last 3 months') }[r]||r; }
function noData(){ return !RB.EVENTS.some(function(e){ return e.w>0; }); }
function track(id){ return CAT.track(id, ev(id)); }
function roleCard(t, r, b){
  var id=b[r.id], auto=isAuto(t, r.id), n=charts(t).filter(function(c){ return uses(c, r.id); }).length;
  var h='<div class="tg-role'+(id?'':' empty')+'" data-role="'+r.id+'"><div class="tg-rhead"><b>'+esc(T(r.fa,r.en))+'</b><span class="tg-rn">'+N(n)+' '+T('نمودار',n===1?'chart':'charts')+'</span></div>'+
    '<div class="tg-rdef">'+esc(T(r.dFa,r.dEn))+'</div>';
  if(id){ h+='<div class="tg-rbind"><button class="tg-ev" data-pick="'+r.id+'" type="button">'+ic('lightning')+'<span>'+esc(evName(id))+'</span><span class="rbx-caret">⌄</span></button>'+
      '<button class="rbx-icbtn" data-clear="'+r.id+'" type="button" aria-label="'+T('برداشتن ایونت','Remove event')+'" title="'+T('برداشتن ایونت','Remove event')+'">×</button></div>'+
      /* PM 2026-10-25, TG-11: the same event may serve two roles; the card names the other role, nothing is blocked */
      (function(){ var oth=t.roles.filter(function(o){ return o.id!==r.id && b[o.id]===id; }); if(!oth.length) return '';
        var nm=oth.map(function(o){ return T('«'+esc(o.fa)+'»','“'+esc(o.en)+'”'); }).join(T('، ',', '));
        return '<div class="rbx-callout warn tg-dup" data-tgdup="'+r.id+'">'+ic('warning')+'<span>'+T('این ایونت به نقش '+nm+' هم وصل است. نمودارها مثل قبل حساب می‌شوند، ولی قیفی که دو قدمش یک ایونت باشد معمولا معنای زیادی ندارد.','This event is also bound to '+nm+'. The charts compute as usual, but a funnel whose two steps are the same event rarely means much.')+'</span></div>'; })()+
      (auto?'<span class="tg-auto"'+tip("<span class='tip-title'>اتصال خودکار</span>این پروژه ایونت استاندارد همین نقش را می‌فرستد، پس شاهین خودش آن را وصل کرد. با کلیک روی ایونت عوضش کنید.","<span class='tip-title'>Bound automatically</span>This project sends the role’s standard event, so Shahin bound it for you. Click the event to change it.")+'>'+ic('check-circle')+T('خودکار وصل شد','Bound automatically')+'</span>':'');
  } else {
    var reg=r.prefer[0];
    h+='<button class="sh-btn ghost compact tg-add" data-pick="'+r.id+'" type="button">'+ic('plus')+' '+T('انتخاب ایونت','Pick an event')+'</button>';
    if(!sent(reg) && (ev(reg)||REG[reg])) h+='<div class="tg-track"><span>'+T('این پروژه ایونت استاندارد این نقش را نمی‌فرستد. دولوپر شما با این خط اضافه‌اش می‌کند:','This project doesn’t send the role’s standard event. Your developer adds it with:')+'</span><pre dir="ltr">'+esc(track(reg))+'</pre>'+
      '<button class="rb-linkbtn" data-copytrack="'+reg+'" type="button">'+ic('copy')+T('کپی کد','Copy code')+'</button></div>';
  }
  return h+'</div>'; }
function templateView(){
  var t=tpl(G.cur); if(!t){ G.cur=null; return galleryView(); }
  var b=bindings(t), miss=unbound(t), sv=canSave(), can=!miss.length&&sv;   /* PM 2026-10-28, TD-2 */
  var h='<button class="rbx-crumb" data-tgback="1" type="button">'+ic(U.L()==='fa'?'arrow-right':'arrow-left')+T('بازگشت به گالری قالب‌ها','Back to the template gallery')+'</button>';
  h+='<div class="rbx-head"><span class="rbx-title">'+esc(T(t.fa,t.en))+'</span><span class="rbx-badge tg-badge">'+ic('layout')+(t.author?T('قالب متخصص','Expert template'):T('قالب شاهین','Shahin template'))+'</span>'+(t.author?'<span class="rbx-sub">'+esc(T(t.author[0],t.author[1]))+(t.sample?' · '+T('نمونه','Sample'):'')+'</span>':'')+
    '<span class="rbx-spacer"></span><button class="sh-btn ghost compact" id="tgLink" type="button">'+ic('link')+' '+T('کپی لینک','Copy link')+'</button><button class="sh-btn primary compact" id="tgSave" type="button"'+(can?'':' disabled aria-disabled="true"')+(sv?'':' title="'+esc(T(noSave()[0],noSave()[1]))+'"')+'>'+ic('floppy-disk')+' '+T('ذخیره به‌عنوان داشبورد','Save as dashboard')+'</button></div>';
  h+='<div class="rbx-sub">'+esc(T(t.dFa,t.dEn))+'</div>';
  /* PM 2026-10-25, TG-6: a fixed-page card the engine can't express is named here with its reason, not rebuilt by hand */
  if(t.miss&&t.miss.length) h+='<div class="rbx-callout tg-miss">'+ic('info')+'<span><b>'+T('کارت‌هایی از داشبورد ثابت شاهین که در این قالب نیستند:','Cards of Shahin’s fixed dashboard that this template doesn’t carry:')+'</b>'+
    t.miss.map(function(m){ return '<br><b>'+esc(T(m[0],m[1]))+'</b>: '+esc(T(m[2],m[3])); }).join('')+'</span></div>';
  /* PM 2026-10-25, TG-9: no data yet — saving stays allowed; the banner leads to the setup checklist and the saved copy fills itself */
  if(noData()) h+='<div class="rbx-callout warn tg-nodata" data-tgnodata="1">'+ic('info')+'<span>'+T('این پروژه هنوز داده‌ای ندارد؛ نمودارها با رسیدن اولین داده خودشان پر می‌شوند. ','This project has no data yet; the charts fill in on their own once the first data arrives. ')+
    '<a class="rb-linkbtn" href="../events-start/">'+T('چک‌لیست راه‌اندازی','Setup checklist')+'</a></span></div>';
  if(!sv) h+=noSaveNote();   /* PM 2026-10-28, TD-2: the reason is visible, not only on the disabled button */
  if(miss.length) h+='<div class="rbx-callout warn tg-blocked">'+ic('warning')+'<span>'+T('برای ذخیره، به هر نقش یک ایونت بدهید. ','Give every role an event to save. ')+T('نقش‌های خالی: ','Empty roles: ')+miss.map(function(r){ return '«'+esc(T(r.fa,r.en))+'»'; }).join(T('، ',', '))+'</span></div>';
  h+='<div class="tg-split">';
  if(t.roles.length){ h+='<aside class="tg-roles" aria-label="'+T('نقش‌ها','Roles')+'"><div class="tg-rolesh"><b>'+T('ایونت‌های قالب','Template events')+'</b><span class="rbx-tipdot"'+
      tip("<span class='tip-title'>نقش‌ها</span>هر نقش جای یک ایونت است. اگر این پروژه ایونت استاندارد نقش را بفرستد خودکار وصل می‌شود؛ وگرنه از ایونت‌های همین پروژه یکی را انتخاب کنید. نمودارها همان لحظه دوباره حساب می‌شوند.","<span class='tip-title'>Roles</span>Each role stands for one event. If this project sends the role’s standard event it binds automatically; otherwise pick one of the project’s events. The charts recompute right away.")+'></span></div>'+
      t.roles.map(function(r){ return roleCard(t, r, b); }).join('')+'</aside>'; }
  else h+='<aside class="tg-roles"><div class="tg-rolesh"><b>'+T('ایونت‌های قالب','Template events')+'</b></div><div class="tg-rdef">'+T('این قالب فقط ایونت‌هایی را می‌خواهد که کد شاهین خودش جمع می‌کند؛ تنظیمی لازم ندارد.','This template only needs events the Shahin snippet collects on its own; there is nothing to set.')+'</div></aside>';
  var rows=[], row=[], span=0;
  t.cards.forEach(function(c){ var w=c.k==='text'?12:6; if(span+w>12){ rows.push(row); row=[]; span=0; } row.push(c); span+=w; });
  if(row.length) rows.push(row);
  h+='<div class="tg-canvas"><div class="rbx-rows">'+rows.map(function(r){ return '<div class="rbx-brow">'+r.map(function(c){ return tileHtml(t, c, b); }).join('')+'</div>'; }).join('')+'</div></div></div>';
  return h; }

/* ── picking an event: suggestions (the role's own registry events the project sends), then every event the project sends ── */
function picker(t, r){
  var b=bindings(t), Q='';
  function list(){
    var sug=r.prefer.filter(sent), rest=sentList().filter(function(e){ return sug.indexOf(e.id)<0; }), q=Q.toLowerCase();
    function hit(e){ return !q || (e.fa+' '+e.en+' '+e.id).toLowerCase().indexOf(q)>-1; }
    function row(e, s){ return '<button class="rbx-pickrow tg-pickrow'+(b[r.id]===e.id?' on':'')+'" data-ev="'+e.id+'" type="button">'+ic(s?'star':'lightning')+'<span class="grow">'+esc(T(e.fa,e.en))+'</span><span class="tg-evid" dir="ltr">'+esc(e.id)+'</span></button>'; }
    var h='', S1=sug.map(ev).filter(hit), S2=rest.filter(hit);
    if(S1.length) h+='<div class="tg-pickh">'+T('پیشنهاد برای این نقش','Suggested for this role')+'</div>'+S1.map(function(e){ return row(e, true); }).join('');
    if(S2.length) h+='<div class="tg-pickh">'+T('همهٔ ایونت‌های این پروژه','All of this project’s events')+'</div>'+S2.map(function(e){ return row(e, false); }).join('');
    return h||'<div class="sh-state rbz-empty sm"><div class="sh-state-title">'+T('ایونتی پیدا نشد','No events found')+'</div><div class="sh-state-hint">'+T('این پروژه هنوز ایونتی با این نام نفرستاده.','This project hasn’t sent an event by that name yet.')+'</div></div>'; }
  var md=U.modal({ fa:'ایونت نقش «'+r.fa+'»', en:'Event for “'+r.en+'”', subFa:r.dFa, subEn:r.dEn,
    body:'<input class="sh-input" id="tgPickQ" type="search" placeholder="'+T('جستجوی ایونت…','Search events…')+'"/><div class="rbx-pick tg-picklist" id="tgPickL">'+list()+'</div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true }],
    init:function(body, close){
      function wireL(){ body.querySelectorAll('[data-ev]').forEach(function(x){ x.addEventListener('click', function(){ b[r.id]=x.getAttribute('data-ev'); G.auto[RB.PROJECT+':'+t.id][r.id]=false; savePick(t, r.id, b[r.id]); close(); RBShell.rerender(); }); }); }
      body.querySelector('#tgPickQ').addEventListener('input', function(e){ Q=e.target.value; body.querySelector('#tgPickL').innerHTML=list(); wireL(); });
      wireL(); } });
  return md; }

/* ── «ذخیره به‌عنوان داشبورد»: name, location (personal space by default), then an independent copy ── */
function saveModal(t){
  if(!canSave()){ U.toast(noSave()[0], noSave()[1]); return; }   /* PM 2026-10-28, TD-2 */
  var b=bindings(t), sps=L.mySpaces().filter(function(sp){ return L.canAdd(sp); });
  var opts=sps.map(function(sp){ return '<option value="'+sp.id+'"'+(sp.personal?' selected':'')+'>'+esc(T(sp.fa,sp.en))+'</option>'; }).join('');
  U.modal({ fa:'ساختن داشبورد تازه', en:'Create new dashboard', subFa:'داشبوردی که از قالب ساخته می‌شود نمودارها را هم کپی می‌کند تا مال شما باشند و ویرایششان کنید. تغییرهای بعدی قالب به این کپی نمی‌رسد.', subEn:'A dashboard made from a template duplicates its charts so you own and can edit them. Later changes to the template don’t reach this copy.',
    body:'<label class="rbx-field"><span>'+T('نام','Name')+'</span><input class="sh-input" id="tgName" value="'+esc(T(t.fa+' (کپی)', t.en+' (copy)'))+'"/></label>'+
      '<label class="rbx-field"><span>'+T('محل ذخیره','Location')+'</span><select class="sh-input" id="tgSpace">'+opts+'</select><span class="rbx-note" id="tgSpNote">'+T('فقط شما به این فضا دسترسی دارید.','Only you have access to this space.')+'</span></label>'+
      '<div class="rbx-pick">'+charts(t).map(function(c){ return '<div class="rbx-pickrow">'+ic('chart-line')+'<span class="grow">'+esc(T(c.fa,c.en))+'</span><span class="rb-typechip '+c.type+'">'+T(typeLbl(c.type)[0],typeLbl(c.type)[1])+'</span></div>'; }).join('')+'</div>',
    init:function(body){ var sel=body.querySelector('#tgSpace'), nt=body.querySelector('#tgSpNote');
      sel.addEventListener('change', function(){ var sp=L.space(sel.value); nt.textContent=sp.personal?T('فقط شما به این فضا دسترسی دارید.','Only you have access to this space.'):T('اعضای این فضا داشبورد را می‌بینند.','Members of this space will see the dashboard.'); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(body){
      var name=body.querySelector('#tgName').value.trim(); if(!name){ body.querySelector('#tgName').focus(); return false; }
      var sp=body.querySelector('#tgSpace').value;
      var id=createFrom(t, name, sp); if(!id) return;   /* PM 2026-10-28, TD-2 */
      U.toast('داشبورد «'+name+'» ساخته شد؛ نمودارهایش مال شماست', 'Dashboard “'+name+'” created; its charts are yours');
      RBShell.openBoard(id); } }] }); }

/* PM 2026-11-01: one path that copies a template into a new dashboard — the builder's own save modal and the ready-dashboards
   page (events-start v7, ?tplsave=) both use it, so a dashboard saved there is really listed in its space here. */
function createFrom(t, name, sp, desc, counted){
  var b=bindings(t);
  var rows=t.cards.map(function(c){ return c.k==='text'?{ k:'text', fa:c.fa, en:c.en }:{ k:'rep', fa:c.fa, en:c.en, type:c.type, amp:fill(c.amp, b), range:c.range }; });
  var id=RBShell.tpl.apply({ user:true, fa:name, en:name, descFa:desc||t.dFa, descEn:desc||t.dEn, space:sp, from:t.id, cards:rows }); if(!id) return null;
  if(!counted) CAT.bump(RB.PROJECT||0, t.id);
  return id; }
/* PM 2026-11-03: the ready-made dashboards page (events-start v8) is the single template gallery; every entry point here leads there.
   The builder keeps creating the dashboard (?tplsave=) and keeps each customer template's own page (a template is a dashboard).
   PM 2026-11-11: entry points open the gallery's latest version (v10), which lists the platform templates (store_woo, store_portal).
   PM 2026-11-14: the gallery is renamed «گالری تمپلیت‌ها» in v11, so entry points open v11. */
function galleryHref(id){ return '../events-start/v13.html?project='+(RB.PROJECT||0)+'&prole='+PROLE+(id?'&tpl='+encodeURIComponent(id):'&sec=all'); }
function open(id){ location.href=galleryHref(id); }
function wire(root){
  var q=$('tgQ'); if(q) q.addEventListener('input', function(){ var p=q.selectionStart; G.q=q.value; RBShell.rerender(); var q2=$('tgQ'); if(q2){ q2.focus(); try{ q2.setSelectionRange(p,p); }catch(e){} } });
  root.querySelectorAll('[data-tgsec]').forEach(function(x){ x.addEventListener('click', function(){ G.sec=x.getAttribute('data-tgsec'); G.q=''; RBShell.rerender(); }); });
  root.querySelectorAll('[data-tpl]').forEach(function(x){ x.addEventListener('click', function(){ open(x.getAttribute('data-tpl')); }); });
  root.querySelectorAll('[data-tgback]').forEach(function(x){ x.addEventListener('click', function(){ G.cur=null; RBShell.go('gallery'); }); });
  root.querySelectorAll('[data-org]').forEach(function(x){ var go=function(e){ if(e.target.closest('[data-omenu]')) return; RBShell.openBoard(x.getAttribute('data-org')); };
    x.addEventListener('click', go); x.addEventListener('keydown', function(e){ if(e.key==='Enter') go(e); }); });
  root.querySelectorAll('[data-omenu]').forEach(function(x){ x.addEventListener('click', function(e){ e.stopPropagation(); var b=NB.board(x.getAttribute('data-omenu')); if(b) orgMenu(x, b); }); });
  var t=tpl(G.cur); if(!t) return;
  var lk=$('tgLink'); if(lk) lk.addEventListener('click', function(){ copyLink('tpl='+t.id); });
  root.querySelectorAll('[data-pick]').forEach(function(x){ x.addEventListener('click', function(){ var r=t.roles.filter(function(y){ return y.id===x.getAttribute('data-pick'); })[0]; if(r) picker(t, r); }); });
  root.querySelectorAll('[data-clear]').forEach(function(x){ x.addEventListener('click', function(){ var rid=x.getAttribute('data-clear'); bindings(t)[rid]=''; G.auto[RB.PROJECT+':'+t.id][rid]=false; savePick(t, rid, ''); RBShell.rerender(); }); });
  root.querySelectorAll('[data-copytrack]').forEach(function(x){ x.addEventListener('click', function(){ var s=track(x.getAttribute('data-copytrack'));
    try{ navigator.clipboard.writeText(s); }catch(e){} U.toast('کد کپی شد','Code copied'); }); });
  var sv=$('tgSave'); if(sv) sv.addEventListener('click', function(){ if(unbound(t).length||!canSave()) return; saveModal(t); });   /* PM 2026-10-28, TD-2 */
}
/* ═════ batch b: customer-made templates (spec G7–G9, G11) ═════
   - «تبدیل به قالب…» from the dashboard's ⋯ menu (Amplitude «Tag as Template»): PM 2026-10-28, TG-3: only the project owner or an admin
     turns a dashboard into a template and publishes it to the project's gallery; everyone else sees the item disabled, with the reason;
   - PM 2026-10-28, TG-14: «کپی به پروژه دیگر» copies a customer template into another project the user is a member of; its events
     re-bind there (an event that project sends binds itself, one it doesn't is picked before saving);
   - the template dashboard shows the author's instructions and replacement rows: events, a property value (⚠ until chosen) and text;
     the rows are a temporary view over the original charts, «بازگشت به پیش‌فرض» clears them;
   - «ذخیره به‌عنوان داشبورد تازه» copies the dashboard with the replacements into a space you pick; blocked while a property has no value;
   - the gallery's «این پروژه» lists published templates and «ساخته شما» your own; owners and admins edit, unpublish or remove them. */
var QS=new URLSearchParams(location.search);
/* PM 2026-10-25, TG-4: Shahin's own project roles — owner / admin / member / viewer, default admin; there is no separate
   "manager" (what it could do, admin does). Only the project owner or an admin publishes to the gallery. */
var PROLE=['owner','admin','member','viewer'].indexOf(QS.get('prole'))>-1?QS.get('prole'):'admin', VIEWER=QS.get('role')==='viewer'||PROLE==='viewer';
function canPublish(){ return !VIEWER && (PROLE==='owner'||PROLE==='admin'); }
var NB=RBShell.nb, APPLY={}, SEEDED={};
var PARAM_PROPS=['utm_campaign','utm_source','utm_medium','referrer_type','device_type','country','page_path','breadcrumb_1_name','is_new_user'];
function boards(){ return (RBShell.tpl.boards&&RBShell.tpl.boards())||[]; }
function orgTpls(){ return boards().filter(function(b){ return b.tpl && !b.tpl.removed && !b.archived; }); }
function reps(b){ var out=[]; (b.rows||[]).forEach(function(r){ r.forEach(function(c){ if(c.k==='rep'&&RB.SAVED[c.r]) out.push(c.r); }); }); return out; }
function evsIn(o, acc){ acc=acc||{}; if(typeof o==='string'){ if(RB.evById(o)) acc[o]=1; } else if(Array.isArray(o)) o.forEach(function(x){ evsIn(x, acc); }); else if(o&&typeof o==='object') Object.keys(o).forEach(function(k){ if(k!=='groupBy'&&k!=='prop'&&k!=='gb') evsIn(o[k], acc); }); return acc; }
function boardEvents(b){ var acc={}; reps(b).forEach(function(i){ evsIn(RB.SAVED[i].q, acc); }); return Object.keys(acc); }
function ap(b){ return APPLY[b.id]||(APPLY[b.id]={ ev:{}, prop:{}, text:{} }); }
function swapEv(o, m){ if(typeof o==='string') return m.hasOwnProperty(o)&&m[o]?m[o]:o; if(Array.isArray(o)) return o.map(function(x){ return swapEv(x, m); });
  if(o&&typeof o==='object'){ var r={}; Object.keys(o).forEach(function(k){ r[k]=k==='groupBy'||k==='prop'||k==='gb'?o[k]:swapEv(o[k], m); }); return r; } return o; }
/* the template's temporary view: swapped events, the chosen property values as filters */
function mapQ(q, b){ if(!b||!b.tpl||b.tpl.removed) return q; var a=ap(b), x=swapEv(JSON.parse(JSON.stringify(q)), a.ev);
  Object.keys(a.prop).forEach(function(p){ if(a.prop[p]) x.filters=(x.filters||[]).concat([{ prop:p, op:'in', vals:[a.prop[p]] }]); });
  return x; }
function tSpell(t){ return typeof t==='string'?[t]:[t.fa,t.en]; }
function tShow(t){ return typeof t==='string'?t:T(t.fa,t.en); }
function mapText(s, b){ if(!b||!b.tpl||b.tpl.removed||!s) return s; var a=ap(b); (b.tpl.texts||[]).forEach(function(t, k){ var v=a.text[k]; if(v) tSpell(t).forEach(function(x){ s=s.split(x).join(v); }); }); return s; }
function missing(b){ return (b.tpl.props||[]).filter(function(p){ return !ap(b).prop[p]; }); }
function propName(p){ var P=RB.PROPS[p]; return P?T(P.fa,P.en):p; }
function valName(p, v){ var P=RB.PROPS[p], hit=P&&P.vals.filter(function(x){ return x[1]===v; })[0]; return hit?T(hit[0],hit[1]):v; }
var BOILER=['ایونت‌ها و ویژگی‌های مشخص‌شده را با مقدارهای خودتان عوض کنید، بعد «ذخیره به‌عنوان داشبورد تازه» را بزنید.','Swap the marked events and properties for your own values, then use «Save as new dashboard».'];
function link(q){ return location.origin+location.pathname+'?'+q; }
function copyLink(q){ var u=link(q); try{ navigator.clipboard.writeText(u); }catch(e){} U.toast('لینک قالب کپی شد؛ فقط اعضای همین پروژه بازش می‌کنند','Template link copied; only members of this project can open it'); return u; }

/* a seeded customer template per project with data, so «این پروژه» isn't empty in the demo: the marketing lead's campaign report */
function seed(){
  if(SEEDED[RB.PROJECT]) return; SEEDED[RB.PROJECT]=true;
  seedCopies();   /* PM 2026-10-28, TG-14: before the goal check, so a project with no data (Starchap) still gets its copies */
  var goal=CAT.CAMPAIGN_GOALS.filter(function(e){ var x=RB.evById(e); return x&&x.w>0; })[0];
  if(!goal) return;
  var sd=CAT.campaign(RB.PROJECT, goal);   /* the definition is shared with events-start v8's «این پروژه» */
  var id=RBShell.tpl.apply(sd.board);
  var b=NB.board(id); if(!b) return;
  b.updated=sd.updated; b.views=sd.views;
  b.tpl=sd.tpl; }

/* ── PM 2026-10-28, TG-14: «کپی به پروژه دیگر» ──
   A customer template is copied into another project the user is a member of (the demo user belongs to every project in the switcher).
   Read with TG-3: the copy makes a template in that project, so the same owner-or-admin gate applies (one function, canCopy).
   The copy is captured here, in the source project (the original chart queries, text cards and the events they use, since the target's
   catalog may not hold source-only ids), stored per target project and rebuilt on every load there with a stable id.
   Re-binding in the target, as the Shahin templates' auto-binding does: an event the target sends binds itself; one it doesn't is picked
   before «ذخیره به‌عنوان داشبورد تازه» (as an empty role blocks saving). A target with no data at all needs no picks (TG-9's rule).
   TG-5 holds: no ⚠ on event rows; the unbound events are named in the bar's bottom line. Built-in Shahin templates aren't copied:
   every project already has them. */
var readCopies=CAT.readCopies, writeCopies=CAT.writeCopies;
function projName(p){ var x=(RB.PROJECTS||[])[p]; return x?T(x[0],x[1]):String(p); }
function copyTargets(){ return (RB.PROJECTS||[]).map(function(x, i){ return i; }).filter(function(i){ return i!==(RB.PROJECT||0); }); }
function canCopy(){ return canPublish() && copyTargets().length>0; }
var COPY_HINT=['فقط مالک یا ادمین پروژه','Project owner or admin only'];
function uniq(a){ return a.filter(function(x, i){ return a.indexOf(x)===i; }); }
function snapshot(b){
  var t=b.tpl, cards=[];
  (b.rows||[]).forEach(function(r){ r.forEach(function(c){
    if(c.k==='text') cards.push({ k:'text', w:c.w, fa:c.fa, en:c.en||c.fa });
    else if(c.k==='rep'&&RB.SAVED[c.r]){ var sv=RB.SAVED[c.r]; cards.push({ w:c.w, fa:sv.fa, en:sv.en, type:sv.type, q:JSON.parse(JSON.stringify(sv.q||{})) }); } }); });
  return { id:'tplx'+(RB.PROJECT||0)+'_'+String(b.id).replace(/[^\w-]/g,'')+'_'+Date.now().toString(36), fa:b.fa, en:b.en, descFa:b.descFa||'', descEn:b.descEn||'',
    cards:cards, evs:boardEvents(b), instr:t.instr||'', events:(t.events||[]).slice(), props:(t.props||[]).slice(), texts:(t.texts||[]).slice(), from:RB.PROJECT||0, at:Date.now() }; }
function seedCopies(){
  var has=!noData();
  readCopies(RB.PROJECT||0).forEach(function(x){
    if(!x||!x.id||NB.board(x.id)) return;
    var id=RBShell.tpl.apply({ id:x.id, fa:x.fa, en:x.en, descFa:x.descFa, descEn:x.descEn, space:'me', cards:x.cards||[] }), b=NB.board(id); if(!b) return;
    var evs=x.evs||[], auto=evs.filter(sent), need=has?evs.filter(function(e){ return !sent(e); }):[];
    b.updated=Math.max(0, Math.round((Date.now()-(x.at||Date.now()))/36e5));
    b.tpl={ instr:x.instr||'', events:uniq((x.events||[]).concat(need)), props:(x.props||[]).filter(function(p){ return RB.PROPS[p]; }), texts:x.texts||[],
      pub:false, by:'me', created:b.updated, used:0, last:null, removed:false, copied:{ from:x.from, auto:auto, need:need } }; }); }
/* the events a copied template still needs picked in this project (the temporary swaps of the bar count as picks) */
function needEv(b){ var c=b&&b.tpl&&b.tpl.copied; if(!c) return []; var a=ap(b); return (c.need||[]).filter(function(e){ return !a.ev[e]; }); }
function copyModal(b){
  var tg=copyTargets(); if(!tg.length||!b.tpl) return;
  U.modal({ fa:'کپی به پروژه دیگر', en:'Copy to another project',
    subFa:'قالب با همان نمودارها، راهنما و جایگزینی‌ها در پروژه مقصد ساخته می‌شود. این قالب و داشبوردش تغییری نمی‌کنند.',
    subEn:'The template is created in the target project with the same charts, instructions and replacements. This template and its dashboard don’t change.',
    body:'<label class="rbx-field"><span>'+T('پروژه مقصد','Target project')+'</span><select class="sh-input" id="tgXProj">'+tg.map(function(p){ return '<option value="'+p+'">'+esc(projName(p))+'</option>'; }).join('')+'</select>'+
        '<span class="rbx-note">'+T('فقط پروژه‌هایی که عضوشان هستید.','Only projects you’re a member of.')+'</span></label>'+
      '<div class="rbx-callout">'+ic('info')+'<span>'+T('در پروژه مقصد، هر ایونتی که آن پروژه می‌فرستد خودکار وصل می‌شود. برای ایونتی که آن پروژه نمی‌فرستد، همان‌جا پیش از ذخیره جایگزین انتخاب می‌کنید.','In the target project, each event that project sends is bound automatically. For an event it doesn’t send, you pick a replacement there before saving.')+'</span></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'کپی', en:'Copy', fn:function(body){
      var p=+body.querySelector('#tgXProj').value, a=readCopies(p);
      if(!writeCopies(p, a.concat([snapshot(b)]))){ U.toast('کپی انجام نشد؛ دوباره تلاش کنید','The copy failed; try again'); return false; }
      var nm=T(b.fa,b.en);
      U.toast('قالب «'+nm+'» در پروژه «'+projName(p)+'» کپی شد؛ ایونت‌هایی که آن پروژه می‌فرستد خودکار وصل می‌شوند','Template “'+nm+'” copied to “'+projName(p)+'”; events that project sends are bound automatically'); } }] }); }

/* ── «تبدیل به قالب…» / «ویرایش قالب…» ── */
function tagModal(b){
  var t=b.tpl||{}, evs=boardEvents(b), props=PARAM_PROPS.filter(function(p){ return RB.PROPS[p]; }), pub=canPublish();
  U.modal({ fa:b.tpl?'ویرایش قالب':'تبدیل به قالب', en:b.tpl?'Edit template':'Turn into a template', subFa:'قالب نسخهٔ قابل استفادهٔ دوبارهٔ همین داشبورد است. هر کس آن را به کار ببرد، کپی مستقل خودش را می‌سازد و این داشبورد تغییری نمی‌کند.', subEn:'A template is a reusable version of this dashboard. Whoever uses it makes their own independent copy; this dashboard doesn’t change.',
    body:'<label class="rbx-field"><span>'+T('راهنما برای کسی که قالب را به کار می‌برد','Instructions for whoever uses the template')+'</span><textarea class="sh-input" id="tgInstr" rows="3" placeholder="'+esc(T(BOILER[0],BOILER[1]))+'">'+esc(t.instr||'')+'</textarea><span class="rbx-note">'+T('خالی بماند، متن پیش‌فرض نشان داده می‌شود.','Left empty, the default text is shown.')+'</span></label>'+
      '<div class="rbx-field"><span>'+T('ایونت‌هایی که قابل جایگزینی‌اند','Events that can be swapped')+'</span><div class="tg-checks">'+(evs.length?evs.map(function(e){ return '<label class="tg-check"><input type="checkbox" data-tev="'+e+'"'+((t.events||[]).indexOf(e)>-1?' checked':'')+'/><span>'+esc(evName(e))+'</span></label>'; }).join(''):'<span class="rbx-note">'+T('این داشبورد هنوز نموداری ندارد.','This dashboard has no charts yet.')+'</span>')+'</div></div>'+
      '<div class="rbx-field"><span>'+T('ویژگی‌هایی که کاربر مقدارشان را انتخاب می‌کند','Properties whose value the user picks')+'</span><div class="tg-checks">'+props.map(function(p){ return '<label class="tg-check"><input type="checkbox" data-tprop="'+p+'"'+((t.props||[]).indexOf(p)>-1?' checked':'')+'/><span>'+esc(propName(p))+'</span></label>'; }).join('')+'</div></div>'+
      '<label class="rbx-field"><span>'+T('متن قابل جایگزینی (اختیاری)','Text to replace (optional)')+'</span><input class="sh-input" id="tgText" value="'+esc((t.texts||[])[0]?tShow(t.texts[0]):'')+'" placeholder="'+T('مثلاً: [نام کمپین]','e.g. [campaign name]')+'"/><span class="rbx-note">'+T('هر جای عنوان‌ها و متن‌های داشبورد که این عبارت آمده، با متن کاربر عوض می‌شود.','Wherever this appears in the titles and text cards, it’s replaced with the user’s text.')+'</span></label>'+
      '<label class="tg-check tg-pub"><input type="checkbox" id="tgPub"'+(t.pub&&pub?' checked':'')+(pub?'':' disabled')+'/><span>'+T('نمایش در گالری این پروژه','Show in this project’s gallery')+'</span></label>'+
      (pub?'':'<span class="rbx-note">'+T('فقط مالک یا ادمین پروژه قالب را در گالری منتشر می‌کند؛ لینک قالب را می‌توانید با اعضای پروژه به اشتراک بگذارید.','Only the project owner or an admin publishes to the gallery; you can still share the template’s link with project members.')+'</span>'),
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:b.tpl?'ذخیره':'تبدیل به قالب', en:b.tpl?'Save':'Turn into a template', fn:function(body){
      var ev=[].slice.call(body.querySelectorAll('[data-tev]:checked')).map(function(x){ return x.getAttribute('data-tev'); }),
          pr=[].slice.call(body.querySelectorAll('[data-tprop]:checked')).map(function(x){ return x.getAttribute('data-tprop'); }),
          tx=body.querySelector('#tgText').value.trim(), was=b.tpl;
      b.tpl=Object.assign({ by:'me', created:0, used:0, last:null }, b.tpl||{}, { instr:body.querySelector('#tgInstr').value.trim(), events:ev, props:pr, texts:tx?[tx]:[], pub:pub&&body.querySelector('#tgPub').checked, removed:false });
      APPLY[b.id]={ ev:{}, prop:{}, text:{} }; RBShell.rerender();
      U.toast(was?'قالب به‌روز شد':(b.tpl.pub?'داشبورد قالب شد و در گالری این پروژه آمد':'داشبورد قالب شد؛ فقط با لینک پیدا می‌شود'), was?'Template updated':(b.tpl.pub?'The dashboard is a template now, in this project’s gallery':'The dashboard is a template now; it’s found by its link')); } }] }); }

/* ── the template bar on the dashboard: instructions, replacement rows, Save as new dashboard ── */
function boardBar(b){
  if(!b.tpl||b.tpl.removed) return '';
  var a=ap(b), t=b.tpl, miss=missing(b), nev=needEv(b), sv=canSave(), dirty=Object.keys(a.ev).some(function(k){ return a.ev[k]; })||Object.keys(a.prop).some(function(k){ return a.prop[k]; })||Object.keys(a.text).some(function(k){ return a.text[k]; });
  var h='<div class="tg-bbar"><div class="tg-instr">'+ic('info')+'<div><b>'+T('راهنمای قالب','Template instructions')+'</b><span>'+esc(t.instr||T(BOILER[0],BOILER[1]))+'</span></div></div>';
  /* PM 2026-10-28, TG-14: a copied template says where it came from and how many events bound themselves here */
  if(t.copied){ var cn=(t.copied.auto||[]).length; h+='<div class="tg-prow" data-tgcopied="1"><span class="rbx-note">'+T('کپی‌شده از پروژه «'+projName(t.copied.from)+'»؛ '+N(cn)+' ایونت خودکار وصل شد','Copied from “'+projName(t.copied.from)+'”; '+cn+' '+(cn===1?'event':'events')+' bound automatically')+'</span></div>'; }
  if((t.events||[]).length) h+='<div class="tg-prow"><span class="tg-plbl">'+T('جایگزینی ایونت','Replace events')+'</span>'+t.events.map(function(e){ var to=a.ev[e], need=nev.indexOf(e)>-1;
    return '<span class="tg-pchip">'+esc(evName(e))+'<span class="tg-arrow">'+(U.L()==='fa'?'←':'→')+'</span><button class="tg-ev sm" data-tswap="'+e+'" type="button">'+esc(to?evName(to):need?T('انتخاب ایونت','Pick an event'):T('همان ایونت','Same event'))+'<span class="rbx-caret">⌄</span></button></span>'; }).join('')+'</div>';
  if((t.props||[]).length) h+='<div class="tg-prow"><span class="tg-plbl">'+T('جایگزینی ویژگی','Replace properties')+'</span>'+t.props.map(function(p){ var v=a.prop[p];
    return '<span class="tg-pchip'+(v?'':' warn')+'">'+(v?'':ic('warning'))+esc(propName(p))+' = <button class="tg-ev sm" data-tprop="'+p+'" type="button">'+(v?esc(valName(p, v)):T('هر مقداری','Any value'))+'<span class="rbx-caret">⌄</span></button></span>'; }).join('')+'</div>';
  if((t.texts||[]).length) h+='<div class="tg-prow"><span class="tg-plbl">'+T('جایگزینی متن','Replace text')+'</span>'+t.texts.map(function(x, k){
    return '<span class="tg-pchip">«'+esc(tShow(x))+'»<span class="tg-arrow">'+(U.L()==='fa'?'←':'→')+'</span><input class="sh-input tg-tin" data-ttext="'+k+'" value="'+esc(a.text[k]||'')+'" placeholder="'+T('متن شما','Your text')+'"/></span>'; }).join('')+'</div>';
  /* PM 2026-10-28, TG-14: an event this project doesn't send blocks saving until it's replaced, named in the same bottom line */
  var nevW=nev.length?T('برای ذخیره، جایگزین این ایونت‌ها را انتخاب کنید (این پروژه آن‌ها را نمی‌فرستد): ','To save, pick a replacement for these events (this project doesn’t send them): ')+nev.map(function(e){ return '«'+esc(evName(e))+'»'; }).join(T('، ',', ')):'';
  h+='<div class="tg-bact">'+(miss.length||nev.length?'<span class="tg-bwarn">'+ic('warning')+(miss.length?T('برای ذخیره، مقدار این ویژگی‌ها را انتخاب کنید: ','To save, pick a value for: ')+miss.map(function(p){ return '«'+esc(propName(p))+'»'; }).join(T('، ',', ')):'')+(miss.length&&nev.length?T('؛ ','; '):'')+nevW+'</span>':'<span class="tg-bnote">'+T('این جایگزینی‌ها موقت‌اند و نمودارهای اصلی را عوض نمی‌کنند.','These replacements are temporary and don’t change the original charts.')+'</span>')+
    '<span class="rbx-spacer"></span><button class="sh-btn ghost compact" data-tact="reset" type="button"'+(dirty?'':' disabled')+'>'+T('بازگشت به پیش‌فرض','Reset to default')+'</button>'+
    '<button class="sh-btn ghost compact" data-tact="link" type="button">'+ic('link')+' '+T('کپی لینک','Copy link')+'</button>'+
    '<button class="sh-btn primary compact" data-tact="save" type="button"'+(miss.length||nev.length||!sv?' disabled aria-disabled="true"':'')+(sv?'':' title="'+esc(T(noSave()[0],noSave()[1]))+'"')+'>'+ic('floppy-disk')+' '+T('ذخیره به‌عنوان داشبورد تازه','Save as new dashboard')+'</button></div>'+
    (sv?'':noSaveNote())+'</div>';   /* PM 2026-10-28, TD-2: members and viewers use the template's replacements but don't save */
  return h; }
function badge(b){ return b.tpl&&!b.tpl.removed?'<span class="rbx-badge tg-badge"'+tip("<span class='tip-title'>قالب</span>این داشبورد قالب است؛ هر کس آن را به کار ببرد کپی مستقل خودش را می‌سازد.","<span class='tip-title'>Template</span>This dashboard is a template; whoever uses it makes their own independent copy.")+'>'+ic('stack')+T('قالب','Template')+'</span>':''; }
/* PM 2026-10-25, TG-12: a search box on top and the 100 most frequent values; past 100 the list says so, and the search finds any value */
var VAL_CAP=100;
function valPicker(b, p){
  var P=RB.PROPS[p]; if(!P) return;
  var all=P.vals.slice().sort(function(x,y){ return (y[2]||0)-(x[2]||0); }), Q='';
  function rows(){ var q=Q.toLowerCase(), hit=q?all.filter(function(v){ return (v[0]+' '+v[1]).toLowerCase().indexOf(q)>-1; }):all.slice(0, VAL_CAP);
    var h=hit.map(function(v){ return '<button class="rbx-pickrow tg-pickrow'+(ap(b).prop[p]===v[1]?' on':'')+'" data-pv="'+esc(v[1])+'" type="button"><span class="grow">'+esc(T(v[0],v[1]))+'</span></button>'; }).join('');
    if(!hit.length) h='<div class="sh-state rbz-empty sm"><div class="sh-state-title">'+T('مقداری پیدا نشد','No values found')+'</div></div>';
    if(!q && all.length>VAL_CAP) h+='<div class="rbx-note tg-valcap">'+T('نمایش '+N(VAL_CAP)+' از '+N(all.length)+'؛ برای بقیه جستجو کنید','Showing '+VAL_CAP+' of '+all.length+'; search to find the rest')+'</div>';
    return h; }
  U.modal({ fa:'مقدار «'+P.fa+'»', en:'Value of “'+P.en+'”', subFa:'همهٔ نمودارهای قالب فقط همین مقدار را نشان می‌دهند.', subEn:'Every chart in the template shows only this value.',
    body:'<input class="sh-input" id="tgValQ" type="search" placeholder="'+T('جستجوی مقدار…','Search values…')+'"/><div class="rbx-pick tg-picklist" id="tgValL">'+rows()+'</div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true }],
    init:function(body, close){ function w(){ body.querySelectorAll('[data-pv]').forEach(function(x){ x.addEventListener('click', function(){ ap(b).prop[p]=x.getAttribute('data-pv'); close(); RBShell.rerender(); }); }); }
      body.querySelector('#tgValQ').addEventListener('input', function(e){ Q=e.target.value; body.querySelector('#tgValL').innerHTML=rows(); w(); }); w(); } }); }
function evSwap(b, e){
  var list=sentList(), Q='';
  function rows(){ var q=Q.toLowerCase(); return list.filter(function(x){ return !q||(x.fa+' '+x.en+' '+x.id).toLowerCase().indexOf(q)>-1; }).map(function(x){ return '<button class="rbx-pickrow tg-pickrow'+((ap(b).ev[e]||e)===x.id?' on':'')+'" data-sw="'+x.id+'" type="button">'+ic('lightning')+'<span class="grow">'+esc(T(x.fa,x.en))+'</span><span class="tg-evid" dir="ltr">'+esc(x.id)+'</span></button>'; }).join(''); }
  U.modal({ fa:'جایگزین «'+(RB.evById(e)||{}).fa+'»', en:'Replace “'+(RB.evById(e)||{}).en+'”', subFa:'ایونت تازه در همهٔ نمودارهای قالب جای این ایونت می‌نشیند.', subEn:'The new event takes this event’s place in every chart of the template.',
    body:'<input class="sh-input" id="tgSwQ" type="search" placeholder="'+T('جستجوی ایونت…','Search events…')+'"/><div class="rbx-pick tg-picklist" id="tgSwL">'+rows()+'</div>', actions:[{ fa:'انصراف', en:'Cancel', ghost:true }],
    init:function(body, close){ function w(){ body.querySelectorAll('[data-sw]').forEach(function(x){ x.addEventListener('click', function(){ var v=x.getAttribute('data-sw'); ap(b).ev[e]=v===e?'':v; close(); RBShell.rerender(); }); }); }
      body.querySelector('#tgSwQ').addEventListener('input', function(ev){ Q=ev.target.value; body.querySelector('#tgSwL').innerHTML=rows(); w(); }); w(); } }); }
function saveOrg(b){
  if(missing(b).length||needEv(b).length) return;   /* PM 2026-10-28, TG-14 */
  if(!canSave()){ U.toast(noSave()[0], noSave()[1]); return; }   /* PM 2026-10-28, TD-2 */
  var sps=L.mySpaces().filter(function(sp){ return L.canAdd(sp); }), nm=mapText(T(b.fa,b.en), b)+T(' (کپی)',' (copy)');
  U.modal({ fa:'ساختن داشبورد تازه', en:'Create new dashboard', subFa:'داشبوردی که از قالب ساخته می‌شود نمودارها را هم کپی می‌کند تا مال شما باشند و ویرایششان کنید. تغییرهای بعدی قالب به این کپی نمی‌رسد.', subEn:'A dashboard made from a template duplicates its charts so you own and can edit them. Later changes to the template don’t reach this copy.',
    body:'<label class="rbx-field"><span>'+T('نام','Name')+'</span><input class="sh-input" id="tgName" value="'+esc(nm)+'"/></label><label class="rbx-field"><span>'+T('محل ذخیره','Location')+'</span><select class="sh-input" id="tgSpace">'+sps.map(function(sp){ return '<option value="'+sp.id+'"'+(sp.personal?' selected':'')+'>'+esc(T(sp.fa,sp.en))+'</option>'; }).join('')+'</select></label>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(body){
      var name=body.querySelector('#tgName').value.trim(); if(!name){ body.querySelector('#tgName').focus(); return false; }
      var cards=[]; (b.rows||[]).forEach(function(r){ r.forEach(function(c){
        if(c.k==='text') cards.push({ k:'text', w:c.w, fa:mapText(c.fa,b), en:mapText(c.en||c.fa,b) });
        else if(c.k==='rep'&&RB.SAVED[c.r]){ var s=RB.SAVED[c.r]; cards.push({ w:c.w, fa:mapText(s.fa,b), en:mapText(s.en,b), type:s.type, q:mapQ(s.q, b) }); } }); });
      var id=RBShell.tpl.apply({ user:true, fa:name, en:name, descFa:b.descFa, descEn:b.descEn, space:body.querySelector('#tgSpace').value, from:'board:'+b.id, cards:cards }); if(!id) return;   /* PM 2026-10-28, TD-2 */
      b.tpl.used=(b.tpl.used||0)+1; b.tpl.last=0; APPLY[b.id]={ ev:{}, prop:{}, text:{} };
      U.toast('داشبورد «'+name+'» ساخته شد؛ نمودارهایش مال شماست','Dashboard “'+name+'” created; its charts are yours');
      RBShell.openBoard(id); } }] }); }
function boardWire(root, b){
  if(!b||!b.tpl||b.tpl.removed) return;
  root.querySelectorAll('[data-tswap]').forEach(function(x){ x.addEventListener('click', function(){ evSwap(b, x.getAttribute('data-tswap')); }); });
  root.querySelectorAll('.tg-bbar [data-tprop]').forEach(function(x){ x.addEventListener('click', function(){ valPicker(b, x.getAttribute('data-tprop')); }); });
  root.querySelectorAll('[data-ttext]').forEach(function(x){ x.addEventListener('change', function(){ ap(b).text[+x.getAttribute('data-ttext')]=x.value.trim(); RBShell.rerender(); }); });
  root.querySelectorAll('[data-tact]').forEach(function(x){ x.addEventListener('click', function(){ var a=x.getAttribute('data-tact');
    if(a==='reset'){ APPLY[b.id]={ ev:{}, prop:{}, text:{} }; RBShell.rerender(); U.toast('به پیش‌فرض قالب برگشت','Back to the template’s defaults'); }
    else if(a==='link') copyLink('board='+b.id);
    else if(a==='save') saveOrg(b); }); }); }
/* the dashboard ⋯ menu items */
function menuItems(b){
  var edit=NB.canEditBoard(b), own=NB.isOwner(b)||canPublish(), items=[];
  /* PM 2026-10-28, TG-3: only the project owner or an admin turns a dashboard into a template (and publishes it); others see the reason */
  var adm=canPublish();
  if(!b.tpl||b.tpl.removed) items.push({ icon:'stack', fa:'تبدیل به قالب…', en:'Turn into a template…', disabled:!adm, hint:!adm?['فقط مالک یا ادمین پروژه','Project owner or admin only']:['کپی‌های مستقل از این داشبورد ساخته می‌شود','Others make independent copies of this dashboard'], fn:function(){ tagModal(b); } });
  else { items.push({ icon:'stack', fa:'ویرایش قالب…', en:'Edit template…', disabled:!own, hint:!own?['فقط سازنده قالب یا ادمین پروژه','The template’s author, the project owner or an admin only']:null, fn:function(){ tagModal(b); } });
    /* PM 2026-10-28, TG-14 */
    items.push({ icon:'copy', fa:'کپی به پروژه دیگر…', en:'Copy to another project…', disabled:!canCopy(), hint:!canCopy()?COPY_HINT:['قالب در پروژه دیگری که عضوش هستید ساخته می‌شود','The template is created in another project you’re a member of'], fn:function(){ copyModal(b); } });
    items.push({ icon:'x', fa:'برداشتن از قالب‌ها', en:'Stop being a template', disabled:!own, hint:['داشبورد می‌ماند؛ فقط از گالری و فیلتر «قالب» بیرون می‌رود','The dashboard stays; it leaves the gallery and the Template filter'], fn:function(){ b.tpl.removed=true; RBShell.rerender(); U.toast('داشبورد دیگر قالب نیست','The dashboard is no longer a template'); } }); }
  return items; }

/* ── gallery: «این پروژه» and «ساخته شما» ── */
function orgCard(b){
  var t=b.tpl, n=reps(b).length, own=NB.isOwner(b)||t.by==='me', can=own||canPublish();
  return '<div class="tg-card org" role="button" tabindex="0" data-org="'+b.id+'"><span class="tg-cbody"><span class="tg-ctitle">'+ic('squares-four')+'<b>'+esc(T(b.fa,b.en))+'</b>'+
      (can?'<button class="rbx-icbtn tg-omenu" data-omenu="'+b.id+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button>':'')+'</span>'+
    '<span class="tg-cdesc">'+esc(t.instr||T(BOILER[0],BOILER[1]))+'</span>'+
    '<span class="tg-cmeta">'+(t.pub?'<span class="rbx-badge">'+ic('stack')+T('در گالری پروژه','In the project gallery')+'</span>':'<span class="rbx-badge view">'+ic('lock-simple')+T('فقط با لینک','Link only')+'</span>')+
      '<span>'+N(n)+' '+T('نمودار',n===1?'chart':'charts')+'</span><span>'+N(t.used||0)+' '+T('بار استفاده',(t.used||0)===1?'use':'uses')+'</span></span>'+
    '<span class="tg-cfoot"><span>'+esc(L.pname(t.by||b.owner))+'</span><span>'+(t.last==null?T('هنوز استفاده نشده','Not used yet'):T('آخرین استفاده: ','Last used ')+L.ago(t.last))+'</span></span></span></div>'; }
function orgMenu(anchor, b){
  var t=b.tpl, pub=canPublish();
  U.menu(anchor, [{ icon:'pencil-simple', fa:'ویرایش راهنما و جایگزینی‌ها…', en:'Edit instructions and replacements…', fn:function(){ tagModal(b); } },
    { icon:'stack', fa:t.pub?'برداشتن از گالری پروژه':'نمایش در گالری پروژه', en:t.pub?'Remove from the project gallery':'Show in the project gallery', disabled:!pub, hint:!pub?['فقط مالک یا ادمین پروژه','Project owner or admin only']:null, fn:function(){ t.pub=!t.pub; RBShell.rerender(); U.toast(t.pub?'قالب در گالری پروژه آمد':'قالب از گالری برداشته شد؛ با لینک باز می‌شود', t.pub?'The template is in the project gallery':'Removed from the gallery; it still opens by link'); } },
    { icon:'link', fa:'کپی لینک', en:'Copy link', fn:function(){ copyLink('board='+b.id); } },
    { icon:'copy', fa:'کپی به پروژه دیگر…', en:'Copy to another project…', disabled:!canCopy(), hint:!canCopy()?COPY_HINT:null, fn:function(){ copyModal(b); } },   /* PM 2026-10-28, TG-14 */
    {sep:1},
    { icon:'x', fa:'برداشتن از قالب‌ها', en:'Stop being a template', danger:true, fn:function(){ t.removed=true; RBShell.rerender(); U.toast('داشبورد دیگر قالب نیست','The dashboard is no longer a template'); } }], 'end'); }

window.RBTpl={
  view:function(v){ return v==='template'&&G.cur?templateView():galleryView(); }, wire:wire, open:open,
  createFrom:function(id, o){ var t=tpl(id); if(!t||!canSave()) return null; o=o||{}; return createFrom(t, o.name||T(t.fa+' (کپی)', t.en+' (copy)'), o.space||'me', o.desc, !!o.counted); },   /* PM 2026-11-01, events-start v7 save */
  gallery:function(){ location.href=galleryHref(); }, galleryHref:galleryHref,
  meta:function(id){ var t=tpl(id); return t?{ id:t.id, fa:t.fa, en:t.en, dFa:t.dFa, dEn:t.dEn, icon:t.icon }:null; },   /* Block A: Home's «شروع از یک قالب» */
  crumb:function(){ var t=RBShell.view()==='template'&&tpl(G.cur); return t?[t.fa,t.en]:['گالری قالب‌ها','Template gallery']; },
  /* QA */ list:function(){ return TPL.map(function(t){ return { id:t.id, grp:t.grp, roles:t.roles.map(function(r){ return r.id; }), charts:charts(t).length }; }); },
  bindings:function(id){ var t=tpl(id); return t?Object.assign({}, bindings(t)):null; }, unbound:function(id){ var t=tpl(id); return t?unbound(t).map(function(r){ return r.id; }):null; },
  states:function(id){ var t=tpl(id); if(!t) return null; var b=bindings(t); return charts(t).map(function(c){ return { fa:c.fa, en:c.en, type:c.type, range:c.range, amp:fill(c.amp, b) }; }); },
  seed:seed, mapQ:mapQ, mapText:mapText, badge:badge, boardBar:boardBar, boardWire:boardWire, menuItems:menuItems, apply:function(id){ var b=NB.board(id); return b?ap(b):null; }, canPublish:canPublish,
  orgList:function(){ return orgTpls().map(function(b){ return { id:b.id, fa:b.fa, pub:!!b.tpl.pub, by:b.tpl.by, used:b.tpl.used||0, events:(b.tpl.events||[]).slice(), props:(b.tpl.props||[]).slice(), copiedFrom:b.tpl.copied?b.tpl.copied.from:null, need:needEv(b) }; }); },
  /* PM 2026-10-28, TG-14 */ canCopy:canCopy, copyTo:function(id, p){ var b=NB.board(id); if(!b||!b.tpl||!canCopy()||copyTargets().indexOf(p)<0) return false; return writeCopies(p, readCopies(p).concat([snapshot(b)])); },
  bind:function(id, rid, evId){ var t=tpl(id); if(t){ bindings(t)[rid]=evId; G.auto[RB.PROJECT+':'+t.id][rid]=false; } }
};
})();
