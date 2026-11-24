/* ═════════ Cohorts (phase 2, step 4.5a) and the site-user profile — v12 only ═════════
   Amplitude Behavioral Cohorts. PM decision 2026-11-16 (supersedes the 2026-10-12 full-page exception): a NEW cohort opens as a
   drawer from the inline-end side over a dimmed page, as Amplitude's «New Cohort»; «ساختن کوهورت» saves it and opens its page. A saved
   cohort keeps its full page (Amplitude does the same); the library panel stays as a preview. Spec: research-notes/…/18-amplitude-cohorts-spec.md.
   One number everywhere: a cohort's size is stored as (anchor event, range, f) so the shell's cohortCount —
   used by the library card, the panel and the builder's «در کوهورت» — returns exactly the size shown here.
   Users are people (identity batch c): an identified person's devices count once; the page says so. */
(function(){
'use strict';
if(!window.RBShell || !window.RBAmp || !RBShell.cohortStore) return;
var U=RBShell.ui, T=U.T, esc=U.esc, ic=U.ic, tip=U.tip, L=RBShell.lib;
function $(id){ return document.getElementById(id); }
/* a property value as this role may see it: members get «[محدود] #code» for Personal and Sensitive properties (Data Access Control) */
function DV(p, pair){ return window.RBAmp&&RBAmp.dacVal?RBAmp.dacVal(p, pair):T(pair[0],pair[1]); }
/* PM 2026-10-25, UC-2: each Users area's production prerequisite (PRD-Users-And-Cohorts rule 22); RBCohort.devReason(area) still serves the text.
   PM 2026-10-28, LX-6: the report builder is Backlog, so it carries no «نیازمند توسعه»: RBCohort.devTag(area) is a no-op hook that returns ''. */
var DEV={
  cohorts:['شاهین هنوز کوهورت ذخیره نمی‌کند و عضویت کوهورت را در گزارش‌ها حساب نمی‌کند؛ کوهورت‌ها و عددهای این دمو نمونه‌اند.','Shahin doesn’t save cohorts or compute cohort membership in reports yet; the cohorts and numbers in this demo are samples.'],
  computations:['شاهین هنوز ویژگی کاربر را از روی رفتارش حساب نمی‌کند؛ مقدارهای این دمو نمونه‌اند.','Shahin doesn’t compute user properties from behavior yet; the values in this demo are samples.'],
  profiles:['شاهین هنوز جستجوی کاربر و فهرست ایونت‌های هر نفر را ندارد؛ کاربران و ایونت‌های این دمو نمونه‌اند.','Shahin has no user lookup or per-user event stream yet; the users and events in this demo are samples.'],
  groups:['شاهین ⁦group()⁩ را می‌گیرد ولی هنوز ویژگی گروه ندارد و در گزارش‌ها آن را نمی‌خواند؛ گروه‌های این دمو نمونه‌اند.','Shahin receives ⁦group()⁩ but has no group properties and doesn’t use it in reports yet; the groups in this demo are samples.'],
  predictions:['شاهین هنوز مدل پیش‌بینی ندارد؛ این صفحه نشان می‌دهد احتمال رفتار در شاهین چطور کار خواهد کرد.','Shahin has no prediction model yet; this page shows how behaviour likelihood will work in Shahin.'],
  identity:['شاهین ⁦identify()⁩ را می‌گیرد ولی هنوز دستگاه‌های یک نفر را در گزارش‌ها یک کاربر نمی‌شمارد؛ این دمو یکی شدن هویت را نشان می‌دهد.','Shahin receives ⁦identify()⁩ but doesn’t count one person’s devices as one user in reports yet; this demo shows identity merging.'] };
function devTag(){ return ''; }
function fa(){ return U.L()==='fa'; }
function num(x, d){ var n=Number(x)||0; return n.toLocaleString(fa()?'fa-IR':'en-US', { maximumFractionDigits:d||0, minimumFractionDigits:0 }); }
function pct(x){ return num(x,1)+T('٪','%'); }
function jit(seed, i){ return RB.jit(RB.hstr(String(seed))+(i||0)); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

var WIN={ 7:['۷ روز اخیر','the last 7 days'], 30:['۳۰ روز اخیر','the last 30 days'], 90:['۹۰ روز اخیر','the last 90 days'], since:['از ۱ تیر تا امروز','since Jun 22'],
  w7:['ظرف ۷ روز از اولین بازدید','within 7 days of first use'], w30:['ظرف ۳۰ روز از اولین بازدید','within 30 days of first use'] };
var WIN_GRP=[['during','در بازه (During)','During',['7','30','90']],['since','از تاریخ (Since)','Since',['since']],['within','از اولین بازدید (Within)','Within',['w7','w30']]];
var REL={ gt:['بیشتر از','more often than'], lt:['کمتر از','less often than'] };
var NTH=['','اولین','دومین','سومین','چهارمین','پنجمین'], NTH_EN=['','1st','2nd','3rd','4th','5th'];
var NUM_MEAN={ load_time:2.4 };
var COPS={ gte:['دست‌کم','at least'], eq:['دقیقاً','exactly'], lte:['حداکثر','at most'] };
var WITH=[['count','تعداد دفعات','Count'],['rel','مقایسه با ایونت دیگر','Relative count'],['sum','جمع ویژگی','Total sum of property'],['distinct','مقادیر متمایز ویژگی','Distinct values of property'],['hist','شمارش تاریخی','Historical count'],['interval','تعداد روزهای متفاوت','Count in interval']];
var SEG_GRPS=['ses','dev','geo','ref','utm','user','computed','org'];   /* Block C: computed properties and organization properties are user-level conditions too */
var VIEWER=new URLSearchParams(location.search).get('role')==='viewer'||new URLSearchParams(location.search).get('prole')==='viewer';   /* TG-4 / conflict 6: prole=viewer is a viewer too */   /* Block C: viewers make personal, unlisted cohorts only, and edit no one else's */
var COLS=[['id','شناسهٔ کاربر','User ID'],['seen','آخرین فعالیت','Last seen'],['city','شهر','City'],['dev','نوع دستگاه','Device type'],['browser','مرورگر','Browser'],['ref','نوع ورودی','Referrer type'],['sess','تعداد نشست','Sessions']];
var CTIPS={
  def:["<span class='tip-title'>تعریف کوهورت</span>شرط‌هایی که کاربر باید داشته باشد تا عضو کوهورت باشد؛ شرط‌های پشت سر هم با «و» ترکیب می‌شوند و گزینه‌های «…یا» داخل هر شرط با «یا».","<span class='tip-title'>Cohort definition</span>The conditions a user must meet to be in the cohort; consecutive conditions combine with AND, and the “…or” options inside a condition with OR."],
  size:["<span class='tip-title'>اندازهٔ کوهورت</span>تعداد کاربرانی که همین حالا شرط‌ها را دارند؛ سهم، نسبت به کاربران فعال همان بازه است. "+RB.USER_DEF[0],"<span class='tip-title'>Cohort size</span>How many users meet the conditions right now; the share is of the active users in the same window. "+RB.USER_DEF[1]],
  pop:["<span class='tip-title'>اندازه در طول زمان</span>اندازهٔ کوهورت در هر روز از ۳۰ روز اخیر، اگر همان روز حساب می‌شد؛ نشان می‌دهد کوهورت بزرگ‌تر می‌شود یا کوچک‌تر. برای کوهورت ثابت معنا ندارد.","<span class='tip-title'>Population over time</span>The cohort’s size on each of the last 30 days, as if computed that day; it shows whether the cohort is growing or shrinking. Not available for static cohorts."],
  kind:["<span class='tip-title'>پویا یا ثابت</span>کوهورت پویا هر بار که در نمودار استفاده شود یا تازه‌سازی کنید دوباره حساب می‌شود؛ کوهورت ثابت فهرستی است که یک بار ساخته شده و دیگر تغییر نمی‌کند.","<span class='tip-title'>Dynamic or static</span>A dynamic cohort is recomputed whenever a chart uses it or you refresh it; a static cohort is a list made once that never changes."],
  disc:["<span class='tip-title'>قابل دیدن برای تیم</span>روشن: هر کسی که به فضا دسترسی دارد کوهورت را در جستجو و فهرست‌ها می‌بیند. خاموش: فقط با لینک یا برای خودتان.","<span class='tip-title'>Discoverable</span>On: anyone with access to the space finds the cohort in search and lists. Off: only by link, or for you."],
  used:["<span class='tip-title'>استفاده‌شده در</span>گزارش‌هایی که این کوهورت را در «گروه‌های کاربران» به کار برده‌اند؛ پیش از بایگانی یا تغییر تعریف، این‌ها را ببینید.","<span class='tip-title'>Used by</span>Charts that use this cohort in their user segments; check them before archiving it or changing its definition."],
  list:["<span class='tip-title'>کوهورت‌ها</span>گروه‌هایی از کاربران که با کاری که کرده‌اند یا ویژگی‌هایشان تعریف شده‌اند؛ هر کوهورت را در نمودارها برای دیدن رفتار همان گروه به کار ببرید. اندازهٔ هر کوهورت همان عددی است که در نمودارها می‌بینید.","<span class='tip-title'>Cohorts</span>Groups of users defined by what they did or who they are; use a cohort in charts to see how that group behaves. Each cohort’s size is the same number charts show."],
  memb:["<span class='tip-title'>عضویت در کوهورت‌ها</span>کوهورت‌هایی را انتخاب کنید و «بررسی» را بزنید تا ببینید این کاربر همین حالا عضو کدام‌هاست؛ عضویت با شرط‌های امروز هر کوهورت حساب می‌شود.","<span class='tip-title'>Cohort membership</span>Pick cohorts and press Check to see which ones this user is in right now; membership is computed with each cohort’s conditions as of today."],
  person:["<span class='tip-title'>پروفایل کاربر</span>همهٔ ایونت‌های یک کاربر سایت، به ترتیب زمان و گروه‌شده در نشست‌ها؛ اگر سایت او را شناخته باشد، همهٔ دستگاه‌هایش در همین پروفایل‌اند.","<span class='tip-title'>User profile</span>Every event of one site user, in time order and grouped into sessions; once your site has identified them, all their devices are in this one profile."]
};
var CO={ id:null, d:null, dirty:false, tab:'users', cols:['id','seen','city','dev','browser'], person:null, from:null, cmp:'active', cprop:'device_type', check:{}, checked:false };

/* ── the size model: one estimate from the engine's own event volumes ── */
/* PM 2026-10-25, UC-13: «از تاریخ (Since)» takes its start day from the report builder's shared Jalali picker (single-date mode,
   RBShell.datePicker). The window is stored as 'since:YYYY-MM-DD'; plain 'since' is the demo's sample start (1 Tir, 37 days before the
   demo's today). Every window label goes through winLbl(), so a picked date never breaks a WIN lookup. */
var DEMO_TODAY=new Date(2026,6,29), SINCE0='2026-06-22';
function isSince(w){ return /^since/.test(String(w)); }
function sinceIso(w){ var m=/^since:(\d{4}-\d{2}-\d{2})$/.exec(String(w)); return m?m[1]:SINCE0; }
function isoDate(iso){ var p=iso.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
function pad2(x){ return (+x<10?'0':'')+(+x); }
function toIso(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function sinceDays(w){ return Math.max(2, Math.min(365, Math.round((DEMO_TODAY-isoDate(sinceIso(w)))/864e5))); }
function sinceLbl(iso){ var d=isoDate(iso); return [new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long' }).format(d), new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' }).format(d)]; }
function winLbl(w){ if(isSince(w)){ var l=sinceLbl(sinceIso(w)); return ['از '+l[0]+' تا امروز','since '+l[1]]; } return WIN[w]||WIN[30]; }
function wd(w){ return isSince(w)?(w==='since'?37:sinceDays(w)):/^w/.test(String(w))?90:+w; }
function rng(w){ return w==='since'?'since':isSince(w)?'n'+sinceDays(w):'n'+wd(w); }
/* any value the shared picker may hand back: a Date, an ISO string, or { date | start | from | value } */
function normIso(v){ if(v&&typeof v==='object'&&!(v instanceof Date)) v=v.date||v.start||v.from||v.value; if(v instanceof Date) return toIso(v);
  var m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(v||'')); if(!m) return null; var d=new Date(+m[1],+m[2]-1,+m[3]); return toIso(d>DEMO_TODAY?DEMO_TODAY:d); }
function pickSince(anchor, iso, done){ var DP=RBShell.datePicker; if(typeof DP!=='function') return;
  DP(anchor, { mode:'single', value:iso, max:toIso(DEMO_TODAY), onPick:function(v){ var x=normIso(v); if(x) done(x); } }); }
function realEv(id){ return RB.evById(id)?id:'page_view'; }
function act(w){ return Math.max(1, RBAmp.evStats('_any_active', rng(w)).u); }
function numMean(p){ var N=RBAmp.nump[p]; return N?N.mean:NUM_MEAN[p]||1; }
function poisTail(lam, n){ var t=0, f=Math.exp(-lam), k; for(k=0;k<n;k++){ t+=f; f*=lam/(k+1); } return Math.max(0,1-t); }   /* P(X ≥ n), X ~ Poisson(lam) */
/* share of the window's active users that meet one clause (the demo's estimate from the engine's own volumes) */
function clauseShare(c){
  var s;
  if(c.kind==='prop'){ var P=RB.PROPS[c.prop]; s=0; (P?P.vals:[]).forEach(function(v){ if((c.vals||[]).indexOf(v[1])>-1) s+=v[2]; }); if(c.pop==='not_in') s=1-s; if(c.when==='recent') s*=0.86; }
  else if(c.kind==='active'){ s=Math.min(1, act(c.win)/act(90)); }
  else if(c.kind==='new'){ s=Math.min(1, RBAmp.evStats('_new_user', rng(c.win)).u/act(90)); }
  else if(c.kind==='cohort'){ var o=byId(c.cid); s=o?Math.min(1, RBShell.cohortCount(o)/act(30)):0; }
  else {
    var st=RBAmp.evStats(c.ev, rng(c.win), c.where||[]), reach=Math.min(0.98, st.u/act(c.win)), fr=Math.max(1.01, st.t/Math.max(1,st.u)), p=1/fr, n=Math.max(1,+c.n||1), w=c.with||'count', cf=1;
    if(/^w/.test(String(c.win))) reach*=0.7;   /* only events inside each member's first X days count */
    if(w==='count') cf=c.op==='eq'?p*Math.pow(1-p,n-1):c.op==='lte'?1-Math.pow(1-p,n):Math.pow(1-p,n-1);   /* geometric visits per user */
    else if(w==='rel'){ var s2=RBAmp.evStats(c.ev2||'page_view', rng(c.win), c.where2||[]), f2=Math.max(1.01, s2.t/Math.max(1,s2.u)); cf=c.rop==='lt'?f2/(fr+f2):fr/(fr+f2); }
    else if(w==='sum'){ var m=fr*numMean(c.prop||'amount'), v=Math.max(0,+c.val||0); cf=c.op==='lte'?1-Math.exp(-v/m):Math.exp(-v/m); }   /* a missing numeric value counts as 0 */
    else if(w==='distinct'){ var K=((RB.PROPS[c.prop]||{ vals:[] }).vals||[]).length||1, q=(fr-1)/fr; cf=n>K?0:c.op==='eq'?Math.pow(q,n-1)*(1-q):c.op==='lte'?1-Math.pow(q,n):Math.pow(q,n-1); }
    else if(w==='hist'){ cf=0.42*Math.pow(0.62,(+c.nth||1)-1); }   /* the window holds their Nth ever occurrence */
    else if(w==='interval'){ cf=poisTail(Math.min(wd(c.win), fr*1.15), n); }
    s=reach*Math.min(1,cf);
    (c.then||[]).forEach(function(t,ti){ s*=0.28+0.42*jit(c.ev+'>'+t.ev,ti); });   /* "...then": both, in that order */
  }
  return Math.max(0, Math.min(1, c.not?1-s:s));
}
function maxWin(def){ var w=7; (def.groups||[]).forEach(function(g){ g.or.forEach(function(c){ if(c.win!=null&&wd(c.win)>wd(w)) w=c.win; }); }); return w; }
function sizeOf(def){
  var g=(def.groups||[]).filter(function(x){ return x.or.length; }); if(!g.length) return { n:0, base:0, share:0, w:7 };
  var shares=g.map(function(x){ var m=1; x.or.forEach(function(c){ m*=1-clauseShare(c); }); return 1-m; }).sort(function(a,b){ return a-b; });
  var sh=shares[0]; for(var i=1;i<shares.length;i++) sh*=Math.pow(shares[i],0.6);   /* behaviours go together: never above the smallest condition */
  var w=maxWin(def), base=act(w);
  if(def.unit==='org'){ var o=(RB.ORG&&RB.ORG[RB.PROJECT||0])||{ share:0.06, members:10 }, orgs=Math.max(1, Math.round(base*o.share/Math.max(1,o.members)));   /* organizations, not people */
    return { n:Math.max(1, Math.round(orgs*Math.min(1, Math.pow(sh,0.7)*1.4))), base:orgs, share:Math.min(100, Math.pow(sh,0.7)*140), w:w, org:true }; }
  return { n:Math.round(base*sh), base:base, share:sh*100, w:w };
}
/* Amplitude: no population over time for "most recently" user properties or more than 10 ORs; Historical count on Any Event makes a static cohort */
function noPop(def){ var ors=0, rec=false; (def&&def.groups||[]).forEach(function(g){ ors+=Math.max(0,g.or.length-1); g.or.forEach(function(c){ if(c.kind==='prop'&&c.when==='recent') rec=true; }); }); return rec||ors>10; }
function mustStatic(def){ return (def&&def.groups||[]).some(function(g){ return g.or.some(function(c){ return c.kind==='ev'&&c.with==='hist'&&(c.ev==='_any'||c.ev==='_any_active'); }); }); }
function anchor(def){ var e=null; (def.groups||[]).forEach(function(g){ g.or.forEach(function(c){ if(!e&&c.kind==='ev'&&!c.not) e=c.ev; }); }); return realEv(e||'page_view'); }
/* store the size so the shell's cohortCount reproduces it exactly */
function pinSize(co, def){ var z=sizeOf(def), ev=anchor(def), r=rng(z.w), pu=Math.max(1, RBAmp.evStats(ev, r).u); co.ev=ev; co.range=r; co.f=z.n/pu; return z; }
function evFE(id){ var e=RB.evById(id); return e?[e.fa,e.en]:[RBAmp.evName(id),RBAmp.evName(id)]; }
function faN(x){ return (+x).toLocaleString('fa-IR'); }
function clauseText(c){
  var P, vs;
  if(c.kind==='prop'){ P=RB.PROPS[c.prop]; vs=(c.vals||[]).map(function(v){ var h=P&&P.vals.filter(function(x){ return x[1]===v; })[0]; return h?h:[v,v]; });
    /* PM 2026-10-25, LX-15: with mask, a member reads Personal and Sensitive values as «[محدود] #code» (render time only; stored text stays raw) */
    var mk=MASK&&window.RBAmp&&RBAmp.dacMasked&&RBAmp.dacMasked([c.prop]), cd=function(v){ return '#'+((RB.hstr(String(v[1]))>>>0)%900+100); };
    if(mk) vs=vs.map(function(v){ return ['[محدود] '+cd(v), '[Restricted] '+cd(v)]; });
    return [(P?P.fa:c.prop)+(c.pop==='not_in'?' نیست ':': ')+vs.map(function(v){ return v[0]; }).join('، ')+(c.when==='recent'?' (آخرین مقدار)':''), (P?P.en:c.prop)+(c.pop==='not_in'?' is not ':': ')+vs.map(function(v){ return v[1]; }).join(', ')+(c.when==='recent'?' (most recently)':'')]; }
  if(c.kind==='active') return [(c.not?'فعال نبوده در ':'فعال بوده در ')+winLbl(c.win)[0], (c.not?'Had not been active in ':'Had been active in ')+winLbl(c.win)[1]];
  if(c.kind==='new') return [(c.not?'جدید نبوده در ':'جدید بوده در ')+winLbl(c.win)[0], (c.not?'Had not been new in ':'Had been new in ')+winLbl(c.win)[1]];
  if(c.kind==='cohort'){ var o=byId(c.cid); return [(c.not?'عضو نیست: ':'عضو: ')+'«'+(o?o.fa:'?')+'»', (c.not?'Not part of ':'Part of ')+'“'+(o?o.en:'?')+'”']; }
  var e=evFE(c.ev), w=c.with||'count', a, b;
  if(w==='rel'){ var e2=evFE(c.ev2||'page_view'); a='«'+e[0]+'» '+REL[c.rop||'gt'][0]+' «'+e2[0]+'»'; b='“'+e[1]+'” '+REL[c.rop||'gt'][1]+' “'+e2[1]+'”'; }
  else if(w==='sum'){ P=RB.PROPS[c.prop]||{ fa:c.prop, en:c.prop }; a='«'+e[0]+'» با جمع '+P.fa+' '+COPS[c.op][0]+' '+faN(c.val||0); b='“'+e[1]+'” with a total '+P.en+' '+COPS[c.op][1]+' '+(c.val||0); }
  else if(w==='distinct'){ P=RB.PROPS[c.prop]||{ fa:c.prop, en:c.prop }; a='«'+e[0]+'» با '+COPS[c.op][0]+' '+faN(c.n)+' مقدار متمایز '+P.fa; b='“'+e[1]+'” with '+COPS[c.op][1]+' '+c.n+' distinct '+P.en; }
  else if(w==='hist'){ a='«'+e[0]+'» برای '+NTH[+c.nth||1]+' بار'; b='“'+e[1]+'” for the '+NTH_EN[+c.nth||1]+' time'; }
  else if(w==='interval'){ a='«'+e[0]+'» در '+COPS[c.op||'gte'][0]+' '+faN(c.n)+' روز متفاوت'; b='“'+e[1]+'” on '+COPS[c.op||'gte'][1]+' '+c.n+' different days'; }
  else { a='«'+e[0]+'» '+COPS[c.op][0]+' '+faN(c.n)+' بار'; b='“'+e[1]+'” '+COPS[c.op][1]+' '+c.n+' times'; }
  (c.then||[]).forEach(function(t){ var et=evFE(t.ev); a+=' و بعد «'+et[0]+'»'; b+=' then “'+et[1]+'”'; });
  return [(c.not?'انجام ندادن ':'انجام ')+a+' در '+winLbl(c.win)[0]+((c.where||[]).length?' (با شرط)':''), (c.not?'Did not do ':'Did ')+b+' in '+winLbl(c.win)[1]+((c.where||[]).length?' (filtered)':'')];
}
var MASK=false;
function sentence(def, mask){
  MASK=!!mask; try{ return sentence0(def); } finally{ MASK=false; } }
function sentence0(def){
  var fa_=[], en_=[];
  (def.groups||[]).forEach(function(g){ var t=g.or.map(clauseText); fa_.push(t.map(function(x){ return x[0]; }).join(' یا ')); en_.push(t.map(function(x){ return x[1]; }).join(' or ')); });
  if(def.unit==='org') return ['سازمان‌هایی که '+fa_.join(' و '), 'Organizations where '+en_.join(' and ')];
  return [fa_.join(' و '), en_.join(' and ')];
}
function blankClause(kind){
  if(kind==='prop') return { kind:'prop', prop:'city', pop:'in', vals:['Tehran'], when:'any' };
  if(kind==='active'||kind==='new') return { kind:kind, win:30, not:false };
  if(kind==='cohort'){ var o=store().filter(function(c){ return c.id!==CO.id&&!c.archived; })[0]; return { kind:'cohort', cid:o?o.id:'', not:false }; }
  return { kind:'ev', ev:'page_view', where:[], op:'gte', n:1, win:30, not:false, with:'count', then:[] };
}
/* Amplitude: a new cohort starts with no conditions («هنوز شرطی نیست») and is built with «+ شرط» in the create drawer */
function blankDef(){ return { groups:[] }; }
function hasCond(def){ return !!def && (def.groups||[]).some(function(g){ return g.or.length; }); }

/* definitions for the seeded cohorts (sizes re-pinned from them, so every surface agrees) */
var SEED={
  c1:{ groups:[{ or:[{ kind:'ev', ev:'purchase', where:[], op:'gte', n:2, win:30, not:false }] }] },
  c2:{ groups:[{ or:[{ kind:'ev', ev:'video_completed', where:[], op:'gte', n:1, win:7, not:false }] }] },
  c3:{ groups:[{ or:[{ kind:'ev', ev:'purchase', where:[{ prop:'amount', op:'in', vals:['>700k'] }], op:'gte', n:1, win:90, not:false }] }] }
};
function seed(){
  RBShell.cohortStore().forEach(function(c){
    if(SEED[c.id] && !c.def){ c.def=clone(SEED[c.id]); c.src='builder'; c.stat=false; c.disc=true; pinSize(c, c.def); var s=sentence(c.def); c.defFa=s[0]; c.defEn=s[1]; }
    else if(c.def && c.f==null){ pinSize(c, c.def); var s2=sentence(c.def); c.defFa=s2[0]; c.defEn=s2[1]; }   /* phase 4: another project's own seeded cohort */
    if(c.src==null){ c.src='chart'; } });
}
document.addEventListener('rb:boot', function(){ setTimeout(function(){ seed(); if(RBShell.view()!=='builder') RBShell.rerender(); }, 0); });

function store(){ return RBShell.cohortStore(); }
function byId(id){ return store().filter(function(c){ return c.id===id; })[0]||null; }
function cur(){ return CO.id?byId(CO.id):null; }
function owners(c){ return c?[c.owner].concat(c.owners||[]).filter(function(x,i,a){ return a.indexOf(x)===i; }):['me']; }
function canEdit(c){ return !c || (!VIEWER && owners(c).indexOf('me')>-1) || (VIEWER && c.owner==='me' && c.src==='builder' && c.disc===false); }
/* PM 2026-10-25, conflict 5 (WS-6b / UC-4): archive and unarchive are for an owner or an editor of the cohort's space, never a viewer */
function spaceEditor(c){ var sp=c&&L.space(c.space); if(!sp) return false; if(L.canEditSp) return !!L.canEditSp(sp); return sp.personal?c.owner==='me':((sp.perms||{}).me==='edit'); }
function canArchive(c){ return !!c && !VIEWER && (owners(c).indexOf('me')>-1 || spaceEditor(c)); }
function open(id){ if(!id) return openDrawer();
  if(DR) closeDrawer(true);   /* e.g. the ID-list import launched from the drawer opens the cohort it made */
  var c=id?byId(id):null; CO.id=c?c.id:null; CO.tab='users';
  CO.d=c?{ fa:c.fa, desc:c.desc||'', def:c.def?clone(c.def):null }:{ fa:'', desc:'', def:blankDef() }; CO.dirty=!c; CO.touched=false; if(c) c.views=(c.views||0)+1; guard(); RBShell.go('cohort'); }
/* PM 2026-10-25, UC-14 (conflict 4): leaving the cohort page with unsaved edits asks «تغییرات ذخیره نشده؛ بیرون می‌روید؟» with
   «ذخیره» / «دور ریختن» / «انصراف». A new cohort nobody touched leaves silently. The shell's guard (RBShell.guardLeave) covers its own
   navigation, the project switch and beforeunload; the page's own links go through leave(). Without the shell API, a local
   beforeunload guard stands in. */
function isDirty(){ return RBShell.view()==='cohort' && !!(cur()?CO.dirty:CO.touched); }
function discard(){ var c=cur(); CO.dirty=false; CO.touched=false; if(c) CO.d={ fa:c.fa, desc:c.desc||'', def:c.def?clone(c.def):null }; }
function leave(go){ if(!isDirty()) return go();
  U.modal({ fa:'تغییرات ذخیره‌نشده', en:'Unsaved changes', subFa:'تغییرات این صفحه هنوز ذخیره نشده است. پیش از رفتن، آن‌ها را ذخیره کنید یا دور بریزید.', subEn:'Your changes on this page aren’t saved yet. Save or discard them before you leave.', body:'',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'دور ریختن', en:'Discard', danger:true, fn:function(){ discard(); setTimeout(go, 0); } },{ fa:'ذخیره', en:'Save', fn:function(){ if(!save()) return false; setTimeout(go, 0); } }] }); }
