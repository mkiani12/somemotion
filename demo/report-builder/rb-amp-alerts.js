/* ═════════ Alerts (phase 3, step 10a) — v12 only ═════════
   Amplitude Insights alerts. Spec: research-notes/…/30-amplitude-alerts-spec.md. PM decisions 2026-10-18:
   - no central page, as in Amplitude: create from the chart's bell (or ⋯ «ساختن هشدار»); manage in «مدیریت هشدارها»
     (custom monitors, automatic monitors, and the triggered-alerts feed, since the shared inbox keeps its single unread filter);
   - channels are Shahin's own (Telegram, SMS, email, in-app); webhook is UI only;
   - every alert type is built; what Shahin's backend can't do yet (smart, % change, confidence band) is listed in PRD-Alerts-And-AI (no «نیازمند توسعه», LX-6);
   - the alert follows chart edits silently; only the chart owner creates alerts; Pause only; 20 alerts per user (Shahin's cap).
   PM 2026-10-25: «ساعت ارسال» (AL-3), the «نامعتبر» status, pause on archive, delete with the chart (AL-7), the change tooltip (AL-6),
   the 7/30-period wording (AL-17), the digest channel (AL-16), viewer-read-only releases (AL-9), the 1405 holidays (AL-11).
   PM 2026-10-28, AL-3: no «ساعت ارسال» field; every daily alert arrives by 08:00 Tehran (fixed text in the form, tooltip and frequency column). */
