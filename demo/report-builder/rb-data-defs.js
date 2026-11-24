/* ═════════ Data definitions (lexicon batch b, after phase 4) — v12 engine module ═════════
   Spec: research-notes/…/40-lexicon-b-design.md. One definition per project, stored in localStorage['shahin-data-defs-p<project>'],
   materialized into the engine's own catalog (RB.EVENTS / RB.PROPS / RB.VIRTUALS / RB.GLOBAL_PROPS) before the builder boots and
   again on every change — so the builder, the ready dashboards (rb-bridge.js) and the events page read the same numbers.
   PM decisions 2026-10-21: managed on the events page and creatable from the builder's picker (one definition); channel rules are a
   new property («کانال ورود» stays); transformations and drop filters apply everywhere, as in Amplitude.
   With no definitions this module changes nothing. Objects:
   - combined events: OR of components, each an event with its own property filters (compF beside the plain-id comps);
   - derived properties: a formula over one source property (shares = the source's shares grouped by the formula's result, per
     event too) or, since PM 2026-10-25 (LX-16), over up to three properties. The engine keeps properties independent, so a
     multi-property result is an approximation (shares multiplied as if independent): the definition is stored, and the preview
     and the property carry a plain «تقریبی» note saying the demo number is approximate (no «نیازمند توسعه», LX-6);
   - channel rules: ordered rules over referrer_type / utm_source / utm_medium (first match wins) → a new property, with the
     UTM «No campaign» all-or-none mix of phase 4b and referrer independent of UTM, as everywhere in the engine;
   - lookup tables: a CSV keyed by one property's values; each other column becomes a property;
   - transformations: merge events (the source's volume moves to the target, the source's own w becomes 0), merge properties
     (the source is hidden), rename a value (both labels; the old key stays an alias, so saved filters keep matching), hide a value
     (out of breakdowns and pickers, totals keep it);
   - drop filters: an event (or every event) where a property matches leaves every report; w × (1 − the condition's share). */
