/* ═════════ «احتمال رفتار» — Amplitude Predictions / predictive cohorts (2026-10-23), v12 only ═════════
   Research: research-notes/…/48-microscope-accounts-predictions-research.md §3 (P1–P10). PM 2026-10-23: built in the demo, named
   «احتمال رفتار» («پیش‌بینی» is taken by «ناهنجاری و پیش‌بینی»). Users ▸ «احتمال رفتار»: a list of predictions; «+ احتمال رفتار
   تازه» → starting population (active in 90 days, or a cohort), future outcome (did / didn't do an event), period 7/30/60/90 days;
   a data-requirement check (outcome ≥ 50 daily users, population ≥ 1,000, as Amplitude); a detail page with «تحلیل مخاطب» (likelihood
   by user percentile, a range, users / predicted rate / lift, «ذخیره به‌عنوان کوهورت»), «ویژگی‌های اثرگذار» and «کیفیت مدل» (TPR, FPR,
   AUC, log loss). Shahin has no prediction model, so none of this is backed by production (PM 2026-10-28, LX-6: the report builder is Backlog, so it carries no «نیازمند توسعه»). Chart gate (chart-review): intent = how
   likelihood is spread over users (ranked); one series; y from 0; the selected range is the only highlight; percentile ≠ probability
   is said under the chart. */
(function(){
'use strict';
if(!window.RBShell||!window.RBUsers||!window.RB) return;
var U=RBShell.ui, T=U.T, esc=U.esc, ic=U.ic, tip=U.tip, N=U.N, L=RBShell.lib;
function fa(){ return U.L()==='fa'; }
function pct(x,d){ return N(Math.round(x*Math.pow(10,d||1))/Math.pow(10,d||1))+T('٪','%'); }
var PROJ=RB.PROJECT||0, KEY='shahin-pred-p'+PROJ;
function devb(){ return ''; }   /* PM 2026-10-28, LX-6: the report builder is Backlog, so it carries no «نیازمند توسعه» */
var S={ open:'', form:null, tab:'aud', lo:80, hi:100 };
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(P)); }catch(e){} }
function noData(){ return !RB.EVENTS.some(function(e){ return e.w>0; }); }
var OUTCOME=['purchase','subscription_started','video_completed','article_read_completed','add_to_cart','search_submitted'];
function evOk(id){ var e=RB.evById(id); return !!e&&e.w>0; }
function evName(id){ var e=RB.evById(id); return e?T(e.fa,e.en):id; }
function pop90(){ var q=RB.Q, s={ r:q.range, t:q.type, f:q.filters }; try{ q.type='trend'; q.range='3m'; q.filters=[]; var pv=RB.evById('page_view'); return pv&&pv.w>0?Math.round(RB.periodUniques(RB.seriesR(pv,true))):0; } finally{ q.range=s.r; q.type=s.t; q.filters=s.f; } }
function dailyUsers(id){ var e=RB.evById(id); if(!e||!(e.w>0)) return 0; var q=RB.Q, s={ r:q.range, t:q.type, f:q.filters }; try{ q.type='trend'; q.range='30d'; q.filters=[]; var b=RB.seriesR(e,true); return Math.round(RB.sum(b)/b.length); } finally{ q.range=s.r; q.type=s.t; q.filters=s.f; } }
function seed(){ var ev=OUTCOME.filter(evOk)[0]; if(!ev||noData()) return { list:[] };
  var E=RB.evById(ev); return { list:[{ id:'pr1', fa:'احتمال «'+E.fa+'» در ۳۰ روز آینده', en:'Likelihood of “'+E.en+'” in the next 30 days', ev:ev, did:true, win:30, popc:'', ts:Date.now()-3*864e5, ready:true }] }; }
var P=load()||seed();
P.list.forEach(function(x){ delete x.props; });   /* UC-9: the user-properties option is gone */
function byId(id){ return P.list.filter(function(x){ return x.id===id; })[0]; }
/* PM 2026-10-25, UC-9: the audience is sized from the starting population — the chosen cohort when there is one, else everyone active
   in 90 days; the outcome's base rate stays the share among all active users (lift = predicted rate ÷ that base rate) */
