/* ═════════ Users: computations, profiles, groups (lexicon batch c1) — v12 only ═════════
   Spec: research-notes/…/41-lexicon-c1-design.md. PM 2026-10-21:, these sit next to «کوهورت‌ها» in the side list;
   computed properties are user properties every chart can filter and break down by (one definition in rb-data-defs.js).
   Identity: Shahin's ⁦identify()⁩ and ⁦group()⁩ exist in production but no customer sends them yet (phase plan, 2026-10-15), so a «user»
   here is one browser or device and every view says so. Groups use anonymized ids (no invented company names). */
(function(){
'use strict';
if(!window.RBShell || !window.RBAmp || !window.RB) return;
var U=RBShell.ui, T=U.T, esc=U.esc, ic=U.ic, tip=U.tip, N=U.N, L=RBShell.lib;
function fa(){ return U.L()==='fa'; }
function D(){ return window.RBDefs; }
var IDNOTE=['یک کاربر یعنی یک آدم: دستگاه‌های کسی که سایت شما با ⁦identify()⁩ شناخته در این فهرست و در نمودارها یک بار شمرده می‌شوند و کاربر ناشناس هر دستگاهش جداست.','A user is a person: the devices of someone your site identified with ⁦identify()⁩ count once in this list and in charts, and an anonymous user is one per device.'];
var S={ q:'', open:'', form:null, gopen:'', idf:'all', adv:false, ap:'', av:'' };
var CAP=10;
var KINDS={ count:['تعداد یک ایونت','Count of an event'], first:['اولین مقدار یک ویژگی','First value of a property'], last:['آخرین مقدار یک ویژگی','Last value of a property'], sum:['مجموع یک ویژگی عددی','Sum of a numeric property'] };
var WINS={ '7d':['۷ روز','7 days'], '30d':['۳۰ روز','30 days'], '3m':['۹۰ روز','90 days'] };
function evName(id){ var e=RB.evById(id); return e?T(e.fa,e.en):id; }
function propName(p){ var P=RB.PROPS[p]; return P?T(P.fa,P.en):p; }
/* PM 2026-10-25, UC-2: each area's header had a «نیازمند توسعه» hook (rb-amp-cohort.js); PM 2026-10-28, LX-6: the report builder is Backlog, so it carries no «نیازمند توسعه», so dev() returns '' */
function dev(area){ return window.RBCohort&&RBCohort.devTag?RBCohort.devTag(area):''; }
function hd(fa_, en, tfa, ten, btn, area){ return '<div class="rbx-head"><span class="rbx-title">'+T(fa_,en)+'</span><span class="rbx-tipdot"'+tip("<span class='tip-title'>"+fa_+'</span>'+tfa,"<span class='tip-title'>"+en+'</span>'+ten)+'></span>'+(area?dev(area):'')+'<span class="rbx-spacer"></span>'+(btn||'')+'</div>'; }
function note(){ return '<div class="rbx-callout">'+ic('info')+'<span>'+T(IDNOTE[0],IDNOTE[1])+'</span></div>'; }
function bars(vals){ var mx=Math.max.apply(null, vals.map(function(v){ return v[2]; }))||1;
  return '<div class="ru-bars">'+vals.map(function(v){ return '<div class="ru-bar"><span>'+esc(T(v[0],v[1]))+'</span><i style="width:'+Math.max(2,Math.round(v[2]/mx*100))+'%"></i><b>'+N(Math.round(v[2]*1000)/10)+T('٪','%')+'</b></div>'; }).join('')+'</div>'; }

/* ── computations ── */
function compView(){
  var d=D(), list=d?d.get().comp||[]:[], canNew=list.length<CAP;
  var h=hd('محاسبه‌ها','Computations','برای هر کاربر یک ویژگی تازه از رفتارش حساب می‌شود، مثل «تعداد خرید در ۳۰ روز»؛ این ویژگی در فیلتر، تفکیک و کوهورت همهٔ نمودارها انتخاب می‌شود.','A new property computed per user from their behaviour, such as “purchases in 30 days”; every chart can filter, break down and build cohorts by it.',
    '<button class="sh-btn primary compact" data-ru="new" type="button"'+(canNew?'':' disabled title="'+esc(T('حداکثر '+N(CAP)+' محاسبه در هر پروژه','Up to '+CAP+' computations per project'))+'"')+'>'+ic('plus')+' '+T('محاسبهٔ تازه','New computation')+'</button>', 'computations');
  h+=note();
  if(S.form) h+=compForm();
  if(!list.length) return h+'<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('function')+'</div><div class="sh-state-title">'+T('هنوز محاسبه‌ای نساخته‌اید','No computations yet')+'</div><div class="sh-state-hint">'+T('مثلاً «تعداد خرید در ۳۰ روز» یا «آخرین منبع ورود».','e.g. “Purchases in 30 days” or “Last traffic source”.')+'</div></div></div>';
  h+='<div class="sh-card" style="padding:0"><div class="sh-table-wrap"><table class="sh-table"><thead><tr><th>'+T('محاسبه','Computation')+'</th><th>'+T('تعریف','Definition')+'</th><th>'+T('وضعیت','Status')+'</th><th>'+T('آخرین محاسبه','Last computed')+'</th><th></th></tr></thead><tbody>';
  list.forEach(function(c){ var P=RB.PROPS[c.id], fail=c.fail||(!P), op=S.open===c.id;
    h+='<tr class="click" data-ruopen="'+c.id+'"><td><b>'+esc(T(c.fa,c.en))+'</b> <code dir="ltr">'+esc(c.id)+'</code></td><td>'+esc(defText(c))+'</td><td>'+(fail?'<span class="rbz-tag bad">'+T('ناموفق','Failed')+'</span>':'<span class="rbz-tag good">'+T('آماده','Ready')+'</span>')+'</td><td>'+L.ago(c.h||0)+'</td><td>'+'<span class="ru-car'+(op?' on':'')+'">'+ic('caret-down')+'</span>'+'</td></tr>';
    if(op) h+='<tr class="ru-open"><td colspan="5">'+compDetail(c)+'</td></tr>'; });
  return h+'</tbody></table></div></div>'; }
function defText(c){ var w=WINS[c.win]||WINS['30d'];
  if(c.kind==='count') return T('تعداد «'+evName(c.ev)+'» در '+w[0], 'Count of “'+evName(c.ev)+'” in '+w[1]);
  if(c.kind==='sum') return T('مجموع «'+propName(c.prop)+'» در «'+evName(c.ev)+'»، '+w[0], 'Sum of “'+propName(c.prop)+'” on “'+evName(c.ev)+'”, '+w[1]);
  return T((c.kind==='first'?'اولین':'آخرین')+' «'+propName(c.prop)+'» در «'+evName(c.ev)+'»، '+w[0], (c.kind==='first'?'First':'Last')+' “'+propName(c.prop)+'” on “'+evName(c.ev)+'”, '+w[1]); }
function compDetail(c){ var P=RB.PROPS[c.id];
  if(!P||c.fail) return '<div class="rbx-callout warn">'+ic('warning')+'<span>'+T('محاسبه ناموفق: «'+evName(c.ev)+'» در این بازه داده‌ای ندارد. ایونت دیگری انتخاب کنید یا بازه را بلندتر کنید.','Computation failed: “'+evName(c.ev)+'” has no data in this window. Pick another event or a longer window.')+'</span></div>'+acts(c);
  return '<div class="ru-detail"><div class="ru-dh">'+T('توزیع بین کاربران','Distribution across users')+'</div>'+bars(P.vals)+
    '<div class="rbz-tnote">'+T('این ویژگی در فیلتر، تفکیک و شرط کوهورت همهٔ نمودارها با نام «'+c.fa+'» در دسته «محاسبه‌ها» هست.','It’s in every chart’s filters, breakdowns and cohort conditions as “'+c.en+'”, under “Computations”.')+'</div>'+acts(c)+'</div>'; }
function acts(c){ return '<div class="rbx-row"><button class="sh-btn ghost compact" data-ru="recompute" data-id="'+esc(c.id)+'" type="button">'+ic('arrows-clockwise')+' '+T('محاسبهٔ دوباره','Recompute')+'</button><button class="rb-linkbtn" data-ru="del" data-id="'+esc(c.id)+'" type="button">'+T('حذف','Delete')+'</button></div>'; }
function compForm(){ var f=S.form, evs=RB.EVENTS.filter(function(e){ return (e.w>0&&!e.deleted)||e.id===f.ev; }), props=f.ev?RB.propsFor(RB.evById(f.ev)).filter(function(p){ var P=RB.PROPS[p]; return P&&(f.kind==='sum'?(P.num||/value|amount|price|cost|sec/.test(p)):P.vals); }):[];
  return '<div class="sh-card ru-form">'+(noData()?'<div class="rbx-callout" data-ru-nodata="1">'+ic('info')+'<span>'+T('هنوز هیچ ایونتی در این پروژه داده ندارد؛ محاسبه بعد از رسیدن اولین داده ساخته می‌شود.','No event in this project has data yet; a computation can be built once the first data arrives.')+'</span></div>':'')+'<div class="ru-grid"><label class="rbx-field"><span>'+T('نام','Name')+'</span><input class="sh-input" data-rf="fa" value="'+esc(f.fa||'')+'"/></label>'+
    '<label class="rbx-field"><span>'+T('نوع','Kind')+'</span><select class="sh-select" data-rf="kind">'+Object.keys(KINDS).map(function(k){ return '<option value="'+k+'"'+(f.kind===k?' selected':'')+'>'+T(KINDS[k][0],KINDS[k][1])+'</option>'; }).join('')+'</select></label>'+
    '<label class="rbx-field"><span>'+T('ایونت','Event')+'</span><select class="sh-select" data-rf="ev"><option value="">—</option>'+evs.map(function(e){ return '<option value="'+e.id+'"'+(f.ev===e.id?' selected':'')+'>'+esc(T(e.fa,e.en))+'</option>'; }).join('')+'</select></label>'+
    (f.kind!=='count'?'<label class="rbx-field"><span>'+T('ویژگی','Property')+'</span><select class="sh-select" data-rf="prop"><option value="">—</option>'+props.map(function(p){ return '<option value="'+p+'"'+(f.prop===p?' selected':'')+'>'+esc(propName(p))+'</option>'; }).join('')+'</select></label>':'')+
    '<label class="rbx-field"><span>'+T('بازه','Window')+'</span><select class="sh-select" data-rf="win">'+Object.keys(WINS).map(function(k){ return '<option value="'+k+'"'+((f.win||'30d')===k?' selected':'')+'>'+T(WINS[k][0],WINS[k][1])+'</option>'; }).join('')+'</select></label></div>'+
    (f.err?'<div class="rbx-callout warn">'+ic('warning')+'<span>'+esc(T(f.err[0],f.err[1]))+'</span></div>':'')+
    '<div class="rbx-row"><button class="sh-btn primary compact" data-ru="save" type="button">'+T('محاسبه و ذخیره','Compute and save')+'</button><button class="sh-btn ghost compact" data-ru="cancel" type="button">'+T('انصراف','Cancel')+'</button></div></div>'; }

/* ── profiles: up to 50 recently active users (Amplitude's sample) ── */
function people(n){ var B=RB.PROPS.browser.vals, Cn=RB.PROPS.country.vals, R=RB.PROPS.referrer_type.vals, raw=RBAmp.users(n, 'profiles'+(RB.PROJECT||0), n);
  /* the person view also reads the last referrer and the session count */
  return raw.map(function(u, i){ var h=RB.hstr(u.id); return Object.assign({}, u, { browser:B[(h>>>3)%B.length], ref:R[(h>>>7)%R.length], sess:1+(h>>>9)%14, country:Cn[(h>>>5)%Cn.length], dev_id:'d-'+((h>>>1).toString(16)+'0000').slice(0,8), uid:null }); }); }
function compVal(c, u){ var P=RB.PROPS[c.id]; if(!P||!P.vals||!P.vals.length) return '—'; var x=RB.jit(RB.hstr(u.id+c.id)), a=0;
  for(var i=0;i<P.vals.length;i++){ a+=P.vals[i][2]; if(x<a) return T(P.vals[i][0],P.vals[i][1]); } var l=P.vals[P.vals.length-1]; return T(l[0],l[1]); }
/* a project with no data yet has no users to show */
function noData(){ return !RB.EVENTS.some(function(e){ return e.w>0; }); }
function emptyData(){ return '<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('user-circle')+'</div><div class="sh-state-title">'+T('هنوز کاربری ثبت نشده','No users recorded yet')+'</div>'+
  '<div class="sh-state-hint">'+T('با رسیدن اولین بازدید، کاربرانی که اخیراً فعال بوده‌اند این‌جا می‌آیند.','Recently active users appear here once the first visit arrives.')+'</div>'+
  '<a class="sh-btn ghost compact" href="../events-start/">'+T('راهنمای نصب کد شاهین','Shahin snippet setup guide')+'</a></div></div>'; }
/* «پروفایل‌ها» as Amplitude's User Look-Up (design pass 2026-11-15): one search over User ID, device ID and Shahin ID, an advanced search by a
   user property, the identity filter and the count; the definition of a user lives in the title's ⓘ, not in a callout */
function pOf(u){ return window.RBId?RBId.of(u):null; }
/* advanced search: the categorical user properties the site sends with identify() (identified people only), then the device properties every user has */
function advProps(){ var out=[], C=window.RBId?RBId.cfg():null;
  ((C&&C.traits)||[]).forEach(function(t){ if(!Array.isArray(t[3])) return;
    out.push({ k:'t:'+t[0], fa:t[1], en:t[2], trait:true, get:function(u){ var p=pOf(u); if(!p||!p.identified) return null; var x=p.traits.filter(function(r){ return r.key===t[0]; })[0]; return x?x.val:null; } }); });
  out.push({ k:'country', fa:'کشور', en:'Country', get:function(u){ return u.country; } });
  out.push({ k:'device_type', fa:'نوع دستگاه', en:'Device type', get:function(u){ return u.dev; } });
  out.push({ k:'browser', fa:'مرورگر', en:'Browser', get:function(u){ return u.browser; } });
  return out; }
function advVals(pr, all){ var seen={}, out=[]; all.forEach(function(u){ var v=pr.get(u); if(v&&!seen[v[1]]){ seen[v[1]]=1; out.push(v); } }); return out; }
function profView(){
  /* identity batch a (47-identity-design.md): a person may be several devices; the User ID once the site identifies them */
  var comps=(D()?D().get().comp||[]:[]).filter(function(c){ return RB.PROPS[c.id]; }), all=people(50), q=S.q.trim().toLowerCase(), f=S.idf||'all';
  var aps=advProps(), ap=aps.filter(function(x){ return x.k===S.ap; })[0]||null, av=ap&&S.av?S.av:'';
  var list=all.filter(function(u){ var p=pOf(u), hay=[u.id, p&&p.uid, p&&p.shid].concat(p?p.devices.map(function(d){ return d.id; }):[]).filter(Boolean).join(' ').toLowerCase();
    if(q && hay.indexOf(q)<0) return false;
    if(ap && av){ var v=ap.get(u); if(!v||v[1]!==av) return false; }
    if(f==='id') return !!(p&&p.identified); if(f==='anon') return !(p&&p.identified); return true; });
  var h='<div class="ru-prof">'+hd('پروفایل‌ها','User profiles','کاربرانی که اخیراً فعال بوده‌اند (حداکثر ۵۰ نفر)؛ با شناسهٔ کاربر، شناسهٔ دستگاه یا شناسهٔ شاهین جستجو کنید و هر ردیف را برای دیدن مشخصات و ایونت‌های آن کاربر باز کنید. '+RB.USER_DEF[0],'Up to 50 recently active users; search by User ID, device ID or Shahin ID and open any row to see that user’s details and events. '+RB.USER_DEF[1], '', 'profiles');
  if(noData()) return h+emptyData()+'</div>';
  var nid=list.filter(function(u){ var p=pOf(u); return p&&p.identified; }).length, advOn=!!(ap&&av);
  h+='<div class="ru-pbar"><label class="rbx-search ru-psearch">'+ic('magnifying-glass')+'<input id="ruQ" type="search" aria-label="'+T('جستجوی کاربر','Search users')+'" placeholder="'+T('جستجوی شناسهٔ کاربر، شناسهٔ دستگاه یا شناسهٔ شاهین','Search User ID, device ID or Shahin ID')+'" value="'+esc(S.q)+'"/></label>'+
    '<button type="button" class="sh-btn ghost compact ru-advbtn'+(S.adv||advOn?' on':'')+'" data-ruadv="1" aria-expanded="'+(!!S.adv)+'">'+ic('faders')+T('جستجوی پیشرفته','Advanced search')+(advOn?'<span class="ru-advn">'+N(1)+'</span>':'')+'</button>'+
    '<span class="rbz-seg2 unit ru-pseg" role="tablist" aria-label="'+T('وضعیت هویت','Identity status')+'">'+[['all','همه','All'],['id','شناسایی‌شده','Identified'],['anon','ناشناس','Anonymous']].map(function(x){ var on=f===x[0]; return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-ruidf="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</span>'+
    '<span class="rbx-spacer"></span><span class="ru-pcount" data-rucount="1"><b>'+T(N(list.length)+' کاربر',list.length+(list.length===1?' user':' users'))+'</b>'+(f==='all'&&list.length?'<span class="rbx-dot"></span>'+T(N(nid)+' شناسایی‌شده',nid+' identified'):'')+'</span></div>';
  if(S.adv||advOn){ var vals=ap?advVals(ap, all):[];
    h+='<div class="ru-adv" data-ruadvrow="1"><span class="ru-advl">'+T('کاربرانی که','Users whose')+'</span>'+
      '<select class="sh-select" data-ruap="1" aria-label="'+T('ویژگی کاربر','User property')+'"><option value="">'+T('یک ویژگی انتخاب کنید','Pick a property')+'</option>'+
        (aps.some(function(x){ return x.trait; })?'<optgroup label="'+T('ویژگی‌های کاربر','User properties')+'">'+aps.filter(function(x){ return x.trait; }).map(function(x){ return '<option value="'+x.k+'"'+(S.ap===x.k?' selected':'')+'>'+esc(T(x.fa,x.en))+'</option>'; }).join('')+'</optgroup>':'')+
        '<optgroup label="'+T('دستگاه و مکان','Device and location')+'">'+aps.filter(function(x){ return !x.trait; }).map(function(x){ return '<option value="'+x.k+'"'+(S.ap===x.k?' selected':'')+'>'+esc(T(x.fa,x.en))+'</option>'; }).join('')+'</optgroup></select>'+
      '<span class="ru-advl">'+T('برابر است با','is')+'</span>'+
      '<select class="sh-select" data-ruav="1" aria-label="'+T('مقدار','Value')+'"'+(ap?'':' disabled')+'><option value="">'+T('یک مقدار انتخاب کنید','Pick a value')+'</option>'+vals.map(function(v){ return '<option value="'+esc(v[1])+'"'+(av===v[1]?' selected':'')+'>'+esc(T(v[0],v[1]))+'</option>'; }).join('')+'</select>'+
      '<span class="rbx-spacer"></span>'+(S.ap||S.av?'<button type="button" class="rb-linkbtn" data-ruadvclr="1">'+T('حذف شرط','Clear condition')+'</button>':'')+'</div>'; }
  if(!list.length) return h+'<div class="sh-card"><div class="sh-state" data-ruempty="1"><div class="sh-state-icon">'+ic('magnifying-glass')+'</div><div class="sh-state-title">'+T('کاربری با این جستجو پیدا نشد','No users match this search')+'</div>'+
    '<div class="sh-state-hint">'+(ap&&ap.trait&&av?T('ویژگی‌های کاربر فقط برای کاربران شناسایی‌شده ثبت می‌شوند؛ شناسه یا شرط دیگری را امتحان کنید.','User properties are recorded for identified users only; try another ID or condition.'):T('شناسهٔ کامل یا بخشی از آن را بنویسید، یا فیلتر هویت را روی «همه» بگذارید.','Type all or part of an ID, or set the identity filter to All.'))+'</div>'+
    '<button type="button" class="sh-btn ghost compact" data-ruclear="1">'+T('پاک کردن جستجو','Clear search')+'</button></div></div></div>';
  h+='<div class="sh-card ru-ptcard"><div class="sh-table-wrap ru-ptwrap"><table class="sh-table rbx-tbl ru-ptbl"><thead><tr><th>'+T('شناسهٔ کاربر','User ID')+'</th><th>'+T('شناسهٔ شاهین','Shahin ID')+'</th><th>'+T('دستگاه‌ها','Devices')+'</th><th>'+T('آخرین فعالیت','Last seen')+'</th><th>'+T('کشور','Country')+'</th><th>'+T('نوع دستگاه','Device type')+'</th>'+comps.map(function(c){ return '<th>'+esc(T(c.fa,c.en))+'</th>'; }).join('')+'</tr></thead><tbody>';
  list.forEach(function(u){ var p=pOf(u), nd=p?p.devices.length:1, idd=!!(p&&p.identified), lab=idd?p.uid:T('کاربر ناشناس','Anonymous user');
    h+='<tr class="click" tabindex="0" role="link" aria-label="'+esc(T('باز کردن پروفایل ','Open profile of ')+lab)+'" data-ruperson="'+all.indexOf(u)+'"><td><span class="ru-uid">'+(idd?'<span class="ru-mono" dir="ltr">'+esc(p.uid)+'</span><span class="sh-status good">'+T('شناسایی‌شده','Identified')+'</span>':'<span class="sh-status neutral">'+T('ناشناس','Anonymous')+'</span>')+'</span></td>'+
      '<td><span class="ru-mono muted" dir="ltr">'+esc(p?p.shid:'—')+'</span></td><td>'+T(N(nd)+' دستگاه',nd+(nd===1?' device':' devices'))+'</td><td>'+L.ago(u.ago)+'</td><td>'+esc(T(u.country[0],u.country[1]))+'</td><td>'+esc(T(u.dev[0],u.dev[1]))+'</td>'+comps.map(function(c){ return '<td>'+compVal(c,u)+'</td>'; }).join('')+'</tr>'; });
  return h+'</tbody></table></div></div></div>'; }

/* ── groups (accounts) ── */
function groups(){ var n=noData()?0:12, out=[];
  for(var i=0;i<n;i++){ var h=RB.hstr('org'+(RB.PROJECT||0)+i), m=3+(h%37);
    out.push({ id:'org_'+(1000+(h%9000)), members:m, ago:1+(h>>>4)%60, plan:[['رایگان','Free'],['پلاس','Plus'],['پرو','Pro']][(h>>>2)%3], events:Math.round(m*(40+(h>>>6)%120)) }); }
  return out.sort(function(a,b){ return b.members-a.members; }); }
function groupView(){
  var gs=groups(), g=gs.filter(function(x){ return x.id===S.gopen; })[0];
  var h=hd('گروه‌ها','Groups','گروه یعنی چند کاربر که با هم یک حساب‌اند، مثل یک سازمان؛ سایت با ⁦group()⁩ گروه هر کاربر را می‌فرستد و گزارش‌ها می‌توانند به‌جای کاربر، گروه را بشمارند.','A group is several users who share one account, such as an organization; the site sends each user’s group with ⁦group()⁩, and reports can count groups instead of users.', '', 'groups');
  h+='<div class="rbx-callout">'+ic('info')+'<span>'+T('شاهین ⁦group()⁩ را دارد، ولی هنوز هیچ مشتری‌ای آن را نمی‌فرستد؛ این فهرست نمونه است و شناسه‌ها ناشناس‌اند.','Shahin supports ⁦group()⁩, but no customer sends it yet; this list is a sample with anonymized ids.')+'</span></div>';
  if(!gs.length) return h+'<div class="sh-card"><div class="sh-state"><div class="sh-state-title">'+T('هنوز گروهی ثبت نشده','No groups yet')+'</div><div class="sh-state-hint">'+T('گروه‌ها با فرستادن ⁦group()⁩ از سایت شما ساخته می‌شوند.','Groups appear once your site sends ⁦group()⁩.')+'</div></div></div>';
  if(g){ h+='<button class="rb-linkbtn" data-ruback="1" type="button">'+ic(fa()?'arrow-right':'arrow-left')+T('همهٔ گروه‌ها','All groups')+'</button>';
    h+='<div class="sh-card ru-gp"><h3 dir="ltr">'+esc(g.id)+'</h3><div class="ru-kv"><span>'+T('نوع گروه','Group type')+'</span><b>'+T('سازمان','Organization')+'</b></div><div class="ru-kv"><span>'+T('اعضا','Members')+'</span><b>'+N(g.members)+'</b></div><div class="ru-kv"><span>'+T('طرح','Plan')+'</span><b>'+esc(T(g.plan[0],g.plan[1]))+'</b></div><div class="ru-kv"><span>'+T('ایونت در ۳۰ روز','Events in 30 days')+'</span><b>'+N(g.events)+'</b></div><div class="ru-kv"><span>'+T('آخرین فعالیت','Last active')+'</span><b>'+L.ago(g.ago)+'</b></div>'+
      '<div class="ru-dh">'+T('اعضا','Members')+'</div><div class="ru-mem">'+RBAmp.users(g.members, g.id, Math.min(g.members, 12)).map(function(u){ return '<span class="rbz-tag" dir="ltr">'+u.id+'</span>'; }).join(' ')+'</div></div>';
    return h; }
  h+='<div class="sh-card" style="padding:0"><div class="sh-table-wrap"><table class="sh-table rbx-tbl"><thead><tr><th>'+T('گروه','Group')+'</th><th>'+T('اعضا','Members')+'</th><th>'+T('طرح','Plan')+'</th><th>'+T('ایونت در ۳۰ روز','Events in 30 days')+'</th><th>'+T('آخرین فعالیت','Last active')+'</th></tr></thead><tbody>'+
    gs.map(function(x){ return '<tr class="click" tabindex="0" data-rugroup="'+esc(x.id)+'"><td dir="ltr">'+esc(x.id)+'</td><td>'+N(x.members)+'</td><td>'+esc(T(x.plan[0],x.plan[1]))+'</td><td>'+N(x.events)+'</td><td>'+L.ago(x.ago)+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  return h; }

function view(v){ return v==='computations'?compView():v==='profiles'?profView():groupView(); }
function crumb(v){ return v==='computations'?['محاسبه‌ها','Computations']:v==='profiles'?['پروفایل‌ها','User profiles']:['گروه‌ها','Groups']; }
function wire(root){
  root.querySelectorAll('[data-ruidf]').forEach(function(b){ b.addEventListener('click', function(){ S.idf=b.getAttribute('data-ruidf'); RBShell.rerender(); }); });
  var q=root.querySelector('#ruQ'); if(q) q.addEventListener('input', function(){ var p=q.selectionStart; S.q=q.value; RBShell.rerender(); var n=document.getElementById('ruQ'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } });
  var ad=root.querySelector('[data-ruadv]'); if(ad) ad.addEventListener('click', function(){ S.adv=!S.adv; if(!S.adv&&!(S.ap&&S.av)){ S.ap=''; S.av=''; } RBShell.rerender(); var n=root.querySelector('[data-ruap]'); if(n&&S.adv) n.focus(); });
  var apx=root.querySelector('[data-ruap]'); if(apx) apx.addEventListener('change', function(){ S.ap=apx.value; S.av=''; RBShell.rerender(); var n=root.querySelector('[data-ruav]'); if(n&&!n.disabled) n.focus(); });
  var avx=root.querySelector('[data-ruav]'); if(avx) avx.addEventListener('change', function(){ S.av=avx.value; RBShell.rerender(); });
  var acl=root.querySelector('[data-ruadvclr]'); if(acl) acl.addEventListener('click', function(){ S.ap=''; S.av=''; RBShell.rerender(); });
  var clr=root.querySelector('[data-ruclear]'); if(clr) clr.addEventListener('click', function(){ S.q=''; S.ap=''; S.av=''; S.adv=false; S.idf='all'; RBShell.rerender(); var n=document.getElementById('ruQ'); if(n) n.focus(); });
  root.querySelectorAll('[data-ruperson]').forEach(function(tr){ var go=function(){ var u=people(50)[+tr.getAttribute('data-ruperson')]; if(window.RBCohort&&RBCohort.openPerson) RBCohort.openPerson(u, null, 'profiles'); }; tr.addEventListener('click', go); tr.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); });
  root.querySelectorAll('[data-rugroup]').forEach(function(tr){ tr.addEventListener('click', function(){ S.gopen=tr.getAttribute('data-rugroup'); RBShell.rerender(); }); });
  var bk=root.querySelector('[data-ruback]'); if(bk) bk.addEventListener('click', function(){ S.gopen=''; RBShell.rerender(); });
  root.querySelectorAll('[data-ruopen]').forEach(function(tr){ tr.addEventListener('click', function(){ var id=tr.getAttribute('data-ruopen'); S.open=S.open===id?'':id; RBShell.rerender(); }); });
  root.querySelectorAll('[data-rf]').forEach(function(x){ x.addEventListener(x.tagName==='SELECT'?'change':'input', function(){ S.form[x.getAttribute('data-rf')]=x.value; S.form.err=null; if(x.tagName==='SELECT'){ if(x.getAttribute('data-rf')!=='prop'&&x.getAttribute('data-rf')!=='win') S.form.prop=''; RBShell.rerender(); } }); });
  root.querySelectorAll('[data-ru]').forEach(function(x){ x.addEventListener('click', function(e){ e.stopPropagation(); act(x.getAttribute('data-ru'), x); }); });
}
function act(a, x){ var d=D(); if(!d) return;
  if(a==='new'){ S.form={ kind:'count', win:'30d' }; return RBShell.rerender(); }
  if(a==='cancel'){ S.form=null; return RBShell.rerender(); }
  if(a==='save'){ var f=S.form; if(!f.fa){ f.err=['نام را بنویسید.','Write a name.']; return RBShell.rerender(); } if(!f.ev){ f.err=['ایونت را انتخاب کنید.','Pick an event.']; return RBShell.rerender(); }
    if(f.kind!=='count'&&!f.prop){ f.err=['ویژگی را انتخاب کنید.','Pick a property.']; return RBShell.rerender(); }
    var r=d.addComp({ fa:f.fa, en:f.fa, kind:f.kind, ev:f.ev, prop:f.prop||'', win:f.win||'30d' }); if(r.err){ f.err=r.err; return RBShell.rerender(); }
    S.form=null; S.open=r.id; U.toast(r.fail?'محاسبه ذخیره شد ولی ناموفق بود؛ جزئیات را ببینید':'محاسبه آماده است؛ در فیلتر و تفکیک نمودارها هست', r.fail?'Saved, but the computation failed; see the details':'Computation ready; it’s in every chart’s filters and breakdowns'); return RBShell.rerender(); }
  if(a==='recompute'){ d.recompute(x.getAttribute('data-id')); U.toast('دوباره محاسبه شد','Recomputed'); return RBShell.rerender(); }
  if(a==='del') return delComp(x.getAttribute('data-id'));
}
/* PM 2026-10-25, UC-6: deleting a computation asks first and lists the saved charts and cohorts that use it, each with a link.
   A chart uses it when its query names the property (quoted match, so comp_x never matches comp_x2); a cohort when a condition does. */
function compUsers(id){ var out=[], k='"'+id+'"';
  RB.SAVED.forEach(function(sv, i){ try{ if(JSON.stringify(sv.q||{}).indexOf(k)>-1) out.push({ i:i, fa:sv.fa, en:sv.en }); }catch(e){} });
  (RBShell.cohortStore?RBShell.cohortStore():[]).forEach(function(c){ if(c.archived||!c.def) return; if(JSON.stringify(c.def).indexOf(k)>-1) out.push({ cohort:c.id, fa:c.fa, en:c.en }); });
  return out; }
function delComp(id){ var d=D(), c=(d.get().comp||[]).filter(function(x){ return x.id===id; })[0]; if(!c) return; var used=compUsers(id);
  U.modal({ fa:'حذف محاسبه', en:'Delete computation', subFa:'«'+c.fa+'» حذف می‌شود و از فیلترها، تفکیک‌ها و شرط‌های کوهورت بیرون می‌رود.', subEn:'“'+(c.en||c.fa)+'” will be deleted and leave filters, breakdowns and cohort conditions.',
    body:used.length?'<div class="rbz-tnote">'+T('این محاسبه در این نمودارها و کوهورت‌ها به کار رفته است:','This computation is used in these charts and cohorts:')+'</div><div class="rbc-used">'+used.map(function(u){ return u.cohort!=null?
      '<button class="rbx-rrow" data-depco="'+esc(u.cohort)+'" type="button"><span class="gi cohort">'+ic('users-three')+'</span><span class="t">'+esc(T(u.fa,u.en))+'</span></button>':
      '<button class="rbx-rrow" data-deprep="'+u.i+'" type="button"><span class="gi report">'+ic('chart-line')+'</span><span class="t">'+esc(T(u.fa,u.en))+'</span></button>'; }).join('')+'</div>':'',
    init:function(body, close){ body.querySelectorAll('[data-deprep]').forEach(function(b){ b.addEventListener('click', function(){ close(); RBShell.openReport(+b.getAttribute('data-deprep')); }); });
      body.querySelectorAll('[data-depco]').forEach(function(b){ b.addEventListener('click', function(){ close(); if(window.RBCohort) RBCohort.open(b.getAttribute('data-depco')); }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'حذف', en:'Delete', danger:true, fn:function(){ d.removeComp(id); S.open=''; U.toast('محاسبه حذف شد','Computation deleted'); RBShell.rerender(); } }] }); }
/* the person view also shows the user's computed properties */
function personProps(u){ return ((D()?D().get().comp:[])||[]).filter(function(c){ return RB.PROPS[c.id]; }).map(function(c){ return [c.fa, c.en, esc(compVal(c,u))]; }); }
window.RBUsers={ view:view, wire:wire, crumb:crumb, personProps:personProps, people:people, groups:groups, compVal:compVal };
})();
