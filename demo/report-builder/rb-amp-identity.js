/* ═════════ User identity (هویت کاربر) — batch a, v12 only ═════════
   Spec: research-notes/…/47-identity-design.md (inputs 45 and 46). As in Amplitude and Mixpanel, once a site calls ⁦identify()⁩
   a browser or device becomes part of one person: the person's User ID, a Shahin ID, every linked device with the moment it was
   linked, and the traits the site sent, with their source. Reports read a trait's value at the time of each event, as Amplitude does (PM, 2026-10-25, D1). A merge is
   permanent (D5). Shahin writes all of this today (SDK, collector, archive) but no report reads it yet (roadmap 4.3), so no
   merged view is backed by production yet (no «نیازمند توسعه» on this Backlog page, LX-6); «کاربران» in charts still counts browsers/devices (D2, for the PM).
   Sample people: deterministic from the device id; ids are opaque, never names (D6). */
(function(){
'use strict';
if(!window.RB) return;
/* per project: the share of active profiles a site has identified (one shared demo value, PM 2026-10-25, D10: no claimed difference between
   business types; production is 0 until identify ships), the id prefix and the traits it sends (demo values) */
var CFG={
  0:{ share:0.2, pre:'cus_', how:['ورود یا خرید','login or checkout'], traits:[
      ['customer_tier','سطح مشتری','Customer tier',[['برنزی','Bronze',0.55],['نقره‌ای','Silver',0.3],['طلایی','Gold',0.15]],'server',false],
      ['orders_count','تعداد سفارش','Orders count','num:1:24','server',false],
      ['signup_date','تاریخ ثبت‌نام','Sign-up date','date','server',true]] },
  1:{ share:0.2, pre:'acc_', how:['ورود به حساب','account login'], traits:[
      ['plan','پلن','Plan',[['رایگان','Free',0.62],['ماهانه','Monthly',0.28],['سالانه','Yearly',0.1]],'server',false],
      ['signup_date','تاریخ ثبت‌نام','Sign-up date','date','server',true]] },
  2:{ share:0.2, pre:'sub_', how:['ورود مشترک یا عضویت خبرنامه','subscriber login or newsletter sign-up'], traits:[
      ['subscription','اشتراک','Subscription',[['رایگان','Free',0.7],['ویژه','Premium',0.3]],'server',false],
      ['newsletter','خبرنامه','Newsletter',[['عضو','Subscribed',0.8],['لغو شده','Unsubscribed',0.2]],'browser',false]] },
  3:{ share:0, pre:'usr_', how:['—','—'], traits:[] } };
/* the identified share lives in the engine (RB.ID_SHARE), which also counts users as people (batch c) */
function cfg(){ var c=CFG[RB.PROJECT||0]||CFG[0]; if(RB.ID_SHARE&&RB.ID_SHARE[RB.PROJECT||0]!=null) c.share=RB.ID_SHARE[RB.PROJECT||0]; return c; }
function h(s){ var x=2166136261; s=String(s); for(var i=0;i<s.length;i++){ x^=s.charCodeAt(i); x=Math.imul(x,16777619); } x^=x>>>13; x=Math.imul(x,0x5bd1e995); x^=x>>>15; return x>>>0; }   /* FNV-1a + mix: well spread ids */
function j(s){ return h(s)/4294967296; }
function pick(vals, x){ var a=0; for(var i=0;i<vals.length;i++){ a+=vals[i][2]; if(x<a) return vals[i]; } return vals[vals.length-1]; }
var cache={};
/* one person from a device row (id, dev, browser, ago, sess) — the same device always gives the same person */
function of(u){
  if(!u||!u.id) return null; var key=(RB.PROJECT||0)+'|'+u.id; if(cache[key]) return cache[key];
  var C=cfg(), hh=h(u.id), idd=j(u.id+'idf')<C.share;
  var D=RB.PROPS.device_type.vals, B=RB.PROPS.browser.vals;
  var first=u.ago+((u.sess||1)*40)+120, devs=[{ id:u.id, dev:u.dev, browser:u.browser||B[hh%B.length], first:first, linked:null, main:true }];
  var out={ identified:idd, uid:null, shid:'sh_'+(h(u.id+'shid').toString(16)+'00000000').slice(0,8), devices:devs, traits:[], loginSess:-1 };
  if(idd){
    out.uid=C.pre+(100000+h(u.id+'uid')%900000);
    /* the login: the device was linked a while after its first visit (its earlier events join the person too) */
    devs[0].linked=Math.max(u.ago+6, Math.round(first*(0.35+0.4*j(u.id+'lk'))));
    var extra=(hh%3===0?1:0)+(hh%7===0?1:0);
    for(var k=0;k<extra;k++){ var dv=D[(hh>>>(3+k))%D.length], br=B[(hh>>>(6+k))%B.length], f=Math.round(first*(0.2+0.5*j(u.id+'xf'+k)));
      devs.push({ id:'anon-'+(h(u.id+'x'+k).toString(16)+'000000').slice(0,6), dev:dv, browser:br, first:f, linked:Math.max(u.ago+2, Math.round(f*(0.3+0.5*j(u.id+'xl'+k)))), main:false }); }
    out.traits=C.traits.map(function(t){ var v, x=j(u.id+t[0]);
      if(Array.isArray(t[3])){ var p=pick(t[3], x); v=[p[0],p[1]]; }
      else if(t[3]==='date'){ var dd=Math.round(first/24)+3; v=['dd:'+dd,'dd:'+dd]; }
      else { var r=t[3].split(':'), n=+r[1]+Math.floor(x*(+r[2]-+r[1])); v=[String(n),String(n)]; }
      return { key:t[0], fa:t[1], en:t[2], val:v, src:t[4], once:t[5], upd:Math.max(u.ago, Math.round(devs[0].linked*(0.2+0.7*j(u.id+t[0]+'u')))) }; });
    /* the session in which the user logged in (the oldest one shown) */
    out.loginSess=Math.min(4,(u.sess||1)-1);
  }
  cache[key]=out; return out; }
/* the label a list shows: the User ID once identified, else the device id */
function label(u){ var p=of(u); return p&&p.identified?p.uid:u.id; }
/* sample rejected IDs (Amplitude's rules: ≥5 characters, not a placeholder) */
function rejected(){ var n=RB.EVENTS.some(function(e){ return e.w>0; })?1:0, s=(RB.PROJECT||0)+1;
  return [['null', 'مقدار جای‌خالی', 'placeholder value', 214*s*n],['anonymous','مقدار جای‌خالی','placeholder value',96*s*n],['0','کوتاه‌تر از ۵ نویسه','shorter than 5 characters',41*s*n],['-1','کوتاه‌تر از ۵ نویسه','shorter than 5 characters',17*s*n],['abc','کوتاه‌تر از ۵ نویسه','shorter than 5 characters',6*s*n]].filter(function(r){ return r[3]>0; }); }
/* batch b: the traits as user properties every event carries (filters, breakdowns, segments, cohorts); anonymous users have no value.
   Value at the time of each event (D1 as revised by the PM, 2026-10-25): a breakdown reads the value the person had when the event happened. Dates stay
   on the profile only (no buckets in the builder yet). */
var NUMB=[['۱','1'],['۲ تا ۳','2–3'],['۴ تا ۹','4–9'],['۱۰ و بیشتر','10+']], NUMW=[0.38,0.3,0.22,0.1];
function traitProps(){ var C=cfg(), out=[]; if(!C.share) return out;
  var none=['بدون مقدار (ناشناس)','(none) — anonymous',Math.round((1-C.share)*1000)/1000];
  C.traits.forEach(function(t){ if(t[3]==='date'||RB.PROPS[t[0]]) return; var vals;
    if(Array.isArray(t[3])) vals=t[3].map(function(v){ return [v[0],v[1],Math.round(C.share*v[2]*1000)/1000]; });
    else vals=NUMB.map(function(b,i){ return [b[0],b[1],Math.round(C.share*NUMW[i]*1000)/1000]; });
    RB.PROPS[t[0]]={ grp:'user', fa:t[1], en:t[2], vals:[none].concat(vals), trait:true, src:t[4] };
    if(RB.GLOBAL_PROPS.indexOf(t[0])<0) RB.GLOBAL_PROPS.push(t[0]); out.push(t[0]); });
  if(out.length && RB.PROP_GROUPS && !RB.PROP_GROUPS.some(function(g){ return g[0]==='user'; })) RB.PROP_GROUPS.push(['user','ویژگی‌های کاربر','User properties',
    /* A44/B05 (m2 design pass, 2026-11-15): a short label; how the value is read moves into the header's ⓘ (the 4th item, a menu hint) */
    ["<span class='tip-title'>ویژگی‌های کاربر</span>ویژگی‌هایی که سایت شما با ⁦identify()⁩ فرستاده؛ گزارش مقدار همان لحظهٔ هر ایونت را می‌خواند، پس عددها با تغییر بعدی ویژگی جابه‌جا نمی‌شوند.",
     "<span class='tip-title'>User properties</span>Properties your site sent with identify(); reports read the value at the time of each event, so numbers don't move when a property changes later."]]);
  if(window.RBAmp && RBAmp._flush) RBAmp._flush();
  return out; }
var TRAITS=traitProps();
/* I17: a static cohort from a list of IDs. A valid id is matched to a person seen in the last 90 days (most are; the sample marks
   ~8% as not seen); placeholders and ids under 5 characters are rejected, as identify() would reject them. */
var MAX_FILE=100*1024*1024;
var UPLOAD_IC='<svg viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0M93.66 77.66 120 51.31V144a8 8 0 0 0 16 0V51.31l26.34 26.35a8 8 0 0 0 11.32-11.32l-40-40a8 8 0 0 0-11.32 0l-40 40a8 8 0 0 0 11.32 11.32"/></svg>';   /* Phosphor upload-simple (the shell's icon set has no upload) */
var BAD=/^(null|undefined|anonymous|anon|none|nil|0|-1|unknown|guest|test)$/i;
function classify(list){ var C=cfg(), out={ ok:[], miss:[], bad:[] }, seen={};
  list.forEach(function(raw){ var id=String(raw).trim().replace(/^["']|["']$/g,''); if(!id||seen[id]) return; seen[id]=1;
    if(BAD.test(id)||id.length<5) out.bad.push(id); else if(j(id+'seen')<0.08) out.miss.push(id); else out.ok.push(id); });
  return out; }
function parse(txt){ return String(txt||'').split(/[\s,;]+/).filter(function(x){ return x && !/^(user_?id|device_?id|id)$/i.test(x); }); }
function importCsv(){ var S=RBShell, U=S.ui, T=U.T, esc=U.esc, N=U.N;
  if(!RB.EVENTS.some(function(e){ return e.w>0; })){ U.toast('این پروژه هنوز کاربری ندارد که با فهرست جور شود','This project has no users to match a list against yet'); return; }
  var C=cfg(), ex=[C.pre+'482913', C.pre+'105577', 'anon-7f3a1c', 'null', 'abc'].join('\n');
  U.modal({ fa:'کوهورت از فهرست شناسه‌ها', en:'Cohort from a list of IDs', subFa:'شناسه‌های کاربر یا دستگاه را بچسبانید یا یک فایل CSV بدهید؛ هر شناسه در یک خط یا با ویرگول جدا.', subEn:'Paste User IDs or device IDs, or upload a CSV; one ID per line or comma-separated.', wide:true,
    /* PM 2026-10-25, UC-2: the ID-list import is a cohort surface, tagged with the cohorts reason */
    body:'<div class="rbx-field"><label>'+T('نام کوهورت','Cohort name')+'</label><input class="sh-input" id="ridName" value="'+T('فهرست واردشده','Imported list')+'"/></div>'+
      /* m2 design pass (2026-11-15), C28: a file drop zone, the paste box, then a result summary of what matched */
      '<label class="rid-drop" id="ridDrop"><input type="file" id="ridFile" accept=".csv,.txt"/><span class="rid-dic">'+UPLOAD_IC+'</span><span class="rid-dt">'+T('فایل CSV را این‌جا رها کنید یا ','Drop a CSV file here, or ')+'<u>'+T('انتخاب کنید','browse')+'</u></span><span class="rid-dh" id="ridFn">'+T('یک ستون شناسهٔ کاربر یا شناسهٔ دستگاه · حداکثر ۱۰۰ مگابایت','One column of User IDs or device IDs · up to 100 MB')+'</span></label>'+
      '<div class="rid-or"><span>'+T('یا شناسه‌ها را بچسبانید','or paste the IDs')+'</span></div>'+
      '<div class="rbx-field"><textarea class="sh-input" id="ridTxt" rows="5" dir="ltr" aria-label="'+T('شناسه‌ها','IDs')+'" placeholder="'+esc(ex)+'"></textarea></div>'+
      '<div class="rid-chk"><button type="button" class="sh-btn ghost compact" id="ridCheck">'+T('بررسی فهرست','Check the list')+'</button><span class="rid-note">'+T('کوهورتِ واردشده ثابت است: همین آدم‌ها می‌مانند و با رفتار تازه عوض نمی‌شود.','An imported cohort is static: the same people stay, whatever they do next.')+'</span></div><div id="ridOut" class="rid-out" role="status"></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ساختن کوهورت', en:'Create cohort', fn:function(body){
      var r=classify(parse(body.querySelector('#ridTxt').value)), name=(body.querySelector('#ridName').value||'').trim();
      if(!r.ok.length){ U.toast('هیچ شناسه‌ای با کاربری جور نشد','No ID matched a user'); show(body, r); return false; }
      if(!name){ U.toast('نام کوهورت را بنویسید','Name the cohort'); return false; }
      var id=S.addCohort({ fa:name, en:name, defFa:'واردشده از فهرست '+N(r.ok.length)+' شناسه', defEn:'Imported from a list of '+r.ok.length+' IDs', stat:true, n:r.ok.length, src:'ids' });
      U.toast('کوهورت «'+name+'» با '+N(r.ok.length)+' کاربر ساخته شد','Cohort «'+name+'» created with '+r.ok.length+' users');
      if(window.RBCohort&&RBCohort.open) setTimeout(function(){ RBCohort.open(id); }, 60); } }] });
  var ov=document.querySelector('.rbx-ov:last-child'), body=ov&&ov.querySelector('.rbx-mbody'); if(!body) return;
  body.querySelector('#ridCheck').addEventListener('click', function(){ show(body, classify(parse(body.querySelector('#ridTxt').value))); });
  /* PM 2026-10-25, UC-8: a file is accepted up to 100 MB, as in Amplitude; a larger one is refused with a clear message */
  body.querySelector('#ridFile').addEventListener('change', function(e){ var f=e.target.files&&e.target.files[0]; if(!f) return;
    if(f.size>MAX_FILE){ e.target.value=''; U.toast('فایل بزرگ‌تر از ۱۰۰ مگابایت است؛ فایل کوچک‌تری انتخاب کنید یا فهرست را چند بخش کنید','The file is larger than 100 MB; use a smaller file or split the list'); return; }
    readFile(f); });
  function readFile(f){ var fn=body.querySelector('#ridFn'); if(fn){ fn.textContent=f.name+' · '+N(Math.max(1,Math.round(f.size/1024)))+' KB'; fn.setAttribute('dir','ltr'); } body.querySelector('#ridDrop').classList.add('has');
    var rd=new FileReader(); rd.onload=function(){ body.querySelector('#ridTxt').value=String(rd.result||''); show(body, classify(parse(rd.result))); }; rd.readAsText(f); }
  var dz=body.querySelector('#ridDrop');
  ['dragenter','dragover'].forEach(function(t){ dz.addEventListener(t, function(e){ e.preventDefault(); dz.classList.add('over'); }); });
  ['dragleave','drop'].forEach(function(t){ dz.addEventListener(t, function(e){ e.preventDefault(); dz.classList.remove('over'); }); });
  dz.addEventListener('drop', function(e){ var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(!f) return;
    if(f.size>MAX_FILE){ U.toast('فایل بزرگ‌تر از ۱۰۰ مگابایت است؛ فایل کوچک‌تری انتخاب کنید یا فهرست را چند بخش کنید','The file is larger than 100 MB; use a smaller file or split the list'); return; } readFile(f); });
  function show(b, r){ var o=b.querySelector('#ridOut'); if(!o) return;
    var tot=r.ok.length+r.miss.length+r.bad.length;
    function st(cls, n, fa_, en, ex){ return '<div class="rid-stat '+cls+'"><b>'+N(n)+'</b><span>'+T(fa_,en)+'</span>'+(ex&&ex.length?'<small dir="ltr" title="'+esc(ex.join(', '))+'">'+esc(ex.slice(0,3).join(', '))+(ex.length>3?' …':'')+'</small>':'')+'</div>'; }
    o.innerHTML='<div class="rid-sum">'+T('از '+N(tot)+' شناسهٔ یکتا','Of '+tot+' unique IDs')+'</div><div class="rid-stats">'+st('good', r.ok.length, 'جور شد و عضو کوهورت می‌شود', 'matched, joins the cohort')+
      st('', r.miss.length, 'در ۹۰ روز اخیر دیده نشده', 'not seen in the last 90 days', r.miss)+st('bad', r.bad.length, 'نامعتبر: کوتاه‌تر از ۵ نویسه یا مقدار جای‌خالی', 'rejected: under 5 characters or a placeholder', r.bad)+'</div>'; } }
window.RBId={ of:of, label:label, cfg:cfg, rejected:rejected, traits:function(){ return TRAITS.slice(); }, importCsv:importCsv, classify:classify, reset:function(){ cache={}; } };
})();