function popOf(p){ if(p&&p.popc){ var c=RBShell.cohorts().filter(function(x){ return x.id===p.popc; })[0]; if(c) return c.n||0; } return pop90(); }
/* the model's numbers for one prediction: base rate in the period, a convex likelihood curve over percentiles, quality */
function model(p){ var h=RB.hstr(p.id+p.ev+p.win)>>>0, j=function(k){ return RB.jit(h+k); };
  var base=Math.min(0.6, Math.max(0.01, (dailyUsers(p.ev)*p.win*0.55)/Math.max(1,pop90())));
  if(!p.did) base=1-base;
  var a=3.2+1.6*j(1), mean=(Math.exp(a)-1)/a, k=base/mean;
  return { base:base, a:a, k:k, n:popOf(p), auc:0.71+0.17*j(2), tpr:0.62+0.25*j(3), fpr:0.08+0.12*j(4), logloss:0.18+0.22*j(5),
    p:function(u){ return Math.min(0.98, k*Math.exp(a*u)); },
    avg:function(lo,hi){ if(hi<=lo) return this.p(lo); return Math.min(0.98, k*(Math.exp(a*hi)-Math.exp(a*lo))/(a*(hi-lo))); } }; }
function hd(t1,t2,tf,te,btn){ return '<div class="rbx-head"><span class="rbx-title">'+T(t1,t2)+'</span><span class="rbx-tipdot"'+tip("<span class='tip-title'>"+t1+'</span>'+tf,"<span class='tip-title'>"+t2+'</span>'+te)+'></span>'+devb()+'<span class="rbx-spacer"></span>'+(btn||'')+'</div>'; }
function listView(){
  var h=hd('احتمال رفتار','Predictions','احتمال این‌که هر کاربر کاری را (مثلاً خرید) در چند روز آینده انجام دهد؛ کاربران به ترتیب احتمال رتبه‌بندی می‌شوند و از هر بازه می‌شود کوهورت ساخت.','How likely each user is to do something (e.g. purchase) in the coming days; users are ranked by likelihood and any range can become a cohort.',
    noData()?'':'<button class="sh-btn primary compact" data-pr="new" type="button">+ '+T('احتمال رفتار تازه','New prediction')+'</button>');
  if(noData()) return h+'<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('chart-line')+'</div><div class="sh-state-title">'+T('هنوز داده‌ای برای پیش‌بینی نیست','No data to predict from yet')+'</div><div class="sh-state-hint">'+T('احتمال رفتار به چند هفته دادهٔ کاربران و دست‌کم ۵۰ کاربرِ روزانه برای رفتار هدف نیاز دارد.','Predictions need a few weeks of user data and at least 50 daily users for the target behaviour.')+'</div><a class="sh-btn ghost compact" href="../events-start/">'+T('راهنمای نصب کد شاهین','Shahin snippet setup guide')+'</a></div></div>';
  if(S.form) h+=formView();
  if(!P.list.length) return h+'<div class="sh-card"><div class="sh-state"><div class="sh-state-title">'+T('هنوز احتمال رفتاری نساخته‌اید','No predictions yet')+'</div></div></div>';
  return h+'<div class="sh-card" style="padding:0"><div class="sh-table-wrap"><table class="sh-table rbx-tbl"><thead><tr><th>'+T('نام','Name')+'</th><th>'+T('رفتار هدف','Outcome')+'</th><th>'+T('دوره','Period')+'</th><th>'+T('دقت (AUC)','Accuracy (AUC)')+'</th><th>'+T('وضعیت','Status')+'</th></tr></thead><tbody>'+
    P.list.map(function(p){ var m=model(p), ready=p.ready||Date.now()-p.ts>4000; return '<tr class="click" tabindex="0" data-propen="'+p.id+'"><td>'+esc(T(p.fa,p.en))+'</td><td>'+(p.did?'':T('انجام ندادنِ ','Not doing '))+esc(evName(p.ev))+'</td><td>'+T(N(p.win)+' روز',p.win+' days')+'</td><td>'+(ready?pct(m.auc*100,0):'—')+'</td><td><span class="sh-chip '+(ready?'good':'warn')+'">'+(ready?T('آماده','Ready'):T('در حال ساخت (حدود یک ساعت)','Building (about an hour)'))+'</span></td></tr>'; }).join('')+'</tbody></table></div></div>'; }