var GUARDED=false;
function guard(){ if(GUARDED) return; GUARDED=true;
  if(typeof RBShell.guardLeave==='function'){ try{ RBShell.guardLeave(isDirty, function(){ return save(); }, { discard:discard }); return; }catch(e){} }   /* PM 2026-10-25, UC-14: «دور ریختن» on a shell navigation resets CO.d */
  window.addEventListener('beforeunload', function(e){ if(isDirty()){ e.preventDefault(); e.returnValue=''; } }); }
/* the demo's membership answer: the cohort the person was opened from always holds them; otherwise a stable draw at the cohort's share */
function inCohort(u, c){ return c.id===CO.from || jit(u.id+c.id)<Math.min(0.9,(c.f||0.2)); }
function openPerson(u, fromCohort, fromView){ CO.person=u; CO.pdev=''; CO.praw=false; CO.ptab='act'; CO.pall=false; CO.pevf=''; CO.ptick={}; CO.pcap=false; CO.pq=''; CO.pev=null; CO.from=fromCohort||null; CO.fromView=fromCohort?'':(fromView||''); CO.check={}; if(fromCohort) CO.check[fromCohort]=true; CO.checked=false; RBShell.go('person'); }

/* ── «کوهورت‌ها»: Amplitude's Cohorts list (m2 design pass 2026-11-15): title with a one-line description; an icon button for a cohort from a
   list of IDs and «کوهورت تازه»; a search, «ویرایشگر ⌄» and «فعال / بایگانی‌شده»; one table card with the count, name, size, owner, last
   change (newest first) and last computed. A milestone cut narrows the list with window.RB_M_COHORT (rb-m1.js). Sizes come from RBShell.cohortCount. ── */
var UPLOAD_IC='<svg viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0M93.66 77.66 120 51.31V144a8 8 0 0 0 16 0V51.31l26.34 26.35a8 8 0 0 0 11.32-11.32l-40-40a8 8 0 0 0-11.32 0l-40 40a8 8 0 0 0 11.32 11.32"/></svg>';   /* Phosphor upload-simple */
function listed(c){ return typeof window.RB_M_COHORT!=='function' || window.RB_M_COHORT(c); }
function cohorts(){ return store().filter(listed); }
function defText(c){ if(c.def){ var s=sentence(c.def, true); return T(s[0], s[1]); } return T(c.defFa||'', c.defEn||c.defFa||''); }
function idsBtn(){ return window.RBId&&RBId.importCsv?'<button class="sh-btn ghost compact rbc-icon" data-coids="1" type="button" title="'+T('ساختن کوهورت از فهرست شناسه‌ها','Create a cohort from a list of IDs')+'" aria-label="'+T('ساختن کوهورت از فهرست شناسه‌ها','Create a cohort from a list of IDs')+'">'+UPLOAD_IC+'</button>':''; }
function newBtn(){ return '<button class="sh-btn primary compact" data-conew="1" type="button">'+ic('plus')+T('کوهورت تازه','New cohort')+'</button>'; }
function listView(){
  var all=cohorts(), f=CO.lf==='arch'?'arch':'active', ed=CO.led||'';
  var eds=[]; all.forEach(function(c){ owners(c).forEach(function(o){ if(eds.indexOf(o)<0) eds.push(o); }); });
  var rows=all.filter(function(c){ return (f==='arch'?!!c.archived:!c.archived) && (!ed||owners(c).indexOf(ed)>-1); }).sort(function(a,b){ return (a.updated||0)-(b.updated||0); });
  var h='<div class="rbc-list"><div class="rbc-lhead"><div class="rbx-head"><span class="rbx-title">'+T('کوهورت‌ها','Cohorts')+'</span><span class="rbx-tipdot"'+tip(CTIPS.list[0],CTIPS.list[1])+'></span><span class="rbx-spacer"></span>'+idsBtn()+newBtn()+'</div>'+
    '<div class="rbx-sub">'+T('گروه‌هایی از کاربران که با کاری که کرده‌اند یا ویژگی‌هایشان تعریف می‌شوند و در نمودارها به کار می‌روند.','Groups of users defined by what they did or who they are, to use in charts.')+'</div></div>';
  if(!all.length) return h+'<div class="sh-card"><div class="sh-state" data-coempty="1"><div class="sh-state-icon">'+ic('users-three')+'</div><div class="sh-state-title">'+T('هنوز کوهورتی نساخته‌اید','You haven’t made a cohort yet')+'</div>'+
    '<div class="sh-state-hint">'+T('کوهورت گروهی از کاربران است که با کاری که کرده‌اند یا ویژگی‌هایشان تعریف می‌شود. اولین کوهورت را بسازید تا در نمودارها از آن استفاده کنید.','A cohort is a group of users defined by what they did or who they are. Create your first one to use it in charts.')+'</div>'+newBtn()+'</div></div></div>';
  var edl=ed?T('ویرایشگر: ','Editor: ')+esc(L.pname(ed)):T('ویرایشگر','Filter by editor');
  h+='<div class="ru-pbar rbc-lbar"><label class="rbx-search ru-psearch">'+ic('magnifying-glass')+'<input id="rbcLq" type="search" aria-label="'+T('جستجوی کوهورت','Search cohorts')+'" placeholder="'+T('جستجوی کوهورت','Search cohorts')+'" value="'+esc(CO.lq||'')+'"/></label>'+
    '<button type="button" class="sh-btn ghost compact rbc-edbtn'+(ed?' on':'')+'" id="rbcLed" aria-haspopup="menu">'+ic('user-circle')+edl+'<span class="rbx-caret" aria-hidden="true">⌄</span></button>'+
    '<span class="rbx-spacer"></span><span class="rbz-seg2 unit" role="tablist" aria-label="'+T('نمایش','Show')+'">'+[['active','فعال','Active'],['arch','بایگانی‌شده','Archived']].map(function(x){ var on=f===x[0]; return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-colf="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</span></div>';
  h+='<div class="sh-card ru-ptcard rbc-ltcard"><div class="rbc-lcount" data-cocount="1"></div>';
  if(!rows.length) return h+'<div class="sh-state"><div class="sh-state-icon">'+ic(f==='arch'?'archive':'users-three')+'</div><div class="sh-state-title">'+(f==='arch'?T('کوهورت بایگانی‌شده‌ای نیست','No archived cohorts'):T('کوهورتی با این ویرایشگر نیست','No cohorts by this editor'))+'</div>'+
    '<div class="sh-state-hint">'+(f==='arch'?T('کوهورتی که بایگانی کنید این‌جا می‌آید و از همین‌جا برمی‌گردد.','A cohort you archive lands here, and comes back from here.'):T('ویرایشگر دیگری انتخاب کنید یا فیلتر را بردارید.','Pick another editor or clear the filter.'))+'</div>'+(ed?'<button type="button" class="sh-btn ghost compact" data-coedclr="1">'+T('برداشتن فیلتر','Clear filter')+'</button>':'')+'</div></div></div>';
  h+='<div class="sh-table-wrap ru-ptwrap"><table class="sh-table rbx-tbl rbc-ltbl"><thead><tr><th>'+T('نام','Name')+'</th><th class="num">'+T('اندازه','Size')+'</th><th>'+T('مالک','Owner')+'</th><th aria-sort="descending">'+T('آخرین تغییر','Last modified')+' <span class="rbc-sort" aria-hidden="true">↓</span></th><th>'+T('آخرین محاسبه','Last computed')+'</th></tr></thead><tbody>'+
    rows.map(function(c){ var dt=defText(c), hay=[c.fa,c.en,dt].join(' ').toLowerCase();
      return '<tr class="click" tabindex="0" role="link" data-colist="'+esc(c.id)+'" data-lq="'+esc(hay)+'" aria-label="'+esc(T('باز کردن کوهورت ','Open cohort ')+T(c.fa,c.en))+'"><td class="nmcell"><span class="rbc-lname"><span class="gi cohort">'+ic(c.src==='ids'?'list-bullets':'users-three')+'</span><span class="rbc-lnb"><b><span class="rbc-lnt">'+esc(T(c.fa,c.en))+'</span>'+(c.stat?'<span class="sh-status neutral dotless">'+T('ثابت','Static')+'</span>':'')+'</b><small title="'+esc(dt)+'">'+esc(dt)+'</small></span></span></td>'+
        '<td class="num"><b class="rbc-lsz">'+num(RBShell.cohortCount(c))+'</b></td>'+
        '<td>'+esc(owners(c).map(function(o){ return L.pname(o); }).join(T('، ',', ')))+'</td><td>'+L.ago(c.updated||0)+'</td><td>'+(c.stat?'<span class="rbc-lu">—</span>':L.ago(c.computedH||0))+'</td></tr>'; }).join('')+
    '</tbody></table></div><div class="sh-state rbc-lnone" data-conone="1" hidden><div class="sh-state-icon">'+ic('magnifying-glass')+'</div><div class="sh-state-title">'+T('کوهورتی با این جستجو پیدا نشد','No cohorts match this search')+'</div><button type="button" class="sh-btn ghost compact" data-coclr="1">'+T('پاک کردن جستجو','Clear search')+'</button></div></div></div>';
  return h;
}
function wireList(root){
  var q=root.querySelector('#rbcLq'), cnt=root.querySelector('[data-cocount]'), none=root.querySelector('[data-conone]'), tbl=root.querySelector('.rbc-ltbl');
  function filt(){ var s=(CO.lq||'').trim().toLowerCase(), k=0; root.querySelectorAll('[data-colist]').forEach(function(tr){ var hit=!s||tr.getAttribute('data-lq').indexOf(s)>-1; tr.hidden=!hit; if(hit) k++; });
    if(cnt) cnt.textContent=T(num(k)+' کوهورت',k+(k===1?' cohort':' cohorts')); if(none) none.hidden=!!k||!tbl; if(tbl) tbl.closest('.sh-table-wrap').hidden=!k; }
  if(q){ q.addEventListener('input', function(){ CO.lq=q.value; filt(); }); }
  filt();
  root.querySelectorAll('[data-colf]').forEach(function(b){ b.addEventListener('click', function(){ CO.lf=b.getAttribute('data-colf'); RBShell.rerender(); }); });
  var cl=root.querySelector('[data-coclr]'); if(cl) cl.addEventListener('click', function(){ CO.lq=''; if(q){ q.value=''; q.focus(); } filt(); });
  var ec=root.querySelector('[data-coedclr]'); if(ec) ec.addEventListener('click', function(){ CO.led=''; RBShell.rerender(); });
  var le=root.querySelector('#rbcLed'); if(le) le.addEventListener('click', function(e){ e.stopPropagation(); var eds=[]; cohorts().forEach(function(c){ owners(c).forEach(function(o){ if(eds.indexOf(o)<0) eds.push(o); }); });
    U.menu(le, [{ icon:'users', fa:'همهٔ ویرایشگرها'+(CO.led?'':' ✓'), en:'All editors'+(CO.led?'':' ✓'), fn:function(){ CO.led=''; RBShell.rerender(); } },{ sep:1 }].concat(eds.map(function(o){ var on=CO.led===o; return { icon:'user-circle', fa:L.pname(o)+(on?' ✓':''), en:L.pname(o)+(on?' ✓':''), fn:function(){ CO.led=o; RBShell.rerender(); } }; })), 'start'); });
  root.querySelectorAll('[data-conew]').forEach(function(b){ b.addEventListener('click', function(){ open(null); }); });
  root.querySelectorAll('[data-coids]').forEach(function(b){ b.addEventListener('click', function(){ RBId.importCsv(); }); });
  root.querySelectorAll('[data-colist]').forEach(function(tr){ var go=function(){ open(tr.getAttribute('data-colist')); };
    tr.addEventListener('click', go); tr.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } }); });
}

