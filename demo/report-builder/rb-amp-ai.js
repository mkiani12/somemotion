/* ═════════ AI that writes (phase 3, step 11b-1) — v12 only ═════════
   Amplitude Global Agent: "Build charts from natural language requests" and "Modify existing charts (change time ranges, add
   filters, switch metrics)". Spec: research-notes/…/31-amplitude-ai-spec.md (I10, I11, I15, I26). PM decisions 2026-10-18:
   - every assistant write is labelled «نقشهٔ راه» (PRD-Global-Agent keeps writes out of the MVP) and goes preview → confirm → Undo;
   - an edit to the open chart lands on that chart as an unsaved change; the saved report changes only on Save;
   - a new chart lands in the personal space, flagged as generated (Amplitude: personal space, undiscoverable by default);
   - an alert from the assistant is two-step: the proposal, then the normal alert form; nothing goes live without it
     (PRD-MCP-Server's rule);
   - writes stay out of the shared «دستیار» panel (assets/shahin-ask.js); this composer is the report builder's own.
   Answers are scripted: a keyword router, deterministic by construction.
   PM 2026-10-28, AL-3: the alert proposal says daily alerts arrive by 08:00 Tehran (no send-hour choice).
   PM 2026-10-28, TD-2: only the project owner and admins save charts, so for a member the assistant opens its chart unsaved. */