(function(){
'use strict';
if(!window.RBShell || !RBShell.nb || !window.RBAmp) return;
var U=RBShell.ui, T=U.T, esc=U.esc, ic=U.ic, tip=U.tip, L=RBShell.lib, NB=RBShell.nb;
function $(id){ return document.getElementById(id); }
function fa(){ return U.L()==='fa'; }
function num(x, d){ var n=Number(x)||0; return n.toLocaleString(fa()?'fa-IR':'en-US', { maximumFractionDigits:d||0, minimumFractionDigits:0 }); }
var CAP=20, TAB='fired', SEL={}, AID=1;
var CH={ telegram:['تلگرام','Telegram'], sms:['پیامک','SMS'], email:['ایمیل','Email'], inapp:['درون‌برنامه','In-app'] };
function dev(){ return ''; }   /* PM 2026-10-28, LX-6: the report builder is Backlog, so it carries no «نیازمند توسعه» */
var ATIPS={
  offset:["<span class='tip-title'>تأخیر بررسی</span>نموداری که بازه‌اش چند روز عقب‌تر است (مثلاً برای داده‌هایی که دیر می‌رسند) همان چند روز دیرتر بررسی می‌شود؛ هشدار هم همان‌قدر دیرتر می‌آید.","<span class='tip-title'>Date offset</span>A chart whose range is shifted back a few days (for data that arrives late, say) is checked that many days later; the alert arrives that much later too."],
  /* PM 2026-10-25, AL-3 (+ conflict answer 1, the UTC day): checked after the day closes. PM 2026-10-28, AL-3: no send-hour choice; every daily alert arrives by 08:00 Tehran */
  alert:["<span class='tip-title'>هشدار</span>وقتی متریک این نمودار شرطی را که تعیین کرده‌اید رد کند خبرتان می‌کنیم. هشدار روزانه بعد از بسته شدن روز (روز UTC، از ۰۳:۳۰ تا ۰۳:۳۰ به وقت تهران) و فقط روی روزهای کامل بررسی می‌شود و تا ساعت ۸:۰۰ صبح به وقت تهران می‌رسد؛ هشدار قیف صبر می‌کند تا پنجره تبدیل بسته شود.","<span class='tip-title'>Alert</span>We notify you when this chart’s metric crosses the condition you set. Daily alerts are checked after the day closes (the UTC day, 03:30 to 03:30 Tehran) on complete days only, and arrive by 08:00 Tehran time; funnel alerts wait for the conversion window to close."],
  /* PM 2026-10-28, AL-3: the «ساعت ارسال» tooltip is gone with its field */
  smart:["<span class='tip-title'>هشدار هوشمند</span>وقتی مقدار از بازهٔ مورد انتظار ۹۹٪ بیرون برود، بی‌آنکه آستانه‌ای تعیین کنید؛ بازه از ۱۲۰ روز دادهٔ گذشته (روزانه) یا ۱۴ روز (ساعتی) ساخته می‌شود.","<span class='tip-title'>Smart alert</span>Fires when the value leaves the 99% expected range, with no threshold to set; the range is trained on the last 120 days (daily) or 14 days (hourly)."],
  ci:["<span class='tip-title'>بازهٔ اطمینان</span>بازهٔ ۹۵٪ یعنی ۹۵ درصد نقطه‌های گذشته داخل آن بوده‌اند؛ بازهٔ ۹۵٪ باریک‌تر از ۹۹٪ است، پس زودتر هشدار می‌دهد.","<span class='tip-title'>Confidence interval</span>A 95% band is where 95% of past points fell; it is narrower than a 99% band, so it fires sooner."],
  change:["<span class='tip-title'>تغییر نسبت به مقدار قبل</span>مقدار هر بازه با بازهٔ قبلش مقایسه می‌شود.","<span class='tip-title'>Change vs previous value</span>Each interval is compared with the one before it."]
};
var STORE=null;
function store(){
  if(STORE) return prune(); STORE=[];
  /* seed: real saved trend and funnel charts get a few alerts, with a deterministic trigger history */
  var ok=RB.SAVED.map(function(s,i){ return { s:s, i:i, m:RBShell.meta(i) }; }).filter(function(x){ return x.m && !x.m.invalid && (x.s.type==='trend'||x.s.type==='funnel'); });
  var seeds=[{ type:'custom', cond:'below', val:null, freq:'day', ch:['telegram','inapp'] },{ type:'smart', cond:'ci', ci:99, freq:'day', ch:['email','inapp'] },{ type:'custom', cond:'change', pct:true, val:-20, freq:'day', ch:['sms'], active:false }];
  ok.slice(0,3).forEach(function(x,k){ var sd=seeds[k], d=NB.tile(x.i), v=d&&isFinite(d.num)&&d.num>0?d.num:1000;
    STORE.push(mk(Object.assign({ r:x.i, name:T(x.s.fa,x.s.en), owner:x.m.owner, recips:[x.m.owner], val:sd.val==null?Math.round(v*0.85):sd.val, created:24*(9+k*6) }, sd))); });
  return prune(); }
/* PM 2026-10-25, AL-7: a deleted chart takes its alerts with it (read at every access; the shell flags META[i].deleted or calls
   RBAlerts.chartDeleted). Archive and ineligibility are derived in chartState(), so a restore or a fix resumes on its own. */
function prune(){ for(var k=STORE.length-1;k>=0;k--){ if(chartState(STORE[k]).k==='gone') STORE.splice(k,1); } return STORE; }
function chartState(a){ var s=RB.SAVED[a.r], m=RBShell.meta(a.r);
  if(!s||(m&&m.deleted)) return { k:'gone' };
  if(m&&m.archived) return { k:'arch', why:['نمودار بایگانی شده و هشدار متوقف است؛ با بازگردانی نمودار دوباره فعال می‌شود.','The chart is archived, so the alert is paused; restoring the chart resumes it.'] };
  var w=rules(s, (s.q&&s.q.amp)||null); if(w) return { k:'inv', why:w };   /* the saved chart, not the open builder */
  return { k:'ok' }; }
function isOn(a){ return a.active && chartState(a).k==='ok'; }
/* PM 2026-10-25, AL-9: releases — every member and above creates, edits, hides and deletes; a viewer only reads (?role=viewer, or
   ?prole=viewer, Shahin's project role) */
function isViewer(){ var q=new URLSearchParams(location.search); return q.get('role')==='viewer'||q.get('prole')==='viewer'; }
var VIEW_WHY=['بیننده فقط می‌بیند؛ انتشار را مالک، ادمین و عضو پروژه می‌سازند و ویرایش می‌کنند.','Viewers can only view; the project owner, admins and members create and edit releases.'];
function mk(o){ var a=Object.assign({ id:'al'+(AID++), type:'custom', cond:'below', val:0, pct:false, ci:95, freq:'day', ch:['email','inapp'], recips:['me'], emails:'', owner:'me', active:true, created:0, series:0, scope:'each', win:{ mode:'any', days:[0,1,2,3,4], from:'08:00', to:'20:00' } }, o);
  if(!a.history){ a.history=[]; var n=Math.round(RB.jit(RB.hstr(a.id+a.r))*4); for(var k=0;k<n;k++) a.history.push({ h:6+k*29+Math.round(RB.jit(RB.hstr(a.id)+k)*20), v:null }); }
  return a; }
/* which charts take alerts (Amplitude): Event Segmentation and Funnel only, daily or hourly, saved, owned by you */
function eligible(i){
  var s=RB.SAVED[i]; if(i<0||!s) return { ok:false, why:['اول گزارش را ذخیره کنید؛ هشدار فقط روی نمودار ذخیره‌شده ساخته می‌شود.','Save the chart first; alerts work only on saved charts.'] };
  var w0=rules(s, null); if(w0) return { ok:false, why:w0 };   /* the chart type first, as before */
  var m=RBShell.meta(i); if(m&&m.owner!=='me') return { ok:false, why:['فقط مالک نمودار هشدار می‌سازد.','Only the chart owner can create alerts.'] };
  var w=rules(s, i===NB.current()&&RBAmp.state?RBAmp.state():(s.q&&s.q.amp)||null); if(w) return { ok:false, why:w };
  return { ok:true }; }
/* the chart rules an alert needs; shared by creation (eligible) and the «نامعتبر» status (AL-7) */
function rules(s, st){
  if(s.type!=='trend'&&s.type!=='funnel') return ['هشدار فقط روی نمودار روند و قیف ساخته می‌شود.','Alerts are available on trend and funnel charts only.'];
  if(st){ if(st.ui&&st.ui.sampling) return ['با نمونه‌گیری روشن، هشدار ساخته نمی‌شود.','Alerts are unavailable while sampling is on.'];
    /* Block C (2026-10-24, gap audit 49b A16–A18): alerts need a daily or hourly chart; a weekly or monthly one only with a 7- or 30-day rolling average; a funnel only in conversion over time */
    /* PM 2026-10-25, AL-17: the window counts the chart's own intervals, so the fix names a 7- or 30-period average */
    if(s.type==='trend'&&(st.interval==='week'||st.interval==='month')&&!(st.adv&&st.adv.fn==='rolling'&&(+st.adv.n===7||+st.adv.n===30))) return ['هشدار فقط روی نمودار روزانه یا ساعتی ساخته می‌شود؛ بازه‌بندی را روزانه کنید یا میانگین متحرک ۷ یا ۳۰ دوره‌ای بگذارید.','Alerts need a daily or hourly chart; switch to daily, or add a 7- or 30-period rolling average.'];
    if(s.type==='funnel'&&st.funnel&&st.funnel.view&&st.funnel.view!=='time') return ['هشدار قیف فقط روی «نرخ تبدیل در طول زمان» ساخته می‌شود.','Funnel alerts work only on conversion over time.'];
    if(s.type==='trend'){ if(st.measure==='freq') return ['هشدار روی «توزیع تکرار» ساخته نمی‌شود.','No alerts on Frequency distribution.'];
      if(st.measure==='formula') return ['هشدار روی فرمول ساخته نمی‌شود.','No alerts on formulas.'];
      if(st.viz==='bar'||st.viz==='stackbar') return ['هشدار روی نمودار میله‌ای ساخته نمی‌شود؛ نمایش را خطی کنید.','No alerts on bar charts; switch to a line chart.']; }
    if(s.type==='funnel'&&st.funnel&&st.funnel.count&&st.funnel.count!=='uniques') return ['هشدار قیف فقط وقتی شمارش «کاربران در کل قیف» است.','Funnel alerts need counting by users across the whole funnel.']; }
  return null; }
/* PM 2026-10-28, AL-3: no «ساعت ارسال» list; the arrival time is fixed */
function by8(){ return T('تا ساعت ۸:۰۰ صبح','By 08:00'); }
var DAYS=[['شنبه','Sat'],['یکشنبه','Sun'],['دوشنبه','Mon'],['سه‌شنبه','Tue'],['چهارشنبه','Wed'],['پنجشنبه','Thu'],['جمعه','Fri']], HOURS=['00:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
function grouped(s){ var st=s.q&&s.q.amp; return !!(st&&((st.events||[]).some(function(e){ return e.groupBy&&e.groupBy.length; })||(st.segments||[]).length>1)); }
function mine(){ return store().filter(function(a){ return a.owner==='me'; }).length; }
function condTxt(a){
  if(a.type==='smart') return T('بیرون از بازهٔ مورد انتظار ۹۹٪','Outside the 99% expected range');
  if(a.cond==='above') return T('بالاتر از ','Above ')+num(a.val);
  if(a.cond==='below') return T('پایین‌تر از ','Below ')+num(a.val);
  if(a.cond==='change') return T('تغییر ','Change of ')+'<bdi dir="ltr">'+(a.val>0?'+':'')+num(a.val)+(a.pct?'%':'')+'</bdi>'+T(' نسبت به مقدار قبل',' vs previous value');
  return T('بیرون از بازهٔ اطمینان ','Outside the ')+num(a.ci)+T('٪','% confidence band'); }
function offTxt(a){ return a.offset?T(' · '+num(a.offset)+' روز بعد بررسی می‌شود',' · checked '+a.offset+' day'+(a.offset>1?'s':'')+' later'):''; }
/* Block C (A21): an alert opens its chart with a panel restating what fired — condition, value, when (also from the inbox, ?alert=) */
function openInContext(a, h){ RBShell.openReport(a.r); setTimeout(function(){ NB.panel({ fa:'این هشدار فعال شد', en:'This alert fired', render:function(body){
  var v=a.val!=null?a.val:null, ago=h!=null?L.ago(h):(a.history[0]?L.ago(a.history[0].h):T('به‌تازگی','recently'));
  body.innerHTML='<div class="rbx-callout warn">'+ic('bell')+'<span><b>'+esc(a.name)+'</b><br>'+condTxt(a)+offTxt(a)+'<br>'+T('زمان: ','When: ')+ago+'</span></div>'+
    '<div class="rbx-note">'+T('نقطه‌ای که هشدار را فعال کرد روی همین نمودار است؛ با «ناهنجاری و پیش‌بینی» بازهٔ مورد انتظار را هم ببینید.','The point that fired the alert is on this chart; turn on Anomaly & forecast to see the expected range too.')+'</div>'+
    '<div class="rbx-row"><button class="sh-btn ghost compact" id="raCtxHist" type="button">'+ic('clock-counter-clockwise')+' '+T('تاریخچهٔ هشدار','Alert history')+'</button><button class="sh-btn ghost compact" id="raCtxEdit" type="button"'+(a.owner==='me'?'':' disabled')+'>'+ic('pencil-simple')+' '+T('ویرایش هشدار','Edit alert')+'</button></div>';
  body.querySelector('#raCtxHist').onclick=function(){ history(a); }; var ed=body.querySelector('#raCtxEdit'); if(ed) ed.onclick=function(){ modal(a.r, a); }; } }); markFired(a); }, 700); }
/* the point that fired, pinned on the chart (Amplitude marks the triggering point when an alert opens its chart) */
function markFired(a){ var el=document.getElementById('rbzChart'), ch=el&&window.echarts&&echarts.getInstanceByDom(el); if(!ch) return; var o=ch.getOption(), s=o&&o.series&&o.series[0]; if(!s||!s.data||!s.data.length) return;
  var k=s.data.length-(a.history&&a.history[0]&&a.history[0].h>=24?Math.min(s.data.length, 1+Math.floor(a.history[0].h/24)):1), val=function(d){ return d&&typeof d==='object'?(Array.isArray(d)?d[1]:d.value):d; }, v=null;
  for(; k>=0; k--){ v=val(s.data[k]); if(v!=null) break; }   /* the last period can be drawn by the dotted (incomplete) series instead */
  if(v==null) return;
  var c=getComputedStyle(document.documentElement).getPropertyValue('--sh-warn').trim()||'#f59e0b';
  ch.setOption({ series:[{ markPoint:{ symbol:'pin', symbolSize:44, itemStyle:{ color:c }, label:{ formatter:'!', color:getComputedStyle(document.documentElement).getPropertyValue('--sh-surface').trim(), fontWeight:700 }, data:[{ coord:[k, v], name:T('هشدار','Alert') }] } }] }); }
function needsDev(a){ return a.type==='smart'||a.cond==='change'||a.cond==='ci'; }
/* ── the create / edit modal ── */
function modal(i, a0, draft){   /* draft: a proposal from the builder's «دستیار» (11b); the user still saves it here */
  var e=eligible(i); if(!a0&&!e.ok){ U.toast(T(e.why[0],e.why[1]), e.why[1]); return; }
  if(!a0&&mine()>=CAP){ U.toast('به سقف ۲۰ هشدار برای هر کاربر رسیده‌اید','You’ve reached the cap of 20 alerts per user'); return; }
  var s=RB.SAVED[a0?a0.r:i], d=NB.tile(a0?a0.r:i), a=a0?JSON.parse(JSON.stringify(a0)):mk(Object.assign({ r:i, name:T(s.fa,s.en), val:d&&isFinite(d.num)?Math.round(d.num*0.85):0, history:[] }, draft||{}));
  var people=L.people, evs=(s.q&&s.q.amp&&s.q.amp.events||[]).map(function(x){ return x.id; });
  var body='<div class="rbx-field"><label>'+T('نام هشدار','Alert name')+'</label><input class="sh-input" id="raN" value="'+esc(a.name)+'"/></div>'+
    '<div class="rbx-field"><label>'+T('نوع هشدار','Alert type')+'<span class="rbx-tipdot"'+tip(ATIPS.alert[0],ATIPS.alert[1])+'></span></label><span class="sh-seg" id="raType"><button class="sh-seg-opt'+(a.type==='custom'?' on':'')+'" data-rat="custom" type="button">'+T('سفارشی','Custom')+'</button><button class="sh-seg-opt'+(a.type==='smart'?' on':'')+'" data-rat="smart" type="button">'+T('هوشمند','Smart')+'</button></span></div>'+
    '<div class="ra-smart"'+(a.type==='smart'?'':' hidden')+'><div class="rbx-callout">'+ic('sparkle')+'<span>'+T('وقتی مقدار از بازهٔ مورد انتظار ۹۹٪ بیرون برود خبرتان می‌کنیم؛ آستانه لازم نیست.','We notify you when the value leaves the 99% expected range; no threshold needed.')+'</span>'+dev()+'<span class="rbx-tipdot"'+tip(ATIPS.smart[0],ATIPS.smart[1])+'></span></div></div>'+
    '<div class="ra-custom"'+(a.type==='custom'?'':' hidden')+'>'+
      (evs.length>1?'<div class="rbx-field"><label>'+T('متریک','Metric')+'</label><select class="sh-select" id="raSer">'+evs.map(function(id,k){ var ev=RB.evById(id)||{ fa:id, en:id }; return '<option value="'+k+'"'+(a.series===k?' selected':'')+'>'+esc(T(ev.fa,ev.en))+'</option>'; }).join('')+'</select></div>':'')+
      '<div class="rbx-field"><label>'+T('وقتی مقدار','When the value')+'</label><select class="sh-select" id="raCond"><option value="below"'+(a.cond==='below'?' selected':'')+'>'+T('پایین‌تر از یک عدد شد','goes below a value')+'</option><option value="above"'+(a.cond==='above'?' selected':'')+'>'+T('بالاتر از یک عدد شد','goes above a value')+'</option><option value="change"'+(a.cond==='change'?' selected':'')+'>'+T('نسبت به مقدار قبل تغییر کرد','changes vs the previous value')+'</option><option value="ci"'+(a.cond==='ci'?' selected':'')+'>'+T('از بازهٔ اطمینان بیرون رفت','leaves a confidence band')+'</option></select></div>'+
      /* PM 2026-10-25, AL-6: the change condition compares with the previous interval; its tooltip sits on the field (outside #raVL, which sync() rewrites) */
      '<div class="rbx-row ra-val"><div class="rbx-field" style="flex:1"><label><span id="raVL">'+T('مقدار','Value')+'</span><span class="rbx-tipdot ra-chtip"'+tip(ATIPS.change[0],ATIPS.change[1])+(a.cond==='change'?'':' hidden')+'></span></label><input class="sh-input" id="raV" type="number" value="'+esc(String(a.val))+'"/></div><div class="rbx-field ra-pct" style="width:120px"><label>'+T('واحد','Unit')+'</label><select class="sh-select" id="raPct"><option value="0"'+(a.pct?'':' selected')+'>'+T('عدد','Amount')+'</option><option value="1"'+(a.pct?' selected':'')+'>'+T('درصد','Percent')+'</option></select></div></div>'+
      '<div class="rbx-field ra-ci"><label>'+T('بازهٔ اطمینان','Confidence interval')+'<span class="rbx-tipdot"'+tip(ATIPS.ci[0],ATIPS.ci[1])+'></span></label><select class="sh-select" id="raCi">'+[95,98,99].map(function(c){ return '<option value="'+c+'"'+(a.ci===c?' selected':'')+'>'+num(c)+T('٪','%')+'</option>'; }).join('')+'</select></div>'+
      (d?'<span class="rbx-note">'+T('مقدار فعلی نمودار: ','The chart’s current value: ')+d.val+'</span>':'')+'</div>'+
    /* PM 2026-10-25, AL-3: plain «روزانه» (no fixed hour in the label). PM 2026-10-28, AL-3: the «ساعت ارسال» field is removed; a fixed note says daily alerts arrive by 08:00 Tehran */
    '<div class="rbx-field"><label>'+T('هر چند وقت','How often')+'</label><select class="sh-select" id="raF"><option value="day"'+(a.freq==='day'?' selected':'')+'>'+T('روزانه','Daily')+'</option><option value="hour"'+(a.freq==='hour'?' selected':'')+'>'+T('ساعتی','Hourly')+'</option></select><span class="rbx-note ra-by8"'+(a.freq==='hour'?' hidden':'')+'>'+T('هشدار روزانه بعد از بسته شدن روز بررسی می‌شود و تا ساعت ۸:۰۰ صبح به وقت تهران می‌رسد.','Daily alerts are checked after the day closes and arrive by 08:00 Tehran time.')+'</span>'+(s.type==='funnel'?'<span class="rbx-note">'+T('هشدار قیف صبر می‌کند تا پنجرهٔ تبدیل هر بازه بسته شود.','Funnel alerts wait for each interval’s conversion window to close.')+'</span>':'')+'</div>'+
    '<div class="rbx-field"><label>'+T('تأخیر بررسی','Date offset')+'<span class="rbx-tipdot"'+tip(ATIPS.offset[0],ATIPS.offset[1])+'></span></label><select class="sh-select" id="raOff">'+[0,1,2,3,7].map(function(d){ return '<option value="'+d+'"'+((a.offset||0)===d?' selected':'')+'>'+(d?T(num(d)+' روز بعد',d+' day'+(d>1?'s':'')+' later'):T('بدون تأخیر','No offset'))+'</option>'; }).join('')+'</select></div>'+
    '<div class="rbx-field"><span class="rbx-flbl">'+T('گیرنده‌ها','Recipients')+'</span><div class="ra-people">'+Object.keys(people).map(function(id){ return '<label class="rbz-ck"><input type="checkbox" data-rap="'+id+'"'+(a.recips.indexOf(id)>-1?' checked':'')+'/> '+esc(L.pname(id))+'</label>'; }).join('')+'</div><input class="sh-input" id="raE" dir="ltr" placeholder="name@example.com, …" value="'+esc(a.emails||'')+'"/></div>'+
    '<div class="rbx-field"><span class="rbx-flbl">'+T('کانال‌ها','Channels')+'</span><div class="ra-ch">'+Object.keys(CH).map(function(k){ return '<label class="rbz-ck"><input type="checkbox" data-rach="'+k+'"'+(a.ch.indexOf(k)>-1?' checked':'')+'/> '+T(CH[k][0],CH[k][1])+'</label>'; }).join('')+'<label class="rbz-ck dis"><input type="checkbox" disabled/> Webhook '+dev()+'</label></div></div>'+
    (grouped(s)?'<div class="rbx-field"><label>'+T('دامنه','Scope')+'</label><select class="sh-select" id="raScope"><option value="each"'+(a.scope!=='total'?' selected':'')+'>'+T('هر گروه و هر مقدار تفکیک (تا ۱۰۰۰ مقدار پرتعداد)','Each segment and group-by value (top 1,000 values)')+'</option><option value="total"'+(a.scope==='total'?' selected':'')+'>'+T('فقط مجموع','Total only')+'</option></select></div>':'')+
    '<div class="rbx-field"><label>'+T('زمان ارسال','When to send')+'</label><span class="sh-seg" id="raWin"><button class="sh-seg-opt'+(a.win.mode!=='sel'?' on':'')+'" data-raw="any" type="button">'+T('هر زمان','Any time')+'</button><button class="sh-seg-opt'+(a.win.mode==='sel'?' on':'')+'" data-raw="sel" type="button">'+T('فقط روزها و ساعت‌های انتخابی','Selected windows only')+'</button></span>'+
      '<div class="ra-winsel"'+(a.win.mode==='sel'?'':' hidden')+'><div class="ra-days">'+DAYS.map(function(d,k){ return '<label class="rbz-ck"><input type="checkbox" data-rad="'+k+'"'+(a.win.days.indexOf(k)>-1?' checked':'')+'/> '+T(d[0],d[1])+'</label>'; }).join('')+'</div>'+
      /* PM 2026-10-28, AL-3: a daily alert arrives by 08:00, so the hour range applies to hourly alerts only; the days still apply to both */
      '<div class="rbx-row ra-winhrs"'+(a.freq==='hour'?'':' hidden')+'><label>'+T('از ساعت','From')+' <select class="sh-select" id="raFrom">'+HOURS.map(function(h){ return '<option'+(a.win.from===h?' selected':'')+'>'+h+'</option>'; }).join('')+'</select></label><label>'+T('تا ساعت','To')+' <select class="sh-select" id="raTo">'+HOURS.map(function(h){ return '<option'+(a.win.to===h?' selected':'')+'>'+h+'</option>'; }).join('')+'</select></label>'+dev()+'</div></div></div>'+
    '<span class="rbx-note">'+T('اگر نمودار را ویرایش کنید، هشدار هم با تعریف تازه بررسی می‌شود. ایونت‌هایی که دیر به شاهین می‌رسند ممکن است هشدار را روی دادهٔ ناقص فعال کنند یا ناهنجاری را نبینند؛ عدد پیام هشدار ممکن است با نمودار کمی فرق داشته باشد.','If you edit the chart, the alert follows its new definition. Events that reach Shahin late can make an alert fire on incomplete data or miss an anomaly; the number in the alert can differ slightly from the chart.')+'</span>';
  var md=U.modal({ fa:a0?'ویرایش هشدار':'ساختن هشدار', en:a0?'Edit alert':'Create alert', subFa:'روی «'+s.fa+'»', subEn:'On “'+s.en+'”', wide:true, body:body,
    init:function(bd){ function sync(){ var t=bd.querySelector('[data-rat].on').getAttribute('data-rat'), c=bd.querySelector('#raCond').value;
        bd.querySelector('.ra-smart').hidden=t!=='smart'; bd.querySelector('.ra-custom').hidden=t!=='custom';
        bd.querySelector('.ra-val').hidden=c==='ci'; bd.querySelector('.ra-pct').hidden=c!=='change'; bd.querySelector('.ra-ci').hidden=c!=='ci'; bd.querySelector('.ra-dev').hidden=!(c==='change'||c==='ci');
        bd.querySelector('#raVL').textContent=c==='change'?T('میزان تغییر','Change'):T('مقدار','Value'); bd.querySelector('.ra-chtip').hidden=c!=='change';
        var dly=bd.querySelector('#raF').value==='day'; bd.querySelector('.ra-by8').hidden=!dly; bd.querySelector('.ra-winhrs').hidden=dly; }   /* PM 2026-10-28, AL-3 (+ AL-6) */
      bd.querySelectorAll('[data-rat]').forEach(function(x){ x.addEventListener('click', function(){ bd.querySelectorAll('[data-rat]').forEach(function(y){ y.classList.toggle('on', y===x); }); sync(); }); });
      bd.querySelector('#raCond').addEventListener('change', sync); bd.querySelector('#raF').addEventListener('change', sync); sync();
      bd.querySelectorAll('[data-raw]').forEach(function(x){ x.addEventListener('click', function(){ bd.querySelectorAll('[data-raw]').forEach(function(y){ y.classList.toggle('on', y===x); }); bd.querySelector('.ra-winsel').hidden=x.getAttribute('data-raw')!=='sel'; }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ارسال آزمایشی', en:'Test alert', ghost:true, fn:function(bd){
      /* Mixpanel's Test Alert: sends «[آزمایشی]» to every recipient now, without saving the alert */
      var ch=[].slice.call(bd.querySelectorAll('[data-rach]:checked')).map(function(x){ return x.getAttribute('data-rach'); }), rc=[].slice.call(bd.querySelectorAll('[data-rap]:checked')).length+(bd.querySelector('#raE').value.trim()?bd.querySelector('#raE').value.split(/[,،]/).length:0);
      if(!ch.length||!rc){ U.toast('اول گیرنده و کانال را انتخاب کنید','Pick recipients and a channel first'); return false; }
      U.toast('«[آزمایشی]» برای '+num(rc)+' گیرنده از راه '+ch.map(function(c){ return CH[c][0]; }).join('، ')+' فرستاده شد؛ هشدار هنوز ذخیره نشده', '“[TEST]” sent to '+rc+' recipient(s) by '+ch.map(function(c){ return CH[c][1]; }).join(', ')+'; the alert isn’t saved yet'); return false; } },{ fa:a0?'ذخیره':'ساختن هشدار', en:a0?'Save':'Create alert', fn:function(bd){
      var ch=[].slice.call(bd.querySelectorAll('[data-rach]:checked')).map(function(x){ return x.getAttribute('data-rach'); }), rc=[].slice.call(bd.querySelectorAll('[data-rap]:checked')).map(function(x){ return x.getAttribute('data-rap'); }), em=bd.querySelector('#raE').value.trim();
      if(!ch.length){ U.toast('دست‌کم یک کانال انتخاب کنید','Pick at least one channel'); return false; }
      if(!rc.length&&!em){ U.toast('دست‌کم یک گیرنده انتخاب کنید','Pick at least one recipient'); return false; }
      if(em&&em.split(/[,،]\s*/).some(function(x){ return !/^\S+@\S+\.\S+$/.test(x); })){ U.toast('نشانی ایمیل درست نیست','An email address is invalid'); return false; }
      a.name=bd.querySelector('#raN').value.trim()||a.name; a.type=bd.querySelector('[data-rat].on').getAttribute('data-rat'); a.cond=bd.querySelector('#raCond').value; a.val=+bd.querySelector('#raV').value||0; a.pct=bd.querySelector('#raPct').value==='1'; a.ci=+bd.querySelector('#raCi').value; a.freq=bd.querySelector('#raF').value; a.offset=+((bd.querySelector('#raOff')||{}).value||0); a.ch=ch; a.recips=rc; a.emails=em;
      var sr=bd.querySelector('#raSer'); if(sr) a.series=+sr.value; var sc=bd.querySelector('#raScope'); if(sc) a.scope=sc.value;
      var wm=bd.querySelector('[data-raw].on').getAttribute('data-raw'); a.win={ mode:wm, days:[].slice.call(bd.querySelectorAll('[data-rad]:checked')).map(function(x){ return +x.getAttribute('data-rad'); }), from:bd.querySelector('#raFrom').value, to:bd.querySelector('#raTo').value };
      if(wm==='sel'&&!a.win.days.length){ U.toast('دست‌کم یک روز انتخاب کنید','Pick at least one day'); return false; }
      if(a0){ Object.assign(a0, a); U.toast('هشدار ذخیره شد','Alert saved'); } else { store().push(a); U.toast('هشدار ساخته شد؛ در «مدیریت هشدارها» پیدایش می‌کنید','Alert created; find it in Manage alerts'); }
      refresh(); } }] });
  return md; }
function refresh(){ var bv=document.querySelector('#rbBuilder.show'); if(bv){ if(RBShell.decorate) RBShell.decorate(); } else if(RBShell.view()==='alerts') RBShell.rerender(); }
function forChart(i){ return store().filter(function(a){ return a.r===i; }); }
/* the chart's bell: its alerts, a new one, and the way to manage them all */
function bellMenu(anchor, i){
  var e=eligible(i), list=forChart(i);
  U.menu(anchor, [{ head:1, fa:'هشدارهای این نمودار', en:'Alerts on this chart' }].concat(list.map(function(a){ var cs=chartState(a).k, inv=cs==='inv', on=isOn(a);   /* AL-7 */
      return { icon:inv?'warning':on?'bell':'minus', fa:a.name+(inv?' · نامعتبر':on?'':' · متوقف'), en:a.name+(inv?' · invalid':on?'':' · paused'), fn:function(){ modal(i, a); } }; }))
    .concat(list.length?[]:[{ fa:'هنوز هشداری نیست', en:'No alerts yet', disabled:true }])
    .concat([{ sep:1 },{ icon:'plus', fa:'هشدار تازه', en:'New alert', disabled:!e.ok, hint:e.ok?null:e.why, fn:function(){ modal(i); } },{ icon:'list-bullets', fa:'مدیریت هشدارها', en:'Manage alerts', fn:function(){ RBShell.go('alerts'); } }]), 'end'); }
/* ── «مدیریت هشدارها» ── */
function fired(){ var out=[]; store().forEach(function(a){ (a.history||[]).forEach(function(h){ out.push({ a:a, h:h.h }); }); }); return out.sort(function(x,y){ return x.h-y.h; }); }
function view(){
  var all=store(), cus=all.filter(function(a){ return a.type==='custom'; }), sm=all.filter(function(a){ return a.type==='smart'; }), fe=fired(), nt=notesSweep();
  var h='<button class="rbx-mback" data-alback="1" type="button">'+ic('arrow-right')+T('همهٔ محتوا','All content')+'</button>';
  h+='<div class="rbx-head"><span class="rbx-title">'+T('مدیریت هشدارها','Manage alerts')+'</span><span class="rbx-tipdot"'+tip(ATIPS.alert[0],ATIPS.alert[1])+'></span><span class="rbx-spacer"></span><a class="sh-btn ghost compact" href="../alert-subscriptions/" target="_blank" rel="noopener">'+ic('arrow-square-out')+T('هشدارهای من (متریک‌های پایه)','My alerts (core metrics)')+'</a></div>';
  h+='<div class="rbx-sub">'+T('هشدار را روی خود نمودار با دکمهٔ زنگ می‌سازید (روند و قیف). این‌جا هشدارهای فعال‌شده و همهٔ هشدارهای پروژه را می‌بینید و مدیریت می‌کنید.','You create an alert on the chart itself with the bell (Trend and Funnel). Here you see triggered alerts and manage every alert in the project.')+'</div>';
  h+='<div class="rbx-meta">'+T(num(mine())+' از ۲۰ هشدار شما',mine()+' of your 20 alerts')+'</div>';
  h+='<div class="sh-seg ra-tabs" role="tablist">'+[['fired','هشدارهای فعال‌شده','Triggered alerts',fe.length+nt.length],['custom','پایشگرهای سفارشی','Custom monitors',cus.length],['smart','پایشگرهای خودکار','Automatic monitors',sm.length]].map(function(t){ return '<button class="sh-seg-opt'+(TAB===t[0]?' on':'')+'" role="tab" aria-selected="'+(TAB===t[0])+'" data-altab="'+t[0]+'" type="button">'+T(t[1],t[2])+' <span class="ra-n">'+num(t[3])+'</span></button>'; }).join('')+'</div>';
  if(TAB==='fired'){
    if(nt.length) h+='<div class="sh-card ra-feed">'+nt.map(function(n){ var a=n.a; return '<div class="ra-frow">'+ic('warning')+'<div class="grow"><b>'+T('هشدار «'+esc(a.name)+'» نامعتبر شد و دیگر بررسی نمی‌شود','The alert “'+esc(a.name)+'” is invalid and no longer checked')+'</b><span>'+esc(T(n.why[0],n.why[1]))+' · '+T('اعلان برای ','Owner notified: ')+esc(L.pname(a.owner))+T(' فرستاده شد','')+'</span></div><button class="rb-linkbtn" data-alopen="'+a.r+'" type="button">'+T('باز کردن نمودار','Open chart')+'</button></div>'; }).join('')+'</div>';
    h+=fe.length?'<div class="sh-card ra-feed">'+fe.map(function(f){ var a=f.a; return '<div class="ra-frow">'+ic('bell')+'<div class="grow"><b>'+esc(a.name)+'</b><span>'+condTxt(a)+' · '+esc(NB.reportLabel(a.r))+'</span></div><span class="rbx-note">'+L.ago(f.h)+'</span><button class="rb-linkbtn" data-alopen="'+a.r+'" data-alid="'+a.id+'" data-alh="'+f.h+'" type="button">'+T('باز کردن نمودار','Open chart')+'</button></div>'; }).join('')+'</div>'
      :'<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('bell')+'</div><div class="sh-state-title">'+T('هنوز هشداری فعال نشده','No alerts have fired yet')+'</div><div class="sh-state-hint">'+T('وقتی متریکی شرط هشدارش را رد کند، این‌جا و در اعلان‌های شاهین می‌آید.','When a metric crosses its alert condition, it shows here and in Shahin notifications.')+'</div></div></div>';
  } else {
    if(TAB==='smart'){ var ar=autoRows();
      h+='<div class="sh-card ra-auto"><div class="rbx-togrow"><div><div class="t">'+T('هشدارهای خودکار پروژه','Automatic project alerts')+' '+dev()+'<span class="rbx-tipdot"'+tip("<span class='tip-title'>هشدار خودکار</span>شاهین هر ایونتی را که در دست‌کم ۱۵ روز از ۳۰ روز اخیر روزی ۱۰۰ بار یا بیشتر رخ داده، بی‌آنکه چیزی بسازید زیر نظر می‌گیرد و وقتی از بازهٔ ۹۹٪ بیرون برود خبر می‌دهد؛ «هر ایونتی» شامل نمی‌شود.","<span class='tip-title'>Automatic alert</span>Shahin watches every event that happened 100+ times a day on at least 15 of the last 30 days, with nothing to set up, and notifies you when it leaves the 99% band; “Any event” doesn’t qualify.")+'></span></div><div class="d">'+T('در این پروژه '+num(qualifying())+' ایونت شرط پایش خودکار را دارند. با اشتراک، خلاصه روزانه ناهنجاری‌ها را با '+AUTO_CH_L[AUTO_CH][0]+' می‌گیرید.',qualifying()+' events in this project qualify for automatic monitoring. Subscribe to get a daily digest of anomalies by '+AUTO_CH_L[AUTO_CH][2]+'.')+'</div>'+
          /* PM 2026-10-25, AL-16: the digest's channel — email, Telegram or in-app (no SMS: the digest is too long for a text) */
          '<div class="rbx-row" style="margin-top:6px"><span class="rbx-note">'+T('کانال خلاصه','Digest channel')+'</span><span class="sh-seg" id="raAutoCh">'+Object.keys(AUTO_CH_L).map(function(k){ return '<button class="sh-seg-opt'+(AUTO_CH===k?' on':'')+'" data-rach-auto="'+k+'" type="button">'+T(AUTO_CH_L[k][0],AUTO_CH_L[k][1])+'</button>'; }).join('')+'</span></div></div>'+
        '<button class="rbx-sw'+(AUTO_SUB?' on':'')+'" id="raAutoSub" type="button" aria-pressed="'+AUTO_SUB+'" aria-label="'+T('اشتراک','Subscribe')+'"></button></div>'+
        (ar.length?'<div class="ra-feed">'+ar.map(function(r){ return '<div class="ra-frow">'+ic(r.up?'arrow-up':'arrow-down')+'<div class="grow"><b>'+esc(T(r.ev.fa,r.ev.en))+'</b><span>'+T((r.up?'بالاتر':'پایین‌تر')+' از بازهٔ مورد انتظار، ','')+'<bdi dir="ltr">'+(r.up?'+':'−')+num(r.pct)+'%</bdi>'+T('',(r.up?' above':' below')+' the expected range')+'</span></div><span class="rbx-note">'+L.ago(r.h)+'</span><button class="rb-linkbtn" data-alauto="'+r.ev.id+'" type="button">'+T('دیدن روی نمودار','View on chart')+'</button></div>'; }).join('')+'</div>':'')+'</div>'; }
    var list=TAB==='custom'?cus:sm, sel=Object.keys(SEL).filter(function(k){ return SEL[k]&&list.some(function(a){ return a.id===k; }); });
    h+='<div class="ra-bulk"><span class="rbx-note">'+(sel.length?T(num(sel.length)+' انتخاب‌شده',sel.length+' selected'):T('برای کار گروهی ردیف‌ها را انتخاب کنید','Select rows for bulk actions'))+'</span><button class="sh-btn ghost compact" data-albulk="pause" type="button"'+(sel.length?'':' disabled')+'>'+T('توقف','Pause')+'</button><button class="sh-btn ghost compact" data-albulk="resume" type="button"'+(sel.length?'':' disabled')+'>'+T('ادامه','Resume')+'</button><button class="sh-btn danger compact" data-albulk="delete" type="button"'+(sel.length?'':' disabled')+'>'+T('حذف','Delete')+'</button></div>';
    h+=list.length?'<div class="sh-card"><div class="sh-table-wrap"><table class="sh-table rbz-table ra-table"><thead><tr><th class="ck"></th><th>'+T('هشدار','Alert')+'</th><th>'+T('نمودار','Chart')+'</th><th>'+T('شرط','Condition')+'</th><th>'+T('تکرار','Frequency')+'</th><th>'+T('کانال‌ها','Channels')+'</th><th>'+T('مالک','Owner')+'</th><th>'+T('وضعیت','Status')+'</th><th></th></tr></thead><tbody>'+
      list.map(function(a){ return '<tr><td class="ck"><input type="checkbox" data-alsel="'+a.id+'"'+(SEL[a.id]?' checked':'')+' aria-label="'+T('انتخاب','Select')+'"/></td><td><b>'+esc(a.name)+'</b></td><td><button class="rb-linkbtn" data-alopen="'+a.r+'" type="button">'+esc(NB.reportLabel(a.r))+'</button></td><td>'+condTxt(a)+(needsDev(a)?' '+dev():'')+'</td><td>'+(a.freq==='hour'?T('ساعتی','Hourly'):T('روزانه','Daily')+'<div class="rbx-note">'+by8()+'</div>')/* PM 2026-10-28, AL-3 */+(a.win&&a.win.mode==='sel'?'<div class="rbx-note">'+T('فقط در بازه‌های انتخابی','Selected windows only')+'</div>':'')+'</td><td>'+a.ch.map(function(c){ return T(CH[c][0],CH[c][1]); }).join(T('، ',', '))+'</td><td>'+esc(L.pname(a.owner))+'</td><td>'+statusHtml(a)+'</td><td><button class="rbx-icbtn" data-almenu="'+a.id+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></td></tr>'; }).join('')+'</tbody></table></div></div>'
      :'<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('bell')+'</div><div class="sh-state-title">'+(TAB==='custom'?T('هنوز پایشگر سفارشی ندارید','No custom monitors yet'):T('هنوز پایشگر خودکاری ندارید','No automatic monitors yet'))+'</div><div class="sh-state-hint">'+T('یک نمودار روند یا قیف ذخیره‌شده را باز کنید و از دکمهٔ زنگ هشدار بسازید.','Open a saved Trend or Funnel chart and create an alert from its bell.')+'</div></div></div>';
  }
  return h; }
/* PM 2026-10-25, AL-7: «فعال» / «متوقف» / «نامعتبر» with its reason; an archived chart reads «متوقف» with the archive reason */
function statusHtml(a){ var cs=chartState(a);
  if(cs.k==='inv') return '<span class="rbz-tag" style="color:var(--sh-bad)">'+T('نامعتبر','Invalid')+'</span><div class="rbx-note">'+esc(T(cs.why[0],cs.why[1]))+'</div>';
  if(cs.k==='arch') return '<span class="rbz-tag">'+T('متوقف','Paused')+'</span><div class="rbx-note">'+esc(T(cs.why[0],cs.why[1]))+'</div>';
  return '<span class="rbz-tag'+(a.active?' ok':'')+'">'+(a.active?T('فعال','Active'):T('متوقف','Paused'))+'</span>'; }
/* AL-7: one notification to the owner when a chart becomes ineligible (once per spell; a fix re-arms it). Shown at the top of the
   triggered feed; in production it is an ordinary inbox row from «Reports». */
var NOTES=[];
function notesSweep(){ store().forEach(function(a){ var inv=chartState(a).k==='inv';
  if(inv&&!a.invNote){ a.invNote=true; NOTES.unshift({ a:a, why:chartState(a).why }); }
  else if(!inv&&a.invNote){ a.invNote=false; NOTES=NOTES.filter(function(n){ return n.a!==a; }); } });
  NOTES=NOTES.filter(function(n){ return store().indexOf(n.a)>-1; }); return NOTES; }
/* a row menu inside the scrolling table would be clipped by it, so it opens from a fixed anchor at the button's place */
function floatAnchor(btn){ document.querySelectorAll('.ra-float').forEach(function(x){ x.remove(); }); var r=btn.getBoundingClientRect(), w=document.createElement('span');
  w.className='rbx-menuwrap ra-float'; w.style.cssText='position:fixed;z-index:60;top:'+Math.round(r.top)+'px;left:'+Math.round(r.left)+'px;width:'+Math.round(r.width)+'px;height:'+Math.round(r.height)+'px';
  var an=document.createElement('span'); an.style.cssText='display:block;width:100%;height:100%'; w.appendChild(an); document.body.appendChild(w); return an; }
function rowMenu(btn, a){
  var own=a.owner==='me', anchor=floatAnchor(btn);
  U.menu(anchor, [{ icon:'pencil-simple', fa:'ویرایش', en:'Edit', disabled:!own, hint:own?null:['فقط مالک','Owner only'], fn:function(){ modal(a.r, a); } },
    { icon:a.active?'minus':'bell', fa:a.active?'توقف':'ادامه', en:a.active?'Pause':'Resume', disabled:!own||(!a.active&&chartState(a).k!=='ok'), hint:!own?['فقط مالک','Owner only']:(!a.active&&chartState(a).k!=='ok')?chartState(a).why:null, fn:function(){   /* AL-7: no resume while the chart is archived or invalid */ a.active=!a.active; refresh(); U.toast(a.active?'هشدار دوباره فعال شد':'هشدار متوقف شد', a.active?'Alert resumed':'Alert paused'); } },
    { icon:'clock-counter-clockwise', fa:'تاریخچهٔ هشدار', en:'Alert history', fn:function(){ history(a); } },
    { icon:'chart-line', fa:'باز کردن نمودار', en:'Open chart', fn:function(){ RBShell.openReport(a.r); } },
    { sep:1 },{ icon:'trash', fa:'حذف', en:'Delete', danger:true, disabled:!own, fn:function(){ U.confirmBox({ fa:'حذف هشدار', en:'Delete alert', tone:'bad', bodyFa:'هشدار «'+a.name+'» حذف شود؟ این کار برنمی‌گردد.', bodyEn:'Delete the alert “'+a.name+'”? This can’t be undone.', okFa:'حذف', okEn:'Delete', fn:function(){ STORE.splice(STORE.indexOf(a),1); refresh(); U.toast('هشدار حذف شد','Alert deleted'); } }); } }   /* B10: delete asks first */], 'end'); }
function history(a){
  NB.panel({ fa:'تاریخچهٔ هشدار', en:'Alert history', render:function(body){
    body.innerHTML='<div class="rbx-field"><b>'+esc(a.name)+'</b><span class="rbx-note">'+condTxt(a)+' · '+esc(NB.reportLabel(a.r))+'</span></div>'+
      (a.history.length?a.history.map(function(h){ return '<div class="rbx-person">'+ic('bell')+'<span class="grow">'+T('فعال شد','Triggered')+'</span><span class="rbx-note">'+L.ago(h.h)+'</span></div>'; }).join('')
        :'<div class="sh-state" style="padding:20px 6px"><div class="sh-state-title">'+T('این هشدار هنوز فعال نشده','This alert hasn’t fired yet')+'</div></div>')+
      '<span class="rbx-note">'+T('ساخته‌شده ','Created ')+L.ago(a.created)+'</span>'; } }); }
function wire(root){
  function on(sel, fn){ root.querySelectorAll(sel).forEach(function(x){ x.addEventListener('click', function(e){ e.stopPropagation(); fn(x); }); }); }
  on('[data-alback]', function(){ RBShell.go('content'); });
  on('[data-altab]', function(x){ TAB=x.getAttribute('data-altab'); RBShell.rerender(); });
  on('[data-alopen]', function(x){ var id=x.getAttribute('data-alid'), a=id&&store().filter(function(z){ return z.id===id; })[0]; if(a) openInContext(a, +x.getAttribute('data-alh')||null); else RBShell.openReport(+x.getAttribute('data-alopen')); });
  on('[data-alauto]', function(x){ openAuto(x.getAttribute('data-alauto')); });
  var as=root.querySelector('#raAutoSub'); if(as) as.addEventListener('click', function(){ AUTO_SUB=!AUTO_SUB; RBShell.rerender(); var c=AUTO_CH_L[AUTO_CH]; U.toast(AUTO_SUB?'مشترک هشدارهای خودکار شدید؛ خلاصه هر روز با '+c[0]+' می‌آید':'اشتراک هشدارهای خودکار لغو شد', AUTO_SUB?'Subscribed to automatic alerts; the digest arrives daily by '+c[2]:'Unsubscribed from automatic alerts'); });
  root.querySelectorAll('[data-rach-auto]').forEach(function(x){ x.addEventListener('click', function(e){ e.stopPropagation(); AUTO_CH=x.getAttribute('data-rach-auto'); RBShell.rerender(); var c=AUTO_CH_L[AUTO_CH];   /* AL-16 */
    U.toast(AUTO_SUB?'خلاصه هشدارهای خودکار از این پس با '+c[0]+' می‌آید':'کانال خلاصه '+c[0]+' شد؛ برای دریافت، اشتراک را روشن کنید', AUTO_SUB?'The automatic-alerts digest now arrives by '+c[2]:'Digest channel set to '+c[1]+'; turn on the subscription to receive it'); }); });
  on('[data-almenu]', function(x){ var a=store().filter(function(y){ return y.id===x.getAttribute('data-almenu'); })[0]; if(a) rowMenu(x, a); });
  root.querySelectorAll('[data-alsel]').forEach(function(c){ c.addEventListener('change', function(){ SEL[c.getAttribute('data-alsel')]=c.checked; RBShell.rerender(); }); });
  on('[data-albulk]', function(x){ var k=x.getAttribute('data-albulk'), ids=Object.keys(SEL).filter(function(id){ return SEL[id]; }), list=store().filter(function(a){ return ids.indexOf(a.id)>-1 && a.owner==='me'; });
    if(k==='delete' && !x._ok){ U.confirmBox({ fa:'حذف هشدارها', en:'Delete alerts', tone:'bad', bodyFa:num(list.length)+' هشدار حذف شود؟ این کار برنمی‌گردد.', bodyEn:'Delete '+list.length+' alerts? This can’t be undone.', okFa:'حذف', okEn:'Delete', fn:function(){ x._ok=1; x.click(); x._ok=0; } }); return; }
    if(k==='delete') list.forEach(function(a){ STORE.splice(STORE.indexOf(a),1); }); else list.forEach(function(a){ a.active=k==='resume'; });   /* AL-7: a resumed alert on an archived or invalid chart stays not checked; its status says why */
    var skip=ids.length-list.length; SEL={}; RBShell.rerender(); U.toast((k==='delete'?num(list.length)+' هشدار حذف شد':k==='pause'?num(list.length)+' هشدار متوقف شد':num(list.length)+' هشدار فعال شد')+(skip?'؛ '+num(skip)+' هشدار مال دیگران است و دست نخورد':''), (k==='delete'?list.length+' alerts deleted':k==='pause'?list.length+' alerts paused':list.length+' alerts resumed')+(skip?'; '+skip+' belong to others and were left as they are':'')); });
}
/* ═════════ 10b: Releases (manual), automatic alerts, Root Cause Analysis ═════════
   Releases: Shahin has no app «version» property, so only manual releases (PM decision 2026-10-18); a release is a marker on
   time-series charts plus a report whose adoption part needs that property. Automatic alerts and RCA are Amplitude's; Shahin's
   backend has neither (no «نیازمند توسعه» on this Backlog page, LX-6). */
var DNOW=new Date(2026,6,27), DCUS=new Date(2026,6,5), DAYMS=864e5;
var PLAT={ web:['وب','Web'], mweb:['وب موبایل','Mobile web'], android:['اپ اندروید','Android app'], ios:['اپ iOS','iOS app'], tv:['تلویزیون هوشمند','Smart TV'] };   /* B1 (2026-10-24): the video project's seed release lists tv */
var REL=null, RID=1;
function rels(){ if(REL) return REL;
  /* phase 4: releases belong to a project — a new project has none; the video site has its own */
  if(RB.PROJECT===3){ REL=[]; return REL; }
  if(RB.PROJECT===1){ REL=[{ id:'rl'+(RID++), fa:'پخش‌کنندهٔ تازه', en:'New player', ver:'3.0.0', descFa:'شروع سریع‌تر پخش و انتخاب خودکار کیفیت.', descEn:'Faster start and automatic quality.', start:new Date(2026,6,14), end:null, plat:['web','mweb','android','tv'], vis:true, by:'pm', items:[] }]; return REL; }
  REL=[
  { id:'rl'+(RID++), fa:'دیوار اشتراک تازه', en:'New paywall', ver:'', descFa:'متن و چیدمان تازهٔ دیوار اشتراک برای نیمی از خوانندگان.', descEn:'New paywall copy and layout for half of the readers.', start:new Date(2026,5,22), end:null, plat:['web','mweb'], vis:true, by:'pm',
    items:[{ k:'r', id:-1, name:['نرخ تبدیل دیوار اشتراک','Paywall conversion rate'] }] },   /* AL-21: a linked chart that was later deleted */
  { id:'rl'+(RID++), fa:'صفحهٔ خبر بازطراحی‌شده', en:'Redesigned article page', ver:'4.2.0', descFa:'مطالب مرتبط پایین خبر و سرعت بارگذاری بهتر.', descEn:'Related articles under each story and faster loading.', start:new Date(2026,6,15), end:null, plat:['web','mweb','android'], vis:true, by:'me', items:[] } ];
  return REL; }
function fdate(d){ return d?(fa()?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long', year:'numeric' }).format(d):new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric', year:'numeric' }).format(d)):'—'; }
function toISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fromISO(v){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''); return m?new Date(+m[1],+m[2]-1,+m[3]):null; }
/* markers for a chart: index on its category axis (the builder passes the range and the point count) */
function markers(R, n){
  var end=R.mode==='custom'?(R.end?new Date(R.end.getFullYear(),R.end.getMonth(),R.end.getDate()):DCUS)/* PM 2026-10-31, outcome 1: B10, a picked range ends where it was picked */:R.mode==='yesterday'?new Date(DNOW.getTime()-DAYMS):DNOW, step=R.unit==='week'?7:R.unit==='month'?30.44:R.unit==='hour'?1/24:1;
  return rels().filter(function(r){ return r.vis; }).map(function(r){ var back=(end-r.start)/DAYMS/step, idx=Math.round(n-1-back); return idx>=0&&idx<n?{ idx:idx, fa:r.fa, en:r.en }:null; }).filter(Boolean); }
function relModal(r0, date){
  if(isViewer()){ U.toast(VIEW_WHY[0], VIEW_WHY[1]); return; }   /* AL-9: also covers the Microscope's «ساختن انتشار در این روز» */
  var r=r0?JSON.parse(JSON.stringify(r0)):{ fa:'', en:'', ver:'', descFa:'', descEn:'', start:date||DNOW, end:null, plat:['web'], vis:true, by:'me', items:[] };
  if(r0){ r.start=r0.start; r.end=r0.end; }
  U.modal({ fa:r0?'ویرایش انتشار':'ساختن انتشار', en:r0?'Edit release':'Create release', subFa:'انتشار روی نمودارهای زمانی نشانگر می‌گذارد.', subEn:'A release places a marker on time-series charts.', wide:true,
    body:'<div class="rbx-field"><label>'+T('نام انتشار','Release name')+'</label><input class="sh-input" id="rlN" value="'+esc(T(r.fa,r.en||r.fa))+'"/></div>'+
      '<div class="rbx-field"><label>'+T('نسخه (اختیاری)','Version (optional)')+'</label><input class="sh-input" id="rlV" dir="ltr" placeholder="4.2.0" value="'+esc(r.ver)+'"/><span class="rbx-note">'+T('شاهین ویژگی «نسخه» دریافت نمی‌کند، پس نسخه فقط برچسب است و گزارش پذیرش از آن ساخته نمی‌شود.','Shahin doesn’t receive a «version» property, so the version is only a label and no adoption report is built from it.')+'</span></div>'+
      '<div class="rbx-field"><label>'+T('توضیح','Description')+'</label><textarea class="sh-input" id="rlD" rows="2">'+esc(T(r.descFa,r.descEn||r.descFa))+'</textarea></div>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('تاریخ انتشار','Release date')+'</label><input class="sh-input" id="rlS" type="date" value="'+toISO(r.start)+'"/></div><div class="rbx-field" style="flex:1"><label>'+T('تاریخ پایان (اختیاری)','End date (optional)')+'</label><input class="sh-input" id="rlE" type="date" value="'+(r.end?toISO(r.end):'')+'"/></div></div>'+
      '<div class="rbx-field"><span class="rbx-flbl">'+T('سکوها','Platforms')+'</span><div class="ra-ch">'+Object.keys(PLAT).map(function(k){ return '<label class="rbz-ck"><input type="checkbox" data-rlp="'+k+'"'+(r.plat.indexOf(k)>-1?' checked':'')+'/> '+T(PLAT[k][0],PLAT[k][1])+'</label>'; }).join('')+'</div></div>'+
      '<label class="rbz-ck"><input type="checkbox" id="rlVis"'+(r.vis?' checked':'')+'/> '+T('نشانگر روی همهٔ نمودارهای زمانی','Show the marker on every time-series chart')+'</label>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:r0?'ذخیره':'ساختن انتشار', en:r0?'Save':'Create release', fn:function(bd){ var nm=bd.querySelector('#rlN').value.trim(), st=fromISO(bd.querySelector('#rlS').value), en=fromISO(bd.querySelector('#rlE').value);
      if(!nm){ U.toast('نام انتشار را بنویسید','Name the release'); return false; } if(!st){ U.toast('تاریخ انتشار را انتخاب کنید','Pick a release date'); return false; } if(en&&en<st){ U.toast('تاریخ پایان پیش از تاریخ انتشار است','The end date is before the release date'); return false; }
      var pl=[].slice.call(bd.querySelectorAll('[data-rlp]:checked')).map(function(x){ return x.getAttribute('data-rlp'); }); if(!pl.length){ U.toast('دست‌کم یک سکو انتخاب کنید','Pick at least one platform'); return false; }
      var o={ fa:nm, en:nm, ver:bd.querySelector('#rlV').value.trim(), descFa:bd.querySelector('#rlD').value.trim(), descEn:bd.querySelector('#rlD').value.trim(), start:st, end:en, plat:pl, vis:bd.querySelector('#rlVis').checked };
      if(r0) Object.assign(r0,o); else rels().push(Object.assign({ id:'rl'+(RID++), by:'me', items:[] }, o));
      U.toast(r0?'انتشار ذخیره شد':'انتشار ساخته شد؛ نشانگرش روی نمودارهای زمانی است', r0?'Release saved':'Release created; its marker is on time-series charts'); relRefresh(); } }] }); }