/* ── page ── */
function crumb(v){ if(v==='person') return ['پروفایل کاربر','User profile']; if(v==='cohorts') return ['کوهورت‌ها','Cohorts']; var c=cur(); return c?[c.fa,c.en]:['کوهورت جدید','New cohort']; }
function view(v){ return v==='person'?personView():v==='cohorts'?listView():withPage(cohortView); }
/* m2 design pass (2026-11-15), on Amplitude's cohort page: name and description, the definition as condition rows, a size estimate with
   «محاسبه‌شده X پیش» and the population over time in a side column, then the users, compare and used-by tabs. Every data-* hook is kept. */
/* a new cohort (Amplitude's create drawer, the bottom of the drawer): the estimate on a grey band with its type, then a 10-user preview */
function draftBand(d, z, n){
  var has=hasCond(d.def), share=z&&z.base?n/z.base*100:null;
  var h='<section class="rbc-card rbc-est" aria-label="'+T('اندازهٔ تخمینی کوهورت','Estimated cohort size')+'"><div class="rbc-esth"><div class="rbc-estn"><div class="rbc-cardh rbc-ph"><b>'+T('اندازهٔ تخمینی کوهورت','Estimated cohort size')+'</b><span class="rbx-tipdot"'+tip(CTIPS.size[0],CTIPS.size[1])+'></span></div>'+
    '<div class="rbc-num"><b>'+(has?num(n):'—')+'</b><span>'+T('کاربر','users')+'</span></div>'+(has&&share!=null?'<div class="rbc-share"><span>'+T(pct(share)+' از '+num(z.base)+' کاربر فعال در '+winLbl(z.w)[0],pct(share)+' of '+num(z.base)+' active users in '+winLbl(z.w)[1])+'</span></div>':'')+'</div>'+
    '<span class="sh-status good"'+tip(CTIPS.kind[0],CTIPS.kind[1])+'>'+T('پویا','Dynamic')+'</span></div>';
  if(!has||!n) return h+'<div class="sh-state"><div class="sh-state-icon">'+ic('users-three')+'</div><div class="sh-state-title">'+(has?T('هیچ کاربری این شرط‌ها را ندارد','No users meet these conditions'):T('هنوز کاربری برای پیش‌نمایش نیست','No users to preview yet'))+'</div><div class="sh-state-hint">'+(has?T('شرط‌ها را گسترده‌تر کنید یا بازهٔ زمانی را بلندتر کنید.','Loosen the conditions or widen the time window.'):T('یک شرط اضافه کنید تا تعریف کوهورت ساخته شود و کاربرانش این‌جا بیایند.','Add a condition to begin building the cohort definition; its users show up here.'))+'</div></div></section>';
  var rows=people(n, 'draft', 10);
  return h+'<div class="sh-table-wrap rbc-utwrap"><table class="sh-table rbx-tbl rbc-prev"><thead><tr><th>'+T('شناسهٔ کاربر','User ID')+'</th><th>'+T('شناسهٔ شاهین','Shahin ID')+'</th><th>'+T('آخرین فعالیت','Last seen')+'</th><th>'+T('شهر','City')+'</th></tr></thead><tbody>'+
    rows.map(function(u){ var p=window.RBId?RBId.of(u):null; return '<tr><td><span class="ru-uid"><span class="gi person">'+ic('user-circle')+'</span>'+cellOf(u,'id')+'</span></td><td><span class="rbc-mono muted" dir="ltr">'+esc(p?p.shid:'—')+'</span></td><td>'+cellOf(u,'seen')+'</td><td>'+cellOf(u,'city')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    '<div class="rbc-pfoot">'+T(num(1)+' تا '+num(rows.length)+' از '+num(n)+' کاربر','1 to '+rows.length+' of '+num(n)+' users')+'</div></section>';
}
/* the definition card: the cohort page and the create drawer share it (one builder, one wiring) */
function defCard(c, d, ed, ids){
  var h='<section class="rbc-card rbc-defcard" aria-label="'+T('تعریف کوهورت','Cohort definition')+'"><div class="rbc-cardh rbc-ph">'+ic('funnel')+'<b>'+T('تعریف کوهورت','Cohort definition')+'</b><span class="rbx-tipdot"'+tip(CTIPS.def[0],CTIPS.def[1])+'></span>'+
    /* a new cohort can also start from a list of IDs (Amplitude: the new cohort page's CSV upload; PM, 2026-10-25) */
    (!c&&ed&&window.RBId&&RBId.importCsv?'<button class="sh-btn ghost compact rbc-idsbtn" id="rbcIds" type="button">'+ic('list-bullets')+T('ساختن از فهرست شناسه‌ها','Build from a list of IDs')+'</button>':'')+'</div>';
  if(!d.def) h+=ids?'<div class="rbc-ro rbc-roids">'+ic('list-bullets')+'<span>'+esc(T(c.defFa||'',c.defEn||''))+'</span></div><div class="rbz-hint">'+ic('info')+T('این کوهورت از یک فهرست شناسه ساخته شده و ثابت است: همین آدم‌ها می‌مانند و با رفتار تازه عوض نمی‌شود.','This cohort was built from a list of IDs and is static: the same people stay, whatever they do next.')+'</div>':
    '<div class="rbc-ro">'+esc(T(c.defFa||'',c.defEn||''))+'</div><div class="rbz-hint">'+ic('info')+T('این کوهورت از روی یک نمودار ساخته شده و شرط‌هایش این‌جا قابل ویرایش نیست.','This cohort was created from a chart; its conditions can’t be edited here.')+'</div>';
  else { var org=d.def.unit==='org';
    /* Block C (2026-10-24, gap audit 49b G8): a cohort of organizations (Amplitude group cohorts); members of a matching organization are its users */
    h+='<div class="rbc-unit"><span class="rbc-w">'+T('کوهورت از','A cohort of')+'</span><span class="rbz-seg2 unit" role="radiogroup"><button class="'+(org?'':'on')+'" data-counit="user" type="button" role="radio" aria-checked="'+!org+'"'+(ed?'':' disabled')+'>'+T('کاربران','Users')+'</button><button class="'+(org?'on':'')+'" data-counit="org" type="button" role="radio" aria-checked="'+org+'"'+(ed?'':' disabled')+'>'+T('سازمان‌ها','Organizations')+'</button></span>'+
      (org?'<span class="rbx-tipdot"'+tip("<span class='tip-title'>کوهورت سازمان‌ها</span>هر سازمانی که شرط را دارد عضو می‌شود؛ شرط روی کاربرانِ هر سازمان بررسی می‌شود.","<span class='tip-title'>Organization cohort</span>Every organization that meets the condition is a member; the condition is checked on each organization’s users.")+'></span>':'')+'</div>';
    h+=builder(d.def, ed); if(!ed) h+='<div class="rbz-hint">'+ic('info')+T('فقط مالک کوهورت تعریفش را تغییر می‌دهد؛ برای تغییر، یک کپی در فضای شخصی بسازید.','Only the cohort’s owner changes its definition; to change it, make a copy in your personal space.')+'</div>'; }
  return h+'</section>';
}
function sizeTip(){ return [CTIPS.size[0], CTIPS.size[1]]; }
function cohortView(){
  var c=cur(), d=CO.d, ed=canEdit(c), stat=c&&c.stat, z=d.def?sizeOf(d.def):null, n=c&&!CO.dirty?RBShell.cohortCount(c):z?z.n:0;
  var sp=L.space(c?c.space:'me'), ids=c&&c.src==='ids';
  var h='<div class="rbc rbc-co"><button class="rb-linkbtn rbc-back" data-cobk="1" type="button">'+ic(fa()?'arrow-right':'arrow-left')+T('کوهورت‌ها','Cohorts')+'</button>'+
    '<div class="rbc-head"><div class="rbc-title"><span class="gi cohort">'+ic('users-three')+'</span><input class="rbc-name" id="rbcName" value="'+esc(d.fa)+'" placeholder="'+T('کوهورت بی‌نام','Untitled cohort')+'"'+(ed?'':' readonly')+' aria-label="'+T('نام کوهورت','Cohort name')+'"/>'+
      (c?'<span class="sh-status '+(stat?'neutral':'good')+' rbc-kind"'+tip(CTIPS.kind[0],CTIPS.kind[1])+'>'+(stat?T('ثابت','Static'):T('پویا','Dynamic'))+'</span>':'<span class="sh-status neutral dotless rbc-kind">'+T('پیش‌نویس','Draft')+'</span>')+devTag('cohorts')+(CO.dirty&&c?'<span class="rbc-dirty">'+T('تغییرات ذخیره‌نشده','Unsaved changes')+'</span>':'')+'</div>'+
    '<div class="rbc-acts">'+(c?'<button class="sh-btn ghost compact" id="rbcDisc" type="button"'+tip(CTIPS.disc[0],CTIPS.disc[1])+'>'+ic('globe')+(c.disc!==false?T('قابل دیدن برای تیم','Discoverable'):T('فهرست‌نشده','Unlisted'))+'</button>':'')+
      (c?'<button class="sh-btn ghost compact" id="rbcChart" type="button">'+ic('chart-line')+T('ساختن نمودار','Create chart')+'</button>':'')+
      '<button class="sh-btn ghost compact" id="rbcCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button>'+
      (c?'<button class="sh-btn ghost compact rbc-icon" id="rbcMore" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button>':'')+
      (ed?'<button class="sh-btn primary compact" id="rbcSave" type="button"'+((c?CO.dirty:hasCond(d.def))?'':' disabled')+(c?'':' title="'+T('دست‌کم یک شرط لازم است','Add at least one condition')+'"')+'>'+(c?T('ذخیره','Save'):T('ساختن کوهورت','Create cohort'))+'</button>':'<button class="sh-btn compact" id="rbcCopy" type="button">'+ic('copy')+T('کپی در فضای شخصی','Copy to personal space')+'</button>')+'</div></div>'+
    '<div class="rbc-meta"><span>'+esc(T(sp.fa,sp.en))+'</span><span class="rbx-dot"></span><span>'+T(owners(c).length>1?'مالکان: ':'مالک: ',owners(c).length>1?'Owners: ':'Owner: ')+owners(c).map(function(o){ return esc(L.pname(o)); }).join(T('، ',', '))+'</span>'+
      (c?'<span class="rbx-dot"></span><span>'+T('آخرین تغییر ','Updated ')+L.ago(c.updated||0)+'</span>':'')+
      (c&&c.archived?'<span class="rbx-dot"></span><span class="sh-status neutral">'+T('بایگانی‌شده','Archived')+'</span>':'')+'</div>'+
    '<textarea class="sh-input rbc-desc" id="rbcDesc" rows="1" placeholder="'+T('توضیح: این کوهورت برای چیست؟','Description: what is this cohort for?')+'"'+(ed?'':' readonly')+'>'+esc(d.desc)+'</textarea>';
  /* definition */
  h+='<div class="rbc-cogrid'+(c?'':' draft')+'">'+defCard(c, d, ed, ids);
  if(!c){ h+='</div>'+draftBand(d, z, n); return h+'</div>'; }
  /* size + population over time: one side column, as Amplitude's estimate panel */
  var st=sizeTip(), share=z&&z.base?(z.org?z.n/z.base*100:n/z.base*100):null;
  h+='<aside class="rbc-card rbc-size" aria-label="'+T('اندازه','Size')+'"><div class="rbc-cardh rbc-ph">'+ic('users-three')+'<b>'+T('اندازهٔ کوهورت','Cohort size')+'</b><span class="rbx-tipdot"'+tip(st[0],st[1])+'></span></div>'+
    '<div class="rbc-num"><b>'+num(z&&z.org?z.n:n)+'</b><span>'+(z&&z.org?T('سازمان','organizations'):T('کاربر','users'))+'</span></div>'+
    (share!=null?'<div class="rbc-share"><span class="rbc-sbar"><i style="width:'+Math.max(1,Math.min(100,share)).toFixed(1)+'%"></i></span><span>'+(z.org?T(pct(share)+' از '+num(z.base)+' سازمان فعال در '+winLbl(z.w)[0],pct(share)+' of '+num(z.base)+' active organizations in '+winLbl(z.w)[1]):T(pct(share)+' از '+num(z.base)+' کاربر فعال در '+winLbl(z.w)[0],pct(share)+' of '+num(z.base)+' active users in '+winLbl(z.w)[1]))+'</span></div>':'')+
    '<div class="rbc-computed">'+(c&&!CO.dirty?'<span>'+T('محاسبه‌شده ','Computed ')+L.ago(c.computedH||0)+'</span><button class="sh-btn ghost compact rbc-icon" id="rbcRefresh" type="button" title="'+T('محاسبهٔ دوباره','Recompute')+'" aria-label="'+T('محاسبهٔ دوباره','Recompute')+'"'+(stat?' disabled':'')+'>'+ic('arrows-clockwise')+'</button>':
      '<span>'+T('تخمین از شرط‌های فعلی؛ با ذخیره محاسبه می‌شود','Estimate from the current conditions; computed on save')+'</span>')+'</div>'+
    '<div class="rbc-cardh rbc-ph rbc-poph"><b>'+T('اندازه در طول زمان','Population over time')+'</b><span class="rbx-tipdot"'+tip(CTIPS.pop[0],CTIPS.pop[1])+'></span></div>'+
    (stat?'<div class="rbc-empty">'+T('نمایش اندازه در طول زمان برای کوهورت‌های ثابت پشتیبانی نمی‌شود.','Population over time isn’t supported for static cohorts.')+'</div>':
      noPop(d.def)?'<div class="rbc-empty">'+T('اندازه در طول زمان برای شرط «آخرین مقدار» ویژگی کاربر یا بیش از ۱۰ «یا» نمایش داده نمی‌شود.','Population over time isn’t available with a “most recently” user property or more than 10 ORs.')+'</div>':
      n?'<div class="rbc-chart" id="rbcPop"></div>':'<div class="rbc-empty">'+T('هیچ کاربری این شرط‌ها را ندارد.','No users meet these conditions.')+'</div>')+'</aside></div>';
  /* tabs */
  var used=usedBy(c);
  h+='<section class="rbc-card rbc-cotabs"><div class="rbx-tabs rbc-ptabs rbc-tabs" role="tablist">'+[['users','کاربران','Users','users'],['cmp','مقایسه','Compare','swap'],['used','استفاده‌شده در','Used by','link']].map(function(t){ var on=CO.tab===t[0];
    return '<button type="button" role="tab" aria-selected="'+on+'" class="rbx-tab'+(on?' on':'')+'" data-cotab="'+t[0]+'">'+ic(t[3])+T(t[1],t[2])+(t[0]==='used'?'<span class="rbx-tabct">'+num(used.length)+'</span>':'')+'</button>'; }).join('')+'</div>';
  h+=CO.tab==='used'?usedHtml(used):CO.tab==='cmp'?cmpHtml(c, n):usersHtml(n, c?c.id:'draft');
  return h+'</section></div>';
}
function opt(v, cur, fa_, en_, dis){ return '<option value="'+v+'"'+(String(cur)===String(v)?' selected':'')+(dis?' disabled':'')+'>'+T(fa_,en_)+'</option>'; }
function winSel(k, c, dis){
  var sv=isSince(c.win)?'since':c.win, sl=winLbl(isSince(c.win)?c.win:'since');
  return '<select class="sh-select" data-cwin="'+k+'"'+dis+'>'+WIN_GRP.map(function(g){ return '<optgroup label="'+T(g[1],g[2])+'">'+g[3].map(function(w){ return w==='since'?opt(w, sv, sl[0], sl[1]):opt(w, sv, WIN[w][0], WIN[w][1]); }).join('')+'</optgroup>'; }).join('')+'</select>'+
    /* UC-13: the start day of «از تاریخ» comes from the shared Jalali picker; without it the demo keeps its sample start */
    (isSince(c.win)&&!dis&&typeof RBShell.datePicker==='function'?'<button class="rbz-inlink" data-csince="'+k+'" type="button">'+T('انتخاب تاریخ شروع','Pick the start date')+'</button>':'');
}
function evBtn(attr, id, dis){ return '<button class="rbz-evname" '+attr+' type="button"'+dis+'><span class="rbz-evic">'+RBAmp.evIcon(id)+'</span><span class="nm">'+esc(RBAmp.evName(id))+'</span><code>'+esc(id)+'</code><span class="rbz-car">⌄</span></button>'; }
function propSel(k, c, list, dis){ return '<select class="sh-select" data-cpr="'+k+'"'+dis+'>'+list.map(function(p){ return opt(p, c.prop, RB.PROPS[p].fa, RB.PROPS[p].en); }).join('')+'</select>'; }
function delBtn(k){ return '<button class="rbz-ico rbc-del" data-cdel="'+k+'" type="button" aria-label="'+T('حذف شرط','Remove condition')+'" title="'+T('حذف شرط','Remove condition')+'">'+ic('trash')+'</button>'; }
function clauseRow(c, k, ed){
  var dis=ed?'':' disabled', h='<div class="rbc-cl'+(c.kind==='ev'?' ev':'')+'">', x=function(attr){ return '<button '+attr+' type="button" aria-label="'+T('حذف','Remove')+'">×</button>'; };
  if(c.kind==='prop'){ var P=RB.PROPS[c.prop]||{ vals:[] };
    h+='<span class="rbc-w">'+T('ویژگی کاربر','User property')+'</span><select class="sh-select" data-cprop="'+k+'"'+dis+'>'+Object.keys(RB.PROPS).filter(function(p){ return SEG_GRPS.indexOf(RB.PROPS[p].grp)>-1; }).map(function(p){ return opt(p, c.prop, RB.PROPS[p].fa, RB.PROPS[p].en); }).join('')+'</select>'+
      '<select class="sh-select" data-cpop="'+k+'"'+dis+'>'+opt('in', c.pop||'in','هست','is')+opt('not_in', c.pop,'نیست','is not')+'</select>'+
      '<span class="rbc-vals">'+P.vals.map(function(v){ var on=(c.vals||[]).indexOf(v[1])>-1; return '<button type="button" class="rbc-val'+(on?' on':'')+'" data-cval="'+k+'" data-v="'+esc(v[1])+'"'+dis+'>'+esc(DV(c.prop, v))+'</button>';   /* LX-15 */ }).join('')+'</span>'+
      '<select class="sh-select" data-cwhen="'+k+'"'+dis+'>'+opt('any', c.when||'any','در هر زمانی از بازه','Any time')+opt('recent', c.when,'آخرین مقدار','Most recently')+'</select>';
  } else if(c.kind==='active'||c.kind==='new'){ var nw=c.kind==='new';
    h+='<select class="sh-select" data-cnot="'+k+'"'+dis+'>'+opt(0, c.not?1:0, nw?'جدید بوده':'فعال بوده', nw?'had been new':'had been active')+opt(1, c.not?1:0, nw?'جدید نبوده':'فعال نبوده', nw?'had not been new':'had not been active')+'</select><span class="rbc-w">'+T('در','in')+'</span>'+winSel(k, c, dis);
  } else if(c.kind==='cohort'){ var others=store().filter(function(o){ return o.id!==CO.id&&!o.archived; });
    h+='<select class="sh-select" data-cnot="'+k+'"'+dis+'>'+opt(0, c.not?1:0,'عضو این کوهورت هستند','are part of')+opt(1, c.not?1:0,'عضو این کوهورت نیستند','are not part of')+'</select>'+
      '<select class="sh-select" data-ccoh="'+k+'"'+dis+'>'+others.map(function(o){ return opt(o.id, c.cid, o.fa, o.en); }).join('')+'</select>';
  } else {
    var w=c.with||'count', props=RBAmp.propsOf(c.ev).filter(function(p){ return RB.PROPS[p]; }), nums=props.filter(function(p){ return RB.PROPS[p].num; });
    h+='<div class="rbc-l1"><select class="sh-select" data-cnot="'+k+'"'+dis+'>'+opt(0, c.not?1:0,'انجام داده‌اند','did')+opt(1, c.not?1:0,'انجام نداده‌اند','did not do')+'</select>'+evBtn('data-cev="'+k+'"', c.ev, dis)+(ed?delBtn(k):'')+'</div>'+
      '<div class="rbc-sub"><select class="sh-select" data-cwith="'+k+'"'+dis+' aria-label="'+T('سنجش','Measured by')+'">'+WITH.map(function(o){ var no=(o[0]==='sum'&&!nums.length)||(o[0]==='distinct'&&!props.length); return opt(o[0], w, o[1]+(no?' (ویژگی ندارد)':''), o[2]+(no?' (no property)':''), no); }).join('')+'</select>';
    if(w==='rel') h+='<select class="sh-select" data-crop="'+k+'"'+dis+'>'+Object.keys(REL).map(function(o){ return opt(o, c.rop||'gt', REL[o][0], REL[o][1]); }).join('')+'</select>'+evBtn('data-cev2="'+k+'"', c.ev2||'page_view', dis);
    else if(w==='sum') h+=propSel(k, c, nums, dis)+'<select class="sh-select rbc-op" data-cop="'+k+'"'+dis+'>'+opt('gte', c.op,'دست‌کم','at least')+opt('lte', c.op,'حداکثر','at most')+'</select><input class="sh-input rbc-v" type="number" min="0" value="'+(+c.val||0)+'" data-cval2="'+k+'"'+dis+'/>';
    else if(w==='hist') h+='<span class="rbc-w">'+T('برای','for the')+'</span><select class="sh-select" data-cnth="'+k+'"'+dis+'>'+[1,2,3,4,5].map(function(i){ return opt(i, c.nth||1, NTH[i]+' بار', NTH_EN[i]+' time'); }).join('')+'</select>';
    else { if(w==='distinct') h+=propSel(k, c, props, dis);
      h+='<select class="sh-select rbc-op" data-cop="'+k+'"'+dis+'>'+Object.keys(COPS).map(function(o){ return opt(o, c.op, COPS[o][0], COPS[o][1]); }).join('')+'</select>'+
        '<input class="sh-input rbc-n" type="number" min="1" max="999" value="'+(+c.n||1)+'" data-cn="'+k+'" aria-label="'+T('تعداد','Count')+'"'+dis+'/><span class="rbc-w">'+(w==='distinct'?T('مقدار متمایز','distinct values'):w==='interval'?T('روز متفاوت','different days'):T('بار','times'))+'</span>'; }
    h+='</div><div class="rbc-sub">'+ic('calendar-blank')+'<span class="rbc-w">'+T('در','during')+'</span>'+winSel(k, c, dis)+'</div>';
  }
  if(ed&&c.kind!=='ev') h+=delBtn(k);
  if(c.kind==='ev'){ h+='<div class="rbc-where">';
    (c.where||[]).forEach(function(f,fi){ h+='<span class="rbz-chip">'+ic('funnel')+'<span>'+esc(RBAmp.fltLabel(f))+'</span>'+(ed?x('data-cwdel="'+k+':'+fi+'"'):'')+'</span>'; });
    (c.then||[]).forEach(function(t,ti){ h+='<span class="rbz-chip act">'+ic('arrow-'+(fa()?'left':'right'))+'<span>'+T('و بعد: ','then: ')+esc(RBAmp.evName(t.ev))+'</span>'+(ed?x('data-cthdel="'+k+':'+ti+'"'):'')+'</span>'; });
    if(ed) h+='<button class="rbz-inlink" data-cwhere="'+k+'" type="button">+ '+T('فیلتر','Filter')+'</button><button class="rbz-inlink" data-cthen="'+k+'" type="button">+ '+T('و بعد','Then')+'</button>';
    h+='</div>';
    if(w==='hist'&&(c.ev==='_any'||c.ev==='_any_active')) h+='<div class="rbz-hint">'+ic('info')+T('شمارش تاریخی روی «هر ایونت» کوهورت را ثابت می‌کند.','Historical count on Any event makes the cohort static.')+'</div>';
  }
  return h+'</div>';
}
function builder(def, ed){
  /* Amplitude: «کاربرانی که» once, then one row per condition joined by «و»; the options inside a row are joined by «یا» */
  var h='<div class="rbc-def"><div class="rbc-lead">'+(def.unit==='org'?T('سازمان‌هایی که کاربرانشان این شرط‌ها را دارند','Organizations whose users match these conditions'):T('کاربرانی که این شرط‌ها را دارند','Users who match these conditions'))+'</div><div class="rbc-defbox">';
  if(!def.groups.length) h+='<div class="rbc-none">'+ic('funnel')+'<span>'+T('هنوز شرطی نیست؛ از پایین یکی اضافه کنید.','No conditions yet; add one below.')+'</span></div>';
  def.groups.forEach(function(g, gi){
    if(gi) h+='<div class="rbc-and"><span>'+T('و','and')+'</span></div>';
    h+='<div class="rbc-grp">';
    g.or.forEach(function(c, ci){ if(ci) h+='<div class="rbc-or"><span>'+T('یا','or')+'</span></div>'; h+=clauseRow(c, gi+':'+ci, ed); });
    if(ed) h+='<button class="rbz-inlink rbc-oradd" data-cor="'+gi+'" type="button">'+ic('plus')+T('یا','or')+'</button>';
    h+='</div>';
  });
  h+='</div>';
  if(ed) h+='<button class="rbz-add" id="rbcAdd" type="button">'+ic('plus')+(def.groups.length?T('و','AND'):T('شرط','Condition'))+'</button>';
  return h+'</div>';
}
function usedBy(c){
  if(!c) return [];
  var out=[]; RB.SAVED.forEach(function(s,i){ var a=s.q&&s.q.amp; if(a&&(a.segments||[]).some(function(g){ return g.cohort===c.id; })) out.push({ i:i, fa:s.fa, en:s.en, type:s.type }); });
  /* Block C (2026-10-24): other cohorts whose definition uses this one («عضو کوهورت دیگر») — Amplitude Used by ▸ Cohorts */
  store().forEach(function(o){ if(o.id===c.id||o.archived||!o.def) return; var hit=(o.def.groups||[]).some(function(g){ return (g.or||[]).some(function(x){ return x.kind==='cohort'&&x.cid===c.id; }); });
    if(hit) out.push({ cohort:o.id, fa:o.fa, en:o.en }); });
  return out;
}
function usedHtml(used){
  if(!used.length) return '<div class="rbc-empty">'+T('هنوز هیچ گزارشی از این کوهورت استفاده نکرده است. در گزارش‌ساز، در «گروه‌های کاربران» گزینهٔ «+ در کوهورت» را بزنید.','No chart uses this cohort yet. In the report builder, pick “+ In cohort” under user segments.')+'</div>';
  var ch=used.filter(function(u){ return u.cohort==null; }), co=used.filter(function(u){ return u.cohort!=null; });
  return (ch.length?'<div class="rbc-cardh"><b>'+T('گزارش‌ها','Charts')+'</b><span class="rbx-tipdot"'+tip(CTIPS.used[0],CTIPS.used[1])+'></span></div><div class="rbc-used">'+ch.map(function(u){ return '<button class="rbx-rrow" data-coreport="'+u.i+'" type="button"><span class="gi report">'+ic('chart-line')+'</span><span class="t">'+esc(T(u.fa,u.en))+'</span></button>'; }).join('')+'</div>':'')+
    (co.length?'<div class="rbc-cardh"><b>'+T('کوهورت‌ها','Cohorts')+'</b></div><div class="rbc-used" data-usedco="1">'+co.map(function(u){ return '<button class="rbx-rrow" data-copen="'+u.cohort+'" type="button"><span class="gi cohort">'+ic('users-three')+'</span><span class="t">'+esc(T(u.fa,u.en))+'</span></button>'; }).join('')+'</div>':'');
}
/* users: a sample of the cohort's browsers/devices, same generator as the builder's Microscope */
function people(n, seed, max){
  var B=RB.PROPS.browser.vals, R=RB.PROPS.referrer_type.vals;
  return RBAmp.users(n, 'co'+seed, max).map(function(u,i){ return Object.assign(u, { browser:B[Math.floor(jit(seed+'b',i)*B.length)%B.length], ref:R[Math.floor(jit(seed+'r',i)*R.length)%R.length], sess:1+Math.floor(jit(seed+'s',i)*14) }); });
}
/* PM 2026-10-25, LX-15: the users table and its CSV mask Personal and Sensitive columns for a member, as charts do */
var COLPROP={ city:'city', dev:'device_type', browser:'browser', ref:'referrer_type' };
function cellOf(u, k){ return k==='id'?'<span dir="ltr">'+(window.RBId?esc(RBId.label(u)):u.id)+'</span>':k==='seen'?T(num(u.ago)+' ساعت پیش',u.ago+' h ago'):k==='sess'?num(u.sess):esc(COLPROP[k]?DV(COLPROP[k], u[k]):T(u[k][0],u[k][1])); }
function usersHtml(n, seed){
  if(!n) return '<div class="rbc-empty">'+T('کاربری برای نمایش نیست.','No users to show.')+'</div>';
  var rows=people(n, seed, 20);
  return '<div class="rbc-uhead"><span>'+T('نمایش '+num(rows.length)+' از '+num(n)+' کاربر','Showing '+rows.length+' of '+num(n)+' users')+'</span><span class="rbx-spacer"></span><button class="rbz-pill" id="rbcCols" type="button">'+T('ستون‌ها','Columns')+' ⌄</button></div>'+
    '<div class="sh-table-wrap rbc-utwrap"><table class="sh-table rbx-tbl rbc-users"><thead><tr>'+CO.cols.map(function(k){ var c=COLS.filter(function(x){ return x[0]===k; })[0]; return '<th>'+T(c[1],c[2])+'</th>'; }).join('')+'</tr></thead><tbody>'+
    rows.map(function(u,i){ return '<tr tabindex="0" data-person="'+i+'">'+CO.cols.map(function(k){ return '<td>'+cellOf(u,k)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>'+
    '<div class="rbz-tnote">'+T('روی هر ردیف بزنید تا پروفایل و ایونت‌های آن کاربر را ببینید.','Click a row to see that user’s profile and events.')+'</div>';
}
/* PM 2026-10-25, UC-8: as in Amplitude, the export holds up to 1 million users; a large list is sent by email instead of downloaded.
   The file and the message always say how many users were exported out of the total. The direct-download size is a demo value. */
var EXPORT_CAP=1000000, DIRECT_MAX=5000;
function csv(){
  var c=cur(), n=c&&!CO.dirty?RBShell.cohortCount(c):sizeOf(CO.d.def||{ groups:[] }).n, out=Math.min(n, EXPORT_CAP);
  if(out>DIRECT_MAX){ U.toast('فهرست بزرگ است؛ فایل '+num(out)+' از '+num(n)+' کاربر به ایمیل شما فرستاده می‌شود', 'The list is large; a file of '+num(out)+' of '+num(n)+' users is sent to your email'); return; }
  var rows=people(n, c?c.id:'draft', out), q=function(x){ return '"'+String(x).replace(/"/g,'""').replace(/<[^>]+>/g,'')+'"'; };
  /* the header stays the first row; the exported-of-total count is in the file name and the toast */
  var lines=[CO.cols.map(function(k){ var cc=COLS.filter(function(x){ return x[0]===k; })[0]; return q(T(cc[1],cc[2])); }).join(',')].concat(rows.map(function(u){ return CO.cols.map(function(k){ return q(cellOf(u,k)); }).join(','); }));
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='cohort-users-'+rows.length+'-of-'+n+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  U.toast('فهرست کاربران دانلود شد؛ '+num(rows.length)+' از '+num(n)+' کاربر', 'User list downloaded; '+rows.length+' of '+n+' users');
}
/* population over time: the size each day if computed that day (dynamic cohorts move with the window) */
function popSeries(n, seed){ var out=[]; for(var i=29;i>=0;i--){ var t=(29-i)/29; out.push(i===0?n:Math.round(n*(0.82+0.18*t)*(0.95+0.1*jit(seed+'p',i)))); } return out; }
function drawPop(n, seed, root){
  var el=(root||document).querySelector('#rbcPop'); if(!el||!window.echarts) return;
  var cs=getComputedStyle(document.body), TX=cs.getPropertyValue('--sh-text').trim(), MU=cs.getPropertyValue('--sh-muted').trim(), BD=cs.getPropertyValue('--sh-border').trim(), SF=cs.getPropertyValue('--sh-surface').trim(), C1=cs.getPropertyValue('--sh-c1').trim(), FONT=cs.fontFamily;
  var v=popSeries(n, seed), lab=[], f1=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'short' }), f2=new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' });
  for(var i=29;i>=0;i--){ var d=new Date(2026,6,27-i); lab.push(T(f1.format(d),f2.format(d))); }
  var ch=echarts.init(el);
  ch.setOption({ animationDuration:300, grid:{ left:fa()?16:8, right:fa()?8:16, top:12, bottom:8, containLabel:true },
    tooltip:{ trigger:'axis', backgroundColor:SF, borderColor:BD, textStyle:{ color:TX, fontFamily:FONT }, confine:true, valueFormatter:function(x){ return num(x)+T(' کاربر',' users'); } },
    xAxis:{ type:'category', data:lab, inverse:fa(), boundaryGap:false, axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true } },
    yAxis:{ type:'value', min:0, position:fa()?'right':'left', splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(x){ return num(x); } } },
    series:[{ type:'line', data:v, symbol:'none', smooth:false, lineStyle:{ width:2.5, color:C1 }, areaStyle:{ color:C1, opacity:.08 } }] });
  el.style.filter='saturate(.72)';
  window.addEventListener('resize', function(){ ch.resize(); }, { once:true });
}

/* ── the create drawer (PM decision 2026-11-16, Amplitude «New Cohort»): a dialog from the inline-end side over a dimmed page, about 60%
   of the width (a full-screen sheet below 760px). Header: where it saves, «پیش‌نویس», «ساختن کوهورت» (disabled until a condition exists), ×,
   then the name and description. Body: the same definition card and builder as the cohort page, then the estimate band. The draft lives in
   CO while the drawer is open; the page underneath (often a cohort page) is stashed and comes back on cancel. Esc, × and a click on the
   dimmed page close it, asking first when something was added. ── */
var DR=null, DROV=null, STASH=null, DRRET=null;
function pageState(){ return { id:CO.id, d:CO.d, dirty:CO.dirty, touched:CO.touched, tab:CO.tab }; }
function setState(x){ CO.id=x.id; CO.d=x.d; CO.dirty=x.dirty; CO.touched=x.touched; CO.tab=x.tab; }
/* the shell's page renders and wires from the stashed page state while the drawer holds the draft */
function withPage(fn){ if(!DR||!STASH) return fn(); var dr=pageState(); setState(STASH); try{ return fn(); } finally{ STASH=pageState(); setState(dr); } }
function drawerHtml(){
  var d=CO.d, z=d.def?sizeOf(d.def):null, n=z?z.n:0, sp=L.space('me'), ok=hasCond(d.def);
  return '<div class="rbc-drh"><div class="rbc-drtop"><span class="rbc-drsp" title="'+T('کوهورت در فضای شخصی شما ذخیره می‌شود','The cohort is saved to your personal space')+'">'+ic('folder-simple')+'<span>'+esc(T(sp.fa,sp.en))+'</span></span>'+
      '<span class="sh-status neutral dotless rbc-kind">'+T('پیش‌نویس','Draft')+'</span><span class="rbx-spacer"></span>'+
      '<button class="sh-btn primary compact" id="rbcSave" type="button"'+(ok?'':' disabled title="'+T('دست‌کم یک شرط لازم است','Add at least one condition')+'"')+'>'+T('ساختن کوهورت','Create cohort')+'</button>'+
      '<button class="rbx-mx rbc-drx" data-drx="1" type="button" aria-label="'+T('بستن','Close')+'" title="'+T('بستن','Close')+'">×</button></div>'+
    '<div class="rbc-title"><span class="gi cohort">'+ic('users-three')+'</span><input class="rbc-name" id="rbcName" value="'+esc(d.fa)+'" placeholder="'+T('کوهورت بی‌نام','Untitled cohort')+'" aria-label="'+T('نام کوهورت','Cohort name')+'"/></div>'+
    '<input class="rbc-drdesc" id="rbcDesc" value="'+esc(d.desc)+'" placeholder="'+T('توضیح بنویسید','Enter a description')+'" aria-label="'+T('توضیح کوهورت','Cohort description')+'"/></div>'+
    '<div class="rbc-drbody" data-drbody="1"><div class="rbc-cogrid draft">'+defCard(null, d, true, false)+'</div>'+draftBand(d, z, n)+'</div>';
}
/* a stable selector for the focused control, so a re-render keeps focus (and the keyboard) where it was */
function focusKey(el){ if(!el||!DR||!DR.contains(el)) return null; if(el.id) return '#'+el.id;
  for(var i=0;i<el.attributes.length;i++){ var a=el.attributes[i]; if(/^data-/.test(a.name)) return '['+a.name+'="'+a.value.replace(/"/g,'\\"')+'"]'; } return null; }
function renderDrawer(){
  if(!DR) return; var bd=DR.querySelector('[data-drbody]'), top=bd?bd.scrollTop:0, fk=focusKey(document.activeElement);
  DR.innerHTML=drawerHtml(); bd=DR.querySelector('[data-drbody]'); if(bd) bd.scrollTop=top;
  wireCohort(DR);
  DR.querySelector('[data-drx]').addEventListener('click', requestClose);
  U.i18n();
  var f=fk&&DR.querySelector(fk); if(f&&!f.disabled) f.focus({ preventScroll:true }); else if(fk&&!DR.contains(document.activeElement)) DR.querySelector('[data-drx]').focus();
  /* a menu item or a modal (event picker, filter) that changed the draft is gone by now: bring focus back to «+ و» in the drawer */
  setTimeout(function(){ if(DR&&!DR.contains(document.activeElement)&&!layerOpen()){ var a=DR.querySelector('#rbcAdd')||DR.querySelector('#rbcName'); if(a) a.focus({ preventScroll:true }); } }, 200);
}
function focusables(){ return [].slice.call(DR.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(e){ return e.getClientRects().length; }); }
/* while a modal (event picker, filter, confirm, ID import) or a menu is up, Esc and Tab belong to it */
function layerOpen(){ return !!document.querySelector('.rbx-ov,.rbx-menu'); }
function onDrKey(e){
  if(!DR) return;
  if(e.key==='Escape'){ if(layerOpen()) return; e.preventDefault(); e.stopPropagation(); requestClose(); return; }
  if(e.key==='Tab' && !document.querySelector('.rbx-ov')){ var f=focusables(); if(!f.length) return; var a=document.activeElement, i=f.indexOf(a);
    if(!DR.contains(a)){ e.preventDefault(); f[0].focus(); }
    else if(e.shiftKey&&i===0){ e.preventDefault(); f[f.length-1].focus(); }
    else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } }
}
function openDrawer(){
  if(DR){ var n0=DR.querySelector('#rbcName'); if(n0) n0.focus(); return; }
  DRRET=document.activeElement; STASH=pageState();
  CO.id=null; CO.tab='users'; CO.d={ fa:'', desc:'', def:blankDef() }; CO.dirty=true; CO.touched=false; guard();
  DROV=document.createElement('div'); DROV.className='rbc-drov';
  DR=document.createElement('aside'); DR.className='rbc-dr rbc rbc-co'; DR.setAttribute('role','dialog'); DR.setAttribute('aria-modal','true'); DR.setAttribute('aria-label', T('کوهورت جدید','New cohort'));
  document.body.appendChild(DROV); document.body.appendChild(DR);
  DROV.addEventListener('mousedown', function(e){ if(e.target===DROV) requestClose(); });
  document.addEventListener('keydown', onDrKey, true);
  renderDrawer();
  requestAnimationFrame(function(){ if(DR){ DR.classList.add('show'); DROV.classList.add('show'); } });
  setTimeout(function(){ var n=DR&&DR.querySelector('#rbcName'); if(n) n.focus({ preventScroll:true }); }, 40);
}
/* × / Esc / the dimmed page: a draft with something in it asks first (the app's confirm), an empty one just closes */
function requestClose(){ if(!DR) return; var d=CO.d;
  if(!(hasCond(d.def)||d.fa||d.desc)) return closeDrawer();
  U.confirmBox({ fa:'این کوهورت ساخته نشده', en:'Discard this cohort?', bodyFa:'شرط‌ها و نامی که وارد کرده‌اید ذخیره نشده‌اند و با بستن از بین می‌روند.', bodyEn:'The conditions and name you entered aren’t saved and will be lost when you close.',
    okFa:'دور ریختن', okEn:'Discard', tone:'bad', fn:function(){ setTimeout(function(){ closeDrawer(); }, 0); } }); }
/* kept=true: the draft became a cohort (or another cohort opens), so the stashed page isn't restored and focus goes where the caller sends it */
function closeDrawer(kept){
  if(!DR) return; var dr=DR, ov=DROV; DR=null; DROV=null;
  document.removeEventListener('keydown', onDrKey, true);
  if(!kept && STASH) setState(STASH); STASH=null;
  dr.classList.remove('show'); ov.classList.remove('show');
  var gone=function(){ dr.remove(); ov.remove(); };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) gone(); else setTimeout(gone, 220);
  if(kept) return;
  var r=DRRET; DRRET=null;
  if(!r||r===document.body||!document.contains(r)||!r.getClientRects().length) r=[].slice.call(document.querySelectorAll('#rbxCreate,[data-conew],[data-scadd],[data-pconew],[data-newcohort]')).filter(function(e){ return e.getClientRects().length; })[0];
  if(r) r.focus();
}

/* ── wiring ── */
/* "+ Add" components (Amplitude: event, property, cohort, new user; propensity is out of scope) */
function addItems(fn){ var others=store().filter(function(o){ return o.id!==CO.id&&!o.archived; }).length;
  return [{ icon:'globe', fa:'ایونت انجام‌شده', en:'Performed event', fn:function(){ fn('ev'); } },{ icon:'user-circle', fa:'ویژگی کاربر', en:'User property', fn:function(){ fn('prop'); } },
    { icon:'monitor', fa:'کاربر فعال بوده', en:'Had been active', fn:function(){ fn('active'); } },{ icon:'user-circle', fa:'کاربر جدید بوده', en:'Had been new', fn:function(){ fn('new'); } },
    { icon:'users-three', fa:'عضو کوهورت دیگر', en:'Part of another cohort', disabled:!others, hint:others?null:['کوهورت دیگری نیست','No other cohort'], fn:function(){ fn('cohort'); } }]; }
function changed(){ CO.dirty=true; CO.touched=true; refresh(); }
/* re-render where the cohort is being edited: the create drawer when it is open, otherwise the shell's page */
function refresh(){ if(DR) renderDrawer(); else RBShell.rerender(); }
function at(k){ var p=k.split(':'); return { g:+p[0], c:+p[1], cl:CO.d.def.groups[+p[0]].or[+p[1]] }; }
function wire(root){
  guard();
  if(RBShell.view()==='person') return wirePerson(root);
  if(RBShell.view()==='cohorts') return wireList(root);
  withPage(function(){ wireCohort(root); });
}
/* the cohort page's and the create drawer's controls; lookups stay inside root (the drawer can sit over a cohort page with the same ids) */
function wireCohort(root){
  var $=function(id){ return root.querySelector('#'+id); };
  var q=function(s){ return root.querySelector(s); }, c=cur(), d=CO.d;
  var bk=q('[data-cobk]'); if(bk) bk.addEventListener('click', function(){ leave(function(){ RBShell.go('cohorts'); }); });
  var ids=$('rbcIds'); if(ids) ids.addEventListener('click', function(){ RBId.importCsv(); });
  root.querySelectorAll('[data-counit]').forEach(function(b){ b.addEventListener('click', function(){ if(!d.def) return; d.def.unit=b.getAttribute('data-counit')==='org'?'org':''; CO.dirty=true; CO.touched=true; refresh(); }); });
  root.querySelectorAll('[data-usedco] [data-copen]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-copen'); leave(function(){ open(id); }); }); });
  var nm=$('rbcName'); if(nm) nm.addEventListener('change', function(){ d.fa=nm.value.trim(); CO.dirty=true; CO.touched=true; var s=$('rbcSave'); if(s) s.disabled=!(c||hasCond(d.def)); });
  var ds=$('rbcDesc'); if(ds) ds.addEventListener('change', function(){ d.desc=ds.value; CO.dirty=true; CO.touched=true; var s=$('rbcSave'); if(s) s.disabled=!(c||hasCond(d.def)); });
  root.querySelectorAll('[data-cotab]').forEach(function(b){ b.addEventListener('click', function(){ CO.tab=b.getAttribute('data-cotab'); refresh(); }); });
  root.querySelectorAll('[data-coreport]').forEach(function(b){ b.addEventListener('click', function(){ var i=+b.getAttribute('data-coreport'); leave(function(){ RBShell.openReport(i); }); }); });
  /* UC-13: the start day of «از تاریخ» from the shared picker */
  root.querySelectorAll('[data-csince]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var x=at(b.getAttribute('data-csince')); pickSince(b, sinceIso(x.cl.win), function(iso){ x.cl.win='since:'+iso; changed(); }); }); });
  /* builder */
  root.querySelectorAll('[data-cev]').forEach(function(b){ b.addEventListener('click', function(){ var x=at(b.getAttribute('data-cev')); RBAmp.pickEvent(function(id){ x.cl.ev=id; x.cl.where=[]; changed(); }); }); });
  root.querySelectorAll('[data-cev2]').forEach(function(b){ b.addEventListener('click', function(){ var x=at(b.getAttribute('data-cev2')); RBAmp.pickEvent(function(id){ x.cl.ev2=id; changed(); }); }); });
  root.querySelectorAll('[data-cthen]').forEach(function(b){ b.addEventListener('click', function(){ var x=at(b.getAttribute('data-cthen')); RBAmp.pickEvent(function(id){ (x.cl.then=x.cl.then||[]).push({ ev:id }); changed(); }); }); });
  root.querySelectorAll('[data-cthdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-cthdel').split(':'); d.def.groups[+p[0]].or[+p[1]].then.splice(+p[2],1); changed(); }); });
  [['data-cnot',function(cl,v){ cl.not=v==='1'; }],['data-cop',function(cl,v){ cl.op=v; }],['data-cwin',function(cl,v){ cl.win=/^\d+$/.test(v)?+v:v; }],['data-cn',function(cl,v){ cl.n=Math.max(1,Math.min(999,parseInt(v,10)||1)); }],
   ['data-cwith',function(cl,v){ cl.with=v; if(v==='sum'||v==='distinct'){ var ps=RBAmp.propsOf(cl.ev).filter(function(p){ return RB.PROPS[p]&&(v==='distinct'||RB.PROPS[p].num); }); cl.prop=ps[0]||''; } if(v==='sum'){ cl.op='gte'; cl.val=Math.round(numMean(cl.prop)); } if(v==='rel'){ cl.ev2=cl.ev2||'page_view'; cl.rop='gt'; } if(v==='hist') cl.nth=1; if(v==='interval'){ cl.op='gte'; cl.n=Math.max(2,cl.n||2); } }],
   ['data-crop',function(cl,v){ cl.rop=v; }],['data-cpr',function(cl,v){ cl.prop=v; }],['data-cval2',function(cl,v){ cl.val=Math.max(0,+v||0); }],['data-cnth',function(cl,v){ cl.nth=+v; }],
   ['data-ccoh',function(cl,v){ cl.cid=v; }],['data-cwhen',function(cl,v){ cl.when=v; }],
   ['data-cprop',function(cl,v){ cl.prop=v; cl.vals=[RB.PROPS[v].vals[0][1]]; }],['data-cpop',function(cl,v){ cl.pop=v; }]].forEach(function(p){
    root.querySelectorAll('['+p[0]+']').forEach(function(el){ el.addEventListener('change', function(){ p[1](at(el.getAttribute(p[0])).cl, el.value); changed(); }); }); });
  root.querySelectorAll('[data-cval]').forEach(function(b){ b.addEventListener('click', function(){ var cl=at(b.getAttribute('data-cval')).cl, v=b.getAttribute('data-v'), i=cl.vals.indexOf(v);
    if(i>-1){ if(cl.vals.length===1) return; cl.vals.splice(i,1); } else cl.vals.push(v); changed(); }); });
  root.querySelectorAll('[data-cdel]').forEach(function(b){ b.addEventListener('click', function(){ var x=at(b.getAttribute('data-cdel')), g=d.def.groups[x.g]; g.or.splice(x.c,1); if(!g.or.length) d.def.groups.splice(x.g,1); changed(); }); });
  root.querySelectorAll('[data-cwhere]').forEach(function(b){ b.addEventListener('click', function(){ var cl=at(b.getAttribute('data-cwhere')).cl; RBAmp.filterModal(cl.ev, function(f){ (cl.where=cl.where||[]).push(f); changed(); }); }); });
  root.querySelectorAll('[data-cwdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-cwdel').split(':'); d.def.groups[+p[0]].or[+p[1]].where.splice(+p[2],1); changed(); }); });
  root.querySelectorAll('[data-cor]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var g=d.def.groups[+b.getAttribute('data-cor')];
    U.menu(b, addItems(function(k){ g.or.push(blankClause(k)); changed(); }), 'start'); }); });
  var ad=$('rbcAdd'); if(ad) ad.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(ad, addItems(function(k){ d.def.groups.push({ or:[blankClause(k)] }); changed(); }), 'start'); });
  /* header */
  var sv=$('rbcSave'); if(sv) sv.addEventListener('click', save);
  var cp=$('rbcCopy'); if(cp) cp.addEventListener('click', function(){ CO.id=null; d.fa=T('کپی ','Copy of ')+(c?T(c.fa,c.en):''); CO.dirty=true; save(); });
  var rf=$('rbcRefresh'); if(rf) rf.addEventListener('click', function(){ if(c){ c.computedH=0; U.toast('کوهورت دوباره حساب شد','Cohort recomputed'); refresh(); } });
  var dc=$('rbcDisc'); if(dc) dc.addEventListener('click', function(){ if(VIEWER){ U.toast('بیننده‌ها فقط کوهورت شخصی و فهرست‌نشده می‌سازند','Viewers make personal, unlisted cohorts only'); return; } if(!canEdit(c)){ U.toast('فقط مالک این را تغییر می‌دهد','Only the owner can change this'); return; } c.disc=c.disc===false; refresh(); });
  var cv=$('rbcCsv'); if(cv) cv.addEventListener('click', csv);
  var chb=$('rbcChart'); if(chb) chb.addEventListener('click', function(){ var id=c.id; leave(function(){ if(window.RBH&&RBH.openNew){ RBH.openNew('trend'); setTimeout(function(){ RBAmp.load({ events:[{ id:'_any_active', filters:[], groupBy:'' }], segments:[{ who:'any', label:'', filters:[], performed:null, cohort:id }] }, null); }, 60); } }); });
  root.querySelectorAll('[data-cmp]').forEach(function(el){ el.addEventListener('change', function(){ CO[el.getAttribute('data-cmp')]=el.value; refresh(); }); });
  var cl=$('rbcCols'); if(cl) cl.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(cl, COLS.map(function(x){ var on=CO.cols.indexOf(x[0])>-1; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), disabled:on&&CO.cols.length===1, fn:function(){ if(on) CO.cols=CO.cols.filter(function(k){ return k!==x[0]; }); else CO.cols=COLS.map(function(y){ return y[0]; }).filter(function(k){ return k===x[0]||CO.cols.indexOf(k)>-1; }); refresh(); } }; }), 'start'); });
  var mo=$('rbcMore'); if(mo) mo.addEventListener('click', function(e){ e.stopPropagation(); var own=canEdit(c), arch=canArchive(c);
    U.menu(mo, [ { icon:'copy', fa:'کپی در فضای شخصی', en:'Copy to personal space', fn:function(){ var cpb=$('rbcCopy'); if(cpb) cpb.click(); else { CO.id=null; d.fa=T('کپی ','Copy of ')+T(c.fa,c.en); CO.dirty=true; save(); } } },
      c.archived?{ icon:'archive', fa:'بازگردانی از بایگانی', en:'Unarchive', disabled:!arch, hint:arch?null:['فقط مالک یا ویرایشگر فضا','Owner or space editor only'], fn:function(){ c.archived=false; refresh(); U.toast('کوهورت بازگردانده شد','Cohort unarchived'); } }:
        { icon:'archive', fa:'بایگانی', en:'Archive', disabled:!arch, hint:arch?null:['فقط مالک یا ویرایشگر فضا','Owner or space editor only'], fn:function(){ c.archived=true; refresh(); U.toast('کوهورت بایگانی شد','Cohort archived'); } },
      { icon:'plus', fa:'افزودن به داشبورد…', en:'Add to dashboard…', disabled:!c, fn:function(){ addToBoard(mo, c); } },
      { icon:'user-circle', fa:'انتقال مالکیت…', en:'Transfer ownership…', disabled:!own, fn:function(){ ownerModal('transfer'); } },
      { icon:'users', fa:'افزودن مالک…', en:'Add owners…', disabled:!own, fn:function(){ ownerModal('add'); } },
      { icon:'trash', fa:'حذف', en:'Delete', danger:true, disabled:!own||!c.archived, hint:!c.archived?['اول بایگانی کنید','Archive it first']:null, fn:delModal } ], 'end'); });
  root.querySelectorAll('[data-person]').forEach(function(tr){ var go=function(){ var c2=cur(), n=c2&&!CO.dirty?RBShell.cohortCount(c2):sizeOf(CO.d.def||{ groups:[] }).n, u=people(n, c2?c2.id:'draft', 20)[+tr.getAttribute('data-person')]; leave(function(){ openPerson(u, c2?c2.id:null); }); };
    tr.addEventListener('click', go); tr.addEventListener('keydown', function(e){ if(e.key==='Enter') go(); }); });
  if(!(c&&c.stat)&&!noPop(d.def)){ var n=c&&!CO.dirty?RBShell.cohortCount(c):d.def?sizeOf(d.def).n:0; if(n) drawPop(n, c?c.id:'draft', root); }
  if(CO.tab==='cmp') drawCmp();
}
/* Block C (2026-10-24): Amplitude's cohort page «+ Add to» a dashboard: the cohort lands as a cohort card */
function addToBoard(anchor, c){ var bs=((RBShell.tpl&&RBShell.tpl.boards)?RBShell.tpl.boards():[]).filter(function(b){ return !b.archived&&RBShell.nb.canEditBoard(b); });
  if(!bs.length){ U.toast('داشبوردی نیست که اجازهٔ ویرایشش را داشته باشید','No dashboard you can edit'); return; }
  setTimeout(function(){ U.menu(anchor, [{ head:1, fa:'افزودن به داشبورد', en:'Add to dashboard' }].concat(bs.map(function(b){ return { icon:'squares-four', fa:b.fa, en:b.en, fn:function(){
    if(b.rows.some(function(r){ return r.some(function(x){ return x.k==='cohort'&&x.cid===c.id; }); })){ U.toast('این کوهورت از قبل روی «'+b.fa+'» هست','This cohort is already on “'+b.en+'”'); return; }
    RBShell.nb.placeCard(b, { k:'cohort', cid:c.id, w:4, mode:'size' }); U.toast('کوهورت به «'+b.fa+'» اضافه شد','Cohort added to “'+b.en+'”'); } }; })), 'end'); }, 0); }
