/* ═══ ASSISTANT — «دستیار» ═══════════════════════════════════════════════
   The AI assistant surface, present on every product page.

   PM decisions (2026-08-20), after reviewing Amplitude Assistant and Mixpanel:
     • NOT a full-screen overlay and NOT a side drawer. A small floating panel
       the user can DRAG and RESIZE — Amplitude Assistant's shape. The reason
       is functional, not cosmetic: the whole point is asking about the view
       you are looking at, and a full-screen surface hides exactly that.
     • The launcher is a compact round FAB, Mixpanel-style.
     • Named «دستیار» / "Assistant" — not "chat", not "bot".
     • Must read as AI at a glance, using the AI visual identity already
       chosen for the Help Center: VARIANT 2 — warm orange gradient
       (PM pick 2026-07-08, see landing/help-center/ai-variants.html).
       Its stops are all Shahin DS colours: amber #FAC858 → brand #FF5C2F →
       burnt #D56A32. Off-system hues were rejected then; not reintroduced now.

   Bootstrapped from shahin.js, so no page needs markup or an extra include —
   the same omnipresence contract as shahin-nav.js. Opt out per page with
   <body data-no-ask>: the «بپرس» page itself, and landing/presentation decks.

   Copy follows the Brand-Book laws (قاطعیت / ایجاز / صمیمیت هوشمند / شفافیت).
   The certainty chips stay — the PRD forbids blurring a measurement with an
   interpretation — but they are decisive NOUNS, never hedges. */