(function(){
'use strict';
var R=window.RB; if(!R) return;
function key(){ return 'shahin-data-defs-p'+(R.PROJECT||0); }
function blank(){ return { cev:[], dprop:[], chan:null, lookup:[], tx:[], drop:[], comp:[], persist:[], metrics:null, del:[], pdel:[], lab:null, ac:null, v:1 }; }
/* ── autocapture settings and labeled events (2026-10-24; research: Amplitude Autocapture, Remote Configuration, Visual Labeling) ──
   Shahin doesn't capture element clicks today (decision D0c in the Tech-Specs), so neither is backed by production yet (no «نیازمند توسعه» on the events page, LX-6).
   A labeled event is a saved definition over autocaptured clicks: it costs no new data and works on history (Amplitude). Each one
   becomes an engine event in the «ایونت‌های برچسبی» group; `late` keeps it out of every all-events pool, so no existing number moves.
   Seeds: two or three per project, one of them broken by a site change (no data for 12 days), to show Repair. */
var AC_DEFAULT={ cats:{ page:1, session:1, video:1, commerce:1, replay:1, scroll:1, form:1, download:1, element:1, frustration:0 },
  allow:['a','button','input','select','textarea','[role="button"]','[data-sh-track]'], urlAllow:[], urlExclude:[], mask:[], prefix:'data-sh-track-' };
var LAB_SEED={
  0:[{ id:'lab_wishlist_add', fa:'کلیک روی افزودن به علاقه‌مندی‌ها', en:'Clicked add to wishlist', cat:'shop', trig:'click', defs:[{ sel:'.product-card button.wishlist', text:'', url:'/product/*' }], w:640, by:'pm', at:'2026-10-09', seen:0 },
     { id:'lab_size_guide', fa:'باز کردن جدول سایز', en:'Opened size guide', cat:'shop', trig:'click', defs:[{ sel:'a.size-guide', text:'جدول سایز', url:'/product/*' }], w:410, by:'an', at:'2026-10-14', seen:0 },
     { id:'lab_home_promo', fa:'کلیک روی بنر تخفیف صفحهٔ اصلی', en:'Clicked home promo banner', cat:'shop', trig:'click', defs:[{ sel:'#hero .promo-banner > a', text:'', url:'/' }], w:880, by:'mk', at:'2026-09-28', seen:12 }],
  1:[{ id:'lab_premium_cta', fa:'کلیک روی خرید اشتراک ویژه', en:'Clicked premium subscription', cat:'sub', trig:'click', defs:[{ sel:'.player-side .premium-cta', text:'', url:'/watch/*' }], w:520, by:'pm', at:'2026-10-11', seen:0 },
     { id:'lab_quality_menu', fa:'باز کردن منوی کیفیت پخش', en:'Opened quality menu', cat:'video', trig:'click', defs:[{ sel:'.player .quality-btn', text:'', url:'/watch/*' }], w:2300, by:'an', at:'2026-10-02', seen:12 }],
  2:[{ id:'lab_newsletter_end', fa:'کلیک روی خبرنامه در پایان خبر', en:'Clicked newsletter at article end', cat:'sub', trig:'click', defs:[{ sel:'.article-end .newsletter-cta', text:'', url:'/news/*' }], w:390, by:'pm', at:'2026-10-12', seen:0 },
     { id:'lab_related_news', fa:'کلیک روی خبرهای مرتبط', en:'Clicked related news', cat:'read', trig:'click', defs:[{ sel:'.related-news a', text:'', url:'/news/*' }], w:5200, by:'an', at:'2026-10-04', seen:0 },
     { id:'lab_breaking_bar', fa:'کلیک روی نوار خبر فوری', en:'Clicked breaking-news bar', cat:'read', trig:'click', defs:[{ sel:'#breaking > a', text:'', url:'/' }], w:1500, by:'mk', at:'2026-09-25', seen:12 }],
  3:[] };
/* labeled-event categories (PM 2026-11-14: «دسته‌بندی»): one list for the events page (table, filter, edit form, labeler) and the
   builder's picker (rows sorted by it, shown on each row and in the hover card); '' = no category, always last.
   PM 2026-11-14 (#481): the same fixed list as the events list (events-settings/es-v13.js CATS), no custom categories */
var LAB_CATS=[['core','پایه','Core'],['video','ویدیو','Video'],['ads','آگهی','Ads'],['shop','خرید','Shopping'],['read','خواندن','Reading'],['search','جستجو','Search'],['form','فرم','Forms'],['sub','اشتراک','Subscription'],['support','پشتیبانی','Support'],['exp','آزمایش','Experiments']];
function labList(){ if(!DEFS.lab) DEFS.lab=JSON.parse(JSON.stringify(LAB_SEED[R.PROJECT||0]||[])); return DEFS.lab; }
function acCfg(){ return DEFS.ac||JSON.parse(JSON.stringify(AC_DEFAULT)); }
function read(){ try{ return JSON.parse(localStorage.getItem(key())||'null')||blank(); }catch(e){ return blank(); } }
function write(d){ try{ localStorage.setItem(key(), JSON.stringify(d)); }catch(e){} }
var DEFS=read(); ['comp','persist','del','pdel','vdel'].forEach(function(k){ if(!DEFS[k]) DEFS[k]=[]; }); if(DEFS.metrics===undefined) DEFS.metrics=null;

/* ── the snapshot: everything apply() may touch, restored first so apply() is idempotent ── */
var SNAP=null;
function snapshot(){
  if(SNAP) return;
  SNAP={ w:{}, props:{}, evProps:{}, gprops:R.GLOBAL_PROPS.slice(), virt:R.VIRTUALS.map(function(v){ return JSON.parse(JSON.stringify(v)); }), propKeys:Object.keys(R.PROPS) };
  R.EVENTS.forEach(function(e){ SNAP.w[e.id]=e.w; SNAP.evProps[e.id]=e.props.slice(); });
  Object.keys(R.PROPS).forEach(function(k){ SNAP.props[k]=JSON.stringify(R.PROPS[k]); }); }
function restore(){
  if(!SNAP) return;
  R.EVENTS.forEach(function(e){ if(e.id in SNAP.w){ e.w=SNAP.w[e.id]; e.props=SNAP.evProps[e.id].slice(); } delete e.hidden; delete e.mergedInto; delete e.dropped; delete e.mergeFrom; delete e.deleted; delete e.noPath; delete e.inactive; delete e.hideIn; });
  Object.keys(R.PROPS).forEach(function(k){ if(SNAP.propKeys.indexOf(k)<0) delete R.PROPS[k]; });
  Object.keys(SNAP.props).forEach(function(k){ var o=JSON.parse(SNAP.props[k]); Object.keys(R.PROPS[k]).forEach(function(f){ delete R.PROPS[k][f]; }); Object.assign(R.PROPS[k], o); });
  R.GLOBAL_PROPS.length=0; SNAP.gprops.forEach(function(p){ R.GLOBAL_PROPS.push(p); });
  R.VIRTUALS.length=0; SNAP.virt.forEach(function(v){ R.VIRTUALS.push(JSON.parse(JSON.stringify(v))); }); }

/* ── formulas: a tiny language over one property's value (Amplitude's derived-property functions that make sense here) ── */
var FN={
  IF:function(c,a,b){ return truthy(c)?a:b; }, CONTAINS:function(s,x){ return String(s).toLowerCase().indexOf(String(x).toLowerCase())>-1; },
  STARTSWITH:function(s,x){ return String(s).toLowerCase().indexOf(String(x).toLowerCase())===0; }, EQ:function(a,b){ return String(a)===String(b); },
  NOT:function(x){ return !truthy(x); }, AND:function(){ return [].every.call(arguments, truthy); }, OR:function(){ return [].some.call(arguments, truthy); },
  LOWER:function(s){ return String(s).toLowerCase(); }, UPPER:function(s){ return String(s).toUpperCase(); },
  CONCAT:function(){ return [].join.call(arguments,''); }, REGEXMATCH:function(s,p){ try{ return new RegExp(p,'i').test(String(s)); }catch(e){ throw new Error('regex'); } }
};
/* PM 2026-10-30, LX-24: the wider function library (Amplitude's derived-property groups: text, math, date and time, array, SWITCH and
   PROPERTY). Additive: a formula that used only the functions above evaluates exactly as before. Values are the demo's value keys, so a
   number function on a text value returns "" and an array is a comma-separated list. */
function nm(x){ var n=Number(String(x==null?'':x).replace(/,/g,'')); return isFinite(n)?n:NaN; }
function nr(n){ return isNaN(n)?'':String(+n.toFixed(4)); }
function rx(p, f){ try{ return new RegExp(p, f||'i'); }catch(e){ throw new Error('regex'); } }
function items(x){ return String(x==null?'':x).split(',').map(function(s){ return s.trim(); }).filter(function(s){ return s!==''; }); }
var DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
Object.assign(FN, {
  REGEXEXTRACT:function(s,p){ var m=rx(p).exec(String(s)); return m?(m[1]!=null?m[1]:m[0]):''; },
  REGEXREPLACE:function(s,p,r){ return String(s).replace(rx(p,'gi'), r==null?'':String(r)); },
  SPLIT:function(s,sep,i){ var a=String(s).split(sep==null?',':String(sep)); var k=i==null?0:Math.floor(nm(i)); return a[k]!=null?a[k]:''; },
  REMOVE:function(s,x){ return String(s).split(String(x==null?'':x)).join(''); },
  SUM:function(){ return nr([].reduce.call(arguments, function(a,b){ return a+nm(b); }, 0)); },
  MINUS:function(a,b){ return nr(nm(a)-nm(b)); }, MULTIPLY:function(a,b){ return nr(nm(a)*nm(b)); },
  DIVIDE:function(a,b){ var d=nm(b); return d?nr(nm(a)/d):''; }, POWER:function(a,b){ return nr(Math.pow(nm(a),nm(b))); },
  MIN:function(){ return nr(Math.min.apply(null, [].map.call(arguments, nm))); }, MAX:function(){ return nr(Math.max.apply(null, [].map.call(arguments, nm))); },
  CEIL:function(a){ return nr(Math.ceil(nm(a))); }, FLOOR:function(a){ return nr(Math.floor(nm(a))); },
  DATE_TO_LONG:function(d){ var t=Date.parse(String(d)); return isNaN(t)?'':String(t); }, TIME_TO_LONG:function(d){ var t=Date.parse(String(d)); return isNaN(t)?'':String(t); },
  LONG_TO_DATE:function(n){ var t=nm(n); return isNaN(t)?'':new Date(t).toISOString().slice(0,10); }, LONG_TO_TIME:function(n){ var t=nm(n); return isNaN(t)?'':new Date(t).toISOString().slice(0,19).replace('T',' '); },
  DATE_TIME_FORMATTER:function(d, fmt){ var t=Date.parse(String(d)); if(isNaN(t)) return ''; var x=new Date(t), z=function(v){ return (v<10?'0':'')+v; };
    return String(fmt||'yyyy-MM-dd').replace('yyyy', x.getUTCFullYear()).replace('MM', z(x.getUTCMonth()+1)).replace('dd', z(x.getUTCDate())).replace('HH', z(x.getUTCHours())); },
  TODAY:function(){ return new Date().toISOString().slice(0,10); }, EVENT_HOUR_OF_DAY:function(){ return '14'; }, EVENT_DAY_OF_WEEK:function(){ return DOW[new Date().getUTCDay()]; },
  ITEM_COUNT:function(x){ return String(items(x).length); },
  GREATEST:function(){ var a=[].concat.apply([], [].map.call(arguments, items)).map(nm).filter(function(n){ return !isNaN(n); }); return a.length?nr(Math.max.apply(null,a)):''; },
  LEAST:function(){ var a=[].concat.apply([], [].map.call(arguments, items)).map(nm).filter(function(n){ return !isNaN(n); }); return a.length?nr(Math.min.apply(null,a)):''; },
  COALESCE:function(){ var a=[].filter.call(arguments, function(x){ return x!=null && x!=='' && x!=='(none)'; }); return a.length?a[0]:''; },
  SWITCH:function(v){ var a=[].slice.call(arguments,1); for(var i=0;i+1<a.length;i+=2){ if(String(v)===String(a[i])) return a[i+1]; } return a.length%2?a[a.length-1]:''; }
});
function truthy(x){ return x===true || (x!==false && x!=null && x!=='' && x!=='false'); }
function parse(src){
  var i=0, s=String(src||'');
  function ws(){ while(i<s.length && /\s/.test(s[i])) i++; }
  function expr(){ ws(); var c=s[i];
    if(c==='"'||c==="'"){ var q=c, j=++i, out=''; while(i<s.length && s[i]!==q){ out+=s[i]; i++; } if(s[i]!==q) throw err('unterminated'); i++; return { k:'str', v:out }; }
    var nlit=/^-?\d+(\.\d+)?/.exec(s.slice(i)); if(nlit){ i+=nlit[0].length; return { k:'str', v:nlit[0] }; }   /* PM 2026-10-30, LX-24: number literals for the math functions */
    var m=/^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)); if(!m) throw err('unexpected');
    i+=m[0].length; ws();
    if(s[i]==='('){ i++; var args=[]; ws(); if(s[i]===')'){ i++; } else { for(;;){ args.push(expr()); ws(); if(s[i]===','){ i++; continue; } if(s[i]===')'){ i++; break; } throw err('expected , or )'); } }
      var name=m[0].toUpperCase();
      /* PM 2026-10-30, LX-24: PROPERTY("name", "event|user|derived|lookup") reads a property by name, so it counts toward the one-to-three limit */
      if(name==='PROPERTY'){ if(!args[0]||args[0].k!=='str') throw err('PROPERTY needs a name'); return { k:'prop', n:args[0].v, via:args[1]&&args[1].k==='str'?args[1].v:'' }; }
      if(!FN[name]) throw err('unknown function '+m[0]); return { k:'fn', n:name, a:args }; }
    return { k:'prop', n:m[0] }; }
  function err(t){ var e=new Error(t); e.at=i; return e; }
  var tree=expr(); ws(); if(i<s.length) throw err('trailing');
  return tree; }