function save(){
  var d=CO.d, c=cur();
  if(!d.fa){ U.toast('برای کوهورت نام بنویسید','Name the cohort'); var nm=(DR||document).querySelector('#rbcName'); if(nm) nm.focus(); return false; }
  if(d.def && !d.def.groups.some(function(g){ return g.or.length; })){ U.toast('دست‌کم یک شرط لازم است','Add at least one condition'); return false; }
  if(!c){ var id='c'+(store().length+1)+'_'+Date.now().toString(36);
    c={ id:id, space:'me', folder:'', owner:'me', editor:'me', updated:0, views:1, tags:[], archived:false, computedH:0, disc:!VIEWER, stat:false, src:'builder' }; store().push(c); CO.id=id;
    if(VIEWER) setTimeout(function(){ U.toast('به‌عنوان بیننده، کوهورت در فضای شخصی شما و فهرست‌نشده ذخیره شد','As a viewer, the cohort saved to your personal space, unlisted'); }, 1600); }
  c.fa=d.fa; c.en=d.fa; c.desc=d.desc; c.updated=0; c.computedH=0;
  if(d.def){ c.def=clone(d.def); var z=pinSize(c, c.def); var s=sentence(c.def); c.defFa=s[0]; c.defEn=s[1];
    if(mustStatic(c.def)){ c.stat=true; c.frozen=z.n; U.toast('شمارش تاریخی روی «هر ایونت»: کوهورت ثابت ذخیره شد','Historical count on Any event: saved as a static cohort'); } }
  CO.dirty=false; CO.touched=false; U.toast('کوهورت «'+d.fa+'» ذخیره شد','Cohort “'+d.fa+'” saved');
  if(DR){ closeDrawer(true); guard(); RBShell.go('cohort'); setTimeout(function(){ var n=document.getElementById('rbcName'); if(n) n.focus(); }, 60); }   /* Amplitude: «Create Cohort» closes the drawer and opens the saved cohort */
  else RBShell.rerender();
  return true;
}
function ownerModal(mode){
  var c=cur(); if(!c) return; var P=L.people, ids=Object.keys(P).filter(function(k){ return mode==='transfer'?k!==c.owner:owners(c).indexOf(k)<0; });
  if(!ids.length){ U.toast('همهٔ اعضا مالک این کوهورت‌اند','Everyone already owns this cohort'); return; }
  U.modal({ fa:mode==='transfer'?'انتقال مالکیت':'افزودن مالک', en:mode==='transfer'?'Transfer ownership':'Add owners',
    subFa:mode==='transfer'?'مالک تازه می‌تواند تعریف را تغییر دهد، کوهورت را بایگانی یا حذف کند.':'مالکان تازه هم می‌توانند تعریف را تغییر دهند و کوهورت را بایگانی کنند.', subEn:mode==='transfer'?'The new owner can change the definition, archive or delete the cohort.':'New owners can also change the definition and archive the cohort.',
    body:'<div class="rbx-field"><label>'+T('عضو','Member')+'</label><select class="sh-select" id="rbcOwn">'+ids.map(function(k){ return '<option value="'+k+'">'+esc(T(P[k].fa,P[k].en))+'</option>'; }).join('')+'</select></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:mode==='transfer'?'انتقال':'افزودن', en:mode==='transfer'?'Transfer':'Add', fn:function(bd){ var k=bd.querySelector('#rbcOwn').value;
      if(mode==='transfer'){ var old=c.owner; c.owner=k; c.owners=(c.owners||[]).filter(function(x){ return x!==k&&x!==old; }); } else (c.owners=c.owners||[]).push(k);
      RBShell.rerender(); U.toast(mode==='transfer'?'مالکیت منتقل شد':'مالک اضافه شد', mode==='transfer'?'Ownership transferred':'Owner added'); } }] });
}
/* ── compare cohorts: against active users (default), another cohort, or a property slice ── */
function overlapWith(c, n, vs){
  if(vs==='active'){ var a=act(30); return { other:a, both:Math.round(n*(0.62+0.3*jit(c.id+'act'))), lab:['کاربران فعال ۳۰ روز اخیر','Active users, last 30 days'] }; }
  var o=byId(vs); if(!o) return null; var m=RBShell.cohortCount(o), U2=act(30), both=Math.round(Math.min(n, m, n*m/Math.max(1,U2)*(1.3+0.9*jit(c.id+o.id))));
  return { other:m, both:both, lab:[o.fa,o.en], cid:o.id };
}
function compShares(seed, prop, tilted){
  var P=RB.PROPS[prop], raw=P.vals.map(function(v,i){ return v[2]*(tilted?0.7+0.6*jit(seed+prop,i):1); }), t=raw.reduce(function(a,b){ return a+b; },0)||1;
  return P.vals.map(function(v,i){ return [v, raw[i]/t*100]; });
}
function retW1(cid){ try{ var st={ events:[{ id:'_any_active', filters:[], groupBy:'' }], segments:[{ who:'any', label:'', filters:[], performed:null, cohort:cid||'' }], ret:{ iv:'week', method:'after' } };
  var r=RBAmp.retention(st, { range:'90d', filters:[] }); return r.segs[0]&&r.segs[0].ov[1]?r.segs[0].ov[1].p:null; }catch(e){ return null; } }