function formView(){ var f=S.form, evs=RB.EVENTS.filter(function(e){ return e.w>0; }), cs=RBShell.cohorts();
  return '<div class="sh-card rpr-form"><div class="rpr-grid">'+
    '<label class="rbx-field"><span>'+T('نام','Name')+'</span><input class="sh-input" data-prf="fa" value="'+esc(f.fa||'')+'"/></label>'+
    '<label class="rbx-field"><span>'+T('جمعیت شروع','Starting population')+'</span><select class="sh-select" data-prf="popc"><option value="">'+T('همهٔ کاربران فعال در ۹۰ روز اخیر','All users active in the last 90 days')+'</option>'+cs.map(function(c){ return '<option value="'+esc(c.id)+'"'+(f.popc===c.id?' selected':'')+'>'+esc(T(c.fa,c.en))+' ('+N(c.n)+')</option>'; }).join('')+'</select></label>'+
    '<label class="rbx-field"><span>'+T('رفتار هدف','Future outcome')+'</span><span class="rpr-row"><select class="sh-select" data-prf="did"><option value="1"'+(f.did?' selected':'')+'>'+T('انجام بدهد','Does')+'</option><option value="0"'+(f.did?'':' selected')+'>'+T('انجام ندهد','Doesn’t do')+'</option></select><select class="sh-select" data-prf="ev">'+evs.map(function(e){ return '<option value="'+e.id+'"'+(f.ev===e.id?' selected':'')+'>'+esc(T(e.fa,e.en))+'</option>'; }).join('')+'</select></span></label>'+
    /* Block C (2026-10-24, gap audit 49b): a property condition on the outcome event (Amplitude: "where" on the future event) */
    (function(){ var ev=RB.evById(f.ev), ps=(ev&&ev.props||[]).filter(function(k){ return RB.PROPS[k]&&RB.PROPS[k].vals&&RB.PROPS[k].vals.length>1; }), P0=f.oprop&&RB.PROPS[f.oprop];
      return '<label class="rbx-field"><span>'+T('شرط روی ویژگی (اختیاری)','Property condition (optional)')+'</span><span class="rpr-row"><select class="sh-select" data-prf="oprop"><option value="">'+T('بدون شرط','No condition')+'</option>'+ps.map(function(k){ return '<option value="'+k+'"'+(f.oprop===k?' selected':'')+'>'+esc(T(RB.PROPS[k].fa,RB.PROPS[k].en))+'</option>'; }).join('')+'</select>'+
        (P0?'<select class="sh-select" data-prf="oval">'+P0.vals.map(function(v){ return '<option value="'+esc(v[1])+'"'+(f.oval===v[1]?' selected':'')+'>'+esc(T(v[0],v[1]))+'</option>'; }).join('')+'</select>':'')+'</span></label>'; })()+
    '<label class="rbx-field"><span>'+T('در چند روز آینده','Within')+'</span><select class="sh-select" data-prf="win">'+[7,30,60,90].map(function(d){ return '<option value="'+d+'"'+(+f.win===d?' selected':'')+'>'+T(N(d)+' روز',d+' days')+'</option>'; }).join('')+'</select></label>'+
    /* PM 2026-10-25, UC-9: no «ویژگی‌های کاربر هم در مدل باشد» option until a real model exists */
    '</div>'+fitWarn(f)+
    (f.err?'<div class="sh-alert warn"><span class="sh-alert-icon">⚠️</span><span>'+esc(T(f.err[0],f.err[1]))+'</span></div>':'')+
    '<div class="rpr-acts"><button class="sh-btn primary compact" data-pr="save" type="button">'+T('ساختن','Build')+'</button><button class="sh-btn ghost compact" data-pr="cancel" type="button">'+T('انصراف','Cancel')+'</button><span class="rbz-tnote">'+T('رفتار هدف دست‌کم ۵۰ کاربرِ روزانه و جمعیت شروع دست‌کم ۱٬۰۰۰ کاربر لازم دارد.','The outcome needs at least 50 daily users and the starting population at least 1,000 users.')+'</span></div></div>'; }
/* PM 2026-10-25, UC-9: Amplitude's further fit rules are warnings, never blockers (the 50 daily users and 1,000 starting users rules
   stay blockers on «ساختن»). Copy final (2026-10-30 copy cleanup). */