function propsIn(t, acc){ acc=acc||{}; if(t.k==='prop') acc[t.n]=1; if(t.k==='fn') t.a.forEach(function(x){ propsIn(x, acc); }); return acc; }
/* val is one value (single-property formula) or a { prop: value } map (multi-property, LX-16) */
function evalT(t, val){ if(t.k==='str') return t.v; if(t.k==='prop') return val&&typeof val==='object'?val[t.n]:val; return FN[t.n].apply(null, t.a.map(function(x){ return evalT(x, val); })); }
/* PM 2026-10-25, LX-16: a formula may read up to three properties; the value combinations are capped so a long property can't blow up */
var MAX_SRC=3, MAX_COMBOS=400, PREVIEW_ROWS=12;
var APPROX=['عددهای این ویژگی در دمو تقریبی‌اند، چون سهم هر ترکیب از ضرب سهم ویژگی‌ها و با فرض استقلال آن‌ها ساخته شده است.','This property’s numbers are approximate in the demo, because each combination’s share multiplies the properties’ shares as if they were independent.'];
function str(r){ return r===true?'true':r===false?'false':String(r); }
/* check a formula: known properties, every function known; returns { ok, src, srcs, multi, err, preview:[[value, result]] } */
function check(formula){
  var t; try{ t=parse(formula); }catch(e){ return { ok:false, err:['فرمول خوانا نیست: '+e.message, 'The formula can’t be read: '+e.message] }; }
  var ps=Object.keys(propsIn(t));
  if(!ps.length) return { ok:false, err:['فرمول باید دست‌کم یک ویژگی را بخواند.','The formula has to read at least one property.'] };
  if(ps.length>MAX_SRC) return { ok:false, err:['هر فرمول حداکثر '+MAX_SRC.toLocaleString('fa-IR')+' ویژگی را می‌خواند.','A formula reads at most '+MAX_SRC+' properties.'] };
  var bad=ps.filter(function(p){ return !R.PROPS[p]||!R.PROPS[p].vals; })[0];
  if(bad) return { ok:false, err:['ویژگی «'+bad+'» مقدارهای شناخته‌شده ندارد.','Property “'+bad+'” has no known values.'] };
  if(ps.length>1){
    var n=ps.reduce(function(a,p){ return a*R.PROPS[p].vals.length; },1);
    if(n>MAX_COMBOS) return { ok:false, err:['ترکیب مقدارهای این ویژگی‌ها بیش از '+MAX_COMBOS.toLocaleString('fa-IR')+' حالت می‌شود؛ ویژگی کم‌مقدارتری انتخاب کنید.','These properties make over '+MAX_COMBOS+' value combinations; pick properties with fewer values.'] };
    var combos=[{ env:{}, fa:[], en:[], sh:1 }];
    ps.forEach(function(p){ var next=[]; combos.forEach(function(cb){ R.PROPS[p].vals.forEach(function(v){ var env=Object.assign({}, cb.env); env[p]=v[1]; next.push({ env:env, fa:cb.fa.concat([v[0]]), en:cb.en.concat([v[1]]), sh:cb.sh*(v[2]||0) }); }); }); combos=next; });
    try{ combos.forEach(function(cb){ cb.out=str(evalT(t, cb.env)); }); }
    catch(e){ return { ok:false, err:['اجرای فرمول خطا داد: '+e.message,'The formula failed: '+e.message] }; }
    var top=combos.slice().sort(function(a,b){ return b.sh-a.sh; }).slice(0, PREVIEW_ROWS);
    return { ok:true, src:ps[0], srcs:ps, multi:true, approx:true, dev:APPROX.slice(), tree:t, combos:combos, total:combos.length,
      preview:top.map(function(cb){ return [[cb.fa.join(' / '), cb.en.join(' / '), +cb.sh.toFixed(4)], cb.out]; }) }; }
  var P=R.PROPS[ps[0]];
  try{ var pv=P.vals.map(function(v){ var r=evalT(t, v[1]); return [v, r===true?'true':r===false?'false':String(r)]; }); return { ok:true, src:ps[0], tree:t, preview:pv }; }
  catch(e){ return { ok:false, err:['اجرای فرمول خطا داد: '+e.message,'The formula failed: '+e.message] }; } }

/* ── grouping shares: a new property from a source property and a value → label map ── */
function group(srcId, labelOf){
  var S=R.PROPS[srcId], order=[], idx={};
  function agg(arr){ var out=order.map(function(){ return 0; }); arr.forEach(function(v, k){ var L=labelOf(S.vals[k]); out[idx[L.key]]+=(v!=null?v:S.vals[k][2]); }); return out; }
  S.vals.forEach(function(v){ var L=labelOf(v); if(!(L.key in idx)){ idx[L.key]=order.length; order.push(L); } });
  var base=agg(S.vals.map(function(v){ return v[2]; }));
  var vals=order.map(function(L, k){ return [L.fa, L.en, +base[k].toFixed(4)]; });
  var ev=null; if(S.ev){ ev={}; Object.keys(S.ev).forEach(function(e){ ev[e]=agg(S.ev[e]).map(function(x){ return +x.toFixed(4); }); }); }
  var map={}; S.vals.forEach(function(v){ map[v[1]]=labelOf(v).key; });
  return { vals:vals, ev:ev, map:map }; }