function cmpHtml(c, n){
  if(!c||CO.dirty) return '<div class="rbc-empty">'+T('برای مقایسه، اول کوهورت را ذخیره کنید.','Save the cohort first to compare it.')+'</div>';
  var others=store().filter(function(o){ return o.id!==c.id&&!o.archived; }), vs=CO.cmp, isProp=/^prop:/.test(vs);
  var h='<div class="rbc-cmpbar"><span class="rbc-w">'+T('مقایسه با','Compare with')+'</span><select class="sh-select" data-cmp="cmp">'+opt('active', vs,'کاربران فعال ۳۰ روز اخیر','Active users, last 30 days')+
    (others.length?'<optgroup label="'+T('کوهورت‌ها','Cohorts')+'">'+others.map(function(o){ return opt(o.id, vs, o.fa, o.en); }).join('')+'</optgroup>':'')+
    '<optgroup label="'+T('تفکیک بر اساس ویژگی','Slice by property')+'">'+Object.keys(RB.PROPS).filter(function(p){ return SEG_GRPS.indexOf(RB.PROPS[p].grp)>-1; }).map(function(p){ return opt('prop:'+p, vs, RB.PROPS[p].fa, RB.PROPS[p].en); }).join('')+'</optgroup></select></div>';
  var prop=isProp?vs.slice(5):CO.cprop, A=compShares(c.id, prop, true); CPROP=prop;
  if(!isProp){ var ov=overlapWith(c, n, vs); if(!ov) return h;
    var onlyA=n-ov.both, onlyB=ov.other-ov.both, tot=Math.max(1,onlyA+ov.both+onlyB), oc=ov.cid?byId(ov.cid):null;
    var B=oc?compShares(oc.id, prop, true):compShares('active', prop, false);
    var ev=function(seed, tilt){ var st=RBAmp.evStats('_any_active','n30'); return st.u?st.t/st.u*tilt:0; }, dau=function(m, seed){ return Math.round(m*(0.08+0.06*jit(seed+'dau'))); };
    var rA=retW1(c.id), rB=retW1(ov.cid||'');
    h+='<div class="rbc-cardh"><b>'+T('هم‌پوشانی','Overlap')+'</b></div><div class="rbc-venn"><i class="a" style="flex:'+onlyA+'"></i><i class="ab" style="flex:'+ov.both+'"></i><i class="b" style="flex:'+onlyB+'"></i></div>'+
      '<div class="rbc-vleg"><span><i class="a"></i>'+T('فقط این کوهورت','Only this cohort')+' <b>'+num(onlyA)+'</b></span><span><i class="ab"></i>'+T('هر دو','Both')+' <b>'+num(ov.both)+'</b> ('+pct(ov.both/Math.max(1,n)*100)+T(' از این کوهورت',' of this cohort')+')</span><span><i class="b"></i>'+T('فقط ','Only ')+esc(T(ov.lab[0],ov.lab[1]))+' <b>'+num(onlyB)+'</b></span></div>'+
      '<div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th></th><th class="num">'+esc(T(c.fa,c.en))+'</th><th class="num">'+esc(T(ov.lab[0],ov.lab[1]))+'</th></tr></thead><tbody>'+
      '<tr><td>'+T('اندازه','Size')+'</td><td class="num">'+num(n)+'</td><td class="num">'+num(ov.other)+'</td></tr>'+
      '<tr><td>'+T('میانگین ایونت در هر کاربر (۳۰ روز)','Average events per user (30 days)')+'</td><td class="num">'+num(ev(c.id, 1.25+0.5*jit(c.id+'ev')),1)+'</td><td class="num">'+num(ev('o', oc?1.2+0.5*jit(oc.id+'ev'):1),1)+'</td></tr>'+
      '<tr><td>'+T('کاربران فعال روزانه (میانگین)','Daily active users (average)')+'</td><td class="num">'+num(dau(n,c.id))+'</td><td class="num">'+num(dau(ov.other,ov.cid||'act'))+'</td></tr>'+
      '<tr><td>'+T('بازگشت هفتهٔ ۱','Week 1 retention')+'</td><td class="num">'+(rA==null?'—':pct(rA))+'</td><td class="num">'+(rB==null?'—':pct(rB))+'</td></tr></tbody></table></div>'+
      '<div class="rbc-cardh"><b>'+T('ترکیب بر اساس ویژگی','Composition by property')+'</b><select class="sh-select" data-cmp="cprop">'+Object.keys(RB.PROPS).filter(function(p){ return SEG_GRPS.indexOf(RB.PROPS[p].grp)>-1; }).map(function(p){ return opt(p, prop, RB.PROPS[p].fa, RB.PROPS[p].en); }).join('')+'</select></div>'+
      compRows(A, B, [T(c.fa,c.en), T(ov.lab[0],ov.lab[1])]);
  } else h+='<div class="rbc-cardh"><b>'+T('ترکیب «','Composition by “')+esc(T(RB.PROPS[prop].fa,RB.PROPS[prop].en))+T('»','”')+'</b></div>'+compRows(A, compShares('active', prop, false), [T(c.fa,c.en), T('کاربران فعال','Active users')]);
  return h+'<p class="rbz-sethelp">'+T('هر ستون ترکیب جمعاً ۱۰۰٪ است؛ هم‌پوشانی هیچ‌وقت از کوچک‌ترین کوهورت بیشتر نیست.','Each composition column adds up to 100%; the overlap is never larger than the smaller cohort.')+'</p>';
}
var CPROP='';   /* LX-15: the property the composition rows show, so a member reads masked values here too */
function compRows(A, B, names){
  return '<div class="rbc-comp"><div class="rbc-compl"><span><i class="a"></i>'+esc(names[0])+'</span><span><i class="b"></i>'+esc(names[1])+'</span></div>'+A.map(function(x,i){ var b=B[i][1];
    return '<div class="rbc-comprow"><span class="lb">'+esc(CPROP?DV(CPROP, x[0]):T(x[0][0],x[0][1]))+'</span><span class="bars"><span class="bar a"><i style="width:'+x[1].toFixed(1)+'%"></i><b>'+pct(x[1])+'</b></span><span class="bar b"><i style="width:'+b.toFixed(1)+'%"></i><b>'+pct(b)+'</b></span></span></div>'; }).join('')+'</div>';
}
function drawCmp(){}
/* PM 2026-10-25, UC-6: the confirmation lists what uses the cohort («استفاده‌شده در»: saved charts and cohorts), each with a link */
function depsHtml(used){ if(!used.length) return '';
  return '<div class="rbz-tnote">'+T('این کوهورت در این نمودارها و کوهورت‌ها به کار رفته است:','This cohort is used in these charts and cohorts:')+'</div><div class="rbc-used" data-deps="1">'+used.map(function(u){ return u.cohort!=null?
    '<button class="rbx-rrow" data-depco="'+esc(u.cohort)+'" type="button"><span class="gi cohort">'+ic('users-three')+'</span><span class="t">'+esc(T(u.fa,u.en))+'</span></button>':
    '<button class="rbx-rrow" data-deprep="'+u.i+'" type="button"><span class="gi report">'+ic('chart-line')+'</span><span class="t">'+esc(T(u.fa,u.en))+'</span></button>'; }).join('')+'</div>'; }