function fitWarn(f){
  var mau=Math.round((f&&f.popc?popOf(f):pop90())*30/90), st=window.RBAmp&&RBAmp.evStats?RBAmp.evStats('_any_active','n90'):null, epu=st&&st.u?Math.round(st.t/st.u):0, w=[];
  if(epu<10000) w.push(['این پروژه در ۹۰ روز اخیر حدود '+N(epu)+' ایونت برای هر کاربر دارد؛ مدل با حدود ۱۰٬۰۰۰ ایونت برای هر کاربر بهترین نتیجه را می‌دهد.','This project has about '+epu+' events per user in the last 90 days; the model fits best with about 10,000 events per user.']);
  if(mau<100000) w.push(['جمعیت شروع ماهانه حدود '+N(mau)+' کاربر است؛ مدل با بیش از ۱۰۰٬۰۰۰ کاربر ماهانه بهترین نتیجه را می‌دهد.','The starting population is about '+mau+' monthly users; the model fits best with over 100,000 monthly users.']);
  w.push(['این مدل برای محصولات B2B معمولا دقت کمتری دارد.','The model is usually less accurate for B2B products.']);
  return '<div class="sh-alert warn rpr-fit" data-prfit="1"><span class="sh-alert-icon">ⓘ</span><span><b>'+T('نکته‌های تناسب داده (مانع ساختن مدل نیستند)','Data fit notes (they don’t block building the model)')+'</b>'+w.map(function(x){ return '<br>'+esc(T(x[0],x[1])); }).join('')+'</span></div>'; }