/* the new property travels with the same events as its source */
function attach(newId, srcId){
  if(R.GLOBAL_PROPS.indexOf(srcId)>-1){ if(R.GLOBAL_PROPS.indexOf(newId)<0) R.GLOBAL_PROPS.push(newId); return; }
  R.EVENTS.forEach(function(e){ if(e.props.indexOf(srcId)>-1 && e.props.indexOf(newId)<0) e.props.push(newId); }); }

/* LX-16: a multi-property result travels with the events that carry every source property */
function attachAll(newId, srcs){ var G=R.GLOBAL_PROPS;
  if(srcs.every(function(p){ return G.indexOf(p)>-1; })){ if(G.indexOf(newId)<0) G.push(newId); return; }
  R.EVENTS.forEach(function(e){ if(srcs.every(function(p){ return G.indexOf(p)>-1 || e.props.indexOf(p)>-1; }) && e.props.indexOf(newId)<0) e.props.push(newId); }); }

/* ── channel rules: the joint mix of referrer and UTM ── */
/* PM 2026-10-25, AC-13: one channel definition per project. The default rules are the traffic-sources page's five channels
   (referrer/v17.html, which reads them from referrer type): Organic Search, Direct, Social, Email and Referral, in that page's names.
   Referrer type only, so «کانال سفارشی» with the default rules matches that page's shares; Referral also takes anything unmatched. */
var CHAN_DEFAULT={ rules:[
  { when:[{ prop:'referrer_type', vals:['Organic'] }], fa:'جستجوی ارگانیک', en:'Organic Search' },
  { when:[{ prop:'referrer_type', vals:['Direct'] }], fa:'مستقیم', en:'Direct' },
  { when:[{ prop:'referrer_type', vals:['Social'] }], fa:'شبکه‌های اجتماعی', en:'Social' },
  { when:[{ prop:'referrer_type', vals:['Mail'] }], fa:'ایمیل', en:'Email' },
  { when:[{ prop:'referrer_type', vals:['Other'] }], fa:'ارجاعی', en:'Referral' }
], other:['ارجاعی','Referral'] };
function chanMix(rules, other){
  var RT=R.PROPS.referrer_type, US=R.PROPS.utm_source, UM=R.PROPS.utm_medium, NC='No campaign';
  var nc=(US.vals.filter(function(v){ return v[1]===NC; })[0]||[0,0,0])[2];
  var srcO=US.vals.filter(function(v){ return v[1]!==NC; }), medO=UM.vals.filter(function(v){ return v[1]!==NC; });
  var sS=srcO.reduce(function(a,v){ return a+v[2]; },0)||1, sM=medO.reduce(function(a,v){ return a+v[2]; },0)||1;
  var combos=[]; /* (utm_source, utm_medium, p): «No campaign» together, or a campaign source × a campaign medium */
  combos.push([NC, NC, nc]);
  srcO.forEach(function(s){ medO.forEach(function(m){ combos.push([s[1], m[1], (1-nc)*(s[2]/sS)*(m[2]/sM)]); }); });
  var order=[], idx={}, base={};
  function lab(fa, en){ if(!(en in idx)){ idx[en]=order.length; order.push([fa, en]); base[en]=0; } return en; }
  rules.forEach(function(r){ lab(r.fa, r.en); }); lab(other[0], other[1]);
  /* PM 2026-10-30, LX-24: a rule may read any event or user property (taken as independent of the referrer and UTM mix), and a value may be a
     regular expression or the special values «هر مقدار» (any) and «بدون مقدار» (none). Rules in the old form match exactly as before. */
  var XP=[]; rules.forEach(function(r){ (r.when||[]).forEach(function(w){ if(['referrer_type','utm_source','utm_medium'].indexOf(w.prop)<0 && R.PROPS[w.prop] && R.PROPS[w.prop].vals && XP.indexOf(w.prop)<0) XP.push(w.prop); }); });
  var xc=[{ ctx:{}, p:1 }]; XP.forEach(function(p){ var nx=[]; xc.forEach(function(c){ R.PROPS[p].vals.forEach(function(v){ var o=Object.assign({}, c.ctx); o[p]=v[1]; nx.push({ ctx:o, p:c.p*(v[2]||0) }); }); }); xc=nx.length>4000?xc:nx; });
  rules.forEach(function(r){ (r.when||[]).forEach(function(w){ if(w.re!=null && w._r===undefined){ try{ Object.defineProperty(w, '_r', { value:new RegExp(w.re,'i'), enumerable:false }); }catch(e){ Object.defineProperty(w, '_r', { value:null, enumerable:false }); } } }); });
  var NONE=['No campaign','(none)','none',''];
  function hitW(w, v){ var m; if(w.any) m=v!=null && NONE.indexOf(String(v))<0; else if(w.none) m=v==null || NONE.indexOf(String(v))>-1; else if(w.re!=null) m=!!(w._r && v!=null && w._r.test(String(v))); else return w.not?w.vals.indexOf(v)<0:w.vals.indexOf(v)>-1; return w.not?!m:m; }
  RT.vals.forEach(function(rv){ combos.forEach(function(c){ var ctx={ referrer_type:rv[1], utm_source:c[0], utm_medium:c[1] };
    if(!XP.length){ var hit=rules.filter(function(r){ return r.when.every(function(w){ return hitW(w, ctx[w.prop]); }); })[0];
      var L=hit?hit.en:other[1]; base[L]+=rv[2]*c[2]; return; }
    xc.forEach(function(x){ var cx=Object.assign({}, ctx, x.ctx), hit2=rules.filter(function(r){ return r.when.every(function(w){ return hitW(w, cx[w.prop]); }); })[0];
      var L2=hit2?hit2.en:other[1]; base[L2]+=rv[2]*c[2]*x.p; }); }); });
  return order.filter(function(o){ return base[o[1]]>0.00005; }).map(function(o){ return [o[0], o[1], +base[o[1]].toFixed(4)]; }); }

/* ── apply: restore, then materialize every definition ── */
/* labeled events (visual labeling): rebuilt on every apply and once at load, without the snapshot (taking it this early would
   drop properties other modules register later, such as identify traits); none while element clicks aren't captured or the project
   has no data */
function labApply(){
  for(var li=R.EVENTS.length-1; li>=0; li--){ if(R.EVENTS[li].lab) R.EVENTS.splice(li,1); }
  var acOn=!!acCfg().cats.element, pvE=R.evById('page_view'), hasData=!!(pvE&&pvE.w>0);
  labList().forEach(function(l){ if(R.evById(l.id)) return;
    var defs=l.defs||[], broken=l.seen>=7 && defs.length<2;
    R.EVENTS.push({ id:l.id, fa:l.fa, en:l.en||l.fa, grp:'labeled', lab:true, cat:l.cat||'', late:true, props:[], uf:0.82, rep:0.2,
      w:acOn&&hasData?(broken?Math.round((l.w||300)*0.35):(l.w||300)):0, desc:l.desc?[l.desc,l.descEn||l.desc]:null }); }); }