function delModal(){
  var c=cur(); if(!c) return; var used=usedBy(c);
  U.modal({ fa:'حذف کوهورت', en:'Delete cohort', subFa:'«'+c.fa+'» برای همیشه حذف می‌شود و گزارش‌هایی که از آن استفاده می‌کنند دیگر این گروه را نشان نمی‌دهند.', subEn:'“'+c.en+'” will be deleted for good, and charts that use it will no longer show this segment.', body:depsHtml(used),
    init:function(body, close){ body.querySelectorAll('[data-deprep]').forEach(function(b){ b.addEventListener('click', function(){ close(); RBShell.openReport(+b.getAttribute('data-deprep')); }); });
      body.querySelectorAll('[data-depco]').forEach(function(b){ b.addEventListener('click', function(){ close(); open(b.getAttribute('data-depco')); }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'حذف', en:'Delete', danger:true, fn:function(){ var s=store(), i=s.indexOf(c); if(i>-1) s.splice(i,1); CO.id=null; CO.dirty=false; CO.touched=false; RBShell.go('cohorts'); U.toast('کوهورت حذف شد','Cohort deleted'); } }] });
}

/* ── site-user profile (device-level until identity ships) ── */
var SESS_EV=[['page_view',0.5],['video_started',0.12],['search_submitted',0.08],['video_completed',0.05],['add_to_cart',0.04],['purchase',0.02]];
function sessions(u){
  var out=[], k=0, evs=SESS_EV.filter(function(x){ return RB.evById(x[0]); }), P=RB.PROPS.page_path.vals;
  for(var s=0;s<Math.min(5,u.sess);s++){ var start=u.ago+s*(14+Math.floor(jit(u.id+'g',s)*30)), m=3+Math.floor(jit(u.id+'m',s)*22), list=[];
    var ne=3+Math.floor(jit(u.id+'n',s)*6);
    list.push({ ev:'session_start', t:0 });
    for(var e=0;e<ne;e++){ var r=jit(u.id+'e'+s,e), acc=0, pick='page_view'; for(var i=0;i<evs.length;i++){ acc+=evs[i][1]; if(r*0.81<acc){ pick=evs[i][0]; break; } }
      /* a finished video needs a started one before it; a purchase needs a cart */
      var need={ video_completed:'video_started', purchase:'add_to_cart' }[pick];
      if(need && !list.some(function(x){ return x.ev===need; }) && RB.evById(need)) list.push({ ev:need, t:Math.round(m*(e+0.5)/(ne+1)), path:P[Math.floor(jit(u.id+'q'+s,e)*P.length)%P.length] });
      list.push({ ev:pick, t:Math.round(m*(e+1)/(ne+1)), path:P[Math.floor(jit(u.id+'p'+s,e)*P.length)%P.length] }); k++; }
    out.push({ start:start, min:m, dev:u.dev, devId:u.id, list:list }); }
  /* identity: an identified person's sessions come from their linked devices; the login marks the oldest one shown */
  var p=window.RBId?RBId.of(u):null;
  if(p&&p.identified){ var D=p.devices;
    var li=Math.min(p.loginSess,out.length-1), k=0;
    /* the login session is on this device; the others cycle through the person's other devices first */
    out.forEach(function(x,i){ var d=i===li?D[0]:D[(1+(k++))%D.length]; x.dev=d.dev; x.devId=d.id; });
    var ls=out[li];
    if(ls){ var at=Math.max(1,Math.floor(ls.list.length/2)); ls.list.forEach(function(e,i){ if(i<at) e.pre=true; }); ls.list.splice(at,0,{ mark:'login', t:ls.list[at-1].t }); } }
  return out;
}
/* ── identity (batch a, 47-identity-design.md): IDs, devices, user properties; merged views need roadmap 4.3 ── */
function devb(){ return ' '+devTag('identity'); }
function tv(t){ var v=T(t.val[0],t.val[1]); if(/^dd:/.test(v)){ var n=+v.slice(3); return T(num(n)+' روز پیش', n+' days ago'); } return esc(v); }
/* User Details (Amplitude's left column; design pass 2026-11-15): identity, linked devices, then every property with a search over keys and values */
var MOBILE_IC='<svg viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M176 16H80a24 24 0 0 0-24 24v176a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V40a24 24 0 0 0-24-24M72 64h112v128H72Zm8-32h96a8 8 0 0 1 8 8v8H72v-8a8 8 0 0 1 8-8m96 192H80a8 8 0 0 1-8-8v-8h112v8a8 8 0 0 1-8 8"/></svg>';   /* Phosphor device-mobile (the shell's icon set has no phone) */
function mono(v, cls){ return '<span class="rbc-mono'+(cls?' '+cls:'')+'" dir="ltr" title="'+esc(v)+'">'+esc(v)+'</span>'; }
function stip(fa_, en, tfa, ten){ return '<span class="rbx-tipdot"'+tip("<span class='tip-title'>"+fa_+'</span>'+tfa,"<span class='tip-title'>"+en+'</span>'+ten)+'></span>'; }
function kv(k, v, q, title){ return '<div class="rbc-kv" data-min-track="70" data-pq="'+esc(String(q||'').toLowerCase())+'"><span class="k" title="'+esc(title||'')+'">'+k+'</span><span class="v">'+v+'</span></div>'; }
function idHtml(u,p){
  if(!p) return '';
  var idd=p.identified;
  var h='<div class="rbc-psec" data-idcard="1"><div class="rbc-psh">'+T('هویت','Identity')+stip('هویت','Identity','شناسهٔ کاربر را سایت شما بعد از ورود با ⁦identify()⁩ می‌فرستد؛ شناسهٔ شاهین همهٔ دستگاه‌ها و شناسه‌های یک نفر را به هم وصل می‌کند. یکی شدن دائمی است و برنمی‌گردد.','Your site sends the User ID with ⁦identify()⁩ after login; the Shahin ID ties all of one person’s devices and IDs together. A merge is permanent and can’t be undone.')+'</div>'+
    kv(T('شناسهٔ کاربر','User ID'), idd?mono(p.uid):'<span class="sh-status neutral">'+T('ناشناس','Anonymous')+'</span>', '')+
    kv(T('شناسهٔ شاهین','Shahin ID'), mono(p.shid), '')+'</div>';
  h+='<div class="rbc-psec" data-iddevs="1"><div class="rbc-psh">'+T('دستگاه‌های وصل‌شده','Linked devices')+'<span class="rbc-psn">'+num(p.devices.length)+'</span>'+stip('دستگاه‌های وصل‌شده','Linked devices','مرورگرها و دستگاه‌هایی که با همین شناسهٔ کاربر دیده شده‌اند؛ ایونت‌های پیش از ورودِ هر دستگاه هم به همین نفر می‌رسد.','Browsers and devices seen with this User ID; each device’s events from before login join this person too.')+'</div>'+
    p.devices.map(function(d){ return '<div class="rbc-dv"><span class="rbc-dvic">'+(/mob|موبایل|tab|تبلت/i.test(d.dev[1]+d.dev[0])?MOBILE_IC:ic('monitor'))+'</span><div class="rbc-dvb"><div class="rbc-dvt">'+mono(d.id)+(d.main?'<span class="rbz-tag">'+T('همین دستگاه','This device')+'</span>':'')+'</div>'+
      '<div class="rbc-dvm">'+esc(T(d.dev[0],d.dev[1]))+' · '+esc(T(d.browser[0],d.browser[1]))+' · '+(d.linked!=null?T('وصل‌شده از ','Linked ')+L.ago(d.linked):T('اولین بازدید ','First seen ')+L.ago(d.first))+'</div></div></div>'; }).join('')+'</div>';
  return h; }
/* PM 2026-10-28, link fix: the deletion request opens the current events page (v13), which keeps the settings tab and the ?udel prefill */
function delHtml(u,p){ var id=p&&p.identified?p.uid:u.id;
  return '<a class="rb-linkbtn rbc-del" data-pdel="1" href="../events-settings/v13.html?tab=settings&udel='+encodeURIComponent(id)+'">'+ic('trash')+T('درخواست حذف این کاربر','Request deletion of this user')+'</a>'; }
function evKey(si,ei){ return si+':'+ei; }
function actBar(u,p,ss){ var evs=[]; ss.forEach(function(s){ s.list.forEach(function(e){ if(e.ev&&evs.indexOf(e.ev)<0) evs.push(e.ev); }); });
  var n=Object.keys(CO.ptick||{}).length;
  var h='<div class="rbc-actbar"><select class="sh-select" data-pevf="1" aria-label="'+T('نوع ایونت','Event type')+'"><option value="">'+T('همهٔ ایونت‌ها','All events')+'</option>'+evs.map(function(e){ return '<option value="'+e+'"'+(CO.pevf===e?' selected':'')+'>'+esc(RBAmp.evName(e))+'</option>'; }).join('')+'</select>';
  if(p&&p.devices.length>1) h+='<select class="sh-select" data-pdev="1" aria-label="'+T('دستگاه','Device')+'"><option value="">'+T('همهٔ دستگاه‌ها','All devices')+'</option>'+p.devices.map(function(d){ return '<option value="'+esc(d.id)+'"'+(CO.pdev===d.id?' selected':'')+'>'+esc(d.id)+' · '+esc(T(d.dev[0],d.dev[1]))+'</option>'; }).join('')+'</select>';
  return h+'<label class="sh-cb rbc-rawck"><input type="checkbox" data-praw="1"'+(CO.praw?' checked':'')+'/>'+T('نمای خام','Raw view')+'</label>'+
    '<span class="rbc-chartgrp"><span class="rbc-cap" data-pcapmsg="1"'+(CO.pcap?'':' hidden')+'>'+ic('warning')+T('حداکثر ۱۰ ایونت','Up to 10 events')+'</span>'+
    '<span class="rbc-tickn" data-ptickn="1"'+(n?'':' hidden')+'>'+T(num(n)+' ایونت انتخاب شد',n+' selected')+'</span>'+
    '<button type="button" class="sh-btn primary compact" data-pchart="1"'+(n?'':' disabled')+' title="'+esc(T('چند ایونت را تیک بزنید تا نمودار روندشان ساخته شود','Tick some events to chart their trend'))+'">'+ic('chart-line')+T('ساختن نمودار','Create chart')+'</button></span></div>'; }
function markHtml(p){ return '<div class="rbc-mark">'+ic('seal-check')+'<span>'+T('شناسایی شد به‌عنوان ','Identified as ')+'<b dir="ltr">'+esc(p.uid)+'</b> · '+T('ایونت‌های پیش از این روی همین دستگاه هم به این کاربر رسید','the events before this on this device joined this user too')+'</span>'+devb()+'</div>'; }
function rawHtml(u,s,si,e,p){ var o={ event_type:e.ev, user_id:p&&p.identified&&!e.pre?p.uid:null, device_id:s.devId||u.id, shahin_id:p?p.shid:null, session_id:'s-'+(RB.hstr(u.id+si)>>>0).toString(16).slice(0,6), time:'+'+e.t+'m' };
  if(e.path) o.page_path=e.path[1];
  return '<pre class="rbc-raw" dir="ltr">'+esc(JSON.stringify(o,null,2))+'</pre>'; }
/* the selected event's properties (the detail pane, or inline under the row on a narrow page); «نمای خام» shows the raw JSON */
function evDetail(u,s,si,e,p){ if(CO.praw) return rawHtml(u,s,si,e,p);
  return '<div class="rbc-evd"><div><span>'+T('زمان','Time')+'</span><b>'+L.ago(s.start)+' +'+T(num(e.t)+' دقیقه',e.t+' min')+'</b></div><div><span>'+T('شناسهٔ نشست','Session ID')+'</span><b dir="ltr">s-'+(RB.hstr(u.id+si)>>>0).toString(16).slice(0,6)+'</b></div>'+(e.path?'<div><span>'+T('مسیر صفحه','Page path')+'</span><b dir="ltr">'+esc(e.path[1])+'</b></div>':'')+'<div><span>'+T('نوع دستگاه','Device type')+'</span><b>'+esc(T(s.dev[0],s.dev[1]))+'</b></div><div><span>'+T('شناسهٔ دستگاه','Device ID')+'</span><b dir="ltr">'+esc(s.devId||u.id)+'</b></div></div>'; }
function personView(){
  var u=CO.person; if(!u) return '<div class="rbc-empty">'+T('کاربری انتخاب نشده است.','No user selected.')+'</div>';
  var from=CO.from?byId(CO.from):null, ss=sessions(u), first=u.ago+ss.length*40+120;
  var os=RB.PROPS.os.vals[Math.floor(jit(u.id+'os')*RB.PROPS.os.vals.length)%RB.PROPS.os.vals.length];
  var pid=window.RBId?RBId.of(u):null, idd=!!(pid&&pid.identified), nd=pid?pid.devices.length:1;
  /* device and web properties (the latest values Shahin saw); computed properties follow */
  var dprops=[['کشور','Country',DV('country',u.country)],['شهر','City',DV('city',u.city)],['نوع دستگاه','Device type',DV('device_type',u.dev)],['مرورگر','Browser',DV('browser',u.browser)],['سیستم‌عامل','OS',T(os[0],os[1])],['نوع ورودی آخرین نشست','Last referrer type',DV('referrer_type',u.ref)],['تعداد نشست','Sessions',num(u.sess)]];
  var cprops=window.RBUsers?RBUsers.personProps(u):[];
  var tab=CO.ptab||'act';
  var hdTip=idd?T('این پروفایل یک نفر است: '+num(nd)+' دستگاه با شناسهٔ کاربر '+pid.uid+' یکی شده‌اند و ایونت‌های پیش از ورودِ هر دستگاه هم به همین نفر رسیده است.','This profile is one person: '+nd+' device(s) merged under User ID '+pid.uid+', including each device’s events from before login.'):
    T('این پروفایل یک مرورگر یا دستگاه است؛ اگر همین آدم با دستگاه دیگری بیاید، پروفایل جدایی دارد. وقتی سایت او را با ⁦identify()⁩ بشناسد، دستگاه‌هایش یک پروفایل می‌شوند.','This profile is one browser or device; if the same person comes on another device, that is a separate profile. Once your site identifies them with ⁦identify()⁩, their devices become one profile.');
  /* Amplitude reference pass (2026-11-15): the profile is stacked — a header card (the person, first and last seen, «ویژگی‌های سنجاق‌شده» in a
     four-column grid, «دیدن همهٔ ویژگی‌ها» opening identity, devices and every property), then a full-width tab bar, then the tab. */
  var pinned=[[T('شناسهٔ کاربر','User ID'), idd?mono(pid.uid):'<span class="sh-status neutral">'+T('ناشناس','Anonymous')+'</span>'],[T('شناسهٔ شاهین','Shahin ID'), pid?mono(pid.shid):'—'],
    [T('کشور','Country'), esc(DV('country',u.country))],[T('شهر','City'), esc(DV('city',u.city))],[T('نوع دستگاه','Device type'), esc(DV('device_type',u.dev))],[T('مرورگر','Browser'), esc(DV('browser',u.browser))],
    [T('سیستم‌عامل','OS'), esc(T(os[0],os[1]))],[T('تعداد نشست','Sessions'), num(u.sess)]];
  var nall=dprops.length+cprops.length+(idd&&pid?pid.traits.length:0);
  var h='<div class="rbc rbc-person">'+(from?'<button class="rb-linkbtn rbc-back" data-pback="1" type="button">'+ic(fa()?'arrow-right':'arrow-left')+esc(T(from.fa,from.en))+'</button>':'<button class="rb-linkbtn rbc-back" data-cobk="1" type="button">'+ic(fa()?'arrow-right':'arrow-left')+(CO.fromView==='profiles'?T('پروفایل‌ها','User profiles'):T('کوهورت‌ها','Cohorts'))+'</button>')+
    '<section class="rbc-card rbc-phead" aria-label="'+T('مشخصات کاربر','User details')+'"><div class="rbc-phrow"><span class="rbc-pav">'+ic('user-circle')+'</span><div class="rbc-phb">'+
      '<div class="rbc-title"><h2 class="rbc-h2">'+(idd?'<span dir="ltr" class="rbc-mono">'+esc(pid.uid)+'</span>':T('کاربر ناشناس','Anonymous user')+' <span dir="ltr" class="rbc-mono muted">'+esc(u.id)+'</span>')+'</h2>'+
      (pid?(idd?'<span class="sh-status good">'+T('شناسایی‌شده','Identified')+'</span>':'<span class="sh-status neutral">'+T('ناشناس','Anonymous')+'</span>'):'')+
      '<span class="rbx-tipdot"'+tip("<span class='tip-title'>"+T('پروفایل کاربر','User profile')+'</span>'+hdTip, "<span class='tip-title'>User profile</span>"+hdTip)+'></span>'+devTag('profiles')+'<span class="rbc-pnd">'+T(num(nd)+' دستگاه',nd+(nd===1?' device':' devices'))+'</span></div>'+
      '<div class="rbc-psub"><span>'+T('اولین بازدید ','First seen ')+L.ago(first)+'</span><span class="rbc-psep" aria-hidden="true">|</span><span>'+T('آخرین بازدید ','Last seen ')+L.ago(u.ago)+'</span></div></div>'+delHtml(u,pid)+'</div>'+
    '<div class="rbc-pinh">'+T('ویژگی‌های سنجاق‌شده','Pinned properties')+stip('ویژگی‌های سنجاق‌شده','Pinned properties','مهم‌ترین مشخصات این کاربر؛ آخرین مقدارهایی که شاهین دیده است. همهٔ ویژگی‌ها، هویت و دستگاه‌ها با «دیدن همهٔ ویژگی‌ها» باز می‌شوند.','This user’s key details, the latest values Shahin saw. «See all properties» opens every property, the identity and the devices.')+'</div>'+
    '<div class="rbc-pin" data-min-track="120">'+pinned.map(function(r){ return '<div class="rbc-pinkv"><span class="k">'+r[0]+'</span><span class="v">'+r[1]+'</span></div>'; }).join('')+'</div>'+
    '<button type="button" class="rb-linkbtn rbc-pmore" data-pmore="1" aria-expanded="'+!!CO.pall+'">'+(CO.pall?T('بستن','Show less'):T('دیدن همهٔ ویژگی‌ها ('+num(nall)+')','See all properties ('+nall+')'))+ic('caret-down')+'</button>'+
    '<div class="rbc-pall'+(CO.pall?' open':'')+'" data-pall="1" data-min-track="200">'+idHtml(u,pid)+
      '<div class="rbc-psec" data-pprops="1"><div class="rbc-psh">'+T('ویژگی‌ها','Properties')+stip('ویژگی‌ها','Properties','ویژگی‌های کاربر همان‌هایی است که سایت شما با ⁦identify()⁩ فرستاده (هر مقدار تازه جای قبلی را می‌گیرد و منبعش نگه داشته می‌شود)؛ بعد ویژگی‌های دستگاه و وب از آخرین بازدید.','User properties are what your site sent with ⁦identify()⁩ (a new value replaces the old one and its source is kept); then device and web properties from the latest visit.')+'</div>'+
        '<label class="rbx-search rbc-pq">'+ic('magnifying-glass')+'<input type="search" data-pq-in="1" aria-label="'+T('جستجوی ویژگی','Search properties')+'" placeholder="'+T('جستجوی ویژگی یا مقدار','Search properties or values')+'" value="'+esc(CO.pq||'')+'"/></label>';
  if(idd&&pid.traits.length) h+='<div class="rbc-pgl" data-pgrp="1">'+T('ویژگی‌های کاربر','User properties')+'</div>'+pid.traits.map(function(t){ var src=T(t.src==='server'?'سرور':'مرورگر', t.src==='server'?'server':'browser'), v=tv(t);
    return kv('<span class="kt" title="'+esc(T(t.fa,t.en)+' · '+t.key)+'">'+esc(T(t.fa,t.en))+'</span>'+(t.once?'<span class="rbc-once" title="'+T('فقط بار اول ثبت می‌شود','Set once')+'">'+ic('lock-simple')+'</span>':''), '<span class="vt" title="'+esc(src+' · '+L.ago(t.upd).replace(/<[^>]+>/g,''))+'">'+v+'</span><span class="rbc-src">'+src+'</span>', T(t.fa,t.en)+' '+t.key+' '+v, T(t.fa,t.en)+' · '+t.key); }).join('');
  h+='<div class="rbc-pgl" data-pgrp="1">'+T('دستگاه و وب','Device and web')+'</div>'+dprops.map(function(r){ return kv('<span class="kt">'+T(r[0],r[1])+'</span>', '<span class="vt" title="'+esc(r[2])+'">'+esc(r[2])+'</span>', T(r[0],r[1])+' '+r[2], T(r[0],r[1])); }).join('');
  if(cprops.length) h+='<div class="rbc-pgl" data-pgrp="1">'+T('محاسبه‌ها','Computations')+'</div>'+cprops.map(function(r){ return kv('<span class="kt">'+esc(T(r[0],r[1]))+'</span>', '<span class="vt" title="'+r[2]+'">'+r[2]+'</span>', T(r[0],r[1])+' '+r[2], T(r[0],r[1])); }).join('');
  h+='<div class="rbc-pnone" data-pnone="1" hidden>'+T('ویژگی‌ای با این جستجو نیست.','No property matches.')+'</div></div></div></section>';
  /* the tabs, full width; «کوهورت‌ها» (the membership check) is in milestone 2 with the cohorts (PM 2026-11-15) */
  h+='<div class="rbx-tabs rbc-ptabs" role="tablist">'+[['act','فعالیت','Activity','list-bullets'],['rep','پخش نشست','Session replays','play-circle'],['coh','کوهورت‌ها','Cohorts','users-three']].map(function(t){ var on=tab===t[0]; return '<button type="button" role="tab" aria-selected="'+on+'" class="rbx-tab'+(on?' on':'')+'" data-ptab="'+t[0]+'">'+ic(t[3])+T(t[1],t[2])+'</button>'; }).join('')+'</div>'+
    '<section class="rbc-phist" aria-label="'+T('تاریخچهٔ کاربر','User history')+'">';
  if(tab==='act'){ var nev=0; ss.forEach(function(s){ if(CO.pdev&&s.devId!==CO.pdev) return; s.list.forEach(function(e){ if(!e.mark&&(!CO.pevf||e.ev===CO.pevf)) nev++; }); });
    h+=actBar(u,pid,ss)+'<div class="rbc-pshow">'+T('نمایش '+num(nev)+' ایونت اخیر','Showing the '+nev+' most recent events')+stip('فعالیت','Activity','ایونت‌های این کاربر گروه‌شده در نشست‌ها، تازه‌ترین نشست بالا؛ روی هر ایونت بزنید تا ویژگی‌هایش کنار فهرست بیاید، یا چند ایونت را تیک بزنید تا نمودار روندشان ساخته شود.','This user’s events grouped into sessions, the latest on top; click an event to see its properties beside the list, or tick some events to chart their trend.')+'</div>';
    /* master–detail: the event stream as a timeline, and the selected event's properties beside it (inline under the row on a narrow page) */
    var sel=null, shown=0, stream='';
    ss.forEach(function(s,si){ if(CO.pdev&&s.devId!==CO.pdev) return; var rows=s.list.map(function(e,ei){ return { e:e, ei:ei }; }).filter(function(x){ return x.e.mark||!CO.pevf||x.e.ev===CO.pevf; });
      var ne=rows.filter(function(x){ return !x.e.mark; }).length; if(!ne) return; shown++;
      stream+='<div class="rbc-sess"><div class="rbc-sessh"><span class="rbc-sessic">'+(/mob|موبایل|tab|تبلت/i.test(s.dev[1]+s.dev[0])?MOBILE_IC:ic('monitor'))+'</span><b>'+T('نشست ','')+esc(T(s.dev[0],s.dev[1]))+T('',' session')+'</b><span>'+T(num(s.min)+' دقیقه',s.min+' min')+'</span><span class="rbx-dot"></span><span>'+L.ago(s.start)+'</span>'+(nd>1?'<span class="rbx-dot"></span>'+mono(s.devId,'muted'):'')+'<span class="rbx-spacer"></span><span class="rbc-sessn">'+T(num(ne)+' ایونت',ne+(ne===1?' event':' events'))+'</span></div><div class="rbc-tl">'+
        rows.map(function(x){ var e=x.e, ei=x.ei; if(e.mark) return CO.pevf?'':markHtml(pid); var key=evKey(si,ei), op=CO.pev===key, ck=!!(CO.ptick&&CO.ptick[key]);
          if(op) sel={ s:s, si:si, e:e };
          return '<div class="rbc-ev'+(op?' open':'')+(e.pre?' pre':'')+(ck?' ck':'')+'"><input type="checkbox" data-ptick="'+key+'" data-ev="'+e.ev+'"'+(ck?' checked':'')+' aria-label="'+esc(T('انتخاب ','Select ')+RBAmp.evName(e.ev))+'"/>'+
            '<button class="rbc-evb" data-pev="'+key+'" type="button" aria-pressed="'+op+'"><span class="tm">+'+T(num(e.t)+' دقیقه',e.t+' min')+'</span><span class="rbc-dot" aria-hidden="true"></span><span class="rbz-evic">'+RBAmp.evIcon(e.ev)+'</span><span class="nm">'+esc(RBAmp.evName(e.ev))+'</span><code dir="ltr">'+e.ev+'</code>'+(e.pre?'<span class="rbz-tag">'+T('پیش از ورود','Before login')+'</span>':'')+(e.path?'<span class="pth" dir="ltr" title="'+esc(e.path[1])+'">'+esc(e.path[1])+'</span>':'')+'</button></div>'+
            (op?'<div class="rbc-evinl">'+evDetail(u,s,si,e,pid)+'</div>':''); }).join('')+'</div></div>'; });
    if(!shown) h+='<div class="sh-state"><div class="sh-state-icon">'+ic('funnel')+'</div><div class="sh-state-title">'+T('ایونتی با این فیلتر نیست','No events match this filter')+'</div><button type="button" class="sh-btn ghost compact" data-pfclr="1">'+T('پاک کردن فیلتر','Clear filter')+'</button></div>';
    else h+='<div class="rbc-md"><div class="rbc-stream">'+stream+'</div><aside class="rbc-card rbc-evpane" aria-label="'+T('ویژگی‌های ایونت','Event properties')+'">'+
      (sel?'<div class="rbc-evph"><span class="rbz-evic">'+RBAmp.evIcon(sel.e.ev)+'</span><b>'+esc(RBAmp.evName(sel.e.ev))+'</b><code dir="ltr">'+sel.e.ev+'</code></div>'+evDetail(u,sel.s,sel.si,sel.e,pid):
        '<div class="sh-state"><div class="sh-state-icon">'+ic('list-bullets')+'</div><div class="sh-state-title">'+T('یک ایونت را انتخاب کنید','Select an event')+'</div><div class="sh-state-hint">'+T('ویژگی‌های ایونتی که روی آن بزنید این‌جا می‌آید.','The properties of the event you click show here.')+'</div></div>')+'</aside></div>'; }
  else if(tab==='coh'){ var list=cohorts().filter(function(c){ return !c.archived; }), nck=list.filter(function(c){ return CO.check[c.id]; }).length;
    /* m2 design pass (2026-11-15), Amplitude's profile ▸ Cohorts: pick cohorts, «بررسی», and each row then says «عضو است» or «عضو نیست» */
    if(!list.length) h+='<div class="sh-state"><div class="sh-state-icon">'+ic('users-three')+'</div><div class="sh-state-title">'+T('هنوز کوهورتی نیست','No cohorts yet')+'</div><div class="sh-state-hint">'+T('اول یک کوهورت بسازید تا عضویت این کاربر را در آن بررسی کنید.','Create a cohort first to check this user’s membership in it.')+'</div><button type="button" class="sh-btn ghost compact" data-pconew="1">'+ic('plus')+T('ساختن کوهورت','Create cohort')+'</button></div>';
    else { var res=CO.checked?list.filter(function(c){ return CO.check[c.id]; }).map(function(c){ return inCohort(u, c); }):[], nin=res.filter(Boolean).length;
      h+='<div class="rbc-memb"><div class="rbc-mbar"><span class="rbc-mh">'+T('عضویت در کوهورت‌ها','Cohort membership')+'</span><span class="rbx-tipdot"'+tip(CTIPS.memb[0],CTIPS.memb[1])+'></span><span class="rbx-spacer"></span>'+
        '<button type="button" class="rb-linkbtn" data-pchkall="1">'+(nck===list.length?T('برداشتن همه','Clear all'):T('انتخاب همه','Select all'))+'</button>'+
        '<span class="rbc-tickn" data-pchkn="1">'+T(num(nck)+' انتخاب شد',nck+' selected')+'</span>'+
        '<button class="sh-btn primary compact" id="rbcCheck" type="button"'+(nck?'':' disabled')+'>'+ic('check')+T('بررسی','Check')+'</button></div>'+
        (CO.checked&&res.length?'<div class="rbc-msum" role="status">'+ic('check-circle')+T('این کاربر عضو '+num(nin)+' از '+num(res.length)+' کوهورت انتخاب‌شده است.','This user is in '+nin+' of the '+res.length+' cohorts checked.')+'</div>':'')+
        '<ul class="rbc-mlist">'+list.map(function(c){ var on=!!CO.check[c.id], done=CO.checked&&on, inIt=done&&inCohort(u, c);
          return '<li class="rbc-mrow'+(on?' ck':'')+'"><label class="rbc-mck"><input type="checkbox" data-pchk="'+c.id+'"'+(on?' checked':'')+'/><span class="gi cohort">'+ic(c.src==='ids'?'list-bullets':'users-three')+'</span><span class="rbc-mnb"><b>'+esc(T(c.fa,c.en))+'</b><small>'+T(num(RBShell.cohortCount(c))+' کاربر · ',num(RBShell.cohortCount(c))+' users · ')+(c.stat?T('ثابت','Static'):T('پویا','Dynamic'))+'</small></span></label>'+
            (done?'<span class="sh-status '+(inIt?'good':'neutral')+'">'+(inIt?T('عضو است','Member'):T('عضو نیست','Not a member'))+'</span>':'')+
            '<button class="sh-btn ghost compact rbc-icon" data-copen="'+c.id+'" type="button" title="'+T('باز کردن کوهورت','Open cohort')+'" aria-label="'+esc(T('باز کردن کوهورت ','Open cohort ')+T(c.fa,c.en))+'">'+ic(fa()?'arrow-left':'arrow-right')+'</button></li>'; }).join('')+'</ul></div>'; } }
  else h+='<div class="sh-table-wrap rbc-reptbl"><table class="sh-table rbx-tbl"><thead><tr><th>'+T('نشست','Session')+'</th><th>'+T('مدت','Duration')+'</th><th>'+T('ایونت‌ها','Events')+'</th><th>'+T('دستگاه','Device')+'</th><th></th></tr></thead><tbody>'+ss.map(function(s,si){ var ne=s.list.filter(function(e){ return !e.mark; }).length;
      return '<tr><td>'+L.ago(s.start)+'</td><td>'+T(num(s.min)+' دقیقه',s.min+' min')+'</td><td>'+num(ne)+'</td><td>'+esc(T(s.dev[0],s.dev[1]))+(nd>1?' · '+mono(s.devId,'muted'):'')+'</td><td class="rbc-play"><a class="sh-btn ghost compact" href="'+esc(window.RBAmp&&RBAmp.replayUrl?RBAmp.replayUrl({ label:T('پروفایل کاربر','User profile'), user:u.id, seed:u.id+si }):'../session-replay/')+'" target="_blank" rel="noopener">'+ic('play-circle')+T('پخش','Play')+'</a></td></tr>'; }).join('')+'</tbody></table></div>';
  return h+'</section></div>';
}
function wirePerson(root){
  var pm=root.querySelector('[data-pmore]'); if(pm) pm.addEventListener('click', function(){ CO.pall=!CO.pall; RBShell.rerender(); });
  var pd=root.querySelector('[data-pdev]'); if(pd) pd.addEventListener('change', function(){ CO.pdev=pd.value; RBShell.rerender(); });
  var pf=root.querySelector('[data-pevf]'); if(pf) pf.addEventListener('change', function(){ CO.pevf=pf.value; RBShell.rerender(); });
  var fc=root.querySelector('[data-pfclr]'); if(fc) fc.addEventListener('click', function(){ CO.pevf=''; CO.pdev=''; RBShell.rerender(); });
  var rw=root.querySelector('[data-praw]'); if(rw) rw.addEventListener('change', function(){ CO.praw=rw.checked; RBShell.rerender(); });
  /* ticks update in place (no rerender, so the page keeps its scroll); up to 10, as in Amplitude */
  var pc=root.querySelector('[data-pchart]'), tn=root.querySelector('[data-ptickn]'), cm=root.querySelector('[data-pcapmsg]');
  function sync(){ var n=Object.keys(CO.ptick).length; if(pc) pc.disabled=!n; if(tn){ tn.hidden=!n; tn.textContent=T(num(n)+' ایونت انتخاب شد',n+' selected'); } if(cm) cm.hidden=!CO.pcap; }
  root.querySelectorAll('[data-ptick]').forEach(function(c){ c.addEventListener('click', function(e){ e.stopPropagation(); });
    c.addEventListener('change', function(){ var k=c.getAttribute('data-ptick'); CO.ptick=CO.ptick||{};
      if(c.checked){ if(Object.keys(CO.ptick).length>=10){ c.checked=false; CO.pcap=true; sync(); return; } CO.ptick[k]=c.getAttribute('data-ev'); }
      else { delete CO.ptick[k]; CO.pcap=false; }
      c.closest('.rbc-ev').classList.toggle('ck', c.checked); sync(); }); });
  if(pc) pc.addEventListener('click', function(){ var ids=[]; Object.keys(CO.ptick||{}).forEach(function(k){ var id=CO.ptick[k]; if(id&&ids.indexOf(id)<0&&RB.evById(id)) ids.push(id); });
    if(!ids.length) return; if(window.RBH&&RBH.openNew){ RBH.openNew('trend'); setTimeout(function(){ RBAmp.load({ events:ids.map(function(id){ return { id:id, filters:[], groupBy:'' }; }), measure:'totals', viz:'line', interval:'auto' }, null); }, 60); } });
  /* the property search filters rows in place, so the field keeps focus */
  var pq=root.querySelector('[data-pq-in]');
  function filt(){ var q=(CO.pq||'').trim().toLowerCase(), any=false, box=root.querySelector('[data-pprops]'); if(!box) return; var grp=null, gAny=false;
    [].slice.call(box.children).forEach(function(el){ if(el.hasAttribute('data-pgrp')){ if(grp) grp.hidden=!gAny; grp=el; gAny=false; return; }
      if(el.classList.contains('rbc-kv')){ var hit=!q||el.getAttribute('data-pq').indexOf(q)>-1; el.hidden=!hit; if(hit){ gAny=true; any=true; } } });
    if(grp) grp.hidden=!gAny; var no=box.querySelector('[data-pnone]'); if(no) no.hidden=any; }
  if(pq){ pq.addEventListener('input', function(){ CO.pq=pq.value; filt(); }); filt(); }
  var bk=root.querySelector('[data-pback]'); if(bk) bk.addEventListener('click', function(){ open(CO.from); });
  var b2=root.querySelector('[data-cobk]'); if(b2) b2.addEventListener('click', function(){ RBShell.go(CO.fromView==='profiles'?'profiles':'cohorts'); });   /* a person opened from «پروفایل‌ها» goes back there */
  root.querySelectorAll('[data-ptab]').forEach(function(b){ b.addEventListener('click', function(){ CO.ptab=b.getAttribute('data-ptab'); RBShell.rerender(); }); });
  root.querySelectorAll('[data-pev]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-pev'); CO.pev=CO.pev===k?null:k; RBShell.rerender(); }); });
  root.querySelectorAll('[data-copen]').forEach(function(b){ b.addEventListener('click', function(){ open(b.getAttribute('data-copen')); }); });
  root.querySelectorAll('[data-pchk]').forEach(function(b){ b.addEventListener('change', function(){ CO.check[b.getAttribute('data-pchk')]=b.checked; if(!b.checked) delete CO.check[b.getAttribute('data-pchk')];
    if(CO.checked){ CO.checked=false; RBShell.rerender(); return; }   /* a changed pick clears the old answer */
    var n=Object.keys(CO.check).length, ckb=$('rbcCheck'), nn=root.querySelector('[data-pchkn]'), all=root.querySelector('[data-pchkall]'), tot=root.querySelectorAll('[data-pchk]').length;
    b.closest('.rbc-mrow').classList.toggle('ck', b.checked); if(ckb) ckb.disabled=!n; if(nn) nn.textContent=T(num(n)+' انتخاب شد',n+' selected'); if(all) all.textContent=n===tot?T('برداشتن همه','Clear all'):T('انتخاب همه','Select all'); }); });
  var ca=root.querySelector('[data-pchkall]'); if(ca) ca.addEventListener('click', function(){ var bs=root.querySelectorAll('[data-pchk]'), all=Object.keys(CO.check).length===bs.length; CO.check={}; if(!all) bs.forEach(function(b){ CO.check[b.getAttribute('data-pchk')]=true; }); CO.checked=false; RBShell.rerender(); });
  var pn=root.querySelector('[data-pconew]'); if(pn) pn.addEventListener('click', function(){ open(null); });
  var ck=$('rbcCheck'); if(ck) ck.addEventListener('click', function(){ if(!Object.keys(CO.check).some(function(k){ return CO.check[k]; })){ U.toast('دست‌کم یک کوهورت انتخاب کنید','Pick at least one cohort'); return; } CO.checked=true; RBShell.rerender(); });
}