function detailView(p){ var m=model(p), ready=p.ready||Date.now()-p.ts>4000;
  var h='<button class="rb-linkbtn" data-pr="back" type="button">'+ic(fa()?'arrow-right':'arrow-left')+T('همهٔ احتمال‌ها','All predictions')+'</button>'+hd(p.fa,p.en,'کاربران به ترتیب احتمال انجام «'+evName(p.ev)+'» در '+N(p.win)+' روز آینده.','Users ranked by their likelihood of “'+evName(p.ev)+'” in the next '+p.win+' days.');
  /* Block C (P11): when the scores refresh */
  if(ready) h+='<div class="rbx-meta rpr-fresh">'+ic('arrows-clockwise')+T('امتیازها هر روز به‌روز می‌شوند · آخرین به‌روزرسانی امروز ساعت ۶ صبح','Scores refresh daily · last refreshed today at 6:00 AM')+(p.oprop?' · '+T('شرط: ','Condition: ')+esc(T((RB.PROPS[p.oprop]||{}).fa||p.oprop,(RB.PROPS[p.oprop]||{}).en||p.oprop))+' = '+esc(p.oval||''):'')+'</div>';
  if(!ready) return h+'<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('hourglass')+'</div><div class="sh-state-title">'+T('مدل در حال ساخت است','The model is being built')+'</div><div class="sh-state-hint">'+T('ساختن مدل حدود یک ساعت طول می‌کشد؛ وقتی آماده شد در صندوق اعلان‌ها و با ایمیل خبرتان می‌کنیم.','Building takes about an hour; when it’s ready, you’ll be notified in your inbox and by email.')+'</div></div></div>';
  h+='<div class="rbz-seg2 rpr-tabs" role="tablist">'+[['aud','تحلیل مخاطب','Audience analysis'],['feat','ویژگی‌های اثرگذار','Feature importance'],['perf','کیفیت مدل','Model performance']].map(function(t){ var on=S.tab===t[0]; return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-prtab="'+t[0]+'">'+T(t[1],t[2])+'</button>'; }).join('')+'</div>';
  if(S.tab==='aud'){ var lo=S.lo/100, hi=S.hi/100, users=Math.round(m.n*(hi-lo)), avg=m.avg(lo,hi);
    h+='<div class="sh-card"><div class="rpr-range"><label>'+T('از صدک','From percentile')+' <input class="sh-input" type="number" min="0" max="99" data-prr="lo" value="'+S.lo+'"/></label><label>'+T('تا صدک','To percentile')+' <input class="sh-input" type="number" min="1" max="100" data-prr="hi" value="'+S.hi+'"/></label>'+
      [[80,100,'۲۰٪ بالا','Top 20%'],[50,100,'نیمهٔ بالا','Top half'],[0,50,'نیمهٔ پایین','Bottom half']].map(function(b){ return '<button type="button" class="sh-chip'+(S.lo===b[0]&&S.hi===b[1]?' on':' off')+'" data-prp="'+b[0]+'-'+b[1]+'">'+T(b[2],b[3])+'</button>'; }).join('')+'</div>'+
      '<div class="rpr-help"><span class="rbz-tnote">'+T('کمک برای انتخاب بازه:','Help picking a range:')+'</span>'+
        '<button type="button" class="sh-chip off" data-prh="infl"'+tip("<span class='tip-title'>نقطهٔ عطف</span>از صدکی که احتمال در آن دو برابر میانگین می‌شود تا بالا؛ جایی که منحنی تند می‌شود.","<span class='tip-title'>Inflection point</span>From the percentile where the likelihood reaches twice the average, up to the top; where the curve turns steep.")+'>'+T('نقطهٔ عطف','Inflection point')+'</button>'+
        '<label class="rpr-hin">'+T('اندازهٔ هدف','Target size')+' <input class="sh-input" id="prhSize" type="number" min="1" value="'+Math.round(m.n*0.1)+'"/><button type="button" class="sh-chip off" data-prh="size">'+T('اعمال','Apply')+'</button></label>'+
        '<label class="rpr-hin">'+T('بالابری دست‌کم','Minimum lift')+' <input class="sh-input" id="prhLift" type="number" min="1" step="0.5" value="2"/>×<button type="button" class="sh-chip off" data-prh="lift">'+T('اعمال','Apply')+'</button></label></div>'+
      '<div class="rpr-kpis"><div><b>'+N(users)+'</b><span>'+T('کاربر در این بازه','users in this range')+'</span></div><div><b>'+pct(avg*100)+'</b><span>'+T('احتمال پیش‌بینی‌شده','predicted rate')+'</span></div><div><b>'+N(Math.round(avg/m.base*10)/10)+'×</b><span>'+T('نسبت به میانگین ('+pct(m.base*100)+')','vs. the average ('+pct(m.base*100)+')')+'</span></div></div>'+
      '<div class="rpr-chart" id="rprChart" style="height:260px"></div><div class="rbz-tnote">'+T('صدک با احتمال یکی نیست: «صدک ۸۰ تا ۱۰۰» یعنی ۲۰٪ کاربرانی که بیشترین احتمال را دارند، نه احتمال ۸۰ تا ۱۰۰ درصد.','Percentile isn’t probability: “80–100” means the 20% of users most likely to do it, not an 80–100% probability.')+'</div>'+
      '<div class="rpr-acts"><button class="sh-btn primary compact" data-pr="cohort" type="button">'+ic('users-three')+T('ذخیره به‌عنوان کوهورت','Save as cohort')+'</button><span class="rbz-tnote">'+T('کوهورت پویا است: با عوض شدن احتمال‌ها اعضایش هم عوض می‌شوند.','The cohort is dynamic: its members change as the likelihoods change.')+'</span></div></div>'; }
  else if(S.tab==='feat'){ var evs=RB.EVENTS.filter(function(e){ return e.w>0&&e.id!==p.ev; }).slice(0,8), hh=RB.hstr(p.id)>>>0;
    var rows=evs.map(function(e,i){ var a=0.2+0.6*RB.jit(hh+i*7), b=Math.max(0.02,a*(0.25+0.5*RB.jit(hh+i*11))); return [e,a,b,a/b]; }).sort(function(x,y){ return y[3]-x[3]; });
    h+='<div class="sh-card" style="padding:0"><div class="sh-table-wrap"><table class="sh-table rbx-tbl"><thead><tr><th>'+T('ایونت','Event')+'</th><th>'+T('نسبت','Ratio')+'</th><th>'+T('در بازهٔ انتخابی','% in range')+'</th><th>'+T('بیرون بازه','% not in range')+'</th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr><td>'+esc(T(r[0].fa,r[0].en))+'</td><td>'+N(Math.round(r[3]*10)/10)+'×</td><td>'+pct(r[1]*100,0)+'</td><td>'+pct(r[2]*100,0)+'</td></tr>'; }).join('')+'</tbody></table></div><div class="rbz-tnote" style="padding:8px 12px">'+T('هم‌بستگی است، نه علت: این ایونت‌ها بیشتر میان کاربرانِ پراحتمال دیده می‌شوند.','Association, not cause: these events are more common among the likely users.')+'</div></div>'; }
  else h+='<div class="sh-card"><div class="rpr-kpis">'+[['دقت (AUC)','Accuracy (AUC)',pct(m.auc*100,0)],['نرخ مثبت درست','True positive rate',pct(m.tpr*100,0)],['نرخ مثبت کاذب','False positive rate',pct(m.fpr*100,0)],['Log loss','Log loss',N(Math.round(m.logloss*100)/100)]].map(function(k){ return '<div><b>'+k[2]+'</b><span>'+T(k[0],k[1])+'</span></div>'; }).join('')+'</div>'+
    '<div class="rbz-tnote">'+T('دقت ۷۰٪ و بیشتر یعنی مدل خوب است؛ ۵۰٪ یا کمتر یعنی بهتر از شیر یا خط نیست.','An accuracy of 70% or more is a good model; 50% or less is no better than a coin flip.')+'</div></div>';
  return h; }
