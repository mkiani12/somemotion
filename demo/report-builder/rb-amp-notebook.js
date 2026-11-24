/* ═════════ Notebooks (phase 3, step 9a) — v12 only ═════════
   Amplitude Notebooks: a document of blocks (chart, cohort, header, text, image, video) that explains an analysis.
   Spec: research-notes/…/29-amplitude-notebooks-spec.md. PM decisions 2026-10-18: a full view inside the shell (like a
   dashboard); charts are live (a chart block points at the saved chart, so any edit to it shows here); callout types and
   metric trackers are Shahin's proposal; Copy as notebook from a dashboard is in this batch. */
(function(){
'use strict';
if(!window.RBShell || !RBShell.nb) return;
var U=RBShell.ui, T=U.T, esc=U.esc, ic=U.ic, tip=U.tip, L=RBShell.lib, NB=RBShell.nb;
function $(id){ return document.getElementById(id); }
function fa(){ return U.L()==='fa'; }
function num(x, d){ var n=Number(x)||0; return n.toLocaleString(fa()?'fa-IR':'en-US', { maximumFractionDigits:d||0, minimumFractionDigits:0 }); }
var CUR=null, EDIT=true, DRAG=null, BID=1;
function bid(){ return 'k'+(BID++)+Date.now().toString(36).slice(-3); }
function nb(){ return NB.store().filter(function(n){ return n.id===CUR; })[0]||null; }
function canEdit(n){ if(new URLSearchParams(location.search).get('role')==='viewer') return false;   /* Block C: a viewer reads notebooks, never edits them */
  var sp=L.space(n.space); return n.owner==='me' || (n.people||[]).some(function(p){ return p.id==='me' && p.role==='edit'; }) || (L.canAdd(sp) && (sp.perms||{}).me==='edit'); }   /* B14: a person shared as «ویرایشگر» can edit */
/* Amplitude: notebooks don't support the Personas and Pathfinder Users charts */
var NO_NB=[];   /* PM 2026-10-28, AC-11: Personas left the demo; no chart type is kept out of notebooks now */
var KINDS={ chart:['نمودار','Chart','chart-line'], cohort:['کوهورت','Cohort','users-three'], header:['سرتیتر','Header','text-t'], text:['متن','Text','pencil-simple-line'], image:['تصویر','Image','image'], video:['ویدیو','Video','video-camera'], replay:['ضبط نشست','Session replay','play-circle'] };
/* 9b: sample recordings for the session-replay block (device-level, as on the session-replay page) */
var REPLAYS=[['s-4f2a','موبایل · تهران','Mobile · Tehran',312,7,'۵ مرداد','Jul 27'],['s-9c11','دسکتاپ · مشهد','Desktop · Mashhad',845,14,'۵ مرداد','Jul 27'],['s-77e0','موبایل · اصفهان','Mobile · Isfahan',96,2,'۴ مرداد','Jul 26'],
  ['s-2b8d','تبلت · شیراز','Tablet · Shiraz',430,9,'۳ مرداد','Jul 25'],['s-d3a4','موبایل · تبریز','Mobile · Tabriz',58,1,'۳ مرداد','Jul 25'],['s-81fe','دسکتاپ · تهران','Desktop · Tehran',1210,22,'۲ مرداد','Jul 24']];
function replayById(id){ return REPLAYS.filter(function(r){ return r[0]===id; })[0]; }
/* Amplitude: Journeys charts are hidden on a public notebook link, and Experiment Results charts don't support public links */
var NO_PUBLIC=['flows','exp'];
var TRAIL=null, TRAILNB='new';
/* Shahin's proposal (Amplitude names neither): the callout's tone and the numbers a chart can carry above it */
var CALL={ info:['نکته','Note','info'], good:['خبر خوب','Good news','check-circle'], bad:['نیاز به توجه','Needs attention','warning'], neutral:['خنثی','Neutral','minus'] };
var TRK={ total:['عدد اصلی','Headline'], last:['آخرین دورهٔ کامل','Latest complete period'], change:['تغییر نسبت به دورهٔ قبل','Change vs previous period'] };
/* latest / change only make sense on a time series, and only over complete periods: the still-collecting last point is left out */
var TS=['trend','mex'];
var NTIPS={
  nb:["<span class='tip-title'>نوت‌بوک</span>سندی برای روایت یک تحلیل: متن، تصویر و ویدیو کنار نمودارها و کوهورت‌ها. داشبورد برای پایش است و نوت‌بوک برای توضیح «چه دیدیم و چه کنیم».","<span class='tip-title'>Notebook</span>A document that tells the story of an analysis: text, images and video next to charts and cohorts. A dashboard is for monitoring; a notebook explains what was found and what to do."],
  live:["<span class='tip-title'>نمودار زنده</span>این بلوک به خود گزارش ذخیره‌شده وصل است؛ هر تغییری در گزارش این‌جا هم دیده می‌شود و عددها هر بار تازه حساب می‌شوند.","<span class='tip-title'>Live chart</span>This block points at the saved chart; any edit to the chart shows here too, and the numbers are computed fresh each time."],
  call:["<span class='tip-title'>نکتهٔ کلیدی</span>جمع‌بندی شما بالای نمودار، با رنگ و عددهای انتخابی.","<span class='tip-title'>Takeaway</span>Your summary above the chart, with a tone and chosen numbers."]
};
/* ── seed: the three library notebooks get real blocks built from their charts ── */
function seedBlocks(n){
  if(n.blocks) return;
  var R=n.reps||[];
  var S={
    n1:[{ k:'header', fa:'ویدیو در ماه گذشته', en:'Video last month' },{ k:'text', fa:'این نوت‌بوک تماشای ویدیو را در ماه گذشته مرور می‌کند: پخش از کجا شروع می‌شود و کجا بیننده را از دست می‌دهیم.', en:'This notebook reviews video viewing last month: where plays start and where we lose viewers.' },
      { k:'chart', r:R[0], call:{ t:'info', fa:'تفکیک دستگاه را ببینید: موبایل بیشترین سهم را دارد.', en:'Look at the device split: mobile has the largest share.', trk:['total','last','change'] } },
      { k:'chart', r:R[1], call:{ t:'info', fa:'قدمی را که بیشترین ریزش را دارد پیدا کنید.', en:'Find the step with the largest drop-off.', trk:['total'] } },
      { k:'cohort', cid:'c2' },{ k:'header', fa:'پیشنهاد', en:'Recommendation' },{ k:'text', fa:'ده ثانیهٔ اول ویدیوهای خبری را کوتاه‌تر کنیم و ماه بعد همین نوت‌بوک را دوباره مرور کنیم.', en:'Shorten the first ten seconds of news videos and review this notebook again next month.' }],
    n2:[{ k:'header', fa:'کمپین تابستانه در یک نگاه', en:'The summer campaign at a glance' },{ k:'image', url:'https://example.media/campaign/summer-banner.png', fa:'بنر اصلی کمپین', en:'The campaign’s main banner' },
      { k:'chart', r:R[0], call:{ t:'neutral', fa:'ورودی کمپین را با هفته‌های قبل از شروع آن مقایسه کنید.', en:'Compare campaign traffic with the weeks before it started.', trk:['total','last','change'] } },
      { k:'chart', r:R[1] },{ k:'text', fa:'کد تخفیف SUMMER50 بیشترین استفاده را داشت.', en:'The SUMMER50 code was used the most.' }],
    n3:[{ k:'header', fa:'مرور فصلی محصول', en:'Quarterly product review' },{ k:'text', fa:'سه پرسش این فصل: کاربران تازه از کجا می‌آیند، چند نفر برمی‌گردند، و کدام قابلیت بیشتر به کار رفت.', en:'Three questions this quarter: where new users come from, how many come back, and which feature was used most.' },
      { k:'chart', r:R[0], call:{ t:'info', fa:'', en:'', trk:['total','change'] } },{ k:'chart', r:R[1] },{ k:'chart', r:R[2], call:{ t:'neutral', fa:'این عدد را با مرور فصل قبل مقایسه کنید.', en:'Compare this number with last quarter’s review.', trk:['total'] } },
      { k:'video', url:'https://www.aparat.com/v/example', fa:'ضبط جلسهٔ مرور', en:'Recording of the review meeting' }]
  }[n.id]||[];
  n.blocks=S.filter(function(b){ return b.k!=='chart' || (b.r!=null && RB.SAVED[b.r]); }).map(function(b){ b.id=bid(); return b; });
  n.descFa=n.descFa||''; n.descEn=n.descEn||''; n.people=n.people||[];
  n.comments=n.comments||(n.id==='n1'?[{ id:1, by:'an', h:30, fa:'@مدیر محصول عدد موبایل را با ماه قبل هم مقایسه کنیم؟', en:'@Product manager should we compare the mobile number with last month too?', resolved:false }]:[]);
  n.viewLog=n.viewLog||['pm','an','mk','me'].slice(0, ({ n1:3, n2:1, n3:4 })[n.id]||1).map(function(id,k){ return { id:id, h:6+k*19 }; });
}
/* ── numbers for a chart block: the dashboard tile computation (live) ── */
function pnum(s){ if(s==null) return NaN; var t=String(s).replace(/<[^>]+>/g,'').replace(/[۰-۹]/g,function(c){ return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }).replace(/[٬,\s]/g,'').replace('٫','.').replace(/[^\d.\-]/g,''); return parseFloat(t); }
function trackers(d, list, r){
  var ts=RB.SAVED[r]&&TS.indexOf(RB.SAVED[r].type)>-1, rows=(d.rows||[]).slice(0, Math.max(0,(d.rows||[]).length-(d.range&&d.range.mode!=='custom'&&d.range.mode!=='yesterday'?1:0)));
  return (list||[]).map(function(k){
    if(k==='total') return '<span class="rbn-trk"><span>'+T(TRK.total[0],TRK.total[1])+'</span><b>'+d.val+'</b></span>';
    if(!ts) return '';
    var last=rows[rows.length-1], prev=rows[rows.length-2];
    if(k==='last') return last?'<span class="rbn-trk"><span>'+esc(last[0])+'</span><b>'+last[1]+'</b></span>':'';
    if(k==='change'){ var a=pnum(last&&last[1]), b=pnum(prev&&prev[1]); if(!isFinite(a)||!isFinite(b)||!b) return '<span class="rbn-trk"><span>'+T(TRK.change[0],TRK.change[1])+'</span><b>—</b></span>';
      var ch=(a-b)/Math.abs(b)*100, r=Math.round(ch*10)/10; return '<span class="rbn-trk '+(r>0?'up':r<0?'down':'')+'"><span>'+T(TRK.change[0],TRK.change[1])+'</span><b><bdi dir="ltr">'+(r>0?'+':r<0?'−':'')+num(Math.abs(r),1)+'%</bdi></b></span>'; }
    return ''; }).join('');
}
/* ── blocks ── */
function blockHtml(n, b, i, ed){
  var h='<div class="rbn-block k-'+b.k+'" data-bi="'+i+'"'+(ed?' draggable="false"':'')+'>';
  if(ed) h+='<div class="rbn-tools"><button class="rbn-grip" data-grip="'+i+'" type="button" draggable="true" aria-label="'+T('جابه‌جا کردن','Drag to move')+'" title="'+T('برای جابه‌جایی بکشید','Drag to move')+'">⋮⋮</button><button class="rbx-icbtn" data-bmenu="'+i+'" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>';
  if(b.k==='header') h+='<h2 class="rbn-h" data-btext="'+i+'"'+(ed?' contenteditable="true" spellcheck="false"':'')+'>'+esc(T(b.fa,b.en||b.fa))+'</h2>';
  else if(b.k==='text') h+='<div class="rbn-text" data-brich="'+i+'"'+(ed?' contenteditable="true"':'')+'>'+(T(b.fa,b.en||b.fa)||'')+'</div>';
  else if(b.k==='image'||b.k==='video') h+='<figure class="rbn-media">'+'<div class="rbx-media">'+ic(b.k==='video'?'video-camera':'image')+'<span dir="ltr">'+esc(b.url)+'</span></div>'+
    '<figcaption'+(ed?' contenteditable="true" data-bcap="'+i+'"':'')+' data-ph="'+esc(T('توضیح زیر '+(b.k==='video'?'ویدیو':'تصویر')+'…','Caption…'))+'">'+esc(T(b.fa||'',b.en||b.fa||''))+'</figcaption></figure>';
  else if(b.k==='replay'){ var rp=replayById(b.sid);
    h+=rp?'<div class="rbn-card rbn-replay"><div class="rbn-rplay">'+ic('play-circle')+'<span>'+fmtDur(rp[3])+'</span></div><div class="rbn-rmeta"><b>'+esc(T(rp[1],rp[2]))+'</b><span>'+T(num(rp[4])+' صفحه',rp[4]+' pages')+' · '+T(rp[5],rp[6])+' · <bdi dir="ltr">'+rp[0]+'</bdi></span><a class="rb-linkbtn" href="'+esc(window.RBAmp&&RBAmp.replayUrl?RBAmp.replayUrl({ label:T('نوت‌بوک','Notebook'), session:rp[0] }):'../session-replay/')+'" target="_blank" rel="noopener">'+ic('arrow-square-out')+T('پخش در ضبط نشست','Play in Session Replay')+'</a></div></div>'
      :'<div class="rbn-card gone">'+ic('warning')+T('این ضبط دیگر در دسترس نیست.','This recording is no longer available.')+'</div>'; }
  else if(b.k==='cohort'){ var co=NB.cohorts().filter(function(c){ return c.id===b.cid; })[0];
    h+=co?'<div class="rbn-card"><div class="rbn-ch"><span class="rb-typechip cohort">'+T('کوهورت','Cohort')+'</span><button class="rbx-tile-t" data-bcoh="'+co.id+'" type="button">'+esc(T(co.fa,co.en))+'</button></div><div class="rbn-co"><b>'+num(NB.cohortCount(co))+'</b> '+T('کاربر','users')+'<span class="rbx-dot"></span>'+esc(T(co.defFa,co.defEn))+'</div></div>'
      :'<div class="rbn-card gone">'+ic('warning')+T('این کوهورت حذف یا بایگانی شده است.','This cohort was deleted or archived.')+'</div>'; }
  else if(b.k==='chart'){ var s=RB.SAVED[b.r], gone=NB.chartGone?NB.chartGone(b.r):(s?'':'deleted');
    /* PM 2026-10-25, WS-6a / WS-7: a deleted chart says so; an archived one isn't computed and offers «بازگردانی» to its owner or a space editor */
    if(!s||gone==='deleted') h+='<div class="rbn-card gone">'+ic('warning')+T('این گزارش دیگر وجود ندارد.','This chart no longer exists.')+'</div>';
    else if(gone==='archived'){ var cr=NB.canRestore&&NB.canRestore(b.r);
      h+='<div class="rbn-card gone">'+ic('archive')+'<span>'+esc(NB.reportLabel(b.r))+' · '+T('این گزارش بایگانی شده است.','This chart is archived.')+'</span>'+
        '<button class="sh-btn ghost compact" data-brestore="'+b.r+'" type="button"'+(cr?'':' disabled title="'+esc(T('فقط مالک یا ویرایشگر فضا','Owner or space editor only'))+'"')+'>'+T('بازگردانی','Restore')+'</button></div>'; }
    else { var d=NB.tile(b.r), c=b.call;
      if(c&&c.t&&CALL[c.t]) h+='<div class="rbn-call t-'+c.t+'">'+ic(CALL[c.t][2])+'<div class="rbn-callb"><b>'+T(CALL[c.t][0],CALL[c.t][1])+'</b>'+((c.fa||c.en)?'<span>'+esc(T(c.fa,c.en||c.fa))+'</span>':'')+(d&&c.trk&&c.trk.length?'<div class="rbn-trks">'+trackers(d,c.trk,b.r)+'</div>':'')+'</div></div>';
      h+='<div class="rbn-card"><div class="rbn-ch"><button class="rbx-tile-t" data-bopen="'+b.r+'" type="button">'+esc(NB.reportLabel(b.r))+'</button>'+NB.typeChip(s.type)+'<span class="rbx-badge rbn-live"'+tip(NTIPS.live[0],NTIPS.live[1])+'>'+ic('link')+T('زنده','Live')+'</span>'+
        '<span class="rbx-spacer"></span>'+(ed?'<button class="rbx-icbtn" data-bpen="'+i+'" type="button" title="'+T('ویرایش نکتهٔ کلیدی','Edit takeaway')+'" aria-label="'+T('ویرایش','Edit')+'">'+ic('pencil-simple')+'</button>':'')+'</div>';
      if(!d) h+='<div class="rbx-tile-sub">'+T('این گزارش برای بازهٔ خودش داده‌ای ندارد.','This chart has no data for its range.')+'</div>';
      else h+='<div class="rbn-val"><span class="rbx-tile-v">'+d.val+'</span><span class="rbx-tile-sub">'+d.sub+'</span></div>'+(b.mode==='table'||!d.viz?(d.rows&&d.rows.length?'<table class="rbx-tbl-mini"><tbody>'+d.rows.map(function(r){ return '<tr><td>'+esc(r[0])+'</td><td>'+r[1]+'</td></tr>'; }).join('')+'</tbody></table>':''):'<div class="rbn-viz">'+d.viz+'</div>');
      h+='</div>'; } }
  return h+'</div>';
}
function fmtDur(sec){ var m=Math.floor(sec/60), x=sec%60; return num(m)+':'+(x<10?num(0):'')+num(x); }
function insHtml(i){ return '<div class="rbn-ins"><button class="rbn-plus" data-ins="'+i+'" type="button" aria-label="'+T('افزودن بلوک','Add block')+'" title="'+T('افزودن بلوک','Add block')+'">'+ic('plus')+'</button></div>'; }
function view(){
  var n=nb(); if(!n) return '<div class="sh-card"><div class="sh-state"><div class="sh-state-title">'+T('نوت‌بوک پیدا نشد','Notebook not found')+'</div></div></div>';
  seedBlocks(n);
  var ed=canEdit(n)&&EDIT, mayEdit=canEdit(n), sp=L.space(n.space), h='';
  h+='<button class="rbx-mback" data-nbback="1" type="button">'+ic('arrow-right')+T('همهٔ محتوا','All content')+'</button>';
  h+='<div class="rbx-head"><button class="rbx-crumb" data-nbspace="'+sp.id+'" type="button">'+ic(sp.personal?'user-circle':'users-three')+esc(T(sp.fa,sp.en))+'</button></div>';
  h+='<div class="rbx-head"><span class="rbx-title rbn-title" id="rbnTitle"'+(mayEdit?' tabindex="0" role="button" title="'+T('برای تغییر نام کلیک کنید','Click to rename')+'" style="cursor:text"':'')+'>'+esc(T(n.fa,n.en))+'</span><span class="rbx-tipdot"'+tip(NTIPS.nb[0],NTIPS.nb[1])+'></span>'+
    '<span class="rbx-spacer"></span>'+(mayEdit&&window.RBAi?'<button class="rbx-icbtn" id="rbnAi" type="button">'+ic('sparkle')+T('ویرایش با دستیار','Edit with the assistant')+'</button>':'')+(mayEdit?'<button class="rbx-icbtn'+(EDIT?' on':'')+'" id="rbnMode" type="button" aria-pressed="'+EDIT+'">'+ic(EDIT?'eye':'pencil-simple')+(EDIT?T('پیش‌نمایش','Preview'):T('ویرایش','Edit'))+'</button>':'')+
    (TRAIL!=null&&RB.SAVED[TRAIL]?'<button class="rbx-icbtn" id="rbnTrail" type="button">'+ic('arrow-right')+T('بازگشت به ردپای تحلیل','Back to breadcrumbs')+'</button>':'')+'<button class="rbx-icbtn" id="rbnCmts" type="button" title="'+T('کامنت‌ها','Comments')+'">'+ic('chat-circle')+num((n.comments||[]).filter(function(c){ return !c.resolved; }).length)+'</button><button class="rbx-icbtn" id="rbnShare" type="button">'+ic('share-network')+T('اشتراک‌گذاری','Share')+'</button><button class="rbx-icbtn" id="rbnMore" type="button" aria-label="'+T('بیشتر','More')+'">'+ic('dots-three')+'</button></div>';
  if(ed||n.descFa) h+='<div class="rbn-desc'+(n.descFa?' has':'')+'" id="rbnDesc"'+(ed?' contenteditable="true" data-ph="'+esc(T('این نوت‌بوک به چه سؤالی جواب می‌دهد؟','What question does this notebook answer?'))+'"':'')+'>'+esc(T(n.descFa||'',n.descEn||n.descFa||''))+'</div>';
  h+='<div class="rbx-meta">'+(mayEdit?'<span class="rbx-badge">'+ic('pencil-simple')+T('می‌توانید ویرایش کنید','You can edit')+'</span>':'<span class="rbx-badge view">'+ic('eye')+T('فقط مشاهده','You can view')+'</span>')+
    '<span class="rbx-dot"></span><span>'+T('مالک: ','Owned by ')+'<b>'+esc(L.pname(n.owner))+'</b></span><span class="rbx-dot"></span><span>'+T('آخرین تغییر ','Last edited ')+L.ago(n.updated)+'</span><span class="rbx-dot"></span><span>'+T(num(n.views)+' بازدید',n.views+' views')+'</span></div>';
  if(!mayEdit) h+='<div class="rbx-viewbar">'+ic('info')+'<span>'+T('شما بینندهٔ این نوت‌بوک هستید. برای ساختن نسخهٔ خودتان آن را کپی کنید.','You are a viewer on this notebook. Copy it to make your own version.')+'</span><button class="sh-btn ghost compact" data-nbcopy="1" type="button">'+T('کپی نوت‌بوک','Copy notebook')+'</button></div>';
  h+='<div class="rbn-doc'+(ed?' edit':'')+'" id="rbnDoc">';
  if(!n.blocks.length) h+='<div class="sh-state"><div class="sh-state-icon">'+ic('notebook')+'</div><div class="sh-state-title">'+T('این نوت‌بوک هنوز خالی است','This notebook is empty')+'</div><div class="sh-state-hint">'+T('سرتیتر و متن بنویسید و نمودار، کوهورت، تصویر یا ویدیو کنارشان بگذارید تا تحلیل را روایت کنید.','Write headers and text, and place charts, cohorts, images or videos beside them to tell the story of an analysis.')+'</div>'+(mayEdit?'<button class="sh-btn primary compact" data-ins="0" type="button">'+ic('plus')+' '+T('افزودن بلوک','Add block')+'</button>':'')+'</div>';
  else for(var i=0;i<n.blocks.length;i++){ var b=n.blocks[i];
    if(ed) h+=insHtml(i);
    /* two columns: a block marked «pair» sits beside the next one (Amplitude's multi-column layout) */
    if(b.pair&&n.blocks[i+1]){ h+='<div class="rbn-row2">'+blockHtml(n,b,i,ed)+blockHtml(n,n.blocks[i+1],i+1,ed)+'</div>'; i++; }
    else h+=blockHtml(n,b,i,ed); }
  if(ed&&n.blocks.length) h+=insHtml(n.blocks.length);
  h+='</div>';
  return h;
}
/* ── editing ── */
function touch(n){ n.updated=0; n.editor='me'; }
function rerender(){ RBShell.rerender(); }
function addBlock(n, at, k){
  function put(b){ b.id=bid(); n.blocks.splice(at,0,b); touch(n); rerender(); setTimeout(function(){ var el=document.querySelector('[data-bi="'+at+'"] [contenteditable]'); if(el&&(b.k==='header'||b.k==='text')){ el.focus(); var r=document.createRange(); r.selectNodeContents(el); var s=getSelection(); s.removeAllRanges(); s.addRange(r); } }, 40); }
  if(k==='header') return put({ k:'header', fa:'سرتیتر تازه', en:'New header' });
  if(k==='text') return put({ k:'text', fa:'بنویسید چه دیدید و چرا مهم است…', en:'Write what you found and why it matters…' });
  if(k==='chart') return chartPicker(function(r){ put({ k:'chart', r:r }); });
  if(k==='cohort'){ var cs=NB.cohorts().filter(function(c){ return !c.archived; }); if(!cs.length){ U.toast('هنوز کوهورتی نیست','No cohorts yet'); return; }
    return U.modal({ fa:'افزودن کوهورت', en:'Add cohort', body:'<div class="rbx-field"><label>'+T('کوهورت','Cohort')+'</label><select class="sh-select" id="rbnCo">'+cs.map(function(c){ return '<option value="'+c.id+'">'+esc(T(c.fa,c.en))+'</option>'; }).join('')+'</select></div>',
      actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'افزودن', en:'Add', fn:function(bd){ put({ k:'cohort', cid:bd.querySelector('#rbnCo').value }); } }] }); }
  if(k==='replay') return U.modal({ fa:'افزودن ضبط نشست', en:'Add a session replay', subFa:'هر ضبط یک نشست یک دستگاه است؛ کاربرِ شناسایی‌شده ضبط‌های همهٔ دستگاه‌هایش را دارد.', subEn:'Each recording is one session of one device; an identified user has the recordings of all their devices.', wide:true,
    body:'<div class="rbn-pick">'+REPLAYS.map(function(r){ return '<button class="rbx-pickrow" data-rpk="'+r[0]+'" type="button">'+ic('play-circle')+'<span class="grow">'+esc(T(r[1],r[2]))+'<br><span class="hint">'+fmtDur(r[3])+' · '+T(num(r[4])+' صفحه',r[4]+' pages')+' · '+T(r[5],r[6])+'</span></span></button>'; }).join('')+'</div>',
    init:function(bd, close){ bd.querySelectorAll('[data-rpk]').forEach(function(x){ x.addEventListener('click', function(){ close(); put({ k:'replay', sid:x.getAttribute('data-rpk') }); }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true }] });
  var vid=k==='video';
  U.modal({ fa:vid?'افزودن ویدیو':'افزودن تصویر', en:vid?'Add a video':'Add an image',
    body:'<div class="rbx-field"><label>'+(vid?T('نشانی ویدیو','Video URL'):T('نشانی تصویر','Image URL'))+'</label><input class="sh-input" id="rbnMu" dir="ltr" placeholder="https://"/></div><div class="rbx-note">'+(vid?T('ویدیوی عمومی آپارات، یوتیوب یا ویمئو.','A public Aparat, YouTube or Vimeo video.'):T('تصویر PNG، JPG یا GIF؛ قالب BMP پذیرفته نمی‌شود.','A PNG, JPG or GIF image; BMP isn’t supported.'))+'</div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'افزودن', en:'Add', fn:function(bd){ var u=bd.querySelector('#rbnMu').value.trim();
      if(!/^https?:\/\/\S+\.\S+/.test(u)){ U.toast('یک نشانی کامل با https:// وارد کنید','Enter a full https:// address'); return false; }
      if(!vid&&/\.bmp(\?|$)/i.test(u)){ U.toast('قالب BMP در نوت‌بوک پذیرفته نمی‌شود','BMP images aren’t supported in notebooks'); return false; }
      put({ k:k, url:u, fa:'', en:'' }); } }] });
}
function chartPicker(cb){
  var list=RB.SAVED.map(function(s,i){ return { i:i, s:s, m:RBShell.meta(i) }; }).filter(function(x){ return x.m && !x.m.archived; });
  var md=U.modal({ fa:'افزودن نمودار', en:'Add a chart', subFa:'نمودار زنده اضافه می‌شود: هر تغییری در گزارش این‌جا هم دیده می‌شود.', subEn:'The chart is added live: any edit to the chart shows here too.', wide:true,
    body:'<input class="sh-input" id="rbnCq" placeholder="'+T('جستجوی گزارش…','Search charts…')+'"/><div class="rbn-pick" id="rbnPick">'+list.map(function(x){ var no=NO_NB.indexOf(x.s.type)>-1;
      return '<button class="rbx-pickrow" data-pkr="'+x.i+'" type="button"'+(no?' disabled title="'+esc(T('این نوع نمودار را نمی‌شود به نوت‌بوک اضافه کرد','This chart type can’t be added to a notebook'))+'"':'')+'>'+ic('chart-line')+'<span class="grow">'+esc(T(x.s.fa,x.s.en))+'<br><span class="hint">'+esc(T(L.space(x.m.space).fa,L.space(x.m.space).en))+(no?' · '+T('در نوت‌بوک پذیرفته نمی‌شود','not allowed in notebooks'):'')+'</span></span>'+NB.typeChip(x.s.type)+'</button>'; }).join('')+'</div>',
    init:function(bd){ bd.querySelector('#rbnCq').addEventListener('input', function(e){ var q=e.target.value.trim().toLowerCase(); bd.querySelectorAll('[data-pkr]').forEach(function(r){ r.hidden=q&&r.textContent.toLowerCase().indexOf(q)<0; }); });
      bd.querySelectorAll('[data-pkr]').forEach(function(r){ r.addEventListener('click', function(){ if(r.disabled) return; md.close(); cb(+r.getAttribute('data-pkr')); }); }); },
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true }] });
}
function penModal(n, i){
  var b=n.blocks[i], c=b.call||{ t:'', fa:'', en:'', trk:[] };
  U.modal({ fa:'نکتهٔ کلیدی نمودار', en:'Chart takeaway', subFa:'جمع‌بندی شما بالای نمودار نشان داده می‌شود.', subEn:'Your summary shows above the chart.',
    body:'<div class="rbx-field"><label>'+T('نوع کادر','Callout type')+'<span class="rbx-tipdot"'+tip(NTIPS.call[0],NTIPS.call[1])+'></span></label><div class="rbn-tones">'+[['','بدون کادر','No callout']].concat(Object.keys(CALL).map(function(k){ return [k,CALL[k][0],CALL[k][1]]; })).map(function(o){ return '<label class="rbz-rad t-'+(o[0]||'none')+'"><input type="radio" name="rbnT" value="'+o[0]+'"'+(c.t===o[0]?' checked':'')+'/> '+T(o[1],o[2])+'</label>'; }).join('')+'</div></div>'+
      '<div class="rbx-field"><label>'+T('متن','Text')+'</label><textarea class="sh-input" id="rbnCt" rows="3" placeholder="'+T('مثلاً: شروع پخش ۱۲٪ بیشتر شده.','e.g. Plays are up 12%.')+'">'+esc(T(c.fa,c.en||c.fa))+'</textarea></div>'+
      '<div class="rbx-field"><label>'+T('ردیاب متریک','Metric trackers')+'</label>'+Object.keys(TRK).map(function(k){ return '<label class="rbz-ck"><input type="checkbox" data-trk="'+k+'"'+((c.trk||[]).indexOf(k)>-1?' checked':'')+'/> '+T(TRK[k][0],TRK[k][1])+'</label>'; }).join('')+'</div>'+
      '<div class="rbx-field"><label>'+T('نمایش','Display')+'</label><label class="rbz-rad"><input type="radio" name="rbnM" value="chart"'+(b.mode!=='table'?' checked':'')+'/> '+T('نمودار','Chart')+'</label><label class="rbz-rad"><input type="radio" name="rbnM" value="table"'+(b.mode==='table'?' checked':'')+'/> '+T('جدول','Table')+'</label></div>',
    actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var t=bd.querySelector('input[name=rbnT]:checked').value, tx=bd.querySelector('#rbnCt').value.trim();
      b.call=t?{ t:t, fa:tx, en:tx, trk:[].slice.call(bd.querySelectorAll('[data-trk]:checked')).map(function(x){ return x.getAttribute('data-trk'); }) }:null; b.mode=bd.querySelector('input[name=rbnM]:checked').value; touch(n); rerender(); } }] });
}
function blockMenu(anchor, n, i){
  var b=n.blocks[i];
  U.menu(anchor, [
    { icon:'arrow-right', fa:'بالا بردن', en:'Move up', disabled:i===0, fn:function(){ move(n,i,i-1); } },
    { icon:'arrow-left', fa:'پایین بردن', en:'Move down', disabled:i===n.blocks.length-1, fn:function(){ move(n,i,i+1); } },
    { icon:'copy', fa:'تکثیر بلوک', en:'Duplicate block', fn:function(){ var c=JSON.parse(JSON.stringify(b)); c.id=bid(); delete c.pair; n.blocks.splice(i+1,0,c); touch(n); rerender(); } }
  ].concat(b.pair||(n.blocks[i-1]&&n.blocks[i-1].pair)?[{ icon:'columns', fa:'جدا کردن ستون‌ها', en:'Unstack columns', fn:function(){ if(b.pair) b.pair=false; else n.blocks[i-1].pair=false; touch(n); rerender(); } }]
    :i<n.blocks.length-1?[{ icon:'columns', fa:'کنار بلوک بعدی (دو ستون)', en:'Place beside the next block', fn:function(){ b.pair=true; if(n.blocks[i+1]) n.blocks[i+1].pair=false; if(n.blocks[i-1]) n.blocks[i-1].pair=false; touch(n); rerender(); } }]:[]).concat(b.k==='chart'&&RB.SAVED[b.r]&&!(NB.chartGone&&NB.chartGone(b.r))?[{ icon:'pencil-simple', fa:'ویرایش نکتهٔ کلیدی', en:'Edit takeaway', fn:function(){ penModal(n,i); } },{ icon:'arrow-square-out', fa:'باز کردن گزارش', en:'Open chart', fn:function(){ NB.openReport(b.r, n.id); } }]:[]).concat([{ sep:1 },
    { icon:'trash', fa:'حذف بلوک', en:'Delete block', danger:true, fn:function(){ n.blocks.splice(i,1); touch(n); rerender(); U.toast('بلوک حذف شد','Block deleted'); } }]), 'start');
}
function move(n, from, to){ if(to<0||to>=n.blocks.length) return; n.blocks.forEach(function(x){ x.pair=false; }); var b=n.blocks.splice(from,1)[0]; n.blocks.splice(to,0,b); touch(n); rerender(); }
function insMenu(anchor, n, at){ U.menu(anchor, Object.keys(KINDS).map(function(k){ return { icon:KINDS[k][2], fa:KINDS[k][0], en:KINDS[k][1], fn:function(){ addBlock(n, at, k); } }; }), 'start'); }
function richBar(el, n, i){
  var bar=document.createElement('div'); bar.className='rbx-txtbar rbn-bar';
  bar.innerHTML='<button type="button" data-cmd="bold" title="Ctrl+B"><b>B</b></button><button type="button" data-cmd="italic" title="Ctrl+I"><i>I</i></button><button type="button" data-cmd="insertUnorderedList">•</button><button type="button" data-cmd="insertOrderedList">1.</button><button type="button" data-cmd="createLink">'+T('لینک','Link')+'</button>';
  bar.querySelectorAll('[data-cmd]').forEach(function(x){ x.addEventListener('mousedown', function(e){ e.preventDefault(); var cmd=x.getAttribute('data-cmd');
    if(cmd==='createLink'){ var u=window.prompt(T('نشانی لینک','Link URL'),'https://'); if(u) document.execCommand('createLink', false, u); } else document.execCommand(cmd, false, null); }); });
  return bar;
}
/* 9b markdown (Amplitude: "type your markdown notations directly"): line starts become blocks, and on save **b**, _i_ and `code` become inline styles */
function mdLine(el){
  var sel=getSelection(); if(!sel.rangeCount) return; var node=sel.anchorNode; if(!node||node.nodeType!==3) return;
  var t=node.textContent.replace(/\u00a0/g,' '), rules=[[/^#{1,3} $/,'formatBlock','h3'],[/^[-*] $/,'insertUnorderedList'],[/^1[.)] $/,'insertOrderedList'],[/^> $/,'formatBlock','blockquote']];
  rules.some(function(r){ if(!r[0].test(t.slice(0, sel.anchorOffset))) return false; var k=sel.anchorOffset; node.textContent=node.textContent.slice(k); var rg=document.createRange(); rg.setStart(node,0); rg.collapse(true); sel.removeAllRanges(); sel.addRange(rg); document.execCommand(r[1], false, r[2]||null); return true; }); }
function mdInline(html){ return html.replace(/\*\*([^*<]+)\*\*/g,'<b>$1</b>').replace(/(^|[\s>])_([^_<]+)_(?=[\s<.,!?]|$)/g,'$1<i>$2</i>').replace(/`([^`<]+)`/g,'<code>$1</code>'); }
/* 9b paste (Amplitude: "paste hosted images"): an image address becomes an inline image; a copied file is refused, since only hosted images are supported */
function pasteImg(e, el){
  var cd=e.clipboardData; if(!cd) return;
  if([].slice.call(cd.items||[]).some(function(it){ return it.kind==='file'; })){ e.preventDefault(); U.toast('فقط تصویر میزبانی‌شده پذیرفته می‌شود؛ نشانی تصویر را بچسبانید','Only hosted images are supported; paste the image address'); return; }
  var t=(cd.getData('text/plain')||'').trim();
  if(/^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(t)){ e.preventDefault(); document.execCommand('insertHTML', false, '<span class="rbn-inimg" contenteditable="false">'+ic('image')+'<bdi dir="ltr">'+esc(t)+'</bdi></span>&nbsp;'); }
}
function save(n, i, html, isText){ var b=n.blocks[i]; if(!b) return; var v=isText?mdInline(html):html.replace(/<[^>]+>/g,'').trim(); if(T(b.fa,b.en||b.fa)===v) return; b.fa=v; b.en=v; touch(n); }
function wire(root){
  var ai=root.querySelector('#rbnAi'); if(ai) ai.addEventListener('click', function(){ RBAi.composer({ mode:'notebook', nb:nb() }); });
  var n=nb(); if(!n) return; var ed=canEdit(n)&&EDIT;
  function on(sel, fn){ root.querySelectorAll(sel).forEach(function(x){ x.addEventListener('click', function(e){ e.stopPropagation(); fn(x, e); }); }); }
  on('[data-nbback]', function(){ RBShell.go('content'); });
  on('[data-nbspace]', function(x){ NB.goSpace(x.getAttribute('data-nbspace')); });
  on('[data-nbcopy]', function(){ copyNb(n); });
  on('[data-bopen]', function(x){ NB.openReport(+x.getAttribute('data-bopen'), n.id); });
  on('[data-bcoh]', function(x){ if(window.RBCohort) RBCohort.open(x.getAttribute('data-bcoh')); });
  on('[data-brestore]', function(x){ if(x.disabled) return; if(NB.restoreChart&&NB.restoreChart(+x.getAttribute('data-brestore'))){ rerender(); U.toast('بازگردانده شد','Restored'); } });   /* PM 2026-10-25, WS-7 */
  var md=$('rbnMode'); if(md) md.addEventListener('click', function(){ EDIT=!EDIT; rerender(); });
  var sh=$('rbnShare'); if(sh) sh.addEventListener('click', function(){ shareNb(n); });
  var cm=$('rbnCmts'); if(cm) cm.addEventListener('click', function(){ NB.comments(n.comments, T(n.fa,n.en)); });
  var tb=$('rbnTrail'); if(tb) tb.addEventListener('click', function(){ var r=TRAIL; TRAILNB=n.id; NB.openReport(r, n.id); setTimeout(function(){ trail(r); }, 120); });
  var mo=$('rbnMore'); if(mo) mo.addEventListener('click', function(e){ e.stopPropagation(); moreMenu(mo, n); });
  var ti=$('rbnTitle'); if(ti&&canEdit(n)) ti.addEventListener('click', function(){ renameNb(n, ti); });
  if(!ed) return;
  on('[data-ins]', function(x){ insMenu(x, n, +x.getAttribute('data-ins')); });
  on('[data-bmenu]', function(x){ blockMenu(x, n, +x.getAttribute('data-bmenu')); });
  on('[data-bpen]', function(x){ penModal(n, +x.getAttribute('data-bpen')); });
  var ds=$('rbnDesc'); if(ds) ds.addEventListener('blur', function(){ var v=ds.textContent.trim(); if(v!==(n.descFa||'')){ n.descFa=n.descEn=v; touch(n); } });
  root.querySelectorAll('[data-btext]').forEach(function(el){ el.addEventListener('blur', function(){ save(n, +el.getAttribute('data-btext'), el.innerHTML, false); }); el.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); el.blur(); } }); });
  root.querySelectorAll('[data-bcap]').forEach(function(el){ el.addEventListener('blur', function(){ save(n, +el.getAttribute('data-bcap'), el.innerHTML, false); }); });
  root.querySelectorAll('[data-brich]').forEach(function(el){ var i=+el.getAttribute('data-brich'), bar=null;
    el.addEventListener('focus', function(){ if(!bar){ bar=richBar(el, n, i); el.parentNode.insertBefore(bar, el); } });
    el.addEventListener('blur', function(){ save(n, i, el.innerHTML, true); setTimeout(function(){ if(bar&&document.activeElement!==el){ bar.remove(); bar=null; } }, 120); });
    el.addEventListener('keydown', function(e){ if(e.key==='Escape'){ e.stopPropagation(); el.blur(); } });
    el.addEventListener('keyup', function(e){ if(e.key===' ') mdLine(el); });
    el.addEventListener('paste', function(e){ pasteImg(e, el); }); });
  /* drag and drop by the grip; the drop target is the block under the pointer */
  root.querySelectorAll('[data-grip]').forEach(function(g){ g.addEventListener('dragstart', function(e){ DRAG=+g.getAttribute('data-grip'); try{ e.dataTransfer.setData('text/plain', String(DRAG)); e.dataTransfer.effectAllowed='move'; }catch(x){} var bl=g.closest('.rbn-block'); if(bl) bl.classList.add('dragging'); }); g.addEventListener('dragend', function(){ DRAG=null; root.querySelectorAll('.rbn-block').forEach(function(x){ x.classList.remove('dragging','over'); }); }); });
  root.querySelectorAll('.rbn-block').forEach(function(bl){ bl.addEventListener('dragover', function(e){ if(DRAG==null) return; e.preventDefault(); bl.classList.add('over'); }); bl.addEventListener('dragleave', function(){ bl.classList.remove('over'); });
    bl.addEventListener('drop', function(e){ e.preventDefault(); var to=+bl.getAttribute('data-bi'); if(DRAG!=null&&to!==DRAG) move(n, DRAG, to); DRAG=null; }); });
}
function renameNb(n, el){
  var inp=document.createElement('input'); inp.className='sh-input rbn-tin'; inp.value=T(n.fa,n.en); el.replaceWith(inp); inp.focus(); inp.select();
  function done(ok){ if(ok&&inp.value.trim()){ n.fa=n.en=inp.value.trim(); touch(n); } rerender(); }
  inp.addEventListener('keydown', function(e){ if(e.key==='Enter') done(true); if(e.key==='Escape') done(false); }); inp.addEventListener('blur', function(){ done(true); });
}
function moreMenu(anchor, n){
  /* PM 2026-10-25, WS-6a / WS-6b: delete = the owner, or the project owner or an admin; archive = the owner or a space editor */
  var own=n.owner==='me', canDel=L.canDelete?L.canDelete(n.owner):own, canAr=L.canArchive?L.canArchive(n.owner, n.space):own;
  U.menu(anchor, [
    { icon:'copy', fa:'کپی نوت‌بوک', en:'Copy notebook', fn:function(){ copyNb(n); } },
    { icon:'folder', fa:'انتقال به فضای دیگر…', en:'Move to another space…', disabled:!canEdit(n), fn:function(){ NB.moveToSpace(n); } },
    { icon:'file-pdf', fa:'خروجی PDF', en:'Export PDF', fn:function(){ exportPdf(n); } },
    { icon:'chart-bar', fa:'آمار بازدید', en:'Views and usage', fn:function(){ usage(n); } },
    { sep:1 },
    { icon:'trash', fa:'حذف', en:'Delete', danger:true, disabled:!canDel, hint:canDel?['برای همیشه؛ نمودارهای داخلش سر جایشان می‌مانند','Permanent; the charts inside stay where they are']:['فقط مالک این مورد، مالک پروژه یا ادمین','Only its owner, the project owner or an admin'], fn:function(){ delNb(n); } },
    { icon:'archive', fa:'بایگانی', en:'Archive', disabled:!canAr, hint:canAr?['نوت‌بوک از فهرست‌ها برداشته می‌شود؛ حذف نمی‌شود','The notebook leaves the lists; it isn’t deleted']:['فقط مالک یا ویرایشگر فضا','Owner or space editor only'], fn:function(){ n.archived=true; CUR=null; RBShell.go('content'); U.toast('نوت‌بوک بایگانی شد','Notebook archived'); } }
  ], 'end');
}
/* Block C (2026-10-24): delete a notebook (Amplitude: More ▸ Delete), with a confirmation; archive stays the reversible option */
function delNb(n){ var mine=n.owner==='me';   /* PM 2026-10-25, WS-6a: the admin path names the owner, and every delete goes to the audit log */
  U.confirmBox({ fa:'حذف نوت‌بوک', en:'Delete notebook', bodyFa:'«'+n.fa+'» برای همیشه حذف می‌شود و برنمی‌گردد. نمودارهای داخلش سر جایشان می‌مانند؛ اگر فقط نمی‌خواهید دیده شود، بایگانی کنید.'+(mine?'':' این نوت‌بوک متعلق به «'+L.pname(n.owner)+'» است.')+' این حذف در لاگ ممیزی پروژه ثبت می‌شود.', bodyEn:'“'+n.en+'” is deleted for good and can’t be restored. The charts in it stay where they are; archive it if you only want it out of sight.'+(mine?'':' This notebook belongs to '+L.pname(n.owner)+'.')+' The deletion is recorded in the project’s audit log.', okFa:'حذف', okEn:'Delete', tone:'bad',
  fn:function(){ var st=NB.store(), k=st.indexOf(n); if(k>-1) st.splice(k,1); if(L.audit) L.audit('notebook', T(n.fa,n.en), n.owner); CUR=null; RBShell.go('content'); U.toast('نوت‌بوک حذف شد','Notebook deleted'); } }); }
function copyNb(n){
  var c=JSON.parse(JSON.stringify(n)); c.id='n'+(NB.store().length+1)+'_'+Date.now().toString(36); c.fa='کپی '+n.fa; c.en='Copy of '+n.en; c.owner='me'; c.editor='me'; c.space='me'; c.folder=''; c.updated=0; c.views=0; c.archived=false; c.people=[];
  (c.blocks||[]).forEach(function(b){ b.id=bid(); }); NB.store().push(c); open(c.id); U.toast('کپی در فضای شخصی شما ساخته شد','A copy was created in your personal space');
}
function shareNb(n){
  var P=L.people, roles={ edit:['ویرایشگر','Editor'], view:['بیننده','Viewer'] };
  function rows(){ return '<div class="rbx-people">'+'<div class="rbx-person">'+'<span class="grow"><b>'+esc(L.pname(n.owner))+'</b></span><span class="rbx-badge">'+T('مالک','Owner')+'</span></div>'+(n.people||[]).map(function(p,k){ return '<div class="rbx-person"><span class="grow">'+esc(L.pname(p.id))+'</span><select class="sh-select" data-nbrole="'+k+'">'+Object.keys(roles).map(function(r){ return '<option value="'+r+'"'+(p.role===r?' selected':'')+'>'+T(roles[r][0],roles[r][1])+'</option>'; }).join('')+'<option value="__rm">'+T('حذف','Remove')+'</option></select></div>'; }).join('')+'</div>'; }
  var others=Object.keys(P).filter(function(id){ return id!==n.owner && !(n.people||[]).some(function(p){ return p.id===id; }); });
  U.modal({ fa:'اشتراک‌گذاری «'+n.fa+'»', en:'Share “'+n.en+'”', wide:true,
    body:'<div class="rbx-field"><span class="rbx-flbl">'+T('افراد','People')+'</span><div id="rbnPeople">'+rows()+'</div>'+(canEdit(n)&&others.length?'<div class="rbx-copyrow"><select class="sh-select" id="rbnAddP">'+others.map(function(id){ return '<option value="'+id+'">'+esc(L.pname(id))+'</option>'; }).join('')+'</select><button class="sh-btn ghost compact" id="rbnAddPB" type="button">'+T('افزودن','Add')+'</button></div>':'')+'</div>'+
      '<div class="rbx-field"><span class="rbx-flbl">'+T('لینک داخلی','Internal link')+'</span><div class="rbx-copyrow"><input class="sh-input" readonly dir="ltr" value="'+esc(location.origin+location.pathname+'?notebook='+n.id)+'"/><button class="sh-btn ghost compact" id="rbnCopyL" type="button">'+ic('copy')+' '+T('کپی','Copy')+'</button></div><span class="rbx-note">'+T('بیننده‌ها نمودارها را با دسترسی خودشان به داده می‌بینند.','Viewers see charts with their own data access.')+'</span></div>'+
      '<div class="rbx-field"><span class="rbx-flbl">'+T('لینک عمومی','Public link')+'</span><div id="rbnPub"></div>'+hiddenNote(n)+'</div>',
    init:function(bd){ function rw(){ bd.querySelectorAll('[data-nbrole]').forEach(function(s){ s.addEventListener('change', function(){ var k=+s.getAttribute('data-nbrole'); if(s.value==='__rm') n.people.splice(k,1); else n.people[k].role=s.value; bd.querySelector('#rbnPeople').innerHTML=rows(); rw(); U.toast('دسترسی به‌روز شد','Access updated'); }); }); }
      rw(); var ab=bd.querySelector('#rbnAddPB'); if(ab) ab.addEventListener('click', function(){ var id=bd.querySelector('#rbnAddP').value; (n.people=n.people||[]).push({ id:id, role:'view' }); bd.querySelector('#rbnPeople').innerHTML=rows(); rw(); var o=bd.querySelector('#rbnAddP option[value="'+id+'"]'); if(o) o.remove(); U.toast(L.pname(id)+' اضافه شد', L.pname(id)+' added'); });
      bd.querySelector('#rbnCopyL').addEventListener('click', function(){ U.toast('کپی شد','Copied'); }); NB.pubSection(bd.querySelector('#rbnPub'), n, canEdit(n)); },
    actions:[{ fa:'تمام', en:'Done' }] });
}
function hiddenNote(n){ var hid=(n.blocks||[]).filter(function(b){ return b.k==='chart'&&RB.SAVED[b.r]&&NO_PUBLIC.indexOf(RB.SAVED[b.r].type)>-1; });
  return hid.length?'<div class="rbx-callout warn">'+ic('eye')+'<span>'+T('در لینک عمومی پنهان می‌شود: ','Hidden on the public link: ')+hid.map(function(b){ return '«'+esc(NB.reportLabel(b.r))+'»'; }).join(T('، ',', '))+'</span></div>'
    :'<span class="rbx-note">'+T('نمودارهای مسیرها و نتایج آزمایش در لینک عمومی پنهان می‌شوند.','Flows and Experiment Results charts are hidden on a public link.')+'</span>'; }
/* 9b: PDF through the browser's print dialog, with the blocks as they read (no edit tools) */
function exportPdf(n){
  var doc=$('rbnDoc'); if(!doc) return; var c=doc.cloneNode(true); c.querySelectorAll('.rbn-tools,.rbn-ins,.rbx-icbtn,.rbn-bar').forEach(function(x){ x.remove(); }); c.querySelectorAll('[contenteditable]').forEach(function(x){ x.removeAttribute('contenteditable'); });
  var w=window.open('', '_blank'); if(!w){ U.toast('پنجرهٔ چاپ مسدود شد؛ اجازهٔ پنجرهٔ بازشو را بدهید','The print window was blocked; allow pop-ups'); return; }
  var css=[].slice.call(document.querySelectorAll('link[rel=stylesheet]')).map(function(l){ return '<link rel="stylesheet" href="'+l.href+'"/>'; }).join('');
  w.document.write('<!doctype html><html dir="'+(fa()?'rtl':'ltr')+'" lang="'+(fa()?'fa':'en')+'" data-theme="light"><head><meta charset="utf-8"><title>'+esc(T(n.fa,n.en))+'</title>'+css+'<style>body{margin:24px;background:#fff}.rbn-doc{margin:0 auto}</style></head><body><h1>'+esc(T(n.fa,n.en))+'</h1>'+c.outerHTML+'</body></html>');
  w.document.close(); setTimeout(function(){ try{ w.focus(); w.print(); }catch(x){} }, 400);
  U.toast('پنجرهٔ چاپ باز شد؛ «ذخیره به‌صورت PDF» را بزنید','Print window opened; choose “Save as PDF”'); }
/* 9b: who read it (Amplitude counts notebook loads in the usage report and calls one read by two or more people in seven days a broadcasted learning) */
function usage(n){
  var week=(n.viewLog||[]).filter(function(v){ return v.h<=24*7; }), people=week.map(function(v){ return v.id; }).filter(function(x,i,a){ return a.indexOf(x)===i; });
  U.modal({ fa:'آمار بازدید', en:'Views and usage', subFa:'هر بار باز شدن نوت‌بوک یک بازدید است.', subEn:'Every time the notebook loads counts as a view.',
    body:'<div class="rbn-usage"><div><b>'+num(n.views||0)+'</b><span>'+T('بازدید کل','Total views')+'</span></div><div><b>'+num(people.length)+'</b><span>'+T('خوانندهٔ ۷ روز اخیر','Readers, last 7 days')+'</span></div><div><b>'+num((n.blocks||[]).filter(function(b){ return b.k==='chart'; }).length)+'</b><span>'+T('نمودار زنده','Live charts')+'</span></div></div>'+
      (people.length>=2?'<div class="rbx-callout">'+ic('check-circle')+'<span>'+T('یادگیری منتشرشده: دست‌کم دو نفر در ۷ روز اخیر آن را خوانده‌اند.','Broadcasted learning: at least two people read it in the last 7 days.')+'</span></div>':'<span class="rbx-note">'+T('وقتی دست‌کم دو نفر در ۷ روز آن را بخوانند «یادگیری منتشرشده» شمرده می‌شود.','It counts as a broadcasted learning once two or more people read it within 7 days.')+'</span>')+
      '<div class="rbx-field"><span class="rbx-flbl">'+T('آخرین خواننده‌ها','Recent readers')+'</span>'+(n.viewLog||[]).map(function(v){ return '<div class="rbx-person"><span class="grow">'+esc(L.pname(v.id))+'</span><span class="rbx-note">'+L.ago(v.h)+'</span></div>'; }).join('')+'</div>',
    actions:[{ fa:'بستن', en:'Close' }] }); }
/* 9b breadcrumbs (Amplitude: chart More > Open Notebook View): a side panel that builds a notebook while you analyse */
function trail(r){
  TRAIL=r; var editable=NB.store().filter(function(x){ return !x.archived && canEdit(x); });
  if(TRAILNB!=='new'&&!editable.some(function(x){ return x.id===TRAILNB; })) TRAILNB='new';
  NB.panel({ fa:'نمای نوت‌بوک', en:'Notebook view', render:function(body){
    function draw(){
      var n=TRAILNB==='new'?null:NB.store().filter(function(x){ return x.id===TRAILNB; })[0], s=RB.SAVED[r], saved=r>=0&&s, no=saved&&NO_NB.indexOf(s.type)>-1;
      if(n) seedBlocks(n);
      var thumbs=n?n.blocks.map(function(b,bi){ return { b:b, bi:bi }; }).filter(function(x){ return x.b.k==='chart'&&RB.SAVED[x.b.r]; }):[];
      body.innerHTML='<div class="rbx-field"><span class="rbx-flbl">'+T('نوت‌بوک','Notebook')+'</span><select class="sh-select" id="rbnTsel"><option value="new"'+(TRAILNB==='new'?' selected':'')+'>'+T('نوت‌بوک تازه','New notebook')+'</option>'+editable.map(function(x){ return '<option value="'+x.id+'"'+(TRAILNB===x.id?' selected':'')+'>'+esc(T(x.fa,x.en))+'</option>'; }).join('')+'</select></div>'+
        '<button class="sh-btn primary compact" id="rbnTadd" type="button"'+(!saved||no?' disabled':'')+'>'+ic('plus')+' '+T('افزودن نمودار به نوت‌بوک','Add chart to notebook')+'</button>'+
        (!saved?'<span class="rbx-note">'+T('اول گزارش را ذخیره کنید.','Save the chart first.')+'</span>':no?'<span class="rbx-note">'+T('این نوع نمودار را نمی‌شود به نوت‌بوک اضافه کرد.','This chart type can’t be added to a notebook.')+'</span>':'')+
        '<div class="rbn-thumbs">'+(thumbs.length?thumbs.map(function(x){ var b=x.b, nx=n.blocks[x.bi+1], note=nx&&nx.k==='text'&&nx.note?T(nx.fa,nx.en||nx.fa):'';
          return '<div class="rbn-thumb'+(b.r===r?' cur':'')+'"><input class="sh-input" data-tren="'+b.r+'" value="'+esc(NB.reportLabel(b.r))+'" aria-label="'+T('نام نمودار','Chart name')+'"/>'+NB.typeChip(RB.SAVED[b.r].type)+(note?'<div class="rbn-tnote">'+esc(note.replace(/<[^>]+>/g,''))+'</div>':'')+'<button class="rb-linkbtn" data-tnote="'+x.bi+'" type="button">'+ic('pencil-simple')+(note?T('ویرایش یادداشت','Edit note'):T('افزودن یادداشت','Add note'))+'</button></div>'; }).join('')
          :'<div class="sh-state" style="padding:20px 6px"><div class="sh-state-title">'+T('هنوز نموداری در این نوت‌بوک نیست','No charts in this notebook yet')+'</div><div class="sh-state-hint">'+T('هر نموداری را که در تحلیل به آن می‌رسید با دکمهٔ بالا اضافه کنید؛ ردپای تحلیل این‌جا می‌ماند.','Add each chart you reach while analysing with the button above; the trail of your analysis stays here.')+'</div></div>')+'</div>'+
        (n?'<button class="sh-btn ghost compact" id="rbnTopen" type="button">'+ic('arrow-square-out')+' '+T('باز کردن نمای نوت‌بوک','Open notebook view')+'</button>':'')+
        '<span class="rbx-note">'+T('تغییر نام در این‌جا نام خود نمودار را هم عوض می‌کند.','Renaming here also renames the chart itself.')+'</span>';
      body.querySelector('#rbnTsel').addEventListener('change', function(e){ TRAILNB=e.target.value; draw(); });
      var ad=body.querySelector('#rbnTadd'); if(ad) ad.addEventListener('click', function(){ if(!n){ var nn=create({ fa:'ردپای تحلیل', en:'Analysis breadcrumbs', blocks:[] }); TRAILNB=nn.id; editable.push(nn); n=nn; }
        addChart(n.id, r); U.toast('به نوت‌بوک «'+n.fa+'» اضافه شد','Added to the notebook “'+n.en+'”'); draw(); });
      body.querySelectorAll('[data-tren]').forEach(function(x){ x.addEventListener('change', function(){ var ri=+x.getAttribute('data-tren'), v=x.value.trim(); if(!v) return; RB.SAVED[ri].fa=RB.SAVED[ri].en=v; var tt=document.getElementById('rbTitleTxt'); if(tt&&ri===NB.current()) tt.textContent=v; U.toast('نام نمودار عوض شد','Chart renamed'); }); });
      body.querySelectorAll('[data-tnote]').forEach(function(x){ x.addEventListener('click', function(){ var bi=+x.getAttribute('data-tnote'), nx=n.blocks[bi+1], has=nx&&nx.k==='text'&&nx.note;
        U.modal({ fa:'یادداشت زیر نمودار', en:'Note under the chart', body:'<textarea class="sh-input" id="rbnTn" rows="4">'+esc(has?T(nx.fa,nx.en||nx.fa).replace(/<[^>]+>/g,''):'')+'</textarea>',
          actions:[{ fa:'انصراف', en:'Cancel', ghost:true },{ fa:'ذخیره', en:'Save', fn:function(bd){ var v=bd.querySelector('#rbnTn').value.trim(); if(has){ nx.fa=nx.en=esc(v); } else if(v){ n.blocks.splice(bi+1,0,{ id:bid(), k:'text', note:true, fa:esc(v), en:esc(v) }); } touch(n); draw(); } }] }); }); });
      var op=body.querySelector('#rbnTopen'); if(op) op.addEventListener('click', function(){ NB.closePanel(); open(n.id, r); });
    }
    draw(); } }); }
/* ── entry points ── */
function open(id, fromTrail){ TRAIL=fromTrail!=null?fromTrail:null; CUR=id; EDIT=true; var n=nb(); if(n){ n.views=(n.views||0)+1; seedBlocks(n); } RBShell.go('notebook'); }
function create(opts){
  opts=opts||{}; var id='n'+(NB.store().length+1)+'_'+Date.now().toString(36);
  var n={ id:id, fa:opts.fa||'نوت‌بوک بی‌نام', en:opts.en||'Untitled notebook', space:'me', folder:'', owner:'me', editor:'me', updated:0, views:0, tags:[], archived:false, reps:[], people:[], descFa:'', descEn:'',
    blocks:opts.blocks||[{ k:'header', fa:'عنوان تحلیل', en:'Analysis title' },{ k:'text', fa:'این نوت‌بوک به چه سؤالی جواب می‌دهد؟ از این‌جا بنویسید و با «+» نمودار اضافه کنید.', en:'What question does this notebook answer? Start writing here and add charts with “+”.' }] };
  n.blocks.forEach(function(b){ b.id=b.id||bid(); }); NB.store().push(n); return n;
}
function addChart(id, r){ var n=NB.store().filter(function(x){ return x.id===id; })[0]; if(!n) return false; seedBlocks(n); n.blocks.push({ id:bid(), k:'chart', r:r }); n.reps=(n.reps||[]).concat([r]); touch(n); return true; }
/* Copy as notebook (seen in Amplitude's dashboard More menu): cards become blocks in reading order; the copy is yours */
function fromBoard(b){
  var blocks=[{ k:'header', fa:b.fa, en:b.en }], skipped=0;
  if(b.descFa||b.descEn) blocks.push({ k:'text', fa:b.descFa||b.descEn, en:b.descEn||b.descFa });
  (b.rows||[]).forEach(function(row){ row.forEach(function(c){
    if(c.k==='text') blocks.push({ k:'text', fa:c.fa, en:c.en||c.fa });
    else if(c.k==='media') blocks.push({ k:c.media==='video'?'video':'image', url:c.url, fa:'', en:'' });
    else if(c.k==='cohort') blocks.push({ k:'cohort', cid:c.cid });
    else if(c.r!=null&&RB.SAVED[c.r]){ if(NO_NB.indexOf(RB.SAVED[c.r].type)>-1) skipped++; else blocks.push({ k:'chart', r:c.r, mode:c.mode==='table'?'table':'chart' }); } }); });
  var n=create({ fa:'«'+b.fa+'» (نوت‌بوک)', en:'“'+b.en+'” (notebook)', blocks:blocks });
  open(n.id);
  U.toast(skipped?'نوت‌بوک در فضای شخصی ساخته شد؛ '+num(skipped)+' نمودار پرسوناها پذیرفته نمی‌شود':'نوت‌بوک در فضای شخصی شما ساخته شد', skipped?'Notebook created in your personal space; '+skipped+' Personas chart(s) aren’t allowed':'Notebook created in your personal space');
  return n;
}
window.RBNotebook={ make:function(o){ return create(o); }, view:view, wire:wire, open:function(id){ open(id); }, trail:trail, _md:mdInline, create:function(){ var n=create(); open(n.id); return n; }, addChart:addChart, fromBoard:fromBoard, current:function(){ return CUR; }, get:function(){ return nb(); }, seed:function(n){ seedBlocks(n); }, bid:function(){ return bid(); }, touch:function(n){ touch(n); }, noNb:NO_NB.slice(), _seed:seedBlocks };
})();