function fromPerformed(p, name){
  var w=p.mode==='range'?30:(p.days<=7?7:p.days<=30?30:90), def={ groups:[{ or:[{ kind:'ev', ev:p.ev, where:(p.where||[]).slice(), op:p.op||'gte', n:p.n||1, win:w, not:false, with:'count', then:[] }].concat(p.and?[]:[]) }] };
  if(p.and) def.groups.push({ or:[{ kind:'ev', ev:p.and.ev, where:[], op:p.and.op||'gte', n:p.and.n||1, win:w, not:false, with:'count', then:[] }] });
  /* PM 2026-10-25, UC-5: a viewer's cohort from a segment's inline save is personal and unlisted, with the viewer toast (addVia) */
  var c={ fa:name, en:name, space:'me', folder:'', owner:'me', editor:'me', updated:0, views:0, tags:[], archived:false, computedH:0, disc:!VIEWER, stat:false, src:'builder', desc:'', def:def };
  pinSize(c, def); var s=sentence(def); c.defFa=s[0]; c.defEn=s[1];
  return addVia(c, false);
}
/* PM 2026-10-25, UC-5: builder and assistant cohorts go through RBShell.addCohort, so the shell's one viewer rule holds (personal, unlisted,
   the viewer toast); this page's extras (description, the AI mark) are set on the stored record afterwards. Without the API the same
   rule applies here. quiet: the caller already says where the cohort went (the assistant's undo toast, which a second toast would hide). */