function view(){ var p=S.open?byId(S.open):null; return p?detailView(p):listView(); }
function chart(){ var el=document.getElementById('rprChart'), p=byId(S.open); if(!el||!p||!window.echarts) return; var m=model(p), cs=getComputedStyle(document.documentElement), c=function(n){ return cs.getPropertyValue(n).trim(); };
  var xs=[], ys=[]; for(var i=0;i<=100;i++){ xs.push(i); ys.push(Math.round(m.p(i/100)*1000)/10); }
  var ch=echarts.getInstanceByDom(el)||echarts.init(el);
  ch.setOption({ grid:{ top:16, left:44, right:16, bottom:30 }, tooltip:{ trigger:'axis', formatter:function(a){ return T('صدک ','Percentile ')+N(a[0].axisValue)+' · '+pct(a[0].value); } },
    xAxis:{ type:'category', data:xs, name:T('صدک کاربران','User percentile'), nameLocation:'middle', nameGap:22, axisLabel:{ interval:19, color:c('--sh-chart-axis'), formatter:function(v){ return N(+v); } }, inverse:fa() },
    yAxis:{ type:'value', min:0, axisLabel:{ color:c('--sh-chart-axis'), formatter:function(v){ return N(v)+T('٪','%'); } }, splitLine:{ lineStyle:{ color:c('--sh-border') } } },
    series:[{ type:'line', data:ys, showSymbol:false, lineStyle:{ width:2, color:c('--sh-brand') }, areaStyle:{ opacity:0.08, color:c('--sh-brand') },
      markArea:{ silent:true, itemStyle:{ color:c('--sh-brand'), opacity:0.14 }, data:[[{ xAxis:S.lo },{ xAxis:S.hi }]] } }] }, true); }
function wire(root){
  root.querySelectorAll('[data-pr]').forEach(function(b){ b.addEventListener('click', function(){ act(b.getAttribute('data-pr')); }); });
  root.querySelectorAll('[data-propen]').forEach(function(tr){ tr.addEventListener('click', function(){ S.open=tr.getAttribute('data-propen'); S.tab='aud'; RBShell.rerender(); }); });
  root.querySelectorAll('[data-prtab]').forEach(function(b){ b.addEventListener('click', function(){ S.tab=b.getAttribute('data-prtab'); RBShell.rerender(); }); });
  root.querySelectorAll('[data-prp]').forEach(function(b){ b.addEventListener('click', function(){ var r=b.getAttribute('data-prp').split('-'); S.lo=+r[0]; S.hi=+r[1]; RBShell.rerender(); }); });
  root.querySelectorAll('[data-prr]').forEach(function(x){ x.addEventListener('change', function(){ var v=Math.max(0,Math.min(100,Math.round(+x.value||0))); if(x.getAttribute('data-prr')==='lo') S.lo=Math.min(v,S.hi-1); else S.hi=Math.max(v,S.lo+1); RBShell.rerender(); }); });
  root.querySelectorAll('[data-prf]').forEach(function(x){ x.addEventListener(x.type==='checkbox'?'change':(x.tagName==='SELECT'?'change':'input'), function(){ var k=x.getAttribute('data-prf'); S.form[k]=x.type==='checkbox'?x.checked:(k==='did'?x.value==='1':(k==='win'?+x.value:x.value));
    if(k==='ev'){ S.form.oprop=''; S.form.oval=''; RBShell.rerender(); } else if(k==='oprop'){ var P0=RB.PROPS[x.value]; S.form.oval=P0?P0.vals[0][1]:''; RBShell.rerender(); } }); });
  /* Block C: range helpers — inflection, target size, minimum lift (Amplitude «Audience analysis» helpers) */
  root.querySelectorAll('[data-prh]').forEach(function(b){ b.addEventListener('click', function(){ var p=byId(S.open); if(!p) return; var m=model(p), k=b.getAttribute('data-prh'), lo=80, u;
    if(k==='infl'){ for(u=0;u<100;u++){ if(m.p(u/100)>=2*m.base){ lo=u; break; } } }
    else if(k==='size'){ var nn=Math.max(1, +(document.getElementById('prhSize')||{}).value||0); lo=Math.max(0, Math.min(99, Math.round(100-nn/m.n*100))); }
    else if(k==='lift'){ var L0=Math.max(1, +(document.getElementById('prhLift')||{}).value||2); lo=99; for(u=99;u>=0;u--){ if(m.avg(u/100,1)/m.base>=L0) lo=u; else break; } }
    S.lo=lo; S.hi=100; RBShell.rerender(); }); });
  setTimeout(chart, 0); }