function relRefresh(){ if(document.querySelector('#rbBuilder.show')){ if(window.RBAmp&&RBAmp.redraw) RBAmp.redraw(); } else RBShell.rerender(); }
function relView(){
  var list=rels().slice().sort(function(a,b){ return b.start-a.start; }), vDis=isViewer()?' disabled title="'+esc(T(VIEW_WHY[0],VIEW_WHY[1]))+'"':'';   /* AL-9 */
  var h='<button class="rbx-mback" data-alback="1" type="button">'+ic('arrow-right')+T('همهٔ محتوا','All content')+'</button>';
  h+='<div class="rbx-head"><span class="rbx-title">'+T('خط زمانی انتشار','Release timeline')+'</span><span class="rbx-tipdot"'+tip("<span class='tip-title'>انتشار</span>تغییری که در سایت یا اپ منتشر کرده‌اید؛ روی نمودارهای زمانی نشانگر می‌گذارد تا اثرش را کنار عددها ببینید. برای یک تاریخ یک‌باره که به انتشار ربطی ندارد، یادداشت نمودار بهتر است.","<span class='tip-title'>Release</span>A change you shipped to the site or app; it places a marker on time-series charts so you see its effect next to the numbers. For a one-off date that isn’t a release, use a chart annotation.")+'></span><span class="rbx-spacer"></span><button class="sh-btn primary compact" data-rlnew="1" type="button"'+vDis+'>'+ic('plus')+' '+T('ساختن انتشار','Create release')+'</button></div>';
  h+='<div class="rbx-sub">'+T('انتشارها دستی ساخته می‌شوند؛ تشخیص خودکار از روی نسخه در شاهین نیست، چون ویژگی «نسخه» دریافت نمی‌شود.','Releases are created by hand; automatic detection from the version isn’t available, because Shahin doesn’t receive a «version» property.')+'</div>';
  h+=list.length?'<div class="ra-timeline">'+list.map(function(r){ return '<div class="ra-rel"><span class="ra-dot"></span><div class="grow"><div class="ra-relh"><b>'+esc(T(r.fa,r.en))+'</b>'+(r.ver?'<span class="rbz-tag"><bdi dir="ltr">'+esc(r.ver)+'</bdi></span>':'')+(r.vis?'':'<span class="rbz-tag">'+T('پنهان روی نمودارها','Hidden on charts')+'</span>')+'</div><span>'+fdate(r.start)+(r.end?' – '+fdate(r.end):'')+' · '+r.plat.map(function(k){ return T(PLAT[k][0],PLAT[k][1]); }).join(T('، ',', '))+' · '+esc(L.pname(r.by))+'</span>'+((r.descFa||r.descEn)?'<p>'+esc(T(r.descFa,r.descEn||r.descFa))+'</p>':'')+'</div><button class="sh-btn ghost compact" data-rlopen="'+r.id+'" type="button">'+T('گزارش انتشار','Release report')+'</button><button class="rbx-icbtn" data-rlmenu="'+r.id+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>'; }).join('')+'</div>'
    :'<div class="sh-card"><div class="sh-state"><div class="sh-state-icon">'+ic('tag')+'</div><div class="sh-state-title">'+T('هنوز انتشاری ثبت نشده','No releases yet')+'</div><div class="sh-state-hint">'+T('هر تغییر مهم سایت را این‌جا ثبت کنید تا روی نمودارها نشانگر بگذارد.','Record each important site change here to put a marker on the charts.')+'</div><button class="sh-btn primary compact" data-rlnew="1" type="button"'+vDis+'>'+ic('plus')+' '+T('ساختن انتشار','Create release')+'</button></div></div>';
  return h; }
function relReport(r){
  NB.panel({ fa:'گزارش انتشار', en:'Release report', render:function(body){
    function draw(){ var vw=isViewer(), vd=vw?' disabled title="'+esc(T(VIEW_WHY[0],VIEW_WHY[1]))+'"':'';   /* AL-9 */
      body.innerHTML='<div class="rbx-field"><b>'+esc(T(r.fa,r.en))+'</b><span class="rbx-note">'+fdate(r.start)+(r.end?' – '+fdate(r.end):'')+' · '+r.plat.map(function(k){ return T(PLAT[k][0],PLAT[k][1]); }).join(T('، ',', '))+'</span>'+((r.descFa||r.descEn)?'<p>'+esc(T(r.descFa,r.descEn||r.descFa))+'</p>':'')+'</div>'+
        '<label class="rbz-ck'+(vw?' dis':'')+'"><input type="checkbox" id="rlVisT"'+(r.vis?' checked':'')+vd+'/> '+T('نشانگر روی نمودارها','Marker on charts')+'</label>'+
        '<div class="rbx-gsec">'+T('پذیرش','Adoption')+'</div><div class="rbx-callout warn">'+ic('info')+'<span>'+T('این بخش کاربرانِ دارای این نسخه و درصدشان از کاربران فعال همان سکو را تا ۳۰ روز نشان می‌دهد. شاهین ویژگی «نسخه» دریافت نمی‌کند، پس این بخش داده ندارد.','This section shows users on this version and their share of active users on the same platforms, for up to 30 days. Shahin doesn’t receive a «version» property, so this part has no data.')+'</span>'+dev()+'</div>'+
        '<div class="rbx-gsec">'+T('تحلیل‌ها','Analyses')+'</div>'+(r.items.length?r.items.map(function(it,k){ var gone=itemGone(it);
          /* AL-21 (Claude's default): a linked chart or notebook that was deleted shows a «… حذف شده» state instead of a dead link */
          return '<div class="rbx-person">'+ic(gone?'warning':it.k==='n'?'notebook':'chart-line')+(gone?'<span class="grow rbx-note">'+(it.k==='n'?T('نوت‌بوک حذف شده','Notebook deleted'):T('نمودار حذف شده','Chart deleted'))+(it.name?' · '+esc(Array.isArray(it.name)?T(it.name[0],it.name[1]):it.name):'')+'</span>':'<button class="rb-linkbtn grow" data-rlit="'+k+'" type="button">'+esc(it.k==='n'?T(nbName(it.id)[0],nbName(it.id)[1]):NB.reportLabel(it.id))+'</button>')+'<button class="rbx-mx" data-rlitdel="'+k+'" type="button" aria-label="remove"'+vd+'>×</button></div>'; }).join(''):'<span class="rbx-note">'+T('نمودار یا نوت‌بوکی که اثر این انتشار را نشان می‌دهد اضافه کنید.','Add a chart or notebook that shows this release’s effect.')+'</span>')+
        '<button class="sh-btn ghost compact" id="rlAdd" type="button"'+vd+'>'+ic('plus')+' '+T('افزودن مورد','Add item')+'</button>';
      body.querySelector('#rlVisT').addEventListener('change', function(e){ r.vis=e.target.checked; U.toast(r.vis?'نشانگر روی نمودارها نشان داده می‌شود':'نشانگر از نمودارها پنهان شد', r.vis?'Marker shown on charts':'Marker hidden on charts'); });
      body.querySelector('#rlAdd').addEventListener('click', function(e){ e.stopPropagation(); var items=RB.SAVED.map(function(s2,i){ return { k:'r', id:i, fa:s2.fa, en:s2.en }; }).filter(function(it){ var m=RBShell.meta(it.id); return !(m&&(m.archived||m.deleted)); }).concat(   /* AL-21: no archived or deleted charts */NB.store().filter(function(n){ return !n.archived; }).map(function(n){ return { k:'n', id:n.id, fa:n.fa, en:n.en }; }));
        U.menu(body.querySelector('#rlAdd'), items.map(function(it){ return { icon:it.k==='n'?'notebook':'chart-line', fa:it.fa, en:it.en, fn:function(){ r.items.push({ k:it.k, id:it.id, name:[it.fa,it.en] }); draw(); } }; }), 'start'); });
      body.querySelectorAll('[data-rlit]').forEach(function(x){ x.addEventListener('click', function(){ var it=r.items[+x.getAttribute('data-rlit')]; if(itemGone(it)){ draw(); return; } NB.closePanel(); if(it.k==='n'&&window.RBNotebook) RBNotebook.open(it.id); else RBShell.openReport(it.id); }); });
      body.querySelectorAll('[data-rlitdel]').forEach(function(x){ x.addEventListener('click', function(){ r.items.splice(+x.getAttribute('data-rlitdel'),1); draw(); }); }); }
    draw(); } }); }
/* AL-21: a chart is gone when the shell flags it deleted (or it no longer exists); a notebook when it is no longer in the store */
function itemGone(it){ if(it.k==='n') return !NB.store().some(function(n){ return n.id===it.id; }); var m=RBShell.meta(it.id); return !RB.SAVED[it.id]||!!(m&&m.deleted); }
function nbName(id){ var n=NB.store().filter(function(x){ return x.id===id; })[0]; return n?[n.fa,n.en]:[id,id]; }
function relWire(root){
  function on(sel, fn){ root.querySelectorAll(sel).forEach(function(x){ x.addEventListener('click', function(e){ e.stopPropagation(); fn(x); }); }); }
  on('[data-alback]', function(){ RBShell.go('content'); });
  on('[data-rlnew]', function(){ relModal(null); });
  on('[data-rlopen]', function(x){ var r=rels().filter(function(y){ return y.id===x.getAttribute('data-rlopen'); })[0]; if(r) relReport(r); });
  on('[data-rlmenu]', function(x){ var r=rels().filter(function(y){ return y.id===x.getAttribute('data-rlmenu'); })[0]; if(!r) return;
    var vw=isViewer(), vh=vw?VIEW_WHY:null;   /* AL-9: a viewer only reads */
    U.menu(floatAnchor(x), [{ icon:'pencil-simple', fa:'ویرایش', en:'Edit', disabled:vw, hint:vh, fn:function(){ relModal(r); } },{ icon:'eye', fa:r.vis?'پنهان کردن از نمودارها':'نمایش روی نمودارها', en:r.vis?'Hide on charts':'Show on charts', disabled:vw, hint:vh, fn:function(){ r.vis=!r.vis; RBShell.rerender(); } },{ sep:1 },{ icon:'trash', fa:'حذف', en:'Delete', danger:true, disabled:vw, hint:vh, fn:function(){ U.confirmBox({ fa:'حذف انتشار', en:'Delete release', tone:'bad', bodyFa:'انتشار «'+T(r.fa,r.en)+'» و نشانگرش روی نمودارها حذف شود؟', bodyEn:'Delete the release “'+T(r.fa,r.en)+'” and its marker on charts?', okFa:'حذف', okEn:'Delete', fn:function(){ REL.splice(REL.indexOf(r),1); RBShell.rerender(); U.toast('انتشار حذف شد','Release deleted'); } }); } }], 'end'); });
}
/* automatic alerts (Amplitude): every event with 100+ events a day on 15 of the last 30 days, 99% band, 120 days of training; «Any event» doesn't qualify */
var AUTO_SUB=false, AUTO_CH='email', AUTO_CH_L={ email:['ایمیل','Email','email'], telegram:['تلگرام','Telegram','Telegram'], inapp:['اعلان درون‌برنامه','In-app','in-app notification'] };   /* AL-16 */
function autoRows(){ return RB.EVENTS.filter(function(e){ return e.w/7>=100&&e.id!=='video_heartbeat'; }).map(function(e,k){ var j=RB.jit(RB.hstr('auto'+e.id)); return j<0.28?{ ev:e, up:j<0.12, pct:Math.round(18+j*120), h:8+Math.round(j*300) }:null; }).filter(Boolean).sort(function(a,b){ return a.h-b.h; }); }
function qualifying(){ return RB.EVENTS.filter(function(e){ return e.w/7>=100&&e.id!=='video_heartbeat'; }).length; }
function openAuto(id){ if(!NB.newReport) return; NB.newReport('trend'); setTimeout(function(){ RBAmp.load({ events:[{ id:id, filters:[], groupBy:'' }], viz:'line', measure:'totals', ui:{ anom:{ on:true, mode:'agile', ci:99, prior:0, fcm:0 } } }); }, 60); }
/* Root Cause Analysis (Amplitude): from an anomalous point, scan properties one time series each, in batches of 30 */
/* PM 2026-10-25, AL-11: the full official holiday list of 1405 (solar and lunar), imported once a year from the official calendar.
   Solar dates are exact; lunar ones (third item 'l') are approximate placeholders until the official import and keep the one-day
   shift warning. Tasua and Ashura keep the demo's dates. */
var HOLI={
  '2026-03-21':['نوروز','Nowruz'], '2026-03-22':['نوروز','Nowruz'], '2026-03-23':['نوروز','Nowruz'], '2026-03-24':['نوروز','Nowruz'],
  '2026-04-01':['روز جمهوری اسلامی','Islamic Republic Day'], '2026-04-02':['روز طبیعت','Nature Day'],
  '2026-04-14':['شهادت امام جعفر صادق','Martyrdom of Imam Sadiq','l'], '2026-05-27':['عید قربان','Eid al-Adha','l'],
  '2026-06-04':['رحلت امام خمینی و عید غدیر','Death of Imam Khomeini and Eid al-Ghadir','l'], '2026-06-05':['قیام ۱۵ خرداد','15 Khordad uprising'],
  '2026-06-24':['تاسوعا','Tasua','l'], '2026-06-25':['عاشورا','Ashura','l'], '2026-08-04':['اربعین','Arbaeen','l'],
  '2026-08-12':['رحلت پیامبر و شهادت امام حسن','Death of the Prophet and Martyrdom of Imam Hasan','l'], '2026-08-13':['شهادت امام رضا','Martyrdom of Imam Reza','l'],
  '2026-08-21':['شهادت امام حسن عسکری','Martyrdom of Imam Hasan Askari','l'], '2026-08-30':['میلاد پیامبر و امام جعفر صادق','Birth of the Prophet and Imam Sadiq','l'],
  '2026-11-13':['شهادت حضرت فاطمه','Martyrdom of Fatima','l'], '2026-12-22':['ولادت امام علی','Birth of Imam Ali','l'],
  '2027-01-05':['مبعث','Mabath','l'], '2027-01-23':['ولادت امام مهدی','Birth of Imam Mahdi','l'], '2027-02-11':['پیروزی انقلاب اسلامی','Islamic Revolution Day'],
  '2027-02-28':['شهادت امام علی','Martyrdom of Imam Ali','l'], '2027-03-10':['عید فطر','Eid al-Fitr','l'], '2027-03-11':['تعطیل عید فطر','Eid al-Fitr holiday','l'],
  '2027-03-20':['ملی شدن صنعت نفت','Oil Nationalization Day'] };
function rca(o){
  var props=(RB.GLOBAL_PROPS||[]).filter(function(p){ return RB.PROPS[p]&&RB.PROPS[p].vals&&RB.PROPS[p].vals.length>1; }), cfg=props.slice(), shown=6, fb={};
  var key=toISO(o.date), hol=HOLI[key], near=rels().filter(function(r){ return Math.abs((r.start-o.date)/DAYMS)<=1; });
  NB.panel({ fa:'تحلیل علت ریشه‌ای', en:'Root cause analysis', render:function(body){
    function rows(){ return cfg.map(function(p){ var P=RB.PROPS[p], j=RB.jit(RB.hstr('rca'+o.seed+p)), vi=Math.floor(j*P.vals.length)%P.vals.length, v=P.vals[vi], d=Math.round((j-0.35)*90); return { p:p, P:P, v:v, d:d, score:Math.abs(d)*(0.4+v[2]) }; }).sort(function(a,b){ return b.score-a.score; }); }
    function spark(seed, up){ var pts=[], n=14; for(var i=0;i<n;i++){ var y=30+RB.jit(RB.hstr(seed)+i)*18; if(i===n-2) y=up?6:56; pts.push((i*(160/(n-1))).toFixed(1)+','+y.toFixed(1)); } return '<svg viewBox="0 0 160 64" class="ra-spark" preserveAspectRatio="none" style="direction:ltr"><polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--sh-c1)" stroke-width="2"/><circle cx="'+(160/(n-1)*(n-2)).toFixed(1)+'" cy="'+(up?6:56)+'" r="4" fill="var(--sh-bad)"/></svg>'; }
    function draw(){ var rs=rows(), vis=rs.slice(0, shown);
      body.innerHTML='<div class="rbx-field"><b>'+esc(o.label)+'</b><span class="rbx-note">'+T('ناهنجاری در ','Anomaly on ')+fdate(o.date)+'</span></div>'+dev()+
        (hol?'<div class="rbx-callout warn">'+ic('calendar-blank')+'<span>'+T('این روز تعطیل رسمی است: '+hol[0]+'.'+(hol[2]?' تاریخ مناسبت‌های قمری ممکن است یک روز جابه‌جا شود.':''),'This day is a public holiday: '+hol[1]+'.'+(hol[2]?' Lunar holidays can shift by a day.':''))+'</span></div>':'')+
        (near.length?'<div class="rbx-callout">'+ic('tag')+'<span>'+T('انتشار نزدیک این روز: ','Release near this day: ')+near.map(function(r){ return '«'+esc(T(r.fa,r.en))+'»'; }).join(T('، ',', '))+'</span></div>':'')+
        '<span class="rbx-note">'+T('هر ویژگی یک سری زمانی جدا دارد؛ مقدارهایی که بیشترین سهم را در این جهش داشته‌اند بالا آمده‌اند. همبستگی است، نه علت.','Each property is its own time series; the values that contributed most to this spike come first. Correlation, not cause.')+'</span>'+
        '<div class="ra-rca">'+vis.map(function(r){ return '<div class="ra-rcard"><div class="ra-rh"><b>'+esc(T(r.P.fa,r.P.en))+': '+esc(T(r.v[0],r.v[1]))+'</b><span class="'+(r.d>=0?'up':'down')+'"><bdi dir="ltr">'+(r.d>=0?'+':'−')+num(Math.abs(r.d))+'%</bdi> '+T('نسبت به انتظار','vs expected')+'</span></div>'+spark(o.seed+r.p, r.d>=0)+
          '<div class="ra-ract"><button class="rb-linkbtn" data-rcopen="'+r.p+'" type="button">'+T('باز کردن نمودار','Open chart')+'</button><span class="rbx-spacer"></span><button class="rbx-icbtn'+(fb[r.p]==='up'?' on':'')+'" data-rcfb="'+r.p+':up" type="button" aria-label="'+T('مفید بود','Helpful')+'">👍</button><button class="rbx-icbtn'+(fb[r.p]==='down'?' on':'')+'" data-rcfb="'+r.p+':down" type="button" aria-label="'+T('مفید نبود','Not helpful')+'">👎</button></div></div>'; }).join('')+'</div>'+
        '<div class="rbx-row"><button class="sh-btn ghost compact" id="rcMore" type="button"'+(shown>=rs.length?' disabled':'')+'>'+T('ادامهٔ اسکن','Continue scanning')+'</button><button class="sh-btn ghost compact" id="rcCfg" type="button">'+ic('faders')+' '+T('پیکربندی','Configure')+'</button><span class="rbx-note">'+T(num(Math.min(shown,rs.length))+' از '+num(rs.length)+' ویژگی',Math.min(shown,rs.length)+' of '+rs.length+' properties')+'</span></div>';
      body.querySelector('#rcMore').addEventListener('click', function(){ shown=Math.min(rs.length, shown+30); draw(); });
      body.querySelector('#rcCfg').addEventListener('click', function(){ U.modal({ fa:'ویژگی‌های اسکن', en:'Properties to scan', body:'<div class="ra-ch">'+props.map(function(p){ return '<label class="rbz-ck"><input type="checkbox" data-rcp="'+p+'"'+(cfg.indexOf(p)>-1?' checked':'')+'/> '+esc(T(RB.PROPS[p].fa,RB.PROPS[p].en))+'</label>'; }).join('')+'</div>',
        actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var c=[].slice.call(bd.querySelectorAll('[data-rcp]:checked')).map(function(x){ return x.getAttribute('data-rcp'); }); if(!c.length){ U.toast('دست‌کم یک ویژگی انتخاب کنید','Pick at least one property'); return false; } cfg=c; shown=6; draw(); } }] }); });
      body.querySelectorAll('[data-rcopen]').forEach(function(x){ x.addEventListener('click', function(){ NB.closePanel(); if(o.groupBy) o.groupBy(x.getAttribute('data-rcopen')); }); });
      body.querySelectorAll('[data-rcfb]').forEach(function(x){ x.addEventListener('click', function(){ var a=x.getAttribute('data-rcfb').split(':'); fb[a[0]]=fb[a[0]]===a[1]?null:a[1]; draw(); U.toast('ممنون؛ بازخوردتان ثبت شد','Thanks; your feedback was recorded'); }); }); }
    draw(); } }); }
window.RBAlerts={ openAlert:function(id){ var a=store().filter(function(z){ return z.id===id; })[0]; if(a){ openInContext(a, a.history[0]?a.history[0].h:null); return true; } return false; }, openAuto:openAuto, view:view, wire:wire, relView:relView, relWire:relWire, relModal:function(d){ relModal(null, d); }, markers:markers, rca:rca, rels:rels, modal:function(i, draft){ return modal(i, null, draft); }, bellMenu:bellMenu, count:function(i){ return forChart(i).length; }, eligible:eligible, store:store, _cond:condTxt,
  /* AL-7: the shell calls this when a chart is deleted (its alerts go with it); archive and restore need no call, they are derived */
  chartDeleted:function(i){ store(); for(var k=STORE.length-1;k>=0;k--){ if(STORE[k].r===i) STORE.splice(k,1); } }, state:function(a){ return chartState(a); } };
})();