function addVia(c, quiet){
  if(typeof RBShell.addCohort==='function'){ var id=RBShell.addCohort(Object.assign({}, c, { quiet:!!quiet })), rec=byId(id);
    if(rec){ ['desc','ai'].forEach(function(k){ if(c[k]!=null) rec[k]=c[k]; }); if(VIEWER) rec.disc=false; }
    return id; }
  c.id='c'+(store().length+1)+'_'+Date.now().toString(36); if(VIEWER) c.disc=false; store().push(c);
  if(VIEWER && !quiet) setTimeout(function(){ U.toast('به‌عنوان بیننده، کوهورت در فضای شخصی شما و فهرست‌نشده ذخیره شد','As a viewer, the cohort saved to your personal space, unlisted'); }, 1600);
  return c.id; }
/* 11b-2: a cohort the builder's «دستیار» proposed and the user confirmed; personal, generated, undiscoverable (Amplitude's rule for AI content) */
function createDef(def, fa, en){ var c={ fa:fa, en:en, space:'me', folder:'', owner:'me', editor:'me', updated:0, views:0, tags:[], archived:false, computedH:0, disc:false, ai:true, stat:false, src:'builder', desc:'', def:clone(def) };
  pinSize(c, c.def); var s=sentence(c.def); c.defFa=s[0]; c.defEn=s[1]; return addVia(c, true); }   /* PM 2026-10-25, UC-5: through the shell's addCohort */
window.RBCohort={ devTag:devTag, devReason:function(a){ return (DEV[a]||DEV.cohorts).slice(); }, leave:leave, sessions:function(u){ return sessions(u); }, pop:function(id){ var c=byId(id); return c?popSeries(RBShell.cohortCount(c), c.id):[]; }, open:open, view:view, wire:wire, crumb:crumb, fromProfiles:function(){ return CO.fromView==='profiles'; }, size:function(def){ return sizeOf(def); }, sentence:sentence, openPerson:openPerson, fromPerformed:fromPerformed, create:createDef };
})();