function apply(){
  snapshot(); restore(); var D=DEFS, errs=[];
  /* lexicon c2a: a deleted event leaves every picker but keeps its history (w untouched, saved charts still load);
     a deleted property leaves pickers and breakdowns */
  (D.del||[]).forEach(function(id){ var e=R.evById(id); if(e) e.deleted=true; });
  /* Block A (2026-10-24): «پنهان در مسیرها» (Amplitude "hidden from Pathfinder"): the event stays in every other chart, never as a path node */
  (D.nopath||[]).forEach(function(id){ var e=R.evById(id); if(e) e.noPath=true; });
  /* Block C (2026-10-24): activity status (inactive events leave «هر ایونت فعال» and active-user metrics) and visibility per surface */
  (D.inactive||[]).forEach(function(id){ var e=R.evById(id); if(e) e.inactive=true; });
  Object.keys(D.hideIn||{}).forEach(function(id){ var e=R.evById(id); if(e&&(D.hideIn[id]||[]).length) e.hideIn=D.hideIn[id].slice(); });
  (D.pdel||[]).forEach(function(k){ if(R.PROPS[k]) R.PROPS[k].hidden=true; });
  labApply();
  /* drop filters first (they change what every later step reads) */
  (D.drop||[]).forEach(function(d){ var P=R.PROPS[d.prop]; if(!P) return;
    var sh=P.vals.filter(function(v){ return (d.vals||[]).indexOf(v[1])>-1; }).reduce(function(a,v){ return a+v[2]; },0);
    R.EVENTS.forEach(function(e){ if(d.ev!=='*' && e.id!==d.ev) return; if(d.ev==='*' && R.propsFor(e).indexOf(d.prop)<0) return; e.w=Math.round(e.w*Math.max(0,1-sh)); e.dropped=true; }); });
  /* transformations */
  (D.tx||[]).forEach(function(t){
    if(t.kind==='merge_ev'){ var a=R.evById(t.from), b=R.evById(t.to); if(!a||!b||a.comps||b.comps||a===b) return;
      /* the target's series = its own + the source's own (engine series/seriesR read mergeFrom); the source's w becomes 0, so the any-event, journey and news pools don't count it twice */
      b.mergeFrom=(b.mergeFrom||[]).concat([{ id:a.id, w:a.w, uf:a.uf, rep:a.rep, props:a.props }]); a.w=0; a.hidden=true; a.mergedInto=b.id; }
    else if(t.kind==='merge_prop'){ var A=R.PROPS[t.from], B=R.PROPS[t.to]; if(!A||!B) return; A.hidden=true; A.mergedInto=t.to;
      R.EVENTS.forEach(function(e){ var i=e.props.indexOf(t.from); if(i>-1 && e.props.indexOf(t.to)<0) e.props[i]=t.to; else if(i>-1) e.props.splice(i,1); }); }
    else if(t.kind==='rename'){ var P=R.PROPS[t.prop]; if(!P) return; var to=t.en||t.fa||t.val;
      /* both labels change; the old key stays an alias, so a saved filter on the old value still matches (engine oneFilterFactor) */
      P.vals.forEach(function(v){ if(v[1]===t.val){ v[0]=t.fa||v[0]; v[1]=to; } }); P.alias=P.alias||{}; P.alias[t.val]=to; P.aliasOf=P.aliasOf||{}; P.aliasOf[to]=t.val; }
    else if(t.kind==='hide'){ var H=R.PROPS[t.prop]; if(!H) return; H.hideVals=(H.hideVals||[]).concat([t.val]); } });
  /* combined events: comps stay plain ids (the engine and the journey pool iterate them as strings); filters in compF */
  /* PM 2026-10-28: every combined event is editable and deletable on the events page, like Amplitude's Data. Editing one that came
     with the builder adopts it into the defs under the same id (saved charts keep working); deleting it lists its id in vdel */
  var vov={}; (D.cev||[]).forEach(function(c){ vov[c.id]=1; }); (D.vdel||[]).forEach(function(id){ vov[id]=1; });
  for(var vi=R.VIRTUALS.length-1; vi>=0; vi--){ if(vov[R.VIRTUALS[vi].id]) R.VIRTUALS.splice(vi,1); }
  (D.cev||[]).forEach(function(c){ if(R.VIRTUALS.some(function(v){ return v.id===c.id; })) return;
    R.VIRTUALS.push({ id:c.id, fa:c.fa, en:c.en||c.fa, comps:c.comps.map(function(x){ return x.id; }), compF:c.comps.reduce(function(m,x){ m[x.id]=x.filters||[]; return m; },{}), cat:c.cat||'', custom:true }); });
  /* derived properties */
  (D.dprop||[]).forEach(function(d){ var r=check(d.formula); if(!r.ok){ errs.push(d.id); return; }
    /* LX-16: several properties — shares summed by result over the value combinations; no derived.map, so the builder's
       single-source split (rb-amp-builder gbVals) leaves it alone; flagged approx with the approximate-numbers reason */
    if(r.multi){ var agg={}, order=[]; r.combos.forEach(function(cb){ if(!(cb.out in agg)){ agg[cb.out]=0; order.push(cb.out); } agg[cb.out]+=cb.sh; });
      R.PROPS[d.id]={ grp:'derived', fa:d.fa, en:d.en||d.fa, vals:order.map(function(o){ return [o, o, +agg[o].toFixed(4)]; }), approx:true, dev:APPROX.slice(), derived:{ src:r.src, srcs:r.srcs.slice(), formula:d.formula, multi:true } };
      attachAll(d.id, r.srcs); return; }
    var g=group(r.src, function(v){ var out=evalT(r.tree, v[1]); out=out===true?'true':out===false?'false':String(out); return { key:out, fa:out, en:out }; });
    R.PROPS[d.id]={ grp:'derived', fa:d.fa, en:d.en||d.fa, vals:g.vals, ev:g.ev||undefined, derived:{ src:r.src, formula:d.formula, map:g.map } }; attach(d.id, r.src); });
  /* channel rules */
  if(D.chan && D.chan.on){ var rules=D.chan.rules&&D.chan.rules.length?D.chan.rules:CHAN_DEFAULT.rules;
    R.PROPS.custom_channel={ grp:'derived', fa:D.chan.fa||'کانال سفارشی', en:D.chan.en||'Custom channel', vals:chanMix(rules, D.chan.other||CHAN_DEFAULT.other), derived:{ chan:true } };
    if(R.GLOBAL_PROPS.indexOf('custom_channel')<0) R.GLOBAL_PROPS.push('custom_channel'); }
  /* PM 2026-10-30, LX-24: several named channel classifiers side by side, each producing its own channel property (the default one stays custom_channel) */
  (D.chans||[]).forEach(function(c){ if(!c||!c.id||!(c.rules||[]).length) return; try{
    R.PROPS[c.id]={ grp:'derived', fa:c.fa, en:c.en||c.fa, vals:chanMix(c.rules, c.other||CHAN_DEFAULT.other), derived:{ chan:true, set:c.id } };
    if(R.GLOBAL_PROPS.indexOf(c.id)<0) R.GLOBAL_PROPS.push(c.id); }catch(e){ errs.push(c.id); } });
  /* lookup tables */
  (D.lookup||[]).forEach(function(L){ var K=R.PROPS[L.key]; if(!K||!K.vals) return;
    (L.cols||[]).forEach(function(col, ci){ var id=L.id+'__'+col.id;
      var g=group(L.key, function(v){ var row=(L.rows||{})[v[1]], x=row&&row[ci]!=null&&row[ci]!==''?String(row[ci]):null; return x?{ key:x, fa:x, en:x }:{ key:'(none)', fa:'بدون مقدار', en:'(none)' }; });
      R.PROPS[id]={ grp:'derived', fa:col.fa, en:col.en||col.fa, vals:g.vals, ev:g.ev||undefined, derived:{ lookup:L.id, key:L.key, src:L.key, map:g.map } }; attach(id, L.key); }); });
  /* lexicon c1: persisted properties — an event property carried to the user's later events: same shares, on every event */
  (D.persist||[]).forEach(function(p){ var S0=R.PROPS[p.src]; if(!S0||!S0.vals) return;
    R.PROPS[p.id]={ grp:'derived', fa:p.fa, en:p.en||p.fa, vals:S0.vals.map(function(v){ return v.slice(); }), derived:{ persist:p.src, scope:p.scope, src:p.src, map:S0.vals.reduce(function(m,v){ m[v[1]]=v[1]; return m; },{}) } };
    /* PM 2026-10-30, LX-24: excluded values never carry over; their share goes to «بدون مقدار», so a breakdown still adds up to the event total */
    var ex=(p.excl||[]); if(ex.length){ var PP=R.PROPS[p.id], xs=0; PP.vals=PP.vals.filter(function(v){ if(ex.indexOf(v[1])>-1){ xs+=v[2]; return false; } return true; });
      if(xs>0){ var nn=PP.vals.filter(function(v){ return v[1]==='(none)'; })[0]; if(nn) nn[2]=+(nn[2]+xs).toFixed(4); else PP.vals.push(['بدون مقدار','(none)',+xs.toFixed(4)]); }   /* PM 2026-10-30, LX-24: one «(none)» row, also when the source already has one */
      ex.forEach(function(k){ PP.derived.map[k]='(none)'; }); PP.derived.excl=ex.slice(); PP.derived.alloc=p.alloc||''; PP.derived.item=!!p.item; }
    /* PM 2026-10-30, LX-24: session-level and global sources (UTM, referrer…) are allowed now; a persisted value sits on every event, so its
       shares are scaled to add up to 100% whatever the source's own total was */
    var PP2=R.PROPS[p.id], tot=PP2.vals.reduce(function(a,v){ return a+(v[2]||0); },0); if(tot>0&&Math.abs(tot-1)>0.002) PP2.vals.forEach(function(v){ v[2]=+(v[2]/tot).toFixed(4); });
    if(R.GLOBAL_PROPS.indexOf(p.id)<0) R.GLOBAL_PROPS.push(p.id); });
  /* lexicon c1: computations — a user property from each user's behaviour, modelled with the engine's own series */
  (D.comp||[]).forEach(function(c){ var v=compVals(c); c.fail=!v; if(!v) return;
    R.PROPS[c.id]={ grp:'computed', fa:c.fa, en:c.en||c.fa, vals:v, derived:{ comp:c.id } };
    if(R.GLOBAL_PROPS.indexOf(c.id)<0) R.GLOBAL_PROPS.push(c.id); });
  /* Block C (2026-10-24, gap audit 49b G6): organization properties from group() — plan and size — as user-level conditions and group-bys
     (not on events' own property lists); Shahin receives group() but reports don't read it yet (no «نیازمند توسعه» in the heading since LX-6, 2026-10-28) */
  R.PROPS.org_plan={ grp:'org', fa:'پلن سازمان', en:'Organization plan', vals:[['رایگان','Free',0.55],['پلاس','Plus',0.3],['پرو','Pro',0.15]] };
  R.PROPS.org_size={ grp:'org', fa:'اندازهٔ سازمان', en:'Organization size', vals:[['۲ تا ۱۰ نفر','2–10',0.52],['۱۱ تا ۵۰ نفر','11–50',0.34],['بیش از ۵۰ نفر','50+',0.14]] };
  if(R.PROP_GROUPS && !R.PROP_GROUPS.some(function(g){ return g[0]==='org'; })) R.PROP_GROUPS.push(['org','ویژگی‌های سازمان','Organization properties']);
  /* Block A (2026-10-24): computed properties break down segments too, under their own heading in the property menus */
  if((D.comp||[]).some(function(c){ return !c.fail; }) && R.PROP_GROUPS && !R.PROP_GROUPS.some(function(g){ return g[0]==='computed'; })) R.PROP_GROUPS.push(['computed','ویژگی‌های محاسبه‌شده','Computed properties']);
  /* caches that hold shares or totals */
  if(window.RBAmp && RBAmp._flush) RBAmp._flush();
  document.dispatchEvent(new CustomEvent('rb:defs'));
  return errs; }