(function(){
'use strict';
if(!window.RBShell || !RBShell.nb || !window.RBAmp) return;
var U=RBShell.ui, T=U.T, esc=U.esc, ic=U.ic, tip=U.tip, NB=RBShell.nb;
/* PM 2026-10-28, TD-2: chart saving is for the project owner and admins for now (provisional, until the access-level redesign) */
function canSaveChart(){ var L=RBShell.lib; return !L || !L.isProjAdmin || L.isProjAdmin(); }
function $(id){ return document.getElementById(id); }
function fa(){ return document.documentElement.lang!=='en'; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function num(n){ return U.N?U.N(n):String(n); }
function arrow(){ return fa()?' ← ':' → '; }

var GRAN={ day:['روزانه','Daily'], week:['هفتگی','Weekly'], month:['ماهانه','Monthly'], auto:['خودکار','Auto'], hour:['ساعتی','Hourly'], quarter:['فصلی','Quarterly'] };
var VIZ={ line:['خطی','Line'], area:['ناحیه‌ای انباشته','Stacked area'], bar:['میله‌ای','Bar'], stackbar:['میله‌ای انباشته','Stacked bar'], pie:['دایره‌ای','Pie'], kpi:['عدد','Number'], table:['جدول','Table'] };
var MEAS={ uniques:['کاربران','Users'], totals:['تعداد کل','Event totals'] };
/* keyword → property; the breakdown fires only after «بر اساس / به تفکیک / by» */
var GB=[[/(دستگاه|device)/,'device_type'],[/(مرورگر|browser)/,'browser'],[/(سیستم.?عامل|\bos\b)/,'os'],[/(شهر|city)/,'city'],[/(کشور|country)/,'country'],
  [/(کمپین|campaign)/,'utm_campaign'],[/(منبع|ورودی|referr|source)/,'referrer_type'],[/(جدید.*بازگشتی|بازگشتی.*جدید|new vs|returning)/,'is_new_user']];
var FL=[[/(موبایل|mobile)/,'device_type','Mobile'],[/(دسکتاپ|desktop)/,'device_type','Desktop'],[/(تبلت|tablet)/,'device_type','Tablet'],
  [/(تهران|tehran)/,'city','Tehran'],[/(مشهد|mashhad)/,'city','Mashhad'],[/(اصفهان|isfahan)/,'city','Isfahan'],
  [/(اندروید|android)/,'os','Android'],[/(آیفون|\bios\b)/,'os','iOS'],[/(ارگانیک|organic)/,'referrer_type','Organic'],[/(شبکه.?های? اجتماعی|social)/,'referrer_type','Social']];
/* event keywords for a new chart; «اشتراک‌گذاری» is tested before «اشتراک» */
var EVK=[[/(اشتراک.?گذاری|share)/,'share',['اشتراک‌گذاری','Shares']],[/(ویدیو|پخش|تماشا|video|watch)/,'video_started',['شروع پخش ویدیو','Video starts']],
  [/(اشتراک|مشترک|subscri)/,'subscription_started',['شروع اشتراک','Subscription starts']],[/(جستجو|search)/,'search_submitted',['جستجو','Searches']],
  [/(فرم|form)/,'form_submitted',['ثبت فرم','Form submissions']],[/(بازدید|خواننده|خواندن|صفحه|read|page|visit)/,'page_view',['خوانندگان','Readers']]];

function normTxt(s){ return String(s||'').toLowerCase().replace(/[۰-۹]/g, function(d){ return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[٠-٩]/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/‌/g,' '); }
function propLbl(p){ var P=RB.PROPS[p]; return P?T(P.fa,P.en):p; }
/* PM 2026-10-25, LX-15: the assistant answers by the asker's role — a Personal or Sensitive value reads «[محدود] #code» for a
   member, through the builder's own Data Access Control (RBAmp.dacVal). lang forces one language for the bilingual titles. */
function valLbl(p, v, lang){ var P=RB.PROPS[p], row=P&&P.vals.filter(function(x){ return x[1]===v; })[0];
  if(window.RBAmp&&RBAmp.dacMasked&&RBAmp.dacMasked([p])) return RBAmp.dacVal(p, row||v);
  return row?(lang==='fa'?row[0]:lang==='en'?row[1]:T(row[0],row[1])):v; }
function evLbl(id){ var e=RB.evById(id); return e?T(e.fa,e.en):id; }

/* read modifiers shared by "create" and "edit" */
function mods(t){
  var o={ gb:null, flt:[], iv:null, viz:null, meas:null, clearGb:false, clearFlt:false };
  if(/(هفتگی|هفته ای|weekly|by week)/.test(t)) o.iv='week'; else if(/(ماهانه|monthly|by month)/.test(t)) o.iv='month'; else if(/(روزانه|daily|by day)/.test(t)) o.iv='day';
  if(/(بر اساس|به تفکیک|تفکیک|بشکن|\bby\b|break ?down|group)/.test(t)) GB.some(function(g){ if(g[0].test(t)){ o.gb=g[1]; return true; } return false; });
  FL.forEach(function(f){ if(f[0].test(t) && o.gb!==f[1] && !o.flt.some(function(x){ return x.prop===f[1]; })) o.flt.push({ prop:f[1], op:'in', vals:[f[2]] }); });
  if(/(میله|bar)/.test(t)) o.viz='bar'; else if(/(ناحیه|area)/.test(t)) o.viz='area'; else if(/(دایره|pie)/.test(t)) o.viz='pie'; else if(/(خطی|line chart|as a line|to a line)/.test(t)) o.viz='line';
  if(/(تعداد کل|مجموع|totals?\b|event count)/.test(t)) o.meas='totals'; else if(/(کاربران یکتا|unique|بر حسب کاربر|per user count)/.test(t)) o.meas='uniques';
  if(/(بدون تفکیک|حذف (گروه|تفکیک)|remove (the )?(breakdown|group))/.test(t)) o.clearGb=true;
  if(/(بدون فیلتر|حذف فیلتر|remove (the )?filter|clear filter)/.test(t)) o.clearFlt=true;
  return o; }
function alertIntent(t){
  if(!/(هشدار|خبرم کن|خبر بده|اطلاع بده|alert|notify|let me know)/.test(t)) return null;
  var m=t.match(/(کمتر|پایین|زیر|افت|below|under|drops?|falls?)[^0-9]*([0-9][0-9,]*)/), a={ cond:'below', val:null, freq:/(ساعتی|hourly|every hour)/.test(t)?'hour':'day' };
  if(!m){ m=t.match(/(بیشتر|بالا|بیش از|above|over|exceeds?|rises?)[^0-9]*([0-9][0-9,]*)/); if(m) a.cond='above'; }
  if(m) a.val=+m[2].replace(/,/g,'');
  return a; }

/* ── the plan for an edit to the open chart ── */
function editPlan(text){
  var t=normTxt(text), type=RB.Q.type, st=RBAmp.state(), o=mods(t), ch=[], skip=[], al=alertIntent(t);
  if(al) return { kind:'alert', a:al };
  var trend=type==='trend', seg=st.segments&&st.segments[0];
  if(o.iv){ if(trend){ if(st.interval!==o.iv) ch.push({ k:'iv', v:o.iv, fa:'بازه: '+GRAN[st.interval||'auto'][0]+arrow()+GRAN[o.iv][0], en:'Interval: '+GRAN[st.interval||'auto'][1]+arrow()+GRAN[o.iv][1] }); }
    else skip.push(['بازهٔ زمانی این نوع نمودار از تنظیمات خودش عوض می‌شود.','This chart type sets its interval in its own settings.']); }
  if(o.clearGb){ ch.push({ k:'gb', v:'', fa:'گروه‌بندی: حذف', en:'Breakdown: removed' }); }
  else if(o.gb){ var cur=trend?((st.events[0]||{}).groupBy||''):(st.groupSeg||'');
    if(cur!==o.gb) ch.push({ k:'gb', v:o.gb, fa:'گروه‌بندی: '+(cur?propLbl(cur):'—')+arrow()+propLbl(o.gb), en:'Breakdown: '+(cur?propLbl(cur):'—')+arrow()+propLbl(o.gb) }); }
  if(o.clearFlt){ if(seg&&seg.filters.length) ch.push({ k:'fclr', fa:'فیلترهای بخش: حذف همه', en:'Segment filters: all removed' }); }
  o.flt.forEach(function(f){ var has=seg&&seg.filters.some(function(x){ return x.prop===f.prop && (x.vals||[]).indexOf(f.vals[0])>-1; });
    if(!has) ch.push({ k:'f', v:f, fa:'فیلتر: + '+propLbl(f.prop)+' = '+valLbl(f.prop,f.vals[0]), en:'Filter: + '+propLbl(f.prop)+' = '+valLbl(f.prop,f.vals[0]) }); });
  if(o.viz){ if(trend){ if(st.viz!==o.viz) ch.push({ k:'viz', v:o.viz, fa:'نمایش: '+VIZ[st.viz||'line'][0]+arrow()+VIZ[o.viz][0], en:'Visualization: '+VIZ[st.viz||'line'][1]+arrow()+VIZ[o.viz][1] }); }
    else skip.push(['شکل نمایش فقط در نمودار روند عوض می‌شود.','Only Trend charts switch visualization.']); }
  if(o.meas){ if(trend){ if(st.measure!==o.meas) ch.push({ k:'meas', v:o.meas, fa:'شمارش: '+(MEAS[st.measure]||['—'])[0]+arrow()+MEAS[o.meas][0], en:'Measured as: '+(MEAS[st.measure]||['—','—'])[1]+arrow()+MEAS[o.meas][1] }); }
    else skip.push(['نوع شمارش در این نمودار از تنظیمات خودش عوض می‌شود.','This chart sets its counting in its own settings.']); }
  return { kind:'edit', ch:ch, skip:skip }; }
function applyEdit(st, ch){
  ch.forEach(function(c){
    if(c.k==='iv') st.interval=c.v;
    else if(c.k==='viz') st.viz=c.v;
    else if(c.k==='meas') st.measure=c.v;
    else if(c.k==='gb'){ if(RB.Q.type==='trend') st.events.forEach(function(e){ e.groupBy=c.v; }); else st.groupSeg=c.v; }
    else if(c.k==='fclr') st.segments[0].filters=[];
    else if(c.k==='f'){ var fl=st.segments[0].filters, same=fl.filter(function(x){ return x.prop===c.v.prop; })[0]; if(same) same.vals=c.v.vals.slice(); else fl.push(clone(c.v)); }
  });
  st.sel=null; return st; }

/* ── the plan for a new chart ── */
function createPlan(text){
  var t=normTxt(text), o=mods(t), type=/(قیف|funnel|ریزش|drop.?off)/.test(t)?'funnel':/(نگهداشت|برمی گرد|بازگشت|برگشت|retention|come back|return)/.test(t)?'retention':'trend';
  var hit=null, assume=[];
  EVK.some(function(e){ if(e[0].test(t)){ hit=e; return true; } return false; });
  if(!hit){ hit=EVK[EVK.length-1]; assume.push(['ایونت مشخصی در سؤال نبود؛ «بازدید صفحه» گذاشته شد.','No event was named; “Page view” was used.']); }
  var ev=hit[1], amp, E=RB.evById(ev), title=ev==='page_view'||!E?hit[2].slice():[E.fa,E.en];   /* the engine's own event name, so titles don't drift from the picker */
  if(type==='funnel'){ var first=ev==='session_start'||ev==='page_view'?'session_start':'page_view'; if(ev==='page_view') ev='subscription_started';
    amp={ events:[{ id:first, filters:[], groupBy:'' },{ id:ev, filters:[], groupBy:'' }], funnel:{ count:'uniques' }, groupSeg:o.gb||'' };
    title=['قیف «'+evLbl(first)+'» تا «'+evLbl(ev)+'»','Funnel: '+evLbl(first)+' to '+evLbl(ev)];
    if(hit[1]==='page_view') assume.push(['قیف دو قدم می‌خواهد؛ قدم پایانی «شروع اشتراک» گذاشته شد.','A funnel needs two steps; “Subscription started” was used as the last step.']); }
  else if(type==='retention'){ amp={ events:[{ id:ev, filters:[], groupBy:'' },{ id:ev, filters:[], groupBy:'' }], groupSeg:o.gb||'' };
    title=['بازگشت '+hit[2][0],'Return: '+hit[2][1]]; assume.push(['ایونت شروع و بازگشت یکی گرفته شد.','The same event is used to start and to return.']); }
  else { amp={ events:[{ id:ev, filters:[], groupBy:o.gb||'' }], measure:o.meas||'uniques', viz:o.viz||'line', interval:o.iv||'day' };
    if(o.iv && o.iv!=='day') title=[title[0]+' — '+GRAN[o.iv][0], title[1]+' — '+GRAN[o.iv][1]]; }
  amp.segments=[{ who:'any', label:'', filters:o.flt.map(clone), performed:null, cohort:'' }];
  if(o.gb){ title=[title[0]+' به تفکیک '+RB.PROPS[o.gb].fa, title[1]+' by '+RB.PROPS[o.gb].en]; }
  if(o.flt.length){ title=[title[0]+' — فقط '+o.flt.map(function(f){ return valLbl(f.prop,f.vals[0],'fa'); }).join('، '), title[1]+' — '+o.flt.map(function(f){ return valLbl(f.prop,f.vals[0],'en'); }).join(', ')+' only']; }   /* LX-15: masked like every value */
  if(type!=='trend' && (o.viz||o.iv)) assume.push(['شکل نمایش و بازه فقط در نمودار روند اعمال می‌شوند.','Visualization and interval apply to Trend charts only.']);
  /* PM 2026-10-28, TD-2: a member or viewer gets the chart opened, unsaved */
  assume.push(canSaveChart()?['بازه: ۷ روز گذشته؛ نمودار در فضای شخصی شما ذخیره می‌شود.','Range: last 7 days; the chart is saved to your personal space.']:
    ['بازه: ۷ روز گذشته؛ نمودار باز می‌شود ولی ذخیره نمی‌شود، چون ذخیره نمودار فعلا فقط برای مالک و ادمین پروژه است.','Range: last 7 days; the chart opens but isn’t saved, because saving charts is for the project owner and admins for now.']);
  var spec=[[ 'نوع', 'Type', type==='funnel'?T('قیف','Funnel'):type==='retention'?T('نگهداشت','Retention'):T('روند','Trend') ],
    [ 'ایونت', 'Events', amp.events.map(function(e){ return evLbl(e.id); }).filter(function(x,k,a){ return a.indexOf(x)===k; }).join(' ← ') ]];
  if(type==='trend') spec.push(['شمارش','Measured as',T(MEAS[amp.measure][0],MEAS[amp.measure][1])],['نمایش','Visualization',T(VIZ[amp.viz][0],VIZ[amp.viz][1])+' · '+T(GRAN[amp.interval][0],GRAN[amp.interval][1])]);
  if(o.gb) spec.push(['گروه‌بندی','Breakdown',propLbl(o.gb)]);
  o.flt.forEach(function(f){ spec.push(['فیلتر','Filter',propLbl(f.prop)+' = '+valLbl(f.prop,f.vals[0])]); });
  return { kind:'create', type:type, amp:amp, title:title, assume:assume, spec:spec }; }

/* ── undo toast: Shahin.toast has no action, so the builder keeps its own ── */
var utEl=null, utTimer=null;
function undoToast(fa_, en_, undo){
  if(utEl) utEl.remove(); clearTimeout(utTimer);
  utEl=document.createElement('div'); utEl.className='rai-toast'; utEl.setAttribute('role','status');
  utEl.innerHTML='<span>'+ic('sparkle')+esc(T(fa_,en_))+'</span><button class="sh-btn ghost compact" type="button" data-rai="undo">'+T('برگرداندن','Undo')+'</button><button class="rai-tx" type="button" aria-label="close">×</button>';
  document.body.appendChild(utEl);
  var el=utEl; function gone(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); if(utEl===el) utEl=null; }, 160); }
  el.querySelector('[data-rai=undo]').addEventListener('click', function(){ gone(); undo(); });
  el.querySelector('.rai-tx').addEventListener('click', gone);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  utTimer=setTimeout(gone, 9000); }

var SUGG={
  edit:[['هفتگی‌اش کن','Make it weekly'],['بر اساس نوع دستگاه بشکنش','Break it down by device type'],['فقط موبایل','Mobile only'],['وقتی زیر ۵۰۰ رفت خبرم کن','Alert me when it drops below 500']],
  chart:[['خوانندگان روزانه به تفکیک منبع ورود','Daily readers by traffic source'],['قیف بازدید تا شروع اشتراک','Funnel from visit to subscription'],['شروع پخش ویدیو فقط موبایل، هفتگی','Video starts on mobile only, weekly'],['بازگشت خوانندگان','Reader return']],
  /* the same four questions as the empty-dashboard prompt (11a) */
  board:[['خوانندگان این هفته چه می‌خوانند و از کجا می‌آیند؟','What are readers reading this week, and where from?'],['چند خواننده مشترک شدند و از کجا آمدند؟','How many readers subscribed, and where from?'],['خوانندگان دوباره برمی‌گردند؟','Do readers come back?'],['ویدیوهای خبری چقدر تماشا می‌شوند؟','How much are news videos watched?']],
  cohort:[['کسانی که در ۷ روز اخیر دست‌کم ۳ بار اشتراک‌گذاری کرده‌اند','People who shared at least 3 times in the last 7 days'],['خوانندگان موبایل تهران در ۳۰ روز اخیر','Mobile readers in Tehran in the last 30 days'],['کسانی که ویدیو را کامل تماشا کرده‌اند','People who watched a video to the end']],
  bedit:[['یک جمع‌بندی بالای داشبورد اضافه کن','Add a summary at the top'],['کارت قیف را بردار','Remove the funnel card'],['نمودار جستجو را اضافه کن','Add the search chart'],['کارت‌ها را تمام‌عرض کن','Make the cards full width'],['اسمش را بگذار «ویدیو در یک نگاه»','Rename it to “Video at a glance”']],
  nedit:[['یک جمع‌بندی از نمودارها آخرش بنویس','Write a summary of the charts at the end'],['نمودار قیف را اضافه کن','Add the funnel chart'],['سرتیتر «یافته‌های این هفته» بگذار','Add the header “This week’s findings”'],['نمودار ویدیو را بردار','Remove the video chart']]
};
var ROAD=['<span class=\'tip-title\'>نقشهٔ راه</span>ساختن و ویرایش با دستیار در برنامهٔ آیندهٔ شاهین است. هر تغییر پیش از اعمال، پیش‌نمایش و تأیید می‌خواهد و برگشت‌پذیر است.','<span class=\'tip-title\'>Roadmap</span>Building and editing with the assistant is on Shahin’s roadmap. Every change is previewed, confirmed and can be undone.'];

/* ── shared: find a saved report a sentence points at (type words, event words, words of its name) ── */
var TYPEK=[[/(قیف|funnel)/,'funnel'],[/(نگهداشت|بازگشت|برمی گرد|retention|return)/,'retention'],[/(روند|trend)/,'trend'],[/(مسیر|journey|flow)/,'flows']];
var STOP=/^(را|کن|کنید|اضافه|حذف|بردار|کارت|نمودار|گزارش|داشبورد|نوت.?بوک|the|add|remove|chart|card|this|to|from|and|به|از|و|یک|این|آن)$/;
function stripTags(h){ return String(h==null?'':h).replace(/<[^>]+>/g,''); }
function findReport(t, pool){
  var best=-1, bs=0;
  pool.forEach(function(i){ var s=RB.SAVED[i], m=RBShell.meta(i); if(!s||!m||m.archived||m.invalid) return;
    var sc=0, lab=normTxt(s.fa+' '+s.en), evs=((s.q&&s.q.amp&&s.q.amp.events)||[]).map(function(x){ return x.id; });
    TYPEK.forEach(function(k){ if(k[0].test(t) && s.type===k[1]) sc+=2; });
    EVK.forEach(function(e){ if(e[0].test(t) && (evs.indexOf(e[1])>-1 || e[0].test(lab))) sc+=2; });
    t.split(/[\s،,.«»"“”]+/).forEach(function(w){ if(w.length>=3 && !STOP.test(w) && lab.indexOf(w)>-1) sc+=1; });
    if(sc>bs){ bs=sc; best=i; } });
  return bs>=2?best:-1; }
function allReports(){ var a=[]; RB.SAVED.forEach(function(s,i){ a.push(i); }); return a; }
function lbl(i){ return NB.reportLabel?NB.reportLabel(i):T(RB.SAVED[i].fa,RB.SAVED[i].en); }
function quoted(text){ var m=String(text).match(/[«"“]([^»"”]+)[»"”]/); return m?m[1].trim():''; }

/* ── dashboard edits (Amplitude: "Add or remove charts", "Update layout and structure", "Edit metadata"; owners and editors only) ── */
function boardRows(b){ var r=[]; (b.rows||[]).forEach(function(row){ row.forEach(function(c){ if(c.k==='rep') r.push(c.r); }); }); return r; }
function boardSummary(b){ var lines=boardRows(b).map(function(i){ var d=NB.tileFor(i,b); return d?[lbl(i)+': '+stripTags(d.val)+' — '+stripTags(d.sub), lbl(i)+': '+stripTags(d.val)+' — '+stripTags(d.sub)]:null; }).filter(Boolean);
  return { k:'text', w:12, fa:'<h3>جمع‌بندی دستیار</h3>'+lines.map(function(l){ return esc(l[0]); }).join('<br>')+'<br><small>فقط عددهای کارت‌ها؛ علت تغییرها را نمی‌گوید.</small>', en:'<h3>Assistant summary</h3>'+lines.map(function(l){ return esc(l[1]); }).join('<br>')+'<br><small>Only the cards’ numbers; it doesn’t explain why they changed.</small>', ai:true }; }
function flatCards(rows){ var a=[]; rows.forEach(function(r){ r.forEach(function(c){ a.push(c); }); }); return a; }
function boardPlan(text, b){
  var t=normTxt(text), ch=[], skip=[], rows=clone(b.rows||[]), title=[b.fa,b.en], q=quoted(text), on=boardRows(b);
  if(q && /(اسم|نام|عنوان|rename|title|name)/.test(t)){ title=[q,q]; ch.push({ fa:'نام: «'+b.fa+'» ← «'+q+'»', en:'Name: “'+b.en+'” → “'+q+'”' }); }
  else if(/(حذف|بردار|پاک|remove|delete|drop)/.test(t)){ var i=findReport(t, on);
    if(i>-1){ rows=rows.map(function(r){ return r.filter(function(c){ return !(c.k==='rep'&&c.r===i); }); }).filter(function(r){ return r.length; }); ch.push({ fa:'حذف کارت «'+lbl(i)+'»', en:'Remove the card “'+lbl(i)+'”' }); }
    else skip.push(['کارتی با این مشخصات روی این داشبورد پیدا نشد.','No card on this dashboard matches that.']); }
  else if(/(اضافه|بیفزا|بنویس|add|insert|write)/.test(t) && /(متن|یادداشت|توضیح|جمع.?بندی|خلاصه|text|note|summary)/.test(t)){ rows.unshift([boardSummary(b)]); ch.push({ fa:'افزودن کارت متن بالای داشبورد: جمع‌بندی عدد کارت‌ها', en:'Add a text card at the top: a summary of the cards’ numbers' }); }
  else if(/(اضافه|بیفزا|بگذار|add|put)/.test(t)){ var pool=allReports().filter(function(x){ return on.indexOf(x)<0; }), j=findReport(t, pool);
    if(j>-1){ var last=rows[rows.length-1], used=last?last.reduce(function(a,c){ return a+(c.w||6); },0):12;
      if(last && used<=6 && last[0].k!=='text') last.push({ k:'rep', r:j, w:12-used, mode:'chart' }); else rows.push([{ k:'rep', r:j, w:6, mode:'chart' }]);
      ch.push({ fa:'افزودن کارت «'+lbl(j)+'»', en:'Add the card “'+lbl(j)+'”' }); }
    else skip.push(['گزارش ذخیره‌شده‌ای با این مشخصات پیدا نشد؛ اول آن را با «ساختن با دستیار» بسازید.','No saved chart matches that; build it first with “Ask the assistant to create”.']); }
  if(/(تمام.?عرض|یک ستون|full.?width|one column)/.test(t)){ rows=flatCards(rows).map(function(c){ c=clone(c); c.w=12; return [c]; }); ch.push({ fa:'چیدمان: هر کارت تمام‌عرض در یک ردیف', en:'Layout: every card full width, one per row' }); }
  else if(/(دو ستون|دوتایی|کنار هم|two columns|side by side|two per row)/.test(t)){ var f=flatCards(rows), out=[], cur=[]; f.forEach(function(c){ c=clone(c); if(c.k==='text'){ if(cur.length){ out.push(cur); cur=[]; } c.w=12; out.push([c]); return; } c.w=6; cur.push(c); if(cur.length===2){ out.push(cur); cur=[]; } }); if(cur.length) out.push(cur); rows=out; ch.push({ fa:'چیدمان: دو کارت در هر ردیف', en:'Layout: two cards per row' }); }
  return { kind:'ops', ch:ch, skip:skip, ok:['اعمال روی داشبورد','Apply to the dashboard'],
    note:['تغییر همین حالا روی داشبورد ذخیره می‌شود؛ تا چند ثانیه می‌توانید آن را برگردانید.','The change is saved to the dashboard right away; you can undo it for a few seconds.'],
    apply:function(){ var snap=function(){ return JSON.stringify({ r:b.rows, fa:b.fa, en:b.en }); }, before={ rows:clone(b.rows), fa:b.fa, en:b.en };
      b.rows=rows; b.fa=title[0]; b.en=title[1]; b.updated=0; RBShell.rerender(); var after=snap();
      return { msg:['تغییر دستیار روی داشبورد اعمال شد ('+num(ch.length)+' مورد)','The assistant’s change is on the dashboard ('+ch.length+(ch.length===1?' item':' items')+')'], undo:function(){
        if(snap()!==after){ U.toast('داشبورد بعد از تغییر دستیار عوض شده؛ برگرداندن انجام نشد','The dashboard changed after the assistant’s edit, so nothing was undone'); return; }
        b.rows=before.rows; b.fa=before.fa; b.en=before.en; RBShell.rerender(); U.toast('داشبورد به حالت قبل برگشت','The dashboard is back to how it was'); } }; } }; }

/* ── notebook edits (Amplitude: Global Agent edits notebooks; changes apply at once) ── */
function nbPlan(text, n){
  RBNotebook.seed(n);
  var t=normTxt(text), ch=[], skip=[], blocks=clone(n.blocks||[]), q=quoted(text), on=blocks.filter(function(x){ return x.k==='chart'; }).map(function(x){ return x.r; });
  if(q && /(سرتیتر|تیتر|عنوان|header|heading|title)/.test(t)){ blocks.push({ id:RBNotebook.bid(), k:'header', fa:q, en:q }); ch.push({ fa:'افزودن سرتیتر «'+q+'» در پایان', en:'Add the header “'+q+'” at the end' }); }
  else if(/(جمع.?بندی|خلاصه|summar)/.test(t)){ var L=on.map(function(i){ var d=NB.tile(i); return d?[lbl(i)+': '+stripTags(d.val)+' — '+stripTags(d.sub)]:null; }).filter(Boolean);
    if(L.length){ blocks.push({ id:RBNotebook.bid(), k:'text', ai:true, fa:'جمع‌بندی دستیار: '+L.map(function(l){ return l[0]; }).join('؛ ')+'. این جمع‌بندی فقط عددهای نمودارهاست و علت را نمی‌گوید.', en:'Assistant summary: '+L.map(function(l){ return l[0]; }).join('; ')+'. This only restates the charts’ numbers; it doesn’t explain why.' }); ch.push({ fa:'افزودن متن جمع‌بندی '+num(L.length)+' نمودار در پایان', en:'Add a text summary of '+L.length+' chart'+(L.length===1?'':'s')+' at the end' }); }
    else skip.push(['این نوت‌بوک نموداری ندارد که جمع‌بندی شود.','This notebook has no charts to summarise.']); }
  else if(/(حذف|بردار|پاک|remove|delete)/.test(t)){ var i=findReport(t, on);
    if(i>-1){ blocks=blocks.filter(function(x){ return !(x.k==='chart'&&x.r===i); }); ch.push({ fa:'حذف نمودار «'+lbl(i)+'»', en:'Remove the chart “'+lbl(i)+'”' }); }
    else skip.push(['نموداری با این مشخصات در این نوت‌بوک پیدا نشد.','No chart in this notebook matches that.']); }
  else if(/(اضافه|بیفزا|بگذار|add|put)/.test(t)){ var pool=allReports().filter(function(x){ return on.indexOf(x)<0 && (RBNotebook.noNb||[]).indexOf(RB.SAVED[x].type)<0; }), j=findReport(t, pool);
    if(j>-1){ blocks.push({ id:RBNotebook.bid(), k:'chart', r:j }); ch.push({ fa:'افزودن نمودار «'+lbl(j)+'» در پایان', en:'Add the chart “'+lbl(j)+'” at the end' }); }
    else skip.push(['گزارش ذخیره‌شده‌ای با این مشخصات پیدا نشد.','No saved chart matches that.']); }
  return { kind:'ops', ch:ch, skip:skip, ok:['اعمال روی نوت‌بوک','Apply to the notebook'],
    note:['تغییر همین حالا روی نوت‌بوک ذخیره می‌شود؛ تا چند ثانیه می‌توانید آن را برگردانید.','The change is saved to the notebook right away; you can undo it for a few seconds.'],
    apply:function(){ var snap=function(){ return JSON.stringify(n.blocks); }, before=clone(n.blocks), reps0=(n.reps||[]).slice();
      n.blocks=blocks; n.reps=blocks.filter(function(x){ return x.k==='chart'; }).map(function(x){ return x.r; }); RBNotebook.touch(n); RBShell.rerender(); var after=snap();
      return { msg:['تغییر دستیار روی نوت‌بوک اعمال شد','The assistant’s change is on the notebook'], undo:function(){
        if(snap()!==after){ U.toast('نوت‌بوک بعد از تغییر دستیار عوض شده؛ برگرداندن انجام نشد','The notebook changed after the assistant’s edit, so nothing was undone'); return; }
        n.blocks=before; n.reps=reps0; RBShell.rerender(); U.toast('نوت‌بوک به حالت قبل برگشت','The notebook is back to how it was'); } }; } }; }

/* ── cohort from a prompt (Amplitude's cohort guide: summarise the definition, list what is missing or ambiguous, confirm, then save) ── */
function cohortPlan(text){
  var t=normTxt(text), assume=[], hit=null, w=30, op='gte', n=1, not=/(نکرده|انجام نداده|نداشته|did not|didn't|haven't|never)/.test(t);
  EVK.some(function(e){ if(e[0].test(t)){ hit=e; return true; } return false; });
  if(/(کامل|to the end|complet)/.test(t) && hit && hit[1]==='video_started') hit=[hit[0],'video_completed',['تماشاگران کامل ویدیو','Full video watchers']];
  if(!hit){ hit=EVK[EVK.length-1]; assume.push(['ایونت مشخصی نیامده بود؛ «بازدید صفحه» گذاشته شد.','No event was named; “Page view” was used.']); }
  if(/(۷|7) ?روز|هفته|7 ?days?|week/.test(t)) w=7; else if(/(۹۰|90) ?روز|سه ماه|3 ?months?|90 ?days?|quarter/.test(t)) w=90; else if(/(۳۰|30) ?روز|ماه|30 ?days?|month/.test(t)) w=30; else assume.push(['بازه نیامده بود؛ ۳۰ روز اخیر گذاشته شد.','No window was given; the last 30 days were used.']);
  var m=t.match(/(بیش از|بیشتر از|more than|over)\s*([0-9]+)/), m2=t.match(/(دست ?کم|حداقل|at least)\s*([0-9]+)/), m3=t.match(/(حداکثر|at most)\s*([0-9]+)/);
  if(m){ op='gte'; n=+m[2]+1; } else if(m2){ op='gte'; n=+m2[2]; } else if(m3){ op='lte'; n=+m3[2]; } else assume.push(['تعداد نیامده بود؛ «دست‌کم یک بار» گذاشته شد.','No count was given; “at least once” was used.']);
  var def={ groups:[{ or:[{ kind:'ev', ev:hit[1], where:[], op:op, n:n, win:w, not:not, with:'count', then:[] }] }] }, vals=[];
  FL.forEach(function(f){ if(f[0].test(t) && !def.groups.some(function(g){ return g.or[0].prop===f[1]; })){ def.groups.push({ or:[{ kind:'prop', prop:f[1], pop:'in', vals:[f[2]], when:'any' }] }); vals.push(f); } });
  var sen=RBCohort.sentence(def, true), z=RBCohort.size(def), E=RB.evById(hit[1]);   /* PM 2026-10-25, LX-15: the preview's definition is masked for the viewer's data access */
  var rule=not?['بدون این ایونت در '+num(w)+' روز','without it in '+w+' days']:[(op==='lte'?'حداکثر ':'دست‌کم ')+num(n)+' بار در '+num(w)+' روز',(op==='lte'?'at most ':'at least ')+n+'× in '+w+' days'];
  var nm=[(hit[1]==='page_view'?'خوانندگان':hit[2][0])+' — '+rule[0]+(vals.length?' — '+vals.map(function(f){ return valLbl(f[1], f[2], 'fa'); }).join('، '):''), (hit[1]==='page_view'?'Readers':hit[2][1])+' — '+rule[1]+(vals.length?' — '+vals.map(function(f){ return valLbl(f[1], f[2], 'en'); }).join(', '):'')];   /* LX-15 */
  assume.push(['کوهورت پویاست و با داده‌های تازه به‌روز می‌شود؛ در فضای شخصی شما ذخیره می‌شود و برای دیگران فهرست نمی‌شود.','The cohort is dynamic and refreshes with new data; it is saved to your personal space and isn’t listed for others.']);
  return { kind:'cohort', def:def, title:nm, assume:assume, spec:[['تعریف','Definition',T(sen[0],sen[1])],['اندازهٔ تخمینی','Estimated size',num(z.n)+T(' کاربر',' users')],['ایونت','Event',E?T(E.fa,E.en):hit[1]]] }; }

/* ── the composer ── */
var MODES={ edit:['ویرایش با دستیار','Edit with the assistant'], board:['ویرایش داشبورد با دستیار','Edit the dashboard with the assistant'], notebook:['ویرایش نوت‌بوک با دستیار','Edit the notebook with the assistant'], create:['ساختن با دستیار','Ask the assistant to create'] };
/* Block A (2026-10-24): «دسترس‌پذیری دستیار» (off / admin preview / on) gates every assistant entry.
   PM 2026-10-25, AL-18/AL-19: the setting lives in Organization settings ▸ AI controls; admin preview lets only the owner and admins
   through (manager equals admin, TG-4; members and viewers are blocked). The rule is the global panel's (shahinAsk.gate), so the
   composer, the Home box, the event picker's AI button and «پرسیدن از دستیار دربارهٔ این نمودار» all refuse the same way. */
function aiAvail(){ try{ return localStorage.getItem('shahin-ai-avail')||'on'; }catch(e){ return 'on'; } }
function aiGate(){ if(window.shahinAsk&&shahinAsk.gate) return shahinAsk.gate();
  var av=aiAvail(), r=new URLSearchParams(location.search).get('prole'), adm=!(r==='member'||r==='viewer');   /* fallback: the same rule */
  if(av==='off') return { ok:false, fa:'دستیار در این سازمان خاموش است؛ مالک یا ادمین سازمان آن را از «تنظیمات سازمان ← کنترل‌های هوش مصنوعی» روشن می‌کند', en:'The assistant is off in this organization; the organization owner or an admin turns it on in Organization settings ▸ AI controls' };
  if(av==='admin'&&!adm) return { ok:false, fa:'دستیار فعلا در پیش‌نمایش است و فقط مالک و ادمین‌ها از آن استفاده می‌کنند', en:'The assistant is in preview; only the owner and admins can use it for now' };
  return { ok:true }; }
function aiBlocked(){ var g=aiGate(); if(g.ok) return false; U.toast(g.fa, g.en); return true; }
function composer(o){
  o=o||{}; var mode=o.mode||'create', what=o.what||'chart', plan=null, B=o.board, NBK=o.nb;
  if(aiBlocked()) return;
  if(mode==='edit' && ['trend','funnel','retention'].indexOf(RB.Q.type)<0){ U.toast('ویرایش با دستیار فعلاً برای روند، قیف و نگهداشت است','Editing with the assistant covers Trend, Funnel and Retention for now'); return; }
  if(mode==='board' && (!B || !NB.canEditBoard(B))){ U.toast('فقط کسی که اجازهٔ ویرایش دارد داشبورد را با دستیار تغییر می‌دهد','Only editors can change the dashboard with the assistant'); return; }
  if(mode==='notebook' && !NBK) return;
  function list(){ return mode==='edit'?SUGG.edit:mode==='board'?SUGG.bedit:mode==='notebook'?SUGG.nedit:what==='board'?SUGG.board:what==='cohort'?SUGG.cohort:SUGG.chart; }
  function sugg(){ return list().map(function(s){ return '<button class="rai-chip" type="button" data-q="'+esc(T(s[0],s[1]))+'">'+esc(T(s[0],s[1]))+'</button>'; }).join(''); }
  var on=mode==='edit'?RBH.name():mode==='board'?T(B.fa,B.en):mode==='notebook'?T(NBK.fa,NBK.en):'';
  var tabs=[['chart','chart-line','نمودار','Chart'],['board','squares-four','داشبورد','Dashboard']].concat(window.RBCohort&&RBCohort.create?[['cohort','users-three','کوهورت','Cohort']]:[]);
  var body='<div class="rai-top"><span class="rbx-badge ai">'+ic('sparkle')+T('دستیار','Assistant')+'</span><span class="rbx-badge road"'+tip(ROAD[0],ROAD[1])+'>'+ic('map-trifold')+T('نقشهٔ راه','Roadmap')+'</span>'+
      (on?'<span class="rbx-note">'+T('روی «','On “')+esc(on)+T('»','”')+'</span>':'')+'</div>'+
    (mode==='create'?'<div class="sh-seg rai-what" role="tablist">'+tabs.map(function(x){ return '<button class="sh-seg-opt'+(what===x[0]?' on':'')+'" data-what="'+x[0]+'" type="button">'+ic(x[1])+T(x[2],x[3])+'</button>'; }).join('')+'</div>':'')+
    '<textarea class="sh-input rai-q" id="raiQ" rows="3" placeholder="'+esc(mode==='edit'?T('مثلاً: هفتگی‌اش کن و فقط موبایل را نشان بده','For example: make it weekly and show mobile only'):mode==='board'?T('مثلاً: یک جمع‌بندی بالای داشبورد اضافه کن','For example: add a summary at the top'):mode==='notebook'?T('مثلاً: یک جمع‌بندی از نمودارها آخرش بنویس','For example: write a summary of the charts at the end'):T('چه چیزی را می‌خواهید ببینید؟','What do you want to see?'))+'"></textarea>'+
    '<div class="rai-sugg" id="raiSugg">'+sugg()+'</div><div class="rai-out" id="raiOut" aria-live="polite"></div>'+
    '<div class="rai-disc">'+ic('info')+T('پاسخ دستیار ممکن است نادرست باشد؛ پیش‌نمایش را ببینید و عددها را روی خود نمودار بررسی کنید.','The assistant’s answer may be wrong; check the preview and the numbers on the chart itself.')+'</div>';
  var m=U.modal({ fa:MODES[mode][0], en:MODES[mode][1], body:body,
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'پیش‌نمایش', en:'Preview', fn:function(bd, close){ return go(bd, close); } }] });
  var bd=m.body, ok=bd.closest('.rbx-modal').querySelector('.rbx-mfoot .sh-btn.primary'), q=bd.querySelector('#raiQ');
  function setOk(label){ ok.textContent=T(label[0],label[1]); ok.disabled=false; }
  function reset(){ plan=null; setOk(['پیش‌نمایش','Preview']); bd.querySelector('#raiOut').innerHTML=''; }
  q.addEventListener('input', reset);
  q.addEventListener('keydown', function(e){ if(e.key==='Enter' && (e.metaKey||e.ctrlKey)){ e.preventDefault(); ok.click(); } });
  bd.addEventListener('click', function(e){
    var c=e.target.closest('.rai-chip'); if(c){ q.value=c.getAttribute('data-q'); reset(); q.focus(); return; }
    var w=e.target.closest('[data-what]'); if(w){ what=w.getAttribute('data-what'); bd.querySelectorAll('[data-what]').forEach(function(b){ b.classList.toggle('on', b===w); }); bd.querySelector('#raiSugg').innerHTML=sugg(); reset(); } });
  function out(h){ bd.querySelector('#raiOut').innerHTML=h; U.i18n&&U.i18n(); }
  function skipHtml(sk){ return sk.length?'<ul class="rai-skip">'+sk.map(function(s){ return '<li>'+esc(T(s[0],s[1]))+'</li>'; }).join('')+'</ul>':''; }
  function specHtml(p){ return '<div class="rai-plan"><b>'+esc(T(p.title[0],p.title[1]))+'</b><dl class="rai-spec">'+p.spec.map(function(s){ return '<dt>'+T(s[0],s[1])+'</dt><dd>'+esc(s[2])+'</dd>'; }).join('')+'</dl>'+
      '<div class="rai-assume"><span>'+T('فرض‌های دستیار','The assistant’s assumptions')+'</span><ul>'+p.assume.map(function(a){ return '<li>'+esc(T(a[0],a[1]))+'</li>'; }).join('')+'</ul></div></div>'; }
  function go(bd_, close){
    var text=q.value.trim();
    if(!text){ out('<div class="rbx-callout">'+ic('info')+'<span>'+T('یک جمله بنویسید یا یکی از پیشنهادها را انتخاب کنید.','Type a sentence or pick a suggestion.')+'</span></div>'); return false; }
    if(mode==='create' && what==='board'){ close(); setTimeout(function(){ NB.aiPreview(text); }, 160); return false; }
    if(plan){ if(plan.kind==='alert') plan.commit(); else commit(close); return false; }
    plan=mode==='edit'?editPlan(text):mode==='board'?boardPlan(text, B):mode==='notebook'?nbPlan(text, NBK):what==='cohort'?cohortPlan(text):createPlan(text);
    if(plan.kind==='alert') return alertStep(plan.a, close);
    if(plan.kind==='edit' || plan.kind==='ops'){
      if(!plan.ch.length){ out('<div class="rbx-callout warn">'+ic('warning')+'<span>'+(plan.kind==='edit'?T('این درخواست را به تغییری در نمودار تبدیل نکردم. بازه، گروه‌بندی، فیلتر، شکل نمایش یا نوع شمارش را بگویید.','I couldn’t turn this into a change to the chart. Name an interval, breakdown, filter, visualization or count.'):
          T('این درخواست را به تغییری تبدیل نکردم. افزودن یا برداشتن یک نمودار، یک جمع‌بندی، یک نام تازه در «» یا چیدمان را بگویید.','I couldn’t turn this into a change. Ask to add or remove a chart, add a summary, rename (in quotes) or change the layout.'))+'</span></div>'+skipHtml(plan.skip)); plan=null; return false; }
      out('<div class="rai-plan"><b>'+T('تغییرهای پیشنهادی','Proposed changes')+'</b><ul>'+plan.ch.map(function(c){ return '<li>'+ic('pencil-simple')+esc(T(c.fa,c.en))+'</li>'; }).join('')+'</ul>'+skipHtml(plan.skip)+
        '<span class="rbx-note">'+(plan.kind==='edit'?T('تغییر روی همین نمودار می‌نشیند و تا «ذخیره» نزنید، گزارش ذخیره‌شده عوض نمی‌شود.','The change lands on this chart; the saved report changes only when you press Save.'):T(plan.note[0],plan.note[1]))+'</span></div>');
      setOk(plan.kind==='edit'?['اعمال تغییر','Apply the change']:plan.ok); return false; }
    out(specHtml(plan)); setOk(plan.kind==='cohort'?['ساختن کوهورت','Create the cohort']:canSaveChart()?['ساختن نمودار','Build the chart']:['باز کردن نمودار','Open the chart']); return false; }   /* PM 2026-10-28, TD-2 */
  function commit(close){
    if(plan.kind==='ops'){ var r=plan.apply(); close(); undoToast(r.msg[0], r.msg[1], r.undo); return; }
    if(plan.kind==='cohort'){ var id=RBCohort.create(plan.def, plan.title[0], plan.title[1]); close(); RBCohort.open(id);
      undoToast('کوهورت در فضای شخصی شما ساخته شد','The cohort was saved to your personal space', function(){ var c=(RBShell.cohortStore()||[]).filter(function(x){ return x.id===id; })[0]; if(c) c.archived=true; if(RBShell.view()==='cohort') RBShell.go('content'); else RBShell.rerender(); U.toast('کوهورت دستیار حذف شد','The assistant’s cohort was removed'); }); return; }
    if(plan.kind==='edit'){
      var before=RBAmp.state(), wasDirty=!!($('rbDirty')&&!$('rbDirty').hidden), ch=plan.ch, ri=RBH.current(), savedQ=JSON.stringify((RB.SAVED[ri]||{}).q||null);
      RBAmp.load(applyEdit(RBAmp.state(), ch)); if(window.RBH) RBH.dirty(true);
      var after=JSON.stringify(RBAmp.state());
      close();
      /* Undo only while it is still this chart, untouched since the assistant's change; after a Save the old state comes back as unsaved */
      undoToast('تغییر دستیار روی نمودار اعمال شد ('+num(ch.length)+' مورد) — ذخیره نشده','The assistant’s change is on the chart ('+ch.length+(ch.length===1?' item':' items')+') — not saved', function(){
        if(RBH.current()!==ri || !$('rbBuilder').classList.contains('show') || JSON.stringify(RBAmp.state())!==after){ U.toast('نمودار بعد از تغییر دستیار عوض شده؛ برگرداندن انجام نشد','The chart changed after the assistant’s edit, so nothing was undone'); return; }
        var resaved=JSON.stringify((RB.SAVED[ri]||{}).q||null)!==savedQ;
        RBAmp.load(before); if(window.RBH) RBH.dirty(resaved?true:wasDirty);
        U.toast(resaved?'نمودار به حالت قبل برگشت؛ نسخهٔ ذخیره‌شده تغییر دستیار را دارد':'نمودار به حالت قبل برگشت', resaved?'The chart is back to how it was; the saved version still has the assistant’s change':'The chart is back to how it was'); });
      return; }
    var p=plan;
    /* PM 2026-10-28, TD-2: no save for a member or viewer; the chart opens in the builder as a new, unsaved chart */
    if(!canSaveChart()){
      /* an open chart with unsaved changes would stop the new chart at the leave dialog and the delayed load would land on it */
      var bv=$('rbBuilder'), dz=$('rbDirty'); if(bv&&bv.classList.contains('show')&&dz&&!dz.hidden){ out('<div class="rbx-callout warn">'+ic('warning')+'<span>'+T('نمودار باز تغییرهای ذخیره‌نشده دارد؛ اول آن را ببندید، بعد نمودار دستیار را باز کنید.','The open chart has unsaved changes; close it first, then open the assistant’s chart.')+'</span></div>'); return; }
      close(); if(NB.newReport){ NB.newReport(p.type); setTimeout(function(){ if(window.RBAmp) RBAmp.load(JSON.parse(JSON.stringify(p.amp)), null); }, 60); }
      U.toast('نمودار باز شد و ذخیره نشده است؛ ذخیره نمودار فعلا فقط برای مالک و ادمین پروژه است','The chart is open and not saved; saving charts is for the project owner and admins for now'); return; }
    var i=NB.aiReport(p.title[0], p.title[1], p.type, p.amp);
    close(); NB.open(i);
    undoToast('نمودار در فضای شخصی شما ساخته شد','The chart was saved to your personal space', function(){ NB.discard(i); U.toast('نمودار دستیار حذف شد','The assistant’s chart was removed'); }); }
  /* alert: step 1 here (the proposal), step 2 the normal alert form; nothing is saved from the composer.
     PM 2026-10-25, AL-3: the proposal says plain «روزانه». PM 2026-10-28, AL-3: no delivery-hour row; a daily alert reads «روزانه، تا ساعت ۸:۰۰ صبح به وقت تهران» */
  function alertStep(a, close){
    var i=RBH.current(), e=window.RBAlerts?RBAlerts.eligible(i):{ ok:false, why:['هشدارها در این نسخه در دسترس نیستند.','Alerts aren’t available in this version.'] };
    if(!e.ok){ out('<div class="rbx-callout warn">'+ic('bell-slash')+'<span>'+esc(T(e.why[0],e.why[1]))+'</span></div>'); plan=null; return false; }
    var d=NB.tile(i), v=a.val!=null?a.val:(d&&isFinite(d.num)?Math.round(d.num*0.85):0);
    a.val=v; plan={ kind:'alert', a:a };
    out('<div class="rai-plan"><b>'+T('هشدار پیشنهادی','Proposed alert')+'</b><dl class="rai-spec"><dt>'+T('نمودار','Chart')+'</dt><dd>'+esc(RBH.name())+'</dd><dt>'+T('شرط','Condition')+'</dt><dd>'+(a.cond==='above'?T('بالاتر از ','Above '):T('پایین‌تر از ','Below '))+num(v)+'</dd><dt>'+T('هر چند وقت','How often')+'</dt><dd>'+(a.freq==='hour'?T('ساعتی','Hourly'):T('روزانه، تا ساعت ۸:۰۰ صبح به وقت تهران','Daily, by 08:00 Tehran time'))+'</dd><dt>'+T('کانال','Channels')+'</dt><dd>'+T('ایمیل و درون‌برنامه','Email and in-app')+'</dd></dl>'+
      (a.val===null||!/[0-9]/.test(normTxt(q.value))?'<span class="rbx-note">'+T('عددی نگفتید؛ ۸۵٪ مقدار فعلی پیشنهاد شد.','No number was given; 85% of the current value is proposed.')+'</span>':'')+
      '<span class="rbx-note">'+T('دستیار هشدار را فعال نمی‌کند. در قدم بعد فرم هشدار باز می‌شود و با «ذخیره» شما فعال می‌شود.','The assistant doesn’t switch the alert on. The alert form opens next, and it goes live only when you save it.')+'</span></div>');
    ok.textContent=T('ادامه در فرم هشدار','Continue in the alert form');
    plan.commit=function(){ close(); setTimeout(function(){ RBAlerts.modal(i, { cond:a.cond, val:a.val, freq:a.freq }); }, 160); };   /* PM 2026-10-28, AL-3: no send hour to pass */
    return false; }
  if(o.q){ q.value=o.q; }
  return m; }

/* ── scheduled insight card (PRD-Specialized-Agents: the result lands on the dashboard itself; Amplitude's Dashboard Agent) ──
   Fixed checklist per card, shown only past the threshold, sorted by impact size, each with a link; "no anomalies" when nothing passes.
   Numbers come from the builder's own computation of each card's query, with the board's filters.
   PM 2026-10-25, AL-4: whatever range the board shows, each card is read over the last 14 complete days of its own query, daily, so a
   board on the 7-day default still gets findings; the rule (at least 7 complete days) is unchanged. */
var THR=10, BIG=25;   /* % change; Shahin's default, tuned per organisation in the business context (PRD-Business-Context) */
var RUNS=[['امروز ۸:۰۰','Today, 8:00 AM'],['دیروز ۸:۰۰','Yesterday, 8:00 AM'],['۲ روز پیش، ۸:۰۰','2 days ago, 8:00 AM']];
function avg(a){ return a.length?a.reduce(function(x,y){ return x+y; },0)/a.length:0; }
function pctTxt(p){ return '<bdi dir="ltr">'+(p>0?'+':'')+num(Math.round(p))+T('٪','%')+'</bdi>'; }
/* PM 2026-10-25, AL-4: small-sample guards (relative comparisons only). A card stays silent when the compared period (the average
   it is compared with) has fewer than 100 events, when that denominator is zero, or when fewer than 7 complete days are available.
   guard() names the reason so the card can report what it skipped; 'type' is the older rule (funnel, retention, non-daily). */
var MIN_N=100, MIN_DAYS=7, WIN_DAYS=14;
/* PM 2026-10-25, AL-4: the card's own query over the last 14 complete days plus today (range n15, daily, the board's filters; a template
   board maps the query first, as the tiles do). Cached for one render of the insight card, so a filter change is read fresh. */
var SER=null;
function series(i, b){
  if(SER && Object.prototype.hasOwnProperty.call(SER, i)) return SER[i];
  var out=null;
  try{ var s=RB.SAVED[i], q=s&&s.q;
    if(q && s.type==='trend' && window.RBAmp && RBAmp.tile){
      if(b && b.tpl && window.RBTpl && RBTpl.mapQ) q=RBTpl.mapQ(q, b);
      var eff=NB.effective(b)||{};
      out=RBAmp.tile(q, { range:'n'+(WIN_DAYS+1), filters:eff.filters||[], interval:'day' }, 'trend'); } }
  catch(e){ out=null; }
  if(SER) SER[i]=out;
  return out; }
/* the complete days of run k: the last point is today (incomplete) and each earlier run ends a day sooner; days before the first one
   with data (the event's collection start, or no data yet) don't count, so a new event reads as short instead of a false spike */
function win(v, k){ var end=v.length-2-(k||0), first=0; while(first<end && !(v[first]>0)) first++;
  return { end:end, first:first, days:Math.max(0, end-first+1), base:avg(v.slice(first, end)), any:v.slice(0, end+1).some(function(x){ return x>0; }) }; }
function guard(i, b, k){
  var s=RB.SAVED[i], m=RBShell.meta(i); if(!s||!m||m.archived||m.deleted) return 'gone';
  var d0=NB.tileFor(i, b); if(!d0||!isFinite(d0.num)) return 'type';   /* the card as the board shows it: a filter it can't take empties it (WS-19) */
  if(s.type!=='trend') return 'type';
  var d=series(i, b); if(!d||!d.vals||d.vals.length<5) return 'type';
  var w=win(d.vals, k);
  if(!w.any) return 'zero';
  if(w.days<MIN_DAYS) return 'short';
  if(!w.base) return 'zero';
  if(w.base<MIN_N) return 'small';
  return null; }
function finding(i, b, k){
  var name=lbl(i);
  /* daily series only: the copy and the run labels («دیروز», «۲ روز پیش») speak in days */
  if(!guard(i, b, k)){
    var d=series(i, b), v=d.vals, w=win(v, k), end=w.end;
    var last=v[end], base=w.base;
    var L=d.labs||{ fa:[], en:[] };
    return { i:i, name:name, pct:(last-base)/base*100, fa:'«'+name+'» در '+(L.fa[end]||'')+': '+num(Math.round(last))+' در برابر میانگین '+num(Math.round(base))+' در روزهای کامل قبل از آن، از '+num(WIN_DAYS)+' روز کامل اخیر', en:'“'+name+'” on '+(L.en[end]||'')+': '+num(Math.round(last))+' vs an average of '+num(Math.round(base))+' on the complete days before it, out of the last '+WIN_DAYS+' complete days' }; }
  /* funnel and retention cards are left out: the conversion and return windows of the latest days haven't closed, so a short recent
     window always reads lower than a longer one (right-censoring) and would raise false findings */
  return null; }
/* which cards the checklist can read: trend cards that pass the AL-4 guards over their last 14 complete days */
function checkable(i, b){ return !guard(i, b, 0); }
/* AL-4: the skipped line names each reason with its count, in both the findings branch and the nothing-checkable branch */
function skipLine(reps, b){ var c={ type:0, small:0, zero:0, short:0 }; reps.forEach(function(i){ var g=guard(i, b, 0); if(c[g]!=null) c[g]++; });
  var parts=[]; if(c.type) parts.push([num(c.type)+' قیف، نگهداشت یا نمودار بدون سری زمانی', c.type+' funnel, retention or no time series']);   /* PM 2026-10-25, AL-4: every card is read daily now */
  if(c.small) parts.push([num(c.small)+' کمتر از '+num(MIN_N)+' ایونت در دوره مقایسه', c.small+' under '+MIN_N+' events in the compared period']);
  if(c.zero) parts.push([num(c.zero)+' مخرج صفر', c.zero+' zero denominator']);
  if(c.short) parts.push([num(c.short)+' کمتر از '+num(MIN_DAYS)+' روز کامل', c.short+' fewer than '+MIN_DAYS+' complete days']);
  var n=c.type+c.small+c.zero+c.short; if(!n) return '';
  return '<span class="rbx-note">'+T('کارت‌های بررسی‌نشده: '+parts.map(function(x){ return x[0]; }).join('؛ ')+'.', n+' card'+(n===1?' was':'s were')+' not checked: '+parts.map(function(x){ return x[1]; }).join('; ')+'.')+'</span>'; }
function focusHit(f, i){ if(!f) return false; var lab=normTxt(RB.SAVED[i].fa+' '+RB.SAVED[i].en); return findReport(f,[i])>-1 || f.split(/[\s،,.]+/).some(function(w){ return w.length>=3 && !STOP.test(w) && lab.indexOf(w)>-1; }); }
function runs(b){
  var reps=boardRows(b).filter(function(x,k,a){ return a.indexOf(x)===k; }), f=normTxt((b.insight||{}).focus||'');
  return [0,1,2].map(function(k){ var l=reps.map(function(i){ return finding(i,b,k); }).filter(function(x){ return x && Math.abs(x.pct)>=THR; });
    l.forEach(function(x){ x.focus=focusHit(f, x.i); });
    l.sort(function(a,c){ return (c.focus-a.focus) || (Math.abs(c.pct)-Math.abs(a.pct)); });
    return { k:k, at:RUNS[k], f:l }; }); }
/* week-over-week style diff between the latest run and the one before (Amplitude: New insights / Key differences / Consistent findings) */
function diff(a, p){ var o={ fresh:[], changed:[], same:[], gone:[] }, pm={}; p.f.forEach(function(x){ pm[x.i]=x; });
  a.f.forEach(function(x){ var y=pm[x.i]; if(!y) o.fresh.push(x.i); else if((x.pct>0)!==(y.pct>0) || Math.abs(x.pct-y.pct)>=10) o.changed.push(x.i); else o.same.push(x.i); });
  p.f.forEach(function(y){ if(!a.f.some(function(x){ return x.i===y.i; })) o.gone.push(y.i); });
  return o; }
function insightHtml(b){ SER={}; try{ return insightHtml0(b); } finally{ SER=null; } }   /* PM 2026-10-25, AL-4: one series per card per render */
function insightHtml0(b){
  var R=runs(b), r0=R[0], d=diff(R[0], R[1]), eff=NB.effective(b)||{}, nf=(eff.filters||[]).length, focus=(b.insight||{}).focus||'', h='';
  var reps=boardRows(b).filter(function(x,k,a){ return a.indexOf(x)===k; }), chk=reps.filter(function(i){ return checkable(i,b); });
  function tags(x){ var t=''; if(d.fresh.indexOf(x.i)>-1) t+='<span class="rai-tag new">'+T('جدید','New')+'</span>'; else if(d.changed.indexOf(x.i)>-1) t+='<span class="rai-tag chg">'+T('تغییر مهم','Key difference')+'</span>'; else t+='<span class="rai-tag same">'+T('ثابت','Consistent')+'</span>';
    if(Math.abs(x.pct)>=BIG) t+='<span class="rai-tag big">'+T('اثر بزرگ','Large effect')+'</span>'; if(x.focus) t+='<span class="rai-tag foc">'+T('در تمرکز شما','In your focus')+'</span>'; return t; }
  h+='<section class="rai-ins" id="raiIns" aria-label="'+T('بینش خودکار','Automatic insights')+'"><div class="rai-ins-h">'+ic('lightning')+'<b>'+T('بینش خودکار','Automatic insights')+'</b><span class="rbx-tipdot"'+tip('<span class=\'tip-title\'>بینش خودکار</span>هر روز ساعت ۸:۰۰ به وقت تهران کارت‌های روند همین داشبورد بررسی می‌شوند و فقط تغییرهایی که از آستانه گذشته‌اند، به ترتیب اندازه اثر، این‌جا می‌آیند. هر بازه‌ای که داشبورد نشان دهد، هر کارت روی ۱۴ روز کامل اخیر ایونت خودش خوانده می‌شود و هر روز کامل با میانگین روزهای کامل قبل از آن مقایسه می‌شود. کارت‌های قیف و نگهداشت بررسی نمی‌شوند، چون پنجره تبدیل و بازگشت روزهای اخیر هنوز بسته نشده است.','<span class=\'tip-title\'>Automatic insights</span>Every day at 8:00 AM this dashboard’s trend cards are checked; only changes past the threshold appear here, largest effect first. Whatever range the dashboard shows, each card is read over the last 14 complete days of its own event, and each complete day is compared with the average of the complete days before it. Funnel and retention cards are not checked, because the conversion and return windows of the latest days haven’t closed yet.')+'></span>'+
    '<span class="rbx-spacer"></span>'+   /* PM 2026-10-28, LX-6: the report builder is Backlog, so it carries no «نیازمند توسعه» */
    (NB.isOwner(b)?'<button class="rbx-icbtn" data-ins="set" type="button" title="'+T('تنظیمات بینش خودکار','Automatic insight settings')+'">'+ic('gear-six')+'</button>':'')+'</div>';
  h+='<div class="rai-ins-m">'+T('آخرین اجرا: ','Last run: ')+T(r0.at[0],r0.at[1])+' · '+T('روزانه','Daily')+' · '+T('بر پایه ۱۴ روز کامل اخیر و فیلترهای همین داشبورد','Based on the last 14 complete days and this dashboard’s filters')/* PM 2026-10-25, AL-4 */+(nf?' ('+num(nf)+T(' فیلتر',' filter'+(nf===1?'':'s'))+')':'')+(focus?' · '+T('تمرکز: ','Focus: ')+'«'+esc(focus)+'»':'')+'</div>';
  if(r0.f.length){
    h+='<div class="rai-ins-d">'+T('نسبت به اجرای قبل: ','Since the previous run: ')+'<span class="rai-tag new">'+num(d.fresh.length)+' '+T('جدید','new')+'</span><span class="rai-tag chg">'+num(d.changed.length)+' '+T('تغییر مهم','key difference'+(d.changed.length===1?'':'s'))+'</span><span class="rai-tag same">'+num(d.same.length)+' '+T('ثابت','consistent')+'</span></div>';
    h+='<ul class="rai-ins-l">'+r0.f.map(function(x){ var up=x.pct>0; return '<li><span class="rai-dir '+(up?'up':'down')+'">'+ic(up?'arrow-up':'arrow-down')+(up?T('افزایش ','Up '):T('کاهش ','Down '))+pctTxt(x.pct)+'</span><span class="rai-ins-t">'+esc(T(x.fa,x.en))+'</span><span class="rai-ins-g">'+tags(x)+'<button class="sh-btn ghost compact" data-ins-open="'+x.i+'" type="button">'+T('باز کردن نمودار','Open chart')+'</button></span></li>'; }).join('')+'</ul>'; }
  else if(chk.length) h+='<div class="rai-ins-e">'+ic('check-circle')+'<span>'+T('در این دوره ناهنجاری نبود.','No anomalies in this period.')+'</span></div>';
  else h+='<div class="rai-ins-e">'+ic('info')+'<span>'+T('کارتی برای بررسی نیست؛ بینش خودکار نمودارهای روندی را می‌خواند که دست‌کم ۷ روز کامل داده دارند.','No card can be checked; automatic insights read trend charts with at least 7 complete days of data.')/* PM 2026-10-25, AL-4 */+'</span></div>';
  h+=skipLine(reps, b);   /* AL-4: the reasons, also when every card was skipped */
  if(d.gone.length) h+='<span class="rbx-note">'+T('دیگر از آستانه نمی‌گذرد: ','No longer past the threshold: ')+d.gone.map(function(i){ return '«'+esc(lbl(i))+'»'; }).join('، ')+'</span>';
  h+='<details class="rai-ins-hist"><summary>'+T('سه اجرای اخیر','Last 3 runs')+'</summary><ol>'+R.map(function(r){ var t=r.f[0]; return '<li><b>'+T(r.at[0],r.at[1])+'</b> — '+(r.f.length?num(r.f.length)+T(' یافته؛ بزرگ‌ترین: ',' finding'+(r.f.length===1?'':'s')+'; largest: ')+'«'+esc(t.name)+'» '+pctTxt(t.pct):T('بدون ناهنجاری','No anomalies'))+'</li>'; }).join('')+'</ol></details>';
  h+='<span class="rbx-note">'+T('فقط تغییرهای ','Only changes of ')+num(THR)+T('٪ یا بیشتر نشان داده می‌شوند (آستانهٔ پیش‌فرض؛ در ','% or more are shown (the default threshold; set it in ')+'<a href="../ai-context/">'+T('بافت کسب‌وکار','business context')+'</a>'+T(' تنظیم می‌شود). یافته‌ها هم‌زمانی را نشان می‌دهند، نه علت را.','). Findings show what moved together, not why.')+'</span></section>';
  return h; }
function insightWire(root, b){
  var el=root&&root.querySelector('#raiIns'); if(!el) return;
  el.addEventListener('click', function(e){ var o=e.target.closest('[data-ins-open]'); if(o){ NB.openFromBoard(+o.getAttribute('data-ins-open'), b.id); return; }
    if(e.target.closest('[data-ins=set]')) insightSettings(b); }); }
function insightSettings(b){
  if(!NB.isOwner(b)){ U.toast('فقط مالک داشبورد بینش خودکار را تنظیم می‌کند','Only the dashboard owner sets automatic insights'); return; }
  var I=b.insight||{ on:false, focus:'' };
  U.modal({ fa:'بینش خودکار', en:'Automatic insights', subFa:'هر روز کارت‌های این داشبورد بررسی می‌شوند و یافته‌های مهم روی همین داشبورد می‌آیند.', subEn:'This dashboard’s cards are checked every day, and the important findings appear on the dashboard itself.',
    body:'<label class="rbz-ck"><input type="checkbox" id="raiInsOn"'+(I.on?' checked':'')+'/> '+T('بینش خودکار برای این داشبورد روشن باشد','Turn on automatic insights for this dashboard')+'</label>'+
      '<div class="rbx-field"><label>'+T('دستور تمرکز (اختیاری)','Focus instructions (optional)')+'</label><textarea class="sh-input rai-q" id="raiInsF" rows="2" placeholder="'+esc(T('مثلاً: روی ریزش تماشای ویدیو تمرکز کن','For example: focus on video watch drop-off'))+'">'+esc(I.focus||'')+'</textarea><span class="rbx-note">'+T('یافته‌های مربوط به تمرکز شما بالاتر می‌آیند و برچسب می‌خورند.','Findings that match your focus go first and are labelled.')+'</span></div>'+
      '<div class="rbx-field"><span class="rbx-flbl">'+T('زمان‌بندی','Schedule')+'</span><span>'+T('روزانه، ساعت ۸ صبح','Daily at 8:00 AM')+'</span></div>'+
      '<div class="rbx-field"><span class="rbx-flbl">'+T('محل نمایش','Where it appears')+'</span><span>'+T('فقط کارت بینش روی همین داشبورد','Only the insight card on this dashboard')+'</span></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var on=bd.querySelector('#raiInsOn').checked; b.insight={ on:on, focus:bd.querySelector('#raiInsF').value.trim() }; RBShell.rerender();
      U.toast(on?'بینش خودکار روشن شد؛ اولین اجرا روی داشبورد است':'بینش خودکار خاموش شد', on?'Automatic insights are on; the first run is on the dashboard':'Automatic insights are off'); } }] }); }


window.RBAi={ blocked:aiBlocked,  composer:composer, insightHtml:insightHtml, insightWire:insightWire, insightSettings:insightSettings, _plan:{ edit:editPlan, create:createPlan, board:boardPlan, notebook:nbPlan, cohort:cohortPlan }, _runs:function(b){ return runs(b); } };
})();