(function () {
  if (document.body && document.body.hasAttribute('data-no-ask')) return;

  function en() { return document.documentElement.lang === 'en'; }
  function t(v) { return en() ? (v.en || v.fa) : (v.fa || v.en); }
  /* Icons are inlined, not taken from sh-icons.js: 157 of the 178 pages that
     load shahin.js do not include that file, so depending on it would leave
     this surface iconless almost everywhere. Paths are copied verbatim from
     assets/sh-icons.js (Phosphor regular) — never redrawn. */
  var ICONS = {
    'sparkle': 'M197.58 129.06L146 110l-19-51.62a15.92 15.92 0 0 0-29.88 0L78 110l-51.62 19a15.92 15.92 0 0 0 0 29.88L78 178l19 51.62a15.92 15.92 0 0 0 29.88 0L146 178l51.62-19a15.92 15.92 0 0 0 0-29.88ZM137 164.22a8 8 0 0 0-4.74 4.74L112 223.85L91.78 169a8 8 0 0 0-4.78-4.78L32.15 144L87 123.78a8 8 0 0 0 4.78-4.78L112 64.15L132.22 119a8 8 0 0 0 4.74 4.74L191.85 144ZM144 40a8 8 0 0 1 8-8h16V16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0V48h-16a8 8 0 0 1-8-8m104 48a8 8 0 0 1-8 8h-8v8a8 8 0 0 1-16 0v-8h-8a8 8 0 0 1 0-16h8v-8a8 8 0 0 1 16 0v8h8a8 8 0 0 1 8 8',
    'check': 'm229.66 77.66l-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69L218.34 66.34a8 8 0 0 1 11.32 11.32',
    'paper-plane-tilt': 'M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z',
    'arrow-square-out': 'M224 104a8 8 0 0 1-16 0V59.32l-66.33 66.34a8 8 0 0 1-11.32-11.32L196.68 48H152a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-40 24a8 8 0 0 0-8 8v72H48V80h72a8 8 0 0 0 0-16H48a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-72a8 8 0 0 0-8-8',
    'x': 'M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z',
    'list-checks': 'M224 128a8 8 0 0 1-8 8h-88a8 8 0 0 1 0-16h88a8 8 0 0 1 8 8m-96-56h88a8 8 0 0 0 0-16h-88a8 8 0 0 0 0 16m88 112h-88a8 8 0 0 0 0 16h88a8 8 0 0 0 0-16M82.34 42.34L56 68.69L45.66 58.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32m0 64L56 132.69l-10.34-10.35a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32m0 64L56 196.69l-10.34-10.35a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32',
    'target': 'M221.87 83.16A104.1 104.1 0 1 1 195.67 49l22.67-22.68a8 8 0 0 1 11.32 11.32l-96 96a8 8 0 0 1-11.32-11.32l27.72-27.72a40 40 0 1 0 17.87 31.09a8 8 0 1 1 16-.9a56 56 0 1 1-22.38-41.65l22.75-22.75a87.88 87.88 0 1 0 23.13 29.67a8 8 0 0 1 14.44-6.9',
    'chart-line': 'M232 208a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V48a8 8 0 0 1 16 0v94.37L90.73 98a8 8 0 0 1 10.07-.38l58.81 44.11L218.73 90a8 8 0 1 1 10.54 12l-64 56a8 8 0 0 1-10.07.38l-58.81-44.09L40 163.63V200h184a8 8 0 0 1 8 8',
    'arrow-right': 'm221.66 133.66l-72 72a8 8 0 0 1-11.32-11.32L196.69 136H40a8 8 0 0 1 0-16h156.69l-58.35-58.34a8 8 0 0 1 11.32-11.32l72 72a8 8 0 0 1 0 11.32'
  };
  function ico(n) {
    var d = ICONS[n];
    return d ? '<svg viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="' + d + '"/></svg>' : '';
  }

  function pageName() {
    var m = window.SHAHIN_PAGE || window.SHAHIN_PAGE_META;
    if (m && m.title) return t(m.title);
    var el = document.querySelector('.sh-page-title');
    return el ? el.textContent.trim().split('\n')[0].trim() : (en() ? 'this page' : 'همین صفحه');
  }

  var C = {
    name: { fa: 'دستیار', en: 'Assistant' },
    greet: { fa: 'سلام. چه کاری برایت انجام دهم؟', en: 'Hi there. What can I do for you?' },
    boundTo: { fa: 'دربارهٔ', en: 'About' },
    openers: { fa: 'شروع کن با:', en: 'Start with:' },
    ph: { fa: 'هر چیزی بپرس…', en: 'Ask anything…' },
    checking: { fa: 'بررسی می‌کنم…', en: 'Checking…' },
    labChecks: { fa: 'بررسی‌ها', en: 'Checks' },
    labFind: { fa: 'یافته‌ها', en: 'Findings' },
    labEv: { fa: 'شواهد', en: 'Evidence' },
    labNext: { fa: 'قدم بعد', en: 'Next step' },
    openDash: { fa: 'دیدن در داشبورد', en: 'Open in dashboard' },
    statePrev: { fa: 'پیش‌نمایش حالت‌ها', en: 'State preview' },
    /* No «continue on the Ask page» hand-off any more: the standalone Global
       Agent page was dropped on 2026-08-20 (PM instruction), so this panel is
       the only surface the Global Agent has. Nothing to hand off to. */
    notice: { fa: 'شاهین فقط از دادهٔ خودت نتیجه می‌گیرد و شواهد هر ادعا یک کلیک فاصله دارد؛ با این حال پاسخ ممکن است نادرست باشد، پیش از تصمیم شواهد را ببین.',
              en: 'Shahin reasons only from your own data, and the evidence behind every claim is one click away; even so, an answer may be wrong, so check the evidence before you decide.' },
    expand: { fa: 'بزرگ‌تر', en: 'Expand' },
    shrink: { fa: 'کوچک‌تر', en: 'Shrink' },
    close: { fa: 'بستن', en: 'Close' },
    drag: { fa: 'برای جابه‌جایی بکش', en: 'Drag to move' },
    /* Certainty is a TYPE, not a severity — so it must not borrow the
       green/orange/blue severity chips. Two extra reasons those were wrong
       here: green reads as "good news" when it only means "we measured it",
       and --sh-warn is #D56A32, the exact AI accent, so an orange chip
       competed with the assistant's own identity colour.
       The distinction now rides on ink weight and line style — filled+solid,
       hollow+dashed, empty+dotted — which is colour-blind safe and quiet. */
    kinds: {
      known:  { fa: 'اندازه‌گیری', en: 'Measurement',   cls: 'k-known',  g: '▪' },
      likely: { fa: 'برداشت',      en: 'Interpretation', cls: 'k-likely', g: '≈' },
      nodata: { fa: 'بدون داده',   en: 'No data',        cls: 'k-nodata', g: '—' }
    }
  };

  /* ═══ THE UI STATES THE PRD'S EDGE CASES DEMAND ═══
     Carried over from the «بپرس» page so the demo shows them where the
     assistant actually lives, instead of only on a separate page. */
  var ST = {
    order: ['ok', 'nodata', 'scope', 'ambiguous', 'plan', 'thinking', 'empty'],
    label: {
      ok: { fa: 'پاسخ کامل', en: 'Full answer' },
      nodata: { fa: 'بی‌داده در بازه', en: 'No data in range' },
      scope: { fa: 'خارج از دامنه', en: 'Out of scope' },
      ambiguous: { fa: 'پرسش مبهم', en: 'Ambiguous' },
      plan: { fa: 'سرویس در پلن نیست', en: 'Not in plan' },
      thinking: { fa: 'در حال بررسی', en: 'Working' },
      empty: { fa: 'شروع گفتگو', en: 'Fresh start' }
    },
    body: {
      nodata: { kind: 'nodata',
        fa: 'برای بازهٔ انتخابی داده‌ای ثبت نشده. این یعنی داده نداریم — نه اینکه مقدار صفر بوده. بازهٔ دیگری را امتحان کن.',
        en: 'Nothing was recorded for the selected range. That means we have no data — not that the value was zero. Try another range.' },
      scope: { kind: 'nodata',
        fa: 'این را نمی‌دانم. شاهین دادهٔ هزینهٔ تبلیغات را جمع نمی‌کند، پس بازگشت سرمایهٔ کمپین را نمی‌توانم حساب کنم.',
        en: 'I do not know this. Shahin does not collect ad spend, so I cannot compute campaign return on investment.' },
      ambiguous: { kind: 'likely',
        fa: 'منظورت کدام است: کل موجودی زیر پایش، یا فقط موارد بالای آستانهٔ نمایش؟ پاسخ این دو متفاوت است.',
        en: 'Which do you mean: the whole tracked inventory, or only entities above the impressions gate? The answer differs.' },
      plan: { kind: 'nodata',
        fa: 'پاسخ این پرسش به سشن ریپلی نیاز دارد که در پلن فعلی شما فعال نیست.',
        en: 'Answering this needs Session Replay, which is not active on your current plan.' }
    }
  };

  /* The scenario for the dashboard the user is standing on. A generic answer on
     a specialist dashboard is noise — so a page with a real scenario gets its
     own openers, its own claims and its own evidence, all computed from that
     page's OWN sample rows so the numbers reconcile with what is on screen. */
  function SC() {
    var m = window.SHAHIN_PAGE || window.SHAHIN_PAGE_META;
    return (m && SCEN[m.id]) || SCEN._generic;
  }

  function openers() {
    var s = SC();
    if (s.openers) return t(s.openers);
    var p = pageName();
    return en() ? [
      'What is unusual in ' + p + ' this week?',
      'What changed most here versus last week?',
      'How is the main number on this page calculated?'
    ] : [
      'این هفته در «' + p + '» چه چیزی غیرعادی است؟',
      'نسبت به هفتهٔ قبل بیشترین تغییر این‌جا چه بوده؟',
      'عدد اصلی این صفحه چطور حساب می‌شود؟'
    ];
  }

  function answer(first) {
    var s = SC();
    var b = ST.body[state];   /* undefined for ok/thinking/empty — fall through */
    if (b) return { checks: null, claims: [{ kind: b.kind, ev: null, text: t(b) }], next: t(s.next) };
    if (first) {
      return { checks: t(s.checks), claims: s.claims.map(function (c) {
        return { kind: c.kind, text: t(c), ev: c.ev }; }), next: t(s.next) };
    }
    /* a follow-up is tighter — the context is already established, so repeating
       the checklist would fake depth rather than add it */
    return { checks: null, claims: s.followUp.map(function (c) {
      return { kind: c.kind, text: t(c), ev: c.ev }; }), next: t(s.next) };
  }

  var open = false, big = false, moved = false, state = 'ok';
  /* The transcript. Asking a follow-up APPENDS — an earlier question and its
     answer are never destroyed, so the user can scroll back over the whole
     investigation. */
  var turns = [];

  /* ═══ SHARED ANSWER CONTENT ═══
     The same worked investigation the «بپرس» page shows: same claims, same
     certainty chips, same two evidence charts. The assistant is a delivery
     surface over ONE Intelligence, not a thinner second version of it — an
     earlier draft here carried watered-down generic text, which contradicted
     the whole thesis of the AI-ization doc.

     COHERENT DATASET (every number reconciles):
       organic sessions  18,400 -> 14,170  (-4,230 = -23.0%)
         /blog/guide  5,200 -> 3,780 = -1,420  (-27.3%)
         /pricing     2,600 -> 1,670 =   -930  (-35.8%)  <- worst RATE
         /features    3,100 -> 2,447 =   -653  (-21.1%)
         others       7,500 -> 6,273 = -1,227  (-16.4%)
       three pages = 3,003 of 4,230 = 71.0% of the drop

     ONE worked scenario, deliberately. Per-page scenarios driven by each
     dashboard's own metrics are the real requirement and are NOT built yet. */
  var SCEN = {

    /* ══ CONTENT LIFECYCLE (seo-lifecycle) ══
       Every number below is computed from that page's OWN sample rows (the KW
       array in v3.html), so the assistant and the table can never disagree.

       clicks, window 2 -> window 3:
         نتایج فوتبال دیشب   31,000 -> 9,000  = -22,000   volatile (w1 was 14,000: w2 WAS the spike)
         آب و هوای تهران     11,800 -> 5,000  =  -6,800   demand drop
         قیمت طلا و سکه       8,600 -> 5,100  =  -3,500   losing   <- first ACTIONABLE one
         جشنواره نوروزی       2,400 ->   150  =  -2,250   faded
         محاسبه حقوق ۱۴۰۵     3,900 -> 2,500  =  -1,400   losing
         مالیات تراکنش        3,100 -> 1,900  =  -1,200   losing
         وام ازدواج ۱۴۰۵      1,800 -> 1,100  =    -700   losing
       losing group total = 3,500+1,400+1,200+700 = 6,800 — exactly what the
       single demand-drop keyword lost on its own.
       آب و هوای تهران: impressions 390,000 -> 170,000 (-56.4%), position
       2.1 -> 2.4, CTR 3.0% -> 2.9% — demand collapsed, ranking held.
       losing group positions: 2.3->4.1, 3.2->4.9, 3.0->4.8, 3.0->4.6, while
       their impressions fell only 23-36% — that gap IS the label boundary. */
    'seo-lifecycle': {
      openers: {
        fa: ['بزرگ‌ترین افت کلیک این دوره کدام است و باید سراغش بروم؟',
             '«ریزش تقاضا» با «در حال افت» چه تفاوتی دارد؟',
             'کدام کلیدواژه‌ها ارزش سرمایه‌گذاری تازه دارند؟'],
        en: ['What is the biggest click loss this period, and should I act on it?',
             'What is the difference between «demand drop» and «losing»?',
             'Which keywords are worth fresh investment?']
      },
      checks: {
        fa: ['کلیک هر مورد را بین پنجرهٔ دوم و سوم مقایسه کردم.',
             'برای بزرگ‌ترین افت‌ها نمایش و میانگین جایگاه را جدا دیدم.',
             'برچسب چرخه عمر هر مورد را با تغییر تقاضا و جایگاهش تطبیق دادم.'],
        en: ['Compared clicks for every entity between window 2 and window 3.',
             'Checked impressions and average position separately for the biggest losses.',
             'Reconciled each lifecycle label against its demand and position change.']
      },
      claims: [
        { kind: 'known', ev: 'losses',
          fa: 'بزرگ‌ترین افت مربوط به «نتایج فوتبال دیشب» است: از ۳۱٬۰۰۰ به ۹٬۰۰۰ کلیک، افت ۲۲٬۰۰۰. ولی پنجرهٔ دوم خودش یک جهش بود — پنجرهٔ اول ۱۴٬۰۰۰ کلیک داشت — و پنجرهٔ سوم به سطح عادی برگشته. برچسبش «نوسانی» است.',
          en: 'The biggest loss is «last night’s football results»: 31,000 to 9,000 clicks, down 22,000. But window 2 was itself a spike — window 1 had 14,000 — and window 3 is back to normal. Its label is «volatile».' },
        { kind: 'known', ev: 'demand',
          fa: 'افت دوم «آب و هوای تهران» با ۶٬۸۰۰ کلیک است و برچسب «ریزش تقاضا» دارد: نمایش از ۳۹۰٬۰۰۰ به ۱۷۰٬۰۰۰ رسیده — ۵۶ درصد کمتر — در حالی که میانگین جایگاه فقط از ۲.۱ به ۲.۴ رفته و نرخ کلیک تقریباً ثابت مانده، ۳.۰ به ۲.۹ درصد.',
          en: 'The second loss is «Tehran weather» at 6,800 clicks, labelled «demand drop»: impressions fell from 390,000 to 170,000 — 56 percent lower — while average position moved only from 2.1 to 2.4 and click-through held roughly flat, 3.0 to 2.9 percent.' },
        { kind: 'likely', ev: null,
          fa: 'سه مورد از چهار افت بزرگ اول با اقدام سئو برنمی‌گردد: یکی جهش خبری بود، یکی ریزش تقاضا و یکی محو فصلی. جای اقدام گروه «در حال افت» است — چهار کلیدواژه‌اش با هم ۶٬۸۰۰ کلیک باخته‌اند، هم‌اندازهٔ آب و هوای تهران، ولی این‌ها واقعاً جایگاه از دست داده‌اند.',
          en: 'Three of the four biggest losses will not come back from SEO work: one was a news spike, one a demand drop, one a seasonal fade. The place to act is the «losing» group — its four keywords lost 6,800 clicks together, the same as Tehran weather alone, but these genuinely lost ranking.' },
        { kind: 'nodata', ev: null,
          fa: 'میانگین جایگاه پنجرهٔ اول ثبت نشده، پس نمی‌توانم بگویم ریزش تقاضای «آب و هوای تهران» از کِی شروع شده؛ فقط می‌دانم بین پنجرهٔ دوم و سوم رخ داده.',
          en: 'Average position was not recorded for window 1, so I cannot say when the «Tehran weather» demand drop began; only that it happened between window 2 and window 3.' }
      ],
      followUp: [
        { kind: 'known', ev: null,
          fa: 'از چهار کلیدواژهٔ «در حال افت»، «قیمت طلا و سکه» تنهایی ۳٬۵۰۰ کلیک باخته — بیش از نیمِ افت کل گروه.',
          en: 'Of the four «losing» keywords, «gold and coin prices» alone lost 3,500 clicks — more than half the group’s total.' },
        { kind: 'likely', ev: null,
          fa: 'هر چهار مورد یک الگو دارند: جایگاه‌شان از حدود رتبهٔ ۳ به نزدیک رتبهٔ ۵ رفته، در حالی که نمایششان فقط ۲۳ تا ۳۶ درصد کم شده — بسیار کمتر از ریزش ۵۶ درصدی آب و هوای تهران. همین فاصله مرز دو برچسب است.',
          en: 'All four share one pattern: position slid from around 3 to nearly 5 while impressions fell only 23 to 36 percent — far less than Tehran weather’s 56 percent collapse. That gap is exactly the boundary between the two labels.' }
      ],
      next: {
        fa: ['کلیدواژه‌های «در حال افت» را فهرست کن', 'برای «قیمت طلا و سکه» چه کنم؟'],
        en: ['List the «losing» keywords', 'What should I do about «gold and coin prices»?']
      },
      charts: {
        losses: {
          kind: 'bars',
          title: { fa: 'کلیک از دست رفته بین پنجرهٔ دوم و سوم — با برچسب هر مورد',
                   en: 'Clicks lost between window 2 and 3 — with each entity’s label' },
          rows: [
            { name: 'نتایج فوتبال دیشب', nameEn: 'Football results', value: 22000, note: { fa: 'نوسانی', en: 'Volatile' } },
            { name: 'آب و هوای تهران', nameEn: 'Tehran weather', value: 6800, note: { fa: 'ریزش تقاضا', en: 'Demand drop' } },
            { name: 'قیمت طلا و سکه', nameEn: 'Gold & coin prices', value: 3500, note: { fa: 'در حال افت', en: 'Losing' }, lead: true },
            { name: 'جشنواره نوروزی ۱۴۰۵', nameEn: 'Nowruz festival', value: 2250, note: { fa: 'محو شده', en: 'Faded' } },
            { name: 'محاسبه حقوق ۱۴۰۵', nameEn: 'Salary calculator', value: 1400, note: { fa: 'در حال افت', en: 'Losing' } },
            { name: 'مالیات تراکنش بانکی', nameEn: 'Transaction tax', value: 1200, note: { fa: 'در حال افت', en: 'Losing' } }
          ]
        },
        demand: {
          kind: 'bars',
          title: { fa: 'نمایش «آب و هوای تهران» در سه پنجره — جایگاه روی هر ستون',
                   en: 'Impressions for «Tehran weather» across the three windows — position on each bar' },
          rows: [
            { name: 'پنجرهٔ ۱', nameEn: 'Window 1', value: 400000, note: { fa: 'جایگاه ثبت نشده', en: 'Position not recorded' } },
            { name: 'پنجرهٔ ۲', nameEn: 'Window 2', value: 390000, note: { fa: 'جایگاه ۲.۱', en: 'Position 2.1' } },
            { name: 'پنجرهٔ ۳', nameEn: 'Window 3', value: 170000, note: { fa: 'جایگاه ۲.۴', en: 'Position 2.4' }, lead: true }
          ]
        }
      }
    },

    /* ══ FALLBACK — the organic-traffic investigation ══
       Used on every page that has no scenario of its own yet. */
    _generic: {
      checks: {
        fa: ['سشن‌های ارگانیک دو هفته را مقایسه کردم.', 'افت را به تفکیک صفحه شکستم.', 'برای همان صفحه‌ها Impression و Position را از سرچ کنسول دیدم.'],
        en: ['Compared organic sessions across two weeks.', 'Broke the drop down by page.', 'Checked impressions and position for those pages in Search Console.']
      },
      claims: [
        { kind: 'known', ev: 'trend',
          fa: 'سشن ارگانیک از ۱۸٬۴۰۰ به ۱۴٬۱۷۰ رسیده — افت ۴٬۲۳۰ سشن، یعنی ۲۳ درصد.',
          en: 'Organic sessions went from 18,400 to 14,170 — a drop of 4,230 sessions, or 23 percent.' },
        { kind: 'known', ev: 'pages',
          fa: '۷۱ درصد این افت مربوط به سه صفحه است. ولی بزرگ‌ترین افت مطلق و بدترین نرخ افت یکی نیستند: بیشترین سشن را blog/guide از دست داده، در حالی که pricing با ۳۵.۸ درصد بدترین نرخ را دارد.',
          en: '71 percent of the drop comes from three pages. But the largest absolute drop and the worst drop rate are not the same page: /blog/guide lost the most sessions, while /pricing has the worst rate at 35.8 percent.' },
        { kind: 'likely', ev: null,
          fa: 'Impression این صفحه‌ها تقریباً ثابت مانده ولی Position افت کرده. پس افت تقاضا توضیح این ماجرا نیست؛ ردپا به از دست دادن رتبه می‌رسد.',
          en: 'Impressions stayed roughly flat while position dropped. So falling demand does not explain this; the trail leads to lost ranking.' },
        { kind: 'nodata', ev: null,
          fa: 'برای بازهٔ قبل از پنج‌شنبه دادهٔ سرچ کنسول نداریم، پس نمی‌توانم بگویم افت رتبه از چه روزی شروع شده.',
          en: 'We have no Search Console data before Thursday, so I cannot say which day the ranking drop began.' }
      ],
      followUp: [
        { kind: 'known', ev: null,
          fa: 'از آن سه، blog/guide تنها یک‌سوم کل افت را به دوش دارد.',
          en: 'Of the three, /blog/guide carries a third of the whole drop on its own.' },
        { kind: 'likely', ev: null,
          fa: 'روی موبایل هم همین رفتار را دارد، پس علت به دستگاه گره نخورده.',
          en: 'It behaves the same on mobile, so the cause is not device-specific.' }
      ],
      next: {
        fa: ['کدام کوئری‌ها رتبه‌شان را از دست دادند؟', 'همین سه صفحه از نظر سرعت چه وضعی دارند؟'],
        en: ['Which queries lost ranking?', 'How do these three pages perform on speed?']
      },
      charts: {
        trend: {
          kind: 'line',
          title: { fa: 'سشن ارگانیک روزانه — دو هفته', en: 'Daily organic sessions — two weeks' },
          days: ['۱','۲','۳','۴','۵','۶','۷','۸','۹','۱۰','۱۱','۱۲','۱۳','۱۴'],
          daysEn: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14'],
          values: [2620,2680,2590,2710,2650,2570,2580,2600,2050,1980,1930,1900,1880,1830],
          breakAt: 8,
          breakLabel: { fa: 'شروع افت', en: 'Drop begins' }
        },
        pages: {
          kind: 'bars',
          title: { fa: 'سهم هر صفحه از افت — و نرخ افت خودش', en: 'Share of the drop — and each page’s own rate' },
          rows: [
            { name: '/blog/guide', value: 1420, note: { fa: '۲۷.۳٪', en: '27.3%' } },
            { name: '/pricing',    value:  930, note: { fa: '۳۵.۸٪', en: '35.8%' }, lead: true },
            { name: '/features',   value:  653, note: { fa: '۲۱.۱٪', en: '21.1%' } },
            { name: 'سایر صفحه‌ها', nameEn: 'Other pages', value: 1227, note: { fa: '۱۶.۴٪', en: '16.4%' } }
          ]
        }
      }
    }
  };

  /* ECharts is absent on 157 of the 178 pages that load shahin.js, so it is
     fetched on demand — only once an answer with chart evidence is shown. */
  function withECharts(cb) {
    if (window.echarts) return cb();
    var existing = document.getElementById('sh-ec-js');
    if (existing) {
      var w = setInterval(function () { if (window.echarts) { clearInterval(w); cb(); } }, 60);
      return;
    }
    var self = document.getElementById('sh-ask-js');
    var sc = document.createElement('script');
    sc.id = 'sh-ec-js';
    sc.src = self ? self.getAttribute('src').replace(/shahin-ask\.js(\?.*)?$/, 'echarts.min.js') : 'assets/echarts.min.js';
    sc.onload = cb;
    document.body.appendChild(sc);
  }

  function tok(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function faN(x) { return en() ? String(x) : String(x).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function grp(n) { return faN(Number(n).toLocaleString('en-US')); }
  /* a URL path inside RTL text flips its leading slash to the end */
  function ltr(x) { return String(x).charAt(0) === '/' ? '‪' + x + '‬' : x; }

  /* trend: says WHICH DAY the drop began — what the sentence cannot say.
     Zero baseline so the visual effect matches the real one. */
  function drawLine(el, D) {
    var K = { brand: tok('--sh-brand'), bad: tok('--sh-bad'), border: tok('--sh-border'),
      m2: tok('--sh-muted-2'), surf: tok('--sh-surface'), text: tok('--sh-text'),
      font: getComputedStyle(document.body).fontFamily };
    var c = echarts.init(el);
    c.setOption({
      grid: { left: 4, right: 10, top: 20, bottom: 2, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: K.surf, borderColor: K.border, confine: true,
        textStyle: { color: K.text, fontSize: 11, fontFamily: K.font },
        formatter: function (p) { var i = p[0].dataIndex;
          return (en() ? 'Day ' : 'روز ') + faN(D.daysEn[i]) + '<br/>' + grp(D.values[i]) +
            (en() ? ' sessions' : ' سشن') + (i === D.breakAt ? '<br/><b>' + t(D.breakLabel) + '</b>' : ''); } },
      xAxis: { type: 'category', data: en() ? D.daysEn : D.days, boundaryGap: false,
        axisLine: { lineStyle: { color: K.border } }, axisTick: { show: false },
        axisLabel: { color: K.m2, fontSize: 9, fontFamily: K.font } },
      yAxis: { type: 'value', min: 0, splitLine: { lineStyle: { color: K.border, type: 'dashed' } },
        axisLabel: { color: K.m2, fontSize: 9, fontFamily: K.font, formatter: grp } },
      series: [{ type: 'line', data: D.values, symbol: 'circle', symbolSize: 4,
        lineStyle: { color: K.brand, width: 2 }, itemStyle: { color: K.brand },
        areaStyle: { color: K.brand, opacity: 0.07 },
        markLine: { symbol: 'none', silent: true, data: [{ xAxis: D.breakAt }],
          lineStyle: { color: K.bad, width: 1, type: 'dashed' },
          label: { formatter: t(D.breakLabel), color: K.bad, fontSize: 9, fontFamily: K.font, position: 'insideEndTop' } } }]
    }, true);
    return c;
  }

  /* bars: length = the quantity, and the label at the end of each bar carries
     the SECOND dimension that decides whether the biggest bar is the one to act
     on — the page's own drop rate in the organic scenario, the lifecycle label
     in the Content Lifecycle one. Without that second column the longest bar
     always looks guiltiest. The accent marks the actionable row, not the
     longest one. (chart-review gate, 2026-08-20) */
  function drawBars(el, D) {
    var rows = D.rows.slice().reverse();
    var K = { brand: tok('--sh-brand'), border: tok('--sh-border'), m2: tok('--sh-muted-2'),
      t2: tok('--sh-text-2'), muted: tok('--sh-muted'), surf: tok('--sh-surface'),
      text: tok('--sh-text'), neutral: tok('--sh-muted-2'),
      font: getComputedStyle(document.body).fontFamily };
    var c = echarts.init(el);
    c.setOption({
      grid: { left: 4, right: 82, top: 6, bottom: 2, containLabel: true },
      tooltip: { trigger: 'item', backgroundColor: K.surf, borderColor: K.border, confine: true,
        textStyle: { color: K.text, fontSize: 11, fontFamily: K.font },
        formatter: function (p) { var r = rows[p.dataIndex];
          return ltr(en() ? (r.nameEn || r.name) : r.name) + '<br/>' +
            grp(r.value) + '<br/>' + t(r.note); } },
      xAxis: { type: 'value', min: 0, splitLine: { lineStyle: { color: K.border, type: 'dashed' } },
        axisLabel: { color: K.m2, fontSize: 9, fontFamily: K.font, formatter: grp } },
      yAxis: { type: 'category', data: rows.map(function (r) { return ltr(en() ? (r.nameEn || r.name) : r.name); }),
        axisLine: { lineStyle: { color: K.border } }, axisTick: { show: false },
        axisLabel: { color: K.t2, fontSize: 10, fontFamily: K.font } },
      series: [{ type: 'bar', barMaxWidth: 14,
        data: rows.map(function (r) {
          return { value: r.value, itemStyle: { color: r.lead ? K.brand : K.neutral, borderRadius: [0, 3, 3, 0] } }; }),
        label: { show: true, position: 'right', color: K.muted, fontSize: 9.5, fontFamily: K.font,
          formatter: function (p) { return t(rows[p.dataIndex].note); } } }]
    }, true);
    return c;
  }

  var CH = {};
  function renderCharts() {
    var els = document.querySelectorAll('.shask-chart[data-ev]');
    if (!els.length) return;
    withECharts(function () {
      [].forEach.call(els, function (el) {
        if (!el.offsetWidth) return;
        var spec = SC().charts[el.getAttribute('data-ev')];
        if (!spec) return;
        if (CH[el.id] && !CH[el.id].isDisposed()) CH[el.id].dispose();
        CH[el.id] = spec.kind === 'line' ? drawLine(el, spec) : drawBars(el, spec);
      });
    });
  }

  function css() {
    if (document.getElementById('shask-css')) return;
    var s = document.createElement('style');
    s.id = 'shask-css';
    /* AI identity = Help Center variant 2 (PM pick 2026-07-08). Declared here
       as --sh-ai-* so this surface and the Help Center stay one identity. */
    s.textContent = [
      ':root{--sh-ai:#D56A32;--sh-ai-soft:#FDF7F4;--sh-ai-line:#EEC3AD;',
      '  --sh-ai-grad:linear-gradient(105deg,#FAC858 0%,#FF5C2F 48%,#D56A32 100%);',
      '  --sh-ai-glow:0 18px 44px -20px rgba(255,92,47,.30)}',
      'html[data-theme="dark"]{--sh-ai:#e08a58;--sh-ai-soft:rgba(213,106,50,.12);--sh-ai-line:rgba(213,106,50,.38);',
      '  --sh-ai-grad:linear-gradient(105deg,#d9a63c 0%,#dc4519 48%,#b5522a 100%);',
      '  --sh-ai-glow:0 14px 48px -18px rgba(255,92,47,.26)}',
      /* launcher: compact round FAB carrying the AI gradient */
      '.shask-fab{position:fixed;inset-inline-end:22px;bottom:22px;z-index:930;width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;background:var(--sh-ai-grad);color:#fff;display:grid;place-items:center;box-shadow:var(--sh-ai-glow),0 4px 14px -4px rgba(0,0,0,.3);transition:transform .16s}',
      '.shask-fab:hover{transform:scale(1.06)}',
      '.shask-fab svg{width:23px;height:23px}',
      '.shask-on .shask-fab{display:none}',
      /* the panel: small, draggable, resizable — Amplitude Assistant shape */
      '.shask-panel{position:fixed;inset-inline-end:22px;bottom:22px;z-index:941;width:392px;height:min(580px,82vh);display:none;flex-direction:column;background:var(--sh-surface);border:1px solid var(--sh-border);border-radius:16px;box-shadow:var(--sh-shadow-2),var(--sh-ai-glow);overflow:hidden;min-width:320px;min-height:340px}',
      '.shask-on .shask-panel{display:flex}',
      '.shask-panel.big{width:min(760px,92vw);height:min(84vh,860px)}',
      /* the AI hairline across the top is the at-a-glance "this is AI" cue */
      '.shask-panel::before{content:"";position:absolute;inset-inline:0;top:0;height:2px;background:var(--sh-ai-grad)}',
      '.shask-head{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid var(--sh-border);flex:0 0 auto;cursor:grab;user-select:none}',
      '.shask-head:active{cursor:grabbing}',
      '.shask-mark{width:26px;height:26px;border-radius:8px;background:var(--sh-ai-grad);color:#fff;display:grid;place-items:center;flex:0 0 auto}',
      '.shask-mark svg{width:15px;height:15px}',
      '.shask-name{font-size:13px;font-weight:500;color:var(--sh-text)}',
      '.shask-bound{font-size:10.5px;color:var(--sh-muted-2);margin-inline-start:2px}',
      '.shask-acts{margin-inline-start:auto;display:flex;gap:4px}',
      '.shask-ib{width:27px;height:27px;border-radius:7px;border:1px solid transparent;background:none;color:var(--sh-muted);cursor:pointer;font-size:13px;font-family:inherit;display:grid;place-items:center}',
      '.shask-ib:hover{background:var(--sh-surface-2);color:var(--sh-text)}',
      '.shask-ib svg{width:14px;height:14px;transition:transform .16s}',
      '.shask-ib.is-big svg{transform:rotate(180deg)}',
      '.shask-body{flex:1;overflow-y:auto;padding:16px 14px}',
      '.shask-greet{display:flex;gap:10px;align-items:flex-start;margin-bottom:16px}',
      '.shask-gtxt{font-size:13px;color:var(--sh-text);line-height:1.9}',
      '.shask-lab{font-size:10.5px;color:var(--sh-muted-2);margin:0 0 8px}',
      '.shask-opens{display:flex;flex-direction:column;gap:8px}',
      '.shask-open{border:1px solid var(--sh-border);border-radius:11px;background:var(--sh-surface-2);padding:11px 12px;text-align:start;cursor:pointer;font-family:inherit;font-size:12.5px;line-height:1.8;color:var(--sh-text)}',
      '.shask-open:hover{border-color:var(--sh-ai);color:var(--sh-ai)}',
      '.shask-u{display:flex;justify-content:flex-end;margin:0 0 16px}',
      '.shask-u span{max-width:82%;background:var(--sh-surface-2);border:1px solid var(--sh-border);border-radius:14px;padding:9px 12px;font-size:12.5px;color:var(--sh-text);line-height:1.9}',
      '.shask-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:16px}',
      '.shask-txt{flex:1;min-width:0}',
      /* the four section labels: بررسی‌ها / یافته‌ها / شواهد / قدم بعد */
      '.shask-sec{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--sh-muted-2);margin:0 0 8px}',
      '.shask-sec svg{width:12px;height:12px;flex:0 0 auto}',
      '.shask-sec:not(:first-child){margin-top:16px}',
      '.shask-checks{list-style:none;margin:0;padding:0}',
      '.shask-checks li{display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:var(--sh-muted);line-height:1.9}',
      '.shask-checks svg{width:12px;height:12px;flex:0 0 auto;margin-top:4px;color:var(--sh-good)}',
      /* ── certainty: an ink-weight ladder, never a hue. The rail beside each
            claim repeats its badge's line style, so badge and text read as one
            unit without another colour entering the panel. */
      '.shask-claim{padding:0 0 11px;padding-inline-start:12px;border-inline-start:2px solid var(--sh-border)}',
      '.shask-claim.k-likely{border-inline-start-style:dashed}',
      /* ghost badge, ghost rail — "no data" carries the lightest weight on the
         page, which is itself the message */
      '.shask-claim.k-nodata{border-inline-start-color:transparent}',
      /* three distinct TREATMENTS — filled, outlined, ghost — plus a glyph that
         states the idea on its own (▪ solid fact, ≈ approximation, — absent).
         A 1px dashed-vs-dotted border alone was invisible at this size: the
         first cut of this badge failed exactly that way in both themes. */
      '.shask-k{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:500;line-height:1;padding:5px 9px;border-radius:5px;white-space:nowrap}',
      '.shask-k i{font-style:normal;font-size:11px;line-height:1;opacity:.85}',
      '.shask-k.k-known{border:1px solid var(--sh-border);background:var(--sh-surface-2);color:var(--sh-text)}',
      '.shask-k.k-likely{border:1px dashed var(--sh-muted-2);background:none;color:var(--sh-muted)}',
      /* same padding as the other two, transparent border — so all three badge
         labels sit on one vertical line instead of stepping in and out */
      '.shask-k.k-nodata{border:1px solid transparent;background:none;color:var(--sh-muted-2)}',
      '.shask-ctext{font-size:12.5px;color:var(--sh-text);line-height:1.95;margin-top:6px}',
      /* evidence: one card per chart, stacked in the small panel, side by side
         once the panel is expanded */
      '.shask-evs{display:grid;gap:9px;grid-template-columns:1fr}',
      '.shask-panel.big .shask-evs{grid-template-columns:1fr 1fr}',
      '.shask-ev{border:1px solid var(--sh-border);border-radius:10px;background:var(--sh-surface-2);padding:9px 10px;min-width:0}',
      '.shask-evhead{display:flex;align-items:flex-start;gap:8px;margin-bottom:7px}',
      '.shask-evt{font-size:10px;color:var(--sh-muted-2);line-height:1.7;flex:1;min-width:0}',
      '.shask-evb{margin-inline-start:auto;display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;padding:4px 8px;border:1px solid var(--sh-border);border-radius:7px;background:var(--sh-surface);color:var(--sh-muted);font-size:9.5px;font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.shask-evb:hover{border-color:var(--sh-ai);color:var(--sh-ai)}',
      '.shask-evb svg{width:10px;height:10px}',
      '.shask-chart{height:150px;width:100%;filter:saturate(.72)}',
      '.shask-fu{display:flex;gap:7px;flex-wrap:wrap}',
      '.shask-fub{padding:6px 11px;border:1px solid var(--sh-border);border-radius:999px;background:var(--sh-surface-2);color:var(--sh-muted);font-size:11px;cursor:pointer;font-family:inherit}',
      '.shask-fub:hover{border-color:var(--sh-ai);color:var(--sh-ai)}',
      '.shask-fub.is-ai{border-color:var(--sh-ai);color:var(--sh-ai)}',
      /* ── state preview: a wireframe aid for the front-end team, not a shipped
            control. Dashed rule + smaller type mark it as scaffolding. */
      '.shask-states{flex:0 0 auto;display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding:8px 14px;border-top:1px dashed var(--sh-border);background:var(--sh-surface-2)}',
      '.shask-stlab{font-size:9px;color:var(--sh-muted-2);margin-inline-end:2px}',
      '.shask-st{padding:3px 8px;border:1px solid var(--sh-border);border-radius:999px;background:var(--sh-surface);color:var(--sh-muted);font-size:9.5px;font-family:inherit;cursor:pointer;white-space:nowrap}',
      '.shask-st:hover{border-color:var(--sh-ai);color:var(--sh-ai)}',
      '.shask-st.on{border-color:var(--sh-ai);color:var(--sh-ai);background:var(--sh-ai-soft)}',
      '.shask-foot{flex:0 0 auto;padding:11px 14px 13px;border-top:1px solid var(--sh-border)}',
      '.shask-comp{display:flex;gap:8px;align-items:center;border:1px solid var(--sh-border);border-radius:999px;background:var(--sh-surface-2);padding:5px 5px 5px 14px}',
      '.shask-comp input{flex:1;background:none;border:0;outline:none;color:var(--sh-text);font-size:12.5px;font-family:inherit}',
      '.shask-comp input::placeholder{color:var(--sh-muted-2)}',
      '.shask-send{width:31px;height:31px;border-radius:50%;border:0;background:var(--sh-ai-grad);color:#fff;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}',
      '.shask-send svg{width:15px;height:15px}',
      '.shask-note{font-size:9.5px;color:var(--sh-muted-2);line-height:1.8;text-align:center;margin-top:8px}',
      /* resize grip, on the corner opposite the anchor so it grows into the page */
      '.shask-grip{position:absolute;inset-inline-start:0;top:2px;width:16px;height:16px;cursor:nwse-resize;opacity:.5}',
      '.shask-grip:hover{opacity:1}',
      '.shask-grip::after{content:"";position:absolute;inset:4px;border-top:2px solid var(--sh-muted-2);border-inline-start:2px solid var(--sh-muted-2);border-start-start-radius:3px}',
      /* on a phone there is nothing to drag around — go full-bleed */
      '@media (max-width:640px){.shask-panel,.shask-panel.big{inset:0;width:auto;height:auto;border-radius:0;border:0}.shask-grip{display:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function build() {
    if (document.getElementById('shask-panel')) return;
    css();
    var fab = document.createElement('button');
    fab.className = 'shask-fab';
    fab.id = 'shask-fab';
    fab.onclick = function () { window.shahinAsk.open(); };
    /* the launcher is visible from first paint, so it must carry its icon and
       label here — paint() only runs once the panel is opened */
    fab.innerHTML = ico('sparkle');
    fab.setAttribute('aria-label', t(C.name));

    var p = document.createElement('div');
    p.className = 'shask-panel';
    p.id = 'shask-panel';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'false');   /* non-modal: the page stays usable behind it */
    p.innerHTML =
      '<div class="shask-grip" id="shask-grip"></div>' +
      '<div class="shask-head" id="shask-head">' +
        '<span class="shask-mark" id="shask-mark"></span>' +
        '<span class="shask-name" id="shask-name"></span>' +
        '<span class="shask-bound" id="shask-bound"></span>' +
        '<span class="shask-acts">' +
          '<button class="shask-ib" id="shask-big" onclick="shahinAsk.toggleSize()"></button>' +
          '<button class="shask-ib" id="shask-x" onclick="shahinAsk.close()">✕</button>' +
        '</span>' +
      '</div>' +
      '<div class="shask-body" id="shask-body"></div>' +
      '<div class="shask-states" id="shask-states"></div>' +
      '<div class="shask-foot"><div class="shask-comp">' +
        '<input type="text" id="shask-in"/>' +
        '<button class="shask-send" id="shask-send" onclick="shahinAsk.ask()"></button>' +
      '</div><div class="shask-note" id="shask-note"></div></div>';

    document.body.appendChild(fab);
    document.body.appendChild(p);
    wireDrag(p);
    wireResize(p);
  }

  /* ── drag by the header; once moved we switch to left/top so the panel is
        no longer glued to its corner. Clamped so it can never leave the view. */
  function wireDrag(panel) {
    var head = panel.querySelector('#shask-head'), sx, sy, ox, oy, dragging = false;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.shask-ib')) return;
      var r = panel.getBoundingClientRect();
      dragging = true; moved = true;
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px';
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      panel.style.insetInlineEnd = 'auto';
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var r = panel.getBoundingClientRect();
      var nx = Math.min(Math.max(0, ox + (e.clientX - sx)), innerWidth - r.width);
      var ny = Math.min(Math.max(0, oy + (e.clientY - sy)), innerHeight - r.height);
      panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
    });
    head.addEventListener('pointerup', function () { dragging = false; });
  }

  /* ── resize from the grip on the corner opposite the anchor ── */
  function wireResize(panel) {
    var grip = panel.querySelector('#shask-grip'), sx, sy, sw, shh, resizing = false;
    grip.addEventListener('pointerdown', function (e) {
      var r = panel.getBoundingClientRect();
      resizing = true; sx = e.clientX; sy = e.clientY; sw = r.width; shh = r.height;
      grip.setPointerCapture(e.pointerId); e.preventDefault();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!resizing) return;
      /* the grip sits at the inline-start edge, so in RTL dragging start-ward
         means a NEGATIVE clientX delta grows the panel; flip by direction */
      var rtl = getComputedStyle(document.documentElement).direction === 'rtl';
      var dx = (e.clientX - sx) * (rtl ? 1 : -1);
      panel.style.width = Math.max(320, Math.min(sw + dx, innerWidth - 24)) + 'px';
      panel.style.height = Math.max(340, Math.min(shh - (e.clientY - sy), innerHeight - 24)) + 'px';
      panel.classList.remove('big');
      big = false; syncSizeBtn();
    });
    grip.addEventListener('pointerup', function () { resizing = false; });
  }

  function syncSizeBtn() {
    var b = document.getElementById('shask-big');
    if (!b) return;
    b.innerHTML = ico('arrow-square-out');
    b.classList.toggle('is-big', big);
    b.setAttribute('aria-label', t(big ? C.shrink : C.expand));
    b.setAttribute('title', t(big ? C.shrink : C.expand));
  }

  function openersHTML() {
    return '<div class="shask-greet"><span class="shask-mark">' + ico('sparkle') + '</span>' +
        '<span class="shask-gtxt">' + t(C.greet) + '</span></div>' +
      '<p class="shask-lab">' + t(C.openers) + '</p>' +
      '<div class="shask-opens">' + openers().map(function (q) {
        return '<button class="shask-open" onclick="shahinAsk.pick(this)" data-q="' + q.replace(/"/g, '&quot;') + '">' + q + '</button>';
      }).join('') + '</div>';
  }

  function turnHTML(tn, isLast) {
    var h = '<div class="shask-u"><span>' + tn.q + '</span></div>';
    if (!tn.a) {
      return h + '<div class="shask-row"><span class="shask-mark">' + ico('sparkle') + '</span><div class="shask-txt">' +
        '<div class="shask-ctext" style="color:var(--sh-muted);margin-top:3px">' + t(C.checking) + '</div>' +
        '<div class="sh-inbox-sk" style="margin-top:10px;height:12px"></div>' +
        '<div class="sh-inbox-sk" style="margin-top:6px;height:12px;width:66%"></div></div></div>';
    }
    h += '<div class="shask-row"><span class="shask-mark">' + ico('sparkle') + '</span><div class="shask-txt">';
    /* ── بررسی‌ها ── what the agent actually did, so "it researched" is visible */
    if (tn.a.checks) {
      h += '<p class="shask-sec">' + ico('list-checks') + t(C.labChecks) + '</p><ul class="shask-checks">' +
        tn.a.checks.map(function (c) { return '<li>' + ico('check') + '<span>' + c + '</span></li>'; }).join('') +
        '</ul>';
    }
    /* ── یافته‌ها ── each claim wears its own certainty */
    h += '<p class="shask-sec">' + ico('target') + t(C.labFind) + '</p>';
    tn.a.claims.forEach(function (c) {
      var k = C.kinds[c.kind];
      h += '<div class="shask-claim ' + k.cls + '">' +
        '<span class="shask-k ' + k.cls + '"><i>' + k.g + '</i>' + t(k) + '</span>' +
        '<div class="shask-ctext">' + c.text + '</div></div>';
    });
    /* ── شواهد ── every chart the claims leaned on, gathered in one place so the
          findings read as prose and the proof sits below them */
    var ev = tn.a.claims.filter(function (c) { return c.ev && SC().charts && SC().charts[c.ev]; });   /* a claim whose chart isn't in the current scenario shows no evidence block */
    if (ev.length) {
      h += '<p class="shask-sec">' + ico('chart-line') + t(C.labEv) + '</p><div class="shask-evs">' +
        ev.map(function (c, i) {
          var spec = SC().charts[c.ev];
          return '<div class="shask-ev"><div class="shask-evhead">' +
            '<span class="shask-evt">' + t(spec.title) + '</span>' +
            '<button class="shask-evb" onclick="shahinAsk.openDash()">' + t(C.openDash) + ico('arrow-square-out') + '</button>' +
            '</div><div class="shask-chart" id="shask-ch-' + tn.id + '-' + i + '" data-ev="' + c.ev + '"></div></div>';
        }).join('') + '</div>';
    }
    /* ── قدم بعد ── only the newest answer offers them; older ones keep their
          content but stop competing for the click */
    if (isLast) {
      h += '<p class="shask-sec">' + ico('arrow-right') + t(C.labNext) + '</p>' +
        '<div class="shask-fu">' + tn.a.next.map(function (n) {
          return '<button class="shask-fub" onclick="shahinAsk.pick(this)" data-q="' + n.replace(/"/g, '&quot;') + '">' + n + '</button>';
        }).join('') + '</div>';
    }
    return h + '</div></div>';
  }

  function threadHTML() {
    return turns.map(function (tn, i) { return turnHTML(tn, i === turns.length - 1); }).join('');
  }

  function paint() {
    build();
    document.getElementById('shask-fab').innerHTML = ico('sparkle');
    document.getElementById('shask-fab').setAttribute('aria-label', t(C.name));
    document.getElementById('shask-mark').innerHTML = ico('sparkle');
    document.getElementById('shask-name').textContent = t(C.name);
    document.getElementById('shask-bound').textContent = t(C.boundTo) + ' ' + pageName();
    document.getElementById('shask-x').setAttribute('aria-label', t(C.close));
    document.getElementById('shask-head').setAttribute('title', t(C.drag));
    syncSizeBtn();
    var body = document.getElementById('shask-body');
    body.innerHTML = turns.length ? threadHTML() : openersHTML();
    body.scrollTop = body.scrollHeight;   /* stay on the newest turn */
    renderCharts();
    document.getElementById('shask-states').innerHTML =
      '<span class="shask-stlab">' + t(C.statePrev) + ':</span>' +
      ST.order.map(function (s) {
        return '<button class="shask-st' + (s === state ? ' on' : '') +
          '" onclick="shahinAsk.setState(\'' + s + '\')">' + t(ST.label[s]) + '</button>';
      }).join('');
    document.getElementById('shask-in').placeholder = t(C.ph);
    document.getElementById('shask-send').innerHTML = ico('paper-plane-tilt');
    document.getElementById('shask-note').textContent = t(C.notice);
  }

  /* PM 2026-10-25, AL-18/AL-19: «دسترس‌پذیری دستیار» is an organization setting (Organization settings ▸ AI controls; the demo
     keeps it per browser under the key shahin-ai-avail). It gates this panel and every hand-off into it («پرسیدن از دستیار
     دربارهٔ این نمودار», the dashboard «تحلیل»). Off: the launcher stays visible and refuses with a toast. Admin preview: only
     the owner and admins pass (TG-4: Shahin's roles owner/admin/member/viewer via ?prole=, default admin; there is no manager).
     The report builder's composer (RBAi.blocked) asks this same gate, so there is one rule. */
  function avail() { try { return localStorage.getItem('shahin-ai-avail') || 'on'; } catch (e) { return 'on'; } }
  function prole() { var r = new URLSearchParams(location.search).get('prole'); return r === 'owner' || r === 'member' || r === 'viewer' ? r : 'admin'; }
  function gate() {
    var av = avail(), r = prole();
    if (av === 'off') return { ok: false, fa: 'دستیار در این سازمان خاموش است؛ مالک یا ادمین سازمان آن را از «تنظیمات سازمان ← کنترل‌های هوش مصنوعی» روشن می‌کند',
      en: 'The assistant is off in this organization; the organization owner or an admin turns it on in Organization settings ▸ AI controls' };
    if (av === 'admin' && r !== 'owner' && r !== 'admin') return { ok: false, fa: 'دستیار فعلا در پیش‌نمایش است و فقط مالک و ادمین‌ها از آن استفاده می‌کنند',
      en: 'The assistant is in preview; only the owner and admins can use it for now' };
    return { ok: true };
  }
  function refuse(g) {
    if (window.Shahin && Shahin.toast) Shahin.toast(g.fa, g.en, { tone: 'warn' });
    else alert(en() ? g.en : g.fa);
  }

  window.shahinAsk = {
    gate: gate,
    /* Jump straight to any state. «شروع گفتگو» clears the thread; «در حال بررسی»
       leaves the answer pending so the skeleton shows; the rest swap the answer
       body. Built for the front-end team to see every state without having to
       fake data. */
    setState: function (s) {
      state = s;
      if (s === 'empty') { turns = []; }
      else {
        turns = [{ q: openers()[0], a: null, id: 0 }];
        if (s !== 'thinking') turns[0].a = answer(true);
      }
      paint();
    },
    openDash: function () {
      if (window.Shahin && Shahin.toast) {
        Shahin.toast('نمای پشتیبان این شاهد در داشبورد باز می‌شود',
                     'Opens the view behind this evidence in the dashboard');
      }
    },
    open: function () { var g = gate(); if (!g.ok) { refuse(g); return false; }   /* AL-19: visible entry, refused with the reason */
      open = true; turns = []; state = 'ok'; paint();
      document.body.classList.add('shask-on');
      setTimeout(function () { var i = document.getElementById('shask-in'); if (i) i.focus(); }, 60); },
    close: function () { open = false; document.body.classList.remove('shask-on'); },
    toggleSize: function () {
      var p = document.getElementById('shask-panel');
      big = !big;
      /* a manual resize wins over the preset, so clear inline sizing first */
      p.style.width = ''; p.style.height = '';
      p.classList.toggle('big', big);
      syncSizeBtn();
    },
    ask: function () {
      var inp = document.getElementById('shask-in');
      /* these two are view states, not answer states — asking leaves them */
      if (state === 'empty' || state === 'thinking') state = 'ok';
      var q = (inp.value || '').trim() || openers()[0];
      var tn = { q: q, a: null, id: turns.length };
      turns.push(tn);
      inp.value = '';
      paint();
      setTimeout(function () { tn.a = answer(turns.length === 1); paint(); }, 850);
    },
    pick: function (btn) { document.getElementById('shask-in').value = btn.getAttribute('data-q'); window.shahinAsk.ask(); },
    /* Additive API (report-builder v12, step 11a, PM approval 2026-10-18). Nothing changes for a page that doesn't call these:
       register() lets a page supply its own scenario (same shape as SCEN entries) under its SHAHIN_PAGE id, and askWith()
       opens the panel with a question already asked, so "Ask the assistant about this chart" lands in context. */
    register: function (id, sc) { if (id && sc) { SCEN[id] = sc; turns = []; } },   /* a new context starts a new conversation */
    askWith: function (q) { if (window.shahinAsk.open() === false) return;   /* AL-19: a blocked hand-off must not fire its question */
      setTimeout(function () { var i = document.getElementById('shask-in'); if (i) { i.value = q || ''; window.shahinAsk.ask(); } }, 80); }
  };

  addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) window.shahinAsk.close(); });
  /* ⌘/Ctrl+Shift+K toggles the assistant (PRD-Global-Agent's shortcut) */
  addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); e.stopImmediatePropagation(); if (open) window.shahinAsk.close(); else window.shahinAsk.open(); } }, true);   /* capture phase, so the global ⌘K search doesn't also open */
  document.addEventListener('shahin:lang', function () { if (document.getElementById('shask-panel')) paint(); });
  document.addEventListener('shahin:theme', function () { if (open) paint(); });
  build();
})();
