/* ══════════ report builder — Amplitude-like Event Segmentation (v12, window.RB_AMP_BUILDER) ══════════
   Rebuilt from Amplitude's Segmentation chart (docs + demo chart/jj7a0yg; spec in
   research-notes/…/09-amplitude-segmentation-spec.md) under the chart-review rules in 10-chart-review-segmentation.md:
   - unique users are never summed across days: one period estimate (RB.periodUniques) everywhere;
   - pie only for additive measures; stacked "users" carry a note; no "Other" row for users, an Overall row instead;
   - the last, still-collecting bucket is dotted; value axis starts at 0; no second Y axis.
   Funnel / Retention / Flows still use the existing panes (phase 2 steps 2–4). */
(function(){
'use strict';
if(!window.RB_AMP_BUILDER || !window.RB || !window.RBShell || !RBShell.ui) return;
var U=RBShell.ui, T=U.T, N=U.N, esc=U.esc, ic=U.ic, tip=U.tip;
function $(id){ return document.getElementById(id); }
function fa(){ return U.L()==='fa'; }
function num(x, dec){ var n=Number(x)||0; return n.toLocaleString(fa()?'fa-IR':'en-US', { maximumFractionDigits:dec==null?0:dec, minimumFractionDigits:0 }); }
function compact(x){ var n=Math.abs(x), s=x<0?'-':'';
  if(n>=1e9) return s+num(n/1e9,1)+T(' میلیارد','B'); if(n>=1e6) return s+num(n/1e6,1)+T(' میلیون','M'); if(n>=1e4) return s+num(n/1e3,1)+T(' هزار','k'); return s+num(n, n<10?2:0); }
/* PM 2026-10-28, LX-6: the report builder is not in production (Backlog in the menu), so it carries no «نیازمند توسعه»; production prerequisites live in the Reports PRDs. devTag stays as a no-op hook so the call sites keep their shape. */
function devTag(){ return ''; }
var LIVE_DEV=['شاهین هنوز جریان زنده ایونت‌ها را ندارد؛ ایونت‌های این فهرست نمونه‌اند و از روی ایونت‌های پروژه ساخته شده‌اند.','Shahin has no live event stream yet; the events in this list are samples built from the project’s events.'];
function liveBtn(){ return '<button class="rbz-live" data-live="1" type="button">'+ic('monitor')+T('ایونت‌های زنده','Live events')+' '+devTag(LIVE_DEV[0],LIVE_DEV[1])+'</button>'; }
var ANOM_DEV=['شاهین هنوز مدل ناهنجاری و پیش‌بینی ندارد؛ بازه این دمو از خود عددهای نمودار ساخته شده است.','Shahin has no anomaly or forecast model yet; this demo draws the band from the chart’s own numbers.'];
var LET='ABCDEFGHIJ', MAX_EVENTS=10, MAX_SERIES=12, DEFAULT_DRAWN=6;

/* numeric properties: mean value per event occurrence (demo), and unit */
var NUMP={ active_time_sec:{ mean:54, fa:'ثانیه', en:'s' }, depth_percent:{ mean:54, fa:'٪', en:'%' }, video_duration_sec:{ mean:358, fa:'ثانیه', en:'s' }, amount:{ mean:285000, cur:1, get fa(){ return curU()[0]; }, get en(){ return curU()[1]; } }, order_value:{ mean:533000, cur:1, get fa(){ return curU()[0]; }, get en(){ return curU()[1]; } }, load_time:{ mean:2.6, fa:'ثانیه', en:'s', dec:1 } };
/* PM 2026-10-28, TD-9: amounts carry the project's currency unit, a project setting with «تومان» (Toman) by default. Read from
   RB.CURRENCY (an in-page override), else localStorage 'shahin-currency' (written by project settings); either holds [fa, en] for every
   project or { "<project index>": [fa, en] }. Anything else falls back to Toman. */
var CUR_DEFAULT=['تومان','toman','Toman'];
function curU(){ var c=RB.CURRENCY, p=RB.PROJECT||0;
  if(!c){ try{ c=JSON.parse(localStorage.getItem('shahin-currency')||'null'); }catch(e){ c=null; } }
  if(c&&!Array.isArray(c)) c=c[p];
  return Array.isArray(c)&&c[0]&&c[1]?[c[0],c[1],c[2]||String(c[1]).charAt(0).toUpperCase()+String(c[1]).slice(1)]:CUR_DEFAULT; }
function curTxt(){ var c=curU(); return T(' '+c[0],' '+c[1]); }
var MEAS={
  uniques:{ fa:'کاربران', en:'Users', tf:"<span class='tip-title'>کاربران</span>تعداد افرادی که این ایونت را دست‌کم یک بار انجام داده‌اند. "+RB.USER_DEF[0],
    te:"<span class='tip-title'>Users</span>How many people performed this event at least once. "+RB.USER_DEF[1] },
  totals:{ fa:'تعداد دفعات', en:'Event totals', additive:true, tf:"<span class='tip-title'>تعداد دفعات</span>همهٔ دفعاتی که این ایونت رخ داده، حتی اگر یک نفر چند بار انجامش داده باشد.", te:"<span class='tip-title'>Event totals</span>Every time this event happened, even when one person did it several times." },
  active:{ fa:'درصد کاربران فعال', en:'Share of active users', pct:true, tf:"<span class='tip-title'>درصد کاربران فعال</span>از همهٔ کاربرانی که در این بازه کاری انجام داده‌اند، چند درصد این ایونت را هم انجام داده‌اند.", te:"<span class='tip-title'>Share of active users</span>Of all users who did anything in the period, the share who also performed this event." },
  avg:{ fa:'میانگین در هر کاربر', en:'Average per user', dec:2, tf:"<span class='tip-title'>میانگین در هر کاربر</span>تعداد دفعات این ایونت تقسیم بر کاربرانی که انجامش داده‌اند؛ کاربرانی که هیچ بار انجامش نداده‌اند حساب نمی‌شوند.", te:"<span class='tip-title'>Average per user</span>Event totals divided by the users who performed it; users with none are left out." },
  freq:{ fa:'توزیع تکرار', en:'Frequency distribution', hist:true, tf:"<span class='tip-title'>توزیع تکرار</span>کاربران بر اساس اینکه این ایونت را چند بار در این بازه انجام داده‌اند دسته‌بندی می‌شوند؛ خروجی یک هیستوگرام است، نه یک عدد.", te:"<span class='tip-title'>Frequency distribution</span>Users grouped by how many times they performed this event in the period; the result is a histogram, not a single number." },
  prop:{ fa:'مقدار ویژگی', en:'Property value', tf:"<span class='tip-title'>مقدار ویژگی</span>به‌جای شمردن، روی مقدار عددی یک ویژگی ایونت (مثل مبلغ) محاسبه می‌کند: مجموع، میانگین، میانه یا توزیع.", te:"<span class='tip-title'>Property value</span>Instead of counting, calculates on a numeric event property (such as amount): sum, average, median or distribution." }
};
MEAS.formula={ fa:'فرمول', en:'Formula', tf:"<span class='tip-title'>فرمول</span>عدد را از ترکیب ایونت‌ها می‌سازد، مثل TOTALS(B)/UNIQUES(A) برای «خرید به‌ازای هر کاربرِ صفحه»؛ چند فرمول را با ; جدا کنید.", te:"<span class='tip-title'>Formula</span>Builds the number from several events, e.g. TOTALS(B)/UNIQUES(A) for purchases per page visitor; separate several formulas with ;." };
/* PM 2026-10-28, CR-5: ARPAU is a measure of its own in Trend (as well as the ARPAU() formula function): the event's order amount ÷ active users;
   an event with no amount gives «—» */
MEAS.arpau={ fa:'درآمد هر کاربر فعال', en:'Revenue per active user', ratio:true, tf:"<span class='tip-title'>درآمد هر کاربر فعال</span>جمع مبلغ سفارش این ایونت تقسیم بر کاربران فعال همان بازه (ARPAU)؛ برای ایونتی که مبلغ ندارد «—» نشان داده می‌شود.",
  te:"<span class='tip-title'>Revenue per active user</span>The sum of this event's order amount divided by the active users in the same interval (ARPAU); an event with no amount shows “—”." };
var PAGG={ sum:['مجموع','Sum'], avg:['میانگین','Average'], median:['میانه','Median'], dist:['توزیع','Distribution'], distinct:['مقدار یکتا','Distinct values'] };
/* Amplitude: "Bar" is one bar per series for the whole range (deduplicated); bars over time are «ستونی» here */
var VIZ=[['line','خطی','Line','chart-line'],['area','ناحیه‌ای انباشته','Stacked area','chart-line'],['column','ستونی در طول زمان','Columns over time','squares-four'],['stackbar','ستونی انباشته','Stacked columns','squares-four'],
  ['bar','میله‌ای (کل بازه)','Bar (whole range)','list-bullets'],['pie','دایره‌ای','Pie','squares-four'],['kpi','عدد کلیدی','KPI','text-t'],['table','جدول','Table','list-bullets']];
var GRAN={ auto:['خودکار','Auto'], minute:['دقیقه‌ای','By minute'], hour:['ساعتی','Hourly'], day:['روزانه','Daily'], week:['هفتگی','Weekly'], month:['ماهانه','Monthly'], quarter:['فصلی','Quarterly'] };
var FREQB=[['۱','1',1,1],['۲','2',2,2],['۳','3',3,3],['۴','4',4,4],['۵','5',5,5],['۶–۱۰','6–10',6,10],['۱۱–۲۰','11–20',11,20],['۲۱+','21+',21,1e9]];

/* step 2: user segments (Amplitude "Segment by") and compare to previous */
var MAX_SEGMENTS=10, MAX_ROWS=12;   /* Block C: up to 10 segments, as Amplitude */
/* who: share of the event's users. "Active" differs from "All" only for system-side events, so the gap stays small. */
var WHO={ any:['همهٔ کاربران','All users',1], active:['کاربران فعال','Active users',0.97], 'new':['کاربران جدید','New users',0] };
/* compare to past (Amplitude's Compare panel): each preset shifts the current range back by its own span */
var CMP_SHIFT={ prev:0, day:1, week:7, month:30, quarter:91, year:365 };
var CMP_X={ day:['روز قبل','Previous day',[4,3],'نسبت به روز قبل','vs. previous day'], week:['هفتهٔ قبل','Previous week',[10,4],'نسبت به هفتهٔ قبل','vs. previous week'],
  month:['ماه قبل','Previous month',[6,3,2,3],'نسبت به ماه قبل','vs. previous month'], quarter:['فصل قبل','Previous quarter',[12,3,2,3,2,3],'نسبت به فصل قبل','vs. previous quarter'] };
function cmpInfo(m){
  if(m==='prev' && RB.rangeInfo().mode==='today_sofar') return ['دیروز تا همین ساعت','Yesterday to this time',[6,4],'نسبت به دیروز تا همین ساعت','vs. yesterday to this time'];
  if(CMP[m]) return CMP[m]; if(CMP_X[m]) return CMP_X[m];
  var n=+String(m).slice(1)||30; return ['از '+num(n)+' روز قبل',n+' days earlier',[3,3],'نسبت به '+num(n)+' روز قبل','vs. '+n+' days earlier'];
}
function cmpShift(m, days){ if(m==='prev') return RB.rangeInfo().mode==='today_sofar'?1:days;   /* phase 4c: today so far compares with yesterday to the same time */ if(CMP_SHIFT[m]!=null) return CMP_SHIFT[m]; return +String(m).slice(1)||days; }
function cmpRange(m){
  var R=within({ range:RB.Q.range, filters:[] }, function(){ return RB.rangeInfo(); });
  var end=R.mode==='custom'?rEnd(R):R.mode==='yesterday'?new Date(2026,6,26):new Date(2026,6,27), sh=cmpShift(m, R.days)*86400000;
  var a=new Date(end.getTime()-(R.days-1)*86400000-sh), b=new Date(end.getTime()-sh);
  var f=fa()?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long', year:m==='year'?'numeric':undefined }):new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric', year:m==='year'?'numeric':undefined });
  return R.days<=1?f.format(a):f.format(a)+' – '+f.format(b);
}
var CMP={ prev:['دورهٔ قبل','Previous period',[6,4],'نسبت به دورهٔ قبل','vs. previous'], year:['سال قبل','Previous year',[14,4,3,4],'نسبت به سال قبل','vs. previous year'] };
var SEG_GRPS=['ses','dev','geo','ref','utm','user','computed','org']; /* user and session properties a segment can filter or break down on */
var SEG_TIPS={
  mod:["<span class='tip-title'>گروه‌های کاربران</span>تعیین می‌کند ایونت‌ها برای چه کسانی سنجیده شوند؛ هر گروه با شرط‌های خودش کنار گروه‌های دیگر نمایش داده می‌شود و یک نفر می‌تواند عضو چند گروه باشد.","<span class='tip-title'>User segments</span>Defines whose activity the events are measured for; each segment is shown side by side with its own conditions, and one person can belong to several segments."],
  active:["<span class='tip-title'>کاربران فعال</span>کسانی که در همان بازه دست‌کم یک کار را خودشان انجام داده‌اند؛ برای ایونت‌هایی که کاربر انجام می‌دهد تقریباً با «همهٔ کاربران» برابر است و تفاوت فقط برای ایونت‌های سمت سیستم (مثل ارسال اعلان) دیده می‌شود.","<span class='tip-title'>Active users</span>People who did at least one action themselves in the same interval; for user-initiated events this nearly matches All users, and the gap only shows on system-side events such as a notification sent."],
  'new':["<span class='tip-title'>کاربران جدید</span>کسانی که اولین بازدیدشان در همین بازه ثبت شده؛ همان «جدید» در ویژگی «کاربر جدید / بازگشتی».","<span class='tip-title'>New users</span>People whose first visit falls in this period; the same “New” as in the New vs returning property."],
  perf:["<span class='tip-title'>انجام ایونت</span>فقط کسانی را نگه می‌دارد که ایونت انتخابی را دست‌کم چند بار در روزهای اخیر انجام داده‌اند؛ مثل «خریداران دو بار یا بیشتر در ۳۰ روز اخیر».","<span class='tip-title'>Performed event</span>Keeps only people who performed the chosen event at least N times in the recent days you set, such as buyers with two or more purchases in the last 30 days."],
  cohort:["<span class='tip-title'>در کوهورت</span>گروه را به اعضای یک کوهورت ذخیره‌شده محدود می‌کند؛ اعضای کوهورت طبق تعریف خودش به‌روز می‌شوند.","<span class='tip-title'>In cohort</span>Limits the segment to members of a saved cohort; membership follows the cohort’s own definition."],
  gseg:["<span class='tip-title'>تفکیک گروه‌ها</span>هر گروه را بر اساس یک ویژگی کاربر (مثل نوع دستگاه) به حداکثر ۵ زیرگروه می‌شکند. ویژگی در لحظه هر ایونت خوانده می‌شود؛ پس در روند، کاربری که مقدارش در بازه عوض شده در هر دو زیرگروه شمرده می‌شود.","<span class='tip-title'>Break down segments</span>Splits each segment by one user property (such as device type) into up to 5 sub-segments. The property is read at the time of each event, so in a trend a user whose value changed during the range counts in both sub-segments."],
  cmp:["<span class='tip-title'>مقایسه با دورهٔ قبل</span>همین گزارش را برای بازهٔ هم‌طولِ پیش از آن (یا همین بازه در سال قبل) کنار عدد فعلی می‌گذارد؛ خط‌چین در نمودار و ستون «تغییر» در جدول.","<span class='tip-title'>Compare to previous</span>Places the same report for the equal-length period before (or the same period last year) next to the current figure: dashed in the chart, with a Change column in the table."],
  chg:["<span class='tip-title'>تغییر</span>فاصلهٔ عدد این بازه از دورهٔ مقایسه، به‌صورت مقدار یا درصد؛ وقتی دورهٔ مقایسه داده ندارد «—» نمایش داده می‌شود.","<span class='tip-title'>Change</span>How far this period’s figure is from the comparison period, as an absolute value or a percentage; shows “—” when the comparison period has no data."]
};

/* ── state ── */
function blankSeg(){ return { who:'any', label:'', filters:[], performed:null, cohort:'' }; }
/* a new report starts empty, like Amplitude's new chart: the user picks the first event */
function blank(){ return { events:[], funnel:blankFunnel(), adv:{ fn:'none', n:7 }, ui:{ legend:true, labels:false, ymin:'', ymax:'', ytitle:'', rowAgg:'avg', topN:10, yout:false, ylog:false, yunit:'#', ypre:'', ysuf:'', theme:'shahin', sampling:false, anom:{ on:false, mode:'agile', ci:95, prior:0, fc:0 }, annOff:{}, histMode:'count', stackPct:false }, ret:blankRet(), journey:blankJourney(), table:blankTable(), mex:blankMex(), s8:Object.assign(blankS8(), blankS8b(), blankS8c()), segments:[blankSeg()], groupSeg:'', compare:[], cmpMode:'abs', measure:'uniques', prop:'amount', pagg:'sum', viz:'line', interval:'auto', sel:null }; }
/* older saved states (step 1) have no segments/compare */
function norm(st){
  (st.events||(st.events=[])).forEach(function(e){ e.filters=e.filters||[]; if(e.groupBy==null) e.groupBy=''; });
  if(!st.segments||!st.segments.length) st.segments=[blankSeg()];
  st.segments.forEach(function(sg){ sg.who=sg.who||'any'; sg.label=sg.label||''; sg.filters=sg.filters||[]; sg.performed=sg.performed||null; sg.cohort=sg.cohort||''; });
  st.ret=Object.assign(blankRet(), st.ret||{}); st.ret.open=st.ret.open||{};
  st.table=Object.assign(blankTable(), st.table||{}); st.table.cols=(st.table.cols||[]).map(function(c){ return Object.assign({ filters:[], ee:'default' }, c); }); st.table.gbs=(st.table.gbs||[]).slice(); st.table.nest=st.table.nest||{}; st.table.open=st.table.open||{};
  st.mex=Object.assign(blankMex(), st.mex||{}); st.mex.metrics=(st.mex.metrics||[]).map(function(m){ return Object.assign({ filters:[], adv:{ fn:'none', n:7 } }, m); }); st.mex.legend=st.mex.legend||{}; st.mex.y={ l:Object.assign(blankMex().y.l, (st.mex.y||{}).l||{}), r:Object.assign(blankMex().y.r, (st.mex.y||{}).r||{}) };
  /* fill defaults in place: handlers keep references to these objects across recomputes */
  var b8=Object.assign(blankS8(), blankS8b(), blankS8c(), blankS8d());   /* AC-10: Revenue LTV state */ st.s8=st.s8||{}; Object.keys(b8).forEach(function(k){ if(!st.s8[k]) st.s8[k]=b8[k]; else Object.keys(b8[k]).forEach(function(f){ if(st.s8[k][f]===undefined) st.s8[k][f]=b8[k][f]; }); }); st.s8.emx.hidden=st.s8.emx.hidden||{}; st.s8.emx.list=(st.s8.emx.list||[]).slice();
  st.journey=Object.assign(blankJourney(), st.journey||{}); ['filter','exclude','expand','hide','only'].forEach(function(k){ st.journey[k]=(st.journey[k]||[]).slice(); }); st.journey.more=st.journey.more||{}; st.journey.win=Object.assign({ mode:'session', n:1 }, st.journey.win||{});
  st.funnel=Object.assign(blankFunnel(), st.funnel||{}); st.funnel.win=Object.assign({ n:1, u:'day' }, st.funnel.win||{}); st.funnel.excl=st.funnel.excl||[];
  ['measure','uniques','prop','amount','pagg','sum','viz','line'].forEach(function(x,i,a){ if(i%2===0&&!st[x]) st[x]=a[i+1]; });
  if(!MEAS[st.measure]) st.measure='uniques';
  st.adv=Object.assign({ fn:'none', n:7 }, st.adv||{}); st.ui=Object.assign({ legend:true, labels:false, ymin:'', ymax:'', ytitle:'', rowAgg:'avg', topN:10, yout:false, ylog:false, yunit:'#', ypre:'', ysuf:'', theme:'shahin', sampling:false, anom:{ on:false, mode:'agile', ci:95, prior:0, fc:0 }, annOff:{}, histMode:'count', stackPct:false }, st.ui||{}); st.ui.anom=Object.assign({ on:false, mode:'agile', ci:95, prior:0, fc:0 }, st.ui.anom||{}); st.ui.annOff=st.ui.annOff||{};
  if(st.groupSeg==null) st.groupSeg=''; if(!st.compare) st.compare=[]; if(!st.cmpMode) st.cmpMode='abs'; if(!st.interval) st.interval='auto';
  syncGb(st);   /* PM 2026-10-31, outcome 1: B04 — a loaded chart's breakdown applies to every event */
  return st;
}
var A=norm(blank());
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function fromLegacy(q){
  var t=(q&&q.trend)||{}, fu=(q&&q.funnel)||{};
  if(q && q.ret && (RB.Q.type==='retention' || (!q.trend && !q.funnel && !q.flows))) return retFromLegacy(q);   /* a report saved by the legacy retention pane */
  if(q && q.flows && (RB.Q.type==='flows' || (!q.trend && !q.funnel && !q.ret))) return jFromLegacy(q);   /* … and by the legacy Flows pane */
  /* a legacy funnel report: its steps become the events, its window/count/exclusion the funnel settings */
  if(RB.Q.type==='funnel' && fu.steps && fu.steps.length) return norm({ events:fu.steps.map(function(id){ return { id:id, filters:[], groupBy:'' }; }),
    funnel:{ order:'this', win:({ '1d':{ n:1, u:'day' }, '7d':{ n:7, u:'day' }, '30d':{ n:30, u:'day' }, session:{ n:1, u:'hour' } })[fu.win]||{ n:1, u:'day' },
      count:fu.count==='events'?'totals':'uniques', view:'conv', scope:0, excl:fu.exclude?[{ ev:fu.exclude, from:0 }]:[], head:'total' },
    measure:'uniques', prop:'amount', pagg:'sum', viz:'line', interval:'auto', sel:null });
  return norm({ events:(t.events&&t.events.length?t.events:['page_view']).map(function(id,k){ return { id:id, filters:[], groupBy:k===0&&t.breakdown&&RB.PROPS[t.breakdown]?t.breakdown:'' }; }),
    measure:t.count==='uniques'?'uniques':'totals', prop:'amount', pagg:'sum',
    compare:t.compare?[t.compareMode==='lastyear'?'year':'prev']:[],
    viz:({ line:'line', stackline:'area', column:'column', bar:'column', stackcol:'stackbar', pie:'pie', metric:'kpi' })[t.kind]||'line', interval:(t.gran&&t.gran!=='auto')?t.gran:'auto', sel:null });
}
/* group-by per event: up to 5 properties (Amplitude); stored as a string for one, an array for several */
var MAX_GB=5;
function gbs(e){ return Array.isArray(e.groupBy)?e.groupBy.filter(Boolean):(e.groupBy?[e.groupBy]:[]); }
/* PM 2026-10-31, outcome 1: B04 — a breakdown belongs to the whole chart (PRD-Report-Builder feature 5; TD-8; Amplitude's chart-level
   "Breakdown by"). The data model stays backward compatible: every reader keeps reading A.events[k].groupBy, and the chart's breakdown
   is written to every event. chartGb() is the union over the events (first event first, up to 5), so an old saved chart or a new
   event with no breakdown of its own takes the chart's; setGb() writes one list to every event. Funnel steps, retention and
   journeys keep their own breakdowns (A.funnel.gb, A.groupSeg, A.journey.gb) and never read this. */
function chartGb(st){ var out=[]; ((st||A).events||[]).forEach(function(e){ if(e) gbs(e).forEach(function(p){ if(out.indexOf(p)<0) out.push(p); }); }); return out.slice(0, MAX_GB); }
function setGb(list, st){ var g=(list||[]).filter(Boolean).slice(0, MAX_GB); ((st||A).events||[]).forEach(function(e){ if(e) e.groupBy=g.length>1?g.slice():(g[0]||''); }); }
function syncGb(st){ setGb(chartGb(st), st); }
/* value combinations of several group-by properties, biggest first (at most 30 measured) */
function gbVals(e){ var out=gbVals0(e); if(!out) return out;
  /* lexicon b: a hidden value leaves the breakdown; the event total keeps it, as in Amplitude */
  var hid={}; gbs(e).forEach(function(p){ ((RB.PROPS[p]||{}).hideVals||[]).forEach(function(v){ hid[v]=1; }); });
  var g1=gbs(e), DP=g1.length===1&&RB.PROPS[g1[0]]&&RB.PROPS[g1[0]].derived;
  if(DP&&DP.src&&DP.map&&RB.PROPS[DP.src]){ var ss=RB.sharesFor?RB.sharesFor(DP.src, e.id, condOf(e)):RB.PROPS[DP.src].vals;
    out=out.map(function(v){ var r=v.slice(); r.parts=ss.filter(function(x){ return DP.map[x[1]]===v[1]; }).map(function(x){ return [x[1], x[2]]; }); r.src=DP.src; return r; }); }
  return Object.keys(hid).length?out.filter(function(v){ return !String(v[1]).split(' / ').some(function(x){ return hid[x]; }); }):out; }
function seedKey(prop, key){ var P=RB.PROPS[prop]; return P&&P.aliasOf&&P.aliasOf[key]||key; }
function sumParts(st, e, pv, ctx){ var acc=null, tot=0;
  pv.parts.forEach(function(p){ var m=measure(st, e, { share:p[1], seed:e.id+pv.src+seedKey(pv.src, p[0]) }, ctx); acc=acc?acc.map(function(x,i){ return x+(m.v[i]||0); }):m.v.slice(); tot+=m.total; });
  if(!acc) return measure(st, e, { share:pv[2], seed:e.id+'none' }, ctx);
  return { v:acc, total:st.measure==='uniques'?RB.periodUniques(acc):tot }; }
function gbVals0(e){
  var props=gbs(e).filter(function(p){ return RB.PROPS[p]; }); if(!props.length) return null;
  if(props.length===1) return keepFiltered(props[0], e, RB.sharesFor?RB.sharesFor(props[0], e.id, condOf(e)):RB.PROPS[props[0]].vals);   /* phase 4a-1b: per-event shares; 4a-2b: conditional on a pinned value */
  var combos=[['','',1]];
  props.forEach(function(p){ var nx=[]; combos.forEach(function(c){ (RB.sharesFor?RB.sharesFor(p, e.id):RB.PROPS[p].vals).forEach(function(v){ nx.push([c[0]?c[0]+' / '+v[0]:v[0], c[1]?c[1]+' / '+v[1]:v[1], c[2]*v[2], (c[3]||[]).concat([v[1]])]); }); }); combos=nx; });
  /* phase 4b: UTM parameters come together — a session without a campaign has no UTM source or medium either. Combos that mix
     «No campaign» with a named value are dropped; «No campaign» across the board keeps the no-campaign share; named combos share the rest. */
  var ix=props.map(function(p,i){ return /^utm_/.test(p)?i:-1; }).filter(function(i){ return i>-1; });
  if(ix.length>1){ var NO=/^No campaign$/, noOf=function(i){ var v=(RB.sharesFor?RB.sharesFor(props[i], e.id):RB.PROPS[props[i]].vals).filter(function(x){ return NO.test(x[1]); })[0]; return v?v[2]:0; },
      noSh=Math.min.apply(null, ix.map(noOf)), pNo=ix.reduce(function(a,i){ return a*(noOf(i)||1); },1), pNamed=ix.reduce(function(a,i){ return a*(1-noOf(i)); },1);
    combos=combos.map(function(c){ var nos=ix.filter(function(i){ return NO.test(c[3][i]); }).length;
      if(nos&&nos<ix.length) return null;
      return [c[0], c[1], nos?c[2]/pNo*noSh:c[2]/(pNamed||1)*(1-noSh)]; }).filter(Boolean); }
  return combos.map(function(c){ return [c[0],c[1],c[2]]; }).sort(function(a,b){ return b[2]-a[2]; }).slice(0,30);
}
/* phase 4b: a breakdown by a property the query also filters on keeps only the values the filter lets through (Amplitude: a
   «not No campaign» filter grouped by campaign has no «No campaign» row); the rest share the filtered total */
function keepFiltered(p, e, vals){ var fs=(e&&e.filters||[]).concat(RB.Q.filters||[]).filter(function(f){ return f&&f.prop===p&&f.vals&&f.vals.length&&!f.text&&(f.op==='in'||f.op==='not_in'||!f.op); });
  if(!fs.length||!vals) return vals;
  var keep=vals.filter(function(v){ return fs.every(function(f){ var hit=f.vals.indexOf(v[1])>-1||f.vals.indexOf(v[0])>-1; return f.op==='not_in'?!hit:hit; }); });
  var t=keep.reduce(function(a,v){ return a+v[2]; },0); return t?keep.map(function(v){ return [v[0], v[1], v[2]/t]; }):vals; }
/* phase 4a-2b: properties the query pins to one value (event or global filter), e.g. { article_title:'Currency market today' } */
function condOf(e){ var c={}; (e&&e.filters||[]).concat(RB.Q.filters||[]).forEach(function(f){ if(f&&f.prop&&f.op!=='not_in'&&!f.text&&f.vals&&f.vals.length===1) c[f.prop]=f.vals[0]; }); return c; }
/* a numeric property's mean for a pinned value (PROPS[p].num[numProp][value] — e.g. one article's read depth) */
function numTilt(e, prop){ var c=condOf(e), k=1; Object.keys(c).forEach(function(p){ var P=RB.PROPS[p], m=P&&P.num&&P.num[prop]; if(m&&m[c[p]]!=null) k*=m[c[p]]; }); return k; }
function isHist(st){ if(st.measure==='formula') return false; return st.measure==='freq' || (st.measure==='prop' && st.pagg==='dist'); }
/* phase 4c-2: a multi-value breakdown (tags) counts a view under each value, so its rows aren't forced to the total */
function multiGb(e){ return gbs(e).some(function(p){ return RB.PROPS[p]&&RB.PROPS[p].multi; }); }
function anyMulti(st){ return (st.events||[]).some(multiGb); }
function normRows(rows, target){ var n=target.length;
  for(var i=0;i<n;i++){ var cur=0, k; for(k=0;k<rows.length;k++) cur+=rows[k].values[i]||0; if(!cur) continue;
    var want=target[i]||0, raw=rows.map(function(r){ return (r.values[i]||0)*want/cur; }), fl=raw.map(Math.floor), left=Math.round(want)-fl.reduce(function(a,b){ return a+b; },0);
    raw.map(function(x,j){ return [x-fl[j], j]; }).sort(function(a,b){ return b[0]-a[0]; }).slice(0, Math.max(0,left)).forEach(function(x){ fl[x[1]]++; });
    rows.forEach(function(r,j){ r.values[i]=fl[j]; }); }
  rows.forEach(function(r){ r.total=r.values.reduce(function(a,b){ return a+b; },0); }); }
function additive(st){ return st.measure==='totals' || (st.measure==='prop' && st.pagg==='sum'); }
function measLabel(st){
  /* PM 2026-10-28, TD-9: an amount measure names its currency unit */
  if(st.measure==='prop'){ var P=RB.PROPS[st.prop], cu=NUMP[st.prop]&&NUMP[st.prop].cur&&st.pagg!=='dist'&&st.pagg!=='distinct'?' ('+T(curU()[0],curU()[1])+')':''; return T(PAGG[st.pagg][0],PAGG[st.pagg][1])+' '+(P?T(P.fa,P.en):'')+cu; }
  if(st.measure==='arpau') return T(MEAS.arpau.fa,MEAS.arpau.en)+' ('+T(curU()[0],curU()[1])+')';
  return T(MEAS[st.measure].fa, MEAS[st.measure].en);
}
function fmtVal(st, v){
  if(st.measure==='formula'){ if(v==null) return '—'; var md=FMODE!=null?FMODE:(parseSafe(formulas(st)[0])||{}).mode; return md==='%'?num(v,1)+T('٪','%'):md==='$'?compact(v)+curTxt():num(v, Math.abs(v)<10?2:0); }
  if(lastRes&&lastRes.pctHist&&st===A) return num(v,1)+T('٪','%');
  if(st.measure==='active') return num(v,1)+T('٪','%');
  if(st.measure==='avg') return num(v,2);
  if(st.measure==='arpau') return v==null||!isFinite(v)?'—':compact(v)+curTxt();   /* PM 2026-10-28, CR-5 + TD-9 */
  if(st.measure==='prop' && st.pagg!=='dist'){ var u=NUMP[st.prop]||{}; return (u.dec?num(v,u.dec):compact(v))+' '+T(u.fa||'',u.en||''); }
  return num(v);
}
/* keep the legacy fields in sync so every older surface still reads something sensible */
function syncLegacy(){
  var t=RB.Q.trend;
  if(A.events.length) t.events=A.events.map(function(e){ return e.id; }); /* empty builder: older surfaces keep their last events */
  t.breakdown=A.events[0]?gbs(A.events[0])[0]||'':''; t.breakdown2='';
  t.count=A.measure==='uniques'?'uniques':'events';
  t.gran=A.interval;
  t.compare=A.compare.length>0; t.compareMode=A.compare[0]==='year'?'lastyear':'prev';
  var fq=RB.Q.funnel, F=A.funnel;
  if(A.events.length>1) fq.steps=A.events.map(function(e){ return e.id; });
  fq.count=F.count==='totals'?'events':'uniques'; fq.exclude=F.excl.length?F.excl[0].ev:'';
  fq.win=F.win.u==='hour'||F.win.u==='min'||F.win.u==='sec'?'1d':winDays(F.win)<=1?'1d':winDays(F.win)<=7?'7d':'30d';
  var jq=RB.Q.flows; if(jq&&A.events[0]&&RB.evById(A.events[0].id)){ jq.anchor=A.events[0].id; jq.dir=A.journey.type==='end'?'before':'after'; jq.depth=Math.min(3,A.journey.steps||3); }
  var rq=RB.Q.ret;
  if(rq){ if(A.events[0]&&RB.evById(A.events[0].id)) rq.birth=A.events[0].id; if(A.events[1]&&RB.evById(A.events[1].id)) rq.ret=A.events[1].id; rq.gran=A.ret.iv==='day'?'day':'week'; rq.crit=A.ret.method==='on'?'on':'oa'; }
}
/* segments */
/* sub-segment values that can exist inside a segment: a segment filtered to Mobile has no Desktop rows.
   Shares are renormalised within the allowed values, because segFactor already applied the filter. */
function segValues(sg, prop){
  var P=RB.PROPS[prop], ok=P.vals.filter(function(v){
    if(!(v[2]>0)) return false;   /* a value nobody has (a computed property's empty bucket) is never its own row */
    if(prop==='is_new_user' && sg.who==='new' && v[1]!=='New') return false;
    return (sg.filters||[]).every(function(f){ if(f.prop!==prop) return true; var hit=(f.vals||[]).indexOf(v[1])>-1; return f.op==='not_in'?!hit:hit; }); });
  var tot=ok.reduce(function(a,v){ return a+v[2]; },0)||1;
  return ok.map(function(v){ return [v[0],v[1],v[2]/tot]; });
}
function isDefaultSeg(sg){ return !sg || ((sg.who||'any')==='any' && !(sg.filters||[]).length && !sg.performed && !sg.cohort); }
function cohortById(id){ return RBShell.cohorts().filter(function(c){ return c.id===id; })[0]||null; }
var POPS={ gte:['دست‌کم','at least'], eq:['دقیقاً','exactly'], lte:['حداکثر','at most'] };
function perfLabel(p){ var o=POPS[p.op||'gte'], when=p.mode==='each'?T('در هر بازهٔ نمودار','in each interval'):p.mode==='range'?T('در بازهٔ گزارش','during the report’s range'):T('در '+num(p.days)+' روز اخیر','in the last '+p.days+' days');
  var ex=(p.where||[]).map(function(f){ return ' · '+fltLabel(f); }).join('')+(p.and&&p.and.ev?T(' · و انجام «'+evName(p.and.ev)+'» '+POPS[p.and.op||'gte'][0]+' '+num(p.and.n)+' بار',' · and did “'+evName(p.and.ev)+'” '+POPS[p.and.op||'gte'][1]+' '+p.and.n+' times'):'')+
    (p.rolling?T(' · پنجرهٔ متحرک '+num(p.rolling)+' روز',' · rolling over '+p.rolling+' days'):'')+(p.offset?T(' · با '+num(p.offset)+' روز تأخیر',' · offset '+p.offset+' days'):'');
  return T('انجام «'+evName(p.ev)+'» '+o[0]+' '+num(p.n)+' بار '+when,'Did “'+evName(p.ev)+'” '+o[1]+' '+p.n+' times '+when)+ex; }
function segLabel(sg){
  if(sg.label) return sg.label;
  var parts=[T(WHO[sg.who][0],WHO[sg.who][1])];
  (sg.filters||[]).forEach(function(f){ parts.push(fltValues(f)); });
  if(sg.performed) parts.push(T('انجام‌دهندگان «'+evName(sg.performed.ev)+'»','“'+evName(sg.performed.ev)+'” doers'));
  if(sg.cohort){ var c=cohortById(sg.cohort); if(c) parts.push(T(c.fa,c.en)); }
  return parts.join(' · ');
}
function segProps(){ return Object.keys(RB.PROPS).filter(function(p){ return SEG_GRPS.indexOf(RB.PROPS[p].grp)>-1; }); }
/* share of the event's users who fall in the segment, plus a per-person intensity tilt (so averages differ by segment) */
function segFactor(sg, e, pu0){
  if(isDefaultSeg(sg)) return null;
  var share=(WHO[sg.who][2]||1)*(sg.who==='active'?actShare():1), tilt=1,   /* PM 2026-10-25, RB-20: inactive events leave the «کاربران فعال» base */ seed=String(RB.hstr(JSON.stringify([sg.who,sg.filters,sg.performed,sg.cohort])));
  /* who = new and an is_new_user filter describe the same property: intersect them, never multiply */
  var allowed={ Returning:sg.who!=='new', New:true };
  (sg.filters||[]).forEach(function(f){
    if(f.prop==='is_new_user'){ ['Returning','New'].forEach(function(v){ var hit=(f.vals||[]).indexOf(v)>-1; if(f.op==='not_in'?hit:!hit) allowed[v]=false; }); }
    else share*=RB.oneFilterFactor(f);
  });
  var nu=RB.PROPS.is_new_user.vals, newShare=0;
  nu.forEach(function(v){ if(allowed[v[1]]) newShare+=v[2]; });
  share*=Math.max(0.004,newShare);
  if(sg.who==='new'||(allowed.New&&!allowed.Returning)) tilt*=0.8;
  if(sg.performed){ var p=sg.performed, R0=RB.rangeInfo(), each=p.mode==='each', pd=each?({ hour:1/24, day:1, week:7, month:30.44, quarter:91 })[R0.unit]||1:p.mode==='range'?R0.days:p.days;
    if(p.rolling) pd=p.rolling;
    var preach=function(ev, n, op){ var r=(0.12+0.5*jitter(ev,7))/(1+0.45*(Math.max(1,n)-1))*Math.min(1.2,Math.pow(pd/30,0.35)); if(op==='eq') r*=0.45; else if(op==='lte') r=Math.min(0.95, 1-r*0.6); return r; };
    var reach=preach(p.ev, p.n, p.op);
    (p.where||[]).forEach(function(f){ reach*=RB.oneFilterFactor(f); });
    if(p.and&&p.and.ev) reach*=Math.pow(preach(p.and.ev, p.and.n, p.and.op),0.6);   /* "and who performed": both behaviours */
    if(p.offset) reach*=0.88+0.1*jitter(p.ev+'off',p.offset);
    share*=Math.min(0.92,Math.max(0.02,reach)); tilt*=1.15+0.08*Math.min(5,p.n); }
  if(sg.cohort){ var c=cohortById(sg.cohort);
    /* never more segment users than the cohort itself has */
    if(c) share*=Math.min(0.9,(c.n||0)/Math.max(1,pu0)*(0.35+0.4*jitter(c.id+e.id,3))); tilt*=1.12; }
  tilt*=0.94+0.12*jitter(seed+e.id,5);
  return { share:Math.max(0,share), tilt:tilt, seed:seed, each:!!(sg.performed&&sg.performed.mode==='each') };
}
/* ── compare to previous: ONE source for the table, chart, tooltip and KPI cards ── */
function ratioMeasure(st){ return st.measure==='active'||st.measure==='avg'||st.measure==='arpau'||(st.measure==='prop'&&st.pagg!=='sum'); }   /* PM 2026-10-28, CR-5: ARPAU is a ratio */
function past(st, s, mode){
  var rm=s.rmode||'', ratio=ratioMeasure(st);
  var lvl=mode==='year'?0.72+0.14*jitter(s.key+rm+'y',0):mode==='quarter'?0.8+0.15*jitter(s.key+rm+'q',0):mode==='month'?0.84+0.18*jitter(s.key+rm+'m',0):0.86+0.26*jitter(s.key+rm+mode,0);
  var v=s.values.map(function(x,i){ var j=jitter(s.key+rm+mode,i+11); if(x==null) return null;   /* PM 2026-10-28, CR-5: an ARPAU with no amount stays «—» */
    return ratio?+(x*(0.93+0.1*j+(lvl-0.9)*0.3)).toFixed(2):Math.round(x*lvl*(0.9+0.2*j)); });
  var tot=s.total==null?null:st.measure==='uniques'?RB.periodUniques(v):(additive(st)?RB.sum(v):+(s.total*(0.93+(lvl-0.9)*0.3+0.05*jitter(s.key+rm+mode,1))).toFixed(2));
  return { values:v, total:tot };
}
function change(cur, prev, mode){
  if(!prev) return null;
  return mode==='pct'?(cur-prev)/prev*100:cur-prev;
}
function fmtChange(st, d, mode){
  if(d==null) return '—';
  var sg=d>0?'+':d<0?'−':'';
  /* dir=ltr keeps the sign in front of the number inside RTL text */
  var w=function(x){ return '<span dir="ltr">'+x+'</span>'; };
  if(mode==='pct') return w(sg+num(Math.abs(d),1)+T('٪','%'));
  if(st.measure==='active') return w(sg+num(Math.abs(d),1))+T(' واحد درصد',' pts');
  return w(sg+fmtVal(st,Math.abs(d)));
}
function canDrawCompare(st){ return !isHist(st) && (st.viz==='line'||st.viz==='column'||st.viz==='bar'); }

/* ── computation (shared by the builder and by board tiles) ── */
function within(ctx, fn){
  var Q=RB.Q, s={ type:Q.type, range:Q.range, filters:Q.filters, logic:Q.filterLogic, gran:Q.trend.gran };
  try{ Q.type='trend'; Q.range=ctx.range||Q.range; Q.filters=ctx.filters||[]; Q.filterLogic='and'; Q.trend.gran=ctx.gran||'auto'; return fn(); }
  finally{ Q.type=s.type; Q.range=s.range; Q.filters=s.filters; Q.filterLogic=s.logic; Q.trend.gran=s.gran; }
}
/* Amplitude's default events: computed from the project's own events, no new data */
var DEF_EV={
  _any_active:{ id:'_any_active', fa:'هر ایونت فعال', en:'Any active event', grp:'def', props:[], desc:['هر کاری که خود کاربر انجام داده؛ ایونت‌های سمت سیستم (مثل پینگ پخش) حساب نمی‌شوند.','Anything the user did themselves; system-side events (such as playback pings) are left out.'] },
  _any:{ id:'_any', fa:'هر ایونتی', en:'Any event', grp:'def', props:[], desc:['همهٔ ایونت‌ها، چه کار خود کاربر چه ایونت‌های سمت سیستم.','Every event, user-initiated or system-side.'] },
  _new_user:{ id:'_new_user', fa:'کاربر جدید', en:'New user', grp:'def', props:[], desc:['کسانی که اولین بازدیدشان در همان بازه ثبت شده؛ هر نفر یک بار.','People whose first visit falls in the interval; each person once.'] }
};
var SYSTEM_EV=['video_heartbeat','experiment_viewed'];   /* 8c: the seeded exposure event is sent by the site when it shows a variant, not by the reader */
function getEv(id){
  var d=DEF_EV[id]; if(d){ var pv=RB.evById('page_view')||{ w:1 }; d.w=id==='_new_user'?Math.round(pv.w*0.34):id==='_any'?Math.round(RB.EVENTS.reduce(function(a,x){ return a+x.w; },0)):Math.round(RB.EVENTS.filter(function(x){ return SYSTEM_EV.indexOf(x.id)<0 && !x.inactive; })   /* Block C: an inactive event leaves «هر ایونت فعال» */.reduce(function(a,x){ return a+x.w; },0)); return d; }
  return RB.evById(id);
}
/* PM 2026-10-25, RB-20: an inactive event leaves every active-user measure — «هر ایونت فعال», the «درصد کاربران فعال» denominator, ACTIVE()
   and the «کاربران فعال» segment base; the event itself stays in the picker. actShare() is the share of active people left once those events go. */
function evInactive(id){ var e=RB.evById(id); return !!(e&&e.inactive); }
function actShare(){ var all=0, off=0; RB.EVENTS.forEach(function(x){ if(x.late||SYSTEM_EV.indexOf(x.id)>-1) return; all+=x.w||0; if(x.inactive) off+=x.w||0; }); return all?Math.max(0.5, 1-0.5*off/all):1; }
function rawSeries(id, unique){
  var d=DEF_EV[id];
  if(!d){ var ev=RB.evById(id); return ev?RB.seriesR(ev, unique):[]; }
  var pv=RB.seriesR(RB.evById('page_view'), true);
  if(id==='_new_user') return pv.map(function(x){ return Math.round(x*0.34); });
  if(unique){ var ak=id==='_any'?1.1:1.06*actShare(); return pv.map(function(x){ return Math.round(x*ak); }); }   /* RB-20 */
  var evs=RB.EVENTS.filter(function(x){ return !x.late && (id==='_any'||(SYSTEM_EV.indexOf(x.id)<0&&!x.inactive)); }), acc=null;   /* RB-20: inactive events leave «هر ایونت فعال» */   /* phase 4a: late (Store) events stay out, so existing totals don't move */
  evs.forEach(function(x){ var v=RB.seriesR(x,false); acc=acc?acc.map(function(a,i){ return a+(v[i]||0); }):v.slice(); });
  return acc||[];
}
function baseSeries(e, unique){
  var Q=RB.Q, f=Q.filters; Q.filters=(f||[]).concat(e.filters||[]);
  try{
    var v=rawSeries(e.id, unique);
    /* inline OR (Amplitude "combine events inline"): totals add up; people who did several count once */
    (e.or||[]).forEach(function(id){ var w=rawSeries(id, unique);
      var rp=v.rep; v=v.map(function(a,i){ var b=w[i]||0; return unique?Math.round(Math.max(a,b)+0.55*Math.min(a,b)):a+b; }); if(rp!=null&&w.rep!=null) v.rep=Math.max(rp,w.rep); });
    return v;
  } finally{ Q.filters=f; }
}
function jitter(seed, i){ return RB.jit(RB.hstr(String(seed))+i); }
function split(arr, share, seed){ var o=arr.map(function(x,i){ return Math.round(x*share*(0.86+0.28*jitter(seed,i))); }); if(arr.rep!=null) o.rep=arr.rep; return o; }   /* keeps the event's repeat strength (periodUniques) */
/* seg: { def:segment, gval:[fa,en,share] sub-segment value, gkey } — the default segment is an exact no-op (step 1 numbers unchanged) */
function measure(st, e, part, seg){
  var uni=baseSeries(e,true), tot=baseSeries(e,false), sf=null;
  if(seg){
    sf=segFactor(seg.def, e, RB.periodUniques(uni));
    /* a sub-segment that is the whole segment (the only value its filter allows) must equal the segment's Overall row */
    if(seg.gval && seg.gval[2]<0.999){ sf=sf?Object.assign({},sf):{ share:1, tilt:1, seed:'' }; sf.share*=seg.gval[2]; sf.seed+='|'+seg.gkey; }
    if(sf){ uni=split(uni,sf.share,sf.seed+'u'); tot=split(tot,sf.share*sf.tilt,sf.seed+'t');
      if(sf.each){ uni=uni.map(function(x,i){ return Math.round(x*(0.7+0.6*jitter(sf.seed+'each',i))); }); tot=tot.map(function(x,i){ return Math.round(x*(0.7+0.6*jitter(sf.seed+'each',i))); }); } }
  }
  if(part){ uni=split(uni,part.share,part.seed+'u'); tot=split(tot,part.share,part.seed+'t'); }
  var pu=RB.periodUniques(uni), pt=RB.sum(tot), seed=e.id+(part?part.seed:'')+(sf?sf.seed:'');
  switch(st.measure){
    case 'totals': return { v:tot, total:pt };
    case 'active': {
      /* denominator = active users (anyone who did any active event), never smaller than the broadest event;
         for a segment or breakdown row, that row's own active users, not everyone's */
      var ss=baseSeries({ id:'session_start', filters:e.filters }, true), pv=baseSeries({ id:'page_view', filters:e.filters }, true);
      var ssOn=!evInactive('session_start'), pvOn=!evInactive('page_view'), ak=1.04*actShare();   /* PM 2026-10-25, RB-20: inactive events leave the denominator (and ACTIVE()) */
      var act=ss.map(function(x,i){ return Math.round(Math.max(ssOn?x:0, pvOn?(pv[i]||0):0)*ak); });
      if(sf) act=split(act,Math.min(1,sf.share/sf.tilt),sf.seed+'a');
      if(part) act=split(act,part.share,part.seed+'a');
      var pa=RB.periodUniques(act);
      return { v:uni.map(function(u,i){ return act[i]?Math.min(100,+(u/act[i]*100).toFixed(1)):0; }), total:pa?Math.min(100,+(pu/pa*100).toFixed(1)):0 }; }
    case 'avg': return { v:tot.map(function(t,i){ return uni[i]?+(t/uni[i]).toFixed(2):0; }), total:pu?+(pt/pu).toFixed(2):0 };
    case 'freq': {
      var avg=pu?Math.max(1.05,pt/pu):1.05, p=1/avg, out=FREQB.map(function(b){ var s=0; for(var k=b[2];k<=Math.min(b[3],400);k++) s+=p*Math.pow(1-p,k-1); return Math.round(pu*s); });
      return { v:out, total:pu, hist:true }; }
    case 'prop': {
      var NP=NUMP[st.prop]||{ mean:1 }, P=RB.PROPS[st.prop], nt=numTilt(e, st.prop); if(nt!==1) NP=Object.assign({}, NP, { mean:NP.mean*nt });
      if(st.pagg==='dist'){ return { v:(P?P.vals:[]).map(function(x,k){ return Math.round(pt*x[2]*(0.9+0.2*jitter(seed+'d',k))); }), total:pt, hist:true }; }
      /* phase 4a-2: distinct values seen (Amplitude "Distinct values"): a catalog of P.card values, each event draws one, so the
         count saturates toward the catalog as events grow — a week's plays see most of the catalog, an hour sees few */
      if(st.pagg==='distinct'){ var card=(P&&P.card)||(P?P.vals.length:1), dv=function(n){ return Math.round(card*(1-Math.exp(-n/(card*6)))); };
        return { v:tot.map(dv), total:dv(pt) }; }
      var avgv=tot.map(function(t,i){ return t?NP.mean*(0.86+0.28*jitter(seed+'m'+RB.rangeInfo().mode,i)):0; });   /* phase 4a: per range, so today's amount doesn't move exactly with yesterday's orders */
      if(st.pagg==='sum'){ var sv=tot.map(function(t,i){ return Math.round(t*avgv[i]); }); return { v:sv, total:sv.reduce(function(x,y){ return x+y; },0) }; }   /* phase 4a: the total is the sum of its buckets (a daily chart and its total agree) */
      var f=st.pagg==='median'?0.78:1;
      var vals=avgv.map(function(x){ return +(x*f).toFixed(NP.dec||0); });
      return { v:vals, total:+(NP.mean*f).toFixed(NP.dec||0) }; }
    case 'arpau': {   /* PM 2026-10-28, CR-5: order amount ÷ active users, per interval and for the whole range; no amount → «—» */
      var ge=getEv(e.id), ap=NUMP[st.prop]&&NUMP[st.prop].cur?st.prop:'order_value';   /* PM 2026-10-30, LX-24: a revenue metric's own currency property (order value by default) */
      if(!(ge&&(ge.props||[]).indexOf(ap)>-1)) return { v:uni.map(function(){ return null; }), total:null, noAmt:true };
      var rv=measure(Object.assign({}, st, { measure:'prop', pagg:'sum', prop:ap }), e, part, seg),
        au=measure(Object.assign({}, st, { measure:'uniques' }), { id:'_any_active', filters:[], groupBy:'' }, part, seg);
      return { v:rv.v.map(function(x,i){ var y=au.v[i]; return y?Math.round(x/y):null; }), total:au.total?Math.round(rv.total/au.total):null }; }
    default: return { v:uni, total:pu };
  }
}
function compute(st, ctx){
  return within(ctx, function(){
    var R=RB.rangeInfo(), lab=RB.axisLabels(), out={ R:R, labels:lab, hist:isHist(st), series:[], overall:[] };
    if(out.hist){
      if(st.measure==='freq') out.buckets=FREQB.map(function(b){ return T(b[0],b[1]); });
      else { var P=RB.PROPS[st.prop]; out.buckets=P?P.vals.map(function(v){ return T(v[0],v[1]); }):[]; }
    }
    var segs=norm(st).segments, named=segs.length>1||!isDefaultSeg(segs[0]), G=st.groupSeg?RB.PROPS[st.groupSeg]:null;
    out.groups=[];
    if(st.measure==='formula'){ out.formula=true; out.errors=formulaErrors(st);
      if(!out.errors.length) formulas(st).forEach(function(f,fi){ var pr=parseFormula(f), fixed=/[A-Ja-j][1-9]\s*\)/.test(f);   /* a formula that names its segments is one row, not one per segment */
        (fixed?segs.slice(0,1):segs).forEach(function(sg,si){ var gid='F'+(fi+1)+(si?si+1:''), r=evalFormula(st, pr, sg), sn=named&&!fixed?segLabel(sg):'';
          var row={ key:gid, gid:gid, letter:'F'+(fi+1), seg:si, segName:sn, name:f, group:'', values:r.v, total:r.total, rmode:R.mode, fmode:pr.mode };
          out.overall.push(Object.assign({}, row, { key:gid+'*', overall:true })); out.series.push(row); out.groups.push(gid); }); });
      return out; }
    st.events.forEach(function(e,k){
      var ev=getEv(e.id); if(!ev) return;
      var name=e.label||T(ev.fa,ev.en)+(e.or||[]).map(function(id){ return T(' یا ',' or ')+evName(id); }).join(''), PV=gbVals(e), P=PV?true:null, gbKey=gbs(e).join('+');
      segs.forEach(function(sg,si){
        /* gid = one (event, segment) pair; every key carries it so table rows never mix segments */
        var gid=LET[k]+(si?si+1:''), sname=named?segLabel(sg):'', whole=measure(st,e,null,{ def:sg }), rows=[];
        out.overall.push({ key:gid+'*', gid:gid, letter:LET[k], seg:si, segName:sname, name:name, group:'', values:whole.v, total:whole.total, overall:true, rmode:R.mode });
        /* a segment whose filter leaves one value of the breakdown property has nothing to split: show it as one row */
        var gvals=G?segValues(sg,st.groupSeg):[null], pvals=PV||[null];
        if(gvals.length<2) gvals=[null];
        if(!gvals[0] && !P) rows.push({ key:gid, gid:gid, letter:LET[k], seg:si, segName:sname, name:name, group:'', values:whole.v, total:whole.total, rmode:R.mode });
        else gvals.forEach(function(gv){ pvals.forEach(function(pv){
          var ctx={ def:sg, gval:gv, gkey:gv?st.groupSeg+gv[1]:'' }, m=pv&&pv.parts&&pv.parts.length&&(additive(st)||st.measure==='uniques')?sumParts(st,e,pv,ctx):measure(st,e,pv?{ share:pv[2], seed:e.id+gbKey+seedKey(gbKey,pv[1]) }:null,ctx);
          var grp=[gv?dacLabel([st.groupSeg], T(gv[0],gv[1]), gv[1]):'', pv?dacLabel(gbs(e), T(pv[0],pv[1]), pv[1]):''].filter(Boolean).join(' · ');
          rows.push({ key:gid+':'+(gv?gv[1]:'')+(gv&&pv?'|':'')+(pv?pv[1]:''), gid:gid, letter:LET[k], seg:si, segName:sname, name:name, group:grp, values:m.v, total:m.total, rmode:R.mode }); }); });
        /* phase 4a (/chart-review sample consistency): for additive measures the breakdown rows add up to the event's own row,
           bucket by bucket (largest remainder), instead of each value carrying its own independent jitter */
        if(additive(st) && rows.length>1 && !multiGb(e)) normRows(rows, whole.v);
        /* cap per (event, segment), so a second segment's rows never vanish behind the first */
        /* phase 4a-2b: a dashboard table can ask for more rows than the chart's 12 (st.rows, at most 25) — its own top titles plus «Other» */
        var cap=Math.min(25, st.rows||MAX_ROWS);
        if(rows.length>cap) rows=rows.sort(function(a,b){ return b.total-a.total; }).slice(0,cap);
        out.series=out.series.concat(rows); out.groups.push(gid);
      });
    });
    /* "before cohort filter": aggregate the whole event first, then apply the segment; "after" (default): filter, then aggregate */
    var cf=(st.adv||{}).cf==='before' && /rolling|window/.test((st.adv||{}).fn||'');
    if(!out.hist) out.overall.concat(out.series).forEach(function(x){ var sg=segs[x.seg], e=st.events[LET.indexOf(x.letter)];
      if(cf && sg && !isDefaultSeg(sg) && e && !x.fmode){ var W=measure(st, e, null, null).v, rW=advanced(st, W), sw=W.reduce(function(a,b){ return a+b; },0)||1, sx=x.values.reduce(function(a,b){ return a+b; },0);
        x.values=rW.map(function(v){ return +(v*sx/sw).toFixed(2); }); }
      else x.values=advanced(st, x.values); });
    return out;
  });
}

/* Measured as ▸ Advanced: rolling average over N intervals, or cumulative (users: deduplicated, never a running sum) */
function advanced(st, v){
  var a=st.adv||{}; if(!a.fn||a.fn==='none') return v;
  if(a.fn==='rolling'){ var n=Math.max(2,a.n||7); return v.map(function(x,i){ var w=v.slice(Math.max(0,i-n+1),i+1); return +(w.reduce(function(p,q){ return p+q; },0)/w.length).toFixed(2); }); }
  if(a.fn==='window'){ var nw=Math.max(2,a.n||7); return v.map(function(x,i){ var w=v.slice(Math.max(0,i-nw+1),i+1); return st.measure==='uniques'?RB.periodUniques(w):w.reduce(function(p,q){ return p+q; },0); }); }
  if(a.fn==='cumulative'){
    if(st.measure==='uniques') return v.map(function(x,i){ return RB.periodUniques(v.slice(0,i+1)); });
    var acc=0; return v.map(function(x){ acc+=x; return acc; });
  }
  return v;
}
function advLabel(st){ var a=st.adv||{}, b=advLabel0(st); return b&&a.cf==='before'&&/rolling|window/.test(a.fn||'')?b+T(' · پیش از فیلتر کوهورت',' · before cohort filter'):b; }
function advLabel0(st){ var a=st.adv||{}; return a.fn==='window'?T('پنجرهٔ متحرک '+num(a.n)+' بازه','Rolling window, '+a.n+' intervals'):a.fn==='rolling'?T('میانگین متحرک '+num(a.n)+' بازه','Rolling average, '+a.n+' intervals'):a.fn==='cumulative'?T('تجمعی','Cumulative'):''; }
/* ── tile for boards and space grids: the first event's Overall row, same function as the builder ── */
function spark(vals){
  if(!vals||vals.length<2) return '';
  var w=300,h=64,mx=Math.max.apply(null,vals)||1,mn=Math.min(0,Math.min.apply(null,vals)),rg=(mx-mn)||1,st=w/(vals.length-1);
  var pts=vals.map(function(v,k){ return (k*st).toFixed(1)+','+(h-4-((v-mn)/rg)*(h-12)).toFixed(1); });
  return '<svg class="rbx-spark" viewBox="0 0 '+w+' '+h+'" height="'+h+'" preserveAspectRatio="none" style="direction:ltr"><polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--sh-c1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function tile(q, ovr){
  var st=q&&q.amp?q.amp:fromLegacy(q);
  var r=compute(st, { range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]), gran:(ovr&&ovr.interval)||st.interval });   /* Block C: the dashboard's interval wins over the card's */
  var o=r.overall[0]; if(!o) return null;
  return { val:fmtVal(st,o.total), num:o.total, sub:measLabel(st)+' · '+T(r.R.fa,r.R.en), viz:r.hist?'':spark(o.values),
    rows:r.hist?r.buckets.map(function(b,k){ return [b, num(o.values[k])]; }):o.values.slice(-5).map(function(v,k){ var L=r.labels; return [T(L.fa[L.fa.length-5+k],L.en[L.en.length-5+k]), fmtVal(st,v)]; }), range:r.R,
    vals:r.hist?null:o.values.slice(), labs:r.hist?null:r.labels };   /* 11b-2: the dashboard insight card compares periods from the tile's own series */
}

/* ── view ── */
var root=null, tabs=null, chart=null, lastRes=null;
function palette(){
  var cs=getComputedStyle(document.body), base=themeColors(themeById((A.ui||{}).theme||'shahin'));
  return base.concat(base.map(function(c){ return tint(c, cs.getPropertyValue('--sh-surface').trim()); }));
}
function alpha(c, a){
  var m=/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((c||'').trim()), h;
  if(m){ h=m[1].length===3?m[1].replace(/./g,function(x){ return x+x; }):m[1]; return 'rgba('+[0,2,4].map(function(i){ return parseInt(h.slice(i,i+2),16); }).join(',')+','+a+')'; }
  var r=/rgba?\(([^)]+)\)/.exec(c||''); if(r){ var p=r[1].split(',').slice(0,3).join(','); return 'rgba('+p+','+a+')'; }
  return c;
}
function tint(c, bg){
  function rgb(h){ h=(h||'#888').replace('#',''); if(h.length===3) h=h.replace(/./g,function(x){ return x+x; }); return [0,2,4].map(function(i){ return parseInt(h.slice(i,i+2),16)||0; }); }
  var a=rgb(c), b=rgb(bg); return 'rgb('+a.map(function(x,i){ return Math.round(x*0.55+b[i]*0.45); }).join(',')+')';
}
function compactHead(){
  var b=$('rbBuilder'), head=b&&b.querySelector('.rb-head'), bar=$('rbxRhead'), save=$('rbSaveBtn'), dirty=$('rbDirty');
  if(!head||!bar||bar.parentNode===head) return;
  head.insertBefore(bar, dirty||save);           /* title · space · … · actions · [dirty] · Save */
  if(dirty) head.insertBefore(dirty, save);
  var old=$('rbzDraft'); if(old) old.remove();
  var shb=$('rbxShare'); if(shb&&!$('rbzAnalyze')){ var an=document.createElement('button'); an.className='rbx-icbtn'; an.id='rbzAnalyze'; an.type='button'; an.innerHTML=ic('sparkle')+T('تحلیل','Analyze');
    an.addEventListener('click', function(){ SET_OPEN=SET_OPEN==='ai'?null:'ai'; render(); }); shb.parentNode.insertBefore(an, shb); }
  var sa=$('rbxSaveAs'), tw=$('rbTitleWrap');
  if(sa&&sa.disabled&&tw){ var d=document.createElement('span'); d.id='rbzDraft'; d.className='rbz-draft'; d.textContent=T('پیش‌نویس','Draft'); tw.parentNode.insertBefore(d, tw.nextSibling); }
}
function mount(){
  var b=$('rbBuilder'), head=b&&b.querySelector('.rb-head'); if(!head) return;
  filterNode=b.querySelector('[data-shahin-filter]');
  document.addEventListener('keydown', function(e){ if(e.shiftKey&&(e.key==='R'||e.key==='r')&&root&&!root.hidden&&!/input|textarea|select/i.test((e.target||{}).tagName||'')){ e.preventDefault(); refreshData(); } });
  new MutationObserver(compactHead).observe(b, { childList:true });
  compactHead();
  tabs=document.createElement('div'); tabs.className='rbz-tabs'; tabs.id='rbzTabs'; tabs.setAttribute('role','tablist');
  head.parentNode.insertBefore(tabs, head.nextSibling);
  root=document.createElement('div'); root.className='rbz'; root.id='rbz';
  tabs.parentNode.insertBefore(root, tabs.nextSibling);
  var orig=RB.setType;
  RB.setType=function(t){ if(/^(compass|personas)$/.test(t)) t='trend';   /* PM 2026-10-28, AC-11 */ orig(t); if(window.RBH&&RBH.typeIntro) RBH.typeIntro(t); sync(); };
  /* the unified filter bar (range, filters drawer) re-renders through RB.renderActive */
  var origR=RB.renderActive;
  RB.renderActive=function(){ origR(); if(ours()) render(); };
}
/* the panes this builder owns: every report type (flows moved over in phase 2 step 5) */
function ours(){ return RB.Q.type==='trend'||RB.Q.type==='funnel'||RB.Q.type==='retention'||RB.Q.type==='flows'||RB.Q.type==='table'||RB.Q.type==='mex'||isS8(); }
function sync(){
  if(/^(compass|personas)$/.test(RB.Q.type)){ RB.setType('trend'); return; }   /* PM 2026-10-28, AC-11: removed chart types open Trend */
  if(!root) return;
  var on=ours(), grid=$('rbBuilder').querySelector('.rb-grid');
  root.hidden=!on; if(grid) grid.classList.toggle('rbz-hide', on);
  if(!on) restoreFilter();
  renderTabs();
  if(on) render();
}
/* Amplitude's "10 more" chart types, listed for parity; each gets built in a later phase-2 step */
var MORE_TYPES=[['نشست‌ها','Sessions','clock-counter-clockwise'],['نتایج آزمایش','Experiment results','seal-check'],['ترکیب کاربران','User composition','users-three'],['ماتریس تعامل','Engagement matrix','squares-four'],
  /* PM 2026-10-28, AC-11: Personas and Compass leave the demo and the plan (kept as a backlog item) */
  ['چسبندگی','Stickiness','push-pin'],['چرخهٔ عمر','Lifecycle','arrows-clockwise'],['ارزش طول عمر درآمد','Revenue LTV','tag'],['تحلیل اثر','Impact analysis','arrows-left-right'],{ sep:1 },['قالب‌های نمودار','Chart templates','copy']];
var MORE_N=MORE_TYPES.filter(function(x){ return !x.sep; }).length-1;   /* "N more": chart templates are not a chart type */
function renderTabs(){
  var types=[['trend','روند','Trend','chart-line'],
    ['funnel','قیف','Funnel','funnel'],['table','جدول متریک‌ها','Data table','list-bullets'],['retention','ریتنشن','Retention','arrows-clockwise'],['flows','مسیرها','Flows','share-network']];
  tabs.innerHTML=types.map(function(t){ var on=RB.Q.type===t[0];
    return '<button class="rbz-tab'+(on?' on':'')+'" role="tab" aria-selected="'+on+'" data-rbztype="'+t[0]+'" type="button">'+ic(t[3])+T(t[1],t[2])+'</button>'; }).join('')+
    '<button class="rbz-tab'+(isMex()?' on':'')+'" role="tab" aria-selected="'+isMex()+'" data-rbztype="mex" type="button">'+ic('chart-line')+T('کاوشگر متریک','Metric explorer')+'<span class="rbz-soon new">'+T('جدید','New')+'</span></button>'+
    (isS8()?'<button class="rbz-tab on" role="tab" aria-selected="true" type="button">'+ic(S8_TYPES[RB.Q.type][2])+T(S8_TYPES[RB.Q.type][0],S8_TYPES[RB.Q.type][1])+(S8_LEGACY[RB.Q.type]?'<span class="rbz-soon">'+T('قدیمی','Legacy')+'</span>':'')+'</button>':'')+
    '<button class="rbz-tab" id="rbzMore" type="button">'+T(num(MORE_N)+' نوع دیگر',MORE_N+' more')+' ⌄</button>';
  var mo=$('rbzMore'); if(mo) mo.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(mo, MORE_TYPES.map(function(x){ if(x.sep) return { sep:1 };
      if(x[1]==='Sessions') return { icon:x[2], fa:x[0], en:x[1], hint:['در کاوشگر متریک باز می‌شود','Opens in Metric Explorer'], fn:function(){ mxOpenWith({ kind:'sess', sm:'session_totals' }); } };
      /* PM 2026-10-25, AC-10: Revenue LTV is built for projects that send an order amount; others keep it disabled with the data reason (no «نیازمند توسعه» since LX-6, 2026-10-28) */
      if(x[1]==='Revenue LTV'&&!ltvOk()) return { icon:x[2], fa:x[0], en:x[1], disabled:true, hint:RLTV_NO };
      if(x[1]==='Revenue LTV') return { icon:x[2], fa:x[0]+(RB.Q.type==='rltv'?' ✓':''), en:x[1]+(RB.Q.type==='rltv'?' ✓':''), fn:function(){ switchType('rltv'); } };
      var s8k=Object.keys(S8_TYPES).filter(function(k){ return S8_TYPES[k][1].toLowerCase()===x[1].toLowerCase(); })[0];
      if(s8k) return { icon:x[2], fa:x[0]+(S8_LEGACY[s8k]?' (قدیمی)':'')+(RB.Q.type===s8k?' ✓':''), en:x[1]+(S8_LEGACY[s8k]?' (legacy)':'')+(RB.Q.type===s8k?' ✓':''), hint:S8_LEGACY[s8k]?['این نمودار از نسل قدیمی‌تر نمودارهاست','This is a legacy chart type']:null, fn:function(){ switchType(s8k); } };
      if(x[1]==='Chart templates') return { icon:x[2], fa:x[0], en:x[1], hint:['تعریف نمودار را از یک قالب پر می‌کند','Prefills a chart from a template'], fn:tplModal };
      return { icon:x[2], fa:x[0], en:x[1], disabled:true, hint:['به‌زودی','Soon'] }; }), 'start'); });
  tabs.querySelectorAll('[data-rbztype]').forEach(function(x){ x.addEventListener('click', function(){ var t=x.getAttribute('data-rbztype'); if(t===RB.Q.type) return; switchType(t); }); });
}
/* switching chart type keeps the events and segments, as Amplitude offers; a bar right after the switch lets you drop either (non-blocking) */
var SWITCH=null;
function switchType(t){
  var from=RB.Q.type, info={ from:from, to:t, ev:false, seg:!isDefaultSeg(A.segments[0])||A.segments.length>1, dropped:[] };
  if(t==='mex'&&!A.mex.metrics.length&&A.events.length){ A.mex.metrics=A.events.slice(0,MX_MAX).map(function(e){ return { kind:'ev', ev:e.id, meas:MX_MEAS[A.measure]&&A.measure!=='prop'&&A.measure!=='freq'?A.measure:'uniques', filters:clone(e.filters||[]), adv:{ fn:'none', n:7 } }; }); info.ev=true; }
  else if(from==='mex'&&t!=='table'&&A.mex.metrics.length&&!A.events.length){ A.mex.metrics.forEach(function(m){ if(m.kind==='ev') A.events.push({ id:m.ev, filters:clone(m.filters||[]), groupBy:m.gb||'' }); else info.dropped.push(mxName(m)); }); info.ev=A.events.length>0; A.sel=null; }
  else if(t!=='mex'&&t!=='table'&&from!=='mex'&&from!=='table'&&A.events.length) info.ev=true;
  SWITCH=(info.ev||info.seg||info.dropped.length)?info:null;
  RB.setType(t); changed(false); showSwitchBar(); }
function showSwitchBar(){
  if(!SWITCH||!root) return; var sw=SWITCH, old=$('rbzSwitch'); if(old) old.remove();
  var b=document.createElement('div'); b.id='rbzSwitch'; b.className='rbz-switchbar'; b.setAttribute('role','status');
  b.innerHTML=ic('swap')+'<span>'+T('نوع نمودار عوض شد.','Chart type changed.')+'</span>'+
    (sw.ev?'<span class="rbz-tag ok">'+T('ایونت‌ها نگه داشته شد','Events kept')+'</span><button class="rb-linkbtn" data-swdrop="ev" type="button">'+T('برداشتن','Drop')+'</button>':'')+
    (sw.seg?'<span class="rbz-tag ok">'+T('گروه‌ها نگه داشته شد','Segments kept')+'</span><button class="rb-linkbtn" data-swdrop="seg" type="button">'+T('برداشتن','Drop')+'</button>':'')+
    (sw.dropped.length?'<span class="rbz-tag">'+T('در این نوع نمودار نیست: ','Not in this chart type: ')+esc(sw.dropped.join(T('، ',', ')))+'</span>':'')+
    '<button class="rbz-x" data-swclose="1" type="button" aria-label="'+T('بستن','Close')+'">×</button>';
  root.insertBefore(b, root.firstChild);
  b.querySelectorAll('[data-swdrop]').forEach(function(x){ x.addEventListener('click', function(){ var k=x.getAttribute('data-swdrop');
    if(k==='ev'){ if(isMex()) A.mex.metrics=[]; else A.events=[]; A.sel=null; A.mex.sel=null; sw.ev=false; } else { A.segments=[blankSeg()]; A.groupSeg=''; sw.seg=false; }
    changed(); if(sw.ev||sw.seg||sw.dropped.length) showSwitchBar(); else SWITCH=null; }); });
  b.querySelector('[data-swclose]').addEventListener('click', function(){ SWITCH=null; b.remove(); }); }
/* entry points: a Data Table column, a library metric or the «نشست‌ها» chart type open the Metric Explorer with that metric */
function mxOpenWith(m){ A.mex=blankMex(); A.mex.metrics=[Object.assign({ filters:[], adv:{ fn:'none', n:7 } }, m)]; A.viz='line'; SWITCH=null; RB.setType('mex'); changed(); }
function mxFromCol(c){ if(c.kind==='hybrid') return { kind:'hybrid', inputs:clone(c.inputs), sin:clone(c.sin||[]), expr:c.expr };
  if(c.kind==='metric'&&MX_SESS[c.metric]) return { kind:'sess', sm:c.metric, filters:clone(c.filters||[]), sf:clone(c.sf||[]) };
  if(c.kind==='ev'){ var k=c.meas||'uniques'; return { kind:'ev', ev:c.ev, meas:k==='psum'||k==='pavg'?'prop':k==='parpu'?'arpau'/* PM 2026-10-30, LX-24 */:MX_MEAS[k]?k:'uniques', pagg:k==='pavg'?'avg':'sum', prop:c.prop||'amount', filters:clone(c.filters||[]) }; }
  return null; }
function changed(redraw){ if(RB.Q.type==='trend') syncGb();   /* PM 2026-10-31, outcome 1: B04 — an added or changed event takes the chart's breakdown */
  syncLegacy(); if(window.RBH&&RBH.dirty&&(A.events.length||A.table.cols.length||A.mex.metrics.length)) RBH.dirty(true); if(redraw!==false) render(); }

function render(){
  if(!root||root.hidden) return;
  RB.Q.unit=A.unit==='org'&&!/^(compass|personas)$/.test(RB.Q.type)?'org':'users';   /* account-level reporting */
  if(isFunnel()){ renderFunnel(); return; }
  if(isRet()){ renderRet(); return; }
  if(isJourney()){ renderJourney(); return; }
  if(isTable()){ renderTable(); return; }
  if(isMex()){ renderMex(); return; }
  if(isS8()){ renderS8(); return; }
  var res=lastRes=histNorm(trimCur(compute(A, { range:RB.Q.range, filters:RB.Q.filters, gran:A.interval })));
  /* a selection that matches no current row (e.g. saved before segments existed) falls back to the default */
  if(A.sel===null || !res.overall.concat(res.series).some(function(s){ return A.sel[s.key]; })) A.sel=defaultSel(res);
  /* PM 2026-10-31, outcome 1: B01 — a project that has received no events shows the no-events state, whatever events are picked;
     B10 — a range wholly before every picked event's collection start shows its own state with the start date */
  var noEv=projNoEvents(), preC=!noEv&&A.events.length?preCollection(res):null, empty=!A.events.length||noEv||!!preC;
  root.classList.toggle('rtl', fa());
  var tbl=empty?'':table(res);
  root.innerHTML='<div class="rbz-grid'+(SET_OPEN?' with-set':'')+'"><aside class="rbz-panel">'+eventsModule()+gbModule()/* PM 2026-10-31, outcome 1: B04 */+measureModule()+segmentModule()+'</aside>'+
    '<section class="rbz-canvas">'+(empty?'<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-drslot"></span></div>'+(noEv?noEventsState():preC?preCollState(preC):emptyCanvas()):
      toolbar(res)+dacNote()+summaryCards(res, drawn(res))+'<div class="rbz-chartbox">'+chartHost()+'</div>'+collBandNote(res)/* PM 2026-10-31, outcome 1: B10 */+invalidNote()/* PM 2026-10-28, TD-18 */+legendHtml(res)+tbl)+'</section>'+(SET_OPEN?setPanel():'')+'</div>';
  placeFilter();
  wire();
  U.i18n();
  if(!empty){ draw(res); legendPager(); }
}
/* ═════ PM 2026-10-31, outcome 1: B01 — the empty project ═════
   A project that has received no events yet (the demo's Starchap, project 3) shows one no-events state on every core report, in the
   shared UI-state convention: illustration, title, description and the «افزودن منبع» button, which opens the install flow behind the
   events page's «منبع‌ها» tab (PRD-Core-Reports, Edge cases; the copy is final). The pickers still offer the built-in events. */
function projNoEvents(){ return !RB.EVENTS.some(function(e){ return e.w>0; }); }
function noEventsState(){
  return '<div class="sh-state rbz-empty rbz-noev" id="rbzNoEv">'+emptyArt('noev')+
    '<div class="sh-state-title">'+T('هنوز ایونتی از سایت شما نرسیده','No events from your site yet')+'</div>'+
    '<div class="sh-state-hint">'+T('پس از نصب اسکریپت شاهین، ایونت‌ها با ۱ تا ۲ ساعت تاخیر این‌جا دیده می‌شوند.','Once the Shahin script is installed, events show up here within 1–2 hours.')+'</div>'+
    '<div class="rbz-emptyacts"><a class="sh-btn primary compact" id="rbzNoEvCta" href="../events-start/">'+ic('plus')+T('افزودن منبع','Add a source')+'</a>'+
    '<span class="rbx-tipdot"'+tip("<span class='tip-title'>افزودن منبع</span>راه نصب اسکریپت شاهین روی سایت یا اپ را باز می‌کند؛ همان راهی که از تب «منبع‌ها» در صفحه ایونت‌ها باز می‌شود.","<span class='tip-title'>Add a source</span>Opens the way to install the Shahin script on your site or app, the same flow the events page’s Sources tab opens.")+'></span></div></div>';
}
/* ═════ PM 2026-10-31, outcome 1: B10 — No-Backfill ═════
   The band itself is drawn in draw() (RB-3). Under the chart, a note names each event whose collection starts inside the range, with
   its date and an ⓘ; a range that ends before every picked event started collecting shows a state with the start date instead. */
function rStart(R){ var e=rEnd(R); return R.start?new Date(R.start.getFullYear(), R.start.getMonth(), R.start.getDate()):new Date(e.getTime()-((R.days||1)-1)*864e5); }
function collStarts(R){ var by={}, out=[], st=rStart(R);
  A.events.forEach(function(e){ var c=e&&collStart(e.id); if(!c||c<=st) return; var k=+c; if(!by[k]){ by[k]={ d:c, names:[] }; out.push(by[k]); } var nm=e.label||evName(e.id); if(by[k].names.indexOf(nm)<0) by[k].names.push(nm); });
  return out.sort(function(a,b){ return a.d-b.d; }); }
function preCollection(res){ var R=res&&res.R; if(!R||res.hist||R.unit==='hour'||R.unit==='minute') return null; var end=rEnd(R), cs=collStarts(R);
  if(!cs.length||cs.length&&A.events.some(function(e){ var c=collStart(e.id); return !c||c<=end; })) return null; return cs[0]; }
var COLL_TIP=["<span class='tip-title'>جمع‌آوری از …</span>شاهین داده پیش از شروع جمع‌آوری یک ایونت را بازسازی نمی‌کند؛ برای همین ابتدای بازه برای آن ایونت خالی است و افت نیست. عددها تغییر نمی‌کنند.","<span class='tip-title'>Collecting since …</span>Shahin doesn’t backfill data from before an event started collecting, so the start of the range is empty for that event and isn’t a drop. The numbers aren’t changed."];
function collBandNote(res){ var R=res&&res.R; if(!R||res.hist||A.viz==='pie'||A.viz==='kpi'||A.viz==='table'||R.unit==='hour'||R.unit==='minute') return '';
  return collStarts(R).map(function(c){ var nm=c.names.join(T('، ',', '));
    return '<div class="rbz-note rbz-collnote">'+ic('info')+'<span class="rbz-tag">'+collLabel(c.d)+'</span> '+T('«'+nm+'» پیش از این تاریخ جمع‌آوری نمی‌شد؛ بخش کم‌رنگ نمودار داده ندارد.','“'+nm+'” wasn’t collected before this date, so the faint part of the chart has no data.')+'<span class="rbx-tipdot"'+tip(COLL_TIP[0],COLL_TIP[1])+'></span></div>'; }).join(''); }
function preCollState(c){
  return '<div class="sh-state rbz-empty rbz-precoll" id="rbzPreColl">'+emptyArt('noev')+
    '<div class="sh-state-title">'+T('این بازه پیش از شروع جمع‌آوری است','This range is before collection started')+'</div>'+
    '<div class="sh-state-hint"><span class="rbz-tag">'+collLabel(c.d)+'</span> '+T('بازه‌ای بعد از این تاریخ انتخاب کنید؛ شاهین داده قبل از آن را بازسازی نمی‌کند.','Pick a range after this date; Shahin doesn’t backfill data from before it.')+'<span class="rbx-tipdot"'+tip(COLL_TIP[0],COLL_TIP[1])+'></span></div>'+
    '<div class="rbz-emptyacts"><button class="rbz-linkbtn" id="rbzPreColl30" type="button">'+ic('calendar-blank')+T('۳۰ روز اخیر','Last 30 Days')+'</button></div></div>';
}
function emptyCanvas(){
  return '<div class="sh-state rbz-empty">'+emptyArt('trend')+
    '<div class="sh-state-title">'+T('تا ۱۰ ایونت برای سنجش انتخاب کنید','Choose up to 10 events to measure')+'</div>'+
    '<div class="sh-state-hint">'+T('با میان‌بر ','Use the ')+'<button class="rbz-inlink" data-evadd="1" type="button">'+T('پرکاربردترین ایونت‌ها','Most used events')+'</button>'+T('، محبوب‌ترین ایونت‌های پروژه را ببینید.',' shortcut to see your project’s most popular events.')+'</div></div>';
}
/* histogram: counts, % of users (normalized) or cumulative % (CDF), as Amplitude's Frequency view */
function histNorm(res){
  if(!res.hist||A.ui.histMode==='count') return res;
  res.overall.concat(res.series).forEach(function(x){ var tot=x.values.reduce(function(a,b){ return a+b; },0)||1, acc=0;
    x.values=x.values.map(function(v){ acc+=v; return +((A.ui.histMode==='cdf'?acc:v)/tot*100).toFixed(1); }); });
  res.pctHist=true; return res;
}
function stackPctOk(){ return !(A.measure==='uniques' && (A.events.length>1||A.segments.length>1)); }   /* overlapping people can't be shares of one whole */
function trimCur(res){
  if(!EXCL_CUR||res.hist||res.labels.fa.length<3) return res;
  res.labels={ fa:res.labels.fa.slice(0,-1), en:res.labels.en.slice(0,-1) }; res.complete=true;
  res.overall.concat(res.series).forEach(function(x){ x.values=x.values.slice(0,-1);
    x.total=A.measure==='uniques'?RB.periodUniques(x.values):additive(A)?RB.sum(x.values):x.total; });
  return res;
}
/* how many rows may be ticked: compare lines count against the 12-line cap */
function selCap(){ return Math.floor(MAX_SERIES/(1+(canDrawCompare(A)?A.compare.length:0))); }
function defaultSel(res){
  var sel={}, cap=Math.min(DEFAULT_DRAWN, selCap()), list=res.series.slice().sort(function(a,b){ return b.total-a.total; }), n=0;
  /* every (event, segment) gets at least its top row, so a newly added segment is visible at once */
  res.groups.forEach(function(g){ var top=list.filter(function(s){ return s.gid===g; })[0]; if(top&&n<MAX_SERIES){ sel[top.key]=true; n++; } });
  list.forEach(function(s){ if(n<cap&&!sel[s.key]){ sel[s.key]=true; n++; } });
  return sel;
}
function trimSel(){
  var keys=Object.keys(A.sel||{}).filter(function(k){ return A.sel[k]; }), cap=selCap();
  if(keys.length<=cap) return;
  keys.slice(cap).forEach(function(k){ A.sel[k]=false; });
  U.toast('با مقایسه، حداکثر '+num(cap)+' سری هم‌زمان رسم می‌شود','With comparison on, up to '+cap+' series are drawn at once');
}

/* module header: collapsible like Amplitude's, the current value shown beside a closed title (UI only, not saved) */
var OPEN={ ev:true, meas:true, seg:true, jf:true, gb:true };   /* PM 2026-10-31, outcome 1: B04 — «تفکیک بر اساس» open too */   /* all open, as in Amplitude's builder */
function modHead(id, fa_, en_, tp, summary, extra){
  var open=OPEN[id];
  return '<div class="rbz-modh"><button class="rbz-modtog" type="button" data-modtog="'+id+'" aria-expanded="'+open+'">'+
    '<span class="rbz-chev'+(open?' open':'')+'">'+ic('caret-down')+'</span><span class="t">'+T(fa_,en_)+'</span>'+
    (open?'':'<span class="rbz-modsum">'+esc(summary)+'</span>')+'</button><span class="rbx-tipdot"'+tip(tp[0],tp[1])+'></span>'+
    (open&&extra?'<span class="rbz-modx">'+extra+'</span>':'')+'</div>';
}
/* event-type glyph beside each event name (Amplitude shows one per event) */
var EV_IC={ def:'stack', auto:'globe', video:'video-camera', ecom:'tag', custom:'pencil-simple', virtual:'copy' };
function evIcon(id){ var ev=getEv(id); return ic(EV_IC[ev&&ev.grp]||'globe'); }
/* PM 2026-10-31, outcome 1: B04 — the breakdown moved to the chart, so the Events tooltip no longer says each event has its own */
var TIP_EV=["<span class='tip-title'>ایونت‌ها</span>کاری که می‌خواهید بسنجید؛ هر ایونت فیلتر مخصوص خودش را دارد، تفکیک روی کل نمودار اعمال می‌شود و تا ۱۰ ایونت کنار هم بررسی می‌شوند.","<span class='tip-title'>Events</span>What you want to measure; each event has its own filters, a breakdown applies to the whole chart, and up to 10 events can be compared side by side."];
var TIP_GB=["<span class='tip-title'>تفکیک بر اساس</span>همه ایونت‌های نمودار را بر اساس مقدار یک ویژگی، مثل نوع دستگاه، به چند سری می‌شکند؛ تا ۵ ویژگی و یک تعداد ردیف برتر برای کل نمودار. ردیف «کل» هر ایونت جدا حساب می‌شود.","<span class='tip-title'>Breakdown by</span>Splits every event on the chart into one series per value of a property, such as device type; up to 5 properties and one Top N for the whole chart. Each event’s Overall row is counted on its own."];
var TIP_MEAS=["<span class='tip-title'>سنجش بر اساس</span>تعیین می‌کند هر ایونت چطور به عدد تبدیل شود: کاربران، تعداد دفعات، درصد، میانگین، توزیع تکرار، مقدار یک ویژگی یا درآمد هر کاربر فعال.","<span class='tip-title'>Measured as</span>How each event becomes a number: users, event totals, a share, an average, a frequency distribution, a property value or revenue per active user."]   /* PM 2026-10-28, CR-5 */;
/* events module */
function evName(id){ var ev=getEv(id); return ev?T(ev.fa,ev.en):id; }
function fltNames(f){ var P=RB.PROPS[f.prop]; if(!P) return f.vals||[];
  return (f.vals||[]).map(function(v){ var h=P.vals.filter(function(x){ return x[1]===v; })[0]; return h?dacVal(f.prop, h):dacVal(f.prop, v); }); }
var OPS={ 'in':['هست','is'], not_in:['نیست','is not'], contains:['شامل','contains'], not_contains:['شامل نیست','does not contain'], starts_with:['شروع می‌شود با','starts with'],
  set:['مقدار دارد','is set'], not_set:['مقدار ندارد','is not set'], eq:['=','='], lt:['<','<'], lte:['≤','≤'], gt:['>','>'], gte:['≥','≥'] };
function opsFor(prop){ var P=RB.PROPS[prop]; return P&&P.num?['gt','gte','lt','lte','eq','set','not_set']:['in','not_in','contains','not_contains','starts_with','set','not_set']; }
function fltLabel(f){ var P=RB.PROPS[f.prop]; if(!P) return f.prop; var o=OPS[f.op]||OPS['in'];
  if(f.op==='set'||f.op==='not_set') return T(P.fa,P.en)+' '+T(o[0],o[1]);
  if(f.op==='in'||f.op==='not_in'||!f.op) return T(P.fa,P.en)+(f.op==='not_in'?T(' نیست ',' is not '):T(': ',': '))+fltNames(f).join(T('، ',', '));
  return T(P.fa,P.en)+' '+T(o[0],o[1])+' «'+(f.text||'')+'»'; }
function fltValues(f){ return (f.op==='not_in'?T('غیر از ','not '):'')+fltNames(f).join(T('/','/')); }
function isFunnel(){ return RB.Q.type==='funnel'; }
function eventsModule(){
  if(isRet()) return retEventsModule();
  if(isJourney()) return jPathsModule();
  var fun=isFunnel(), badge=function(k){ return fun?num(k+1):LET[k]; };
  var sum=A.events.length?A.events.map(function(e,k){ return badge(k)+(fun?'. ':' ')+evName(e.id); }).join(T('، ',', ')):(fun?T('هنوز قدمی نیست','No steps yet'):T('هنوز ایونتی نیست','No events yet'));
  var live=liveBtn();
  var h='<div class="rbz-mod">'+(fun?modHead('ev','قدم‌های قیف','Funnel steps',FTIPS.steps,sum,live):modHead('ev','ایونت‌ها','Events',TIP_EV,sum,live));
  if(!OPEN.ev) return h+'</div>';
  if(fun) h+='<div class="rbz-orderrow"><select class="sh-select rbz-order" id="rbzOrder" aria-label="'+T('ترتیب قدم‌ها','Step order')+'">'+Object.keys(ORDER).map(function(o){ return '<option value="'+o+'"'+(A.funnel.order===o?' selected':'')+'>'+T(ORDER[o][0],ORDER[o][1])+'</option>'; }).join('')+'</select><span class="rbx-tipdot"'+tip(FTIPS.order[0],FTIPS.order[1])+'></span></div>';
  A.events.forEach(function(e,k){
    var GB=[];   /* PM 2026-10-31, outcome 1: B04 — no breakdown chips or «+ تفکیک» under an event row; see gbModule() */
    h+='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let'+(fun?' step':'')+'">'+badge(k)+'</span>'+
      '<button class="rbz-evname" data-evpick="'+k+'" type="button"><span class="rbz-evic">'+evIcon(e.id)+'</span><span class="nm">'+esc(e.label||evName(e.id))+'</span><code>'+esc(e.id)+'</code><span class="rbz-car">⌄</span></button>'+
      '<button class="rbz-ico" data-evmore="'+k+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>';
    if(fun) (A.funnel.cmpEv.filter(function(c){ return c.k===k; })[0]||{ ids:[] }).ids.forEach(function(id,ci){ h+='<div class="rbz-chip act">'+ic('swap')+'<span>'+T('در مقایسه با: ','Compared with: ')+esc(evName(id))+'</span><button data-cedel="'+k+':'+ci+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    if(fun&&A.funnel.optional===k) h+='<div class="rbz-chip act opt">'+ic('info')+'<span>'+T('قدم اختیاری','Optional step')+'</span><span class="rbx-tipdot"'+tip(FTIPS.optional[0],FTIPS.optional[1])+'></span><button data-optdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    if(fun&&A.funnel.gb&&A.funnel.gb.k===k&&RB.PROPS[A.funnel.gb.prop]) h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('تفکیک این قدم: ','Step broken down by: ')+esc(T(RB.PROPS[A.funnel.gb.prop].fa,RB.PROPS[A.funnel.gb.prop].en))+'</span><button data-fgbdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    (e.or||[]).forEach(function(id,oi){ h+='<div class="rbz-chip act">'+ic('plus')+'<span>'+T('یا: ','or: ')+esc(evName(id))+'</span><button data-ordel="'+k+':'+oi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    (e.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-fdel="'+k+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    GB.forEach(function(p,gi){ var P=RB.PROPS[p]; if(P) h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('تفکیک بر اساس: ','Broken down by: ')+esc(T(P.fa,P.en))+'</span><button data-gdel="'+k+':'+gi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    h+='<div class="rbz-evacts"><button data-fadd="'+k+'" type="button">+ '+T('فیلتر','Filter by')+'</button>'+
      '</div></div>';
  });
  var max=fun?MAX_STEPS:MAX_EVENTS;
  h+='<button class="rbz-add'+(A.events.length<(fun?2:1)?' big':'')+'" data-evadd="1" type="button"'+(A.events.length>=max?' disabled title="'+(fun?T('حداکثر ۱۰ قدم','Up to 10 steps'):T('حداکثر ۱۰ ایونت','Up to 10 events'))+'"':'')+'>'+ic('plus')+(fun?T('افزودن قدم','Add step'):T('افزودن ایونت','Add event'))+'</button>';
  if(fun && A.events.length>1){
    A.funnel.excl.forEach(function(x,i){ h+='<div class="rbz-chip act">'+ic('x')+'<span>'+esc(exclLabel(x))+'</span><button data-xdel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    h+='<div class="rbz-evacts"><button data-xadd="1" type="button">+ '+T('حذف کسانی که … را انجام داده‌اند','Exclude users who did')+'</button><span class="rbx-tipdot"'+tip(FTIPS.excl[0],FTIPS.excl[1])+'></span></div>';
  }
  return h+'</div>';
}
/* PM 2026-10-31, outcome 1: B04 — «تفکیک بر اساس», one chart-level module under «ایونت‌ها» (Amplitude's "Breakdown by"). Its chips
   «تفکیک بر اساس: X» apply to every event; «+ تفکیک» disappears at 5; Top N stays one setting in the table head. Trend only. */
function gbModule(){
  var G=chartGb(), sum=G.length?G.map(function(p){ var P=RB.PROPS[p]; return P?T(P.fa,P.en):p; }).join(T('، ',', ')):T('بدون تفکیک','No breakdown');
  var h='<div class="rbz-mod" id="rbzGbMod">'+modHead('gb','تفکیک بر اساس','Breakdown by',TIP_GB,sum);
  if(!OPEN.gb) return h+'</div>';
  G.forEach(function(p,gi){ var P=RB.PROPS[p]; if(P) h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('تفکیک بر اساس: ','Broken down by: ')+esc(T(P.fa,P.en))+'</span><button data-gdel="'+gi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
  if(G.length<MAX_GB) h+='<div class="rbz-evacts"><button data-gadd="1" type="button"'+(A.events.length?'':' disabled title="'+T('اول یک ایونت اضافه کنید','Add an event first')+'"')+'>+ '+T('تفکیک','Breakdown')+'</button></div>';
  return h+'</div>';
}
/* measured as */
function measureModule(){
  if(isFunnel()) return funnelMeasureModule();
  if(isRet()) return retMeasureModule();
  if(isJourney()) return jMeasureModule();
  var adv='<button class="rbz-modbtn" id="rbzAdv" type="button">'+T('پیشرفته','Advanced')+' ⌄</button>';
  var h='<div class="rbz-mod">'+modHead('meas','سنجش بر اساس','Measured as',TIP_MEAS,measLabel(A)+(advLabel(A)?' · '+advLabel(A):''),adv);
  if(!OPEN.meas) return h+'</div>';
  h+='<div class="rbz-mgrid" data-min-track="80" role="radiogroup" aria-label="'+T('سنجش بر اساس','Measured as')+'">';
  ['uniques','totals','active','avg','freq','prop','arpau'/* PM 2026-10-28, CR-5 */].forEach(function(m){ var on=A.measure===m, lb=m==='prop'&&on?measLabel(A):T(MEAS[m].fa,MEAS[m].en);
    h+='<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-meas="'+m+'">'+esc(lb)+(m==='prop'?' ⌄':'')+'</button>'; });
  h+='</div>';
  /* fx Formula row under the grid, as in Amplitude */
  var fon=A.measure==='formula';
  h+='<button type="button" class="rbz-fx'+(fon?' on':'')+'" data-meas="formula"><i>fx</i>'+T('فرمول','Formula')+'</button>';
  if(fon){ var errs=formulaErrors(A);
    h+='<textarea class="sh-input rbz-ftext" id="rbzFormula" rows="2" dir="ltr" spellcheck="false" placeholder="TOTALS(B)/UNIQUES(A)">'+esc(A.formula||'')+'</textarea>'+
      (errs.length?'<div class="rbz-ferr">'+errs.map(esc).join('<br>')+'</div>':'')+
      /* B7: more than 10 formulas are cut; say so */
      (String(A.formula||'').split(';').filter(function(x){ return x.trim(); }).length>10?'<div class="rbz-ferr">'+T('فقط ۱۰ فرمول اول رسم می‌شود.','Only the first 10 formulas are drawn.')+'</div>':'')+
      '<details class="rbz-fhelp"><summary>'+T('راهنمای توابع','Function reference')+'</summary><ul>'+FN_HELP.map(function(f){ return '<li><code dir="ltr">'+f[0]+'</code> '+T(f[1],f[2])+'</li>'; }).join('')+
      '<li><code dir="ltr">%:</code> '+T('نمایش به‌صورت درصد','show as a percentage')+' · <code dir="ltr">$:</code> '+T('نمایش به '+curU()[0],'show in '+curU()[1])/* PM 2026-10-28, TD-9 */+' · <code dir="ltr">;</code> '+T('جداکنندهٔ چند فرمول','separates formulas')+'</li></ul></details>';
  }
  /* the selected measure's definition stays visible (the grid has no room for a ⓘ per button) */
  h+='<div class="rbz-mdef">'+(fa()?MEAS[A.measure].tf:MEAS[A.measure].te).replace(/<span class='tip-title'>[^<]*<\/span>/,'')+'</div>';
  if(advLabel(A)) h+='<div class="rbz-chip act">'+ic('chart-line')+'<span>'+esc(advLabel(A))+'</span><button data-advdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
  return h+'</div>';
}
/* segment by («گروه‌های کاربران»): base (who), unit and saved segments in the header, as in Amplitude */
var SAVED_SEGS=[
  { id:'ss1', fa:'کاربران موبایل تهران', en:'Mobile users in Tehran', def:{ who:'any', filters:[{ prop:'device_type', op:'in', vals:['Mobile'] },{ prop:'city', op:'in', vals:['Tehran'] }], performed:null, cohort:'' } },
  { id:'ss2', fa:'بازگشتی‌های پرتعامل', en:'Engaged returning users', def:{ who:'any', filters:[{ prop:'is_new_user', op:'in', vals:['Returning'] },{ prop:'is_engaged', op:'in', vals:['Engaged'] }], performed:null, cohort:'' } }
], DEFAULT_SEG='';
function segmentModule(){
  var G=A.groupSeg?RB.PROPS[A.groupSeg]:null, x=function(attr){ return '<button '+attr+' type="button" aria-label="'+T('حذف','Remove')+'">×</button>'; };
  var who=A.segments[0].who||'any';
  var extra='<button class="rbz-modbtn" id="rbzWho" type="button">'+T(WHO[who][0],WHO[who][1])+' ⌄</button>'+
    (SEG_TIPS[who]?'<span class="rbx-tipdot"'+tip(SEG_TIPS[who][0],SEG_TIPS[who][1])+'></span>':'')+
    '<button class="rbz-modbtn'+(A.unit==='org'?' on':'')+'" id="rbzUnit" type="button">'+(A.unit==='org'?T('سازمان‌ها','Organizations'):T('کاربران','Users'))+' ⌄</button>'+(A.unit==='org'?'<span class="rbx-tipdot rbz-orgtip"'+tip("<span class='tip-title'>شمردن سازمان‌ها</span>هر عدد این نمودار تعداد سازمان‌هایی است که سایت با ⁦group()⁩ فرستاده؛ کاربرانِ بی‌سازمان شمرده نمی‌شوند و در قیف، کافی است اعضای مختلفِ یک سازمان قدم‌ها را بروند.","<span class='tip-title'>Counting organizations</span>Every number on this chart counts organizations your site sent with ⁦group()⁩; users with no organization aren’t counted, and in a funnel different members of one organization may complete the steps.")+'></span>':'')+
    '<button class="rbz-modbtn" id="rbzSaved" type="button">'+T('ذخیره‌شده‌ها','Saved')+' ⌄</button>';
  var h='<div class="rbz-mod">'+modHead('seg','گروه‌های کاربران','User segments',SEG_TIPS.mod,A.segments.map(segLabel).join(' | '),extra);
  if(!OPEN.seg) return h+'</div>';
  if(isFunnel()) h+='<div class="rbz-hint">'+ic('info')+T('در قیف، شرط گروه‌ها فقط روی قدم اول اعمال می‌شود.','In a funnel, segment conditions apply to the first step only.')+'</div>';
  if(isRet()) h+='<div class="rbz-hint">'+ic('info')+T('در ریتنشن، شرط گروه‌ها فقط روی ایونت شروع اعمال می‌شود.','In retention, segment conditions apply to the starting event only.')+'</div>';
  if(isJourney()) h+='<div class="rbz-hint">'+ic('info')+T('مسیرها یک گروه کاربران دارد.','Journeys analyses one segment.')+'</div>';
  else if(['stick','life','emx','impact'].indexOf(RB.Q.type)>-1) h+='<div class="rbz-hint">'+ic('info')+T('فقط گروه اول اعمال می‌شود.','Only the first segment applies.')+'</div>';   /* PM 2026-10-25, AC-15 */
  var firstOnly=['stick','life','emx','impact'].indexOf(RB.Q.type)>-1;
  A.segments.forEach(function(sg,si){
    /* AC-15: later segments (kept from another chart type) are faded with the same reason */
    h+='<div class="rbz-ev rbz-seg'+(firstOnly&&si>0?' off" title="'+esc(T('فقط گروه اول اعمال می‌شود','Only the first segment applies'))+'"':'"')+'><div class="rbz-evrow"><span class="rbz-let seg">'+num(si+1)+'</span>'+
      '<input class="sh-input rbz-seglabel" data-seglabel="'+si+'" value="'+esc(sg.label||'')+'" placeholder="'+esc(segLabel(Object.assign({},sg,{ label:'' })))+'" aria-label="'+T('نام گروه','Segment name')+'"/>'+
      '<button class="rbz-ico" data-segmore="'+si+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>';
    sg.filters.forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span>'+x('data-sfdel="'+si+':'+fi+'"')+'</div>'; });
    if(sg.performed) h+='<div class="rbz-chip act">'+ic('check')+'<button class="rbz-chipbtn" data-spedit="'+si+'" type="button">'+esc(perfLabel(sg.performed))+'</button>'+(window.RBCohort?'<button data-spsave="'+si+'" type="button" title="'+T('ذخیره به‌عنوان کوهورت','Save as cohort')+'" aria-label="'+T('ذخیره به‌عنوان کوهورت','Save as cohort')+'">'+ic('floppy-disk')+'</button>':'')+x('data-spdel="'+si+'"')+'</div>';
    if(sg.cohort){ var c=cohortById(sg.cohort); h+='<div class="rbz-chip act">'+ic('users-three')+'<span>'+T('در کوهورت: ','In cohort: ')+esc(c?T(c.fa,c.en):sg.cohort)+'</span>'+x('data-scdel="'+si+'"')+'</div>'; }
    h+='<div class="rbz-evacts"><button data-sfadd="'+si+'" type="button">+ '+T('فیلتر','Filter by')+'</button>'+
      (sg.cohort?'':'<button data-scadd="'+si+'" type="button">+ '+T('در کوهورت','In cohort')+'</button><span class="rbx-tipdot"'+tip(SEG_TIPS.cohort[0],SEG_TIPS.cohort[1])+'></span>')+
      (sg.performed?'':'<button data-spadd="'+si+'" type="button">+ '+T('انجام ایونت','Performed event')+'</button><span class="rbx-tipdot"'+tip(SEG_TIPS.perf[0],SEG_TIPS.perf[1])+'></span>')+'</div></div>';
  });
  var oneSeg=isJourney()||['stick','life','emx','impact'].indexOf(RB.Q.type)>-1, gmax=!!G||oneSeg;   /* Amplitude: breaking segments down keeps the chart to one segment; Journeys has one segment */
  h+='<button class="rbz-add" data-segadd="1" type="button"'+(A.segments.length>=MAX_SEGMENTS||gmax?' disabled title="'+(oneSeg&&!isJourney()?T('فقط گروه اول اعمال می‌شود','Only the first segment applies'):isJourney()?T('مسیرها یک گروه کاربران دارد','Journeys has one segment'):gmax?T('با «تفکیک گروه‌ها» فقط یک گروه ممکن است','Only one segment while segments are broken down'):T('حداکثر ۱۰ گروه','Up to 10 segments'))+'"':'')+'>'+ic('plus')+T('افزودن گروه','Add segment')+'</button>';
  if(!(isRet()&&A.ret.meas==='usage')&&!isJourney()&&!isS8()){   /* usage interval and Journeys have no segment breakdown */
    var many=A.segments.length>1||(isFunnel()&&(!!A.funnel.gb||A.funnel.optional>0));
    h+='<div class="rbz-sub2"><span class="lb">'+T('تفکیک گروه‌ها','Break down segments')+'</span><span class="rbx-tipdot"'+tip(SEG_TIPS.gseg[0],SEG_TIPS.gseg[1])+'></span></div>'+
      '<div class="rbz-fieldrow"><button class="rbz-field" data-gsadd="1" type="button"'+(many?' disabled title="'+T('فقط وقتی یک گروه دارید','Only with a single segment')+'"':'')+'>'+(G?esc(T(G.fa,G.en)):'<span class="ph">'+T('انتخاب ویژگی…','Select property…')+'</span>')+' <span class="car">⌄</span></button>'+
      (G?x('data-gsdel="1"'):'')+'</div>';
  }
  return h+'</div>';
}
/* canvas toolbar, in Amplitude's order: chart settings and refresh at the start; viz, interval, compare and the date range at the end */
/* PM 2026-10-28, RB-15: the freshness label and its tooltip leave the demo («اصلا لازم نیست توی دمو به این اشاره بشه») */
function toolStart(){
  return '<button class="rbz-pill ghost" id="rbzSet" type="button" title="'+T('تنظیمات نمودار','Chart settings')+'">'+ic('faders')+'<span class="lbl">'+T('تنظیمات نمودار','Chart settings')+'</span> ⌄</button>'+
    (A.ui.sampling?'<button class="rbz-pill warn" id="rbzSampled" type="button">⚡ '+T('نمونه‌گیری‌شده: ۱۰٪','Sampled: 10%')+'</button>':'')+
    '<button class="rbz-ico" id="rbzRefresh" type="button" title="'+T('تازه‌سازی داده (Shift+R)','Refresh data (Shift+R)')+'" aria-label="'+T('تازه‌سازی داده','Refresh data')+'">'+ic('arrows-clockwise')+'</button>';
}
function toolbar(res){
  var v=VIZ.filter(function(x){ return x[0]===A.viz; })[0]||VIZ[0];
  return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+
    (res.hist?'<span class="rbz-pill static">'+ic('squares-four')+T('هیستوگرام','Histogram')+'</span><div class="rbz-seg2 sm">'+[['count','تعداد','Counts'],['pct','درصد کاربران','Normalized'],['cdf','تجمعی','CDF']].map(function(x){ return '<button type="button" class="'+(A.ui.histMode===x[0]?'on':'')+'" data-hmode="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>'
      :'<button class="rbz-pill" id="rbzViz" type="button">'+ic(v[3])+T(v[1],v[2])+' ⌄</button>')+
    ((A.viz==='area'||A.viz==='stackbar')&&!res.hist?'<div class="rbz-seg2 sm">'+[[false,'# مطلق','# Absolute'],[true,'٪ نسبی','% Relative']].map(function(x){ var dis=x[0]&&!stackPctOk();
      return '<button type="button" class="'+(!!A.ui.stackPct===x[0]?'on':'')+'" data-spct="'+x[0]+'"'+(dis?' disabled title="'+T('کاربرانِ چند ایونت یا چند گروه هم‌پوشانی دارند و سهمِ یک کل نیستند','Users of several events or segments overlap and are not shares of one whole')+'"':'')+'>'+T(x[1],x[2])+'</button>'; }).join('')+'</div>':'')+
    (res.hist||A.viz==='pie'||A.viz==='kpi'?'':'<button class="rbz-pill" id="rbzGran" type="button">'+T(GRAN[A.interval][0],GRAN[A.interval][1])+' ⌄</button>')+
    (res.hist?'':'<button class="rbz-pill'+(A.compare.length?' on':'')+'" id="rbzCmp" type="button">'+ic('swap')+(A.compare.length?T('مقایسه: ','Compare: ')+A.compare.map(function(m){ return T(cmpInfo(m)[0],cmpInfo(m)[1]); }).join(T('، ',', ')):T('مقایسه','Compare'))+' ⌄</button><span class="rbx-tipdot"'+tip(SEG_TIPS.cmp[0],SEG_TIPS.cmp[1])+'></span>')+
    '<span class="rbz-drslot"></span></div>'+
    notes(res);
}
/* PM decision 2026-10-12: in the builder the unified date range + Filters live beside the chart, like Amplitude (moved, not copied) */
var filterNode=null;
function placeFilter(){ var slot=root&&root.querySelector('.rbz-drslot'); if(slot&&filterNode&&filterNode.parentNode!==slot) slot.appendChild(filterNode); extendDatePicker(); td10Gate(); }
/* PM 2026-10-28, TD-10: a chart with a filter (the bar's filters or an event's) or a segment allows ranges up to 93 days. Longer presets are
   disabled with the reason; «آخرین N روز» stops at 93; a longer range already on such a chart (a saved chart, a Jalali pick) drops to the
   last 90 days with the same reason. Unfiltered charts are unchanged. */
var TD10_MAX=93, TD10_WHY=['بازه بیش از ۹۳ روز برای نمودار فیلتردار هنوز در دسترس نیست','Ranges over 93 days aren’t available yet for filtered charts'], td10Busy=false;
function fltSet(f){ return !!(f&&f.prop&&(((f.vals||[]).length)||(f.text&&String(f.text).trim()))); }   /* a filter row still being filled doesn't count */
function anyFlt(list){ return (list||[]).some(function(x){ return x&&(x.filters||[]).some(fltSet); }); }
function chartFiltered(){ var t=RB.Q.type, own;   /* the current chart type's own filters: stale events of another type don't count */
  if(t==='table') own=anyFlt(A.table.cols); else if(t==='mex') own=anyFlt(A.mex.metrics);
  else if(isS8(t)) own=!!(A.s8&&A.s8[t]&&(A.s8[t].filters||[]).some(fltSet)); else own=anyFlt(A.events);
  return own || (RB.Q.filters||[]).some(fltSet) || (A.segments||[]).some(function(sg){ return !isDefaultSeg(sg); }); }
function rangeDays(v){ return within({ range:v, filters:[] }, function(){ return RB.rangeInfo().days; }); }
function td10Gate(){
  if(!filterNode) return; var on=chartFiltered();
  filterNode.querySelectorAll('input[name="drRange"]').forEach(function(r){ var v=r.value; if(v==='custom'||v==='nN'||v==='since') return;
    var off=on&&rangeDays(v)>TD10_MAX, lab=r.closest('label'); r.disabled=off;
    if(lab){ lab.style.opacity=off?'.5':''; if(off) lab.title=T(TD10_WHY[0],TD10_WHY[1]); else lab.removeAttribute('title'); } });
  var ln=filterNode.querySelector('#rbzLastN'); if(ln) ln.max=on?TD10_MAX:365;
  if(on&&!td10Busy&&RB.rangeInfo().days>TD10_MAX){ td10Busy=true;
    setTimeout(function(){ RB.Q.range='90d'; var r=filterNode.querySelector('input[name="drRange"][value="90d"]'), lb=filterNode.querySelector('.sh-dr-label');
      if(r) r.checked=true; if(lb) lb.textContent=T('۹۰ روز اخیر','Last 90 Days');
      U.toast(TD10_WHY[0]+'؛ بازه «۹۰ روز اخیر» شد', TD10_WHY[1]+'; the range is now “Last 90 Days”'); td10Busy=false; RB.renderActive(); }, 0); }
}
function restoreFilter(){ var b=$('rbBuilder'); if(b&&filterNode&&filterNode.parentNode!==b) b.insertBefore(filterNode, b.firstChild); }
/* one summary card per drawn series: the last complete interval vs the first one (Amplitude: "yesterday vs. Sep 12") */
function summaryCards(res, list){
  if(res.hist||A.viz==='pie'||A.viz==='kpi'||A.viz==='bar'||A.viz==='table'||!list.length) return '';
  var L=res.labels[fa()?'fa':'en'], n=L.length, li=n>1?n-2:n-1, unit=res.R.unit;
  var when=unit==='day'?T('دیروز','yesterday'):unit==='week'?T('هفتهٔ گذشته','last week'):T('ماه گذشته','last month');
  var cards=list.slice(0,4).map(function(s){ FMODE=s.fmode!=null?s.fmode:null; var v=s.values[li], b=s.values[0], d=b?(v-b)/b*100:null, up=d>=0;
    return '<div class="rbz-sum"><span class="rbz-sumchip" title="'+esc(seriesName(s))+'"><span class="rbz-sw" style="background:'+lastColors[s.key]+'"></span>'+esc(seriesName(s))+'</span>'+
      '<b>'+fmtVal(A,v)+'</b><span class="rbz-sumd '+(d==null?'':up?'up':'down')+'">'+(d==null?'—':'<span dir="ltr">'+(up?'↑ ':'↓ ')+num(Math.abs(d),1)+T('٪','%')+'</span>')+' <span>'+when+T(' در برابر ',' vs. ')+esc(L[0])+'</span></span></div>'; }).join('');
  FMODE=null;
  return '<div class="rbz-sums">'+cards+(list.length>4?'<div class="rbz-sum more">'+T('+'+num(list.length-4)+' سری دیگر','+'+(list.length-4)+' more')+'</div>':'')+'</div>';
}
function notes(res){
  var out=[], stacked=A.viz==='area'||A.viz==='stackbar', multi=A.segments.length>1;
  if(A.measure==='arpau'){ var noAmt=A.events.filter(function(e){ var g=getEv(e.id); return !(g&&(g.props||[]).indexOf('order_value')>-1); }).map(function(e){ return evName(e.id); });   /* PM 2026-10-28, CR-5 */
    if(noAmt.length) out.push(T('«'+noAmt.join('، ')+'» مبلغ سفارش ندارد؛ درآمد هر کاربر فعال برایش «—» است.','“'+noAmt.join(', ')+'” has no order amount, so its revenue per active user shows “—”.')); }
  if(stacked&&multi) out.push(T('یک نفر می‌تواند در چند گروه باشد؛ ارتفاع انباشته از تعداد واقعی بیشتر می‌شود. عدد دقیق هر گروه در ردیف «کل» همان گروه است.','One person can be in several segments, so a stacked total overstates the real count. Each segment’s exact figure is in its Overall row.'));
  else if(stacked&&A.measure==='uniques') out.push(T('یک نفر می‌تواند در چند گروه باشد؛ ارتفاع ستون انباشته ممکن است از تعداد واقعی کاربران بیشتر شود. عدد دقیق هر بازه در ردیف «کل» جدول است.','One person can be in several groups, so a stacked total can exceed the real number of users. The exact figure is in the table’s Overall row.'));
  if(A.compare.length&&!res.hist&&!canDrawCompare(A)&&A.viz!=='kpi') out.push(T('مقایسه فقط روی نمودار خطی و میله‌ای رسم می‌شود؛ ستون‌های مقایسه در جدول هست.','Comparison is drawn only on line and bar charts; the comparison columns are in the table.'));
  if(A.compare.length&&canDrawCompare(A)) out.push(T('آخرین بازه هنوز در حال جمع‌آوری است و با یک بازهٔ کامل مقایسه می‌شود؛ تغییرِ آن بازه را نهایی نخوانید.','The last interval is still collecting and is compared with a complete one; don’t read its change as final.'));
  return out.map(function(t){ return '<div class="rbz-note">'+ic('info')+t+'</div>'; }).join('');
}
/* PM 2026-10-28, TD-18: rows stored with Valid = 0 (a broken structure) are not counted in charts; they show only in data health. Under the
   chart, a quiet line says how many of this chart's events were left out and links to the events page's validation errors («تنظیمات داده»).
   The demo has no real invalid rows: each event's share is the events page's own sample (es-v12d.js observe(): 0.4%–3.4% of the volume,
   from the same hash of «<event>inv»), so the two pages agree per event. Scope, as decision 30 and PRD-Lexicon say: registry (pack) events
   only (video, e-commerce and media packs); a custom event checked against its plan stays counted (decision 6). A combined event counts
   its pack parts. */
function invHash(s){ var h=2166136261; s=String(s); for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function invRate(id){ return 0.004+(invHash(id+'inv')%1000)/1000*0.03; }
var INV_CACHE={}, INV_PACKS=['video','ecom','media'];
function invalidCount(){
  var ids=[];
  A.events.forEach(function(e){ if(!e||!e.id) return; var v=(RB.VIRTUALS||[]).filter(function(x){ return x.id===e.id; })[0];
    (v?v.comps:[e.id]).forEach(function(c){ var g=RB.evById(c); if(g && g.w>0 && INV_PACKS.indexOf(g.grp)>-1 && ids.indexOf(c)<0) ids.push(c); }); });
  var n=0;
  ids.forEach(function(id){ var k=(RB.PROJECT||0)+'|'+id+'|'+RB.Q.range;
    if(INV_CACHE[k]==null){ var t=0; try{ t=window.RBAmp&&RBAmp.evStats?RBAmp.evStats(id, RB.Q.range, []).t:0; }catch(err){ t=0; } INV_CACHE[k]=Math.round((t||0)*invRate(id)); }
    n+=INV_CACHE[k]; });
  return n; }
function invalidNote(){ if(!A.events.length) return ''; var n=invalidCount(); if(!(n>0)) return '';
  return '<div class="rbz-invnote">'+ic('info')+'<span>'+T('در این نمودار '+num(n)+' ایونت با ساختار نامعتبر شمرده نشد', num(n)+(n===1?' event with an invalid structure wasn’t':' events with an invalid structure weren’t')+' counted in this chart')+'</span>'+
    '<a class="rbz-inlink" href="../events-settings/v13.html?tab=settings" target="_blank" rel="noopener">'+T('خطاهای اعتبارسنجی','Validation errors')+'</a></div>'; }
function chartHost(){ if(A.viz==='table'&&!isHist(A)) return ''; return A.viz==='kpi'&&!isHist(A)?'<div class="rbz-kpis" id="rbzKpis"></div>':'<div class="rbz-chart" id="rbzChart"></div>'; }
/* breakdown table: rows choose what is drawn. Amplitude layout: Breakdown by Top N, search, select-all, Event / segment / group-by columns, a row summary ▾ */
var ROWAGG={ avg:['میانگین ردیف','Row average'], median:['میانهٔ ردیف','Row median'], sum:['مجموع ردیف','Row sum'], change:['تغییر ردیف','Row change'], total:['کل بازه','Whole period'] };
function rowAggOk(k){ return !(k==='sum' && (A.measure==='uniques'||ratioMeasure(A))); }   /* daily users and rates don't add up */
function rowAgg(s, k){
  var v=s.values.filter(function(x){ return x!=null; }); if(!v.length) return null;
  if(k==='total') return s.total;
  if(k==='sum') return v.reduce(function(a,b){ return a+b; },0);
  if(k==='median'){ var o=v.slice().sort(function(a,b){ return a-b; }), m=Math.floor(o.length/2); return o.length%2?o[m]:(o[m-1]+o[m])/2; }
  if(k==='change') return v[0]?(v[v.length-1]-v[0])/v[0]*100:null;
  return v.reduce(function(a,b){ return a+b; },0)/v.length;
}
function rowAggFmt(v, k){ if(v==null) return '—'; if(k==='change') return fmtChange(A, v, 'pct'); return A.measure==='uniques'||A.measure==='totals'?num(v, k==='avg'||k==='median'?1:0):fmtVal(A, v); }
/* column headers: daily buckets carry the weekday, as in Amplitude (“Sat, Sep 12”) */
function colHeads(res){
  if(res.hist) return res.buckets;
  var L=res.labels[fa()?'fa':'en']; if(res.R.unit!=='day') return L;
  var end=res.R.mode==='custom'?rEnd(res.R):new Date(2026,6,27), n=L.length;
  var f=fa()?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ weekday:'short', day:'numeric', month:'long' }):new Intl.DateTimeFormat('en-US',{ weekday:'short', month:'short', day:'numeric' });
  return L.map(function(x,i){ return f.format(new Date(end.getTime()-(n-1-i)*86400000)); });
}
function table(res){
  var st=A, hist=res.hist, cols=colHeads(res), ra=rowAggOk(A.ui.rowAgg)?A.ui.rowAgg:'avg';
  var pal=palette(), order=res.series, hasSeg=res.overall.some(function(o){ return o.segName; }), hasGrp=res.series.some(function(x){ return x.group; });
  var raTip=ra==='total'&&st.measure==='uniques'?tip("<span class='tip-title'>کاربران در کل بازه</span>هر نفر در کل بازه یک بار شمرده می‌شود؛ برای همین این عدد از جمع ستون‌های روزانه کمتر است.","<span class='tip-title'>Users in period</span>Each person counts once over the whole period, so this is lower than the sum of the daily columns."):'';
  var csvTip=tip("<span class='tip-title'>خروجی CSV</span>همه ردیف‌های جدول، حتی ردیف‌های تیک‌نخورده، تا ۱۰٬۰۰۰ ردیف؛ ستون‌ها همان بازه‌های نمودارند.","<span class='tip-title'>Export CSV</span>Every table row, ticked or not, up to 10,000 rows; columns are the chart's intervals.");
  var h='<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('تفکیک بر اساس:','Breakdown by:')+'</span><button class="rbz-pill" id="rbzTopN" type="button">'+(A.ui.topN?T(num(A.ui.topN)+' ردیف برتر',''+'Top '+A.ui.topN):T('همه ردیف‌ها','All rows'))+' ⌄</button>'+
    '<span class="rbx-tipdot"'+tip("<span class='tip-title'>تفکیک بر اساس</span>در هر ایونت و گروه، فقط این تعداد از پربازدیدترین مقدارهای تفکیک در جدول می‌ماند؛ بقیه در خروجی CSV هست.","<span class='tip-title'>Breakdown by</span>For each event and segment, only this many of the top breakdown values stay in the table; the rest are in the CSV export.")+'></span>'+
    '<label class="rbz-tsearch">'+ic('magnifying-glass')+'<input id="rbzTblQ" type="search" placeholder="'+T('جستجو در ردیف‌ها','Search rows')+'"/></label>'+
    '<span class="rbx-spacer"></span><button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button><span class="rbx-tipdot"'+csvTip+'></span></div>'+
    '<div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="ck"><input type="checkbox" id="rbzSelAll" aria-label="'+T('انتخاب همه','Select all')+'"/></th>'+
    '<th class="fix">'+T('ایونت','Event')+'</th>'+(hasSeg?'<th>'+T('گروه','Segment')+'</th>':'')+(hasGrp?'<th>'+T('تفکیک','Breakdown')+'</th>':'')+
    '<th class="num"'+raTip+'><button class="rbz-thbtn" id="rbzRowAgg" type="button">'+T(ROWAGG[ra][0],ROWAGG[ra][1])+' ⌄</button></th>'+
    (hist?'':A.compare.map(function(m){ return '<th class="num cmp">'+T(cmpInfo(m)[0],cmpInfo(m)[1])+'</th><th class="num cmp"'+tip(SEG_TIPS.chg[0],SEG_TIPS.chg[1])+'>'+T('تغییر','Change')+(A.cmpMode==='pct'?T(' (٪)',' (%)'):'')+'</th>'; }).join(''))+
    cols.map(function(c){ return '<th class="num">'+esc(c)+'</th>'; }).join('')+'</tr></thead><tbody>';
  var ci=0, colorOf={};
  order.forEach(function(x){ colorOf[x.key]=pal[ci++%pal.length]; });
  res.overall.forEach(function(o){
    var mine=res.series.filter(function(x){ return x.gid===o.gid; }), grouped=mine.some(function(x){ return x.group; });
    if(grouped){ colorOf[o.key]=pal[ci++%pal.length]; if(A.ui.topN) mine=mine.slice().sort(function(a,b){ return b.total-a.total; }).slice(0,A.ui.topN); }
    (grouped?[o].concat(mine):mine).forEach(function(x){ var on=!!A.sel[x.key], ag=rowAgg(x, ra); FMODE=x.fmode!=null?x.fmode:null;
      h+='<tr class="'+(x.overall?'ov':'')+'" data-q="'+esc((x.name+' '+(x.segName||'')+' '+(x.group||'')).toLowerCase())+'"><td class="ck"><input type="checkbox" data-sel="'+esc(x.key)+'"'+(on?' checked':'')+' aria-label="'+T('رسم در نمودار','Draw in chart')+'"/></td>'+
        '<td class="sname fix"><span class="rbz-sw" style="background:'+colorOf[x.key]+'"></span><span class="rbz-let sm">'+x.letter+'</span>'+esc(x.name)+'</td>'+
        (hasSeg?'<td class="sname">'+esc(x.segName||'')+'</td>':'')+(hasGrp?'<td class="sname">'+(x.group?esc(x.group):x.overall?'<b>'+T('کل','Overall')+'</b>':'')+'</td>':'')+
        '<td class="num strong">'+rowAggFmt(ag, ra)+'</td>'+
        (hist?'':A.compare.map(function(m){ var p=past(st,x,m), d=change(x.total,p.total,A.cmpMode);
          return '<td class="num cmp">'+(p.total?fmtVal(st,p.total):'—')+'</td><td class="num cmp '+(d>0?'up':d<0?'down':'')+'">'+fmtChange(st,d,A.cmpMode)+'</td>'; }).join(''))+
        x.values.map(function(v){ return '<td class="num">'+fmtVal(st,v)+'</td>'; }).join('')+'</tr>'; });
  });
  FMODE=null; lastColors=colorOf;
  return h+'</tbody></table></div></div>';
}
/* legend under the chart (PM decision 2026-10-12), letter badges as in Amplitude; click hides/shows a series */
var hidden={};
function legendHtml(res){
  if(!A.ui.legend||res.hist||A.viz==='kpi'||A.viz==='table'||A.viz==='bar'||A.viz==='pie') return '';
  var list=drawn(res); if(!list.length) return '';
  return '<div class="rbz-legwrap"><button class="rbz-legnav" data-legnav="-1" type="button" aria-label="'+T('قبلی','Previous')+'">‹</button><div class="rbz-legend" id="rbzLegend">'+
    list.map(function(x){ return '<button type="button" class="rbz-legi'+(hidden[x.key]?' off':'')+'" data-leg="'+esc(x.key)+'"><span class="rbz-letc" style="background:'+lastColors[x.key]+'">'+x.letter+'</span>'+esc(seriesName(x).replace(/^[A-J] · /,''))+'</button>'; }).join('')+
    '</div><button class="rbz-legnav" data-legnav="1" type="button" aria-label="'+T('بعدی','Next')+'">›</button></div>';
}
function legendPager(){
  var lg=$('rbzLegend'); if(!lg) return; var wrap=lg.parentNode, over=lg.scrollWidth>lg.clientWidth+2;
  wrap.classList.toggle('pager', over);
}
var lastColors={};

/* ── drawing ── */
function drawn(res){ return res.overall.concat(res.series).filter(function(s,k,arr){ return A.sel[s.key] && arr.indexOf(s)===k; }); }
/* Block C (2026-10-24, gap audit 49c item 100): Data Access Control — a member doesn't see the values of Personal or Sensitive
   properties; the breakdown keeps its rows (and its numbers) but names each value «[محدود]» with a stable short code */
function dacMasked(props){ return (PROLE==='member'||IS_VIEWER) &&   /* PM 2026-10-25, TG-4: a viewer is masked like a member */ (props||[]).some(function(p){ var k=window.RBDefs&&RBDefs.sens?RBDefs.sens(p):'std'; return k==='pii'||k==='sens'; }); }
function dacLabel(props, label, raw){ return dacMasked(props)?T('[محدود] ','[Restricted] ')+'#'+((RB.hstr(String(raw))>>>0)%900+100):label; }
/* the same masking everywhere a member could read a value: people lists, downloads, profiles and filter value pickers (PM, 2026-10-25) */
function dacVal(prop, pair){ var raw=Array.isArray(pair)?pair[1]:pair; return dacMasked([prop])?T('[محدود] ','[Restricted] ')+'#'+((RB.hstr(String(raw))>>>0)%900+100):(Array.isArray(pair)?T(pair[0],pair[1]):String(pair)); }
function dacNote(){ var ps=[]; A.events.forEach(function(e){ gbs(e).forEach(function(p){ if(dacMasked([p])&&ps.indexOf(p)<0) ps.push(p); }); }); if(A.groupSeg&&dacMasked([A.groupSeg])&&ps.indexOf(A.groupSeg)<0) ps.push(A.groupSeg);
  if(!ps.length) return '';
  return '<div class="rbz-note warn">'+ic('lock-simple')+'<span>'+T('مقدارهای «'+ps.map(function(p){ return (RB.PROPS[p]||{}).fa||p; }).join('، ')+'» برای نقش شما پنهان است؛ عددها درست‌اند ولی نام مقدارها نشان داده نمی‌شود.','The values of “'+ps.map(function(p){ return (RB.PROPS[p]||{}).en||p; }).join(', ')+'” are hidden for your role; the numbers are right but the value names aren’t shown.')+'</span><button class="rbz-inlink" id="rbzDacReq" type="button">'+T('درخواست دسترسی','Request access')+'</button></div>'; }
function seriesName(s){ return s.letter+' · '+s.name+(s.segName?' · '+s.segName:'')+(s.group?' · '+s.group:s.overall?' · '+T('کل','Overall'):''); }
function draw(res){
  var list=drawn(res).filter(function(x){ return !hidden[x.key]; });
  if(A.viz==='kpi' && !res.hist){ drawKpis(res, list); return; }
  if(A.viz==='table' && !res.hist) return;
  var el=$('rbzChart'); if(!el||!window.echarts) return;
  if(chart){ chart.dispose(); chart=null; }
  if(!list.length){ el.innerHTML='<div class="sh-state"><div class="sh-state-title">'+T('سری‌ای برای رسم انتخاب نشده','No series selected')+'</div><div class="sh-state-hint">'+T('از جدول زیر، ردیف‌هایی را که می‌خواهید ببینید تیک بزنید.','Tick the rows you want to see in the table below.')+'</div></div>'; return; }
  chart=echarts.init(el);
  var cs=getComputedStyle(document.body), TX=cs.getPropertyValue('--sh-text').trim(), MU=cs.getPropertyValue('--sh-muted').trim(), BD=cs.getPropertyValue('--sh-border').trim(), SF=cs.getPropertyValue('--sh-surface').trim(), FONT=cs.fontFamily;
  var tipBase={ backgroundColor:SF, borderColor:BD, textStyle:{ color:TX, fontFamily:FONT, fontSize:12 }, confine:true, extraCssText:'direction:'+(fa()?'rtl':'ltr')+';text-align:start' };
  var sname=seriesName, opt;
  if(A.viz==='bar' && !res.hist){
    var cmpB=A.compare, rows=list.slice().sort(function(a,b){ return (b.total||0)-(a.total||0); });
    var serB=[{ name:T('این بازه','This range'), type:'bar', barMaxWidth:22, data:rows.map(function(x){ return { value:x.total, itemStyle:{ color:lastColors[x.key] } }; }),
      label:{ show:true, position:fa()?'left':'right', color:TX, fontFamily:FONT, fontSize:11, formatter:function(p){ return fmtVal(A,p.value); } } }];
    cmpB.forEach(function(m){ serB.push({ name:T(cmpInfo(m)[0],cmpInfo(m)[1]), type:'bar', barMaxWidth:14, data:rows.map(function(x){ return { value:past(A,x,m).total, itemStyle:{ color:alpha(lastColors[x.key],.4) } }; }) }); });
    opt={ grid:{ left:fa()?16:8, right:fa()?8:16, top:8, bottom:8, containLabel:true },
      tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ return esc(p.seriesName)+' <b>'+fmtVal(A,p.value)+'</b>'; }).join('<br>'); } }, tipBase),
      yAxis:{ type:'category', inverse:true, data:rows.map(sname), position:fa()?'right':'left', axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:TX, fontFamily:FONT, fontSize:11, width:220, overflow:'truncate' } },
      xAxis:{ type:'value', min:0, inverse:fa(), splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return compact(v); } } },
      series:serB };
    el.style.height=Math.max(220, rows.length*(28+14*cmpB.length)+40)+'px';
  } else if(A.viz==='pie' && !res.hist){
    var items=list.map(function(s){ return { name:sname(s), value:s.total, itemStyle:{ color:lastColors[s.key] } }; }).sort(function(a,b){ return b.value-a.value; });
    if(items.length>6){ var rest=items.slice(5).reduce(function(a,x){ return a+x.value; },0); items=items.slice(0,5).concat([{ name:T('سایر','Other'), value:rest, itemStyle:{ color:MU } }]); }
    opt={ tooltip:Object.assign({ trigger:'item', formatter:function(p){ return esc(p.name)+'<br><b>'+fmtVal(A,p.value)+'</b> · '+num(p.percent,1)+T('٪','%'); } },tipBase),
      series:[{ type:'pie', radius:['42%','70%'], label:{ color:TX, fontFamily:FONT, formatter:function(p){ return num(p.percent,0)+T('٪','%'); } }, data:items }] };
  } else {
    var cats=res.hist?res.buckets:res.labels[fa()?'fa':'en'], n=cats.length, ser=[], meta={};
    var stack=(A.viz==='area'||A.viz==='stackbar')&&!res.hist, bar=res.hist||A.viz==='column'||A.viz==='stackbar';
    var cmp=canDrawCompare(A)?A.compare:[], pct=cmp.length&&A.cmpMode==='pct';
    /* the last bucket is still collecting: draw it dotted (current series only — compare periods are complete) */
    function dotted(base, vals, c, nm){
      ser.push(Object.assign({}, base, { data:vals.map(function(v,i){ return i===n-1?null:v; }) }));
      ser.push({ name:nm+'​', type:'line', data:vals.map(function(v,i){ return i>=n-2?v:null; }), symbol:'none', lineStyle:{ width:2, type:'dotted', color:c }, itemStyle:{ color:c }, silent:true, tooltip:{ show:false } });
    }
    var relPct=stack&&A.ui.stackPct&&stackPctOk();
    if(relPct){ var sums=cats.map(function(c0,i){ return list.reduce(function(a,x){ return a+(x.values[i]||0); },0)||1; });
      list=list.map(function(x){ return Object.assign({}, x, { values:x.values.map(function(v,i){ return +(v/sums[i]*100).toFixed(1); }) }); }); }
    list.forEach(function(s){
      var c=lastColors[s.key], nm=sname(s);
      if(pct){ /* % change mode: the chart plots the change itself, one line per comparison */
        cmp.forEach(function(m){ var p=past(A,s,m), cn=nm+' ('+T(cmpInfo(m)[0],cmpInfo(m)[1])+')';
          var vals=s.values.map(function(v,i){ return p.values[i]?+((v-p.values[i])/p.values[i]*100).toFixed(1):null; });
          meta[cn]={ s:s, m:m, p:p };
          var base={ name:cn, type:'line', symbol:'circle', symbolSize:4, lineStyle:{ width:2, color:c, type:cmpInfo(m)[2] }, itemStyle:{ color:c }, emphasis:{ focus:'series' } };
          if(n>2 && !res.complete) dotted(base, vals, c, cn); else ser.push(Object.assign(base,{ data:vals })); });
        return;
      }
      var base={ name:nm, type:bar?'bar':'line', stack:stack?'all':undefined, itemStyle:{ color:c }, emphasis:{ focus:'series' }, barMaxWidth:28,
        label:A.ui.labels&&!stack?{ show:true, position:'top', color:MU, fontFamily:FONT, fontSize:10, formatter:function(p){ return p.value==null?'':compact(p.value); } }:undefined };
      meta[nm]={ s:s };
      if(!bar){
        base.symbol='circle'; base.symbolSize=5; base.lineStyle={ width:2, color:c }; if(A.viz==='area') base.areaStyle={ opacity:.35, color:c };
        if(!stack && n>2 && !res.complete) dotted(base, s.values, c, nm); else ser.push(Object.assign(base, { data:s.values }));
      } else ser.push(Object.assign(base, { data:s.values }));
      cmp.forEach(function(m){ var p=past(A,s,m), cn=nm+' ('+T(cmpInfo(m)[0],cmpInfo(m)[1])+')';
        meta[cn]={ s:s, m:m, p:p };
        ser.push({ name:cn, type:'line', data:p.values, symbol:'none', lineStyle:{ width:1.5, type:cmpInfo(m)[2], color:c, opacity:.75 }, itemStyle:{ color:c }, emphasis:{ focus:'series' } }); });
    });
    var yFmt=function(v){ return pct?(v>0?'+':'')+num(v)+T('٪','%'):A.measure==='active'?num(v)+T('٪','%'):compact(v); };
    var yName=pct?T('تغییر (٪)','Change (%)'):(A.ui.ytitle||measLabel(A)), u=A.ui;
    ser.forEach(function(x){ x.clip=!u.yout; });
    /* annotations: vertical markers on their dates (project-wide), per visible category */
    var curR=window.RBH?RBH.current():-1, anns=res.hist||window.RB_HIDE_ANN/* ?m=1 cut: rb-m1.js, annotations ship later */?[]:ANNOTS.filter(function(a){ return !u.annOff[a.cat||''] && (a.chart==null||a.chart===curR); }), relm=res.hist||!window.RBAlerts?[]:RBAlerts.markers(res.R, n);
    var annR=anns.filter(function(a){ return a.p2!=null; }); anns=anns.filter(function(a){ return a.p2==null; });
    if(annR.length&&ser.length) ser[0].markArea={ silent:false, itemStyle:{ color:alpha(MU,0.08) }, label:{ color:TX, fontFamily:FONT, fontSize:10, position:'insideTop' },
      data:annR.map(function(a){ return [{ name:T(a.fa,a.en)+(a.desc?' — '+a.desc:''), xAxis:cats[Math.round(a.p*(n-1))] },{ xAxis:cats[Math.round(a.p2*(n-1))] }]; }) };
    /* 10b: releases mark time-series charts too (solid, in the accent colour), next to the dashed annotations */
    if((anns.length||relm.length)&&ser.length) ser[0].markLine={ silent:false, symbol:'none', lineStyle:{ color:MU, type:'dashed', width:1 },
      label:{ color:TX, fontFamily:FONT, fontSize:10, position:'insideEndTop', formatter:function(p){ return p.name; } },
      data:anns.map(function(a){ return { name:T(a.fa,a.en)+(a.desc?' — '+a.desc:''), xAxis:cats[Math.round(a.p*(n-1))] }; }).concat(relm.map(function(r){ return { name:'⚑ '+T(r.fa,r.en), xAxis:cats[r.idx], lineStyle:{ color:cs.getPropertyValue('--sh-c2').trim()||MU, type:'solid', width:1.5 } }; })) };
    /* PM 2026-10-25, RB-3: a faint band over each event's part of the chart before its collection start, labelled «جمع‌آوری از …» (one band per date) */
    if(!res.hist&&!pct&&res.R&&res.R.unit!=='hour'&&res.R.unit!=='minute'){ var bandK={};
      list.forEach(function(s){ if(!/^[A-J]$/.test(String(s.letter||''))) return; var e0=A.events[LET.indexOf(s.letter)], cs0=e0&&collStart(e0.id); if(!cs0) return;
        var k=0; while(k<n&&pointDate(res.R,k,n)<cs0) k++; if(!k||bandK[k]) return; bandK[k]=1;
        var tgt=ser.filter(function(x){ return x.name===sname(s); })[0]; if(!tgt) return;
        var item=[{ name:collLabel(cs0), xAxis:cats[0], itemStyle:{ color:alpha(MU,0.1) }, label:{ color:MU, fontFamily:FONT, fontSize:10, position:'insideTop' } },{ xAxis:cats[Math.min(n-1,k)] }];
        if(tgt.markArea) tgt.markArea.data.push(item); else tgt.markArea={ silent:true, data:[item] }; }); }
    /* anomaly band + flagged points + forecast (line charts only) */
    var catsX=cats.slice(), ZW='\u200b\u200b';
    if(anomOk()&&!res.hist){
      var fcN=fcPoints(res.R.unit);
      if(fcN){ var end=res.R.mode==='custom'?rEnd(res.R):new Date(2026,6,27), step=res.R.unit==='week'?7:res.R.unit==='month'?30.44:1;
        var ff=fa()?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long' }):new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' });
        for(var q=1;q<=fcN;q++){ var dd=new Date(end.getTime()+Math.round(q*step)*86400000); catsX.push(ff.format(dd)); } }
      list.slice(0,3).forEach(function(x,k){ var c=lastColors[x.key], an=anomaly(x.values, Object.assign({}, u.anom, { fc:fcN })), nm=sname(x);
        ser.push({ name:nm+ZW+'lo', type:'line', stack:'band'+k, data:an.lo, symbol:'none', lineStyle:{ opacity:0 }, silent:true, tooltip:{ show:false } });
        ser.push({ name:nm+ZW+'hi', type:'line', stack:'band'+k, data:an.hi.map(function(h,i){ return h-an.lo[i]; }), symbol:'none', lineStyle:{ opacity:0 }, areaStyle:{ color:c, opacity:.13 }, silent:true, tooltip:{ show:false } });
        ser.push({ name:T('ناهنجاری','Anomaly')+' · '+nm, type:'scatter', symbolSize:9, itemStyle:{ color:cs.getPropertyValue('--sh-bad').trim()||'#d33' }, data:x.values.map(function(v,i){ return an.flags[i]?v:null; }), z:5 });
        if(an.fc.length){ var lastI=x.values.length-1, pad=x.values.map(function(){ return null; });
          ser.push({ name:nm+' ('+T('پیش‌بینی','forecast')+')', type:'line', data:pad.slice(0,lastI).concat([x.values[lastI]]).concat(an.fc.map(function(f){ return +f.m.toFixed(1); })), symbol:'none', lineStyle:{ width:2, type:[8,4], color:c } });
          ser.push({ name:nm+ZW+'flo', type:'line', stack:'fc'+k, data:pad.concat(an.fc.map(function(f){ return f.lo; })), symbol:'none', lineStyle:{ opacity:0 }, silent:true, tooltip:{ show:false } });
          ser.push({ name:nm+ZW+'fhi', type:'line', stack:'fc'+k, data:pad.concat(an.fc.map(function(f){ return f.hi-f.lo; })), symbol:'none', lineStyle:{ opacity:0 }, areaStyle:{ color:c, opacity:.1 }, silent:true, tooltip:{ show:false } }); }
      });
    }
    var yFmtU=relPct||res.pctHist?function(v){ return num(v)+T('٪','%'); }:(u.yunit==='#'||pct?yFmt:unitFmt);
    opt={ grid:{ left:fa()?16:72, right:fa()?72:16, top:16, bottom:28, containLabel:false },
      tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:bar&&!pct?'shadow':'line' }, formatter:function(ps){
        var seen={}, rows=[], idx=ps.length?ps[0].dataIndex:0;
        ps.forEach(function(p){ if(p.seriesName.indexOf('​​')>-1) return; var nm=p.seriesName.replace('​',''); if(seen[nm]||p.value==null) return; seen[nm]=1;
          var mt=meta[nm]||{}, val; FMODE=mt.s&&mt.s.fmode!=null?mt.s.fmode:null;
          if(pct) val=fmtChange(A,p.value,'pct')+' <span style="color:'+MU+'">('+fmtVal(A,mt.s.values[idx])+' / '+fmtVal(A,mt.p.values[idx])+')</span>';
          else if(mt.m){ var d=change(mt.s.values[idx],p.value,A.cmpMode); val=fmtVal(A,p.value)+' <span style="color:'+MU+'">'+T('تغییر ','change ')+fmtChange(A,d,A.cmpMode)+'</span>'; }
          else val=fmtVal(A,p.value);
          rows.push('<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+p.color+';margin-inline-end:6px;opacity:'+(mt.m&&!pct?.6:1)+'"></span>'+esc(nm)+' <b>'+val+'</b>'); });
        var head=esc(ps.length?ps[0].axisValueLabel:'')+(!res.hist&&idx===n-1?' <span style="color:'+MU+'">('+T('هنوز در حال جمع‌آوری','still collecting')+')</span>':'');
        return head+'<br>'+rows.join('<br>'); } }, tipBase),
      xAxis:{ type:'category', data:catsX, inverse:fa(), boundaryGap:bar&&!pct, axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true } },
      /* counts start at 0; a change chart is centred on its own 0 line instead */
      yAxis:{ type:u.ylog&&!pct?'log':'value', logBase:10, min:pct?undefined:(u.ymin!==''?+u.ymin:(u.ylog?1:0)), max:relPct||res.pctHist&&A.ui.histMode==='cdf'?100:(u.ymax!==''&&!pct?+u.ymax:undefined), position:fa()?'right':'left',
        triggerEvent:true, name:relPct?T('سهم از کل (٪)','Share of total (%)'):res.pctHist?T('درصد کاربران','% of users'):yName, nameLocation:'middle', nameGap:fa()?54:54, nameRotate:fa()?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 },
        splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:yFmtU } },
      series:ser };
    if(pct) opt.series.push({ type:'line', data:[], markLine:{ silent:true, symbol:'none', label:{ show:false }, lineStyle:{ color:MU, type:'solid', width:1 }, data:[{ yAxis:0 }] } });
  }
  chart.setOption(opt);
  el.style.filter='saturate(.72)';
  /* clicking the Y axis opens its settings, as in Amplitude */
  chart.on('click', function(p){
    if(p.componentType==='yAxis'){ SET_OPEN='y'; render(); return; }
    if(p.componentType==='series' && !res.hist && A.viz!=='pie' && A.viz!=='bar' && !dragged) setTimeout(function(){ trendMicroscope(p, res, list); }, 0); });
  /* drag across the chart to zoom into a span of dates (Amplitude); a reset button brings the full range back */
  var dragged=false;
  if(!res.hist && A.viz!=='pie' && A.viz!=='bar' && n>4){
    chart.setOption({ dataZoom:[{ type:'inside', xAxisIndex:0, zoomOnMouseWheel:false, moveOnMouseMove:false, moveOnMouseWheel:false }] });
    var zr=chart.getZr(), box=el.parentNode, x0=null, sel=null;
    var idxAt=function(x){ var v=chart.convertFromPixel({ xAxisIndex:0 }, x); v=Array.isArray(v)?v[0]:v; return Math.max(0, Math.min(n-1, Math.round(+v||0))); };
    zr.on('mousedown', function(e){ x0=e.offsetX; dragged=false; });
    zr.on('mousemove', function(e){ if(x0==null) return; var dx=e.offsetX-x0; if(Math.abs(dx)<8) return; dragged=true;
      if(!sel){ sel=document.createElement('div'); sel.className='rbz-dragsel'; box.appendChild(sel); }
      sel.style.left=Math.min(x0,e.offsetX)+'px'; sel.style.width=Math.abs(dx)+'px'; sel.style.top='12px'; sel.style.height=(el.clientHeight-40)+'px'; });
    var finish=function(e){ if(x0==null) return; var x1=e&&e.offsetX!=null?e.offsetX:x0; if(sel){ sel.remove(); sel=null; }
      if(dragged){ var a=idxAt(x0), b=idxAt(x1), lo=Math.min(a,b), hi=Math.max(a,b); if(hi>lo){ chart.dispatchAction({ type:'dataZoom', startValue:lo, endValue:hi }); showReset(); } }
      x0=null; setTimeout(function(){ dragged=false; }, 50); };
    zr.on('mouseup', finish); zr.on('globalout', function(){ if(sel){ sel.remove(); sel=null; } x0=null; });
    var showReset=function(){ if(box.querySelector('.rbz-zoomreset')) return; var b=document.createElement('button'); b.type='button'; b.className='rbz-zoomreset sh-btn ghost compact'; b.textContent=T('بازنشانی بزرگ‌نمایی','Reset zoom');
      b.addEventListener('click', function(){ chart.dispatchAction({ type:'dataZoom', start:0, end:100 }); b.remove(); }); box.appendChild(b); };
  }
}
/* Microscope on a trend point: the people behind that number (Amplitude) */
/* PM 2026-10-28, RB-5: the input events (A, B…) of the formula behind a formula series, each with its own users at point i.
   A letter with a segment number (UNIQUES(A2)) is that event in that segment; otherwise the formula row's own segment. */
function inUsers(e, sg){ return within({ range:RB.Q.range, filters:RB.Q.filters, gran:A.interval }, function(){ return measure(Object.assign({}, A, { measure:'uniques' }), e, null, { def:sg }); }); }   /* the chart's own range, filters and interval */
var RB5_NONE=['این فرمول ورودی ایونتی ندارد','This formula has no event input'];
function formulaInputs(s, i){
  var f=formulas(A)[(parseInt(String(s.letter).slice(1),10)||1)-1], pr=parseSafe(f), segs=norm(A).segments, out=[], seen={};
  if(!pr) return out;
  (function walk(n){ if(!n) return; if(n.ev){ var k=n.ev+(n.seg||''), e=A.events[LET.indexOf(n.ev)], ev=e&&getEv(e.id);
      if(ev&&!seen[k]){ seen[k]=1; var sg=n.seg?segs[n.seg-1]:segs[s.seg||0], r=inUsers(e, sg), named=segs.length>1||!isDefaultSeg(sg);
        out.push({ s:{ key:s.key+'·'+k, letter:n.ev, name:e.label||T(ev.fa,ev.en), segName:named?segLabel(sg):'', group:'', values:r.v }, n:Math.round((r.v||[])[i]||0) }); } }
    walk(n.a); walk(n.b); })(pr.tree);
  return out.sort(function(a,b){ return a.s.key<b.s.key?-1:1; });
}
function trendMicroscope(p, res, list, inp){
  var nm=String(p.seriesName||'').replace(/\u200b/g,''), s=inp?inp.s:list.filter(function(x){ return seriesName(x)===nm; })[0]; if(!s||p.value==null) return;
  /* PM 2026-10-28, RB-5: a formula point offers the formula's input events (A, B…); each opens its own Microscope at the same point (replaces the disabled item of B8) */
  if(!inp&&/^F\d+$/.test(String(s.letter||''))){ var bx=$('rbzChart').parentNode; bx.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
    var fa0=document.createElement('span'); fa0.className='rbz-anchor'; fa0.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px'; bx.appendChild(fa0);
    var ins=formulaInputs(s, p.dataIndex);
    U.menu(fa0, [ { head:1, fa:seriesName(s), en:seriesName(s) }, { head:1, fa:'ایونت‌های این فرمول', en:'Events in this formula' } ].concat(ins.map(function(x){
      return { icon:'magnifying-glass', fa:x.s.letter+' · '+x.s.name+(x.s.segName?' · '+x.s.segName:''), en:x.s.letter+' · '+x.s.name+(x.s.segName?' · '+x.s.segName:''), hint:[num(x.n)+' کاربر', num(x.n)+' users'], fn:function(){ trendMicroscope(p, res, list, x); } }; }))
      .concat(ins.length?[]:[{ icon:'info', fa:RB5_NONE[0], en:RB5_NONE[1], disabled:true }]), 'start'); return; }
  var i=p.dataIndex, L=res.labels[fa()?'fa':'en'], day=L[i]||'', v=s.values[i]||0, n=inp?inp.n:A.measure==='uniques'?Math.round(v):Math.round(v*0.6);
  var e=A.events[LET.indexOf(s.letter)]||A.events[0], ev=e&&!DEF_EV[e.id]?e.id:'page_view';
  var lb=[ seriesName(s)+' · '+day, seriesName(s)+' · '+day ];
  var R=res.R, finer=R.unit==='month'?'week':R.unit==='week'?'day':R.unit==='day'?'hour':null, canZoom=finer&&RB.granAllowed(R.mode).indexOf(finer)>-1;
  var box=$('rbzChart').parentNode; box.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
  var a=document.createElement('span'); a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px'; box.appendChild(a);
  U.menu(a, [ { head:1, fa:seriesName(s)+' · '+day+' · '+num(n)+' کاربر', en:seriesName(s)+' · '+day+' · '+num(n)+' users' },
    { icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb, n, s.key+i); } },
    { icon:'user-circle', fa:'جریان ایونت‌های کاربران', en:'View user streams', disabled:RB.Q.unit==='org', hint:RB.Q.unit==='org'?['جریان ایونت برای هر آدم است؛ در شمارش سازمان‌ها، «دیدن این سازمان‌ها» را بزنید.','Streams are per person; when counting organizations, use “View these organizations”.']:null, fn:function(){ streamsModal(lb, n, s.key+i, ev); } },
    { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), hint:segInCohort()?UC7_HINT:null, fn:function(){ cohortModal(lb, n, ev); } },   /* PM 2026-10-25, UC-7 */
    { icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb, n, s.key+i); } },
    { sep:1 },
    { icon:'share-network', fa:'دیدن مسیر این کاربران', en:'Show user journeys', fn:function(){ openJourney(ev); } },
    { icon:'video-camera', fa:'تماشای ضبط جلسه‌ها', en:'Watch session replays', fn:function(){ openReplay({ label:T(lb[0],lb[1]), n:n, seed:s.key+i }); } },
    { icon:'magnifying-glass', fa:'بزرگ‌نمایی به بازهٔ ریزتر', en:'Zoom in', disabled:!canZoom, hint:canZoom?null:['برای این بازهٔ زمانی ریزتر از این نمی‌شود','No finer interval for this range'], fn:function(){ A.interval=finer; changed(); } }]
    /* 10b: Root Cause Analysis on an anomalous point (Event Segmentation only, no formulas), and a release from the Microscope */
    .concat(window.RBAlerts?[{ sep:1 },
      { icon:'magnifying-glass', fa:'تحلیل علت ریشه‌ای', en:'Run root cause analysis', disabled:!rcaOk(s,i), hint:rcaOk(s,i)?null:['اول «ناهنجاری و پیش‌بینی» را روشن کنید و روی نقطهٔ ناهنجار بزنید؛ روی فرمول نیست','Turn on Anomaly & forecast and click an anomalous point; not on formulas'],
        fn:function(){ RBAlerts.rca({ label:seriesName(s)+' · '+day, date:pointDate(res.R, i, res.labels.fa.length), seed:s.key+i, groupBy:function(p){ if(A.events.length){ setGb([p])/* PM 2026-10-31, outcome 1: B04 — the root-cause breakdown is chart-wide */; A.sel=null; changed(); } } }); } },
      { icon:'tag', fa:'ساختن انتشار در این روز', en:'Create a release on this day', fn:function(){ RBAlerts.relModal(pointDate(res.R, i, res.labels.fa.length)); } }]:[]).concat(inp?[]:[   /* PM 2026-10-28, RB-5: a formula input isn't a drawn series, so it has no series filter */
    { sep:1 },
    { icon:'funnel', fa:'فقط همین سری', en:'Filter by this series', fn:function(){ A.sel={}; A.sel[s.key]=true; hidden={}; changed(); } },
    { icon:'x', fa:'حذف این سری از نمودار', en:'Exclude this series', fn:function(){ A.sel[s.key]=false; changed(); } } ]), 'start');
}
/* Block C (2026-10-24): every replay link opens session-replay v8 on a session behind the clicked number, naming where it came from */
var REPLAY_IDS=['6793D021','6793D022','6793D023','6793D024','6793D025'];
function replayUrl(o){ o=o||{}; var q=['from='+encodeURIComponent(o.label||'')], sid=o.session||REPLAY_IDS[RB.hstr(String(o.seed||o.label||'x'))%REPLAY_IDS.length];
  q.push('session='+encodeURIComponent(sid)); if(o.user) q.push('user='+encodeURIComponent(o.user)); if(o.n) q.push('n='+Math.round(o.n)); return '../session-replay/v8.html?'+q.join('&'); }
function openReplay(o){ window.open(replayUrl(o), '_blank', 'noopener'); }
/* PM 2026-10-31, outcome 1: B10 — a custom range ends where it was picked on the calendar (R.end); only the legacy 'custom' value of an
   old saved chart keeps its fixed 14 Tir end. Every axis, column head, band and comparison here reads the end through this. */
function rEnd(R){ var e=R&&R.end; return e?new Date(e.getFullYear(), e.getMonth(), e.getDate()):new Date(2026,6,5); }
function pointDate(R, i, n){ var end=R.mode==='custom'?rEnd(R):R.mode==='yesterday'?new Date(2026,6,26):new Date(2026,6,27), step=R.unit==='week'?7:R.unit==='month'?30.44:(R.unit==='hour'||R.unit==='minute')?0:1; return new Date(end.getTime()-Math.round((n-1-i)*step)*864e5); }
/* PM 2026-10-25, RB-3 / AC-7: No-Backfill. Each event's collection start (a demo stand-in for its first-seen date): the project began collecting on
   11 Ordibehesht 1405; the store's WooCommerce events (late) and the video pack arrived later; labelled events apply retroactively. Numbers never change. */
var COLL_PROJECT=new Date(2026,4,1);
function collStart(id){ var e=getEv(id); if(!e) return null; if(e.lab) return COLL_PROJECT; if(e.late&&e.grp==='ecom') return new Date(2026,6,13); if(e.late&&e.grp==='video') return new Date(2026,6,6); return COLL_PROJECT; }
function collLabel(d){ var f=fa()?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long', year:'numeric' }):new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric', year:'numeric' }); return T('جمع‌آوری از '+f.format(d),'Collecting since '+f.format(d)); }
/* the range's last and first day (the demo's today is 5 Mordad 1405; a custom range ends on 14 Tir) */
function rangeEnd(R){ return R.mode==='custom'?rEnd(R):R.mode==='yesterday'?new Date(2026,6,26):new Date(2026,6,27); }
function rangeFirst(R, back){ return new Date(rangeEnd(R).getTime()-((R.days||1)-1+(back||0))*864e5); }
/* AC-7: the note under lifecycle, impact and Compass when their range or look-back starts before the event's collection start */
function collNote(ev, from, fa_, en_){ var cs0=collStart(ev); if(!cs0||from>=cs0) return '';
  return '<div class="rbz-note">'+ic('info')+'<span class="rbz-tag">'+collLabel(cs0)+'</span> '+T(fa_,en_)+'</div>'; }
function rcaOk(s, i){ if(!anomOk()||A.measure==='formula') return false; var an=anomaly(s.values, A.ui.anom); return !!an.flags[i]; }
function drawKpis(res, list){
  var box=$('rbzKpis'); if(!box) return;
  if(!list.length){ box.innerHTML='<div class="sh-state"><div class="sh-state-title">'+T('سری‌ای انتخاب نشده','No series selected')+'</div></div>'; return; }
  var m=A.compare[0]||'prev'; /* same past() as the table, so the KPI delta and the Change column always agree */
  box.innerHTML=list.map(function(s){
    var p=past(A,s,m), ch=change(s.total,p.total,'pct'), up=ch>=0;
    return '<div class="rbz-kpi"><div class="k"><span class="rbz-sw" style="background:'+lastColors[s.key]+'"></span>'+esc(seriesName(s))+'</div>'+
      '<div class="v">'+fmtVal(A,s.total)+'</div><div class="d '+(ch==null?'':up?'up':'down')+'">'+(ch==null?'—':(up?'↑ ':'↓ ')+num(Math.abs(ch),1)+T('٪ ','% ')+T(cmpInfo(m)[3],cmpInfo(m)[4]))+'</div></div>'; }).join('');
}

/* ── interactions ── */
function wire(){
  var dq=$('rbzDacReq'); if(dq) dq.addEventListener('click', function(){ U.toast('درخواست دسترسی برای ادمین پروژه فرستاده شد','Access request sent to the project admin'); dq.disabled=true; });   /* Block C: DAC request access */
  root.querySelectorAll('[data-evpick]').forEach(function(b){ b.addEventListener('click', function(){ var k=+b.getAttribute('data-evpick'); eventPicker(function(id){ var g0=chartGb(); A.events[k].id=id; A.events[k].filters=[]; setGb(g0)/* PM 2026-10-31, outcome 1: B04 — a new identity clears the event's filters, not the chart's breakdown */; A.sel=null; changed(); }); }); });
  root.querySelectorAll('[data-evmore]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var k=+b.getAttribute('data-evmore');
    function mv(d){ var x=A.events.splice(k,1)[0]; A.events.splice(k+d,0,x); A.sel=null; changed(); }
    if(isRet()||isJourney()){ U.menu(b,[ { icon:'pencil-simple', fa:'تغییر نام در این نمودار…', en:'Rename in this chart…', fn:function(){ renameEvent(k); } },
      { icon:'trash', fa:'حذف', en:'Remove', danger:true, fn:function(){ A.events.splice(k,1); A.ret.sel=null; changed(); } } ]); return; }
    U.menu(b,[ { icon:'arrow-right', fa:'جابه‌جایی به بالا', en:'Move up', disabled:k===0, fn:function(){ mv(-1); } },
      { icon:'arrow-left', fa:'جابه‌جایی به پایین', en:'Move down', disabled:k===A.events.length-1, fn:function(){ mv(1); } },
      { icon:'pencil-simple', fa:'تغییر نام در این نمودار…', en:'Rename in this chart…', fn:function(){ renameEvent(k); } }].concat(isFunnel()?funnelStepItems(k,b):[]).concat([
      { icon:'plus', fa:'ترکیب با ایونت دیگر («یا»)…', en:'Combine events inline (OR)…', disabled:(A.events[k].or||[]).length>=4, fn:function(){ eventPicker(function(id){ var e=A.events[k]; e.or=(e.or||[]); if(id!==e.id&&e.or.indexOf(id)<0) e.or.push(id); A.sel=null; changed(); }); } },
      { icon:'floppy-disk', fa:'ذخیره به‌عنوان ایونت ترکیبی…', en:'Save as a combined event…', disabled:!(A.events[k].or||[]).length, hint:(A.events[k].or||[]).length?null:['اول یک ایونت را با «یا» ترکیب کنید','Combine an event inline first'], fn:function(){ saveCombined(k); } },
      { icon:'copy', fa:'تکرار این ایونت', en:'Duplicate', disabled:A.events.length>=MAX_EVENTS, fn:function(){ A.events.splice(k+1,0,clone(A.events[k])); A.sel=null; changed(); } },
      { icon:'trash', fa:'حذف', en:'Remove', danger:true, fn:function(){ var F=A.funnel; A.events.splice(k,1); if(F.optional===k) F.optional=-1; if(F.gb&&F.gb.k===k) F.gb=null; A.sel=null; changed(); } } ])); }); });
  root.querySelectorAll('[data-evadd]').forEach(function(add){ add.addEventListener('click', function(){ eventPicker(function(id){ A.events.push({ id:id, filters:[], groupBy:'' }); OPEN.ev=true; A.sel=null; changed(); },
    RB.Q.type==='trend'?{ onMetric:addMetricSeries }:null); }); });
  root.querySelectorAll('[data-modtog]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-modtog'); OPEN[id]=!OPEN[id]; render(); }); });
  root.querySelectorAll('[data-fadd]').forEach(function(b){ b.addEventListener('click', function(){ filterPicker(+b.getAttribute('data-fadd')); }); });
  root.querySelectorAll('[data-ordel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-ordel').split(':'); A.events[+p[0]].or.splice(+p[1],1); A.sel=null; changed(); }); });
  root.querySelectorAll('[data-fdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-fdel').split(':'); A.events[+p[0]].filters.splice(+p[1],1); changed(); }); });
  /* PM 2026-10-31, outcome 1: B04 — the chart-level «+ تفکیک» and its chips (data-gdel is the chip's place in the chart's list) */
  root.querySelectorAll('[data-gadd]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); if(b.disabled) return; groupMenu(b); }); });
  root.querySelectorAll('[data-gdel]').forEach(function(b){ b.addEventListener('click', function(){ var g=chartGb(); g.splice(+b.getAttribute('data-gdel')||0,1); setGb(g); A.sel=null; changed(); }); });
  var pc30=$('rbzPreColl30'); if(pc30) pc30.addEventListener('click', function(){   /* PM 2026-10-31, outcome 1: B10 — the pre-collection state's way out */
    var r=filterNode&&filterNode.querySelector('input[name="drRange"][value="30d"]'), lb=filterNode&&filterNode.querySelector('.sh-dr-label');
    RB.Q.range='30d'; if(r) r.checked=true; if(lb) lb.textContent=T('۳۰ روز اخیر','Last 30 Days'); RB.renderActive(); });
  root.querySelectorAll('input[name="rbzMeas"]').forEach(function(r){ r.addEventListener('change', function(){ A.measure=r.value;
    if(isHist(A)===false && A.viz==='pie' && !additive(A)) A.viz='line'; changed(); }); });
  var pa=$('rbzPagg'); if(pa) pa.addEventListener('change', function(){ A.pagg=pa.value; if(A.viz==='pie'&&!additive(A)) A.viz='line'; changed(); });
  var pr=$('rbzProp'); if(pr) pr.addEventListener('change', function(){ A.prop=pr.value; changed(); });
  var vz=$('rbzViz'); if(vz) vz.addEventListener('click', function(e){ e.stopPropagation(); U.menu(vz, VIZ.map(function(v){
    var noPie=(v[0]==='pie'&&!additive(A))||(['pie','area','stackbar'].indexOf(v[0])>-1&&anyMulti(A)), overlap=v[0]==='pie'&&A.segments.length>1;
    return { icon:v[3], fa:v[1]+(A.viz===v[0]?' ✓':''), en:v[2]+(A.viz===v[0]?' ✓':''), disabled:noPie||overlap,
      hint:noPie?(anyMulti(A)?['یک بازدید زیر چند برچسب شمرده می‌شود و سهم‌ها روی هم می‌افتند؛ نمودار خطی یا میله‌ای را به کار ببرید','A view counts under several tags, so the shares overlap; use a line or bar chart']:['فقط برای «تعداد دفعات» و «مجموع ویژگی»؛ کاربران و درصدها جمع‌پذیر نیستند','Only for Event totals and property sums; users and shares don’t add up']):overlap?['گروه‌ها هم‌پوشانی دارند و سهم‌هایشان جمع ۱۰۰٪ نمی‌شود','Segments overlap, so their shares don’t add up to 100%']:null,
      fn:function(){ A.viz=v[0]; trimSel(); changed(); } }; }), 'start'); });
  /* PM 2026-10-28, TD-11: hourly and minute intervals (and the realtime ranges) carry no «نیازمند توسعه» tag; the user picks the resolution.
     (The «ایونت‌های زنده» list had its own tag; PM 2026-10-28, LX-6 removed it — the report builder is Backlog.) */
  var gr=$('rbzGran'); if(gr) gr.addEventListener('click', function(e){ e.stopPropagation(); var mode=RB.rangeInfo().mode, ok=RB.granAllowed(mode);
    U.menu(gr, Object.keys(GRAN).map(function(g){ var allowed=g==='auto'||ok.indexOf(g)>-1;
      return { fa:GRAN[g][0]+(A.interval===g?' ✓':''), en:GRAN[g][1]+(A.interval===g?' ✓':''), disabled:!allowed,
        hint:allowed?null:['برای این بازهٔ زمانی در دسترس نیست','Not available for this date range'], fn:function(){ A.interval=g; changed(); } }; }), 'start'); });
  root.querySelectorAll('[data-sel]').forEach(function(c){ c.addEventListener('change', function(){ var k=c.getAttribute('data-sel');
    var count=Object.keys(A.sel).filter(function(x){ return A.sel[x]; }).length;
    var cap=selCap();
    if(c.checked && count>=cap){ c.checked=false; U.toast('حداکثر '+num(cap)+' سری هم‌زمان رسم می‌شود','Up to '+cap+' series are drawn at once'); return; }
    A.sel[k]=c.checked; draw(lastRes); if(window.RBH&&RBH.dirty) RBH.dirty(true); }); });
  var csv=$('rbzCsv'); if(csv) csv.addEventListener('click', exportCsv);
  wireSegments(); wireCompare(); wireFunnel(); wireRet(); wireJourney(); wireMex(); wireS8(); wireS8b(); wireS8c(); wireTable(); tplButton(); wireBatch1(); wireBatch2(); wireSettings();
}
/* batch 1 (2026-10-12): Amplitude-parity controls */
function wireBatch1(){
  var q=function(sel){ return root.querySelector(sel); };
  root.querySelectorAll('[data-meas]').forEach(function(b){ b.addEventListener('click', function(e){ var m=b.getAttribute('data-meas');
    if(m==='formula'&&A.measure!=='formula'&&!A.formula) A.formula=A.events.length>1?'TOTALS(B)/UNIQUES(A)':'TOTALS(A)/UNIQUES(A)';
    if(m!=='prop'){ A.measure=m; if(A.viz==='pie'&&!additive(A)) A.viz='line'; if(A.adv.fn==='cumulative'&&ratioMeasure(A)) A.adv.fn='none'; changed(); return; }
    e.stopPropagation(); var items=[];
    Object.keys(NUMP).filter(function(p){ return RB.PROPS[p]; }).forEach(function(p){ var P=RB.PROPS[p]; items.push({ head:1, fa:P.fa, en:P.en });
      Object.keys(PAGG).forEach(function(k){ var on=A.measure==='prop'&&A.prop===p&&A.pagg===k;
        items.push({ fa:PAGG[k][0]+' '+P.fa+(on?' ✓':''), en:PAGG[k][1]+' '+P.en+(on?' ✓':''), fn:function(){ A.measure='prop'; A.prop=p; A.pagg=k; if(A.viz==='pie'&&!additive(A)) A.viz='line'; changed(); } }); }); });
    U.menu(b, items, 'start'); }); });
  var adv=$('rbzAdv'); if(adv) adv.addEventListener('click', function(e){ e.stopPropagation(); var a=A.adv, noCum=ratioMeasure(A)||isHist(A), segd=A.segments.some(function(g){ return g.cohort||g.performed; }), rollOn=a.fn==='rolling'||a.fn==='window';
    U.menu(adv, [ { fa:'هیچ‌کدام'+(a.fn==='none'?' ✓':''), en:'None'+(a.fn==='none'?' ✓':''), fn:function(){ a.fn='none'; changed(); } },
      { head:1, fa:'میانگین متحرک', en:'Rolling average' } ].concat([3,7,14,30].map(function(n){ var on=a.fn==='rolling'&&a.n===n;
        return { fa:num(n)+' بازه'+(on?' ✓':''), en:n+' intervals'+(on?' ✓':''), disabled:isHist(A), fn:function(){ a.fn='rolling'; a.n=n; changed(); } }; })).concat([{ head:1, fa:'پنجرهٔ متحرک (جمعِ چند بازه)', en:'Rolling window (sum of intervals)' }]).concat([7,30].map(function(n){ var on=a.fn==='window'&&a.n===n;
        return { fa:num(n)+' بازه'+(on?' ✓':''), en:n+' intervals'+(on?' ✓':''), disabled:noCum, hint:noCum?['برای درصدها و میانگین‌ها معنا ندارد','Not meaningful for shares and averages']:['کاربران هر پنجره یک بار شمرده می‌شوند','Users in each window count once'], fn:function(){ a.fn='window'; a.n=n; changed(); } }; })).concat(segd?[{ head:1, fa:'فیلتر کوهورت در پنجرهٔ متحرک', en:'Cohort filter in rolling windows' },
        { fa:'پس از فیلتر کوهورت'+(a.cf!=='before'?' ✓':''), en:'After cohort filter'+(a.cf!=='before'?' ✓':''), disabled:!rollOn, hint:rollOn?['اول گروه اعمال می‌شود، بعد جمع پنجره','The segment first, then the window sum']:['اول میانگین یا پنجرهٔ متحرک را انتخاب کنید','Pick a rolling average or window first'], fn:function(){ a.cf='after'; changed(); } },
        { fa:'پیش از فیلتر کوهورت'+(a.cf==='before'?' ✓':''), en:'Before cohort filter'+(a.cf==='before'?' ✓':''), disabled:!rollOn, hint:rollOn?['اول جمع پنجره روی همه، بعد اعمال گروه','The window sum on everyone, then the segment']:null, fn:function(){ a.cf='before'; changed(); } }]:[]).concat([{ sep:1 },
      { fa:'تجمعی'+(a.fn==='cumulative'?' ✓':''), en:'Cumulative'+(a.fn==='cumulative'?' ✓':''), disabled:noCum, hint:noCum?['برای درصدها و میانگین‌ها معنا ندارد','Not meaningful for shares and averages']:['کاربران تجمعی هر نفر را یک بار می‌شمارد','Cumulative users count each person once'], fn:function(){ a.fn='cumulative'; changed(); } } ]), 'start'); });
  var fx=$('rbzFormula'); if(fx) fx.addEventListener('change', function(){ A.formula=fx.value.trim(); A.sel=null; changed(); });
  var ad=q('[data-advdel]'); if(ad) ad.addEventListener('click', function(){ A.adv.fn='none'; changed(); });
  var who=$('rbzWho'); if(who) who.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(who, Object.keys(WHO).map(function(w){ var on=A.segments[0].who===w; return { fa:WHO[w][0]+(on?' ✓':''), en:WHO[w][1]+(on?' ✓':''), fn:function(){ A.segments.forEach(function(sg){ sg.who=w; }); changed(); } }; }), 'start'); });
  var un=$('rbzUnit'); if(un) un.addEventListener('click', function(e){ e.stopPropagation();
    var org=A.unit==='org', none=!(RB.ORG&&(RB.ORG[RB.PROJECT||0]||{}).share);
    U.menu(un, [ { fa:'کاربران'+(org?'':' ✓'), en:'Users'+(org?'':' ✓'), fn:function(){ if(A.unit!=='org') return; A.unit='users'; changed(); } },
      { fa:'سازمان‌ها'+(org?' ✓':''), en:'Organizations'+(org?' ✓':''), disabled:none, hint:none?['این پروژه هنوز سازمانی با group() نفرستاده','This project hasn’t sent any organization with group() yet']:['هر سازمان یک بار شمرده می‌شود، هر چند نفرش ایونت را انجام داده باشند','Each organization counts once, however many of its members did the event'], fn:function(){ A.unit='org'; changed(); } } ], 'start'); });
  var sv=$('rbzSaved'); if(sv) sv.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(sv, [ { head:1, fa:'گروه‌های ذخیره‌شده', en:'Saved segments' } ].concat(SAVED_SEGS.map(function(g){ return { icon:'users-three', fa:g.fa+(DEFAULT_SEG===g.id?' · پیش‌فرض':''), en:g.en+(DEFAULT_SEG===g.id?' · default':''),
        fn:function(){ A.segments[0]=Object.assign(clone(g.def),{ label:T(g.fa,g.en) }); segChanged(); } }; })).concat([{ sep:1 },
      { icon:'floppy-disk', fa:'ذخیرهٔ گروه ۱…', en:'Save segment 1…', fn:function(){ saveSegModal(0); } },
      { icon:'star', fa:'پیش‌فرض کردن گروه ۱', en:'Set segment 1 as default', fn:function(){ var id=saveSeg(0, segLabel(A.segments[0])); DEFAULT_SEG=id; U.toast('گروه ۱ پیش‌فرض گزارش‌های تازه شد','Segment 1 is now the default for new reports'); } } ]), 'start'); });
  var lv=q('[data-live]'); if(lv) lv.addEventListener('click', liveModal);
  var st=$('rbzSet'); if(st) st.addEventListener('click', function(){ SET_OPEN=SET_OPEN?null:'root'; render(); });
  var smp=$('rbzSampled'); if(smp) smp.addEventListener('click', function(){ SET_OPEN='sample'; render(); });
  var rf=$('rbzRefresh'); if(rf) rf.addEventListener('click', refreshData);
  var tn=$('rbzTopN'); if(tn) tn.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(tn, [3,5,10,20,30,0].map(function(n){ var on=A.ui.topN===n; return { fa:(n?num(n)+' ردیف برتر':'همه ردیف‌ها')+(on?' ✓':''), en:(n?'Top '+n:'All rows')+(on?' ✓':''), fn:function(){ A.ui.topN=n; changed(); } }; }), 'start'); });
  var ra=$('rbzRowAgg'); if(ra) ra.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(ra, Object.keys(ROWAGG).map(function(k){ var ok=rowAggOk(k), on=A.ui.rowAgg===k;
      return { fa:ROWAGG[k][0]+(on?' ✓':''), en:ROWAGG[k][1]+(on?' ✓':''), disabled:!ok, hint:ok?null:['کاربران و درصدهای روزانه جمع‌پذیر نیستند','Daily users and shares don’t add up'], fn:function(){ A.ui.rowAgg=k; changed(); } }; }), 'start'); });
  var tq=$('rbzTblQ'); if(tq) tq.addEventListener('input', function(){ var t=tq.value.trim().toLowerCase();
    root.querySelectorAll('.rbz-table tbody tr').forEach(function(tr){ tr.hidden=!!t && (tr.getAttribute('data-q')||'').indexOf(t)<0; }); });
  var sa=$('rbzSelAll'); if(sa){ var boxes=[].slice.call(root.querySelectorAll('[data-sel]')); sa.checked=boxes.length&&boxes.every(function(b){ return b.checked; });
    sa.addEventListener('change', function(){ var cap=selCap(), n=0; A.sel={};
      if(sa.checked) boxes.forEach(function(b){ if(n<cap&&!b.closest('tr').hidden){ A.sel[b.getAttribute('data-sel')]=true; n++; } });
      if(sa.checked&&boxes.length>cap) U.toast('حداکثر '+num(cap)+' سری هم‌زمان رسم می‌شود','Up to '+cap+' series are drawn at once');
      changed(); }); }
  root.querySelectorAll('[data-leg]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-leg'); hidden[k]=!hidden[k]; b.classList.toggle('off', !!hidden[k]); draw(lastRes); }); });
  root.querySelectorAll('[data-legnav]').forEach(function(b){ b.addEventListener('click', function(){ var lg=$('rbzLegend'); if(lg) lg.scrollBy({ left:(fa()?-1:1)*(+b.getAttribute('data-legnav'))*lg.clientWidth*0.8, behavior:'smooth' }); }); });
}
function wireBatch2(){
  root.querySelectorAll('[data-hmode]').forEach(function(b){ b.addEventListener('click', function(){ A.ui.histMode=b.getAttribute('data-hmode'); changed(); }); });
  root.querySelectorAll('[data-spct]').forEach(function(b){ b.addEventListener('click', function(){ A.ui.stackPct=b.getAttribute('data-spct')==='true'; changed(); }); });
}
function refreshData(){ render();   /* PM 2026-10-28, RB-15: no freshness label to update */ U.toast('داده تازه شد','Data refreshed'); }
function saveSeg(si, name){ var id='ss'+(SAVED_SEGS.length+1)+'_'+Date.now().toString(36), d=clone(A.segments[si]); delete d.label; SAVED_SEGS.push({ id:id, fa:name, en:name, def:d }); return id; }
function saveSegModal(si){
  U.modal({ fa:'ذخیرهٔ گروه', en:'Save segment', subFa:'گروه ذخیره‌شده برای همهٔ اعضای پروژه در «ذخیره‌شده‌ها» دیده می‌شود.', subEn:'A saved segment appears under “Saved” for everyone in the project.',
    body:'<div class="rbx-field"><label>'+T('نام گروه','Segment name')+'</label><input class="sh-input" id="rbzSsN" value="'+esc(segLabel(A.segments[si]))+'"/></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var nm=bd.querySelector('#rbzSsN').value.trim(); if(!nm){ U.toast('نام گروه را بنویسید','Name the segment'); return false; }
      saveSeg(si, nm); A.segments[si].label=nm; U.toast('گروه «'+nm+'» ذخیره شد','Segment “'+nm+'” saved'); changed(); } }] });
}
function yAxisModal(){
  var u=A.ui;
  U.modal({ fa:'محور عمودی', en:'Y-axis', subFa:'خالی بگذارید تا خودکار تنظیم شود؛ محور شمارش‌ها همیشه از صفر شروع می‌شود مگر کمینه را خودتان بدهید.', subEn:'Leave empty for automatic; count axes start at zero unless you set a minimum.',
    body:'<div class="rbx-field"><label>'+T('عنوان محور','Axis title')+'</label><input class="sh-input" id="rbzYt" value="'+esc(u.ytitle)+'" placeholder="'+esc(measLabel(A))+'"/></div>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('کمینه','Minimum')+'</label><input class="sh-input" id="rbzYmin" type="number" value="'+esc(u.ymin)+'"/></div>'+
      '<div class="rbx-field" style="flex:1"><label>'+T('بیشینه','Maximum')+'</label><input class="sh-input" id="rbzYmax" type="number" value="'+esc(u.ymax)+'"/></div></div>',
    actions:[{ fa:'بازنشانی', en:'Reset', ghost:true, fn:function(){ u.ytitle=''; u.ymin=''; u.ymax=''; changed(); } },{ fa:'اعمال', en:'Apply', fn:function(bd){ u.ytitle=bd.querySelector('#rbzYt').value.trim(); u.ymin=bd.querySelector('#rbzYmin').value; u.ymax=bd.querySelector('#rbzYmax').value; changed(); } }] });
}
/* Live events: the last few seconds of raw events arriving for the project (sample stream) */
/* one arriving event; shared with the classic Home's live panel (rb-shell.js) */
function liveOne(){ var C=RB.PROPS.city.vals, D=RB.PROPS.device_type.vals, E=RB.EVENTS.filter(function(e){ return e.w>0&&!e.inactive; }); if(!E.length) E=RB.EVENTS; var e=E[Math.floor(Math.random()*E.length)];
  return { e:e, id:'anon-'+Math.floor(Math.random()*0xffffff).toString(16), c:C[Math.floor(Math.random()*C.length)], d:D[Math.floor(Math.random()*D.length)], t:Date.now() }; }
function liveModal(){
  var timer=null, rows=[], one=liveOne;
  for(var i=0;i<8;i++) rows.push(one());
  U.modal({ fa:'ایونت‌های زنده', en:'Live events', subFa:'ایونت‌هایی که همین حالا از سایت شما می‌رسند، پیش از پردازش آرشیو. '+devTag(LIVE_DEV[0],LIVE_DEV[1]), subEn:'Events arriving from your site right now, before archive processing. '+devTag(LIVE_DEV[0],LIVE_DEV[1]), wide:true,   /* PM 2026-10-25, live-events tag */
    body:'<div class="sh-table-wrap" style="max-height:380px;overflow:auto"><table class="sh-table"><thead><tr><th>'+T('زمان','Time')+'</th><th>'+T('ایونت','Event')+'</th><th>'+T('شناسهٔ کاربر','User ID')+'</th><th>'+T('شهر','City')+'</th><th>'+T('نوع دستگاه','Device type')+'</th></tr></thead><tbody id="rbzLive"></tbody></table></div>',
    init:function(bd){ var tb=bd.querySelector('#rbzLive');
      function paint(){ if(!document.body.contains(tb)){ clearInterval(timer); return; }
        tb.innerHTML=rows.map(function(r){ var sAgo=Math.max(0,Math.round((Date.now()-r.t)/1000));
          return '<tr><td>'+(sAgo<2?T('همین حالا','just now'):T(num(sAgo)+' ثانیه پیش',sAgo+' s ago'))+'</td><td>'+esc(T(r.e.fa,r.e.en))+' <code dir="ltr">'+esc(r.e.id)+'</code></td><td dir="ltr">'+r.id+'</td><td>'+esc(dacVal('city', r.c))+'</td><td>'+esc(dacVal('device_type', r.d))+'</td></tr>'; }).join(''); }   /* PM 2026-10-25, LX-15: a member or viewer sees Personal values masked here too */
      paint(); timer=setInterval(function(){ rows.unshift(one()); rows=rows.slice(0,40); paint(); }, 1400); },
    actions:[{ fa:'بستن', en:'Close', ghost:true, fn:function(){ clearInterval(timer); } }] });
}
function segChanged(){ A.sel=null; changed(); }
function wireSegments(){
  root.querySelectorAll('[data-segwho]').forEach(function(x){ x.addEventListener('change', function(){ A.segments[+x.getAttribute('data-segwho')].who=x.value; changed(); }); });
  root.querySelectorAll('[data-seglabel]').forEach(function(x){ x.addEventListener('change', function(){ A.segments[+x.getAttribute('data-seglabel')].label=x.value.trim().slice(0,40); changed(); }); });
  root.querySelectorAll('[data-segmore]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var si=+b.getAttribute('data-segmore');
    U.menu(b,[ { icon:'floppy-disk', fa:'ذخیره به‌عنوان گروه ذخیره‌شده…', en:'Save as a saved segment…', fn:function(){ saveSegModal(si); } },
      { icon:'x', fa:'پاک کردن شرط‌ها', en:'Clear conditions', fn:function(){ var w=A.segments[si].who; A.segments[si]=blankSeg(); A.segments[si].who=w; segChanged(); } },
      { icon:'copy', fa:'تکرار این گروه', en:'Duplicate', disabled:A.segments.length>=MAX_SEGMENTS, fn:function(){ var c=clone(A.segments[si]); c.label=''; A.segments.splice(si+1,0,c); segChanged(); } },
      { icon:'trash', fa:'حذف', en:'Remove', danger:true, disabled:A.segments.length<2, hint:A.segments.length<2?['دست‌کم یک گروه لازم است','At least one segment is required']:null, fn:function(){ A.segments.splice(si,1); segChanged(); } } ]); }); });
  var add=root.querySelector('[data-segadd]'); if(add) add.addEventListener('click', function(){ var ns=blankSeg(); ns.who=A.segments[0].who; A.segments.push(ns); if(A.viz==='pie') A.viz='line'; segChanged(); });
  root.querySelectorAll('[data-sfadd]').forEach(function(b){ b.addEventListener('click', function(){ var si=+b.getAttribute('data-sfadd');
    propFilterModal({ fa:'فیلتر روی گروه '+num(si+1), en:'Filter on segment '+(si+1), subFa:'روی ویژگی‌های کاربر و نشست؛ فقط همین گروه را محدود می‌کند.', subEn:'On user and session properties; narrows only this segment.' }, segProps(), function(f){ A.segments[si].filters.push(f); segChanged(); }); }); });
  root.querySelectorAll('[data-sfdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-sfdel').split(':'); A.segments[+p[0]].filters.splice(+p[1],1); segChanged(); }); });
  root.querySelectorAll('[data-spadd]').forEach(function(b){ b.addEventListener('click', function(){ performedModal(+b.getAttribute('data-spadd')); }); });
  root.querySelectorAll('[data-spdel]').forEach(function(b){ b.addEventListener('click', function(){ A.segments[+b.getAttribute('data-spdel')].performed=null; segChanged(); }); });
  root.querySelectorAll('[data-spedit]').forEach(function(b){ b.addEventListener('click', function(){ performedModal(+b.getAttribute('data-spedit')); }); });
  root.querySelectorAll('[data-spsave]').forEach(function(b){ b.addEventListener('click', function(){ savePerformedAsCohort(+b.getAttribute('data-spsave')); }); });
  /* C29 cohort picker (m2 design pass 2026-11-15): each saved cohort with its size (the one number everywhere), then «ساختن کوهورت»; a milestone cut narrows the list with window.RB_M_COHORT */
  root.querySelectorAll('[data-scadd]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var si=+b.getAttribute('data-scadd'), st=RBShell.cohortStore?RBShell.cohortStore():[],
      list=RBShell.cohorts().filter(function(c){ var o=st.filter(function(x){ return x.id===c.id; })[0]; return typeof window.RB_M_COHORT!=='function'||!o||window.RB_M_COHORT(o); });
    var mk=window.RBCohort&&RBCohort.open?[{ sep:1 },{ icon:'plus', fa:'ساختن کوهورت تازه…', en:'Create a new cohort…', fn:function(){ RBCohort.open(null); } }]:[];
    if(!list.length){ U.menu(b, [{ head:1, fa:'هنوز کوهورتی ذخیره نشده', en:'No saved cohorts yet', hint:['کوهورت بسازید تا این گروه را به اعضای آن محدود کنید','Create a cohort to narrow this segment to its members'] }].concat(mk.slice(1)), 'start'); return; }
    U.menu(b, [{ head:1, fa:'کوهورت‌های ذخیره‌شده'+coTag(), en:'Saved cohorts'+coTag() }].concat(list.map(function(c){ return { icon:'users-three', fa:c.fa, en:c.en, hint:[num(c.n)+' کاربر', num(c.n)+' users'], fn:function(){ A.segments[si].cohort=c.id; segChanged(); } }; })).concat(mk), 'start'); }); });
  root.querySelectorAll('[data-scdel]').forEach(function(b){ b.addEventListener('click', function(){ A.segments[+b.getAttribute('data-scdel')].cohort=''; segChanged(); }); });
  var gs=root.querySelector('[data-gsadd]'); if(gs) gs.addEventListener('click', function(e){ e.stopPropagation(); var items=[], last='';
    segProps().forEach(function(p){ var P=RB.PROPS[p], g=RB.PROP_GROUPS.filter(function(x){ return x[0]===P.grp; })[0];
      if(g&&g[0]!==last){ items.push({ head:1, fa:g[1], en:g[2], hint:g[3] }); last=g[0]; }
      items.push({ fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ A.groupSeg=p; segChanged(); } }); });
    U.menu(gs, items, 'start'); });
  var gd=root.querySelector('[data-gsdel]'); if(gd) gd.addEventListener('click', function(){ A.groupSeg=''; segChanged(); });
}
/* a small anchored popover (Amplitude's Compare / date panels); closes on outside click or Escape */
var popEl=null;
function closePop(){ if(!popEl) return; popEl.remove(); popEl=null; document.removeEventListener('mousedown', popOut, true); document.removeEventListener('keydown', popKey); }
function popOut(e){ if(popEl && !popEl.contains(e.target)) closePop(); }
function popKey(e){ if(e.key==='Escape') closePop(); }
function pop(anchor, html, onMount){
  closePop(); popEl=document.createElement('div'); popEl.className='rbz-pop'; popEl.setAttribute('dir', fa()?'rtl':'ltr'); popEl.innerHTML=html; document.body.appendChild(popEl);
  var r=anchor.getBoundingClientRect(), w=popEl.offsetWidth, left=fa()?r.right-w:r.left;
  popEl.style.left=Math.max(8, Math.min(innerWidth-w-8, left))+scrollX+'px'; popEl.style.top=(r.bottom+6+scrollY)+'px';
  setTimeout(function(){ document.addEventListener('mousedown', popOut, true); document.addEventListener('keydown', popKey); }, 0);
  if(onMount) onMount(popEl); U.i18n();
}
/* Compare ▾ → Amplitude's panel: up to two comparisons, each a preset or "N days earlier", with its date span; absolute or % change */
var CMP_PRESETS=['prev','day','week','month','quarter','year'];
function curRangeLabel(){ var R=within({ range:RB.Q.range, filters:[] }, function(){ return RB.rangeInfo(); }); return T(R.fa,R.en); }
function comparePanel(anchor){
  function html(){
    var rows=A.compare.map(function(m,i){ var custom=CMP_PRESETS.indexOf(m)<0;
      return '<div class="rbz-cmprow"><select class="sh-select" data-cmpsel="'+i+'">'+CMP_PRESETS.map(function(p){ return '<option value="'+p+'"'+(p===m?' selected':'')+'>'+T(cmpInfo(p)[0],cmpInfo(p)[1])+'</option>'; }).join('')+
        '<option value="custom"'+(custom?' selected':'')+'>'+T('دورهٔ دلخواه…','Custom period…')+'</option></select>'+
        (custom?'<span class="rbz-inl"><input class="sh-input" type="number" min="1" max="730" value="'+(+String(m).slice(1)||30)+'" data-cmpn="'+i+'"/>'+T('روز قبل','days earlier')+'</span>':'')+
        '<button class="rbz-ico" data-cmpdel="'+i+'" type="button" aria-label="'+T('حذف مقایسه','Remove comparison')+'">'+ic('x')+'</button>'+
        '<div class="rbz-cmpspan">'+esc(cmpRange(m))+'</div></div>'; }).join('');
    return '<div class="rbz-poph"><b>'+T('مقایسه با گذشته','Compare to past')+'</b><span class="rbx-tipdot"'+tip(SEG_TIPS.cmp[0],SEG_TIPS.cmp[1])+'></span></div>'+
      '<div class="rbz-popnow">'+T('بازهٔ فعلی: ','Current range: ')+esc(curRangeLabel())+'</div>'+
      (rows||'<div class="rbz-popempty">'+T('هنوز مقایسه‌ای اضافه نشده.','No comparison yet.')+'</div>')+
      '<button class="sh-btn ghost compact" id="rbzCmpAdd" type="button"'+(A.compare.length>=2?' disabled title="'+T('حداکثر دو مقایسه','Up to two comparisons')+'"':'')+'>'+ic('plus')+T('افزودن مقایسه','Add comparison')+'</button>'+
      '<div class="rbz-poph sm"><span>'+T('نمایش','Show as')+'</span></div><div class="rbz-seg2">'+[['abs','مقدار','Absolute'],['pct','درصد تغییر','% change']].map(function(x){ return '<button type="button" class="'+(A.cmpMode===x[0]?'on':'')+'" data-cmpmode="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>';
  }
  function mount(el){
    function redo(){ trimSel(); changed(); el.innerHTML=html(); mount(el); }
    el.querySelectorAll('[data-cmpsel]').forEach(function(x){ x.addEventListener('change', function(){ var i=+x.getAttribute('data-cmpsel'); A.compare[i]=x.value==='custom'?'c30':x.value; redo(); }); });
    el.querySelectorAll('[data-cmpn]').forEach(function(x){ x.addEventListener('change', function(){ A.compare[+x.getAttribute('data-cmpn')]='c'+Math.max(1,Math.min(730,parseInt(x.value,10)||30)); redo(); }); });
    el.querySelectorAll('[data-cmpdel]').forEach(function(x){ x.addEventListener('click', function(){ A.compare.splice(+x.getAttribute('data-cmpdel'),1); redo(); }); });
    el.querySelectorAll('[data-cmpmode]').forEach(function(x){ x.addEventListener('click', function(){ A.cmpMode=x.getAttribute('data-cmpmode'); redo(); }); });
    var ad=el.querySelector('#rbzCmpAdd'); if(ad) ad.addEventListener('click', function(){ var next=CMP_PRESETS.filter(function(p){ return A.compare.indexOf(p)<0; })[0]||'year'; A.compare.push(next); redo(); });
  }
  pop(anchor, html(), mount);
}
function wireCompare(){
  var b=$('rbzCmp'); if(!b) return;
  b.addEventListener('click', function(e){ e.stopPropagation(); comparePanel(b); });
}
/* extra date presets inside the (moved) unified date picker, builder only: today, yesterday, 60 / 90 days, last N days, since a date; plus "exclude the incomplete interval" */
var EXCL_CUR=false;
function extendDatePicker(){
  var body=filterNode&&filterNode.querySelector('[data-tab-body="range"]'); if(!body||body.__rbz) return; body.__rbz=true;
  var lbl=filterNode.querySelector('.sh-dr-label');
  function opt(v, f, e){ return '<label class="sh-radio rbz-extra"><input type="radio" name="drRange" value="'+v+'"/><span data-fa="'+f+'" data-en="'+e+'">'+T(f,e)+'</span></label>'; }
  body.insertAdjacentHTML('afterbegin', opt('today','امروز','Today')+opt('yesterday','دیروز','Yesterday'));
  /* phase 4c: realtime windows, for trends and data tables only (funnels, retention and journeys need whole days) */
  body.insertAdjacentHTML('afterbegin', '<div class="rbz-drlive"><b>'+T('لحظه‌ای','Realtime')+'</b>'+opt('m5','۵ دقیقهٔ اخیر','Last 5 minutes')+opt('m10','۱۰ دقیقهٔ اخیر','Last 10 minutes')+opt('m15','۱۵ دقیقهٔ اخیر','Last 15 minutes')+opt('m30','۳۰ دقیقهٔ اخیر','Last 30 minutes')+opt('today_sofar','امروز تا این ساعت','Today so far')+'</div>');
  var d30=body.querySelector('input[value="30d"]'); if(d30) d30.closest('label').insertAdjacentHTML('afterend', opt('60d','۶۰ روز اخیر','Last 60 Days')+opt('90d','۹۰ روز اخیر','Last 90 Days'));
  body.insertAdjacentHTML('beforeend', '<div class="rbz-drx"><label class="sh-radio rbz-extra"><input type="radio" name="drRange" value="nN"/><span>'+T('آخرین','Last')+'</span></label><input class="sh-input" id="rbzLastN" type="number" min="2" max="365" value="45"/><span>'+T('روز','days')+'</span></div>'+
    opt('since','از ۱ تیر تا امروز','Since Jun 22')+
    '<label class="rbz-ck rbz-drexcl"><input type="checkbox" id="rbzExcl"/>'+T('بدون بازهٔ ناقصِ جاری','Exclude the incomplete current interval')+'</label>');
  function apply(v, label){
    if(/^m\d+$|^today_sofar$/.test(v) && ['trend','table'].indexOf(RB.Q.type)<0){ U.toast('بازهٔ لحظه‌ای فقط برای روند و جدول داده است','Realtime windows are for trends and data tables only'); return; }
    RB.Q.range=v; if(lbl) lbl.textContent=label; RB.renderActive(); }
  body.querySelectorAll('.rbz-extra input').forEach(function(rb){ rb.addEventListener('change', function(){
    if(rb.value==='nN'){ var cap=chartFiltered()?TD10_MAX:365, n0=parseInt($('rbzLastN').value,10)||45, n=Math.max(2,Math.min(cap,n0));   /* PM 2026-10-28, TD-10 */
      if(n0>cap&&cap===TD10_MAX){ $('rbzLastN').value=n; U.toast(TD10_WHY[0],TD10_WHY[1]); }
      apply('n'+n, T(num(n)+' روز اخیر','Last '+n+' days')); return; }
    apply(rb.value, rb.parentNode.querySelector('span').textContent); }); });
  var ln=$('rbzLastN'); if(ln) ln.addEventListener('change', function(){ var r=body.querySelector('input[value="nN"]'); r.checked=true; r.dispatchEvent(new Event('change')); });
  var ex=$('rbzExcl'); if(ex) ex.addEventListener('change', function(){ EXCL_CUR=ex.checked; RB.renderActive(); });
  /* M1 Amplitude parity (2026-11-16): the trigger opens one date surface (RBShell.rangePanel) instead of the radio list. The radios,
     #rbzLastN and #rbzExcl stay the state's home: the panel reads them (a preset hidden by rb-m1.js, or disabled by the 93-day cap, is
     hidden or disabled there too) and «اعمال» writes back through them, so td10Gate, RBCal and rb-m1.js keep working unchanged. */
  var trg=filterNode.querySelector('.sh-dr-trigger');
  if(trg && RBShell.rangePanel) trg.addEventListener('click', function(e){ e.stopImmediatePropagation(); e.preventDefault();
    if(trg.getAttribute('aria-expanded')==='true'&&RBShell.rangePanelClose){ RBShell.rangePanelClose(); return; } openRangePanel(trg, body); }, true);
}
function openRangePanel(trg, body){
  td10Gate();
  var SKIP=['custom','nN','since'], presets=[];
  body.querySelectorAll('input[name="drRange"]').forEach(function(r){ if(SKIP.indexOf(r.value)>-1) return; var lb=r.closest('label'), lv=lb&&lb.closest('.rbz-drlive'); if(!lb||getComputedStyle(lb).display==='none'||(lv&&getComputedStyle(lv).display==='none')) return;   /* the list is closed, so visibility is read from display, not layout */
    var sp=lb.querySelector('span'), f=sp.getAttribute('data-fa')||sp.textContent, en=sp.getAttribute('data-en')||sp.textContent;
    presets.push({ v:r.value, fa:f, en:en, disabled:r.disabled, why:TD10_WHY }); });
  var rg=String(RB.Q.range), R=RB.rangeInfo(), cap=chartFiltered()?{ days:TD10_MAX, fa:TD10_WHY[0], en:TD10_WHY[1] }:null, m;
  var o={ presets:presets, excl:EXCL_CUR, cap:cap, mode:'preset', preset:rg,
    spanOf:function(v){ try{ return within({ range:v }, function(){ var x=RB.rangeInfo(); return x.start&&x.end?{ start:x.start, end:x.end }:null; }); }catch(err){ return null; } },
    onApply:applyRange };
  if((m=/^n(\d+)$/.exec(rg))){ o.mode='last'; o.n=+m[1]; }
  else if(/^s\d/.test(rg)){ o.mode='since'; o.from=R.start; }
  else if(/^c\d/.test(rg)||rg==='custom'){ o.mode='between'; o.from=R.start; o.to=R.end; }
  else if(!presets.some(function(p){ return p.v===rg; })){ o.mode='last'; o.n=R.days||30; }
  RBShell.rangePanel(trg, o);
}
function applyRange(r){
  var body=filterNode&&filterNode.querySelector('[data-tab-body="range"]'); if(!body) return;
  function fire(el){ el.dispatchEvent(new Event('change', { bubbles:true })); }
  var ex=$('rbzExcl'); if(ex&&ex.checked!==!!r.excl){ ex.checked=!!r.excl; fire(ex); }
  if(r.kind==='preset'){ var rb=body.querySelector('input[name="drRange"][value="'+r.v+'"]'); if(rb&&!rb.disabled&&RB.Q.range!==r.v){ rb.checked=true; fire(rb); } return; }
  if(r.kind==='last'){ var ln=$('rbzLastN'), nn=body.querySelector('input[value="nN"]'); if(ln) ln.value=r.n; if(nn){ nn.checked=true; fire(nn); } return; }
  var res=r.kind==='since'?RB.sinceRange(r.start):RB.customRange(r.start, r.end);
  if(!res) return; RB.Q.range=res.range;
  if(window.RBCal&&RBCal.show) RBCal.show(res.range); else { var lb=filterNode.querySelector('.sh-dr-label'); if(lb) lb.textContent=T(res.fa,res.en); }
  RB.renderActive(); render();
}
/* funnel step ⋮: break this step down (one per funnel), optional step (middle steps, one at a time) */
function funnelStepItems(k, anchor){
  var F=A.funnel, n=A.events.length, single=A.segments.length===1&&!A.groupSeg, mid=k>0&&k<n-1;
  return [ { icon:'squares-four', fa:'تفکیک این قدم…', en:'Break down this step…', disabled:!single||F.optional>0, hint:!single?['با چند گروه یا تفکیک گروه‌ها ممکن نیست','Not with several segments or a segment breakdown']:F.optional>0?['با قدم اختیاری ممکن نیست','Not with an optional step']:null,
      fn:function(){ setTimeout(function(){ var items=[], last=''; propsOf(A.events[k].id).filter(function(p){ return p!=='_hcount'; }).forEach(function(p){ var P=RB.PROPS[p], g=(RB.PROP_GROUPS.filter(function(x){ return x[0]===P.grp; })[0])||['own','ویژگی‌های همین ایونت','This event’s properties'];
        if(g[0]!==last){ items.push({ head:1, fa:g[1], en:g[2], hint:g[3] }); last=g[0]; } items.push({ fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ F.gb={ k:k, prop:p }; changed(); } }); }); U.menu(anchor, items, 'start'); }, 0); } },
    { icon:'swap', fa:'مقایسهٔ ایونت در این قدم…', en:'Compare events at this step…', disabled:!!F.gb||F.optional>0||!!A.groupSeg||(!F.cmpEv.some(function(c){ return c.k===k; })&&F.cmpEv.length>=2)||(F.cmpEv.filter(function(c){ return c.k===k; })[0]||{ ids:[] }).ids.length>=3,
      hint:F.gb||F.optional>0||A.groupSeg?['با تفکیک یا قدم اختیاری ممکن نیست','Not with a breakdown or an optional step']:['تا ۳ ایونت در ۲ قدم','Up to 3 events on 2 steps'],
      fn:function(){ eventPicker(function(id){ if(id===A.events[k].id) return; var c=F.cmpEv.filter(function(x){ return x.k===k; })[0]; if(!c){ c={ k:k, ids:[] }; F.cmpEv.push(c); } if(c.ids.indexOf(id)<0&&c.ids.length<3) c.ids.push(id); changed(); }); } },
    { icon:'info', fa:F.optional===k?'برداشتن «اختیاری»':'قدم اختیاری', en:F.optional===k?'Make required':'Optional step', disabled:!mid||!!F.gb||!single, hint:!mid?['فقط قدم‌های میانی','Middle steps only']:F.gb?['با تفکیک قدم ممکن نیست','Not with a step breakdown']:!single?['فقط با یک گروه','Single segment only']:null,
      fn:function(){ F.optional=F.optional===k?-1:k; changed(); } } ];
}
function saveCombined(k){
  var e=A.events[k], comps=[e.id].concat(e.or||[]);
  U.modal({ fa:'ذخیره به‌عنوان ایونت ترکیبی', en:'Save as a combined event', subFa:'ایونت ترکیبی دادهٔ تازه نمی‌سازد؛ تعریفی است که در همهٔ گزارش‌های پروژه مثل یک ایونت انتخاب می‌شود.', subEn:'A combined event creates no new data; it is a definition every report in the project can pick like one event.',
    body:'<input class="sh-input" id="rbzCbN" style="width:100%" value="'+esc(comps.map(evName).join(T(' یا ',' or ')))+'"/>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var nm=bd.querySelector('#rbzCbN').value.trim(); if(!nm){ U.toast('نام را بنویسید','Enter a name'); return false; }
      /* PM 2026-10-28: saved through the project's definitions (rb-data-defs), so it lasts and the events page can edit or delete it */
      var id; if(window.RBDefs){ var r=RBDefs.addEvent({ fa:nm, en:nm, src:'rb', comps:comps.map(function(c){ return { id:c, filters:[] }; }) }); if(r.err){ U.toast(r.err[0], r.err[1]); return false; } id=r.id; }
      else id=RB.addVirtual(nm, comps);
      e.id=id; e.or=[]; changed(); U.toast('ایونت ترکیبی «'+nm+'» ذخیره شد','Combined event “'+nm+'” saved'); } }] });
}
function renameEvent(k){
  var e=A.events[k];
  U.modal({ fa:'تغییر نام ایونت در این نمودار', en:'Rename event in this chart', subFa:'فقط نامِ نمایشیِ همین نمودار عوض می‌شود؛ نام ایونت در پروژه دست نمی‌خورد.', subEn:'Only this chart’s display name changes; the event itself keeps its name.',
    body:'<input class="sh-input" id="rbzEvLbl" style="width:100%" value="'+esc(e.label||'')+'" placeholder="'+esc(evName(e.id))+'"/>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ e.label=bd.querySelector('#rbzEvLbl').value.trim().slice(0,60); changed(); } }] });
}
function performedModal(si){
  var cur=Object.assign({ ev:'purchase', op:'gte', n:1, mode:'days', days:30, where:[], and:null, offset:0, rolling:0 }, A.segments[si].performed||{});
  var opts=function(sel){ return RB.EVENTS.filter(function(e){ return e.id===sel||!pickHidden(e); }).map(function(e){   /* PM 2026-10-25, RB-19: hidden or blocked events leave the list */ return '<option value="'+esc(e.id)+'"'+(e.id===sel?' selected':'')+'>'+esc(T(e.fa,e.en))+' · '+esc(e.id)+'</option>'; }).join(''); };
  var ops=function(sel){ return Object.keys(POPS).map(function(k){ return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+T(POPS[k][0],POPS[k][1])+'</option>'; }).join(''); };
  var w0=(cur.where||[])[0], wprops=function(ev){ return propsOf(ev).filter(function(p){ return RB.PROPS[p]&&!RB.PROPS[p].num; }); };
  var wpOpts=function(ev, sel){ return '<option value="">'+T('بدون شرط','No condition')+'</option>'+wprops(ev).map(function(p){ return '<option value="'+p+'"'+(sel===p?' selected':'')+'>'+esc(pOpt(p))+'</option>'; }).join(''); };
  var wvOpts=function(p, sel){ var P=RB.PROPS[p]; return P?P.vals.map(function(v){ return '<option value="'+esc(v[1])+'"'+(sel===v[1]?' selected':'')+'>'+esc(T(v[0],v[1]))+'</option>'; }).join(''):''; };
  U.modal({ fa:'انجام ایونت', en:'Performed event', subFa:'فقط کسانی که این ایونت را با این شرط انجام داده‌اند در گروه می‌مانند.', subEn:'Only people who performed this event under this condition stay in the segment.', wide:true,
    body:'<div class="rbx-field"><label>'+T('ایونت','Event')+'</label><select class="sh-select" id="rbzPe">'+opts(cur.ev)+'</select></div>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('شرط روی ایونت (where)','Where')+'</label><select class="sh-select" id="rbzPwp">'+wpOpts(cur.ev, w0&&w0.prop)+'</select></div>'+
      '<div class="rbx-field" style="flex:1"><label>'+T('مقدار','Value')+'</label><select class="sh-select" id="rbzPwv"'+(w0?'':' disabled')+'>'+(w0?wvOpts(w0.prop,(w0.vals||[])[0]):'')+'</select></div></div>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('شرط تعداد','Count')+'</label><select class="sh-select" id="rbzPo">'+ops(cur.op)+'</select></div>'+
      '<div class="rbx-field" style="flex:1"><label>'+T('چند بار','Times')+'</label><input class="sh-input" id="rbzPn" type="number" min="0" max="99" value="'+cur.n+'"/></div></div>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('چه زمانی','When')+'</label><select class="sh-select" id="rbzPm"><option value="days"'+(cur.mode==='days'?' selected':'')+'>'+T('در روزهای اخیر','In the last days')+'</option><option value="range"'+(cur.mode==='range'?' selected':'')+'>'+T('در بازهٔ گزارش','During the report’s range')+'</option><option value="each"'+(cur.mode==='each'?' selected':'')+'>'+T('در هر بازهٔ نمودار (in each)','In each interval')+'</option></select></div>'+
      '<div class="rbx-field" style="flex:1"><label>'+T('روز','Days')+'</label><input class="sh-input" id="rbzPd" type="number" min="1" max="365" value="'+cur.days+'"'+(cur.mode!=='days'?' disabled':'')+'/></div></div>'+
      '<details class="rbz-adv"'+(cur.and||cur.offset||cur.rolling?' open':'')+'><summary>'+T('پیشرفته','More options')+'</summary>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:2"><label>'+T('و کسانی که انجام داده‌اند','and who performed')+'</label><select class="sh-select" id="rbzPae"><option value="">'+T('هیچ','None')+'</option>'+opts(cur.and&&cur.and.ev)+'</select></div>'+
      '<div class="rbx-field" style="flex:1"><label>'+T('شرط تعداد','Count')+'</label><select class="sh-select" id="rbzPao">'+ops(cur.and?cur.and.op:'gte')+'</select></div><div class="rbx-field" style="flex:1"><label>'+T('چند بار','Times')+'</label><input class="sh-input" id="rbzPan" type="number" min="1" max="99" value="'+(cur.and?cur.and.n:1)+'"/></div></div>'+
      '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('پنجرهٔ متحرک (روز)','Rolling over (days)')+'</label><input class="sh-input" id="rbzPr" type="number" min="0" max="365" value="'+(cur.rolling||0)+'"/></div>'+
      '<div class="rbx-field" style="flex:1"><label>'+T('تأخیر (offset، روز)','Offset (days)')+'</label><input class="sh-input" id="rbzPof" type="number" min="0" max="365" value="'+(cur.offset||0)+'"/></div></div>'+
      '<p class="rbz-sethelp">'+T('پنجرهٔ متحرک و تأخیر فقط روی همین شرط گروه اثر دارند، نه روی ایونت نمودار؛ مثلاً «کسانی که اشتراک خریدند ولی در دو هفتهٔ بعد خبری نخواندند».','Rolling and offset apply only to this segment condition, not to the chart’s event; e.g. “people who bought a subscription but read no article in the next two weeks”.')+'</p></details>',
    init:function(bd){ var m=bd.querySelector('#rbzPm'), d=bd.querySelector('#rbzPd'), e=bd.querySelector('#rbzPe'), wp=bd.querySelector('#rbzPwp'), wv=bd.querySelector('#rbzPwv');
      m.addEventListener('change', function(){ d.disabled=m.value!=='days'; });
      e.addEventListener('change', function(){ wp.innerHTML=wpOpts(e.value,''); wv.innerHTML=''; wv.disabled=true; });
      wp.addEventListener('change', function(){ wv.innerHTML=wp.value?wvOpts(wp.value,''):''; wv.disabled=!wp.value; }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var g=function(id){ return bd.querySelector(id).value; }, n=Math.max(0,Math.min(99,parseInt(g('#rbzPn'),10)||0));
      A.segments[si].performed={ ev:g('#rbzPe'), op:g('#rbzPo'), n:n, mode:g('#rbzPm'), days:Math.max(1,Math.min(365,parseInt(g('#rbzPd'),10)||30)),
        where:g('#rbzPwp')&&g('#rbzPwv')?[{ prop:g('#rbzPwp'), op:'in', vals:[g('#rbzPwv')] }]:[],
        and:g('#rbzPae')?{ ev:g('#rbzPae'), op:g('#rbzPao'), n:Math.max(1,parseInt(g('#rbzPan'),10)||1) }:null,
        rolling:Math.max(0,parseInt(g('#rbzPr'),10)||0), offset:Math.max(0,parseInt(g('#rbzPof'),10)||0) }; segChanged(); } }] });
}
/* Amplitude: an inline cohort can be saved as a cohort for other charts */
function savePerformedAsCohort(si){
  var p=A.segments[si].performed; if(!p||!window.RBCohort) return;
  U.modal({ fa:'ذخیره به‌عنوان کوهورت', en:'Save as cohort', subFa:'شرط «انجام ایونت» این گروه به‌عنوان یک کوهورت پویا در فضای شخصی ذخیره می‌شود.', subEn:'This segment’s performed-event condition is saved as a dynamic cohort in your personal space.',
    body:coTagRow()+'<div class="rbx-field"><label>'+T('نام کوهورت','Cohort name')+'</label><input class="sh-input" id="rbzPcN" value="'+esc(perfLabel(p).slice(0,60))+'"/></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var nm=bd.querySelector('#rbzPcN').value.trim(); if(!nm){ U.toast('نام کوهورت را بنویسید','Name the cohort'); return false; }
      var cid=RBCohort.fromPerformed(p, nm); viewerCohort(cid);   /* PM 2026-10-25, UC-5: a viewer's saved segment cohort is personal and unlisted */
      if(!IS_VIEWER) U.toast('کوهورت «'+nm+'» ذخیره شد','Cohort “'+nm+'” saved'); render(); } }] });   /* UC-5: RBCohort.fromPerformed shows the viewer toast itself (one toast only) */
}
function exportCsv(){
  var r=lastRes; if(!r) return; var cols=r.hist?r.buckets:r.labels[fa()?'fa':'en'];
  var cm=r.hist?[]:A.compare;
  var lines=[[T('سری','Series'),T('کل بازه','Period')].concat(cm.map(function(m){ return T(cmpInfo(m)[0],cmpInfo(m)[1]); })).concat(cols).map(q).join(',')];
  r.overall.concat(r.series).forEach(function(s){ lines.push([seriesName(s), s.total].concat(cm.map(function(m){ return past(A,s,m).total; })).concat(s.values).map(q).join(',')); });
  function q(x){ return '"'+String(x).replace(/"/g,'""')+'"'; }
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='segmentation.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  U.toast('فایل CSV دانلود شد','CSV downloaded');
}
var MET_SER_TIP=["<span class='tip-title'>متریک‌های ذخیره‌شده</span>متریک‌های کتابخانهٔ پروژه؛ متریکِ نوع ایونت با همان ایونت، فیلترها و نامش یک سری روند می‌شود. نوع‌های دیگر (قیف، فرمول، زمان) در کاوشگر متریک رسم می‌شوند.","<span class='tip-title'>Saved metrics</span>The project’s metric library; an event-type metric becomes a trend series with its event, filters and name. Other types (funnel, formula, time) are drawn in Metric Explorer."];
var EV_AI_ROAD=['<span class=\'tip-title\'>نقشهٔ راه</span>پیدا کردن ایونت با دستیار در برنامهٔ آیندهٔ شاهین است. دستیار فقط پیشنهاد می‌دهد و تا شما «افزودن همین ایونت» را نزنید، چیزی به نمودار اضافه نمی‌شود.','<span class=\'tip-title\'>Roadmap</span>Finding events with the assistant is on Shahin’s roadmap. It only suggests; nothing is added to the chart until you press “Add this event”.'];
/* intent words → events Shahin's code or the registry usually sends for them */
var EV_AI_WORDS=[[/(خرید|سفارش|پرداخت|buy|bought|purchas|order|checkout|pay)/,['purchase','checkout_started','order_value']],[/(سبد|cart|basket)/,['cart_viewed','add_to_cart','item_added']],[/(محصول|کالا|product|item)/,['item_viewed','product_viewed']],
  [/(ثبت.?نام|عضو|sign.?up|register)/,['sign_up','signup_completed']],[/(ورود|لاگین|login|log in|sign.?in)/,['login']],[/(اشتراک.?گذار|بازنشر|share)/,['share']],[/(مشترک|اشتراک|خبرنامه|subscri|newsletter)/,['subscription_started','newsletter_subscribed']],
  [/(ویدیو|ویدئو|فیلم|تماشا|video|watch)/,['video_started','video_completed','video_progress']],[/(پادکست|podcast|audio|صوت)/,['podcast_played']],[/(جستجو|سرچ|search)/,['search_submitted']],[/(فرم|form|contact|تماس)/,['form_submitted']],
  [/(اسکرول|عمق|خواند|scroll|read)/,['scroll_depth_reached']],[/(بازدید|صفحه|دید|visit|page|view)/,['page_view']],[/(تخفیف|کوپن|discount|coupon)/,['discount_code_applied']],[/(دانلود|download)/,['file_download']],[/(کلیک|دکمه|click|button)/,['element_clicked']]];
/* PM 2026-10-25, RB-19: the picker's own «پنهان در انتخابگر» rule, shared by the assistant and the combined-event form (data and saved charts are untouched) */
function pickHidden(e){ if(!e) return false; if(e.hideIn&&e.hideIn.indexOf('picker')>-1) return true; var g=govEv()[e.id]; return !!(g&&(g.hidden||g.blocked)); }
/* PM 2026-10-25, RB-19 (cross-group, events page governance): an event the events page hides or blocks leaves every event picker; saved charts and
   their numbers are untouched. The store is the events page's own (localStorage shahin-es-gov-p<project> → ev[name]), read at most once a second */
var GOV_CACHE={ t:0, v:{} };
function govEv(){ var now=Date.now(); if(now-GOV_CACHE.t<1000) return GOV_CACHE.v; var v={};
  try{ var proj=+JSON.parse(localStorage.getItem('shahin-nav-project')||'0')||0, g=JSON.parse(localStorage.getItem('shahin-es-gov-p'+proj)||'null'); v=(g&&g.ev)||{}; }catch(err){ v={}; }
  GOV_CACHE={ t:now, v:v }; return v; }
function evAiSuggest(q){
  var t=String(q||'').trim().toLowerCase(); if(t.length<2) return [];
  var live=function(id){ var e=getEv(id); return e&&e.w>0&&!e.deleted&&!e.hidden&&!pickHidden(e)?e:null; }, out=[], seen={};   /* PM 2026-10-25, RB-19: the assistant follows «پنهان در انتخابگر» */
  function add(id, why){ if(seen[id]||!live(id)) return; seen[id]=1; out.push({ id:id, why:why }); }
  EV_AI_WORDS.forEach(function(w){ var m=w[0].exec(t); if(m) w[1].forEach(function(id){ add(id, ['«'+m[0]+'» معمولاً با این ایونت ثبت می‌شود','“'+m[0]+'” is usually recorded with this event']); }); });
  var words=t.split(/[\s،,]+/).filter(function(x){ return x.length>2; });
  RB.EVENTS.forEach(function(e){ if(out.length>=6) return; var hay=(e.id+' '+e.fa+' '+e.en+' '+(e.desc?e.desc.join(' '):'')).toLowerCase();
    var hit=words.filter(function(x){ return hay.indexOf(x)>-1; })[0]; if(hit) add(e.id, ['«'+hit+'» در نام یا توضیح این ایونت آمده','“'+hit+'” appears in this event’s name or description']); });
  return out.slice(0,3);
}
/* Block A (2026-10-24): Amplitude «Add Event or Metric» — a library metric of the event type becomes a trend series that keeps the
   metric's event, filters and name (PM backlog 2026-10-12). Other metric types need Metric Explorer, so the picker says so. */
/* PM 2026-10-30, LX-24: may this library metric be a trend series here? null, or the reason (retention opens in its own chart; a revenue
   metric needs an empty chart or one already measured in currency, the PM's unit rule; other types are drawn elsewhere) */
function trCurMeasure(){ return A.measure==='arpau'||(A.measure==='prop'&&mtCurProp(A.prop)&&A.pagg!=='dist'&&A.pagg!=='distinct'); }
function trWhy(m){ var c=m.col||{};
  if(m.type==='retention') return MT_WHY.ret;
  if(m.type==='revenue'){ if(!mtRevEvents().length||!getEv(c.ev)) return MT_WHY.norev; if(A.events.length&&!trCurMeasure()) return MT_WHY.revMix; return null; }
  if(c.kind==='ev'&&getEv(c.ev)) return null;
  return ['این نوع متریک ('+T_MTYPES[m.type][0]+') فقط در کاوشگر متریک و جدول متریک‌ها رسم می‌شود.','This metric type ('+T_MTYPES[m.type][1]+') is drawn only in Metric Explorer and the Data Table.']; }
function addMetricSeries(m){ var c=m.col; if(A.events.length>=MAX_EVENTS){ U.toast('حداکثر '+num(MAX_EVENTS)+' ایونت','Up to '+MAX_EVENTS+' events'); return; }
  var why=trWhy(m); if(why){ U.toast(why[0], why[1]); changed(); return; }
  /* a revenue metric sets the chart's measure on an empty chart (sum, average per purchase, or per active user); on a currency chart it takes the chart's measure */
  if(m.type==='revenue'){ var first=!A.events.length; A.events.push({ id:c.ev, filters:clone(c.filters||[]), groupBy:'', label:T(m.fa,m.en), mid:m.id }); OPEN.ev=true; A.sel=null;
    if(first){ if(c.agg==='arpu'){ A.measure='arpau'; A.prop=c.prop; } else { A.measure='prop'; A.prop=c.prop; A.pagg=c.agg==='aov'?'avg':'sum'; } }
    changed(); return; }
  A.events.push({ id:c.ev, filters:clone(c.filters||[]), groupBy:'', label:T(m.fa,m.en), mid:m.id }); OPEN.ev=true; A.sel=null;
  var meas=c.meas||'uniques';
  if(A.events.length===1) A.measure=meas;
  else if(meas!==A.measure && MEAS[meas]) U.toast('متریک با شمارش نمودار («'+MEAS[A.measure].fa+'») رسم شد، نه «'+MEAS[meas].fa+'»','The metric is drawn with the chart’s measure (“'+MEAS[A.measure].en+'”), not “'+MEAS[meas].en+'”');
  changed(); }
/* PM 2026-11-14: a labeled event's «دسته‌بندی» (rb-data-defs.js LAB_CATS) — its rows sort by it, each row shows it and the hover card names it */
function labCats(){ return window.RBDefs&&RBDefs.labCats?RBDefs.labCats():[]; }
function labCatIdx(k){ var L=labCats(); for(var i=0;i<L.length;i++) if(L[i][0]===k) return i; return L.length; }
function labCatName(k){ var c=labCats()[labCatIdx(k)]; return c?T(c[1],c[2]):T('بدون دسته‌بندی','Uncategorized'); }
function eventPicker(onPick, opts){
  var groups={}, sortBy='vol'; RB.EVENTS.filter(function(e){ return e.w>0 && !e.deleted && !pickHidden(e); })   /* PM 2026-10-25, RB-19: picker-hidden, hidden or blocked */   /* Block C: hidden in the picker */.concat(RB.VIRTUALS.map(function(v){ return getEv(v.id); })).forEach(function(e){ if(!e) return; (groups[e.grp]=groups[e.grp]||[]).push(e); });   /* phase 4: the picker lists what this project has (weight 0 = never arrived) */
  U.modal({ fa:'انتخاب ایونت', en:'Choose an event', wide:true,
    body:'<div class="rbx-row"><label class="rbx-search" style="flex:1">'+ic('magnifying-glass')+'<input id="rbzEvQ" type="search" placeholder="'+T('جستجوی نام یا کد ایونت (* برای هر چیزی)','Search name or code (* matches anything)')+'"/></label>'+
      '<select class="sh-select" id="rbzEvSort" style="width:auto" aria-label="'+T('مرتب‌سازی','Sort by')+'"><option value="vol">'+T('بیشترین حجم','Highest volume')+'</option><option value="name">'+T('نام','Name')+'</option></select>'+
      '<button class="sh-btn ghost compact" id="rbzEvAi" type="button" aria-expanded="false">'+ic('sparkle')+T('با دستیار پیدا کن','Find with AI')+'</button></div>'+
      '<div class="rbz-evai" id="rbzEvAiBox" hidden><div class="rai-top"><span class="rbx-badge ai">'+ic('sparkle')+T('دستیار','Assistant')+'</span><span class="rbx-badge road"'+tip(EV_AI_ROAD[0],EV_AI_ROAD[1])+'>'+ic('map-trifold')+T('نقشهٔ راه','Roadmap')+'</span></div>'+
        '<div class="rbx-row"><input class="sh-input" id="rbzEvAiQ" placeholder="'+esc(T('به زبان خودتان: مثلاً «کسانی که خرید کردند» یا «تماشای ویدیو»','In your own words, e.g. “people who bought” or “video watched”'))+'"/><button class="sh-btn primary compact" id="rbzEvAiGo" type="button">'+T('پیشنهاد بده','Suggest')+'</button></div>'+
        '<div id="rbzEvAiOut" aria-live="polite"></div><div class="rbz-evai-note">'+ic('info')+T('پیشنهاد دستیار ممکن است نادرست باشد؛ پیش از افزودن، تعریف ایونت را در کارت کنار ببینید.','The assistant’s suggestion may be wrong; check the event’s definition in the card before adding it.')+'</div></div>'+
      /* M1 Amplitude parity (2026-11-16): Amplitude's All / Event / Metrics tabs over the one list (the list itself stays flat for rb-m1.js) */
      (opts&&opts.onMetric?'<div class="rbz-pp-tabs rbz-evtabs" role="tablist">'+[['all','همه','All'],['ev','ایونت‌ها','Events'],['mt','متریک‌ها','Metrics']].map(function(t,i){ return '<button type="button" role="tab" class="rbz-pp-tab'+(i?'':' on')+'" data-evtab="'+t[0]+'" aria-selected="'+(i?'false':'true')+'">'+T(t[1],t[2])+'</button>'; }).join('')+'</div>':'')+
      '<div class="rbz-pick2"><div class="rbz-evlist" id="rbzEvList"></div><div class="rbz-evcard" id="rbzEvCard"></div></div>',
    init:function(bd,close){
      var list=bd.querySelector('#rbzEvList'), q=bd.querySelector('#rbzEvQ'), card=bd.querySelector('#rbzEvCard'), evTab='all';
      bd.querySelectorAll('[data-evtab]').forEach(function(b){ b.addEventListener('click', function(){ evTab=b.getAttribute('data-evtab'); bd.querySelectorAll('[data-evtab]').forEach(function(x){ x.classList.toggle('on', x===b); x.setAttribute('aria-selected', String(x===b)); }); draw2(); q.focus(); }); });
      function item(e){ return '<button class="rbz-evitem" data-pick="'+esc(e.id)+'" type="button"><span class="rbz-evic">'+evIcon(e.id)+'</span><span class="nm">'+esc(T(e.fa,e.en))+'</span>'+(e.lab?'<span class="rbz-evcat">'+esc(labCatName(e.cat))+'</span>':'')+'<code>'+esc(e.id)+'</code><span class="vol">'+T('حدود ','≈')+compact(e.w)+T(' در هفته','/week')+'</span></button>'; }
      function sorted(a){ return a.slice().sort(function(x,y){ var c=x.lab&&y.lab?labCatIdx(x.cat)-labCatIdx(y.cat):0; if(c) return c;   /* labeled events: by category first */
        return sortBy==='name'?T(x.fa,x.en).localeCompare(T(y.fa,y.en),fa()?'fa':'en'):y.w-x.w; }); }
      /* wildcard: * matches anything, as in Amplitude's event search */
      function match(e,t){ if(!t) return true; var hay=(e.id+' '+e.fa+' '+e.en).toLowerCase(); if(t.indexOf('*')<0) return hay.indexOf(t)>-1;
        try{ return new RegExp(t.split('*').map(function(x){ return x.replace(/[.+?^${}()|[\]\\]/g,'\\$&'); }).join('.*')).test(hay); }catch(err){ return false; } }
      function showCard(id){ var e=getEv(id); if(!e){ card.innerHTML=''; return; } var props=e.props?e.props.length:0, gl=RB.GRP[e.grp]||{ fa:'پیش‌فرض شاهین', en:'Shahin default' };
        /* M1 Amplitude parity (2026-11-16): the hover card in Amplitude's order — category tag, name, code, description, its top
           properties, then the stats footer (weekly volume, own and automatic properties) */
        var top=(e.props||[]).filter(function(p){ return RB.PROPS[p]&&!RB.PROPS[p].hidden; }).slice(0,4).map(function(p){ return '<li><span>'+esc(T(RB.PROPS[p].fa,RB.PROPS[p].en))+'</span></li>'; }).join('');
        card.innerHTML='<span class="rbz-pp-type">'+esc(e.lab?labCatName(e.cat):T(gl.fa,gl.en))+'</span><b>'+esc(T(e.fa,e.en))+'</b><code dir="ltr">'+esc(e.id)+'</code>'+(e.desc?'<p class="rbz-sethelp">'+esc(T(e.desc[0],e.desc[1]))+'</p>':'')+
          (top?'<div class="rbz-pp-vals"><span>'+T('ویژگی‌های اصلی','Top properties')+'</span><ul>'+top+'</ul></div>':'')+
          '<div class="rbz-evstats" data-min-track="60"><div><b>'+compact(e.w)+'</b><span>'+T('در هفته','per week')+'</span></div><div><b>'+num(props)+'</b><span>'+T('ویژگی خود ایونت','own properties')+'</span></div><div><b>'+num(RB.GLOBAL_PROPS.length)+'</b><span>'+T('ویژگی خودکار','auto properties')+'</span></div></div>'; }
      function draw2(){ var t=q.value.trim().toLowerCase(), h='';
        if(opts&&opts.onMetric&&evTab!=='ev'){ var ms=T_METRICS.filter(mLive).filter(function(m){ return !t||(m.fa+' '+m.en).toLowerCase().indexOf(t.replace(/\*/g,''))>-1; });
          if(ms.length) h+='<div class="rbz-evgrp">'+T('متریک‌های ذخیره‌شده','Saved metrics')+'<span class="rbx-tipdot"'+tip(MET_SER_TIP[0],MET_SER_TIP[1])+'></span></div>'+ms.map(function(m){ var why=trWhy(m), ok=!why;   /* PM 2026-10-30, LX-24: one reason per type (trWhy) */
            return '<button class="rbz-evitem'+(ok?'':' off')+'" data-mpick="'+esc(m.id)+'" type="button"'+(ok?'':' aria-disabled="true" title="'+esc(T(why[0],why[1]))+'"')+'><span class="rbz-evic">'+ic(mtIcon(m))+'</span><span class="nm">'+esc(tMName(m))+'</span><span class="mtype">'+esc(T(T_MTYPES[m.type][0],T_MTYPES[m.type][1]))+'</span><span class="vol">'+(ok?T('یک سری روند','Trend series'):m.type==='retention'?T('در نمودار ریتنشن','In the Retention chart'):m.type==='revenue'?T('نمودار جدا','A separate chart'):T('در روند نیست','Not in Trend'))+'</span></button>'; }).join('')+
            /* PM 2026-10-30, LX-24: «تعریف متریک جدید…» at the end of the group (Amplitude's Event Segmentation: + Define new Metric) */
            '<button class="rbz-evitem" data-mdefine="1" type="button"><span class="rbz-evic">'+ic('plus')+'</span><span class="nm">'+T('تعریف متریک جدید…','Define new metric…')+'</span><span class="vol">'+T('ایونت یا درآمد','Event or revenue')+'</span></button>'; }
        if(evTab==='mt'){ list.innerHTML=h||'<div class="rbx-empty-note">'+T('متریکی با این نام نیست.','No metric by that name.')+'</div>'; wireList(); return; }
        var defs=Object.keys(DEF_EV).map(getEv).filter(function(e){ return match(e,t); });
        if(defs.length) h+='<div class="rbz-evgrp">'+T('ایونت‌های پیش‌فرض','Default events')+'</div>'+defs.map(item).join('');
        if(!t) h+='<div class="rbz-evgrp">'+T('پرکاربردترین‌ها','Most used')+'</div>'+RB.EVENTS.filter(function(e){ return e.w>0 && !e.deleted && !pickHidden(e); })   /* PM 2026-10-25, RB-19: picker-hidden, hidden or blocked */.sort(function(a,b){ return b.w-a.w; }).slice(0,5).map(item).join('');
        /* PM 2026-11-14: labeled events come right after «پرکاربردترین‌ها» (they were last and hard to find); the rest keep RB.GRP order */
        ['labeled'].concat(Object.keys(RB.GRP).filter(function(g){ return g!=='labeled'; })).forEach(function(g){ if(!RB.GRP[g]) return; var evs=sorted((groups[g]||[]).filter(function(e){ return match(e,t); })); if(!evs.length) return;
          h+='<div class="rbz-evgrp">'+esc(T(RB.GRP[g].fa,RB.GRP[g].en))+'</div>'+evs.map(item).join(''); });
        list.innerHTML=h||'<div class="rbx-empty-note">'+T('ایونتی با این نام نیست.','No event by that name.')+'</div>';
        wireList(); }
      function wireList(){
        list.querySelectorAll('[data-mpick]').forEach(function(x){ x.addEventListener('click', function(){ var m=T_METRICS.filter(function(z){ return z.id===x.getAttribute('data-mpick'); })[0];
          if(x.getAttribute('aria-disabled')){ var w=m&&trWhy(m); if(w&&(m.type==='retention'||m.type==='revenue')) U.toast(w[0], w[1]); else U.toast('این متریک را در «کاوشگر متریک» باز کنید','Open this metric in Metric Explorer'); return; }
          close(); opts.onMetric(m); }); });
        var mdf=list.querySelector('[data-mdefine]'); if(mdf) mdf.addEventListener('click', function(){ close(); setTimeout(function(){ tDefineModal({ target:'trend', types:['event','revenue'] }); }, 160); });
        list.querySelectorAll('[data-pick]').forEach(function(x){ x.addEventListener('click', function(){ close(); onPick(x.getAttribute('data-pick')); });
          ['mouseenter','focus'].forEach(function(ev){ x.addEventListener(ev, function(){ showCard(x.getAttribute('data-pick')); }); }); });
        var first=list.querySelector('[data-pick]'); if(first) showCard(first.getAttribute('data-pick')); else card.innerHTML=''; }
      q.addEventListener('input', draw2); bd.querySelector('#rbzEvSort').addEventListener('change', function(e){ sortBy=e.target.value; draw2(); }); draw2();
      /* Block A (2026-10-24): the AI button inside «افزودن ایونت» (PM backlog 2026-10-12). A suggestion is only a preview: the card shows the
         event and nothing is added until «افزودن همین ایونت» is pressed (the PM's «نقشهٔ راه» + preview rule for every AI write). */
      var aiBtn=bd.querySelector('#rbzEvAi'), aiBox=bd.querySelector('#rbzEvAiBox'), aiQ=bd.querySelector('#rbzEvAiQ'), aiOut=bd.querySelector('#rbzEvAiOut');
      aiBtn.addEventListener('click', function(){ if(aiBox.hidden&&window.RBAi&&RBAi.blocked&&RBAi.blocked()) return; aiBox.hidden=!aiBox.hidden; aiBtn.setAttribute('aria-expanded', String(!aiBox.hidden)); if(!aiBox.hidden) aiQ.focus(); });
      function aiRun(){ var sug=evAiSuggest(aiQ.value);
        if(!sug.length){ aiOut.innerHTML='<div class="rbx-empty-note">'+T('ایونتی که به این جمله بخورد پیدا نشد؛ با کلمهٔ دیگری بنویسید یا از فهرست انتخاب کنید.','No event matches that sentence; try other words or pick from the list.')+'</div>'; return; }
        aiOut.innerHTML='<div class="rbz-evgrp">'+T('پیشنهاد دستیار','Assistant’s suggestions')+'</div>'+sug.map(function(x){ var e=getEv(x.id);
          return '<button class="rbz-evitem ai" data-aiprev="'+esc(x.id)+'" type="button"><span class="rbz-evic">'+evIcon(x.id)+'</span><span class="nm">'+esc(T(e.fa,e.en))+'</span><code>'+esc(x.id)+'</code><span class="vol">'+esc(T(x.why[0],x.why[1]))+'</span></button>'; }).join('');
        aiOut.querySelectorAll('[data-aiprev]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-aiprev');
          aiOut.querySelectorAll('[data-aiprev]').forEach(function(o){ o.classList.toggle('on', o===b); });
          showCard(id); card.insertAdjacentHTML('beforeend','<button class="sh-btn primary compact rbz-evai-ok" data-aiok="'+esc(id)+'" type="button">'+ic('plus')+T('افزودن همین ایونت','Add this event')+'</button>');
          card.querySelector('[data-aiok]').addEventListener('click', function(){ close(); onPick(id); }); }); }); }
      bd.querySelector('#rbzEvAiGo').addEventListener('click', aiRun);
      aiQ.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); aiRun(); } });
    }, actions:(window.RBDefs?[{ fa:'+ ایونت ترکیبی', en:'+ Combined event', ghost:true, fn:function(){ setTimeout(function(){ cevModal(onPick); }, 160); } }]:[]).concat([{ fa:'بستن', en:'Close', ghost:true }]) });
}
/* lexicon b: the same custom-event definition the events page writes (rb-data-defs.js) */
function cevModal(onPick){
  var evs=RB.EVENTS.filter(function(e){ return e.w>0 && !e.hidden && !e.deleted && !pickHidden(e); }), parts=[{ id:'', prop:'', vals:[] }];   /* PM 2026-10-25, RB-19 */
  function partsHtml(){ return parts.map(function(p, i){ var P=p.prop&&RB.PROPS[p.prop];
    return '<div class="rbz-cevrow">'+(i?'<span class="rbz-or">'+T('یا','or')+'</span>':'')+'<select class="sh-select compact" data-cp="'+i+'" data-k="id"><option value="">'+T('ایونت…','Event…')+'</option>'+evs.map(function(e){ return '<option value="'+e.id+'"'+(p.id===e.id?' selected':'')+'>'+esc(T(e.fa,e.en))+'</option>'; }).join('')+'</select>'+
      '<select class="sh-select compact" data-cp="'+i+'" data-k="prop"><option value="">'+T('بدون فیلتر','No filter')+'</option>'+(p.id?propsOf(p.id).filter(function(k){ return RB.PROPS[k].vals; }).map(function(k){ return '<option value="'+k+'"'+(p.prop===k?' selected':'')+'>'+esc(pOpt(k))+'</option>'; }).join(''):'')+'</select>'+
      (P?'<span class="rbz-cevvals">'+P.vals.map(function(v){ return '<button type="button" class="rbz-chip'+(p.vals.indexOf(v[1])>-1?' on':'')+'" data-cv="'+i+'" data-v="'+esc(v[1])+'">'+esc(T(v[0],v[1]))+'</button>'; }).join('')+'</span>':'')+'</div>'; }).join('')+
    '<button class="rb-linkbtn" data-cadd type="button">+ '+T('جزء دیگر','Another part')+'</button>'; }
  U.modal({ fa:'ایونت ترکیبی تازه', en:'New combined event', subFa:'از چند ایونت موجود ساخته می‌شود؛ هر کدام رخ دهد، این ایونت رخ داده. همین تعریف در صفحهٔ ایونت‌ها هم هست.', subEn:'Built from existing events; any of them counts. The same definition shows on the events page.',
    body:'<label class="rbx-field"><span>'+T('نام','Name')+'</span><input class="sh-input" id="rbzCevName"/></label><div id="rbzCevParts">'+partsHtml()+'</div><div class="rbx-note" id="rbzCevErr"></div>',
    init:function(bd){ var box=bd.querySelector('#rbzCevParts');
      function wire(){ box.querySelectorAll('[data-cp]').forEach(function(x){ x.addEventListener('change', function(){ var p=parts[+x.getAttribute('data-cp')]; p[x.getAttribute('data-k')]=x.value; if(x.getAttribute('data-k')==='id'){ p.prop=''; p.vals=[]; } else p.vals=[]; box.innerHTML=partsHtml(); wire(); }); });
        box.querySelectorAll('[data-cv]').forEach(function(x){ x.addEventListener('click', function(){ var p=parts[+x.getAttribute('data-cv')], v=x.getAttribute('data-v'), i=p.vals.indexOf(v); if(i>-1) p.vals.splice(i,1); else p.vals.push(v); box.innerHTML=partsHtml(); wire(); }); });
        var ad=box.querySelector('[data-cadd]'); if(ad) ad.addEventListener('click', function(){ parts.push({ id:'', prop:'', vals:[] }); box.innerHTML=partsHtml(); wire(); }); }
      wire(); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ساختن و افزودن', en:'Create and add', fn:function(bd){
      var name=bd.querySelector('#rbzCevName').value.trim(), er=bd.querySelector('#rbzCevErr'); if(!name){ er.textContent=T('نام را بنویسید.','Write a name.'); return false; }
      var r=RBDefs.addEvent({ fa:name, en:name, comps:parts.filter(function(p){ return p.id; }).map(function(p){ return { id:p.id, filters:p.prop&&p.vals.length?[{ prop:p.prop, op:'in', vals:p.vals.slice() }]:[] }; }) });
      if(r.err){ er.textContent=T(r.err[0],r.err[1]); return false; }
      U.toast('ایونت ترکیبی ساخته شد؛ در صفحهٔ ایونت‌ها هم هست','Combined event created; it’s on the events page too'); onPick(r.id); } }] }); }
/* PM 2026-10-25, cross-group (LX-16): a derived property whose values are approximate (several source properties) carries a plain
   «تقریبی» tag in every property picker, with its own reason as the note (rb-data-defs.js writes P.dev). PM 2026-10-28, LX-6: no
   «نیازمند توسعه» on this Backlog page; the approximate marker stays because it is true of the demo's numbers.
   Menus take HTML, so the tag sits in the label and the note in the hint; a <select> option takes plain text, so it gets a suffix. */
function pDev(p){ var P=RB.PROPS[p]; return P&&(P.approx||P.dev)?(Array.isArray(P.dev)&&P.dev.length>1?P.dev:['مقدارهای این ویژگی در دمو تقریبی است.','This property’s values are approximate in the demo.']):null; }
function approxTag(d){ return '<span class="rbz-tag"'+tip("<span class='tip-title'>تقریبی</span>"+d[0], "<span class='tip-title'>Approximate</span>"+d[1])+'>'+T('تقریبی','Approximate')+'</span>'; }
function pFa(p){ var P=RB.PROPS[p], d=pDev(p); return P.fa+(d?' '+approxTag(d):''); }
function pEn(p){ var P=RB.PROPS[p], d=pDev(p); return P.en+(d?' '+approxTag(d):''); }
function pHint(p){ return pDev(p); }
function pOpt(p){ var P=RB.PROPS[p]; return T(P.fa,P.en)+(pDev(p)?T(' · تقریبی',' · approximate'):''); }
function propsOf(id){ var ev=getEv(id); if(!ev) return []; var list=DEF_EV[id]?RB.GLOBAL_PROPS.slice():RB.propsFor(ev); return list.concat(['_hcount']).filter(function(p){ return RB.PROPS[p] && !RB.PROPS[p].hidden; }); }
/* Historical count (Amplitude): which time this person did the event — 1st … 5th+ (filters only) */
RB.PROPS._hcount={ grp:'own', fa:'بار چندمِ انجام این ایونت', en:'Historical count', vals:[['بار اول','1st',0.45],['بار دوم','2nd',0.22],['بار سوم','3rd',0.13],['بار چهارم','4th',0.09],['بار پنجم و بیشتر','5th+',0.11]] };
/* PM 2026-10-31, outcome 1: B04 — the chart-level breakdown menu: the properties of every event on the chart, grouped by property
   family (one header each), with the Key Properties of any library metric on the chart first (LX-24). The pick goes to every event. */
/* M1 Amplitude parity (2026-11-16): the property picker, Amplitude's Group-by / Filter-by pattern (the same as the event picker):
   a search, type tabs («همه», «ایونت», «وب», «کاربر»), family heads and a hover card. It takes the same items U.menu took, each row with
   its property key in p. The list keeps the .rbx-menu > .rbx-mh / .rbx-mi shape, so rb-m1.js hides the same heads and rows it hid in the
   old menu (user properties, historical count); the search, tabs and card sit outside the list. A tab with no visible row is hidden. */
var PP_TABS=[['all','همه','All'],['event','ایونت','Event'],['web','وب','Web'],['user','کاربر','User']];
function ppKind(p){ var P=RB.PROPS[p]||{}; return P.grp==='own'||p==='_hcount'?'event':(P.grp==='user'||P.trait)?'user':'web'; }
var PP_KIND={ event:['ویژگی ایونت','Event property','lightning'], web:['ویژگی وب (خودکار)','Web property (automatic)','globe'], user:['ویژگی کاربر','User property','user-circle'] };
var ppOpen=null;
function closePP(){ if(ppOpen){ var x=ppOpen; ppOpen=null; x.close(); } }
function propPicker(anchor, items, o){
  o=o||{}; closePP(); if(U.closeMenu) U.closeMenu();
  var evs=(o.events||A.events.map(function(e){ return e.id; })).filter(Boolean);
  var pop=document.createElement('div'); pop.className='rbz-pp'; pop.setAttribute('role','dialog'); pop.setAttribute('aria-label', T(o.titleFa||'انتخاب ویژگی', o.titleEn||'Choose a property'));
  var rows='', curK='';
  items.forEach(function(it){
    if(it.head){ rows+='<div class="rbx-mh" data-ppk="'+(it.kind||'')+'">'+T(it.fa,it.en)+(it.hint?'<span class="rbx-tipdot"'+tip(it.hint[0],it.hint[1])+'></span>':'')+'</div>'; return; }
    var k=ppKind(it.p), P=RB.PROPS[it.p]||{};
    rows+='<button type="button" class="rbx-mi rbz-ppi'+(it.on?' on':'')+'" role="option" data-pprop="'+esc(it.p)+'" data-ppk="'+k+'" data-t="'+esc(((P.fa||'')+' '+(P.en||'')+' '+it.p).toLowerCase())+'">'+
      '<span class="grow">'+T(it.fa,it.en)+'</span><span class="rbz-ppic" aria-hidden="true">'+ic(PP_KIND[k][2])+'</span></button>'; });
  pop.innerHTML='<div class="rbz-pp-top"><label class="rbz-pp-q">'+ic('magnifying-glass')+'<input type="search" placeholder="'+esc(T('جستجوی ویژگی','Search properties'))+'" aria-label="'+esc(T('جستجوی ویژگی','Search properties'))+'"/></label>'+
    '<div class="rbz-pp-tabs" role="tablist">'+PP_TABS.map(function(t,i){ return '<button type="button" role="tab" class="rbz-pp-tab'+(i?'':' on')+'" data-pptab="'+t[0]+'" aria-selected="'+(i?'false':'true')+'">'+T(t[1],t[2])+'</button>'; }).join('')+'</div></div>'+
    '<div class="rbz-pp-body" data-min-track="150"><div class="rbx-menu rbz-pp-list" role="listbox">'+rows+'</div><div class="rbz-pp-card" aria-live="polite"></div></div>'+
    '<div class="rbz-pp-empty" hidden>'+T('ویژگی‌ای با این نام نیست.','No property by that name.')+'</div>';
  document.body.appendChild(pop);
  var list=pop.querySelector('.rbz-pp-list'), card=pop.querySelector('.rbz-pp-card'), q=pop.querySelector('input'), tab='all';
  function vis(el){ return el.offsetParent!==null; }
  function card1(p){ var P=RB.PROPS[p]; if(!P){ card.innerHTML=''; return; } var k=ppKind(p), d=pDev(p);
    var on=evs.filter(function(id){ return propsOf(id).indexOf(p)>-1; }).length;
    var vals=(P.vals||[]).filter(function(v){ return v[1]!=='Other'; }).slice(0,3).map(function(v){ return '<li><span>'+esc(dacVal(p,v))+'</span>'+(typeof v[2]==='number'?'<b>'+num(Math.round(v[2]*100))+T('٪','%')+'</b>':'')+'</li>'; }).join('');
    card.innerHTML='<span class="rbz-pp-type">'+ic(PP_KIND[k][2])+T(PP_KIND[k][0],PP_KIND[k][1])+'</span><b class="rbz-pp-nm">'+esc(T(P.fa,P.en))+'</b><code dir="ltr">'+esc(p==='_hcount'?'historical_count':p)+'</code>'+
      (d?'<p class="rbz-sethelp">'+approxTag(d)+' '+esc(T(d[0],d[1]))+'</p>':'')+
      '<div class="rbz-evcard-r"><span>'+T('نوع مقدار','Value type')+'</span><span>'+(P.num?T('عدد','Number'):T('متن','Text'))+'</span></div>'+
      (evs.length>1?'<div class="rbz-evcard-r"><span>'+T('در ایونت‌های نمودار','On the chart’s events')+'</span><span>'+num(on)+T(' از ',' of ')+num(evs.length)+'</span></div>':'')+
      (vals?'<div class="rbz-pp-vals"><span>'+T('مقدارهای پرتکرار','Top values')+'</span><ul>'+vals+'</ul></div>':''); }
  function apply(){ var t=q.value.trim().toLowerCase(), any=false;
    list.querySelectorAll('.rbz-ppi').forEach(function(b){ var off=(tab!=='all'&&b.getAttribute('data-ppk')!==tab)||(t&&b.getAttribute('data-t').indexOf(t)<0); b.classList.toggle('pp-off', off); });
    var head=null, has=false; [].slice.call(list.children).forEach(function(c){ if(c.classList.contains('rbx-mh')){ if(head) head.classList.toggle('pp-off', !has); head=c; has=false; } else if(vis(c)){ has=true; any=true; } });
    if(head) head.classList.toggle('pp-off', !has);
    pop.querySelector('.rbz-pp-empty').hidden=any; var f=[].slice.call(list.querySelectorAll('.rbz-ppi')).filter(vis)[0]; if(f) card1(f.getAttribute('data-pprop')); else card.innerHTML=''; }
  /* a tab that would be empty (in ?m=1 the user tab: rb-m1.js hides that group) is not offered */
  function tabs(){ PP_TABS.forEach(function(t){ if(t[0]==='all') return; var b=pop.querySelector('[data-pptab="'+t[0]+'"]'), n=[].slice.call(list.querySelectorAll('.rbz-ppi[data-ppk="'+t[0]+'"]')).filter(function(x){ return !x.classList.contains('m1-out'); }).length; b.hidden=!n; }); }
  pop.querySelectorAll('[data-pptab]').forEach(function(b){ b.addEventListener('click', function(){ tab=b.getAttribute('data-pptab'); pop.querySelectorAll('[data-pptab]').forEach(function(x){ x.classList.toggle('on', x===b); x.setAttribute('aria-selected', String(x===b)); }); apply(); q.focus(); }); });
  q.addEventListener('input', apply);
  list.querySelectorAll('.rbz-ppi').forEach(function(b){ var p=b.getAttribute('data-pprop'), it=items.filter(function(x){ return x.p===p; })[0];
    ['mouseenter','focus'].forEach(function(ev){ b.addEventListener(ev, function(){ card1(p); }); });
    b.addEventListener('click', function(e){ e.stopPropagation(); closePP(); if(it&&it.fn) it.fn(); }); });
  function place(){ var r=anchor.getBoundingClientRect(), vw=window.innerWidth, vh=window.innerHeight, rtl=document.documentElement.dir!=='ltr';
    if(vw<=640){ pop.classList.add('sheet'); pop.style.cssText=''; return; }
    var w=Math.min(600, vw-24), below=vh-r.bottom-12, above=r.top-12, up=below<360&&above>below, h=Math.max(260, Math.min(460, up?above:below));
    var x=rtl?Math.min(vw-12, r.right)-w:Math.max(12, r.left); x=Math.max(12, Math.min(x, vw-w-12));
    pop.style.width=w+'px'; pop.style.left=x+'px'; pop.style.maxHeight=h+'px'; pop.style.top=(up?Math.max(12, r.top-6-h):r.bottom+6)+'px'; }
  place();
  function onDoc(e){ if(!pop.contains(e.target)&&e.target!==anchor&&!anchor.contains(e.target)) closePP(); }
  function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); closePP(); anchor.focus&&anchor.focus(); return; }
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ var vs=[].slice.call(list.querySelectorAll('.rbz-ppi')).filter(vis), i=vs.indexOf(document.activeElement); e.preventDefault();
      var n=e.key==='ArrowDown'?(i<0?0:Math.min(vs.length-1,i+1)):(i<=0?-1:i-1); if(n<0) q.focus(); else if(vs[n]) vs[n].focus(); } }
  setTimeout(function(){ document.addEventListener('mousedown', onDoc, true); }, 0); pop.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', place);
  ppOpen={ el:pop, close:function(){ anchor.setAttribute('aria-expanded','false'); document.removeEventListener('mousedown', onDoc, true); window.removeEventListener('resize', place); pop.remove(); } };
  anchor.setAttribute('aria-expanded','true');
  /* rb-m1.js hides its rows on the next mutation pass; tabs and the first card are set after it */
  setTimeout(function(){ tabs(); apply(); q.focus(); }, 30);
  return pop;
}
function groupMenu(anchor){
  var items=[], last='', have=chartGb(), add=function(p){ var g=chartGb(); if(g.indexOf(p)<0&&g.length<MAX_GB) g.push(p); setGb(g); A.sel=null; changed(); };
  var pool=[], fam=function(p){ var P=RB.PROPS[p]; return P.grp==='own'||!RB.PROP_GROUPS.some(function(x){ return x[0]===P.grp; })?-1:RB.PROP_GROUPS.map(function(x){ return x[0]; }).indexOf(P.grp); };
  A.events.forEach(function(e){ propsOf(e.id).forEach(function(p){ if(pool.indexOf(p)<0) pool.push(p); }); });
  var ord=pool.map(function(p,i){ return [fam(p), i, p]; }).sort(function(a,b){ return a[0]-b[0]||a[1]-b[1]; }).map(function(x){ return x[2]; });
  var kf=mtKeyFirst(A.events.map(function(e){ return e.mid; }).filter(Boolean), have).filter(function(p){ return pool.indexOf(p)>-1; });
  if(kf.length){ items.push({ head:1, fa:'ویژگی‌های کلیدی این متریک', en:'This metric’s key properties', hint:MT_TIPS.kgrp });
    kf.forEach(function(p){ items.push({ p:p, fa:pFa(p), en:pEn(p), fn:function(){ add(p); } }); }); }
  var many=A.events.length>1;
  ord.forEach(function(p){ var P=RB.PROPS[p], g=(RB.PROP_GROUPS.filter(function(x){ return x[0]===P.grp; })[0])||(many?['own','ویژگی‌های ایونت‌های نمودار','Properties of the chart’s events']:['own','ویژگی‌های همین ایونت','This event’s properties']);
    if(have.indexOf(p)>-1) return;
    if(g[0]!==last){ items.push({ head:1, fa:g[1], en:g[2], hint:g[3] }); last=g[0]; }
    items.push({ p:p, fa:pFa(p), en:pEn(p), fn:function(){ add(p); } }); });
  propPicker(anchor, items, { titleFa:'تفکیک بر اساس', titleEn:'Breakdown by' });   /* M1 parity: was U.menu(anchor, items, 'start') */
}
function filterPicker(k){
  var noHc=(isRet()||isJourney())&&k>0;   /* Amplitude: Historical Count only on the first event in Retention and Pathfinder */
  propFilterModal({ fa:'فیلتر روی «'+evName(A.events[k].id)+'»', en:'Filter on “'+evName(A.events[k].id)+'”', subFa:'این فیلتر فقط روی همین ایونت اعمال می‌شود.', subEn:'This filter applies only to this event.', events:[A.events[k].id], picker:true },
    propsOf(A.events[k].id).filter(function(p){ return !(noHc&&p==='_hcount'); }), function(f){ A.events[k].filters.push(f); changed(); });
}
function propFilterModal(o, props, onApply){
  U.modal({ fa:o.fa, en:o.en, subFa:o.subFa, subEn:o.subEn, wide:true,
    /* M1 parity: the per-event filter (o.picker) chooses its property in the property picker; the other callers keep the native select */
    body:'<div class="rbx-row">'+(o.picker?'<button type="button" class="rbz-ppfield" id="rbzFpBtn" aria-haspopup="dialog" aria-expanded="false"><span class="rbz-ppic" aria-hidden="true"></span><span class="nm"></span>'+ic('caret-down')+'</button>':'')+
      '<select class="sh-select'+(o.picker?' rbz-ppsrc" tabindex="-1" aria-hidden="true':'" style="flex:1')+'" id="rbzFp" aria-label="'+T('ویژگی','Property')+'">'+props.map(function(p){ return '<option value="'+p+'">'+esc(pOpt(p))+'</option>'; }).join('')+'</select>'+
      '<select class="sh-select" id="rbzFop" style="width:auto" aria-label="'+T('عملگر','Operator')+'"></select></div><div id="rbzFbody"></div>',
    init:function(bd){ var sel=bd.querySelector('#rbzFp'), op=bd.querySelector('#rbzFop'), box=bd.querySelector('#rbzFbody'), chosen={};
      function ops(){ op.innerHTML=opsFor(sel.value).map(function(k){ return '<option value="'+k+'">'+T(OPS[k][0],OPS[k][1])+'</option>'; }).join(''); }
      function d(){ chosen={}; var P=RB.PROPS[sel.value], k=op.value;
        if(k==='set'||k==='not_set'){ box.innerHTML='<p class="rbz-sethelp">'+T('شرط فقط به بودن یا نبودن مقدار این ویژگی نگاه می‌کند.','The condition only checks whether the property has a value.')+'</p>'; return; }
        if(k!=='in'&&k!=='not_in'){ box.innerHTML='<input class="sh-input" id="rbzFt" '+(P.num?'type="number"':'')+' placeholder="'+(P.num?T('عدد','Number'):T('متن','Text'))+'" style="width:100%"/>'; return; }
        box.innerHTML='<div class="rbx-row"><label class="rbz-tsearch" style="flex:1">'+ic('magnifying-glass')+'<input id="rbzFq" type="search" placeholder="'+T('جستجوی مقدار','Search values')+'"/></label>'+
          (dacMasked([sel.value])?'':'<button class="sh-btn ghost compact" id="rbzFpaste" type="button">'+T('چسباندن فهرست','Paste a list')+'</button>')+'</div>'+
          '<textarea class="sh-input" id="rbzFlist" rows="3" hidden placeholder="'+T('هر مقدار در یک خط یا با ویرگول جدا شده','One value per line or comma-separated')+'" style="width:100%;margin-top:8px"></textarea>'+
          '<div class="rb-fvals" id="rbzFv" style="margin-top:8px">'+P.vals.map(function(v){ var lb=dacVal(sel.value, v), mk=dacMasked([sel.value]); return '<button class="rb-fval" data-v="'+esc(v[1])+'" data-t="'+esc((mk?lb:(v[0]+' '+v[1])).toLowerCase())+'" type="button">'+esc(lb)+'</button>'; }).join('')+'</div>'+
          '<button class="rb-linkbtn" id="rbzFall" type="button" style="margin-top:6px">'+T('انتخاب همه','Select all')+'</button>';
        box.querySelectorAll('[data-v]').forEach(function(x){ x.addEventListener('click', function(){ x.classList.toggle('on'); chosen[x.getAttribute('data-v')]=x.classList.contains('on'); }); });
        box.querySelector('#rbzFq').addEventListener('input', function(e){ var t=e.target.value.trim().toLowerCase(); box.querySelectorAll('[data-v]').forEach(function(x){ x.hidden=!!t && x.getAttribute('data-t').indexOf(t)<0; }); });
        box.querySelector('#rbzFall').addEventListener('click', function(){ box.querySelectorAll('[data-v]').forEach(function(x){ if(!x.hidden){ x.classList.add('on'); chosen[x.getAttribute('data-v')]=true; } }); });
        var ta=box.querySelector('#rbzFlist'); if(!box.querySelector('#rbzFpaste')) return;   /* a masked property can't be matched by pasting real values */
        box.querySelector('#rbzFpaste').addEventListener('click', function(){ ta.hidden=!ta.hidden; if(!ta.hidden) ta.focus(); });
        ta.addEventListener('input', function(){ var want=ta.value.split(/[\n,،]+/).map(function(x){ return x.trim().toLowerCase(); }).filter(Boolean);
          box.querySelectorAll('[data-v]').forEach(function(x){ var hit=want.some(function(w){ return x.getAttribute('data-t').indexOf(w)>-1; }); x.classList.toggle('on', hit); chosen[x.getAttribute('data-v')]=hit; }); });
      }
      /* M1 parity: the property is chosen in the property picker; the <select> stays the value's home (rb-m1.js hides its options) */
      var fb=bd.querySelector('#rbzFpBtn');
      function fbLabel(){ if(!fb) return; var p=sel.value, P=RB.PROPS[p]; if(!P) return; var k=ppKind(p); fb.querySelector('.rbz-ppic').innerHTML=ic(PP_KIND[k][2]); fb.querySelector('.nm').innerHTML=T(pFa(p),pEn(p)); }
      function first(){ var o=[].slice.call(sel.options).filter(function(x){ return !x.hidden; })[0]; if(o&&sel.options[sel.selectedIndex]&&sel.options[sel.selectedIndex].hidden){ sel.value=o.value; ops(); d(); } fbLabel(); }
      if(fb) fb.addEventListener('click', function(e){ e.stopPropagation(); if(ppOpen){ closePP(); return; }
        var its=[], last=null, many=A.events.length>1;
        [].slice.call(sel.options).filter(function(x){ return !x.hidden; }).forEach(function(x){ var p=x.value, P=RB.PROPS[p]; if(!P) return;
          var g=(RB.PROP_GROUPS.filter(function(z){ return z[0]===P.grp; })[0])||['own','ویژگی‌های همین ایونت','This event’s properties'];
          if(g[0]!==last){ its.push({ head:1, fa:g[1], en:g[2] }); last=g[0]; }
          its.push({ p:p, on:p===sel.value, fa:pFa(p), en:pEn(p), fn:function(){ sel.value=p; sel.dispatchEvent(new Event('change')); fb.focus(); } }); });
        var pp=propPicker(fb, its, { events:o.events, titleFa:'فیلتر بر اساس', titleEn:'Filter by' }); pp.classList.add('in-modal'); });
      sel.addEventListener('change', function(){ ops(); d(); fbLabel(); }); op.addEventListener('change', d); ops(); d(); fbLabel(); if(fb) setTimeout(first, 120);
      bd._get=function(){ var k=op.value, t=bd.querySelector('#rbzFt');
        return { prop:sel.value, op:k, text:t?t.value.trim():'', vals:Object.keys(chosen).filter(function(x){ return chosen[x]; }) }; }; },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var f=bd._get();
      if((f.op==='in'||f.op==='not_in')&&!f.vals.length){ U.toast('دست‌کم یک مقدار انتخاب کنید','Pick at least one value'); return false; }
      if(f.op!=='in'&&f.op!=='not_in'&&f.op!=='set'&&f.op!=='not_set'&&!f.text){ U.toast('مقدار شرط را بنویسید','Enter a value'); return false; }
      onApply(f); } }] });
}

/* ══════════ Formula (Amplitude "Measured as ▸ Formula"): ;-separated formulas over event letters, e.g. TOTALS(B)/UNIQUES(A) ══════════
   Functions: UNIQUES, TOTALS, ACTIVE, AVERAGE, PROPSUM, PROPAVG (each takes one event letter); + − × ÷, numbers, parentheses.
   PM 2026-10-25, CR-11: plus CUMSUM, ROLLAVG, ROLLWIN, ROLLWINBEFORE, TRENDLINE and EXP, LN, LOG, LOG10, POWER, SQRT, which wrap an expression.
   A "%:" prefix shows the result as a percentage (×100), "$:" as an amount in toman. */
var FN={ UNIQUES:'uniques', TOTALS:'totals', ACTIVE:'active', AVERAGE:'avg', PROPSUM:'psum', PROPAVG:'pavg',
  /* Block C (2026-10-24): the rest of Amplitude's 19 metric functions (gap audit 49a A5) */
  EVENTTOTALS:'totals', SEMANTICTOTALS:'totals', SESSIONTOTALS:'sess', PROPMAX:'pmax', PROPMIN:'pmin', PROPCOUNT:'pcount', PROPCOUNTAVG:'pcountavg',
  PERCENTILE:'pct', FREQPERCENTILE:'fpct', REVENUETOTAL:'rev', ARPAU:'arpau' };
var FN_ARG={ pct:1, fpct:1 };   /* PERCENTILE(A, 90): the second argument is the percentile */
var FN_DIST={ HIST:['HIST یک نمودار توزیع می‌سازد، نه یک عدد؛ «سنجش بر اساس ▸ توزیع تکرار» همین توزیع را رسم می‌کند.','HIST draws a distribution, not a number; “Measured as ▸ Frequency” draws that distribution.'],
  PROPHIST:['PROPHIST یک نمودار توزیع می‌سازد، نه یک عدد؛ «سنجش بر اساس ▸ مقدار ویژگی ▸ توزیع» همین را رسم می‌کند.','PROPHIST draws a distribution, not a number; “Measured as ▸ Property ▸ Distribution” draws it.'] };
var FN_HELP=[['UNIQUES(A)','کاربرانِ ایونت A','users of event A'],['TOTALS(A)','تعداد دفعاتِ A','event totals of A'],['ACTIVE(A)','درصد کاربران فعال A','share of active users for A'],
  ['AVERAGE(A)','میانگین A در هر کاربر','average of A per user'],['PROPSUM(A)','مجموع مبلغِ A','sum of amount on A'],['PROPAVG(A)','میانگین مبلغِ A','average amount on A'],['PROPMAX(A)','بیشترین مقدار ویژگیِ A','maximum property value on A'],['PROPMIN(A)','کمترین مقدار ویژگیِ A','minimum property value on A'],
  ['PROPCOUNT(A)','تعداد مقدارهای متفاوت ویژگی تفکیکِ A','distinct values of A’s group-by property'],['PROPCOUNTAVG(A)','میانگین مقدارهای متفاوت برای هر کاربر','average distinct values per user'],
  ['PERCENTILE(A, 90)','صدک ۹۰ مقدار ویژگیِ A','90th percentile of A’s property value'],['FREQPERCENTILE(A, 90)','صدک ۹۰ دفعات A برای هر کاربر','90th percentile of A per user'],
  ['EVENTTOTALS(A)','تعداد دفعاتِ A','event totals of A'],['SESSIONTOTALS(A)','نشست‌هایی که A در آن‌ها رخ داده','sessions in which A happened'],   /* PM 2026-10-25, CR-11: SEMANTICTOTALS leaves the guide until semantic matching is defined (the parser still reads it, so saved formulas keep working) */
  ['REVENUETOTAL(A)','جمع مبلغ سفارشِ A','sum of the order amount on A'],['ARPAU(A)','درآمدِ A برای هر کاربر فعال','revenue on A per active user'],['UNIQUES(A2)','کاربرانِ ایونت A در گروه ۲ (برای مقایسهٔ گروه‌ها یا کوهورت‌ها)','users of event A in segment 2 (to compare segments or cohorts)'],
  /* PM 2026-10-25, CR-11: Amplitude's aggregation and math functions; each wraps a whole expression */
  ['CUMSUM(TOTALS(A))','جمع انباشته از اول بازه تا هر نقطه؛ کاربران یک بار شمرده می‌شوند، نه جمع کاربران هر بازه','running total from the start of the range; people are counted once, never a sum of interval users'],
  ['ROLLAVG(TOTALS(A), 7)','میانگین متحرک ۷ بازه آخر','rolling average of the last 7 intervals'],
  ['ROLLWIN(UNIQUES(A), 7)','مقدار ۷ بازه آخر با هم؛ کاربران یک بار شمرده می‌شوند','the last 7 intervals taken together; people are counted once'],
  ['ROLLWINBEFORE(UNIQUES(A), 7)','مثل ROLLWIN، ولی ۷ بازه پیش از هر نقطه، بدون خود آن','like ROLLWIN, but the 7 intervals before each point, without the point itself'],
  ['EXP(x)','عدد e به توان x','e to the power of x'],['LN(x)','لگاریتم طبیعی x','natural logarithm of x'],['LOG(x, b)','لگاریتم x در پایه b (بدون b، لگاریتم طبیعی)','logarithm of x in base b (without b, the natural log)'],
  ['LOG10(x)','لگاریتم x در پایه ۱۰','base-10 logarithm of x'],['POWER(x, y)','عدد x به توان y','x to the power of y'],['SQRT(x)','جذر x','square root of x'],
  ['TRENDLINE(TOTALS(A))','خط روند (رگرسیون خطی) روی سری فرمول','a trend line (linear regression) through the formula’s series']];
/* PM 2026-10-25, CR-11: aggregation functions (1 = one argument, 2 = expression + window) and math functions (1 = one argument, 2 = two, 3 = optional second) */
var FN_AGG={ CUMSUM:1, TRENDLINE:1, ROLLAVG:2, ROLLWIN:2, ROLLWINBEFORE:2 }, FN_MATH={ EXP:1, LN:1, LOG10:1, SQRT:1, POWER:2, LOG:3 };
/* a measure adds up across intervals (totals, amounts, sessions); users don't (CR business rule 10) and ratios are averaged */
var FN_WIN_ADD={ totals:1, psum:1, sess:1, rev:1 };
function fMath(name, x, y){ if(x==null) return null; var r;
  if(name==='EXP') r=Math.exp(x); else if(name==='LN') r=x>0?Math.log(x):null; else if(name==='LOG10') r=x>0?Math.log(x)/Math.LN10:null; else if(name==='SQRT') r=x>=0?Math.sqrt(x):null;
  else if(name==='POWER') r=y==null?null:Math.pow(x, y); else if(name==='LOG') r=x>0?(y==null?Math.log(x):(y>0&&y!==1?Math.log(x)/Math.log(y):null)):null;
  return r==null||!isFinite(r)?null:r; }
function parseFormula(src){
  var m=/^\s*([%$]):/.exec(src), mode=m?m[1]:'', s=m?src.slice(m[0].length):src, i=0;
  function sp(){ while(i<s.length&&/\s/.test(s[i])) i++; }
  function err(msg){ throw { msg:msg, at:i }; }
  function expr(){ var n=term(); sp(); while(s[i]==='+'||s[i]==='-'){ var o=s[i++]; n={ op:o, a:n, b:term() }; sp(); } return n; }
  function term(){ var n=fac(); sp(); while(s[i]==='*'||s[i]==='/'){ var o=s[i++]; n={ op:o, a:n, b:fac() }; sp(); } return n; }
  function fac(){ sp(); var c=s[i];
    if(c==='-'){ i++; return { op:'neg', a:fac() }; }
    if(c==='('){ i++; var e=expr(); sp(); if(s[i]!==')') err(['پرانتز بسته نشده','Missing )']); i++; return e; }
    var num=/^\d+(\.\d+)?/.exec(s.slice(i)); if(num){ i+=num[0].length; return { k:+num[0] }; }
    var id=/^[A-Za-z]+(?:10(?=\s*\())?/.exec(s.slice(i)); if(!id) err(['عبارت ناقص است','Incomplete expression']);   /* CR-11: LOG10 keeps its digits */
    var name=id[0].toUpperCase(); i+=id[0].length; sp();
    if(FN_DIST[name]) err(FN_DIST[name]);
    /* PM 2026-10-25, CR-11: an aggregation or math function wraps an expression: CUMSUM(TOTALS(A)), ROLLAVG(UNIQUES(A), 7), POWER(TOTALS(A), 2) */
    if(FN_AGG[name]||FN_MATH[name]){
      if(s[i]!=='(') err(['بعد از '+name+' پرانتز لازم است','“(” expected after '+name]); i++;
      var inner=expr(), nd=null; sp();
      if(FN_AGG[name]){ nd={ agg:name, a:inner };
        if(FN_AGG[name]===2){ if(s[i]!==',') err(['برای '+name+' طول پنجره را هم بنویسید، مثل '+name+'(UNIQUES(A), 7)','Give '+name+' a window too, e.g. '+name+'(UNIQUES(A), 7)']); i++; sp();
          var wn=/^\d+/.exec(s.slice(i)); if(!wn||+wn[0]<1||+wn[0]>365) err(['طول پنجره باید عددی بین ۱ و ۳۶۵ باشد','The window must be a number from 1 to 365']); nd.w=+wn[0]; i+=wn[0].length; sp(); } }
      else { nd={ math:name, a:inner };
        if(FN_MATH[name]===2||(FN_MATH[name]===3&&s[i]===',')){ if(s[i]!==',') err(['برای '+name+' عدد دوم را هم بنویسید، مثل '+name+'(TOTALS(A), 2)','Give '+name+' a second argument, e.g. '+name+'(TOTALS(A), 2)']); i++; nd.b=expr(); sp(); } }
      if(s[i]!==')') err(['پرانتز بسته نشده','Missing )']); i++;
      return nd; }
    if(!FN[name]){ if(name.length===1) err(['حرف ایونت باید داخل یک تابع باشد، مثل UNIQUES('+name+')','An event letter must sit inside a function, e.g. UNIQUES('+name+')']); err(['تابع «'+name+'» شناخته نشد','Unknown function “'+name+'”']); }
    if(s[i]!=='(') err(['بعد از '+name+' پرانتز لازم است','“(” expected after '+name]); i++; sp();
    /* an optional segment number after the letter (Amplitude: UNIQUES(A1)/UNIQUES(A2) compares segments, e.g. two cohorts) */
    var L=/^([A-Ja-j])([1-9])?/.exec(s.slice(i)); if(!L) err(['داخل '+name+' یک حرف ایونت (A تا J) بنویسید','Put an event letter (A–J) inside '+name]); i+=L[0].length; sp();
    var arg=null;
    if(FN_ARG[FN[name]]){ if(s[i]!==',') err(['برای '+name+' صدک را هم بنویسید، مثل '+name+'(A, 90)','Give '+name+' a percentile too, e.g. '+name+'(A, 90)']); i++; sp();
      var pn=/^\d+(\.\d+)?/.exec(s.slice(i)); if(!pn||+pn[0]<=0||+pn[0]>=100) err(['صدک باید عددی بین ۰ و ۱۰۰ باشد','The percentile must be between 0 and 100']); arg=+pn[0]; i+=pn[0].length; sp(); }
    if(s[i]!==')') err(['پرانتز بسته نشده','Missing )']); i++;
    return { fn:FN[name], ev:L[1].toUpperCase(), seg:L[2]?+L[2]:0, arg:arg };
  }
  var tree=expr(); sp(); if(i<s.length) err(['نویسهٔ اضافی در فرمول','Unexpected character']);
  return { tree:tree, mode:mode };
}
var FMODE=null;   /* the display mode (%, $) of the formula row being formatted */
function parseSafe(f){ try{ return f?parseFormula(f):null; }catch(e){ return null; } }
function formulas(st){ return String(st.formula||'').split(';').map(function(x){ return x.trim(); }).filter(Boolean).slice(0,10); }
function formulaErrors(st){
  var nseg=norm(st).segments.length;
  return formulas(st).map(function(f,k){ try{ var p=parseFormula(f); var miss=[], badSeg=[]; (function walk(n){ if(!n) return; if(n.ev&&LET.indexOf(n.ev)>=st.events.length) miss.push(n.ev); if(n.seg&&n.seg>nseg) badSeg.push(n.ev+n.seg); walk(n.a); walk(n.b); })(p.tree);
    if(badSeg.length) return T('فرمول '+num(k+1)+': گروه '+badSeg.join('، ')+' وجود ندارد (فقط '+num(nseg)+' گروه)','Formula '+(k+1)+': segment '+badSeg.join(', ')+' doesn’t exist (only '+nseg+')');
    return miss.length?T('فرمول '+num(k+1)+': ایونت '+miss.join('، ')+' در فهرست نیست','Formula '+(k+1)+': event '+miss.join(', ')+' is not in the list'):null; }
    catch(e){ return T('فرمول '+num(k+1)+': '+e.msg[0],'Formula '+(k+1)+': '+e.msg[1]); } }).filter(Boolean);
}
/* evaluate one formula for one segment: bucket values and a whole-period total, using the same measure() as every other chart */
function evalFormula(st, p, sg){
  var memo={};
  function raw(sub, e, seg){ return measure(Object.assign({}, st, sub), e, null, { def:seg?st.segments[seg-1]:sg }); }
  function scale(r, f){ return { v:r.v.map(function(x,i){ var k=typeof f==='function'?f(x,i):f; return x==null?null:x*k; }), total:r.total==null?null:r.total*(typeof f==='function'?f(r.total,-1):f) }; }
  function div(a, b){ return { v:a.v.map(function(x,i){ var y=b.v[i]; return x==null||!y?null:x/y; }), total:a.total!=null&&b.total?a.total/b.total:null }; }
  /* Tukey-lambda approximation of the normal quantile: the z of the p-th percentile */
  function zOf(p){ p=Math.min(0.999,Math.max(0.001,p/100)); return 4.91*(Math.pow(p,0.14)-Math.pow(1-p,0.14)); }
  function base(fn, letter, seg, arg){ var key=fn+letter+(seg||'')+'|'+(arg||''); if(memo[key]) return memo[key]; var e=st.events[LET.indexOf(letter)];
    /* the event's own amount (purchase/refund carry order_value; customs carry amount) — phase 4a: PROPSUM on purchase summed `amount`, which purchase doesn't have */
    var ge=getEv(e&&e.id), np=ge&&(ge.props||[]).filter(function(x){ return NUMP[x]&&x!=='load_time'; })[0]||'amount', r;
    var cat=(e&&e.groupBy)||(ge&&(ge.props||[]).filter(function(x){ return RB.PROPS[x]&&!NUMP[x]&&RB.PROPS[x].vals; })[0])||'page_path';
    if(fn==='psum') r=raw({ measure:'prop', pagg:'sum', prop:np }, e, seg);
    else if(fn==='pavg') r=raw({ measure:'prop', pagg:'avg', prop:np }, e, seg);
    else if(fn==='pmax') r=scale(raw({ measure:'prop', pagg:'avg', prop:np }, e, seg), 3.4);   /* a long right tail: the largest value is several times the mean */
    else if(fn==='pmin') r=scale(raw({ measure:'prop', pagg:'avg', prop:np }, e, seg), 0.12);
    else if(fn==='pct') r=scale(raw({ measure:'prop', pagg:'median', prop:np }, e, seg), Math.exp(0.85*zOf(arg)));
    else if(fn==='fpct') r=scale(raw({ measure:'avg' }, e, seg), Math.max(0.3, Math.exp(0.7*zOf(arg))/Math.exp(0.245)));
    else if(fn==='pcount') r=raw({ measure:'prop', pagg:'distinct', prop:cat }, e, seg);
    else if(fn==='pcountavg') r=div(raw({ measure:'prop', pagg:'distinct', prop:cat }, e, seg), raw({ measure:'uniques' }, e, seg));
    else if(fn==='sess') r=scale(raw({ measure:'totals' }, e, seg), 0.62);   /* several occurrences share one session */
    else if(fn==='rev'||fn==='arpau'){ var hasRev=ge&&(ge.props||[]).indexOf('order_value')>-1;
      /* PM 2026-10-25, CR-11: an event without an order amount gives «—», not 0 */
      if(!hasRev){ var tz=raw({ measure:'totals' }, e, seg); r={ v:tz.v.map(function(){ return null; }), total:null }; return (memo[key]=r); }
      r=raw({ measure:'prop', pagg:'sum', prop:'order_value' }, e, seg);
      if(fn==='arpau') r=div(r, raw({ measure:'uniques' }, { id:'_any_active', filters:[], groupBy:'' }, seg)); }
    else r=raw({ measure:fn }, e, seg);
    return (memo[key]=r); }
  function ev(n){
    if(n.k!=null) return { v:null, k:n.k, total:n.k };
    if(n.fn){ var r=base(n.fn, n.ev, n.seg, n.arg); return { v:r.v, total:r.total }; }
    if(n.op==='neg'){ var a0=ev(n.a); return { v:a0.v&&a0.v.map(function(x){ return x==null?null:-x; }), k:a0.k!=null?-a0.k:undefined, total:a0.total==null?null:-a0.total }; }
    /* PM 2026-10-25, CR-11: math functions apply point by point; aggregation functions run over the intervals */
    if(n.math){ var ma=ev(n.a), mb=n.b?ev(n.b):null, mv=[], ml=(ma.v||(mb&&mb.v)||[]).length;
      for(var mj=0;mj<ml;mj++) mv.push(fMath(n.math, ma.v?ma.v[mj]:ma.k, mb?(mb.v?mb.v[mj]:mb.k):null));
      return { v:(ma.v||(mb&&mb.v))?mv:null, k:(!ma.v&&!(mb&&mb.v))?fMath(n.math, ma.k, mb?mb.k:null):undefined, total:fMath(n.math, ma.total, mb?mb.total:null) }; }
    if(n.agg) return aggEval(n);
    var a=ev(n.a), b=ev(n.b), len=(a.v||b.v||[]).length;
    function op(x,y){ if(x==null||y==null) return null; if(n.op==='+') return x+y; if(n.op==='-') return x-y; if(n.op==='*') return x*y; return y?x/y:null; }
    var vv=[]; for(var i=0;i<len;i++) vv.push(op(a.v?a.v[i]:a.k, b.v?b.v[i]:b.k));
    return { v:(a.v||b.v)?vv:null, k:(!a.v&&!b.v)?op(a.k,b.k):undefined, total:op(a.total,b.total) };
  }
  /* CR-11: the node's value over intervals lo..hi with people counted once — uniques use the period estimate, never a running sum of interval
     uniques (CR business rule 10); additive measures add up; ratios are averaged */
  function win(nd, lo, hi){
    if(nd.k!=null) return nd.k;
    if(nd.fn){ var r0=base(nd.fn, nd.ev, nd.seg, nd.arg), sl=(r0.v||[]).slice(lo, hi+1).filter(function(x){ return x!=null; }); if(!sl.length) return null;
      if(nd.fn==='uniques') return RB.periodUniques(sl);
      var sm=sl.reduce(function(x,y){ return x+y; },0); return FN_WIN_ADD[nd.fn]?sm:sm/sl.length; }
    if(nd.op==='neg'){ var w0=win(nd.a, lo, hi); return w0==null?null:-w0; }
    if(nd.op){ var wa=win(nd.a, lo, hi), wb=win(nd.b, lo, hi); if(wa==null||wb==null) return null; return nd.op==='+'?wa+wb:nd.op==='-'?wa-wb:nd.op==='*'?wa*wb:(wb?wa/wb:null); }
    if(nd.math) return fMath(nd.math, win(nd.a, lo, hi), nd.b?win(nd.b, lo, hi):null);
    var iv=(ev(nd).v||[]).slice(lo, hi+1).filter(function(x){ return x!=null; });   /* a nested aggregation: its own points, summed */
    return iv.length?iv.reduce(function(x,y){ return x+y; },0):null; }
  function aggEval(n){ var inner=ev(n.a); if(!inner.v) return inner;   /* a constant stays a constant */
    var len=inner.v.length, out=[], w=n.w||1;
    if(n.agg==='TRENDLINE'){ var pts=[]; inner.v.forEach(function(y,x){ if(y!=null) pts.push([x,y]); });
      if(pts.length<2) return { v:inner.v.map(function(){ return null; }), total:inner.total };
      var mx=pts.reduce(function(a1,q){ return a1+q[0]; },0)/pts.length, my=pts.reduce(function(a1,q){ return a1+q[1]; },0)/pts.length,
        sxx=pts.reduce(function(a1,q){ return a1+(q[0]-mx)*(q[0]-mx); },0), sxy=pts.reduce(function(a1,q){ return a1+(q[0]-mx)*(q[1]-my); },0), sl0=sxx?sxy/sxx:0;
      return { v:inner.v.map(function(y,x){ return my+sl0*(x-mx); }), total:inner.total }; }
    for(var i=0;i<len;i++){
      if(n.agg==='CUMSUM') out.push(win(n.a, 0, i));
      else if(n.agg==='ROLLWIN') out.push(win(n.a, Math.max(0, i-w+1), i));
      else if(n.agg==='ROLLWINBEFORE') out.push(i<1?null:win(n.a, Math.max(0, i-w), i-1));
      else { var ra=inner.v.slice(Math.max(0, i-w+1), i+1).filter(function(x){ return x!=null; }); out.push(ra.length?ra.reduce(function(x,y){ return x+y; },0)/ra.length:null); } }
    return { v:out, total:n.agg==='CUMSUM'?inner.total:out[len-1] }; }
  var r=ev(p.tree), scale=p.mode==='%'?100:1, fix=function(x){ return x==null||!isFinite(x)?null:+(x*scale).toFixed(p.mode==='%'?1:2); };
  return { v:(r.v||[]).map(fix), total:fix(r.total) };
}
/* ══════════ Chart settings panel (2026-10-12) — rebuilt from the PM's screenshots of Amplitude's "Chart Settings":
   a side panel with Y-axis settings, Color themes, Query time sampling, Anomaly & forecast, Annotations; each opens a sub-page with ‹ back ══════════ */
var SET_OPEN=null;   /* null | 'root' | 'y' | 'theme' | 'sample' | 'anom' | 'ann' */
/* org colour themes: Shahin's default is the design-system palette; the others are defined as tokens in rb-amp-builder.css */
var THEMES=[ { id:'shahin', fa:'پیش‌فرض شاهین', en:'Shahin default', vars:['--sh-c1','--sh-c2','--sh-c3','--sh-c4','--sh-c5','--sh-c6'], org:true },
  { id:'ocean', fa:'اقیانوس', en:'Ocean', vars:['--rbz-th-ocean-1','--rbz-th-ocean-2','--rbz-th-ocean-3','--rbz-th-ocean-4','--rbz-th-ocean-5','--rbz-th-ocean-6'], org:true },
  { id:'sunset', fa:'غروب', en:'Sunset', vars:['--rbz-th-sunset-1','--rbz-th-sunset-2','--rbz-th-sunset-3','--rbz-th-sunset-4','--rbz-th-sunset-5','--rbz-th-sunset-6'], org:true },
  { id:'mono', fa:'تک‌رنگ', en:'Monochrome', vars:['--rbz-th-mono-1','--rbz-th-mono-2','--rbz-th-mono-3','--rbz-th-mono-4','--rbz-th-mono-5','--rbz-th-mono-6'], org:true } ];
var MY_THEMES=[], MAX_MY_THEMES=5;
/* annotations are project-wide (every chart sees them), each with a category */
var ANNOTS=[ { id:'an1', p:0.55, fa:'شروع کمپین تابستانه', en:'Summer campaign starts', cat:'' } ], ANN_CATS=[];
function themeById(id){ return THEMES.concat(MY_THEMES).filter(function(t){ return t.id===id; })[0]||THEMES[0]; }
function themeColors(t){ var cs=getComputedStyle(document.body); return t.colors?t.colors.slice():t.vars.map(function(v){ return cs.getPropertyValue(v).trim(); }); }
function setHead(fa_, en_, back){
  return '<div class="rbz-seth">'+(back?'<button class="rbz-ico" data-setgo="root" type="button" aria-label="'+T('بازگشت','Back')+'">'+ic('arrow-right')+'</button>':'')+
    '<b>'+T(fa_,en_)+'</b><span class="rbx-spacer"></span><button class="rbz-ico" data-setclose="1" type="button" aria-label="'+T('بستن','Close')+'">'+ic('x')+'</button></div>';
}
function setPanel(){
  var u=A.ui, an=u.anom, k=SET_OPEN, h='<aside class="rbz-set" aria-label="'+T('تنظیمات نمودار','Chart settings')+'">';
  if(k==='root'){
    var cats=annCats(), shown=cats.filter(function(c){ return !u.annOff[c.id]; }).length;
    var rows=[['y','تنظیمات محور عمودی','Y-axis settings','محور عمودی را تنظیم کنید','Customize the Y-axis'],
      ['theme','تم رنگی','Color themes',themeById(u.theme).fa,themeById(u.theme).en],
      ['sample','نمونه‌گیری هنگام پرسش','Query time sampling',u.sampling?'روشن':'خاموش',u.sampling?'On':'Off'],
      ['anom','ناهنجاری و پیش‌بینی','Anomaly & forecast',an.on?'روشن':'خاموش',an.on?'On':'Off'],
      ['ann','یادداشت‌ها','Annotations','نمایش '+num(shown)+' دستهٔ یادداشت','Showing '+shown+' annotation '+(shown===1?'category':'categories')]];
    h+=setHead('تنظیمات نمودار','Chart settings')+'<div class="rbz-setsub">'+T('نمایش و رسم نمودار را تنظیم کنید','Customize chart visualizations and rendering')+'</div>'+
      rows.map(function(r){ return '<button class="rbz-setrow" data-setgo="'+r[0]+'" type="button"><span><b>'+T(r[1],r[2])+'</b><small>'+esc(T(r[3],r[4]))+'</small></span>'+ic(fa()?'arrow-left':'arrow-right')+'</button>'; }).join('')+
      /* PM 2026-11-01: legend and value labels are switched here (B15); both are saved with the chart like the rest of A.ui */
      '<div class="rbz-setbody"><div class="rbz-setsec"><b>'+T('نمایش','Display')+'</b></div>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzLeg"'+(u.legend?' checked':'')+'/>'+T('راهنمای نمودار','Legend')+'<span class="rbx-tipdot"'+tip("<span class='tip-title'>راهنمای نمودار</span>فهرست سری‌های زیر نمودار با حرف هر ایونت؛ با کلیک روی هر مورد آن سری پنهان یا دوباره نمایش داده می‌شود.","<span class='tip-title'>Legend</span>The list of series under the chart with each event’s letter; clicking an item hides or shows that series.")+'></span></label>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzLab"'+(u.labels?' checked':'')+'/>'+T('برچسب مقدارها','Data labels')+'<span class="rbx-tipdot"'+tip("<span class='tip-title'>برچسب مقدارها</span>عدد هر نقطه یا ستون را روی خود نمودار می‌نویسد؛ در نمودارهای انباشته نشان داده نمی‌شود چون عددها روی هم می‌افتند.","<span class='tip-title'>Data labels</span>Writes each point’s or column’s value on the chart itself; not shown on stacked charts, where the numbers would overlap.")+'></span></label></div>'+
      /* 11b: Amplitude keeps AI controls in org settings; Shahin's equivalent is the assistant's business-context page */
      '<a class="rbz-setrow" id="rbzAiCtx" href="../ai-context/"><span><b>'+T('دستیار و بافت کسب‌وکار','Assistant and business context')+'</b><small>'+T('آنچه دستیار دربارهٔ کسب‌وکار شما می‌داند','What the assistant knows about your business')+'</small></span>'+ic('arrow-square-out')+'</a>';
  } else if(k==='y'){
    h+=setHead('تنظیمات محور عمودی','Y-axis settings',1)+'<div class="rbz-setbody">'+
      '<div class="rbz-setsec"><b>'+T('محور عمودی','Y-axis')+'</b><button class="rbz-ico" id="rbzYreset" type="button" title="'+T('بازنشانی','Reset')+'">'+ic('arrows-clockwise')+'</button></div>'+
      '<label class="rbz-fl">'+T('عنوان','Title')+'<input class="sh-input" id="rbzYt" value="'+esc(u.ytitle)+'" placeholder="'+T('خودکار','Auto')+'"/></label>'+
      '<div class="rbz-fl2"><label class="rbz-fl">'+T('کمینهٔ محور','Min y-axis value')+'<input class="sh-input" id="rbzYmin" type="number" value="'+esc(u.ymin)+'" placeholder="'+T('خودکار','Auto')+'"/></label>'+
      '<label class="rbz-fl">'+T('بیشینهٔ محور','Max y-axis value')+'<input class="sh-input" id="rbzYmax" type="number" value="'+esc(u.ymax)+'" placeholder="'+T('خودکار','Auto')+'"/></label></div>'+
      '<p class="rbz-sethelp">'+T('مقدارها به نزدیک‌ترین گام محور گرد می‌شوند. درصد را به‌صورت عدد اعشاری بین ۰ و ۱ بنویسید (برای ۵۵٪ بنویسید ۰٫۵۵).','Values are rounded up to the nearest whole interval. Enter percentages as a decimal from 0 to 1 (for 55%, enter 0.55).')+'</p>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzYout"'+(u.yout?' checked':'')+'/>'+T('نمایش داده‌های بیرون از کمینه و بیشینه','Display data outside the min and max')+'</label>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzYlog"'+(u.ylog?' checked':'')+'/>'+T('مقیاس لگاریتمی','Logarithmic scale')+'</label>'+
      '<div class="rbz-setsec"><b>'+T('واحد اندازه‌گیری','Unit of measurement')+'</b><span class="rbx-tipdot"'+tip("<span class='tip-title'>واحد اندازه‌گیری</span>فقط برچسب محور و راهنما را عوض می‌کند، نه خود عددها را؛ درصد عدد را در ۱۰۰ ضرب و با ٪ نشان می‌دهد.","<span class='tip-title'>Unit of measurement</span>Changes only the axis and tooltip labels, not the numbers; % multiplies by 100 and adds the sign.")+'></span></div>'+
      '<div class="rbz-seg2 unit">'+[['#','#','#'],['%','٪','%'],['cur',curU()[0],curU()[2]]/* PM 2026-10-28, TD-9 */,['custom','سفارشی','Custom']].map(function(x){ return '<button type="button" class="'+(u.yunit===x[0]?'on':'')+'" data-yunit="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>'+
      (u.yunit==='custom'?'<div class="rbz-fl2"><label class="rbz-fl">'+T('پیشوند','Prefix')+'<input class="sh-input" id="rbzYpre" value="'+esc(u.ypre)+'"/></label><label class="rbz-fl">'+T('پسوند','Suffix')+'<input class="sh-input" id="rbzYsuf" value="'+esc(u.ysuf)+'"/></label></div>':'')+
      '<p class="rbz-sethelp">'+T('مثلاً ','For example, ')+esc(unitFmt(50))+'</p>'+
      '<button class="sh-btn primary compact rbz-setsave" id="rbzYsave" type="button">'+T('ذخیره','Save')+'</button></div>';
  } else if(k==='theme'){
    var card=function(t){ var on=u.theme===t.id, cols=themeColors(t);
      return '<div class="rbz-thcard'+(on?' on':'')+'"><div class="rbz-thh"><button class="rbz-thpick" data-theme="'+t.id+'" type="button">'+esc(T(t.fa,t.en))+'</button>'+
        (on?'<span class="rbz-tag good">'+T('فعال','Active')+'</span>':'')+(t.id==='shahin'?'<span class="rbz-tag">'+T('پیش‌فرض سازمان','Org default')+'</span>':'')+
        '<span class="rbx-spacer"></span><button class="rbz-ico" data-thcopy="'+t.id+'" type="button" title="'+T('کپی در تم‌های شما','Copy to your themes')+'"'+(MY_THEMES.length>=MAX_MY_THEMES?' disabled':'')+'>'+ic('copy')+'</button></div>'+
        '<button class="rbz-thstrip" data-theme="'+t.id+'" type="button" aria-label="'+esc(T(t.fa,t.en))+'">'+cols.map(function(c){ return '<span style="background:'+c+'"></span>'; }).join('')+'</button></div>'; };
    h+=setHead('تم رنگی','Color themes',1)+'<div class="rbz-setbody">'+
      '<div class="rbz-setsec"><span>'+T('از تم‌های خودتان','Select from your themes')+'</span><span class="rbx-spacer"></span><span class="rbz-cnt">'+num(MY_THEMES.length)+' / '+num(MAX_MY_THEMES)+'</span></div>'+
      MY_THEMES.map(card).join('')+
      '<button class="sh-btn ghost compact rbz-wide" id="rbzThNew" type="button"'+(MY_THEMES.length>=MAX_MY_THEMES?' disabled':'')+'>'+ic('plus')+T('ساختن تم رنگی','Create color theme')+'</button>'+
      '<div class="rbz-setsec"><span>'+T('از تم‌های سازمان','Select from org themes')+'</span></div>'+THEMES.map(card).join('')+'</div>';
  } else if(k==='sample'){
    h+=setHead('نمونه‌گیری هنگام پرسش','Query time sampling',1)+'<div class="rbz-setbody">'+
      '<div class="rbz-setsec"><button class="sh-btn ghost compact" id="rbzSampl" type="button">'+(u.sampling?T('غیرفعال کردن نمونه‌گیری','Disable sampling'):T('فعال کردن نمونه‌گیری','Enable sampling'))+'</button><span class="rbx-spacer"></span>'+
      '<span class="rbx-tipdot"'+tip("<span class='tip-title'>نمونه‌گیری هنگام پرسش</span>به‌جای همهٔ داده، ایونت‌های ۱۰٪ از کاربرانِ تصادفی خوانده و نتیجه برای کل جمعیت برآورد می‌شود؛ پاسخ سریع‌تر است ولی عدد برآوردی است.","<span class='tip-title'>Query time sampling</span>Reads events from a random 10% of users instead of all data and estimates the result for everyone; faster, but the numbers are estimates.")+'></span></div>'+
      '<p class="rbz-sethelp">'+T('با نمونه‌گیری، شاهین بخشی نماینده از داده را تحلیل می‌کند (ایونت‌های ۱۰٪ از کاربرانِ تصادفی) و نتیجه را برای کل جمعیت برآورد می‌کند.','With query time sampling, Shahin analyzes a representative subset of data (events from a randomly selected 10% of users) and estimates the result for the whole population.')+'</p>'+
      '<div class="rbz-note warn">'+ic('warning')+T('نمونه‌گیری روی دادهٔ بزرگ بهتر جواب می‌دهد؛ اگر دادهٔ پروژه برای نمونه‌گیری کم باشد، هشدار می‌دهیم.','Sampling works best with large datasets; you’ll be warned if the project’s data is too small for it.')+'</div></div>';
  } else if(k==='anom'){
    h+=setHead('ناهنجاری و پیش‌بینی','Anomaly & forecast',1)+'<div class="rbz-setbody">'+   /* PM 2026-10-25, AL-10 */
      '<div class="rbz-setsec"><button class="sh-btn ghost compact" id="rbzAnOn" type="button">'+(an.on?T('غیرفعال کردن ناهنجاری و پیش‌بینی','Disable anomaly & forecast'):T('فعال کردن ناهنجاری و پیش‌بینی','Enable anomaly & forecast'))+'</button><span class="rbx-spacer"></span>'+
      '<span class="rbx-tipdot"'+tip("<span class='tip-title'>ناهنجاری و پیش‌بینی</span>دور خط یک بازهٔ مورد انتظار می‌کشد و نقطه‌های بیرون از آن را ناهنجاری علامت می‌زند؛ پیش‌بینی، همان روند را چند روز جلوتر با بازهٔ اطمینانش نشان می‌دهد.","<span class='tip-title'>Anomaly & forecast</span>Draws an expected band around the line and flags points outside it as anomalies; the forecast extends the trend a few days ahead with its confidence band.")+'></span></div>'+
      '<div class="rbz-angrid'+(an.on?'':' off')+'"><div><b>'+T('حالت ناهنجاری','Anomaly mode')+'</b>'+
        [['agile','چابک','Agile'],['robust','پایدار','Robust'],['custom','سفارشی','Custom']].map(function(x){ return '<label class="rbz-ck"><input type="radio" name="rbzAnMode" value="'+x[0]+'"'+(an.mode===x[0]?' checked':'')+(an.on?'':' disabled')+'/>'+T(x[1],x[2])+'</label>'; }).join('')+'</div>'+
        '<div><b>'+T('بازهٔ اطمینان','Confidence interval')+'</b><select class="sh-select" id="rbzAnCi"'+(an.on&&an.mode==='custom'?'':' disabled')+'>'+[95,98,99].map(function(c){ return '<option value="'+c+'"'+(an.ci===c?' selected':'')+'>'+num(c)+T('٪','%')+'</option>'; }).join('')+'</select>'+
        '<b>'+T('دورهٔ پیشین','Prior period')+'</b><span class="rbz-inl"><input class="sh-input" id="rbzAnPrior" type="number" min="0" max="90" value="'+an.prior+'"'+(an.on&&an.mode==='custom'?'':' disabled')+'/>'+T('روز','days')+'</span></div></div>'+
      '<hr class="rbz-hr"/><b>'+T('افزودن پیش‌بینی','Add forecast')+'</b><label class="rbz-fl">'+T('دورهٔ پیش‌بینی','Forecast period')+'<span class="rbz-inl"><input class="sh-input" id="rbzAnFc" type="number" min="0" max="6" value="'+(an.fcm||'')+'"'+(an.on&&RB.rangeInfo().unit!=='hour'?'':' disabled')+'/>'+T('ماه','months')+'</span></label>'+(RB.rangeInfo().unit==='hour'?'<span class="rbx-note">'+T('پیش‌بینی روی نمودار ساعتی نیست.','No forecast on hourly charts.')+'</span>':'')+
      (an.on&&!anomOk()?'<div class="rbz-note">'+ic('info')+T('ناهنجاری و پیش‌بینی فقط روی نمودار خطی با یک تا سه سری و بدون مقایسهٔ دو دوره رسم می‌شود؛ در قیف، فقط «تبدیل در طول زمان» با شمارش کاربران.','Anomaly & forecast are drawn only on a line chart with one to three series and no period comparison; in a funnel, only conversion over time counted by users.')+'</div>':'')+'</div>';
  } else if(k==='ai'){
    h+=setHead('تحلیل با دستیار','Analyze')+'<div class="rbz-setbody">'+aiFindings()+'</div>';
  } else if(k==='ann'){
    h+=setHead('یادداشت‌ها','Annotations',1)+'<div class="rbz-setbody">'+
      '<div class="rbz-setsec"><span>'+T('دسته‌هایی که یادداشت‌هایشان روی نمودار دیده شود','Toggle which annotation categories are shown')+'</span><span class="rbx-spacer"></span>'+
      '<span class="rbx-tipdot"'+tip(/* PM 2026-10-25, RB-18: a day or a range, every chart or only this one */"<span class='tip-title'>یادداشت‌ها</span>یادداشت یک روز یا یک بازه را روی نمودار علامت می‌زند، مثل شروع کمپین، انتشار نسخه تازه یا یک قطعی، تا علت تغییر عددها کنار خود نمودار بماند؛ می‌تواند روی همه نمودارهای پروژه دیده شود یا فقط روی همین نمودار.","<span class='tip-title'>Annotations</span>An annotation marks a day or a date range on the chart, such as a campaign start, a new release or an outage, so the reason behind a change stays next to the chart; it can show on every chart in the project or only on this one.")+'></span></div>'+
      annCats().map(function(c){ return '<label class="rbz-ck"><input type="checkbox" data-anncat="'+esc(c.id)+'"'+(u.annOff[c.id]?'':' checked')+'/>'+esc(T(c.fa,c.en))+' <span class="rbz-cnt">'+num(c.n)+'</span></label>'; }).join('')+
      '<button class="sh-btn ghost compact rbz-wide" id="rbzAnnAdd" type="button"'+(canManage()?'':' disabled title="'+esc(T('فقط مالک و ادمین پروژه یادداشت می‌گذارند','Only the project owner and admins add annotations'))+'"')+'>'+ic('plus')+T('افزودن یادداشت','Add annotation')+'</button>'+(canManage()?'':'<span class="rbx-note">'+T('فقط مالک و ادمین پروژه یادداشت می‌گذارند.','Only the project owner and admins add annotations.')/* PM 2026-10-25, TG-4 */+'</span>')+'</div>';
  }
  return h+'</aside>';
}
/* Analyze (Amplitude's AI button): plain-language findings computed from this chart's own numbers — no causal claims — plus next steps that change the chart */
/* 11a: the numbers the «تحلیل» panel and the assistant hand-off read, from the same tile computation as dashboards */
function pnumX(v){ var t=String(v==null?'':v).replace(/<[^>]+>/g,'').replace(/[۰-۹]/g,function(c){ return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }).replace(/[٬,\s]/g,'').replace('٫','.').replace(/[^\d.\-]/g,''); return parseFloat(t); }
function tileNow(type){ try{ return RBAmp.tile({ amp:JSON.parse(JSON.stringify(A)), range:RB.Q.range, filters:RB.Q.filters }, null, type); }catch(e){ return null; } }
function aiFindingsFR(){
  var d=tileNow(isFunnel()?'funnel':'retention'), out=[];
  if(!d||!d.rows||!d.rows.length) return [T('برای این نما یافتهٔ مشخصی نیست.','No clear finding for this view.')];
  if(isFunnel()){ var c=d.rows.map(function(r){ return { n:r[0], v:pnumX(r[1]) }; }), worst=null;
    out.push(T('نرخ تبدیل کل قیف '+d.val+' است.','Overall funnel conversion is '+d.val+'.'));
    for(var i=1;i<c.length;i++){ var drop=c[i-1].v?(c[i-1].v-c[i].v)/c[i-1].v*100:0; if(!worst||drop>worst.d) worst={ a:c[i-1].n, b:c[i].n, d:drop }; }
    if(worst) out.push(T('بیشترین ریزش بین «'+worst.a+'» و «'+worst.b+'» است: '+num(worst.d,1)+'٪ از کسانی که به قدم قبل رسیدند.','The biggest drop-off is between “'+worst.a+'” and “'+worst.b+'”: '+num(worst.d,1)+'% of those who reached the earlier step.'));
  } else { out.push(T('بازگشت دورهٔ اول به‌طور میانگین '+d.val+' است ('+d.sub+').','Period-1 return averages '+d.val+' ('+d.sub+').'));
    var rs=d.rows.map(function(r){ return { n:r[0], v:pnumX(r[1]) }; }).filter(function(r){ return isFinite(r.v); });
    if(rs.length>1){ var hi=rs.slice().sort(function(a,b){ return b.v-a.v; })[0], lo=rs.slice().sort(function(a,b){ return a.v-b.v; })[0]; out.push(T('بهترین کوهورت «'+hi.n+'» با '+num(hi.v)+'٪ و ضعیف‌ترین «'+lo.n+'» با '+num(lo.v)+'٪ است.','The best cohort is “'+hi.n+'” at '+num(hi.v)+'% and the weakest “'+lo.n+'” at '+num(lo.v)+'%.')); } }
  return out; }
/* 11a: hand the chart to «دستیار» with a scenario built from this chart's own numbers (the assistant answers from them)
   PM 2026-10-25, cross-group (LX-15, member and viewer): a finding names a series by seriesName(), whose breakdown part (s.group) is built by
   dacLabel() and whose segment part goes through fltLabel() → dacVal(), so a Personal or Sensitive breakdown value reaches the assistant masked.
   The funnel and retention findings name steps and cohorts only; the main number's subtitle is the measure and range, with no breakdown value. */
function askAssistant(){
  if(!window.shahinAsk||!shahinAsk.register){ U.toast('دستیار در این صفحه در دسترس نیست','The assistant isn’t available on this page'); return; }
  var id=(window.SHAHIN_PAGE||{}).id||'report-builder', type=isFunnel()?'funnel':isRet()?'retention':'trend', d=tileNow(type), name=(window.RBH&&RBH.current()>=0&&RB.SAVED[RBH.current()])?T(RB.SAVED[RBH.current()].fa,RB.SAVED[RBH.current()].en):T('این نمودار','this chart');
  var finds=type==='trend'?(function(){ var res=lastRes; if(!res) return []; var x=drawn(res)[0]; if(!x) return []; var L=res.labels[fa()?'fa':'en'], n=L.length, li=n-2, a=x.values[0], b=x.values[li], dd=a?(b-a)/a*100:0, mx=Math.max.apply(null,x.values.slice(0,n-1)), pk=x.values.indexOf(mx);
      return [{ fa:'«'+seriesName(x).replace(/^[A-J] · /,'')+'» از '+res.labels.fa[0]+' تا '+res.labels.fa[li]+' '+(dd>=0?num(dd,1)+'٪ بیشتر':num(-dd,1)+'٪ کمتر')+' شده؛ اوجش '+res.labels.fa[pk]+' بود.', en:'“'+seriesName(x).replace(/^[A-J] · /,'')+'” moved '+num(Math.abs(dd),1)+'% '+(dd>=0?'up':'down')+' from '+res.labels.en[0]+' to '+res.labels.en[li]+'; it peaked on '+res.labels.en[pk]+'.', vals:x.values.slice(0,n-1), days:res.labels.fa.slice(0,n-1), daysEn:res.labels.en.slice(0,n-1) }]; })()
    :aiFindingsFR().map(function(t){ return { fa:t, en:t }; });
  var main=d?{ fa:'عدد اصلی «'+name+'»: '+d.val+' — '+String(d.sub).replace(/<[^>]+>/g,''), en:'The main number of “'+name+'”: '+d.val+' — '+String(d.sub).replace(/<[^>]+>/g,'') }:null;
  var sc={ openers:{ fa:['در «'+name+'» چه چیزی غیرعادی است؟','این عدد چطور حساب شده؟','قدم بعدی بررسی چیست؟'], en:['What is unusual in “'+name+'”?','How is this number calculated?','What should I look at next?'] },
    checks:{ fa:['عددهای همین نمودار را با همان بازه و فیلترها خواندم.','نقطه‌های بیرون از بازهٔ مورد انتظار را جدا کردم.'], en:['Read this chart’s numbers with the same range and filters.','Separated the points outside the expected band.'] },
    claims:[].concat(main?[{ kind:'known', ev:finds[0]&&finds[0].vals?'trend':null, fa:main.fa, en:main.en }]:[]).concat(finds.map(function(f,k){ return { kind:'known', ev:k===0&&f.vals&&!main?'trend':null, fa:f.fa, en:f.en }; }))
      .concat([{ kind:'nodata', ev:null, fa:'از عددهای این نمودار نمی‌شود گفت چرا تغییر کرده؛ برای علت، تفکیک یا تحلیل علت ریشه‌ای لازم است.', en:'This chart’s numbers can’t say why it changed; finding the cause needs a breakdown or root cause analysis.' }]),
    followUp:[{ kind:'likely', ev:null, fa:'اگر تغییر هم‌زمان با یک انتشار یا کمپین است، نشانگرش را روی همین نمودار ببینید.', en:'If the change lines up with a release or campaign, look for its marker on this chart.' }],
    next:{ fa:['همین نمودار را به تفکیک نوع دستگاه ببین','با هفتهٔ قبل مقایسه کن'], en:['Break this chart down by device type','Compare with the previous week'] },
    charts:finds[0]&&finds[0].vals?{ trend:{ kind:'line', title:{ fa:name, en:name }, days:finds[0].days, daysEn:finds[0].daysEn, values:finds[0].vals.map(function(v){ return Math.round(v); }), breakAt:finds[0].vals.indexOf(Math.max.apply(null, finds[0].vals)), breakLabel:{ fa:'اوج', en:'Peak' } } }:{} };
  shahinAsk.register(id, sc); shahinAsk.askWith(T('این نمودار را برایم توضیح بده: «'+name+'»','Explain this chart to me: “'+name+'”')); }
function aiFindings(){
  var res=lastRes; if(isFunnel()||isRet()){ var ff=aiFindingsFR();
    return '<p class="rbz-sethelp">'+T('یافته‌ها فقط از عددهای همین نمودار درآمده‌اند و علت تغییر را نمی‌گویند.','Findings come only from this chart’s numbers and don’t explain causes.')+'</p><ul class="rbz-ai">'+ff.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join('')+'</ul>'+
      '<button class="sh-btn primary compact rbz-wide" id="rbzAskAi" type="button">'+ic('sparkle')+T('پرسیدن از دستیار دربارهٔ این نمودار','Ask the assistant about this chart')+'</button>'+(window.RBAi?'<button class="sh-btn ghost compact rbz-wide" id="rbzEditAi" type="button">'+ic('pencil-simple')+T('ویرایش نمودار با دستیار','Edit this chart with the assistant')+'<span class="rbx-badge road">'+T('نقشهٔ راه','Roadmap')+'</span></button>':'')+''; }
  if(!res) return '<p class="rbz-sethelp">'+T('برای تحلیل، اول یک ایونت به نمودار روند اضافه کنید.','Add an event to the trend chart first.')+'</p>';
  var list=drawn(res).slice(0,3), L=res.labels[fa()?'fa':'en'], out=[], n=L.length;
  list.forEach(function(x){ if(res.hist||n<3) return; var li=n-2, a=x.values[0], b=x.values[li], d=a?(b-a)/a*100:0, mx=Math.max.apply(null,x.values.slice(0,n-1)), pk=x.values.indexOf(mx), nm=seriesName(x).replace(/^[A-J] · /,'');
    out.push(T('«'+nm+'» از '+L[0]+' تا '+L[li]+' '+(d>=0?num(d,1)+'٪ بیشتر':num(-d,1)+'٪ کمتر')+' شده است.','“'+nm+'” is '+num(Math.abs(d),1)+'% '+(d>=0?'higher':'lower')+' on '+L[li]+' than on '+L[0]+'.'));
    out.push(T('اوجِ «'+nm+'» در '+L[pk]+' بود: '+fmtVal(A,mx)+'.','“'+nm+'” peaked on '+L[pk]+' at '+fmtVal(A,mx)+'.'));
    var an=anomaly(x.values.slice(0,n-1), { mode:'agile', ci:95, fc:0 }), fl=an.flags.map(function(f,i){ return f?L[i]:null; }).filter(Boolean);
    if(fl.length) out.push(T('مقدار «'+nm+'» در '+fl.join('، ')+' بیرون از بازهٔ مورد انتظار بود.','“'+nm+'” fell outside the expected band on '+fl.join(', ')+'.')); });
  var segRows=res.overall.filter(function(o){ return o.letter==='A'; });
  if(segRows.length>1){ var srt=segRows.slice().sort(function(a,b){ return b.total-a.total; });
    out.push(T('در ایونت A، گروه «'+srt[0].segName+'» با '+fmtVal(A,srt[0].total)+' بیشترین و «'+srt[srt.length-1].segName+'» با '+fmtVal(A,srt[srt.length-1].total)+' کمترین مقدار را دارد.','For event A, “'+srt[0].segName+'” is highest ('+fmtVal(A,srt[0].total)+') and “'+srt[srt.length-1].segName+'” lowest ('+fmtVal(A,srt[srt.length-1].total)+').')); }
  out=out.slice(0,6);
  if(!out.length) out.push(T('برای این نما یافتهٔ مشخصی نیست.','No clear finding for this view.'));
  var next=[['week','مقایسه با هفتهٔ قبل','Compare with the previous week'],['device','تفکیک ایونت A بر اساس نوع دستگاه','Break event A down by device type'],['anom','نمایش ناهنجاری و پیش‌بینی','Show anomaly & forecast']];
  return '<p class="rbz-sethelp">'+T('یافته‌ها فقط از عددهای همین نمودار درآمده‌اند و علت تغییر را نمی‌گویند.','Findings come only from this chart’s numbers and don’t explain causes.')+'</p>'+
    '<ul class="rbz-ai">'+out.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join('')+'</ul>'+
    '<button class="sh-btn primary compact rbz-wide" id="rbzAskAi" type="button">'+ic('sparkle')+T('پرسیدن از دستیار دربارهٔ این نمودار','Ask the assistant about this chart')+'</button>'+(window.RBAi?'<button class="sh-btn ghost compact rbz-wide" id="rbzEditAi" type="button">'+ic('pencil-simple')+T('ویرایش نمودار با دستیار','Edit this chart with the assistant')+'<span class="rbx-badge road">'+T('نقشهٔ راه','Roadmap')+'</span></button>':'')+'<b>'+T('قدم بعدی','Next steps')+'</b>'+
    next.map(function(x){ return '<button class="sh-btn ghost compact rbz-wide" data-ainext="'+x[0]+'" type="button">'+ic('sparkle')+T(x[1],x[2])+'</button>'; }).join('');
}
function annCats(){ var list=[{ id:'', fa:'بدون دسته', en:'Uncategorized' }].concat(ANN_CATS);
  return list.map(function(c){ return Object.assign({ n:ANNOTS.filter(function(a){ return (a.cat||'')===c.id; }).length }, c); }).filter(function(c){ return c.id===''||c.n; }); }
function anomOk(){ if(isFunnel()) return A.ui.anom.on && A.funnel.view==='time' && (A.funnel.count||'uniques')==='uniques';   /* Amplitude: conversion over time counted by unique users for the entire funnel */ if(isRet()) return A.ui.anom.on && A.ret.shown==='time' && A.ret.meas!=='usage';   /* Amplitude: anomaly on Retention over time */
  if(isJourney()) return false; return A.ui.anom.on && A.viz==='line' && !isHist(A) && !A.compare.length; }   /* Amplitude: any unit incl. monthly; never with a comparison of two periods */
/* unit of measurement: labels only */
function unitFmt(v){ var u=A.ui, x=compact(v);
  if(u.yunit==='%') return num(v*100<1000?v*100:v,0)+T('٪','%');
  if(u.yunit==='cur') return x+curTxt();
  if(u.yunit==='custom') return (u.ypre||'')+x+(u.ysuf||'');
  return x; }
function wireSettings(){
  var pn=root.querySelector('.rbz-set'); if(!pn) return; var u=A.ui;
  pn.querySelectorAll('[data-setgo]').forEach(function(b){ b.addEventListener('click', function(){ SET_OPEN=b.getAttribute('data-setgo'); render(); }); });
  pn.querySelectorAll('[data-setclose]').forEach(function(b){ b.addEventListener('click', function(){ SET_OPEN=null; render(); }); });
  var v=function(id){ var e=$(id); return e?e.value:''; };
  var lg=$('rbzLeg'); if(lg) lg.addEventListener('change', function(){ u.legend=lg.checked; changed(); });   /* PM 2026-11-01, B15 */
  var lb=$('rbzLab'); if(lb) lb.addEventListener('change', function(){ u.labels=lb.checked; changed(); });
  var ys=$('rbzYsave'); if(ys) ys.addEventListener('click', function(){ u.ytitle=v('rbzYt').trim(); u.ymin=v('rbzYmin'); u.ymax=v('rbzYmax'); u.yout=$('rbzYout').checked; u.ylog=$('rbzYlog').checked;
    if($('rbzYpre')){ u.ypre=v('rbzYpre'); u.ysuf=v('rbzYsuf'); } changed(); U.toast('تنظیمات محور ذخیره شد','Y-axis settings saved'); });
  var yr=$('rbzYreset'); if(yr) yr.addEventListener('click', function(){ u.ytitle=''; u.ymin=''; u.ymax=''; u.yout=false; u.ylog=false; u.yunit='#'; u.ypre=''; u.ysuf=''; changed(); });
  /* switching the unit keeps what was typed in the form so far */
  pn.querySelectorAll('[data-yunit]').forEach(function(b){ b.addEventListener('click', function(){ u.ytitle=v('rbzYt').trim(); u.ymin=v('rbzYmin'); u.ymax=v('rbzYmax'); u.yout=$('rbzYout').checked; u.ylog=$('rbzYlog').checked; u.yunit=b.getAttribute('data-yunit'); changed(); }); });
  pn.querySelectorAll('[data-theme]').forEach(function(b){ b.addEventListener('click', function(){ u.theme=b.getAttribute('data-theme'); changed(); }); });
  pn.querySelectorAll('[data-thcopy]').forEach(function(b){ b.addEventListener('click', function(){ if(MY_THEMES.length>=MAX_MY_THEMES) return; var t=themeById(b.getAttribute('data-thcopy'));
    MY_THEMES.push({ id:'my'+Date.now().toString(36), fa:'کپی '+t.fa, en:'Copy of '+t.en, colors:themeColors(t) }); render(); }); });
  var tn=$('rbzThNew'); if(tn) tn.addEventListener('click', themeModal);
  var sp=$('rbzSampl'); if(sp) sp.addEventListener('click', function(){ u.sampling=!u.sampling; changed(); });
  var ao=$('rbzAnOn'); if(ao) ao.addEventListener('click', function(){ u.anom.on=!u.anom.on; changed(); });
  pn.querySelectorAll('input[name="rbzAnMode"]').forEach(function(r){ r.addEventListener('change', function(){ u.anom.mode=r.value; if(r.value==='agile'){ u.anom.ci=95; u.anom.prior=0; } if(r.value==='robust'){ u.anom.ci=99; u.anom.prior=0; } changed(); }); });
  var ci=$('rbzAnCi'); if(ci) ci.addEventListener('change', function(){ u.anom.ci=+ci.value; changed(); });
  var pr=$('rbzAnPrior'); if(pr) pr.addEventListener('change', function(){ u.anom.prior=Math.max(0,Math.min(90,+pr.value||0)); changed(); });
  var fc=$('rbzAnFc'); if(fc) fc.addEventListener('change', function(){ u.anom.fcm=Math.max(0,Math.min(6,+fc.value||0)); changed(); });
  pn.querySelectorAll('[data-anncat]').forEach(function(c){ c.addEventListener('change', function(){ u.annOff[c.getAttribute('data-anncat')]=!c.checked; changed(); }); });
  var aa=$('rbzAnnAdd'); if(aa) aa.addEventListener('click', annModal);
  var aq=pn.querySelector('#rbzAskAi'); if(aq) aq.addEventListener('click', askAssistant);
  var ae=pn.querySelector('#rbzEditAi'); if(ae) ae.addEventListener('click', function(){ RBAi.composer({ mode:'edit' }); });
  pn.querySelectorAll('[data-ainext]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-ainext');
    /* B11 (2026-10-24): an assistant suggestion changes the chart only after a preview and a confirm (PM rule for assistant writes) */
    if(!b._ok){ var lbl=b.textContent.trim(); U.confirmBox({ fa:'پیشنهاد دستیار', en:'Assistant suggestion', tone:'warn', bodyFa:'این تغییر روی همین نمودار اعمال شود؟ «'+lbl+'». نمودار ذخیره نمی‌شود و می‌توانید برگردانید.', bodyEn:'Apply this change to this chart? “'+lbl+'”. The chart isn’t saved and you can undo it.', okFa:'اعمال', okEn:'Apply', fn:function(){ b._ok=1; b.click(); b._ok=0; } }); return; }
    if(k==='week'){ if(A.compare.indexOf('week')<0){ if(A.compare.length>=2) A.compare.pop(); A.compare.push('week'); } if(!canDrawCompare(A)) A.viz='line'; trimSel(); }
    if(k==='device'&&A.events[0]){ var g=chartGb(); if(g.indexOf('device_type')<0&&g.length<MAX_GB){ g.push('device_type'); setGb(g)/* PM 2026-10-31, outcome 1: B04 */; A.sel=null; } }
    if(k==='anom'){ A.ui.anom.on=true; A.ui.anom.fcm=A.ui.anom.fcm||1; A.viz='line'; }
    SET_OPEN=k==='anom'?'anom':null; changed(); }); });
}
function themeModal(){
  var base=themeColors(themeById(A.ui.theme));
  U.modal({ fa:'ساختن تم رنگی', en:'Create color theme', subFa:'تم شما فقط برای خودتان است و تا ۵ تم می‌توانید داشته باشید.', subEn:'Your themes are personal; you can keep up to 5.',
    body:'<label class="rbz-fl">'+T('نام تم','Theme name')+'<input class="sh-input" id="rbzThN" placeholder="'+T('مثلاً تم کمپین','e.g. Campaign theme')+'"/></label><div class="rbz-thpick6">'+base.map(function(c,i){ return '<input type="color" data-thc="'+i+'" value="'+toHex(c)+'" aria-label="'+T('رنگ ','Color ')+(i+1)+'"/>'; }).join('')+'</div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ساختن', en:'Create', fn:function(bd){ var nm=bd.querySelector('#rbzThN').value.trim(); if(!nm){ U.toast('نام تم را بنویسید','Name the theme'); return false; }
      var id='my'+Date.now().toString(36); MY_THEMES.push({ id:id, fa:nm, en:nm, colors:[].map.call(bd.querySelectorAll('[data-thc]'),function(x){ return x.value; }) }); A.ui.theme=id; changed(); } }] });
}
function toHex(c){ if(/^#[0-9a-f]{6}$/i.test(c)) return c; var m=/(\d+)\D+(\d+)\D+(\d+)/.exec(c||''); return m?'#'+[m[1],m[2],m[3]].map(function(x){ return ('0'+(+x).toString(16)).slice(-2); }).join(''):'#888888'; }
/* Block C (2026-10-24, gap audit 49b A52): a date range, a description, visibility (every chart or only this one), the project owner and admins only (PM 2026-10-25, TG-4) */
function annModal(){
  if(!canManage()){ U.toast('فقط مالک و ادمین پروژه یادداشت می‌گذارند','Only the project owner and admins add annotations'); return; }
  var L=lastRes?lastRes.labels[fa()?'fa':'en']:[], n=L.length, cur=window.RBH?RBH.current():-1;
  U.modal({ fa:'افزودن یادداشت', en:'Add annotation', subFa:'یک روز یا یک بازه را روی نمودار علامت بزنید؛ مثلاً یک کمپین یا یک قطعی.', subEn:'Mark a day or a span on the chart, such as a campaign or an outage.',
    body:'<div class="rbx-row"><label class="rbz-fl" style="flex:1">'+T('از','From')+'<select class="sh-select" id="rbzAnD">'+L.map(function(l,i){ return '<option value="'+i+'">'+esc(l)+'</option>'; }).join('')+'</select></label>'+
      '<label class="rbz-fl" style="flex:1">'+T('تا (اختیاری)','To (optional)')+'<select class="sh-select" id="rbzAnE"><option value="">'+T('همان روز','Same day')+'</option>'+L.map(function(l,i){ return '<option value="'+i+'">'+esc(l)+'</option>'; }).join('')+'</select></label></div>'+
      '<label class="rbz-fl">'+T('عنوان','Title')+'<input class="sh-input" id="rbzAnT" placeholder="'+T('مثلاً انتشار نسخهٔ جدید سایت','e.g. New site release')+'"/></label>'+
      '<label class="rbz-fl">'+T('توضیح (اختیاری)','Description (optional)')+'<textarea class="sh-input" id="rbzAnX" rows="2"></textarea></label>'+
      '<label class="rbz-fl">'+T('کجا دیده شود','Visible on')+'<select class="sh-select" id="rbzAnV"><option value="all">'+T('همهٔ نمودارهای پروژه','Every chart in the project')+'</option><option value="chart"'+(cur<0?' disabled':'')+'>'+T('فقط همین نمودار','Only this chart')+(cur<0?T(' (اول ذخیره کنید)',' (save first)'):'')+'</option></select></label>'+
      '<label class="rbz-fl">'+T('دسته','Category')+'<input class="sh-input" id="rbzAnC" list="rbzAnCats" placeholder="'+T('بدون دسته','Uncategorized')+'"/><datalist id="rbzAnCats">'+ANN_CATS.map(function(c){ return '<option value="'+esc(c.fa)+'">'; }).join('')+'</datalist></label>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'افزودن', en:'Add', fn:function(bd){ var t=bd.querySelector('#rbzAnT').value.trim(); if(!t){ U.toast('عنوان یادداشت را بنویسید','Give the annotation a title'); return false; }
      var c=bd.querySelector('#rbzAnC').value.trim(), cid='';
      if(c){ var ex=ANN_CATS.filter(function(x){ return x.fa===c; })[0]; if(!ex){ ex={ id:'c'+(ANN_CATS.length+1), fa:c, en:c }; ANN_CATS.push(ex); } cid=ex.id; }
      var d0=+bd.querySelector('#rbzAnD').value, e0=bd.querySelector('#rbzAnE').value, d1=e0===''?null:+e0;
      if(d1!=null&&d1<d0){ U.toast('پایان بازه نباید پیش از شروعش باشد','The end can’t come before the start'); return false; }
      var x=bd.querySelector('#rbzAnX').value.trim(), vis=bd.querySelector('#rbzAnV').value;
      ANNOTS.push({ id:'an'+(ANNOTS.length+1), p:n>1?d0/(n-1):0, p2:d1!=null&&d1!==d0&&n>1?d1/(n-1):null, fa:t, en:t, desc:x, cat:cid, chart:vis==='chart'?cur:null, by:PROLE }); changed(); U.toast('یادداشت اضافه شد','Annotation added'); } }] });
}
/* expected band (anomaly) and forecast for one series: rolling mean of the previous points ± z·σ of the residuals */
/* forecast length is set in months (Amplitude); points follow the chart's unit; hourly charts get none */
function fcPoints(unit){ var m=A.ui.anom.fcm!=null?A.ui.anom.fcm:(A.ui.anom.fc?Math.max(1,Math.round(A.ui.anom.fc/30)):0); return !m?0:unit==='day'?Math.round(m*30):unit==='week'?Math.round(m*4.35):unit==='month'?m:0; }
function anomaly(vals, an){
  var w=an.mode==='robust'?14:an.mode==='custom'?Math.max(3,Math.min(30,an.prior||7)):7, z={ 90:1.645, 95:1.96, 98:2.326, 99:2.576 }[an.ci]||1.96;
  var mean=vals.map(function(x,i){ var s=vals.slice(Math.max(0,i-w),i); if(!s.length) return x; return s.reduce(function(a,b){ return a+b; },0)/s.length; });
  var res=vals.map(function(x,i){ return x-mean[i]; }).slice(1), sd=Math.sqrt(res.reduce(function(a,b){ return a+b*b; },0)/Math.max(1,res.length))||1;
  if(an.mode==='robust') sd*=1.25;
  var lo=mean.map(function(m){ return Math.max(0,m-z*sd); }), hi=mean.map(function(m){ return m+z*sd; });
  var flags=vals.map(function(x,i){ return i>0 && (x<lo[i]||x>hi[i]); });
  var last=mean[mean.length-1], slope=(vals[vals.length-1]-vals[Math.max(0,vals.length-1-w)])/Math.max(1,w);
  var fc=[]; for(var k=1;k<=(an.fc||0);k++){ var m=Math.max(0,last+slope*k*0.5), s=z*sd*Math.sqrt(1+k/w); fc.push({ m:m, lo:Math.max(0,m-s), hi:m+s }); }
  return { lo:lo, hi:hi, flags:flags, fc:fc };
}
/* ══════════ funnel (phase 2 step 3a) — Amplitude Funnel Analysis; spec research-notes 12, chart gate 13, copy 11 «Step 3a» ══════════
   Amplitude rule kept on purpose: segment conditions (and global filters) apply to step 1 only; later steps are narrowed by their own filters. */
var WIN_U={ sec:['ثانیه','seconds',1/86400], min:['دقیقه','minutes',1/1440], hour:['ساعت','hours',1/24], day:['روز','days',1], week:['هفته','weeks',7] };   /* Block C: seconds and minutes (Amplitude: 1 second minimum) */
var ORDER={ 'this':['به همین ترتیب','In this order'], any:['به هر ترتیبی','In any order'], exact:['دقیقاً پشت سر هم','In exact order'] };
var HEAD={ total:['نرخ تبدیل کل','Overall conversion'], drop:['بزرگ‌ترین ریزش','Biggest drop-off'], slow:['کندترین قدم','Slowest step'] };
var MAX_STEPS=10;
var FTIPS={
  steps:["<span class='tip-title'>قدم‌های قیف</span>کارهایی که کاربر باید پشت سر هم انجام دهد؛ هر کاربر از قدم اول وارد قیف می‌شود و فقط اگر قدم‌های بعدی را در پنجرهٔ تبدیل انجام دهد، تبدیل‌شده حساب می‌شود.","<span class='tip-title'>Funnel steps</span>The actions a user must complete in sequence; users enter at the first step and count as converted only if they finish the later steps within the conversion window."],
  order:["<span class='tip-title'>ترتیب قدم‌ها</span>«به همین ترتیب» یعنی قدم‌ها به همین ترتیب انجام شوند و کارهای دیگر در بین مجاز است؛ «دقیقاً پشت سر هم» هیچ کار دیگری را در بین نمی‌پذیرد و «به هر ترتیبی» فقط انجام همهٔ قدم‌ها را می‌خواهد.","<span class='tip-title'>Step order</span>“In this order” needs the steps in sequence with other actions allowed in between; “In exact order” allows nothing in between, and “In any order” only needs every step done."],
  win:["<span class='tip-title'>پنجره تبدیل</span>حداکثر زمانی که کاربر از قدم اول فرصت دارد تا آخرین قدم را انجام دهد؛ به‌صورت پیوسته (مثلا ۲۴ ساعت) حساب می‌شود، نه بر اساس روز تقویمی؛ در مجموع حداکثر ۹۰ روز.","<span class='tip-title'>Conversion window</span>The longest time a user has from the first step to finish the last one; counted as a rolling period (such as 24 hours), not by calendar day; up to 90 days in total."]   /* PM 2026-10-28, CR-2 */,
  count:["<span class='tip-title'>شمارش</span>«کاربران» هر نفر را یک بار و با کامل‌ترین مسیرش می‌شمارد؛ «دفعات» هر بار عبور از قیف را جدا حساب می‌کند.","<span class='tip-title'>Counting</span>“Users” counts each person once, by their most complete path; “Totals” counts every pass through the funnel."],
  time:["<span class='tip-title'>نرخ تبدیل در طول زمان</span>نرخ تبدیل کسانی که در هر روز (یا هفته) وارد قیف شده‌اند؛ دوره‌هایی که پنجرهٔ تبدیلشان هنوز تمام نشده نقطه‌چین‌اند.","<span class='tip-title'>Conversion over time</span>The conversion rate of users who entered the funnel on each day (or week); periods whose conversion window hasn’t closed yet are dotted."],
  total:["<span class='tip-title'>نرخ تبدیل کل</span>سهم کسانی که همهٔ قدم‌ها را انجام داده‌اند از کسانی که قدم اول را انجام داده‌اند.","<span class='tip-title'>Overall conversion</span>The share of users who completed every step, out of those who did the first step."],
  drop:["<span class='tip-title'>بزرگ‌ترین ریزش</span>قدمی که بیشترین تعداد کاربر را نسبت به قدم قبل از دست داده؛ به تعداد نفر سنجیده می‌شود، نه درصد.","<span class='tip-title'>Biggest drop-off</span>The step that lost the most users from the previous step, measured in people rather than percentage."],
  slow:["<span class='tip-title'>کندترین قدم</span>قدمی که میانهٔ زمان رسیدن به آن از قدم قبل، از همه طولانی‌تر است.","<span class='tip-title'>Slowest step</span>The step with the longest median time from the previous step."],
  ttc:["<span class='tip-title'>زمان تبدیل</span>از کسانی که قیف را کامل کرده‌اند، چند درصد در هر بازهٔ زمانی از قدم اول به قدم آخر رسیده‌اند؛ خط عمودی میانه است و بر اساس اولین تبدیلِ هر نفر حساب می‌شود.","<span class='tip-title'>Time to convert</span>Of the users who completed the funnel, the share who got from the first to the last step within each time bucket; the vertical line is the median, based on each person’s first conversion."],
  freq:["<span class='tip-title'>تکرار</span>کاربران بر اساس اینکه یک ایونت را چند بار پیش از اولین انجام ایونت مقصد انجام داده‌اند دسته‌بندی می‌شوند؛ مثلاً چند بار جستجو کرده‌اند تا اولین خرید.","<span class='tip-title'>Frequency</span>Users grouped by how many times they did one event before first doing the target event, such as searches before the first purchase."],
  hold:["<span class='tip-title'>ثابت نگه داشتن ویژگی</span>کاربر فقط وقتی جلو می‌رود که مقدار این ویژگی در همهٔ قدم‌ها یکی باشد؛ با «نشست»، همهٔ قدم‌ها باید در یک نشست انجام شوند و شمارش بر اساس نشست است.","<span class='tip-title'>Hold property constant</span>A user advances only when this property has the same value at every step; with “Session”, every step must happen in one session and the funnel counts sessions."],
  optional:["<span class='tip-title'>قدم اختیاری</span>قیف دو بار حساب می‌شود، یک بار با این قدم و یک بار بدون آن، تا ببینید این قدم چقدر روی تبدیل اثر دارد.","<span class='tip-title'>Optional step</span>The funnel is computed twice, with and without this step, so you can see how much the step affects conversion."],
  sig:["<span class='tip-title'>معناداری</span>احتمال اینکه تفاوت نرخ تبدیل هر گروه با گروه پایه واقعی باشد و از شانس نیاید؛ فقط وقتی هر گروه بیش از ۳۰ ورودی دارد حساب می‌شود و از ۹۵٪ به بالا «معنادار» است.","<span class='tip-title'>Significance</span>How likely it is that each segment’s conversion differs from the baseline for real rather than by chance; computed only when every segment has more than 30 entrants, and “significant” from 95% up."],
  corr:["<span class='tip-title'>امتیاز همبستگی</span>عددی بین ۱- و ۱ که نشان می‌دهد انجام این ایونت چقدر با تبدیل (یا ریزش) همراه است؛ همراهی است، نه علت.","<span class='tip-title'>Correlation score</span>A number from −1 to 1 showing how closely doing this event goes with converting (or dropping off); association, not cause."],
  psum:["<span class='tip-title'>جمع ویژگی در قدم آخر</span>جمع مقدار یک ویژگی عددی (مثل مبلغ) روی ایونت قدم آخر، برای کسانی که قیف را کامل کرده‌اند.","<span class='tip-title'>Sum of a property at the final step</span>The sum of a numeric property (such as amount) on the final step’s event, for users who completed the funnel."],
  notReached:["<span class='tip-title'>به این قدم نرسید</span>کسانی که پیش از رسیدن به قدمِ تفکیک‌شده ریزش کرده‌اند؛ چون مقدار ویژگی آن قدم را هرگز ثبت نکرده‌اند، جدا شمرده می‌شوند.","<span class='tip-title'>Did not reach this step</span>Users who dropped off before reaching the broken-down step; they never recorded that step’s property value, so they are counted separately."],
  excl:["<span class='tip-title'>حذف کسانی که … را انجام داده‌اند</span>کاربرانی که این ایونت را بین قدم‌های انتخابی انجام داده‌اند از تبدیل‌شده‌ها کنار گذاشته می‌شوند؛ مثلاً کسانی که بین افزودن به سبد و خرید، سفارش را لغو کرده‌اند.","<span class='tip-title'>Exclude users who did</span>Users who performed this event between the chosen steps are left out of the conversions, such as people who cancelled between add-to-cart and purchase."]
};
function blankFunnel(){ return { order:'this', win:{ n:1, u:'day' }, count:'uniques', view:'conv', scope:0, excl:[], head:'total', ttcMode:'dist', ttcScope:0, freqX:'', freqY:'', cmp:'', hold:'', optional:-1, gb:null, baseline:'', cmpEv:[], firstDay:false, ms:false, psum:'', abBase:0 }; }
/* PM 2026-10-28, CR-2: any number and unit up to 90 days in total (90 days, 12 weeks, 2160 hours…); a bigger number is cut to the cap and the toast names the 90-day total */
var WIN_CAP={ sec:7776000, min:129600, hour:2160, day:90, week:12 };
function winClamp(w, quiet){ var cap=WIN_CAP[w.u||'day']||90, n=Math.max(1, parseInt(w.n,10)||1);
  if(n>cap){ n=cap; if(!quiet) U.toast('پنجره تبدیل حداکثر ۹۰ روز است؛ مقدار روی '+num(cap)+' '+WIN_U[w.u||'day'][0]+' تنظیم شد','The conversion window is capped at 90 days; it’s set to '+num(cap)+' '+WIN_U[w.u||'day'][1]); }   /* PM 2026-10-28, CR-2 */
  w.n=n; return w; }
function winDays(w){ return Math.max(1/86400, (+w.n||1)*WIN_U[w.u||'day'][2]); }
function winText(w){ return T('تکمیل در ظرف '+num(w.n)+' '+WIN_U[w.u][0], 'Completed within '+w.n+' '+WIN_U[w.u][1]); }
function fmtDur(min){ if(min<1) return T(num(Math.max(1,Math.round(min*60)))+' ثانیه', Math.max(1,Math.round(min*60))+' s'); if(min<60) return T(num(Math.max(1,Math.round(min)))+' دقیقه', Math.max(1,Math.round(min))+' min'); if(min<1440) return T(num(min/60,1)+' ساعت', num(min/60,1)+' h'); return T(num(min/1440,1)+' روز', num(min/1440,1)+' d'); }
function pctTxt(x){ return (x==null||isNaN(x))?'—':num(x,1)+T('٪','%'); }
function stepLabel(k){ var e=A.events[k]; return num(k+1)+'. '+(e.label||evName(e.id))+(e.or||[]).map(function(id){ return T(' یا ',' or ')+evName(id); }).join(''); }
function exclLabel(x){ return T('حذف: «'+evName(x.ev)+'» '+(x.from?'بین قدم '+num(x.from)+' و '+num(x.from+1):'بین همهٔ قدم‌ها'), 'Exclude: “'+evName(x.ev)+'” '+(x.from?'between steps '+x.from+' and '+(x.from+1):'between all steps')); }
function wOf(e){ var w=(getEv(e.id)||{ w:1 }).w||1; (e.or||[]).forEach(function(id){ w+=(getEv(id)||{ w:0 }).w||0; }); return w; }
/* one funnel run over a list of step indexes: conversion per step from event volumes, window, order, filters, exclusions, held property, segment tilt */
function stepCap(st, k0, k, gf){ try{ var F=st.funnel, e0=st.events[k0], ek=st.events[k];
    function base(e){ if(gf) e=Object.assign({}, e, { filters:(e.filters||[]).concat([gf]) }); return F.count==='totals'||F.hold==='_session'?RB.sum(baseSeries(e,false)):RB.periodUniques(baseSeries(e,true)); }
    var b0=base(e0); return b0?Math.min(1, base(ek)/b0):null; }catch(x){ return null; } }
function runSteps(st, idx, start, sf, seed, tilt, gf){
  var F=st.funnel, wd=winDays(F.win), g=Math.pow(wd,0.25), reached=[start], med=[0], avg=[0];
  for(var j=1;j<idx.length;j++){
    var ea=st.events[idx[j-1]], eb=st.events[idx[j]], k=idx[j], a=getEv(ea.id), b=getEv(eb.id);
    var p=0.18+0.7*Math.sqrt(Math.min(1,wOf(eb)/Math.max(1,wOf(ea))))*(0.8+0.3*jitter(a.id+'>'+b.id,k));
    p=1-Math.pow(1-Math.min(0.95,p), g);                        /* a longer window leaves more time to convert */
    if(F.order==='any') p=1-Math.pow(1-p,1.12); else if(F.order==='exact') p*=0.55;
    (eb.filters||[]).forEach(function(f){ p*=RB.oneFilterFactor(f); });
    F.excl.forEach(function(x){ if(!x.from||x.from===k) p*=1-(0.04+0.12*jitter(x.ev,k)); });
    if(F.hold) p*=F.hold==='_session'?0.62:0.84;                 /* every step must share the value (or the session) */
    if(F.firstDay && (st.segments[0]||{}).who==='new') p*=0.6;   /* new users: only conversions on their first day count */
    if(F.ms) p*=1.02;                                              /* millisecond resolution: same-second events no longer swap order */
    if(sf) p*=Math.min(1.4,Math.max(0.6,Math.pow(sf.tilt,0.6)));
    if(tilt) p*=tilt(k);
    if(F.count==='totals') p*=0.9+0.06*jitter(seed,k);
    p=Math.min(0.97,Math.max(0.01,p));
    /* phase 4a: a step never reaches more of the entrants than its own event's volume allows — the cap is the ratio of the
       step's event to step 1's event in the same unit (people, sessions or times), so trend and funnel agree */
    var capR=stepCap(st, idx[0], k, gf); reached.push(Math.min(Math.round(reached[j-1]*p), capR==null?Infinity:Math.round(start*capR*0.97)));
    var m=Math.min(wd*1440*0.6, 2+160*Math.pow(jitter(a.id+b.id,9),2)+(F.order==='exact'?0:3))*(F.hold==='_session'?0.5:1);
    med.push(m); avg.push(Math.min(wd*1440*0.85, m*(1.5+0.4*jitter(a.id+b.id,4))));   /* the average never runs past the window (a 30-second window) */
  }
  return { reached:reached, med:med, avg:avg };
}
function finishRow(F, row, uni, seed){
  var r=row.reached, n=r.length, last=null, first=r[0];
  for(var k=n-1;k>=0;k--) if(r[k]!=null){ last=r[k]; break; }
  row.conv=first?last/first*100:NaN;   /* B9: no entrants → «—», not 0% (04 §8.5 rule 4) */
  /* Block C: compare to past (Amplitude Funnel ▸ Compare to past): the same funnel over the previous period or the same period last year */
  if(F.cmp&&!isNaN(row.conv)){ var lvl=F.cmp==='year'?0.86:0.94; row.prevConv=Math.min(100, row.conv*lvl*(0.9+0.2*jitter(seed+'cmp'+F.cmp,1))); row.dPrev=row.conv-row.prevConv; }
  row.medTotal=row.med.reduce(function(x,y){ return x+(y||0); },0)*0.8; row.avgTotal=row.avg.reduce(function(x,y){ return x+(y||0); },0);
  var sc=F.scope||0, base=sc&&r[sc]!=null&&r[sc-1]?r[sc]/r[sc-1]*100:row.conv;
  row.rate=uni.map(function(u,i){ return u?+Math.min(100,base*(0.85+0.3*jitter(seed+'ot'+sc,i))).toFixed(1):0; });
  row.entrants=uni; return row;
}
function fCompute(st, ctx){
  return within(ctx, function(){
    var R=RB.rangeInfo(), lab=RB.axisLabels(), F=st.funnel, n=st.events.length, out={ R:R, labels:lab, segs:[], n:n };
    if(n<2 || st.events.some(function(e){ return !getEv(e.id); })){ out.empty=true; return out; }
    var wd=winDays(F.win), span=R.unit==='day'?1:R.unit==='week'?7:30.44, all=st.events.map(function(e,k){ return k; });
    /* entry buckets whose conversion window hasn't closed yet (always at least the current one) */
    out.open=Math.max(1, Math.min(lab.fa.length-1, Math.ceil(wd/span)));
    out.unit=F.hold==='_session'?['نشست','sessions']:F.hold?['جفت','pairs']:F.count==='totals'?['بار','times']:['نفر','users'];
    var segs=norm(st).segments, G=st.groupSeg?RB.PROPS[st.groupSeg]:null, single=segs.length===1;
    var opt=single&&!F.gb&&!G&&F.optional>0&&F.optional<n-1?F.optional:-1, gb=single&&F.gb&&RB.PROPS[F.gb.prop]&&!G?F.gb:null;
    segs.forEach(function(sg, si){
      var e0=st.events[0], uni=baseSeries(e0,true), tot=baseSeries(e0,false), sf=segFactor(sg,e0,RB.periodUniques(uni)), seed=sf?sf.seed:'all';
      if(sf){ uni=split(uni,sf.share,sf.seed+'u'); tot=split(tot,sf.share*sf.tilt,sf.seed+'t'); }
      var entr=F.count==='totals'?RB.sum(tot):RB.periodUniques(uni);
      if(F.hold==='_session') entr=Math.round(RB.sum(tot)*0.7); else if(F.hold) entr=Math.round(entr*1.35);   /* the unit becomes sessions / user–value pairs */
      var nm=segLabel(sg);
      if(G){   /* segment breakdown: each user-property value is its own funnel (step-1 rule) */
        segValues(sg, st.groupSeg).slice(0,5).forEach(function(v,vi){ var t=0.85+0.3*jitter(st.groupSeg+v[1],vi);
          var rr=runSteps(st, all, Math.round(entr*v[2]), sf, seed+v[1], function(){ return t; }, { prop:st.groupSeg, op:'in', vals:[v[1]] });
          out.segs.push(finishRow(F, { si:si, name:(single?'':nm+' · ')+T(v[0],v[1]), gval:v[1], reached:rr.reached, med:rr.med, avg:rr.avg }, split(uni,v[2],seed+v[1]), seed+v[1])); });
        return;
      }
      if(gb){   /* step breakdown: values at step k; people who never reached k form their own row */
        var whole=runSteps(st, all, entr, sf, seed), K=gb.k, P=RB.PROPS[gb.prop], vals=P.vals.slice(0,5);
        vals.forEach(function(v,vi){ var t=0.85+0.3*jitter(gb.prop+v[1],vi), rk=Math.round(whole.reached[K]*v[2]);
          var tail=runSteps(st, all.slice(K), rk, sf, seed+v[1], function(){ return t; });
          var r=whole.reached.map(function(x,k){ return k<K?Math.round(rk):tail.reached[k-K]; });
          var md=whole.med.map(function(x,k){ return k<=K?x:tail.med[k-K]; }), av=whole.avg.map(function(x,k){ return k<=K?x:tail.avg[k-K]; });
          out.segs.push(finishRow(F, { si:0, name:T(v[0],v[1]), gval:v[1], gstep:K, reached:r, med:md, avg:av }, split(uni,v[2],seed+v[1]), seed+v[1])); });
        if(K>0){ var miss=whole.reached.map(function(x,k){ return k<K?x-whole.reached[K]:0; });
          out.segs.push(finishRow(F, { si:0, name:T('به این قدم نرسید','Did not reach this step'), notReached:true, reached:miss, med:whole.med.map(function(){ return 0; }), avg:whole.avg.map(function(){ return 0; }) }, uni.map(function(){ return 0; }), seed+'nr')); }
        return;
      }
      if(si===0&&F.cmpEv.length){   /* compare events at a step: one funnel per combination of alternatives */
        var combos=[[]]; F.cmpEv.slice(0,2).forEach(function(c){ var nx=[]; combos.forEach(function(cb){ [st.events[c.k].id].concat(c.ids).slice(0,4).forEach(function(id){ nx.push(cb.concat([{ k:c.k, id:id }])); }); }); combos=nx; });
        combos.slice(0,9).forEach(function(cb,ci){ var st2=Object.assign({}, st, { events:st.events.map(function(e,k){ var sw=cb.filter(function(x){ return x.k===k; })[0]; return sw?Object.assign({}, e, { id:sw.id, or:[] }):e; }) });
          var rr=runSteps(st2, all, entr, sf, seed+'ce'+ci);
          out.segs.push(finishRow(F, { si:0, name:cb.map(function(x){ return T('قدم '+num(x.k+1)+': ','Step '+(x.k+1)+': ')+evName(x.id); }).join(' · '), reached:rr.reached, med:rr.med, avg:rr.avg }, uni, seed+'ce'+ci)); });
        return;
      }
      var main=runSteps(st, all, entr, sf, seed);
      out.segs.push(finishRow(F, { si:si, name:nm+(opt>0?T(' · با قدم '+num(opt+1),' · with step '+(opt+1)):''), reached:main.reached, med:main.med, avg:main.avg }, uni, seed));
      if(opt>0){   /* optional step: the same funnel without it, drawn beside (the missing step is an empty slot) */
        var idx=all.filter(function(k){ return k!==opt; }), wo=runSteps(st, idx, entr, sf, seed+'wo');
        var r2=[], m2=[], a2=[], j=0; all.forEach(function(k){ if(k===opt){ r2.push(null); m2.push(null); a2.push(null); } else { r2.push(wo.reached[j]); m2.push(wo.med[j]); a2.push(wo.avg[j]); j++; } });
        out.segs.push(finishRow(F, { si:si, name:nm+T(' · بدون قدم '+num(opt+1),' · without step '+(opt+1)), optWithout:true, reached:r2, med:m2, avg:a2 }, uni, seed+'wo'));
      }
    });
    /* baseline for segment breakdowns (Amplitude Compare on group-by values) */
    if(G&&out.segs.length){ var b=out.segs.filter(function(x){ return x.gval===F.baseline; })[0]||out.segs[0]; out.baseline=b.name;
      out.segs.forEach(function(x){ x.dPts=x.conv-b.conv; x.dRel=b.conv?(x.conv/b.conv-1)*100:null; }); }
    /* sum of a numeric property on the final step (Advanced) */
    if(F.psum&&NUMP[F.psum]) out.segs.forEach(function(x,ri){ var last=x.reached[x.reached.length-1]||0; x.psum=Math.round(last*NUMP[F.psum].mean*(0.9+0.2*jitter(F.psum+ri,3))); });
    /* A/B view: segments act as variants against a baseline (two-proportion z-test on overall conversion) */
    var bi=Math.min(F.abBase||0, out.segs.length-1), b0=out.segs[bi];
    if(b0) out.segs.forEach(function(x,ri){ var n1=x.reached[0]||0, c1=x.reached[x.reached.length-1]||0, n2=b0.reached[0]||0, c2=b0.reached[b0.reached.length-1]||0;
      x.abN=n1; x.abC=c1; x.impr=ri===bi||!b0.conv?null:(x.conv/b0.conv-1)*100;
      var p1=n1?c1/n1:0, p2=n2?c2/n2:0, ok=[[n1,p1],[n2,p2]].every(function(q){ return q[0]>30&&q[0]*q[1]>=5&&q[0]*(1-q[1])>=5; });
      if(ri===bi||!ok){ x.sig=null; x.sigWhy=ri===bi?'base':'n'; return; }
      var pp=(c1+c2)/(n1+n2), se=Math.sqrt(pp*(1-pp)*(1/n1+1/n2)), z=se?(p1-p2)/se:0;
      x.sig=+((1-2*(1-0.5*(1+erf(Math.abs(z)/Math.SQRT2))))*100).toFixed(1); });
    out.abBase=b0?b0.name:'';
    /* time to convert and frequency distributions for each row */
    out.segs.forEach(function(x,ri){ x.ttc=ttcDist(F, x, ri); x.freq=freqDist(st, x, ri); });
    return out;
  });
}
/* time to convert: % of converters per duration bucket (log-normal around the median), only buckets inside the window */
var TTC_B=[['<۱ دقیقه','<1m',0,1],['۱–۱۰ دقیقه','1–10m',1,10],['۱۰–۳۰ دقیقه','10–30m',10,30],['۳۰–۶۰ دقیقه','30–60m',30,60],['۱–۳ ساعت','1–3h',60,180],['۳–۱۲ ساعت','3–12h',180,720],['۱۲–۲۴ ساعت','12–24h',720,1440],['۱–۳ روز','1–3d',1440,4320],['۳–۷ روز','3–7d',4320,10080],['بیش از ۷ روز','>7d',10080,1e9]];
function erf(x){ var s=x<0?-1:1; x=Math.abs(x); var t=1/(1+0.3275911*x); return s*(1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x)); }
function ttcBuckets(F){ var wm=winDays(F.win)*1440; return TTC_B.filter(function(b){ return b[2]<wm; }); }
function ttcDist(F, x){
  var sc=F.ttcScope||0, m=Math.max(0.5, sc&&x.med[sc]!=null?x.med[sc]:x.medTotal||1), sg=1.1, B=ttcBuckets(F), cdf=function(v){ return v<=0?0:0.5*(1+erf((Math.log(v)-Math.log(m))/(sg*Math.SQRT2))); };
  var raw=B.map(function(b){ return Math.max(0, cdf(Math.min(b[3],winDays(F.win)*1440))-cdf(b[2])); }), tot=raw.reduce(function(a,b){ return a+b; },0)||1;
  return { vals:raw.map(function(v){ return +(v/tot*100).toFixed(1); }), median:m };
}
/* frequency: how many times X happened before the first Y (geometric around the volume ratio) */
var FRQ_B=[['۱','1',1,1],['۲','2',2,2],['۳','3',3,3],['۴','4',4,4],['۵','5',5,5],['۶–۱۰','6–10',6,10],['۱۱ و بیشتر','11+',11,400]];
function freqDist(st, x, ri){
  var F=st.funnel, X=F.freqX||st.events[0].id, Y=F.freqY||st.events[st.events.length-1].id, ex=getEv(X), ey=getEv(Y);
  var r=Math.max(1.05, Math.min(12, ((ex&&ex.w)||1)/Math.max(1,(ey&&ey.w)||1)*(0.9+0.2*jitter(X+Y,ri)))), p=1/r;
  var v=FRQ_B.map(function(b){ var s=0; for(var k=b[2];k<=b[3];k++) s+=p*Math.pow(1-p,k-1); return s; }), tot=v.reduce(function(a,b){ return a+b; },0)||1;
  return v.map(function(z){ return +(z/tot*100).toFixed(1); });
}
/* board tile = the first segment's overall conversion, from the same function */
function funnelTile(q, ovr){
  var st=norm(clone(q.amp)), r=fCompute(st, { range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]), gran:st.interval });
  if(r.empty||!r.segs.length) return null;
  var s=r.segs[0], mx=s.reached[0]||1, w=300, h=64, bw=w/s.reached.length;
  var viz='<svg class="rbx-spark" viewBox="0 0 '+w+' '+h+'" height="'+h+'" preserveAspectRatio="none" style="direction:ltr">'+s.reached.map(function(v,k){ var bh=Math.max(2,(v/mx)*(h-6)); return '<rect x="'+(k*bw+4).toFixed(1)+'" y="'+(h-bh).toFixed(1)+'" width="'+(bw-8).toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="3" fill="var(--sh-c1)"/>'; }).join('')+'</svg>';
  return { val:pctTxt(s.conv), num:s.conv, sub:T('نرخ تبدیل کل · '+r.R.fa,'Overall conversion · '+r.R.en), viz:viz,
    rows:s.reached.map(function(v,k){ return [num(k+1)+'. '+evName(st.events[k].id), num(v)]; }), range:r.R };
}
var lastF=null;
function renderFunnel(){
  winClamp(A.funnel.win, true);   /* PM 2026-10-28, CR-2: a funnel saved under the old 366-day cap opens at the 90-day cap */
  var res=lastF=fCompute(A, { range:RB.Q.range, filters:RB.Q.filters, gran:A.interval });
  if(projNoEvents()) res.empty=res.noEv=true;   /* PM 2026-10-31, outcome 1: B01 */
  root.classList.toggle('rtl', fa());
  root.innerHTML='<div class="rbz-grid'+(SET_OPEN?' with-set':'')+'"><aside class="rbz-panel">'+eventsModule()+measureModule()+segmentModule()+'</aside>'+
    '<section class="rbz-canvas">'+(res.empty?'<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-drslot"></span></div>'+(res.noEv?noEventsState():funnelEmpty()):funnelToolbar(res)+takeaway(res)+'<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div>'+funnelTable(res))+'</section>'+(SET_OPEN?setPanel():'')+'</div>';
  placeFilter();
  wire();
  U.i18n();
  if(!res.empty) fDraw(res);
}
function funnelEmpty(){
  return '<div class="sh-state rbz-empty">'+emptyArt('funnel')+'<div class="sh-state-title">'+T('قیف حداقل دو قدم می‌خواهد','A funnel needs at least two steps')+'</div>'+
    '<div class="sh-state-hint">'+T('مسیرتان را بچینید: قدم اول کجاست و مقصد کجا؟ مثلا مشاهدهٔ سبد ← استفاده از کد تخفیف ← خرید.','Lay out your path: where does it start and where does it end? E.g. cart viewed → discount code applied → purchase.')+'</div>'+
    '<button class="rbz-linkbtn" data-evadd="1" type="button">'+ic('plus')+T('افزودن قدم','Add step')+'</button></div>';
}
function funnelMeasureModule(){
  var F=A.funnel, views=[['conv','نرخ تبدیل','Conversion'],['time','در طول زمان','Over time'],['ttc','زمان تبدیل','Time to convert'],['freq','تکرار','Frequency'],['impr','بهبود','Improvement'],['sig','معناداری','Significance']], abOk=A.segments.length>1;
  if((F.view==='impr'||F.view==='sig')&&!abOk) F.view='conv';
  var cur=views.filter(function(v){ return v[0]===F.view; })[0];
  var h='<div class="rbz-mod">'+modHead('meas','سنجش بر اساس','Measured as',TIP_MEAS,T(cur[1],cur[2])+' · '+winText(F.win));
  if(!OPEN.meas) return h+'</div>';
  h+='<div class="rbz-seg2 wrap" role="tablist">'+views.map(function(v){ var on=F.view===v[0], ab=v[0]==='impr'||v[0]==='sig', dis=ab&&!abOk;
    return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-fview="'+v[0]+'"'+(dis?' disabled title="'+T('نمای تست A/B دست‌کم دو گروه کاربر می‌خواهد','The A/B view needs at least two user segments')+'"':'')+'>'+T(v[1],v[2])+'</button>'; }).join('')+'</div>';
  if(F.view==='impr'||F.view==='sig') h+='<div class="rbz-frow"><span class="lb">'+T('گروه پایه','Baseline')+'</span><select class="sh-select" id="rbzAbBase">'+A.segments.map(function(sg,i){ return '<option value="'+i+'"'+(F.abBase===i?' selected':'')+'>'+num(i+1)+'. '+esc(segLabel(sg))+'</option>'; }).join('')+'</select><span class="rbx-tipdot"'+tip(FTIPS.sig[0],FTIPS.sig[1])+'></span></div>';
  var pairOpts=function(sel){ return '<option value="0">'+T('کل قیف','Whole funnel')+'</option>'+A.events.slice(1).map(function(e,i){ var k=i+1; return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+T('قدم '+num(k)+' ← '+num(k+1),'Step '+k+' → '+(k+1))+'</option>'; }).join(''); };
  if(F.view==='ttc') h+='<div class="rbz-seg2 sm">'+[['dist','توزیع','Distribution'],['trend','میانه در طول زمان','Median over time']].map(function(x){ return '<button type="button" class="'+(F.ttcMode===x[0]?'on':'')+'" data-ttcmode="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>'+
    '<div class="rbz-frow"><span class="lb">'+T('دامنه','Scope')+'</span><select class="sh-select" id="rbzTtcScope">'+pairOpts(F.ttcScope)+'</select><span class="rbx-tipdot"'+tip(FTIPS.ttc[0],FTIPS.ttc[1])+'></span></div>';
  if(F.view==='freq'&&A.events.length){ var evOpt=function(sel){ return A.events.map(function(e){ return '<option value="'+esc(e.id)+'"'+(sel===e.id?' selected':'')+'>'+esc(evName(e.id))+'</option>'; }).join(''); };
    h+='<div class="rbz-frow"><span class="lb">'+T('ایونت تکرار','Repeated event')+'</span><select class="sh-select" id="rbzFrX">'+evOpt(F.freqX||A.events[0].id)+'</select><span class="rbx-tipdot"'+tip(FTIPS.freq[0],FTIPS.freq[1])+'></span></div>'+
      '<div class="rbz-frow"><span class="lb">'+T('ایونت مقصد','Target event')+'</span><select class="sh-select" id="rbzFrY">'+evOpt(F.freqY||A.events[A.events.length-1].id)+'</select></div>'; }
  if(F.view==='time') h+='<div class="rbz-frow"><span class="lb">'+T('دامنه','Scope')+'</span><select class="sh-select" id="rbzScope">'+
    '<option value="0">'+T('کل قیف','Whole funnel')+'</option>'+A.events.slice(1).map(function(e,i){ var k=i+1; return '<option value="'+k+'"'+(F.scope===k?' selected':'')+'>'+T('قدم '+num(k)+' ← '+num(k+1),'Step '+k+' → '+(k+1))+'</option>'; }).join('')+'</select><span class="rbx-tipdot"'+tip(FTIPS.time[0],FTIPS.time[1])+'></span></div>';
  h+='<div class="rbz-frow"><span class="lb">'+T('پنجرهٔ تبدیل','Conversion window')+'</span><span class="rbx-tipdot"'+tip(FTIPS.win[0],FTIPS.win[1])+'></span></div>'+
    '<div class="rbz-frow"><span class="sub">'+T('تکمیل در ظرف','Completed within')+'</span><input class="sh-input rbz-winn" id="rbzWinN" type="number" min="1" max="'+(WIN_CAP[F.win.u]||90)+'" value="'+F.win.n+'" aria-label="'+T('مقدار پنجره','Window value')+'"/>'+   /* CR-2: the cap follows the unit */
    '<select class="sh-select" id="rbzWinU" aria-label="'+T('واحد پنجره','Window unit')+'">'+Object.keys(WIN_U).map(function(u){ return '<option value="'+u+'"'+(F.win.u===u?' selected':'')+'>'+T(WIN_U[u][0],WIN_U[u][1])+'</option>'; }).join('')+'</select></div>'+
    '<div class="rbz-frow"><span class="lb">'+T('شمارش','Counting')+'</span><select class="sh-select" id="rbzCount">'+
      '<option value="uniques"'+(F.count==='uniques'?' selected':'')+'>'+T('کاربران','Users')+'</option><option value="totals"'+(F.count==='totals'?' selected':'')+'>'+T('دفعات','Totals')+'</option></select><span class="rbx-tipdot"'+tip(FTIPS.count[0],FTIPS.count[1])+'></span></div>';
  /* hold a property constant: only properties every step carries; "session" makes a session funnel */
  var shared=RB.GLOBAL_PROPS.filter(function(p){ return RB.PROPS[p]&&SEG_GRPS.concat(['page']).indexOf(RB.PROPS[p].grp)>-1; });
  h+='<div class="rbz-frow"><span class="lb">'+T('ثابت نگه داشتن ویژگی','Hold property constant')+'</span><span class="rbx-tipdot"'+tip(FTIPS.hold[0],FTIPS.hold[1])+'></span></div>'+
    '<div class="rbz-frow"><select class="sh-select" id="rbzHold"><option value="">'+T('هیچ‌کدام','None')+'</option><option value="_session"'+(F.hold==='_session'?' selected':'')+'>'+T('نشست (قیف نشستی)','Session (session funnel)')+'</option>'+
    shared.map(function(p){ return '<option value="'+p+'"'+(F.hold===p?' selected':'')+'>'+esc(pOpt(p))+'</option>'; }).join('')+'</select></div>'+
    (F.hold?'<div class="rbz-hint">'+ic('info')+(F.hold==='_session'?T('شمارش بر اساس نشست است، نه کاربر.','Counted per session, not per user.'):T('شمارش بر اساس جفت کاربر و مقدار است.','Counted per user–value pair.'))+'</div>':'');
  /* Advanced (Amplitude): property sum on the final step, millisecond resolution, new users' first day */
  var lastEv=A.events.length?getEv(A.events[A.events.length-1].id):null, numP=Object.keys(NUMP).filter(function(p){ return RB.PROPS[p]&&lastEv&&(lastEv.props||[]).indexOf(p)>-1; });
  h+='<details class="rbz-adv"'+(F.psum||F.ms||F.firstDay?' open':'')+'><summary>'+T('پیشرفته','Advanced')+'</summary>'+
    '<div class="rbz-frow"><span class="lb">'+T('جمع ویژگی در قدم آخر','Sum of a property at the final step')+'</span><span class="rbx-tipdot"'+tip(FTIPS.psum[0],FTIPS.psum[1])+'></span></div>'+
    '<div class="rbz-frow"><select class="sh-select" id="rbzPsum"'+(numP.length?'':' disabled title="'+T('ایونت قدم آخر ویژگی عددی ندارد','The final step’s event has no numeric property')+'"')+'><option value="">'+T('هیچ‌کدام','None')+'</option>'+numP.map(function(p){ return '<option value="'+p+'"'+(F.psum===p?' selected':'')+'>'+esc(pOpt(p))+'</option>'; }).join('')+'</select></div>'+
    '<label class="rbz-ck"><input type="checkbox" id="rbzMs"'+(F.ms?' checked':'')+'/>'+T('دقت میلی‌ثانیه (برای ایونت‌های هم‌ثانیه)','Millisecond resolution (for same-second events)')+'</label>'+
    ((A.segments[0]||{}).who==='new'?'<div class="rbz-frow"><span class="lb">'+T('کاربران جدید تبدیل شوند در','New users convert on')+'</span><select class="sh-select" id="rbzFirstDay"><option value="0">'+T('هر روزی','Any day')+'</option><option value="1"'+(F.firstDay?' selected':'')+'>'+T('همان روز اول','Their first day')+'</option></select></div>':'')+'</details>';
  return h+'</div>';
}
function funnelToolbar(res){
  var L=res.labels, last=L[fa()?'fa':'en'][L.fa.length-1]||'', vw=A.funnel.view, time=vw==='time'||(vw==='ttc'&&A.funnel.ttcMode==='trend');
  return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+(vw==='freq'||(vw==='ttc'&&!time)?'<span class="rbz-pill static">'+ic('squares-four')+T('هیستوگرام','Histogram')+'</span>':time?'<span class="rbz-pill static">'+ic('chart-line')+T('خطی','Line')+'</span><button class="rbz-pill" id="rbzGran" type="button">'+T(GRAN[A.interval][0],GRAN[A.interval][1])+' ⌄</button>'
      :'<span class="rbz-pill static">'+ic('squares-four')+T('نمودار ستونی','Bar chart')+'</span>')+
    (vw==='conv'?'<button class="rbz-pill'+(A.funnel.cmp?' on':'')+'" id="rbzFCmp" type="button">'+ic('arrows-clockwise')+(A.funnel.cmp?T(A.funnel.cmp==='year'?'در برابر پارسال':'در برابر دورهٔ قبل',A.funnel.cmp==='year'?'vs. last year':'vs. previous period'):T('مقایسه با گذشته','Compare to past'))+' ⌄</button>':'')+
    (vw==='time'?(function(){ var na=window.RBAlerts&&window.RBH?RBAlerts.count(RBH.current()):ALERTS.length; return '<button class="rbz-pill" id="rbzAlert" type="button">'+ic('bell')+(na?T(num(na)+' هشدار',na+' alert'+(na>1?'s':'')):T('هشدار','Alert'))+'</button>'; })():'')+
    '<span class="rbz-drslot"></span></div>'+
    (time&&res.open>=L.fa.length-1?'<div class="rbz-note">'+ic('info')+T('پنجرهٔ تبدیل از بازهٔ انتخابی بلندتر است؛ همهٔ نقطه‌ها هنوز در حال تکمیل‌اند و نرخشان بالا می‌رود. برای عدد نهایی بازهٔ بلندتر یا پنجرهٔ کوتاه‌تر انتخاب کنید.','The conversion window is longer than the date range, so every point is still filling up and its rate will rise. Pick a longer range or a shorter window for final numbers.')+'</div>':'');
}
function takeaway(res){
  var s=res.segs.filter(function(x){ return !x.notReached; })[0]||res.segs[0], F=A.funnel, n=res.n, k, val, sub, L=res.labels, uw=unitW(res);
  if(F.head==='drop'){ var bi=1; for(k=2;k<n;k++) if(s.reached[k-1]-s.reached[k]>s.reached[bi-1]-s.reached[bi]) bi=k;
    var d=s.reached[bi-1]-s.reached[bi], dp=s.reached[bi-1]?d/s.reached[bi-1]*100:0;
    val=num(d)+' '+uw; sub=T('قدم '+num(bi)+' ← '+num(bi+1)+' · '+pctTxt(dp)+' از قدم قبل','Step '+bi+' → '+(bi+1)+' · '+pctTxt(dp)+' of the previous step'); }
  else if(F.head==='slow'){ var sl=1; for(k=2;k<n;k++) if(s.med[k]>s.med[sl]) sl=k;
    val=fmtDur(s.med[sl]); sub=T('قدم '+num(sl)+' ← '+num(sl+1)+' · میانهٔ زمان','Step '+sl+' → '+(sl+1)+' · median time'); }
  else { val=pctTxt(s.conv); sub=T('ورود از '+L.fa[0]+' · '+num(s.reached[0])+' '+uw+' وارد قیف شدند','Entered since '+L.en[0]+' · '+num(s.reached[0])+' '+uw+' entered');
    if(F.cmp&&s.prevConv!=null) sub+=T(' · '+(F.cmp==='year'?'پارسال ':'دورهٔ قبل ')+pctTxt(s.prevConv)+' ('+(s.dPrev>=0?'+':'−')+num(Math.abs(s.dPrev),1)+' واحد درصد)',' · '+(F.cmp==='year'?'last year ':'previous period ')+pctTxt(s.prevConv)+' ('+(s.dPrev>=0?'+':'−')+num(Math.abs(s.dPrev),1)+' pts)'); }
  return '<div class="rbz-take"><div class="rbz-takeh"><button class="rbz-takesel" id="rbzHead" type="button">'+T(HEAD[F.head][0],HEAD[F.head][1])+' ⌄</button><span class="rbx-tipdot"'+tip(FTIPS[F.head][0],FTIPS[F.head][1])+'></span>'+
    (res.segs.length>1?'<span class="rbz-takeseg">'+esc(s.name)+'</span>':'')+'</div><div class="rbz-takev"><b>'+val+'</b><span>'+sub+'</span></div></div>';
}
function funnelTable(res){
  var pal=palette(), F=A.funnel, vw=F.view, base=res.baseline!=null, h='<div class="rbz-tablewrap"><div class="rbz-tablehead"><b>'+T('جدول داده','Data table')+'</b>'+
    (base?'<span class="lb">'+T('گروه پایه:','Baseline:')+'</span><select class="sh-select" id="rbzBase" style="width:auto">'+res.segs.map(function(x){ return '<option value="'+esc(x.gval)+'"'+(x.name===res.baseline?' selected':'')+'>'+esc(x.name)+'</option>'; }).join('')+'</select>':'')+
    '<span class="rbx-spacer"></span><button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button></div><div class="sh-table-wrap"><table class="sh-table rbz-table rbz-ftable"><thead><tr><th>'+T('گروه','Segment')+'</th>';
  if(vw==='impr'||vw==='sig'){
    h+='<th class="num">'+T('ورود','Count')+'</th><th class="num">'+T('تبدیل‌شده','Converted')+'</th><th class="num">'+T('نرخ تبدیل','Conversion')+'</th><th class="num">'+T('بهبود نسبت به پایه','Improvement over baseline')+'</th><th class="num"'+tip(FTIPS.sig[0],FTIPS.sig[1])+'>'+T('معناداری','Significance')+'</th></tr></thead><tbody>';
    res.segs.forEach(function(x,si){ var isB=x.name===res.abBase;
      h+='<tr'+(isB?' class="ov"':'')+'><td class="sname"><span class="rbz-sw" style="background:'+pal[si%12]+'"></span>'+esc(x.name)+(isB?' <span class="rbz-tag">'+T('پایه','Baseline')+'</span>':'')+'</td><td class="num">'+num(x.abN)+'</td><td class="num">'+num(x.abC)+'</td><td class="num strong">'+pctTxt(x.conv)+'</td>'+
        '<td class="num '+(x.impr>0?'up':x.impr<0?'down':'')+'">'+(x.impr==null?'—':fmtChange(A,x.impr,'pct'))+'</td>'+
        '<td class="num">'+(isB?'—':x.sig==null?'<span title="'+T('۳۰ ورودی یا کمتر، یا تبدیل خیلی کم','30 or fewer entrants, or too few conversions')+'">'+T('دادهٔ کافی نیست','Not enough data')+'</span>':'<b'+(x.sig>=95?' class="good"':'')+'>'+pctTxt(x.sig)+'</b>')+'</td></tr>'; });
    return h+'</tbody></table></div></div>';
  }
  if(vw==='ttc'||vw==='freq'){ var B=vw==='ttc'?ttcBuckets(F):FRQ_B;
    h+=(vw==='ttc'?'<th class="num">'+T('میانه','Median')+'</th>':'')+B.map(function(b){ return '<th class="num">'+T(b[0],b[1])+'</th>'; }).join('')+'</tr></thead><tbody>';
    res.segs.forEach(function(x,si){ if(x.notReached) return; h+='<tr><td class="sname"><span class="rbz-sw" style="background:'+pal[si%12]+'"></span>'+esc(x.name)+'</td>'+(vw==='ttc'?'<td class="num strong">'+fmtDur(x.ttc.median)+'</td>':'')+
      (vw==='ttc'?x.ttc.vals:x.freq).map(function(v){ return '<td class="num">'+pctTxt(v)+'</td>'; }).join('')+'</tr>'; });
    return h+'</tbody></table></div></div>';
  }
  h+='<th class="num"'+tip(FTIPS.total[0],FTIPS.total[1])+'>'+T('نرخ تبدیل','Conversion')+'</th>'+(F.cmp?'<th class="num">'+T(F.cmp==='year'?'پارسال':'دورهٔ قبل',F.cmp==='year'?'Last year':'Previous period')+'</th><th class="num">'+T('تغییر (واحد درصد)','Change (pts)')+'</th>':'')+(base?'<th class="num">'+T('اختلاف با پایه (واحد درصد)','Difference vs baseline (pts)')+'</th><th class="num">'+T('تغییر نسبی','Relative change')+'</th>':'')+
    A.events.map(function(e,k){ return '<th class="num">'+esc(stepLabel(k))+'</th>'; }).join('')+'<th class="num">'+T('میانهٔ زمان تبدیل','Median time to convert')+'</th><th class="num">'+T('میانگین زمان تبدیل','Average time to convert')+'</th>'+
    (F.psum&&NUMP[F.psum]?'<th class="num"'+tip(FTIPS.psum[0],FTIPS.psum[1])+'>'+T('جمع '+RB.PROPS[F.psum].fa+' (قدم آخر)','Sum of '+RB.PROPS[F.psum].en+' (final step)')+'</th>':'')+'</tr></thead><tbody>';
  res.segs.forEach(function(x,si){
    h+='<tr><td class="sname"><span class="rbz-sw" style="background:'+pal[si%12]+'"></span>'+esc(x.name)+(x.notReached?'<span class="rbx-tipdot"'+tip(FTIPS.notReached[0],FTIPS.notReached[1])+'></span>':'')+'</td><td class="num strong">'+(x.notReached?'—':pctTxt(x.conv))+'</td>'+
      (F.cmp?'<td class="num">'+(x.prevConv==null?'—':pctTxt(x.prevConv))+'</td><td class="num '+(x.dPrev>0?'up':x.dPrev<0?'down':'')+'">'+(x.dPrev==null?'—':(x.dPrev>=0?'+':'−')+num(Math.abs(x.dPrev),1))+'</td>':'')+
      (base?'<td class="num '+(x.dPts>0?'up':x.dPts<0?'down':'')+'">'+(x.name===res.baseline?'—':fmtChange(A,x.dPts,'abs').replace(/<[^>]+>/g,'')+T(' واحد',' pts'))+'</td><td class="num">'+(x.name===res.baseline||x.dRel==null?'—':fmtChange(A,x.dRel,'pct'))+'</td>':'')+
      x.reached.map(function(v,k){ return v==null?'<td class="num">—</td>':'<td class="num"><b>'+num(v)+'</b><span class="rbz-sub">'+(k?pctTxt(x.reached[0]?v/x.reached[0]*100:0)+(x.med[k]?' · '+fmtDur(x.med[k]):''):pctTxt(100))+'</span></td>'; }).join('')+
      '<td class="num">'+(x.notReached?'—':fmtDur(x.medTotal))+'</td><td class="num">'+(x.notReached?'—':fmtDur(x.avgTotal))+'</td>'+
      (F.psum&&NUMP[F.psum]?'<td class="num strong">'+(x.psum!=null?compact(x.psum)+' '+T(NUMP[F.psum].fa,NUMP[F.psum].en):'—')+'</td>':'')+'</tr>'; });
  return h+'</tbody></table></div></div>'+actionPanel(res);
}
/* alerts on conversion over time (Amplitude allows them only there): threshold or anomaly, daily or hourly */
var ALERTS=[];
function alertModal(){
  U.modal({ fa:'هشدار روی نرخ تبدیل', en:'Alert on conversion', subFa:'بعد از بسته شدن پنجرهٔ تبدیل هر بازه بررسی می‌شود و نتیجه در اعلان‌های شاهین (زنگوله) و ایمیل می‌آید.', subEn:'Checked after each interval’s conversion window closes; results arrive in Shahin notifications (the bell) and by email.',
    body:'<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('وقتی نرخ تبدیل','When conversion')+'</label><select class="sh-select" id="rbzAlC"><option value="below">'+T('کمتر شد از','drops below')+'</option><option value="above">'+T('بیشتر شد از','rises above')+'</option><option value="anom">'+T('غیرعادی شد (بیرون از بازهٔ مورد انتظار)','looks anomalous')+'</option></select></div>'+
      '<div class="rbx-field" style="width:110px"><label>'+T('آستانه (٪)','Threshold (%)')+'</label><input class="sh-input" id="rbzAlV" type="number" min="0" max="100" value="'+Math.round((lastF&&lastF.segs[0]?lastF.segs[0].conv:20)*0.8)+'"/></div></div>'+
      '<div class="rbx-field"><label>'+T('هر چند وقت','How often')+'</label><select class="sh-select" id="rbzAlF"><option value="day">'+T('روزانه','Daily')+'</option><option value="hour">'+T('ساعتی','Hourly')+'</option></select></div>',
    init:function(bd){ var c=bd.querySelector('#rbzAlC'), v=bd.querySelector('#rbzAlV'); c.addEventListener('change', function(){ v.disabled=c.value==='anom'; }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ساختن هشدار', en:'Create alert', fn:function(bd){ ALERTS.push({ c:bd.querySelector('#rbzAlC').value, v:+bd.querySelector('#rbzAlV').value, f:bd.querySelector('#rbzAlF').value }); render(); U.toast('هشدار ساخته شد','Alert created'); } }] });
}
/* the action panel under the funnel (Amplitude): act on the people lost at the biggest drop-off */
function actionPanel(res){
  if(A.funnel.view!=='conv') return '';
  var s=res.segs.filter(function(x){ return !x.notReached; })[0]; if(!s) return '';
  var bi=-1, bd=-1; s.reached.forEach(function(v,k){ var pv=prevVal(s.reached,k); if(k&&v!=null&&pv!=null&&pv-v>bd){ bd=pv-v; bi=k; } }); if(bi<0) return '';
  return '<div class="rbz-act"><div class="rbz-acth">'+ic('users')+'<b>'+T('کاربرانِ ازدست‌رفتهٔ قدم '+num(bi+1)+' را پیگیری کنید','Follow up the users lost at step '+(bi+1))+'</b><span>'+T(num(bd)+' '+unitW(res)+' بعد از «'+evName(A.events[bi-1].id)+'» ادامه ندادند',num(bd)+' '+unitW(res)+' did not continue after “'+evName(A.events[bi-1].id)+'”')+'</span></div>'+
    '<div class="rbz-actb"><button class="sh-btn ghost compact" data-act="cohort" data-k="'+bi+'" data-n="'+bd+'" type="button">'+ic('users-three')+T('ساختن کوهورت برای پیگیری','Create a follow-up cohort')+'</button>'+
    '<button class="sh-btn ghost compact" data-act="replay" type="button">'+ic('video-camera')+T('تماشای جلسه‌های ریزش','Watch drop-off sessions')+'</button>'+
    '<button class="sh-btn ghost compact" data-act="csv" data-k="'+bi+'" data-n="'+bd+'" type="button">'+ic('export')+T('دانلود شناسه‌ها','Download IDs')+'</button></div></div>';
}
function prevVal(r,k){ for(var j=k-1;j>=0;j--) if(r[j]!=null) return r[j]; return null; }
function unitW(res){ return T(res.unit[0],res.unit[1]); }
function fDraw(res){
  var el=$('rbzChart'); if(!el||!window.echarts) return;
  if(chart){ chart.dispose(); chart=null; }
  chart=echarts.init(el);
  var cs=getComputedStyle(document.body), TX=cs.getPropertyValue('--sh-text').trim(), MU=cs.getPropertyValue('--sh-muted').trim(), BD=cs.getPropertyValue('--sh-border').trim(), SF=cs.getPropertyValue('--sh-surface').trim(), FONT=cs.fontFamily;
  var tipBase={ backgroundColor:SF, borderColor:BD, textStyle:{ color:TX, fontFamily:FONT, fontSize:12 }, confine:true, extraCssText:'direction:'+(fa()?'rtl':'ltr')+';text-align:start' };
  var pal=palette(), F=A.funnel, ser=[], opt, dot=function(c){ return '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+c+';margin-inline-end:6px"></span>'; };
  if(F.view==='impr'||F.view==='sig'){
    var catsA=A.events.map(function(e,k){ return stepLabel(k); });
    if(F.view==='impr'){
      res.segs.forEach(function(s,si){ var c=pal[si%12]; ser.push({ name:s.name+(s.name===res.abBase?T(' (پایه)',' (baseline)'):''), type:'bar', barMaxWidth:36, itemStyle:{ color:c, borderRadius:[3,3,0,0] },
        data:s.reached.map(function(v){ return v==null||!s.reached[0]?null:+(v/s.reached[0]*100).toFixed(1); }) }); });
      opt={ grid:{ left:fa()?16:56, right:fa()?56:16, top:16, bottom:28 },
        tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ return dot(p.color)+esc(p.seriesName)+' <b>'+pctTxt(p.value)+'</b>'; }).join('<br>'); } }, tipBase),
        xAxis:{ type:'category', data:catsA, inverse:fa(), axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:TX, fontFamily:FONT, fontSize:11, interval:0, width:120, overflow:'truncate' } },
        yAxis:{ type:'value', min:0, max:100, position:fa()?'right':'left', name:T('نرخ تبدیل از قدم ۱','Conversion from step 1'), nameLocation:'middle', nameGap:48, nameRotate:fa()?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 },
          splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return num(v)+T('٪','%'); } } }, series:ser };
    } else {
      var vs=res.segs.filter(function(x){ return x.name!==res.abBase; });
      opt={ grid:{ left:fa()?16:8, right:fa()?8:16, top:30, bottom:8, containLabel:true },
        tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(ps){ var x=vs[ps[0].dataIndex]; return esc(x.name)+'<br>'+(x.sig==null?T('دادهٔ کافی برای آزمون نیست','Not enough data to test'):T('معناداری ','Significance ')+'<b>'+pctTxt(x.sig)+'</b>'); } }, tipBase),
        yAxis:{ type:'category', inverse:true, data:vs.map(function(x){ return x.name; }), position:fa()?'right':'left', axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:TX, fontFamily:FONT, fontSize:11, width:200, overflow:'truncate' } },
        xAxis:{ type:'value', min:0, max:100, inverse:fa(), splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return num(v)+T('٪','%'); } } },
        series:[{ type:'bar', barMaxWidth:22, data:vs.map(function(x){ return { value:x.sig==null?0:x.sig, itemStyle:{ color:x.sig!=null&&x.sig>=95?cs.getPropertyValue('--sh-good').trim():MU } }; }),
          label:{ show:true, position:fa()?'left':'right', color:TX, fontFamily:FONT, fontSize:11, formatter:function(p){ var x=vs[p.dataIndex]; return x.sig==null?T('دادهٔ کافی نیست','not enough data'):pctTxt(x.sig); } },
          markLine:{ silent:true, symbol:'none', lineStyle:{ color:TX, type:'dashed' }, label:{ color:TX, fontFamily:FONT, fontSize:11, position:'end', distance:4, formatter:T('۹۵٪ = معنادار','95% = significant') }, data:[{ xAxis:95 }] } }] };
      el.style.height=Math.max(200, vs.length*48+60)+'px';
    }
  } else if(F.view==='freq'||(F.view==='ttc'&&F.ttcMode!=='trend')){
    var isT=F.view==='ttc', cats2=(isT?ttcBuckets(F):FRQ_B).map(function(b){ return T(b[0],b[1]); });
    res.segs.forEach(function(s,si){ if(s.notReached) return; var c=pal[si%12];
      ser.push({ name:s.name, type:'bar', barMaxWidth:36, itemStyle:{ color:c, borderRadius:[3,3,0,0] }, data:isT?s.ttc.vals:s.freq });
      if(isT&&si===0){ var mi=ttcBuckets(F).findIndex(function(b){ return s.ttc.median>=b[2]&&s.ttc.median<b[3]; });
        if(mi>-1) ser[ser.length-1].markLine={ silent:true, symbol:'none', lineStyle:{ color:TX, type:'dashed', width:1.5 }, label:{ color:TX, fontFamily:FONT, fontSize:11, formatter:T('میانه ','Median ')+fmtDur(s.ttc.median) }, data:[{ xAxis:cats2[mi] }] }; } });
    opt={ grid:{ left:fa()?16:56, right:fa()?56:16, top:28, bottom:28 },
      tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ return dot(p.color)+esc(p.seriesName)+' <b>'+pctTxt(p.value)+'</b>'; }).join('<br>'); } }, tipBase),
      xAxis:{ type:'category', data:cats2, inverse:fa(), axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, interval:0 } },
      yAxis:{ type:'value', min:0, position:fa()?'right':'left', name:isT?T('درصد تبدیل‌شده‌ها','% of converters'):T('درصد کاربران','% of users'), nameLocation:'middle', nameGap:48, nameRotate:fa()?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 },
        splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return num(v)+T('٪','%'); } } },
      series:ser };
  } else if(F.view==='ttc'){   /* median time to convert by entry date */
    var L3=res.labels[fa()?'fa':'en'], cut3=Math.max(1,L3.length-res.open);
    res.segs.forEach(function(s,si){ if(s.notReached) return; var c=pal[si%12], vals=s.rate.map(function(v,i){ return +(s.ttc.median*(0.8+0.4*jitter(s.name+'md',i))).toFixed(1); });
      ser.push({ name:s.name, type:'line', symbol:'circle', symbolSize:5, lineStyle:{ width:2, color:c }, itemStyle:{ color:c }, data:vals.map(function(v,i){ return i<cut3?v:null; }) });
      ser.push({ name:s.name+'​', type:'line', symbol:'none', lineStyle:{ width:2, type:'dotted', color:c }, silent:true, tooltip:{ show:false }, data:vals.map(function(v,i){ return i>=cut3-1?v:null; }) }); });
    opt={ grid:{ left:fa()?16:64, right:fa()?64:16, top:16, bottom:28 },
      tooltip:Object.assign({ trigger:'axis', formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.filter(function(p){ return p.value!=null&&p.seriesName.indexOf('​')<0; }).map(function(p){ return dot(p.color)+esc(p.seriesName)+' <b>'+fmtDur(p.value)+'</b>'; }).join('<br>'); } }, tipBase),
      xAxis:{ type:'category', data:L3, inverse:fa(), axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true } },
      yAxis:{ type:'value', min:0, position:fa()?'right':'left', name:T('میانهٔ زمان تبدیل','Median time to convert'), nameLocation:'middle', nameGap:54, nameRotate:fa()?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 },
        splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return fmtDur(v); } } },
      series:ser };
  } else if(F.view==='time'){
    var L=res.labels[fa()?'fa':'en'], nb=L.length, cut=Math.max(1,nb-res.open);
    res.segs.forEach(function(s,si){ var c=pal[si%12];
      ser.push({ name:s.name, type:'line', symbol:'circle', symbolSize:5, lineStyle:{ width:2, color:c }, itemStyle:{ color:c }, data:s.rate.map(function(v,i){ return i<cut?v:null; }) });
      ser.push({ name:s.name+'​', type:'line', symbol:'none', lineStyle:{ width:2, type:'dotted', color:c }, itemStyle:{ color:c }, silent:true, tooltip:{ show:false }, data:s.rate.map(function(v,i){ return i>=cut-1?v:null; }) });
      if(si===0&&anomOk()){ var an=anomaly(s.rate, A.ui.anom);
        ser.push({ name:s.name+'​​lo', type:'line', stack:'band', data:an.lo, symbol:'none', lineStyle:{ opacity:0 }, silent:true, tooltip:{ show:false } });
        ser.push({ name:s.name+'​​hi', type:'line', stack:'band', data:an.hi.map(function(h,i){ return h-an.lo[i]; }), symbol:'none', lineStyle:{ opacity:0 }, areaStyle:{ color:c, opacity:.13 }, silent:true, tooltip:{ show:false } });
        ser.push({ name:T('ناهنجاری','Anomaly'), type:'scatter', symbolSize:9, itemStyle:{ color:cs.getPropertyValue('--sh-bad').trim()||'#d33' }, data:s.rate.map(function(v,i){ return an.flags[i]?v:null; }), z:5 }); } });
    opt={ grid:{ left:fa()?16:52, right:fa()?52:16, top:16, bottom:28 },
      tooltip:Object.assign({ trigger:'axis', formatter:function(ps){ var i=ps.length?ps[0].dataIndex:0, seen={}, rows=[];
        ps.forEach(function(p){ var nm=p.seriesName.replace('​',''); if(seen[nm]||p.value==null) return; seen[nm]=1; var s=res.segs.filter(function(x){ return x.name===nm; })[0];
          rows.push(dot(p.color)+esc(nm)+' <b>'+pctTxt(p.value)+'</b> <span style="color:'+MU+'">('+T(num(s?s.entrants[i]:0)+' نفر وارد شدند',num(s?s.entrants[i]:0)+' entered')+')</span>'); });
        return esc(ps.length?ps[0].axisValueLabel:'')+(i>=cut?' <span style="color:'+MU+'">('+T('پنجرهٔ تبدیل هنوز باز است','window still open')+')</span>':'')+'<br>'+rows.join('<br>'); } }, tipBase),
      xAxis:{ type:'category', data:L, inverse:fa(), axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true } },
      yAxis:{ type:'value', min:0, position:fa()?'right':'left', splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return num(v)+T('٪','%'); } } },
      series:ser };
  } else {
    var cats=A.events.map(function(e,k){ return stepLabel(k); });
    res.segs.forEach(function(s,si){ var c=pal[si%12];
      ser.push({ id:'c:'+si, name:s.name, type:'bar', stack:'s'+si, barMaxWidth:64, barCategoryGap:'28%', itemStyle:{ color:c, borderRadius:[0,0,2,2] }, emphasis:{ focus:'series' }, data:s.reached });
      ser.push({ id:'d:'+si, name:s.name+'​', type:'bar', stack:'s'+si, barMaxWidth:64, itemStyle:{ color:alpha(c,.26), borderRadius:[3,3,0,0] }   /* faded fill only: the % label above stays fully legible */, emphasis:{ focus:'series' },
        data:s.reached.map(function(v,k){ var pv=prevVal(s.reached,k); return v==null?null:k&&pv!=null?pv-v:0; }),
        label:{ show:true, position:'top', color:TX, fontFamily:FONT, fontSize:11, fontWeight:700, formatter:function(p){ var r=s.reached; return r[p.dataIndex]==null||!r[0]?'':pctTxt(r[p.dataIndex]/r[0]*100); } } }); });
    opt={ grid:{ left:fa()?16:56, right:fa()?56:16, top:28, bottom:28 },
      tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(ps){ var k=ps.length?ps[0].dataIndex:0, rows=[];
        res.segs.forEach(function(s,si){ var r=s.reached; if(r[k]==null){ rows.push(dot(pal[si%12])+esc(s.name)+': '+T('این قدم حذف شده','step skipped')); return; } var pv=prevVal(r,k), d=k&&pv!=null?pv-r[k]:0;
          rows.push(dot(pal[si%12])+(res.segs.length>1?esc(s.name)+': ':'')+'<b>'+num(r[k])+' '+unitW(res)+'</b> · '+T(pctTxt(r[0]?r[k]/r[0]*100:0)+' از قدم ۱',pctTxt(r[0]?r[k]/r[0]*100:0)+' of step 1')+
            (k&&pv?'<br><span style="color:'+MU+'">'+T(pctTxt(r[k]/pv*100)+' از قدم قبل · ریزش '+num(d),pctTxt(r[k]/pv*100)+' of the previous step · '+num(d)+' dropped off')+'</span>':'')); });
        return esc(cats[k])+'<br>'+rows.join('<br>')+'<br><span style="color:'+MU+'">'+T('برای دیدن کاربران روی ستون کلیک کنید','Click a bar to see these users')+'</span>'; } }, tipBase),
      xAxis:{ type:'category', data:cats, inverse:fa(), axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:TX, fontFamily:FONT, fontSize:11, interval:0, width:120, overflow:'truncate' } },
      yAxis:{ type:'value', min:0, position:fa()?'right':'left', splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return compact(v); } } },
      series:ser };
    /* the same click bubbles to the document, which closes menus: open the Microscope menu after it */
    chart.on('click', function(p){ setTimeout(function(){ microscope(p, res); }, 0); });
  }
  chart.setOption(opt);
  el.style.filter='saturate(.72)';
}
/* Microscope ▸ «فیلتر بر اساس» / «حذف» (Amplitude: filter the chart by this group-by value, or leave it out). Only a broken-down
   series has a value to filter on; a step breakdown filters that step's event, a segment breakdown filters the segment. */
function msFilterItems(s){
  var prop=s.gstep!=null?(A.funnel.gb||{}).prop:A.groupSeg, ok=s.gval!=null&&!!prop&&!s.notReached, P=ok?RB.PROPS[prop]:null;
  var vl=ok?(P.vals.filter(function(v){ return v[1]===s.gval; })[0]||[s.gval,s.gval]):null, nm=vl?'«'+vl[0]+'»':'', nmE=vl?'“'+vl[1]+'”':'';
  var hint=ok?null:['فقط روی نموداری که تفکیک دارد؛ مقدار تفکیک را فیلتر یا حذف می‌کند','Only on a broken-down chart; it filters or leaves out the breakdown value'];
  function apply(op){ var f={ prop:prop, op:op, vals:[s.gval] };
    if(s.gstep!=null){ var e=A.events[s.gstep]; e.filters=(e.filters||[]).concat([f]); if(op==='in') A.funnel.gb=null; }
    else { var sg=A.segments[s.gsi||0]||A.segments[0]; sg.filters=(sg.filters||[]).concat([f]); if(op==='in') A.groupSeg=''; }
    if(isRet()) A.ret.sel=null;
    changed(); U.toast(op==='in'?'نمودار به '+nm+' محدود شد':nm+' از نمودار کنار رفت', op==='in'?'Chart filtered to '+nmE:nmE+' left out of the chart'); }
  return [{ sep:1 },
    { icon:'funnel', fa:'فیلتر بر اساس '+nm, en:'Filter by '+nmE, disabled:!ok, hint:hint, fn:function(){ apply('in'); } },
    { icon:'x', fa:'حذف '+nm, en:'Exclude '+nmE, disabled:!ok, hint:hint, fn:function(){ apply('not_in'); } }];
}
/* Microscope: a click on the converted (solid) or dropped (light) part of a bar */
function microscope(p, res){
  var m=/^(c|d):(\d+)$/.exec(p.seriesId||''); if(!m) return;
  var s=res.segs[+m[2]], k=p.dataIndex, drop=m[1]==='d'; if(drop&&k===0||s.reached[k]==null) return;
  var pv=prevVal(s.reached,k), n=drop?pv-s.reached[k]:s.reached[k];
  var lb=drop?[ 'ریزش‌کرده‌های قدم '+num(k)+' ← '+num(k+1), 'Dropped off between steps '+k+' and '+(k+1) ]:[ 'رسیده به قدم '+num(k+1), 'Reached step '+(k+1) ];
  var ev=drop?A.events[k-1].id:A.events[k].id, box=$('rbzChart').parentNode;
  if(DEF_EV[ev]) ev='page_view';
  box.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
  var a=document.createElement('span'); a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px';
  box.appendChild(a);
  var who=(res.segs.length>1?' · '+s.name:'');
  U.menu(a, [ { head:1, fa:lb[0]+' · '+num(n)+' '+res.unit[0]+who, en:lb[1]+' · '+num(n)+' '+res.unit[1]+who },
    drop?{ icon:'share-network', fa:'ریزش‌کرده‌ها به‌جایش چه کردند', en:'What drop-offs did instead', fn:function(){ altPaths(lb, n, k); } }:null,
    drop?{ icon:'share-network', fa:'مسیر ریزش‌کرده‌ها', en:'Show user paths of drop-offs', hint:['مسیرها فقط برای همین '+num(n)+' نفر','Journeys for these '+n+' people only'], fn:function(){ dropJourney(k, n); } }:null,
    k>0?{ icon:'magnifying-glass', fa:'بررسی عوامل تبدیل', en:'Explore conversion drivers', disabled:A.funnel.order!=='this', hint:A.funnel.order!=='this'?['فقط در قیف «به همین ترتیب»','Only in “this order” funnels']:null, fn:function(){ driversModal(k, drop?'drop':'conv'); } }:null,
    { icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb, n, s.name+k+m[1]); } },
    { icon:'user-circle', fa:'جریان ایونت‌های کاربران', en:'View user streams', disabled:RB.Q.unit==='org', hint:RB.Q.unit==='org'?['جریان ایونت برای هر آدم است؛ در شمارش سازمان‌ها، «دیدن این سازمان‌ها» را بزنید.','Streams are per person; when counting organizations, use “View these organizations”.']:null, fn:function(){ streamsModal(lb, n, s.name+k+m[1], ev); } },
    { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), hint:segInCohort()?UC7_HINT:null, fn:function(){ cohortModal(lb, n, ev); } },   /* PM 2026-10-25, UC-7 */
    { icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb, n, s.name+k+m[1]); } },
    { icon:'share-network', fa:'دیدن مسیر این کاربران', en:'Show user journeys', fn:function(){ if(drop) dropJourney(k, n); else openJourney(ev); } },
    { icon:'video-camera', fa:'تماشای ضبط جلسه‌ها', en:'Watch session replays', fn:function(){ openReplay({ label:T(lb[0],lb[1]), n:n, seed:s.name+k+m[1] }); } } ].concat(msFilterItems(s)).filter(Boolean), 'start');
}
/* Microscope ▸ Explore conversion drivers: which other events go with converting or dropping off between two steps (association, not cause) */
function driversModal(k0, mode0){
  var st={ a:k0-1, b:k0, mode:mode0 }, open={};
  function rows(){ var s=lastF.segs[0], reachA=s.reached[st.a]||0, reachB=s.reached[st.b]||0, conv=reachB, drop=reachA-reachB, steps=A.events.map(function(e){ return e.id; });
    return RB.EVENTS.filter(function(e){ return !e.late && steps.indexOf(e.id)<0; }).map(function(e,i){ var sd=e.id+st.a+st.b, base=jitter(sd,1);
      var did=Math.max(0.03,Math.min(0.9,0.08+0.6*Math.sqrt(e.w/400000)*base)), corr=+((jitter(sd,2)-0.5)*1.4).toFixed(2); if(st.mode==='drop') corr=-corr;
      var grp=st.mode==='conv'?conv:drop, other=st.mode==='conv'?drop:conv, tp=Math.round(grp*Math.min(0.95,did*(1+corr*0.6))), fp=Math.round(other*Math.max(0.02,did*(1-corr*0.6)));
      return { e:e, corr:Math.max(-1,Math.min(1,corr)), freq:+(1.2+3*jitter(sd,3)).toFixed(1), did:grp?tp/grp*100:0, t:2+90*jitter(sd,4), tp:tp, fn:grp-tp, fp:fp, tn:other-fp }; })
      .sort(function(a,b){ return Math.abs(b.corr)-Math.abs(a.corr); }).slice(0,8); }
  function html(){ var s=lastF.segs[0], r=rows(), opt=function(sel){ return A.events.map(function(e,k){ return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(stepLabel(k))+'</option>'; }).join(''); };
    var conv=s.reached[st.b]||0, drop=(s.reached[st.a]||0)-conv, tot=s.reached[st.a]||1;
    return '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('از قدم','From step')+'</label><select class="sh-select" id="rbzDrA">'+opt(st.a)+'</select></div><div class="rbx-field" style="flex:1"><label>'+T('تا قدم','To step')+'</label><select class="sh-select" id="rbzDrB">'+opt(st.b)+'</select></div></div>'+
      '<div class="rbz-drsum"><span>'+T('تبدیل‌شده','Converted')+' <b>'+num(conv)+'</b> ('+pctTxt(conv/tot*100)+')</span><span>'+T('ریزش‌کرده','Dropped off')+' <b>'+num(drop)+'</b> ('+pctTxt(drop/tot*100)+')</span></div>'+
      '<div class="rbz-seg2 sm">'+[['conv','تبدیل‌شده‌ها','Converted'],['drop','ریزش‌کرده‌ها','Dropped off']].map(function(x){ return '<button type="button" class="'+(st.mode===x[0]?'on':'')+'" data-drm="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>'+
      '<div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th>'+T('ایونت','Event')+'</th><th class="num"'+tip(FTIPS.corr[0],FTIPS.corr[1])+'>'+T('امتیاز همبستگی','Correlation score')+'</th><th class="num">'+T('تکرار','Frequency')+'</th><th class="num">'+T('درصد انجام‌دهندگان','% who did event')+'</th><th class="num">'+T('زمان بین قدم‌ها','Time between steps')+'</th></tr></thead><tbody>'+
      r.map(function(x,i){ var c=x.corr; return '<tr><td>'+esc(T(x.e.fa,x.e.en))+' <button class="rb-linkbtn" data-drx="'+i+'" type="button">'+T('دادهٔ همبستگی','Correlation data')+'</button>'+
        (open[i]?'<div class="rbz-mat"><span>'+T('انجام داد و '+(st.mode==='conv'?'تبدیل شد':'ریزش کرد'),'Did it and '+(st.mode==='conv'?'converted':'dropped'))+' <b>'+num(x.tp)+'</b></span><span>'+T('انجام نداد و '+(st.mode==='conv'?'تبدیل شد':'ریزش کرد'),'Didn’t and '+(st.mode==='conv'?'converted':'dropped'))+' <b>'+num(x.fn)+'</b></span><span>'+T('انجام داد، بقیه','Did it, others')+' <b>'+num(x.fp)+'</b></span><span>'+T('انجام نداد، بقیه','Didn’t, others')+' <b>'+num(x.tn)+'</b></span></div>':'')+'</td>'+
        '<td class="num"><span class="rbz-corr '+(c>0.2?'up':c<-0.2?'down':'')+'" dir="ltr">'+(c>0?'+':'')+num(c,2)+'</span></td><td class="num">'+num(x.freq,1)+'</td><td class="num">'+pctTxt(x.did)+'</td><td class="num">'+fmtDur(x.t)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="rbz-sethelp">'+T('امتیاز همبستگی همراهی را نشان می‌دهد، نه علت را؛ برای نتیجه‌گیری، آزمایش A/B لازم است.','The score shows association, not cause; an A/B test is needed to conclude.')+'</p>'; }
  U.modal({ fa:'بررسی عوامل تبدیل', en:'Explore conversion drivers', wide:true, body:html(),
    init:function(bd){ function mount(){ bd.querySelectorAll('[data-drm]').forEach(function(b){ b.addEventListener('click', function(){ st.mode=b.getAttribute('data-drm'); open={}; redo(); }); });
        bd.querySelectorAll('[data-drx]').forEach(function(b){ b.addEventListener('click', function(){ var i=b.getAttribute('data-drx'); open[i]=!open[i]; redo(); }); });
        var a=bd.querySelector('#rbzDrA'), b2=bd.querySelector('#rbzDrB');
        a.addEventListener('change', function(){ st.a=+a.value; if(st.b<=st.a) st.b=Math.min(A.events.length-1,st.a+1); redo(); });
        b2.addEventListener('change', function(){ st.b=+b2.value; if(st.b<=st.a) st.a=Math.max(0,st.b-1); redo(); }); U.i18n(); }
      function redo(){ bd.innerHTML=html(); mount(); } mount(); },
    actions:[{ fa:'بستن', en:'Close', ghost:true }] });
}
/* Microscope ▸ what drop-offs did instead: the next events of people who left after step k (excluding the next step) */
function altPaths(lb, n, k){
  var nextId=A.events[k].id, prev=A.events[k-1].id, cand=RB.EVENTS.filter(function(e){ return !e.late&&e.id!==nextId&&e.id!==prev; });
  var sc=cand.map(function(e){ return { e:e, v:Math.sqrt(e.w)*(0.6+0.8*jitter(prev+'>'+e.id,k)) }; }).sort(function(a,b){ return b.v-a.v; }).slice(0,6);
  var tot=sc.reduce(function(a,x){ return a+x.v; },0)*1.25, left=100;
  var rows=sc.map(function(x){ var pc=+(x.v/tot*100).toFixed(1); left-=pc; return [T(x.e.fa,x.e.en), x.e.id, pc]; });
  U.modal({ fa:T('ریزش‌کرده‌ها به‌جایش چه کردند','What drop-offs did instead'), en:'What drop-offs did instead', subFa:lb[0]+' · '+num(n)+' کاربر؛ اولین کاری که بعد از «'+evName(prev)+'» کردند (به‌جای «'+evName(nextId)+'»).', subEn:lb[1]+' · '+num(n)+' users; the first thing they did after “'+evName(prev)+'” (instead of “'+evName(nextId)+'”).', wide:true,
    body:'<div class="rbz-alt">'+rows.map(function(r){ return '<div class="rbz-altr"><span>'+esc(r[0])+' <code dir="ltr">'+esc(r[1])+'</code></span><span class="bar"><i style="width:'+(r[2]*2)+'%"></i></span><b>'+pctTxt(r[2])+'</b></div>'; }).join('')+
      '<div class="rbz-altr muted"><span>'+T('بی‌کار ماندند و رفتند','Left without another action')+'</span><span class="bar"><i style="width:'+(Math.max(0,left)*2)+'%"></i></span><b>'+pctTxt(Math.max(0,left))+'</b></div></div>',
    actions:[{ fa:'دیدن در مسیرها', en:'Open in Journeys', fn:function(){ dropJourney(k, n); } },{ fa:'بستن', en:'Close', ghost:true }] });
}
function sampleUsers(n, seed, max){
  var C=RB.PROPS.city.vals, D=RB.PROPS.device_type.vals, out=[];
  for(var i=0;i<Math.min(n,max);i++){ var h=RB.hstr(seed+'|'+i), j=jitter(seed,i);
    out.push({ id:'anon-'+(h>>>0).toString(16).slice(0,6), city:C[Math.floor(j*C.length)%C.length], dev:D[Math.floor(jitter(seed+'d',i)*D.length)%D.length], ago:1+Math.floor(jitter(seed+'a',i)*70) }); }
  return out;
}
/* B6 (2026-10-24): with «سازمان‌ها» on, the Microscope lists organizations, not people (Amplitude «View groups») */
function UL(){ return RB.Q.unit==='org'?['دیدن این سازمان‌ها','View these organizations']:['دیدن این کاربران','View these users']; }
function DL(){ return RB.Q.unit==='org'?['دانلود سازمان‌ها','Download organizations']:['دانلود کاربران','Download users']; }   /* Block C (G7) */
function sampleOrgs(n, seed, max){ var o=(RB.ORG&&RB.ORG[RB.PROJECT||0])||{ members:10 }, out=[], k=Math.min(n, max||12);
  for(var i=0;i<k;i++){ var j=jitter(seed+'o',i); out.push({ id:'org_'+(1000+Math.floor(j*8999)), members:Math.max(2, Math.round(o.members*(0.4+j*1.2))), active:Math.max(1, Math.round(o.members*(0.15+jitter(seed+'a',i)*0.5))), ago:1+Math.floor(jitter(seed+'g',i)*40) }); }
  return out; }
/* Block C (2026-10-24, gap audit 49b G7): «دانلود سازمان‌ها» — the organizations behind the point, with their properties; the cut is stated */
function downloadOrgs(lb, n, seed){ var rows=sampleOrgs(n, seed, 500), q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; }, PL=RB.PROPS.org_plan&&RB.PROPS.org_plan.vals, SZ=RB.PROPS.org_size&&RB.PROPS.org_size.vals;
  var lines=[[T('شناسهٔ سازمان','Organization ID'),T('اعضا','Members'),T('اعضای فعال در این نقطه','Members active at this point'),T('پلن سازمان','Organization plan'),T('آخرین فعالیت (روز پیش)','Last active (days ago)')].map(q).join(',')].concat(rows.map(function(o,i){ var pl=PL?PL[Math.floor(jitter(seed+'pl',i)*PL.length)%PL.length]:['','']; return [o.id,o.members,o.active,T(pl[0],pl[1]),o.ago].map(q).join(','); }));
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{ type:'text/csv' })); a.download='shahin-'+(RB.Q.type||'chart')+'-organizations.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  if(n>rows.length) U.toast('فهرست '+num(rows.length)+' سازمان از '+num(n)+' دانلود شد','Downloaded '+rows.length+' of '+n+' organizations');
  else U.toast('فهرست سازمان‌ها دانلود شد','Organization list downloaded'); }
function orgsModal(lb, n, seed){
  var rows=sampleOrgs(n, seed, 12);
  U.modal({ fa:lb[0], en:lb[1], subFa:'نمایش '+num(rows.length)+' از '+num(n)+' سازمان؛ هر ردیف سازمانی است که سایت با ⁦group()⁩ فرستاده.', subEn:'Showing '+rows.length+' of '+n+' organizations; each row is an organization your site sent with ⁦group()⁩.',
    body:'<div class="sh-table-wrap"><table class="sh-table"><thead><tr><th>'+T('شناسهٔ سازمان','Organization ID')+'</th><th>'+T('اعضا','Members')+'</th><th>'+T('اعضای فعال در این نقطه','Members active at this point')+'</th><th>'+T('آخرین فعالیت','Last seen')+'</th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr><td dir="ltr">'+r.id+'</td><td>'+num(r.members)+'</td><td>'+num(Math.min(r.active,r.members))+'</td><td>'+T(num(r.ago)+' ساعت پیش', r.ago+' h ago')+'</td></tr>'; }).join('')+'</tbody></table></div>',
    actions:[{ fa:'بستن', en:'Close', ghost:true }] }); }
function usersModal(lb, n, seed){
  if(RB.Q.unit==='org') return orgsModal(UL(), n, seed);
  var rows=sampleUsers(n, seed, 12);
  U.modal({ fa:lb[0], en:lb[1], subFa:'نمایش '+num(rows.length)+' از '+num(n)+' کاربر؛ هر ردیف یک آدم است: کاربر شناسایی‌شده با شناسهٔ کاربرش و کاربر ناشناس با دستگاهش.', subEn:'Showing '+rows.length+' of '+num(n)+' users; each row is one person: an identified user by User ID, an anonymous one by device.', wide:true,
    body:'<div class="sh-table-wrap"><table class="sh-table"><thead><tr><th>'+T('شناسهٔ کاربر','User ID')+'</th><th>'+T('دستگاه‌ها','Devices')+'</th><th>'+T('شهر','City')+'</th><th>'+T('نوع دستگاه','Device type')+'</th><th>'+T('آخرین فعالیت','Last seen')+'</th></tr></thead><tbody>'+   /* PM 2026-10-28, RB-6: a row is a person, with the count of their devices (as the Users page) */
      rows.map(function(r,i){ var pr=window.RBId&&RBId.of?RBId.of(r):null, nd=pr&&pr.devices?pr.devices.length:1; return '<tr class="rbz-urow" tabindex="0" data-urow="'+i+'"><td dir="ltr">'+(window.RBId?esc(RBId.label(r)):r.id)+'</td><td>'+num(nd)+'</td><td>'+esc(dacVal('city', r.city))+'</td><td>'+esc(dacVal('device_type', r.dev))+'</td><td>'+T(num(r.ago)+' ساعت پیش',r.ago+' h ago')+'</td></tr>'; }).join('')+'</tbody></table></div>',
    actions:[{ fa:'بستن', en:'Close', ghost:true }] });
  var ov=document.querySelector('.rbx-ov:last-child'); if(ov) ov.querySelectorAll('[data-urow]').forEach(function(tr){ var go=function(){ openPersonFrom(enrichUser(rows[+tr.getAttribute('data-urow')], seed, +tr.getAttribute('data-urow'))); }; tr.addEventListener('click', go); tr.addEventListener('keydown', function(e){ if(e.key==='Enter') go(); }); });
}
/* PM 2026-10-25, UC-2 (cross-group): the cohort area's tag hook (RBCohort.devTag) on every builder surface that makes or picks a cohort.
   PM 2026-10-28, LX-6: the hook returns '' on this Backlog page, so these surfaces carry no «نیازمند توسعه». */
function coTag(){ var t=window.RBCohort&&RBCohort.devTag?RBCohort.devTag('cohorts'):''; return t?' '+t:''; }
function coTagRow(){ var t=coTag(); return t?'<div class="rbx-field">'+t+'</div>':''; }
/* PM 2026-10-25, UC-7: a cohort made from a chart whose segment uses «در کوهورت» is static (Amplitude's rule); the Microscope says so first */
function segInCohort(){ return (A.segments||[]).some(function(sg){ return !!sg.cohort; }); }
var UC7_HINT=['ثابت: عدد همین لحظه؛ گروه این نمودار به کوهورت دیگری وابسته است','Static: today’s count; this chart’s segment depends on another cohort'];
/* PM 2026-10-25, UC-5: a viewer's cohort, from any path, is personal and unlisted, with the cohort page's toast */
var UC5_TOAST=['به‌عنوان بیننده، کوهورت در فضای شخصی شما و فهرست‌نشده ذخیره شد','As a viewer, the cohort saved to your personal space, unlisted'];
function viewerCohort(id){ if(!IS_VIEWER||!id) return; var st=RBShell.cohortStore?RBShell.cohortStore():null, c=st&&st.filter(function(x){ return x.id===id; })[0]; if(c) c.disc=false; }
function cohortModal(lb, n, ev, def){
  var uc7=segInCohort();
  U.modal({ fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), subFa:'کوهورت در فضای شخصی شما ذخیره می‌شود و در «در کوهورت» گروه‌ها قابل انتخاب است.', subEn:'The cohort is saved in your personal space and can be picked in a segment’s “In cohort”.',
    body:coTagRow()+'<div class="rbx-field"><label>'+T('نام کوهورت','Cohort name')+'</label><input class="sh-input" id="rbzCoN" value="'+esc(T(lb[0],lb[1]))+'"/></div>'+
      (uc7?'<div class="rbz-note">'+ic('info')+T(UC7_HINT[0],UC7_HINT[1])+'</div>':'')+
      (IS_VIEWER?'<div class="rbz-note">'+ic('info')+T('به‌عنوان بیننده، این کوهورت در فضای شخصی شما و فهرست‌نشده ذخیره می‌شود.','As a viewer, this cohort is saved to your personal space, unlisted.')+'</div>':''),
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ساختن', en:'Create', fn:function(bd){ var nm=bd.querySelector('#rbzCoN').value.trim(); if(!nm){ U.toast('نام کوهورت را بنویسید','Name the cohort'); return false; }
      /* f is chosen so the shell's cohort count reproduces this bar's n */
      var pu=within({ range:RB.Q.range, filters:[] }, function(){ var e=getEv(ev); return e?RB.periodUniques(RB.seriesR(e,true)):1; });
      var steps=A.events.map(function(e){ return evName(e.id); }).join(' ← ');
      /* Amplitude creates some chart cohorts as static lists only (create-cohorts docs): funnels with exclusions, a held property or a step breakdown; property sums/averages; and the retention cases passed in def[2] */
      var stat=uc7||(def&&def.length>2?!!def[2]:isFunnel()?!!(A.funnel.excl.length||A.funnel.hold||A.funnel.gb):A.measure==='prop');   /* UC-7: «در کوهورت» makes it static */
      /* UC-5: disc:false + viewer:true tell RBShell.addCohort to keep a viewer's cohort personal and unlisted */
      var cid=RBShell.addCohort({ fa:nm, en:nm, defFa:def?def[0]:lb[0]+' در قیف «'+steps+'»', defEn:def?def[1]:lb[1]+' in the funnel “'+steps+'”', ev:ev, range:RB.Q.range, f:Math.min(1,n/Math.max(1,pu)), stat:stat, n:n, disc:!IS_VIEWER, viewer:IS_VIEWER, quiet:IS_VIEWER });   /* UC-5: the builder shows the viewer toast, so the shell's own is quiet */
      viewerCohort(cid);
      if(IS_VIEWER) U.toast(UC5_TOAST[0],UC5_TOAST[1]); else U.toast('کوهورت «'+nm+'» در فضای شخصی ساخته شد','Cohort “'+nm+'” created in your personal space'); } }] });
}
/* ── Microscope ▸ «جریان ایونت‌های کاربران» (Amplitude View User Streams): up to 10 of the people behind a point, each with the events
   of their latest sessions; the chart's event is highlighted (the person did it in that window); a user id or an event opens the person ── */
var ST={ props:false, replay:false };
function enrichUser(u, seed, i){ var B=RB.PROPS.browser.vals, R=RB.PROPS.referrer_type.vals;
  return Object.assign({}, u, { browser:u.browser||B[Math.floor(jitter(seed+'b',i)*B.length)%B.length], ref:u.ref||R[Math.floor(jitter(seed+'r',i)*R.length)%R.length], sess:u.sess||2+Math.floor(jitter(seed+'s',i)*5) }); }
function openPersonFrom(u){ if(!window.RBCohort||!RBCohort.openPerson) return; var x=document.querySelector('.rbx-ov:last-child .rbx-mx'); if(x) x.click(); RBShell.renderHome(); RBCohort.openPerson(u, null); }
function streamOf(u, ev, k){ var ss=window.RBCohort&&RBCohort.sessions?RBCohort.sessions(u).slice(0,2):[];
  var hidS=function(id){ var e=RB.evById(id); return !!(e&&e.hideIn&&e.hideIn.indexOf('stream')>-1); };   /* Block C: hidden in user streams */
  ss=ss.map(function(s){ return Object.assign({}, s, { list:s.list.filter(function(x){ return !hidS(x.ev); }), rep:jitter(u.id+'rep',s.start)<0.45 }); });
  if(ss[0]&&!ss.some(function(s){ return s.list.some(function(e){ return e.ev===ev; }); })){ var L=ss[0].list, at=Math.max(1,Math.floor(L.length/2)); L.splice(at,0,{ ev:ev, t:(L[at-1]||{ t:0 }).t, path:(L[at-1]||{}).path }); }
  return ss; }
function streamsModal(lb, n, seed, ev){
  var rows=sampleUsers(n, seed, 10).map(function(u,i){ return enrichUser(u, seed, i); });
  U.modal({ fa:'جریان ایونت‌های کاربران — '+lb[0], en:'User streams — '+lb[1], subFa:'نمایش '+num(rows.length)+' از '+num(n)+' کاربرِ این نقطه، هر کدام با ایونت‌های آخرین نشست‌هایش؛ ایونتِ نمودار پررنگ است. روی شناسه یا هر ایونت بزنید تا پروفایل کاربر باز شود.', subEn:'Showing '+rows.length+' of '+num(n)+' users behind this point, each with the events of their latest sessions; the chart’s event is highlighted. Click an ID or any event to open the user’s profile.', wide:true,
    body:'<div class="rbz-sttools"><label class="rbz-ck"><input type="checkbox" id="rbzStProps"'+(ST.props?' checked':'')+'/>'+T('نمایش ویژگی‌های ایونت','Show event properties')+'</label><label class="rbz-ck"><input type="checkbox" id="rbzStRep"'+(ST.replay?' checked':'')+'/>'+T('فقط نشست‌های دارای ضبط','Only sessions with a replay')+'</label></div><div id="rbzStreams" class="rbz-streams"></div>',
    actions:[{ fa:'بستن', en:'Close', ghost:true }] });
  var ov=document.querySelector('.rbx-ov:last-child'), host=ov&&ov.querySelector('#rbzStreams'); if(!host) return;
  function draw(){
    host.innerHTML=rows.map(function(u,i){ var p=window.RBId?RBId.of(u):null, idd=!!(p&&p.identified), ss=streamOf(u, ev, i).filter(function(s){ return !ST.replay||s.rep; });
      return '<div class="rbz-stream" data-st="'+i+'"><div class="rbz-sthead"><button type="button" class="rb-linkbtn" data-stuser="'+i+'" dir="ltr">'+esc(idd?p.uid:u.id)+'</button><span class="rbz-tag'+(idd?' good':'')+'">'+(idd?T('شناسایی‌شده','Identified'):T('ناشناس','Anonymous'))+'</span><span class="rbz-stm">'+esc(T(u.city[0],u.city[1]))+' · '+esc(T(u.dev[0],u.dev[1]))+'</span></div>'+
        (ss.length?ss.map(function(s){ return '<div class="rbz-stsess"><div class="rbz-stsh">'+ic('clock-counter-clockwise')+'<span>'+RBShell.lib.ago(s.start)+'</span>'+(s.rep?'<a class="rb-linkbtn rbz-stplay" href="'+esc(replayUrl({ label:T(lb[0],lb[1]), user:idd?p.uid:u.id, seed:u.id+s.start }))+'" target="_blank" rel="noopener">'+ic('play-circle')+T('پخش نشست','Play session')+'</a>':'')+'</div>'+
          s.list.filter(function(e){ return !e.mark; }).slice(0,12).map(function(e){ return '<button type="button" class="rbz-stev'+(e.ev===ev?' hl':'')+'" data-stuser="'+i+'"><span class="rbz-evic">'+evIcon(e.ev)+'</span><span>'+esc(evName(e.ev))+'</span>'+(ST.props&&e.path?'<code dir="ltr">page_path = '+esc(e.path[1])+'</code>':'')+'</button>'; }).join('')+'</div>'; }).join('')
          :'<div class="rbz-tnote">'+T('این کاربر در این بازه نشستِ دارای ضبط ندارد.','No session with a replay for this user in this window.')+'</div>')+'</div>'; }).join('');
    host.querySelectorAll('[data-stuser]').forEach(function(b){ b.addEventListener('click', function(){ openPersonFrom(rows[+b.getAttribute('data-stuser')]); }); }); }
  ov.querySelector('#rbzStProps').addEventListener('change', function(e){ ST.props=e.target.checked; draw(); });
  ov.querySelector('#rbzStRep').addEventListener('change', function(e){ ST.replay=e.target.checked; draw(); });
  draw(); }
function downloadUsers(lb, n, seed){
  if(RB.Q.unit==='org') return downloadOrgs(lb, n, seed);
  var rows=sampleUsers(n, seed, 500).map(function(u,i){ return enrichUser(u, seed, i); }), q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; };
  /* Block C (2026-10-24): user properties as columns (Amplitude «Download users»): last seen, sessions, browser, first referrer */
  var lines=[[T('شناسهٔ کاربر','User ID'),T('شناسهٔ دستگاه','Device ID'),T('شهر','City'),T('نوع دستگاه','Device type'),T('مرورگر','Browser'),T('منبع ورود اول','First referrer'),T('نشست‌ها','Sessions'),T('آخرین بازدید (ساعت پیش)','Last seen (hours ago)')].map(q).join(',')].concat(rows.map(function(r){ var p=window.RBId?RBId.of(r):null; return [p&&p.identified?p.uid:'',r.id,dacVal('city', r.city),dacVal('device_type', r.dev),dacVal('browser', r.browser),dacVal('referrer_type', r.ref),r.sess,r.ago].map(q).join(','); }));
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='shahin-'+(RB.Q.type||'chart')+'-users.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  /* B7: the cut is stated, never silent */
  if(n>rows.length) U.toast('فهرست '+num(rows.length)+' کاربر از '+num(n)+' دانلود شد','Downloaded '+rows.length+' of '+n+' users');
  else U.toast('فهرست کاربران دانلود شد','User list downloaded');
}
function funnelCsv(){
  var r=lastF; if(!r||r.empty) return; var q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; };
  var lines=[[T('گروه','Segment'),T('نرخ تبدیل','Conversion')].concat(A.events.map(function(e,k){ return stepLabel(k); })).concat([T('میانهٔ زمان تبدیل (دقیقه)','Median time to convert (min)')]).map(q).join(',')];
  r.segs.forEach(function(s){ lines.push([s.name, s.conv.toFixed(1)].concat(s.reached).concat([Math.round(s.medTotal)]).map(q).join(',')); });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='funnel.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  U.toast('فایل CSV دانلود شد','CSV downloaded');
}
function wireFunnel(){
  if(!isFunnel()) return;
  var F0=A.funnel;
  root.querySelectorAll('[data-ttcmode]').forEach(function(b){ b.addEventListener('click', function(){ F0.ttcMode=b.getAttribute('data-ttcmode'); changed(); }); });
  [['rbzTtcScope','ttcScope',true],['rbzFrX','freqX'],['rbzFrY','freqY'],['rbzHold','hold']].forEach(function(x){ var el=$(x[0]); if(el) el.addEventListener('change', function(){ F0[x[1]]=x[2]?+el.value:el.value; changed(); }); });
  var ab=$('rbzAbBase'); if(ab) ab.addEventListener('change', function(){ F0.abBase=+ab.value; changed(); });
  var ps=$('rbzPsum'); if(ps) ps.addEventListener('change', function(){ F0.psum=ps.value; changed(); });
  var ms=$('rbzMs'); if(ms) ms.addEventListener('change', function(){ F0.ms=ms.checked; changed(); });
  var fd=$('rbzFirstDay'); if(fd) fd.addEventListener('change', function(){ F0.firstDay=fd.value==='1'; changed(); });
  var al=$('rbzAlert'); if(al) al.addEventListener('click', function(e){ e.stopPropagation(); if(window.RBAlerts&&window.RBH) RBAlerts.bellMenu(al, RBH.current()); else alertModal(); });
  root.querySelectorAll('[data-cedel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-cedel').split(':'), c=F0.cmpEv.filter(function(x){ return x.k===+p[0]; })[0]; if(c){ c.ids.splice(+p[1],1); if(!c.ids.length) F0.cmpEv.splice(F0.cmpEv.indexOf(c),1); } changed(); }); });
  var od=root.querySelector('[data-optdel]'); if(od) od.addEventListener('click', function(){ F0.optional=-1; changed(); });
  var gd=root.querySelector('[data-fgbdel]'); if(gd) gd.addEventListener('click', function(){ F0.gb=null; changed(); });
  var bs=$('rbzBase'); if(bs) bs.addEventListener('change', function(){ F0.baseline=bs.value; changed(); });
  root.querySelectorAll('[data-act]').forEach(function(b){ b.addEventListener('click', function(){ var a=b.getAttribute('data-act'), k=+b.getAttribute('data-k'), n=+b.getAttribute('data-n');
    var lb=[ 'ریزش‌کرده‌های قدم '+num(k)+' ← '+num(k+1), 'Dropped off between steps '+k+' and '+(k+1) ], ev=A.events[k-1]?A.events[k-1].id:'page_view'; if(DEF_EV[ev]) ev='page_view';
    if(a==='cohort') cohortModal(lb, n, ev); else if(a==='csv') downloadUsers(lb, n, 'act'+k); else openReplay({ label:T(lb[0],lb[1]), n:n, seed:'act'+k }); }); });
  var F=A.funnel, o=$('rbzOrder'); if(o) o.addEventListener('change', function(){ F.order=o.value; changed(); });
  root.querySelectorAll('[data-fview]').forEach(function(b){ b.addEventListener('click', function(){ F.view=b.getAttribute('data-fview'); changed(); }); });
  var sc=$('rbzScope'); if(sc) sc.addEventListener('change', function(){ F.scope=+sc.value; changed(); });
  var wn=$('rbzWinN'); if(wn) wn.addEventListener('change', function(){ F.win.n=wn.value; winClamp(F.win); changed(); });   /* PM 2026-10-25, CR-2 */
  var wu=$('rbzWinU'); if(wu) wu.addEventListener('change', function(){ F.win.u=wu.value; winClamp(F.win); changed(); });
  var fc=$('rbzFCmp'); if(fc) fc.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(fc, [['','بدون مقایسه','No comparison'],['prev','دورهٔ قبل','Previous period'],['year','پارسال','Last year']].map(function(x){ var on=(F.cmp||'')===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ F.cmp=x[0]; changed(); } }; }), 'start'); });
  var ct=$('rbzCount'); if(ct) ct.addEventListener('change', function(){ F.count=ct.value; changed(); });
  var hd=$('rbzHead'); if(hd) hd.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(hd, Object.keys(HEAD).map(function(k){ return { fa:HEAD[k][0]+(F.head===k?' ✓':''), en:HEAD[k][1]+(F.head===k?' ✓':''), fn:function(){ F.head=k; changed(); } }; }), 'start'); });
  root.querySelectorAll('[data-xdel]').forEach(function(b){ b.addEventListener('click', function(){ F.excl.splice(+b.getAttribute('data-xdel'),1); changed(); }); });
  var xa=root.querySelector('[data-xadd]'); if(xa) xa.addEventListener('click', exclModal);
  var csv=$('rbzCsv'); if(csv){ var c2=csv.cloneNode(true); csv.parentNode.replaceChild(c2,csv); c2.addEventListener('click', funnelCsv); }
}
function exclModal(){
  var opts=RB.EVENTS.filter(function(e){ return !pickHidden(e); })/* PM 2026-10-25, RB-19: hidden or blocked events leave the list */.map(function(e){ return '<option value="'+esc(e.id)+'">'+esc(T(e.fa,e.en))+' · '+esc(e.id)+'</option>'; }).join('');
  U.modal({ fa:'حذف کسانی که … را انجام داده‌اند', en:'Exclude users who did', subFa:'کاربرانی که این ایونت را در بازهٔ انتخابی انجام داده‌اند تبدیل‌شده حساب نمی‌شوند.', subEn:'Users who did this event in the chosen span don’t count as converted.',
    body:'<div class="rbx-field"><label>'+T('ایونت','Event')+'</label><select class="sh-select" id="rbzXe">'+opts+'</select></div>'+
      '<div class="rbx-field"><label>'+T('در کجای قیف','Where in the funnel')+'</label><select class="sh-select" id="rbzXf"><option value="0">'+T('بین همهٔ قدم‌ها','Between all steps')+'</option>'+
      A.events.slice(1).map(function(e,i){ return '<option value="'+(i+1)+'">'+T('بین قدم '+num(i+1)+' و '+num(i+2),'Between steps '+(i+1)+' and '+(i+2))+'</option>'; }).join('')+'</select></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ A.funnel.excl.push({ ev:bd.querySelector('#rbzXe').value, from:+bd.querySelector('#rbzXf').value }); changed(); } }] });
}
/* ═════════ Retention (phase 2 steps 4a–4b): Amplitude Retention Analysis ═════════
   The starting event puts a user into the cohort of the period they first did it in (each user in one cohort);
   a return event marks them retained. Rules (chart-review, 16-chart-review-retention.md): the row denominator is
   the cohort size and stays constant; "on or after" rows never rise; the overall row is a pooled ratio over complete
   cells only; incomplete cells carry an asterisk and stay out of the overall row; day 0 is computed, never fixed at 100%.
   4b: custom brackets, calendar days (UTC day, week from Saturday, Solar Hijri months; PM 2026-10-25, WS-3), a second return event,
   breaking the starting event down by a property, Change over time, and Usage interval. */
var RET_IV={ day:{ fa:'روزانه', en:'Daily', u:['روز','Day'], d:1, h:30 }, week:{ fa:'هفتگی', en:'Weekly', u:['هفتهٔ','Week'], d:7, h:12 }, month:{ fa:'ماهانه', en:'Monthly', u:['ماه','Month'], d:30, h:12 } };
var RET_M={ after:['بازگشت در همان دوره یا بعد از آن','Return on or after'], on:['بازگشت دقیقاً در همان دوره','Return on'], custom:['بازگشت در بازه‌های سفارشی','Return on (custom)'] };
var RET_BARS={ day:[0,1,3,7,14,30], week:[0,1,2,4,8,12], month:[0,1,2,3,6,12] };
var RET_MS={ day:[1,7,14,30], week:[1,2,4,8], month:[1,2,3,6] };   /* Change over time: default milestones (Amplitude's figure: Day 1, 7, 14, 30) */
var RET_BR=[[0,0],[1,3],[4,6],[7,11]];                               /* Amplitude's doc example for custom brackets */
var USE_X=14, USE_T=[1,3,7];                                       /* usage interval: gaps up to 14 days (a 15-day lookback); over-time thresholds */
var RET_NOW=new Date(2026,6,27);   /* the engine's demo clock (5 Mordad 1405) */
var MAX_RET_SEL=12, MAX_BR=100, MAX_RET_EV=2;
var RTIPS={
  ev:["<span class='tip-title'>ایونت‌ها</span>ایونت شروع کاربر را وارد کوهورت همان دوره می‌کند و ایونت بازگشت نشان می‌دهد چه کسی برگشته است.","<span class='tip-title'>Events</span>The starting event puts a user into that period’s cohort; the return event marks who came back."],
  start:["<span class='tip-title'>ایونت شروع</span>کاری که کاربر را وارد تحلیل می‌کند؛ دوره‌ای که اولین بار در بازهٔ انتخابی انجامش داده، کوهورت او را تعیین می‌کند. شرط گروه‌های کاربران فقط روی همین ایونت اعمال می‌شود.","<span class='tip-title'>Starting event</span>What brings a user into the analysis; the period they first do it in the selected range sets their cohort. Segment conditions apply to this event only."],
  ret:["<span class='tip-title'>ایونت بازگشت</span>کاری که «برگشتن» حساب می‌شود؛ اگر ایونتی انتخاب نشود، هر ایونت فعالی کافی است. تا دو ایونت بازگشت ممکن است و هر کدام جدا تحلیل و رسم می‌شود.","<span class='tip-title'>Return event</span>What counts as coming back; if no event is picked, any active event counts. Up to two return events, each analysed and drawn on its own."],
  meas:["<span class='tip-title'>سنجش بر اساس</span>نرخ بازگشت: درصد کاربران هر کوهورت که در هر دوره برگشته‌اند. فاصلهٔ استفاده: کاربران معمولاً هر چند روز یک‌بار ایونت بازگشت را تکرار می‌کنند.","<span class='tip-title'>Measured as</span>Retention: the share of each cohort that came back in each period. Usage interval: how many days users typically go between repeats of the return event."],
  after:["<span class='tip-title'>در همان دوره یا بعد از آن</span>کسی که در هفتهٔ ۳ یا هر زمانی بعد از آن برگشته، برای هفتهٔ ۳ برگشته حساب می‌شود؛ یعنی «هنوز از دست نرفته». منحنی هر کوهورت هرگز بالا نمی‌رود.","<span class='tip-title'>Return on or after</span>Anyone who came back in week 3 or any time later counts for week 3, meaning “not lost yet”. Each cohort’s curve never rises."],
  on:["<span class='tip-title'>دقیقاً در همان دوره</span>فقط کسی که دقیقاً در همان دوره برگشته؛ نظم عادت دوره‌به‌دوره را نشان می‌دهد و ممکن است یک دوره از دورهٔ قبلش بالاتر باشد.","<span class='tip-title'>Return on</span>Only people who came back in exactly that period; it shows how regular the habit is, and a period can read higher than the one before."],
  custom:["<span class='tip-title'>بازه‌های سفارشی</span>هر بازه، مثل روز ۱ تا ۳، کسانی را می‌شمارد که در هر روزی از آن بازه برگشته‌اند؛ بازه‌ها تجمعی نیستند و تا ۱۰۰ بازه ممکن است.","<span class='tip-title'>Custom brackets</span>Each bracket, such as day 1–3, counts people who came back on any day inside it; brackets aren’t cumulative, and up to 100 are allowed."],
  day:["<span class='tip-title'>تعریف روز</span>۲۴ ساعت از شروع: روز هر کاربر از لحظه ایونت شروعش حساب می‌شود (روز ۰ = ۲۴ ساعت اول، روز ۱ = ساعت ۲۴ تا ۴۸؛ هفته ۷ روز و ماه ۳۰ روز). روز تقویمی: روز UTC، از ۰۳:۳۰ تا ۰۳:۳۰ به وقت تهران؛ هفته از شنبه و ماه شمسی.","<span class='tip-title'>Day definition</span>24 hours from start: each user’s day starts at their starting event (day 0 = the first 24 hours, day 1 = hours 24–48; a week is 7 days, a month 30). Calendar: the UTC day, 03:30 to 03:30 Tehran; weeks from Saturday and Solar Hijri months."],   /* PM 2026-10-25, WS-3: the calendar day is the UTC day */
  users:["<span class='tip-title'>کاربران</span>کسانی که در آن دوره ایونت شروع را انجام داده‌اند؛ هر نفر فقط در یک کوهورت شمرده می‌شود. ردیف کل، کوهورتی را که دورهٔ صفرش تمام نشده حساب نمی‌کند.","<span class='tip-title'>Users</span>People who did the starting event in that period; each person counts in one cohort only. The overall row leaves out a cohort whose period 0 hasn’t ended."],
  overall:["<span class='tip-title'>ردیف کل</span>سهم برگشته‌ها فقط از کوهورت‌هایی که آن دوره را کامل گذرانده‌اند؛ مخرج، جمع کاربران همان کوهورت‌هاست. خانه‌های ستاره‌دار در آن حساب نمی‌شوند.","<span class='tip-title'>Overall row</span>The share who came back, only from cohorts that have fully passed that period; the denominator is those cohorts’ users. Asterisked cells are left out."],
  time:["<span class='tip-title'>تغییر در طول زمان</span>هر خط یک نقطهٔ عطف (مثلاً هفتهٔ ۱) است و نشان می‌دهد این عدد برای کوهورت‌های پشت سر هم چطور تغییر کرده؛ همان دادهٔ جدول، با محور تاریخ شروع.","<span class='tip-title'>Change over time</span>Each line is one milestone (such as week 1), showing how that number moved across consecutive cohorts; the same data as the table, on a start-date axis."],
  usage:["<span class='tip-title'>فاصلهٔ استفاده</span>برای هر کاربر، میانهٔ فاصلهٔ بین دو بار انجام ایونت بازگشت در ۱۵ روز اخیر حساب می‌شود؛ نمودار تجمعی است: «۶۵٪ تا ۴ روز» یعنی ۶۵٪ کاربران معمولاً حداکثر هر ۴ روز یک‌بار برمی‌گردند. فقط کسانی حساب می‌شوند که دست‌کم در دو روز متفاوت این ایونت را انجام داده‌اند.","<span class='tip-title'>Usage interval</span>For each user, the median gap between repeats of the return event over the last 15 days; the chart is cumulative: “65% within 4 days” means 65% of users typically come back at least every 4 days. Only users who did the event on at least two different days count."],
  ltv:["<span class='tip-title'>ارزش N روزه</span>میانگین درآمدی که هر کاربرِ کوهورت تا پایان روز (یا هفته یا ماه) N آورده است، از جمع مبلغ سفارش‌های ایونت خرید؛ عدد هر دوره، دوره‌های قبل را هم دربر دارد. شاهین مبلغ سفارش را می‌گیرد ولی گزارش‌ها هنوز آن را به کوهورت وصل نمی‌کنند.","<span class='tip-title'>N-day LTV</span>The average revenue each user in the cohort brought in by the end of day (or week or month) N, from the purchase event’s order amounts; each period includes the ones before it. Shahin receives the order amount, but reports don’t tie it to cohorts yet."],
  rev:["<span class='tip-title'>ایونت درآمد</span>درآمد از ایونت «خرید» و ویژگی «مبلغ سفارش» خوانده می‌شود؛ ایونت دیگری درآمد حساب نمی‌شود.","<span class='tip-title'>Revenue event</span>Revenue is read from the Purchase event’s order amount; no other event counts as revenue."],
  utime:["<span class='tip-title'>فاصلهٔ استفاده در طول زمان</span>از کسانی که در هر روز ایونت بازگشت را انجام دادند، چند درصد ظرف ۱، ۳ یا ۷ روز دوباره انجامش دادند؛ عدد واقعی همان روز است، نه میانگین.","<span class='tip-title'>Usage interval over time</span>Of the people who did the return event on each day, the share who did it again within 1, 3 or 7 days; the day’s actual figure, not an average."]
};
/* literal on purpose: blank() runs at load, before the constants below are assigned */
function blankRet(){ return { method:'after', iv:'week', viz:'line', sel:null, open:{ 0:true }, shown:'ret', ms:null, cal:false, brackets:[[0,0],[1,3],[4,6],[7,11]], meas:'ret', ushown:'dist' }; }
function isRet(){ return RB.Q.type==='retention'; }
function retPair(st){ return { s:st.events[0], r:st.events[1]||{ id:'_any_active', filters:[], groupBy:'', implicit:true } }; }
function retReturns(st){ var r=[retPair(st).r]; if(st.events[2]) r.push(st.events[2]); return r; }
function retIv(st, R){ return st.ret.meas==='usage'?'day':(st.ret.iv==='day'&&R.days>91?'week':st.ret.iv); }
function retColLab(iv, k){ var u=RET_IV[iv].u; return T(u[0]+' '+num(k), u[1]+' '+k); }
function retBrLab(iv, b){ if(b[0]===b[1]) return retColLab(iv,b[0]); var u=RET_IV[iv].u; return T(u[0]+' '+num(b[0])+'–'+num(b[1]), u[1]+' '+b[0]+'–'+b[1]); }
function retDay(off){ return new Date(RET_NOW.getTime()+off*864e5); }
function retDate(d, iv, cal){
  var f=iv==='month'?{ month:'long', year:'numeric' }:{ day:'numeric', month:'long' }, g=iv==='month'?{ month:'short', year:'numeric' }:{ month:'short', day:'numeric' };
  var x=T(new Intl.DateTimeFormat('fa-IR-u-ca-persian', f).format(d), new Intl.DateTimeFormat(cal&&iv==='month'?'en-u-ca-persian':'en-US', g).format(d));
  return iv==='week'?T('هفتهٔ ','Week of ')+x:x;
}
/* calendar periods (UTC day, 03:30–03:30 Tehran; PM 2026-10-25, WS-3): days, weeks from Saturday, Solar Hijri months — from the one holding `from` up to today */
var PDAY=new Intl.DateTimeFormat('en-u-ca-persian', { day:'numeric' }), calCache={};
function calGrid(iv, from){
  var key=iv+from; if(calCache[key]) return calCache[key];
  var out=[], a;
  if(iv==='day'){ for(a=from;a<=0;a++) out.push({ a:a, b:a }); }
  else if(iv==='week'){ a=from-((retDay(from).getDay()+1)%7); for(;a<=0;a+=7) out.push({ a:a, b:a+6 }); }   /* getDay(): Saturday = 6 */
  else { a=from-(parseInt(PDAY.format(retDay(from)),10)-1); var s=a;
    for(var x=a+1;x<a+500;x++){ if(parseInt(PDAY.format(retDay(x)),10)===1){ out.push({ a:s, b:x-1 }); s=x; if(x-1>=0) break; } } }
  return (calCache[key]=out);
}
/* the retention numbers: one function for the builder, the table, the Microscope, the CSV and the board tile */
function rCompute(st, ctx){
  return within(ctx, function(){
    var R=RB.rangeInfo(), Rt=st.ret, out={ R:R, segs:[], empty:!st.events.length||!getEv(st.events[0].id) };
    if(out.empty) return out;
    if(Rt.meas==='usage') return uCompute(st, R, out);
    if(Rt.meas==='ltv'){ if(!ltvOk()){ out.empty=true; out.noRev=true; return out; } st=ltvState(st); Rt=st.ret; }
    var iv=retIv(st,R), d=RET_IV[iv].d, H=RET_IV[iv].h, es=st.events[0], cal=!!Rt.cal, i, k, j;
    out.iv=iv; out.ivForced=iv!==Rt.iv; out.method=Rt.method; out.cal=cal;
    /* cohort periods. 24-hour windows: one per interval from the range start, each user's periods measured from their own start.
       Calendar: the calendar periods (Saturday weeks, Solar Hijri months) that overlap the range. Offsets in days, 0 = today (still running). */
    var end=R.mode==='custom'?rEnd(R):R.mode==='yesterday'?retDay(-1):RET_NOW;
    var endOff=Math.round((end-RET_NOW)/864e5), startOff=endOff-R.days+1, coh=[];
    if(cal){ var G=calGrid(iv, startOff);
      G.forEach(function(p, gi){ if(p.b<startOff||p.a>endOff) return; var a=Math.max(p.a,startOff), b=Math.min(p.b,endOff);
        coh.push({ gi:gi, a:a, b:b, len:b-a+1, part:b-a+1<p.b-p.a+1, date:retDay(p.a) }); });
      out.grid=G; }
    else { var C=Math.max(1,Math.ceil(R.days/d)); for(i=0;i<C;i++){ var a0=startOff+i*d, b0=Math.min(endOff, a0+d-1); coh.push({ a:a0, b:b0, len:b0-a0+1, part:b0-a0+1<d, date:retDay(a0) }); } }
    /* each cohort's periods: reached (E), finished, and the share of the running one already elapsed */
    coh.forEach(function(c){ c.done=[]; c.phi=[];
      if(cal){ c.E=G.length-1-c.gi; for(j=0;j<=c.E;j++){ var P=G[c.gi+j], dn=P.b<=-1; c.done.push(dn); c.phi.push(dn?1:Math.max(0.1,Math.min(0.95,(1-P.a)/(P.b-P.a+1)))); } }
      else { c.E=Math.floor(-c.a/d); for(j=0;j<=c.E;j++){ var dn2=c.b+(j+1)*d+1<=0; c.done.push(dn2); c.phi.push(dn2?1:Math.max(0.1,Math.min(0.95,(1-(c.a+j*d))/(d+c.len)))); } } });
    var maxE=coh.reduce(function(x,c){ return Math.max(x,c.E); },0);
    /* columns: one per period, or the custom brackets */
    var B=Rt.method==='custom'?(Rt.brackets||RET_BR).filter(function(b){ return b[0]<=maxE; }):null;
    out.buckets=B?B.map(function(b){ return { a:b[0], b:b[1], lab:retBrLab(iv,b) }; }):[];
    if(!B) for(k=0;k<=Math.min(H,maxE);k++) out.buckets.push({ a:k, b:k, lab:retColLab(iv,k) });
    out.cols=out.buckets.length;
    /* behaviour model: a loyal share returns most periods, the casual rest fades fast; rarer return events bring fewer back */
    var act=getEv('_any_active').w||1, wS=(getEv(es.id)||{ w:1 }).w||1;
    var commit=es.id==='_new_user'?0.8:1+0.6*(1-Math.min(1, Math.pow(wS/act, 0.25)));   /* a rarer starting event (a purchase) gathers more committed people; brand-new users fewer */
    var QL={ day:0.42, week:0.8, month:0.92 }[iv];
    var QC=function(x){ return iv==='day'?0.12*Math.exp(-(x-1)/2.5)+0.008:iv==='week'?0.2*Math.exp(-(x-1)/1.5)+0.01:0.26*Math.exp(-(x-1)/1.2)+0.015; };
    var segs=norm(st).segments, Gp=st.groupSeg&&segs.length===1?RB.PROPS[st.groupSeg]:null, rets=retReturns(st), multiR=rets.length>1;
    /* who: each segment, or (one segment, broken down) its top five property values */
    var who=[]; segs.forEach(function(sg, si){
      if(Gp){ segValues(sg, st.groupSeg).slice(0,5).forEach(function(v,vi){ who.push({ sg:sg, si:si*10+vi, gsi:si, name:(isDefaultSeg(sg)?'':segLabel(sg)+' · ')+T(v[0],v[1]), share:v[2], tilt:0.8+0.4*jitter(st.groupSeg+v[1],vi), gseed:v[1], gval:v[1] }); }); }
      else who.push({ sg:sg, si:si, name:segLabel(sg), share:1, tilt:1, gseed:'' }); });
    rets.forEach(function(er, ri){
      var wR=(getEv(er.id)||{ w:1 }).w||1, pair=es.id+'>'+er.id;
      var self=!(er.filters||[]).length && (er.id===es.id || er.id==='_any' || (er.id==='_any_active' && SYSTEM_EV.indexOf(es.id)<0));
      var f=Math.max(0.04, Math.min(1, Math.pow(wR/act, 0.35)));
      (er.filters||[]).forEach(function(x){ f*=Math.pow(RB.oneFilterFactor(x), 0.7); });
      var Lb=(0.1+0.1*jitter(pair,1))*commit, q0=self?1:Math.min(0.9, f*(0.22+0.25*jitter(pair,2)));   /* period 0: 100% only when the starting event itself counts as a return */
      if(ri===0) out.self=self;
      who.forEach(function(w, wi){
        var uni=baseSeries(es,true), pu=RB.periodUniques(uni), sf=segFactor(w.sg,es,pu), tot=Math.round(pu*(sf?sf.share:1)*w.share);
        var tl=(sf?Math.pow(sf.tilt,3):1)*Math.pow(w.tilt,3), L=Math.min(0.6, Lb*tl), seed=pair+(sf?sf.seed:'')+w.gseed;   /* segments differ in how many loyal users they hold */
        var wt=coh.map(function(c,ci){ return c.len*(0.85+0.3*jitter(es.id+(sf?sf.seed:'')+w.gseed+'sz',ci)); }), wsum=wt.reduce(function(x,y){ return x+y; },0)||1;
        var rows=coh.map(function(c, ci){
          var size=Math.round(tot*wt[ci]/wsum), nz=0.9+0.2*jitter(seed+'c',ci), qL=[], qC=[], cells=[];
          for(j=0;j<=c.E;j++){ var cf=cal&&j>0?1.06:1;   /* calendar: "next day" can come sooner than 24 hours */
            qL.push(j===0?q0:Math.min(0.97,QL*f*nz*cf)*c.phi[j]); qC.push(j===0?q0:Math.min(0.9,QC(j)*f*nz*Math.sqrt(tl)*cf)*c.phi[j]); }
          var ever=function(lo, hi){ var mL=1, mC=1; for(var x=lo;x<=Math.min(hi,c.E);x++){ mL*=1-qL[x]; mC*=1-qC[x]; } return L*(1-mL)+(1-L)*(1-mC); };
          out.buckets.forEach(function(bk){
            if(bk.a>c.E) return;
            var inc=bk.b>c.E||!c.done[bk.b], p;
            if(bk.a===0&&self) p=1;
            else if(Rt.method==='on') p=L*qL[bk.a]+(1-L)*qC[bk.a];
            else if(Rt.method==='custom') p=ever(bk.a, bk.b);
            else p=ever(bk.a, c.E);
            var n=Math.round(size*p); cells.push({ n:n, p:size?n/size*100:0, inc:inc });
          });
          return { ci:ci, label:retDate(c.date, iv, cal), part:c.part, size:size, cells:cells };
        });
        var ov=out.buckets.map(function(bk,k2){ var nn=0, dd=0; rows.forEach(function(r){ var c=r.cells[k2]; if(c&&!c.inc){ nn+=c.n; dd+=r.size; } }); return dd?{ n:nn, d:dd, p:nn/dd*100 }:null; });
        var users=rows.reduce(function(x,r){ return x+(r.cells[0]&&!r.cells[0].inc?r.size:0); },0);
        out.segs.push({ si:w.si, gsi:w.gsi, gval:w.gval, ri:ri, key:'S'+w.si+'R'+ri, ci:wi, name:w.name+(multiR?' · '+evName(er.id):''), users:users, rows:rows, ov:ov });
      });
    });
    out.thin=!out.segs.some(function(s){ return s.ov[1]; });   /* no cohort has finished the second column yet */
    out.cohorts=coh.map(function(c){ return retDate(c.date, iv, cal); });
    if(st.ret.ltvOn) ltvShape(out);
    return out;
  });
}
/* N-day LTV (Amplitude Retention ▸ Measured as ▸ N-Day LTV): revenue per user of each cohort, cumulative up to the end of each period
   ("return on or before"). Revenue = the purchase event's order amount; only projects that send purchases with an amount. */
function ltvOk(){ var e=RB.evById('purchase'); return !!(e&&e.w>0); }
function ltvState(st){ var s=clone(st); s.events=[st.events[0], { id:'purchase', filters:[], groupBy:'' }]; s.ret=Object.assign({}, st.ret, { method:'on', ltvOn:true }); return s; }
function ltvShape(out){ var aov=(RB.SUM_AVG&&RB.SUM_AVG.order_value)||533, opb=1.12;   /* thousand toman per order; a buyer places 1.12 orders a period on average */
  out.ltv=true;
  out.segs.forEach(function(s){
    s.rows.forEach(function(r){ var cum=0; r.cells.forEach(function(c){ cum+=c.n*opb*aov; c.p=r.size?cum/r.size:0; }); });
    s.ov=out.buckets.map(function(bk,k){ var rev=0, dd=0, nb=0; s.rows.forEach(function(r){ var c=r.cells[k]; if(c&&!c.inc){ rev+=c.p*r.size; dd+=r.size; nb+=c.n; } }); return dd?{ n:nb, d:dd, p:rev/dd }:null; }); });
}
function ltvTxt(v){ if(v==null||isNaN(v)) return '—'; return v>=1000?T(num(v/1000,1)+' میلیون '+curU()[0], num(v/1000,1)+'M '+curU()[1]):T(num(Math.round(v))+' هزار '+curU()[0], num(Math.round(v))+'K '+curU()[1])/* PM 2026-10-28, TD-9 */; }
function rFmt(res, v){ return res&&res.ltv?ltvTxt(v):pctTxt(v); }
/* Usage interval: the distribution of each user's median gap between repeats of the return event (last 15 days, ≥2 active days) */
function uCompute(st, R, out){
  var act=getEv('_any_active').w||1, segs=norm(st).segments, rets=retReturns(st), multiR=rets.length>1, es=st.events[0];
  out.usage=true; out.iv='day'; out.ushown=st.ret.ushown;
  out.buckets=[]; for(var x=1;x<=USE_X;x++) out.buckets.push({ a:x, b:x, lab:T('≤ '+num(x)+' روز','≤ '+x+' d') });
  out.cols=out.buckets.length;
  var days=Math.min(R.days, 30); out.days=[]; for(var di=days-1;di>=0;di--) out.days.push({ off:-di, lab:retDate(retDay(-di),'day',false) });
  rets.forEach(function(er, ri){
    var wR=(getEv(er.id)||{ w:1 }).w||1, ratio=act/wR;
    segs.forEach(function(sg, si){
      var uni=baseSeries(er,true), pu=RB.periodUniques(uni), sf=segFactor(sg,es,pu), tilt=sf?sf.tilt:1;
      var two=Math.max(0.08, Math.min(0.6, 0.6*Math.pow(1/ratio,0.3)))*Math.min(1.3,tilt);   /* share active on at least two days */
      var n=Math.round(pu*(sf?sf.share:1)*two), m=Math.max(1, Math.min(13, 1.3*Math.pow(ratio,0.45)*(0.85+0.3*jitter(er.id+si,1))/tilt)), sd=0.85;
      var cdf=function(v){ return 0.5*(1+erf((Math.log(v+0.5)-Math.log(m))/(sd*Math.SQRT2))); };
      var ov=out.buckets.map(function(bk){ var c=Math.round(n*cdf(bk.a)); return { n:c, d:n, p:n?c/n*100:0 }; });
      /* over time: of the people who did it on a day, the share who did it again within T days (still running if T days haven't passed) */
      var lines=USE_T.map(function(t){ return out.days.map(function(dd, k){ var p=cdf(t)*(0.92+0.16*jitter(er.id+si+'t'+t,k))*100; return { p:Math.min(99.5,p), inc:dd.off+t>0 }; }); });
      out.segs.push({ si:si, ri:ri, key:'S'+si+'R'+ri, ci:out.segs.length, name:segLabel(sg)+(multiR?' · '+evName(er.id):''), users:n, median:m, rows:[], ov:ov, lines:lines });
    });
  });
  return out;
}
/* drawn series: each segment's overall row, plus any cohort rows ticked in the table */
function retSel(res){
  var s=A.ret.sel, keys=retKeys(res);
  if(!s||!keys.some(function(k){ return s[k]; })){ s=A.ret.sel={}; res.segs.slice(0,MAX_RET_SEL).forEach(function(x){ s[x.key]=true; }); }
  res.segs.forEach(function(x){ if(s[x.key]===undefined) s[x.key]=Object.keys(s).filter(function(k){ return s[k]; }).length<MAX_RET_SEL; });   /* a newly added segment is drawn, as in Amplitude */
  return s;
}
function retKeys(res){ var k=[]; res.segs.forEach(function(s){ k.push(s.key); s.rows.forEach(function(r){ k.push(s.key+':'+r.ci); }); }); return k; }
function retDrawn(res){
  var sel=retSel(res), pal=palette(), out=[], n=res.segs.length;
  res.segs.forEach(function(s, i){
    if(sel[s.key]) out.push({ key:s.key, name:s.name, color:pal[i%12], p:s.ov.map(function(c){ return c?c.p:null; }), n:s.ov.map(function(c){ return c?c.n:null; }), d:s.ov.map(function(c){ return c?c.d:null; }), inc:[], seg:s });
    s.rows.forEach(function(r, ri){ var key=s.key+':'+r.ci; if(!sel[key]) return;
      out.push({ key:key, name:(n>1?s.name+' · ':'')+r.label, color:pal[(n+ri)%12], dash:true, p:r.cells.map(function(c){ return c.p; }), n:r.cells.map(function(c){ return c.n; }), d:r.cells.map(function(){ return r.size; }), inc:r.cells.map(function(c){ return c.inc; }), seg:s }); });
  });
  return out;
}
function retMs(res){ var ms=A.ret.ms; if(!ms||!ms.length) ms=A.ret.method==='custom'?res.buckets.map(function(b,k){ return k; }).filter(function(k){ return res.buckets[k].a>0; }).slice(0,3):RET_MS[res.iv].map(function(x){ var k=-1; res.buckets.forEach(function(b,kk){ if(b.a===x) k=kk; }); return k; }).filter(function(k){ return k>=0; });
  return ms.filter(function(k){ return k<res.cols; }); }
function retTile(q, ovr){
  var st=q.amp?norm(clone(q.amp)):retFromLegacy(q), r=rCompute(st, { range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) });
  if(r.empty||!r.segs.length) return null;
  var s=r.segs[0];
  if(r.usage){ var u=s.ov[6]; return { val:pctTxt(u.p), num:+u.p.toFixed(1), sub:T('فاصلهٔ استفاده ≤ ۷ روز · ','Usage interval ≤ 7 days · ')+T(r.R.fa,r.R.en), viz:spark(s.ov.map(function(c){ return c.p; })), rows:[1,3,7,14].map(function(x){ return [T('≤ '+num(x)+' روز','≤ '+x+' d'), pctTxt(s.ov[x-1].p)]; }), range:r.R }; }
  if(r.ltv){ var kl=0; s.ov.forEach(function(c,j){ if(c&&j<=7) kl=j; }); var vl=s.ov[kl];
    return { val:vl?ltvTxt(vl.p):'—', num:vl?Math.round(vl.p):null, sub:T('ارزش تا ','LTV by ')+r.buckets[kl].lab+' · '+T(r.R.fa,r.R.en), viz:spark(s.ov.filter(Boolean).map(function(c){ return c.p; })), rows:s.ov.slice(0,5).map(function(c,j){ return [r.buckets[j].lab, c?ltvTxt(c.p):'—']; }), range:r.R }; }
  var k=s.ov[1]?1:0, v=s.ov[k];
  /* Change over time: the same milestone across cohorts, so the tile says whether retention is improving (not a copy of the curve) */
  if(st.ret.shown==='time' && v){ var pts=s.rows.map(function(rw){ var c=rw.cells[k]; return c&&!c.inc?c.p:null; }).filter(function(x){ return x!=null; });
    if(pts.length>1){ var lastP=pts[pts.length-1], d=lastP-pts[0];
      return { val:pctTxt(lastP), num:+lastP.toFixed(1), sub:r.buckets[k].lab+T(' در طول زمان · ',' over time · ')+T('آخرین کوهورت کامل · ','last complete cohort · ')+T(r.R.fa,r.R.en),
        viz:spark(pts), rows:[[T('اولین کوهورت','First cohort'), pctTxt(pts[0])],[T('آخرین کوهورت کامل','Last complete cohort'), pctTxt(lastP)],[T('تغییر','Change'), (d>=0?'+':'')+num(d,1)+T(' واحد درصد',' pts')]], range:r.R }; } }
  /* too short a range: say so on the tile instead of falling back to another engine's numbers */
  if(!v) return { val:'—', num:null, sub:T('بازه برای ریتنشن '+RET_IV[r.iv].fa+' کوتاه است · '+r.R.fa,'Range too short for '+RET_IV[r.iv].en.toLowerCase()+' retention · '+r.R.en), viz:'', rows:[], range:r.R };
  return { val:pctTxt(v.p), num:+v.p.toFixed(1), sub:r.buckets[k].lab+' · '+T(RET_M[r.method][0],RET_M[r.method][1])+' · '+T(r.R.fa,r.R.en),
    viz:spark(s.ov.filter(Boolean).map(function(c){ return c.p; })), rows:s.ov.slice(0,5).map(function(c,j){ return [r.buckets[j].lab, c?pctTxt(c.p):'—']; }), range:r.R };
}
/* a report saved by the legacy retention pane (birth / return / weekly-daily / exactly-on) */
function retFromLegacy(q){
  var r=(q&&q.ret)||{}, ev=[{ id:r.birth||'page_view', filters:[], groupBy:'' }];
  if(r.ret) ev.push({ id:r.ret, filters:[], groupBy:'' });
  return norm({ events:ev, ret:Object.assign(blankRet(), { method:r.crit==='on'?'on':'after', iv:r.gran==='day'?'day':'week' }) });
}
var lastR=null;
function renderRet(){
  var res=lastR=rCompute(A, { range:RB.Q.range, filters:RB.Q.filters });
  if(projNoEvents()) res.empty=res.noEv=true;   /* PM 2026-10-31, outcome 1: B01 */
  root.classList.toggle('rtl', fa());
  root.innerHTML='<div class="rbz-grid'+(SET_OPEN?' with-set':'')+'"><aside class="rbz-panel">'+eventsModule()+measureModule()+segmentModule()+'</aside>'+
    '<section class="rbz-canvas">'+(res.empty?'<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-drslot"></span></div>'+(res.noEv?noEventsState():retEmpty()):
      retToolbar(res)+retNotes(res)+'<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div>'+retLegend(res)+(res.usage?useTable(res):retTable(res)))+'</section>'+(SET_OPEN?setPanel():'')+'</div>';
  placeFilter();
  wire();
  U.i18n();
  if(!res.empty) rDraw(res);
}
function retEmpty(){
  if(lastR&&lastR.noRev) return '<div class="sh-state rbz-empty">'+emptyArt('ret')+'<div class="sh-state-title">'+T('این پروژه درآمد ثبت نمی‌کند','This project records no revenue')+'</div>'+
    '<div class="sh-state-hint">'+T('ارزش N روزه از مبلغ سفارشِ ایونت خرید حساب می‌شود و این پروژه ایونت خرید نمی‌فرستد.','N-day LTV is computed from the purchase event’s order amount, and this project doesn’t send purchases.')+'</div>'+
    '<div class="rbz-emptyacts"><button class="rbz-linkbtn" data-rmeas="ret" type="button">'+ic('arrows-clockwise')+T('برگشت به نرخ بازگشت','Back to Retention')+'</button></div></div>';
  return '<div class="sh-state rbz-empty">'+emptyArt('ret')+'<div class="sh-state-title">'+T('چند نفر برمی‌گردند؟','How many people come back?')+'</div>'+
    '<div class="sh-state-hint">'+T('یک ایونت شروع انتخاب کنید. اگر ایونت بازگشت انتخاب نشود، هر ایونت فعالی «برگشتن» حساب می‌شود.','Pick a starting event. If you don’t pick a return event, any active event counts as coming back.')+'</div>'+
    '<div class="rbz-emptyacts"><button class="rbz-linkbtn" data-evadd="1" type="button">'+ic('plus')+T('افزودن ایونت شروع','Add starting event')+'</button>'+
    '<button class="rbz-linkbtn ghost" id="rbzRetQuick" type="button">'+ic('lightning')+T('کاربران جدید که برگشتند','New users who came back')+'</button></div></div>';
}
/* events module: the starting event, then up to two return events (Any active event when none is picked) */
function retEventsModule(){
  var P=retPair(A), live=liveBtn(), use=A.ret.meas==='usage';
  var sum=A.events.length?evName(P.s.id)+T(' ← ',' → ')+retReturns(A).map(function(e){ return evName(e.id); }).join(T(' / ',' / ')):T('هنوز ایونتی نیست','No events yet');
  var h='<div class="rbz-mod">'+modHead('ev','ایونت‌ها','Events',RTIPS.ev,sum,live);
  if(!OPEN.ev) return h+'</div>';
  var x=function(attr){ return '<button '+attr+' type="button" aria-label="'+T('حذف','Remove')+'">×</button>'; };
  function block(k, lb, tp, e, off){
    var imp=!!e.implicit, out='<div class="rbz-retlb'+(off?' off':'')+'">'+T(lb[0],lb[1])+'<span class="rbx-tipdot"'+tip(tp[0],tp[1])+'></span></div><div class="rbz-ev'+(off?' off':'')+'"><div class="rbz-evrow"><span class="rbz-let step">'+(k?'↺':'▶')+'</span>'+
      '<button class="rbz-evname" '+(imp?'data-retpick="1"':'data-evpick="'+k+'"')+' type="button"><span class="rbz-evic">'+evIcon(e.id)+'</span><span class="nm">'+esc(e.label||evName(e.id))+'</span>'+(imp?'<span class="rbz-tag">'+T('پیش‌فرض','Default')+'</span>':'<code>'+esc(e.id)+'</code>')+'<span class="rbz-car">⌄</span></button>'+
      (imp?'':'<button class="rbz-ico" data-evmore="'+k+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button>')+'</div>';
    (e.filters||[]).forEach(function(f,fi){ out+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span>'+x('data-fdel="'+k+':'+fi+'"')+'</div>'; });
    return out+'<div class="rbz-evacts"><button '+(imp?'data-retfadd="1"':'data-fadd="'+k+'"')+' type="button">+ '+T('فیلتر','Filter by')+'</button></div></div>';
  }
  if(!A.events.length) return h+'<button class="rbz-add big" data-evadd="1" type="button">'+ic('plus')+T('افزودن ایونت شروع','Add starting event')+'</button></div>';
  if(A.ret.meas==='ltv'){
    h+=block(0, ['ایونت شروع','Starting event'], RTIPS.start, P.s)+'<div class="rbz-retlb">'+T('ایونت درآمد','Revenue event')+'<span class="rbx-tipdot"'+tip(RTIPS.rev[0],RTIPS.rev[1])+'></span></div>'+
      '<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let step">'+ic('currency-circle-dollar')+'</span><span class="rbz-evname static"><span class="rbz-evic">'+evIcon('purchase')+'</span><span class="nm">'+esc(evName('purchase'))+'</span><code>order_value</code></span></div></div>';
    return h+'</div>';
  }
  h+=block(0, ['ایونت شروع','Starting event'], RTIPS.start, P.s, use)+block(1, ['ایونت بازگشت','Return event'], RTIPS.ret, P.r);
  if(A.events[2]) h+=block(2, ['ایونت بازگشت دوم','Second return event'], RTIPS.ret, A.events[2]);
  else if(A.events[1]) h+='<button class="rbz-add" data-ret2="1" type="button">'+ic('plus')+T('ایونت بازگشت دوم','Second return event')+'</button>';
  if(use) h+='<div class="rbz-hint">'+ic('info')+T('فاصلهٔ استفاده فقط ایونت‌های بازگشت را می‌سنجد؛ ایونت شروع در آن نقشی ندارد.','Usage interval measures the return events only; the starting event plays no part.')+'</div>';
  if(A.events.length>3) h+='<div class="rbz-hint">'+ic('info')+T('ریتنشن یک ایونت شروع و حداکثر دو ایونت بازگشت دارد؛ ایونت‌های بعدی برای نوع‌های دیگر نگه داشته می‌شوند.','Retention uses one starting event and up to two return events; the other events are kept for the other chart types.')+'</div>';
  return h+'</div>';
}
function retMeasureModule(){
  var use=A.ret.meas==='usage', ltv=A.ret.meas==='ltv', rev=ltvOk(), h='<div class="rbz-mod">'+modHead('meas','سنجش بر اساس','Measured as',RTIPS.meas,use?T('فاصلهٔ استفاده','Usage interval'):ltv?T('ارزش N روزه','N-day LTV'):T('نرخ بازگشت','Retention'));
  if(!OPEN.meas) return h+'</div>';
  return h+'<div class="rbz-seg2" role="tablist">'+[['ret','نرخ بازگشت','Retention'],['usage','فاصلهٔ استفاده','Usage interval'],['ltv','ارزش N روزه','N-day LTV']].map(function(m){ var on=A.ret.meas===m[0], off=m[0]==='ltv'&&!rev;
      return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-rmeas="'+m[0]+'"'+(off?' disabled title="'+esc(T('این پروژه ایونت خرید با مبلغ سفارش نمی‌فرستد.','This project doesn’t send a purchase event with an order amount.'))+'"':'')+'>'+T(m[1],m[2])+'</button>'; }).join('')+'</div>'+
    (ltv?'<div class="rbz-mdef">'+T('درآمد هر کاربرِ هر کوهورت، جمع‌شده تا پایان هر دوره؛ درآمد همان مبلغ سفارشِ ایونت خرید است و مخرج، اندازهٔ کوهورت.','Revenue per user of each cohort, added up to the end of each period; revenue is the purchase event’s order amount and the denominator is the cohort size.')+'</div></div>':   /* PM 2026-10-28, LX-6: no «نیازمند توسعه» */
    '<div class="rbz-mdef">'+(use?T('هر چند روز یک‌بار کاربران ایونت بازگشت را تکرار می‌کنند؛ فقط کسانی که در ۱۵ روز اخیر دست‌کم در دو روز متفاوت انجامش داده‌اند.','How many days users go between repeats of the return event; only users who did it on at least two different days in the last 15 days.'):
      T('درصد کاربران هر کوهورت که در هر دوره برگشته‌اند؛ مخرج هر ردیف اندازهٔ همان کوهورت است و ثابت می‌ماند.','The share of each cohort that came back in each period; each row’s denominator is that cohort’s size and stays fixed.'))+'</div></div>');
}
function retToolbar(res){
  var Rt=A.ret, iv=res.iv;
  if(res.usage) return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+
    '<button class="rbz-pill" id="rbzUseShown" type="button">'+T(Rt.ushown==='time'?'نمایش: فاصلهٔ استفاده در طول زمان':'نمایش: فاصلهٔ استفاده',Rt.ushown==='time'?'Shown as: Usage interval over time':'Shown as: Usage interval')+' ⌄</button><span class="rbx-tipdot"'+tip(RTIPS[Rt.ushown==='time'?'utime':'usage'][0],RTIPS[Rt.ushown==='time'?'utime':'usage'][1])+'></span>'+
    '<span class="rbz-pill static">'+ic('chart-line')+T('نمودار خطی','Line chart')+'</span><span class="rbz-drslot"></span></div>';
  var tm=Rt.shown==='time';
  return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+
    (res.ltv?'<span class="rbz-pill static">'+T('تجمعی تا پایان هر دوره','On or before each period')+'</span>':
    '<button class="rbz-pill" id="rbzRetM" type="button">'+T(RET_M[Rt.method][0],RET_M[Rt.method][1])+' ⌄</button><span class="rbx-tipdot"'+tip(RTIPS[Rt.method][0],RTIPS[Rt.method][1])+'></span>')+
    (!res.ltv&&Rt.method==='custom'?'<button class="rbz-pill ghost" id="rbzRetBr" type="button">'+ic('pencil-simple')+T(num(Rt.brackets.length)+' بازه',Rt.brackets.length+' brackets')+'</button>':'')+
    '<button class="rbz-pill" id="rbzRetShown" type="button">'+T(tm?'نمایش: تغییر در طول زمان':'نمایش: ریتنشن',tm?'Shown as: Change over time':'Shown as: Retention')+' ⌄</button>'+
    (tm?'<button class="rbz-pill" id="rbzRetMs" type="button">'+T('نقطه‌های عطف: ','Milestones: ')+retMs(res).map(function(k){ return res.buckets[k].lab; }).join(T('، ',', '))+' ⌄</button><span class="rbx-tipdot"'+tip(RTIPS.time[0],RTIPS.time[1])+'></span>':
      '<button class="rbz-pill" id="rbzRetViz" type="button">'+ic(Rt.viz==='bar'?'squares-four':'chart-line')+T(Rt.viz==='bar'?'نمودار ستونی':'نمودار خطی',Rt.viz==='bar'?'Bar chart':'Line chart')+' ⌄</button>')+
    '<button class="rbz-pill" id="rbzRetIv" type="button">'+T(RET_IV[iv].fa,RET_IV[iv].en)+' ⌄</button>'+
    '<button class="rbz-pill" id="rbzRetDay" type="button">'+ic('calendar-blank')+T(Rt.cal?'روز تقویمی (UTC)':'روز = ۲۴ ساعت از شروع',Rt.cal?'Calendar days (UTC)':'Day = 24 h from start')/* PM 2026-10-25, WS-3 */+' ⌄</button><span class="rbx-tipdot"'+tip(RTIPS.day[0],RTIPS.day[1])+'></span>'+
    '<span class="rbz-drslot"></span></div>';
}
function retNotes(res){
  var h='';
  if(res.ltv) h+='<div class="rbz-note">'+ic('info')+T('هر خانه درآمد هر کاربرِ کوهورت تا پایان همان دوره است، نه درآمد همان دوره؛ کوهورت‌های ناقص با * جدا شده‌اند و در ردیف کل نیستند.','Each cell is revenue per cohort user up to the end of that period, not that period’s revenue alone; incomplete cohorts carry * and stay out of the overall row.')+'</div>';
  if(res.ivForced) h+='<div class="rbz-note">'+ic('info')+T('ریتنشن روزانه برای بازه‌های بیش از ۹۰ روز در دسترس نیست؛ هفتگی نشان داده می‌شود.','Daily retention isn’t available for ranges over 90 days, so weekly is shown.')+'</div>';
  if(res.thin&&!res.usage){ var u=RET_IV[res.iv].u, nx=res.buckets[1]?res.buckets[1].lab:T(u[0]+' ۱',u[1]+' 1');
    h+='<div class="rbz-note">'+ic('info')+'<span>'+T('بازهٔ انتخابی برای ریتنشن '+RET_IV[res.iv].fa+' کوتاه است: هنوز هیچ کوهورتی «'+nx+'» را کامل نگذرانده است.','The range is too short for '+RET_IV[res.iv].en.toLowerCase()+' retention: no cohort has finished “'+nx+'” yet.')+'</span>'+
      '<button class="rbz-inlink" data-retrange="90d" type="button">'+T('۹۰ روز اخیر','Last 90 days')+'</button>'+(res.iv!=='day'?'<button class="rbz-inlink" data-retiv="day" type="button">'+T('روزانه','Daily')+'</button>':'')+'</div>'; }
  if(res.cal&&!res.usage&&res.iv!=='day') h+='<div class="rbz-note">'+ic('info')+T('در روز تقویمی، روز همان روز UTC است، از ۰۳:۳۰ تا ۰۳:۳۰ به وقت تهران. هفته از شنبه و ماه به تقویم شمسی حساب می‌شود؛ کوهورتی که از این نمودار ساخته شود ثابت است و به‌روز نمی‌شود.','In calendar mode, a day is the UTC day, 03:30 to 03:30 Tehran. Weeks start on Saturday and months follow the Solar Hijri calendar; a cohort created from this chart is static and won’t update.')/* PM 2026-10-25, WS-3 */+'</div>';
  return h;
}
function retLegend(res){
  if(!A.ui.legend) return '';
  return '<div class="rbz-rleg">'+retSeries(res).map(function(s){ return '<span><i style="'+(s.dash?'border-top-color:':'background:')+s.color+'"'+(s.dash?' class="dash"':'')+'></i>'+esc(s.name)+'</span>'; }).join('')+'</div>';
}
function retTable(res){
  var pal=palette(), sel=retSel(res);
  var cell=function(c){ if(!c) return '<td class="num muted">—</td>';
    var t=res.ltv?T(num(c.n)+' خریدار در این دوره از '+num(c.d)+' نفر',num(c.n)+' buyers in this period of '+num(c.d)+' users'):T(num(c.n)+' از '+num(c.d)+' نفر',num(c.n)+' of '+num(c.d)+' users');
    return '<td class="num'+(c.inc?' inc':'')+'" title="'+esc(t)+'">'+rFmt(res, c.p)+(c.inc?'<sup>*</sup>':'')+'</td>'; };
  var h='<div class="rbz-tablewrap"><div class="rbz-tablehead"><b>'+T('جدول داده','Data table')+'</b><span class="rbx-tipdot"'+tip(RTIPS.overall[0],RTIPS.overall[1])+'></span>'+(res.ltv?'<span class="rbz-tag">'+T('درآمد هر کاربر، تجمعی','Revenue per user, cumulative')+'</span>':'')+'<span class="rbx-spacer"></span>'+
    '<button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button></div><div class="sh-table-wrap"><table class="sh-table rbz-table rbz-rtable"><thead><tr><th class="ck"></th><th>'+T('گروه / تاریخ شروع','Segment / start date')+'</th>'+
    '<th class="num"'+tip(RTIPS.users[0],RTIPS.users[1])+'>'+T('کاربران','Users')+'</th>'+res.buckets.map(function(b){ return '<th class="num">'+b.lab+'</th>'; }).join('')+'</tr></thead><tbody>';
  res.segs.forEach(function(s, i){ var open=!!A.ret.open[s.ci];
    h+='<tr class="ov"><td class="ck"><input type="checkbox" data-rsel="'+s.key+'"'+(sel[s.key]?' checked':'')+' aria-label="'+T('رسم روی نمودار','Draw on chart')+'"/></td>'+
      '<td class="sname"><button class="rbz-rtog'+(open?' open':'')+'" data-rtog="'+s.ci+'" type="button" aria-expanded="'+open+'" aria-label="'+T('کوهورت‌ها بر اساس تاریخ','Cohorts by date')+'">'+ic('caret-down')+'</button><span class="rbz-sw" style="background:'+pal[i%12]+'"></span>'+esc(s.name)+'</td>'+
      '<td class="num strong">'+num(s.users)+'</td>'+s.ov.map(function(c){ return cell(c?{ n:c.n, d:c.d, p:c.p }:null); }).join('')+'</tr>';
    if(open) s.rows.forEach(function(r){ var key=s.key+':'+r.ci;
      h+='<tr class="sub"><td class="ck"><input type="checkbox" data-rsel="'+key+'"'+(sel[key]?' checked':'')+' aria-label="'+T('رسم روی نمودار','Draw on chart')+'"/></td><td class="sname">'+esc(r.label)+(r.part?' <span class="rbz-tag">'+T('ناقص','Partial')+'</span>':'')+'</td><td class="num">'+num(r.size)+'</td>'+
        res.buckets.map(function(b,j){ var c=r.cells[j]; return c?cell({ n:c.n, d:r.size, p:c.p, inc:c.inc }):'<td class="num"></td>'; }).join('')+'</tr>'; });
  });
  return h+'</tbody></table></div><div class="rbz-tnote"><sup>*</sup> '+T('دوره هنوز تمام نشده و عددش بالا می‌رود؛ در ردیف کل حساب نمی‌شود.','The period hasn’t ended and the number will still rise; it is left out of the overall row.')+'</div></div>';
}
function useTable(res){
  var pal=palette(), sel=retSel(res), tm=A.ret.ushown==='time', h='<div class="rbz-tablewrap"><div class="rbz-tablehead"><b>'+T('جدول داده','Data table')+'</b><span class="rbx-tipdot"'+tip(RTIPS.usage[0],RTIPS.usage[1])+'></span><span class="rbx-spacer"></span>'+
    '<button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button></div><div class="sh-table-wrap"><table class="sh-table rbz-table rbz-rtable"><thead><tr><th class="ck"></th><th>'+T(tm?'گروه / روز':'گروه','Segment'+(tm?' / day':''))+'</th>';
  if(!tm){
    h+='<th class="num">'+T('کاربران','Users')+'</th><th class="num">'+T('میانهٔ فاصله','Median gap')+'</th>'+res.buckets.map(function(b){ return '<th class="num">'+b.lab+'</th>'; }).join('')+'</tr></thead><tbody>';
    res.segs.forEach(function(s,i){ h+='<tr class="ov"><td class="ck"><input type="checkbox" data-rsel="'+s.key+'"'+(sel[s.key]?' checked':'')+'/></td><td class="sname"><span class="rbz-sw" style="background:'+pal[i%12]+'"></span>'+esc(s.name)+'</td><td class="num strong">'+num(s.users)+'</td><td class="num">'+T(num(s.median,1)+' روز',num(s.median,1)+' d')+'</td>'+
      s.ov.map(function(c){ return '<td class="num" title="'+esc(T(num(c.n)+' از '+num(c.d)+' نفر',num(c.n)+' of '+num(c.d)+' users'))+'">'+pctTxt(c.p)+'</td>'; }).join('')+'</tr>'; });
  } else {
    h+=USE_T.map(function(t){ return '<th class="num">'+T('دوباره ظرف '+num(t)+' روز','Again within '+t+' d')+'</th>'; }).join('')+'</tr></thead><tbody>';
    res.segs.forEach(function(s,i){ h+='<tr class="ov"><td class="ck"><input type="checkbox" data-rsel="'+s.key+'"'+(sel[s.key]?' checked':'')+'/></td><td class="sname" colspan="'+(USE_T.length+1)+'"><span class="rbz-sw" style="background:'+pal[i%12]+'"></span>'+esc(s.name)+'</td></tr>';
      res.days.slice().reverse().forEach(function(dd, rk){ var k=res.days.length-1-rk; h+='<tr class="sub"><td class="ck"></td><td class="sname">'+esc(dd.lab)+'</td>'+s.lines.map(function(L){ var c=L[k]; return '<td class="num'+(c.inc?' inc':'')+'">'+pctTxt(c.p)+(c.inc?'<sup>*</sup>':'')+'</td>'; }).join('')+'</tr>'; }); });
  }
  return h+'</tbody></table></div>'+(tm?'<div class="rbz-tnote"><sup>*</sup> '+T('هنوز آن تعداد روز نگذشته و عدد بالا می‌رود.','Not enough days have passed yet; the number will still rise.')+'</div>':'')+'</div>';
}
/* the chart's series for the current view (shared by the legend and the chart) */
function retSeries(res){
  var pal=palette();
  if(res.usage){ var sel=retSel(res), out=[];
    res.segs.forEach(function(s,i){ if(!sel[s.key]) return;
      if(A.ret.ushown==='time') USE_T.forEach(function(t,ti){ out.push({ key:s.key+'t'+t, name:(res.segs.length>1?s.name+' · ':'')+T('دوباره ظرف '+num(t)+' روز','again within '+t+' d'), color:pal[(i*3+ti)%12], p:s.lines[ti].map(function(c){ return c.p; }), inc:s.lines[ti].map(function(c){ return c.inc; }), n:[], d:[], seg:s, k:ti }); });
      else out.push({ key:s.key, name:s.name, color:pal[i%12], p:s.ov.map(function(c){ return c.p; }), n:s.ov.map(function(c){ return c.n; }), d:s.ov.map(function(c){ return c.d; }), inc:[], seg:s }); });
    return out; }
  if(A.ret.shown==='time'){ var sel2=retSel(res), ms=retMs(res), o2=[];
    res.segs.forEach(function(s,i){ if(!sel2[s.key]) return;
      ms.forEach(function(k,mi){ o2.push({ key:s.key+'m'+k, name:(res.segs.length>1?s.name+' · ':'')+res.buckets[k].lab, color:pal[(i*4+mi)%12], seg:s, k:k,
        p:s.rows.map(function(r){ return r.cells[k]?r.cells[k].p:null; }), n:s.rows.map(function(r){ return r.cells[k]?r.cells[k].n:null; }), d:s.rows.map(function(r){ return r.size; }), inc:s.rows.map(function(r){ return r.cells[k]?r.cells[k].inc:false; }) }); }); });
    return o2.slice(0,MAX_RET_SEL); }
  return retDrawn(res);
}
function rDraw(res){
  var el=$('rbzChart'); if(!el||!window.echarts) return;
  if(chart){ chart.dispose(); chart=null; }
  chart=echarts.init(el);
  var cs=getComputedStyle(document.body), TX=cs.getPropertyValue('--sh-text').trim(), MU=cs.getPropertyValue('--sh-muted').trim(), BD=cs.getPropertyValue('--sh-border').trim(), SF=cs.getPropertyValue('--sh-surface').trim(), FONT=cs.fontFamily;
  var u=A.ui, tm=!res.usage&&A.ret.shown==='time', utm=res.usage&&A.ret.ushown==='time', bar=!res.usage&&!tm&&A.ret.viz==='bar', D=retSeries(res), xs=[], cats, k;
  if(tm) { cats=res.cohorts; for(k=0;k<cats.length;k++) xs.push(k); }
  else if(utm){ cats=res.days.map(function(x){ return x.lab; }); for(k=0;k<cats.length;k++) xs.push(k); }
  else { if(bar){ var want=A.ret.method==='custom'?res.buckets.map(function(b,j){ return j; }):RET_BARS[res.iv].map(function(x){ var j=-1; res.buckets.forEach(function(b,bj){ if(b.a===x) j=bj; }); return j; });
      xs=want.filter(function(j){ return j>=0 && j<res.cols && D.some(function(s){ return s.p[j]!=null; }); }); } else for(k=0;k<res.cols;k++) xs.push(k);
    cats=xs.map(function(j){ return res.buckets[j].lab; }); }
  var yv=function(x){ var v=parseFloat(x); return isNaN(v)?null:(v<=1?v*100:v); };
  var dot=function(c){ return '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+c+';margin-inline-end:6px"></span>'; };
  var ser=D.map(function(s){ return { id:'r:'+s.key, name:s.name, type:bar?'bar':'line', barMaxWidth:28, connectNulls:false, symbol:'circle', symbolSize:6, smooth:false,
    itemStyle:{ color:s.color, borderRadius:bar?[3,3,0,0]:0 }, lineStyle:{ width:s.dash?1.5:2.5, type:s.dash?'dashed':'solid' },
    label:{ show:!!u.labels, position:'top', color:TX, fontFamily:FONT, fontSize:10, formatter:function(p){ return p.value==null?'':res.ltv?compact(p.value*1000):num(p.value,1)+T('٪','%'); } },
    data:xs.map(function(j){ var v=s.p[j]; if(v==null) return null; var o={ value:+v.toFixed(1) }; if(s.inc[j]) o.itemStyle=bar?{ color:alpha(s.color,0.45) }:{ color:SF, borderColor:s.color, borderWidth:2 }; return o; }) }; });
  if(tm && anomOk() && D.length){   /* anomaly band from complete cohorts only (a still-filling cohort reads low and isn't an anomaly) */
    var s0=D[0], idx=xs.filter(function(j){ return s0.p[j]!=null && !s0.inc[j]; });
    if(idx.length>3){ var an=anomaly(idx.map(function(j){ return s0.p[j]; }), A.ui.anom), at=function(arr,j){ var k=idx.indexOf(j); return k<0?null:+arr[k].toFixed(1); };
      ser.push({ name:'band-lo', type:'line', stack:'rband', data:xs.map(function(j){ return at(an.lo,j); }), symbol:'none', lineStyle:{ opacity:0 }, silent:true, tooltip:{ show:false } });
      ser.push({ name:'band-hi', type:'line', stack:'rband', data:xs.map(function(j){ var k=idx.indexOf(j); return k<0?null:+(an.hi[k]-an.lo[k]).toFixed(1); }), symbol:'none', lineStyle:{ opacity:0 }, areaStyle:{ color:s0.color, opacity:.13 }, silent:true, tooltip:{ show:false } });
      ser.push({ name:T('ناهنجاری','Anomaly'), type:'scatter', symbolSize:9, itemStyle:{ color:cs.getPropertyValue('--sh-bad').trim() }, data:xs.map(function(j){ var k=idx.indexOf(j); return k>-1&&an.flags[k]?+s0.p[j].toFixed(1):null; }), z:5, tooltip:{ show:false } }); } }
  /* forecast (Amplitude: forecast on Retention over time): from the last complete cohort, over the still-filling cohorts and N periods ahead */
  var fcN=tm&&anomOk()?fcPoints(res.iv):0, fcS=[];
  if(fcN&&D.length){ var nx=xs.length;
    for(var q=1;q<=fcN;q++){ cats.push(T('دورهٔ بعد +'+num(q),'Next +'+q)); xs.push(-q); }
    D.slice(0,3).forEach(function(s){ var idx2=xs.slice(0,nx).filter(function(j){ return s.p[j]!=null && !s.inc[j]; }); if(idx2.length<4) return;
      var lastK=xs.indexOf(idx2[idx2.length-1]), gap=nx-1-lastK, an2=anomaly(idx2.map(function(j){ return s.p[j]; }), Object.assign({}, A.ui.anom, { fc:gap+fcN }));
      var data=xs.map(function(j,k){ return k<lastK?null:k===lastK?+s.p[j].toFixed(1):+an2.fc[k-lastK-1].m.toFixed(1); });
      fcS.push({ id:'fc:'+s.key, name:s.name+' ('+T('پیش‌بینی','forecast')+')', type:'line', data:data, symbol:'none', lineStyle:{ width:2, type:[8,4], color:s.color }, itemStyle:{ color:s.color }, tooltip:{ show:false } }); });
    ser=ser.concat(fcS); }
  chart.setOption({ animationDuration:300,
    grid:{ left:fa()?28:8, right:fa()?8:28, top:20, bottom:8, containLabel:true },
    tooltip:{ trigger:'axis', axisPointer:{ type:bar?'shadow':'line' }, backgroundColor:SF, borderColor:BD, textStyle:{ color:TX, fontFamily:FONT, fontSize:12 }, confine:true, extraCssText:'direction:'+(fa()?'rtl':'ltr')+';text-align:start',
      formatter:function(ps){ var j=xs[ps[0].dataIndex]; return '<b>'+esc(cats[ps[0].dataIndex])+'</b><br>'+ps.filter(function(p){ return p.value!=null && p.seriesIndex<D.length; }).map(function(p){ var s=D[p.seriesIndex];
        if(j==null||j<0) return '';
        return dot(s.color)+esc(s.name)+' <b>'+rFmt(res, p.value)+(s.inc[j]?'*':'')+'</b>'+(s.n[j]!=null?' <span style="opacity:.7">'+(res.ltv?T(num(s.n[j])+' خریدار در این دوره',num(s.n[j])+' buyers this period'):T(num(s.n[j])+' از '+num(s.d[j])+' نفر',num(s.n[j])+' of '+num(s.d[j])+' users'))+'</span>':''); }).join('<br>')+
          (j<0?'<span style="opacity:.75">'+T('پیش‌بینی؛ هنوز اتفاق نیفتاده','Forecast; hasn’t happened yet')+'</span>':''); } },
    xAxis:{ type:'category', data:cats, inverse:fa(), boundaryGap:bar, axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true } },
    yAxis:{ type:'value', min:yv(u.ymin)!=null?yv(u.ymin):0, max:res.ltv?null:yv(u.ymax)!=null?yv(u.ymax):function(v){ return Math.min(100, Math.ceil(v.max/10)*10||10); }, position:fa()?'right':'left',
      name:u.ytitle||(res.ltv?T('درآمد هر کاربر (هزار '+curU()[0]+')','Revenue per user (K '+curU()[1]+')'):res.usage?T(utm?'دوباره انجام داده‌اند (٪)':'کاربران (تجمعی ٪)',utm?'Did it again (%)':'Users (cumulative %)'):T('درصد برگشته‌ها','Retained users (%)')), nameLocation:'middle', nameGap:44, nameRotate:fa()?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 },
      splitLine:{ lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return res.ltv?num(v):num(v)+T('٪','%'); } } },
    series:ser });
  el.style.filter='saturate(.72)';
  /* Microscope: the click bubbles to the document, which closes menus, so open it after */
  chart.on('click', function(p){ setTimeout(function(){ retMicroscope(p, res, D, xs, tm, utm); }, 0); });
}
/* cohorts Amplitude can only create as static lists (create-cohorts docs): several return events, usage interval, calendar weeks or months */
function retStatic(res){ return retReturns(A).length>1 || res.usage || (res.cal&&res.iv!=='day'); }
function retMicroscope(p, res, D, xs, tm, utm){
  var s=D[p.seriesIndex], j=xs[p.dataIndex]; if(!s||s.p[j]==null||utm) return;
  var n=s.n[j], dn=s.d[j]; if(n==null) return;
  var col=res.usage?res.buckets[j].lab:tm?res.buckets[s.k].lab+' · '+res.cohorts[j]:res.buckets[j].lab, box=$('rbzChart').parentNode, ev=A.events[0].id;
  if(res.usage) ev=retReturns(A)[s.seg.ri].id;
  if(DEF_EV[ev]) ev='page_view';
  box.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
  var a=document.createElement('span'); a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px';
  box.appendChild(a);
  var st=retStatic(res), rname=evName(retReturns(A)[s.seg.ri].id);
  var lb=res.usage?['فاصلهٔ استفادهٔ '+col+' · '+s.name, 'Usage interval '+col+' · '+s.name]:res.ltv?['خریداران در '+col+' · '+s.name, 'Buyers in '+col+' · '+s.name]:['برگشته در '+col+' · '+s.name, 'Retained in '+col+' · '+s.name], lbN=['برنگشته در '+col+' · '+s.name, 'Not retained in '+col+' · '+s.name];
  var def=res.usage?[ 'کسانی که «'+rname+'» را معمولاً حداکثر هر '+num(res.buckets[j].a)+' روز تکرار می‌کنند'+(st?' · ثابت':''), 'Users who repeat “'+rname+'” at least every '+res.buckets[j].a+' days'+(st?' · static':'') ]:
    [ 'شروع با «'+evName(A.events[0].id)+'» و بازگشت با «'+rname+'» در '+col+(st?' · ثابت':' · رفتاری'), 'Started with “'+evName(A.events[0].id)+'”, came back with “'+rname+'” in '+col+(st?' · static':' · behavioral') ];
  U.menu(a, [ { head:1, fa:lb[0]+' · '+num(n)+' از '+num(dn)+' نفر', en:lb[1]+' · '+num(n)+' of '+num(dn)+' users' },
    { icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb, n, s.key+j); } },
    !res.usage&&A.ret.viz==='bar'&&!tm?{ icon:'users', fa:'دیدن کسانی که برنگشتند ('+num(dn-n)+')', en:'View users who didn’t come back ('+num(dn-n)+')', fn:function(){ usersModal(lbN, dn-n, s.key+j+'n'); } }:null,
    { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), hint:st?['ثابت: عدد همین لحظه و به‌روز نمی‌شود','Static: today’s list, it won’t update']:['رفتاری: با داده‌های تازه به‌روز می‌شود','Behavioral: updates with new data'], fn:function(){ cohortModal(lb, n, ev, def.concat([st])); } },
    { icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb, n, s.key+j); } },
    { icon:'share-network', fa:'مسیر این کاربران', en:'Show user journeys', fn:function(){ openJourney(ev); } },
    { icon:'user-circle', fa:'جریان ایونت‌های کاربران', en:'View user streams', disabled:RB.Q.unit==='org', hint:RB.Q.unit==='org'?['جریان ایونت برای هر آدم است؛ در شمارش سازمان‌ها، «دیدن این سازمان‌ها» را بزنید.','Streams are per person; when counting organizations, use “View these organizations”.']:null, fn:function(){ streamsModal(lb, n, s.key+j, ev); } },
    res.usage?{ icon:'calendar-blank', fa:'ساخت بازه‌های بازگشت بر اساس '+num(res.buckets[j].a)+' روز', en:'Build return brackets from '+res.buckets[j].a+' days', fn:function(){ useBrackets(res.buckets[j].a); } }:null ].concat(msFilterItems(s.seg)).filter(Boolean), 'start');
}
/* usage interval → retention: brackets of the chosen length (Amplitude: "use it for custom brackets") */
function useBrackets(x){ var R=A.ret, b=[[0,0]]; for(var i=0;i<6;i++) b.push([1+i*x, (i+1)*x]); R.brackets=b; R.method='custom'; R.iv='day'; R.meas='ret'; R.shown='ret'; R.sel=null; R.ms=null; changed();
  U.toast('بازه‌های سفارشی هر '+num(x)+' روز ساخته شد','Custom brackets of '+x+' days created'); }
function bracketModal(){
  var R=A.ret, txt=R.brackets.map(function(b){ return b[0]===b[1]?String(b[0]):b[0]+'-'+b[1]; }).join(', ');
  function parse(v){ var out=[], err='', last=-1;
    String(v).split(/[,،\n]/).map(function(x){ return x.trim(); }).filter(Boolean).forEach(function(x){ if(err) return;
      var m=/^(\d+)\s*(?:[-–]\s*(\d+))?$/.exec(x.replace(/[۰-۹]/g,function(c){ return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }));
      if(!m){ err=T('«'+x+'» قابل خواندن نیست','Can’t read “'+x+'”'); return; }
      var a=+m[1], b=m[2]!=null?+m[2]:a;
      if(b<a){ err=T('در «'+x+'» پایان از شروع کوچک‌تر است','In “'+x+'” the end is before the start'); return; }
      if(a<=last){ err=T('بازه‌ها باید پشت سر هم و بدون هم‌پوشانی باشند','Brackets must be in order and must not overlap'); return; }
      last=b; out.push([a,b]); });
    if(!err&&!out.length) err=T('دست‌کم یک بازه بنویسید','Enter at least one bracket');
    if(!err&&out.length>MAX_BR) err=T('حداکثر ۱۰۰ بازه','Up to 100 brackets');
    return { b:out, err:err }; }
  var presets=[['روزهای ۰، ۱–۳، ۴–۶، ۷–۱۱','Days 0, 1–3, 4–6, 7–11','0, 1-3, 4-6, 7-11'],['هفته‌به‌هفته تا ۸ هفته','Weekly to 8 weeks','0, 1-7, 8-14, 15-21, 22-28, 29-35, 36-42, 43-49, 50-56'],['ماه‌به‌ماه تا ۶ ماه','Monthly to 6 months','0, 1-30, 31-60, 61-90, 91-120, 121-150, 151-180']];
  U.modal({ fa:'بازه‌های سفارشی بازگشت', en:'Custom return brackets', subFa:'هر بازه با کاما جدا شود؛ مثلاً 0, 1-3, 4-6. واحد، همان بازهٔ نمودار است ('+RET_IV[R.iv].fa+').', subEn:'Separate brackets with commas, e.g. 0, 1-3, 4-6. The unit is the chart’s interval ('+RET_IV[R.iv].en.toLowerCase()+').',
    body:'<div class="rbx-field"><label>'+T('بازه‌ها','Brackets')+'</label><textarea class="sh-input" id="rbzBrT" rows="3" dir="ltr">'+esc(txt)+'</textarea></div><div class="rbz-ferr" id="rbzBrE"></div>'+
      '<div class="rbx-field"><label>'+T('نمونه‌های آماده','Presets')+'</label><div class="rbz-brp">'+presets.map(function(p,i){ return '<button class="rbz-pill ghost" type="button" data-brp="'+i+'">'+T(p[0],p[1])+'</button>'; }).join('')+'</div></div>',
    init:function(bd){ bd.querySelectorAll('[data-brp]').forEach(function(b){ b.addEventListener('click', function(){ var p=presets[+b.getAttribute('data-brp')]; bd.querySelector('#rbzBrT').value=p[2]; if(p[2].indexOf('1-7')>-1||p[2].indexOf('1-30')>-1) R.iv='day'; }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var r=parse(bd.querySelector('#rbzBrT').value); if(r.err){ bd.querySelector('#rbzBrE').textContent=r.err; return false; }
      R.brackets=r.b; R.method='custom'; R.sel=null; R.ms=null; changed(); } }] });
}
function retCsv(){
  var r=lastR; if(!r||r.empty) return; var q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; };
  var lines=[[T('گروه / تاریخ شروع','Segment / start date'),T('کاربران','Users')].concat(r.buckets.map(function(b){ return b.lab; })).map(q).join(',')];
  r.segs.forEach(function(s){ lines.push([s.name, s.users].concat(s.ov.map(function(c){ return c?c.p.toFixed(1):''; })).map(q).join(','));
    s.rows.forEach(function(row){ lines.push([s.name+' · '+row.label, row.size].concat(r.buckets.map(function(b,j){ var c=row.cells[j]; return c?c.p.toFixed(1)+(c.inc?'*':''):''; })).map(q).join(',')); }); });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download=r.usage?'usage-interval.csv':'retention.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  U.toast('فایل CSV دانلود شد','CSV downloaded');
}
function wireRet(){
  if(!isRet()) return;
  var Rt=A.ret, R=RB.rangeInfo();
  root.querySelectorAll('[data-rmeas]').forEach(function(b){ b.addEventListener('click', function(){ Rt.meas=b.getAttribute('data-rmeas'); Rt.sel=null; changed(); }); });
  var us=$('rbzUseShown'); if(us) us.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(us, [['dist','فاصلهٔ استفاده','Usage interval'],['time','فاصلهٔ استفاده در طول زمان','Usage interval over time']].map(function(x){ var on=Rt.ushown===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ Rt.ushown=x[0]; changed(); } }; }), 'start'); });
  var m=$('rbzRetM'); if(m) m.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(m, Object.keys(RET_M).map(function(x){ var on=Rt.method===x; return { fa:RET_M[x][0]+(on?' ✓':''), en:RET_M[x][1]+(on?' ✓':''), fn:function(){ if(x==='custom'){ bracketModal(); return; } Rt.method=x; Rt.ms=null; changed(); } }; }), 'start'); });
  var br=$('rbzRetBr'); if(br) br.addEventListener('click', bracketModal);
  var sh=$('rbzRetShown'); if(sh) sh.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(sh, [['ret','ریتنشن','Retention'],['time','تغییر در طول زمان','Change over time']].map(function(x){ var on=Rt.shown===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ Rt.shown=x[0]; changed(); } }; }), 'start'); });
  var ms=$('rbzRetMs'); if(ms) ms.addEventListener('click', function(e){ e.stopPropagation(); var cur=retMs(lastR);
    U.menu(ms, lastR.buckets.map(function(b,k){ var on=cur.indexOf(k)>-1; return { fa:b.lab+(on?' ✓':''), en:b.lab+(on?' ✓':''), disabled:!on&&cur.length>=4, hint:!on&&cur.length>=4?['حداکثر ۴ نقطهٔ عطف','Up to 4 milestones']:null,
      fn:function(){ var nx=on?cur.filter(function(x){ return x!==k; }):cur.concat([k]).sort(function(p,q){ return p-q; }); if(!nx.length) return; Rt.ms=nx; changed(); } }; }), 'start'); });
  var vz=$('rbzRetViz'); if(vz) vz.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(vz, [['line','نمودار خطی','Line chart','chart-line'],['bar','نمودار ستونی','Bar chart','squares-four']].map(function(v){ var on=Rt.viz===v[0];
      return { icon:v[3], fa:v[1]+(on?' ✓':''), en:v[2]+(on?' ✓':''), fn:function(){ Rt.viz=v[0]; changed(); } }; }), 'start'); });
  var iv=$('rbzRetIv'); if(iv) iv.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(iv, Object.keys(RET_IV).map(function(x){ var on=lastR&&lastR.iv===x, no=x==='day'&&R.days>91;
      return { fa:RET_IV[x].fa+(on?' ✓':''), en:RET_IV[x].en+(on?' ✓':''), disabled:no, hint:no?['برای بازه‌های بیش از ۹۰ روز در دسترس نیست','Not available for ranges over 90 days']:null, fn:function(){ Rt.iv=x; Rt.sel=null; Rt.ms=null; changed(); } }; }), 'start'); });
  var dy=$('rbzRetDay'); if(dy) dy.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(dy, [[false,'روز = ۲۴ ساعت از شروع','24 hours from start'],[true,'روز تقویمی (UTC، هفته از شنبه)','Calendar days (UTC, week from Saturday)']/* PM 2026-10-25, WS-3 */].map(function(x){ var on=!!Rt.cal===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ Rt.cal=x[0]; Rt.sel=null; changed(); } }; }), 'start'); });
  root.querySelectorAll('[data-rsel]').forEach(function(c){ c.addEventListener('change', function(){ var key=c.getAttribute('data-rsel'), sel=retSel(lastR);
    var count=Object.keys(sel).filter(function(x){ return sel[x]; }).length;
    if(c.checked&&count>=MAX_RET_SEL){ c.checked=false; U.toast('حداکثر '+num(MAX_RET_SEL)+' سری هم‌زمان رسم می‌شود','Up to '+MAX_RET_SEL+' series are drawn at once'); return; }
    if(!c.checked&&count<=1){ c.checked=true; return; }
    sel[key]=c.checked; changed(); }); });
  root.querySelectorAll('[data-rtog]').forEach(function(b){ b.addEventListener('click', function(){ var i=b.getAttribute('data-rtog'); Rt.open[i]=!Rt.open[i]; render(); }); });
  var rp=root.querySelector('[data-retpick]'); if(rp) rp.addEventListener('click', function(){ eventPicker(function(id){ A.events[1]={ id:id, filters:[], groupBy:'' }; changed(); }); });
  var r2=root.querySelector('[data-ret2]'); if(r2) r2.addEventListener('click', function(){ eventPicker(function(id){ A.events.splice(2,0,{ id:id, filters:[], groupBy:'' }); Rt.sel=null; changed(); }); });
  var rf=root.querySelector('[data-retfadd]'); if(rf) rf.addEventListener('click', function(){ A.events[1]={ id:'_any_active', filters:[], groupBy:'' }; filterPicker(1); });
  var qk=$('rbzRetQuick'); if(qk) qk.addEventListener('click', function(){ A.events=[{ id:'_new_user', filters:[], groupBy:'' }]; OPEN.ev=true; changed(); });
  root.querySelectorAll('[data-retiv]').forEach(function(b){ b.addEventListener('click', function(){ Rt.iv=b.getAttribute('data-retiv'); Rt.sel=null; changed(); }); });
  root.querySelectorAll('[data-retrange]').forEach(function(b){ b.addEventListener('click', function(){ var r=document.querySelector('input[name="drRange"][value="'+b.getAttribute('data-retrange')+'"]');
    if(r){ r.checked=true; r.dispatchEvent(new Event('change', { bubbles:true })); } else { RB.Q.range=b.getAttribute('data-retrange'); RB.renderActive(); } }); });
  var csv=$('rbzCsv'); if(csv){ var c2=csv.cloneNode(true); csv.parentNode.replaceChild(c2,csv); c2.addEventListener('click', retCsv); }
}
/* ═════════ Journeys (phase 2, step 5a): Amplitude Journeys — Pathfinder + Journey Map ═════════
   Spec: research-notes/…/19-amplitude-journeys-spec.md. PM decisions 2026-10-13: the «مسیرها» tab is the event-anchored
   explorer (the «سفر کاربر» page stays a fixed page-flow dashboard); it counts users or event totals with a "within one
   session" window (not sessions); in Persian the paths run right to left.
   Rules (spec §16b): Pathfinder is a prefix TREE — a node is "users who followed exactly this prefix", never merged per
   level; every % is of all users in the analysis; at every node shown children + «سایر ایونت‌ها» + «ریزش» + «ایونت دیگری
   انجام نداد» = the node, so every level reconciles to 100%; hidden/inactive events are removed before paths are built;
   collapse-repeated uses Mixpanel's consecutive rule (Amplitude doesn't define one). */
var J_TYPES={ start:['شروع با','Starting with'], end:['پایان با','Ending with'], between:['بین دو ایونت','Between two events'] };
var J_INACTIVE=['video_heartbeat','video_progress','session_start','experiment_viewed'];   /* inactive or noisy: hidden by default, as Amplitude hides inactive events */
var J_MAXSTEP=9, J_STEPS=3, J_TOPN=5;
/* affinities for a news/media site: what tends to follow what (anything else falls back to volume) */
var J_AFF={
  page_view:{ page_view:2.2, scroll_depth_reached:1.4, video_started:1.2, search_submitted:1.1, share:0.9, recommendation_clicked:0.8, subscription_started:0.25 },
  scroll_depth_reached:{ page_view:2, share:1.2, video_started:0.9, recommendation_clicked:0.8 },
  video_started:{ video_paused:1.6, video_completed:1.5, ads_video_started:1.3, video_fullscreen_toggled:1, page_view:0.9, recommendation_clicked:0.7, video_seeked:0.8 },
  video_completed:{ recommendation_clicked:1.8, video_next_autoplayed:1.1, page_view:1.2, share:0.9, subscription_started:0.4 },
  video_paused:{ video_resumed:2.2, page_view:0.8, video_seeked:0.7 },
  search_submitted:{ page_view:2.4, search_no_results:0.8, search_submitted:0.9 },
  search_no_results:{ search_submitted:2, page_view:1.2 },
  recommendation_clicked:{ video_started:2.4, page_view:1 },
  ads_video_started:{ ads_video_completed:2, ads_video_skipped:0.8, video_started:0.9 }
};
var JTIPS={
  branch:["<span class='tip-title'>جزئیات شاخه</span>کسانی که در این مسیر از قدم قبل به این قدم رسیدند: چند نفرند، چه سهمی از قدم قبل و از همه دارند، چقدر طول کشید و بعدش بیشتر به کجا رفتند.","<span class='tip-title'>Branch detail</span>The people who reached this step from the one before on this path: how many, their share of the step before and of everyone, how long it took and where most went next."],
  paths:["<span class='tip-title'>مسیرها</span>ایونتی که مسیرها از آن شروع می‌شوند، به آن ختم می‌شوند، یا دو ایونتی که مسیر بینشان سنجیده می‌شود.","<span class='tip-title'>Paths</span>The event paths start with, end with, or the two events the path between is measured."],
  pfilter:["<span class='tip-title'>فیلتر مسیرها و باز کردن بر اساس ویژگی</span>«فیلتر»: فقط مسیرهایی که این ایونت را دارند می‌مانند. «حذف»: این ایونت از مسیرها برداشته می‌شود. «باز کردن»: هر مقدار ویژگی این ایونت یک گره جدا می‌شود، مثلاً بازدید صفحه به تفکیک مسیر صفحه.","<span class='tip-title'>Filter by paths, expand by property</span>Filter: only paths containing this event remain. Exclude: the event is taken out of the paths. Expand: each property value of the event becomes its own node, e.g. page views by page path."],
  meas:["<span class='tip-title'>سنجش بر اساس</span>کاربران: هر کاربر یک بار و با اولین مسیرش شمرده می‌شود. نشست‌ها: هر نشستی که با ایونت شروع گذشته، یک بار — همان شمارش صفحهٔ «سفر کاربر». تعداد دفعات: هر بار که مسیر طی شده. "+RB.USER_DEF[0],"<span class='tip-title'>Measured as</span>Users: each user counts once, on their earliest path. Sessions: each session that went through the start event, once — the count the «سفر کاربر» page uses. Event totals: every time the path was taken. "+RB.USER_DEF[1]],
  win:["<span class='tip-title'>پنجرهٔ تبدیل</span>«در یک نشست»: فقط مسیرهایی که در همان نشست کامل شده‌اند، هر قدر هم طول کشیده باشند. «ظرف N دقیقه، ساعت یا روز»: مسیرهایی که در این مدت کامل شده‌اند، در هر تعداد نشست.","<span class='tip-title'>Conversion window</span>Within one session: only paths completed in the same session, however long it took. Within N minutes, hours or days: paths completed in that time, across any number of sessions."],
  node:["<span class='tip-title'>درصد هر گره</span>درصد از همهٔ کاربرانِ تحلیل، نه از قدم قبل؛ هر گره فقط کسانی است که دقیقاً همین مسیر را آمده‌اند.","<span class='tip-title'>Each node’s %</span>Of all users in the analysis, not of the previous step; each node is only the users who came exactly this way."],
  map:["<span class='tip-title'>نقشهٔ مسیرها</span>هر ردیف یک مسیر کامل از ایونت مبنا تا پایانش، با تعداد کاربران و میانگین زمان رسیدن به انتهای مسیر.","<span class='tip-title'>Journey map</span>Each row is a whole path from the anchor to its end, with its users and the average time to reach the end of the path."]
};
/* literals on purpose: blank() runs at load, before the constants above are assigned */
function blankJourney(){ return { type:'start', count:'uniques', win:{ mode:'session', n:1 }, view:'path', filter:[], exclude:[], expand:[], hide:['video_heartbeat','video_progress','session_start','experiment_viewed'], collapse:true, steps:3, more:{}, topN:5, mapTab:'conv', sort:'freq', only:[], custom:false, mode:'ev', prop:'page_path', pval:'', gb:'' }; }
function jReal(id){ return RB.evById(id)?id:'page_view'; }
/* Block A: the conversion window in minutes, hours or days (Amplitude Journeys: clock time, minutes to days; plan 5a) */
var JW_U={ min:['دقیقه','minutes',1/1440], hour:['ساعت','hours',1/24], day:['روز','days',1] };
function jWinDays(w){ return w&&w.mode==='time'?Math.max(1/1440,(+w.n||1)*JW_U[w.u||'day'][2]):0; }
function jWinTxt(w){ var u=JW_U[w.u||'day']; return T('ظرف '+num(w.n)+' '+u[0],'within '+w.n+' '+u[1]); }
function isJourney(){ return RB.Q.type==='flows'; }
function jKeyEv(k){ return String(k).split('|')[0]; }
function jLabel(k){ if(String(k).charAt(0)==='§'){ var P0=RB.PROPS[A.journey.prop], v0=P0&&P0.vals.filter(function(x){ return x[1]===String(k).slice(1); })[0]; return (P0?T(P0.fa,P0.en)+': ':'')+(v0?T(v0[0],v0[1]):String(k).slice(1)); }
  var p=String(k).split('|'), e=getEv(p[0]), nm=e?T(e.fa,e.en):p[0]; if(p.length<2) return nm;
  if(p[1].indexOf('gb:')===0){ var G=RB.PROPS[A.journey.gb], gv=G&&G.vals.filter(function(x){ return x[1]===p[1].slice(3); })[0]; return nm+' · '+(gv?T(gv[0],gv[1]):p[1].slice(3)); } var ex=(A.journey.expand||[]).filter(function(x){ return x.ev===p[0]; })[0], P=ex&&RB.PROPS[ex.prop], v=P&&P.vals.filter(function(x){ return x[1]===p[1]; })[0]; return nm+' · '+(v?T(v[0],v[1]):p[1]); }
/* the next-event candidates after (or, for "ending with", before) an event, after hiding, excluding, collapsing and expanding */
function jCands(st, from, dir){
  var J=st.journey, hid={}, base=jKeyEv(from), out=[];
  /* Any Event + property (Amplitude): nodes are values of one property instead of events */
  if(J.mode==='prop'){ var P=RB.PROPS[J.prop]; if(!P) return out; var cur=String(from).slice(1);
    P.vals.forEach(function(v,i){ if(J.collapse&&v[1]===cur) return; if((J.exclude||[]).some(function(x){ return x.ev==='§'+v[1]; })) return; var w=v[2]*(0.6+0.8*jitter(cur+(dir||'')+'>'+v[1],1)); out.push(['§'+v[1], w]); });
    return out.sort(function(x,y){ return y[1]-x[1]; }); }
  var only=(J.only||[]).length?J.only:null, comps={};
  /* show combined events: a combined event replaces its parts as an intermediate node (Mixpanel's documented rule; Amplitude doesn't state one) */
  if(J.custom) (RB.VIRTUALS||[]).forEach(function(v){ (v.comps||[]).forEach(function(c){ comps[c]=v.id; }); });
  (J.hide||[]).forEach(function(h){ hid[h]=1; });
  (J.exclude||[]).forEach(function(x){ hid[x.val?x.ev+'|'+x.val:x.ev]=1; });
  if(J.drop&&J.drop.next) hid[J.drop.next]=1;   /* drop-offs never did the next step */
  /* deleted events and events hidden from Journeys in the lexicon are never path nodes (gap audit 49a B5) */
  var pool=RB.EVENTS.filter(function(e){ return !e.late&&!comps[e.id]&&!e.deleted&&!e.noPath; }).concat(J.custom?(RB.VIRTUALS||[]).map(function(v){ return getEv(v.id); }).filter(Boolean):[]);
  pool.forEach(function(e){ if(hid[e.id]) return; if(only&&only.indexOf(e.id)<0) return;
    if(J.collapse && e.id===base && !(J.expand||[]).some(function(x){ return x.ev===base; })) return;   /* consecutive repeats become one step */
    var a=dir==='back'?((J_AFF[e.id]||{})[base]||0):((J_AFF[base]||{})[e.id]||0), ge=getEv(base), same=ge&&ge.grp===e.grp;
    var w=Math.sqrt(e.w)*(a?a*3:(same?0.25:0.04))*(0.7+0.6*jitter(base+(dir||'')+'>'+e.id,1));
    var ex=(J.expand||[]).filter(function(x){ return x.ev===e.id; })[0], P=ex&&RB.PROPS[ex.prop];
    if(P) P.vals.forEach(function(v){ if(!hid[e.id+'|'+v[1]]) out.push([e.id+'|'+v[1], w*v[2]]); }); else out.push([e.id, w]); });
  return out.sort(function(x,y){ return y[1]-x[1]; });
}
/* split n into integer parts by weight (largest remainder: the parts always add up to n) */
function jAlloc(n, ws){ var t=ws.reduce(function(a,b){ return a+b; },0)||1, raw=ws.map(function(w){ return n*w/t; }), fl=raw.map(Math.floor), left=n-fl.reduce(function(a,b){ return a+b; },0);
  raw.map(function(r,i){ return [r-fl[i],i]; }).sort(function(a,b){ return b[0]-a[0]; }).slice(0,left).forEach(function(x){ fl[x[1]]++; }); return fl; }
function jLimit(st, node){ var J=st.journey, lim=J.steps||J_STEPS, p=node; while(p){ lim=Math.max(lim, (J.steps||J_STEPS)+((J.more||{})[p.id]||0)); p=p.parent; } return Math.min(J_MAXSTEP, lim); }
function jCompute(st, ctx){
  return within(ctx, function(){
    var R=RB.rangeInfo(), J=st.journey, out={ R:R, empty:J.mode==='prop'?!(RB.PROPS[J.prop]&&J.pval):(!st.events.length||!getEv(st.events[0].id)||(J.type==='between'&&(!st.events[1]||!getEv(st.events[1].id)))) };
    if(out.empty) return out;
    var e0=J.mode==='prop'?{ id:'_any', filters:[{ prop:J.prop, op:'in', vals:[J.pval] }] }:st.events[0], end=J.type==='between'?(J.mode==='prop'?null:st.events[1].id):null, dir=J.type==='end'?'back':'fwd', sg=norm(st).segments[0];
    var uni=baseSeries(e0,true), tot=baseSeries(e0,false), sf=segFactor(sg, e0, RB.periodUniques(uni));
    /* phase 4b: «Sessions» counts the sessions that contain the start event (the user-journey dashboard counts sessions; Amplitude's
       Journeys count users, so this goes one step beyond it): every session has a page view; any other event lives in a share of them */
    var sesN=function(){ var S=RB.sum(baseSeries({ id:'session_start', filters:e0.filters||[] }, false)), Tt=RB.sum(tot); return e0.id==='page_view'||e0.id==='_any'?S:Math.max(1, Math.min(S*0.85, Tt*0.5)); };
    var N=Math.round((J.count==='totals'?RB.sum(tot):J.count==='sessions'?sesN():RB.periodUniques(uni))*(sf?sf.share:1));
    var sess=(J.win||{}).mode!=='time', wn=sess?1:Math.min(J.drop?30:366, jWinDays(J.win)), hidW=(J.hide||[]).length;
    if(J.drop) N=Math.min(N, J.drop.n);   /* Pathfinder over the funnel's drop-offs only */
    var root={ id:'n', key:J.mode==='prop'?'§'+J.pval:e0.id, kind:'ev', n:N, depth:0, t:0, children:[], parent:null };
    out.unit=J.count==='totals'?['بار','times']:J.count==='sessions'?['نشست','sessions']:['کاربر','users'];
    function grow(node){
      if(node.kind!=='ev' || node.n<1) return;
      if(end && node.depth>0 && jKeyEv(node.key)===end){ node.kind='end'; return; }
      if(node.depth>=jLimit(st,node)+(J.gb&&J.mode!=='prop'?1:0)){ node.cut=true; return; }
      /* group-by on the first event (Amplitude: group-bys apply to the first event in Pathfinder): split the anchor by value, no drop-off at this level */
      if(node.depth===0 && J.gb && J.mode!=='prop' && RB.PROPS[J.gb]){ var GV=RB.PROPS[J.gb].vals, gp=jAlloc(node.n, GV.map(function(v){ return v[2]; }));
        GV.forEach(function(v,i){ if(!gp[i]) return; var ch={ id:node.id+'.g'+i, key:node.key+'|gb:'+v[1], kind:'ev', n:gp[i], depth:1, t:0, children:[], parent:node, gb:1 }; node.children.push(ch); grow(ch); }); return; }
      var seed=node.id+node.key, d=Math.min(0.6, 0.12+0.1*jitter(seed,2)+0.025*node.depth+(sess?0.06:-0.035*Math.log(wn))), nd=0.025+0.012*Math.min(4,hidW)*jitter(seed,3);
      var drop=Math.round(node.n*d), none=Math.round(node.n*nd), rest=node.n-drop-none;
      var c=jCands(st, node.key, dir); if(end) c=c.map(function(x){ return jKeyEv(x[0])===end?[x[0], x[1]*(1.4+0.8*jitter(seed,4))]:x; });
      var parts=jAlloc(Math.max(0,rest), c.map(function(x){ return x[1]; })), shown=[], other=0;
      /* a branch below 0.8% of everyone folds into this parent's «سایر ایونت‌ها» (the parent's total still adds up) */
      c.forEach(function(x,i){ if(!parts[i]) return; if(shown.length<(J.topN||J_TOPN)&&parts[i]>=N*0.008) shown.push([x[0],parts[i]]); else other+=parts[i]; });
      if(none && none<N*0.01){ drop+=none; none=0; }
      shown.forEach(function(x,i){ var mins=sess?0.5+7*jitter(seed+x[0],5):Math.min(wn*1440*0.8, (20+600*jitter(seed+x[0],5))*Math.min(3,Math.max(0.02,wn)));   /* a step never takes longer than the window */
        var ch={ id:node.id+'.'+i, key:x[0], kind:'ev', n:x[1], depth:node.depth+1, t:node.t+mins, children:[], parent:node }; node.children.push(ch); grow(ch); });
      if(other) node.children.push({ id:node.id+'.o', key:'', kind:'other', n:other, depth:node.depth+1, t:node.t, children:[], parent:node });
      if(drop) node.children.push({ id:node.id+'.d', key:'', kind:dir==='back'?'start':'drop', n:drop, depth:node.depth+1, t:node.t, children:[], parent:node });
      if(none) node.children.push({ id:node.id+'.x', key:'', kind:'none', n:none, depth:node.depth+1, t:node.t, children:[], parent:node });
    }
    grow(root);
    /* + Add event to filter: keep only paths containing the event (a cut branch may still meet it later) */
    if((J.filter||[]).length){ var want=J.filter.map(function(f){ return f.val?f.ev+'|'+f.val:f.ev; });
      (function keep(nd, seen){ var s=seen.slice(); if(nd.key){ s.push(jKeyEv(nd.key)); s.push(String(nd.key)); }
        if(!nd.children.length){ var hit=want.every(function(w){ return s.indexOf(w)>-1; }); nd.n=hit?nd.n:(nd.cut||nd.kind==='other')?Math.round(nd.n*want.filter(function(w){ return s.indexOf(w)<0; }).reduce(function(a,w){ return a*(0.12+0.3*jitter(nd.id+w,6)); },1)):0; return nd.n; }
        var sum=0; nd.children.forEach(function(ch){ sum+=keep(ch, s); }); nd.children=nd.children.filter(function(ch){ return ch.n>0; }); nd.n=sum; return sum; })(root, []);
      out.filtered=true; }
    out.root=root; out.N=root.n;
    var list=[]; (function walk(nd, path){ var p=path.concat([nd]); if(!nd.children.length){ if(nd.n>0) list.push({ nodes:p, n:nd.n, t:nd.t, kind:nd.kind, cut:!!nd.cut }); return; } nd.children.forEach(function(ch){ walk(ch, p); }); })(root, []);
    out.paths=list.sort(function(a,b){ return b.n-a.n; });
    out.depth=list.reduce(function(m,p){ return Math.max(m,p.nodes.length-1); },0);
    return out;
  });
}
function jName(nd){ return nd.kind==='drop'?T('ریزش','Dropped off'):nd.kind==='none'?T('ایونت دیگری انجام نداد','Did not perform an event'):nd.kind==='other'?T('سایر ایونت‌ها','Other events'):nd.kind==='start'?T('شروع مسیر (اول نشست)','Path start (session start)'):jLabel(nd.key); }
function jPathText(p){ return p.nodes.map(jName).join(fa()?' ← ':' → '); }
function jTile(q, ovr){
  var st=q.amp?norm(clone(q.amp)):jFromLegacy(q), r=jCompute(st, { range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) });
  if(r.empty||!r.N) return null;
  var top=r.paths.filter(function(p){ return p.kind!=='drop'&&p.kind!=='none'; }).slice(0,3);
  var an=st.journey.mode==='prop'?jName(r.root):evName(st.events[0].id);
  return { val:num(r.N), num:r.N, sub:T(J_TYPES[st.journey.type][0]+' «'+an+'» · '+r.R.fa, J_TYPES[st.journey.type][1]+' “'+an+'” · '+r.R.en), viz:'',
    rows:top.map(function(p){ return [jPathText(p), pctTxt(p.n/r.N*100)]; }), range:r.R };
}
/* a report saved by the legacy Flows pane (anchor / after-before / depth) */
function jFromLegacy(q){ var f=(q&&q.flows)||{}; return norm({ events:[{ id:f.anchor||'page_view', filters:[], groupBy:'' }], journey:Object.assign(blankJourney(), { type:f.dir==='before'?'end':'start', steps:+f.depth||J_STEPS }) }); }
var lastJ=null;
function renderJourney(){
  var res=lastJ=jCompute(A, { range:RB.Q.range, filters:RB.Q.filters });
  if(projNoEvents()) res.empty=res.noEv=true;   /* PM 2026-10-31, outcome 1: B01 */
  root.classList.toggle('rtl', fa());
  root.innerHTML='<div class="rbz-grid'+(SET_OPEN?' with-set':'')+'"><aside class="rbz-panel">'+eventsModule()+jFilterModule()+measureModule()+segmentModule()+'</aside>'+
    '<section class="rbz-canvas">'+(res.empty?'<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-drslot"></span></div>'+(res.noEv?noEventsState():jEmpty()):
      jToolbar(res)+jSummary(res)+(A.journey.view==='map'?jMap(res):A.journey.view==='sun'?'<div class="rbz-chartbox"><div class="rbz-chart rbz-jsun" id="rbzChart"></div><div class="rbz-jcrumb" id="rbzJCrumb">'+T('روی یک حلقه بروید تا مسیرش را ببینید؛ کلیک برای تمرکز روی آن شاخه.','Hover a ring to see its path; click to focus on that branch.')+'</div></div>':'<div class="rbz-jwrap"><div class="rbz-jtree" id="rbzJTree"></div></div>'))+'</section>'+(SET_OPEN?setPanel():'')+'</div>';
  placeFilter(); wire(); U.i18n();
  if(!res.empty&&A.journey.view==='path') jDraw(res);
  if(!res.empty&&A.journey.view==='sun') jSun(res);
}
function jEmpty(){
  var seed=function(id, lab, type){ return getEv(id)?'<button class="rbz-linkbtn ghost" data-jseed="'+id+'" data-jtype="'+type+'" type="button">'+ic('lightning')+T(lab[0],lab[1])+'</button>':''; };
  return '<div class="sh-state rbz-empty">'+emptyArt('funnel')+'<div class="sh-state-title">'+T('کاربران واقعاً از کجا به کجا می‌روند؟','Where do users actually go?')+'</div>'+
    '<div class="sh-state-hint">'+T('یک ایونت انتخاب کنید تا مسیرهای بعد از آن (یا پیش از آن) را ببینید؛ برخلاف قیف، لازم نیست قدم‌ها را از قبل بدانید.','Pick an event to see the paths after (or before) it; unlike a funnel, you don’t need to know the steps first.')+'</div>'+
    '<div class="rbz-emptyacts"><button class="rbz-linkbtn" data-evadd="1" type="button">'+ic('plus')+T('افزودن ایونت','Add event')+'</button>'+
    seed('video_started',['بعد از شروع پخش ویدیو','After a video starts'],'start')+seed('search_no_results',['بعد از جستجوی بی‌نتیجه','After a search with no results'],'start')+seed('subscription_started',['پیش از خرید اشتراک','Before a subscription'],'end')+'</div></div>';
}
function jPathsModule(){
  var J=A.journey, live=liveBtn();
  var sum=A.events.length?T(J_TYPES[J.type][0],J_TYPES[J.type][1])+' '+A.events.slice(0,J.type==='between'?2:1).map(function(e){ return evName(e.id); }).join(T(' و ',' and ')):T('هنوز ایونتی نیست','No events yet');
  var h='<div class="rbz-mod">'+modHead('ev','مسیرها','Paths',JTIPS.paths,sum,live);
  if(!OPEN.ev) return h+'</div>';
  h+='<div class="rbz-seg2 sm" role="radiogroup" aria-label="'+T('مسیر بر اساس','Paths of')+'">'+[['ev','ایونت‌ها','Events'],['prop','ویژگی‌ها (هر ایونت)','Properties (any event)']].map(function(m){ var on=(J.mode||'ev')===m[0]; return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-jmode="'+m[0]+'">'+T(m[1],m[2])+'</button>'; }).join('')+'</div>';
  h+='<div class="rbz-orderrow"><select class="sh-select rbz-order" id="rbzJType" aria-label="'+T('نوع مسیر','Path type')+'">'+Object.keys(J_TYPES).filter(function(k){ return J.mode!=='prop'||k!=='between'; }).map(function(k){ return '<option value="'+k+'"'+(J.type===k?' selected':'')+'>'+T(J_TYPES[k][0],J_TYPES[k][1])+'</option>'; }).join('')+'</select></div>';
  if(J.mode==='prop'){ var PP=RB.PROPS[J.prop];
    h+='<div class="rbz-ev"><div class="rbz-frow"><span class="lb">'+T('هر ایونت با','Any event where')+'</span></div><div class="rbz-frow"><select class="sh-select" id="rbzJProp">'+RB.GLOBAL_PROPS.filter(function(p){ return RB.PROPS[p]&&!RB.PROPS[p].num; }).map(function(p){ return '<option value="'+p+'"'+(J.prop===p?' selected':'')+'>'+esc(pOpt(p))+'</option>'; }).join('')+'</select></div>'+
      '<div class="rbz-frow"><span class="sub">'+T('برابر با','equals')+'</span><select class="sh-select" id="rbzJPval"><option value="">'+T('یک مقدار انتخاب کنید','Pick one value')+'</option>'+(PP?PP.vals.map(function(v){ return '<option value="'+esc(v[1])+'"'+(J.pval===v[1]?' selected':'')+'>'+esc(T(v[0],v[1]))+'</option>'; }).join(''):'')+'</select></div>'+
      '<div class="rbz-hint">'+ic('info')+T('هر گره یک مقدار از همین ویژگی است، روی هر ایونتی؛ برای هر ویژگی فقط یک مقدار.','Each node is a value of this property, on any event; one value per property.')+'</div></div>';
    return h+'</div>'; }
  var slots=J.type==='between'?2:1;
  for(var k=0;k<slots;k++){ var e=A.events[k];
    if(!e){ h+='<button class="rbz-add'+(k===0?' big':'')+'" data-evadd="1" type="button">'+ic('plus')+(k===0?T('افزودن ایونت','Add event'):T('ایونت پایان','End event'))+'</button>'; break; }
    h+='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let step">'+(slots>1?(k?'■':'▶'):'▶')+'</span><button class="rbz-evname" data-evpick="'+k+'" type="button"><span class="rbz-evic">'+evIcon(e.id)+'</span><span class="nm">'+esc(e.label||evName(e.id))+'</span><code>'+esc(e.id)+'</code><span class="rbz-car">⌄</span></button>'+
      '<button class="rbz-ico" data-evmore="'+k+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>';
    (e.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-fdel="'+k+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    h+='<div class="rbz-evacts"><button data-fadd="'+k+'" type="button">+ '+T('فیلتر','Filter by')+'</button></div></div>'; }
  if(A.events.length>slots) h+='<div class="rbz-hint">'+ic('info')+T('مسیرها فقط '+(slots>1?'دو ایونت (شروع و پایان)':'یک ایونت مبنا')+' دارد؛ بقیهٔ ایونت‌ها برای نوع‌های دیگر نگه داشته می‌شوند.','Journeys uses '+(slots>1?'two events (start and end)':'one anchor event')+'; the others are kept for the other chart types.')+'</div>';
  return h+'</div>';
}
function jFilterModule(){
  var J=A.journey, x=function(attr){ return '<button '+attr+' type="button" aria-label="'+T('حذف','Remove')+'">×</button>'; };
  var sum=[J.filter.length?T(num(J.filter.length)+' فیلتر',J.filter.length+' filter'):'', J.exclude.length?T(num(J.exclude.length)+' حذف',J.exclude.length+' excluded'):'', J.expand.length?T(num(J.expand.length)+' باز',J.expand.length+' expanded'):''].filter(Boolean).join(' · ')||T('بدون فیلتر','No filters');
  var h='<div class="rbz-mod">'+modHead('jf','فیلتر مسیرها، باز کردن بر اساس ویژگی','Filter by paths, expand by property',JTIPS.pfilter,sum);
  if(OPEN.jf===false) return h+'</div>';
  J.filter.forEach(function(f,i){ h+='<div class="rbz-chip act">'+ic('funnel')+'<span>'+T('فقط مسیرهای شامل: ','Paths with: ')+esc(f.val?jLabel(f.ev+'|'+f.val):evName(f.ev))+'</span>'+x('data-jfdel="filter:'+i+'"')+'</div>'; });
  if(J.gb&&RB.PROPS[J.gb]) h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('ایونت اول به تفکیک ','First event by ')+esc(T(RB.PROPS[J.gb].fa,RB.PROPS[J.gb].en))+'</span>'+x('data-jgbdel="1"')+'</div>';
  J.exclude.forEach(function(f,i){ h+='<div class="rbz-chip">'+ic('x')+'<span>'+T('حذف: ','Excluded: ')+esc(f.val?jLabel(f.ev+'|'+f.val):evName(f.ev))+'</span>'+x('data-jfdel="exclude:'+i+'"')+'</div>'; });
  J.expand.forEach(function(f,i){ var P=RB.PROPS[f.prop]; h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+esc(evName(f.ev))+T(' به تفکیک ',' by ')+esc(P?T(P.fa,P.en):f.prop)+'</span>'+x('data-jfdel="expand:'+i+'"')+'</div>'; });
  return h+'<div class="rbz-evacts rbz-jfacts">'+(J.mode!=='prop'&&!J.gb?'<button data-jgb="1" type="button">+ '+T('تفکیک ایونت اول','Group first event by')+'</button>':'')+'<button data-jfadd="filter" type="button">+ '+T('ایونت برای فیلتر','Add event to filter')+'</button><button data-jfadd="exclude" type="button">+ '+T('ایونت برای حذف','Add event to exclude')+'</button><button data-jfadd="expand" type="button">+ '+T('ایونت برای باز کردن','Add event to expand')+'</button></div></div>';
}
function jMeasureModule(){
  var J=A.journey, h='<div class="rbz-mod">'+modHead('meas','سنجش بر اساس','Measured as',JTIPS.meas,(J.count==='totals'?T('تعداد دفعات','Event totals'):J.count==='sessions'?T('نشست‌ها','Sessions'):T('کاربران','Users'))+' · '+(J.win.mode==='time'?jWinTxt(J.win):T('در یک نشست','within one session')));
  if(!OPEN.meas) return h+'</div>';
  return h+'<div class="rbz-seg2" role="radiogroup">'+[['uniques','کاربران','Users'],['sessions','نشست‌ها','Sessions'],['totals','تعداد دفعات','Event totals']].map(function(m){ var on=J.count===m[0]; return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-jcount="'+m[0]+'">'+T(m[1],m[2])+'</button>'; }).join('')+'</div>'+
    '<div class="rbz-frow"><span class="lb">'+T('پنجرهٔ تبدیل','Conversion window')+'</span><span class="rbx-tipdot"'+tip(JTIPS.win[0],JTIPS.win[1])+'></span></div>'+
    '<div class="rbz-frow"><select class="sh-select" id="rbzJWin"><option value="session"'+(J.win.mode!=='time'?' selected':'')+'>'+T('در یک نشست','Within one session')+'</option><option value="time"'+(J.win.mode==='time'?' selected':'')+'>'+T('زمان مشخص','Set time')+'</option></select></div>'+
    (J.win.mode==='time'?'<div class="rbz-frow"><span class="lb">'+T('ظرف','Within')+'</span><input class="sh-input" id="rbzJWinN" type="number" min="1" max="'+(J.win.u==='min'?1440:J.win.u==='hour'?720:30)+'" value="'+(J.win.n||1)+'" style="width:84px"/>'+
      '<select class="sh-select" id="rbzJWinU" style="width:auto">'+Object.keys(JW_U).map(function(u){ return '<option value="'+u+'"'+((J.win.u||'day')===u?' selected':'')+'>'+T(JW_U[u][0],JW_U[u][1])+'</option>'; }).join('')+'</select></div>':'')+
    (J.drop?'<div class="rbz-hint">'+ic('info')+T('مسیر ریزش‌کرده‌ها حداکثر ۳۰ روز را می‌بیند.','Drop-off paths look at up to 30 days.')+'</div>':'')+
    '<div class="rbz-mdef">'+T(RB.USER_DEF[0]+' صفحهٔ «سفر کاربر» نشست می‌شمارد؛ برای عدد یکسان، شمارش «نشست‌ها» را انتخاب کنید.',RB.USER_DEF[1]+' The «سفر کاربر» page counts sessions; choose Sessions counting to match it.')+'</div></div>';
}
function jToolbar(res){
  var J=A.journey;
  return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+
    '<div class="rbz-seg2 sm" role="tablist">'+[['path','Pathfinder','Pathfinder'],['sun','Sunburst','Sunburst'],['map','نقشهٔ مسیرها','Journey map']].map(function(v){ var on=J.view===v[0]; return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-jview="'+v[0]+'">'+T(v[1],v[2])+'</button>'; }).join('')+'</div>'+
    '<button class="rbz-pill" id="rbzJMore" type="button"'+((J.topN||J_TOPN)>=15?' disabled':'')+'>'+ic('plus')+T('ایونت‌های بیشتر','More events')+'</button>'+
    '<button class="rbz-pill" id="rbzJFilt" type="button">'+ic('funnel')+T('فیلتر ایونت‌ها','Filter events')+' ⌄</button>'+
    '<span class="rbz-drslot"></span></div>';
}
function jSummary(res){
  var J=A.journey, conv=J.type==='between'?res.paths.filter(function(p){ return p.kind==='end'; }).reduce(function(a,p){ return a+p.n; },0):null;
  var dr=J.drop?'<div class="rbz-note">'+ic('funnel')+'<span>'+T('فقط ریزش‌کرده‌های قیف: '+J.drop.fa+' («'+evName(J.drop.prev)+'» بدون «'+evName(J.drop.next)+'»).','Funnel drop-offs only: '+J.drop.en+' (“'+evName(J.drop.prev)+'” without “'+evName(J.drop.next)+'”).')+'</span><button class="rbz-inlink" id="rbzJDropX" type="button">'+T('برداشتن','Remove')+'</button></div>':'';
  return dr+'<div class="rbz-jsum"><span><b>'+num(res.N)+'</b> '+T(res.unit[0],res.unit[1])+(res.filtered?T(' (مسیرهای شامل ایونت فیلتر)',' (paths with the filter event)'):'')+'</span>'+
    (conv!=null?'<span>'+T('رسیدند به «'+evName(A.events[1].id)+'»: ','Reached “'+evName(A.events[1].id)+'”: ')+'<b>'+pctTxt(res.N?conv/res.N*100:0)+'</b></span>':'')+
    '<span class="rbz-jnote"'+tip(JTIPS.node[0],JTIPS.node[1])+'>'+ic('info')+T('درصدها از همهٔ کاربران تحلیل است','% of all users in the analysis')+'</span></div>';
}
/* Pathfinder: a prefix tree, columns by step; time runs in reading direction (right-to-left in Persian) */
function jDraw(res){
  var host=$('rbzJTree'); if(!host) return;
  var cols=[], maxD=0; (function walk(nd){ (cols[nd.depth]=cols[nd.depth]||[]).push(nd); maxD=Math.max(maxD,nd.depth); nd.children.forEach(walk); })(res.root);
  var W=Math.max(host.parentNode.clientWidth||900, (maxD+1)*170), colW=W/(maxD+1), barW=12, gap=4, pal=palette(), SLOT=30;
  /* bar heights are proportional to users (one scale for the whole chart); each node gets a slot tall enough for its label */
  var maxN=Math.max.apply(null, cols.map(function(c){ return c.reduce(function(a,n){ return a+n.n; },0); }))||1, sc=360/maxN;
  var rtl=fa(), X=function(d){ var x=d*colW+8; return rtl?W-x-barW:x; }, pos={}, H=0;
  cols.forEach(function(c,d){ var y=10; c.forEach(function(nd){ var h=Math.max(3, nd.n*sc), slot=Math.max(h, SLOT); pos[nd.id]={ x:X(d), y:y, h:h }; y+=slot+gap; }); H=Math.max(H,y+10); });
  var col=function(nd){ return nd.kind==='drop'||nd.kind==='none'?'var(--sh-muted)':nd.kind==='other'?'var(--sh-border-strong,var(--sh-muted))':nd.kind==='end'?'var(--sh-good)':nd.kind==='start'?'var(--sh-info)':pal[(RB.hstr(jKeyEv(nd.key))%6)]; };
  var svg='<svg class="rbz-jsvg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+T('درخت مسیرها','Path tree')+'">';
  (function links(nd){ var a=pos[nd.id], off=0; nd.children.forEach(function(ch){ var b=pos[ch.id], th=Math.max(1, ch.n*sc);
      var x1=rtl?a.x:a.x+barW, x2=rtl?b.x+barW:b.x, y1=a.y+off+th/2, y2=b.y+th/2, mx=(x1+x2)/2; off+=th;
      svg+='<path class="rbz-jlink'+(ch.kind!=='ev'&&ch.kind!=='end'?' faint':'')+'" d="M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2+'" stroke-width="'+th.toFixed(1)+'"/>'; links(ch); }); })(res.root);
  var labels='';
  (function nodes(nd){ var p=pos[nd.id], pc=res.N?nd.n/res.N*100:0, inert=nd.kind==='drop'||nd.kind==='none'||nd.kind==='start';
    svg+='<rect class="rbz-jnode" x="'+p.x+'" y="'+p.y+'" width="'+barW+'" height="'+p.h.toFixed(1)+'" rx="3" fill="'+col(nd)+'" data-jnode="'+nd.id+'"><title>'+esc(jName(nd))+' · '+num(nd.n)+' '+T(res.unit[0],res.unit[1])+' · '+pctTxt(pc)+'</title></rect>';
    var lx=rtl?p.x-6:p.x+barW+6;
    labels+='<button class="rbz-jlab'+(inert?' inert':'')+'" data-jnode="'+nd.id+'" type="button" title="'+esc(jName(nd))+' · '+num(nd.n)+' '+T(res.unit[0],res.unit[1])+'" style="'+(rtl?'right:'+(W-lx):'left:'+lx)+'px;top:'+(p.y-1).toFixed(1)+'px;max-width:'+(colW-barW-22)+'px">'+
      '<span class="nm">'+esc(jName(nd))+'</span><b>'+pctTxt(pc)+'</b></button>';
    if(nd.cut&&nd.kind==='ev'&&nd.depth<J_MAXSTEP) labels+='<button class="rbz-jmore" data-jmore="'+nd.id+'" type="button" style="'+(rtl?'right:'+(W-p.x+4):'left:'+(p.x+barW+4))+'px;top:'+(p.y+Math.max(p.h,SLOT)-12).toFixed(1)+'px">'+T('بیشتر','More')+' ›</button>';
    nd.children.forEach(nodes); })(res.root);
  host.style.width=W+'px'; host.style.height=H+'px';
  host.innerHTML=svg+'</svg>'+labels;
  /* the click bubbles to the document, which closes menus: open the node menu after it, on an anchor at the node */
  host.querySelectorAll('[data-jnode]').forEach(function(el){ el.addEventListener('click', function(){ var nd=jFind(res.root, el.getAttribute('data-jnode')), r=el.getBoundingClientRect(), hr=host.getBoundingClientRect();
    setTimeout(function(){ host.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
      var a=document.createElement('span'); a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(r.left-hr.left+r.width/2)+'px;top:'+(r.bottom-hr.top)+'px'; host.appendChild(a); jNodeMenu(a, nd, res); }, 0); }); });
  host.querySelectorAll('[data-jmore]').forEach(function(el){ el.addEventListener('click', function(){ var id=el.getAttribute('data-jmore'); A.journey.more[id]=(A.journey.more[id]||0)+1; changed(); }); });
}
/* Sunburst (Amplitude: an alternate Pathfinder view): rings are steps; the breadcrumb shows the path; drop-offs stay grey */
function jSun(res){
  var el=$('rbzChart'); if(!el||!window.echarts) return;
  if(chart){ chart.dispose(); chart=null; }
  chart=echarts.init(el);
  var cs=getComputedStyle(document.body), MU=cs.getPropertyValue('--sh-muted').trim(), TX=cs.getPropertyValue('--sh-text').trim(), SF=cs.getPropertyValue('--sh-surface').trim(), BD=cs.getPropertyValue('--sh-border').trim(), GD=cs.getPropertyValue('--sh-good').trim(), FONT=cs.fontFamily, pal=palette();
  function conv(nd){ var grey=nd.kind==='drop'||nd.kind==='none'||nd.kind==='other'||nd.kind==='start';
    return { name:jName(nd), value:nd.n, nid:nd.id, itemStyle:{ color:grey?MU:nd.kind==='end'?GD:pal[(RB.hstr(jKeyEv(nd.key))%6)], opacity:grey?0.45:1 }, children:nd.children.map(conv) }; }
  chart.setOption({ animationDuration:300, tooltip:{ backgroundColor:SF, borderColor:BD, textStyle:{ color:TX, fontFamily:FONT }, confine:true, extraCssText:'direction:'+(fa()?'rtl':'ltr')+';text-align:start',
      formatter:function(p){ var path=(p.treePathInfo||[]).slice(1).map(function(x){ return x.name; }); return esc(path.join(fa()?' ← ':' → '))+'<br><b>'+num(p.value)+'</b> '+T(res.unit[0],res.unit[1])+' · '+pctTxt(res.N?p.value/res.N*100:0); } },
    series:[{ type:'sunburst', data:[conv(res.root)], radius:['8%','92%'], sort:null, nodeClick:'rootToNode', emphasis:{ focus:'ancestor' },
      levels:[{}].concat([0,1,2,3,4,5,6,7,8,9].map(function(){ return { label:{ show:false } }; })), itemStyle:{ borderColor:SF, borderWidth:1.5 } }] });
  el.style.filter='saturate(.72)';
  chart.on('mouseover', function(p){ var c=$('rbzJCrumb'); if(c&&p.treePathInfo) c.textContent=p.treePathInfo.slice(1).map(function(x){ return x.name; }).join(fa()?' ← ':' → ')+' · '+pctTxt(res.N?p.value/res.N*100:0); });
}
function jFind(nd, id){ if(nd.id===id) return nd; for(var i=0;i<nd.children.length;i++){ var f=jFind(nd.children[i], id); if(f) return f; } return null; }
function jPrefix(nd){ var p=[]; while(nd){ if(nd.kind==='ev'||nd.kind==='end') p.unshift(nd); nd=nd.parent; } return p; }
function jNodeMenu(anchor, nd, res){
  if(!nd) return;
  var inert=nd.kind==='drop'||nd.kind==='none'||nd.kind==='start'||nd.kind==='other', base=jKeyEv(nd.key), pre=jPrefix(nd), path=pre.map(jName).join(fa()?' ← ':' → ');
  var lb=['مسیر: '+path, 'Path: '+path], ev=jReal(base||A.events[0].id), n=nd.n;
  U.menu(anchor, [ { head:1, fa:jName(nd)+' · '+num(n)+' '+res.unit[0]+' · '+pctTxt(res.N?n/res.N*100:0), en:jName(nd)+' · '+num(n)+' '+res.unit[1]+' · '+pctTxt(res.N?n/res.N*100:0) },
    { icon:'users', fa:UL()[0], en:UL()[1], disabled:inert, hint:inert?['برای ریزش‌کرده‌ها در دسترس نیست','Not available for drop-offs']:null, fn:function(){ usersModal(lb, n, nd.id); } },
    { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), disabled:inert, hint:inert?['از مسیرهای ریزش کوهورت ساخته نمی‌شود','Cohorts can’t be made from drop-off paths']:['ثابت: کسانی که دقیقاً این مسیر را رفته‌اند','Static: people who took exactly this path'], fn:function(){ cohortModal(lb, n, ev, ['کسانی که این مسیر را رفتند: '+path, 'People who took this path: '+path, true]); } },
    { icon:'funnel', fa:'ساختن قیف از این مسیر', en:'Create funnel', disabled:inert||pre.length<2, hint:pre.length<2?['دست‌کم دو قدم لازم است','Needs at least two steps']:null, fn:function(){ jToFunnel(pre); } },
    { sep:1 },
    { icon:'squares-four', fa:'باز کردن بر اساس ویژگی…', en:'Expand by property…', disabled:inert||!base, fn:function(){ jExpandMenu(anchor, base); } },
    { icon:'funnel', fa:'فقط مسیرهای شامل این ایونت', en:'Filter to paths with this event', disabled:inert||!base||nd.depth===0||A.journey.mode==='prop', fn:function(){ if(!A.journey.filter.some(function(f){ return f.ev===base&&!f.val; })) A.journey.filter.push({ ev:base }); changed(); } },
    String(nd.key).split('|').length>1&&String(nd.key).indexOf('|gb:')<0?{ icon:'funnel', fa:'فقط مسیرهای شامل همین ایونت و مقدار', en:'Filter by this event and value', disabled:inert||nd.depth===0, fn:function(){ var p=String(nd.key).split('|'); A.journey.filter.push({ ev:p[0], val:p[1] }); changed(); } }:null,
    { icon:'user-circle', fa:'جریان ایونت‌های کاربران', en:'View user streams', disabled:RB.Q.unit==='org', hint:RB.Q.unit==='org'?['جریان ایونت برای هر آدم است؛ در شمارش سازمان‌ها، «دیدن این سازمان‌ها» را بزنید.','Streams are per person; when counting organizations, use “View these organizations”.']:null, disabled:inert||!window.RBCohort, hint:inert?['برای ریزش‌کرده‌ها در دسترس نیست','Not available for drop-offs']:null, fn:function(){ streamsModal(lb, n, nd.id, ev); } },
    { icon:'video-camera', fa:'پخش نشست‌های این کاربران', en:'Watch session replays', disabled:inert, fn:function(){ openReplay({ label:T(lb[0],lb[1]), n:n, seed:nd.id }); } },
    { icon:'x', fa:'حذف این ایونت از مسیرها', en:'Remove this event', disabled:inert||nd.depth===0, fn:function(){ var p=String(nd.key).split('|'); A.journey.exclude.push(p.length>1?{ ev:p[0], val:p[1] }:{ ev:p[0] }); changed(); } },
    nd.kind==='ev'&&nd.depth<J_MAXSTEP?{ icon:'arrow-'+(fa()?'left':'right'), fa:'یک قدم بیشتر در این شاخه', en:'One more step on this branch', fn:function(){ A.journey.more[nd.id]=(A.journey.more[nd.id]||0)+1; changed(); } }:null ].filter(Boolean), 'start');
}
function jExpandMenu(anchor, ev){
  var props=propsOf(ev).filter(function(p){ return RB.PROPS[p]&&!RB.PROPS[p].num; });
  setTimeout(function(){ U.menu(anchor, props.length?props.map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ A.journey.expand=A.journey.expand.filter(function(x){ return x.ev!==ev; }).concat([{ ev:ev, prop:p }]); changed(); } }; }):[{ fa:'ویژگی‌ای برای باز کردن نیست', en:'No property to expand by', disabled:true }], 'start'); }, 0);
}
/* Pathfinder ▸ Create Funnel: the prefix as steps, "this order" (Amplitude: results won't match exactly — hidden events between steps) */
function jToFunnel(pre){
  var steps=[]; pre.forEach(function(nd){ if(String(nd.key).charAt(0)==='§'){ steps.push({ id:'_any', filters:[{ prop:A.journey.prop, op:'in', vals:[String(nd.key).slice(1)] }], groupBy:'' }); return; }
    var id=jReal(jKeyEv(nd.key)), p=String(nd.key).split('|'), ex=A.journey.expand.filter(function(x){ return x.ev===p[0]; })[0];
    var st={ id:id, filters:[], groupBy:'' }; if(p.length>1&&ex) st.filters=[{ prop:ex.prop, op:'in', vals:[p[1]] }]; steps.push(st); });
  A.events=steps.slice(0,MAX_STEPS); A.funnel.order='this'; A.sel=null; RB.setType('funnel'); changed();
  U.toast('قیف «به همین ترتیب» ساخته شد؛ چون ایونت‌های پنهان بین قدم‌ها در مسیرها حساب نمی‌شوند، عددها دقیقاً یکی نیست.','Funnel created in “this order”; numbers won’t match exactly because hidden events between steps don’t count in Journeys.');
}
function jMap(res){
  var J=A.journey, btw=J.type==='between', list=res.paths.filter(function(p){ return !btw||(J.mapTab==='conv'?p.kind==='end':p.kind!=='end'); });
  if(J.sort==='sim') list=list.slice().sort(function(a,b){ var x=a.nodes.map(function(n){ return n.id; }).join('/'), y=b.nodes.map(function(n){ return n.id; }).join('/'); return x<y?-1:x>y?1:0; });
  else if(J.sort==='time') list=list.slice().sort(function(a,b){ var ta=a.kind==='drop'||a.kind==='none'?-1:a.t, tb=b.kind==='drop'||b.kind==='none'?-1:b.t; return tb-ta; });
  list=list.slice(0,25); J_MAPLIST=list;
  var h='<div class="rbz-tablewrap"><div class="rbz-tablehead"><b>'+T('نقشهٔ مسیرها','Journey map')+'</b><span class="rbx-tipdot"'+tip(JTIPS.map[0],JTIPS.map[1])+'></span>'+
    (btw?'<div class="rbz-seg2 sm">'+[['conv','تبدیل‌شده','Converted'],['drop','ریزش‌کرده','Dropped off']].map(function(x){ return '<button type="button" class="'+(J.mapTab===x[0]?'on':'')+'" data-jmtab="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>':'')+
    '<span class="lb">'+T('مرتب‌سازی','Sort by')+'</span><select class="sh-select" id="rbzJSort" style="width:auto">'+[['freq','تعداد','Frequency'],['sim','شباهت','Similarity'],['time','میانگین زمان','Average time']].map(function(x){ return '<option value="'+x[0]+'"'+(J.sort===x[0]?' selected':'')+'>'+T(x[1],x[2])+'</option>'; }).join('')+'</select>'+
    '<span class="rbx-spacer"></span><button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button></div>'+
    '<div class="sh-table-wrap"><table class="sh-table rbz-table rbz-jmap"><thead><tr><th>'+T('مسیر','Path')+'</th><th class="num">'+T(res.unit[0]==='بار'?'دفعات':'کاربران',res.unit[1]==='times'?'Times':'Users')+'</th><th class="num">'+T('٪ از همه','% of all')+'</th><th class="num">'+T('میانگین زمان تا پایان مسیر','Avg time to path end')+'</th></tr></thead><tbody>';
  list.forEach(function(p,i){ h+='<tr data-jrow="'+i+'"><td><div class="rbz-jsteps">'+p.nodes.map(function(nd,ni){ return '<span class="rbz-jstep k-'+nd.kind+(ni?' br':'')+'"'+(ni?' data-jbr="'+i+':'+ni+'" role="button" tabindex="0"':'')+'>'+esc(jName(nd))+'</span>'; }).join('<i>'+(fa()?'←':'→')+'</i>')+(p.cut?'<span class="rbz-jstep k-cut">…</span>':'')+'</div></td>'+
    '<td class="num">'+num(p.n)+'</td><td class="num"><span class="rbz-jbar"><i style="width:'+Math.min(100,p.n/res.N*100).toFixed(1)+'%"></i></span>'+pctTxt(p.n/res.N*100)+'</td><td class="num">'+(p.kind==='drop'||p.kind==='none'?'—':fmtDur(p.t))+'</td></tr>'; });
  if(!list.length) h+='<tr><td colspan="4" class="muted">'+T('مسیری برای نمایش نیست.','No paths to show.')+'</td></tr>';
  return h+'</tbody></table></div><div class="rbz-tnote">'+T('میانگین زمان فقط از کسانی است که تا انتهای مسیر رفته‌اند؛ برای مسیرهای ریزش زمان نشان داده نمی‌شود.','The average time is only over people who reached the end of the path; drop-off paths show no time.')+'</div></div>';
}
/* Block A: Journey Map branch detail (Amplitude: a branch's users, its share of the step before, the time it took, where it goes next) */
var J_MAPLIST=[];
function jBranch(anchor, nd, res){
  var par=nd.parent, kids=(nd.children||[]).filter(function(c){ return c.n>0; }).sort(function(a,b){ return b.n-a.n; }).slice(0,3), u=T(res.unit[0],res.unit[1]);
  var row=function(a,b){ return '<div class="rbz-jbrr"><span>'+a+'</span><b>'+b+'</b></div>'; };
  var html='<div class="rbz-jbr"><div class="rbz-poph"><b>'+esc(jName(nd))+'</b><span class="rbx-tipdot"'+tip(JTIPS.branch[0],JTIPS.branch[1])+'></span></div>'+
    '<div class="rbz-jbrpath">'+esc(par?jName(par):'')+(fa()?' ← ':' → ')+esc(jName(nd))+'</div>'+
    row(T('رسیده به این شاخه','Reached this branch'), num(nd.n)+' '+u)+
    (par?row(T('از قدم قبل','Of the step before'), pctTxt(par.n?nd.n/par.n*100:0)):'')+
    row(T('از همه','Of everyone'), pctTxt(res.N?nd.n/res.N*100:0))+
    (par&&(nd.kind==='ev'||nd.kind==='end')?row(T('میانگین زمان از قدم قبل','Avg time from the step before'), fmtDur(Math.max(0.5,nd.t-par.t))):'')+
    (kids.length?'<div class="rbz-evgrp">'+T('بعد از این شاخه','After this branch')+'</div>'+kids.map(function(c){ return row(esc(jName(c)), pctTxt(nd.n?c.n/nd.n*100:0)); }).join(''):'')+
    (nd.kind==='ev'||nd.kind==='end'?'<button class="sh-btn ghost compact" id="rbzJBrMs" type="button">'+ic('users')+T('کاربران این شاخه…','Users on this branch…')+'</button>':'')+'</div>';
  pop(anchor, html, function(el){ var b=el.querySelector('#rbzJBrMs'); if(b) b.addEventListener('click', function(){ closePop(); setTimeout(function(){ jNodeMenu(anchor, nd, res); }, 0); }); });
}
function jCsv(){
  var r=lastJ; if(!r||r.empty) return; var q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; };
  var lines=[[T('مسیر','Path'),T('تعداد','Count'),'%',T('میانگین زمان (دقیقه)','Avg time (min)')].map(q).join(',')].concat(r.paths.map(function(p){ return [jPathText(p), p.n, (p.n/r.N*100).toFixed(1), p.kind==='drop'||p.kind==='none'?'':Math.round(p.t)].map(q).join(','); }));
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='journeys.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  U.toast('فایل CSV دانلود شد','CSV downloaded');
}
function jHideModal(){
  var J=A.journey, hid={}; J.hide.forEach(function(h){ hid[h]=1; });
  U.modal({ fa:'انتخاب ایونت‌های حذف‌شده', en:'Choose events to exclude', subFa:'ایونت‌های تیک‌خورده پیش از ساختن مسیرها کنار گذاشته می‌شوند. ایونت‌های غیرفعال (مثل پینگ پخش) به‌طور پیش‌فرض حذف‌اند.', subEn:'Ticked events are removed before paths are built. Inactive events (such as playback pings) are excluded by default.', wide:true,
    body:'<div class="rbz-jhide">'+RB.EVENTS.map(function(e){ return '<label class="rbz-ck"><input type="checkbox" data-jh="'+e.id+'"'+(hid[e.id]?' checked':'')+'/>'+esc(T(e.fa,e.en))+(J_INACTIVE.indexOf(e.id)>-1?' <span class="rbz-tag">'+T('غیرفعال','Inactive')+'</span>':'')+'</label>'; }).join('')+'</div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ J.hide=[].slice.call(bd.querySelectorAll('[data-jh]')).filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute('data-jh'); }); changed(); } }] });
}
function jOnlyModal(){
  var J=A.journey, on={}; J.only.forEach(function(x){ on[x]=1; });
  U.modal({ fa:'فقط ایونت‌های مشخص', en:'Show only specific events', subFa:'فقط این ایونت‌ها در مسیرها گره می‌شوند؛ بقیه پیش از ساختن مسیرها کنار می‌روند. برای برداشتن محدودیت، همه را خالی کنید.', subEn:'Only these events become nodes; the rest are removed before paths are built. Clear all to remove the limit.', wide:true,
    body:'<div class="rbz-jhide">'+RB.EVENTS.filter(function(e){ return J_INACTIVE.indexOf(e.id)<0; }).map(function(e){ return '<label class="rbz-ck"><input type="checkbox" data-jo="'+e.id+'"'+(on[e.id]?' checked':'')+'/>'+esc(T(e.fa,e.en))+'</label>'; }).join('')+'</div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ J.only=[].slice.call(bd.querySelectorAll('[data-jo]')).filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute('data-jo'); }); changed(); } }] });
}
function jAddModal(kind){
  if(kind==='expand'){ eventPicker(function(id){ var props=propsOf(id).filter(function(p){ return RB.PROPS[p]&&!RB.PROPS[p].num; });
      if(!props.length){ U.toast('این ایونت ویژگی‌ای برای باز کردن ندارد','This event has no property to expand by'); return; }
      U.modal({ fa:'باز کردن «'+evName(id)+'» بر اساس ویژگی', en:'Expand “'+evName(id)+'” by property', body:'<div class="rbx-field"><label>'+T('ویژگی','Property')+'</label><select class="sh-select" id="rbzJEp">'+props.map(function(p){ return '<option value="'+p+'">'+esc(pOpt(p))+'</option>'; }).join('')+'</select></div>',
        actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ A.journey.expand=A.journey.expand.filter(function(x){ return x.ev!==id; }).concat([{ ev:id, prop:bd.querySelector('#rbzJEp').value }]); changed(); } }] }); }); return; }
  eventPicker(function(id){ var L=A.journey[kind]; if(!L.some(function(x){ return x.ev===id&&!x.val; })) L.push({ ev:id }); changed(); });
}
function wireJourney(){
  if(!isJourney()) return;
  var J=A.journey, q=function(s){ return root.querySelector(s); };
  var ty=$('rbzJType'); if(ty) ty.addEventListener('change', function(){ J.type=ty.value; J.more={}; changed(); });
  root.querySelectorAll('[data-jmode]').forEach(function(b){ b.addEventListener('click', function(){ J.mode=b.getAttribute('data-jmode'); J.more={}; J.filter=[]; J.gb=''; if(J.mode==='prop'&&J.type==='between') J.type='start'; if(J.mode==='prop'&&!J.pval){ var P=RB.PROPS[J.prop]; J.pval=P?P.vals[0][1]:''; } changed(); }); });
  var jp=$('rbzJProp'); if(jp) jp.addEventListener('change', function(){ J.prop=jp.value; J.pval=RB.PROPS[jp.value]?RB.PROPS[jp.value].vals[0][1]:''; J.more={}; changed(); });
  var jv=$('rbzJPval'); if(jv) jv.addEventListener('change', function(){ J.pval=jv.value; J.more={}; changed(); });
  var so=$('rbzJSort'); if(so) so.addEventListener('change', function(){ J.sort=so.value; changed(); });
  var gb=q('[data-jgb]'); if(gb) gb.addEventListener('click', function(e){ e.stopPropagation(); var ev=A.events[0]&&A.events[0].id, props=ev?propsOf(ev).filter(function(p){ return RB.PROPS[p]&&!RB.PROPS[p].num&&p!=='_hcount'; }):[];
    U.menu(gb, props.length?props.map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ J.gb=p; J.more={}; changed(); } }; }):[{ fa:'ویژگی‌ای نیست', en:'No property', disabled:true }], 'start'); });
  var gbd=q('[data-jgbdel]'); if(gbd) gbd.addEventListener('click', function(){ J.gb=''; J.more={}; changed(); });
  root.querySelectorAll('[data-jcount]').forEach(function(b){ b.addEventListener('click', function(){ J.count=b.getAttribute('data-jcount'); changed(); }); });
  var wn=$('rbzJWin'); if(wn) wn.addEventListener('change', function(){ J.win=wn.value==='session'?{ mode:'session', n:1 }:{ mode:'time', n:1, u:'day' }; changed(); });
  function wSet(){ var nI=$('rbzJWinN'), uI=$('rbzJWinU'), u=uI.value, max={ min:1440, hour:720, day:30 }[u], n=Math.max(1, Math.min(max, Math.round(+nI.value||1)));
    if(+nI.value>max) U.toast('حداکثر '+num(max)+' '+JW_U[u][0],'Up to '+max+' '+JW_U[u][1]);
    J.win={ mode:'time', n:n, u:u }; changed(); }
  var wN=$('rbzJWinN'); if(wN) wN.addEventListener('change', wSet); var wU=$('rbzJWinU'); if(wU) wU.addEventListener('change', wSet);
  root.querySelectorAll('[data-jview]').forEach(function(b){ b.addEventListener('click', function(){ J.view=b.getAttribute('data-jview'); changed(); }); });
  root.querySelectorAll('[data-jmtab]').forEach(function(b){ b.addEventListener('click', function(){ J.mapTab=b.getAttribute('data-jmtab'); changed(); }); });
  var dx=$('rbzJDropX'); if(dx) dx.addEventListener('click', function(){ delete J.drop; changed(); });
  root.querySelectorAll('[data-jbr]').forEach(function(sp){ function go(e){ e.stopPropagation(); var p=sp.getAttribute('data-jbr').split(':'), path=J_MAPLIST[+p[0]]; if(path) jBranch(sp, path.nodes[+p[1]], lastJ); }
    sp.addEventListener('click', go); sp.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(e); } }); });
  var mo=$('rbzJMore'); if(mo) mo.addEventListener('click', function(){ J.topN=Math.min(15,(J.topN||J_TOPN)+5); changed(); });
  var fl=$('rbzJFilt'); if(fl) fl.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(fl, [ { icon:'x', fa:'انتخاب ایونت‌های حذف‌شده… ('+num(J.hide.length)+')', en:'Choose events to exclude… ('+J.hide.length+')', fn:jHideModal },
      { icon:'arrows-clockwise', fa:'ادغام ایونت‌های تکراری پشت سر هم'+(J.collapse?' ✓':''), en:'Collapse repeated events'+(J.collapse?' ✓':''), hint:['چند بار پشت سر هم یک ایونت، یک قدم حساب می‌شود (قاعدهٔ میکس‌پنل)','A run of the same event counts as one step (Mixpanel’s rule)'], fn:function(){ J.collapse=!J.collapse; changed(); } },
      { icon:'check', fa:'فقط ایونت‌های مشخص…'+(J.only.length?' ('+num(J.only.length)+')':''), en:'Show only specific events…'+(J.only.length?' ('+J.only.length+')':''), fn:jOnlyModal },
      { icon:'copy', fa:'نمایش ایونت‌های ترکیبی'+(J.custom?' ✓':''), en:'Show combined events'+(J.custom?' ✓':''), disabled:!(RB.VIRTUALS||[]).length, hint:(RB.VIRTUALS||[]).length?['ایونت ترکیبی جای ایونت‌های سازنده‌اش در مسیر می‌آید','A combined event replaces its parts in the paths']:['هنوز ایونت ترکیبی‌ای نیست','No combined events yet'], fn:function(){ J.custom=!J.custom; changed(); } } ], 'start'); });
  root.querySelectorAll('[data-jfadd]').forEach(function(b){ b.addEventListener('click', function(){ jAddModal(b.getAttribute('data-jfadd')); }); });
  root.querySelectorAll('[data-jfdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-jfdel').split(':'); J[p[0]].splice(+p[1],1); changed(); }); });
  root.querySelectorAll('[data-jseed]').forEach(function(b){ b.addEventListener('click', function(){ A.events=[{ id:b.getAttribute('data-jseed'), filters:[], groupBy:'' }]; J.type=b.getAttribute('data-jtype'); OPEN.ev=true; changed(); }); });
  root.querySelectorAll('[data-jrow]').forEach(function(tr){ tr.addEventListener('click', function(e){ e.stopPropagation(); var p=lastJ.paths.filter(function(x){ var btw=J.type==='between'; return !btw||(J.mapTab==='conv'?x.kind==='end':x.kind!=='end'); })[+tr.getAttribute('data-jrow')]; if(p) setTimeout(function(){ jNodeMenu(tr.querySelector('td'), p.nodes[p.nodes.length-1].kind==='ev'||p.nodes[p.nodes.length-1].kind==='end'?p.nodes[p.nodes.length-1]:p.nodes[p.nodes.length-2]||p.nodes[0], lastJ); }, 0); }); });
  var csv=$('rbzCsv'); if(csv){ var c2=csv.cloneNode(true); csv.parentNode.replaceChild(c2,csv); c2.addEventListener('click', jCsv); }
}
/* "Show user journeys" from any chart: open this tab starting with that event, keeping the segment (PM decision 2026-10-13) */
function openJourney(ev, type, drop){ A.events=[{ id:ev, filters:[], groupBy:'' }]; A.journey=Object.assign(blankJourney(), { type:type||'start' }, drop?{ drop:drop, win:{ mode:'time', n:Math.min(30, Math.max(1, Math.ceil(winDays(A.funnel.win)))), u:'day' } }:{}); A.sel=null; RB.setType('flows'); changed(); }
/* Block A: Microscope ▸ «مسیر ریزش‌کرده‌ها» — Pathfinder over the people who left between steps k and k+1 only (Amplitude "Show User Paths") */
function dropJourney(k, n){ var prev=A.events[k-1].id, next=A.events[k].id; openJourney(prev, 'start', { prev:prev, next:next, k:k, n:n, fa:'ریزش بین قدم '+num(k)+' و '+num(k+1), en:'Dropped off between steps '+k+' and '+(k+1) }); }
/* ═════════ Data Table (phase 2, step 6a): Amplitude Data Tables ═════════
   Spec: research-notes/…/21-amplitude-data-table-spec.md. Columns are events or metrics, rows are property values,
   segments are sub-columns. Rules (spec §21b): every cell is computed per row on its own; the Overall row is its own
   query, never a sum of rows; uniques and (default-mode) sessions don't add up across rows (a user/session can carry
   several values); event totals, Entry/Exit sessions and First/Last/Last-non-direct credit do add up; Linear credit
   splits each conversion to 100%; Participation can exceed Overall; relative % only where rows add up. */
var T_MEAS={ uniques:['کاربران','Users'], totals:['تعداد دفعات','Event totals'], active:['درصد کاربران فعال','% of active users'], avg:['میانگین در هر کاربر','Average per user'], psum:['مجموع ویژگی','Property sum'], pavg:['میانگین ویژگی','Property average'] };
/* Amplitude's out-of-the-box web metrics (on page views and sessions) + session totals and duration */
var T_OOTB={
  visitors:['کاربران سایت','Visitors','uniques'], page_views:['بازدید صفحه','Page views','totals'], bounce_rate:['نرخ پرش','Bounce rate','rate'], entry_rate:['نرخ ورود','Entry rate','rate'],
  exit_rate:['نرخ خروج','Exit rate','rate'], pv_per_session:['بازدید به ازای هر نشست','Page views per session','ratio'], session_entries:['ورود نشست','Session entries','sess'], session_exits:['خروج نشست','Session exits','sess'],
  session_totals:['نشست‌ها','Session totals','sess'], avg_session_duration:['میانگین مدت نشست','Average session duration','dur'] };
/* 6b: metrics that live in the library rather than the out-of-the-box list: time spent (Amplitude's four) and two session
   inputs of the hybrid builder. Time spent can't be used in formulas (Amplitude). */
var T_XM={ ts_total:['کل زمان صرف‌شده روی صفحه','Total time spent on page','ts'], ts_user:['زمان صرف‌شده به ازای هر کاربر','Time spent per user','ts'],
  ts_page:['زمان صرف‌شده به ازای هر صفحه','Time spent per page','ts'], ts_session:['زمان صرف‌شده به ازای هر نشست','Time spent per session','ts'],
  sess_per_user:['میانگین نشست به ازای هر کاربر','Average sessions per user','ratio'], events_per_session:['ایونت به ازای هر نشست','Events per session','ratio'] };
function tMeta(m){ return T_OOTB[m]||T_XM[m]||['?','?','n']; }
function tIsTs(c){ return c&&c.kind==='metric'&&tMeta(c.metric)[2]==='ts'; }
var T_TUNIT={ sec:['ثانیه','seconds',1], min:['دقیقه','minutes',60], hour:['ساعت','hours',3600] };
var T_ATTR={ first:['اولین تماس','First touch'], last:['آخرین تماس','Last touch'], lnd:['آخرین تماس غیرمستقیم','Last non-direct touch'], linear:['خطی','Linear'],
  ushape:['U شکل','U-shaped'], jshape:['J شکل','J-shaped'], ijshape:['J وارونه','Inverse J-shaped'], part:['مشارکت','Participation'], dd:['داده‌محور','Data driven'] };
/* 6b. Position weights (first / middle / last) under Amplitude's custom-weight rule: the middle share spreads evenly over the
   touches in between; with none, first and last each get half of it. So U at 2 touches = 50/50, J = 30/70, Inverse J = 70/30,
   U at 4 = 40/10/10/40. The doc prints J at 4 touches as 10/10/20/60, which contradicts its own rule and 3-touch example
   (spec 21 §21b); the rule wins here. */
var T_POS={ ushape:[40,20,40], jshape:[20,20,60], ijshape:[60,20,20] };
/* custom models (project owner / admin; PM 2026-10-25, TG-4: Amplitude's Manager = Shahin's admin): weights, a default lookback that can be locked, sharing, values that aren't touch points */
var T_CUSTOM=[{ id:'cm1', fa:'وزن بیشتر برای کشف', en:'Discovery-weighted', dFa:'اولین آشنایی سهم بیشتری می‌گیرد؛ بدون کمپین تماس حساب نمی‌شود.', dEn:'The first touch gets more; no-campaign visits aren’t touches.', w:[50,20,30], lb:30, lock:true, shared:true, excl:['No campaign','Direct'], owner:'pm' }];
/* the demo's project role (Amplitude gates verify / custom models by role): ?prole=owner|admin|member|viewer
   PM 2026-10-25, TG-4: Shahin's roles; there is no separate "manager" (manager = admin), so an old ?prole=manager reads as admin; default admin */
var PROLE=(function(){ var r=new URLSearchParams(location.search).get('prole'); return r==='owner'||r==='member'||r==='viewer'?r:'admin'; })();
/* PM 2026-10-25, UC-5: a viewer is ?prole=viewer or the shell's ?role=viewer */
var IS_VIEWER=PROLE==='viewer'||new URLSearchParams(location.search).get('role')==='viewer';
function canManage(){ return PROLE==='owner'||PROLE==='admin'; }
function tCustom(m){ return T_CUSTOM.filter(function(x){ return x.id===m; })[0]; }
function tAttrName(m){ var cm=tCustom(m); return cm?T(cm.fa,cm.en):T_ATTR[m]?T(T_ATTR[m][0],T_ATTR[m][1]):m; }
/* what an attributed column measures, for the support matrix (spec §10.9) */
function tAttrMeas(c){ if(!c) return null; if(c.kind==='ev') return { uniques:'uniques', totals:'totals', psum:'psum' }[c.meas||'uniques']||null;
  if(c.kind==='metric') return c.metric==='session_totals'?'sess':null; if(c.kind==='conv') return 'conv'; if(c.kind==='formula') return 'formula'; return null; }
/* Uniques: first, last, last non-direct, participation, data driven. Conversion: first, last, participation. Event totals: all.
   Property sum, formula, session totals: all but data driven. A persisted row property allows only last touch and linear. */
function tAttrOk(c, model, TB){
  var m=tAttrMeas(c), base=tCustom(model)?'custom':model; if(!m||(c.ee&&c.ee!=='default')) return false;
  if(TB&&TB.gbs[0]&&TB.persist&&TB.persist[TB.gbs[0]]&&base!=='last'&&base!=='linear') return false;
  if(m==='uniques') return ['first','last','lnd','part','dd'].indexOf(base)>-1;
  if(m==='conv') return ['first','last','part'].indexOf(base)>-1;
  if(m==='totals') return true;
  return base!=='dd'; }
function tAttrWhy(c, model, TB){ var m=tAttrMeas(c);
  if(TB&&TB.gbs[0]&&TB.persist&&TB.persist[TB.gbs[0]]) return T('با ویژگی ماندگار فقط آخرین تماس و خطی','With a persisted property: last touch and linear only');
  return m==='uniques'?T('برای کاربران نه؛ «تعداد دفعات» را انتخاب کنید','Not for users; use event totals'):m==='conv'?T('برای ستون تبدیل فقط اولین، آخرین و مشارکت','Conversion columns: first, last and participation only'):T('برای این سنجش در دسترس نیست','Not available for this measure'); }
/* one shared set of simulated touch paths per (row property, lookback, column): converting paths (first touch tilted to discovery,
   last to closing) and non-converting ones with a different mix. Every model reads the same paths, so models compare fairly.
   Consecutive identical values are one touch point; a longer lookback sees more touches. */
var T_PCACHE={};
function tPaths(rowsP, lb, seed){
  var key=rowsP+'|'+lb+'|'+seed; if(T_PCACHE[key]) return T_PCACHE[key];
  var sh=tNorm(tShares(rowsP,null,seed)), f=tNorm(tShares(rowsP,'first',seed+'f')), l=tNorm(tShares(rowsP,'last',seed+'l')), x=tNorm(tShares(rowsP,'exit',seed+'n')),
    mean=lb<=7?1.45:lb<=30?2.05:2.7, out={ conv:[], non:[] };
  function pick(w,u){ var a=0; for(var i=0;i<w.length;i++){ a+=w[i]; if(u<a) return i; } return w.length-1; }
  function merge(p){ var m=[]; p.forEach(function(v){ if(m[m.length-1]!==v) m.push(v); }); return m; }
  for(var k=0;k<900;k++){ var L=Math.min(6, 1+Math.floor(-Math.log(1-0.999*jitter(key+'L',k))*(mean-1))), p=[];
    for(var t=0;t<L;t++) p.push(pick(t===0?f:t===L-1?l:sh, jitter(key+'v'+t,k)));
    out.conv.push(merge(p)); }
  for(var j=0;j<2700;j++){ var Ln=1+Math.floor(jitter(key+'nL',j)*2.2), q=[];
    for(var t2=0;t2<Ln;t2++) q.push(pick(t2===0?sh:x, jitter(key+'nv'+t2,j)));
    out.non.push(merge(q)); }
  return (T_PCACHE[key]=out); }
/* first-order Markov removal effect: transition counts from every path (converting ones end in «conv», the rest in «null»);
   removing a value sends its transitions to null; credit is proportional to the drop in conversion probability */
function tMarkov(paths, nv){
  var C=nv, N=nv+1, S=nv+2, M=[]; for(var i=0;i<=S;i++){ M.push(new Array(nv+2).fill(0)); }
  function add(p, end){ var prev=S; p.forEach(function(v){ M[prev][v]++; prev=v; }); M[prev][end]++; }
  paths.conv.forEach(function(p){ add(p,C); }); paths.non.forEach(function(p){ add(p,N); });
  M=M.map(function(r){ var s=r.reduce(function(a,b){ return a+b; },0)||1; return r.map(function(x){ return x/s; }); });
  function prob(rem){ var v=new Array(nv).fill(0);
    for(var it=0;it<80;it++){ v=v.map(function(_,a){ if(a===rem) return 0; var s=M[a][C]; for(var b=0;b<nv;b++) if(b!==rem) s+=M[a][b]*v[b]; return s; }); }
    var s0=0; for(var b=0;b<nv;b++) if(b!==rem) s0+=M[S][b]*v[b]; return s0; }
  var base=prob(-1)||1e-9, re=[]; for(var r=0;r<nv;r++) re.push(Math.max(0, 1-prob(r)/base));
  return re; }
/* credit per value from the shared paths; returns { w: weights per value, total: credited conversions as a share of all
   (1 for full models, W/100 when custom weights don't total 100%, less when excluded values leave a path empty), over: rows can exceed Overall } */
function tCredit(paths, P, model){
  var nv=P.vals.length, cr=new Array(nv).fill(0), cm=tCustom(model), pos=cm?cm.w:T_POS[model], excl=cm?cm.excl||[]:[], n=paths.conv.length, credited=0;
  if(model==='dd'){ var re=tMarkov(paths, nv); return { w:tNorm(re), total:1 }; }
  if(model==='part'){ paths.conv.forEach(function(p){ p.filter(function(v,i){ return p.indexOf(v)===i; }).forEach(function(v){ cr[v]++; }); }); return { w:cr.map(function(x){ return x/n; }), total:1, over:true }; }
  paths.conv.forEach(function(p0){
    var p=excl.length?p0.filter(function(v){ return excl.indexOf(P.vals[v][1])<0&&excl.indexOf(P.vals[v][0])<0; }):p0, L=p.length; if(!L) return;
    if(excl.length){ var m=[]; p.forEach(function(v){ if(m[m.length-1]!==v) m.push(v); }); p=m; L=p.length; }
    credited++;
    if(model==='first') cr[p[0]]++;
    else if(model==='last') cr[p[L-1]]++;
    else if(model==='lnd'){ var k=L-1; while(k>0&&tDirect(P.vals[p[k]])) k--; cr[p[k]]++; }   /* an all-direct path keeps its last touch */
    else if(model==='linear') p.forEach(function(v){ cr[v]+=1/L; });
    else if(pos){ var wF=pos[0]/100, wM=pos[1]/100, wL=pos[2]/100;
      if(L===1) cr[p[0]]+=wF+wM+wL;
      else if(L===2){ cr[p[0]]+=wF+wM/2; cr[p[1]]+=wL+wM/2; }
      else { cr[p[0]]+=wF; cr[p[L-1]]+=wL; for(var t=1;t<L-1;t++) cr[p[t]]+=wM/(L-2); } } });
  var sum=cr.reduce(function(a,b){ return a+b; },0);
  return { w:tNorm(cr), total:sum/n, uncredited:n-credited }; }
var T_MAXCOL=10, T_TOPN=25;
/* PM 2026-10-25, AC-3: the Data Table takes the builder's shared Top N control (default 25; 0 = all rows). CSV export stops at a cap that
   Engineering sets (placeholder below) and the toast states the cut. */
var T_TOPN_OPTS=[3,5,10,20,25,30,0], T_CSV_CAP=10000;
function tTopN(TB){ return TB.topN===0?Infinity:(TB.topN||T_TOPN); }
var TTIPS={
  grid:["<span class='tip-title'>جدول متریک‌ها</span>چند متریک کنار هم، به تفکیک مقدارهای یک ویژگی؛ هر خانه برای همان ردیف جدا حساب می‌شود و ردیف «کل» پرسش جداگانه است، نه جمع ردیف‌ها.","<span class='tip-title'>Data table</span>Several metrics side by side, broken down by a property’s values; each cell is computed for its own row, and the Overall row is a separate query, not a sum of the rows."],
  overall:["<span class='tip-title'>کل</span>همین متریک روی همهٔ داده، جدا از ردیف‌ها؛ برای کاربران و نشست‌ها جمع ردیف‌ها از «کل» بیشتر می‌شود، چون یک نفر یا یک نشست می‌تواند چند مقدار داشته باشد.","<span class='tip-title'>Overall</span>The same metric on all the data, separate from the rows; for users and sessions the rows add up to more than Overall, because one person or session can carry several values."],
  cols:["<span class='tip-title'>ستون‌ها</span>هر ستون یک ایونت یا متریک است با «سنجش بر اساس» خودش؛ متریک‌های آماده مثل نرخ پرش و نشست‌ها از تب «متریک‌ها» می‌آیند.","<span class='tip-title'>Columns</span>Each column is an event or metric with its own “measured as”; ready-made metrics such as bounce rate and sessions come from the Metrics tab."],
  rows:["<span class='tip-title'>ردیف‌ها</span>ویژگی‌ای که ردیف‌ها را می‌سازد؛ تا ۵ ویژگی سطح بالا و برای هر کدام یک تفکیک تودرتو. ویژگی زمان باید آخرین تفکیک باشد.","<span class='tip-title'>Rows</span>The property that makes the rows; up to five top-level properties, each with one nested breakdown. A time property must be the last breakdown."],
  attr:["<span class='tip-title'>اتریبیوشن</span>هر تبدیل به کدام مقدار ورودی نسبت داده شود: اولین یا آخرین تماس در بازهٔ نگاه به عقب، آخرین تماس غیرمستقیم، تقسیم مساوی (خطی) یا اعتبار کامل به همه (مشارکت). کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، پس کسی که بدون ورود با موبایل آمده و با لپ‌تاپ خریده دو نفر حساب می‌شود.","<span class='tip-title'>Attribution</span>Which source value each conversion is credited to: the first or last touch in the lookback window, the last non-direct touch, an equal split (linear), or full credit to all (participation). An anonymous user counts once per device, so someone who arrived on a phone without logging in and converted on a laptop counts as two."],
  ee:["<span class='tip-title'>تحلیل ورود/خروج</span>«ورود»: هر نشست با اولین مقدار ویژگی‌اش گروه‌بندی می‌شود (مثل صفحهٔ فرود)؛ «خروج»: با آخرین مقدار. در این حالت هر نشست یک ردیف دارد، پس ردیف‌ها با «کل» جمع می‌خورند.","<span class='tip-title'>Entry/Exit analysis</span>Entry: each session is grouped by its first value of the property (such as the landing page); Exit: by its last. Each session then has one row, so rows add up to Overall."],
  pos:["<span class='tip-title'>مدل‌های موقعیتی</span>اعتبار هر تبدیل بر اساس جای تماس در مسیر تقسیم می‌شود: سهم اولین تماس، سهم آخرین تماس و سهم میانی که مساوی بین تماس‌های وسط پخش می‌شود؛ اگر تماس میانی نباشد، سهم میانی نصف‌نصف به اولین و آخرین می‌رسد.","<span class='tip-title'>Position-based models</span>Each conversion’s credit is split by a touch’s position in the path: a share for the first touch, a share for the last, and a middle share spread evenly over the touches in between; with no middle touch, the middle share goes half to the first and half to the last."],
  dd:["<span class='tip-title'>داده‌محور</span>سهم هر مقدار به اندازهٔ افتی است که حذفش از مسیرها در تبدیل می‌سازد (زنجیرهٔ مارکوف مرتبهٔ اول)؛ برای کاربران و تعداد دفعات، نه برای مجموع ویژگی، فرمول یا نشست‌ها.","<span class='tip-title'>Data driven</span>Each value’s share equals the drop in conversion when it is removed from the paths (a first-order Markov chain); for users and event totals, not for property sums, formulas or sessions."],
  sf:["<span class='tip-title'>فیلتر نشست</span>فقط نشست‌هایی شمرده می‌شوند که این شرط را دارند؛ شرط روی کل نشست سنجیده می‌شود و روی فیلترهای کلی جدول اضافه می‌شود.","<span class='tip-title'>Session filter</span>Only sessions that meet this condition count; the condition is evaluated on the whole session and stacks on the table’s global filters."],
  scope:["<span class='tip-title'>تفکیک از کل نشست / فقط از ایونت فیلترشده</span>وقتی متریک نشست فیلتر ایونت دارد، مقدار ردیف از همهٔ ایونت‌های نشست گرفته شود یا فقط از ایونتی که فیلتر را دارد.","<span class='tip-title'>Session level / Event level</span>When a session metric has an event filter, take the row’s value from every event in the session, or only from the events that match the filter."],
  ts:["<span class='tip-title'>زمان صرف‌شده</span>فاصلهٔ هر بازدید صفحه تا بازدید بعدی در همان نشست، با سقف ۳۰ دقیقه؛ آخرین صفحهٔ هر نشست و نشست‌های تک‌صفحه‌ای زمان ندارند، پس مخرج‌ها فقط موارد با زمان را می‌شمارند. در فرمول به کار نمی‌رود.","<span class='tip-title'>Time spent</span>The gap from each page view to the next in the same session, capped at 30 minutes; a session’s last page and single-page sessions have no time, so denominators count only items with time. Not usable in formulas."],
  hyb:["<span class='tip-title'>فرمول ترکیبی</span>ورودی‌های ایونت (A، B…) و ورودی‌های نشست (S، T…) در یک عبارت؛ مثلاً اشتراک به ازای هر نشست = A/S. هر ردیف از ورودی‌های همان ردیف حساب می‌شود.","<span class='tip-title'>Hybrid formula</span>Event inputs (A, B…) and session inputs (S, T…) in one expression; e.g. subscriptions per session = A/S. Each row is computed from that row’s inputs."],
  conv:["<span class='tip-title'>ستون تبدیل (قیف)</span>نرخ تبدیل یک قیف برای هر ردیف: سهم کسانی که قدم اول را انجام داده‌اند و در پنجرهٔ تبدیل به قدم آخر رسیده‌اند؛ عدد «کل» همان نرخ تب قیف است.","<span class='tip-title'>Conversion column (funnel)</span>A funnel’s conversion rate for each row: the share of people who did the first step and reached the last within the conversion window; Overall is the same rate the Funnel tab shows."],
  persist:["<span class='tip-title'>ویژگی ماندگار</span>مقدار ویژگی تا پایان نشست یا چند روز روی ایونت‌های بعدی همان کاربر می‌ماند؛ مثلاً صفحهٔ فرود روی همهٔ بازدیدهای همان نشست. با این ویژگی بازه حداکثر ۶ ماه است.","<span class='tip-title'>Persisted property</span>The property’s value stays on the same user’s later events until the session ends or for a set number of days; e.g. the landing page on every view in that session. With it, the range is at most 6 months."],
  chan:["<span class='tip-title'>کانال</span>ترافیک ورودی با قاعده‌هایی روی UTM و نوع ورودی در کانال‌های نام‌دار دسته‌بندی می‌شود؛ قاعده‌ها هنگام گزارش اعمال می‌شوند، پس تغییرشان روی گذشته هم اثر دارد.","<span class='tip-title'>Channel</span>Incoming traffic is grouped into named channels by rules on UTM and referrer type; the rules apply at query time, so changing them also changes past data."],
  excl:["<span class='tip-title'>حذف روزهای هفته</span>روزهای انتخاب‌شدهٔ هفته از محاسبه و نمودار کنار می‌روند؛ مثلاً جمعه‌ها. با مقایسه با گذشته هم‌زمان نمی‌شود.","<span class='tip-title'>Exclude specific days</span>The selected weekdays drop out of the calculation and the chart, e.g. Fridays. Not available together with period-over-period comparison."]
};
function blankTable(){ return { cols:[], gbs:[], nest:{}, disp:'abs', bars:true, cmp:'', cmp2:'', cdmode:'pct', sortCol:0, sortDir:'desc', topN:25, open:{}, persist:{}, cdelta:false, tr:false, w:{}, exclDays:[] }; }
function isTable(){ return RB.Q.type==='table'; }
/* Block A (2026-10-24): time group-bys by day, week and month (Amplitude multi-dimensional analysis), built from the chart's range;
   with hour of day and weekday they form the time group-bys, which must come last (nested under a property, never above one). */
var T_TIME=['_t_day','_t_week','_t_month','hour_of_day','weekday'];
function tIsTime(p){ return T_TIME.indexOf(p)>-1; }
function tTimeProps(){
  var R=RB.rangeInfo(), end=R.mode==='custom'?rEnd(R):R.mode==='yesterday'?new Date(2026,6,26):new Date(2026,6,27), days=Math.max(1,R.days);
  var fD=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long' }), eD=new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' });
  var fM=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ month:'long', year:'numeric' }), eM=new Intl.DateTimeFormat('en-u-ca-persian',{ month:'short', year:'numeric' });
  function build(step, n, lab){ var out=[], k; for(k=n-1;k>=0;k--){ var d=new Date(end.getTime()-k*step*864e5), w=Math.min(step, days-k*step)||step; out.push([lab[0](d), lab[1](d), w*(0.9+0.2*jitter('tt'+step,k))]); }
    var tot=out.reduce(function(a,v){ return a+v[2]; },0)||1; return out.map(function(v){ return [v[0],v[1],v[2]/tot]; }); }
  RB.PROPS._t_day={ grp:'time', fa:'روز', en:'Day', vals:build(1, Math.min(days,31), [function(d){ return fD.format(d); },function(d){ return eD.format(d); }]) };
  RB.PROPS._t_week={ grp:'time', fa:'هفته', en:'Week', vals:build(7, Math.min(Math.ceil(days/7),26), [function(d){ return 'هفتهٔ '+fD.format(d); },function(d){ return 'Week of '+eD.format(d); }]) };
  RB.PROPS._t_month={ grp:'time', fa:'ماه', en:'Month', vals:build(30.44, Math.min(Math.max(1,Math.round(days/30.44)),12), [function(d){ return fM.format(d); },function(d){ return eM.format(d); }]) };
}
tTimeProps();
function tProp(p){ return RB.PROPS[p]; }
/* overlap factor: how much a row-level unique/session count over-counts (user- or session-level props barely; event-level props more) */
function tOverlap(p, seed){ var g=(tProp(p)||{}).grp; if(g==='time') return { _t_day:2.2, _t_week:1.45, _t_month:1.12 }[p]||1.3;   /* the same person comes back on other days, so daily users add up to more than the period's */
  return g==='dev'||g==='geo'||g==='ses'?1:1.12+0.22*jitter(p+seed,1); }
/* session metrics (Amplitude: "Session metrics can't combine more than one top-level group-by") */
function tIsSess(c){ return c.kind==='metric'&&['rate','ratio','sess','dur'].indexOf(tMeta(c.metric)[2])>-1; }
function tHasSess(){ return A.table.cols.some(tIsSess); }
function tColName(c){ if(c.label) return c.label; if(c.kind==='metric') return T(tMeta(c.metric)[0],tMeta(c.metric)[1]); if(c.kind==='formula') return '\u2066'+c.formula+'\u2069'; if(c.kind==='hybrid') return '\u2066'+c.expr+'\u2069'; if(c.kind==='conv') return T('تبدیل: ','Conversion: ')+c.steps.map(evName).join(' → '); return evName(c.ev); }
function tColLetter(i){ return LET[i]||String(i+1); }
/* per-row shares of a property's values: default, or tilted for entry (landing) and exit, or attribution touches */
function tShares(p, mode, seed){ var P=tProp(p); if(!P) return [];
  return P.vals.map(function(v,i){ var t=mode==='entry'?(/^\/$|Home|صفحهٔ اصلی|Organic|google/.test(v[1])?1.5:0.85):mode==='exit'?(/checkout|product|Other|سایر/.test(v[1])?1.3:0.9):1; return v[2]*t*(0.88+0.24*jitter(seed+p+(mode||''),i)); }); }
function tSessScope(P){ return ['ref','utm','dev','geo','ses'].indexOf(P.grp)>-1; }
/* memoised: the metric explorer and the Data Table call a column once per day and row; the shares depend only on these inputs */
var SEGSH={}, SEGSH_N=0;
function tSegShares(p, filters, evId){ var key=JSON.stringify([p, filters||[], evId||'session_start', RB.Q.range, RB.Q.filters, RB.rangeInfo().mode, RB.PROJECT]);
  if(SEGSH.hasOwnProperty(key)) return SEGSH[key]; if(++SEGSH_N>300){ SEGSH={}; SEGSH_N=1; } return (SEGSH[key]=tSegShares0(p, filters, evId)); }
/* the Segmentation chart's page-view users per value (users can carry several values, so these don't add up to the total) */
function tSegUniques(p, filters){ var key=JSON.stringify(['u', p, filters||[], RB.Q.range, RB.Q.filters, RB.rangeInfo().mode, RB.PROJECT]);
  if(SEGSH.hasOwnProperty(key)) return SEGSH[key]; if(++SEGSH_N>300){ SEGSH={}; SEGSH_N=1; }
  var v=null; try{ var P=tProp(p), r=compute(norm(clone({ events:[{ id:'page_view', filters:filters||[], groupBy:p }], measure:'uniques', interval:'auto', viz:'line', rows:25 })), { range:RB.Q.range, filters:RB.Q.filters });
    v=P.vals.map(function(x){ var s=r.series.filter(function(y){ return y.group===x[1]||y.group===x[0]; })[0]; return s?Math.round(s.total):0; }); if(!v.some(function(x){ return x>0; })) v=null; }catch(e){ v=null; }
  return (SEGSH[key]=v); }
function tSegShares0(p, filters, evId){ try{ var P=tProp(p), r=compute(norm(clone({ events:[{ id:evId||'session_start', filters:filters||[], groupBy:p }], measure:'totals', interval:'auto', viz:'line', rows:25 })), { range:RB.Q.range, filters:RB.Q.filters });
  var v=P.vals.map(function(x){ var s=r.series.filter(function(y){ return y.group===x[1]||y.group===x[0]; })[0]; return s?s.total:0; }), t=v.reduce(function(a,b){ return a+b; },0); return t?tNorm(v):null; }catch(e){ return null; } }
function tPersistTilt(pp){ return pp.alloc==='original'||pp.alloc==='firstk'?'entry':pp.alloc==='lastk'?'exit':null; }
function tNorm(a){ var s=a.reduce(function(x,y){ return x+y; },0)||1; return a.map(function(x){ return x/s; }); }
function tDirect(v){ return /Direct|مستقیم|No campaign|بدون کمپین|\(none\)/.test(v[1]+'|'+v[0]); }
/* overall and per-row values of one column for one segment */
function tColumn(st, c, ci, sg, rowsP){
  if(c.kind==='hybrid') return tHybrid(st, c, ci, sg, rowsP);
  if(c.kind==='conv') return tConv(st, c, ci, sg, rowsP);
  var R=RB.rangeInfo(), P=rowsP?tProp(rowsP):null, seed=c.ev+(c.metric||'')+ci, out={ overall:null, rows:[], unit:'n', additive:false };
  var ev=c.kind==='metric'?'page_view':c.ev, e={ id:ev, filters:c.filters||[] }, uni=baseSeries(e,true), tot=baseSeries(e,false), sf=segFactor(sg, e, RB.periodUniques(uni));
  var U=Math.round(RB.periodUniques(uni)*(sf?sf.share:1)), Tt=Math.round(RB.sum(tot)*(sf?sf.share*sf.tilt:1));
  var ssn=Math.round(RB.sum(baseSeries({ id:'session_start', filters:c.filters||[] },false))*(sf?sf.share:1)), pvT=Math.round(RB.sum(baseSeries({ id:'page_view', filters:c.filters||[] },false))*(sf?sf.share:1));
  /* excluded weekdays drop out of every count (uniques less than proportionally: a person seen on other days still counts) */
  var dF=tDayFactor(st.table, R); if(dF<1){ U=Math.round(U*Math.pow(dF,0.75)); Tt=Math.round(Tt*dF); ssn=Math.round(ssn*dF); pvT=Math.round(pvT*dF); }
  /* inline session filters stack on the global filters and are evaluated per session */
  var sfx=tIsSess(c)||tIsTs(c)?tSessFilter(c, ssn, rowsP):null; if(sfx){ ssn=Math.round(ssn*sfx.f); pvT=Math.round(pvT*sfx.f*sfx.pv); U=Math.round(U*Math.pow(sfx.f,0.8)); }
  var mode=c.ee&&c.ee!=='default'?c.ee:null, pp=P&&st.table.persist&&st.table.persist[rowsP], sh=P?(P.multi?tShares(rowsP, mode||(pp?tPersistTilt(pp):null), seed):tNorm(tShares(rowsP, mode||(pp?tPersistTilt(pp):null), seed))):[], ov=P?tOverlap(rowsP, seed):1;
  /* a persisted value rides on the user's later events: fewer values per person (more so for a multi-day expiry); excluded values never persist */
  if(pp){ ov=1+(ov-1)*(pp.exp==='days'?0.15:0.35); if((pp.excl||[]).length){ sh=tNorm(sh.map(function(x,i){ return pp.excl.indexOf(P.vals[i][1])>-1?0:x; })); } }
  /* phase 4b: a session-scoped property (referrer, campaign, device, location) is set once per session, so its rows take the very
     shares the Segmentation chart draws for session_start broken down by it — the Data Table and the trend never disagree
     (it used to tilt «entry» towards Organic/google like a landing page: 56% of sessions in the table, 41% in the chart) */
  if(P&&!pp&&tSessScope(P)){ var segSh=tSegShares(rowsP, c.filters); if(segSh) sh=segSh; }
  if(sfx&&sfx.only!=null&&P) sh=sh.map(function(x,i){ return i===sfx.only?1:0; });   /* a first/last-value filter on the row property keeps that row only */
  /* Event level: a session metric with an event filter takes row values from the filtered events only, so a session lands in fewer rows */
  if(c.scope==='event'&&tIsSess(c)&&(c.filters||[]).length) ov=1+(ov-1)*0.25;
  var kind=c.kind==='metric'?tMeta(c.metric)[2]:c.meas;
  function alloc(n){ return jAlloc(n, sh); }
  /* a user (or, by default, a session) can carry several values; in Entry/Exit a session has one, but a user with several sessions can still land in several rows */
  function overlapRows(n, sessLevel){ var f=mode?(sessLevel?1:1+(ov-1)*0.4):ov; return sh.map(function(s,i){ return Math.round(n*s*f*(0.94+0.12*jitter(seed+'o',i))); }); }
  if(c.kind==='metric'){
    var m=c.metric;
    if(m==='visitors'){ out.overall=U; var segU=P&&!pp?tSegUniques(rowsP, c.filters):null; out.rows=segU||overlapRows(U); }   /* phase 4b: a row's users = the Segmentation chart's users for that value */
    else if(m==='page_views'){ out.overall=pvT; var pvSh=P&&!pp?tSegShares(rowsP, c.filters, 'page_view'):null; out.rows=pvSh?jAlloc(pvT, pvSh):alloc(pvT); out.additive=true; }   /* phase 4b: the Segmentation chart's page-view split, so the table and the chart agree */
    else if(m==='session_totals'){ var one=mode||(P&&tSessScope(P)); out.overall=ssn; out.rows=one?alloc(ssn):overlapRows(ssn); out.additive=!!one; }   /* a session-scoped value: each session has exactly one */
    else if(m==='session_entries'||m==='session_exits'){ var se=tNorm(tShares(rowsP||'page_path', m==='session_entries'?'entry':'exit', seed)); out.overall=ssn; out.rows=P?jAlloc(ssn, se):[]; out.additive=true; }
    else if(m==='bounce_rate'||m==='entry_rate'||m==='exit_rate'||m==='pv_per_session'||m==='avg_session_duration'){
      var sess=P?(tSessScope(P)?alloc(ssn):overlapRows(ssn)):[], ent=P?jAlloc(ssn, tNorm(tShares(rowsP,'entry',seed))):[], ext=P?jAlloc(ssn, tNorm(tShares(rowsP,'exit',seed))):[];
      var sb=tSessBase(c, sf);
      if(m==='bounce_rate'){   /* Overall is its own query (never depends on the row property); rows are scaled so their entry-weighted mean equals it */
        out.overall=+(sb.b*100).toFixed(1);
        if(P){ var br=ent.map(function(x,i){ return sb.b*(0.75+0.5*jitter(seed+'b',i)); }), wsum=ent.reduce(function(a,x,i){ return a+x*br[i]; },0), kb=wsum?sb.b*ssn/wsum:1;
          out.rows=ent.map(function(x,i){ return x?+(Math.min(0.95,br[i]*kb)*100).toFixed(1):null; }); } }
      else if(m==='entry_rate'){ out.overall=100; out.rows=sess.map(function(x,i){ return x?+(Math.min(ent[i],x)/x*100).toFixed(1):null; }); }   /* Amplitude: overall entry and exit rates are always 100% */
      else if(m==='exit_rate'){ out.overall=100; out.rows=sess.map(function(x,i){ return x?+(Math.min(ext[i],x)/x*100).toFixed(1):null; }); }
      else if(m==='pv_per_session'){ var pvr=alloc(pvT); out.overall=ssn?+(pvT/ssn).toFixed(2):0; out.rows=sess.map(function(x,i){ return x?+(pvr[i]/x).toFixed(2):null; }); }
      else { out.overall=Math.round(sb.d);
        if(P){ var dur=sess.map(function(x,i){ return sb.d*(0.6+0.8*jitter(seed+'d',i)); }), dw=sess.reduce(function(a,x,i){ return a+x*dur[i]; },0), sw=sess.reduce(function(a,b){ return a+b; },0)||1, kd=dw?sb.d*sw/dw:1; out.rows=dur.map(function(x){ return Math.round(x*kd); }); } }
      out.unit=m==='avg_session_duration'?'sec':m==='pv_per_session'?'dec':'pct';
    }
    else if(m==='sess_per_user'||m==='events_per_session'){ var sR=overlapRows(ssn), uR=overlapRows(U), num0=m==='sess_per_user'?ssn:Math.round(pvT*2.3), den0=m==='sess_per_user'?U:ssn;
      out.overall=den0?+(num0/den0).toFixed(2):0; out.rows=sh.map(function(x,i){ var d=m==='sess_per_user'?uR[i]:sR[i]; return d?+(out.overall*(0.82+0.36*jitter(seed+'q',i))).toFixed(2):null; }); out.unit='dec'; }
    else if(tIsTs(c)){
      /* time spent = gap to the next page view in the session (30-minute cap); a session's last page and single-page sessions have no time.
         The window resets when an event-level row value changes, so rows add up to at most Overall; denominators count only items with time. */
      var evLvl=P&&['page','ref','utm'].indexOf(P.grp)>-1, pvr=P?alloc(pvT):[], sx=P?jAlloc(ssn, tNorm(tShares(rowsP,'exit',seed))):[], secs=sh.map(function(x,i){ return 35+115*jitter(seed+'ts',i); });
      var meas=pvr.map(function(x,i){ return Math.max(0,x-sx[i]); }), tRow=meas.map(function(x,i){ return x*secs[i]*(1-(evLvl?0.06+0.1*jitter(seed+'rs',i):0)); });
      var mAll=Math.max(0,pvT-ssn), Tall=P?meas.reduce(function(a,x,i){ return a+x*secs[i]; },0):mAll*(35+115*jitter(seed+'ts0',0)), uT=Math.max(1,Math.round(U*0.65)), sT=Math.max(1,Math.round(ssn*0.58));
      if(m==='ts_total'){ out.overall=Math.round(Tall); out.rows=tRow.map(Math.round); }
      else if(m==='ts_page'){ var mm=P?meas.reduce(function(a,b){ return a+b; },0):mAll; out.overall=mm?Tall/mm:0; out.rows=meas.map(function(x,i){ return x?tRow[i]/x:null; }); }
      else if(m==='ts_user'){ var ur=overlapRows(uT); out.overall=Tall/uT; out.rows=ur.map(function(x,i){ return x?tRow[i]/x:null; }); }
      else { var sr=overlapRows(sT); out.overall=Tall/sT; out.rows=sr.map(function(x,i){ return x?tRow[i]/x:null; }); }
      out.unit='ts'; out.tunit=c.tunit||'sec'; }
  } else if(c.kind==='formula'){ /* filled in by tCompute from the other columns */ }
  else {
    var k=c.meas||'uniques';
    if(k==='uniques'){ out.overall=U; out.rows=P?overlapRows(U):[]; }
    else if(k==='totals'){ out.overall=Tt; out.rows=P?alloc(Tt):[]; out.additive=true; }
    else if(k==='avg'){ out.overall=U?+(Tt/U).toFixed(2):0; out.rows=sh.map(function(s,i){ return +((Tt/Math.max(1,U))*(0.8+0.4*jitter(seed+'a',i))).toFixed(2); }); out.unit='dec'; }
    else if(k==='active'){ var act=Math.max(U, Math.round(RB.periodUniques(baseSeries({ id:'_any_active', filters:[] },true))*(sf?sf.share:1))); out.overall=+(U/act*100).toFixed(1); out.rows=sh.map(function(s,i){ return Math.min(100,+(out.overall*(0.75+0.5*jitter(seed+'p',i))).toFixed(1)); }); out.unit='pct'; }
    else if(k==='psum'||k==='pavg'){ var mean=(NUMP[c.prop]||{ mean:1 }).mean, sum=Math.round(Tt*mean), parts=P?alloc(sum):[]; out.overall=k==='psum'?sum:Math.round(mean); out.rows=k==='psum'?parts:sh.map(function(s,i){ return Math.round(mean*(0.8+0.4*jitter(seed+'m',i))); }); out.additive=k==='psum'; out.unit=k==='psum'?'cur':'cur'; }
    /* PM 2026-10-30, LX-24: a revenue metric's «درآمد هر کاربر» column — the amount sum ÷ the period's active users (the builder's ARPAU) */
    else if(k==='parpu'){ var am=(NUMP[c.prop]||{ mean:1 }).mean, act2=Math.max(U, Math.round(RB.periodUniques(baseSeries({ id:'_any_active', filters:[] },true))*(sf?sf.share:1))), rs=Math.round(Tt*am);
      out.overall=act2?Math.round(rs/act2):0; out.rows=sh.map(function(s,i){ return Math.round(out.overall*(0.8+0.4*jitter(seed+'r',i))); }); out.unit='cur'; }
  }
  /* attribution: credit each conversion to touch values of the outermost row property; inner group-bys inherit (spec §10.10) */
  if(c.attr && P && c.kind!=='formula' && tAttrOk(c, c.attr.model, st.table)) tAttribute(out, c, P, rowsP, seed);
  return out;
}
function tAttribute(out, c, P, rowsP, seed){
  var cm=tCustom(c.attr.model), lb=cm&&cm.lock?cm.lb:(c.attr.lb||30), cr=tCredit(tPaths(rowsP, lb, seed), P, c.attr.model), mm=tAttrMeas(c);
  if(mm==='conv'){   /* conversion columns: a row's rate = conversions credited to it ÷ people who did the first step with that value */
    var ent=out.entrants, conv=Math.round(ent.overall*out.overall/100), num=cr.over?cr.w.map(function(x){ return Math.round(conv*x); }):jAlloc(conv, cr.w);
    out.rows=ent.rows.map(function(e,i){ return e?+(Math.min(100, num[i]/e*100)).toFixed(1):null; }); out.attributed=c.attr.model; out.partOver=!!cr.over; return; }
  var n=out.overall;
  if(mm==='uniques'){   /* a person with several conversions can be credited to several values, so user rows never sum to Overall (spec §21b-5) */
    out.rows=cr.w.map(function(x,i){ var r=Math.round(n*x*(1+0.18*(1-x)*jitter(seed+'au',i))); return cr.over?Math.min(n, Math.round(n*x)):r; });
    out.additive=false; out.partOver=!!cr.over; out.attributed=c.attr.model; return; }
  if(cr.over){ out.rows=cr.w.map(function(x){ return Math.round(n*x); }); out.additive=false; out.partOver=true; }   /* participation: full credit to every value touched */
  else { var tot=Math.round(n*cr.total); out.rows=jAlloc(tot, cr.w); out.additive=tot===n; if(tot!==n) out.creditGap={ total:tot, n:n, why:cr.uncredited?'excl':'weights' }; }
  out.attributed=c.attr.model; }
/* Amplitude "Exclude specific days": weekdays (not dates); Last and Since ranges only; not with period over period */
var T_WDAYS=[['شنبه','Sat'],['یکشنبه','Sun'],['دوشنبه','Mon'],['سه‌شنبه','Tue'],['چهارشنبه','Wed'],['پنجشنبه','Thu'],['جمعه','Fri']];
function tExclOk(TB, R){ R=R||RB.rangeInfo(); return !TB.cmp&&['today','yesterday','custom'].indexOf(R.mode)<0; }
function tDayFactor(TB, R){ var n=(TB.exclDays||[]).length; return n&&tExclOk(TB,R)?Math.max(0,1-n/7):1; }
/* session baselines that don't depend on the row property or the column: one bounce rate and one average session length per
   (filters, session filters, segment) — shared by the Data Table's Overall and the Metric Explorer, so the two always agree */
function tSessBase(c, sf){ var k='sess'+JSON.stringify(c.sf||[])+(sf?sf.seed:''), fk=JSON.stringify(c.filters||[]), b=0.34+0.22*jitter(k+'b',0), d=150+260*jitter(k+'d',0);
  /* property filters apply to raw events first, and session length uses the filtered events only (Amplitude), so a filtered length is never longer */
  if((c.filters||[]).length){ d*=0.55+0.3*jitter(fk+'d',0); b*=0.85+0.3*jitter(fk+'b',0); }
  (c.sf||[]).forEach(function(x){ if(x.t==='dur'&&x.op==='gt'){ b*=Math.max(0.05,Math.exp(-(x.sec||60)/90)); d+=x.sec||60; } else if(x.t==='dur'){ b=Math.min(0.9,b*1.6); d=Math.min(d,(x.sec||60)*0.6); } else if(x.t==='ev'){ b*=0.45; d*=1.3; } });
  return { b:b, d:d }; }
function tSessFilter(c, ssn, rowsP){ var sf=c.sf||[], f=1, pv=1, only=null; if(!sf.length) return null;
  sf.forEach(function(x){
    if(x.t==='ev'){ var n=RB.sum(baseSeries({ id:x.ev, filters:[] },false)); f*=Math.max(0.02, Math.min(0.85, n/Math.max(1,ssn)*0.55)); pv*=1.25; }
    else if(x.t==='dur'){ var e=Math.exp(-(x.sec||60)/240); f*=x.op==='lt'?1-e:e; pv*=x.op==='lt'?0.6:1.4; }
    else { var P=tProp(x.prop), i=P?P.vals.map(function(v){ return v[1]; }).indexOf(x.val):-1; if(i>-1){ f*=tNorm(tShares(x.prop, x.t==='first'?'entry':'exit', 'sf'))[i]; if(x.prop===rowsP) only=i; } } });
  return { f:f, pv:pv, only:only }; }
function sfLabel(x){ if(x.t==='ev') return T('شامل ایونت ','Contains event ')+evName(x.ev); if(x.t==='dur') return T('مدت نشست '+(x.op==='lt'?'کمتر':'بیشتر')+' از ','Session duration '+(x.op==='lt'?'< ':'> '))+mxDurTxt(x.sec);
  var P=tProp(x.prop), v=P&&P.vals.filter(function(y){ return y[1]===x.val; })[0]; return (x.t==='first'?T('اولین مقدار ','First value of '):T('آخرین مقدار ','Last value of '))+(P?T(P.fa,P.en):x.prop)+' = '+(v?T(v[0],v[1]):x.val); }
/* conversion (funnel) column: the Funnel tab's own computation, so Overall equals the funnel's rate */
var T_CTX=null;
function tConv(st, c, ci, sg, rowsP){
  var P=rowsP?tProp(rowsP):null, seed='cv'+c.steps.join('>')+ci, out={ overall:null, rows:P?P.vals.map(function(){ return null; }):[], unit:'pct', additive:false };
  var st2=norm({ events:c.steps.map(function(id){ return { id:id, filters:[] }; }), funnel:Object.assign(blankFunnel(), { win:{ n:c.win||7, u:'day' } }), segments:[clone(sg)] });
  var f=fCompute(st2, T_CTX||{ range:RB.Q.range, filters:RB.Q.filters }), row=(f.segs||[])[0]; if(!row) return out;
  var dF=tDayFactor(st.table, RB.rangeInfo()), e0=Math.round(row.reached[0]*(dF<1?Math.pow(dF,0.75):1)), sh=P?tNorm(tShares(rowsP,null,seed)):[], ov=P?tOverlap(rowsP,seed):1;
  out.overall=+row.conv.toFixed(1);
  out.entrants={ overall:e0, rows:sh.map(function(x,i){ return Math.round(e0*x*ov*(0.94+0.12*jitter(seed+'o',i))); }) };
  out.rows=sh.map(function(x,i){ return Math.min(100,+(out.overall*(0.7+0.6*jitter(seed+'r',i))).toFixed(1)); });
  if(c.attr&&P&&tAttrOk(c,c.attr.model,st.table)) tAttribute(out,c,P,rowsP,seed);
  return out; }
/* hybrid formula: event inputs A… and session inputs S…, one arithmetic expression, evaluated per row from that row's inputs */
var H_EV='ABCDEF', H_SS='STUV';
var H_SIN={ session_totals:['نشست‌ها','Session totals'], sess_per_user:['میانگین نشست به ازای هر کاربر','Average sessions per user'], events_per_session:['ایونت به ازای هر نشست','Events per session'],
  bounce_rate:['نرخ پرش','Bounce rate'], entry_rate:['نرخ ورود','Entry rate'], exit_rate:['نرخ خروج','Exit rate'], avg_session_duration:['میانگین مدت نشست','Average session duration'], ts_sum:['زمان صرف‌شده (مجموع)','Time spent (sum)'] };   /* phase 4a-2: time spent, for «share of time on site» */
function hParse(src){
  var m=/^\s*%:/.exec(src||''), s=m?src.slice(m[0].length):(src||''), i=0, letters=[];
  function sp(){ while(i<s.length&&/\s/.test(s[i])) i++; }
  function err(msg){ throw { msg:msg }; }
  function expr(){ var n=term(); sp(); while(s[i]==='+'||s[i]==='-'){ var o=s[i++]; n={ op:o, a:n, b:term() }; sp(); } return n; }
  function term(){ var n=fac(); sp(); while(s[i]==='*'||s[i]==='/'){ var o=s[i++]; n={ op:o, a:n, b:fac() }; sp(); } return n; }
  function fac(){ sp(); var c=s[i];
    if(c==='-'){ i++; return { op:'neg', a:fac() }; }
    if(c==='('){ i++; var e=expr(); sp(); if(s[i]!==')') err(['پرانتز بسته نشده','Missing )']); i++; return e; }
    var nm=/^\d+(\.\d+)?/.exec(s.slice(i)); if(nm){ i+=nm[0].length; return { k:+nm[0] }; }
    var L=/^[A-Za-z]/.exec(s.slice(i)); if(!L) err(['عبارت ناقص است','Incomplete expression']); i++;
    if(/^[A-Za-z]/.test(s.slice(i))) err(['هر ورودی یک حرف است، مثل A یا S','Each input is one letter, such as A or S']);
    var l=L[0].toUpperCase(); if(letters.indexOf(l)<0) letters.push(l); return { v:l }; }
  if(!s.trim()) err(['عبارت خالی است','The expression is empty']);
  var tree=expr(); sp(); if(i<s.length) err(['نویسهٔ اضافی در عبارت','Unexpected character']);
  return { tree:tree, mode:m?'%':'', letters:letters }; }
function hErrors(c){ try{ var p=hParse(c.expr), known=(c.inputs||[]).map(function(x){ return x.L; }).concat((c.sin||[]).map(function(x){ return x.L; })), miss=p.letters.filter(function(l){ return known.indexOf(l)<0; });
    if(miss.length) return T('ورودی '+miss.join('، ')+' تعریف نشده','Input '+miss.join(', ')+' isn’t defined'); if(!p.letters.length) return T('دست‌کم یک ورودی در عبارت بیاورید','Use at least one input in the expression'); return ''; }
  catch(e){ return T(e.msg[0],e.msg[1]); } }
function tHybrid(st, c, ci, sg, rowsP){
  var P=rowsP?tProp(rowsP):null, out={ overall:null, rows:P?P.vals.map(function(){ return null; }):[], unit:'dec', additive:false }, p;
  if(hErrors(c)){ out.err=true; return out; } p=hParse(c.expr); out.unit=p.mode==='%'?'pct':'dec';
  var vals={}; (c.inputs||[]).forEach(function(x,k){ vals[x.L]=tColumn(st, { kind:'ev', ev:x.ev, meas:x.meas||'totals', filters:x.filters||[], ee:'default' }, ci+'h'+k, sg, rowsP); });
  (c.sin||[]).forEach(function(x,k){ vals[x.L]=tColumn(st, { kind:'metric', metric:x.m, filters:[], ee:'default' }, ci+'s'+k, sg, rowsP); });
  function ev(n, idx){ if(n.k!=null) return n.k; if(n.v){ var r=vals[n.v]; if(!r) return null; var v=idx<0?r.overall:r.rows[idx]; if(v==null) return null; return r.unit==='pct'?v/100:v; }   /* rates enter as fractions, so A/(S*(1-B)) reads naturally */
    if(n.op==='neg'){ var a0=ev(n.a,idx); return a0==null?null:-a0; } var a=ev(n.a,idx), b=ev(n.b,idx); if(a==null||b==null) return null; return n.op==='+'?a+b:n.op==='-'?a-b:n.op==='*'?a*b:(b?a/b:null); }
  var sc=p.mode==='%'?100:1, fx=function(v){ return v==null||!isFinite(v)?null:+(v*sc).toFixed(2); };
  out.overall=fx(ev(p.tree,-1)); if(P) out.rows=P.vals.map(function(v,i){ return fx(ev(p.tree,i)); });
  return out; }
/* one table: overall + rows per (column × segment); formula columns from the others; compare to a previous period */
function tCompute(st, ctx){
  T_CTX=ctx;
  return within(ctx, function(){
    var R=RB.rangeInfo(), TB=st.table, out={ R:R, empty:!TB.cols.length, cols:[], rowsP:TB.gbs[0]||'', sections:[] };
    if(out.empty) return out;
    tTimeProps();
    var segs=norm(st).segments, named=segs.length>1||!isDefaultSeg(segs[0]);
    (TB.gbs.length?TB.gbs:['']).forEach(function(gp, gi){
      var P=gp?tProp(gp):null, sec={ prop:gp, vals:P?P.vals:[], cells:[] };
      TB.cols.forEach(function(c, ci){ segs.forEach(function(sg, si){
        var r=c.kind==='formula'?null:tColumn(st, c, ci, sg, gp||null);
        sec.cells.push({ ci:ci, si:si, c:c, name:tColName(c)+(named?' · '+segLabel(sg):''), r:r }); }); });
      /* formula columns: per row, from the other columns' values (letter = column); a missing term gives "-" */
      sec.cells.forEach(function(cell){ if(cell.c.kind!=='formula') return; var pr=parseSafe(cell.c.formula), rr={ overall:null, rows:[], unit:pr&&pr.mode==='%'?'pct':'dec', additive:false };
        /* an attributed formula attributes each of its terms with the same model (terms that can't take it stay as they are) */
        var fa0=cell.c.attr&&gp?cell.c.attr:null, acache={}, termR=function(col){ if(!fa0||col.c.kind==='formula') return col.r; if(acache[col.ci]) return acache[col.ci];
          var c2=Object.assign(clone(col.c), { attr:fa0 }); return (acache[col.ci]=tAttrOk(c2, fa0.model, TB)?tColumn(st, c2, col.ci, segs[cell.si], gp):col.r); };
        if(pr){ var ev=function(n, idx){ if(n.k!=null) return n.k; if(n.math) return fMath(n.math, ev(n.a,idx), n.b?ev(n.b,idx):null); if(n.agg) return null;   /* CR-11: math per row; aggregation has no intervals here */ if(n.fn){ var col=sec.cells.filter(function(x){ return x.ci===LET.indexOf(n.ev)&&x.si===cell.si; })[0]; if(!col||!col.r) return null; if(tIsTs(col.c)){ rr.tsErr=true; return null; } var R0=termR(col), v=idx<0?R0.overall:R0.rows[idx]; return v==null?null:v; }
            if(n.op==='neg'){ var a0=ev(n.a,idx); return a0==null?null:-a0; } var a=ev(n.a,idx), b=ev(n.b,idx); if(a==null||b==null) return null; return n.op==='+'?a+b:n.op==='-'?a-b:n.op==='*'?a*b:(b?a/b:null); };
          var sc=pr.mode==='%'?100:1, fx=function(v){ return v==null?null:+(v*sc).toFixed(2); }; rr.overall=fx(ev(pr.tree,-1)); rr.rows=sec.vals.map(function(v,i){ return fx(ev(pr.tree,i)); }); }
        if(fa0) rr.attributed=fa0.model; cell.r=rr; });
      var pastOf=function(cell, m){ var lvl=m==='year'?0.74:0.88, j=function(i){ return lvl*(0.9+0.2*jitter(cell.name+m,i)); };
        return { m:m, overall:cell.r.overall==null?null:cell.r.overall*j(-1), rows:cell.r.rows.map(function(v,i){ return v==null?null:v*j(i); }) }; };
      if(TB.cmp) sec.cells.forEach(function(cell){ cell.prev=pastOf(cell, TB.cmp); if(TB.cmp2&&TB.cmp2!==TB.cmp) cell.prev2=pastOf(cell, TB.cmp2); });
      out.sections.push(sec);
    });
    out.cols=out.sections[0].cells;
    return out;
  });
}
function tFmt(r, v){ if(v==null) return '—'; if(r.unit==='ts'){ var u=T_TUNIT[r.tunit||'sec']; return num(v/u[2], u[2]===1?0:1)+' '+T(u[0],u[1]); } if(r.unit==='pct') return pctTxt(v); if(r.unit==='sec') return fmtDur(v/60); if(r.unit==='dec') return num(v,2); if(r.unit==='cur') return compact(v)+curTxt(); return num(Math.round(v)); }
var lastT=null, TBLK=null;
function tBlockedHtml(b){ return '<div class="sh-state rbz-empty">'+emptyArt('funnel')+'<div class="sh-state-title">'+T(b.fa,b.en)+'</div><div class="sh-state-hint">'+T(b.hFa,b.hEn)+'</div><div class="rbz-emptyacts"><button class="rbz-linkbtn" id="rbzTBlk" type="button">'+T(b.cta[0],b.cta[1])+'</button></div></div>'; }
function renderTable(){
  SEL=null;
  var res=lastT=tCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), blk=res.empty?null:tBlocked(res); TBLK=blk;
  root.classList.toggle('rtl', fa());
  root.innerHTML='<div class="rbz-grid'+(SET_OPEN?' with-set':'')+'"><aside class="rbz-panel">'+tColsModule()+tRowsModule()+segmentModule()+'</aside>'+
    '<section class="rbz-canvas">'+(res.empty?'<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-drslot"></span></div>'+tEmpty():(blk?tToolbar(res)+tBlockedHtml(blk):tToolbar(res)+tGrid(res)))+'</section>'+(SET_OPEN?setPanel():'')+'</div>';
  placeFilter(); wire(); U.i18n();
}
function tEmpty(){
  return '<div class="sh-state rbz-empty">'+emptyArt('funnel')+'<div class="sh-state-title">'+T('چند متریک را کنار هم مقایسه کنید','Compare several metrics side by side')+'</div>'+
    '<div class="sh-state-hint">'+T('هر ستون یک ایونت یا متریک است و هر ردیف یک مقدار ویژگی؛ مثلاً کاربران سایت، نرخ پرش و خرید اشتراک به تفکیک منبع کمپین.','Each column is an event or metric and each row a property value; e.g. visitors, bounce rate and subscriptions by campaign source.')+'</div>'+
    '<div class="rbz-emptyacts"><button class="rbz-linkbtn" data-tadd="1" type="button">'+ic('plus')+T('افزودن ایونت یا متریک','Add an event or metric')+'</button>'+
    '<button class="rbz-linkbtn ghost" id="rbzTSeed" type="button">'+ic('lightning')+T('عملکرد کمپین‌ها (مثل جدول UTM)','Campaign performance (like the UTM table)')+'</button></div></div>';
}
function tColsModule(){
  var TB=A.table, h='<div class="rbz-mod">'+modHead('ev','ستون‌ها','Columns',TTIPS.cols,TB.cols.map(function(c,i){ return tColLetter(i)+' '+tColName(c); }).join(T('، ',', '))||T('هنوز ستونی نیست','No columns yet'));
  if(!OPEN.ev) return h+'</div>';
  TB.cols.forEach(function(c,i){ h+='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let">'+tColLetter(i)+'</span><button class="rbz-evname" data-tcolmenu="'+i+'" type="button"><span class="rbz-evic">'+(tIsTs(c)?ic('timer'):c.kind==='metric'?ic('chart-line'):c.kind==='conv'?ic('funnel'):c.kind==='formula'||c.kind==='hybrid'?'<i class="rbz-fxi">fx</i>':evIcon(c.ev))+'</span><span class="nm">'+esc(tColName(c))+'</span>'+(c.kind==='ev'?'<code>'+esc((T_MEAS[c.meas||'uniques']||MT_AGG.arpu)[1])+'</code>'/* PM 2026-10-30, LX-24: parpu has no T_MEAS key */:'')+'<span class="rbz-car">⌄</span></button></div>';
    (c.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-tfdel="'+i+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    if(c.attr) h+='<div class="rbz-chip act">'+ic('share-network')+'<span>'+T('اتریبیوشن: ','Attribution: ')+esc(tAttrName(c.attr.model))+' · '+T(num(tCustom(c.attr.model)&&tCustom(c.attr.model).lock?tCustom(c.attr.model).lb:c.attr.lb)+' روز',(tCustom(c.attr.model)&&tCustom(c.attr.model).lock?tCustom(c.attr.model).lb:c.attr.lb)+' d')+'</span><button data-tadel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    (c.sf||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('clock-countdown')+'<span>'+esc(sfLabel(f))+'</span><button data-tsfdel="'+i+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    if(c.scope==='event'&&tIsSess(c)&&(c.filters||[]).length) h+='<div class="rbz-chip act">'+ic('crosshair')+'<span>'+T('تفکیک فقط از ایونت فیلترشده','Event-level group-by')+'</span><button data-tscdel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    if(c.mid&&tMetric(c.mid)) h+='<div class="rbz-chip">'+ic('books')+'<span>'+T('از کتابخانه: ','From library: ')+esc(tMName(tMetric(c.mid)))+'</span></div>';
    if(c.kind==='hybrid') h+='<div class="rbz-chip">'+ic('function')+'<span dir="ltr">'+esc((c.inputs||[]).map(function(x){ return x.L+'='+evName(x.ev); }).concat((c.sin||[]).map(function(x){ return x.L+'='+T(H_SIN[x.m][0],H_SIN[x.m][1]); })).join(' · '))+'</span></div>';
    if(c.ee&&c.ee!=='default') h+='<div class="rbz-chip act">'+ic('arrow-'+(fa()?'left':'right'))+'<span>'+(c.ee==='entry'?T('ورود (اولین مقدار نشست)','Entry (first value)'):T('خروج (آخرین مقدار نشست)','Exit (last value)'))+'</span><button data-teedel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    h+='</div>'; });
  return h+'<button class="rbz-add'+(TB.cols.length?'':' big')+'" data-tadd="1" type="button"'+(TB.cols.length>=T_MAXCOL?' disabled':'')+'>'+ic('plus')+T('افزودن ایونت یا متریک','Add an event or metric')+'</button><button class="rbz-fx" data-thybrid="1" type="button"><i>fx</i>'+T('فرمول ترکیبی','Hybrid formula')+'</button><button class="rbz-fx" data-tformula="1" type="button"><i>fx</i>'+T('ستون فرمول','Formula column')+'</button></div>';
}
function tRowsModule(){
  var TB=A.table, x=function(attr){ return '<button '+attr+' type="button" aria-label="'+T('حذف','Remove')+'">×</button>'; };
  var h='<div class="rbz-mod">'+modHead('jf','ردیف‌ها (تفکیک)','Rows (group by)',TTIPS.rows,TB.gbs.map(function(p){ return T(tProp(p).fa,tProp(p).en); }).join(T('، ',', '))||T('بدون تفکیک','No group-by'));
  if(OPEN.jf===false) return h+'</div>';
  TB.gbs.forEach(function(p,i){ var P=tProp(p), nst=TB.nest[p]&&tProp(TB.nest[p]);
    var pp=TB.persist[p];
    h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+esc(T(P.fa,P.en))+(nst?T(' ← تودرتو: ',' → nested: ')+esc(T(nst.fa,nst.en)):'')+'</span>'+(nst?'':'<button data-tnest="'+i+'" type="button" title="'+T('تفکیک تودرتو','Nested group-by')+'" aria-label="'+T('تفکیک تودرتو','Nested group-by')+'">'+ic('list-bullets')+'</button>')+
      '<button data-tpers="'+i+'" type="button" class="'+(pp?'on':'')+'" title="'+T('ماندگار کردن مقدار…','Persist the value…')+'" aria-label="'+T('ماندگار کردن مقدار…','Persist the value…')+'">'+ic('push-pin')+'</button>'+x('data-tgdel="'+i+'"')+'</div>';
    if(pp) h+='<div class="rbz-chip act">'+ic('push-pin')+'<span>'+T('ماندگار: ','Persisted: ')+esc(T(T_ALLOC[pp.alloc][0],T_ALLOC[pp.alloc][1]))+' · '+(pp.exp==='days'?T(num(pp.days)+' روز',pp.days+' d'):T('تا پایان نشست','until session ends'))+'</span><button data-tpdel="'+esc(p)+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
  var gOff=TB.gbs.length>=5?T('حداکثر ۵ تفکیک سطح بالا','Up to 5 top-level group-bys'):tHasSess()&&TB.gbs.length>=1?T('متریک نشست فقط با یک تفکیک سطح بالا','Session metrics take one top-level group-by'):'';
  h+='<button class="rbz-linkbtn ghost" data-tclass="1" type="button">'+ic('tree-structure')+T('طبقه‌بندهای کانال…','Channel classifiers…')+'</button>';
  return h+(gOff&&TB.gbs.length<5?'<div class="rbz-sethelp">'+gOff+'</div>':'')+'<button class="rbz-add" data-tgadd="1" type="button"'+(gOff?' disabled title="'+gOff+'"':'')+'>'+ic('plus')+(TB.gbs.length?T('افزودن تفکیک سطح بالا','Add top-level group-by'):T('انتخاب ویژگی…','Select property…'))+'</button></div>';
}
/* persisted properties (Amplitude: allocation Original / Most recent / First known / Last known; expiry Session or custom time) */
var T_ALLOC={ original:['اولین مقدار','Original'], recent:['آخرین مقدار','Most recent'], firstk:['اولین مقدار شناخته','First known'], lastk:['آخرین مقدار شناخته','Last known'] };
function tPersistModal(i){
  var TB=A.table, p=TB.gbs[i], P=tProp(p), cur=TB.persist[p]||{ alloc:'original', exp:'session', days:7, excl:[] };
  U.modal({ fa:'ماندگار کردن «'+P.fa+'»', en:'Persist “'+P.en+'”', subFa:'مقدار این ویژگی روی ایونت‌های بعدی همان کاربر می‌ماند؛ مثلاً صفحهٔ فرود روی همهٔ بازدیدهای همان نشست. با ویژگی ماندگار بازهٔ جدول حداکثر ۶ ماه است و اتریبیوشن فقط آخرین تماس یا خطی است.', subEn:'The value stays on the same user’s later events; e.g. the landing page on every view in that session. With a persisted property the table’s range is at most 6 months and attribution is last touch or linear only.', wide:true,
    body:'<span class="rbx-tipdot"'+tip(TTIPS.persist[0],TTIPS.persist[1])+'></span><div class="rbx-field"><label>'+T('کدام مقدار بماند','Allocation')+'</label>'+Object.keys(T_ALLOC).map(function(k){ return '<label class="rbz-ck"><input type="radio" name="rbzPa" value="'+k+'"'+(cur.alloc===k?' checked':'')+'/>'+T(T_ALLOC[k][0],T_ALLOC[k][1])+'</label>'; }).join('')+'</div>'+
      '<div class="rbx-field"><label>'+T('تا کی بماند','Expiration')+'</label><label class="rbz-ck"><input type="radio" name="rbzPx" value="session"'+(cur.exp!=='days'?' checked':'')+'/>'+T('تا پایان نشست','Until the session ends')+'</label><label class="rbz-ck"><input type="radio" name="rbzPx" value="days"'+(cur.exp==='days'?' checked':'')+'/>'+T('چند روز','A number of days')+' <input class="sh-input sm" type="number" min="1" max="90" id="rbzPd" value="'+cur.days+'"/></label></div>'+
      '<div class="rbx-field"><label>'+T('مقدارهایی که ماندگار نمی‌شوند','Excluded values')+'</label><div class="rbz-chk">'+P.vals.map(function(v){ return '<label class="rbz-ck"><input type="checkbox" data-px="'+esc(v[1])+'"'+((cur.excl||[]).indexOf(v[1])>-1?' checked':'')+'/><bdi>'+esc(T(v[0],v[1]))+'</bdi></label>'; }).join('')+'</div></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ TB.persist[p]={ alloc:(bd.querySelector('input[name="rbzPa"]:checked')||{}).value||'original', exp:(bd.querySelector('input[name="rbzPx"]:checked')||{}).value||'session', days:Math.max(1,Math.min(90,+bd.querySelector('#rbzPd').value||7)),
      excl:[].slice.call(bd.querySelectorAll('[data-px]:checked')).map(function(x){ return x.getAttribute('data-px'); }) };
      if(i===0) TB.cols.forEach(function(c){ if(c.attr&&!tAttrOk(c,c.attr.model,TB)){ c.attr=null; U.toast('اتریبیوشن ستون‌هایی که با ویژگی ماندگار جور نبود برداشته شد','Attribution removed where it doesn’t fit a persisted property'); } }); changed(); } }] });
}
/* channel classifiers (Amplitude: a data-settings object, computed at query time, so it is retroactive). The default one buckets
   traffic into named channels by rules on UTM medium/source and referrer type; it is a Data Table row property (grp 'chan'),
   so segments and other tabs don't pick it up. Up to 149 rules per classifier. */
/* PM 2026-10-25, AC-13: one channel definition per project. The default classifier is the traffic-sources page's five channels (its referrer
   types, written as rules); editing it here is stored per project under chanKey(), and referrer/v17.html asks the engine (RBAmp.chanEdited) and then groups its channels by
   the same classifier, so that page follows. */
function chanKey(){ var proj=0; try{ proj=+JSON.parse(localStorage.getItem('shahin-nav-project')||'0')||0; }catch(e){ proj=0; } return 'shahin.chanDefault-p'+proj; }
/* PM 2026-10-25, AC-13: the rules come from the project's single channel definition (RBDefs.chanDefault(), the traffic-sources page's five
   channels and names); each rule's values become one row each. Without RBDefs, the engine's referrer-type labels are the fallback. */
function chanBase(){
  var D=null; try{ D=window.RBDefs&&RBDefs.chanDefault?RBDefs.chanDefault():null; }catch(e){ D=null; }
  var out=[]; if(D&&D.rules) D.rules.forEach(function(r){ var w=(r.when||[])[0]; if(!w||w.not||(r.when||[]).length>1) return; (w.vals||[]).forEach(function(v){ out.push([r.fa, r.en, w.prop, v]); }); });
  return out.length?out:((RB.PROPS.referrer_type||{}).vals||[]).map(function(v){ return [v[0], v[1], 'referrer_type', v[1]]; }); }
function chanSaved(){ try{ var d=JSON.parse(localStorage.getItem(chanKey())||'null'); return d&&d.rules&&d.rules.length?d.rules:null; }catch(e){ return null; } }
/* a channel's share = the share of its matching value, first match wins (a value already claimed by an earlier rule adds nothing) */
function chanVals(rules){ var used={}, vals=[], left=1;
  rules.forEach(function(r){ var key=r[2]+'='+r[3], P=tProp(r[2]), v=P&&P.vals.filter(function(x){ return x[1]===r[3]; })[0], w=used[key]?0:(v?v[2]:0)*(r[2]==='referrer_type'?1:0.6); used[key]=1; w=Math.min(w,left); left-=w; var ex=vals.filter(function(x){ return x[1]===r[1]; })[0]; if(ex) ex[2]+=w; else vals.push([r[0],r[1],w]); });
  if(left>0.005) vals.push(['سایر','Other',left]); return vals.filter(function(v){ return v[2]>0; }); }
var T_CLASSIFIERS=[{ id:'_channel', fa:'کانال‌های جذب ترافیک (پیش‌فرض پروژه)', en:'Traffic Acquisition channels (project default)', def:true, rules:chanSaved()||chanBase() }];
RB.PROPS._channel={ grp:'chan', fa:'کانال (طبقه‌بند پیش‌فرض)', en:'Channel (default classifier)', vals:chanVals(T_CLASSIFIERS[0].rules) };
function tClassifierModal(){
  function list(){ return T_CLASSIFIERS.map(function(c){ return '<div class="rbz-mlrow"><div class="nm"><b>'+esc(T(c.fa,c.en))+'</b>'+(c.def?' <span class="rbz-tag">'+T('پیش‌فرض','Default')+'</span>':'')+'<div class="sub">'+num(c.rules.length)+T(' قاعده',' rules')+' · '+esc(c.rules.map(function(r){ return T(r[0],r[1]); }).join(T('، ',', ')))+'</div></div>'+
    '<div class="acts"><button class="sh-btn compact ghost" data-cla="use" data-id="'+c.id+'" type="button">'+T('تفکیک ردیف‌ها با این','Group rows by it')+'</button>'+
    (c.def?'<button class="sh-btn compact ghost" data-cla="edit" data-id="'+c.id+'" type="button"'+(canManage()?'':' disabled title="'+T('فقط مالک و ادمین پروژه','Project owner and admins only')+'"')+'>'+T('ویرایش','Edit')+'</button>':'')+'</div></div>'; }).join(''); }   /* AC-13: the default is edited in place */
  U.modal({ fa:'طبقه‌بندهای کانال', en:'Channel classifiers', subFa:'قاعده‌ها هنگام گزارش اعمال می‌شوند، پس تغییرشان روی گذشته هم اثر دارد. قاعده‌ها به ترتیب بررسی می‌شوند و اولین تطابق کانال را تعیین می‌کند.', subEn:'Rules apply at query time, so changing them also changes past data. Rules are checked in order and the first match sets the channel.', wide:true,
    body:'<span class="rbx-tipdot"'+tip(TTIPS.chan[0],TTIPS.chan[1])+'></span><div class="rbz-mlib">'+list()+'</div><button class="rbz-linkbtn" id="rbzClNew" type="button"'+(canManage()?'':' disabled title="'+T('فقط مالک و ادمین پروژه','Project owner and admins only')+'"')+'>'+ic('plus')+T('افزودن طبقه‌بند کانال','Add channel classifier')+'</button>',
    init:function(bd, close){ bd.querySelectorAll('[data-cla]').forEach(function(b){ b.addEventListener('click', function(){ var id=b.getAttribute('data-id'), TB=A.table; close(); if(b.getAttribute('data-cla')==='edit'){ tClassifierEditor(true); return; } if(TB.gbs.indexOf(id)<0){ if(tHasSess()&&TB.gbs.length) TB.gbs=[id]; else if(TB.gbs.length<5) TB.gbs.unshift(id); } changed(); }); });
      var nb=bd.querySelector('#rbzClNew'); if(nb) nb.addEventListener('click', function(){ close(); tClassifierEditor(); }); } });
}
function tClassifierEditor(isDef){
  var D0=T_CLASSIFIERS[0], rules=isDef?clone(D0.rules):[['جستجوی ارگانیک','Organic Search','referrer_type','Organic'],['تلگرام','Telegram','utm_source','telegram'],['خبرنامه','Newsletter','utm_source','newsletter']], props=['utm_source','utm_medium','utm_campaign','referrer_type','referrer_domain'];
  function rows(){ return rules.map(function(r,k){ var P=tProp(r[2]||props[0]);
    return '<div class="rbz-mdrow"><span class="rbz-let">'+num(k+1)+'</span><input class="sh-input" data-clr="'+k+'" value="'+esc(T(r[0],r[1]))+'" placeholder="'+T('نام کانال','Channel name')+'"/><select class="sh-select" data-clp="'+k+'">'+props.map(function(p){ return '<option value="'+p+'"'+(p===r[2]?' selected':'')+'>'+esc(pOpt(p))+'</option>'; }).join('')+'</select>='+
      '<select class="sh-select" data-clv="'+k+'">'+P.vals.map(function(v){ return '<option value="'+esc(v[1])+'"'+(v[1]===r[3]?' selected':'')+'>'+esc(T(v[0],v[1]))+'</option>'; }).join('')+'</select><button class="rbz-x" data-cld="'+k+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; }).join('')||'<div class="rbz-sethelp">'+T('جدول خالی است؛ همه در «سایر».','The table is empty; everything is «Other».')+'</div>'; }
  U.modal({ fa:isDef?'ویرایش طبقه‌بند پیش‌فرض':'طبقه‌بند کانال تازه', en:isDef?'Edit the default classifier':'New channel classifier',
    subFa:'هر ردیف یک قاعده است؛ ترافیکی که با هیچ قاعده‌ای جور نشود «سایر» می‌شود. حداکثر ۱۴۹ قاعده.'+(isDef?' این طبقه‌بند کانال‌های صفحه جذب ترافیک هم هست و تغییرش همان صفحه را هم عوض می‌کند.':''),
    subEn:'Each row is a rule; traffic matching none becomes «Other». Up to 149 rules.'+(isDef?' This classifier is also the Traffic Acquisition page’s channels, so a change here changes that page too.':''), wide:true,
    body:'<div class="rbx-field"><label>'+T('نام','Name')+'</label><input class="sh-input" id="rbzClN" value="'+esc(isDef?T(D0.fa,D0.en):T('کانال‌های خبری','News channels'))+'"'+(isDef?' disabled':'')+'/></div><label class="rbz-ck"><input type="checkbox" id="rbzClL" checked/>'+T('ساخت با منطق جدید (اولین قاعدهٔ جورشده، به ترتیب)','Build with the new logic (first matching rule, in order)')+'</label><div id="rbzClR">'+rows()+'</div>'+
      '<div class="rbz-mdrow"><button class="rbz-linkbtn" id="rbzClA" type="button">'+ic('plus')+T('افزودن قاعده','Add rule')+'</button><button class="rbz-linkbtn ghost" id="rbzClC" type="button">'+T('پاک کردن جدول','Clear table')+'</button>'+
      (isDef?'<button class="rbz-linkbtn ghost" id="rbzClReset" type="button">'+T('بازگشت به پنج کانال جذب ترافیک','Back to the five Traffic Acquisition channels')+'</button>':'')+'</div>',
    init:function(bd){ function redraw(){ bd.querySelector('#rbzClR').innerHTML=rows(); wire(); }
      function wire(){ bd.querySelectorAll('[data-clr]').forEach(function(x){ x.addEventListener('input', function(){ var r=rules[+x.getAttribute('data-clr')]; r[0]=r[1]=x.value; }); });
        bd.querySelectorAll('[data-clp]').forEach(function(x){ x.addEventListener('change', function(){ var r=rules[+x.getAttribute('data-clp')]; r[2]=x.value; r[3]=tProp(x.value).vals[0][1]; redraw(); }); });
        bd.querySelectorAll('[data-clv]').forEach(function(x){ x.addEventListener('change', function(){ rules[+x.getAttribute('data-clv')][3]=x.value; }); });
        bd.querySelectorAll('[data-cld]').forEach(function(x){ x.addEventListener('click', function(){ rules.splice(+x.getAttribute('data-cld'),1); redraw(); }); }); }
      wire(); bd.querySelector('#rbzClA').addEventListener('click', function(){ if(rules.length>=149){ U.toast('حداکثر ۱۴۹ قاعده','Up to 149 rules'); return; } rules.push(['','','utm_medium','cpc']); redraw(); });
      bd.querySelector('#rbzClC').addEventListener('click', function(){ rules=[]; redraw(); });
      var rs=bd.querySelector('#rbzClReset'); if(rs) rs.addEventListener('click', function(){ rules=chanBase(); redraw(); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var nm=bd.querySelector('#rbzClN').value.trim(); if(!nm){ U.toast('برای طبقه‌بند یک نام بنویسید','Name the classifier'); return false; }
      var ok=rules.filter(function(r){ return (r[0]||'').trim(); }); if(!ok.length){ U.toast('دست‌کم یک قاعده با نام کانال لازم است','Add at least one named rule'); return false; }
      /* PM 2026-10-25, AC-13: saving the default rewrites the project's one channel definition, which the traffic-sources page reads */
      if(isDef){ var base=chanBase(), same=JSON.stringify(ok.map(function(r){ return [r[1],r[2],r[3]]; }))===JSON.stringify(base.map(function(r){ return [r[1],r[2],r[3]]; }));
        D0.rules=ok.map(function(r){ return r.slice(0,4); }); RB.PROPS._channel.vals=chanVals(D0.rules);
        try{ if(same) localStorage.removeItem(chanKey()); else localStorage.setItem(chanKey(), JSON.stringify({ rules:D0.rules, at:Date.now() })); }catch(e){}
        U.toast('طبقه‌بند پیش‌فرض ذخیره شد؛ صفحه جذب ترافیک هم همین کانال‌ها را نشان می‌دهد','Default classifier saved; the Traffic Acquisition page shows these channels too'); changed(); return; }
      var id='_channel_'+(T_CLASSIFIERS.length+1);
      RB.PROPS[id]={ grp:'chan', fa:nm, en:nm, vals:chanVals(ok.map(function(r){ return [r[0],r[0],r[2],r[3]]; })) };
      T_CLASSIFIERS.push({ id:id, fa:nm, en:nm, rules:ok.map(function(r){ return [r[0],r[0],r[2],r[3]]; }) }); U.toast('طبقه‌بند «'+nm+'» ذخیره شد و در فهرست تفکیک‌ها آمد','Classifier “'+nm+'” saved; it is now a group-by'); changed(); } }] });
}
/* select a block of cells by dragging across them, then copy it (Ctrl/Cmd+C or the button) as tab-separated values for a spreadsheet */
var SEL=null, SELDRAG=false, RSZ=false, SELA=null;
document.addEventListener('mouseup', function(){ SELA=null; setTimeout(function(){ SELDRAG=false; },0); });
function tWireSelect(){
  function cellPos(td){ var p=td.getAttribute('data-tcell').split(':'); return { g:+p[0], k:+p[1], r:+td.getAttribute('data-tr') }; }
  function paint(){ root.querySelectorAll('td.rbz-dcell.sel').forEach(function(x){ x.classList.remove('sel'); }); if(!SEL) return;
    root.querySelectorAll('td.rbz-dcell').forEach(function(td){ var q=cellPos(td); if(q.g===SEL.g&&q.k>=SEL.k0&&q.k<=SEL.k1&&q.r>=SEL.r0&&q.r<=SEL.r1) td.classList.add('sel'); });
    var n=(SEL.k1-SEL.k0+1)*(SEL.r1-SEL.r0+1), bar=$('rbzTSel'); if(bar) bar.remove();
    if(n>1){ bar=document.createElement('div'); bar.id='rbzTSel'; bar.className='rbz-selbar'; bar.innerHTML='<button class="sh-btn compact" type="button">'+ic('copy')+T('کپی '+num(n)+' خانه','Copy '+n+' cells')+'</button><button class="rbz-x" type="button" aria-label="'+T('لغو انتخاب','Clear selection')+'">×</button>';
      root.querySelector('.rbz-canvas').appendChild(bar); bar.firstChild.addEventListener('click', tCopySel); bar.lastChild.addEventListener('click', function(){ SEL=null; paint(); var b=$('rbzTSel'); if(b) b.remove(); }); } }
  root.querySelectorAll('td.rbz-dcell').forEach(function(td){
    td.addEventListener('mousedown', function(e){ if(e.button!==0) return; SELA=cellPos(td); });
    td.addEventListener('mouseenter', function(e){ var a=SELA; if(!a||!(e.buttons&1)) return; var q=cellPos(td); if(q.g!==a.g) return; SELDRAG=true;
      SEL={ g:q.g, k0:Math.min(q.k,a.k), k1:Math.max(q.k,a.k), r0:Math.min(q.r,a.r), r1:Math.max(q.r,a.r) }; paint(); }); });
  if(SEL) paint(); }
function tCopySel(){ if(!SEL||!lastT) return; var sec=lastT.sections[SEL.g], rows=tSorted(sec).slice(0,tTopN(A.table)), out=[];
  for(var r=SEL.r0;r<=SEL.r1;r++){ var line=[]; for(var k=SEL.k0;k<=SEL.k1;k++){ var v=sec.cells[k].r.rows[rows[r].i]; line.push(v==null?'':String(v)); } out.push(line.join('\t')); }
  try{ navigator.clipboard.writeText(out.join('\n')); }catch(e){} window.__tCopied=out.join('\n'); U.toast('کپی شد','Copied'); }
document.addEventListener('keydown', function(e){ if(SEL&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'&&isTable()&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){ e.preventDefault(); tCopySel(); } });
/* states a saved or loaded table can land in that break a rule: say so instead of dropping anything */
function tBlocked(res){ var TB=A.table, R=res.R;
  if(TB.gbs.some(function(p){ return TB.persist[p]; })&&R.days>182) return { fa:'با ویژگی ماندگار، جدول تا ۶ ماه را پشتیبانی می‌کند', en:'With a persisted property, data tables support up to 6 months', hFa:'بازه را کوتاه کنید یا ماندگاری را بردارید.', hEn:'Shorten the range or remove the persistence.', cta:['بازهٔ ۶ ماه اخیر','Last 6 months'], fn:function(){ RB.Q.range='6m'; RB.renderActive(); } };
  if(TB.tr&&(Object.keys(TB.nest).some(function(p){ return TB.nest[p]&&TB.gbs.indexOf(p)>-1; })||TB.disp==='rel')) return { fa:'نمای جابه‌جاشده با تفکیک تودرتو یا «فقط درصد از کل» نمی‌شود', en:'The transposed view doesn’t work with nested group-bys or relative % only', hFa:'ستون‌ها را به متریک‌ها برگردانید.', hEn:'Switch the columns back to metrics.', cta:['ستون‌ها: متریک‌ها','Columns: metrics'], fn:function(){ TB.tr=false; changed(); } };
  if((TB.exclDays||[]).length&&TB.cmp) return { fa:'حذف روزهای هفته با مقایسه با گذشته هم‌زمان نمی‌شود', en:'Excluded days don’t work with period over period', hFa:'یکی را بردارید.', hEn:'Remove one of them.', cta:['برداشتن حذف روزها','Remove excluded days'], fn:function(){ TB.exclDays=[]; changed(); } };
  var tTop=TB.gbs.filter(function(p){ return tIsTime(p)&&TB.nest[p]&&!tIsTime(TB.nest[p]); })[0];
  if(tTop) return { fa:'تفکیک زمانی باید آخر بیاید', en:'A time group-by must come last', hFa:'«'+RB.PROPS[tTop].fa+'» بالای یک ویژگی آمده؛ جای آن دو را عوض کنید.', hEn:'“'+RB.PROPS[tTop].en+'” sits above a property; swap the two.', cta:['جابه‌جا کردن','Swap them'], fn:function(){ var p=TB.nest[tTop], gi=TB.gbs.indexOf(tTop); TB.gbs[gi]=p; delete TB.nest[tTop]; TB.nest[p]=tTop; changed(); } };
  if(tHasSess()&&TB.gbs.length>1) return { fa:'متریک نشست فقط با یک تفکیک سطح بالا', en:'Session metrics take one top-level group-by', hFa:'یکی از تفکیک‌های سطح بالا را بردارید یا متریک نشست را حذف کنید.', hEn:'Remove a top-level group-by or the session metric.', cta:['نگه داشتن اولین تفکیک','Keep the first group-by'], fn:function(){ TB.gbs=TB.gbs.slice(0,1); changed(); } };
  return null; }
function tToolbar(res){
  var TB=A.table;
  return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+
    '<div class="rbz-seg2 sm" role="radiogroup" aria-label="'+T('نمایش','Display')+'">'+[['abs','عدد','Absolute'],['rel','درصد از کل','Relative %'],['both','هر دو','Both']].map(function(m){ var on=TB.disp===m[0]; return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-tdisp="'+m[0]+'">'+T(m[1],m[2])+'</button>'; }).join('')+'</div>'+
    '<button class="rbz-pill'+(TB.bars?' on':'')+'" id="rbzTBars" type="button"'+(TB.tr?' disabled title="'+T('در نمای جابه‌جاشده هر ردیف واحد خودش را دارد','In the transposed view each row has its own unit')+'"':'')+'>'+ic('squares-four')+T('میله در خانه‌ها','Data bars')+'</button>'+
    '<button class="rbz-pill'+(TB.cdelta&&TB.cmp?' on':'')+'" id="rbzTCd" type="button"'+(TB.cmp?'':' disabled title="'+T('اول «مقایسه با گذشته» را روشن کنید','Turn on “Compare to past” first')+'"')+'>'+ic('palette')+T('رنگ درصد تغییر','Color % delta')+'</button>'+
    '<button class="rbz-pill" id="rbzTTr" type="button">'+ic('arrows-left-right')+T('ستون‌ها: ','Columns: ')+(TB.tr?T('مقدارهای ویژگی','property values'):T('متریک‌ها','metrics'))+' ⌄</button>'+
    '<button class="rbz-pill'+((TB.exclDays||[]).length&&tExclOk(TB)?' on':'')+'" id="rbzTEx" type="button"'+(tExclOk(TB)?'':' disabled title="'+(TB.cmp?T('با مقایسه با گذشته هم‌زمان نمی‌شود','Not together with period over period'):T('فقط برای بازه‌های «اخیر» و «از تاریخ»','Only for “Last” and “Since” ranges'))+'"')+'>'+ic('calendar-x')+((TB.exclDays||[]).length?T('بدون ','Excl. ')+TB.exclDays.map(function(d){ return T(T_WDAYS[d][0],T_WDAYS[d][1]); }).join(T('، ',', ')):T('حذف روزهای هفته','Exclude days'))+'</button>'+
    '<button class="rbz-pill" id="rbzTCmp" type="button"'+((TB.exclDays||[]).length?' disabled title="'+T('با حذف روزهای هفته هم‌زمان نمی‌شود','Not together with excluded days')+'"':'')+'>'+ic('arrows-clockwise')+(TB.cmp?T(TB.cmp==='year'?'در برابر پارسال':'در برابر دورهٔ قبل',TB.cmp==='year'?'vs. last year':'vs. previous period')+(TB.cmp2&&TB.cmp2!==TB.cmp?T(' و '+(TB.cmp2==='year'?'پارسال':'دورهٔ قبل'),' and '+(TB.cmp2==='year'?'last year':'previous period')):'')+(TB.cdmode==='abs'?T(' · عدد',' · absolute'):''):T('مقایسه با گذشته','Compare to past'))+' ⌄</button>'+
    '<button class="rbz-pill" id="rbzTTopN" type="button">'+(TB.topN===0?T('همه ردیف‌ها','All rows'):T(num(tTopN(TB))+' ردیف برتر','Top '+tTopN(TB)))+' ⌄</button>'+   /* PM 2026-10-25, AC-3: the shared Top N control */
    '<button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button><span class="rbz-drslot"></span></div>';
}
/* change vs. the previous period: bounce and exit rates are "lower is better", so their rise is bad news (color and class flip; the signed % stays) */
function tLower(c){ return !!c&&c.kind==='metric'&&(c.metric==='bounce_rate'||c.metric==='exit_rate'); }
function tDelta(c, v, p){ if(v==null||!p) return null; var d=(v-p)/p*100, good=(d>=0)!==tLower(c), a=Math.abs(d); return { d:d, cls:good?'up':'down', tint:a<1?'':(good?'g':'b')+(a<5?1:a<15?2:a<30?3:4) }; }
function tDeltaHtml(c, v, p, r, p2){
  function one(pp, m){ var dl=tDelta(c,v,pp); if(!dl) return ''; var txt;
    if(A.table.cdmode==='abs'){ var dd=v-pp, unit=r&&r.unit; txt=(dd>=0?'+':'−')+(unit==='pct'?num(Math.abs(dd),1)+T(' واحد درصد',' pts'):unit==='cur'||unit==='n'?compact(Math.abs(dd)):num(Math.abs(dd),1)); }
    else txt=fmtChange(A,dl.d,'pct');
    return '<div class="rbz-dchg '+dl.cls+'">'+(p2!=null?'<span class="lb">'+T(m==='year'?'پارسال':'دورهٔ قبل',m==='year'?'Last yr':'Prev')+'</span> ':'')+txt+'</div>'; }
  return one(p, A.table.cmp)+(p2!=null?one(p2, A.table.cmp2):''); }
function tTint(c, v, p){ if(!A.table.cdelta||!A.table.cmp) return ''; var dl=tDelta(c,v,p); return dl&&dl.tint?' cd-'+dl.tint:''; }
function tMoveCol(from, to){
  var TB=A.table; if(from===to||from<0||to<0) return; var order=TB.cols.map(function(c,i){ return i; }); order.splice(to,0,order.splice(from,1)[0]);
  var map={}; order.forEach(function(old,nw){ map[LET[old]]=LET[nw]; });
  TB.cols=order.map(function(old){ return TB.cols[old]; });
  TB.cols.forEach(function(c){ if(c.kind==='formula') c.formula=c.formula.replace(/([A-Za-z]+)\(\s*([A-Ja-j])([1-9]?)\s*\)/g, function(all, fn, L, sg){ return fn+'('+(map[L.toUpperCase()]||L)+sg+')'; }); });
  var w={}; Object.keys(TB.w||{}).forEach(function(k){ w[order.indexOf(+k)]=TB.w[k]; }); TB.w=w; TB.sortCol=Math.max(0,order.indexOf(TB.sortCol)); changed(); }
function tSorted(sec){ var TB=A.table, vals=sec.vals.map(function(v,i){ return { v:v, i:i }; }), sc=sec.cells[Math.min(TB.sortCol, sec.cells.length-1)];
  if(sc&&sc.r) vals.sort(function(a,b){ var x=sc.r.rows[a.i], y=sc.r.rows[b.i]; x=x==null?-Infinity:x; y=y==null?-Infinity:y; return TB.sortDir==='asc'?x-y:y-x; }); return vals; }
/* transposed: metrics become rows and property values columns; read-only, as in Amplitude */
function tGridT(res){
  var TB=A.table, h='';
  res.sections.forEach(function(sec){ var P=tProp(sec.prop), shown=tSorted(sec).slice(0,tTopN(TB));
    h+='<div class="rbz-tablewrap"><div class="rbz-tablehead"><b>'+(P?esc(T(P.fa,P.en)):T('بدون تفکیک','No group-by'))+'</b><span class="rbz-tag">'+ic('lock-simple')+T('فقط خواندنی','Read-only')+'</span><span class="rbz-tag">'+T('ستون‌ها: مقدارهای ویژگی','Columns: property values')+'</span></div>'+
      '<div class="sh-table-wrap"><table class="sh-table rbz-table rbz-dtable tr"><thead><tr><th class="fix">'+T('متریک','Metric')+'</th><th class="num">'+T('کل','Overall')+'</th>'+shown.map(function(row){ return '<th class="num"><bdi>'+esc(T(row.v[0],row.v[1]))+'</bdi></th>'; }).join('')+'</tr></thead><tbody>'+
      sec.cells.map(function(cell){ var r=cell.r, pv=cell.prev;
        return '<tr><td class="fix"><span class="rbz-let sm">'+tColLetter(cell.ci)+'</span>'+esc(cell.name)+'</td><td class="num strong'+tTint(cell.c,r.overall,pv&&pv.overall)+'">'+tFmt(r,r.overall)+(pv?tDeltaHtml(cell.c,r.overall,pv.overall,r,cell.prev2&&cell.prev2.overall):'')+'</td>'+
          shown.map(function(row){ var v=r.rows[row.i], p0=pv&&pv.rows[row.i]; return '<td class="num'+tTint(cell.c,v,p0)+'">'+(TB.disp==='rel'?'—':tFmt(r,v))+(pv?tDeltaHtml(cell.c,v,p0,r,cell.prev2&&cell.prev2.rows[row.i]):'')+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div></div>'; });
  return h; }
function tGrid(res){
  var TB=A.table, h='';
  if(TB.tr) return tGridT(res);
  res.sections.forEach(function(sec, gi){
    var P=tProp(sec.prop), vals=tSorted(sec);
    var M=vals.length, shown=vals.slice(0,tTopN(TB)), colMax=sec.cells.map(function(cell){ return Math.max.apply(null,(cell.r.rows||[]).filter(function(v){ return v!=null; }).concat([0])); });
    h+='<div class="rbz-tablewrap"><div class="rbz-tablehead"><b>'+(P?esc(T(P.fa,P.en)):T('بدون تفکیک','No group-by'))+'</b><span class="rbx-tipdot"'+tip(TTIPS.grid[0],TTIPS.grid[1])+'></span>'+(P?'<span class="rbz-tag">'+T(num(shown.length)+' از '+num(M)+' ردیف',shown.length+' of '+M+' rows')+'</span>':'')+'</div>'+
      '<div class="sh-table-wrap"><table class="sh-table rbz-table rbz-dtable"><thead><tr><th class="fix">'+(P?esc(T(P.fa,P.en)):'')+'</th>';
    sec.cells.forEach(function(cell,k){ var sorted=k===TB.sortCol, w=TB.w[cell.ci];
      h+='<th class="num rbz-dth" draggable="true" data-tdrag="'+cell.ci+'"'+(w?' style="width:'+w+'px;min-width:'+w+'px"':'')+'><span class="rbz-rsz" data-trsz="'+cell.ci+'" aria-hidden="true"></span><button class="rbz-thbtn" data-tcolh="'+cell.ci+'" data-k="'+k+'" type="button">'+'<span class="rbz-let sm">'+tColLetter(cell.ci)+'</span>'+esc(cell.name)+(sorted?(TB.sortDir==='asc'?' ↑':' ↓'):'')+(cell.r.attributed?' <span class="rbz-tag">'+esc(tAttrName(cell.r.attributed))+'</span>':'')+'</button>'+
        (cell.c.ee&&cell.c.ee!=='default'?'<div class="rbz-thsub">'+(cell.c.ee==='entry'?T('ورود','Entry'):T('خروج','Exit'))+'</div>':'')+'</th>'; });
    h+='</tr></thead><tbody>';
    /* Overall: its own query */
    h+='<tr class="ov"><td class="fix"><b'+tip(TTIPS.overall[0],TTIPS.overall[1])+'>'+T('کل','Overall')+'</b></td>'+sec.cells.map(function(cell){ var r=cell.r, pv=cell.prev;
      return '<td class="num strong'+tTint(cell.c,r.overall,pv&&pv.overall)+'">'+tFmt(r, r.overall)+(pv?tDeltaHtml(cell.c,r.overall,pv.overall,r,cell.prev2&&cell.prev2.overall):'')+'</td>'; }).join('')+'</tr>';
    shown.forEach(function(row, ri){ var v=row.v, i=row.i, nest=TB.nest[sec.prop]&&tProp(TB.nest[sec.prop]), open=nest&&TB.open[sec.prop+'|'+v[1]];
      h+='<tr><td class="fix">'+(nest?'<button class="rbz-rtog'+(open?' open':'')+'" data-tropen="'+esc(sec.prop+'|'+v[1])+'" type="button" aria-label="'+T('باز کردن','Expand')+'">'+ic('caret-down')+'</button>':'')+'<bdi>'+esc(T(v[0],v[1]))+'</bdi></td>'+
        sec.cells.map(function(cell,k){ var r=cell.r, val=r.rows[i], pv=cell.prev, rowSum=(r.rows||[]).reduce(function(a,b){ return a+(b||0); },0), rel=r.additive&&rowSum?val/rowSum*100:null;
          var show=TB.disp==='rel'&&rel!=null?pctTxt(rel):tFmt(r,val)+(TB.disp==='both'&&rel!=null?' <span class="rbz-rel">'+pctTxt(rel)+'</span>':'');
          var bar=TB.bars&&val!=null&&colMax[k]&&r.unit!=='pct'?'<i class="rbz-dbar" style="width:'+Math.min(100,val/colMax[k]*100).toFixed(1)+'%"></i>':'';
          return '<td class="num rbz-dcell'+tTint(cell.c,val,pv&&pv.rows[i])+'" data-tcell="'+gi+':'+k+':'+i+'" data-tr="'+ri+'">'+bar+'<span>'+show+'</span>'+(pv?tDeltaHtml(cell.c,val,pv.rows[i],r,cell.prev2&&cell.prev2.rows[i]):'')+'</td>'; }).join('')+'</tr>';
      if(open) nest.vals.forEach(function(nv,ni){ h+='<tr class="sub"><td class="fix"><bdi>'+esc(T(nv[0],nv[1]))+'</bdi></td>'+sec.cells.map(function(cell){ var r=cell.r, val=r.rows[i]; if(val==null) return '<td class="num">—</td>';
          var part=r.unit==='n'||r.unit==='cur'?Math.round(val*nv[2]*(0.85+0.3*jitter(cell.name+nv[1],ni))):val*(0.85+0.3*jitter(cell.name+nv[1],ni)); return '<td class="num">'+tFmt(r,part)+'</td>'; }).join('')+'</tr>'; });
    });
    h+='</tbody></table></div>';
    var notes=[]; if(sec.cells.some(function(c){ return !c.r.additive&&c.r.unit==='n'&&!c.r.creditGap&&!c.r.partOver; })&&P) notes.push(T('جمع ردیف‌های کاربران و نشست‌ها از «کل» بیشتر است، چون یک نفر یا یک نشست می‌تواند چند مقدار داشته باشد.','Users and sessions rows add up to more than Overall, because one person or session can carry several values.'));
    if(sec.cells.some(function(c){ return c.r.partOver; })) notes.push(T('در مدل «مشارکت» هر مقدار اعتبار کامل می‌گیرد، پس جمع ردیف‌ها از «کل» بیشتر است.','Under Participation every value gets full credit, so rows add up to more than Overall.'));
    if(sec.cells.some(function(c){ return c.r.tsErr; })) notes.push(T('زمان صرف‌شده در فرمول به کار نمی‌رود؛ خانه‌های آن فرمول «—» است.','Time spent can’t be used in a formula; that formula shows “—”.'));
    if(sec.cells.some(function(c){ return c.r.unit==='ts'; })&&P) notes.push(T('زمان صرف‌شده با هر تغییر مقدار ردیف از نو شمرده می‌شود، پس جمع ردیف‌ها از «کل» کمتر یا برابر است.','Time spent restarts whenever the row value changes, so rows add up to at most Overall.'));
    sec.cells.forEach(function(c){ var g=c.r.creditGap; if(g) notes.push(g.why==='excl'?T('ستون '+tColLetter(c.ci)+': تبدیل‌هایی که همهٔ تماس‌هایشان مقدار مستثنا بوده به هیچ ردیفی نرسیده‌اند ('+tFmt(c.r,g.n-g.total)+').','Column '+tColLetter(c.ci)+': conversions whose touches were all excluded values credit no row ('+tFmt(c.r,g.n-g.total)+').'):T('ستون '+tColLetter(c.ci)+': جمع وزن‌های مدل ۱۰۰٪ نیست، پس جمع ردیف‌ها '+tFmt(c.r,g.total)+' است نه '+tFmt(c.r,g.n)+'.','Column '+tColLetter(c.ci)+': the model’s weights don’t total 100%, so rows sum to '+tFmt(c.r,g.total)+', not '+tFmt(c.r,g.n)+'.')); });
    if(TB.disp!=='abs') notes.push(T('«درصد از کل» فقط برای ستون‌هایی که ردیف‌هایشان جمع‌پذیر است نشان داده می‌شود.','Relative % shows only for columns whose rows add up.'));
    h+=notes.length?'<div class="rbz-tnote">'+notes.join(' ')+'</div>':''; h+='</div>';
  });
  return h;
}
/* the Metrics tab: Amplitude's out-of-the-box web metrics + the project's metric library; events go through the shared picker.
   Library (Amplitude Metrics): any member creates; the project owner and admins verify («رسمی») and can delete metrics they don't own (PM 2026-10-25, TG-4).
   A column added from the library keeps its id, so editing the metric updates every column that uses it. */
var T_MTYPES={ event:['ایونت','Event segmentation'], formula:['فرمول','Formula'], funnel:['قیف (تبدیل)','Funnel'], session:['نشست','Sessions'], time:['زمان صرف‌شده','Time spent'], hybrid:['فرمول ترکیبی','Hybrid formula'],
  /* PM 2026-10-30, LX-24: retention and revenue are created here and on the events page, like Amplitude's Metrics ▸ Create Metric (note 63 §2) */
  retention:['ریتنشن','Retention'], revenue:['درآمد','Revenue'] };
var T_METRICS=[
  { id:'m1', fa:'زمان مطالعه به ازای هر صفحه', en:'Reading time per page', dFa:'میانگین زمانی که هر صفحه خوانده می‌شود.', dEn:'Average time a page is read.', type:'time', col:{ kind:'metric', metric:'ts_page', tunit:'sec', filters:[] }, owner:'pm', verified:true },
  { id:'m2', fa:'تبدیل ویدیو به اشتراک', en:'Video to subscription', dFa:'از شروع ویدیو تا شروع اشتراک در ۷ روز.', dEn:'From video start to subscription start within 7 days.', type:'funnel', col:{ kind:'conv', steps:['video_started','subscription_started'], win:7, filters:[] }, owner:'an', verified:false },
  { id:'m3', fa:'اشتراک به ازای هر نشست', en:'Subscriptions per session', dFa:'شروع اشتراک تقسیم بر نشست‌ها.', dEn:'Subscription starts divided by sessions.', type:'hybrid', col:{ kind:'hybrid', inputs:[{ L:'A', ev:'subscription_started', meas:'totals' }], sin:[{ L:'S', m:'session_totals' }], expr:'%:A/S' }, owner:'me', verified:false } ];
/* lexicon c1: the library is the project's shared store (rb-data-defs.js), so the events page shows the same list */
/* Block A: an event-type sample, so «Add Event or Metric» on Trend has something to add; added once to libraries saved before it existed */
var M_EV_SEED={ id:'m4', fa:'خوانندگان موبایل', en:'Mobile readers', dFa:'کسانی که با موبایل دست‌کم یک صفحه دیده‌اند.', dEn:'People who viewed at least one page on mobile.', type:'event', col:{ kind:'ev', ev:'page_view', meas:'uniques', filters:[{ prop:'device_type', op:'in', vals:['Mobile'] }] }, owner:'pm', verified:true };
T_METRICS.push(M_EV_SEED);
if(window.RBDefs){ var _stM=RBDefs.metrics(T_METRICS); if(_stM) T_METRICS=_stM;
  try{ if(!T_METRICS.some(function(m){ return m.id==='m4'; }) && !localStorage.getItem('shahin-metric-seed-m4')){ T_METRICS.push(JSON.parse(JSON.stringify(M_EV_SEED))); RBDefs.saveMetrics(T_METRICS); } localStorage.setItem('shahin-metric-seed-m4','1'); }catch(e){} }
function tMSave(){ if(window.RBDefs) RBDefs.saveMetrics(T_METRICS); }
/* PM 2026-10-25, cross-group (LX-21): an archived metric leaves every metric picker (Saved metrics, the Data Table's «افزودن», the library and
   Metric Explorer); tMetric(id) still finds it, so columns and charts that already use it keep working */
/* PM 2026-10-30, LX-24: retention and revenue are builder types now, so the two events-page samples are in every picker again (one list);
   the T_MTYPES check stays only as a crash guard for a type nobody defines */
function mLive(m){ return !!m&&!m.archived&&!!T_MTYPES[m.type]; }
/* ── PM 2026-10-30, LX-24: the two new types, per surface (Amplitude: "Both chart types support Event Segmentation, Revenue, and Formula
   metrics"; retention opens in the Retention chart). Revenue follows the PM's unit rule: on a chart it sits only beside metrics in the
   same currency, never beside counts or users (Shahin's rule against mixed axes); with no amount on any event, revenue is off. ── */
var MT_RET_MAX={ day:59, week:7, month:1 }, MT_UNIT_D={ day:1, week:7, month:30 }, MT_UNIT={ day:['روز','Day'], week:['هفته','Week'], month:['ماه','Month'] };
var MT_AGG={ sum:['کل درآمد','Total revenue'], aov:['میانگین سفارش','Average order value'], arpu:['درآمد هر کاربر','Revenue per user'] };
var MT_WHY={ ret:['متریک ریتنشن در نمودار ریتنشن باز می‌شود','Retention metrics open in the Retention chart'], norev:['این پروژه درآمد ثبت نمی‌کند','This project records no revenue'],
  revMix:['متریک درآمد فقط کنار متریک‌هایی با همان واحد پول می‌نشیند؛ آن را در نمودار جدا رسم کنید.','A revenue metric sits only beside metrics in the same currency; draw it on a separate chart.'],
  mixRev:['این نمودار متریک درآمد دارد و فقط متریک‌هایی با همان واحد پول می‌گیرد؛ این یکی را در نمودار جدا رسم کنید.','This chart has a revenue metric and takes only metrics in the same currency; draw this one on a separate chart.'],
  tableOnly:['این نوع متریک فقط در جدول متریک‌ها است','This metric type is Data Table only'], xNo:['این نوع متریک در نتایج آزمایش نیست','This metric type isn’t in Experiment Results'],
  xRet:['این متریک در نتایج آزمایش پشتیبانی نمی‌شود','This metric isn’t supported in experiment results'] };
function mtCurProp(p){ return !!(NUMP[p]&&NUMP[p].cur); }
function mtRevEvents(){ return RB.EVENTS.filter(function(e){ return e.w>0&&!e.deleted&&(e.props||[]).some(mtCurProp); }); }
function mtRevProps(ev){ var e=getEv(ev); return (e&&e.props||[]).filter(mtCurProp); }
function mtIsRev(id){ var m=id&&tMetric(id); return !!(m&&m.type==='revenue'); }
/* a library metric as a Data Table column / Metric Explorer metric; null = this chart can't draw it (mtWhy says why) */
function libToCol(mt){ var c=mt.col||{};
  if(mt.type==='retention'||c.kind==='ret') return null;
  if(c.kind==='rev') return { kind:'ev', ev:c.ev, meas:c.agg==='aov'?'pavg':c.agg==='arpu'?'parpu':'psum', prop:c.prop, filters:clone(c.filters||[]) };
  return clone(c); }
function mtWhy(mt, surface){ var c=mt.col||{};
  if(mt.type==='retention') return surface==='exp'?MT_WHY.xRet:MT_WHY.ret;
  if(mt.type==='revenue'&&!mtRevEvents().length) return MT_WHY.norev;
  if(surface==='mex'&&!mxFromLib(mt)) return MT_WHY.tableOnly;
  if(surface==='exp'&&!libToX(mt)) return MT_WHY.xNo;
  return null; }
/* the unit rule: does a chart's other content conflict with a revenue metric? (both directions use these) */
function tHasRev(TB){ return (TB||A.table).cols.some(function(c){ return mtIsRev(c.mid); }); }
function tCurCol(c){ return c.kind==='ev'&&(c.meas==='psum'||c.meas==='pavg'||c.meas==='parpu')&&mtCurProp(c.prop); }
function tNonCur(TB){ return (TB||A.table).cols.some(function(c){ return !tCurCol(c); }); }
function mxCurM(m){ return m.kind==='ev'&&(m.meas==='arpau'||(m.meas==='prop'&&mtCurProp(m.prop||'amount'))); }
function mxHasRev(){ return A.mex.metrics.some(function(m){ return mtIsRev(m.mid); }); }
function mxNonCur(){ return A.mex.metrics.some(function(m){ return !mxCurM(m); }); }
/* retention: day N ends N+1 days after the start (24-hour windows, not calendar dates); the window must end within 60 days */
function mtRetNorm(d){ if(!d.unit) d.unit='day'; if(d.n==null) d.n=d.day||7; if(d.unit==='day') d.day=+d.n; return d; }
function mtRetSpan(d){ var n=+d.n, k=MT_UNIT_D[d.unit||'day']; return [n*k, (n+1)*k]; }
function mtRetText(d){ var s=mtRetSpan(d), st=evName(d.start), rt=d.ret==='*'?T('هر ایونتی','any event'):'«'+evName(d.ret)+'»', u=MT_UNIT[d.unit||'day'];
  return T('کسانی که پس از «'+st+'» در '+u[0]+' '+num(+d.n)+' (بین روز '+num(s[0])+' تا '+num(s[1])+') '+rt+' فرستاده‌اند','People who, after «'+st+'», sent '+rt+' in '+u[1].toLowerCase()+' '+d.n+' (between day '+s[0]+' and '+s[1]+')'); }
function mtDflt(t){ if(t==='retention'){ var st=getEv('page_view')&&getEv('page_view').w>0?'page_view':((RB.EVENTS.filter(function(e){ return e.w>0; })[0]||{}).id||'page_view'); return { kind:'ret', start:st, ret:'*', unit:'day', n:7, day:7 }; }
  if(t==='revenue'){ var re=mtRevEvents()[0], ev=re?re.id:'purchase'; return { kind:'rev', ev:ev, prop:mtRevProps(ev)[0]||'order_value', agg:'sum', filters:[] }; }
  return t==='event'?{ kind:'ev', ev:'page_view', meas:'uniques', filters:[] }:t==='funnel'?{ kind:'conv', steps:['video_started','subscription_started'], win:7, filters:[] }:t==='session'?{ kind:'metric', metric:'bounce_rate', filters:[] }:
    t==='time'?{ kind:'metric', metric:'ts_page', tunit:'sec', filters:[] }:{ kind:'hybrid', inputs:[{ L:'A', ev:'subscription_started', meas:'totals' }], sin:t==='hybrid'?[{ L:'S', m:'session_totals' }]:[], expr:t==='hybrid'?'A/S':'A' }; }
var MT_TIPS={
  type:["<span class='tip-title'>نوع متریک</span>هر نوع، متریک را از راه خودش حساب می‌کند: ایونت شمارش می‌کند، قیف تبدیل را می‌سنجد، ریتنشن بازگشت را و درآمد جمع مبلغ را.","<span class='tip-title'>Metric type</span>Each type computes the metric its own way: Event counts, Funnel measures conversion, Retention measures return, and Revenue sums an amount."],
  ret:["<span class='tip-title'>ریتنشن</span>سهم کسانی که پس از ایونت شروع، در روز، هفته یا ماه مشخص‌شده ایونت بازگشت را فرستاده‌اند؛ هر روز یعنی ۲۴ ساعت از زمان ایونت شروع، نه تاریخ تقویم.","<span class='tip-title'>Retention</span>The share of people who, after the starting event, sent the return event on the day, week or month you set; a day means 24 hours from the starting event, not a calendar date."],
  start:["<span class='tip-title'>ایونت شروع</span>ایونتی که بازه بازگشت را برای هر نفر شروع می‌کند.","<span class='tip-title'>Starting event</span>The event that starts each person’s return window."],
  back:["<span class='tip-title'>ایونت بازگشت</span>ایونتی که نشان می‌دهد آن نفر برگشته؛ «هر ایونت فعال» یعنی هر ایونتی به جز ایونت‌های غیرفعال.","<span class='tip-title'>Return event</span>The event that shows the person came back; “Any active event” means any event except the inactive ones."],
  on:["<span class='tip-title'>بازگشت در</span>روز، هفته یا ماهی که بازگشت در آن شمرده می‌شود؛ بازه باید تا دو ماه پس از ایونت شروع تمام شود (حداکثر روز ۵۹، هفته ۷ یا ماه ۱).","<span class='tip-title'>Returns on</span>The day, week or month in which the return counts; the window must end within two months of the starting event (at most day 59, week 7 or month 1)."],
  rev:["<span class='tip-title'>درآمد</span>جمع مبلغ یک ایونت خرید با واحد پول پروژه؛ میانگین سفارش این جمع را بر تعداد خریدها و درآمد هر کاربر آن را بر تعداد کاربران فعال تقسیم می‌کند.","<span class='tip-title'>Revenue</span>The sum of a purchase event’s amount in the project’s currency; Average order value divides it by the number of purchases and Revenue per user by the number of active users."],
  rev_ev:["<span class='tip-title'>ایونت درآمد</span>فقط ایونت‌هایی که ویژگی مبلغ دارند در این فهرست هستند.","<span class='tip-title'>Revenue event</span>Only events that carry an amount property are listed."],
  amt:["<span class='tip-title'>ویژگی مبلغ</span>ویژگی‌ای که مبلغ را با واحد پول پروژه نگه می‌دارد.","<span class='tip-title'>Amount property</span>The property that holds the amount in the project’s currency."],
  agg:["<span class='tip-title'>سنجش</span>کل درآمد جمع مبلغ است؛ میانگین سفارش همان جمع تقسیم بر تعداد خریدها و درآمد هر کاربر تقسیم بر کاربران فعال همان بازه.","<span class='tip-title'>Measured as</span>Total revenue is the sum of the amount; Average order value divides it by the number of purchases and Revenue per user by the period’s active users."],
  keys:["<span class='tip-title'>ویژگی‌های کلیدی</span>چند ویژگی مثل کشور یا نوع دستگاه که «نمای کلی» و منوی تفکیک گزارش‌ساز برای این متریک اول پیشنهاد می‌دهند.","<span class='tip-title'>Key Properties</span>A few properties, such as country or device type, that the Overview and the report builder’s breakdown menu offer first for this metric."],
  kgrp:["<span class='tip-title'>ویژگی‌های کلیدی این متریک</span>ویژگی‌هایی که سازنده متریک برای تفکیک آن انتخاب کرده؛ بقیه ویژگی‌ها زیر همین گروه هستند.","<span class='tip-title'>This metric’s key properties</span>The properties the metric’s creator chose for breaking it down; every other property is listed below."] };
/* the Key Properties a breakdown menu offers first: the library metrics behind these ids, in order, without repeats or used ones */
function mtKeyFirst(mids, used){ var out=[]; (mids||[]).forEach(function(id){ var m=id&&tMetric(id); (m&&m.keyProps||[]).forEach(function(p){ if(RB.PROPS[p]&&out.indexOf(p)<0&&(used||[]).indexOf(p)<0) out.push(p); }); }); return out; }
function tMetric(id){ if(window.RBDefs){ var st=RBDefs.metrics(); if(st&&st!==T_METRICS) T_METRICS=st; } return T_METRICS.filter(function(m){ return m.id===id; })[0]; }
function tMName(m){ return T(m.fa,m.en)+(m.verified?' ✓':''); }
function tMCanEdit(m){ return m.owner==='me'||canManage(); }
function tMCanDel(m){ return m.owner==='me'||canManage(); }   /* PM 2026-10-25, TG-4: project owner or admin */
function evOptions(sel){ return RB.EVENTS.filter(function(e){ return !/heartbeat|progress/.test(e.id) && (e.id===sel||!pickHidden(e)); })   /* PM 2026-10-25, RB-19: hidden or blocked events leave the list; a metric's own event stays */.map(function(e){ return '<option value="'+e.id+'"'+(e.id===sel?' selected':'')+'>'+esc(T(e.fa,e.en))+'</option>'; }).join(''); }
function mtIcon(m){ return m.type==='time'?'timer':m.type==='funnel'?'funnel':m.type==='hybrid'||m.type==='formula'?'function':m.type==='retention'?'arrows-clockwise':m.type==='revenue'?'chart-bar':'chart-line'; }
/* PM 2026-10-30, LX-24: why a library metric can't join this Data Table (its type, or the revenue unit rule), or null */
function tLibWhy(m){ var w=mtWhy(m,'table'); if(w) return w; if(m.type==='revenue'&&tNonCur()) return MT_WHY.revMix; if(m.type!=='revenue'&&tHasRev()) return MT_WHY.mixRev; return null; }
function tAddMenu(anchor){
  /* PM 2026-10-30, LX-24: with a revenue metric in the table, only currency columns join it (the revenue unit rule) */
  var rv=tHasRev();
  var items=[{ icon:'globe', fa:'ایونت…', en:'Event…', disabled:rv, hint:rv?MT_WHY.mixRev:null, fn:function(){ eventPicker(function(id){ A.table.cols.push({ kind:'ev', ev:id, meas:'uniques', filters:[], ee:'default' }); changed(); }); } },{ head:1, fa:'متریک‌های آماده', en:'Out-of-the-box metrics' }];
  Object.keys(T_OOTB).forEach(function(k){ var off=A.table.gbs.length>1&&tIsSess({ kind:'metric', metric:k }); items.push({ icon:'chart-line', fa:T_OOTB[k][0], en:T_OOTB[k][1], disabled:off||rv, hint:rv?MT_WHY.mixRev:off?['متریک نشست فقط با یک تفکیک سطح بالا','Session metrics take one top-level group-by']:null, fn:function(){ A.table.cols.push({ kind:'metric', metric:k, filters:[], ee:'default' }); changed(); } }); });
  items.push({ head:1, fa:'کتابخانهٔ متریک‌ها', en:'Metric library' });
  T_METRICS.filter(mLive).forEach(function(m){ var why=tLibWhy(m); items.push({ icon:mtIcon(m), fa:tMName(m), en:tMName(m), disabled:!!why, hint:why||[T_MTYPES[m.type][0],T_MTYPES[m.type][1]], fn:function(){ tAddMetricCol(m); } }); });
  items.push({ icon:'plus', fa:'تعریف متریک جدید…', en:'Define new metric…', fn:function(){ tDefineModal({}); } });
  items.push({ icon:'books', fa:'مدیریت کتابخانهٔ متریک‌ها…', en:'Manage the metric library…', fn:tLibModal });
  setTimeout(function(){ U.menu(anchor, items, 'start'); }, 0);
}
function tAddMetricCol(m){ if(A.table.cols.length>=T_MAXCOL){ U.toast('حداکثر '+num(T_MAXCOL)+' ستون','Up to '+T_MAXCOL+' columns'); return; }
  var why=tLibWhy(m); if(why){ U.toast(why[0], why[1]); return; }   /* PM 2026-10-30, LX-24 */
  var col=libToCol(m); A.table.cols.push(Object.assign(col, { mid:m.id, ee:'default', filters:col.filters||[] })); changed(); }
/* edit a library metric everywhere it is used in this table (Amplitude: one synced definition) */
function tSyncMetric(m){ A.table.cols.forEach(function(c,i){ if(c.mid===m.id){ var keep={ attr:c.attr, label:c.label }, col=libToCol(m);   /* PM 2026-10-30, LX-24: through the column converter */
  if(!col){ delete c.mid; return; } A.table.cols[i]=Object.assign(col, { mid:m.id, ee:'default', filters:col.filters||[] }, keep); } }); }
function tLibModal(){
  function rows(){ return T_METRICS.filter(mLive).map(function(m){ var who=(RBShell.lib&&RBShell.lib.people&&RBShell.lib.people[m.owner])||{ fa:m.owner, en:m.owner }, why=tLibWhy(m), mw=mtWhy(m,'mex');
    return '<div class="rbz-mlrow"><div class="nm"><b>'+esc(T(m.fa,m.en))+'</b>'+(m.verified?' <span class="rbz-tag ok">'+ic('seal-check')+T('رسمی','Official')+'</span>':'')+'<div class="sub">'+esc(T(T_MTYPES[m.type][0],T_MTYPES[m.type][1]))+' · '+esc(T(who.fa,who.en))+(m.dFa?' · '+esc(T(m.dFa,m.dEn)):'')+'</div></div>'+
      '<div class="acts"><button class="sh-btn compact ghost" data-mla="add" data-id="'+m.id+'" type="button"'+(why?' disabled title="'+esc(T(why[0],why[1]))+'"':'')+'>'+T('افزودن به جدول','Add to table')+'</button>'+
      '<button class="sh-btn compact ghost" data-mla="mex" data-id="'+m.id+'" type="button"'+(mw?' disabled title="'+esc(T(mw[0],mw[1]))+'"':'')+'>'+T('کاوشگر متریک','Metric Explorer')+'</button>'+
      '<button class="sh-btn compact ghost" data-mla="edit" data-id="'+m.id+'" type="button"'+(tMCanEdit(m)?'':' disabled title="'+T('فقط سازنده، مالک پروژه یا ادمین','Only the creator, the project owner or an admin')+'"')+'>'+T('ویرایش','Edit')+'</button>'+
      '<button class="sh-btn compact ghost" data-mla="ver" data-id="'+m.id+'" type="button"'+(canManage()?'':' disabled title="'+T('فقط مالک و ادمین پروژه','Project owner and admins only')+'"')+'>'+(m.verified?T('برداشتن نشان رسمی','Remove official'):T('رسمی کردن','Mark official'))+'</button>'+
      '<button class="sh-btn compact ghost danger" data-mla="del" data-id="'+m.id+'" type="button"'+(tMCanDel(m)?'':' disabled title="'+T('فقط مالک و ادمین پروژه متریک دیگران را حذف می‌کنند','Only the project owner and admins delete others’ metrics')+'"')+'>'+T('حذف','Delete')+'</button></div></div>'; }).join('')||'<div class="rbz-sethelp">'+T('هنوز متریکی در کتابخانه نیست.','The library is empty.')+'</div>'; }
  U.modal({ fa:'کتابخانهٔ متریک‌ها', en:'Metric library', subFa:'متریک‌ها برای همه پروژه است؛ هر عضوی می‌سازد، مالک و ادمین پروژه رسمی می‌کنند. نقش شما در این دمو: '+{ owner:'مالک', admin:'ادمین', member:'عضو', viewer:'بیننده' }[PROLE], subEn:'Metrics are project-wide; any member creates them, the project owner and admins mark them official. Your role in this demo: '+PROLE, wide:true,
    body:'<div class="rbz-mlib">'+rows()+'</div><button class="rbz-linkbtn" id="rbzMlNew" type="button">'+ic('plus')+T('تعریف متریک جدید…','Define new metric…')+'</button>',
    init:function(bd, close){ function wireRows(){ bd.querySelectorAll('[data-mla]').forEach(function(b){ b.addEventListener('click', function(){ var m=tMetric(b.getAttribute('data-id')), a=b.getAttribute('data-mla');
        if(a==='add'){ close(); tAddMetricCol(m); } else if(a==='mex'){ close(); var mm=mxFromLib(m); if(mm) mxOpenWith(mm); } else if(a==='edit'){ close(); tDefineModal({ metric:m }); }
        else if(a==='ver'){ m.verified=!m.verified; tMSave(); U.toast(m.verified?'متریک رسمی شد':'نشان رسمی برداشته شد', m.verified?'Metric marked official':'Official badge removed'); bd.querySelector('.rbz-mlib').innerHTML=rows(); wireRows(); changed(); }
        else if(a==='del'){ T_METRICS.splice(T_METRICS.indexOf(m),1); tMSave(); A.table.cols.forEach(function(c){ if(c.mid===m.id) delete c.mid; }); U.toast('متریک حذف شد؛ ستون‌های این جدول به‌شکل ستون عادی می‌مانند','Metric deleted; this table’s columns stay as plain columns'); bd.querySelector('.rbz-mlib').innerHTML=rows(); wireRows(); changed(); } }); }); }
      wireRows(); bd.querySelector('#rbzMlNew').addEventListener('click', function(){ close(); tDefineModal({}); }); } });
}
/* ── PM 2026-10-30, LX-24: one field set for a metric (Amplitude: Create Metric — name, description, type, the type's fields, Key Properties).
   The builder's «تعریف متریک جدید…» and the events page's «+ ساختن متریک» (RBAmp.metricForm) render, check and save these same fields, so a
   metric made in either is the same metric everywhere. o: { metric | mid, type, col, target, types, tip(faHtml, enHtml), onChange }. ── */
function mtSync(){ if(window.RBDefs){ var st=RBDefs.metrics(); if(st&&st!==T_METRICS) T_METRICS=st; } }
function mtForm(o){
  mtSync(); var m=o.metric||(o.mid?tMetric(o.mid):null), d=m?clone(m.col):(o.col?clone(o.col):null), type=m?m.type:(o.type||'event'), keys=m?(m.keyProps||[]).slice():[], MXT=o.target==='mex';
  if(!d) d=mtDflt(type); if(type==='retention') mtRetNorm(d);
  var TYPES=(o.types||Object.keys(T_MTYPES).filter(function(k){ return !MXT||k==='formula'||k==='hybrid'; })).slice(); if(m&&TYPES.indexOf(type)<0) TYPES.push(type);
  /* PM 2026-10-30, LX-24: on the events page (o.tip) the builder's older tooltips lose their diacritics and the hamza on ه, that page's copy rule */
  function TIP(t){ var cl=function(x){ return String(x).replace(/[\u064B-\u0652\u0654]/g,''); }; return o.tip?o.tip(cl(t[0]),cl(t[1])):'<span class="rbx-tipdot"'+tip(t[0],t[1])+'></span>'; }
  function pN(p){ var P=RB.PROPS[p]; return P?T(P.fa,P.en):p; }
  function typeOff(k){ if(k==='formula'&&type==='hybrid'&&d.sin&&d.sin.length) return ['اول ورودی‌های نشست را بردارید','Remove the session inputs first']; if(k==='revenue'&&!mtRevEvents().length) return MT_WHY.norev; return null; }
  function retErr(){ var n=+d.n; if(!String(d.n).trim()||!isFinite(n)||n<1||Math.floor(n)!==n) return ['عدد را صحیح و از ۱ بنویسید','Write a whole number from 1'];
    if(n>MT_RET_MAX[d.unit||'day']) return ['بازه بازگشت باید تا دو ماه پس از ایونت شروع تمام شود','The return window must end within two months of the starting event']; return null; }
  function fields(){
    if(type==='event') return '<div class="rbz-mdrow"><select class="sh-select" data-md="ev">'+evOptions(d.ev)+'</select><select class="sh-select" data-md="meas">'+['uniques','totals','avg','active'].map(function(k){ return '<option value="'+k+'"'+(d.meas===k?' selected':'')+'>'+T(T_MEAS[k][0],T_MEAS[k][1])+'</option>'; }).join('')+'</select></div>';
    if(type==='funnel') return d.steps.map(function(id,k){ return '<div class="rbz-mdrow"><span class="rbz-let">'+num(k+1)+'</span><select class="sh-select" data-mdstep="'+k+'">'+evOptions(id)+'</select>'+(d.steps.length>2?'<button class="rbz-x" data-mdsdel="'+k+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>'; }).join('')+
      (d.steps.length<5?'<button class="rbz-linkbtn" data-mdsadd="1" type="button">'+ic('plus')+T('افزودن قدم','Add step')+'</button>':'')+'<div class="rbz-mdrow">'+T('پنجره تبدیل','Conversion window')+' <input class="sh-input sm" type="number" min="1" max="90" data-md="win" value="'+d.win+'"/> '+T('روز','days')+TIP(TTIPS.conv)+'</div>';
    if(type==='session') return '<select class="sh-select" data-md="metric">'+Object.keys(T_OOTB).filter(function(k){ return tIsSess({ kind:'metric', metric:k }); }).concat(['sess_per_user','events_per_session']).map(function(k){ return '<option value="'+k+'"'+(d.metric===k?' selected':'')+'>'+T(tMeta(k)[0],tMeta(k)[1])+'</option>'; }).join('')+'</select>';
    if(type==='time') return '<div class="rbx-field"><label>'+T('نوع','Kind')+TIP(TTIPS.ts)+'</label>'+['ts_total','ts_user','ts_page','ts_session'].map(function(k){ return '<label class="rbz-ck"><input type="radio" name="rbzMdTs" value="'+k+'"'+(d.metric===k?' checked':'')+'/>'+T(T_XM[k][0],T_XM[k][1])+'</label>'; }).join('')+'</div>'+
      '<div class="rbz-mdrow">'+T('واحد','Unit')+' <select class="sh-select" data-md="tunit">'+Object.keys(T_TUNIT).map(function(k){ return '<option value="'+k+'"'+(d.tunit===k?' selected':'')+'>'+T(T_TUNIT[k][0],T_TUNIT[k][1])+'</option>'; }).join('')+'</select></div>'+
      '<div class="rbz-mdrow">'+T('فقط صفحه‌های','Only pages of')+' <select class="sh-select" data-md="tpage"><option value="">'+T('همه صفحه‌ها','All pages')+'</option>'+RB.PROPS.page_path.vals.map(function(v){ var on=(d.filters||[]).some(function(f){ return f.prop==='page_path'&&f.vals[0]===v[1]; }); return '<option value="'+esc(v[1])+'"'+(on?' selected':'')+'>'+esc(T(v[0],v[1]))+'</option>'; }).join('')+'</select></div>';
    /* PM 2026-10-30, LX-24: retention — a starting event, a return event, and day / week / month N (Amplitude's three parameters) */
    if(type==='retention') return '<div class="rbz-sethead">'+T('ریتنشن','Retention')+TIP(MT_TIPS.ret)+'</div>'+
      '<div class="rbx-field"><label>'+T('ایونت شروع','Starting event')+TIP(MT_TIPS.start)+'</label><select class="sh-select" data-md="start">'+evOptions(d.start)+'</select></div>'+
      '<div class="rbx-field"><label>'+T('ایونت بازگشت','Return event')+TIP(MT_TIPS.back)+'</label><select class="sh-select" data-md="ret"><option value="*"'+(d.ret==='*'?' selected':'')+'>'+T('هر ایونت فعال','Any active event')+'</option>'+evOptions(d.ret==='*'?'':d.ret)+'</select></div>'+
      '<div class="rbx-field"><label>'+T('بازگشت در','Returns on')+TIP(MT_TIPS.on)+'</label><div class="rbz-mdrow"><select class="sh-select" data-md="unit" aria-label="'+T('واحد','Unit')+'">'+Object.keys(MT_UNIT).map(function(k){ return '<option value="'+k+'"'+(d.unit===k?' selected':'')+'>'+T(MT_UNIT[k][0],MT_UNIT[k][1])+'</option>'; }).join('')+'</select>'+
        '<input class="sh-input sm" type="number" min="1" step="1" data-md="n" value="'+esc(d.n)+'" aria-label="'+T('شماره روز، هفته یا ماه','Day, week or month number')+'"/></div></div>'+
      '<p class="rbz-sethelp" id="rbzMdRet">'+esc(mtRetText(d))+'</p><div class="rbz-fok" id="rbzMdE"></div>';
    /* PM 2026-10-30, LX-24: revenue — an event with an amount, its amount property, and the measure, in the project's currency */
    if(type==='revenue'){ var evs=mtRevEvents(); if(evs.length&&!evs.some(function(e){ return e.id===d.ev; })){ d.ev=evs[0].id; d.prop=mtRevProps(d.ev)[0]; } var ps=mtRevProps(d.ev), cu=curU();
      return '<div class="rbz-sethead">'+T('درآمد','Revenue')+TIP(MT_TIPS.rev)+'</div>'+(evs.length?'':'<div class="rbz-fok bad">'+T(MT_WHY.norev[0],MT_WHY.norev[1])+'</div>')+
        '<div class="rbx-field"><label>'+T('ایونت درآمد','Revenue event')+TIP(MT_TIPS.rev_ev)+'</label><select class="sh-select" data-md="ev">'+evs.map(function(e){ return '<option value="'+e.id+'"'+(e.id===d.ev?' selected':'')+'>'+esc(T(e.fa,e.en))+'</option>'; }).join('')+'</select></div>'+
        '<div class="rbx-field"><label>'+T('ویژگی مبلغ','Amount property')+TIP(MT_TIPS.amt)+'</label><select class="sh-select" data-md="prop">'+ps.map(function(p){ return '<option value="'+p+'"'+(p===d.prop?' selected':'')+'>'+esc(pN(p))+'</option>'; }).join('')+'</select></div>'+
        '<div class="rbx-field"><label>'+T('سنجش','Measured as')+TIP(MT_TIPS.agg)+'</label><select class="sh-select" data-md="agg">'+Object.keys(MT_AGG).map(function(k){ return '<option value="'+k+'"'+((d.agg||'sum')===k?' selected':'')+'>'+T(MT_AGG[k][0],MT_AGG[k][1])+'</option>'; }).join('')+'</select></div>'+
        '<p class="rbz-sethelp">'+T('واحد: '+cu[0],'Unit: '+cu[2])+'</p>'; }
    var hy=type==='hybrid';
    return '<div class="rbz-sethead">'+T('ورودی ایونت (A…)','Event inputs (A…)')+'</div>'+d.inputs.map(function(x,k){ return '<div class="rbz-mdrow"><span class="rbz-let">'+x.L+'</span><select class="sh-select" data-mdin="'+k+'">'+evOptions(x.ev)+'</select><select class="sh-select" data-mdim="'+k+'">'+['uniques','totals','avg','psum'].map(function(q){ return '<option value="'+q+'"'+((x.meas||'totals')===q?' selected':'')+'>'+T(T_MEAS[q][0],T_MEAS[q][1])+'</option>'; }).join('')+'</select>'+(d.inputs.length>1?'<button class="rbz-x" data-mdidel="'+k+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>'; }).join('')+
      (d.inputs.length<H_EV.length?'<button class="rbz-linkbtn" data-mdiadd="1" type="button">'+ic('plus')+T('ورودی ایونت','Event input')+'</button>':'')+
      (hy?'<div class="rbz-sethead">'+T('ورودی نشست (S…)','Session inputs (S…)')+'</div>'+d.sin.map(function(x,k){ return '<div class="rbz-mdrow"><span class="rbz-let">'+x.L+'</span><select class="sh-select" data-mdsn="'+k+'">'+Object.keys(H_SIN).map(function(q){ return '<option value="'+q+'"'+(x.m===q?' selected':'')+'>'+T(H_SIN[q][0],H_SIN[q][1])+'</option>'; }).join('')+'</select><button class="rbz-x" data-mdsndel="'+k+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; }).join('')+
        (d.sin.length<H_SS.length?'<button class="rbz-linkbtn" data-mdsnadd="1" type="button">'+ic('plus')+T('ورودی نشست','Session input')+'</button>':'')+'<p class="rbz-sethelp">'+T('زمان صرف‌شده ورودی فرمول نمی‌شود.','Time spent can’t be a formula input.')+'</p>':'')+
      '<div class="rbx-field"><label>'+T('عبارت','Expression')+(hy?TIP(TTIPS.hyb):'')+'</label><input class="sh-input" dir="ltr" data-md="expr" value="'+esc(d.expr)+'"/><div class="rbz-fok" id="rbzMdV"></div></div>'; }
  /* PM 2026-10-30, LX-24: Key Properties (up to five), offered first in the builder's breakdown menus and the events page's Overview */
  function keyBox(){ var opts=Object.keys(RB.PROPS).filter(function(k){ var x=RB.PROPS[k]; return x&&x.vals&&x.vals.length>1&&!x.hidden&&!x.num&&k.charAt(0)!=='_'&&keys.indexOf(k)<0; }).sort();
    return '<div class="rbx-field"><label>'+T('ویژگی‌های کلیدی','Key Properties')+TIP(MT_TIPS.keys)+'</label><div class="rbz-mdkeys">'+(keys.length?keys.map(function(p){ return '<span class="rbz-chip">'+esc(pN(p))+'<button type="button" data-mdkrm="'+esc(p)+'" aria-label="'+T('برداشتن','Remove')+'">×</button></span>'; }).join(''):'<span class="rbz-sethelp">'+T('هنوز ویژگی کلیدی ندارد','No key properties yet')+'</span>')+'</div>'+
      (keys.length<5?'<select class="sh-select" data-mdkadd="1" aria-label="'+T('افزودن ویژگی کلیدی…','Add a key property…')+'"><option value="">'+T('افزودن ویژگی کلیدی…','Add a key property…')+'</option>'+opts.map(function(p){ return '<option value="'+p+'">'+esc(pN(p))+'</option>'; }).join('')+'</select>':'<p class="rbz-sethelp">'+T('حداکثر ۵ ویژگی کلیدی','Up to 5 key properties')+'</p>')+'</div>'; }
  function typeBtns(){ return TYPES.map(function(k){ var off=typeOff(k);
      return '<button type="button" role="radio" aria-checked="'+(type===k)+'" class="'+(type===k?'on':'')+'" data-mdt="'+k+'"'+(off?' disabled title="'+esc(T(off[0],off[1]))+'"':'')+'>'+T(T_MTYPES[k][0],T_MTYPES[k][1])+'</button>'; }).join(''); }
  function html(){ return '<div class="rbx-field"><label>'+T('نام (یکتا)','Name (unique)')+'</label><input class="sh-input" id="rbzMdN" value="'+esc(m?T(m.fa,m.en):'')+'"/></div><div class="rbx-field"><label>'+T('توضیح (اختیاری)','Description (optional)')+'</label><input class="sh-input" id="rbzMdD" value="'+esc(m?T(m.dFa||'',m.dEn||''):'')+'"/></div>'+
    '<div class="rbx-field"><label>'+T('نوع متریک','Metric type')+TIP(MT_TIPS.type)+'</label><div class="rbz-seg2 sm" role="radiogroup" aria-label="'+T('نوع متریک','Metric type')+'" id="rbzMdT">'+typeBtns()+'</div></div>'+
    '<div id="rbzMdF">'+fields()+'</div><div id="rbzMdK">'+keyBox()+'</div>'; }
  function ping(){ if(o.onChange) try{ o.onChange(); }catch(e){} }
  function redraw(bd){ bd.querySelector('#rbzMdF').innerHTML=fields(); var tb=bd.querySelector('#rbzMdT'); if(tb) tb.innerHTML=typeBtns(); wireT(bd); wireF(bd); if(o.onRedraw) o.onRedraw(bd); ping(); }
  function redrawK(bd){ bd.querySelector('#rbzMdK').innerHTML=keyBox(); wireK(bd); if(o.onRedraw) o.onRedraw(bd); }
  function validity(bd){ var v=bd.querySelector('#rbzMdV'); if(v){ var er=hErrors(d); v.className='rbz-fok'+(er?' bad':''); v.textContent=er||T('فرمول معتبر است','The formula is valid'); }
    var e2=bd.querySelector('#rbzMdE'); if(e2){ var re=retErr(); e2.className='rbz-fok'+(re?' bad':''); e2.textContent=re?T(re[0],re[1]):''; var rt=bd.querySelector('#rbzMdRet'); if(rt) rt.textContent=re?'':mtRetText(d); } }
  function wireT(bd){ bd.querySelectorAll('[data-mdt]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-mdt'); if(k===type||b.disabled) return;
      var fx=(type==='formula'||type==='hybrid')&&(k==='formula'||k==='hybrid');   /* formula ↔ hybrid keeps the event inputs */
      if(fx){ if(k==='formula'&&d.sin.length) return; type=k; if(k==='hybrid'&&!d.sin.length) d.sin=[]; } else { type=k; d=mtDflt(k); } redraw(bd); }); }); }
  function wireK(bd){ var ka=bd.querySelector('[data-mdkadd]'); if(ka) ka.addEventListener('change', function(){ if(ka.value&&keys.length<5&&keys.indexOf(ka.value)<0) keys.push(ka.value); redrawK(bd); });
    bd.querySelectorAll('[data-mdkrm]').forEach(function(x){ x.addEventListener('click', function(){ var p=x.getAttribute('data-mdkrm'); keys=keys.filter(function(y){ return y!==p; }); redrawK(bd); }); }); }
  function wireF(bd){ var q=function(x){ return bd.querySelector(x); };
    bd.querySelectorAll('[data-md]').forEach(function(x){ var k0=x.getAttribute('data-md'); x.addEventListener(x.tagName==='INPUT'&&(k0==='expr'||k0==='n')?'input':'change', function(){ var k=k0;
      if(k==='win') d.win=Math.max(1,Math.min(90,+x.value||7)); else if(k==='tpage') d.filters=x.value?[{ prop:'page_path', op:'in', vals:[x.value] }]:[]; else d[k]=x.value;
      if(type==='retention'){ if(d.unit==='day'&&!retErr()) d.day=+d.n; else delete d.day; validity(bd); ping(); return; }
      if(type==='revenue'&&k==='ev'){ d.prop=mtRevProps(d.ev)[0]||''; redraw(bd); return; }
      if(k==='expr') validity(bd); ping(); }); });
    bd.querySelectorAll('input[name="rbzMdTs"]').forEach(function(r){ r.addEventListener('change', function(){ d.metric=r.value; }); });
    bd.querySelectorAll('[data-mdstep]').forEach(function(x){ x.addEventListener('change', function(){ d.steps[+x.getAttribute('data-mdstep')]=x.value; ping(); }); });
    bd.querySelectorAll('[data-mdsdel]').forEach(function(x){ x.addEventListener('click', function(){ d.steps.splice(+x.getAttribute('data-mdsdel'),1); redraw(bd); }); });
    var sa=q('[data-mdsadd]'); if(sa) sa.addEventListener('click', function(){ d.steps.push('page_view'); redraw(bd); });
    bd.querySelectorAll('[data-mdin]').forEach(function(x){ x.addEventListener('change', function(){ d.inputs[+x.getAttribute('data-mdin')].ev=x.value; ping(); }); });
    bd.querySelectorAll('[data-mdim]').forEach(function(x){ x.addEventListener('change', function(){ d.inputs[+x.getAttribute('data-mdim')].meas=x.value; }); });
    bd.querySelectorAll('[data-mdidel]').forEach(function(x){ x.addEventListener('click', function(){ d.inputs.splice(+x.getAttribute('data-mdidel'),1); d.inputs.forEach(function(y,k){ y.L=H_EV[k]; }); redraw(bd); }); });
    var ia=q('[data-mdiadd]'); if(ia) ia.addEventListener('click', function(){ d.inputs.push({ L:H_EV[d.inputs.length], ev:'page_view', meas:'totals' }); redraw(bd); });
    bd.querySelectorAll('[data-mdsn]').forEach(function(x){ x.addEventListener('change', function(){ d.sin[+x.getAttribute('data-mdsn')].m=x.value; }); });
    bd.querySelectorAll('[data-mdsndel]').forEach(function(x){ x.addEventListener('click', function(){ d.sin.splice(+x.getAttribute('data-mdsndel'),1); d.sin.forEach(function(y,k){ y.L=H_SS[k]; }); redraw(bd); }); });
    var na=q('[data-mdsnadd]'); if(na) na.addEventListener('click', function(){ d.sin.push({ L:H_SS[d.sin.length], m:'session_totals' }); redraw(bd); });
    validity(bd); }
  function wire(bd){ wireT(bd); wireF(bd); wireK(bd); var n=bd.querySelector('#rbzMdN'); if(n) n.addEventListener('input', ping); }
  function name(bd){ return bd.querySelector('#rbzMdN').value.trim(); }
  /* the checks, in the order the old modal ran them: name, unique name, the type's own fields */
  function check(bd, save){ var nm=name(bd); mtSync();
    if(save&&!nm) return ['برای متریک یک نام بنویسید','Name the metric'];
    if(save&&T_METRICS.some(function(x){ return (!m||x.id!==m.id)&&(x.fa===nm||x.en===nm); })) return ['این نام قبلا استفاده شده','That name is taken'];
    if(type==='revenue'&&!mtRevEvents().length) return MT_WHY.norev;
    if(type==='revenue'&&(!d.ev||!d.prop)) return MT_WHY.norev;
    if(type==='retention'){ var re=retErr(); if(re){ validity(bd); return re; } }
    if(d.kind==='hybrid'){ var er=hErrors(d); if(er){ var v=bd.querySelector('#rbzMdV'); if(v) v.textContent=er; return [er,er]; } }
    return null; }
  function col(){ var c=clone(d); if(type==='retention'){ mtRetNorm(c); c.n=+c.n; if(c.unit==='day') c.day=c.n; else delete c.day; } return c; }
  /* create or update the library metric; a name changed in one language renames both (the old modal's rule) */
  function store(bd){ mtSync(); var nm=name(bd), ds=bd.querySelector('#rbzMdD').value, c=col(), kp=keys.slice(0,5);
    if(m){ var tg=tMetric(m.id)||m, sameN=nm===T(tg.fa,tg.en), sameD=ds===T(tg.dFa||'',tg.dEn||'');
      Object.assign(tg, { fa:sameN?tg.fa:nm, en:sameN?tg.en:nm, dFa:sameD?tg.dFa:ds, dEn:sameD?tg.dEn:ds, type:type, col:c, keyProps:kp }); tMSave(); return tg; }
    var nw={ id:'m'+(T_METRICS.length+1)+'_'+Date.now()%1000, fa:nm, en:nm, dFa:ds, dEn:ds, type:type, col:c, owner:'me', verified:false, keyProps:kp }; T_METRICS.push(nw); tMSave(); return nw; }
  function draft(bd){ var c=d, evs=c.ev?[c.ev]:c.start?[c.start].concat(c.ret&&c.ret!=='*'?[c.ret]:[]):(c.steps||[]).concat((c.inputs||[]).map(function(i){ return i.ev; })); return { name:name(bd), evs:evs, type:type }; }
  return { html:html, wire:wire, check:check, store:store, col:col, name:name, draft:draft, type:function(){ return type; }, metric:m };
}
/* + Define new metric: one modal over the shared field set; target 'mex' (hybrid in Metric Explorer), 'exp' (Experiment Results; always saved),
   'trend' (always saved, then drawn as a series when it can be), else the Data Table */
function tDefineModal(o){
  var m=o.metric, MXT=o.target==='mex', XT=o.target==='exp', TR=o.target==='trend', F=mtForm(o);
  U.modal({ fa:m?'ویرایش متریک':'تعریف متریک جدید', en:m?'Edit metric':'Define new metric', subFa:'متریک برای همهٔ پروژه است و در هر جدول از تب «متریک‌ها» انتخاب می‌شود.', subEn:'Metrics are project-wide and appear in every table’s Metrics tab.', wide:true,
    body:F.html()+(m||XT||TR?'':'<label class="rbz-ck"><input type="checkbox" id="rbzMdSave"'+(!MXT||o.forceSave?' checked':'')+(o.forceSave?' disabled':'')+'/>'+T('در کتابخانهٔ متریک‌ها ذخیره شود','Save to the metric library')+'</label>'),
    init:function(bd){ F.wire(bd); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:m?'ذخیرهٔ متریک':'ذخیره', en:m?'Save metric':'Save', fn:function(bd){ var nm=F.name(bd), save=!!(m||XT||TR||(bd.querySelector('#rbzMdSave')||{}).checked), er=F.check(bd, save);
      if(er){ U.toast(er[0], er[1]); return false; }
      var type=F.type(), d=F.col();
      if(m){ var um=F.store(bd); tSyncMetric(um); U.toast('متریک به‌روز شد؛ همهٔ ستون‌هایش هم','Metric updated, with every column that uses it'); changed(); return; }
      var mt=save?F.store(bd):null, id=mt?mt.id:null;
      /* PM 2026-10-30, LX-24: made inside Experiment Results or Trend, the metric is saved to the library, then used there */
      if(XT){ U.toast('متریک «'+nm+'» در کتابخانه ذخیره شد','Metric “'+nm+'” saved to the library'); if(o.onSaved) o.onSaved(mt); return; }
      if(TR){ U.toast('متریک «'+nm+'» در کتابخانه ذخیره شد','Metric “'+nm+'” saved to the library'); setTimeout(function(){ addMetricSeries(mt); }, 0); return; }
      if(MXT){
        var mm={ kind:'hybrid', inputs:clone(d.inputs), sin:clone(d.sin||[]), expr:d.expr, label:save?'':nm };
        if(id) mm.mid=id;
        if(o.mxIndex!=null&&A.mex.metrics[o.mxIndex]) Object.assign(A.mex.metrics[o.mxIndex], mm); else A.mex.metrics.push(Object.assign(mm, { filters:[], adv:{ fn:'none', n:7 } }));
        A.mex.sel=null; U.toast(save?'متریک «'+nm+'» ذخیره شد':'فرمول ترکیبی روی نمودار آمد', save?'Metric “'+nm+'” saved':'Hybrid formula added to the chart'); changed(); return; }
      /* PM 2026-10-30, LX-24: the Data Table takes the metric through the column converter and the revenue unit rule */
      var col=libToCol(mt||{ type:type, col:d }), why=!col?MT_WHY.ret:(type==='revenue'?tNonCur():tHasRev())?(type==='revenue'?MT_WHY.revMix:MT_WHY.mixRev):null;
      if(why){ if(!mt){ U.toast(why[0], why[1]); return false; } U.toast('متریک «'+nm+'» در کتابخانه ذخیره شد؛ '+why[0], 'Metric “'+nm+'” saved to the library; '+why[1]); changed(); return; }
      if(A.table.cols.length<T_MAXCOL){ A.table.cols.push(Object.assign(col, { ee:'default', filters:col.filters||[] }, id?{ mid:id }:{}, nm&&!id?{ label:nm }:{})); }
      U.toast(save?'متریک «'+nm+'» ذخیره و به جدول اضافه شد':'ستون اضافه شد', save?'Metric “'+nm+'” saved and added':'Column added'); changed(); } }] });
}
/* a table formula column opened in the hybrid builder: its column letters become event inputs (Amplitude: bidirectional conversion) */
function tFormulaToHybrid(i){
  var c=A.table.cols[i], src=c.formula, inputs=[], map={}, bad=false, mode=/^\s*%:/.test(src)?'%:':'';
  var expr=src.replace(/^\s*[%$]:/,'').replace(/([A-Za-z]+)\(\s*([A-Ja-j])[1-9]?\s*\)/g, function(all, fn, L){ var col=A.table.cols[LET.indexOf(L.toUpperCase())], meas=FN[fn.toUpperCase()];
    if(!col||col.kind!=='ev'||['uniques','totals','avg','psum'].indexOf(meas)<0){ bad=true; return all; } var key=col.ev+'|'+meas;
    if(!map[key]){ if(inputs.length>=H_EV.length){ bad=true; return all; } map[key]=H_EV[inputs.length]; inputs.push({ L:map[key], ev:col.ev, meas:meas }); } return map[key]; });
  if(bad){ U.toast('فقط فرمولی که مستقیم به ستون‌های ایونت اشاره دارد تبدیل می‌شود','Only formulas that point straight at event columns convert'); return; }
  tDefineModal({ type:'formula', col:{ kind:'hybrid', inputs:inputs, sin:[], expr:mode+expr } });
}
function tSessFilterModal(i, obj){
  var c=obj||A.table.cols[i], P=tProp(A.table.gbs[0]||'page_path');
  U.modal({ fa:obj?'فیلتر نشست متریک '+LET[i]:'فیلتر نشست ستون '+tColLetter(i), en:obj?'Session filter for metric '+LET[i]:'Session filter for column '+tColLetter(i), subFa:'شرط روی کل نشست سنجیده می‌شود و روی فیلترهای کلی جدول اضافه می‌شود.', subEn:'Evaluated on the whole session; stacks on the table’s global filters.', wide:true,
    body:'<span class="rbx-tipdot"'+tip(TTIPS.sf[0],TTIPS.sf[1])+'></span><div class="rbz-seg2 sm" role="radiogroup">'+[['ev','شامل ایونت','Contains event'],['dur','مدت نشست','Session duration'],['first','اولین مقدار ویژگی','First property value'],['last','آخرین مقدار ویژگی','Last property value']].map(function(x,k){ return '<button type="button" role="radio" aria-checked="'+(k===0)+'" class="'+(k===0?'on':'')+'" data-sft="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>'+
      '<div class="rbz-mdrow" data-sfp="ev"><select class="sh-select" id="rbzSfE">'+evOptions('video_started')+'</select></div>'+
      '<div class="rbz-mdrow" data-sfp="dur" hidden><select class="sh-select" id="rbzSfO"><option value="gt">'+T('بیشتر از','More than')+'</option><option value="lt">'+T('کمتر از','Less than')+'</option></select><input class="sh-input sm" type="number" min="1" id="rbzSfS" value="60"/><select class="sh-select" id="rbzSfU"><option value="1">'+T('ثانیه','seconds')+'</option><option value="60">'+T('دقیقه','minutes')+'</option><option value="3600">'+T('ساعت','hours')+'</option><option value="86400">'+T('روز','days')+'</option></select></div>'+
      '<div class="rbz-mdrow" data-sfp="prop" hidden><select class="sh-select" id="rbzSfP">'+Object.keys(RB.PROPS).filter(function(p){ return !RB.PROPS[p].num&&p!=='_hcount'; }).map(function(p){ return '<option value="'+p+'"'+(p===(A.table.gbs[0]||'page_path')?' selected':'')+'>'+esc(pOpt(p))+'</option>'; }).join('')+'</select><select class="sh-select" id="rbzSfV"></select></div>',
    init:function(bd){ var t='ev'; function vals(){ var Q=tProp(bd.querySelector('#rbzSfP').value); bd.querySelector('#rbzSfV').innerHTML=Q.vals.map(function(v){ return '<option value="'+esc(v[1])+'">'+esc(T(v[0],v[1]))+'</option>'; }).join(''); }
      bd.querySelector('#rbzSfP').addEventListener('change', vals); vals();
      bd.querySelectorAll('[data-sft]').forEach(function(b){ b.addEventListener('click', function(){ t=b.getAttribute('data-sft'); bd.__t=t; bd.querySelectorAll('[data-sft]').forEach(function(x){ x.className=x===b?'on':''; x.setAttribute('aria-checked', x===b); });
        bd.querySelectorAll('[data-sfp]').forEach(function(x){ x.hidden=x.getAttribute('data-sfp')!==(t==='first'||t==='last'?'prop':t); }); }); }); bd.__t='ev'; },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'افزودن', en:'Add', fn:function(bd){ var t=bd.__t, f=t==='ev'?{ t:'ev', ev:bd.querySelector('#rbzSfE').value }:t==='dur'?{ t:'dur', op:bd.querySelector('#rbzSfO').value, sec:Math.max(1,(+bd.querySelector('#rbzSfS').value||60)*(+bd.querySelector('#rbzSfU').value||1)) }:{ t:t, prop:bd.querySelector('#rbzSfP').value, val:bd.querySelector('#rbzSfV').value };
      (c.sf=c.sf||[]).push(f); changed(); } }] });
}
function tColMenu(anchor, i){
  var TB=A.table, c=TB.cols[i], evc=c.kind==='ev', meas=[];
  if(evc) Object.keys(T_MEAS).forEach(function(k){ var on=(c.meas||'uniques')===k; meas.push({ fa:T_MEAS[k][0]+(on?' ✓':''), en:T_MEAS[k][1]+(on?' ✓':''), fn:function(){ c.meas=k; if((k==='psum'||k==='pavg')&&!c.prop) c.prop=Object.keys(NUMP)[0]; if(c.attr&&!tAttrOk(c,c.attr.model,TB)) c.attr=null; changed(); } }); });
  var attrOk=!!tAttrMeas(c)&&TB.gbs.length;
  setTimeout(function(){ U.menu(anchor, (evc?[{ head:1, fa:'سنجش بر اساس', en:'Measured as' }].concat(meas).concat([{ sep:1 }]):[]).concat([
    tIsSess(c)||tIsTs(c)?{ icon:'clock-countdown', fa:'افزودن فیلتر نشست…', en:'Add session filter…', fn:function(){ tSessFilterModal(i); } }:null,
    tIsSess(c)&&(c.filters||[]).length?{ icon:'stack', fa:'تفکیک از کل نشست'+((c.scope||'session')==='session'?' ✓':''), en:'Session level'+((c.scope||'session')==='session'?' ✓':''), hint:[TTIPS.scope[0].replace(/<[^>]+>/g,''),TTIPS.scope[1].replace(/<[^>]+>/g,'')], fn:function(){ c.scope='session'; changed(); } }:null,
    tIsSess(c)&&(c.filters||[]).length?{ icon:'crosshair', fa:'فقط از ایونت فیلترشده'+(c.scope==='event'?' ✓':''), en:'Event level'+(c.scope==='event'?' ✓':''), fn:function(){ c.scope='event'; changed(); } }:null,
    tIsTs(c)?{ icon:'timer', fa:'واحد: '+T_TUNIT[c.tunit||'sec'][0], en:'Unit: '+T_TUNIT[c.tunit||'sec'][1], fn:function(){ var ks=Object.keys(T_TUNIT); c.tunit=ks[(ks.indexOf(c.tunit||'sec')+1)%ks.length]; changed(); } }:null,
    c.mid&&tMetric(c.mid)?{ icon:'pencil-simple-line', fa:'ویرایش متریک…', en:'Edit metric…', disabled:!tMCanEdit(tMetric(c.mid)), hint:tMCanEdit(tMetric(c.mid))?null:['فقط سازنده، مالک پروژه یا ادمین','Only the creator, the project owner or an admin'], fn:function(){ tDefineModal({ metric:tMetric(c.mid) }); } }:null,
    c.kind==='formula'?{ icon:'function', fa:'باز کردن در سازندهٔ فرمول ترکیبی', en:'Open in the hybrid formula builder', fn:function(){ tFormulaToHybrid(i); } }:null,
    mxFromCol(c)?{ icon:'chart-line', fa:'باز کردن در کاوشگر متریک', en:'Open in Metric Explorer', fn:function(){ mxOpenWith(mxFromCol(c)); } }:null,
    c.kind==='ev'||c.kind==='metric'?{ icon:'funnel', fa:tIsSess(c)?'افزودن فیلتر ایونت':'افزودن فیلتر', en:tIsSess(c)?'Add event filter':'Add filter', fn:function(){ propFilterModal({ fa:'فیلتر ستون '+tColLetter(i), en:'Filter column '+tColLetter(i), subFa:'فقط روی همین ستون اعمال می‌شود.', subEn:'Applies to this column only.' }, propsOf(c.kind==='metric'?'page_view':c.ev), function(f){ (c.filters=c.filters||[]).push(f); changed(); }); } }:null,
    { icon:'share-network', fa:'اتریبیوشن…', en:'Attribution…', disabled:!attrOk||(c.ee&&c.ee!=='default'), hint:!TB.gbs.length?['اول یک ویژگی برای ردیف‌ها انتخاب کنید','Pick a row property first']:(c.ee&&c.ee!=='default')?['با تحلیل ورود/خروج هم‌زمان نمی‌شود','Not together with Entry/Exit']:!attrOk?['برای کاربران، تعداد دفعات، مجموع ویژگی، نشست‌ها، تبدیل یا فرمول','For users, totals, property sum, sessions, conversion or formula']:null, fn:function(){ tAttrModal(i); } },
    { icon:'arrow-'+(fa()?'left':'right'), fa:'تحلیل ورود/خروج…', en:'Enable Entry/Exit analysis…', disabled:c.kind==='formula'||!!c.attr||!TB.gbs.length, hint:c.attr?['با اتریبیوشن هم‌زمان نمی‌شود','Not together with attribution']:!TB.gbs.length?['اول یک ویژگی برای ردیف‌ها انتخاب کنید','Pick a row property first']:null, fn:function(){ tEEModal(i); } },
    { sep:1 },
    { icon:'arrow-'+(fa()?'left':'right'), fa:'مرتب‌سازی نزولی', en:'Sort descending', fn:function(){ TB.sortCol=i; TB.sortDir='desc'; changed(); } },
    { icon:'arrow-'+(fa()?'right':'left'), fa:'مرتب‌سازی صعودی', en:'Sort ascending', fn:function(){ TB.sortCol=i; TB.sortDir='asc'; changed(); } },
    { icon:'pencil-simple', fa:'تغییر نام…', en:'Rename…', fn:function(){ var nm=window.prompt(T('نام ستون','Column name'), tColName(c)); if(nm!=null){ c.label=nm.trim(); changed(); } } },
    c.label?{ icon:'arrows-clockwise', fa:'بازگرداندن نام اصلی', en:'Reset to original name', fn:function(){ c.label=''; changed(); } }:null,
    { icon:'floppy-disk', fa:'ذخیره به‌عنوان متریک…', en:'Save as metric…', disabled:(c.kind==='metric'&&!tIsTs(c))||!!c.mid, hint:c.mid?['این ستون از کتابخانه است','This column comes from the library']:c.kind==='metric'&&!tIsTs(c)?['متریک آماده است','Already an out-of-the-box metric']:null,
      fn:function(){ if(c.kind==='formula'){ tFormulaToHybrid(i); return; } var col=clone(c); delete col.attr; delete col.label; tDefineModal({ type:c.kind==='ev'?'event':c.kind==='conv'?'funnel':tIsTs(c)?'time':c.sin&&c.sin.length?'hybrid':'formula', col:col }); } },
    { icon:'copy', fa:'تکرار ستون', en:'Duplicate', disabled:TB.cols.length>=T_MAXCOL, fn:function(){ TB.cols.splice(i+1,0,clone(c)); changed(); } },
    { icon:'trash', fa:'حذف ستون', en:'Remove', danger:true, fn:function(){ TB.cols.splice(i,1); if(TB.sortCol>=TB.cols.length) TB.sortCol=0; changed(); } } ].filter(Boolean)), 'start'); }, 0);
}
function tAttrModal(i){
  var TB=A.table, c=TB.cols[i], cur=c.attr||{ model:'last', lb:30 }, P=tProp(TB.gbs[0]), chan=/^_channel/.test(TB.gbs[0]||'');
  var models=Object.keys(T_ATTR).concat(T_CUSTOM.filter(function(m){ return m.shared||m.owner==='me'; }).map(function(m){ return m.id; }));
  function row(k){ var ok=tAttrOk(c,k,TB), cm=tCustom(k), w=cm?cm.w:T_POS[k];
    return '<label class="rbz-ck'+(ok?'':' off')+'"><input type="radio" name="rbzTAm" value="'+k+'"'+(cur.model===k&&ok?' checked':'')+(ok?'':' disabled')+'/>'+esc(tAttrName(k))+
      (w?' <span class="rbz-tag">'+w.map(function(x){ return num(x); }).join('/')+'</span>':'')+(cm?' <span class="rbz-tag">'+T('سفارشی','Custom')+(cm.lock?' · '+T('نگاه به عقب قفل: '+num(cm.lb)+' روز','lookback locked: '+cm.lb+' d'):'')+'</span>':'')+
      (k==='dd'?'<span class="rbx-tipdot"'+tip(TTIPS.dd[0],TTIPS.dd[1])+'></span>':'')+(ok?'':' <span class="rbz-tag">'+esc(tAttrWhy(c,k,TB))+'</span>')+'</label>'; }
  U.modal({ fa:'اتریبیوشن ستون '+tColLetter(i), en:'Attribution for column '+tColLetter(i), subFa:'هر تبدیل «'+tColName(c)+'» به مقدارهای «'+P.fa+'» نسبت داده می‌شود؛ فقط تفکیک بیرونی اتریبیوت می‌شود و تفکیک‌های داخلی مقدارشان را از همان ایونت می‌گیرند.', subEn:'Each “'+tColName(c)+'” conversion is credited to values of “'+P.en+'”; only the outermost group-by is attributed, and inner group-bys inherit from the attributed event.', wide:true,
    body:'<div class="rbx-field"><label>'+T('مدل','Model')+'<span class="rbx-tipdot"'+tip(TTIPS.attr[0],TTIPS.attr[1])+'></span></label>'+
      ['first','last','lnd','linear'].map(row).join('')+'<div class="rbz-sethead">'+T('موقعیتی','Position-based')+'<span class="rbx-tipdot"'+tip(TTIPS.pos[0],TTIPS.pos[1])+'></span></div>'+['ushape','jshape','ijshape'].map(row).join('')+
      '<div class="rbz-sethead">'+T('سایر','Other')+'</div>'+['part','dd'].map(row).join('')+models.filter(function(k){ return tCustom(k); }).map(row).join('')+
      '<button class="rbz-linkbtn" id="rbzTCm" type="button"'+(canManage()?'':' disabled title="'+T('فقط مالک و ادمین پروژه','Project owner and admins only')+'"')+'>'+ic('plus')+T('مدل سفارشی…','Custom model…')+'</button></div>'+
      '<div class="rbx-field"><label>'+T('بازهٔ نگاه به عقب','Lookback window')+'</label><select class="sh-select" id="rbzTLb">'+[7,30,90].map(function(d){ return '<option value="'+d+'"'+(cur.lb===d?' selected':'')+'>'+T(num(d)+' روز',d+' days')+'</option>'; }).join('')+'</select></div>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzTAll"/>'+T('روی همهٔ ستون‌های جدول اعمال شود','Apply to all columns')+'</label>'+
      (chan?'<div class="rbx-callout warn">'+ic('warning')+'<span>'+T('ردیف‌ها با طبقه‌بند کانال ساخته شده‌اند؛ طبقه‌بند پیش از اتریبیوشن اعمال می‌شود و ممکن است اعتبار به کانالی برسد که انتظارش را ندارید (مثلاً فقط cpc).','Rows come from a channel classifier; it applies before attribution, so credit can land on a channel you don’t expect (e.g. cpc only).')+'</span></div>':'')+
      '<p class="rbz-sethelp">'+T('اولین/آخرین تماس و آخرین تماس غیرمستقیم: کل اعتبار به یک مقدار، پس تعداد دفعات با «کل» جمع می‌خورد. خطی و موقعیتی: هر تبدیل بین تماس‌ها تقسیم می‌شود. مشارکت: هر مقدار اعتبار کامل می‌گیرد. برای کاربران هیچ مدلی با «کل» جمع نمی‌خورد، چون یک نفر چند تبدیل دارد. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود.','First/last and last non-direct touch: all credit to one value, so event totals add up to Overall. Linear and position-based: each conversion is split across its touches. Participation: every value gets full credit. For users no model adds up to Overall, as one person has several conversions. An anonymous user counts once per device.')+'</p>',
    init:function(bd, close){ var lbS=bd.querySelector('#rbzTLb'); function lock(){ var m=(bd.querySelector('input[name="rbzTAm"]:checked')||{}).value, cm=tCustom(m); lbS.disabled=!!(cm&&cm.lock); if(cm&&cm.lock) lbS.value=String(cm.lb); }
      bd.querySelectorAll('input[name="rbzTAm"]').forEach(function(r){ r.addEventListener('change', lock); }); lock();
      var cmb=bd.querySelector('#rbzTCm'); if(cmb) cmb.addEventListener('click', function(){ close(); tCustomModal(function(id){ c.attr={ model:id, lb:tCustom(id).lb }; changed(); }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var m=(bd.querySelector('input[name="rbzTAm"]:checked')||{}).value; if(!m){ U.toast('یک مدل انتخاب کنید','Pick a model'); return false; }
      var a={ model:m, lb:+bd.querySelector('#rbzTLb').value }, n0=0;
      (bd.querySelector('#rbzTAll').checked?TB.cols:[c]).forEach(function(x){ if(tAttrOk(x,m,TB)){ x.attr=clone(a); n0++; } }); if(bd.querySelector('#rbzTAll').checked) U.toast('روی '+num(n0)+' ستون اعمال شد','Applied to '+n0+' columns'); changed(); } }] });
}
/* Amplitude: "You must be an Admin or Manager to create a custom attribution model" — PM 2026-10-25, TG-4: in Shahin, the project owner or an admin */
function tCustomModal(done){
  if(!canManage()){ U.toast('فقط مالک و ادمین پروژه مدل سفارشی می‌سازند','Only the project owner and admins create custom models'); return; }
  var P=tProp(A.table.gbs[0]||'utm_source');
  U.modal({ fa:'مدل اتریبیوشن سفارشی', en:'Custom attribution model', subFa:'وزن اولین، میانی‌ها و آخرین تماس؛ سهم میانی مساوی بین تماس‌های وسط پخش می‌شود و اگر تماس میانی نباشد نصف‌نصف به اولین و آخرین می‌رسد.', subEn:'Weights for the first, middle and last touches; the middle share spreads evenly over the touches in between, and with none it goes half to the first and half to the last.', wide:true,
    body:'<div class="rbx-field"><label>'+T('نام','Name')+'</label><input class="sh-input" id="rbzCmN"/></div><div class="rbx-field"><label>'+T('توضیح','Description')+'</label><input class="sh-input" id="rbzCmD"/></div>'+
      '<div class="rbz-cmw">'+[['اولین تماس','First touch',40],['تماس‌های میانی','Middle touches',20],['آخرین تماس','Last touch',40]].map(function(x,k){ return '<label>'+T(x[0],x[1])+'<input class="sh-input" type="number" min="0" max="100" data-cmw="'+k+'" value="'+x[2]+'"/>٪</label>'; }).join('')+'</div><div class="rbz-ferr" id="rbzCmE"></div>'+
      '<div class="rbx-field"><label>'+T('بازهٔ نگاه به عقب پیش‌فرض','Default lookback window')+'</label><select class="sh-select" id="rbzCmL">'+[7,30,90].map(function(d){ return '<option value="'+d+'"'+(d===30?' selected':'')+'>'+T(num(d)+' روز',d+' days')+'</option>'; }).join('')+'</select></div>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzCmK"/>'+T('قفل بازهٔ نگاه به عقب','Lock the lookback window')+'</label><label class="rbz-ck"><input type="checkbox" id="rbzCmS" checked/>'+T('اشتراک با همهٔ پروژه','Share with the project')+'</label>'+
      '<div class="rbx-field"><label>'+T('مقدارهایی که تماس حساب نمی‌شوند','Values that aren’t touch points')+' · '+esc(T(P.fa,P.en))+'</label><div class="rbz-chk">'+P.vals.map(function(v){ return '<label class="rbz-ck"><input type="checkbox" data-cmx="'+esc(v[1])+'"/><bdi>'+esc(T(v[0],v[1]))+'</bdi></label>'; }).join('')+'</div></div>',
    init:function(bd){ function chk(){ var t=[].slice.call(bd.querySelectorAll('[data-cmw]')).reduce(function(a,x){ return a+(+x.value||0); },0);
        bd.querySelector('#rbzCmE').textContent=t===100?'':T('جمع وزن‌ها '+num(t)+'٪ است؛ پیشنهاد ۱۰۰٪ است وگرنه ردیف‌ها با «کل» جمع نمی‌خورند.','Weights total '+t+'%; 100% is recommended, otherwise rows won’t add up to Overall.'); }
      bd.querySelectorAll('[data-cmw]').forEach(function(x){ x.addEventListener('input', chk); }); chk(); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var nm=bd.querySelector('#rbzCmN').value.trim(); if(!nm){ U.toast('برای مدل یک نام بنویسید','Name the model'); return false; }
      if(T_CUSTOM.some(function(m){ return m.fa===nm||m.en===nm; })){ U.toast('این نام قبلاً استفاده شده','That name is taken'); return false; }
      var w=[].slice.call(bd.querySelectorAll('[data-cmw]')).map(function(x){ return Math.max(0,+x.value||0); }), id='cm'+(T_CUSTOM.length+1);
      T_CUSTOM.push({ id:id, fa:nm, en:nm, dFa:bd.querySelector('#rbzCmD').value, dEn:bd.querySelector('#rbzCmD').value, w:w, lb:+bd.querySelector('#rbzCmL').value, lock:bd.querySelector('#rbzCmK').checked, shared:bd.querySelector('#rbzCmS').checked,
        excl:[].slice.call(bd.querySelectorAll('[data-cmx]:checked')).map(function(x){ return x.getAttribute('data-cmx'); }), owner:'me' });
      U.toast('مدل «'+nm+'» ذخیره شد','Model “'+nm+'” saved'); if(done) done(id); } }] });
}
function tEEModal(i){
  var c=A.table.cols[i];
  U.modal({ fa:'تحلیل ورود/خروج', en:'Entry/Exit analysis', subFa:'ستون «'+tColName(c)+'»', subEn:'Column “'+tColName(c)+'”',
    body:'<span class="rbx-tipdot"'+tip(TTIPS.ee[0],TTIPS.ee[1])+'></span>'+[['default','پیش‌فرض (تفکیک معمولی)','Default (standard group-by)'],['entry','ورود: اولین مقدار در نشست','Entry: the first value in the session'],['exit','خروج: آخرین مقدار در نشست','Exit: the last value in the session']].map(function(o){ return '<label class="rbz-ck"><input type="radio" name="rbzTEe" value="'+o[0]+'"'+((c.ee||'default')===o[0]?' checked':'')+'/>'+T(o[1],o[2])+'</label>'; }).join(''),
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ c.ee=(bd.querySelector('input[name="rbzTEe"]:checked')||{}).value||'default'; changed(); } }] });
}
function tFormulaModal(){
  U.modal({ fa:'ستون فرمول', en:'Formula column', subFa:'حرف هر ستون را داخل یک تابع بنویسید؛ مثلاً TOTALS(B)/UNIQUES(A). با %: نتیجه درصد نمایش داده می‌شود. اگر یک ردیف برای یکی از جمله‌ها مقدار نداشته باشد «—» می‌گیرد.', subEn:'Put a column’s letter inside a function, e.g. TOTALS(B)/UNIQUES(A). Prefix with %: to show a percentage. A row missing any term shows “—”.',
    body:'<input class="sh-input" id="rbzTFx" dir="ltr" value="%:TOTALS(B)/UNIQUES(A)"/><div class="rbz-ferr" id="rbzTFe"></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'افزودن', en:'Add', fn:function(bd){ var f=bd.querySelector('#rbzTFx').value.trim(); try{ var p=parseFormula(f), bad=[], ts=[], tagg=[]; (function w(n){ if(!n) return; if(n.agg) tagg.push(n.agg); if(n.ev&&LET.indexOf(n.ev)>=A.table.cols.length) bad.push(n.ev); if(n.ev&&tIsTs(A.table.cols[LET.indexOf(n.ev)])) ts.push(n.ev); w(n.a); w(n.b); })(p.tree);
        /* PM 2026-10-25, CR-11: the aggregation functions run over intervals, which a Data Table row doesn't have */
        if(tagg.length){ bd.querySelector('#rbzTFe').textContent=T('تابع '+tagg[0]+' روی بازه‌های زمانی کار می‌کند و جدول متریک‌ها بازه زمانی ندارد','The '+tagg[0]+' function runs over time intervals, which the Data Table doesn’t have'); return false; }
        if(ts.length){ bd.querySelector('#rbzTFe').textContent=T('ستون '+ts.join('، ')+' زمان صرف‌شده است و در فرمول به کار نمی‌رود','Column '+ts.join(', ')+' is time spent and can’t be used in a formula'); return false; }
        if(bad.length){ bd.querySelector('#rbzTFe').textContent=T('ستون '+bad.join('، ')+' وجود ندارد','Column '+bad.join(', ')+' doesn’t exist'); return false; } }catch(e){ bd.querySelector('#rbzTFe').textContent=T(e.msg[0],e.msg[1]); return false; }
      A.table.cols.push({ kind:'formula', formula:f, filters:[], ee:'default' }); changed(); } }] });
}
function tCellMenu(td){
  var p=td.getAttribute('data-tcell').split(':'), sec=lastT.sections[+p[0]], cell=sec.cells[+p[1]], i=+p[2], v=sec.vals[i], val=cell.r.rows[i], c=cell.c;
  var lb=[tColName(c)+' · '+v[0], tColName(c)+' · '+v[1]], ev=c.kind==='metric'?'page_view':c.kind==='conv'?c.steps[0]:c.ev, rf={ prop:sec.prop, op:'in', vals:[v[1]] };
  setTimeout(function(){ U.menu(td, [ { head:1, fa:lb[0]+' · '+tFmt(cell.r,val), en:lb[1]+' · '+tFmt(cell.r,val) },
    { icon:'chart-line', fa:'باز کردن به‌شکل نمودار', en:'Open as chart', disabled:c.kind==='formula'||c.kind==='hybrid'||tIsTs(c), hint:c.kind==='hybrid'||tIsTs(c)?['این متریک فقط در جدول متریک‌ها حساب می‌شود','This metric is computed only in data tables']:null, fn:function(){
        if(c.kind==='conv'){ A.events=c.steps.map(function(id,k){ return { id:id, filters:k===0?[rf]:[], groupBy:'' }; }); A.funnel=Object.assign(blankFunnel(), { win:{ n:c.win||7, u:'day' } }); A.sel=null; RB.setType('funnel'); changed(); return; } var meas=c.kind==='ev'&&MEAS[c.meas]?c.meas:c.kind==='metric'&&T_OOTB[c.metric][2]==='totals'?'totals':'uniques';
        A.events=[{ id:jReal(ev), filters:(c.filters||[]).concat([rf]), groupBy:'' }]; A.measure=meas; A.viz='line'; A.sel=null; RB.setType('trend'); changed(); } },
    { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), disabled:c.kind==='formula'||cell.r.unit!=='n', hint:c.kind==='formula'?['از خانهٔ فرمول کوهورت ساخته نمی‌شود','No cohort from a formula cell']:cell.r.unit!=='n'?['فقط از خانه‌های تعداد','Only from count cells']:null, fn:function(){ cohortModal(lb, Math.round(val), jReal(ev), ['«'+tColName(c)+'» با '+v[0], '“'+tColName(c)+'” with '+v[1], true]); } },
    { icon:'copy', fa:'کپی مقدار', en:'Copy value', fn:function(){ try{ navigator.clipboard.writeText(String(val)); }catch(e){} U.toast('کپی شد','Copied'); } },
    { icon:'export', fa:'خروجی CSV جدول', en:'Export table CSV', fn:tCsv } ].concat(tCellPeople(lb, val, cell, ev, i)), 'start'); }, 0);
}
/* Block C: «Clicking any cell opens a list of users behind that number» (Amplitude Data Tables) — only count cells have people behind them */
function tCellPeople(lb, val, cell, ev, i){ var ok=cell.r.unit==='n'&&cell.c.kind!=='formula'&&val>0, n=Math.round(val||0), seed=lb[1]+i, why=['فقط خانه‌هایی که عدد نفر یا دفعه دارند','Only cells that count people or times'];
  if(!ok) return [{ sep:1 },{ icon:'users', fa:UL()[0], en:UL()[1], disabled:true, hint:why }];
  return [{ sep:1 },{ icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb, n, seed); } },{ icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb, n, seed); } }].concat(msPeopleItems(lb, n, seed, ev)); }
function tCsv(){
  var r=lastT; if(!r||r.empty) return; var q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; }, lines=[], allRows=0, outRows=0;
  r.sections.forEach(function(sec){ var P=tProp(sec.prop); lines.push([P?T(P.fa,P.en):''].concat(sec.cells.map(function(c){ return c.name; })).map(q).join(','));
    lines.push([T('کل','Overall')].concat(sec.cells.map(function(c){ return c.r.overall==null?'':c.r.overall; })).map(q).join(','));
    /* PM 2026-10-25, AC-3: rows past the CSV cap are cut, and the toast says so */
    sec.vals.forEach(function(v,i){ allRows++; if(outRows>=T_CSV_CAP) return; outRows++; lines.push([T(v[0],v[1])].concat(sec.cells.map(function(c){ var x=c.r.rows[i]; return x==null?'':x; })).map(q).join(',')); }); lines.push(''); });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='data-table.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  if(allRows>outRows) U.toast('فایل CSV دانلود شد: '+num(outRows)+' ردیف از '+num(allRows)+'؛ خروجی حداکثر '+num(T_CSV_CAP)+' ردیف دارد','CSV downloaded: '+outRows+' of '+allRows+' rows; the export stops at '+T_CSV_CAP+' rows');
  else U.toast('فایل CSV دانلود شد','CSV downloaded');
}
/* the UTM page's table as a Data Table (Entry semantics, as the UTM page defines sessions by their first value) */
function tSeedUtm(gb){ A.table=Object.assign(blankTable(), { gbs:[gb||'utm_source'], cols:[{ kind:'metric', metric:'session_totals', filters:[], ee:'entry' },{ kind:'metric', metric:'visitors', filters:[], ee:'entry' },{ kind:'metric', metric:'page_views', filters:[], ee:'default' },{ kind:'metric', metric:'bounce_rate', filters:[], ee:'default' },{ kind:'metric', metric:'avg_session_duration', filters:[], ee:'default' }] });
  if(getEv('subscription_started')) A.table.cols.push({ kind:'ev', ev:'subscription_started', meas:'totals', filters:[], ee:'default', attr:{ model:'lnd', lb:30 } }); }
function tTile(q, ovr){
  var st=norm(clone(q.amp||{})), r=tCompute(st, { range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) }); if(r.empty) return null;
  var sec=r.sections[0], c=sec.cells[0], idx=sec.vals.map(function(v,i){ return i; }).sort(function(a,b){ return (c.r.rows[b]||0)-(c.r.rows[a]||0); }).slice(0,5);
  return { val:tFmt(c.r,c.r.overall), num:c.r.overall, sub:c.name+' · '+T(r.R.fa,r.R.en), viz:'', rows:idx.map(function(i){ return [T(sec.vals[i][0],sec.vals[i][1]), tFmt(c.r,c.r.rows[i])]; }), range:r.R };
}
function wireTable(){
  if(!isTable()) return;
  var TB=A.table, q=function(s){ return root.querySelector(s); };
  root.querySelectorAll('[data-tadd]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); tAddMenu(b); }); });
  var fx=q('[data-tformula]'); if(fx) fx.addEventListener('click', tFormulaModal);
  /* PM 2026-10-25, AC-3: the shared Top N menu */
  var ttn=q('#rbzTTopN'); if(ttn) ttn.addEventListener('click', function(e){ e.stopPropagation();
    U.menu(ttn, T_TOPN_OPTS.map(function(n){ var on=(TB.topN==null?T_TOPN:TB.topN)===n; return { fa:(n?num(n)+' ردیف برتر':'همه ردیف‌ها')+(on?' ✓':''), en:(n?'Top '+n:'All rows')+(on?' ✓':''), fn:function(){ TB.topN=n; changed(); } }; }), 'start'); });
  var cl=q('[data-tclass]'); if(cl) cl.addEventListener('click', tClassifierModal);
  var hx=q('[data-thybrid]'); if(hx) hx.addEventListener('click', function(){ tDefineModal({ type:'hybrid' }); });
  root.querySelectorAll('[data-tsfdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-tsfdel').split(':'); TB.cols[+p[0]].sf.splice(+p[1],1); changed(); }); });
  root.querySelectorAll('[data-tscdel]').forEach(function(b){ b.addEventListener('click', function(){ TB.cols[+b.getAttribute('data-tscdel')].scope='session'; changed(); }); });
  var sd=$('rbzTSeed'); if(sd) sd.addEventListener('click', function(){ tSeedUtm('utm_source'); changed(); });
  root.querySelectorAll('[data-tcolmenu]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); tColMenu(b, +b.getAttribute('data-tcolmenu')); }); });
  root.querySelectorAll('[data-tcolh]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); tColMenu(b, +b.getAttribute('data-tcolh')); }); });
  root.querySelectorAll('[data-tfdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-tfdel').split(':'); TB.cols[+p[0]].filters.splice(+p[1],1); changed(); }); });
  root.querySelectorAll('[data-tadel]').forEach(function(b){ b.addEventListener('click', function(){ TB.cols[+b.getAttribute('data-tadel')].attr=null; changed(); }); });
  root.querySelectorAll('[data-teedel]').forEach(function(b){ b.addEventListener('click', function(){ TB.cols[+b.getAttribute('data-teedel')].ee='default'; changed(); }); });
  var ga=q('[data-tgadd]'); if(ga) ga.addEventListener('click', function(e){ e.stopPropagation(); tTimeProps(); var used=TB.gbs, props=Object.keys(RB.PROPS).filter(function(p){ return p!=='_hcount'&&!RB.PROPS[p].num&&used.indexOf(p)<0&&!tIsTime(p); });
    var tm=T_TIME.filter(function(p){ return RB.PROPS[p]&&used.indexOf(p)<0; });
    /* PM 2026-10-30, LX-24: the Key Properties of the table's library metrics come first, in column order, without repeats */
    var kf=mtKeyFirst(TB.cols.map(function(c){ return c.mid; }), used).filter(function(p){ return props.indexOf(p)>-1; }), kh=kf.length?[{ head:1, fa:'ویژگی‌های کلیدی این متریک', en:'This metric’s key properties', hint:MT_TIPS.kgrp }].concat(kf.map(function(p){ return { icon:'tag', fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ TB.gbs.push(p); changed(); } }; })):[];
    U.menu(ga, kh.concat([{ head:1, fa:'زمان', en:'Time' }]).concat(tm.map(function(p){ return { icon:'calendar-blank', fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ TB.gbs.push(p); changed(); } }; }))
      .concat([{ head:1, fa:'ویژگی‌ها', en:'Properties' }]).concat(props.map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ TB.gbs.push(p); changed(); } }; })), 'start'); });
  root.querySelectorAll('[data-tgdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=TB.gbs.splice(+b.getAttribute('data-tgdel'),1)[0]; delete TB.nest[p]; delete TB.persist[p]; if(!TB.gbs.length) TB.cols.forEach(function(c){ c.attr=null; c.ee='default'; }); changed(); }); });
  root.querySelectorAll('[data-tnest]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var gi=+b.getAttribute('data-tnest'), top=TB.gbs[gi], props=Object.keys(RB.PROPS).filter(function(p){ return p!=='_hcount'&&!RB.PROPS[p].num&&p!==top; });
    U.menu(b, props.map(function(p){ var two=tIsTime(top)&&tIsTime(p);
      return { fa:pFa(p), en:pEn(p), disabled:two, hint:two?['یک تفکیک زمانی کافی است','One time group-by is enough']:null, fn:function(){
        if(tIsTime(top)&&!tIsTime(p)){ TB.gbs[gi]=p; delete TB.nest[top]; TB.nest[p]=top; changed(); U.toast('تفکیک زمانی همیشه آخر می‌آید؛ «'+RB.PROPS[p].fa+'» بالا و زمان زیر آن رفت','Time group-bys always come last; “'+RB.PROPS[p].en+'” moved up and time below it'); return; }
        TB.nest[top]=p; changed(); } }; }), 'start'); }); });
  root.querySelectorAll('[data-tpers]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); tPersistModal(+b.getAttribute('data-tpers')); }); });
  root.querySelectorAll('[data-tpdel]').forEach(function(b){ b.addEventListener('click', function(){ delete TB.persist[b.getAttribute('data-tpdel')]; changed(); }); });
  var bk=$('rbzTBlk'); if(bk&&TBLK) bk.addEventListener('click', TBLK.fn);
  root.querySelectorAll('[data-tropen]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-tropen'); TB.open[k]=!TB.open[k]; changed(); }); });
  root.querySelectorAll('[data-tdisp]').forEach(function(b){ b.addEventListener('click', function(){ TB.disp=b.getAttribute('data-tdisp'); changed(); }); });
  var br=$('rbzTBars'); if(br) br.addEventListener('click', function(){ TB.bars=!TB.bars; changed(); });
  var cp=$('rbzTCmp'); if(cp) cp.addEventListener('click', function(e){ e.stopPropagation();
    var P2=[['prev','دورهٔ قبل','Previous period'],['year','پارسال','Last year']];
    var items=[{ head:1, fa:'دورهٔ مقایسه', en:'Compare to' }].concat([['','بدون مقایسه','No comparison']].concat(P2).map(function(x){ var on=TB.cmp===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ TB.cmp=x[0]; if(!x[0]||TB.cmp2===x[0]) TB.cmp2=''; changed(); } }; }));
    if(TB.cmp){ items.push({ head:1, fa:'دورهٔ دوم (اختیاری)', en:'Second period (optional)' });
      P2.filter(function(x){ return x[0]!==TB.cmp; }).forEach(function(x){ var on=TB.cmp2===x[0]; items.push({ icon:'plus', fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ TB.cmp2=on?'':x[0]; changed(); } }); });
      items.push({ head:1, fa:'نمایش تغییر', en:'Show change as' });
      [['pct','درصد تغییر','% change'],['abs','عدد تغییر','Absolute change']].forEach(function(x){ var on=(TB.cdmode||'pct')===x[0]; items.push({ fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ TB.cdmode=x[0]; changed(); } }); }); }
    U.menu(cp, items, 'start'); });
  root.querySelectorAll('[data-tcell]').forEach(function(td){ td.addEventListener('click', function(){ if(SELDRAG) return; if(SEL){ SEL=null; root.querySelectorAll('td.rbz-dcell.sel').forEach(function(x){ x.classList.remove('sel'); }); var sb=$('rbzTSel'); if(sb) sb.remove(); } tCellMenu(td); }); });
  var cd=$('rbzTCd'); if(cd) cd.addEventListener('click', function(){ TB.cdelta=!TB.cdelta; changed(); });
  var tr=$('rbzTTr'); if(tr) tr.addEventListener('click', function(e){ e.stopPropagation(); var nest=Object.keys(TB.nest).some(function(p){ return TB.nest[p]&&TB.gbs.indexOf(p)>-1; }), off=nest||TB.disp==='rel';
    U.menu(tr, [{ fa:'متریک‌ها'+(TB.tr?'':' ✓'), en:'Metrics'+(TB.tr?'':' ✓'), fn:function(){ TB.tr=false; changed(); } },{ fa:'مقدارهای ویژگی (جابه‌جایی، فقط خواندنی)'+(TB.tr?' ✓':''), en:'Property values (transposed, read-only)'+(TB.tr?' ✓':''), disabled:off, hint:nest?['با تفکیک تودرتو نمی‌شود','Not with nested group-bys']:off?['با «فقط درصد از کل» نمی‌شود','Not with relative % only']:null, fn:function(){ TB.tr=true; changed(); } }], 'start'); });
  var ex=$('rbzTEx'); if(ex) ex.addEventListener('click', function(){ U.modal({ fa:'حذف روزهای هفته', en:'Exclude specific days', subFa:'روزهای انتخاب‌شده از محاسبه کنار می‌روند؛ میانگین‌ها روی روزهای باقی‌مانده حساب می‌شوند.', subEn:'The selected weekdays drop out of the calculation; averages use the remaining days.',
      body:'<span class="rbx-tipdot"'+tip(TTIPS.excl[0],TTIPS.excl[1])+'></span><div class="rbz-chk">'+T_WDAYS.map(function(d,k){ return '<label class="rbz-ck"><input type="checkbox" data-wd="'+k+'"'+((TB.exclDays||[]).indexOf(k)>-1?' checked':'')+'/>'+T(d[0],d[1])+'</label>'; }).join('')+'</div>',
      actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var ds=[].slice.call(bd.querySelectorAll('[data-wd]:checked')).map(function(x){ return +x.getAttribute('data-wd'); }); if(ds.length>=7){ U.toast('دست‌کم یک روز باید بماند','Keep at least one day'); return false; } TB.exclDays=ds; changed(); } }] }); });
  /* drag a header onto another to reorder columns; drag the edge to resize */
  root.querySelectorAll('[data-tdrag]').forEach(function(th){
    th.addEventListener('dragstart', function(e){ if(RSZ){ e.preventDefault(); return; } e.dataTransfer.setData('text/plain', th.getAttribute('data-tdrag')); th.classList.add('drag'); });
    th.addEventListener('dragend', function(){ th.classList.remove('drag'); });
    th.addEventListener('dragover', function(e){ e.preventDefault(); th.classList.add('over'); });
    th.addEventListener('dragleave', function(){ th.classList.remove('over'); });
    th.addEventListener('drop', function(e){ e.preventDefault(); th.classList.remove('over'); tMoveCol(+e.dataTransfer.getData('text/plain'), +th.getAttribute('data-tdrag')); }); });
  root.querySelectorAll('[data-trsz]').forEach(function(hd){ hd.addEventListener('mousedown', function(e){ e.preventDefault(); e.stopPropagation(); var th=hd.parentNode, x0=e.clientX, w0=th.offsetWidth, ci=+hd.getAttribute('data-trsz'), dir=fa()?-1:1; RSZ=true;
    function mv(ev){ var w=Math.max(80, Math.min(480, w0+(ev.clientX-x0)*dir)); th.style.width=th.style.minWidth=w+'px'; TB.w[ci]=w; }
    function up(){ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); setTimeout(function(){ RSZ=false; },0); }
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); }); });
  tWireSelect();
  var csv=$('rbzCsv'); if(csv){ var c2=csv.cloneNode(true); csv.parentNode.replaceChild(c2,csv); c2.addEventListener('click', tCsv); }
}
/* ═════════ Metric Explorer (phase 2, step 7a): Amplitude's Metric Explorer ═════════
   Spec: research-notes/…/24-amplitude-metric-explorer-spec.md; chart gate: 25-chart-review-metric-explorer.md.
   Event metrics, session metrics, library metrics and hybrid formulas on one time chart. Each metric keeps its own measure,
   filters, group-by and rolling/cumulative setting; its unit decides its axis (at most two units, PM decision 2026-10-14:
   a second Y axis as in Amplitude). Period values use each metric's own rule and match Trend (event metrics) and the
   Data Table's Overall (session metrics, hybrid formulas). */
var MX_SESS={ session_totals:['نشست‌ها','Session totals','n'], session_entries:['ورود نشست','Session entries','n'], session_exits:['خروج نشست','Session exits','n'],
  sess_per_user:['میانگین نشست به ازای هر کاربر','Average sessions per user','dec'], events_per_session:['ایونت به ازای هر نشست','Events per session','dec'],
  bounce_rate:['نرخ پرش','Bounce rate','pct'], entry_rate:['نرخ ورود','Entry rate','pct'], exit_rate:['نرخ خروج','Exit rate','pct'],
  avg_session_duration:['میانگین مدت نشست','Average session length','sec'], ts_sum:['زمان صرف‌شده (مجموع)','Time spent (sum)','sec'], time_per_user:['زمان به ازای هر کاربر','Time spent per user','sec'],
  length_dist:['توزیع طول نشست','Session length distribution','hist'] };
/* 7b, User Sessions parity: "Count: events performed within sessions" (Amplitude User Sessions chart) */
var MX_SEV={ avg:['میانگین در هر نشست','Average per session','dec'], total:['مجموع در نشست‌ها','Total across sessions','n'], dist:['توزیع نشست‌ها بر اساس تعداد','Sessions by event count','hist'] };
/* session length buckets in seconds: min inclusive, max exclusive; sessions over one day are excluded (Amplitude) */
var MX_LBK=[[0,10],[10,30],[30,60],[60,180],[180,600],[600,1800],[1800,86400]];
function mxDurTxt(sec){ return sec>=86400?T('۱ روز','1 d'):sec>=3600?T(num(sec/3600,sec%3600?1:0)+' ساعت',num(sec/3600,sec%3600?1:0)+' h'):sec>=60?T(num(sec/60,sec%60?1:0)+' دقیقه',num(sec/60,sec%60?1:0)+' min'):T(num(sec)+' ثانیه',sec+' s'); }
function mxBkLabels(bk){ return bk.map(function(b){ return mxDurTxt(b[0])+'–'+mxDurTxt(b[1]); }); }
var MX_MEAS={ uniques:['کاربران','Users','n'], totals:['تعداد دفعات','Event totals','n'], active:['درصد کاربران فعال','% of active users','pct'], avg:['میانگین در هر کاربر','Average per user','dec'], freq:['توزیع تکرار','Frequency distribution','hist'], prop:['مقدار ویژگی','Property value','cur'] };
var MX_ADV={ none:['بدون','None'], rolling:['میانگین متحرک','Rolling average'], window:['پنجرهٔ متحرک','Rolling window'], cumulative:['تجمعی','Cumulative'] };
var MX_UNIT={ n:['تعداد','count'], pct:['درصد','percent'], sec:['زمان','time'], dec:['نسبت','ratio'], cur:['مبلغ','amount'], hist:['توزیع','distribution'] };
var MX_MAX=10;
var MXTIPS={
  mod:["<span class='tip-title'>کاوشگر متریک</span>متریک‌های ایونت، نشست و فرمول‌های ترکیبی روی یک نمودار زمانی؛ هر متریک سنجش و تنظیمات خودش را دارد و واحدش محورش را تعیین می‌کند.","<span class='tip-title'>Metric explorer</span>Event metrics, session metrics and hybrid formulas on one time chart; each metric keeps its own measure and settings, and its unit decides its axis."],
  scope:["<span class='tip-title'>دامنهٔ تفکیک</span>وقتی متریک نشست روی نمودار است، مقدار تفکیک از ایونتِ خود متریک، از کل نشست، یا یکسان برای همهٔ متریک‌ها گرفته شود؛ در حالت نشست، یک نشست زیر همهٔ مقدارهایش شمرده می‌شود.","<span class='tip-title'>Group-by scope</span>With a session metric on the chart, take the breakdown value from the metric’s own event, from the whole session, or the same for every metric; at session level a session counts under every value it carries."],
  axis:["<span class='tip-title'>محور دوم</span>متریک‌هایی با واحد متفاوت (مثل تعداد و درصد) روی دو محور جدا رسم می‌شوند؛ مقیاس دو محور مستقل است، پس محل برخورد خط‌ها معنایی ندارد. حداکثر دو واحد رسم می‌شود.","<span class='tip-title'>Second axis</span>Metrics in different units (such as counts and percentages) are drawn on two separate axes; the scales are independent, so where the lines cross means nothing. At most two units are drawn."],
  adv:["<span class='tip-title'>متحرک و تجمعی</span>برای هر متریک جدا: میانگین متحرک، جمع پنجرهٔ متحرک یا جمع تجمعی؛ برای نرخ‌ها صورت و مخرجِ همان پنجره تقسیم می‌شوند، نه میانگینِ نرخ‌های روزانه.","<span class='tip-title'>Rolling and cumulative</span>Per metric: a rolling average, a rolling-window sum or a running total; for rates the window’s own numerator is divided by its denominator, not the average of daily rates."]
};
function blankMex(){ return { metrics:[], scope:'event', cgb:'', y:{ l:{ title:'', min:'', max:'', out:false, unit:'auto', pre:'', suf:'' }, r:{ title:'', min:'', max:'', out:false, unit:'auto', pre:'', suf:'' } }, legend:{}, sel:null }; }
function isMex(){ return RB.Q.type==='mex'; }
function mxHasSess(st){ return (st||A).mex.metrics.some(function(m){ return m.kind==='sess'||(m.kind==='hybrid'&&(m.sin||[]).length); }); }
/* a library metric becomes a chart metric; funnel and time-spent metrics are Data Table only (Amplitude: "Data Tables also support Funnels") */
function mxFromLib(mt){ var c=mt.col||{};
  /* PM 2026-10-30, LX-24: a revenue metric is its amount sum, average order value or revenue per active user, in the project's currency */
  if(c.kind==='rev') return { kind:'ev', ev:c.ev, meas:c.agg==='arpu'?'arpau':'prop', pagg:c.agg==='aov'?'avg':'sum', prop:c.prop, filters:clone(c.filters||[]), mid:mt.id };
  if(c.kind==='ev') return { kind:'ev', ev:c.ev, meas:c.meas||'uniques', filters:clone(c.filters||[]), mid:mt.id };
  if(c.kind==='hybrid') return { kind:'hybrid', inputs:clone(c.inputs||[]), sin:clone(c.sin||[]), expr:c.expr, mid:mt.id };
  if(c.kind==='metric'&&MX_SESS[c.metric]) return { kind:'sess', sm:c.metric, filters:clone(c.filters||[]), mid:mt.id };
  return null; }
function mxIsHist(m){ return mxUnit(m)==='hist'; }
function mxHasHist(st){ return (st||A).mex.metrics.some(mxIsHist); }
function mxName(m){ if(m.label) return m.label; if(m.kind==='sess') return T(MX_SESS[m.sm][0],MX_SESS[m.sm][1]); if(m.kind==='sessev') return T(MX_SEV[m.sm][0]+' «'+evName(m.ev)+'»',MX_SEV[m.sm][1]+' “'+evName(m.ev)+'”'); if(m.kind==='hybrid') return '⁦'+m.expr+'⁩'; return evName(m.ev); }
function mxUnit(m){ if(m.kind==='sess') return MX_SESS[m.sm][2]; if(m.kind==='sessev') return MX_SEV[m.sm][2]; if(m.kind==='hybrid') return /^\s*%:/.test(m.expr||'')?'pct':'dec';
  var k=m.meas||'uniques'; if(k==='arpau') return 'cur';   /* PM 2026-10-30, LX-24 */ if(k==='prop'){ var u=NUMP[m.prop]||{}; return m.pagg==='sum'||!u.dec?'cur':'dec'; } return MX_MEAS[k]?MX_MEAS[k][2]:'n'; }
function mxMeasName(m){ if(m.kind==='sess') return T('متریک نشست','Session metric'); if(m.kind==='sessev') return T('ایونت‌های داخل نشست','Events within sessions'); if(m.kind==='hybrid') return T('فرمول ترکیبی','Hybrid formula');
  var k=m.meas||'uniques'; if(k==='arpau') return T(MEAS.arpau.fa,MEAS.arpau.en);   /* PM 2026-10-30, LX-24 */ return k==='prop'?T(PAGG[m.pagg||'sum'][0],PAGG[m.pagg||'sum'][1])+' '+T((RB.PROPS[m.prop]||{}).fa||'',(RB.PROPS[m.prop]||{}).en||''):T(MX_MEAS[k][0],MX_MEAS[k][1]); }
function mxFmt(u, v){ if(v==null||!isFinite(v)) return '—'; if(u==='hist') return num(Math.round(v)); if(u==='pct') return pctTxt(v); if(u==='sec') return v<90?T(num(Math.round(v))+' ثانیه',Math.round(v)+' s'):fmtDur(v/60); if(u==='dec') return num(v,2); if(u==='cur') return compact(v)+curTxt(); return num(Math.round(v)); }
/* daily sessions, page views and users for one metric (filters + segment), shaped by the engine's own daily series */
function mxDaily(m, sg){
  var f=m.filters||[], e={ id:'page_view', filters:f }, ssD=baseSeries({ id:'session_start', filters:f },false), pvD=baseSeries(e,false), uD=baseSeries(e,true), sf=segFactor(sg, e, RB.periodUniques(uD));
  var share=sf?sf.share:1, c={ kind:'metric', metric:'session_totals', filters:f, sf:m.sf||[] }, ov=tColumn(A, c, 'mx', sg, null).overall;   /* the Data Table's Overall: parity by construction */
  var ss=jAlloc(ov, ssD), pv=pvD.map(function(x){ return Math.round(x*share); }), u=uD.map(function(x){ return Math.round(x*share); });
  return { ss:ss, pv:pv, u:u, base:tSessBase(c, sf), sf:sf, ssn:ov, pu:Math.max(1,RB.periodUniques(u)) }; }
function mxNormRate(rate, w, target, seed){ var r=w.map(function(x,i){ return rate*(0.88+0.24*jitter(seed,i)); }), s=w.reduce(function(a,x,i){ return a+x*r[i]; },0), W=w.reduce(function(a,b){ return a+b; },0); var k=s?target*W/s:1; return r.map(function(x){ return x*k; }); }
/* one metric × segment (× group value) → { v daily, total, unit, num/den for ratios } */
function mxSeries(m, sg, gv, gbP, ci){
  var seed='mx'+ci+JSON.stringify([m.kind,m.ev||m.sm||m.expr,m.meas,m.filters])+(gv?gv[1]:'');
  if(m.kind==='ev'&&m.meas==='freq'){ var r0=measure({ measure:'freq', events:[] }, { id:m.ev, filters:m.filters||[], groupBy:'' }, gv?{ share:gv[2], seed:m.ev+gbP+gv[1] }:null, { def:sg });
    return { v:r0.v, total:r0.total, unit:'hist', buckets:FREQB.map(function(b){ return T(b[0],b[1]); }) }; }
  if(m.kind==='sessev'){
    var d0=mxDaily(m, sg), e0={ id:m.ev, filters:m.filters||[] }, tot0=baseSeries(e0,false), sf0=d0.sf, g0=gv?gv[2]*(0.9+0.2*jitter(seed+'g',0)):1;
    var tt=tot0.map(function(x){ return Math.round(x*(sf0?sf0.share*sf0.tilt:1)*g0); }), ssv=d0.ss.map(function(x){ return Math.round(x*g0); }), Tt=tt.reduce(function(a,b){ return a+b; },0), S=ssv.reduce(function(a,b){ return a+b; },0);
    if(m.sm==='total') return { v:tt, total:Tt, unit:'n' };
    if(m.sm==='avg') return { v:tt.map(function(x,i){ return ssv[i]?+(x/ssv[i]).toFixed(3):0; }), total:S?+(Tt/S).toFixed(3):0, unit:'dec', num:tt, den:ssv };
    var Se=Math.max(1,Math.round(Math.min(S*0.85, Tt*0.5))), pp=1/Math.max(1.05,Tt/Se);   /* sessions that contain the event, by how often it occurs in them */
    return { v:FREQB.map(function(b){ var a=0; for(var k=b[2];k<=Math.min(b[3],400);k++) a+=pp*Math.pow(1-pp,k-1); return Math.round(Se*a); }), total:Se, unit:'hist', buckets:FREQB.map(function(b){ return T(b[0],b[1]); }) }; }
  if(m.kind==='sess'&&m.sm==='length_dist'){
    var dl=mxDaily(m, sg), bk=(m.bk&&m.bk.length?m.bk:MX_LBK), gl=gv?gv[2]*(0.9+0.2*jitter(seed+'g',0)):1, Sl=Math.round(dl.ssn*gl), bo=dl.base.b, mu=Math.max(5,dl.base.d/(1-bo));
    /* bounces are 0-second sessions; the rest follow the session-length mean; sessions over a day are excluded */
    var cdf=function(x){ return x<=0?0:1-Math.exp(-x/mu); }, cap=cdf(86400);
    return { v:bk.map(function(b){ var share=(b[0]===0?bo:0)+(1-bo)*(cdf(Math.min(b[1],86400))-cdf(b[0]))/cap; return Math.round(Sl*share); }), total:Sl, unit:'hist', buckets:mxBkLabels(bk) }; }
  if(m.kind==='ev'){
    var st={ measure:m.meas||'uniques', prop:m.prop||'amount', pagg:m.pagg||'sum', events:[] }, e={ id:m.ev, filters:m.filters||[], groupBy:'' };
    var r=measure(st, e, gv?{ share:gv[2], seed:m.ev+gbP+gv[1] }:null, { def:sg }), unit=mxUnit(m), out={ v:r.v, total:r.total, unit:unit };
    if(st.measure==='uniques') out.uniq=true;
    if(st.measure==='active'||st.measure==='avg'){ var uu=baseSeries(e,true); out.num=r.v.map(function(x,i){ return x*(uu[i]||1); }); out.den=uu.map(function(x){ return x||1; }); }
    return out; }
  if(m.kind==='sess'){
    var d=mxDaily(m, sg), k=m.sm, g=1, ovf=1;
    if(gv){ g=gv[2]; var sc=A.mex.scope==='session'||(A.mex.scope==='chart'); ovf=tOverlap(gbP, seed)>1?(sc?tOverlap(gbP, seed):1+(tOverlap(gbP, seed)-1)*0.25):1; }
    var gj=function(x,i){ return gv?Math.round(x*g*ovf*(0.9+0.2*jitter(seed+'g',i))):x; }, ss=d.ss.map(gj), u=d.u.map(gj), pv=d.pv.map(gj);
    var tssn=gv?ss.reduce(function(a,b){ return a+b; },0):d.ssn, b=d.base.b*(gv?0.75+0.5*jitter(seed+'bb',0):1), dur=d.base.d*(gv?0.6+0.8*jitter(seed+'dd',0):1);
    if(k==='session_totals'||k==='session_entries'||k==='session_exits'){ var ses=gv&&k!=='session_totals'?ss.map(function(x){ return Math.round(x/ovf); }):ss; return { v:ses, total:ses.reduce(function(a,c){ return a+c; },0), unit:'n' }; }
    if(k==='bounce_rate'){ var br=mxNormRate(b, ss, b, seed+'br'); return { v:br.map(function(x){ return +(x*100).toFixed(1); }), total:+(b*100).toFixed(1), unit:'pct', num:ss.map(function(x,i){ return x*br[i]*100; }), den:ss }; }
    if(k==='entry_rate'||k==='exit_rate'){ var er=gv?Math.min(1, g*(0.7+0.6*jitter(seed+k,0))):1; return { v:ss.map(function(){ return +(er*100).toFixed(1); }), total:+(er*100).toFixed(1), unit:'pct', num:ss.map(function(x){ return x*er*100; }), den:ss }; }
    if(k==='avg_session_duration'||k==='ts_sum'||k==='time_per_user'){ var dr=mxNormRate(dur, ss, dur, seed+'dr'), len=ss.map(function(x,i){ return x*dr[i]; }), L=len.reduce(function(a,c){ return a+c; },0);
      if(k==='ts_sum') return { v:len.map(Math.round), total:Math.round(L), unit:'sec' };
      if(k==='time_per_user'){ var pu=gv?Math.max(1,RB.periodUniques(u)):d.pu; return { v:len.map(function(x,i){ return u[i]?x/u[i]:0; }), total:L/pu, unit:'sec', num:len, den:u }; }
      return { v:dr.map(function(x){ return Math.round(x); }), total:Math.round(dur), unit:'sec', num:len, den:ss }; }
    if(k==='sess_per_user'){ var pu2=gv?Math.max(1,RB.periodUniques(u)):d.pu; return { v:ss.map(function(x,i){ return u[i]?+(x/u[i]).toFixed(2):0; }), total:+(tssn/pu2).toFixed(2), unit:'dec', num:ss, den:u }; }
    if(k==='events_per_session'){ var evs=pv.map(function(x){ return x*2.3; }); return { v:evs.map(function(x,i){ return ss[i]?+(x/ss[i]).toFixed(2):0; }), total:tssn?+(evs.reduce(function(a,c){ return a+c; },0)/tssn).toFixed(2):0, unit:'dec', num:evs, den:ss }; }
  }
  if(m.kind==='hybrid'){
    if(hErrors(m)) return { v:[], total:null, unit:mxUnit(m), err:true };
    var p=hParse(m.expr), vals={}, n=0;
    (m.inputs||[]).forEach(function(x,k){ vals[x.L]=mxSeries({ kind:'ev', ev:x.ev, meas:x.meas||'totals', filters:x.filters||[] }, sg, gv, gbP, ci+'h'+k); n=vals[x.L].v.length; });
    (m.sin||[]).forEach(function(x,k){ vals[x.L]=mxSeries({ kind:'sess', sm:MX_SESS[x.m]?x.m:'session_totals', filters:[] }, sg, gv, gbP, ci+'s'+k); n=vals[x.L].v.length; });
    /* period value: the Data Table's own computation of the same formula (parity) */
    var tot=gv?null:tHybrid(A, { kind:'hybrid', inputs:m.inputs, sin:m.sin, expr:m.expr }, 'mx', sg, null).overall;
    function ev(nd, i){ if(nd.k!=null) return nd.k; if(nd.v){ var r=vals[nd.v]; if(!r) return null; var x=i<0?r.total:r.v[i]; if(x==null) return null; return r.unit==='pct'?x/100:x; }
      if(nd.op==='neg'){ var a0=ev(nd.a,i); return a0==null?null:-a0; } var a=ev(nd.a,i), bb=ev(nd.b,i); if(a==null||bb==null) return null; return nd.op==='+'?a+bb:nd.op==='-'?a-bb:nd.op==='*'?a*bb:(bb?a/bb:null); }
    var sc2=p.mode==='%'?100:1, fx=function(v){ return v==null||!isFinite(v)?null:+(v*sc2).toFixed(2); }, v=[]; for(var i=0;i<n;i++) v.push(fx(ev(p.tree,i)));
    return { v:v, total:tot!=null?tot:fx(ev(p.tree,-1)), unit:mxUnit(m) }; }
  return { v:[], total:null, unit:'n' }; }
/* per-metric rolling / cumulative: counts average or sum; users never summed (one estimate per window); rates divide the window's own numerator by its denominator */
function mxAdv(s, a){ if(!a||!a.fn||a.fn==='none') return s.v; var n=Math.max(2,a.n||7), v=s.v;
  function win(i){ return [Math.max(0,a.fn==='cumulative'?0:i-n+1), i+1]; }
  return v.map(function(x,i){ var w=win(i), sl=v.slice(w[0],w[1]);
    if(s.num){ var nu=s.num.slice(w[0],w[1]).reduce(function(p,q){ return p+q; },0), de=s.den.slice(w[0],w[1]).reduce(function(p,q){ return p+q; },0); return de?+(nu/de).toFixed(2):null; }
    if(s.uniq&&(a.fn==='window'||a.fn==='cumulative')) return RB.periodUniques(sl);
    if(a.fn==='rolling') return +(sl.reduce(function(p,q){ return p+q; },0)/sl.length).toFixed(2);
    return sl.reduce(function(p,q){ return p+q; },0); }); }
function mxGb(m){ return A.mex.scope==='chart'?A.mex.cgb:(m.gb||''); }
function mxCompute(st, ctx){
  return within(ctx, function(){
    var R=RB.rangeInfo(), lab=RB.axisLabels(), out={ R:R, labels:lab, series:[], overall:[], groups:[], units:[], axisOf:{}, third:[] }, segs=norm(st).segments, named=segs.length>1||!isDefaultSeg(segs[0]);
    var saveA=A; A=st;   /* mxSeries reads the scope and the Data Table helpers from the state */
    try{
    st.mex.metrics.forEach(function(m,k){
      var letter=LET[k], unit=mxUnit(m), gbP=mxGb(m), P=gbP?RB.PROPS[gbP]:null;
      if(out.units.indexOf(unit)<0) out.units.push(unit);
      segs.forEach(function(sg,si){
        var gid=letter+(si?si+1:''), sname=named?segLabel(sg):'', w=mxSeries(m, sg, null, '', k), hist=w.unit==='hist';
        if(hist){ out.hist=true; out.buckets=w.buckets; }
        var row={ key:gid+'*', gid:gid, letter:letter, mi:k, seg:si, segName:sname, name:mxName(m), group:'', values:hist?w.v:mxAdv(w, m.adv), raw:w.v, total:w.total, unit:w.unit||unit, overall:true, err:w.err };
        out.overall.push(row);
        if(P){ var vals=P.vals.slice(0,MAX_ROWS);
          /* session metrics on an event-level property: sessions whose events never carried a value form a (none) row (Amplitude) */
          if((m.kind==='sess'||m.kind==='sessev')&&['page','ref','utm'].indexOf(P.grp)>-1) vals=vals.concat([['(بدون مقدار)','(none)',0.04+0.05*jitter(gbP+'none',k)]]);
          vals.forEach(function(v){ var r=mxSeries(m, sg, v, gbP, k); out.series.push({ key:gid+':'+v[1], gid:gid, letter:letter, mi:k, seg:si, segName:sname, name:mxName(m), group:T(v[0],v[1]), values:hist?r.v:mxAdv(r, m.adv), raw:r.v, total:r.total, unit:r.unit||unit }); }); }
        else out.series.push(Object.assign({}, row, { key:gid, overall:false }));
        out.groups.push(gid); }); });
    } finally { A=saveA; }
    /* axes: the first unit on the left, the second on the right (or as the user set per metric); a third unit is not drawn */
    out.units=out.units.map(function(u){ return u==='hist'?'n':u; }).filter(function(u,i,a){ return a.indexOf(u)===i; });
    out.overall.concat(out.series).forEach(function(x){ if(x.unit==='hist'){ x.hunit=true; x.unit='n'; } });
    var forced={}; st.mex.metrics.forEach(function(m){ if(m.axis==='l'||m.axis==='r') forced[mxUnit(m)]=m.axis; });
    var left=null, right=null;
    out.units.forEach(function(u){ if(forced[u]==='l'&&!left) left=u; else if(forced[u]==='r'&&!right) right=u; });
    out.units.forEach(function(u){ if(u===left||u===right) return; if(!left) left=u; else if(!right) right=u; else out.third.push(u); });
    out.axisOf={}; if(left) out.axisOf[left]='l'; if(right) out.axisOf[right]='r';
    out.mixedAxis=st.mex.metrics.some(function(m){ return (m.axis==='l'||m.axis==='r')&&out.axisOf[mxUnit(m)]!==m.axis; });
    return out; }); }
var lastMx=null;
function mxDrawn(res){ var sel=A.mex.sel||{}; return res.overall.concat(res.series).filter(function(s,k,arr){ return sel[s.key]&&arr.indexOf(s)===k&&!s.err; }); }
function mxDefaultSel(res){ var sel={}, n=0; res.groups.forEach(function(g){ var top=res.series.filter(function(s){ return s.gid===g; }).sort(function(a,b){ return (b.total||0)-(a.total||0); })[0]; if(top&&n<MAX_SERIES){ sel[top.key]=true; n++; } }); return sel; }
function renderMex(){
  var res=lastMx=mxCompute(A, { range:RB.Q.range, filters:RB.Q.filters, gran:A.interval });
  if(!A.mex.sel||!res.overall.concat(res.series).some(function(s){ return A.mex.sel[s.key]; })) A.mex.sel=mxDefaultSel(res);
  var empty=!A.mex.metrics.length;
  root.classList.toggle('rtl', fa());
  root.innerHTML='<div class="rbz-grid"><aside class="rbz-panel">'+mxMetricsModule()+mxScopeModule()+segmentModule()+'</aside>'+
    '<section class="rbz-canvas">'+(empty?'<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-drslot"></span></div>'+mxEmpty():
      mxToolbar(res)+mxNotes(res)+'<div class="rbz-chartbox">'+(A.viz==='kpi'?'<div class="rbz-kpis" id="rbzKpis"></div>':A.viz==='table'?'':'<div class="rbz-chart" id="rbzChart"></div>')+'</div>'+mxLegend(res)+mxTable(res))+'</section></div>';
  placeFilter(); wire(); U.i18n();
  if(!empty) mxDraw(res);
}
function mxEmpty(){
  return '<div class="sh-state rbz-empty">'+emptyArt('trend')+'<div class="sh-state-title">'+T('متریک‌های ایونت و نشست را کنار هم ببینید','See event and session metrics side by side')+'</div>'+
    '<div class="sh-state-hint">'+T('هر متریک سنجش خودش را دارد؛ متریک‌هایی با واحد متفاوت روی دو محور رسم می‌شوند.','Each metric keeps its own measure; metrics in different units are drawn on two axes.')+'</div>'+
    '<div class="rbz-emptyacts"><button class="rbz-linkbtn" data-mxadd="1" type="button">'+ic('plus')+T('افزودن متریک','Add metric')+'</button>'+
    '<button class="rbz-linkbtn ghost" data-mxseed="sess" type="button">'+ic('lightning')+T('نشست‌ها و نرخ پرش','Sessions and bounce rate')+'</button>'+
    '<button class="rbz-linkbtn ghost" data-mxseed="hyb" type="button">'+ic('lightning')+T('اشتراک به ازای هر نشست','Subscriptions per session')+'</button></div></div>';
}
function mxMetricsModule(){
  var M=A.mex.metrics, sum=M.length?M.map(function(m,k){ return LET[k]+' '+mxName(m); }).join(T('، ',', ')):T('هنوز متریکی نیست','No metrics yet');
  var h='<div class="rbz-mod">'+modHead('ev','متریک‌ها','Metrics',MXTIPS.mod,sum,liveBtn());
  if(!OPEN.ev) return h+'</div>';
  M.forEach(function(m,k){ var u=mxUnit(m), gb=mxGb(m), P=gb?RB.PROPS[gb]:null, side=lastMx&&lastMx.axisOf[u];
    h+='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let">'+LET[k]+'</span><button class="rbz-evname" data-mxmenu="'+k+'" type="button"><span class="rbz-evic">'+(m.kind==='sess'?ic('clock-countdown'):m.kind==='hybrid'?'<i class="rbz-fxi">fx</i>':evIcon(m.ev))+'</span><span class="nm">'+esc(mxName(m))+'</span><span class="rbz-mxmeas">'+esc(mxMeasName(m))+'</span><span class="rbz-car">⌄</span></button>'+
      '<button class="rbz-ico" data-mxmore="'+k+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>';
    if(m.mid&&tMetric(m.mid)) h+='<div class="rbz-chip">'+ic('books')+'<span>'+T('از کتابخانه: ','From library: ')+esc(tMName(tMetric(m.mid)))+'</span></div>';
    if(m.kind==='hybrid') h+='<div class="rbz-chip">'+ic('function')+'<span dir="ltr">'+esc((m.inputs||[]).map(function(x){ return x.L+'='+evName(x.ev); }).concat((m.sin||[]).map(function(x){ return x.L+'='+T(H_SIN[x.m][0],H_SIN[x.m][1]); })).join(' · '))+'</span></div>';
    (m.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-mxfdel="'+k+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    (m.sf||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('clock-countdown')+'<span>'+esc(sfLabel(f))+'</span><button data-mxsfdel="'+k+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    if(m.kind==='sess'&&m.sm==='length_dist') h+='<div class="rbz-chip act">'+ic('squares-four')+'<button class="rbz-chipbtn" data-mxbk="'+k+'" type="button">'+T('بازه‌ها: ','Buckets: ')+esc(mxBkLabels(m.bk&&m.bk.length?m.bk:MX_LBK).join(T('، ',', ')))+'</button></div>';
    if(P&&A.mex.scope!=='chart') h+='<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('تفکیک: ','Breakdown: ')+esc(T(P.fa,P.en))+'</span><button data-mxgdel="'+k+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    if(m.adv&&m.adv.fn&&m.adv.fn!=='none') h+='<div class="rbz-chip act">'+ic('chart-line')+'<span>'+T(MX_ADV[m.adv.fn][0],MX_ADV[m.adv.fn][1])+(m.adv.fn!=='cumulative'?T(' · '+num(m.adv.n)+' بازه',' · '+m.adv.n+' intervals'):'')+'</span><button data-mxadel="'+k+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>';
    h+='<div class="rbz-chip'+(lastMx&&lastMx.third.indexOf(u)>-1?' warn':'')+'">'+ic('chart-line')+'<span>'+T('واحد: ','Unit: ')+T(MX_UNIT[u][0],MX_UNIT[u][1])+' · '+(lastMx&&lastMx.third.indexOf(u)>-1?T('فقط در جدول (واحد سوم)','table only (third unit)'):side==='r'?T('محور ۲','axis 2'):T('محور ۱','axis 1'))+(m.axis?T(' (دستی)',' (set)'):'')+'</span></div>';
    h+='<div class="rbz-evacts">'+(m.kind!=='hybrid'?'<button data-mxfadd="'+k+'" type="button">+ '+T('فیلتر','Filter by')+'</button>':'')+(m.kind==='sess'||m.kind==='sessev'?'<button data-mxsfadd="'+k+'" type="button">+ '+T('فیلتر نشست','Session filter')+'</button><span class="rbx-tipdot"'+tip(TTIPS.sf[0],TTIPS.sf[1])+'></span>':'')+(A.mex.scope==='chart'||m.kind==='hybrid'?'':'<button data-mxgadd="'+k+'" type="button">+ '+T('تفکیک','Breakdown')+'</button>')+'</div></div>'; });
  return h+'<button class="rbz-add'+(M.length?'':' big')+'" data-mxadd="1" type="button"'+(M.length>=MX_MAX?' disabled title="'+T('حداکثر ۱۰ متریک','Up to 10 metrics')+'"':'')+'>'+ic('plus')+T('افزودن متریک','Add metric')+'</button></div>';
}
function mxScopeModule(){
  if(!mxHasSess()) return '';
  var P=A.mex.cgb?RB.PROPS[A.mex.cgb]:null;
  return '<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('دامنهٔ تفکیک','Group-by scope')+'</span><span class="rbx-tipdot"'+tip(MXTIPS.scope[0],MXTIPS.scope[1])+'></span></div>'+
    '<div class="rbz-seg2 sm" role="radiogroup">'+[['event','ایونت','Event'],['session','نشست','Session'],['chart','کل نمودار','Chart-level']].map(function(x){ var on=A.mex.scope===x[0]; return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-mxscope="'+x[0]+'">'+T(x[1],x[2])+'</button>'; }).join('')+'</div>'+
    (A.mex.scope==='chart'?'<div class="rbz-fieldrow"><button class="rbz-field" data-mxcgb="1" type="button">'+(P?esc(T(P.fa,P.en)):'<span class="ph">'+T('انتخاب ویژگی…','Select property…')+'</span>')+' <span class="car">⌄</span></button>'+(P?'<button data-mxcgbdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>':'')+'</div>';
}
var MX_VIZ=['line','column','area','stackbar','bar','pie','kpi','table'];
function mxOneUnit(res){ var u={}; mxDrawn(res).forEach(function(s){ u[s.unit]=1; }); return Object.keys(u).length<=1; }
function mxAdditive(res){ return mxDrawn(res).every(function(s){ return s.unit==='n'||s.unit==='cur'||(s.unit==='sec'&&/ts_sum/.test(String(A.mex.metrics[s.mi].sm))); }); }
function mxToolbar(res){
  var v=VIZ.filter(function(x){ return x[0]===A.viz; })[0]||VIZ[0];
  if(res.hist) return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span><span class="rbz-pill static">'+ic('squares-four')+T('هیستوگرام','Histogram')+'</span><span class="rbz-drslot"></span></div>';
  var anOk=A.viz==='line'&&res.R.unit!=='month';
  return '<div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+
    '<button class="rbz-pill'+(A.ui.anom.on&&anOk?' on':'')+'" id="rbzMxAnom" type="button"'+(anOk?'':' disabled title="'+T('فقط نمودار خطی روزانه یا هفتگی','Daily or weekly line charts only')+'"')+'>'+ic('warning')+T('ناهنجاری','Anomalies')+'</button>'+devTag(ANOM_DEV[0],ANOM_DEV[1])+   /* PM 2026-10-25, AL-10 */
    '<button class="rbz-pill" id="rbzMxViz" type="button">'+ic(v[3])+T(v[1],v[2])+' ⌄</button>'+
    (A.viz==='pie'||A.viz==='kpi'||A.viz==='bar'?'':'<button class="rbz-pill" id="rbzGran" type="button">'+T(GRAN[A.interval][0],GRAN[A.interval][1])+' ⌄</button>')+
    '<button class="rbz-pill" id="rbzMxAxes" type="button">'+ic('faders')+T('محورها','Axes')+'</button>'+
    '<button class="rbz-pill'+(A.compare.length?' on':'')+'" id="rbzMxCmp" type="button">'+ic('swap')+(A.compare.length?T('مقایسه: ','Compare: ')+T(cmpInfo(A.compare[0])[0],cmpInfo(A.compare[0])[1]):T('مقایسه','Compare'))+' ⌄</button>'+
    '<span class="rbz-drslot"></span></div>'; }
function mxNotes(res){ var out=[];
  if(res.units.length>1&&(A.viz==='line'||A.viz==='column')) out.push('<span>'+T('دو محور با مقیاس جدا؛ محل برخورد خط‌ها معنایی ندارد.','Two axes with separate scales; where the lines cross means nothing.')+'</span><span class="rbx-tipdot"'+tip(MXTIPS.axis[0],MXTIPS.axis[1])+'></span>');
  if(res.hist) out.push(T('توزیع نمودار خودش را دارد؛ تا وقتی این متریک هست، متریک دیگری روی نمودار نمی‌آید.','A distribution gets its own chart; while it is here, no other metric can be added.'));
  if(res.third.length) out.push(T('نمودار حداکثر دو واحد را نشان می‌دهد؛ متریک‌های با واحد سوم فقط در جدول‌اند.','The chart shows at most two units; metrics in a third unit are in the table only.'));
  if(res.mixedAxis) out.push(T('یک متریک به محوری با واحد دیگر اختصاص داده شده بود؛ هر واحد روی یک محور می‌ماند.','A metric was set to an axis of another unit; each unit stays on one axis.'));
  if(A.mex.scope==='session'&&mxHasSess()&&A.mex.metrics.some(function(m){ return mxGb(m); })) out.push(T('در دامنهٔ نشست یک نشست زیر همهٔ مقدارهایش شمرده می‌شود؛ جمع ردیف‌ها از «کل» بیشتر است.','At session level a session counts under every value it carries; rows add up to more than Overall.'));
  return out.map(function(t){ return '<div class="rbz-note">'+ic('info')+t+'</div>'; }).join(''); }
function mxSeriesName(s){ var lb=A.mex.legend[s.key]; return lb||(s.letter+' · '+s.name+(s.segName?' · '+s.segName:'')+(s.group?' · '+s.group:'')); }
var mxColors={};
function mxLegend(res){
  if(A.viz==='kpi'||A.viz==='table'||A.viz==='bar'||A.viz==='pie') return '';
  var list=mxDrawn(res).filter(function(s){ return !res.third.length||res.third.indexOf(s.unit)<0; }); if(!list.length) return '';
  return '<div class="rbz-legwrap"><div class="rbz-legend" id="rbzLegend">'+list.map(function(x){ var side=res.axisOf[x.unit]==='r'?T('محور ۲','axis 2'):T('محور ۱','axis 1');
    return '<span class="rbz-legi'+(hidden[x.key]?' off':'')+'"><button type="button" class="rbz-legb" data-mxleg="'+esc(x.key)+'"><span class="rbz-letc" style="background:'+mxColors[x.key]+'">'+x.letter+'</span>'+esc(mxSeriesName(x).replace(/^[A-J] · /,''))+(res.units.length>1?' <small>('+side+')</small>':'')+'</button>'+
      '<button type="button" class="rbz-legren" data-mxlegren="'+esc(x.key)+'" title="'+T('تغییر نام برچسب','Rename label')+'" aria-label="'+T('تغییر نام برچسب','Rename label')+'">'+ic('pencil-simple')+'</button></span>'; }).join('')+'</div></div>'; }
function mxPast(s, mode){ var lvl=mode==='year'?0.74:0.88, ratio=s.unit!=='n'&&s.unit!=='cur'; return { values:s.values.map(function(v,i){ return v==null?null:ratio?+(v*(0.94+0.1*jitter(s.key+mode,i))).toFixed(2):Math.round(v*lvl*(0.9+0.2*jitter(s.key+mode,i))); }), total:s.total==null?null:ratio?+(s.total*(0.95+0.08*jitter(s.key+mode,0))).toFixed(2):Math.round(s.total*lvl*(0.95+0.1*jitter(s.key+mode,1))) }; }
function mxTable(res){
  var pal=palette(), ci=0, cols=colHeads(res), hasSeg=res.overall.some(function(o){ return o.segName; }), hasGrp=res.series.some(function(x){ return x.group; });
  res.overall.concat(res.series).forEach(function(x){ if(!mxColors[x.key]||!(x.key in mxColors)) mxColors[x.key]=pal[ci%pal.length]; ci++; });
  var h='<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول متریک‌ها','Metrics table')+'</span><span class="rbx-spacer"></span><button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button></div>'+
    '<div class="sh-table-wrap"><table class="sh-table rbz-table rbz-mxtable"><thead><tr><th class="ck"></th><th class="fix">'+T('متریک','Metric')+'</th>'+(hasSeg?'<th>'+T('گروه','Segment')+'</th>':'')+(hasGrp?'<th>'+T('تفکیک','Breakdown')+'</th>':'')+
    '<th>'+T('واحد و محور','Unit and axis')+'</th><th class="num">'+T('کل بازه','Whole period')+'</th>'+A.compare.map(function(m){ return '<th class="num cmp">'+T(cmpInfo(m)[0],cmpInfo(m)[1])+'</th><th class="num cmp">'+T('تغییر','Change')+'</th>'; }).join('')+cols.map(function(c){ return '<th class="num">'+esc(c)+'</th>'; }).join('')+'</tr></thead><tbody>';
  res.overall.forEach(function(o){ var mine=res.series.filter(function(x){ return x.gid===o.gid; }), grouped=mine.some(function(x){ return x.group; });
    (grouped?[o].concat(mine):mine).forEach(function(x){ var third=res.third.indexOf(x.unit)>-1, on=!!A.mex.sel[x.key];
      h+='<tr class="'+(x.overall&&grouped?'ov':'')+'"><td class="ck"><input type="checkbox" data-mxsel="'+esc(x.key)+'"'+(on?' checked':'')+(third||x.err?' disabled':'')+' aria-label="'+T('رسم در نمودار','Draw in chart')+'"/></td>'+
        '<td class="sname fix"><span class="rbz-sw" style="background:'+mxColors[x.key]+'"></span><span class="rbz-let sm">'+x.letter+'</span>'+esc(x.name)+'</td>'+(hasSeg?'<td class="sname">'+esc(x.segName||'')+'</td>':'')+(hasGrp?'<td class="sname">'+(x.group?esc(x.group):grouped?'<b>'+T('کل','Overall')+'</b>':'')+'</td>':'')+
        '<td class="sname">'+T(MX_UNIT[x.unit][0],MX_UNIT[x.unit][1])+' · '+(third?T('فقط جدول','table only'):res.axisOf[x.unit]==='r'?T('محور ۲','axis 2'):T('محور ۱','axis 1'))+'</td>'+
        '<td class="num strong">'+(x.err?T('فرمول نامعتبر','Invalid formula'):mxFmt(x.unit,x.total))+'</td>'+
        A.compare.map(function(m){ var p=mxPast(x,m), d=p.total?(x.total-p.total)/p.total*100:null, good=d==null?null:((d>=0)!==(/bounce|exit_rate/.test(String((A.mex.metrics[x.mi]||{}).sm||''))));
          return '<td class="num cmp">'+mxFmt(x.unit,p.total)+'</td><td class="num cmp '+(d==null?'':good?'up':'down')+'">'+(d==null?'—':fmtChange(A,d,'pct'))+'</td>'; }).join('')+
        x.values.map(function(v){ return '<td class="num">'+mxFmt(x.unit,v)+'</td>'; }).join('')+'</tr>'; }); });
  return h+'</tbody></table></div></div>'; }
function mxAxisFmt(side, unit){ var y=A.mex.y[side], u=y.unit==='auto'?unit:y.unit;
  return function(v){ if(u==='%'||u==='pct') return num(v)+T('٪','%'); if(u==='cur') return compact(v)+curTxt(); if(u==='custom') return (y.pre||'')+compact(v)+(y.suf||''); if(u==='sec') return v<90?num(v)+T('ث','s'):num(v/60,1)+T('د','m'); return compact(v); }; }
function mxDraw(res){
  var list=mxDrawn(res).filter(function(x){ return !hidden[x.key]&&res.third.indexOf(x.unit)<0; });
  if(A.viz==='table') return;
  if(A.viz==='kpi'){ var kb=$('rbzKpis'); if(kb) kb.innerHTML=list.map(function(s){ return '<div class="rbz-kpi"><span class="k"><span class="rbz-sw" style="background:'+mxColors[s.key]+'"></span>'+esc(mxSeriesName(s))+'</span><span class="v">'+mxFmt(s.unit,s.total)+'</span><span class="d" style="color:var(--sh-text-2)">'+T('کل بازه','Whole period')+'</span></div>'; }).join('')||'<div class="sh-state-hint">'+T('سری‌ای انتخاب نشده','No series selected')+'</div>'; return; }
  var el=$('rbzChart'); if(!el||!window.echarts) return; if(chart){ chart.dispose(); chart=null; }
  if(!list.length){ el.innerHTML='<div class="sh-state"><div class="sh-state-title">'+T('سری‌ای برای رسم انتخاب نشده','No series selected')+'</div></div>'; return; }
  chart=echarts.init(el);
  var cs=getComputedStyle(document.body), TX=cs.getPropertyValue('--sh-text').trim(), MU=cs.getPropertyValue('--sh-muted').trim(), BD=cs.getPropertyValue('--sh-border').trim(), SF=cs.getPropertyValue('--sh-surface').trim(), FONT=cs.fontFamily;
  var tipBase={ backgroundColor:SF, borderColor:BD, textStyle:{ color:TX, fontFamily:FONT, fontSize:12 }, confine:true, extraCssText:'direction:'+(fa()?'rtl':'ltr')+';text-align:start' }, opt;
  if(res.hist){
    opt={ grid:{ left:fa()?24:72, right:fa()?72:24, top:16, bottom:36 }, tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' } },tipBase),
      xAxis:{ type:'category', data:res.buckets, inverse:fa(), axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true }, axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false } },
      yAxis:{ type:'value', min:0, position:fa()?'right':'left', name:T('تعداد','Count'), nameLocation:'middle', nameGap:54, nameRotate:fa()?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:function(v){ return compact(v); } }, splitLine:{ lineStyle:{ color:BD, opacity:.6 } } },
      series:list.map(function(s){ return { name:mxSeriesName(s), type:'bar', barMaxWidth:36, itemStyle:{ color:mxColors[s.key] }, data:s.values }; }) };
  } else if(A.viz==='bar'||A.viz==='pie'){
    var rows=list.slice().sort(function(a,b){ return (b.total||0)-(a.total||0); }), u0=rows[0].unit;
    opt=A.viz==='pie'?{ tooltip:Object.assign({ trigger:'item', formatter:function(p){ return esc(p.name)+'<br><b>'+mxFmt(u0,p.value)+'</b> · '+num(p.percent,1)+T('٪','%'); } },tipBase),
        series:[{ type:'pie', radius:['42%','70%'], label:{ color:TX, fontFamily:FONT, formatter:function(p){ return num(p.percent,0)+T('٪','%'); } }, data:rows.map(function(s){ return { name:mxSeriesName(s), value:s.total, itemStyle:{ color:mxColors[s.key] } }; }) }] }
      :{ grid:{ left:fa()?16:8, right:fa()?8:16, top:8, bottom:8, containLabel:true }, tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' } },tipBase),
        yAxis:{ type:'category', inverse:true, data:rows.map(mxSeriesName), position:fa()?'right':'left', axisLabel:{ color:TX, fontFamily:FONT, fontSize:11, width:220, overflow:'truncate' }, axisTick:{ show:false }, axisLine:{ lineStyle:{ color:BD } } },
        xAxis:{ type:'value', min:0, inverse:fa(), axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:mxAxisFmt('l',u0) }, splitLine:{ lineStyle:{ color:BD, opacity:.6 } } },
        series:[{ type:'bar', barMaxWidth:22, data:rows.map(function(s){ return { value:s.total, itemStyle:{ color:mxColors[s.key] } }; }), label:{ show:true, position:fa()?'left':'right', color:TX, fontFamily:FONT, fontSize:11, formatter:function(p){ return mxFmt(u0,p.value); } } }] };
    if(A.viz==='bar') el.style.height=Math.max(220, rows.length*28+40)+'px';
  } else {
    var cats=res.labels[fa()?'fa':'en'], n=cats.length, stack=A.viz==='area'||A.viz==='stackbar', bar=A.viz==='column'||A.viz==='stackbar', ser=[], unitOfName={};
    var axes=['l','r'].filter(function(sd){ return Object.keys(res.axisOf).some(function(u){ return res.axisOf[u]===sd&&list.some(function(s){ return s.unit===u; }); }); });
    list.forEach(function(s){ var c=mxColors[s.key], nm=mxSeriesName(s), yi=axes.indexOf(res.axisOf[s.unit])<0?0:axes.indexOf(res.axisOf[s.unit]); unitOfName[nm]=s.unit;
      var base={ name:nm, type:bar?'bar':'line', yAxisIndex:yi, stack:stack?'all':undefined, itemStyle:{ color:c }, barMaxWidth:28, emphasis:{ focus:'series' }, clip:!A.mex.y[axes[yi]||'l'].out };
      if(!bar){ base.symbol='circle'; base.symbolSize=5; base.lineStyle={ width:2, color:c, type:yi===1&&axes.length>1?'solid':'solid' }; if(A.viz==='area') base.areaStyle={ opacity:.35, color:c }; }
      ser.push(Object.assign(base, { data:s.values.map(function(v,i){ return i===n-1&&!bar&&n>2?null:v; }) }));
      if(!bar&&n>2) ser.push({ name:nm+'​', type:'line', yAxisIndex:yi, data:s.values.map(function(v,i){ return i>=n-2?v:null; }), symbol:'none', lineStyle:{ width:2, type:'dotted', color:c }, silent:true, tooltip:{ show:false } });
      A.compare.forEach(function(m){ var p=mxPast(s,m); unitOfName[nm+' ('+T(cmpInfo(m)[0],cmpInfo(m)[1])+')']=s.unit; ser.push({ name:nm+' ('+T(cmpInfo(m)[0],cmpInfo(m)[1])+')', type:'line', yAxisIndex:yi, data:p.values, symbol:'none', lineStyle:{ width:1.5, type:cmpInfo(m)[2], color:c, opacity:.75 }, itemStyle:{ color:c } }); }); });
    if(A.ui.anom.on&&A.viz==='line'&&!A.compare.length) list.slice(0,3).forEach(function(x,k){ var c=mxColors[x.key], an=anomaly(x.values.map(function(v){ return v==null?0:v; }), Object.assign({}, A.ui.anom, { fc:0 })), nm=mxSeriesName(x), yi=Math.max(0,axes.indexOf(res.axisOf[x.unit]));
      ser.push({ name:nm+'\u200b\u200blo', type:'line', yAxisIndex:yi, stack:'band'+k, data:an.lo, symbol:'none', lineStyle:{ opacity:0 }, silent:true, tooltip:{ show:false } });
      ser.push({ name:nm+'\u200b\u200bhi', type:'line', yAxisIndex:yi, stack:'band'+k, data:an.hi.map(function(h,i){ return h-an.lo[i]; }), symbol:'none', lineStyle:{ opacity:0 }, areaStyle:{ color:c, opacity:.13 }, silent:true, tooltip:{ show:false } });
      ser.push({ name:T('ناهنجاری','Anomaly')+' · '+nm, type:'scatter', yAxisIndex:yi, symbolSize:9, itemStyle:{ color:cs.getPropertyValue('--sh-bad').trim()||'#d33' }, data:x.values.map(function(v,i){ return an.flags[i]?v:null; }), z:5 }); });
    var yAxes=(axes.length?axes:['l']).map(function(sd,k){ var y=A.mex.y[sd], u=Object.keys(res.axisOf).filter(function(x){ return res.axisOf[x]===sd; })[0]||'n', onRight=fa()?sd==='l':sd==='r';
      return { type:'value', min:y.min!==''?+y.min:0, max:y.max!==''?+y.max:(u==='pct'&&!stack?function(v){ return Math.min(100,Math.ceil(v.max*1.1)); }:undefined), position:onRight?'right':'left', triggerEvent:true,
        name:y.title||(T(MX_UNIT[u][0],MX_UNIT[u][1])+(axes.length>1?' · '+(sd==='r'?T('محور ۲','axis 2'):T('محور ۱','axis 1')):'')), nameLocation:'middle', nameGap:54, nameRotate:onRight?-90:90, nameTextStyle:{ color:MU, fontFamily:FONT, fontSize:11 },
        splitLine:{ show:k===0, lineStyle:{ color:BD, opacity:.6 } }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, formatter:mxAxisFmt(sd,u) } }; });
    opt={ grid:{ left:72, right:72, top:16, bottom:28 },
      tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:bar?'shadow':'line' }, formatter:function(ps){ var seen={}, idx=ps.length?ps[0].dataIndex:0;
        return esc(ps.length?ps[0].axisValueLabel:'')+(idx===n-1?' <span style="color:'+MU+'">('+T('هنوز در حال جمع‌آوری','still collecting')+')</span>':'')+'<br>'+ps.filter(function(p){ if(p.seriesName.indexOf('\u200b\u200b')>-1) return false; var k=p.seriesName.replace('​',''); if(seen[k]||p.value==null) return false; seen[k]=1; return true; }).map(function(p){ var k=p.seriesName.replace('​','');
          return '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+p.color+';margin-inline-end:6px"></span>'+esc(k)+' <b>'+mxFmt(unitOfName[k],p.value)+'</b>'; }).join('<br>'); } }, tipBase),
      xAxis:{ type:'category', data:cats, inverse:fa(), boundaryGap:bar, axisLine:{ lineStyle:{ color:BD } }, axisTick:{ show:false }, axisLabel:{ color:MU, fontFamily:FONT, fontSize:11, hideOverlap:true } },
      yAxis:yAxes, series:ser };
  }
  chart.setOption(opt); el.style.filter='saturate(.72)';
  chart.on('click', function(p){ if(p.componentType==='yAxis'){ mxAxesModal(p.yAxisIndex===1?'r':'l'); return; } if(p.componentType==='series'&&p.value!=null&&A.viz!=='pie'&&A.viz!=='bar') setTimeout(function(){ mxMicroscope(p, res, list); }, 0); });
}
/* Microscope: event metrics open the people behind the point; session metrics open the sessions (inferred: the docs don't say) */
function mxMicroscope(p, res, list){
  var nm=String(p.seriesName||'').replace(/\u200b/g,''), s=list.filter(function(x){ return mxSeriesName(x)===nm; })[0]; if(!s) return;
  var m=A.mex.metrics[s.mi], i=p.dataIndex, L=res.hist?res.buckets:res.labels[fa()?'fa':'en'], at=L[i]||'', v=s.values[i]||0, lb=[mxSeriesName(s)+' · '+at, mxSeriesName(s)+' · '+at];
  var box=$('rbzChart').parentNode; box.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
  var a=document.createElement('span'); a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px'; box.appendChild(a);
  var sess=m.kind==='sess'||m.kind==='sessev', items, cnt=s.hunit||s.unit==='n';
  /* PM 2026-10-28, RB-5: a hybrid formula point lists its event inputs (A, B…); each opens that event's own Microscope at the same point */
  if(m.kind==='hybrid'){ var sg0=A.segments[s.seg||0]||A.segments[0];
    items=[{ head:1, fa:lb[0], en:lb[1] },{ head:1, fa:'ایونت‌های این فرمول', en:'Events in this formula' }].concat((m.inputs||[]).filter(function(x){ return getEv(x.ev); }).map(function(x){
      var e={ id:x.ev, filters:x.filters||[], groupBy:'' }, r=inUsers(e, sg0), nu=Math.max(1,Math.round((r.v||[])[i]||0)), nm=x.L+' · '+evName(x.ev), lb2=[nm+' · '+at, nm+' · '+at];
      return { icon:'magnifying-glass', fa:nm, en:nm, hint:[num(nu)+' کاربر', num(nu)+' users'], fn:function(){ setTimeout(function(){ U.menu(a, [{ head:1, fa:lb2[0]+' · '+num(nu)+' کاربر', en:lb2[1]+' · '+num(nu)+' users' },
        { icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb2, nu, s.key+x.L+i); } },
        { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), fn:function(){ cohortModal(lb2, nu, x.ev); } },{ icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb2, nu, s.key+x.L+i); } },
        { icon:'share-network', fa:'دیدن مسیر این کاربران', en:'Show user journeys', fn:function(){ openJourney(x.ev); } },{ icon:'video-camera', fa:'تماشای ضبط جلسه‌ها', en:'Watch session replays', fn:function(){ openReplay({ label:T(lb2[0],lb2[1]), n:nu, seed:s.key+x.L+i }); } }], 'start'); }, 0); } }; }));
    if(items.length<3) items.push({ icon:'info', fa:RB5_NONE[0], en:RB5_NONE[1], disabled:true }); }
  else if(sess){ var n=Math.max(1,Math.round(cnt?v:(lastMx&&lastMx.overall[0]?40:12)));
    items=[{ head:1, fa:lb[0], en:lb[1] },{ icon:'list-bullets', fa:'مشاهدهٔ نشست‌ها', en:'View sessions', fn:function(){ mxSessionsModal(lb, n, s.key+i, m); } },
      { icon:'export', fa:'دانلود نشست‌ها', en:'Download sessions', fn:function(){ mxDownloadSessions(lb, n, s.key+i, m); } },   /* PM 2026-10-25, AC-4 */
      { icon:'video-camera', fa:'تماشای ضبط این نشست‌ها', en:'Watch these session replays', fn:function(){ openReplay({ label:T(lb[0],lb[1]), n:n, seed:s.key+i }); } },
      { icon:'users-three', fa:'ساختن کوهورت از کاربران این نشست‌ها'+coTag(), en:'Create cohort from these sessions’ users'+coTag(), fn:function(){ cohortModal(lb, Math.max(1,Math.round(n*0.8)), m.ev||'page_view', ['کاربرانِ نشست‌های «'+lb[0]+'»','Users of the sessions in “'+lb[1]+'”', true]); } }]; }
  else { var nu=Math.max(1,Math.round(m.meas==='uniques'||m.meas==='freq'?v:v*0.6));
    items=[{ head:1, fa:lb[0]+' · '+num(nu)+' کاربر', en:lb[1]+' · '+num(nu)+' users' },{ icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb, nu, s.key+i); } },
      { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), fn:function(){ cohortModal(lb, nu, m.ev); } },{ icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb, nu, s.key+i); } },
      { icon:'share-network', fa:'دیدن مسیر این کاربران', en:'Show user journeys', fn:function(){ openJourney(m.ev); } },{ icon:'video-camera', fa:'تماشای ضبط جلسه‌ها', en:'Watch session replays', fn:function(){ openReplay({ label:T(lb[0],lb[1]), n:n, seed:s.key+i }); } }]; }
  U.menu(a, items, 'start'); }
/* the sample sessions behind a point (the view shows 15; the download takes up to 500) */
function mxSessRows(n, seed, m, max){ var P=RB.PROPS.page_path.vals, D=RB.PROPS.device_type.vals, rows=[], k=Math.min(max, n);
  for(var i=0;i<k;i++){ var len=Math.round(m.sm==='bounce_rate'&&i%2===0?0:20+900*Math.pow(jitter(seed+'l',i),2)), pg=len?1+Math.floor(jitter(seed+'p',i)*9):1;
    rows.push({ id:'s-'+(100000+Math.floor(jitter(seed+'s',i)*899999)).toString(36), ago:1+Math.floor(jitter(seed+'a',i)*160), len:len, pg:pg, entry:P[Math.floor(jitter(seed+'e',i)*P.length)], dev:D[Math.floor(jitter(seed+'d',i)*D.length)] }); }
  return rows; }
/* PM 2026-10-25, AC-4: «دانلود نشست‌ها» — up to 500 rows, the cut stated in the same words as «دانلود کاربران» */
function mxDownloadSessions(lb, n, seed, m){
  var rows=mxSessRows(n, seed, m, 500), q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; };
  var lines=[[T('نشست','Session'),T('شروع (ساعت پیش)','Started (hours ago)'),T('طول (ثانیه)','Length (seconds)'),T('صفحه‌ها','Pages'),T('صفحه ورود','Entry page'),T('نوع دستگاه','Device type')].map(q).join(',')]
    .concat(rows.map(function(r){ return [r.id, r.ago, r.len, r.pg, T(r.entry[0],r.entry[1]), dacVal('device_type', r.dev)].map(q).join(','); }));
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='shahin-mex-sessions.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
  if(n>rows.length) U.toast('فهرست '+num(rows.length)+' نشست از '+num(n)+' دانلود شد','Downloaded '+rows.length+' of '+n+' sessions');
  else U.toast('فهرست نشست‌ها دانلود شد','Session list downloaded'); }
function mxSessionsModal(lb, n, seed, m){
  var rows=mxSessRows(n, seed, m, 15);
  U.modal({ fa:lb[0], en:lb[1], subFa:'نمایش '+num(rows.length)+' از '+num(n)+' نشست؛ نشست‌های بیشتر از یک روز حساب نمی‌شوند.', subEn:'Showing '+rows.length+' of '+num(n)+' sessions; sessions longer than a day are excluded.', wide:true,
    body:'<div class="sh-table-wrap"><table class="sh-table"><thead><tr><th>'+T('نشست','Session')+'</th><th>'+T('شروع','Started')+'</th><th class="num">'+T('طول','Length')+'</th><th class="num">'+T('صفحه‌ها','Pages')+'</th><th>'+T('صفحهٔ ورود','Entry page')+'</th><th>'+T('نوع دستگاه','Device type')+'</th><th></th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr><td dir="ltr">'+r.id+'</td><td>'+T(num(r.ago)+' ساعت پیش',r.ago+' h ago')+'</td><td class="num">'+(r.len?mxDurTxt(r.len):T('پرش','bounce'))+'</td><td class="num">'+num(r.pg)+'</td><td><bdi>'+esc(T(r.entry[0],r.entry[1]))+'</bdi></td><td>'+esc(T(r.dev[0],r.dev[1]))+'</td><td><a class="rb-linkbtn" href="'+esc(replayUrl({ label:T(lb[0],lb[1]), session:r.id }))+'" target="_blank" rel="noopener">'+T('پخش','Replay')+'</a></td></tr>'; }).join('')+'</tbody></table></div>',
    actions:[{ fa:'بستن', en:'Close', ghost:true }] }); }
/* + Add metric: an event, a session metric, a library metric (funnel and time-spent ones stay in the Data Table), or a hybrid formula */
function mxAddMenu(anchor){
  /* a distribution (histogram) gets a chart of its own: it can be added only to an empty chart, and nothing joins it */
  var H=mxHasHist(), E=!A.mex.metrics.length, hh=H?['توزیع روی نمودار است؛ اول آن را بردارید','A distribution is on the chart; remove it first']:null, he=E?null:['توزیع فقط روی نمودار خالی','A distribution needs an empty chart'];
  var add=function(m){ A.mex.metrics.push(Object.assign({ filters:[], adv:{ fn:'none', n:7 } }, m)); A.mex.sel=null; changed(); };
  /* PM 2026-10-30, LX-24: the revenue unit rule — with a revenue metric on the chart, counts, users, sessions and formulas don't join it */
  var RV=mxHasRev(); if(RV&&!H){ H=true; hh=MT_WHY.mixRev; }
  var items=[{ icon:'globe', fa:'ایونت…', en:'Event…', disabled:H, hint:hh, fn:function(){ eventPicker(function(id){ add({ kind:'ev', ev:id, meas:'uniques' }); }); } },{ head:1, fa:'متریک‌های نشست', en:'Session metrics' }];
  Object.keys(MX_SESS).forEach(function(k){ var hist=MX_SESS[k][2]==='hist', off=hist?!E:H; items.push({ icon:'clock-countdown', fa:MX_SESS[k][0], en:MX_SESS[k][1], disabled:off, hint:off?(hist?he:hh):null, fn:function(){ add({ kind:'sess', sm:k }); } }); });
  items.push({ head:1, fa:'ایونت‌های داخل نشست', en:'Events within sessions' },{ icon:'clock-countdown', fa:'ایونت…', en:'Event…', disabled:H, hint:hh||['میانگین، مجموع یا توزیع یک ایونت در نشست‌ها','Average, total or distribution of an event in sessions'], fn:function(){ eventPicker(function(id){ add({ kind:'sessev', ev:id, sm:'avg' }); }); } });
  items.push({ head:1, fa:'کتابخانهٔ متریک‌ها', en:'Metric library' });
  T_METRICS.filter(mLive).forEach(function(mt){ var why=mtWhy(mt,'mex'), rev=mt.type==='revenue', hist0=mxHasHist(), off=why||(hist0?['توزیع روی نمودار است؛ اول آن را بردارید','A distribution is on the chart; remove it first']:null)||(rev&&mxNonCur()?MT_WHY.revMix:null)||(!rev&&RV?MT_WHY.mixRev:null);   /* PM 2026-10-30, LX-24: each type's reason, then the unit rule */
    items.push({ icon:'books', fa:tMName(mt), en:tMName(mt), disabled:!!off, hint:off||[T_MTYPES[mt.type][0],T_MTYPES[mt.type][1]], fn:function(){ var x=mxFromLib(mt); x.adv={ fn:'none', n:7 }; A.mex.metrics.push(x); A.mex.sel=null; changed(); } }); });
  items.push({ sep:1 },{ icon:'function', fa:'ساختن فرمول ترکیبی…', en:'Create metric ▸ Hybrid formula…', disabled:H, hint:hh, fn:function(){ tDefineModal({ type:'hybrid', target:'mex' }); } });
  setTimeout(function(){ U.menu(anchor, items, 'start'); }, 0); }
function mxMetricMenu(anchor, k){
  var m=A.mex.metrics[k], items=[];
  if(m.kind==='ev'){ items.push({ head:1, fa:'سنجش بر اساس', en:'Measured as' });
    ['uniques','totals','active','avg','freq'].forEach(function(q){ var on=(m.meas||'uniques')===q, off=q==='freq'&&A.mex.metrics.length>1; items.push({ fa:MX_MEAS[q][0]+(on?' ✓':''), en:MX_MEAS[q][1]+(on?' ✓':''), disabled:off, hint:off?['توزیع فقط وقتی تنها متریک نمودار است','A distribution only as the chart’s single metric']:null, fn:function(){ m.meas=q; m.adv={ fn:'none', n:7 }; A.mex.sel=null; changed(); } }); });
    ['sum','avg','median'].forEach(function(g){ var on=m.meas==='prop'&&m.pagg===g; items.push({ fa:PAGG[g][0]+' مبلغ'+(on?' ✓':''), en:PAGG[g][1]+' of amount'+(on?' ✓':''), fn:function(){ m.meas='prop'; m.pagg=g; m.prop='amount'; A.mex.sel=null; changed(); } }); });
    items.push({ icon:'globe', fa:'عوض کردن ایونت…', en:'Change event…', fn:function(){ eventPicker(function(id){ m.ev=id; m.filters=[]; A.mex.sel=null; changed(); }); } }); }
  var one=A.mex.metrics.length>1, onlyHint=['توزیع فقط وقتی تنها متریک نمودار است','A distribution only as the chart’s single metric'];
  if(m.kind==='sess'){ items.push({ head:1, fa:'متریک نشست', en:'Session metric' }); Object.keys(MX_SESS).forEach(function(q){ var on=m.sm===q, off=MX_SESS[q][2]==='hist'&&one; items.push({ fa:MX_SESS[q][0]+(on?' ✓':''), en:MX_SESS[q][1]+(on?' ✓':''), disabled:off, hint:off?onlyHint:null, fn:function(){ m.sm=q; A.mex.sel=null; changed(); } }); }); }
  if(m.kind==='sessev'){ items.push({ head:1, fa:'شمارش ایونت در نشست‌ها', en:'Count events in sessions' }); Object.keys(MX_SEV).forEach(function(q){ var on=m.sm===q, off=q==='dist'&&one; items.push({ fa:MX_SEV[q][0]+(on?' ✓':''), en:MX_SEV[q][1]+(on?' ✓':''), disabled:off, hint:off?onlyHint:null, fn:function(){ m.sm=q; A.mex.sel=null; changed(); } }); });
    items.push({ icon:'globe', fa:'عوض کردن ایونت…', en:'Change event…', fn:function(){ eventPicker(function(id){ m.ev=id; A.mex.sel=null; changed(); }); } }); }
  if(m.kind==='hybrid') items.push({ icon:'function', fa:'ویرایش فرمول…', en:'Edit formula…', fn:function(){ tDefineModal({ type:(m.sin||[]).length?'hybrid':'formula', target:'mex', col:{ kind:'hybrid', inputs:clone(m.inputs), sin:clone(m.sin||[]), expr:m.expr }, mxIndex:k }); } });
  setTimeout(function(){ U.menu(anchor, items, 'start'); }, 0); }
function mxMoreMenu(anchor, k){
  var m=A.mex.metrics[k];
  setTimeout(function(){ U.menu(anchor, [{ head:1, fa:'محور', en:'Axis' }].concat([['','خودکار (بر اساس واحد)','Auto (by unit)'],['l','محور ۱ (اصلی)','Axis 1 (primary)'],['r','محور ۲','Axis 2']].map(function(x){ var on=(m.axis||'')===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ m.axis=x[0]; changed(); } }; }))
    .concat([{ head:1, fa:'متحرک و تجمعی', en:'Rolling and cumulative', hint:[MXTIPS.adv[0].replace(/<[^>]+>/g,''),MXTIPS.adv[1].replace(/<[^>]+>/g,'')] }])
    .concat(Object.keys(MX_ADV).map(function(f){ var on=((m.adv||{}).fn||'none')===f; return { fa:MX_ADV[f][0]+(f==='rolling'||f==='window'?' ۷ بازه':'')+(on?' ✓':''), en:MX_ADV[f][1]+(f==='rolling'||f==='window'?', 7 intervals':'')+(on?' ✓':''), fn:function(){ m.adv={ fn:f, n:7 }; changed(); } }; }))
    .concat([{ sep:1 },
      m.kind==='sess'||m.kind==='sessev'?{ icon:'clock-countdown', fa:'افزودن فیلتر نشست…', en:'Add session filter…', fn:function(){ tSessFilterModal(k, m); } }:null,
      m.kind==='sess'&&m.sm==='length_dist'?{ icon:'squares-four', fa:'بازه‌های طول نشست…', en:'Session length buckets…', fn:function(){ mxBucketModal(k); } }:null,
      { icon:'pencil-simple', fa:'تغییر نام در این نمودار…', en:'Rename in this chart…', fn:function(){ var nm=window.prompt(T('نام','Name'), mxName(m)); if(nm!=null){ m.label=nm.trim(); changed(); } } },
      m.kind==='hybrid'&&!m.mid?{ icon:'floppy-disk', fa:'ذخیره به‌عنوان متریک…', en:'Save metric…', fn:function(){ tDefineModal({ type:(m.sin||[]).length?'hybrid':'formula', target:'mex', col:{ kind:'hybrid', inputs:clone(m.inputs), sin:clone(m.sin||[]), expr:m.expr }, mxIndex:k, forceSave:true }); } }:null,
      { icon:'copy', fa:'تکرار', en:'Duplicate', disabled:A.mex.metrics.length>=MX_MAX, fn:function(){ A.mex.metrics.splice(k+1,0,clone(m)); A.mex.sel=null; changed(); } },
      { icon:'trash', fa:'حذف', en:'Remove', danger:true, fn:function(){ A.mex.metrics.splice(k,1); A.mex.sel=null; changed(); } }].filter(Boolean)), 'start'); }, 0); }
function mxAxesModal(focus){
  var Y=A.mex.y;
  function side(sd){ var y=Y[sd]; return '<fieldset class="rbz-axset"><legend>'+(sd==='l'?T('محور ۱ (اصلی)','Axis 1 (primary)'):T('محور ۲','Axis 2'))+'</legend>'+
    '<div class="rbx-field"><label>'+T('عنوان محور','Axis title')+'</label><input class="sh-input" data-ax="'+sd+':title" value="'+esc(y.title)+'"/></div>'+
    '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('کمینه','Minimum')+'</label><input class="sh-input" type="number" data-ax="'+sd+':min" value="'+esc(y.min)+'"/></div><div class="rbx-field" style="flex:1"><label>'+T('بیشینه','Maximum')+'</label><input class="sh-input" type="number" data-ax="'+sd+':max" value="'+esc(y.max)+'"/></div></div>'+
    '<label class="rbz-ck"><input type="checkbox" data-ax="'+sd+':out"'+(y.out?' checked':'')+'/>'+T('نمایش داده‌های بیرون از بازه','Display data out of the min and max value')+'</label>'+
    '<div class="rbx-field"><label>'+T('واحد','Unit')+'</label><select class="sh-select" data-ax="'+sd+':unit">'+[['auto','خودکار','Auto'],['#','عدد','Raw number'],['%','درصد','Percent'],['cur',curU()[0],'Currency ('+curU()[1]+')']/* PM 2026-10-28, TD-9 */,['custom','دلخواه (پیشوند/پسوند)','Custom (prefix/suffix)']].map(function(o){ return '<option value="'+o[0]+'"'+(y.unit===o[0]?' selected':'')+'>'+T(o[1],o[2])+'</option>'; }).join('')+'</select></div>'+
    '<div class="rbx-row"><div class="rbx-field" style="flex:1"><label>'+T('پیشوند','Prefix')+'</label><input class="sh-input" data-ax="'+sd+':pre" value="'+esc(y.pre)+'"/></div><div class="rbx-field" style="flex:1"><label>'+T('پسوند','Suffix')+'</label><input class="sh-input" data-ax="'+sd+':suf" value="'+esc(y.suf)+'"/></div></div></fieldset>'; }
  U.modal({ fa:'تنظیمات محورها', en:'Axis settings', subFa:'محور دوم برای متریک‌هایی با واحد دیگر است و فقط در نمودار خطی و ستونی رسم می‌شود؛ محور شمارش‌ها از صفر شروع می‌شود مگر کمینه را خودتان بدهید.', subEn:'The second axis is for metrics in another unit and is drawn on line and column charts only; count axes start at zero unless you set a minimum.', wide:true,
    body:'<span class="rbx-tipdot"'+tip(MXTIPS.axis[0],MXTIPS.axis[1])+'></span><div class="rbz-axgrid">'+side('l')+side('r')+'</div>',
    init:function(bd){ var f=bd.querySelector('[data-ax="'+(focus||'l')+':title"]'); if(f) setTimeout(function(){ f.focus(); },80); },
    actions:[{ fa:'بازنشانی', en:'Reset', ghost:true, fn:function(){ A.mex.y=blankMex().y; changed(); } },{ fa:'اعمال', en:'Apply', fn:function(bd){ bd.querySelectorAll('[data-ax]').forEach(function(x){ var p=x.getAttribute('data-ax').split(':'); Y[p[0]][p[1]]=x.type==='checkbox'?x.checked:x.value; }); changed(); } }] }); }
/* custom session-length buckets: min inclusive, max exclusive, ascending, no overlap, at most one day */
function mxBucketModal(k){
  var m=A.mex.metrics[k], bk=clone(m.bk&&m.bk.length?m.bk:MX_LBK);
  function rows(){ return bk.map(function(b,i){ return '<div class="rbz-mdrow"><span class="rbz-let">'+num(i+1)+'</span><input class="sh-input sm" type="number" min="0" data-bkmin="'+i+'" value="'+b[0]+'"/>–<input class="sh-input sm" type="number" min="1" data-bkmax="'+i+'" value="'+b[1]+'"/>'+T('ثانیه','seconds')+' <span class="rbz-sethelp">'+esc(mxBkLabels([b])[0])+'</span>'+(bk.length>2?'<button class="rbz-x" data-bkdel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>'; }).join(''); }
  U.modal({ fa:'بازه‌های طول نشست', en:'Session length buckets', subFa:'کمینهٔ هر بازه داخلش است و بیشینه بیرونش؛ نشست‌های بیشتر از یک روز (۸۶٬۴۰۰ ثانیه) حساب نمی‌شوند.', subEn:'Each bucket includes its minimum and excludes its maximum; sessions longer than a day (86,400 s) are excluded.', wide:true,
    body:'<div id="rbzBk">'+rows()+'</div><button class="rbz-linkbtn" id="rbzBkAdd" type="button">'+ic('plus')+T('افزودن بازه','Add bucket')+'</button><div class="rbz-ferr" id="rbzBkE"></div>',
    init:function(bd){ function sync(){ bd.querySelectorAll('[data-bkmin]').forEach(function(x){ bk[+x.getAttribute('data-bkmin')][0]=+x.value; }); bd.querySelectorAll('[data-bkmax]').forEach(function(x){ bk[+x.getAttribute('data-bkmax')][1]=+x.value; }); }
      function wire(){ bd.querySelectorAll('[data-bkdel]').forEach(function(x){ x.addEventListener('click', function(){ sync(); bk.splice(+x.getAttribute('data-bkdel'),1); bd.querySelector('#rbzBk').innerHTML=rows(); wire(); }); }); bd.querySelectorAll('input').forEach(function(x){ x.addEventListener('change', sync); }); }
      wire(); bd.querySelector('#rbzBkAdd').addEventListener('click', function(){ sync(); var last=bk[bk.length-1]; if(bk.length>=12||last[1]>=86400){ U.toast('بازهٔ دیگری جا نمی‌شود','No room for another bucket'); return; } bk.push([last[1], Math.min(86400,last[1]*2)]); bd.querySelector('#rbzBk').innerHTML=rows(); wire(); }); },
    actions:[{ fa:'بازنشانی', en:'Reset', ghost:true, fn:function(){ delete m.bk; changed(); } },{ fa:'اعمال', en:'Apply', fn:function(bd){ bd.querySelectorAll('[data-bkmin]').forEach(function(x){ bk[+x.getAttribute('data-bkmin')][0]=+x.value; }); bd.querySelectorAll('[data-bkmax]').forEach(function(x){ bk[+x.getAttribute('data-bkmax')][1]=+x.value; });
      var bad=bk.some(function(b,i){ return !(b[0]>=0&&b[1]>b[0]&&b[1]<=86400&&(i===0||b[0]>=bk[i-1][1])); });
      if(bad){ bd.querySelector('#rbzBkE').textContent=T('هر بازه باید کمینهٔ کوچک‌تر از بیشینه داشته باشد، بازه‌ها صعودی و بی‌هم‌پوشانی باشند و از یک روز نگذرند.','Each bucket needs min < max, ascending and non-overlapping, up to one day.'); return false; }
      m.bk=bk; changed(); } }] }); }
function mxSeed(kind){
  A.mex=blankMex();
  if(kind==='sess') A.mex.metrics=[{ kind:'sess', sm:'session_totals', filters:[], adv:{ fn:'none', n:7 } },{ kind:'sess', sm:'bounce_rate', filters:[], adv:{ fn:'none', n:7 } }];
  else A.mex.metrics=[{ kind:'hybrid', inputs:[{ L:'A', ev:'subscription_started', meas:'totals' }], sin:[{ L:'S', m:'session_totals' }], expr:'%:A/S', adv:{ fn:'none', n:7 } },{ kind:'sess', sm:'session_totals', filters:[], adv:{ fn:'none', n:7 } }];
  A.viz='line'; A.mex.sel=null; }
function mxCsv(){ var r=lastMx; if(!r) return; var q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; }, cols=colHeads(r), lines=[[T('متریک','Metric'),T('گروه','Segment'),T('تفکیک','Breakdown'),T('واحد','Unit'),T('کل بازه','Whole period')].concat(cols).map(q).join(',')];
  r.overall.concat(r.series).filter(function(x,k,a){ return a.indexOf(x)===k; }).forEach(function(x){ lines.push([x.letter+' '+x.name,x.segName||'',x.group||'',x.unit,x.total==null?'':x.total].concat(x.values.map(function(v){ return v==null?'':v; })).map(q).join(',')); });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{ type:'text/csv' })); a.download='metric-explorer.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400); U.toast('فایل CSV دانلود شد','CSV downloaded'); }
function mxTile(q, ovr){
  var st=norm(clone(q.amp||{})); if(!st.mex.metrics.length) return null;
  var r=mxCompute(st, { range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]), gran:st.interval }), o=r.overall[0]; if(!o) return null;
  return { val:mxFmt(o.unit,o.total), num:o.total, sub:o.name+' · '+T(r.R.fa,r.R.en), viz:spark(o.values.filter(function(v){ return v!=null; })), rows:r.overall.slice(0,5).map(function(x){ return [x.letter+' · '+x.name, mxFmt(x.unit,x.total)]; }), range:r.R }; }
function wireMex(){
  if(!isMex()) return;
  var M=A.mex.metrics, q=function(s){ return root.querySelector(s); };
  root.querySelectorAll('[data-mxadd]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); mxAddMenu(b); }); });
  root.querySelectorAll('[data-mxseed]').forEach(function(b){ b.addEventListener('click', function(){ mxSeed(b.getAttribute('data-mxseed')); changed(); }); });
  root.querySelectorAll('[data-mxmenu]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); mxMetricMenu(b, +b.getAttribute('data-mxmenu')); }); });
  root.querySelectorAll('[data-mxmore]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); mxMoreMenu(b, +b.getAttribute('data-mxmore')); }); });
  root.querySelectorAll('[data-mxfadd]').forEach(function(b){ b.addEventListener('click', function(){ var m=M[+b.getAttribute('data-mxfadd')], id=m.kind==='sess'?'page_view':m.ev;
    propFilterModal({ fa:'فیلتر متریک', en:'Metric filter', subFa:m.kind==='sess'?'فیلتر روی ایونت‌ها پیش از ساختن نشست اعمال می‌شود.':'فقط روی همین متریک.', subEn:m.kind==='sess'?'Applied to events before sessions are formed.':'This metric only.' }, propsOf(id), function(f){ (m.filters=m.filters||[]).push(f); changed(); }); }); });
  root.querySelectorAll('[data-mxfdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-mxfdel').split(':'); M[+p[0]].filters.splice(+p[1],1); changed(); }); });
  root.querySelectorAll('[data-mxgadd]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); var m=M[+b.getAttribute('data-mxgadd')], props=Object.keys(RB.PROPS).filter(function(p){ return p!=='_hcount'&&!RB.PROPS[p].num&&RB.PROPS[p].grp!=='chan'; });
    U.menu(b, props.map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ m.gb=p; A.mex.sel=null; changed(); } }; }), 'start'); }); });
  root.querySelectorAll('[data-mxgdel]').forEach(function(b){ b.addEventListener('click', function(){ M[+b.getAttribute('data-mxgdel')].gb=''; A.mex.sel=null; changed(); }); });
  root.querySelectorAll('[data-mxsfadd]').forEach(function(b){ b.addEventListener('click', function(){ var k=+b.getAttribute('data-mxsfadd'); tSessFilterModal(k, M[k]); }); });
  root.querySelectorAll('[data-mxsfdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-mxsfdel').split(':'); M[+p[0]].sf.splice(+p[1],1); changed(); }); });
  root.querySelectorAll('[data-mxbk]').forEach(function(b){ b.addEventListener('click', function(){ mxBucketModal(+b.getAttribute('data-mxbk')); }); });
  var an=$('rbzMxAnom'); if(an) an.addEventListener('click', function(){ A.ui.anom.on=!A.ui.anom.on; changed(); });
  root.querySelectorAll('[data-mxadel]').forEach(function(b){ b.addEventListener('click', function(){ M[+b.getAttribute('data-mxadel')].adv={ fn:'none', n:7 }; changed(); }); });
  root.querySelectorAll('[data-mxscope]').forEach(function(b){ b.addEventListener('click', function(){ A.mex.scope=b.getAttribute('data-mxscope'); A.mex.sel=null; changed(); }); });
  var cg=q('[data-mxcgb]'); if(cg) cg.addEventListener('click', function(e){ e.stopPropagation(); U.menu(cg, Object.keys(RB.PROPS).filter(function(p){ return p!=='_hcount'&&!RB.PROPS[p].num&&RB.PROPS[p].grp!=='chan'; }).map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ A.mex.cgb=p; A.mex.sel=null; changed(); } }; }), 'start'); });
  var cgd=q('[data-mxcgbdel]'); if(cgd) cgd.addEventListener('click', function(){ A.mex.cgb=''; A.mex.sel=null; changed(); });
  root.querySelectorAll('[data-mxsel]').forEach(function(x){ x.addEventListener('change', function(){ var k=x.getAttribute('data-mxsel'); A.mex.sel[k]=x.checked; changed(); }); });
  root.querySelectorAll('[data-mxleg]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-mxleg'); hidden[k]=!hidden[k]; render(); }); });
  root.querySelectorAll('[data-mxlegren]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-mxlegren'), s=lastMx.overall.concat(lastMx.series).filter(function(x){ return x.key===k; })[0], nm=window.prompt(T('برچسب تازه (جدول همان نام اصلی را نگه می‌دارد)','New label (the table keeps the original name)'), s?mxSeriesName(s):'');
    if(nm!=null){ if(nm.trim()) A.mex.legend[k]=nm.trim(); else delete A.mex.legend[k]; changed(); } }); });
  var vz=$('rbzMxViz'); if(vz) vz.addEventListener('click', function(e){ e.stopPropagation(); var one=mxOneUnit(lastMx), add=mxAdditive(lastMx);
    U.menu(vz, VIZ.filter(function(x){ return MX_VIZ.indexOf(x[0])>-1; }).map(function(x){ var why=x[0]==='area'||x[0]==='stackbar'||x[0]==='pie'?(!one||!add?['فقط برای یک واحد جمع‌پذیر (مثل تعداد)','Only for one additive unit (such as counts)']:null):x[0]==='bar'?(!one?['با چند واحد فقط نمودار خطی و ستونی','With several units: line and column only']:null):null;
      return { icon:x[3], fa:x[1]+(A.viz===x[0]?' ✓':''), en:x[2]+(A.viz===x[0]?' ✓':''), disabled:!!why, hint:why, fn:function(){ A.viz=x[0]; changed(); } }; }), 'start'); });
  var ax=$('rbzMxAxes'); if(ax) ax.addEventListener('click', function(){ mxAxesModal('l'); });
  var st0=$('rbzSet'); if(st0){ var c2=st0.cloneNode(true); st0.parentNode.replaceChild(c2, st0); c2.addEventListener('click', function(){ mxAxesModal('l'); }); }
  var cmp=$('rbzMxCmp'); if(cmp) cmp.addEventListener('click', function(e){ e.stopPropagation(); U.menu(cmp, [['','بدون مقایسه','No comparison'],['prev','دورهٔ قبل','Previous period'],['year','سال قبل','Previous year']].map(function(x){ var on=(A.compare[0]||'')===x[0]; return { fa:x[1]+(on?' ✓':''), en:x[2]+(on?' ✓':''), fn:function(){ A.compare=x[0]?[x[0]]:[]; changed(); } }; }), 'start'); });
  var csv=$('rbzCsv'); if(csv){ var c3=csv.cloneNode(true); csv.parentNode.replaceChild(c3,csv); c3.addEventListener('click', mxCsv); }
}
/* ═════════ Step 8a: Stickiness, Lifecycle, User Composition, Engagement Matrix (Amplitude "10 more") ═════════
   Specs: research-notes/…/26a-amplitude-charts-batch-a.md (inventories, rules, Shahin verdicts) and 26-step8-chart-types-index.md.
   A user is a person (identity batch c): an identified person's devices count once, an anonymous user is one per device. */
var S8_TYPES={ stick:['چسبندگی','Stickiness','push-pin'], life:['چرخهٔ عمر','Lifecycle','arrows-clockwise'], comp:['ترکیب کاربران','User composition','users-three'], emx:['ماتریس تعامل','Engagement matrix','squares-four'] };
function isS8(t){ return !!S8_TYPES[t||RB.Q.type]; }
function blankS8(){ return { stick:{ ev:'_any_active', filters:[], per:'week', cum:false, view:'dist', gb:'', sel:null },
  life:{ ev:'_any_active', filters:[], iv:'week', view:'growth' },
  comp:{ prop:'device_type', mode:'recent', view:'donut' },
  emx:{ set:'both', list:[], iv:'week', freq:'days', sec:'median', scale:'linear', hidden:{} } }; }
var S8TIPS={
  stick:["<span class='tip-title'>چسبندگی</span>برای هر هفته یا ماه، کاربرانی که این ایونت را انجام داده‌اند بر اساس تعداد روزهای متفاوتی که انجامش داده‌اند دسته‌بندی می‌شوند؛ ده بار در یک روز یک روز حساب می‌شود. درصدها از کاربرانی است که در همان دوره دست‌کم یک بار ایونت را انجام داده‌اند. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود.","<span class='tip-title'>Stickiness</span>For each week or month, people who did the event are grouped by how many different days they did it; ten times in one day counts as one day. Percentages are of people who did the event at least once in that period. An anonymous user counts once per device."],
  cum:["<span class='tip-title'>تجمعی / غیرتجمعی</span>غیرتجمعی: دقیقاً همین تعداد روز. تجمعی: دست‌کم همین تعداد روز؛ ستون «۱ روز» در حالت تجمعی همیشه ۱۰۰٪ است.","<span class='tip-title'>Cumulative / non-cumulative</span>Non-cumulative: exactly this many days. Cumulative: at least this many days; the 1-day column is always 100% in cumulative mode."],
  life:["<span class='tip-title'>چرخهٔ عمر</span>کاربران فعال هر بازه به جدید (اولین بازدیدشان در همین بازه)، فعلی (در بازهٔ قبل هم فعال بوده‌اند) و بازگشته (قبلاً بوده‌اند ولی در بازهٔ قبل نه) تقسیم می‌شوند؛ غیرفعال‌شده‌ها کسانی‌اند که در بازهٔ قبل فعال بودند و این بار نه. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، پس پاک شدن کوکی «جدید» را بیشتر نشان می‌دهد.","<span class='tip-title'>Lifecycle</span>Each interval’s active users split into new (first seen in this interval), current (active in the previous interval too) and resurrected (seen before, but not in the previous interval); dormant users were active in the previous interval and not this one. An anonymous user counts once per device, so cleared cookies inflate “new”."],
  pulse:["<span class='tip-title'>نبض</span>(جدید + بازگشته) ÷ غیرفعال‌شده؛ بیشتر از ۱ یعنی پایگاه کاربر رشد می‌کند و کمتر از ۱ یعنی نمی‌کند. وقتی غیرفعال‌شده صفر است «—» نمایش داده می‌شود. چون کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، نبض کمی بیشتر از واقعیت نشان داده می‌شود.","<span class='tip-title'>Pulse</span>(new + resurrected) ÷ dormant; above 1 the user base grows, below 1 it doesn’t. Shows “—” when there are no dormant users. Device identity nudges Pulse upward."],
  comp:["<span class='tip-title'>ترکیب کاربران</span>کاربران فعال بازه به تفکیک مقدار یک ویژگی؛ «آخرین مقدار» از آخرین ایونت فعال هر کاربر خوانده می‌شود و هر کاربر در یک دسته است. ایونت‌های غیرفعال (مثل پینگ پخش) حساب نمی‌شوند.","<span class='tip-title'>User composition</span>Active users in the range by the value of one property; “Most recent value” is read from each user’s latest active event and each user is in one bucket. Inactive events (such as playback pings) don’t count."],
  emx:["<span class='tip-title'>ماتریس تعامل</span>هر نقطه یک ایونت است: افقی، درصد کاربران فعال بازه که آن را انجام داده‌اند (گستردگی)؛ عمودی، میانگین روز یا دفعات انجامش (تکرار). خط‌های خاکستری میانه یا میانگین همین نقطه‌هاست و چهار بخش می‌سازد.","<span class='tip-title'>Engagement matrix</span>Each point is an event: across, the share of the interval’s active users who did it (breadth); up, how many days or times they did it on average (frequency). The grey lines are the median or average of these points and form four quadrants."]
};
/* period uniques for an event: the finest interval the range allows, grouped into weeks or months */
function s8Series(e, sg, gran){
  var R0=RB.rangeInfo(), ok=RB.granAllowed(R0.mode), g=gran&&ok.indexOf(gran)>-1?gran:(ok.indexOf('day')>-1?'day':ok.indexOf('week')>-1?'week':'month');
  var out=within({ range:RB.Q.range, filters:RB.Q.filters, gran:g }, function(){ var R=RB.rangeInfo(), u=baseSeries(e,true), t=baseSeries(e,false), sf=segFactor(sg, e, RB.periodUniques(u));
    if(sf){ u=split(u,sf.share,sf.seed+'u'); t=split(t,sf.share*sf.tilt,sf.seed+'t'); } return { u:u, t:t, unit:R.unit, labels:RB.axisLabels(), R:R }; });
  return out; }
/* how habitual an event is: the engine's daily series share one shape, so per-event repeat days get an event-specific factor
   (site-wide events are fully habitual; niche events less). Shared by Stickiness and the Engagement Matrix so the two agree. */
function s8Hab(id){ if(id==='_any_active'||id==='_any'||id==='page_view'||id==='session_start') return 1; var ev=getEv(id), w=ev?Math.min(1,Math.log10(1+ev.w)/5):0.3; return Math.max(0.12, Math.min(1, 0.15+0.55*w+0.3*jitter(id+'hab',0))); }
function s8Group(arr, size){ var g=[]; for(var i=arr.length; i>0; i-=size) g.unshift(arr.slice(Math.max(0,i-size), i)); return g; }
/* ── Stickiness ── */
function s8TruncBinom(L, q){ var p=[], s=0; for(var k=1;k<=L;k++){ var c=1; for(var j=0;j<k;j++) c=c*(L-j)/(j+1); var v=c*Math.pow(q,k)*Math.pow(1-q,L-k); p.push(v); s+=v; } return p.map(function(x){ return x/(s||1); }); }
function s8StickDist(L, mean){   /* a casual majority and a loyal minority, solved so the mean days per user matches the data */
  function mix(q){ var a=s8TruncBinom(L,q), b=s8TruncBinom(L,Math.min(0.92,q*2.6)); return a.map(function(x,i){ return 0.72*x+0.28*b[i]; }); }
  function mu(q){ return mix(q).reduce(function(s,x,i){ return s+x*(i+1); },0); }
  var lo=0.001, hi=0.9; for(var it=0;it<40;it++){ var mid=(lo+hi)/2; if(mu(mid)<mean) lo=mid; else hi=mid; } return mix((lo+hi)/2); }
function stickCompute(st, ctx){
  return within(ctx, function(){
    var S=st.s8.stick, e={ id:S.ev, filters:S.filters||[] }, sg=norm(st).segments[0], L=S.per==='month'?30:7, out={ L:L, periods:[], gb:[] };
    var ser=s8Series(e, sg, S.per==='month'?'week':'day'), size=ser.unit==='day'?L:ser.unit==='week'?(S.per==='month'?4:1):1;
    var U=s8Group(ser.u, size).map(function(sl){ return RB.periodUniques(sl); }), PD=s8Group(ser.u, size).map(function(sl){ return sl.reduce(function(a,b){ return a+b; },0); });
    /* days per user in a period: measured from daily data when the range allows it; otherwise the same ratio, measured on the last 7 or 30 days, so long ranges agree with short ones */
    var ratio=within({ range:S.per==='month'?'30d':'7d', filters:RB.Q.filters, gran:'day' }, function(){ var u=baseSeries(e,true), sf=segFactor(sg, e, RB.periodUniques(u)); if(sf) u=split(u,sf.share,sf.seed+'u'); var pu=RB.periodUniques(u); return pu?u.reduce(function(a,b){ return a+b; },0)/pu:1; });
    var lab=ser.labels[fa()?'fa':'en'], gl=s8Group(lab, size);
    U.forEach(function(u,p){ var days=ser.unit==='day'?gl[p].length:L, mean=Math.max(1, Math.min(days, 1+((ser.unit==='day'&&PD[p]&&u?PD[p]/u:ratio*(0.94+0.12*jitter(S.ev+'h',p)))-1)*s8Hab(S.ev))), d=s8StickDist(days, mean), n=jAlloc(u, d);
      out.periods.push({ label:gl[p][0]+(gl[p].length>1?' – '+gl[p][gl[p].length-1]:''), users:u, days:days, n:n, partial:days<L||p===U.length-1&&ser.R.mode!=='custom' }); });
    /* the headline pools user-periods over complete periods only (the current one is still collecting) */
    var full=out.periods.filter(function(p){ return !p.partial; }); if(!full.length) full=out.periods.slice(-1);
    var tot=full.reduce(function(a,p){ return a+p.users; },0), nk=[]; for(var k=1;k<=L;k++) nk.push(full.reduce(function(a,p){ return a+(p.n[k-1]||0); },0));
    out.pooled={ users:tot, n:nk, from:full.length };
    if(S.gb&&RB.PROPS[S.gb]) RB.PROPS[S.gb].vals.slice(0,5).forEach(function(v,i){ var tilt=0.8+0.4*jitter(S.gb+v[1],i), d=s8StickDist(L, Math.max(1,Math.min(L, (nk.reduce(function(a,x,j){ return a+x*(j+1); },0)/(tot||1))*tilt))), u=Math.round(tot*v[2]);
      out.gb.push({ name:T(v[0],v[1]), users:u, n:jAlloc(u, d) }); });
    return out; }); }
function stickPct(n, users, k, cum){ var x=cum?n.slice(k-1).reduce(function(a,b){ return a+b; },0):n[k-1]||0; return users?x/users*100:0; }
/* ── Lifecycle ── */
function lifeCompute(st, ctx){
  return within(ctx, function(){
    var Lf=st.s8.life, e={ id:Lf.ev, filters:Lf.filters||[] }, sg=norm(st).segments[0], ser=s8Series(e, sg, Lf.iv), A0=ser.u, n=A0.length, lab=ser.labels[fa()?'fa':'en'];
    var newShare=Lf.ev==='_any_active'||Lf.ev==='page_view'||Lf.ev==='session_start'?0.3:0.12+0.12*jitter(Lf.ev+'n',0), rN=0.18+0.08*jitter(Lf.ev+'rn',0), rC=0.52+0.18*jitter(Lf.ev+'rc',0), rR=0.3+0.1*jitter(Lf.ev+'rr',0);
    if(ser.unit==='day'){ rN*=0.8; rC*=0.85; rR*=0.85; } else if(ser.unit==='month'){ rN*=1.25; rC=Math.min(0.85,rC*1.15); rR*=1.2; }
    /* one look-back interval before the range, so the first bar has current and dormant users too */
    var pre=Math.round(A0[0]*(0.95+0.1*jitter(Lf.ev+'pre',0))), prev={ nw:Math.round(pre*newShare), cur:Math.round(pre*0.55), res:0 }; prev.res=Math.max(0,pre-prev.nw-prev.cur);
    var rows=[];
    for(var t=0;t<n;t++){ var A=A0[t], cur=Math.round(rN*prev.nw+rC*prev.cur+rR*prev.res), nw=Math.round(A*newShare*(0.9+0.2*jitter(Lf.ev+'nw',t)));
      if(cur+nw>A){ var k2=A/(cur+nw); cur=Math.floor(cur*k2); nw=A-cur; }
      var res=A-nw-cur, Aprev=prev.nw+prev.cur+prev.res, dorm=Aprev-cur;
      /* dormant users by the class they had in the previous interval */
      var dN=prev.nw-Math.round(rN*prev.nw), dC=prev.cur-Math.round(rC*prev.cur), dR=dorm-dN-dC; if(dR<0){ dC+=dR; dR=0; }
      rows.push({ label:lab[t], A:A, nw:nw, cur:cur, res:res, dorm:dorm, dN:dN, dC:dC, dR:dR, pulse:dorm?(nw+res)/dorm:null, partial:t===n-1 });
      prev={ nw:nw, cur:cur, res:res }; }
    return { rows:rows, unit:ser.unit }; }); }
/* ── User Composition ── */
var COMP_PROPS=['device_type','os','browser','city','isp_name','country','page_lang','is_new_user','referrer_type','utm_source','is_engaged'], COMP_VISIT=['referrer_type','utm_source','is_engaged'], COMP_FIXED=['device_type','os','browser'];
function compCompute(st, ctx){
  return within(ctx, function(){
    var C=st.s8.comp, P=RB.PROPS[C.prop], segs=norm(st).segments, out={ segs:[], prop:C.prop, overlap:false, fixed:COMP_FIXED.indexOf(C.prop)>-1 };
    segs.forEach(function(sg, si){ var e={ id:'_any_active', filters:[] }, u=baseSeries(e,true), sf=segFactor(sg, e, RB.periodUniques(u)), act=Math.round(RB.periodUniques(u)*(sf?sf.share:1));
      var vals=segValues(sg, C.prop).map(function(v){ return v.slice(); }), visit=COMP_VISIT.indexOf(C.prop)>-1;
      if(visit) vals.push(['(بدون مقدار)','(none)',0.03]);   /* the property was missing on the most recent active event */
      var w=tNorm(vals.map(function(v,i){ return v[2]*(0.9+0.2*jitter(C.prop+si,i)); })), rows;
      if(C.mode==='all'&&!out.fixed){   /* every value a user had in the range: buckets overlap, so slices can add up to more than the active users */
        rows=vals.map(function(v,i){ return { name:T(v[0],v[1]), n:Math.round(act*w[i]*(1+0.35*(1-w[i])*jitter(C.prop+'a',i))) }; }); out.overlap=true; }
      else if(C.mode==='cross'&&!out.fixed){   /* the exact set of values each user had: mutually exclusive buckets, singles and the commonest pairs */
        var single=jAlloc(Math.round(act*0.84), w), pairs=[], rest=act-single.reduce(function(a,b){ return a+b; },0);
        for(var a=0;a<Math.min(3,vals.length);a++) for(var b=a+1;b<Math.min(4,vals.length);b++) pairs.push({ name:T(vals[a][0]+' + '+vals[b][0], vals[a][1]+' + '+vals[b][1]), w:w[a]*w[b] });
        var pa=jAlloc(rest, pairs.map(function(x){ return x.w; }));
        rows=vals.map(function(v,i){ return { name:T(v[0],v[1]), n:single[i] }; }).concat(pairs.map(function(x,i){ return { name:x.name, n:pa[i] }; })); }
      else rows=vals.map(function(v,i){ return { name:T(v[0],v[1]) }; }).map(function(r,i,arr){ return r; });
      if(!rows[0]||rows[0].n==null){ var al=jAlloc(act, w); rows=vals.map(function(v,i){ return { name:T(v[0],v[1]), n:al[i] }; }); }
      rows.sort(function(a,b){ return b.n-a.n; });
      if(rows.length>14){ var other=rows.slice(13).reduce(function(s,x){ return s+x.n; },0); rows=rows.slice(0,13).concat([{ name:T('سایر','Other'), n:other, other:true }]); }
      out.segs.push({ name:segLabel(sg), active:act, rows:rows }); });
    return out; }); }
/* ── Engagement Matrix ── */
var EMX_NOISE=['video_heartbeat','video_progress','experiment_viewed'];
function emxEvents(st){ var E=st.s8.emx, all=RB.EVENTS.filter(function(e){ return !e.late&&EMX_NOISE.indexOf(e.id)<0; });
  if(E.set==='custom') return (E.list||[]).map(function(x){ return typeof x==='string'?{ id:x, filters:[] }:x; }).filter(function(x){ return getEv(x.id); }).slice(0,20);
  var byTot=all.slice().sort(function(a,b){ return b.w-a.w; }), top=byTot.slice(0,50), bottom=byTot.slice(-50).reverse();
  var pick=E.set==='top'?top:E.set==='bottom'?bottom:top.concat(bottom.filter(function(e){ return top.indexOf(e)<0; }));   /* top 50 + bottom 50, each event once */
  return pick.map(function(e){ return { id:e.id, filters:[] }; }); }
function emxCompute(st, ctx){
  return within(ctx, function(){
    /* weekly and monthly values come from the daily data when the range has it: breadth = users of the event in the period ÷ active users in the period;
       days = person-days ÷ users; times = event totals ÷ users. Long ranges use the engine's weekly or monthly series with the same per-user ratio. */
    var E=st.s8.emx, sg=norm(st).segments[0], R=RB.rangeInfo(), daily=RB.granAllowed(R.mode).indexOf('day')>-1, iv=E.iv==='month'&&R.days<28?'week':E.iv, L=iv==='day'?1:iv==='week'?7:30;
    var act=s8Series({ id:'_any_active', filters:[] }, sg, daily?'day':iv), size=daily?L:1, pts=[];
    var groups=function(x){ return size>1?s8Group(x, size):x.map(function(v){ return [v]; }); }, aU=groups(act.u).map(function(g){ return RB.periodUniques(g); });
    emxEvents(st).forEach(function(x){ var s0=s8Series({ id:x.id, filters:x.filters||[] }, sg, daily?'day':iv), gu=groups(s0.u), gt=groups(s0.t);
      var U=gu.map(function(g){ return RB.periodUniques(g); }), PD=gu.map(function(g){ return g.reduce(function(a,b){ return a+b; },0); }), TT=gt.map(function(g){ return g.reduce(function(a,b){ return a+b; },0); });
      var br=U.map(function(u,i){ return aU[i]?Math.min(1,u/aU[i]):0; }), idx=U.map(function(u,i){ return u?i:-1; }).filter(function(i){ return i>=0; });
      var hb=s8Hab(x.id), dd=idx.map(function(i){ return daily?Math.min(L, 1+(PD[i]/U[i]-1)*hb):Math.min(L, 1+(TT[i]/U[i]-1)*(0.35+0.25*jitter(x.id+'dd',0))*hb); }), tt=idx.map(function(i){ return Math.max(1, TT[i]/U[i]); });
      var avg=function(a){ return a.length?a.reduce(function(p,q){ return p+q; },0)/a.length:0; };
      pts.push({ id:x.id, name:evName(x.id), breadth:+(avg(br)*100).toFixed(2), freq:+(E.freq==='days'?Math.max(L===1?1:1,avg(dd)):Math.max(1,avg(tt))).toFixed(2), users:RB.periodUniques(s0.u) }); });
    var vis=pts.filter(function(p){ return !E.hidden[p.id]; }), med=function(a){ var o=a.slice().sort(function(x,y){ return x-y; }), m=Math.floor(o.length/2); return o.length?(o.length%2?o[m]:(o[m-1]+o[m])/2):0; }, avg2=function(a){ return a.length?a.reduce(function(x,y){ return x+y; },0)/a.length:0; };
    var bx=vis.map(function(p){ return p.breadth; }), fy=vis.map(function(p){ return p.freq; }), lineX=E.sec==='avg'?avg2(bx):med(bx), lineY=E.sec==='avg'?avg2(fy):med(fy);
    pts.forEach(function(p){ p.q=p.breadth>=lineX?(p.freq>=lineY?'core':'once'):(p.freq>=lineY?'power':'weak'); });
    return { pts:pts, lineX:lineX, lineY:lineY, unit:iv, L:L }; }); }
var EMX_Q={ core:['ویژگی‌های اصلی','Core features'], power:['ویژگی‌های حرفه‌ای','Power features'], once:['پرکاربرد ولی یک‌باره','Broad but once-off'], weak:['بازبینی یا حذف','Improve or deprecate'] };
/* ── shared UI ── */
var lastS8=null;
function s8EventModule(key, title, tipK){
  var S=A.s8[key], h='<div class="rbz-mod">'+modHead('ev',title[0],title[1],S8TIPS[tipK],evName(S.ev));
  if(!OPEN.ev) return h+'</div>';
  h+='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let">A</span><button class="rbz-evname" data-s8ev="'+key+'" type="button"><span class="rbz-evic">'+evIcon(S.ev)+'</span><span class="nm">'+esc(evName(S.ev))+'</span><span class="rbz-car">⌄</span></button></div>';
  (S.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-s8fdel="'+key+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
  h+='<div class="rbz-evacts"><button data-s8fadd="'+key+'" type="button">+ '+T('فیلتر','Filter by')+'</button></div></div>';
  return h+'<div class="rbz-hint">'+ic('info')+T('این نمودار فقط یک ایونت دارد.','This chart takes one event.')+'</div></div>'; }
function s8Seg2(attr, opts, cur){ return '<div class="rbz-seg2 sm" role="radiogroup">'+opts.map(function(o){ var on=cur===o[0]; return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" '+attr+'="'+o[0]+'"'+(o[3]?' disabled title="'+o[3]+'"':'')+'>'+T(o[1],o[2])+'</button>'; }).join('')+'</div>'; }
function s8Shell(panel, tool, body){
  root.classList.toggle('rtl', fa());
  root.innerHTML='<div class="rbz-grid"><aside class="rbz-panel">'+panel+(RB.Q.type==='compass'||RB.Q.type==='personas'||RB.Q.type==='exp'?'':segmentModule())+'</aside><section class="rbz-canvas"><div class="rbz-tool">'+toolStart()+'<span class="rbx-spacer"></span>'+tool+'<span class="rbz-drslot"></span></div>'+body+'</section></div>';
  placeFilter(); wire(); U.i18n(); }
function s8Chart(opt, cb){ var el=$('rbzChart'); if(!el||!window.echarts) return; if(chart){ chart.dispose(); chart=null; } chart=echarts.init(el); chart.setOption(opt); el.style.filter='saturate(.72)'; if(cb) cb(chart); }
function s8Base(){ var cs=getComputedStyle(document.body); return { TX:cs.getPropertyValue('--sh-text').trim(), MU:cs.getPropertyValue('--sh-muted').trim(), BD:cs.getPropertyValue('--sh-border').trim(), SF:cs.getPropertyValue('--sh-surface').trim(), BAD:cs.getPropertyValue('--sh-bad').trim()||'#d33', FONT:cs.fontFamily,
  tip:function(o){ return Object.assign({ backgroundColor:cs.getPropertyValue('--sh-surface').trim(), borderColor:cs.getPropertyValue('--sh-border').trim(), textStyle:{ color:cs.getPropertyValue('--sh-text').trim(), fontFamily:cs.fontFamily, fontSize:12 }, confine:true, extraCssText:'direction:'+(fa()?'rtl':'ltr')+';text-align:start' }, o); } }; }
/* Block C (2026-10-24): one set of «people» items for every chart with points (gap audit 49a A2: streams, journeys and replays were
   missing on stickiness, lifecycle, impact, composition and Data Table cells) */
function msPeopleItems(lb, n, seed, ev){ var org=RB.Q.unit==='org', e=jReal(ev||'page_view');
  return [{ icon:'user-circle', fa:'جریان ایونت‌های کاربران', en:'View user streams', disabled:org, hint:org?['جریان ایونت برای هر آدم است؛ در شمارش سازمان‌ها، «دیدن این سازمان‌ها» را بزنید.','Streams are per person; when counting organizations, use “View these organizations”.']:null, fn:function(){ streamsModal(lb, n, seed, e); } },
    { icon:'share-network', fa:'دیدن مسیر این کاربران', en:'Show user journeys', fn:function(){ openJourney(e); } },
    { icon:'video-camera', fa:'تماشای ضبط جلسه‌ها', en:'Watch session replays', fn:function(){ openReplay({ label:T(lb[0],lb[1]), n:n, seed:seed }); } }]; }
function s8Micro(p, lb, n, ev, stat){ var box=$('rbzChart').parentNode, a=document.createElement('span'); box.querySelectorAll('.rbz-anchor').forEach(function(x){ var w=x.closest('.rbx-menuwrap'); (w||x).remove(); });
  a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px'; box.appendChild(a);
  s8MenuAt(a, lb, n, ev, stat); }
/* PM 2026-10-25, AC-17: the full people menu on any anchor (chart point, composition bucket, impact table cell) */
function s8MenuAt(a, lb, n, ev, stat){
  U.menu(a, [{ head:1, fa:lb[0]+' · '+num(n)+' کاربر', en:lb[1]+' · '+num(n)+' users' },{ icon:'users', fa:UL()[0], en:UL()[1], fn:function(){ usersModal(lb, n, lb[1]); } },
    { icon:'users-three', fa:'ساختن کوهورت'+coTag(), en:'Create cohort'+coTag(), fn:function(){ cohortModal(lb, n, ev||'page_view', [lb[0], lb[1], !!stat]); } },{ icon:'export', fa:DL()[0], en:DL()[1], fn:function(){ downloadUsers(lb, n, lb[1]); } },{ sep:1 }].concat(msPeopleItems(lb, n, lb[1], ev)), 'start'); }
/* Stickiness view */
function renderStick(){
  var S=A.s8.stick, r=lastS8=stickCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), L=r.L, ks=[]; for(var k=1;k<=L;k++) ks.push(k);
  var panel=s8EventModule('stick',['ایونت','Event'],'stick')+'<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('سنجش','Metrics')+'</span><span class="rbx-tipdot"'+tip(S8TIPS.cum[0],S8TIPS.cum[1])+'></span></div>'+
    s8Seg2('data-stcum',[['false','غیرتجمعی','Non-cumulative'],['true','تجمعی','Cumulative']],String(!!S.cum))+
    '<div class="rbz-sub2"><span class="lb">'+T('تفکیک بر اساس','Grouped by')+'</span></div><div class="rbz-fieldrow"><button class="rbz-field" data-stgb="1" type="button">'+(S.gb?esc(T(RB.PROPS[S.gb].fa,RB.PROPS[S.gb].en)):'<span class="ph">'+T('انتخاب ویژگی…','Select property…')+'</span>')+' <span class="car">⌄</span></button>'+(S.gb?'<button data-stgbdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div></div>';
  var tool=s8Seg2('data-stper',[['week','هفتگی','Weekly'],['month','ماهانه','Monthly',RB.rangeInfo().days<28?T('برای ماهانه بازهٔ بلندتری انتخاب کنید','Pick a longer range for monthly'):'']],S.per)+s8Seg2('data-stview',[['dist','توزیع','Distribution'],['time','تغییر در طول زمان','Change over time']],S.view);
  var head='<tr><th class="fix">'+T('دوره','Period')+'</th><th class="num">'+T('کاربران','Users')+'</th>'+ks.map(function(k){ return '<th class="num">'+T(num(k)+' روز',k+(k===1?' day':' days'))+'</th>'; }).join('')+'</tr>';
  var rowsH='<tr class="ov"><td class="fix"><b>'+T('همهٔ دوره‌های کامل','All complete periods')+'</b> <span class="rbz-tag">'+num(r.pooled.from)+'</span></td><td class="num strong">'+num(r.pooled.users)+'</td>'+ks.map(function(k){ return '<td class="num strong">'+pctTxt(stickPct(r.pooled.n, r.pooled.users, k, S.cum))+'</td>'; }).join('')+'</tr>'+
    r.periods.map(function(p){ return '<tr><td class="fix">'+esc(p.label)+(p.partial?' <span class="rbz-tag" title="'+T('داده هنوز کامل نیست','Data still collecting')+'">*</span>':'')+'</td><td class="num">'+num(p.users)+'</td>'+ks.map(function(k){ return '<td class="num">'+(k>p.days?'—':pctTxt(stickPct(p.n, p.users, k, S.cum)))+'</td>'; }).join('')+'</tr>'; }).join('')+
    r.gb.map(function(g){ return '<tr><td class="fix"><bdi>'+esc(g.name)+'</bdi></td><td class="num">'+num(g.users)+'</td>'+ks.map(function(k){ return '<td class="num">'+pctTxt(stickPct(g.n, g.users, k, S.cum))+'</td>'; }).join('')+'</tr>'; }).join('');
  s8Shell(panel, tool, '<div class="rbz-note">'+ic('info')+T('درصدها از کاربرانی است که در همان دوره ایونت را انجام داده‌اند؛ کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، پس خوانندهٔ چنددستگاهی کمتر وفادار دیده می‌شود. دورهٔ ستاره‌دار هنوز کامل نیست و در «همهٔ دوره‌های کامل» حساب نمی‌شود.','Percentages are of people who did the event in that period; an anonymous user counts once per device, so a multi-device reader looks less loyal. A starred period is still collecting and is left out of “All complete periods”.')+'</div>'+
    '<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div><div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول چسبندگی','Stickiness table')+'</span><span class="rbx-tipdot"'+tip(S8TIPS.stick[0],S8TIPS.stick[1])+'></span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead>'+head+'</thead><tbody>'+rowsH+'</tbody></table></div></div>');
  var B=s8Base(), pal=palette(), xs=ks.map(function(k){ return T(num(k)+' روز',k+(k===1?' day':' days')); });
  var opt=S.view==='time'?{ grid:{ left:56, right:56, top:16, bottom:28 }, tooltip:B.tip({ trigger:'axis' }), legend:{ bottom:0, textStyle:{ color:B.TX, fontFamily:B.FONT } },
      xAxis:{ type:'category', inverse:fa(), data:r.periods.map(function(p){ return p.label; }), axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11, hideOverlap:true } },
      yAxis:{ type:'value', min:0, max:100, position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return num(v)+T('٪','%'); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
      series:ks.slice(0,Math.min(L,S.per==='month'?6:7)).map(function(k,i){ return { name:xs[i], type:'line', symbolSize:5, itemStyle:{ color:pal[i%pal.length] }, data:r.periods.map(function(p){ return k>p.days?null:+stickPct(p.n,p.users,k,S.cum).toFixed(1); }) }; }) }
    :{ grid:{ left:56, right:56, top:16, bottom:40 }, tooltip:B.tip({ trigger:'axis', formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ return esc(p.seriesName)+' <b>'+pctTxt(p.value)+'</b>'; }).join('<br>'); } }),
      xAxis:{ type:'category', inverse:fa(), data:xs, axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11 } },
      yAxis:{ type:'value', min:0, max:100, position:fa()?'right':'left', name:S.cum?T('دست‌کم این تعداد روز (٪)','At least this many days (%)'):T('دقیقاً این تعداد روز (٪)','Exactly this many days (%)'), nameLocation:'middle', nameGap:42, nameRotate:fa()?-90:90, nameTextStyle:{ color:B.MU, fontFamily:B.FONT, fontSize:11 }, axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return num(v)+T('٪','%'); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
      series:[{ name:T('همهٔ دوره‌های کامل','All complete periods'), type:'bar', barMaxWidth:30, itemStyle:{ color:pal[0] }, data:ks.map(function(k){ return +stickPct(r.pooled.n, r.pooled.users, k, S.cum).toFixed(1); }) }].concat(r.gb.map(function(g,i){ return { name:g.name, type:'bar', barMaxWidth:18, itemStyle:{ color:pal[(i+1)%pal.length] }, data:ks.map(function(k){ return +stickPct(g.n, g.users, k, S.cum).toFixed(1); }) }; })) };
  s8Chart(opt, function(c){ c.on('click', function(p){ if(p.componentType!=='series') return; var k=S.view==='time'?p.seriesIndex+1:p.dataIndex+1, pool=S.view==='time'?r.periods[p.dataIndex]:r.pooled, nn=Math.round(pool.users*(p.value||0)/100);
    setTimeout(function(){ s8Micro(p, [xs[k-1]+' · '+evName(S.ev), xs[k-1]+' · '+evName(S.ev)], nn, S.ev, true); }, 0); }); }); }
/* Lifecycle view */
function renderLife(){
  var Lf=A.s8.life, r=lastS8=lifeCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), ok=RB.granAllowed(RB.rangeInfo().mode); if(r.unit!==Lf.iv) Lf.iv=r.unit;
  var panel=s8EventModule('life',['ایونت','Event'],'life')+'<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('بازهٔ استفاده','Usage interval')+'</span><span class="rbx-tipdot"'+tip(S8TIPS.life[0],S8TIPS.life[1])+'></span></div>'+
    s8Seg2('data-lfiv',[['day','روزانه','Daily',ok.indexOf('day')<0?T('این بازهٔ زمانی روزانه ندارد','Not for this range'):''],['week','هفتگی','Weekly',ok.indexOf('week')<0?T('این بازهٔ زمانی هفتگی ندارد','Not for this range'):''],['month','ماهانه','Monthly',ok.indexOf('month')<0?T('این بازهٔ زمانی ماهانه ندارد','Not for this range'):'']],Lf.iv)+
    '<p class="rbz-sethelp">'+T('اگر کاربر ایونت را در همین بازه انجام دهد «فعلی» است وگرنه «غیرفعال‌شده»؛ برای سایت خبری هفتگی پیشنهاد می‌شود.','Doing the event within the interval makes a user current, otherwise dormant; weekly suits news sites.')+'</p></div>';
  var tool=s8Seg2('data-lfview',[['growth','رشد','Growth'],['dormant','غیرفعال‌شده‌ها','Dormant'],['pulse','نبض','Pulse']],Lf.view);
  var R=r.rows, cls=[['nw','جدید','New'],['cur','فعلی','Current'],['res','بازگشته','Resurrected'],['dorm','غیرفعال‌شده','Dormant']];
  var body='<div class="rbz-note">'+ic('info')+T('کاربرِ ناشناس هر دستگاهش جداست: پاک شدن کوکی یا عوض کردن مرورگرِ کسی که شناسایی نشده او را «جدید» نشان می‌دهد و نبض را کمی بالا می‌برد. «جدید» یعنی اولین بازدید در همان بازه.','An anonymous user is one per device: cleared cookies or a new browser of someone not identified show as “new” and nudge Pulse up. “New” means first seen in the same interval.')+'</div>'+
    collNote(Lf.ev, rangeFirst(RB.rangeInfo()), 'دوره‌های اول این بازه پیش از شروع جمع‌آوری این ایونت است، پس کاربران قدیمی در آن دوره‌ها «جدید» شمرده می‌شوند.','The first intervals fall before this event began collecting, so long-standing users count as new in them.')+   /* PM 2026-10-25, AC-7 */
    '<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div><div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول چرخهٔ عمر','Lifecycle table')+'</span><span class="rbx-tipdot"'+tip(S8TIPS.pulse[0],S8TIPS.pulse[1])+'></span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="fix"></th>'+R.map(function(x){ return '<th class="num">'+esc(x.label)+(x.partial?' *':'')+'</th>'; }).join('')+'</tr></thead><tbody>'+
    cls.map(function(c){ return '<tr><td class="fix">'+T(c[1],c[2])+'</td>'+R.map(function(x){ return '<td class="num">'+num(x[c[0]])+'</td>'; }).join('')+'</tr>'; }).join('')+
    '<tr class="ov"><td class="fix"><b>'+T('نبض','Pulse')+'</b></td>'+R.map(function(x){ return '<td class="num strong">'+(x.pulse==null?'—':num(x.pulse,2))+'</td>'; }).join('')+'</tr></tbody></table></div></div>';
  s8Shell(panel, tool, body);
  var B=s8Base(), pal=palette(), cats=R.map(function(x){ return x.label; }), opt;
  if(Lf.view==='pulse') opt={ grid:{ left:56, right:56, top:16, bottom:28 }, tooltip:B.tip({ trigger:'axis' }), xAxis:{ type:'category', inverse:fa(), data:cats, axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11, hideOverlap:true } },
    yAxis:{ type:'value', min:0, position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return num(v,v%1?1:0); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
    series:[{ name:T('نبض','Pulse'), type:'line', symbolSize:6, itemStyle:{ color:pal[0] }, data:R.map(function(x){ return x.pulse==null?null:+x.pulse.toFixed(2); }), markLine:{ silent:true, symbol:'none', lineStyle:{ color:B.MU, type:'dashed' }, label:{ formatter:T('۱ = بدون رشد','1 = no growth'), color:B.MU, fontFamily:B.FONT }, data:[{ yAxis:1 }] } }] };
  else { var series=Lf.view==='growth'?[['nw',pal[0]],['cur',pal[1]],['res',pal[2]]].map(function(x,i){ return { name:T(cls[i][1],cls[i][2]), type:'bar', stack:'act', barMaxWidth:30, itemStyle:{ color:x[1] }, data:R.map(function(r0){ return r0[x[0]]; }) }; }).concat([{ name:T('غیرفعال‌شده','Dormant'), type:'bar', stack:'dorm', barMaxWidth:30, itemStyle:{ color:B.BAD }, data:R.map(function(r0){ return -r0.dorm; }) }])
      :[['dN','غیرفعال‌شدهٔ جدید','Dormant new'],['dC','غیرفعال‌شدهٔ فعلی','Dormant current'],['dR','غیرفعال‌شدهٔ بازگشته','Dormant resurrected']].map(function(x,i){ return { name:T(x[1],x[2]), type:'bar', stack:'d', barMaxWidth:30, itemStyle:{ color:alpha(B.BAD, 1-i*0.28) }, data:R.map(function(r0){ return r0[x[0]]; }) }; });
    opt={ grid:{ left:64, right:64, top:16, bottom:44 }, tooltip:B.tip({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ return esc(p.seriesName)+' <b>'+num(Math.abs(p.value))+'</b>'; }).join('<br>'); } }),
      legend:{ bottom:0, textStyle:{ color:B.TX, fontFamily:B.FONT } }, xAxis:{ type:'category', inverse:fa(), data:cats, axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11, hideOverlap:true } },
      yAxis:{ type:'value', position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return compact(Math.abs(v)); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } }, series:series }; }
  s8Chart(opt, function(c){ c.on('click', function(p){ if(p.componentType!=='series'||Lf.view==='pulse') return; setTimeout(function(){ s8Micro(p, [p.seriesName+' · '+p.name, p.seriesName+' · '+p.name], Math.abs(p.value||0), Lf.ev, true); }, 0); }); }); }
/* User Composition view */
function renderComp(){
  var C=A.s8.comp, r=lastS8=compCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), P=RB.PROPS[C.prop];
  var panel='<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('ترکیب بر اساس','Composition by')+'</span><span class="rbx-tipdot"'+tip(S8TIPS.comp[0],S8TIPS.comp[1])+'></span></div>'+
    '<div class="rbz-fieldrow"><button class="rbz-field" data-cmpprop="1" type="button">'+esc(T(P.fa,P.en))+(COMP_VISIT.indexOf(C.prop)>-1?' <small>'+T('(آخرین بازدید)','(last visit)')+'</small>':'')+' <span class="car">⌄</span></button></div>'+
    '<div class="rbz-sub2"><span class="lb">'+T('سنجش بر اساس','Measured as')+'</span></div>'+s8Seg2('data-cmpmode',[['recent','آخرین مقدار','Most recent value'],['all','همهٔ مقدارها','All values'],['cross','ترکیب مقدارها','Cross property values']],C.mode)+
    (r.fixed&&C.mode!=='recent'?'<p class="rbz-sethelp">'+T('این ویژگی برای هر دستگاه ثابت است و بیشتر کاربران یک دستگاه دارند، پس «همهٔ مقدارها» و «ترکیب مقدارها» تقریباً همان «آخرین مقدار» می‌شوند.','This property is fixed per device and most users have one device, so “All values” and “Cross property values” come close to “Most recent value”.')+'</p>':'')+'</div>';
  var tool=s8Seg2('data-cmpview',[['donut','دایره‌ای','Donut',r.overlap?T('مقدارها هم‌پوشانی دارند؛ سهم یک کل نیستند','Values overlap; they aren’t shares of one whole'):''],['bar','میله‌ای','Bar']],r.overlap&&C.view==='donut'?'bar':C.view);
  var view=r.overlap?'bar':C.view;
  var body=(r.overlap?'<div class="rbz-note">'+ic('info')+T('در «همهٔ مقدارها» کاربری که چند مقدار داشته در چند دسته است؛ جمع دسته‌ها از کاربران فعال بیشتر است و نمودار دایره‌ای ندارد.','In “All values” a user who had several values is in several buckets; the buckets add up to more than the active users, so there is no donut.')+'</div>':'')+
    (COMP_VISIT.indexOf(C.prop)>-1?'<div class="rbz-note">'+ic('info')+T('این ویژگی مال بازدید است نه کاربر؛ «آخرین مقدار» یعنی مقدار آخرین بازدید.','This property describes a visit, not a person; “Most recent value” means the last visit’s value.')+'</div>':'')+
    '<div class="rbz-compgrid">'+r.segs.map(function(s,si){ return '<div class="rbz-compcell"><div class="rbz-tablehead"><b>'+esc(s.name)+'</b><span class="rbz-tag">'+T('کاربران فعال: ','Active users: ')+num(s.active)+'</span></div><div class="rbz-chart rbz-compchart" id="rbzComp'+si+'"></div></div>'; }).join('')+'</div>'+
    '<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول ترکیب','Composition table')+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="fix">'+esc(T(P.fa,P.en))+'</th>'+r.segs.map(function(s){ return '<th class="num">'+esc(s.name)+'</th><th class="num">٪</th>'; }).join('')+'</tr></thead><tbody>'+
    r.segs[0].rows.map(function(row,i){ return '<tr><td class="fix"><bdi>'+esc(row.name)+'</bdi></td>'+r.segs.map(function(s){ var x=s.rows.filter(function(y){ return y.name===row.name; })[0]; return '<td class="num">'+(x?num(x.n):'—')+'</td><td class="num">'+(x&&s.active?pctTxt(x.n/s.active*100):'—')+'</td>'; }).join('')+'</tr>'; }).join('')+
    '</tbody></table></div></div>';
  s8Shell(panel, tool, body);
  var B=s8Base(), pal=palette();
  r.segs.forEach(function(s,si){ var el=$('rbzComp'+si); if(!el||!window.echarts) return; var c=echarts.init(el), data=s.rows.map(function(x,i){ return { name:x.name, value:x.n, itemStyle:{ color:x.other?B.MU:pal[i%pal.length] } }; });
    var sum=s.rows.reduce(function(a,x){ return a+x.n; },0);
    c.setOption(view==='donut'?{ tooltip:B.tip({ trigger:'item', formatter:function(p){ return esc(p.name)+'<br><b>'+num(p.value)+'</b> · '+num(p.percent,1)+T('٪','%'); } }),
      title:{ text:num(sum), subtext:T('کاربر','users'), left:'center', top:'center', textStyle:{ color:B.TX, fontFamily:B.FONT, fontSize:20 }, subtextStyle:{ color:B.MU, fontFamily:B.FONT } },
      series:[{ type:'pie', radius:['48%','72%'], label:{ color:B.TX, fontFamily:B.FONT, formatter:function(p){ return p.name+' '+num(p.percent,0)+T('٪','%'); } }, data:data }] }
      :{ grid:{ left:fa()?16:8, right:fa()?8:16, top:8, bottom:8, containLabel:true }, tooltip:B.tip({ trigger:'axis', axisPointer:{ type:'shadow' } }),
        yAxis:{ type:'category', inverse:true, data:data.map(function(d){ return d.name; }), position:fa()?'right':'left', axisLabel:{ color:B.TX, fontFamily:B.FONT, fontSize:11, width:160, overflow:'truncate' }, axisTick:{ show:false } },
        xAxis:{ type:'value', min:0, inverse:fa(), axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return compact(v); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
        series:[{ type:'bar', barMaxWidth:18, data:data, label:{ show:true, position:fa()?'left':'right', color:B.TX, fontFamily:B.FONT, fontSize:11, formatter:function(p){ return num(p.value); } } }] });
    el.style.filter='saturate(.72)';
    c.on('click', function(p){ if(p.componentType!=='series') return; chart=c; setTimeout(function(){ var box=el.parentNode, a=document.createElement('span'); a.className='rbz-anchor'; a.style.cssText='position:absolute;width:1px;height:1px;left:'+(p.event&&p.event.offsetX||0)+'px;top:'+(p.event&&p.event.offsetY||0)+'px'; box.style.position='relative'; box.appendChild(a);
      s8MenuAt(a, [T(P.fa,P.en)+': '+p.name, T(P.fa,P.en)+': '+p.name], p.value, '_any_active', C.mode==='cross'); }, 0); }); }); }   /* PM 2026-10-25, AC-17: the full people menu */
/* Engagement Matrix view */
function renderEmx(){
  var E=A.s8.emx, r=lastS8=emxCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), ok=RB.granAllowed(RB.rangeInfo().mode), br=r.unit==='day'?'DAU':r.unit==='week'?'WAU':'MAU';
  var panel='<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('ایونت‌ها','Events')+'</span><span class="rbx-tipdot"'+tip(S8TIPS.emx[0],S8TIPS.emx[1])+'></span></div>'+
    s8Seg2('data-emxset',[['both','پرکاربردترین و کم‌کاربردترین','Top and bottom'],['top','۵۰ پرکاربرد','Top 50'],['bottom','۵۰ کم‌کاربرد','Bottom 50'],['custom','انتخاب دستی','Custom']],E.set)+
    (E.set==='custom'?(E.list||[]).map(function(id,i){ return '<div class="rbz-chip">'+evIcon(id)+'<span>'+esc(evName(id))+'</span><button data-emxdel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; }).join('')+'<button class="rbz-add" data-emxadd="1" type="button"'+((E.list||[]).length>=20?' disabled title="'+T('حداکثر ۲۰ ایونت','Up to 20 events')+'"':'')+'>'+ic('plus')+T('افزودن ایونت','Add event')+'</button>':
      '<p class="rbz-sethelp">'+T('بر اساس تعداد دفعات، بدون پینگ‌های پخش؛ هر ایونت یک بار.','Ranked by event totals, without playback pings; each event once.')+'</p>')+'</div>'+
    '<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('سنجش','Measured as')+'</span></div>'+
    '<div class="rbz-sub2"><span class="lb">'+T('گستردگی: درصد ','Breadth: % ')+br+'</span></div>'+
    s8Seg2('data-emxfreq',[['days','میانگین روزهای انجام','Average days performed'],['times','میانگین دفعات انجام','Average times performed']],E.freq)+
    '<div class="rbz-sub2"><span class="lb">'+T('خط‌های تقسیم','Sectioned by')+'</span></div>'+s8Seg2('data-emxsec',[['median','میانه','Median'],['avg','میانگین','Average']],E.sec)+'</div>';
  var tool=s8Seg2('data-emxiv',[['day','روزانه','Daily',ok.indexOf('day')<0?T('این بازه روزانه ندارد','No daily for this range'):''],['week','هفتگی','Weekly'],['month','ماهانه','Monthly',RB.rangeInfo().days<28?T('برای ماهانه بازهٔ بلندتری انتخاب کنید','Pick a longer range for monthly'):'']],r.unit)+s8Seg2('data-emxscale',[['linear','خطی','Linear'],['log','لگاریتمی','Log']],E.scale);
  var body=(r.unit==='day'&&E.freq==='days'?'<div class="rbz-note">'+ic('info')+T('در بازهٔ روزانه هر کاربر حداکثر یک روز دارد، پس همهٔ نقطه‌ها بالای نمودار جمع می‌شوند؛ برای دیدن تکرار، هفتگی یا «میانگین دفعات» را انتخاب کنید.','On a daily interval each user has at most one day, so all points sit at the top; choose weekly or “average times” to see frequency.')+'</div>':'')+'<div class="rbz-chartbox"><div class="rbz-chart rbz-emxchart" id="rbzChart"></div></div><div class="rbz-emxq">'+Object.keys(EMX_Q).map(function(q){ return '<span class="rbz-tag">'+T(EMX_Q[q][0],EMX_Q[q][1])+': '+num(r.pts.filter(function(p){ return p.q===q&&!E.hidden[p.id]; }).length)+'</span>'; }).join('')+'</div>'+
    '<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول ماتریس','Matrix table')+'</span><span class="rbz-tag">'+(E.sec==='avg'?T('میانگین','Average'):T('میانه','Median'))+': '+num(r.lineX,1)+'٪ · '+num(r.lineY,2)+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="ck"></th><th class="fix">'+T('ایونت','Event')+'</th><th class="num">'+T('گستردگی (٪','Breadth (% ')+br+')</th><th class="num">'+(E.freq==='days'?T('میانگین روزها','Avg days'):T('میانگین دفعات','Avg times'))+'</th><th>'+T('بخش','Quadrant')+'</th></tr></thead><tbody>'+
    r.pts.slice().sort(function(a,b){ return b.breadth-a.breadth; }).map(function(p){ return '<tr><td class="ck"><input type="checkbox" data-emxhide="'+esc(p.id)+'"'+(E.hidden[p.id]?'':' checked')+' aria-label="'+T('نمایش در ماتریس','Show in matrix')+'"/></td><td class="fix">'+esc(p.name)+'</td><td class="num">'+num(p.breadth,1)+'</td><td class="num">'+num(p.freq,2)+'</td><td>'+T(EMX_Q[p.q][0],EMX_Q[p.q][1])+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  s8Shell(panel, tool, body);
  var B=s8Base(), pal=palette(), vis=r.pts.filter(function(p){ return !E.hidden[p.id]; }), qc={ core:pal[0], power:pal[1], once:pal[2], weak:B.MU };
  var opt={ grid:{ left:64, right:64, top:24, bottom:44 }, tooltip:B.tip({ trigger:'item', formatter:function(p){ var d=p.data.p; return '<b>'+esc(d.name)+'</b><br>'+T('گستردگی','Breadth')+' '+num(d.breadth,1)+'٪<br>'+(E.freq==='days'?T('میانگین روزها','Avg days'):T('میانگین دفعات','Avg times'))+' '+num(d.freq,2)+'<br>'+T(EMX_Q[d.q][0],EMX_Q[d.q][1]); } }),
    toolbox:{ right:fa()?'auto':8, left:fa()?8:'auto', feature:{ dataZoom:{ title:{ zoom:T('بزرگ‌نمایی با کشیدن','Drag to zoom'), back:T('بازنشانی','Reset') } } } },
    xAxis:{ type:E.scale==='log'?'log':'value', inverse:fa(), name:T('گستردگی (٪ ','Breadth (% ')+br+')', nameLocation:'middle', nameGap:28, nameTextStyle:{ color:B.MU, fontFamily:B.FONT }, axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return num(v); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.4 } }, min:E.scale==='log'?0.01:0 },
    yAxis:{ type:E.scale==='log'?'log':'value', position:fa()?'right':'left', name:E.freq==='days'?T('میانگین روزهای انجام','Avg days performed'):T('میانگین دفعات انجام','Avg times performed'), nameLocation:'middle', nameGap:44, nameRotate:fa()?-90:90, nameTextStyle:{ color:B.MU, fontFamily:B.FONT }, axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return num(v,v%1?1:0); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.4 } }, min:E.scale==='log'?0.5:0 },
    series:[{ type:'scatter', symbolSize:11, data:vis.map(function(p){ return { value:[Math.max(E.scale==='log'?0.01:0,p.breadth), p.freq], p:p, itemStyle:{ color:qc[p.q] }, label:{ show:vis.length<=30, formatter:p.name, position:'top', color:B.TX, fontFamily:B.FONT, fontSize:10 } }; }),
      markLine:{ silent:true, symbol:'none', lineStyle:{ color:B.MU, type:'dashed' }, label:{ show:false }, data:[{ xAxis:Math.max(E.scale==='log'?0.01:0,r.lineX) },{ yAxis:r.lineY }] } }] };
  s8Chart(opt, function(c){ c.on('click', function(p){ if(p.componentType!=='series'||!p.data||!p.data.p) return; var d=p.data.p; setTimeout(function(){ s8Micro(p, [d.name, d.name], d.users, d.id, false); }, 0); }); }); }
function renderS8(){ var t=RB.Q.type; if(t==='stick') renderStick(); else if(t==='life') renderLife(); else if(t==='comp') renderComp(); else renderEmx(); }
function s8Tile(q, ovr, type){ var st=norm(clone(q.amp||{})), ctx={ range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) }, R=within(ctx,function(){ return RB.rangeInfo(); });
  if(type==='stick'){ var r=stickCompute(st, ctx), k2=+stickPct(r.pooled.n, r.pooled.users, 2, true).toFixed(1); return { val:pctTxt(k2), num:k2, sub:T('دست‌کم ۲ روز در ','At least 2 days a ')+(st.s8.stick.per==='month'?T('ماه','month'):T('هفته','week'))+' · '+T(R.fa,R.en), viz:'', rows:r.periods.slice(-5).map(function(p){ return [p.label, pctTxt(stickPct(p.n,p.users,2,true))]; }), range:R }; }
  if(type==='life'){ var l=lifeCompute(st, ctx), last=l.rows.filter(function(x){ return !x.partial; }).slice(-1)[0]||l.rows.slice(-1)[0]; return { val:last.pulse==null?'—':num(last.pulse,2), num:last.pulse, sub:T('نبض · ','Pulse · ')+T(R.fa,R.en), viz:spark(l.rows.map(function(x){ return x.pulse||0; })), rows:[[T('جدید','New'),num(last.nw)],[T('فعلی','Current'),num(last.cur)],[T('بازگشته','Resurrected'),num(last.res)],[T('غیرفعال‌شده','Dormant'),num(last.dorm)]], range:R }; }
  if(type==='comp'){ var c=compCompute(st, ctx), s=c.segs[0], P=RB.PROPS[st.s8.comp.prop]; return { val:num(s.active), num:s.active, sub:T('کاربران فعال به تفکیک ','Active users by ')+T(P.fa,P.en), viz:'', rows:s.rows.slice(0,5).map(function(x){ return [x.name, pctTxt(s.active?x.n/s.active*100:0)]; }), range:R }; }
  var m=emxCompute(st, ctx); return { val:num(m.pts.filter(function(p){ return p.q==='core'; }).length), num:m.pts.length, sub:T('ویژگی‌های اصلی از ','Core features of ')+num(m.pts.length)+T(' ایونت',' events'), viz:'', rows:m.pts.filter(function(p){ return p.q==='core'; }).slice(0,5).map(function(p){ return [p.name, num(p.breadth,1)+'٪']; }), range:R }; }
function wireS8(){
  if(!isS8()) return;
  var t=RB.Q.type, S=A.s8;
  root.querySelectorAll('[data-s8ev]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-s8ev'); eventPicker(function(id){ S[k].ev=id; S[k].filters=[]; changed(); }); }); });
  root.querySelectorAll('[data-s8fadd]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-s8fadd'); propFilterModal({ fa:'فیلتر ایونت', en:'Event filter', subFa:'فقط ایونت‌هایی که این شرط را دارند.', subEn:'Only events that match.' }, propsOf(S[k].ev==='_any_active'?'page_view':S[k].ev), function(f){ (S[k].filters=S[k].filters||[]).push(f); changed(); }); }); });
  root.querySelectorAll('[data-s8fdel]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-s8fdel').split(':'); S[p[0]].filters.splice(+p[1],1); changed(); }); });
  var on=function(attr, fn){ root.querySelectorAll('['+attr+']').forEach(function(b){ b.addEventListener('click', function(){ if(b.disabled) return; fn(b.getAttribute(attr)); changed(); }); }); };
  on('data-stcum', function(v){ S.stick.cum=v==='true'; }); on('data-stper', function(v){ S.stick.per=v; }); on('data-stview', function(v){ S.stick.view=v; });
  var gb=root.querySelector('[data-stgb]'); if(gb) gb.addEventListener('click', function(e){ e.stopPropagation(); U.menu(gb, ['device_type','os','browser','city','isp_name','is_new_user','referrer_type','utm_source'].map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ S.stick.gb=p; changed(); } }; }), 'start'); });
  on('data-stgbdel', function(){ S.stick.gb=''; });
  on('data-lfiv', function(v){ S.life.iv=v; }); on('data-lfview', function(v){ S.life.view=v; });
  var cp=root.querySelector('[data-cmpprop]'); if(cp) cp.addEventListener('click', function(e){ e.stopPropagation(); U.menu(cp, COMP_PROPS.map(function(p){ return { fa:RB.PROPS[p].fa+(COMP_VISIT.indexOf(p)>-1?' (آخرین بازدید)':''), en:RB.PROPS[p].en+(COMP_VISIT.indexOf(p)>-1?' (last visit)':''), fn:function(){ S.comp.prop=p; changed(); } }; }), 'start'); });
  on('data-cmpmode', function(v){ S.comp.mode=v; }); on('data-cmpview', function(v){ S.comp.view=v; });
  on('data-emxset', function(v){ S.emx.set=v; if(v==='custom'&&!(S.emx.list||[]).length) S.emx.list=['page_view','search_submitted','video_started','share']; }); on('data-emxfreq', function(v){ S.emx.freq=v; }); on('data-emxsec', function(v){ S.emx.sec=v; }); on('data-emxiv', function(v){ S.emx.iv=v; }); on('data-emxscale', function(v){ S.emx.scale=v; });
  var ea=root.querySelector('[data-emxadd]'); if(ea) ea.addEventListener('click', function(){ eventPicker(function(id){ if((S.emx.list||[]).indexOf(id)<0) S.emx.list.push(id); changed(); }); });
  root.querySelectorAll('[data-emxdel]').forEach(function(b){ b.addEventListener('click', function(){ S.emx.list.splice(+b.getAttribute('data-emxdel'),1); changed(); }); });
  root.querySelectorAll('[data-emxhide]').forEach(function(x){ x.addEventListener('change', function(){ var id=x.getAttribute('data-emxhide'); if(x.checked) delete S.emx.hidden[id]; else S.emx.hidden[id]=true; changed(); }); });
}
/* ═════════ Step 8b: Impact Analysis, Compass (legacy), Personas (legacy) ═════════
   Spec: research-notes/…/26a §3 (Compass), 26b §1 (Personas) and §2 (Impact Analysis). None of these claims cause and effect;
   every count is per device. Compass and Personas carry «قدیمی»: Amplitude itself calls them legacy chart types. */
S8_TYPES.impact=['تحلیل اثر','Impact analysis','arrows-left-right'];
/* PM 2026-10-28, AC-11: Compass and Personas are no longer chart types (not in S8_TYPES, so no tab, no «نوع دیگر» entry and no tile); an old
   ?type=compass / personas opens Trend (see sync()). Their compute and render code below stays unreachable, kept for the backlog item. */
var S8_LEGACY={ compass:1, personas:1 };
function blankS8b(){ return { impact:{ treat:[{ id:'search_submitted', filters:[] }], out:[{ id:'page_view', filters:[] }], metric:'avg', pagg:'avg', iv:'day', win:7 },
  compass:{ base:'new', ev:'_any', filters:[], days:7, target:'w2', gb:'', metric:'corr', sort:1, sortDir:'desc', bucket:null, ci:true, table:false, stats:false },
  personas:{ pop:'active', k:4, target:'w2', sel:0, desc:{} } }; }
var S8BTIPS={
  impact:["<span class='tip-title'>تحلیل اثر</span>هر کاربر از روزی که اولین بار ایونت «اقدام» را انجام داده هم‌تراز می‌شود و ایونت «نتیجه» روزهای پیش و پس از آن مقایسه می‌شود. «اولین بار» یعنی در ۹۰ روز (روزانه) یا ۹۱ روز (هفتگی) پیش از بازه انجامش نداده. این تحلیل همبستگی است، نه علت؛ جای آزمایش تصادفی را نمی‌گیرد.","<span class='tip-title'>Impact analysis</span>Each user is aligned on the day they first did the treatment event, and the outcome event is compared before and after it. “First” means not done in the 90 days (daily) or 91 days (weekly) before the range. This is correlation, not causation; it doesn’t replace a randomised experiment."],
  avg:["<span class='tip-title'>میانگین</span>میانگین دفعات نتیجه در هر روز نسبی، فقط میان کسانی که دست‌کم یک بار انجامش داده‌اند؛ تعداد همین افراد کنار هر نقطه است، چون کم شدنشان میانگین را بالا می‌برد.","<span class='tip-title'>Average</span>The mean number of outcome events per relative day, among people who did it at least once; their count sits beside each point, because a shrinking group can lift the average."],
  active:["<span class='tip-title'>درصد فعال</span>از کسانی که در آن روز نسبی فعال بوده‌اند، چند درصد ایونت نتیجه را دست‌کم یک بار انجام داده‌اند.","<span class='tip-title'>Active %</span>Of people active on that relative day, the share who did the outcome event at least once."],
  compass:["<span class='tip-title'>قطب‌نما</span>برای کاربران جدید، همبستگی میان «انجام ایونت دست‌کم n بار در N روز اول» و «ماندن در کوهورت هدف» (فی). ۰٫۴ و بیشتر «بسیار پیش‌بین»، ۰٫۳ تا ۰٫۴ «تا حدی»، ۰٫۲ تا ۰٫۳ «کمی» و زیر ۰٫۲ «پیش‌بین نیست». همبستگی علت نیست؛ تنها راه اثبات، آزمایش است. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، پس برگشتن با دستگاه دیگر «نماند» حساب می‌شود.","<span class='tip-title'>Compass</span>For new users, the correlation between “did the event at least n times in the first N days” and “landed in the target cohort” (phi). 0.4 and above is highly predictive, 0.3–0.4 moderately, 0.2–0.3 slightly, under 0.2 not predictive. Correlation isn’t causation; only an experiment proves it. An anonymous user counts once per device, so coming back on another device counts as not retained."],
  personas:["<span class='tip-title'>پرسوناها</span>کاربران بر اساس شباهت رفتارشان (تعداد هر ایونت) در خوشه‌هایی دسته‌بندی می‌شوند، بدون قاعدهٔ از پیش تعیین‌شده؛ روش خوشه‌بندی NMF است و با بیشتر کردن تعداد خوشه‌ها معمولاً یک خوشه دو تا می‌شود. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود.","<span class='tip-title'>Personas</span>Users are grouped into clusters by how alike their behaviour is (counts of each event), with no pre-set rule; the clustering method is NMF, and raising the cluster count usually splits one cluster in two. An anonymous user counts once per device."]
};
var TARGETS={ w2:['ماندن در هفتهٔ دوم','2nd week retention',0.22], w3:['ماندن در هفتهٔ سوم','3rd week retention',0.17], w4:['ماندن در هفتهٔ چهارم','4th week retention',0.14], m2:['ماندن در ماه دوم','2nd month retention',0.11] };
var TGT_DAYS={ w2:14, w3:21, w4:28, m2:60 };
function tgtName(t){ if(TARGETS[t]) return T(TARGETS[t][0],TARGETS[t][1]); var c=cohortById(t); return c?T(c.fa,c.en):t; }
function tgtRate(t){ if(TARGETS[t]) return TARGETS[t][2]; return 0.08+0.18*jitter('tg'+t,0); }
var NEWS_NOISE=['video_heartbeat','video_progress','experiment_viewed'];
function newsEvents(){ return RB.EVENTS.filter(function(e){ return NEWS_NOISE.indexOf(e.id)<0&&e.grp!=='ecom'; }); }
/* ── Impact Analysis ── */
function impactCompute(st, ctx){
  return within(ctx, function(){
    var I=st.s8.impact, sg=norm(st).segments[0], R=RB.rangeInfo(), W=I.win, unit=I.iv==='week'?7:1, out={ series:[], rel:[], lookback:I.iv==='week'?91:90 };
    for(var d=-W; d<=W; d++) out.rel.push(d);
    I.treat.forEach(function(tr){ I.out.forEach(function(oc){
      var te={ id:tr.id, filters:tr.filters||[] }, tu=baseSeries(te,true), sf=segFactor(sg, te, RB.periodUniques(tu)), seed='im'+tr.id+oc.id+JSON.stringify(tr.filters)+JSON.stringify(oc.filters);
      /* first-time users of the treatment inside the range (no treatment in the look-back before it) */
      var N=Math.round(RB.periodUniques(tu)*(sf?sf.share:1)*(0.35+0.2*jitter(seed+'first',0)));
      var oe={ id:oc.id, filters:oc.filters||[] }, ou=RB.periodUniques(baseSeries(oe,true)), ot=RB.sum(baseSeries(oe,false)), act=Math.max(ou,RB.periodUniques(baseSeries({ id:'_any_active', filters:[] },true)));
      var p0=Math.min(0.92,ou/act*(0.75+0.2*jitter(seed+'p',0))), lift=0.08+0.32*jitter(seed+'l',0), m0=Math.max(1.05,ot/Math.max(1,ou)/Math.max(1,R.days/(7*unit))*(unit===7?3:1)), mlift=0.05+0.25*jitter(seed+'ml',0);
      var pts=out.rel.map(function(d){
        /* users present on relative day d: everyone before day 0 (the look-back is in the data), fewer after because late entrants run out of range */
        var present=d<=0?N:Math.round(N*Math.max(0.05,1-d*unit/(R.days+1)*0.9)), activeU=Math.round(present*(d===0?1:0.52+0.08*jitter(seed+'a',d)));
        var after=d>0, p=Math.min(0.97,(after?p0*(1+lift):p0)*(d===0?0.82:1)*(0.95+0.1*jitter(seed+'pd',d))), doers=Math.round(activeU*p);
        var mean=+((after?m0*(1+mlift):m0)*(0.94+0.12*jitter(seed+'md',d))).toFixed(2), q=1/Math.max(1.0001,mean);
        var bands=[1,2,3,4,5].map(function(k){ return q*Math.pow(1-q,k-1); }); bands.push(1-bands.reduce(function(a,b){ return a+b; },0));
        var fq=jAlloc(doers, bands.map(function(x){ return Math.max(0,x); }));
        var np=((RB.evById(oc.id)||{ props:[] }).props||[]).filter(function(x){ return NUMP[x]; })[0], pavg=np?NUMP[np].mean*((after?1+0.4*lift:1))*(0.93+0.14*jitter(seed+'pv',d)):null;
        return { d:d, present:present, active:activeU, doers:doers, avg:mean, pct:activeU?+(doers/activeU*100).toFixed(1):0, freq:fq, small:doers<30, prop:pavg==null?null:Math.round(I.pagg==='sum'?pavg*doers*mean:pavg) }; });
      out.series.push({ key:tr.id+'>'+oc.id, name:evName(tr.id)+' → '+evName(oc.id), N:N, pts:pts });
    }); });
    return out; }); }
/* ── Compass ── */
function cmpTable(N, a, r, kE, f){ var above=Math.round(N*a), p1=Math.min(0.97, r*(1+kE*f)), TP=Math.min(above, Math.round(above*p1)), Rn=Math.round(N*r);
  if(TP>Rn) TP=Rn; var FP=above-TP, FN=Rn-TP, TN=N-TP-FP-FN; if(TN<0){ FN+=TN; TN=0; }
  var den=Math.sqrt((TP+FP)*(FN+TN)*(TP+FN)*(FP+TN))||1, phi=(TP*TN-FP*FN)/den, se=1/Math.sqrt(Math.max(4,N-3)), z=0.5*Math.log((1+Math.max(-0.999,Math.min(0.999,phi)))/(1-Math.max(-0.999,Math.min(0.999,phi))));
  return { TP:TP, FP:FP, FN:FN, TN:TN, N:N, phi:+phi.toFixed(3), ci:[+Math.tanh(z-1.96*se).toFixed(3), +Math.tanh(z+1.96*se).toFixed(3)],
    ppv:TP+FP?TP/(TP+FP):0, sens:TP+FN?TP/(TP+FN):0, npv:TN+FN?TN/(TN+FN):0, spec:TN+FP?TN/(TN+FP):0, prop:N?(TP+FP)/N:0 }; }
function cmpLabel(phi){ var a=Math.abs(phi); return a>=0.4?['بسیار پیش‌بین','Highly predictive','hi']:a>=0.3?['تا حدی پیش‌بین','Moderately predictive','mid']:a>=0.2?['کمی پیش‌بین','Slightly predictive','lo']:['پیش‌بین نیست','Not predictive','no']; }
function compassCompute(st, ctx){
  return within(ctx, function(){
    var C=st.s8.compass, R=RB.rangeInfo(), days90=Math.min(90,R.days), mature=Math.max(0, days90-(TGT_DAYS[C.target]||14)), sg=norm(st).segments[0];
    /* base cohort: new users whose target window has fully passed (maturity), within at most 90 days */
    var nu=RB.periodUniques(baseSeries({ id:'_new_user', filters:[] },true)), base=C.base==='new'?nu:Math.round((cohortById(C.base)||{ n:nu*0.3 }).n||nu*0.3);
    var N=Math.max(50, Math.round(base*(days90/Math.max(1,R.days))*(R.days?mature/Math.max(1,days90):1))), r=tgtRate(C.target);
    var evs=newsEvents().filter(function(e){ return ['page_view','session_start'].indexOf(e.id)<0; });
    function strength(id){ var w=getEv(id)?getEv(id).w:1000; return Math.max(0.05, 0.25+1.1*jitter('k'+id+C.target,0)-Math.min(0.3,Math.log10(1+w)/20)); }
    function rate(id){ var ev=getEv(id), w=ev?ev.w:500, tot=RB.EVENTS.reduce(function(a,x){ return a+(x.id==='experiment_viewed'||x.late?0:x.w); },0); return Math.max(0.02, 6*w/tot*(0.6+0.8*jitter('rt'+id,0))); }   /* events per new user per day */
    function above(id, n, D){ var lam=rate(id)*D, p=Math.exp(-lam), cdf=0, term=p; for(var k=0;k<n;k++){ cdf+=term; term=term*lam/(k+1); } return Math.max(0.002, Math.min(0.995, 1-cdf)); }
    function cell(id, n, D){ return cmpTable(N, above(id,n,D), r, strength(id), Math.min(2.2, 0.55+0.35*n)*(0.6+0.08*D)); }
    var heat=evs.map(function(e){ var row=[]; for(var D=1; D<=C.days; D++) row.push(cell(e.id,1,D).phi); return { id:e.id, name:evName(e.id), row:row }; });
    var dsel=Math.min(C.sort, C.days)-1; heat.sort(function(a,b){ return C.sortDir==='asc'?a.row[dsel]-b.row[dsel]:b.row[dsel]-a.row[dsel]; });
    var out={ N:N, base:base, rate:r, mature:mature, days90:days90, capped:R.days>90, heat:heat };
    if(C.ev!=='_any'&&getEv(C.ev)){ var fl=(C.filters||[]).reduce(function(a,f){ return a*RB.oneFilterFactor(f); },1);
      out.buckets=[]; for(var n=1;n<=10;n++){ var t=cell(C.ev, n, C.days); if(fl<1){ t=cmpTable(N, above(C.ev,n,C.days)*fl, r, strength(C.ev)*(0.9+0.2*fl), Math.min(2.2,0.55+0.35*n)*(0.6+0.08*C.days)); } t.n=n; out.buckets.push(t); }
      var best=out.buckets.slice().sort(function(a,b){ return b.phi-a.phi; })[0]; out.best=best.n; out.sel=C.bucket||best.n;
      if(C.gb&&RB.PROPS[C.gb]) out.gb=RB.PROPS[C.gb].vals.slice(0,6).map(function(v,i){ var Nv=Math.max(20,Math.round(N*v[2])), t=cmpTable(Nv, above(C.ev,out.sel,C.days)*(0.85+0.3*jitter(C.gb+v[1],i)), r*(0.85+0.3*jitter(C.gb+v[1]+'r',i)), strength(C.ev)*(0.8+0.4*jitter(C.gb+v[1]+'k',i)), Math.min(2.2,0.55+0.35*out.sel)); t.name=T(v[0],v[1]); return t; }); }
    return out; }); }
/* ── Personas ── */
/* nested clusters (Amplitude's NMF tends to split one cluster when k grows): one split per step, sizes always add up */
var PERSONA_TREE=[
  { id:'light', fa:'خوانندهٔ گذری', en:'Casual reader', share:0.58, tgt:0.55, p:{ page_view:1.0, scroll_depth_reached:0.6, video_started:0.3, search_submitted:0.4, share:0.3, subscription_started:0.2 }, split:3,
    kids:[{ id:'skim', fa:'سرسری‌خوان', en:'Skimmer', share:0.62, tgt:0.4, p:{ page_view:0.7, scroll_depth_reached:0.3, video_started:0.25, search_submitted:0.3, share:0.2, subscription_started:0.1 } },
          { id:'deep', fa:'خوانندهٔ عمیق', en:'Deep reader', share:0.38, tgt:0.85, p:{ page_view:1.6, scroll_depth_reached:1.6, video_started:0.4, search_submitted:0.6, share:0.5, subscription_started:0.4 } }] },
  { id:'eng', fa:'مخاطب درگیر', en:'Engaged audience', share:0.42, tgt:1.6, p:{ page_view:1.4, scroll_depth_reached:1.4, video_started:2.2, video_completed:2.2, search_submitted:1.8, share:2.0, podcast_played:1.8, subscription_started:2.2 }, split:2,
    kids:[{ id:'video', fa:'تماشاگر ویدیو', en:'Video watcher', share:0.57, tgt:1.4, p:{ page_view:1.1, video_started:3.4, video_completed:3.3, captions_toggled:2.6, video_fullscreen_toggled:3.0, recommendation_clicked:2.8, share:1.2, subscription_started:1.6 }, split:4,
            kids:[{ id:'vcomp', fa:'تماشاگر کامل', en:'Full watcher', share:0.45, tgt:1.9, p:{ video_started:3.4, video_completed:4.6, captions_toggled:3.0, recommendation_clicked:3.4, subscription_started:2.2 } },
                  { id:'vsamp', fa:'ویدیوگرد', en:'Video sampler', share:0.55, tgt:1.0, p:{ video_started:3.4, video_completed:1.4, video_fullscreen_toggled:2.4, recommendation_clicked:2.2 } }] },
          { id:'srch', fa:'جستجوگر و اشتراک‌گذار', en:'Searcher and sharer', share:0.43, tgt:1.9, p:{ page_view:1.9, search_submitted:3.6, share:3.2, podcast_played:2.4, form_submitted:2.4, subscription_started:3.0 }, split:5,
            kids:[{ id:'search', fa:'جستجوگر', en:'Searcher', share:0.6, tgt:1.6, p:{ page_view:2.1, search_submitted:4.6, search_no_results:3.4, share:1.6 } },
                  { id:'share', fa:'اشتراک‌گذار و مشترک', en:'Sharer and subscriber', share:0.4, tgt:2.4, p:{ share:5.0, podcast_played:3.2, form_submitted:3.6, subscription_started:4.4 } }] }] }];
function personaLeaves(k){
  /* expand the tree in split order until there are k clusters: 2 → readers | engaged; 3 splits engaged; 4 splits readers; 5 splits video; 6 splits searchers */
  var list=PERSONA_TREE.map(function(n){ return { node:n, share:n.share, parent:null }; });
  for(var s=2; list.length<k; s++){ var i=-1; list.forEach(function(x,j){ if(x.node.split===s&&x.node.kids) i=j; }); if(i<0) break;
    var par=list[i], kids=par.node.kids.map(function(kd){ return { node:kd, share:par.share*kd.share, parent:par }; }); list.splice.apply(list, [i,1].concat(kids)); }
  return list; }
function personasCompute(st, ctx){
  return within(ctx, function(){
    var P=st.s8.personas, R=RB.rangeInfo(), d30=Math.min(30,R.days), sg=norm(st).segments[0];
    var popN=P.pop==='new'?RB.periodUniques(baseSeries({ id:'_new_user', filters:[] },true)):P.pop==='active'?RB.periodUniques(baseSeries({ id:'_any_active', filters:[] },true)):Math.round((cohortById(P.pop)||{ n:1000 }).n||1000);
    var sf=segFactor(sg, { id:'_any_active', filters:[] }, popN); popN=Math.round(popN*(d30/Math.max(1,R.days))*(R.days>30?1.6:1)*(sf?sf.share:1));
    var leaves=personaLeaves(Math.max(2,Math.min(6,P.k))), sizes=jAlloc(popN, leaves.map(function(l){ return l.share; })), r=tgtRate(P.target);
    /* within-cluster target rates, rescaled so their size-weighted mean equals the overall base rate */
    var raw=leaves.map(function(l,i){ var t=l.node.tgt; for(var p=l.parent; p; p=p.parent) t*=1; return t; }), wm=raw.reduce(function(a,x,i){ return a+x*sizes[i]; },0)/Math.max(1,popN);
    var evs=newsEvents().filter(function(e){ return !(e.hideIn&&e.hideIn.indexOf('personas')>-1); }), mean={}; evs.forEach(function(e){   /* Block C: hidden in Personas */ mean[e.id]=Math.max(0.05,(e.w/Math.max(1,RB.EVENTS.filter(function(x){ return x.id==='page_view'; })[0].w))*6*(P.pop==='new'?0.4:1)); });
    var prof=leaves.map(function(l){ var m={}; evs.forEach(function(e){ var v=l.node.p[e.id]; if(v==null){ for(var p=l.parent; p&&v==null; p=p.parent) v=p.node.p[e.id]; } m[e.id]=v==null?1:v; }); return m; });
    /* multipliers rescaled per event so the population mean is unchanged (clusters split the population, they don't create events) */
    evs.forEach(function(e){ var s=prof.reduce(function(a,m,i){ return a+m[e.id]*sizes[i]; },0)/Math.max(1,popN); prof.forEach(function(m){ m[e.id]=m[e.id]/(s||1); }); });
    var order=sizes.map(function(s,i){ return i; }).sort(function(a,b){ return sizes[a]-sizes[b]; });
    var clusters=leaves.map(function(l,i){ var avg={}, sig=[]; evs.forEach(function(e){ var a=mean[e.id]*prof[i][e.id], sd=mean[e.id]*1.15; avg[e.id]=a; sig.push({ id:e.id, name:evName(e.id), avg:+a.toFixed(2), sigma:+((a-mean[e.id])/sd).toFixed(2) }); });
      sig.sort(function(a,b){ return b.sigma-a.sigma; });
      return { id:l.node.id, name:T(l.node.fa,l.node.en), users:sizes[i], share:popN?sizes[i]/popN:0, pctl:Math.round(order.indexOf(i)/Math.max(1,leaves.length-1)*100), target:+Math.min(95, r*raw[i]/(wm||1)*100).toFixed(1), events:sig }; });
    return { N:popN, rate:+(r*100).toFixed(1), clusters:clusters, capped:R.days>30, d30:d30 }; }); }
/* ── views ── */
function relLabel(d, iv){ var u=iv==='week'?T('هفتهٔ ','Week '):T('روز ','Day '); return u+(d>0?'+':d<0?'−':'')+num(Math.abs(d)); }
function renderImpact(){
  var I=A.s8.impact, r=lastS8=impactCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), ml={ avg:['میانگین','Average'], active:['درصد فعال','Active %'], freq:['تکرار','Frequency'], prop:['ویژگی','Properties'] };
  function evList(key, title, tipFa, tipEn){ var h='<div class="rbz-sub2"><span class="lb">'+T(title[0],title[1])+'</span><span class="rbx-tipdot"'+tip(tipFa,tipEn)+'></span></div>';
    I[key].forEach(function(e,i){ h+='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let">'+(key==='treat'?'T':'O')+num(i+1)+'</span><button class="rbz-evname" data-imev="'+key+':'+i+'" type="button"><span class="rbz-evic">'+evIcon(e.id)+'</span><span class="nm">'+esc(evName(e.id))+'</span><span class="rbz-car">⌄</span></button>'+(I[key].length>1?'<button class="rbz-x" data-imdel="'+key+':'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>';
      (e.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-imfdel="'+key+':'+i+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
      h+='<div class="rbz-evacts"><button data-imfadd="'+key+':'+i+'" type="button">+ '+T('فیلتر','Filter by')+'</button></div></div>'; });
    return h+(I[key].length<3?'<button class="rbz-add" data-imadd="'+key+'" type="button">'+ic('plus')+T('افزودن ایونت (تا ۳)','Add event (up to 3)')+'</button>':''); }
  var panel='<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('ایونت‌ها','Events')+'</span><span class="rbx-tipdot"'+tip(S8BTIPS.impact[0],S8BTIPS.impact[1])+'></span></div>'+
    evList('treat',['اقدام (اولین بار)','Treatment (first time)'],'ایونتی که اولین انجامش روز صفر هر کاربر است.','The event whose first occurrence is each user’s day zero.')+evList('out',['نتیجه','Outcome'],'ایونتی که پیش و پس از روز صفر سنجیده می‌شود.','The event measured before and after day zero.')+'</div>'+
    (I.metric==='prop'?'':'')+'<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('سنجش بر اساس','Measured as')+'</span><span class="rbx-tipdot"'+tip((I.metric==='active'?S8BTIPS.active:S8BTIPS.avg)[0],(I.metric==='active'?S8BTIPS.active:S8BTIPS.avg)[1])+'></span></div>'+
    s8Seg2('data-immet',[['avg','میانگین','Average'],['active','درصد فعال','Active %'],['freq','تکرار','Frequency'],['prop','ویژگی','Properties',I.out.every(function(o){ return !(RB.evById(o.id)||{ props:[] }).props.some(function(p){ return NUMP[p]; }); })?T('ایونت نتیجه ویژگی عددی ندارد','The outcome event has no numeric property'):'']],I.metric)+(I.metric==='prop'?s8Seg2('data-impagg',[['avg','میانگین ویژگی','Average'],['sum','مجموع ویژگی','Sum']],I.pagg):'')+'</div>';
  var tool=s8Seg2('data-imiv',[['day','روزانه','Daily'],['week','هفتگی','Weekly']],I.iv)+s8Seg2('data-imwin',[['7','±۷','±7'],['14','±۱۴','±14']],String(I.win));
  var rows=r.series.map(function(s,si){ return '<tr><td class="fix">'+esc(s.name)+' <span class="rbz-tag">'+T('کاربران: ','Users: ')+num(s.N)+'</span></td>'+s.pts.map(function(p,pi){ var v=I.metric==='active'?pctTxt(p.pct):I.metric==='freq'?num(p.doers):I.metric==='prop'?(p.prop==null?'—':compact(p.prop)):num(p.avg,2);
    return '<td class="num'+(p.small?' rbz-small':'')+'" data-impt="'+si+':'+pi+'" role="button" tabindex="0" title="'+T('کاربران: ','Users: ')+num(I.metric==='active'?p.active:p.doers)+'">'+v+'</td>'; }).join('')+'</tr>'; }).join('');   /* AC-17: a cell opens its people */
  var body='<div class="rbz-note">'+ic('info')+T('همبستگی، نه علت: این نمودار جای آزمایش تصادفی را نمی‌گیرد. «اولین بار» یعنی بدون انجام در '+num(r.lookback)+' روز پیش از بازه؛ کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، پس پاک شدن کوکی خوانندهٔ قدیمی را «اولین بار» نشان می‌دهد. خانه‌های کم‌رنگ کمتر از ۳۰ کاربر دارند (آستانهٔ شاهین).','Correlation, not causation: this chart doesn’t replace a randomised experiment. “First time” means not done in the '+r.lookback+' days before the range; an anonymous user counts once per device, so cleared cookies make an old reader look first-time. Faded cells have fewer than 30 users (Shahin’s threshold).')+'</div>'+
    collNote((I.treat[0]||{}).id, rangeFirst(RB.rangeInfo(), r.lookback), 'نگاه به عقب '+num(r.lookback)+' روزه پیش از شروع جمع‌آوری این ایونت شروع می‌شود، پس «اولین بار» قابل اتکا نیست: کسانی که پیش از شروع جمع‌آوری از این قابلیت استفاده کرده‌اند «اولین بار» شمرده می‌شوند.','The '+r.lookback+'-day look-back starts before this event began collecting, so “first time” is unreliable: people who used the feature before collection began count as first-time.')+   /* PM 2026-10-25, AC-7 */
    '<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div><div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول تحلیل اثر','Impact table')+'</span><span class="rbz-tag">'+T(ml[I.metric][0],ml[I.metric][1])+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="fix"></th>'+r.rel.map(function(d){ return '<th class="num'+(d===0?' rbz-d0':'')+'">'+relLabel(d,I.iv)+'</th>'; }).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  s8Shell(panel, tool, body);
  var B=s8Base(), pal=palette(), cats=r.rel.map(function(d){ return relLabel(d,I.iv); }), opt;
  if(I.metric==='freq'){ var s0=r.series[0], bl=['۱','۲','۳','۴','۵','۶–۱۰'].map(function(x,i){ return T(x+' بار',['1','2','3','4','5','6–10'][i]+' times'); });
    opt={ grid:{ left:56, right:56, top:16, bottom:44 }, tooltip:B.tip({ trigger:'axis' }), legend:{ bottom:0, textStyle:{ color:B.TX, fontFamily:B.FONT } }, xAxis:{ type:'category', inverse:fa(), data:cats, axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11, hideOverlap:true } },
      yAxis:{ type:'value', min:0, position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return compact(v); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
      series:bl.map(function(nm,k){ return { name:nm, type:'line', stack:'f', symbol:'none', areaStyle:{ opacity:.55, color:pal[k%pal.length] }, lineStyle:{ width:1, color:pal[k%pal.length] }, data:s0.pts.map(function(p){ return p.freq[k]; }) }; }) }; }
  else opt={ grid:{ left:56, right:56, top:16, bottom:44 }, legend:{ bottom:0, textStyle:{ color:B.TX, fontFamily:B.FONT } },
    tooltip:B.tip({ trigger:'axis', formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ var pt=r.series[p.seriesIndex].pts[p.dataIndex]; return esc(p.seriesName)+' <b>'+(I.metric==='active'?pctTxt(p.value):num(p.value,2))+'</b> <span style="color:'+B.MU+'">('+num(I.metric==='active'?pt.active:pt.doers)+T(' کاربر',' users')+(pt.small?T('، کم',', few'):'')+')</span>'; }).join('<br>'); } }),
    xAxis:{ type:'category', inverse:fa(), data:cats, axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11, hideOverlap:true } },
    yAxis:{ type:'value', min:0, position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return I.metric==='active'?num(v)+T('٪','%'):num(v,v%1?1:0); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
    series:r.series.map(function(s,i){ return { name:s.name, type:'line', symbolSize:6, itemStyle:{ color:pal[i%pal.length] }, lineStyle:{ width:2, color:pal[i%pal.length] },
      data:s.pts.map(function(p){ var v=I.metric==='active'?p.pct:I.metric==='prop'?p.prop:p.avg; return { value:v, itemStyle:p.small?{ color:alpha(pal[i%pal.length],.35) }:undefined }; }),
      markLine:i===0?{ silent:true, symbol:'none', lineStyle:{ color:B.MU, type:'dashed' }, label:{ formatter:T('اولین اقدام','First treatment'), color:B.MU, fontFamily:B.FONT }, data:[{ xAxis:cats[r.rel.indexOf(0)] }] }:undefined }; }) };
  /* PM 2026-10-25, AC-17: each point and table cell opens the people who did the outcome event on that relative day */
  function people(si, pi, k){ var s=r.series[si], pt=s&&s.pts[pi]; if(!pt) return null; var n=k!=null?(pt.freq[k]||0):pt.doers, day=relLabel(r.rel[pi], I.iv);
    return n?{ lb:[s.name+' · '+day, s.name+' · '+day], n:n, ev:String(s.key).split('>')[1] }:null; }
  s8Chart(opt, function(c){ c.on('click', function(p){ if(p.componentType!=='series') return; var x=I.metric==='freq'?people(0, p.dataIndex, p.seriesIndex):people(p.seriesIndex, p.dataIndex);
    if(!x){ U.toast('در این روز کسی ایونت نتیجه را انجام نداده','No one did the outcome event on this day'); return; } setTimeout(function(){ s8Micro(p, x.lb, x.n, x.ev, true); }, 0); }); });
  root.querySelectorAll('[data-impt]').forEach(function(td){ var go=function(){ var q=td.getAttribute('data-impt').split(':'), x=people(+q[0], +q[1]);
      if(!x){ U.toast('در این روز کسی ایونت نتیجه را انجام نداده','No one did the outcome event on this day'); return; } setTimeout(function(){ s8MenuAt(td, x.lb, x.n, x.ev, true); }, 0); };
    td.addEventListener('click', go); td.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); }); }
function renderCompass(){
  var C=A.s8.compass, r=lastS8=compassCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), cohorts=RBShell.cohorts?RBShell.cohorts():[];
  var panel='<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('کاربران این کوهورت','For users in the following cohort')+'</span><span class="rbx-tipdot"'+tip(S8BTIPS.compass[0],S8BTIPS.compass[1])+'></span></div>'+
    '<select class="sh-select" data-cpsel="base"><option value="new"'+(C.base==='new'?' selected':'')+'>'+T('کاربران جدید','New users')+'</option>'+cohorts.map(function(c){ return '<option value="'+c.id+'"'+(C.base===c.id?' selected':'')+'>'+esc(T(c.fa,c.en))+'</option>'; }).join('')+'</select>'+
    '<div class="rbz-sub2"><span class="lb">'+T('… با انجام دادن','… how does performing')+'</span></div><div class="rbz-fieldrow"><button class="rbz-field" data-cpev="1" type="button">'+(C.ev==='_any'?T('هر ایونتی (نقشهٔ حرارتی)','Any event (heat map)'):esc(evName(C.ev)))+' <span class="car">⌄</span></button>'+(C.ev!=='_any'?'<button data-cpevdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>'+
    (C.filters||[]).map(function(f,fi){ return '<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-cpfdel="'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; }).join('')+
    (C.ev!=='_any'?'<div class="rbz-evacts"><button data-cpfadd="1" type="button">+ '+T('فیلتر','where')+'</button><button data-cpgb="1" type="button">+ '+T('تفکیک','group by')+'</button></div>':'')+
    (C.gb?'<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('تفکیک: ','Grouped by: ')+esc(T(RB.PROPS[C.gb].fa,RB.PROPS[C.gb].en))+'</span><button data-cpgbdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>':'')+
    '<div class="rbz-sub2"><span class="lb">'+T('در چند روز اول','in their first')+'</span></div><select class="sh-select" data-cpsel="days">'+[1,2,3,4,5,6,7].map(function(d){ return '<option value="'+d+'"'+(C.days===d?' selected':'')+'>'+T(num(d)+' روز',d+(d===1?' day':' days'))+'</option>'; }).join('')+'</select>'+
    '<div class="rbz-sub2"><span class="lb">'+T('… ماندن در این کوهورت را پیش‌بینی می‌کند؟','… predict they will be in this cohort')+'</span></div><select class="sh-select" data-cpsel="target">'+Object.keys(TARGETS).map(function(k){ return '<option value="'+k+'"'+(C.target===k?' selected':'')+'>'+T(TARGETS[k][0],TARGETS[k][1])+'</option>'; }).join('')+cohorts.map(function(c){ return '<option value="'+c.id+'"'+(C.target===c.id?' selected':'')+'>'+esc(T(c.fa,c.en))+'</option>'; }).join('')+'</select></div>';
  var info='<div class="rbz-note">'+ic('info')+T('نمودار قدیمی. همبستگی، نه علت؛ برای اثبات باید آزمایش کرد. کوهورت پایه: '+num(r.N)+' کاربر جدید که پنجرهٔ هدفشان کامل گذشته (از '+num(r.days90)+' روز'+(r.capped?'؛ قطب‌نما حداکثر ۹۰ روز را می‌خواند':'')+'). نرخ پایهٔ ماندن: '+pctTxt(r.rate*100)+'. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود.','A legacy chart. Correlation, not causation; only an experiment proves it. Base cohort: '+num(r.N)+' new users whose target window has fully passed (of '+r.days90+' days'+(r.capped?'; Compass reads at most 90 days':'')+'). Base retention rate: '+pctTxt(r.rate*100)+'. An anonymous user counts once per device.')+'</div>'+
    /* PM 2026-10-25, AC-7: the Compass window (at most 90 days to the range end) before the event's collection start */
    collNote(C.ev, new Date(rangeEnd(RB.rangeInfo()).getTime()-(Math.max(1,r.days90)-1)*864e5), 'پنجره '+num(r.days90)+' روزه پیش از شروع جمع‌آوری این ایونت شروع می‌شود، پس کوهورت کامل‌شده کوچک است و کاربران جدید آن کسانی را هم دارد که پیش از شروع جمع‌آوری آمده بودند.','The '+r.days90+'-day window starts before this event began collecting, so the mature cohort is small and its new users include users who came before collection began.');
  var body, tool='<span class="rbz-tag">'+T('قدیمی','Legacy')+'</span>';
  if(C.ev==='_any'){
    var hd='<tr><th class="fix">'+T('ایونت','Event')+'</th>'+r.heat[0].row.map(function(x,d){ return '<th class="num"><button class="rbz-thbtn" data-cpsort="'+(d+1)+'" type="button">'+T('روز ','Day ')+num(d+1)+(C.sort===d+1?(C.sortDir==='asc'?' ↑':' ↓'):'')+'</button></th>'; }).join('')+'</tr>';
    body=info+'<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('نقشهٔ حرارتی: همبستگی «دست‌کم یک بار تا روز n» با ماندن','Heat map: correlation of “at least once by day n” with retention')+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table rbz-heat"><thead>'+hd+'</thead><tbody>'+
      r.heat.map(function(h){ return '<tr><td class="fix"><button class="rb-linkbtn" data-cppick="'+h.id+'" type="button">'+esc(h.name)+'</button></td>'+h.row.map(function(v,d){ var a=Math.max(0,Math.min(1,v/0.5)); return '<td class="num rbz-hc" data-cpcell="'+h.id+':'+(d+1)+'" style="background:color-mix(in srgb,var(--sh-c1) '+Math.round(a*55)+'%,transparent)">'+num(v,2)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div></div>';
  } else {
    var b=r.buckets.filter(function(x){ return x.n===r.sel; })[0], lb=cmpLabel(b.phi), mk={ corr:['همبستگی','Correlation'], ppv:['ارزش پیش‌بینی مثبت','Positive predictive value'], sens:['حساسیت','Sensitivity'], npv:['ارزش پیش‌بینی منفی','Negative predictive value'], spec:['ویژگی‌مندی','Specificity'], prop:['سهم بالای آستانه','Proportion above threshold'] };
    var val=function(t){ return C.metric==='corr'?num(t.phi,2):pctTxt(t[C.metric]*100); };
    tool+='<select class="sh-select" data-cpsel="metric">'+Object.keys(mk).map(function(k){ return '<option value="'+k+'"'+(C.metric===k?' selected':'')+'>'+T(mk[k][0],mk[k][1])+'</option>'; }).join('')+'</select>';
    body=info+'<div class="rbz-cpsum"><b>'+esc(evName(C.ev))+'</b> · '+T('دست‌کم '+num(b.n)+' بار در '+num(C.days)+' روز اول','at least '+b.n+' times in the first '+C.days+' days')+' <span class="rbz-tag cp-'+lb[2]+'">'+T(lb[0],lb[1])+' · '+num(b.phi,2)+'</span>'+(C.ci?' <button class="rb-linkbtn" data-cpci="1" type="button">'+T('بازهٔ اطمینان ۹۵٪: ','95% CI: ')+num(b.ci[0],2)+' – '+num(b.ci[1],2)+'</button>':' <button class="rb-linkbtn" data-cpci="1" type="button">'+T('نمایش بازهٔ اطمینان','Show confidence interval')+'</button>')+'</div>'+
      '<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div>'+
      '<div class="rbz-evacts"><button data-cptbl="1" type="button">'+(C.table?T('پنهان کردن','Hide'):T('نمایش','Show'))+' '+T('جدول همبستگی','correlation table')+'</button><button data-cpstats="1" type="button">'+(C.stats?T('پنهان کردن','Hide'):T('نمایش','Show'))+' '+T('آمار جزئی','detailed statistics')+'</button><button data-cpcoh="1" type="button">'+ic('users-three')+T('ساختن کوهورت','Create cohort')+'</button></div>'+
      (C.table?'<div class="sh-table-wrap"><table class="sh-table rbz-table rbz-ct"><thead><tr><th></th><th class="num">'+T('ماندند','Retained')+'</th><th class="num">'+T('نماندند','Not retained')+'</th></tr></thead><tbody><tr><td>'+T('دست‌کم '+num(b.n)+' بار','≥ '+b.n+' times')+'</td><td class="num">'+num(b.TP)+'</td><td class="num">'+num(b.FP)+'</td></tr><tr><td>'+T('کمتر از '+num(b.n)+' بار','< '+b.n+' times')+'</td><td class="num">'+num(b.FN)+'</td><td class="num">'+num(b.TN)+'</td></tr></tbody></table></div>':'')+
      (C.stats?'<div class="rbz-cpstats">'+['ppv','sens','npv','spec','prop'].map(function(k){ return '<span class="rbz-tag">'+T(mk[k][0],mk[k][1])+': '+pctTxt(b[k]*100)+'</span>'; }).join('')+'</div>':'')+
      '<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('آستانه‌ها','Thresholds')+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="fix">'+T('دست‌کم','At least')+'</th><th class="num">'+T(mk[C.metric][0],mk[C.metric][1])+'</th><th>'+T('برچسب','Label')+'</th><th class="num">'+T('سهم بالای آستانه','Above threshold')+'</th></tr></thead><tbody>'+
      r.buckets.map(function(t){ var l=cmpLabel(t.phi); return '<tr class="'+(t.n===r.sel?'ov':'')+'"><td class="fix"><button class="rb-linkbtn" data-cpb="'+t.n+'" type="button">'+T(num(t.n)+' بار',t.n+' times')+(t.n===r.best?' ★':'')+'</button></td><td class="num">'+val(t)+'</td><td><span class="rbz-tag cp-'+l[2]+'">'+T(l[0],l[1])+'</span></td><td class="num">'+pctTxt(t.prop*100)+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
      (r.gb?'<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('به تفکیک ','By ')+esc(T(RB.PROPS[C.gb].fa,RB.PROPS[C.gb].en))+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><tbody>'+r.gb.map(function(t){ return '<tr><td class="fix"><bdi>'+esc(t.name)+'</bdi></td><td class="num">'+num(t.phi,2)+'</td><td><span class="rbz-tag cp-'+cmpLabel(t.phi)[2]+'">'+T(cmpLabel(t.phi)[0],cmpLabel(t.phi)[1])+'</span></td><td class="num">'+T(num(t.N)+' کاربر',t.N+' users')+'</td></tr>'; }).join('')+'</tbody></table></div></div>':'');
  }
  s8Shell(panel, tool, body);
  if(C.ev!=='_any'){ var B=s8Base(), pal=palette();
    s8Chart({ grid:{ left:56, right:56, top:16, bottom:32 }, tooltip:B.tip({ trigger:'axis', axisPointer:{ type:'shadow' } }), xAxis:{ type:'category', inverse:fa(), data:r.buckets.map(function(t){ return T('≥'+num(t.n),'≥'+t.n); }), axisLabel:{ color:B.MU, fontFamily:B.FONT } },
      yAxis:{ type:'value', min:C.metric==='corr'?-0.1:0, max:C.metric==='corr'?undefined:1, position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return C.metric==='corr'?num(v,1):num(v*100)+T('٪','%'); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
      series:[{ type:'bar', barMaxWidth:30, data:r.buckets.map(function(t){ var v=C.metric==='corr'?t.phi:t[C.metric]; return { value:+v.toFixed(3), itemStyle:{ color:t.n===r.sel?pal[0]:alpha(pal[0],.4) } }; }),
        markLine:C.metric==='corr'?{ silent:true, symbol:'none', lineStyle:{ color:B.MU, type:'dashed' }, label:{ color:B.MU, fontFamily:B.FONT, formatter:function(p){ return num(p.value,1); } }, data:[{ yAxis:0.2 },{ yAxis:0.4 }] }:undefined }] },
      function(c){ c.on('click', function(p){ if(p.componentType==='series'){ A.s8.compass.bucket=r.buckets[p.dataIndex].n; changed(); } }); }); }
}
function renderPersonas(){
  var P=A.s8.personas, r=lastS8=personasCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), cohorts=RBShell.cohorts?RBShell.cohorts():[], sel=Math.min(P.sel, r.clusters.length-1), cl=r.clusters[sel];
  var panel='<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('ساخت خوشه‌ها','Cluster generation')+'</span><span class="rbx-tipdot"'+tip(S8BTIPS.personas[0],S8BTIPS.personas[1])+'></span></div>'+
    '<select class="sh-select" data-pssel="pop"><option value="active"'+(P.pop==='active'?' selected':'')+'>'+T('کاربران فعال','Active users')+'</option><option value="new"'+(P.pop==='new'?' selected':'')+'>'+T('کاربران جدید (فقط ایونت‌های روز اول)','New users (first-day events only)')+'</option>'+cohorts.map(function(c){ return '<option value="'+c.id+'"'+(P.pop===c.id?' selected':'')+'>'+esc(T(c.fa,c.en))+'</option>'; }).join('')+'</select>'+
    '<div class="rbz-sub2"><span class="lb">'+T('… در چند خوشه','… into a total of')+'</span></div><select class="sh-select" data-pssel="k">'+[2,3,4,5,6].map(function(k){ return '<option value="'+k+'"'+(P.k===k?' selected':'')+'>'+T(num(k)+' خوشه',k+' clusters')+'</option>'; }).join('')+'</select>'+
    '<p class="rbz-sethelp">'+T('خوشهٔ کم معنای کمی دارد و خوشهٔ زیاد ممکن است ساختگی باشد؛ چند عدد را امتحان کنید.','Too few clusters say little; too many can be spurious. Try a few counts.')+'</p>'+
    '<div class="rbz-sub2"><span class="lb">'+T('کوهورت هدف','Target cohort')+'</span></div><select class="sh-select" data-pssel="target">'+Object.keys(TARGETS).map(function(k){ return '<option value="'+k+'"'+(P.target===k?' selected':'')+'>'+T(TARGETS[k][0],TARGETS[k][1])+'</option>'; }).join('')+cohorts.map(function(c){ return '<option value="'+c.id+'"'+(P.target===c.id?' selected':'')+'>'+esc(T(c.fa,c.en))+'</option>'; }).join('')+'</select></div>';
  var tool='<span class="rbz-tag">'+T('قدیمی','Legacy')+'</span>';
  var body='<div class="rbz-note">'+ic('info')+T('نمودار قدیمی. '+num(r.N)+' کاربر در '+num(r.clusters.length)+' خوشه؛ نرخ پایهٔ کوهورت هدف '+pctTxt(r.rate)+'.'+(r.capped?' پرسوناها حداکثر ۳۰ روز را می‌خواند؛ ۳۰ روز آخر بازه به کار رفته.':'')+' پینگ‌های پخش و ایونت‌های فروشگاهی کنار گذاشته شده‌اند. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، پس یک خواننده با دو دستگاه می‌تواند در دو خوشه باشد.','A legacy chart. '+num(r.N)+' users in '+r.clusters.length+' clusters; target-cohort base rate '+pctTxt(r.rate)+'.'+(r.capped?' Personas reads at most 30 days; the range’s last 30 days are used.':'')+' Playback pings and store events are left out. An anonymous user counts once per device, so one reader with two devices can sit in two clusters.')+'</div>'+
    '<div class="rbz-chartbox"><div class="rbz-chart rbz-pschart" id="rbzChart"></div></div>'+
    '<div class="rbz-pscards">'+r.clusters.map(function(c,i){ var d=P.desc[c.id]; return '<div class="rbz-pscard'+(i===sel?' on':'')+'" data-pscard="'+i+'"><div class="rbz-pshead"><b>'+esc(c.name)+'</b><span class="rbz-tag">'+T('خوشهٔ ','Cluster ')+num(i+1)+'</span></div>'+
      '<div class="rbz-psnums"><span><b>'+num(c.users)+'</b> '+T('کاربر','users')+' · '+pctTxt(c.share*100)+'</span><span>'+T('بزرگ‌تر از '+num(c.pctl)+'٪ خوشه‌های دیگر','larger than '+c.pctl+'% of the other clusters')+'</span><span>'+T('در کوهورت هدف: ','In target cohort: ')+'<b>'+pctTxt(c.target)+'</b></span></div>'+
      '<input class="sh-input rbz-psdesc" data-psdesc="'+c.id+'" value="'+esc(d||'')+'" placeholder="'+T('توضیح این خوشه…','Describe this cluster…')+'"/><button class="rb-linkbtn" data-psexp="'+i+'" type="button">'+ic('users-three')+T('خروجی به‌عنوان کوهورت','Export as cohort')+'</button></div>'; }).join('')+'</div>'+
    '<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('ایونت‌های خوشهٔ ','Events of cluster ')+esc(cl.name)+'</span><span class="rbz-tag">'+T('σ = فاصلهٔ علامت‌دار از میانگین','σ = signed distance from the mean')+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table rbz-psev"><thead><tr><th class="fix">'+T('ایونت','Event')+'</th><th class="num">'+T('میانگین تعداد','Avg # of events')+'</th><th class="num">σ</th></tr></thead><tbody>'+
    cl.events.map(function(e,i){ var cut=cl.events[i-1]&&cl.events[i-1].sigma>=0&&e.sigma<0; return (cut?'<tr class="rbz-pscut"><td colspan="3">'+T('کمتر از میانگین','Below average')+'</td></tr>':i===0?'<tr class="rbz-pscut"><td colspan="3">'+T('بیشتر از میانگین','Above average')+'</td></tr>':'')+'<tr><td class="fix">'+esc(e.name)+'</td><td class="num">'+num(e.avg,2)+'</td><td class="num '+(e.sigma>0?'up':e.sigma<0?'down':'')+'"><span dir="ltr">'+(e.sigma>0?'+':e.sigma<0?'−':'')+num(Math.abs(e.sigma),1)+'</span></td></tr>'; }).join('')+'</tbody></table></div></div>';
  s8Shell(panel, tool, body);
  var B=s8Base(), pal=palette();
  s8Chart({ tooltip:B.tip({ formatter:function(p){ var c=r.clusters[p.dataIndex]; return '<b>'+esc(c.name)+'</b><br>'+num(c.users)+T(' کاربر',' users')+' · '+pctTxt(c.share*100)+'<br>'+T('در کوهورت هدف: ','In target cohort: ')+pctTxt(c.target); } }),
    xAxis:{ show:false, min:0, max:r.clusters.length+1 }, yAxis:{ show:false, min:0, max:2 }, grid:{ left:8, right:8, top:8, bottom:8 },
    series:[{ type:'scatter', data:r.clusters.map(function(c,i){ return { value:[fa()?r.clusters.length-i:i+1, 1], symbolSize:24+Math.sqrt(c.share)*110, itemStyle:{ color:pal[i%pal.length], opacity:i===sel?1:.55 }, label:{ show:true, formatter:pctTxt(c.share*100), color:B.TX, fontFamily:B.FONT } }; }) }] },
    function(c){ c.on('click', function(p){ if(p.componentType==='series'){ A.s8.personas.sel=p.dataIndex; changed(); } }); }); }
var renderS8a=renderS8;
renderS8=function(){ var t=RB.Q.type; if(t==='impact') renderImpact(); else if(t==='compass') renderCompass(); else if(t==='personas') renderPersonas(); else renderS8a(); };
var s8TileA=s8Tile;
s8Tile=function(q, ovr, type){ if(['impact','compass','personas'].indexOf(type)<0) return s8TileA(q, ovr, type);
  var st=norm(clone(q.amp||{})), ctx={ range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) }, R=within(ctx,function(){ return RB.rangeInfo(); });
  if(type==='impact'){ var im=impactCompute(st, ctx), s=im.series[0], bef=s.pts.filter(function(p){ return p.d<0; }), aft=s.pts.filter(function(p){ return p.d>0; }), av=function(a){ return a.reduce(function(x,p){ return x+p.avg; },0)/(a.length||1); }, ch=(av(aft)-av(bef))/(av(bef)||1)*100;
    return { val:(ch>=0?'+':'')+num(ch,1)+T('٪','%'), num:ch, sub:s.name+' · '+T('پس در برابر پیش از اولین اقدام','after vs. before the first treatment'), viz:spark(s.pts.map(function(p){ return p.avg; })), rows:[[T('کاربران','Users'),num(s.N)]], range:R }; }
  if(type==='compass'){ var cp=compassCompute(st, ctx), top=cp.heat.slice().sort(function(a,b){ return b.row[b.row.length-1]-a.row[a.row.length-1]; }).slice(0,5);
    return { val:top[0]?num(top[0].row[top[0].row.length-1],2):'—', num:top[0]?top[0].row[top[0].row.length-1]:0, sub:T('بیشترین همبستگی با ','Top correlation with ')+tgtName(st.s8.compass.target), viz:'', rows:top.map(function(h){ return [h.name, num(h.row[h.row.length-1],2)]; }), range:R }; }
  var ps=personasCompute(st, ctx); return { val:num(ps.clusters.length), num:ps.clusters.length, sub:T('خوشه از ','clusters of ')+num(ps.N)+T(' کاربر',' users'), viz:'', rows:ps.clusters.map(function(c){ return [c.name, pctTxt(c.share*100)]; }), range:R }; };
function wireS8b(){
  var t=RB.Q.type; if(['impact','compass','personas'].indexOf(t)<0) return;
  var S=A.s8, on=function(attr, fn){ root.querySelectorAll('['+attr+']').forEach(function(b){ b.addEventListener('click', function(){ if(b.disabled) return; fn(b.getAttribute(attr), b); changed(); }); }); };
  /* impact */
  root.querySelectorAll('[data-imev]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-imev').split(':'); eventPicker(function(id){ S.impact[p[0]][+p[1]]={ id:id, filters:[] }; changed(); }); }); });
  root.querySelectorAll('[data-imadd]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-imadd'); eventPicker(function(id){ if(S.impact[k].length<3) S.impact[k].push({ id:id, filters:[] }); changed(); }); }); });
  on('data-imdel', function(v){ var p=v.split(':'); S.impact[p[0]].splice(+p[1],1); });
  root.querySelectorAll('[data-imfadd]').forEach(function(b){ b.addEventListener('click', function(){ var p=b.getAttribute('data-imfadd').split(':'), e=S.impact[p[0]][+p[1]]; propFilterModal({ fa:'فیلتر ایونت', en:'Event filter', subFa:'فقط ایونت‌هایی که این شرط را دارند.', subEn:'Only events that match.' }, propsOf(e.id), function(f){ (e.filters=e.filters||[]).push(f); changed(); }); }); });
  on('data-imfdel', function(v){ var p=v.split(':'); S.impact[p[0]][+p[1]].filters.splice(+p[2],1); });
  on('data-immet', function(v){ S.impact.metric=v; }); on('data-impagg', function(v){ S.impact.pagg=v; }); on('data-imiv', function(v){ S.impact.iv=v; }); on('data-imwin', function(v){ S.impact.win=+v; });
  /* compass */
  root.querySelectorAll('[data-cpsel]').forEach(function(x){ x.addEventListener('change', function(){ var k=x.getAttribute('data-cpsel'); S.compass[k]=k==='days'?+x.value:x.value; if(k!=='metric') S.compass.bucket=null; changed(); }); });
  var ce=root.querySelector('[data-cpev]'); if(ce) ce.addEventListener('click', function(){ eventPicker(function(id){ S.compass.ev=id; S.compass.filters=[]; S.compass.bucket=null; changed(); }); });
  on('data-cpevdel', function(){ S.compass.ev='_any'; S.compass.gb=''; S.compass.filters=[]; });
  on('data-cppick', function(v){ S.compass.ev=v; S.compass.bucket=null; });
  on('data-cpsort', function(v){ if(S.compass.sort===+v) S.compass.sortDir=S.compass.sortDir==='asc'?'desc':'asc'; else { S.compass.sort=+v; S.compass.sortDir='desc'; } });
  root.querySelectorAll('[data-cpcell]').forEach(function(td){ td.addEventListener('click', function(){ var p=td.getAttribute('data-cpcell').split(':'), x=lastS8; var row=x.heat.filter(function(h){ return h.id===p[0]; })[0];
    U.modal({ fa:evName(p[0]), en:evName(p[0]), subFa:'دست‌کم یک بار تا روز '+num(+p[1])+' · '+tgtName(S.compass.target), subEn:'At least once by day '+p[1]+' · '+tgtName(S.compass.target), body:'<p>'+T('همبستگی: ','Correlation: ')+'<b>'+num(row.row[+p[1]-1],2)+'</b> · '+T(cmpLabel(row.row[+p[1]-1])[0],cmpLabel(row.row[+p[1]-1])[1])+'</p><button class="rb-linkbtn" data-cpgo="1" type="button">'+T('جزئیات این ایونت','Open this event')+'</button>',
      init:function(bd, close){ bd.querySelector('[data-cpgo]').addEventListener('click', function(){ close(); S.compass.ev=p[0]; S.compass.days=+p[1]; S.compass.bucket=null; changed(); }); } }); }); });
  on('data-cpb', function(v){ S.compass.bucket=+v; }); on('data-cpci', function(){ S.compass.ci=!S.compass.ci; }); on('data-cptbl', function(){ S.compass.table=!S.compass.table; }); on('data-cpstats', function(){ S.compass.stats=!S.compass.stats; });
  root.querySelectorAll('[data-cpfadd]').forEach(function(b){ b.addEventListener('click', function(){ propFilterModal({ fa:'فیلتر ایونت', en:'Event filter', subFa:'فقط ایونت‌هایی که این شرط را دارند.', subEn:'Only events that match.' }, propsOf(S.compass.ev), function(f){ S.compass.filters.push(f); changed(); }); }); });
  on('data-cpfdel', function(v){ S.compass.filters.splice(+v,1); });
  var cg=root.querySelector('[data-cpgb]'); if(cg) cg.addEventListener('click', function(e){ e.stopPropagation(); U.menu(cg, ['device_type','referrer_type','utm_source','city'].map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ S.compass.gb=p; changed(); } }; }), 'start'); });
  on('data-cpgbdel', function(){ S.compass.gb=''; });
  var cc=root.querySelector('[data-cpcoh]'); if(cc) cc.addEventListener('click', function(){ var x=lastS8, b=x.buckets.filter(function(y){ return y.n===x.sel; })[0], lb=[T('','')+evName(S.compass.ev)+' ≥'+num(b.n)+' در '+num(S.compass.days)+' روز اول', evName(S.compass.ev)+' ≥'+b.n+' in the first '+S.compass.days+' days'];
    cohortModal(lb, b.TP+b.FP, S.compass.ev, ['کاربران جدیدی که «'+evName(S.compass.ev)+'» را دست‌کم '+num(b.n)+' بار در '+num(S.compass.days)+' روز اول انجام دادند؛ ماندنشان با «هر ایونت فعال» با کاربران جدید مقایسه می‌شود.', 'New users who did “'+evName(S.compass.ev)+'” at least '+b.n+' times in their first '+S.compass.days+' days; their retention is compared with new users on “Any active event”.', false]); });
  /* personas */
  root.querySelectorAll('[data-pssel]').forEach(function(x){ x.addEventListener('change', function(){ var k=x.getAttribute('data-pssel'); S.personas[k]=k==='k'?+x.value:x.value; S.personas.sel=0; changed(); }); });
  root.querySelectorAll('[data-pscard]').forEach(function(c){ c.addEventListener('click', function(e){ if(/INPUT|BUTTON/.test(e.target.tagName)||e.target.closest('button')) return; S.personas.sel=+c.getAttribute('data-pscard'); changed(); }); });
  root.querySelectorAll('[data-psdesc]').forEach(function(x){ x.addEventListener('change', function(){ S.personas.desc[x.getAttribute('data-psdesc')]=x.value; changed(false); }); });
  root.querySelectorAll('[data-psexp]').forEach(function(b){ b.addEventListener('click', function(){ var c=lastS8.clusters[+b.getAttribute('data-psexp')]; cohortModal([T('پرسونا: ','Persona: ')+c.name, 'Persona: '+c.name], c.users, '_any_active', ['اعضای خوشهٔ «'+c.name+'» در نمودار پرسوناها', 'Members of the “'+c.name+'” cluster in Personas', false]); }); });
}
/* ═════════ Step 8c: Experiment Results, Chart templates ═════════
   Spec: research-notes/…/26b §4 (Experiment Results) and §6 (Chart templates); chart review in 28-chart-review-step8c.md.
   Experiment Results analyses a test the customer ran in another tool; running experiments is out of scope. Shahin has no
   exposure event yet, so the demo seeds a custom `experiment_viewed` event with `experiment_key` and `variant` (Shahin's proposal).
   The unit is an exposed device; metrics count only after the first exposure. */
S8_TYPES.exp=['نتایج آزمایش','Experiment results','seal-check'];
function blankS8c(){ return { exp:{ key:'paywall_copy_v2', expo:'experiment_viewed', efilters:[], vprop:'variant', vars:[{ val:'control', w:1 },{ val:'treatment', w:1 }], sub:[], trim:{ on:false, n:10 },
  prim:{ ev:'subscription_started', type:'uniques', filters:[] }, sec:[{ ev:'page_view', type:'totals', filters:[] },{ ev:'share', type:'uniques', filters:[] },{ ev:'form_submitted', type:'uniques', filters:[] }],
  ana:0, gb:'', view:'ci', cum:true, method:'seq', conf:95, bonf:true, sides:2, dir:'inc', target:10000, prior:{ on:false, mean:2.5, str:200 } } }; }
/* the two seeded tests: lifts per variant (control first); a variant missing from `vars` has no exposures */
var EXPS={
  paywall_copy_v2:{ fa:'متن تازهٔ دیوار اشتراک', en:'New paywall copy', start:new Date(2026,5,22), vars:['control','treatment'], split:[.5,.5], skew:[0,0], n0:1150, jump:.011,
    fx:{ subscription_started:{ p:.05, l:[0,.34] }, page_view:{ m:6.4, cv:1.5, l:[0,-.012] }, share:{ p:.047, l:[0,-.03] }, form_submitted:{ p:.0075, l:[0,.05] }, video_started:{ p:.21, l:[0,.004] } } },
  related_layout:{ fa:'چیدمان تازهٔ مطالب مرتبط', en:'Related-articles layout', start:new Date(2026,6,6), vars:['control','treatment','treatment_b'], split:[1/3,1/3,1/3], skew:[.04,-.02,-.02], n0:1900, jump:.019,
    fx:{ page_view:{ m:5.1, cv:1.4, l:[0,.045,.012] }, share:{ p:.041, l:[0,.06,.01] }, scroll_depth_reached:{ p:.48, l:[0,.03,-.01] }, search_submitted:{ p:.06, l:[0,-.02,0] } } }
};
var EXP_NOW=new Date(2026,6,27), EXP_CEND=new Date(2026,6,5), DAY=864e5;
var XTYPES={ uniques:['تبدیل یکتا','Unique conversions'], totals:['تعداد کل ایونت','Event totals'], propsum:['مجموع مقدار ویژگی','Sum of property value'], propavg:['میانگین مقدار ویژگی','Average of property value'], funnel:['تبدیل قیف','Funnel conversion'], formula:['فرمول','Formula'] };
var XMETHOD={ seq:['ترتیبی','Sequential'], ttest:['تی‌تست','T-test'], bayes:['بیزی','Bayesian'] };
/* PM 2026-10-30, LX-24 («یک کتابخانه، مثل Amplitude»): Experiment Results reads the shared metric library. Its five former saved metrics
   (EXP_SAVED) join the library once per project, so nothing it listed is lost; `exps` names the experiments whose results use each one. */
var EXP_SEED=[
  { id:'mx_sub_rate', fa:'نرخ خرید اشتراک', en:'Subscription rate', dFa:'سهم کاربران دیده‌شده که اشتراک خریده‌اند.', dEn:'The share of exposed users who started a subscription.', type:'event', col:{ kind:'ev', ev:'subscription_started', meas:'uniques', filters:[] }, owner:'pm', verified:true, exps:['paywall_copy_v2'] },
  { id:'mx_pv_user', fa:'بازدید صفحه در هر کاربر', en:'Page views per user', dFa:'میانگین بازدید صفحه هر کاربر.', dEn:'The average page views per user.', type:'event', col:{ kind:'ev', ev:'page_view', meas:'avg', filters:[] }, owner:'an', verified:false, exps:['paywall_copy_v2','related_layout'] },
  { id:'mx_share', fa:'نرخ اشتراک‌گذاری', en:'Share rate', dFa:'سهم کاربرانی که دست‌کم یک بار مطلبی را به اشتراک گذاشته‌اند.', dEn:'The share of users who shared something at least once.', type:'event', col:{ kind:'ev', ev:'share', meas:'uniques', filters:[] }, owner:'an', verified:false, exps:['paywall_copy_v2','related_layout'] },
  { id:'mx_vid_comp', fa:'تکمیل ویدیو', en:'Video completion', dFa:'از شروع پخش تا تماشای کامل ویدیو.', dEn:'From a video start to watching it to the end.', type:'funnel', col:{ kind:'conv', steps:['video_started','video_completed'], win:7, filters:[] }, owner:'pm', verified:false, exps:[] },
  { id:'mx_nores', fa:'جستجوی بی‌نتیجه در هر جستجو', en:'No-result searches per search', dFa:'جستجوهای بی‌نتیجه تقسیم بر همه جستجوها.', dEn:'No-result searches divided by all searches.', type:'formula', col:{ kind:'hybrid', inputs:[{ L:'A', ev:'search_no_results', meas:'totals' },{ L:'B', ev:'search_submitted', meas:'totals' }], sin:[], expr:'A/B' }, owner:'an', verified:false, exps:['related_layout'] }
];
function mtSeedExp(){ var k='shahin-metric-seed-exp-p'+(RB.PROJECT||0); try{ if(localStorage.getItem(k)) return; }catch(e){ return; }
  mtSync(); EXP_SEED.forEach(function(x){ if(!T_METRICS.some(function(m){ return m.id===x.id||m.fa===x.fa; })) T_METRICS.push(clone(x)); }); tMSave(); try{ localStorage.setItem(k,'1'); }catch(e){} }
/* the builder itself seeds them; the engine iframe only when the events page v13 asks (RBAmp.seedLib), so frozen v12 pages stay as they were */
if(!/[?&]engine=1/.test(location.search)) mtSeedExp();
/* a library metric as an experiment metric; null = Experiment Results can't compute it (retention, sessions, time spent, session inputs) */
function libToX(mt){ var c=mt.col||{}, x=null, FNM={ uniques:'UNIQUES', totals:'TOTALS', avg:'TOTALS', psum:'PROPSUM' };
  if(mt.type==='event'&&c.kind==='ev') x={ ev:c.ev, type:c.meas==='totals'||c.meas==='avg'?'totals':'uniques', filters:clone(c.filters||[]) };
  else if(mt.type==='funnel'&&c.kind==='conv'&&(c.steps||[]).length>1) x={ ev:c.steps[0], type:'funnel', steps:c.steps.slice(), filters:[] };
  else if((mt.type==='formula'||mt.type==='hybrid')&&c.kind==='hybrid'&&!(c.sin||[]).length&&(c.inputs||[]).length){ var ins=c.inputs, bad=false;
    var f=String(c.expr||'').replace(/^\s*[%$]:/,'').replace(/\b([A-F])\b/g, function(a, L){ var k=H_EV.indexOf(L), inp=ins[k]; if(!inp){ bad=true; return a; } return FNM[inp.meas||'totals']+'('+L+')'; });
    if(!bad) x={ ev:ins[0].ev, type:'formula', fevs:ins.map(function(i){ return i.meas==='psum'?{ id:i.ev, prop:i.prop||'amount' }:{ id:i.ev }; }), formula:f, filters:[] }; }
  else if(mt.type==='revenue'&&c.kind==='rev') x={ ev:c.ev, type:c.agg==='aov'?'propavg':'propsum', prop:c.prop, filters:clone(c.filters||[]) };
  if(x) x.mid=mt.id; return x; }
/* an experiment that picks a library metric is listed on that metric's panel on the events page («استفاده‌ها») */
function mtNoteExp(id, key){ mtSync(); var m=tMetric(id); if(!m||!key) return; m.exps=m.exps||[]; if(m.exps.indexOf(key)<0){ m.exps.push(key); tMSave(); } }
var XTIPS={
  exp:["<span class='tip-title'>نتایج آزمایش</span>نتیجهٔ آزمایشی را که با ابزار دیگری اجرا کرده‌اید می‌خواند: هر واریانت جدا با کنترل مقایسه می‌شود و متریک‌ها فقط پس از اولین دیدن آزمایش شمرده می‌شوند. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود.","<span class='tip-title'>Experiment results</span>Reads the results of a test you ran in another tool: each variant is compared with the control on its own, and metrics count only after a user’s first exposure. An anonymous user counts once per device."],
  metric:["<span class='tip-title'>متریک اصلی</span>متریکی که تصمیم آزمایش بر اساس آن گرفته می‌شود. تبدیل یکتا یعنی درصد کاربرانِ دیده‌شده که ایونت را دست‌کم یک بار انجام داده‌اند؛ بقیهٔ انواع، مقدار به‌ازای هر کاربر دیده‌شده‌اند.","<span class='tip-title'>Primary metric</span>The metric the decision rests on. Unique conversions is the share of exposed users who did the event at least once; the other types are a value per exposed user."],
  sec:["<span class='tip-title'>متریک‌های ثانویه</span>اثرهای جانبی را می‌سنجند. با هر متریک بیشتر، احتمال یک نتیجهٔ معنادارِ تصادفی بالا می‌رود؛ اصلاح بونفرونی برای همین است.","<span class='tip-title'>Secondary metrics</span>They watch for side effects. Each extra metric raises the chance of a significant result by luck; that is what the Bonferroni correction is for."],
  expo:["<span class='tip-title'>دیدن آزمایش</span>ایونتی که کاربر باید انجام دهد تا وارد آزمایش شود. ایونت مستند شاهین برای این کار experiment_viewed با ویژگی‌های experiment_key و variant است که سایت هنگام نمایش واریانت می‌فرستد؛ هر ایونت دیگری هم که ویژگی واریانت داشته باشد پذیرفته می‌شود.","<span class='tip-title'>Exposure</span>The event a user must trigger to join the experiment. Shahin’s documented exposure event is experiment_viewed, with experiment_key and variant properties, sent by the site when it shows a variant; any other event that carries a variant property also works."],   /* PM 2026-10-25, AC-8: experiment_viewed is in the event registry */
  vars:["<span class='tip-title'>واریانت‌ها</span>هر واریانت با مقدار یک ویژگی روی ایونت دیدن آزمایش تعریف می‌شود؛ اولی کنترل است و دست‌کم یک واریانت دیگر لازم است. سهم مورد انتظار برای آزمون نسبت نمونه است (افزودهٔ شاهین).","<span class='tip-title'>Variants</span>Each variant is a value of a property on the exposure event; the first is the control and at least one more is needed. The expected share feeds the sample-ratio check (a Shahin addition)."],
  sub:["<span class='tip-title'>فیلتر بر اساس</span>زیرگروهی از کاربران دیده‌شده را جدا می‌کند و هم صورت و هم مخرج را محدود می‌کند. فیلتر روی ایونت متریک فقط صورت را کم می‌کند و نتیجه را خراب می‌کند.","<span class='tip-title'>Filter by</span>Keeps a subset of exposed users and limits both the numerator and the denominator. A filter on the metric event changes only the numerator and skews the result."],
  trim:["<span class='tip-title'>کنار گذاشتن کاربران پرتکرار</span>کاربرانی را که ایونت متریک را بیش از این تعداد انجام داده‌اند حذف می‌کند تا چند کاربر استثنایی میانگین را جابه‌جا نکنند (فیلتر «انجام داده» روی هر واریانت).","<span class='tip-title'>Drop heavy users</span>Removes users who did the metric event more than this many times, so a few outliers don’t move the mean (a “who performed” filter on each variant)."],
  ana:["<span class='tip-title'>تحلیل</span>متریکی که نمودارهای پایین نشان می‌دهند؛ پیش‌فرض متریک اصلی است. تفکیک هر زیرگروه را جدا مقایسه می‌کند؛ یافتهٔ یک زیرگروه را با آزمایش تازه تأیید کنید.","<span class='tip-title'>Analysis</span>The metric the charts below show; the primary metric by default. A group-by compares each subgroup separately; confirm a subgroup finding with a new test."],
  sig:["<span class='tip-title'>معناداری</span>یک منهای p-value. وقتی از سطح اطمینان بیشتر شود، بازهٔ اطمینان صفر را در بر نمی‌گیرد و تفاوت معنادار است. این عدد «احتمال بهتر بودن واریانت» نیست.","<span class='tip-title'>Significance</span>One minus the p-value. When it exceeds the confidence level, the confidence interval excludes zero and the difference is significant. It is not “the chance the variant is better”."],
  ci:["<span class='tip-title'>بازهٔ اطمینان عملکرد مطلق در طول زمان</span>تفاوت مطلق هر واریانت با کنترل، روز به روز با دادهٔ انباشته. وقتی بازه دیگر صفر را در بر نگیرد، نتیجه معنادار است. فرض مدل این است که اثر و نسبت تخصیص در طول زمان ثابت می‌ماند؛ اگر نماند، مرزها ممکن است جابه‌جا شوند.","<span class='tip-title'>Confidence interval of absolute performance over time</span>Each variant’s absolute difference from the control, day by day on accumulated data. Once the band no longer includes zero, the result is significant. The model assumes the effect and the allocation stay constant over time; if they don’t, the bounds can flip."],
  cumx:["<span class='tip-title'>تجمع دیدن آزمایش</span>تعداد انباشتهٔ کاربرانی که بر اساس تاریخ اولین دیدن وارد هر واریانت شده‌اند؛ هرگز کم نمی‌شود. کاربری که چند واریانت دیده در هر کدام یک بار شمرده می‌شود. روز ناتمام نقطه‌چین است.","<span class='tip-title'>Cumulative exposure</span>The running total of users entering each variant by the date of their first exposure; it never decreases. A user who saw several variants counts once in each. The incomplete day is dotted."],
  perf:["<span class='tip-title'>عملکرد هر واریانت</span>مقدار متریک برای هر واریانت؛ برای قیف، درصد کاربران دیده‌شده که به هر قدم رسیده‌اند. هم‌پوشانی بازه‌های جداگانهٔ دو واریانت به معنای «بی‌تفاوت» نیست؛ ملاک، جدول بالاست.","<span class='tip-title'>Performance by variant</span>The metric’s value per variant; for a funnel, the share of exposed users reaching each step. Overlapping per-variant intervals don’t mean “no difference”; the table above decides."],
  mean:["<span class='tip-title'>میانگین در طول زمان</span>بر اساس تاریخ اولین دیدن آزمایش. کاربرانی که روزهای اول وارد شده‌اند زمان بیشتری برای انجام ایونت داشته‌اند، پس میانگینشان معمولاً بیشتر از روزهای آخر است؛ این تفاوت اثر آزمایش نیست.","<span class='tip-title'>Mean over time</span>By the date of first exposure. Users who entered early have had more time to do the event, so their mean is usually higher than late entrants’; that gap is not an effect of the test."],
  srm:["<span class='tip-title'>آزمون نسبت نمونه</span>آزمون خی‌دو روی تعداد کاربران هر واریانت در برابر سهم مورد انتظار؛ هشدار وقتی p کمتر از ۰٫۰۱ است. عدم تطابق یعنی تخصیص یا ثبت دیدن آزمایش ایراد دارد و نتیجه قابل اتکا نیست.","<span class='tip-title'>Sample ratio check</span>A chi-squared test of users per variant against the expected shares; a warning when p is below 0.01. A mismatch means allocation or exposure logging is broken and the result can’t be trusted."]
};
/* ── statistics ── */
function xPhi(z){ var t=1/(1+0.2316419*Math.abs(z)), d=0.3989423*Math.exp(-z*z/2), p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z>0?1-p:p; }
function xPhiInv(p){ if(p<=0) return -Infinity; if(p>=1) return Infinity;
  var a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.3577518672690,-30.66479806614716,2.506628277459239], b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572], c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783], d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416], q, r;
  if(p<0.02425){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if(p>1-0.02425){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  q=p-0.5; r=q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
/* upper regularized gamma Q(a,x), for the chi-squared p-value of the sample-ratio check */
function xGammaQ(a, x){ if(x<=0) return 1; var gln=(function(z){ var cf=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5], y=z, t=z+5.5, s=1.000000000190015; t-=(z+0.5)*Math.log(t); for(var j=0;j<6;j++) s+=cf[j]/++y; return -t+Math.log(2.5066282746310005*s/z); })(a);
  if(x<a+1){ var ap=a, sum=1/a, del=sum; for(var n=0;n<200;n++){ ap++; del*=x/ap; sum+=del; if(Math.abs(del)<Math.abs(sum)*1e-10) break; } return 1-sum*Math.exp(-x+a*Math.log(x)-gln); }
  var b=x+1-a, c=1e300, d=1/b, h=d; for(var i=1;i<200;i++){ var an=-i*(i-a); b+=2; d=an*d+b; if(Math.abs(d)<1e-300) d=1e-300; c=b+an/c; if(Math.abs(c)<1e-300) c=1e-300; d=1/d; var dl=d*c; h*=dl; if(Math.abs(dl-1)<1e-10) break; } return Math.exp(-x+a*Math.log(x)-gln)*h; }
/* one treatment against the control. c and t carry { m, v, n, x, bin } (v = variance of the estimate). */
function xTest(c, t, X, k){
  var conf=X.conf/100, out={ delta:t.m-c.m, rel:c.m?(t.m-c.m)/Math.abs(c.m):0, k:k };
  if(!c.n||!t.n) return Object.assign(out, { state:'noexpo' });
  var floor=(c.bin&&t.bin)?(c.x>=25&&t.x>=25&&c.n>=100&&t.n>=100):(c.n>=100&&t.n>=100);
  if(!floor) return Object.assign(out, { state:'nodata' });
  if(X.method==='ttest'&&(c.n<X.target||t.n<X.target)) return Object.assign(out, { state:'wait', remain:Math.max(X.target-c.n, X.target-t.n) });
  if(X.method==='bayes'){
    var pc=c, pt=t;
    if(c.bin&&t.bin){ var a=X.prior.on?X.prior.mean/100*X.prior.str:1, b=X.prior.on?(1-X.prior.mean/100)*X.prior.str:1, post=function(s){ var mu=(s.x+a)/(s.n+a+b); return { m:mu, v:mu*(1-mu)/(s.n+a+b+1), n:s.n }; }; pc=post(c); pt=post(t); }
    var d=pt.m-pc.m, sd=Math.sqrt(pc.v+pt.v)||1e-12, al=1-conf, z=xPhiInv(1-al/2), up=xPhi(d/sd), chance=X.dir==='dec'?1-up:up;
    return Object.assign(out, { state:'ok', delta:d, rel:pc.m?d/Math.abs(pc.m):0, ci:[d-z*sd, d+z*sd], chance:chance, postC:pc.m, postT:pt.m, sig:up>=1-al/2?'pos':up<=al/2?'neg':'inc', se:sd }); }
  var al2=(1-conf)/(X.bonf?k:1), se=Math.sqrt(c.v+t.v)||1e-12, dl=out.delta, ci, p, p0;
  if(X.method==='seq'){ var tau2=Math.pow(0.1*Math.abs(c.m)||1e-6, 2), V=se*se, hw=Math.sqrt(V*(V+tau2)/tau2*(2*Math.log(1/al2)+Math.log((V+tau2)/V)));
    ci=[dl-hw, dl+hw]; p0=Math.min(1, Math.sqrt((V+tau2)/V)*Math.exp(-tau2*dl*dl/(2*V*(V+tau2)))); }
  else if(X.sides===1){ var z1=xPhiInv(1-al2); if(X.dir==='dec'){ ci=[-Infinity, dl+z1*se]; p0=xPhi(dl/se); } else { ci=[dl-z1*se, Infinity]; p0=1-xPhi(dl/se); } }
  else { var z2=xPhiInv(1-al2/2); ci=[dl-z2*se, dl+z2*se]; p0=2*(1-xPhi(Math.abs(dl)/se)); }
  p=Math.min(1, p0*(X.bonf?k:1));
  return Object.assign(out, { state:'ok', ci:ci, p:p, praw:p0, signif:1-p, se:se, sig:ci[0]>0?'pos':ci[1]<0?'neg':'inc' }); }
/* Bayesian posterior mean of a conversion rate (uniform prior unless customised): 1 exposure and 0 conversions → 33.3%, Amplitude's example */
function xPost(v, X){ if(!v.bin) return v.m; var a=X.prior.on?X.prior.mean/100*X.prior.str:1, b=X.prior.on?(1-X.prior.mean/100)*X.prior.str:1; return (v.x+a)/(v.n+a+b); }
function xSrm(counts, weights){ var U=counts.reduce(function(a,b){ return a+b; },0), W=weights.reduce(function(a,b){ return a+b; },0)||1, chi=0;
  counts.forEach(function(o,i){ var e=U*weights[i]/W; if(e>0) chi+=(o-e)*(o-e)/e; }); var df=counts.length-1; return { chi:chi, df:df, p:df>0?xGammaQ(df/2, chi/2):1, U:U }; }
/* Bayesian "chance to be best" across all variants: seeded draws from each posterior, so the number never changes between renders */
function xBest(posts, dec){ var s=12345, rnd=function(){ s=(s*1103515245+12345)%2147483648; return (s+0.5)/2147483648; }, wins=posts.map(function(){ return 0; }), N=3000;
  for(var i=0;i<N;i++){ var best=-1, bv=0; posts.forEach(function(p,j){ var z=Math.sqrt(-2*Math.log(rnd()))*Math.cos(2*Math.PI*rnd()), v=p.m+z*Math.sqrt(p.v); if(best<0||(dec?v<bv:v>bv)){ best=j; bv=v; } }); wins[best]++; }
  return wins.map(function(w){ return w/N; }); }
/* ── the data behind one experiment, for the date range ── */
function xFx(E, id, vi){ var f=E.fx[id], ev=getEv(id)||{ w:500 };
  if(!f){ var j=jitter('xf'+id,0); f={ p:Math.max(.002, Math.min(.6, ev.w/41200*.55*(.8+.4*j))), m:Math.max(.05, ev.w/7700*.6), cv:1.7, l:E.vars.map(function(v,i){ return i?(jitter('xl'+id+v,0)-.5)*.05:0; }) }; }
  return { p:f.p||Math.max(.002, Math.min(.6, ev.w/41200*.55)), m:f.m||Math.max(.05, ev.w/7700*.6), cv:f.cv||1.7, l:vi<0?0:(f.l[vi]||0) }; }
function xGrow(r){ return 0.62+0.38*(1-Math.exp(-(r+1)/4)); }
function expCompute(st, ctx){
  return within(ctx, function(){
    var X=st.s8.exp, R=RB.rangeInfo(), E=EXPS[X.key], end=R.mode==='custom'?rEnd(R):R.mode==='yesterday'?new Date(EXP_NOW.getTime()-DAY):EXP_NOW, today=end===EXP_NOW;
    var out={ X:X, E:E, R:R, days:[], vars:[], metrics:[], warn:[] };
    var expoEv=getEv(X.expo), hasVar=X.expo==='experiment_viewed'&&X.vprop==='variant';
    if(!E||!hasVar){ out.state='novarprop'; return out; }
    if(X.vars.length<2){ out.state='onevar'; return out; }
    for(var i=R.days-1;i>=0;i--){ var d=new Date(end.getTime()-i*DAY), age=Math.round((d-E.start)/DAY); if(age>=0) out.days.push({ d:d, age:age }); }
    if(!out.days.length){ out.state='noexpo'; return out; }
    /* subset share: the global filter bar, the exposure event's own filters and "Filter by" limit both numerator and denominator */
    /* exposed users come from the engine's own experiment_viewed series for this key (so Trend and this chart agree), spread over the
       days since the test started; the engine's series don't know the start date, so a range reaching before it keeps only that share */
    var K0=out.days.length, eng=RB.periodUniques(baseSeries({ id:'experiment_viewed', filters:[{ prop:'experiment_key', op:'in', vals:[X.key] }].concat(X.efilters||[], X.sub||[]) },true)), target=eng*Math.pow(K0/R.days, 0.7);
    var sub=1, fmod=(X.sub.length||X.efilters.length||(ctx.filters||[]).length)?0.75+0.5*jitter('xs'+JSON.stringify([X.sub,X.efilters,ctx.filters]),0):1;
    if(X.trim.on) sub*=0.985;
    var K=out.days.length, dlab=out.days.map(function(x){ return { fa:new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long' }).format(x.d), en:new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' }).format(x.d) }; });
    out.labels=dlab; out.today=today; out.K=K;
    var W=X.vars.reduce(function(a,v){ return a+(+v.w||0); },0)||1, shape=out.days.map(function(x,k){ return (0.55+0.45*Math.exp(-x.age/6))*(0.9+0.2*jitter(X.key+'d',x.age))*(today&&k===K-1?0.62:1); }), shSum=shape.reduce(function(a,b){ return a+b; },0)||1;
    out.vars=X.vars.map(function(v, vi){ var ei=E.vars.indexOf(v.val), sh=ei<0?0:E.split[ei]+E.skew[ei];
      var uniq=out.days.map(function(x,k){ return ei<0?0:Math.round(target*shape[k]/shSum*sub*sh*(1+(jitter(X.key+v.val+'n',x.age)-.5)*.02)); });
      var cnt=uniq.map(function(u){ return u+Math.round(u*E.jump*(E.vars.length>1?1:0)); });
      return { val:v.val, w:+v.w||0, ei:ei, uniq:uniq, cnt:cnt, U:uniq.reduce(function(a,b){ return a+b; },0), N:cnt.reduce(function(a,b){ return a+b; },0), exp:(+v.w||0)/W }; });
    var live=out.vars.filter(function(v){ return v.U>0; });
    out.U=live.reduce(function(a,v){ return a+v.U; },0); out.jumpers=Math.round(out.U*E.jump);
    out.srm=live.length>1?xSrm(live.map(function(v){ return v.U; }), live.map(function(v){ return v.w; })):null;
    out.srm&&(out.srm.bad=out.srm.p<0.01&&out.srm.U>=200);
    /* metric value for variant vi, users first exposed up to cohort `upto`, measured as of day `asOf` */
    function q(m, vi, upto, asOf, gb){
      var V=out.vars[vi], ei=V.ei, n=0, acc=0; gb=gb||{ s:1, lm:1 };
      var nf=m.filters&&m.filters.length?Math.max(0.05, Math.min(1, RB.periodUniques(baseSeries({ id:m.ev, filters:m.filters },true))/(RB.periodUniques(baseSeries({ id:m.ev, filters:[] },true))||1))):1;
      function unit(id, kind){ var f=xFx(E, id, ei), L=1+f.l*fmod*gb.lm; if(kind==='bin') return f.p*L; if(kind==='tot') return f.m*L*(X.trim.on?0.9+0.008*Math.min(X.trim.n,10):1);
        var P=NUMP[m.prop]||{ mean:1 }; if(kind==='sum') return f.p*1.3*P.mean*L; return P.mean*(1+f.l*0.5*fmod*gb.lm); }
      var kind=m.type==='uniques'?'bin':m.type==='totals'?'tot':m.type==='propsum'?'sum':m.type==='propavg'?'avg':m.type;
      if(kind==='funnel'){ var st2=(m.steps&&m.steps.length>1)?m.steps:[m.ev,m.ev], rates=st2.map(function(id,i){ if(!i) return xFx(E,id,-1).p; var a=getEv(st2[i-1]), b=getEv(id); return Math.max(.05, Math.min(.9, (b?b.w:1)/((a?a.w:1)||1)*.9)); });
        var lf=1+xFx(E, st2[st2.length-1], ei).l*fmod*gb.lm, steps=rates.map(function(r,i){ return rates.slice(0,i+1).reduce(function(a,b){ return a*b; },1)*(i===rates.length-1?lf:1); });
        for(var k=0;k<=upto;k++){ var nk=V.cnt[k]*gb.s; n+=nk; acc+=nk*steps[steps.length-1]*xGrow(asOf-k); }
        var mm=n?acc/n:0; return { m:mm, v:n?mm*(1-mm)/n:0, n:Math.round(n), x:Math.round(acc*nf), bin:true, steps:steps.map(function(s){ return s*(n?acc/n/steps[steps.length-1]:0); }) }; }
      if(kind==='formula'){ var r=xFormula(m.formula||'', function(fn, letter){ var e=(m.fevs||[])[letter.charCodeAt(0)-65]; if(!e) throw [ 'حرف '+letter+' تعریف نشده', 'Letter '+letter+' is not defined' ];
          var sub2={ ev:e.id, type:fn==='UNIQUES'?'uniques':fn==='TOTALS'?'totals':fn==='PROPSUM'?'propsum':'propavg', prop:e.prop||'', filters:[] };
          if(/^PROP/.test(fn)&&!(RB.PROPS[e.prop]&&RB.PROPS[e.prop].num)) throw [ fn+' ویژگی عددی می‌خواهد (برای '+letter+')', fn+' needs a numeric property (for '+letter+')' ];
          var b=q(sub2, vi, upto, asOf, gb); if(fn==='PROPMAX') return { m:b.m*3.1, v:b.v*9 }; if(fn==='PROPMIN') return { m:b.m*0.2, v:b.v*0.04 };
          if(fn==='PROPCOUNT'){ var nv=(RB.PROPS[e.prop].vals||[]).length; return { m:nv, v:0 }; } if(fn==='PROPCOUNTAVG'){ var u=q({ ev:e.id, type:'uniques', filters:[] }, vi, upto, asOf, gb), nv2=(RB.PROPS[e.prop].vals||[]).length; return { m:u.m*nv2, v:u.v*nv2*nv2 }; }
          return { m:b.m, v:b.v }; });
        var nn=0; for(var k2=0;k2<=upto;k2++) nn+=V.cnt[k2]*gb.s; return { m:r.m, v:r.v, n:Math.round(nn), bin:false, err:r.err }; }
      for(var k3=0;k3<=upto;k3++){ var nk3=V.cnt[k3]*gb.s; n+=nk3; acc+=nk3*unit(m.ev, kind)*(kind==='avg'?1:xGrow(asOf-k3)); }
      var mean=n?acc/n:0;
      if(kind==='bin'){ mean*=nf; return { m:mean, v:n?mean*(1-mean)/n:0, n:Math.round(n), x:Math.round(mean*n), bin:true }; }
      var cv=(kind==='sum'?2.2:kind==='avg'?0.9:xFx(E,m.ev,ei).cv)*(X.trim.on?0.65:1); mean*=nf;
      var nEff=kind==='avg'?n*xFx(E,m.ev,ei).p*1.3:n; return { m:mean, v:nEff?Math.pow(cv*mean,2)/nEff:0, n:Math.round(n), bin:false }; }
    out.q=q;
    var mets=[X.prim].concat(X.sec), T1=X.vars.length-1, S1=X.sec.length;
    out.metrics=mets.map(function(m, mi){ var k=X.method==='bayes'||!X.bonf?1:mi===0?T1:T1*S1;
      var vals=out.vars.map(function(v,vi){ return q(m, vi, K-1, K-1); }), err=vals.filter(function(v){ return v.err; })[0];
      return { m:m, mi:mi, k:Math.max(1,k), vals:vals, err:err&&err.err, tests:vals.map(function(t,vi){ return vi?xTest(vals[0], t, X, Math.max(1,k)):null; }),
        best:X.method==='bayes'&&vals.length>2&&vals.every(function(v){ return v.n>=100; })?xBest(vals.map(function(v){ var a=1,b=1; return v.bin?{ m:(v.x+a)/(v.n+a+b), v:(v.x+a)/(v.n+a+b)*(1-(v.x+a)/(v.n+a+b))/(v.n+a+b+1) }:v; }), X.dir==='dec'):null }; });
    out.state='ok'; return out; }); }
/* experiment formula: UNIQUES/TOTALS/PROPSUM/PROPAVG/PROPMAX/PROPMIN/PROPCOUNT/PROPCOUNTAVG of letters, + − × ÷, numbers, brackets.
   Means and variances combine with the covariance taken as zero, as Amplitude states. */
function xFormula(src, get){
  var s=String(src).replace(/\s+/g,''), i=0, FN=['UNIQUES','TOTALS','PROPSUM','PROPAVG','PROPMAX','PROPMIN','PROPCOUNTAVG','PROPCOUNT'];
  function err(fa_,en_){ throw [fa_,en_]; }
  function expr(){ var a=term(); while(s[i]==='+'||s[i]==='-'){ var o=s[i++], b=term(); a={ m:o==='+'?a.m+b.m:a.m-b.m, v:a.v+b.v }; } return a; }
  function term(){ var a=fac(); while(s[i]==='*'||s[i]==='/'){ var o=s[i++], b=fac(); if(o==='*') a={ m:a.m*b.m, v:b.m*b.m*a.v+a.m*a.m*b.v }; else { if(!b.m) err('تقسیم بر صفر','Division by zero'); a={ m:a.m/b.m, v:a.v/(b.m*b.m)+a.m*a.m*b.v/Math.pow(b.m,4) }; } } return a; }
  function fac(){ if(s[i]==='-'){ i++; var f=fac(); return { m:-f.m, v:f.v }; } if(s[i]==='('){ i++; var e=expr(); if(s[i++]!==')') err('پرانتز بسته نشده','Missing closing bracket'); return e; }
    var mnum=/^\d+(\.\d+)?/.exec(s.slice(i)); if(mnum){ i+=mnum[0].length; return { m:+mnum[0], v:0 }; }
    if(/^\$:REVENUETOTAL/i.test(s.slice(i))) err('سایت خبری دادهٔ درآمد ندارد؛ $:REVENUETOTAL در دسترس نیست','News sites have no revenue data; $:REVENUETOTAL isn’t available');
    var up=s.slice(i).toUpperCase(), fn=FN.filter(function(f){ return up.indexOf(f+'(')===0; })[0]; if(!fn) err('تابع ناشناخته در «'+s.slice(i,i+12)+'»','Unknown function at “'+s.slice(i,i+12)+'”');
    i+=fn.length+1; var L=(s[i]||'').toUpperCase(); if(!/[A-J]/.test(L)) err('بعد از '+fn+' یک حرف ایونت بیاورید','Put an event letter after '+fn); i++; if(s[i++]!==')') err('پرانتز بسته نشده','Missing closing bracket'); return get(fn, L); }
  try{ if(!s) err('فرمول را بنویسید','Write a formula'); var r=expr(); if(i<s.length) err('نویسهٔ اضافه در «'+s.slice(i)+'»','Unexpected “'+s.slice(i)+'”'); return r; }
  catch(e){ return { m:0, v:0, err:Array.isArray(e)?e:['خطا در فرمول','Formula error'] }; } }
/* ── views ── */
function xMetricName(m){ var lm=m.mid&&tMetric(m.mid); if(lm) return T(lm.fa,lm.en);   /* PM 2026-10-30, LX-24: a library metric keeps its name */
  if(m.type==='funnel') return (m.steps||[]).map(evName).join(' → '); if(m.type==='formula') return m.name||m.formula||T('فرمول','Formula'); return evName(m.ev); }
function xFmt(m, v){ if(m.type==='uniques'||m.type==='funnel') return pctTxt(v*100); var P=NUMP[m.prop]; if(m.type==='propsum'||m.type==='propavg') return compact(v)+(P?' '+T(P.fa,P.en):''); return num(v, v<10?2:1); }
function xDelta(m, d){ if(!isFinite(d)) return '∞'; var s=d>0?'+':d<0?'−':''; if(m.type==='uniques'||m.type==='funnel') return s+num(Math.abs(d*100),2)+T(' واحد درصد',' pp'); return s+num(Math.abs(d), Math.abs(d)<10?3:1); }
function xRel(x){ if(!isFinite(x)) return x>0?'+∞':'−∞'; var r=Math.round(x*1000)/10; return '<bdi dir="ltr">'+(r>0?'+':r<0?'−':'')+num(Math.abs(r),1)+'%</bdi>'; }
var XVERD={ pos:['معنادار، بالاتر','Significant, higher','arrow-up'], neg:['معنادار، پایین‌تر','Significant, lower','arrow-down'], inc:['بی‌نتیجه','Inconclusive','minus'] };
function xVerdict(t){ if(t.state==='nodata') return '<span class="rbz-verd nd">'+T('دادهٔ کافی نیست','Not enough data')+'</span>'; if(t.state==='wait') return '<span class="rbz-verd nd">'+T('در انتظار نمونهٔ هدف','Waiting for target sample')+'</span>'; if(t.state==='noexpo') return '<span class="rbz-verd nd">'+T('بدون دیدن آزمایش','No exposures')+'</span>';
  var v=XVERD[t.sig]; return '<span class="rbz-verd '+t.sig+'">'+ic(v[2])+T(v[0],v[1])+'</span>'; }
function xVarName(v, vi){ return '<bdi>'+esc(v.val)+'</bdi>'+(vi===0?' <span class="rbz-tag">'+T('کنترل','Control')+'</span>':''); }
function xMetricRow(m, path, letter, X){
  var h='<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let">'+letter+'</span><button class="rbz-evname" data-xpick="'+path+'" type="button"><span class="rbz-evic">'+(m.type==='funnel'?ic('funnel'):m.type==='formula'?ic('function'):evIcon(m.ev))+'</span><span class="nm">'+esc(xMetricName(m))+'</span><span class="rbz-car">⌄</span></button>'+(path!=='p'?'<button class="rbz-x" data-xdel="'+path+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</div>'+
    '<div class="rbz-fieldrow"><button class="rbz-field" data-xtype="'+path+'" type="button">'+T(XTYPES[m.type][0],XTYPES[m.type][1])+' <span class="car">⌄</span></button>'+
    (m.type==='propsum'||m.type==='propavg'?'<button class="rbz-field" data-xprop="'+path+'" type="button">'+(m.prop&&RB.PROPS[m.prop]?esc(T(RB.PROPS[m.prop].fa,RB.PROPS[m.prop].en)):T('انتخاب ویژگی','Pick a property'))+' <span class="car">⌄</span></button>':'')+'</div>';
  if(m.type==='funnel'){ h+='<div class="rbz-xsteps">'+(m.steps||[]).map(function(id,i){ return '<span class="rbz-chip">'+num(i+1)+'. '+esc(evName(id))+((m.steps||[]).length>2?'<button data-xsdel="'+path+':'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</span>'; }).join('')+'</div><div class="rbz-evacts"><button data-xsadd="'+path+'" type="button">+ '+T('قدم','Step')+'</button></div>'; }
  if(m.type==='formula'){ h+='<div class="rbz-xsteps">'+(m.fevs||[]).map(function(e,i){ return '<span class="rbz-chip"><b>'+LET[i]+'</b> '+esc(evName(e.id))+(e.prop?' · '+esc(T(RB.PROPS[e.prop].fa,RB.PROPS[e.prop].en)):'')+'<button data-xfpr="'+path+':'+i+'" type="button" title="'+T('ویژگی برای توابع PROP','Property for PROP functions')+'">⌄</button>'+((m.fevs||[]).length>1?'<button data-xfedel="'+path+':'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'')+'</span>'; }).join('')+'</div>'+
    '<div class="rbz-evacts"><button data-xfeadd="'+path+'" type="button">+ '+T('ایونت','Event')+'</button></div><input class="sh-input rbz-xformula" data-xformula="'+path+'" dir="ltr" value="'+esc(m.formula||'')+'" placeholder="TOTALS(A)/UNIQUES(B)"/>'; }
  if(m.type!=='funnel'&&m.type!=='formula'){ (m.filters||[]).forEach(function(f,fi){ h+='<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-xfdel="'+path+':'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; });
    h+='<div class="rbz-evacts"><button data-xfadd="'+path+'" type="button">+ '+T('شرط','Where')+'</button></div>';
    if((m.filters||[]).length) h+='<div class="rbz-hint warn">'+ic('warning')+T('این شرط فقط صورت را کم می‌کند و مخرج همهٔ کاربران دیده‌شده است. برای زیرگروه از «فیلتر بر اساس» در واریانت‌ها استفاده کنید.','This condition shrinks only the numerator; the denominator stays all exposed users. For a subset, use “Filter by” under Variants.')+'</div>'; }
  return h+'</div>'; }
var lastExp=null;
function renderExp(){
  var X=A.s8.exp, r=lastS8=lastExp=expCompute(A, { range:RB.Q.range, filters:RB.Q.filters }), E=EXPS[X.key];
  var panel='<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('متریک‌ها','Metrics')+'</span><span class="rbx-tipdot"'+tip(XTIPS.metric[0],XTIPS.metric[1])+'></span></div>'+xMetricRow(X.prim,'p','A',X)+'</div>'+
    '<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('متریک‌های ثانویه','Secondary metrics')+'</span><span class="rbx-tipdot"'+tip(XTIPS.sec[0],XTIPS.sec[1])+'></span></div>'+X.sec.map(function(m,i){ return xMetricRow(m,'s:'+i,LET[i+1],X); }).join('')+
      (X.sec.length<9?'<button class="rbz-add" data-xadd="1" type="button">'+ic('plus')+T('افزودن متریک','Add metric')+'</button>':'')+'</div>'+
    '<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('دیدن آزمایش','Exposure')+'</span><span class="rbx-tipdot"'+tip(XTIPS.expo[0],XTIPS.expo[1])+'></span></div>'+
      '<div class="rbz-ev"><div class="rbz-evrow"><span class="rbz-let">'+ic('eye')+'</span><button class="rbz-evname" data-xexpo="1" type="button"><span class="rbz-evic">'+evIcon(X.expo)+'</span><span class="nm">'+esc(evName(X.expo))+'</span><span class="rbz-car">⌄</span></button></div>'+
      (X.expo==='experiment_viewed'?'<div class="rbz-chip act">'+ic('flask')+'<span>'+T('آزمایش: ','Experiment: ')+'<bdi>'+esc(X.key)+'</bdi></span><button data-xkey="1" type="button" aria-label="'+T('تغییر','Change')+'">⌄</button></div>':'')+
      (X.efilters||[]).map(function(f,fi){ return '<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-xefdel="'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; }).join('')+
      '<div class="rbz-evacts"><button data-xefadd="1" type="button">+ '+T('شرط','Where')+'</button></div></div>'+
      '<div class="rbz-hint">'+ic('info')+T('ایونت و ویژگی‌هایش پیشنهاد شاهین است؛ سایت آن را هنگام نمایش واریانت می‌فرستد.','The event and its properties are Shahin’s proposal; the site sends it when it shows a variant.')+'</div></div>'+
    '<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('واریانت‌ها بر اساس','Variants performed by')+'</span><span class="rbx-tipdot"'+tip(XTIPS.vars[0],XTIPS.vars[1])+'></span></div>'+
      '<div class="rbz-fieldrow"><button class="rbz-field" data-xvprop="1" type="button">'+(RB.PROPS[X.vprop]?esc(T(RB.PROPS[X.vprop].fa,RB.PROPS[X.vprop].en)):esc(X.vprop))+' <span class="car">⌄</span></button></div>'+
      '<div class="rbz-xvars"><div class="rbz-xvh"><span>'+T('مقدار','Value')+'</span><span>'+T('سهم مورد انتظار','Expected share')+'</span></div>'+X.vars.map(function(v,i){ return '<div class="rbz-xvar"><button class="rbz-field" data-xval="'+i+'" type="button"><bdi>'+esc(v.val)+'</bdi>'+(i===0?' <span class="rbz-tag">'+T('کنترل','Control')+'</span>':'')+' <span class="car">⌄</span></button><input class="sh-input" type="number" min="0" step="1" data-xw="'+i+'" value="'+esc(String(v.w))+'" aria-label="'+T('سهم مورد انتظار','Expected share')+'"/>'+(X.vars.length>1?'<button class="rbz-x" data-xvdel="'+i+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button>':'<span></span>')+'</div>'; }).join('')+'</div>'+
      '<button class="rbz-add" data-xvadd="1" type="button">'+ic('plus')+T('افزودن واریانت','Add experiment variant')+'</button>'+
      '<div class="rbz-sub2"><span class="lb">'+T('فیلتر بر اساس','Filter by')+'</span><span class="rbx-tipdot"'+tip(XTIPS.sub[0],XTIPS.sub[1])+'></span></div>'+
      (X.sub||[]).map(function(f,fi){ return '<div class="rbz-chip">'+ic('funnel')+'<span>'+esc(fltLabel(f))+'</span><button data-xsubdel="'+fi+'" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>'; }).join('')+
      '<div class="rbz-evacts"><button data-xsubadd="1" type="button">+ '+T('فیلتر','Filter')+'</button></div>'+
      '<label class="rbz-ck"><input type="checkbox" data-xtrim="1"'+(X.trim.on?' checked':'')+'/> '+T('کنار گذاشتن کاربرانی که ایونت متریک را بیش از','Drop users who did the metric event more than')+' <input class="sh-input rbz-xn" type="number" min="1" max="999" data-xtrimn="1" value="'+X.trim.n+'"'+(X.trim.on?'':' disabled')+'/> '+T('بار انجام داده‌اند','times')+'<span class="rbx-tipdot"'+tip(XTIPS.trim[0],XTIPS.trim[1])+'></span></label></div>'+
    '<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('تحلیل','Analysis')+'</span><span class="rbx-tipdot"'+tip(XTIPS.ana[0],XTIPS.ana[1])+'></span></div>'+
      '<select class="sh-select" data-xana="1">'+[X.prim].concat(X.sec).map(function(m,i){ return '<option value="'+i+'"'+(X.ana===i?' selected':'')+'>'+LET[i]+' · '+esc(xMetricName(m))+(i?'':T(' (اصلی)',' (primary)'))+'</option>'; }).join('')+'</select>'+
      (X.gb?'<div class="rbz-chip grp">'+ic('squares-four')+'<span>'+T('تفکیک: ','Grouped by: ')+esc(T(RB.PROPS[X.gb].fa,RB.PROPS[X.gb].en))+'</span><button data-xgbdel="1" type="button" aria-label="'+T('حذف','Remove')+'">×</button></div>':'<div class="rbz-evacts"><button data-xgb="1" type="button">+ '+T('تفکیک','Group by')+'</button></div>')+'</div>';
  var mth=XMETHOD[X.method], tool='<button class="rbz-pill" id="rbzXStat" type="button">'+ic('gear-six')+T(mth[0],mth[1])+' · '+T('اطمینان '+num(X.conf)+'٪',num(X.conf)+'% confidence')+(X.method!=='bayes'&&X.bonf?' · '+T('بونفرونی','Bonferroni'):'')+'</button>';
  var body;
  if(r.state!=='ok'){
    var msg={ novarprop:[T('ایونت دیدن آزمایش ویژگی واریانت ندارد','The exposure event has no variant property'), T('ایونت experiment_viewed با ویژگی variant را انتخاب کنید؛ واریانت‌ها از مقدار همین ویژگی ساخته می‌شوند.','Pick experiment_viewed with its variant property; variants are built from that property’s values.')],
      onevar:[T('دست‌کم کنترل و یک واریانت لازم است','You need the control and at least one variant'), T('بدون دو واریانت نمودار چیزی نشان نمی‌دهد. از «افزودن واریانت» یکی اضافه کنید.','With fewer than two variants the chart shows nothing. Add one with “Add experiment variant”.')],
      noexpo:[T('در این بازه کسی آزمایش را ندیده','No one saw the experiment in this range'), T('آزمایش «'+(E?E.fa:X.key)+'» از '+(E?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long' }).format(E.start):'')+' شروع شده؛ بازهٔ زمانی را به بعد از آن ببرید.','“'+(E?E.en:X.key)+'” started on '+(E?new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' }).format(E.start):'')+'; move the date range after that.')] }[r.state];
    var cta={ novarprop:'<button class="rbz-linkbtn" data-xexpofix="1" type="button">'+ic('eye')+T('استفاده از دیدن آزمایش','Use Experiment viewed')+'</button>', onevar:'<button class="rbz-linkbtn" data-xvadd="1" type="button">'+ic('plus')+T('افزودن واریانت','Add experiment variant')+'</button>' }[r.state]||'';
    body='<div class="sh-state rbz-empty">'+emptyArt('funnel')+'<div class="sh-state-title">'+msg[0]+'</div><div class="sh-state-hint">'+msg[1]+'</div>'+(cta?'<div class="rbz-emptyacts">'+cta+'</div>':'')+'</div>';
  } else {
    var live=r.vars.filter(function(v){ return v.U>0; }), srm=r.srm;
    body='<div class="rbz-exphealth">'+
      '<span class="rbz-xh">'+ic('users')+T(num(r.U)+' کاربر دیده‌شده',num(r.U)+' exposed users')+'</span>'+
      '<span class="rbz-xh'+(r.jumpers?' warn':'')+'">'+ic('shuffle')+T(num(r.jumpers)+' نفر بیش از یک واریانت دیده‌اند',num(r.jumpers)+' saw more than one variant')+'<span class="rbx-tipdot"'+tip("<span class='tip-title'>جابه‌جایی بین واریانت‌ها</span>کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود، ولی ابزار آزمایش ممکن است بر اساس حساب یا کوکی خودش تقسیم کند؛ خواننده‌ای که با دو دستگاه یا پس از پاک شدن کوکی برگردد ممکن است دو واریانت ببیند. این کاربران در هر واریانتی که دیده‌اند شمرده می‌شوند. افزودهٔ شاهین.","<span class='tip-title'>Variant jumping</span>An anonymous user counts once per device, but your testing tool may split by account or its own cookie; a reader returning on another device or after clearing cookies can see two variants. These users count in every variant they saw. A Shahin addition.")+'></span></span>'+
      (srm?'<span class="rbz-xh '+(srm.bad?'bad':'ok')+'">'+ic(srm.bad?'warning':'check-circle')+(srm.bad?T('عدم تطابق نسبت نمونه (p = '+num(srm.p,4)+')','Sample ratio mismatch (p = '+srm.p.toFixed(4)+')'):T('نسبت نمونه سالم است','Sample ratio is healthy'))+'<span class="rbx-tipdot"'+tip(XTIPS.srm[0],XTIPS.srm[1])+'></span></span>':'')+
      (r.vars.some(function(v){ return !v.U; })?'<span class="rbz-xh warn">'+ic('warning')+T('واریانتی بدون کاربر؛ از آزمون نسبت کنار گذاشته شد','A variant has no users; left out of the ratio check')+'</span>':'')+'</div>'+
      (srm&&srm.bad?'<div class="rbz-note bad">'+ic('warning')+T('تعداد کاربران واریانت‌ها با سهم مورد انتظار نمی‌خواند. پیش از هر تصمیم، تقسیم ترافیک و ارسال ایونت دیدن آزمایش را بررسی کنید.','Users per variant don’t match the expected shares. Check the traffic split and how the exposure event is sent before deciding anything.')+'</div>':'');
    var nCol=6+(r.metrics[0].best?1:0)+(X.method==='ttest'?1:0), mHead='<tr><th>'+T('واریانت','Variant')+'</th><th class="num">'+T('کاربران دیده‌شده','Exposures')+'</th><th class="num">'+T('مقدار مطلق','Absolute value')+'</th><th class="num">'+T('عملکرد نسبی','Relative performance')+'</th><th class="num">'+(X.method==='bayes'?T('بازهٔ باورپذیری','Credible interval'):T('بازهٔ اطمینان','Confidence interval'))+'</th><th class="num">'+(X.method==='bayes'?T('احتمال برتری بر کنترل','Chance to beat control'):T('معناداری','Significance')+'<span class="rbx-tipdot"'+tip(XTIPS.sig[0],XTIPS.sig[1])+'></span>')+'</th>'+(r.metrics[0].best?'<th class="num">'+T('احتمال بهترین بودن','Chance to be best')+'</th>':'')+'<th>'+T('نتیجه','Result')+'</th>'+(X.method==='ttest'?'<th class="num">'+T('دیدن باقی‌مانده','Exposure remaining')+'</th>':'')+'</tr>';
    var rows=r.metrics.map(function(mt){ var m=mt.m;
      var mrow='<tr class="rbz-xmrow"><td colspan="'+nCol+'"><b>'+LET[mt.mi]+'</b> · '+esc(xMetricName(m))+' <span class="rbz-xsubn">'+T(XTYPES[m.type][0],XTYPES[m.type][1])+(mt.mi?'':T(' · متریک اصلی',' · primary metric'))+'</span></td></tr>';
      if(mt.err) return mrow+'<tr><td colspan="'+nCol+'"><span class="rbz-verd nd">'+ic('warning')+T(mt.err[0],mt.err[1])+'</span></td></tr>';
      return mrow+mt.vals.map(function(v,vi){ var t=mt.tests[vi], absTxt=(X.method==='bayes'&&v.bin?'<span title="'+esc(T('میانگین خام: ','Raw mean: ')+xFmt(m, v.m))+'">'+xFmt(m, xPost(v, X))+'</span>':xFmt(m, v.m))+(v.bin&&m.type!=='funnel'?'<div class="rbz-xsubn">'+num(v.x)+' / '+num(v.n)+'</div>':'');
        var ciTxt='—', sigTxt='—', relTxt=vi?xRel(t&&t.rel||0):'—';
        if(t&&t.state==='ok'){ var lo=t.ci[0]/Math.abs(mt.vals[0].m||1), hi=t.ci[1]/Math.abs(mt.vals[0].m||1); ciTxt='<bdi dir="ltr" title="'+esc(xDelta(m,t.ci[0])+' … '+xDelta(m,t.ci[1]))+'">'+xRel(lo)+' … '+xRel(hi)+'</bdi>';
          sigTxt=X.method==='bayes'?pctTxt(t.chance*100):pctTxt(t.signif*100)+(t.k>1&&X.bonf?'<span class="rbx-tipdot"'+tip("<span class='tip-title'>اصلاح بونفرونی</span>p-value اصلاح‌شده: "+num(t.p,4)+" · اصلاح‌نشده: "+num(t.praw,4)+" (ضرب در "+num(t.k)+" مقایسه).","<span class='tip-title'>Bonferroni correction</span>Corrected p-value: "+t.p.toFixed(4)+" · uncorrected: "+t.praw.toFixed(4)+" (multiplied by "+t.k+" comparisons).")+'></span>':''); }
        else if(t&&t.state==='nodata') ciTxt='<span class="rbz-xsubn">'+(v.bin&&mt.vals[0].bin?T('دست‌کم ۲۵ تبدیل و ۱۰۰ کاربر در هر واریانت','≥ 25 conversions and 100 users per variant'):T('دست‌کم ۱۰۰ کاربر در هر واریانت','≥ 100 users per variant'))+'</span>';
        return '<tr class="'+(vi===0?'rbz-xctl':'')+'">'+
          '<td class="rbz-xvn">'+xVarName(r.vars[vi], vi)+'</td><td class="num">'+num(v.n)+'</td><td class="num">'+absTxt+'</td><td class="num">'+relTxt+'</td><td class="num">'+ciTxt+'</td><td class="num">'+sigTxt+'</td>'+(mt.best?'<td class="num">'+pctTxt(mt.best[vi]*100)+'</td>':(r.metrics[0].best?'<td class="num">—</td>':''))+'<td>'+(vi?xVerdict(t):'')+'</td>'+(X.method==='ttest'?'<td class="num">'+num(Math.max(0, X.target-v.n))+'</td>':'')+'</tr>'; }).join(''); }).join('');
    body+='<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('جدول تحلیل','Analysis')+'</span><span class="rbx-spacer"></span><button class="rb-linkbtn" id="rbzCsv" type="button">'+ic('export')+T('خروجی CSV','Export CSV')+'</button></div><div class="sh-table-wrap"><table class="sh-table rbz-table rbz-xtable"><thead>'+mHead+'</thead><tbody>'+rows+'</tbody></table></div></div>';
    if(X.method==='ttest'&&r.vars.some(function(v){ return v.N<X.target; })) body+='<div class="rbz-note">'+ic('hourglass')+T('در تی‌تست، p-value و بازهٔ اطمینان فقط وقتی نمایش داده می‌شوند که هر دو واریانت به '+num(X.target)+' کاربر برسند؛ نگاه کردن زودتر خطای مثبت کاذب را بالا می‌برد.','With a T-test, p-values and intervals appear only once both variants reach '+num(X.target)+' users; looking earlier inflates false positives.')+'</div>';
    /* group by: the analysis metric per subgroup */
    if(X.gb&&RB.PROPS[X.gb]){ var P=RB.PROPS[X.gb], am=[X.prim].concat(X.sec)[X.ana]||X.prim;
      var gr=P.vals.map(function(pv){ var gbo={ s:pv[2], lm:0.5+jitter('xg'+X.gb+pv[1],0) }, vals=r.vars.map(function(v,vi){ return r.q(am, vi, r.K-1, r.K-1, gbo); });
        return '<tr><td class="fix" rowspan="'+(vals.length-1)+'"><bdi>'+esc(T(pv[0],pv[1]))+'</bdi></td>'+vals.slice(1).map(function(v,j){ var t=xTest(vals[0], v, X, r.metrics[X.ana].k); return (j?'<tr>':'')+'<td>'+xVarName(r.vars[j+1], j+1)+'</td><td class="num">'+num(vals[0].n)+' / '+num(v.n)+'</td><td class="num">'+xFmt(am, vals[0].m)+' → '+xFmt(am, v.m)+'</td><td class="num">'+xRel(t.rel)+'</td><td>'+xVerdict(t)+'</td></tr>'; }).join(''); }).join('');
      body+='<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('به تفکیک ','By ')+esc(T(P.fa,P.en))+' · '+esc(xMetricName(am))+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="fix">'+esc(T(P.fa,P.en))+'</th><th>'+T('واریانت','Variant')+'</th><th class="num">'+T('کاربران (کنترل / واریانت)','Users (control / variant)')+'</th><th class="num">'+T('مقدار','Value')+'</th><th class="num">'+T('عملکرد نسبی','Relative')+'</th><th>'+T('نتیجه','Result')+'</th></tr></thead><tbody>'+gr+'</tbody></table></div></div>'+
        '<div class="rbz-hint">'+ic('info')+T('هر زیرگروه یک مقایسهٔ جداست و احتمال نتیجهٔ تصادفی را بالا می‌برد؛ یافتهٔ یک زیرگروه را با آزمایش تازه تأیید کنید.','Each subgroup is a separate comparison and raises the chance of a lucky result; confirm a subgroup finding with a new test.')+'</div>'; }
    var views=[['ci','بازهٔ اطمینان در طول زمان','CI over time'],['cumx','تجمع دیدن آزمایش','Cumulative exposure'],['perf','عملکرد هر واریانت','Performance by variant'],['mean','میانگین در طول زمان','Mean over time']], vt=XTIPS[X.view]||XTIPS.ci;
    body+='<div class="rbz-xviews"><div class="rbz-seg2 sm" role="tablist">'+views.map(function(v){ var on=X.view===v[0]; return '<button type="button" role="tab" aria-selected="'+on+'" class="'+(on?'on':'')+'" data-xview="'+v[0]+'">'+T(v[1],v[2])+'</button>'; }).join('')+'</div><span class="rbx-tipdot"'+tip(vt[0],vt[1])+'></span>'+
      (X.view==='mean'?s8Seg2('data-xcum',[['true','تجمعی','Cumulative'],['false','غیرتجمعی','Non-cumulative']],String(!!X.cum)):'')+'</div>';
    if(X.view==='ci'&&X.method!=='seq') body+='<div class="sh-state rbz-empty sm"><div class="sh-state-title">'+T('این نمودار فقط برای آزمون ترتیبی است','This chart is for sequential testing only')+'</div><div class="sh-state-hint">'+T('بازهٔ اطمینان روز به روز فقط در آزمون ترتیبی معتبر است؛ تی‌تست را نباید پیش از رسیدن به نمونهٔ هدف خواند.','A day-by-day interval is valid only for sequential testing; a T-test must not be read before the target sample.')+'</div><div class="rbz-emptyacts"><button class="rbz-linkbtn" data-xseq="1" type="button">'+ic('arrows-clockwise')+T('برگشت به ترتیبی','Switch to Sequential')+'</button></div></div>';
    else body+='<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div>'+(X.view==='ci'?'<div class="rbz-hint">'+ic('info')+T('بازه‌های روزهای اول خیلی پهن‌اند و بالا و پایین محور آن‌ها را می‌بُرد تا روزهای آخر خوانا بمانند؛ مرز واقعی هر روز در راهنمای نقطه است.','The first days’ intervals are very wide and are cut at the axis so the later days stay readable; each day’s real bounds are in the tooltip.')+'</div>':'');
    body+='<div class="rbz-hint">'+ic('info')+T('کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود. تخمین مدت لازم برای رسیدن به نتیجه در این نمودار نیست. نمودار نتایج آزمایش جدول تفکیک و لینک عمومی ندارد.','An anonymous user counts once per device. There is no time-to-significance estimate on this chart. Experiment results have no breakdown table and no public link.')+'</div>';
  }
  s8Shell(panel, tool, body);
  if(r.state==='ok'&&$('rbzChart')) expChart(r);
}
function expChart(r){
  var X=r.X, B=s8Base(), pal=palette(), am=[X.prim].concat(X.sec)[X.ana]||X.prim, ctlC=B.MU, colr=function(vi){ return vi===0?ctlC:pal[(vi-1)%pal.length]; };
  var labels=r.labels.map(function(l){ return T(l.fa,l.en); }), xAx={ type:'category', inverse:fa(), data:labels, axisLabel:{ color:B.MU, fontFamily:B.FONT, hideOverlap:true }, axisLine:{ lineStyle:{ color:B.BD } } };
  var yAx=function(fmt, o){ return Object.assign({ type:'value', position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:fmt }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } }, o||{}); };
  var grid={ left:fa()?16:64, right:fa()?64:16, top:28, bottom:36, containLabel:false }, legend={ top:0, textStyle:{ color:B.TX, fontFamily:B.FONT }, icon:'roundRect' };
  var isPct=am.type==='uniques'||am.type==='funnel', vfmt=function(v){ return isPct?num(v*100,1)+T('٪','%'):compact(v); };
  if(X.view==='cumx'){
    var series=r.vars.map(function(v,vi){ var acc=0, data=v.cnt.map(function(c){ acc+=c; return acc; }), solid=r.today?data.map(function(x,i){ return i<data.length-1?x:null; }):data, dot=r.today?data.map(function(x,i){ return i>=data.length-2?x:null; }):[];
      var s=[{ name:v.val, type:'line', data:solid, showSymbol:false, lineStyle:{ width:2, color:colr(vi) }, itemStyle:{ color:colr(vi) } }]; if(r.today) s.push({ name:v.val, type:'line', data:dot, showSymbol:false, lineStyle:{ width:2, type:'dotted', color:colr(vi) }, itemStyle:{ color:colr(vi) }, tooltip:{ show:false } }); return s; }).reduce(function(a,b){ return a.concat(b); },[]);
    if(X.method==='ttest') series.push({ name:T('نمونهٔ هدف','Sample size target'), type:'line', data:labels.map(function(){ return X.target; }), showSymbol:false, lineStyle:{ type:'dashed', color:B.MU, width:1 }, itemStyle:{ color:B.MU } });
    s8Chart({ grid:grid, legend:legend, tooltip:B.tip({ trigger:'axis', valueFormatter:function(v){ return v==null?'—':num(v); } }), xAxis:xAx, yAxis:yAx(function(v){ return compact(v); }, { min:0 }), series:series }); return; }
  if(X.view==='perf'){
    if(am.type==='funnel'){ var vals=r.vars.map(function(v,vi){ return r.q(am, vi, r.K-1, r.K-1); }), steps=(am.steps||[]).map(evName);
      s8Chart({ grid:grid, legend:legend, tooltip:B.tip({ trigger:'axis', axisPointer:{ type:'shadow' }, valueFormatter:function(v){ return num(v*100,1)+T('٪','%'); } }), xAxis:Object.assign({}, xAx, { data:steps }), yAxis:yAx(function(v){ return num(v*100)+T('٪','%'); }, { min:0, max:1 }),
        series:vals.map(function(v,vi){ return { name:r.vars[vi].val, type:'bar', barMaxWidth:28, data:v.steps, itemStyle:{ color:colr(vi) } }; }) }); return; }
    var mv=r.vars.map(function(v,vi){ return r.q(am, vi, r.K-1, r.K-1); });
    /* PM 2026-10-25, AC-9: each treatment bar carries the analysis table's confidence interval (control + the CI of the difference); none below
       the floors (100 users, 25 conversions), and the control bar is the reference */
    var civ=mv.map(function(v,vi){ if(!vi) return null; var t=xTest(mv[0], v, X, r.metrics[X.ana].k); if(t.state!=='ok') return null;
      return [vi, isFinite(t.ci[0])?mv[0].m+t.ci[0]:v.m, isFinite(t.ci[1])?mv[0].m+t.ci[1]:v.m]; });
    s8Chart({ grid:grid, tooltip:B.tip({ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:function(p){ var i=p[0].dataIndex, c=civ[i]; return '<b>'+esc(r.vars[i].val)+'</b><br>'+xFmt(am, mv[i].m)+' · '+num(mv[i].n)+T(' کاربر',' users')+
        (c?'<br><span style="color:'+B.MU+'">'+(X.method==='bayes'?T('بازه باورپذیری: ','Credible interval: '):T('بازه اطمینان: ','Confidence interval: '))+'<bdi dir="ltr">'+xFmt(am, c[1])+' … '+xFmt(am, c[2])+'</bdi></span>':i?'<br><span style="color:'+B.MU+'">'+T('بازه اطمینان: داده کافی نیست','Confidence interval: not enough data')+'</span>':''); } }),
      xAxis:Object.assign({}, xAx, { data:r.vars.map(function(v){ return v.val; }) }), yAxis:yAx(vfmt, { min:0 }),
      series:[{ type:'bar', barMaxWidth:44, data:mv.map(function(v,vi){ return { value:v.m, itemStyle:{ color:colr(vi) } }; }), label:{ show:true, position:'top', color:B.TX, fontFamily:B.FONT, formatter:function(p){ return xFmt(am, p.value); } } },
        { type:'custom', name:'ci', silent:true, z:5, tooltip:{ show:false }, data:civ.filter(Boolean), renderItem:function(params, api){ var lo=api.coord([api.value(0), api.value(1)]), hi=api.coord([api.value(0), api.value(2)]), w=Math.min(18, api.size([1,0])[0]*0.2), ln=function(x1,y1,x2,y2){ return { type:'line', shape:{ x1:x1, y1:y1, x2:x2, y2:y2 }, style:{ stroke:B.TX, lineWidth:1.5 } }; };
          return { type:'group', children:[ln(lo[0],lo[1],hi[0],hi[1]), ln(lo[0]-w/2,lo[1],lo[0]+w/2,lo[1]), ln(hi[0]-w/2,hi[1],hi[0]+w/2,hi[1])] }; } }] }); return; }
  if(X.view==='mean'){
    var ser=r.vars.map(function(v,vi){ return { name:v.val, type:'line', showSymbol:r.K<=14, lineStyle:{ width:2, color:colr(vi) }, itemStyle:{ color:colr(vi) }, data:r.labels.map(function(l,k){
      if(X.cum) return +r.q(am, vi, k, r.K-1).m.toFixed(6);
      var one=r.q(am, vi, k, r.K-1), prev=k?r.q(am, vi, k-1, r.K-1):{ m:0, n:0 }, nk=one.n-prev.n; return nk>0?+((one.m*one.n-prev.m*prev.n)/nk).toFixed(6):null; }) }; });
    s8Chart({ grid:grid, legend:legend, tooltip:B.tip({ trigger:'axis', valueFormatter:function(v){ return v==null?'—':xFmt(am, v); } }), xAxis:xAx, yAxis:yAx(vfmt, { min:0 }), series:ser }); return; }
  /* CI over time: sequential bounds on accumulated data, one band per treatment; the zero line is the reference.
     The first days' very wide bands would flatten the rest, so the axis fits the last two thirds; the tooltip keeps the real bounds. */
  var bands=[], ext=[];
  r.vars.forEach(function(v,vi){ if(!vi) return; var lo=[], hi=[], mid=[];
    r.labels.forEach(function(l,k){ var c=r.q(am,0,k,k), t=r.q(am,vi,k,k), tt=xTest(c, t, X, r.metrics[X.ana].k); if(tt.state==='ok'){ lo.push(+tt.ci[0].toFixed(6)); hi.push(+(tt.ci[1]-tt.ci[0]).toFixed(6)); mid.push(+tt.delta.toFixed(6)); } else { lo.push(null); hi.push(null); mid.push(null); } });
    var cl=colr(vi), st='x'+vi;
    bands.push({ name:v.val, type:'line', data:lo, stack:st, stackStrategy:'all', lineStyle:{ opacity:0 }, showSymbol:false, tooltip:{ show:false } },
      { name:v.val, type:'line', data:hi, stack:st, stackStrategy:'all', lineStyle:{ opacity:0 }, areaStyle:{ color:cl, opacity:.18 }, showSymbol:false, tooltip:{ show:false } },
      { name:v.val, type:'line', data:mid, showSymbol:false, lineStyle:{ width:2, color:cl }, itemStyle:{ color:cl }, markLine:vi===1?{ silent:true, symbol:'none', lineStyle:{ color:B.TX, width:1.5 }, label:{ color:B.MU, fontFamily:B.FONT, formatter:num(0) }, data:[{ yAxis:0 }] }:undefined }); ext.push.apply(ext, lo.map(function(x,i){ return i>=lo.length/3&&x!=null?[x, x+hi[i]]:null; }).filter(Boolean)); });
  s8Chart({ grid:grid, legend:Object.assign({}, legend, { data:r.vars.slice(1).map(function(v){ return v.val; }) }), tooltip:B.tip({ trigger:'axis', formatter:function(p){ var k=p[0].dataIndex, h='<b>'+esc(labels[k])+'</b>';
      r.vars.forEach(function(v,vi){ if(!vi) return; var tt=xTest(r.q(am,0,k,k), r.q(am,vi,k,k), X, r.metrics[X.ana].k); h+='<br>'+esc(v.val)+': '+(tt.state==='ok'?xDelta(am, tt.delta)+' ['+xDelta(am, tt.ci[0])+' … '+xDelta(am, tt.ci[1])+']':T('دادهٔ کافی نیست','Not enough data')); }); return h; } }),
    xAxis:xAx, yAxis:yAx(function(v){ return isPct?num(v*100,1)+T(' واحد',' pp'):num(v,2); }, (function(){ if(!ext.length) return { scale:true }; var lo2=Math.min(0, Math.min.apply(null, ext.map(function(e){ return e[0]; }))), hi2=Math.max(0, Math.max.apply(null, ext.map(function(e){ return e[1]; }))), pad=(hi2-lo2)*0.15; return { min:+(lo2-pad).toFixed(6), max:+(hi2+pad).toFixed(6), axisLabel:{ color:B.MU, fontFamily:B.FONT, hideOverlap:true, formatter:function(v){ return isPct?num(v*100,1):num(v,2); } } }; })()), series:bands.map(function(b){ b.clip=true; return b; }) }); }
/* statistical settings (Amplitude's gear → Statistical Method, plus the Experiment preferences the chart reads) */
function expStatModal(){
  var X=A.s8.exp, rad=function(nm, v, cur, fa_, en_, dis){ return '<label class="rbz-rad"><input type="radio" name="'+nm+'" value="'+v+'"'+(cur===v?' checked':'')+(dis?' disabled':'')+'/> '+T(fa_,en_)+'</label>'; };
  U.modal({ fa:'تنظیمات آماری', en:'Statistical settings', subFa:'فقط روی همین نمودار اثر می‌گذارد.', subEn:'Affects this chart only.', wide:true,
    body:'<div class="rbx-field"><label>'+T('روش آماری','Statistical method')+'</label>'+rad('xm','seq',X.method,'ترتیبی (پیش‌فرض؛ نگاه کردن در میانهٔ راه مجاز است)','Sequential (default; peeking is allowed)')+rad('xm','ttest',X.method,'تی‌تست (فقط پس از رسیدن به نمونهٔ هدف خوانده شود)','T-test (read only after the target sample)')+rad('xm','bayes',X.method,'بیزی (احتمال برتری بر کنترل)','Bayesian (chance to beat control)')+'</div>'+
      '<div class="rbx-field"><label>'+T('سطح اطمینان (٪)','Confidence level (%)')+'</label><input class="sh-input" id="rbzXConf" type="number" min="80" max="99" step="1" value="'+X.conf+'"/><span class="rbx-note">'+T('کمتر از ۸۰٪ نه؛ نتیجه دیگر قابل اتکا نیست.','Don’t go below 80%; results stop being reliable.')+'</span></div>'+
      '<label class="rbz-ck"><input type="checkbox" id="rbzXBonf"'+(X.bonf?' checked':'')+(X.method==='bayes'?' disabled':'')+'/> '+T('اصلاح بونفرونی (پیش‌فرض روشن)','Bonferroni correction (on by default)')+'</label><span class="rbx-note">'+T('متریک اصلی بر تعداد واریانت‌ها تقسیم می‌شود و متریک‌های ثانویه بر واریانت‌ها × متریک‌های ثانویه. در روش بیزی خاموش است.','The primary metric is divided by the number of treatments; secondary metrics by treatments × secondary metrics. Off under Bayesian.')+'</span>'+
      '<div class="rbz-xset" data-xfor="ttest"><div class="rbx-field"><label>'+T('آزمون','Test')+'</label>'+rad('xs','2',String(X.sides),'دوطرفه','2-sided')+rad('xs','1',String(X.sides),'یک‌طرفه','1-sided')+'</div>'+
        '<div class="rbx-field"><label>'+T('نمونهٔ لازم برای هر واریانت','Samples per variant needed')+'</label><input class="sh-input" id="rbzXTarget" type="number" min="100" step="100" value="'+X.target+'"/></div></div>'+
      '<div class="rbx-field"><label>'+T('جهت هدف','Goal direction')+'</label>'+rad('xd','inc',X.dir,'افزایش','Increase')+rad('xd','dec',X.dir,'کاهش','Decrease')+'</div>'+
      '<div class="rbz-xset" data-xfor="bayes"><label class="rbz-ck"><input type="checkbox" id="rbzXPrior"'+(X.prior.on?' checked':'')+'/> '+T('پیش‌فرض سفارشی برای متریک‌های تبدیل','Custom prior for conversion metrics')+'</label>'+
        '<div class="rbz-fieldrow"><label>'+T('نرخ قبلی (٪)','Prior rate (%)')+' <input class="sh-input rbz-xn" id="rbzXPm" type="number" min="0.1" max="99" step="0.1" value="'+X.prior.mean+'"/></label><label>'+T('وزن (تعداد کاربر)','Weight (users)')+' <input class="sh-input rbz-xn" id="rbzXPs" type="number" min="2" step="10" value="'+X.prior.str+'"/></label></div>'+
        '<span class="rbx-note">'+T('بدون پیش‌فرض سفارشی، یک کاربر بدون تبدیل ۳۳٫۳٪ نشان داده می‌شود. CUPED در روش بیزی نیست.','Without a custom prior, one exposure and no conversion shows 33.3%. CUPED isn’t available under Bayesian.')+'</span></div>',
    init:function(bd){ function sync(){ var m=bd.querySelector('input[name=xm]:checked').value; bd.querySelectorAll('[data-xfor]').forEach(function(x){ x.hidden=x.getAttribute('data-xfor')!==m; }); var b=bd.querySelector('#rbzXBonf'); b.disabled=m==='bayes'; }
      bd.querySelectorAll('input[name=xm]').forEach(function(x){ x.addEventListener('change', sync); }); sync(); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'اعمال', en:'Apply', fn:function(bd){ var conf=+bd.querySelector('#rbzXConf').value;
      if(!(conf>=80&&conf<=99)){ U.toast('سطح اطمینان باید بین ۸۰ و ۹۹ باشد','Confidence must be between 80 and 99'); return false; }
      X.method=bd.querySelector('input[name=xm]:checked').value; X.conf=conf; X.bonf=bd.querySelector('#rbzXBonf').checked; X.sides=+bd.querySelector('input[name=xs]:checked').value; X.dir=bd.querySelector('input[name=xd]:checked').value;
      X.target=Math.max(100, +bd.querySelector('#rbzXTarget').value||10000); X.prior={ on:bd.querySelector('#rbzXPrior').checked, mean:Math.max(0.1, +bd.querySelector('#rbzXPm').value||2.5), str:Math.max(2, +bd.querySelector('#rbzXPs').value||200) }; changed(); } }] }); }
function xPath(p){ var X=A.s8.exp; return p==='p'?X.prim:X.sec[+p.split(':')[1]]; }
function xSetPath(p, m){ var X=A.s8.exp; if(p==='p') X.prim=m; else X.sec[+p.split(':')[1]]=m; }
/* PM 2026-10-30, LX-24: the picker is the shared library (official ones first, «✓» on them); unsupported types are greyed with the reason.
   «ساختن متریک…» saves to the library (Amplitude: Create Metric at the bottom); «تعریف متریک یک‌باره…» stays single-use, unsaved. */
function xMetricMenu(anchor, onPick){ mtSync(); var X=A.s8.exp, pick=function(mt){ var x=libToX(mt); if(!x) return; mtNoteExp(mt.id, X.key); onPick(x); };
  var lib=T_METRICS.filter(mLive).slice().sort(function(a,b){ return (b.verified?1:0)-(a.verified?1:0); });
  U.menu(anchor, [{ head:1, fa:'کتابخانه متریک‌ها', en:'Metric library' }].concat(lib.map(function(mt){ var why=mtWhy(mt,'exp');
      return { icon:mtIcon(mt), fa:tMName(mt), en:tMName(mt), disabled:!!why, hint:why||[T_MTYPES[mt.type][0],T_MTYPES[mt.type][1]], fn:function(){ pick(mt); } }; }))
    .concat([{ sep:1 },{ icon:'plus', fa:'ساختن متریک…', en:'Create metric…', fn:function(){ tDefineModal({ target:'exp', types:['event','funnel','formula','revenue'], onSaved:function(mt){ if(mt){ pick(mt); changed(); } } }); } },
      { icon:'plus', fa:'تعریف متریک یک‌باره…', en:'Define single-use metric…', fn:function(){ eventPicker(function(id){ onPick({ ev:id, type:'uniques', filters:[] }); }); } }]), 'start'); }
function wireS8c(){
  if(RB.Q.type!=='exp') return;
  var X=A.s8.exp, on=function(attr, fn){ root.querySelectorAll('['+attr+']').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); fn(b.getAttribute(attr), b); }); }); };
  on('data-xpick', function(p, b){ xMetricMenu(b, function(m){ xSetPath(p, m); changed(); }); });
  on('data-xadd', function(v, b){ xMetricMenu(b, function(m){ X.sec.push(m); changed(); }); });
  on('data-xdel', function(p){ X.sec.splice(+p.split(':')[1],1); X.ana=Math.min(X.ana, X.sec.length); changed(); });
  on('data-xtype', function(p, b){ var m=xPath(p), ev=getEv(m.ev), nump=(ev&&ev.props||[]).filter(function(x){ return RB.PROPS[x]&&RB.PROPS[x].num; });
    U.menu(b, Object.keys(XTYPES).map(function(k){ var dis=(k==='propsum'||k==='propavg')&&!nump.length; return { fa:XTYPES[k][0]+(m.type===k?' ✓':''), en:XTYPES[k][1]+(m.type===k?' ✓':''), disabled:dis, hint:dis?['این ایونت ویژگی عددی ندارد','This event has no numeric property']:null,
      fn:function(){ m.type=k; if(k==='funnel'&&!(m.steps&&m.steps.length>1)) m.steps=[m.ev, m.ev==='video_started'?'video_completed':'subscription_started']; if(k==='formula'&&!(m.fevs&&m.fevs.length)){ m.fevs=[{ id:m.ev }]; m.formula='TOTALS(A)'; } if(k==='propsum'||k==='propavg') m.prop=nump[0]; changed(); } }; }).concat([{ sep:1 },{ fa:'ماندگاری', en:'Retention', disabled:true, hint:['این متریک در نتایج آزمایش پشتیبانی نمی‌شود','This metric isn’t supported in experiment results'] }]), 'start'); });
  on('data-xprop', function(p, b){ var m=xPath(p), ev=getEv(m.ev); U.menu(b, (ev&&ev.props||[]).filter(function(x){ return RB.PROPS[x]&&RB.PROPS[x].num; }).map(function(x){ return { fa:pFa(x), en:pEn(x), fn:function(){ m.prop=x; changed(); } }; }), 'start'); });
  on('data-xfadd', function(p){ var m=xPath(p); propFilterModal({ fa:'شرط روی متریک', en:'Metric condition', subFa:'فقط ایونت‌هایی که این شرط را دارند شمرده می‌شوند؛ مخرج تغییر نمی‌کند.', subEn:'Only matching events count; the denominator doesn’t change.' }, propsOf(m.ev), function(f){ (m.filters=m.filters||[]).push(f); changed(); }); });
  on('data-xfdel', function(v){ var a=v.split(':'), p=a.length===3?a[0]+':'+a[1]:a[0], fi=+a[a.length-1]; xPath(p).filters.splice(fi,1); changed(); });
  on('data-xsadd', function(p){ var m=xPath(p); eventPicker(function(id){ m.steps.push(id); changed(); }); });
  on('data-xsdel', function(v){ var a=v.split(':'), p=a.length===3?a[0]+':'+a[1]:a[0]; xPath(p).steps.splice(+a[a.length-1],1); changed(); });
  on('data-xfeadd', function(p){ var m=xPath(p); if((m.fevs||[]).length>=10){ U.toast('حداکثر ۱۰ ایونت','Up to 10 events'); return; } eventPicker(function(id){ m.fevs.push({ id:id }); changed(); }); });
  on('data-xfedel', function(v){ var a=v.split(':'), p=a.length===3?a[0]+':'+a[1]:a[0]; xPath(p).fevs.splice(+a[a.length-1],1); changed(); });
  on('data-xfpr', function(v, b){ var a=v.split(':'), p=a.length===3?a[0]+':'+a[1]:a[0], e=xPath(p).fevs[+a[a.length-1]], ev=getEv(e.id);
    U.menu(b, [{ fa:'بدون ویژگی', en:'No property', fn:function(){ e.prop=''; changed(); } }].concat((ev&&ev.props||[]).map(function(x){ return { fa:RB.PROPS[x].fa+(RB.PROPS[x].num?'':' (غیرعددی)'), en:RB.PROPS[x].en+(RB.PROPS[x].num?'':' (non-numeric)'), fn:function(){ e.prop=x; changed(); } }; })), 'start'); });
  root.querySelectorAll('[data-xformula]').forEach(function(x){ x.addEventListener('change', function(){ xPath(x.getAttribute('data-xformula')).formula=x.value; changed(); }); });
  on('data-xexpo', function(){ eventPicker(function(id){ X.expo=id; if(id!=='experiment_viewed') U.toast('این ایونت ویژگی واریانت ندارد','This event has no variant property'); changed(); }); });
  on('data-xkey', function(v, b){ U.menu(b, Object.keys(EXPS).map(function(k){ return { fa:EXPS[k].fa+' · '+k+(X.key===k?' ✓':''), en:EXPS[k].en+' · '+k+(X.key===k?' ✓':''), fn:function(){ if(X.key===k) return; X.key=k; X.vars=EXPS[k].vars.map(function(v){ return { val:v, w:1 }; }); U.toast('واریانت‌های این آزمایش جایگزین شد','Variants set for this experiment'); changed(); } }; }), 'start'); });
  on('data-xefadd', function(){ propFilterModal({ fa:'شرط روی دیدن آزمایش', en:'Exposure condition', subFa:'هم صورت و هم مخرج را محدود می‌کند.', subEn:'Limits both numerator and denominator.' }, propsOf(X.expo).filter(function(p){ return p!=='experiment_key'&&p!=='variant'; }), function(f){ X.efilters.push(f); changed(); }); });
  on('data-xefdel', function(i){ X.efilters.splice(+i,1); changed(); });
  on('data-xvprop', function(v, b){ var ev=getEv(X.expo); U.menu(b, (ev&&ev.props||[]).map(function(x){ return { fa:pFa(x), en:pEn(x), fn:function(){ X.vprop=x; changed(); } }; }).concat((ev&&ev.props||[]).length?[]:[{ fa:'این ایونت ویژگی اختصاصی ندارد', en:'This event has no own properties', disabled:true }]), 'start'); });
  on('data-xval', function(i, b){ var P=RB.PROPS[X.vprop]; if(!P) return; U.menu(b, P.vals.map(function(pv){ var used=X.vars.some(function(v,j){ return j!==+i&&v.val===pv[1]; }); return { fa:pv[1], en:pv[1], disabled:used, hint:used?['واریانت دیگری همین مقدار را دارد','Another variant uses this value']:null, fn:function(){ X.vars[+i].val=pv[1]; changed(); } }; }), 'start'); });
  root.querySelectorAll('[data-xw]').forEach(function(x){ x.addEventListener('change', function(){ X.vars[+x.getAttribute('data-xw')].w=Math.max(0, +x.value||0); changed(); }); });
  on('data-xvdel', function(i){ X.vars.splice(+i,1); changed(); });
  on('data-xvadd', function(v, b){ var P=RB.PROPS[X.vprop]; if(!P) return; var left=P.vals.filter(function(pv){ return !X.vars.some(function(x){ return x.val===pv[1]; }); });
    if(!left.length){ U.toast('همهٔ مقدارها اضافه شده‌اند','Every value is already added'); return; } U.menu(b, left.map(function(pv){ return { fa:pv[1], en:pv[1], fn:function(){ X.vars.push({ val:pv[1], w:1 }); changed(); } }; }), 'start'); });
  on('data-xsubadd', function(){ propFilterModal({ fa:'فیلتر بر اساس', en:'Filter by', subFa:'هم صورت و هم مخرج را محدود می‌کند؛ روی همهٔ واریانت‌ها یکسان اعمال می‌شود.', subEn:'Limits numerator and denominator; applied to every variant alike.' }, RB.GLOBAL_PROPS, function(f){ X.sub.push(f); changed(); }); });
  on('data-xsubdel', function(i){ X.sub.splice(+i,1); changed(); });
  var tr=root.querySelector('[data-xtrim]'); if(tr) tr.addEventListener('change', function(){ X.trim.on=tr.checked; changed(); });
  var tn=root.querySelector('[data-xtrimn]'); if(tn) tn.addEventListener('change', function(){ X.trim.n=Math.max(1, Math.min(999, +tn.value||10)); changed(); });
  var an=root.querySelector('[data-xana]'); if(an) an.addEventListener('change', function(){ X.ana=+an.value; changed(); });
  on('data-xgb', function(v, b){ U.menu(b, ['device_type','os','browser','referrer_type','is_new_user','city'].map(function(p){ return { fa:pFa(p), en:pEn(p), hint:pHint(p), fn:function(){ X.gb=p; changed(); } }; }), 'start'); });
  on('data-xgbdel', function(){ X.gb=''; changed(); });
  on('data-xview', function(v){ X.view=v; changed(); });
  on('data-xseq', function(){ X.method='seq'; changed(); });
  on('data-xexpofix', function(){ X.expo='experiment_viewed'; X.vprop='variant'; changed(); });
  on('data-xcum', function(v){ X.cum=v==='true'; changed(); });
  var sb=$('rbzXStat'); if(sb) sb.addEventListener('click', expStatModal);
  var st0=$('rbzSet'); if(st0){ var c2=st0.cloneNode(true); st0.parentNode.replaceChild(c2, st0); c2.addEventListener('click', expStatModal); }
  var csv=$('rbzCsv'); if(csv){ var c3=csv.cloneNode(true); csv.parentNode.replaceChild(c3,csv); c3.addEventListener('click', s8Csv); }
}
var renderS8b=renderS8;
renderS8=function(){ if(RB.Q.type==='exp') renderExp(); else renderS8b(); };
var s8TileB=s8Tile;
s8Tile=function(q, ovr, type){ if(type!=='exp') return s8TileB(q, ovr, type);
  var st=norm(clone(q.amp||{})), ctx={ range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) }, R=within(ctx,function(){ return RB.rangeInfo(); }), r=expCompute(st, ctx);
  if(r.state!=='ok') return { val:'—', num:0, sub:T('نتایج آزمایش','Experiment results'), viz:'', rows:[], range:R };
  var mt=r.metrics[0], t=mt.tests[1]||{ state:'nodata' };
  return { val:t.state==='ok'?xRel(t.rel).replace(/<[^>]+>/g,''):'—', num:t.rel||0, sub:xMetricName(mt.m)+' · '+(t.state==='ok'?T(XVERD[t.sig][0],XVERD[t.sig][1]):t.state==='wait'?T('در انتظار نمونهٔ هدف','Waiting for target sample'):T('دادهٔ کافی نیست','Not enough data')), viz:'',
    rows:r.vars.map(function(v,vi){ return [v.val+(vi?'':T(' (کنترل)',' (control)')), xFmt(mt.m, mt.vals[vi].m)]; }), range:R }; };

/* ═════════ PM 2026-10-25, AC-10: Revenue LTV («ارزش طول عمر درآمد», PRD-Advanced-Charts feature 21; decision D-A1 confirmed) ═════════
   Built for projects that send a purchase with an order amount (no «نیازمند توسعه» since LX-6, 2026-10-28); other projects (news) keep it disabled with the data reason.
   The population is the users new in the range, one pooled cohort per segment; day 0 is the first 24 hours after a user's first event.
   Measures: total revenue (cumulative), new paying users (first purchase on that day of age), ARPU (÷ cohort users), ARPPU (÷ users who ever paid).
   Right-censoring: day N leaves out users who started fewer than N days before the range end. Refunds net out, so a curve can dip. Toman, no decimals. */
S8_TYPES.rltv=['ارزش طول عمر درآمد','Revenue LTV','tag'];
function blankS8d(){ return { rltv:{ ev:'purchase', filters:[], meas:'arpu', iv:'day' } }; }
var RLTV_MEAS=[['total','کل درآمد','Total revenue'],['newpay','پرداخت‌کنندگان تازه','New paying users'],['arpu','درآمد هر کاربر (ARPU)','ARPU'],['arppu','درآمد هر پرداخت‌کننده (ARPPU)','ARPPU']];
var RLTV_NO=['این پروژه ایونت خرید با مبلغ سفارش نمی‌فرستد؛ ارزش طول عمر درآمد از همین مبلغ حساب می‌شود.','This project sends no purchase event with an order amount; Revenue LTV is computed from that amount.'];
var RLTV_DEV=['شاهین هنوز ارزش طول عمر درآمد را حساب نمی‌کند؛ عددهای این دمو از ایونت خرید نمونه ساخته شده‌اند.','Shahin doesn’t compute Revenue LTV yet; this demo builds its numbers from the sample purchase event.'];
S8TIPS.rltv=["<span class='tip-title'>ارزش طول عمر درآمد</span>درآمد کاربرانی که در این بازه تازه آمده‌اند، انباشته بر اساس سن هر کاربر از اولین ایونتش (روز ۰ = ۲۴ ساعت اول). مبلغ همان مبلغ سفارش ایونت خرید است و بازگشت وجه از آن کم می‌شود. کاربر ناشناس روی هر دستگاه جدا شمرده می‌شود.","<span class='tip-title'>Revenue LTV</span>Revenue from the users who were new in this range, accumulated by each user’s age since their first event (day 0 = the first 24 hours). The amount is the purchase event’s order amount, net of refunds. An anonymous user counts once per device."];
function rltvHasAmount(id){ var e=RB.evById(id); return !!(e&&e.w>0&&(e.props||[]).indexOf('order_value')>-1); }
function rltvCompute(st, ctx){
  return within(ctx, function(){
    var Lv=st.s8.rltv, R=RB.rangeInfo(), wk=Lv.iv==='week', step=wk?7:1, Dr=Math.max(1,R.days), D=wk?Math.min(12,Math.floor((Dr-1)/7)):Math.min(30,Dr-1), out={ ages:[], segs:[], Dr:Dr, iv:Lv.iv };
    if(!rltvHasAmount(Lv.ev)){ out.noAmount=true; return out; }
    for(var a=0;a<=D;a++) out.ages.push(a);
    var aov=(RB.SUM_AVG&&RB.SUM_AVG.order_value)||533, pe={ id:Lv.ev, filters:Lv.filters||[] }, ne={ id:'_new_user', filters:[] };
    norm(st).segments.forEach(function(sg, si){
      var nu0=RB.periodUniques(baseSeries(ne,true)), sf=segFactor(sg, ne, nu0), nu=Math.max(0, Math.round(nu0*(sf?sf.share:1))), seed=Lv.ev+JSON.stringify(Lv.filters||[])+(sf?sf.seed:'')+si;
      var buy=RB.periodUniques(baseSeries(pe,true)), pInf=Math.min(0.25, Math.max(0.01, 0.5*buy/Math.max(1,nu0)*(sf?sf.tilt:1))), tau=6;
      var payBy=function(day){ return pInf*(1-Math.exp(-(day+1)/tau)); }, rows=[];
      out.ages.forEach(function(a, k){ var day=a*step, elig=Math.round(nu*Math.max(0,(Dr-day)/Dr)), payers=Math.round(elig*payBy(day)), prevPay=k?Math.round(elig*payBy((a-1)*step)):0;
        var orders=payers*(1+0.02*day), refund=jitter(seed+'rf',k)>0.86?0.04:0.01;   /* refunds net out, so the curve can dip */
        var arpu=elig?orders*aov*(1-refund)/elig:null; arpu=arpu==null?null:arpu*(1-0.18*Math.pow(day/Dr,3)*jitter(seed+'cz',k));   /* few users near the right edge */
        var ever=Math.max(1,Math.round(elig*pInf)), tot=arpu==null?null:arpu*elig;
        rows.push({ age:a, elig:elig, total:tot==null?null:Math.round(tot), newpay:Math.max(0,payers-prevPay), arpu:arpu==null?null:Math.round(arpu), arppu:tot==null||!elig?null:Math.max(Math.round(arpu), Math.round(tot/ever)), censored:elig<nu }); });
      /* cohort breakdown: users who started on the same day (the last 7 start days), each with the measure by age */
      var cohorts=[], endD=rangeEnd(R), ff=fa()?new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ day:'numeric', month:'long' }):new Intl.DateTimeFormat('en-US',{ month:'short', day:'numeric' });
      for(var c=Math.min(Dr,7)-1;c>=0;c--){ var size=Math.max(1,Math.round(nu/Dr*(0.85+0.3*jitter(seed+'co',c)))), age0=c;   /* started c days before the range end */
        cohorts.push({ label:ff.format(new Date(endD.getTime()-c*864e5)), size:size, cells:out.ages.map(function(a){ var day=a*step; if(day>age0) return null; var r0=rows[Math.min(rows.length-1,a)], k2=0.85+0.3*jitter(seed+'cc'+c,a);
          return Lv.meas==='total'?Math.round((r0.arpu||0)*size*k2):Lv.meas==='newpay'?Math.round(size*(payBy(day)-(a?payBy((a-1)*step):0))*k2):Lv.meas==='arppu'?Math.round((r0.arppu||0)*k2):Math.round((r0.arpu||0)*k2); }) }); }
      out.segs.push({ name:isDefaultSeg(sg)&&norm(st).segments.length===1?T('کاربران جدید','New users'):segLabel(sg), nu:nu, rows:rows, cohorts:cohorts }); });
    return out; }); }
function rltvFmt(meas, v){ if(v==null) return '—'; return meas==='newpay'?num(v):ltvTxt(v); }   /* amounts are in thousand toman (the store's AOV is 533K), shown as thousand / million toman */
function renderRltv(){
  var Lv=A.s8.rltv, ok=ltvOk(), r=lastS8=ok?rltvCompute(A, { range:RB.Q.range, filters:RB.Q.filters }):{ noAmount:true, ages:[], segs:[] };
  var panel=s8EventModule('rltv',['ایونت درآمد','Revenue event'],'rltv')+'<div class="rbz-mod"><div class="rbz-modh"><span class="t">'+T('سنجش بر اساس','Measured as')+'</span></div>'+
    s8Seg2('data-rlmeas', RLTV_MEAS, Lv.meas)+'</div>';
  var tool=devTag(RLTV_DEV[0],RLTV_DEV[1])+s8Seg2('data-rliv',[['day','روز','Days'],['week','هفته','Weeks']],Lv.iv);
  if(r.noAmount){ s8Shell(panel, tool, '<div class="sh-state rbz-empty">'+emptyArt('ret')+'<div class="sh-state-title">'+T('مبلغ سفارش در دسترس نیست','No order amount')+'</div><div class="sh-state-hint">'+T(RLTV_NO[0],RLTV_NO[1])+'</div></div>'); return; }
  var M=RLTV_MEAS.filter(function(x){ return x[0]===Lv.meas; })[0]||RLTV_MEAS[2], ageLab=function(a){ return Lv.iv==='week'?T('هفته '+num(a),'Week '+a):T('روز '+num(a),'Day '+a); };
  var shown=r.ages.filter(function(a){ return Lv.iv==='week'||[0,1,3,7,14,30].indexOf(a)>-1; });
  var body='<div class="rbz-note">'+ic('info')+T('پایه: کاربرانی که در این بازه تازه آمده‌اند ('+r.segs.map(function(s){ return num(s.nu); }).join('، ')+' نفر). روز N کسانی را که کمتر از N روز پیش از پایان بازه آمده‌اند کنار می‌گذارد، پس ARPU و ARPPU نزدیک لبه راست ممکن است پایین بیایند. بازگشت وجه از درآمد انباشته کم می‌شود، پس منحنی ممکن است افت کند؛ تخفیف درآمد نیست.',
      'Base: the users new in this range ('+r.segs.map(function(s){ return s.nu; }).join(', ')+'). Day N leaves out people who started fewer than N days before the range end, so ARPU and ARPPU can fall near the right edge. Refunds lower cumulative revenue, so a curve can dip; discounts aren’t revenue.')+'</div>'+
    '<div class="rbz-chartbox"><div class="rbz-chart" id="rbzChart"></div></div>'+
    r.segs.map(function(s){ return '<div class="rbz-tablewrap"><div class="rbz-tablehead"><span class="lb">'+T('کوهورت‌ها بر اساس روز شروع','Cohorts by start day')+'</span><span class="rbz-tag">'+esc(s.name)+' · '+T(M[1],M[2])+'</span></div><div class="sh-table-wrap"><table class="sh-table rbz-table"><thead><tr><th class="fix">'+T('روز شروع','Start day')+'</th><th class="num">'+T('کاربران','Users')+'</th>'+
      shown.map(function(a){ return '<th class="num">'+ageLab(a)+'</th>'; }).join('')+'</tr></thead><tbody>'+
      '<tr class="ov"><td class="fix"><b>'+T('همه','All')+'</b></td><td class="num strong">'+num(s.nu)+'</td>'+shown.map(function(a){ var x=s.rows[a]; return '<td class="num strong">'+rltvFmt(Lv.meas, x?x[Lv.meas]:null)+'</td>'; }).join('')+'</tr>'+
      s.cohorts.map(function(c){ return '<tr><td class="fix">'+esc(c.label)+'</td><td class="num">'+num(c.size)+'</td>'+shown.map(function(a){ return '<td class="num">'+rltvFmt(Lv.meas, c.cells[a])+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div></div>'; }).join('');
  s8Shell(panel, tool, body);
  var B=s8Base(), pal=palette(), cats=r.ages.map(ageLab);
  s8Chart({ grid:{ left:72, right:72, top:16, bottom:44 }, legend:{ bottom:0, textStyle:{ color:B.TX, fontFamily:B.FONT } },
    tooltip:B.tip({ trigger:'axis', formatter:function(ps){ return esc(ps[0].axisValueLabel)+'<br>'+ps.map(function(p){ var x=r.segs[p.seriesIndex].rows[p.dataIndex]; return esc(p.seriesName)+' <b>'+rltvFmt(Lv.meas, p.value)+'</b> <span style="color:'+B.MU+'">('+num(x.elig)+T(' کاربر',' users')+(x.censored?T('، بخشی کنار گذاشته شده',', partly censored'):'')+')</span>'; }).join('<br>'); } }),
    xAxis:{ type:'category', inverse:fa(), data:cats, axisLabel:{ color:B.MU, fontFamily:B.FONT, fontSize:11, hideOverlap:true } },
    yAxis:{ type:'value', min:0, position:fa()?'right':'left', axisLabel:{ color:B.MU, fontFamily:B.FONT, formatter:function(v){ return Lv.meas==='newpay'?compact(v):compact(v)+T(' هزار ت',' K T'); } }, splitLine:{ lineStyle:{ color:B.BD, opacity:.6 } } },
    series:r.segs.map(function(s,i){ return { name:s.name, type:Lv.meas==='newpay'?'bar':'line', barMaxWidth:24, symbolSize:5, itemStyle:{ color:pal[i%pal.length] }, lineStyle:{ width:2, color:pal[i%pal.length] }, data:s.rows.map(function(x){ return x[Lv.meas]; }) }; }) }); }
function wireRltv(){ if(RB.Q.type!=='rltv'||!root) return; var S=A.s8.rltv;
  root.querySelectorAll('[data-rlmeas]').forEach(function(b){ b.addEventListener('click', function(){ S.meas=b.getAttribute('data-rlmeas'); changed(); }); });
  root.querySelectorAll('[data-rliv]').forEach(function(b){ b.addEventListener('click', function(){ S.iv=b.getAttribute('data-rliv'); changed(); }); }); }
var renderS8c=renderS8;
renderS8=function(){ if(RB.Q.type==='rltv'){ renderRltv(); wireRltv(); } else renderS8c(); };
var s8TileC=s8Tile;
s8Tile=function(q, ovr, type){ if(type!=='rltv') return s8TileC(q, ovr, type);
  var st=norm(clone(q.amp||{})), ctx={ range:(ovr&&ovr.range)||q.range||'7d', filters:(q.filters||[]).concat((ovr&&ovr.filters)||[]) }, R=within(ctx,function(){ return RB.rangeInfo(); }), r=ltvOk()?rltvCompute(st, ctx):{ noAmount:true };
  if(r.noAmount||!r.segs.length) return { val:'—', num:0, sub:T('ارزش طول عمر درآمد','Revenue LTV'), viz:'', rows:[], range:R };
  var s=r.segs[0], last=s.rows[Math.min(7, s.rows.length-1)];
  return { val:rltvFmt('arpu', last.arpu), num:last.arpu||0, sub:T('درآمد هر کاربر تا ','ARPU by ')+(st.s8.rltv.iv==='week'?T('هفته ','week ')+num(last.age):T('روز ','day ')+num(last.age)), viz:spark(s.rows.map(function(x){ return x.arpu||0; })), rows:[[T('کل درآمد','Total revenue'), rltvFmt('total', last.total)],[T('درآمد هر پرداخت‌کننده','ARPPU'), rltvFmt('arppu', last.arppu)]], range:R }; };

/* ── Chart templates: a picker that prefills an existing chart type, then detaches (26b §6). Only real Shahin events;
   the goal filter and the placement are Shahin's proposal (Amplitude doesn't publish its goal values). ── */
var TPL_GOALS={ know:['شناخت خوانندگان','Know your readers'], convert:['جذب و تبدیل','Convert readers'], retain:['نگه‌داشت','Retain readers'], money:['درآمد','Monetize'] };
var TPLS=[
  { id:'daily_readers', goal:'know', type:'trend', fa:'خوانندگان روزانه', en:'Daily readers', dfa:'کاربرانی که صفحه دیده‌اند، روز به روز.', den:'Users who viewed a page, day by day.', evs:['page_view'], set:function(){ A.events=[{ id:'page_view', filters:[], groupBy:'' }]; A.measure='uniques'; A.interval='day'; } },
  { id:'by_source', goal:'know', type:'trend', fa:'خوانندگان بر اساس منبع ورود', en:'Readers by traffic source', dfa:'بازدید صفحه به تفکیک نوع منبع ورود.', den:'Page views grouped by referrer type.', evs:['page_view'], set:function(){ A.events=[{ id:'page_view', filters:[], groupBy:'referrer_type' }]; A.measure='uniques'; } },
  { id:'no_results', goal:'know', type:'mex', fa:'نرخ جستجوی بی‌نتیجه', en:'Search with no results rate', dfa:'جستجوی بی‌نتیجه تقسیم بر همهٔ جستجوها.', den:'No-result searches divided by all searches.', evs:['search_no_results','search_submitted'], set:function(){ A.mex.metrics=[{ kind:'hybrid', inputs:[{ L:'A', ev:'search_no_results', meas:'totals' },{ L:'B', ev:'search_submitted', meas:'totals' }], sin:[], expr:'%:A/B', filters:[], adv:{ fn:'none', n:7 } }]; } },
  { id:'campaigns', goal:'convert', type:'table', fa:'عملکرد کمپین‌ها', en:'Campaign performance', dfa:'جدول متریک‌ها به تفکیک کمپین UTM.', den:'A data table grouped by UTM campaign.', evs:['page_view'], set:function(){ tSeedUtm('utm_campaign'); } },
  { id:'video_funnel', goal:'convert', type:'funnel', fa:'قیف تکمیل ویدیو', en:'Video completion funnel', dfa:'شروع پخش ← عبور از نقاط ← تماشای کامل.', den:'Playback started → milestone passed → watched to end.', evs:['video_started','video_progress','video_completed'], set:function(){ A.events=['video_started','video_progress','video_completed'].map(function(id){ return { id:id, filters:[], groupBy:'' }; }); } },
  { id:'sub_funnel', goal:'convert', type:'funnel', fa:'تبدیل به اشتراک', en:'Subscription conversion', dfa:'شروع نشست ← شروع خرید اشتراک.', den:'Session start → subscription started.', evs:['session_start','subscription_started'], set:function(){ A.events=['session_start','subscription_started'].map(function(id){ return { id:id, filters:[], groupBy:'' }; }); } },
  { id:'paywall_test', goal:'convert', type:'exp', fa:'نتیجهٔ آزمایش دیوار اشتراک', en:'Paywall test results', dfa:'نرخ خرید اشتراک در واریانت‌های آزمایش (ایونت نمونهٔ پیشنهادی شاهین).', den:'Subscription rate across test variants (Shahin’s proposed sample event).', evs:['experiment_viewed','subscription_started'], set:function(){ A.s8.exp=blankS8c().exp; } },
  { id:'returning', goal:'retain', type:'retention', fa:'خوانندگان بازگشتی', en:'Returning readers', dfa:'چند درصد بازدیدکنندگان هفته‌های بعد برمی‌گردند.', den:'The share of readers who come back in later weeks.', evs:['page_view'], set:function(){ A.events=[{ id:'page_view', filters:[], groupBy:'' },{ id:'page_view', filters:[], groupBy:'' }]; A.ret.iv='week'; } },
  { id:'habit', goal:'retain', type:'stick', fa:'عادت خواندن', en:'Reading habit', dfa:'چند روز در هفته خوانندگان سر می‌زنند.', den:'How many days a week readers come back.', evs:['page_view'], set:function(){ A.s8.stick.ev='page_view'; A.s8.stick.per='week'; } },
  { id:'growth', goal:'retain', type:'life', fa:'تعادل رشد خوانندگان', en:'Reader growth balance', dfa:'جدید، فعلی، بازگشته و غیرفعال‌شده در هر هفته.', den:'New, current, resurrected and dormant readers per week.', evs:['page_view'], set:function(){ A.s8.life.ev='_any_active'; A.s8.life.iv='week'; } },
  { id:'search_impact', goal:'retain', type:'impact', fa:'اثر جستجو روی خواندن', en:'Search and reading', dfa:'بازدید صفحه پیش و پس از اولین جستجو (همبستگی، نه علت).', den:'Page views before and after the first search (correlation, not cause).', evs:['search_submitted','page_view'], set:function(){ A.s8.impact=blankS8b().impact; } },
  { id:'share_paths', goal:'know', type:'flows', fa:'مسیر رسیدن به اشتراک‌گذاری', en:'Paths to sharing', dfa:'کاربران پیش از اشتراک‌گذاری چه کردند.', den:'What readers did before sharing.', evs:['share'], set:function(){ openJourney('share','end'); } },
  { id:'store_funnel', goal:'money', type:'funnel', pack:'ecom', fa:'قیف خرید فروشگاه', en:'Store purchase funnel', dfa:'مشاهدهٔ محصول ← افزودن به سبد ← شروع پرداخت ← خرید (پک فروشگاهی).', den:'Item viewed → added to cart → checkout → purchase (e-commerce pack).', evs:['item_viewed','add_to_cart','begin_checkout','purchase'], set:function(){ A.events=['item_viewed','add_to_cart','begin_checkout','purchase'].map(function(id){ return { id:id, filters:[], groupBy:'' }; }); } },
  { id:'order_value', goal:'money', type:'trend', pack:'ecom', fa:'مجموع مبلغ سفارش', en:'Total order value', dfa:'مجموع مبلغ خریدها در هر روز (پک فروشگاهی).', den:'The sum of order value per day (e-commerce pack).', evs:['purchase'], set:function(){ A.events=[{ id:'purchase', filters:[], groupBy:'' }]; A.measure='prop'; A.prop='order_value'; A.pagg='sum'; } },
  { id:'sub_revenue', goal:'money', type:'trend', fa:'درآمد اشتراک', en:'Subscription revenue', dfa:'مجموع مبلغ اشتراک‌های خریده‌شده.', den:'The sum of subscription amounts.', evs:['subscription_started'], need:['ویژگی «مبلغ» روی «شروع خرید اشتراک» ارسال نمی‌شود','“Subscription started” carries no amount property'] }
];
var TPL_UI={ q:'', goal:'', type:'' };
function tplModal(){
  TPL_UI={ q:'', goal:'', type:'' };   /* every opening starts with the full list */
  var types=TPLS.map(function(t){ return t.type; }).filter(function(t,i,a){ return a.indexOf(t)===i; });
  function tname(t){ var m={ trend:['روند','Trend','chart-line'], funnel:['قیف','Funnel','funnel'], table:['جدول متریک‌ها','Data table','list-bullets'], retention:['ریتنشن','Retention','arrows-clockwise'], flows:['مسیرها','Flows','share-network'], mex:['کاوشگر متریک','Metric explorer','chart-line'] }; return m[t]||[S8_TYPES[t][0],S8_TYPES[t][1],S8_TYPES[t][2]]; }
  function cards(){ var q=TPL_UI.q.trim().toLowerCase(), list=TPLS.filter(function(t){ return (!TPL_UI.goal||t.goal===TPL_UI.goal)&&(!TPL_UI.type||t.type===TPL_UI.type)&&(!q||(t.fa+' '+t.en+' '+t.dfa+' '+t.den).toLowerCase().indexOf(q)>-1); });
    if(!list.length) return '<div class="sh-state rbz-empty sm"><div class="sh-state-title">'+T('قالبی پیدا نشد','No templates found')+'</div><div class="sh-state-hint">'+T('عبارت جستجو یا فیلترها را تغییر دهید.','Change the search or the filters.')+'</div></div>';
    return list.map(function(t){ var tn=tname(t.type), miss=t.need||t.evs.filter(function(id){ return !getEv(id); }).length;
      return '<button class="rbz-tplcard'+(miss?' off':'')+'" data-tpl="'+t.id+'" type="button"'+(miss?' aria-disabled="true"':'')+'><span class="rbz-tplic">'+ic(tn[2])+'</span><span class="rbz-tplbody"><b>'+T(t.fa,t.en)+'</b><span>'+T(t.dfa,t.den)+'</span>'+
        '<span class="rbz-tplmeta"><span class="rbz-tag">'+T(tn[0],tn[1])+'</span><span class="rbz-tag">'+T(TPL_GOALS[t.goal][0],TPL_GOALS[t.goal][1])+'</span>'+(t.pack?'<span class="rbz-tag">'+T('پک فروشگاهی','E-commerce pack')+'</span>':'')+'</span>'+
        (t.need?'<span class="rbz-tplneed">'+ic('warning')+T('نیازمند داده: '+t.need[0],'Needs data: '+t.need[1])+'</span>':'')+'</span></button>'; }).join(''); }
  var md=U.modal({ fa:'قالب‌های نمودار', en:'Chart templates', subFa:'قالب، تعریف نمودار را پر می‌کند؛ بعد از آن نمودار مال شماست و به قالب وصل نمی‌ماند. فقط ایونت‌های واقعی شاهین.', subEn:'A template fills in the chart definition; after that the chart is yours and no longer tied to the template. Real Shahin events only.', wide:true,
    body:'<input class="sh-input" id="rbzTplQ" placeholder="'+T('جستجوی قالب…','Search templates…')+'" value="'+esc(TPL_UI.q)+'"/>'+
      '<div class="rbz-tplfil"><span class="lb">'+T('هدف','Goal')+'<span class="rbx-tipdot"'+tip("<span class='tip-title'>هدف</span>هر نمودار نمونه بر اساس هدفی که به آن کمک می‌کند دسته‌بندی شده است.","<span class='tip-title'>Goal</span>Each example chart is grouped by the goal it helps with.")+'></span></span><div class="rbz-chips">'+[['','همه','All']].concat(Object.keys(TPL_GOALS).map(function(k){ return [k, TPL_GOALS[k][0], TPL_GOALS[k][1]]; })).map(function(g){ return '<button class="rbz-fchip'+(TPL_UI.goal===g[0]?' on':'')+'" data-tplg="'+g[0]+'" type="button">'+T(g[1],g[2])+'</button>'; }).join('')+'</div></div>'+
      '<div class="rbz-tplfil"><span class="lb">'+T('نوع نمودار','Chart type')+'</span><div class="rbz-chips">'+[''].concat(types).map(function(t){ var tn=t?tname(t):['همه','All']; return '<button class="rbz-fchip'+(TPL_UI.type===t?' on':'')+'" data-tplt="'+t+'" type="button">'+T(tn[0],tn[1])+'</button>'; }).join('')+'</div></div>'+
      '<div class="rbz-tplgrid" id="rbzTplGrid">'+cards()+'</div>',
    init:function(bd){ var grid=bd.querySelector('#rbzTplGrid');
      function redraw(){ grid.innerHTML=cards(); wireCards(); bd.querySelectorAll('[data-tplg]').forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-tplg')===TPL_UI.goal); }); bd.querySelectorAll('[data-tplt]').forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-tplt')===TPL_UI.type); }); U.i18n&&U.i18n(); }
      function wireCards(){ grid.querySelectorAll('[data-tpl]').forEach(function(c){ c.addEventListener('click', function(){ var t=TPLS.filter(function(x){ return x.id===c.getAttribute('data-tpl'); })[0];
        if(t.need){ U.toast(T('این قالب داده ندارد: ','This template has no data: ')+T(t.need[0],t.need[1]), T('این قالب داده ندارد: ','This template has no data: ')+t.need[1]); return; }
        if(md&&md.close) md.close(); setTimeout(function(){ tplConfirm(t); }, 180); }); }); }
      bd.querySelector('#rbzTplQ').addEventListener('input', function(e){ TPL_UI.q=e.target.value; grid.innerHTML=cards(); wireCards(); });
      bd.querySelectorAll('[data-tplg]').forEach(function(x){ x.addEventListener('click', function(){ TPL_UI.goal=x.getAttribute('data-tplg'); redraw(); }); });
      bd.querySelectorAll('[data-tplt]').forEach(function(x){ x.addEventListener('click', function(){ TPL_UI.type=x.getAttribute('data-tplt'); redraw(); }); });
      wireCards(); },
    actions:[{ fa:'بستن', en:'Close', ghost:true }] }); }
/* a template replaces the chart's definition: ask first when the open chart already has one (Amplitude starts templates from a new chart) */
function tplConfirm(t){ if(window.RBAmp&&RBAmp.isEmpty()){ applyTpl(t); return; }
  U.modal({ fa:'جایگزینی نمودار فعلی؟', en:'Replace the current chart?', subFa:'تعریف نمودار باز با قالب «'+t.fa+'» جایگزین می‌شود. اگر نمودار را لازم دارید، اول ذخیره‌اش کنید.', subEn:'The open chart’s definition is replaced with the “'+t.en+'” template. Save the chart first if you need it.',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'جایگزین کن', en:'Replace', fn:function(){ applyTpl(t); } }] }); }
/* Amplitude puts «Templates» at the top of the new-chart sidebar; here it heads the left panel of every chart type */
function tplButton(){ var pn=root&&root.querySelector('.rbz-panel'); if(!pn||pn.querySelector('.rbz-tplbtn')) return; var b=document.createElement('button'); b.type='button'; b.className='rbz-tplbtn'; b.innerHTML=ic('copy')+'<span>'+T('قالب‌ها','Templates')+'</span><span class="rbz-tplbtn-sub">'+T('شروع از یک نمودار آماده','Start from a ready chart')+'</span>'; b.addEventListener('click', tplModal); pn.insertBefore(b, pn.firstChild); }
function applyTpl(t){
  var keepSeg=clone(A.segments); A=norm(blank()); A.segments=keepSeg; A.sel=null;
  if(t.type!==RB.Q.type) RB.setType?RB.setType(t.type):(RB.Q.type=t.type);
  RB.Q.type=t.type; t.set(); A.sel=null; SWITCH=null;
  U.toast('قالب «'+t.fa+'» پیاده شد؛ از این به بعد نمودار مال شماست', 'Template “'+t.en+'” applied; the chart is yours from here');
  changed(); renderTabs(); }
/* CSV of the visible table (Amplitude offers Export CSV on these charts) */
function s8Csv(){ var tb=root.querySelector('.rbz-tablewrap table'); if(!tb) return; var q=function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; };
  var lines=[].slice.call(tb.querySelectorAll('tr')).map(function(tr){ return [].slice.call(tr.children).filter(function(c){ return !c.classList.contains('ck'); }).map(function(c){ return q(c.textContent.trim()); }).join(','); });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{ type:'text/csv' })); a.download=RB.Q.type+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400); U.toast('فایل CSV دانلود شد','CSV downloaded'); }
/* empty-state art, in the spirit of Amplitude's blank chart (tokens only, both themes) */
function emptyArt(kind){
  /* PM 2026-10-31, outcome 1: B01 — a flat, dashed baseline waiting for its first data point (the no-events and pre-collection states) */
  if(kind==='noev') return '<svg class="rbz-art" viewBox="0 0 168 96" aria-hidden="true"><path d="M4 88 L164 88" stroke="var(--sh-border-2)" stroke-width="2"/><path d="M4 70 L164 70" fill="none" stroke="var(--sh-c1)" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round" opacity=".55"/><circle cx="124" cy="34" r="20" fill="var(--sh-c1)" opacity=".12"/><path d="M114 34 a10 10 0 0 1 20 0 M118 34 a6 6 0 0 1 12 0" fill="none" stroke="var(--sh-c1)" stroke-width="2.5" stroke-linecap="round"/><circle cx="124" cy="36" r="2.6" fill="var(--sh-c1)"/><path d="M124 40 L124 70" stroke="var(--sh-c1)" stroke-width="2" stroke-dasharray="3 4"/></svg>';
  if(kind==='ret') return '<svg class="rbz-art" viewBox="0 0 168 96" aria-hidden="true"><path d="M6 10 C30 58 52 66 82 70 S140 76 162 77" fill="none" stroke="var(--sh-c1)" stroke-width="3" stroke-linecap="round"/><path d="M6 10 C30 58 52 66 82 70 S140 76 162 77 L162 92 L6 92 Z" fill="var(--sh-c1)" opacity=".12"/><circle cx="6" cy="10" r="4" fill="var(--sh-c1)"/><circle cx="44" cy="62" r="4" fill="var(--sh-c1)"/><circle cx="82" cy="70" r="4" fill="var(--sh-c1)"/><circle cx="122" cy="74" r="4" fill="var(--sh-c1)"/><circle cx="162" cy="77" r="4" fill="var(--sh-c1)"/></svg>';
  if(kind==='funnel') return '<svg class="rbz-art" viewBox="0 0 168 96" aria-hidden="true"><rect x="8" y="16" width="34" height="76" rx="3" fill="var(--sh-c1)" opacity=".85"/><rect x="66" y="16" width="34" height="76" rx="3" fill="var(--sh-c1)" opacity=".18"/><rect x="66" y="40" width="34" height="52" rx="3" fill="var(--sh-c1)" opacity=".85"/><rect x="124" y="16" width="34" height="76" rx="3" fill="var(--sh-c1)" opacity=".18"/><rect x="124" y="62" width="34" height="30" rx="3" fill="var(--sh-c1)" opacity=".85"/></svg>';
  return '<svg class="rbz-art" viewBox="0 0 168 96" aria-hidden="true"><path d="M4 50 L44 14 L72 14 L96 58 L120 30 L164 30 L164 92 L4 92 Z" fill="var(--sh-c1)" opacity=".12"/><path d="M4 50 L44 14 L72 14 L96 58 L120 30 L164 30" fill="none" stroke="var(--sh-c1)" stroke-width="3" stroke-linejoin="round"/><path d="M4 70 L44 46 L72 46 L96 76 L120 54 L164 54 L164 92 L4 92 Z" fill="var(--sh-c1)" opacity=".1"/><path d="M4 70 L44 46 L72 46 L96 76 L120 54 L164 54" fill="none" stroke="var(--sh-c1)" stroke-opacity=".45" stroke-width="3" stroke-linejoin="round"/></svg>';
}

/* ── public API ── */
window.RBAmp={ /* PM 2026-10-30, LX-24: the shared metric field set (the events page's «+ ساختن متریک»), the experiment seeds, the experiments' names,
     and the per-type reasons, so both pages read one definition */
  metricForm:function(o){ var F=mtForm(o||{}); return { html:F.html, wire:F.wire, draft:F.draft, type:F.type, metric:F.metric,
    save:function(bd){ var er=F.check(bd, true); if(er) return { err:er }; return { metric:F.store(bd) }; } }; },
  seedLib:function(){ mtSeedExp(); }, experiments:function(){ var o={}; Object.keys(EXPS).forEach(function(k){ o[k]={ fa:EXPS[k].fa, en:EXPS[k].en }; }); return o; },
  metricWhy:function(mt, surface){ return mtWhy(mt, surface); }, retText:function(c){ return mtRetText(mtRetNorm(clone(c))); },
  replayUrl:replayUrl, dacVal:dacVal, dacMasked:dacMasked, live:liveModal, liveOne:liveOne,
  state:function(){ syncLegacy(); return clone(A); },
  /* PM 2026-10-31, outcome 1: B10 — the Jalali calendar's cap: 93 days on a chart with a filter or a segment (TD-10), else none */
  /* M1 Amplitude parity (2026-11-16): the save dialog's generated name — the chart's events, then its breakdown («A، B بر اساس X») */
  suggestName:function(){ if(!ours()||!A.events.length) return ''; var ev=A.events.map(function(e){ return evName(e.id); }), s=ev.slice(0,3).join(T('، ',', '))+(ev.length>3?T(' و '+num(ev.length-3)+' ایونت دیگر',' and '+(ev.length-3)+' more'):'');
    var g=chartGb().filter(function(p){ return RB.PROPS[p]; }); if(g.length) s+=T(' بر اساس ',' by ')+g.map(function(p){ return T(RB.PROPS[p].fa,RB.PROPS[p].en); }).join(T('، ',', ')); return s; },
  rangeCap:function(){ return ours()&&chartFiltered()?{ days:TD10_MAX, fa:TD10_WHY[0], en:TD10_WHY[1] }:null; },
  load:function(amp, q){ A=norm(amp?clone(amp):(q?fromLegacy(q):blank())); A.sel=A.sel||null; syncLegacy(); sync(); },
  reset:function(){ A=blank(); syncLegacy(); sync(); },
  redraw:function(){ if(ours()&&root&&!root.hidden) render(); },
  openSettings:function(k){ SET_OPEN=k||'root'; render(); },
  exportCsv:function(){ if(!ours()||(root&&root.hidden)) return false; if(isFunnel()) funnelCsv(); else if(isRet()) retCsv(); else if(isJourney()) jCsv(); else if(isTable()) tCsv(); else if(isMex()) mxCsv(); else if(isS8()) s8Csv(); else exportCsv(); return true; },
  isEmpty:function(){ return ours() && (RB.Q.type==='exp'?A.s8.exp.vars.length<2:isS8()?false:isMex()?!A.mex.metrics.length:isTable()?!A.table.cols.length:A.journey.mode==='prop'&&isJourney()?false:!A.events.length); },
  /* shared with the cohort page (rb-amp-cohort.js): the same event picker, property filter and numbers */
  pickEvent:function(cb){ eventPicker(cb); }, evName:evName, evIcon:evIcon, fltLabel:fltLabel, propsOf:propsOf,
  filterModal:function(id, cb){ propFilterModal({ fa:'فیلتر روی «'+evName(id)+'»', en:'Filter on “'+evName(id)+'”', subFa:'فقط ایونت‌هایی که این شرط را دارند شمرده می‌شوند.', subEn:'Only events that match count.' }, propsOf(id), cb); },
  evStats:function(id, range, filters){ return within({ range:range, filters:[] }, function(){ var e={ id:id, filters:filters||[] }; var u=baseSeries(e,true), t=baseSeries(e,false); return { u:RB.periodUniques(u), t:RB.sum(t), daily:u }; }); },
  users:function(n, seed, max){ return sampleUsers(n, seed, max); },
  nump:NUMP, _t:{ credit:tCredit, markov:tMarkov, paths:tPaths, xPost:xPost, xTest:xTest, xSrm:xSrm, xFormula:xFormula, xPhi:xPhi, xPhiInv:xPhiInv }, templates:function(){ return TPLS.map(function(t){ return { id:t.id, type:t.type, goal:t.goal, need:!!t.need, evs:t.evs.slice() }; }); }, applyTemplate:function(id){ var t=TPLS.filter(function(x){ return x.id===id; })[0]; if(t&&!t.need) applyTpl(t); return !!t; }, openTemplates:function(){ tplModal(); },
  /* phase 4 (Decision 7): read-only trend computation for ready dashboards (rb-bridge.js) — the same function the builder draws from */
  funnel:function(st, ctx){ var x=norm(clone(st)), c=ctx||{}, r=fCompute(x, { range:c.range||'7d', filters:c.filters||[], gran:x.interval });
    if(r.empty) return null; return { R:r.R, steps:x.events.map(function(e){ return evName(e.id); }), segs:r.segs.map(function(sg){ return { name:sg.name||'', gval:sg.gval||null, reached:(sg.reached||[]).slice(), conv:sg.conv, med:(sg.med||[]).slice(), medTotal:sg.medTotal }; }) }; },
  computeFor:function(st, ctx){ var x=norm(clone(st)), c=ctx||{}, u0=RB.Q.unit; RB.Q.unit=x.unit==='org'?'org':'users'; var r; try{ r=compute(x, { range:c.range||'7d', filters:c.filters||[], gran:x.interval }); } finally{ RB.Q.unit=u0; }
    var byKey={}; r.series.forEach(function(sr){ byKey[sr.key]=sr; });
    function row(o){ var p=null, base=o.overall&&byKey[o.gid]&&!byKey[o.gid].group?byKey[o.gid]:o; try{ p=r.hist?null:past(x, base, 'prev').total; }catch(e){} return { name:o.name, group:o.group||'', values:(o.values||[]).slice(), total:o.total, prev:p }; }   /* prev: the builder's own «vs. previous period», from the same row its KPI view draws */
    return { R:r.R, labels:r.labels, hist:!!r.hist, buckets:r.buckets||null, overall:r.overall.map(row), series:r.series.map(row) }; },
  _flush:function(){ SEGSH={}; SEGSH_N=0; },
  saveAsMetric:function(){ var e=A.events[0]; if(RB.Q.type!=='trend'||!e){ U.toast('اول یک نمودار روند با یک ایونت بسازید','Build a trend chart with an event first'); return; }
    var nm=T('متریک ','Metric ')+evName(e.id), meas=A.measure==='totals'?'totals':'uniques';
    U.modal({ fa:'ذخیره به‌عنوان متریک', en:'Save as metric', subFa:'ایونت اول و شمارش این نمودار در کتابخانهٔ متریک‌های پروژه ذخیره می‌شود.', subEn:'This chart’s first event and its measure go into the project’s metric library.',
      body:'<label class="rbx-field"><span>'+T('نام','Name')+'</span><input class="sh-input" id="rbzSamN" value="'+esc(nm)+'"/></label>',
      actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var n=bd.querySelector('#rbzSamN').value.trim(); if(!n) return false;
        if(T_METRICS.some(function(x){ return x.fa===n||x.en===n; })){ U.toast('این نام قبلاً استفاده شده','That name is taken'); return false; }
        T_METRICS.push({ id:'m'+(T_METRICS.length+1)+'_'+Date.now()%1000, fa:n, en:n, dFa:'', dEn:'', type:'event', col:{ kind:'ev', ev:e.id, meas:meas, filters:clone(e.filters||[]), ee:'default' }, owner:'me', verified:false }); tMSave();
        U.toast('متریک «'+n+'» در کتابخانه ذخیره شد','Metric “'+n+'” saved to the library'); } }] }); }, /* lexicon b: definitions changed (rb-data-defs.js) */
  /* PM 2026-10-25, AC-13: has this project edited the default channel classifier? The traffic-sources page then groups by '_channel' */
  chanEdited:function(){ return !!chanSaved(); }, chanProp:'_channel',
  /* PM 2026-10-25, RB-3 / AC-7: an event's collection start (a Date, or null), for the dashboard insight card */
  collStart:function(id){ return collStart(id); },
  tile:function(q, ovr, type){ return type==='funnel'?funnelTile(q, ovr):type==='retention'?retTile(q, ovr):type==='flows'?jTile(q, ovr):type==='table'?tTile(q, ovr):type==='mex'?mxTile(q, ovr):isS8(type)?s8Tile(q, ovr, type):tile(q, ovr); }, mex:function(st, ctx){ return mxCompute(norm(clone(st)), ctx); }, s8:function(type, st, ctx){ var x=norm(clone(st)); return type==='exp'?expCompute(x,ctx):type==='impact'?impactCompute(x,ctx):type==='compass'?compassCompute(x,ctx):type==='personas'?personasCompute(x,ctx):type==='stick'?stickCompute(x,ctx):type==='life'?lifeCompute(x,ctx):type==='comp'?compCompute(x,ctx):emxCompute(x,ctx); }, table:function(st, ctx){ return tCompute(norm(clone(st)), ctx); }, journey:function(st, ctx){ return jCompute(norm(clone(st)), ctx); }, retention:function(st, ctx){ return rCompute(norm(clone(st)), ctx); }, compute:compute, funnel:function(st, ctx){ return fCompute(norm(clone(st)), ctx); }
};
mount();
/* Amplitude greys Save on an empty chart; here saving an empty trend report is refused with a hint */
/* PM 2026-10-28, TD-2 + WS-4: the save gate (owner/admin only) and owner-only overwrite live in rb-shell.js onSaveClick, behind this wrapper;
   a member or viewer is refused there first, before the empty-chart checks below. */
if(RBShell.save){ var origSave=RBShell.save; RBShell.save=function(){
  if(RBShell.canSaveChart&&!RBShell.canSaveChart()) return origSave.apply(this, arguments);   /* PM 2026-10-28, TD-2: the shell gives the role reason, not «add an event» */
  if(RB.Q.type==='trend' && !A.events.length){ U.toast('اول یک ایونت اضافه کنید','Add an event first'); return; }
  if(RB.Q.type==='funnel' && A.events.length<2){ U.toast('قیف حداقل دو قدم می‌خواهد','A funnel needs at least two steps'); return; }
  if(RB.Q.type==='retention' && !A.events.length){ U.toast('اول ایونت شروع را انتخاب کنید','Pick a starting event first'); return; }
  if(RB.Q.type==='exp' && A.s8.exp.vars.length<2){ U.toast('دست‌کم کنترل و یک واریانت لازم است','Add the control and at least one variant'); return; }
  if(RB.Q.type==='mex' && !A.mex.metrics.length){ U.toast('اول یک متریک اضافه کنید','Add a metric first'); return; }
  if(RB.Q.type==='table' && !A.table.cols.length){ U.toast('اول یک ستون اضافه کنید','Add a column first'); return; }
  if(RB.Q.type==='flows' && A.journey.mode!=='prop' && (!A.events.length || (A.journey.type==='between' && A.events.length<2))){ U.toast('اول ایونت مسیر را انتخاب کنید','Pick the path’s event first'); return; }
  return origSave.apply(this, arguments); }; }
document.addEventListener('rb:boot', function(){ sync();
  /* deep link from the «سفر کاربر» page: ?type=flows&jstart=<event>&jexp=<property> opens Journeys anchored on that event */
  var qs=new URLSearchParams(location.search), js=qs.get('jstart');
  /* deep link from the UTM / referrer pages: ?type=table&tgb=<property> opens their table as a Data Table */
  if(qs.get('type')==='table' && qs.get('tgb') && RB.PROPS[qs.get('tgb')]) setTimeout(function(){ tSeedUtm(qs.get('tgb')); A.sel=null; changed(); }, 60);
  if(js && getEv(js)) setTimeout(function(){ openJourney(js); var ex=qs.get('jexp'); if(ex && RB.PROPS[ex]){ A.journey.expand=[{ ev:js, prop:ex }]; changed(); } }, 60); });
document.addEventListener('shahin:lang', function(){ setTimeout(function(){ if(root&&!root.hidden){ renderTabs(); render(); } else if(tabs) renderTabs(); }, 80); });
window.addEventListener('resize', function(){ if(chart) chart.resize(); });
})();