/* ── computations: performers among active users, then the distribution the engine implies ── */
function compVals(c){
  var e=R.evById(c.ev), pv=R.evById('page_view'); if(!e||!(e.w>0)) return null;
  var q0=R.Q.range, f0=R.Q.filters; R.Q.range=c.win||'30d'; R.Q.filters=[];
  try{ var uE=R.periodUniques(R.seriesR(e,true)), tE=R.sum(R.seriesR(e,false)), uA=pv&&pv.w>0?R.periodUniques(R.seriesR(pv,true)):uE*3; }
  finally{ R.Q.range=q0; R.Q.filters=f0; }
  if(!uE) return null;
  var perf=Math.min(1, uE/Math.max(1,uA)), none=1-perf;
  if(c.kind==='count'){ var m=Math.max(1, tE/uE), p=Math.min(1,1/m), g=function(k){ return p*Math.pow(1-p,k-1); };
    var b1=g(1), b2=g(2)+g(3), b3=0, k; for(k=4;k<=9;k++) b3+=g(k); var b4=Math.max(0,1-b1-b2-b3);
    return [['۰','0',none],['۱','1',perf*b1],['۲ تا ۳','2–3',perf*b2],['۴ تا ۹','4–9',perf*b3],['۱۰ یا بیشتر','10+',perf*b4]].map(function(v){ return [v[0],v[1],+v[2].toFixed(4)]; }); }
  var P=R.PROPS[c.prop]; if(!P) return null;
  if(c.kind==='sum'){ var mean=(window.RBAmp&&RBAmp.nump&&RBAmp.nump[c.prop]&&RBAmp.nump[c.prop].mean)||null; if(!mean) return null;
    var per=mean*Math.max(1,tE/uE), e1=per*0.5, e2=per*1.5, unit=RBAmp.nump[c.prop], f=function(x){ return Math.round(x).toLocaleString('en-US'); };
    var q1=1-Math.exp(-e1/per), q2=1-Math.exp(-e2/per);
    return [['۰','0',none],['کمتر از '+f(e1),'Under '+f(e1),perf*q1],[f(e1)+' تا '+f(e2),f(e1)+'–'+f(e2),perf*(q2-q1)],['بیش از '+f(e2),'Over '+f(e2),perf*(1-q2)]].map(function(v){ return [v[0],v[1],+v[2].toFixed(4)]; }); }
  var sh=c.kind==='last'&&R.sharesFor?R.sharesFor(c.prop, c.ev):P.vals;
  return [['بدون مقدار','(none)',+none.toFixed(4)]].concat(sh.map(function(v){ return [v[0],v[1],+(perf*v[2]).toFixed(4)]; })); }