function act(a){
  if(a==='new'){ var ev=OUTCOME.filter(evOk)[0]||(RB.EVENTS.filter(function(e){ return e.w>0; })[0]||{}).id; S.form={ fa:'', ev:ev, did:true, win:30, popc:'' }; return RBShell.rerender(); }
  if(a==='cancel'){ S.form=null; return RBShell.rerender(); }
  if(a==='back'){ S.open=''; return RBShell.rerender(); }
  if(a==='save'){ var f=S.form; f.err=null;
    if(!(f.fa||'').trim()){ f.err=['یک نام بنویسید.','Write a name.']; return RBShell.rerender(); }
    var du=Math.round(dailyUsers(f.ev)*(f.oprop&&f.oval?RB.oneFilterFactor({ prop:f.oprop, op:'in', vals:[f.oval] }):1)), pc=popOf(f);
    if(du<50){ f.err=['«'+evName(f.ev)+'» روزانه حدود '+N(du)+' کاربر دارد؛ برای پیش‌بینی دست‌کم ۵۰ کاربرِ روزانه لازم است.','“'+evName(f.ev)+'” has about '+du+' daily users; a prediction needs at least 50.']; return RBShell.rerender(); }
    if(pc<1000){ f.err=['جمعیت شروع '+N(pc)+' کاربر است؛ دست‌کم ۱٬۰۰۰ کاربر لازم است.','The starting population is '+pc+' users; at least 1,000 are needed.']; return RBShell.rerender(); }
    var id='pr'+Date.now().toString(36); P.list.unshift({ id:id, fa:f.fa.trim(), en:f.fa.trim(), ev:f.ev, did:!!f.did, win:+f.win||30, popc:f.popc||'', oprop:f.oprop||'', oval:f.oval||'', ts:Date.now(), ready:false }); save(); S.form=null;
    U.toast('مدل در حال ساخت است؛ حدود یک ساعت طول می‌کشد و وقتی آماده شد در صندوق اعلان‌ها و با ایمیل خبرتان می‌کنیم','The model is being built; it takes about an hour, and we’ll notify you in your inbox and by email when it’s ready'); setTimeout(function(){ if(RBShell.view&&RBShell.view()==='predictions') RBShell.rerender(); }, 4200); return RBShell.rerender(); }
  if(a==='cohort'){ var p=byId(S.open); if(!p) return; var m=model(p), n=Math.round(m.n*(S.hi-S.lo)/100), name=T(p.fa,p.en)+' · '+T('صدک ','percentile ')+N(S.lo)+'–'+N(S.hi);
    RBShell.addCohort({ fa:name, en:name, defFa:'کاربرانِ صدک '+N(S.lo)+' تا '+N(S.hi)+' در «'+T(p.fa,p.en)+'» (پویا)', defEn:'Users in percentiles '+S.lo+'–'+S.hi+' of “'+p.en+'” (dynamic)', ev:'page_view', range:'3m', f:(S.hi-S.lo)/100*m.n/Math.max(1,pop90()), stat:false });   /* UC-9: sized from the starting population */
    U.toast('کوهورت «'+name+'» ساخته شد ('+N(n)+' کاربر)','Cohort «'+name+'» created ('+n+' users)'); } }
/* hook into the Users views (rb-amp-users.js) */
var V=RBUsers.view, Wr=RBUsers.wire, Cr=RBUsers.crumb;
RBUsers.view=function(v){ return v==='predictions'?view():V(v); };
RBUsers.wire=function(root){ if(RBShell.view&&RBShell.view()==='predictions') return wire(root); return Wr(root); };
RBUsers.crumb=function(v){ return v==='predictions'?['احتمال رفتار','Predictions']:Cr(v); };
document.addEventListener('shahin:theme', function(){ setTimeout(chart, 60); });
window.RBPredict={ model:model, list:function(){ return P.list.slice(); } };
})();