/* a sum computation needs the builder's numeric model (RBAmp.nump), which loads after this file: re-apply once the builder is up */
document.addEventListener('rb:boot', function(){ if((DEFS.comp||[]).some(function(c){ return c.kind==='sum'; })) apply(); });

/* ── the API (events page through the bridge, the builder's picker) ── */
function slug(fa){ var s=String(fa||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); return s; }
function uid(prefix, fa, list){ var s=slug(fa); s=/[a-z]{2,}/.test(s)?prefix+'_'+s.replace(new RegExp('^'+prefix+'_'),''):prefix+'_'+(list.length+1); var b=s, n=2;
  while(R.evById(s)||R.PROPS[s]||list.some(function(x){ return x.id===s; })) s=b+'_'+(n++); return s; }
window.RBDefs={
  get:function(){ return JSON.parse(JSON.stringify(DEFS)); },
  save:function(d){ DEFS=d; write(DEFS); return apply(); },
  apply:apply, check:check, chanDefault:function(){ return JSON.parse(JSON.stringify(CHAN_DEFAULT)); }, chanMix:chanMix,
  addEvent:function(o){ if(!o.comps||!o.comps.length) return { err:['دست‌کم یک ایونت لازم است.','Add at least one event.'] };
    if(o.comps.length>10) return { err:['یک ایونت ترکیبی حداکثر ۱۰ جزء دارد.','A combined event has at most 10 parts.'] };
    if(o.comps.some(function(c){ var e=R.evById(c.id); return !e||e.comps; })) return { err:['ایونت ترکیبی را نمی‌شود داخل ایونت ترکیبی گذاشت.','A combined event can’t contain another combined event.'] };
    var id=o.id||uid('cev', o.en||o.fa, DEFS.cev);
    if(!o.id && (DEFS.cev.some(function(c){ return c.fa===o.fa; }) || R.VIRTUALS.some(function(v){ return v.fa===o.fa; }))) return { err:['این نام قبلاً برای ایونت دیگری ثبت شده.','That name is already taken.'] };
    var prev=DEFS.cev.filter(function(c){ return c.id===id; })[0], src=o.src||(prev&&prev.src)||'';   /* src 'rb': made in the builder */
    DEFS.cev=DEFS.cev.filter(function(c){ return c.id!==id; }).concat([{ id:id, fa:o.fa, en:o.en||o.fa, cat:o.cat||'', comps:o.comps, src:src }]); write(DEFS); apply(); return { id:id }; },
  removeEvent:function(id){ DEFS.cev=DEFS.cev.filter(function(c){ return c.id!==id; });
    snapshot();   /* PM 2026-10-28: a project with no definitions yet never ran apply(), so SNAP was null and deleting a seed combined event did nothing */
    if(SNAP&&SNAP.virt.some(function(v){ return v.id===id; })){ DEFS.vdel=DEFS.vdel||[]; if(DEFS.vdel.indexOf(id)<0) DEFS.vdel.push(id); }
    write(DEFS); apply(); },
  addProp:function(o){ var r=check(o.formula); if(!r.ok) return { err:r.err }; var id=o.id||uid('dp', o.en||o.fa, DEFS.dprop);
    DEFS.dprop=DEFS.dprop.filter(function(d){ return d.id!==id; }).concat([{ id:id, fa:o.fa, en:o.en||o.fa, formula:o.formula }]); write(DEFS); apply(); return { id:id, src:r.src }; },
  removeProp:function(id){ DEFS.dprop=DEFS.dprop.filter(function(d){ return d.id!==id; }); write(DEFS); apply(); },
  setChannels:function(c){ DEFS.chan=c; write(DEFS); apply(); },
  /* PM 2026-10-30, LX-24: named channel classifiers (the events page's «قاعده کانال») */
  chanSets:function(){ return JSON.parse(JSON.stringify(DEFS.chans||[])); },
  saveChanSet:function(o){ DEFS.chans=DEFS.chans||[]; if(!o.fa) return { err:['نام دسته‌بند را بنویسید.','Name the classifier.'] };
    if(!o.id && DEFS.chans.some(function(c){ return c.fa===o.fa; })) return { err:['دسته‌بندی با این نام هست.','A classifier with that name exists.'] };
    var id=o.id||uid('ch', o.en||o.fa, DEFS.chans); DEFS.chans=DEFS.chans.filter(function(c){ return c.id!==id; }).concat([Object.assign({}, o, { id:id })]); write(DEFS); apply(); return { id:id }; },
  removeChanSet:function(id){ DEFS.chans=(DEFS.chans||[]).filter(function(c){ return c.id!==id; }); write(DEFS); apply(); },
  addLookup:function(o){ var id=o.id||uid('lk', o.en||o.fa||o.key, DEFS.lookup); DEFS.lookup=DEFS.lookup.filter(function(l){ return l.id!==id; }).concat([Object.assign({}, o, { id:id })]); write(DEFS); apply(); return { id:id }; },
  removeLookup:function(id){ DEFS.lookup=DEFS.lookup.filter(function(l){ return l.id!==id; }); write(DEFS); apply(); },
  addTx:function(t){
    /* a rename onto a name another value already has would make two rows of one name: refused (to combine them, hide one instead) */
    if(t.kind==='rename'){ var P=R.PROPS[t.prop], to=t.en||t.fa; if(P && P.vals.some(function(v){ return v[1]!==t.val && (v[1]===to || v[0]===t.fa); })) return { err:['مقدار دیگری از همین ویژگی همین نام را دارد؛ نام دیگری انتخاب کنید.','Another value of this property already has that name; pick a different one.'] }; }
    DEFS.tx=DEFS.tx.concat([t]); write(DEFS); apply(); return {}; }, removeTx:function(i){ DEFS.tx.splice(i,1); write(DEFS); apply(); },
  addDrop:function(d){ DEFS.drop=DEFS.drop.concat([d]); write(DEFS); apply(); }, removeDrop:function(i){ DEFS.drop.splice(i,1); write(DEFS); apply(); },
  active:function(){ return !!((DEFS.tx||[]).length || (DEFS.drop||[]).length); },
  /* lexicon c1 */
  addComp:function(o){ DEFS.comp=DEFS.comp||[]; if(DEFS.comp.length>=10) return { err:['حداکثر ۱۰ محاسبه در هر پروژه.','Up to 10 computations per project.'] };
    if(DEFS.comp.some(function(c){ return c.fa===o.fa; })) return { err:['این نام قبلاً استفاده شده.','That name is taken.'] };
    var id=uid('comp', o.en||o.fa, DEFS.comp); DEFS.comp.push(Object.assign({ id:id, h:0 }, o)); write(DEFS); apply(); var c=DEFS.comp.filter(function(x){ return x.id===id; })[0]; return { id:id, fail:!!(c&&c.fail) }; },
  removeComp:function(id){ DEFS.comp=(DEFS.comp||[]).filter(function(c){ return c.id!==id; }); write(DEFS); apply(); },
  recompute:function(id){ (DEFS.comp||[]).forEach(function(c){ if(c.id===id) c.h=0; }); write(DEFS); apply(); },
  addPersist:function(o){ DEFS.persist=DEFS.persist||[]; var id=uid('pp', o.en||o.fa||o.src, DEFS.persist); DEFS.persist.push(Object.assign({ id:id }, o)); write(DEFS); apply(); return { id:id }; },
  removePersist:function(id){ DEFS.persist=(DEFS.persist||[]).filter(function(p){ return p.id!==id; }); write(DEFS); apply(); },
  /* the metric library: one list for the builder (Data Table, Metric Explorer) and the events page */
  metrics:function(seed){ if(!DEFS.metrics && seed){ DEFS.metrics=JSON.parse(JSON.stringify(seed)); write(DEFS); } return DEFS.metrics; },
  saveMetrics:function(list){ DEFS.metrics=JSON.parse(JSON.stringify(list)); write(DEFS); },
  /* lexicon c2a: delete and restore events and properties */
  addDel:function(id){ DEFS.del=DEFS.del||[]; if(DEFS.del.indexOf(id)<0) DEFS.del.push(id); write(DEFS); apply(); },
  removeDel:function(id){ DEFS.del=(DEFS.del||[]).filter(function(x){ return x!==id; }); write(DEFS); apply(); },
  /* Block C (2026-10-24, gap audit 49c item 100): a property's sensitivity class — the events page's choice, else the default by name.
     One source for the events page and the report builder (Data Access Control) */
  sensSeed:function(p){ if(/search_term|search_query|email|phone|isp_name|city/.test(p)) return 'pii'; if(/order_value|cart_value|price|refund_value|plan_price|shipping_cost|amount|discount_value/.test(p)) return 'rev'; if(/payment_gateway|payment_method|coupon_code/.test(p)) return 'sens'; return 'std'; },
  sens:function(p){ var g=null; try{ var proj=+JSON.parse(localStorage.getItem('shahin-nav-project')||'0')||0; g=JSON.parse(localStorage.getItem('shahin-es-gov-p'+proj)||'null'); }catch(e){ g=null; }
    var x=g&&g.prop&&g.prop[p]&&g.prop[p].sens; return x||window.RBDefs.sensSeed(p); },
  inactive:function(id){ return (DEFS.inactive||[]).indexOf(id)>-1; },
  setInactive:function(id, on){ DEFS.inactive=(DEFS.inactive||[]).filter(function(x){ return x!==id; }); if(on) DEFS.inactive.push(id); write(DEFS); apply(); },
  hideIn:function(id){ return ((DEFS.hideIn||{})[id]||[]).slice(); },
  setHideIn:function(id, list){ DEFS.hideIn=DEFS.hideIn||{}; if(list&&list.length) DEFS.hideIn[id]=list.slice(); else delete DEFS.hideIn[id]; write(DEFS); apply(); },
  noPath:function(id){ return (DEFS.nopath||[]).indexOf(id)>-1; },
  setNoPath:function(id, on){ DEFS.nopath=(DEFS.nopath||[]).filter(function(x){ return x!==id; }); if(on) DEFS.nopath.push(id); write(DEFS); apply(); },
  addPdel:function(k){ DEFS.pdel=DEFS.pdel||[]; if(DEFS.pdel.indexOf(k)<0) DEFS.pdel.push(k); write(DEFS); apply(); },
  removePdel:function(k){ DEFS.pdel=(DEFS.pdel||[]).filter(function(x){ return x!==k; }); write(DEFS); apply(); },
  clear:function(){ DEFS=blank(); write(DEFS); apply(); },
  /* autocapture settings and labeled events (events page: «تنظیمات داده ▸ ثبت خودکار», «ایونت‌های برچسبی» and the labeler) */
  ac:function(){ return JSON.parse(JSON.stringify(acCfg())); }, acDefault:function(){ return JSON.parse(JSON.stringify(AC_DEFAULT)); },
  setAc:function(c){ DEFS.ac=JSON.parse(JSON.stringify(c)); write(DEFS); apply(); },
  labs:function(){ return JSON.parse(JSON.stringify(labList())); },
  labCats:function(){ return LAB_CATS.map(function(c){ return c.slice(); }); },
  addLab:function(o){ var L=labList(); if(!o.fa||!String(o.fa).trim()) return { err:['نام ایونت لازم است.','The event needs a name.'] };
    if(L.some(function(x){ return x.id!==o.id && x.fa===o.fa; }) || (!o.id && R.EVENTS.some(function(e){ return !e.lab && e.fa===o.fa; }))) return { err:['این نام قبلاً برای ایونت دیگری ثبت شده.','That name is already taken.'] };
    var id=o.id||uid('lab', o.en||o.fa, L), now=new Date().toISOString().slice(0,10);
    var rec=Object.assign({ cat:'', trig:'click', defs:[], w:300, by:'you', at:now, seen:0 }, L.filter(function(x){ return x.id===id; })[0]||{}, o, { id:id });
    DEFS.lab=L.filter(function(x){ return x.id!==id; }).concat([rec]); write(DEFS); apply(); return { id:id }; },
  repairLab:function(id, def){ var L=labList(), x=L.filter(function(l){ return l.id===id; })[0]; if(!x) return { err:['ایونت پیدا نشد.','Event not found.'] };
    x.defs=(x.defs||[]).concat([def]); x.seen=0; write(DEFS); apply(); return { id:id }; },
  removeLab:function(id){ DEFS.lab=labList().filter(function(l){ return l.id!==id; }); write(DEFS); apply(); }
};
/* materialize before the builder boots (the engine boots 450 ms after DOMContentLoaded) */
/* any stored definition counts — a project holding only computations or persisted properties needs them on reload too */
if(DEFS.chan||Object.keys(DEFS).some(function(k){ return Array.isArray(DEFS[k]) && DEFS[k].length; })) apply();
else labApply();   /* labeled events have seeds: materialize them even when nothing else is defined */
})();
