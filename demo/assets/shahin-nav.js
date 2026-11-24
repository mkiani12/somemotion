/* ═══════════════════════════════════════════════════════════════════
   SHAHIN Wireframe Design System — Global Shell + Nav
   The design team's final menu-redesign delivery, adopted globally by the
   PM on 2026-08-01: a two-tier rail + panel beside a curved content shell,
   with a project switcher, a collapse-to-icons rail, ⌘K, a quota box and a
   status footer.
   NOT here on purpose: the delivery's Pinned and Recent sections. The PM
   parked them on 2026-08-01 — they stay demoed in /menu/design/ (and in the
   component spec) for when we do want them, but the demo ships without.
   Visual spec: /menu/design/shahin-final.html · component spec:
   /menu/design/components.html · mobile = variant B (/menu/design/mobile-b-drawer.html).
   The Concept B predecessor is kept verbatim in legacy/shahin-nav-conceptB.js.

   Usage — unchanged; include AFTER window.SHAHIN_PAGE and BEFORE shahin.js:
     <script src="versions.js"></script>
     <script>window.SHAHIN_PAGE = Object.assign({}, window.SHAHIN_PAGE_META, { version:'vN' });</script>
     <script src="/assets/shahin-nav.js"></script>
     <script src="/assets/shahin.js"></script>

   Injects, into body.sh-layout:
     .sh-railwrap (.sh-rail + .sh-pane) before <main class="sh-main">,
     the search / notification / help cluster into .sh-topbar,
     the project name into .sh-topbar and the page title + breadcrumb into
     .sh-content, plus the ⌘K palette and the scrim. There is no footer —
     production's shell has none.
   Pages are not edited; the active item resolves from SHAHIN_PAGE.id.
   Styles: GLOBAL SHELL + NAV section of shahin-components.css. Icons: .sh-ni → #shn-*.

   NAV MODEL — mirrors production (apps/front-cp/app/composables/sidebarItem.ts).
   Every row carries a `state`:
     'prod' — live in production today (the default; nothing is drawn)
     'new'  — live, and production shows the New chip on it
     'soon' — a Shahin wireframe that has NOT shipped yet
     'backlog' — not built yet and not scheduled, or (PM 2026-10-28, LX-6) the
                 whole page is not in production; shows a muted Backlog chip
                 (on a module, the chip sits on the pane title)
   plus `lock:true` for plan-gated entries and `sa:true` for super-admin-only
   ones, matching production's `locked` / role !== 'SA' rules. `href` points at
   the wireframe; a row without one only exists in production and toasts.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* assets base derived from this script's own URL — works on the :8012
     server, on file://, and at any page depth. */
  var ASSETS_BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    if (!s) return '/assets/';
    return s.slice(0, s.lastIndexOf('/') + 1);
  })();

  /* standalone exports (tools/export-standalone.py) inline every asset as a
     data URI in this map; live pages never define it. */
  function assetUrl(rel){
    var inl = window.SHAHIN_INLINE_ASSETS;
    return (inl && inl[rel]) ? inl[rel] : ASSETS_BASE + rel;
  }

  /* ── icon sprite (bare paths; stroke cascades from .sh-ni) ── */
  var P = {
    'shn-overview':    'M5 20V10M12 20V4M19 20v-7',
    'shn-realtime':    'M3 13h4l2 6 4-15 2 9h6',
    'shn-audience':    'M3 5h13v9H3z M9 18h2 M10 14v4 M19 8h3v10h-3z',
    'shn-acquisition': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M4 12h16 M12 4c3 3 3 13 0 16 M12 4c-3 3-3 13 0 16',
    'shn-engagement':  'M6 4l11 5-4.5 1.8L11 16z',
    'shn-pages':       'M6 3h8l3 3v10H6z M9 19h8V9',
    'shn-tags':        'M4 4h7l9 9-7 7-9-9z M8 8h.01',
    'shn-patterns':    'M4 14l3-4 3 5 3-9 3 6 4-3',
    'shn-journey':     'M5 13c0 4 7 8 7 8s7-4 7-8a7 7 0 0 0-14 0z M12 11a2 2 0 1 0 0-.01',
    'shn-replay':      'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M10 9l5 3-5 3z',
    'shn-kiosk':       'M3 4h18v11H3z M8 20h8 M12 15v5',
    'shn-ads':         'M4 10v4h3l6 4V6l-6 4z M16 9a5 5 0 0 1 0 6',
    'shn-video':       'M3 6h18v12H3z M10 9.5l5 2.5-5 2.5z',
    'shn-events':      'M13 3L5 14h6l-1 7 8-11h-6z',
    'shn-performance': 'M4 18a8 8 0 1 1 16 0 M12 18l4-5',
    'shn-webvitals':   'M20.5 9.2a3.6 3.6 0 0 0-6.3-2.4l-2.2 2.2-2.2-2.2A3.6 3.6 0 0 0 3.5 9.2c0 1.4.6 2.6 1.5 3.5L12 19l7-6.3c.9-.9 1.5-2.1 1.5-3.5z',
    'shn-infra':       'M4 5h16v5H4z M4 14h16v5H4z M8 7.5h.01 M8 16.5h.01',
    'shn-render':      'M3 5h18v14H3z M3 9h18 M6 7h.01',
    'shn-uptime':      'M12 3l7 3v5c0 5-3.4 7.6-7 9-3.6-1.4-7-4-7-9V6z M9 12l2 2 4-4',
    'shn-rux':         'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M9 10h.01 M15 10h.01 M8.5 14a4 4 0 0 0 7 0',
    'shn-seo':         'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
    'shn-discover':    'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M15.5 8.5l-2 5-5 2 2-5z',
    'shn-stability':   'M12 3l7 3v5c0 5-3.4 7.6-7 9-3.6-1.4-7-4-7-9V6z',
    'shn-structure':   'M9 3h6v4H9z M3 17h6v4H3z M15 17h6v4h-6z M12 7v4 M6 17v-2h12v2',
    'shn-settings':    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 3v3 M12 18v3 M4 12h3 M17 12h3 M6 6l2 2 M16 16l2 2 M18 6l-2 2 M8 16l-2 2',
    'shn-list':        'M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01',
    'shn-megaphone':   'M4 10v4h3l7 4V6L7 10z M17 9a4 4 0 0 1 0 6 M7 14l1 5h2.5l-1-4.4',
    'shn-bell':        'M12 4a6 6 0 0 0-6 6c0 4.5-1.2 6.2-2 7h16c-.8-.8-2-2.5-2-7a6 6 0 0 0-6-6z M10 20a2.2 2.2 0 0 0 4 0',
    'shn-billing':     'M3 6h18v12H3z M3 10h18',
    'shn-subscription':'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.9 7.2 19.7l.9-5.4L4.2 9.7l5.4-.8z',
    'shn-invoices':    'M6 3h12v18l-2-1.3L14 21l-2-1.3L10 21l-2-1.3L6 21z M9 8h6 M9 12h6',
    'shn-transactions':'M6 8h12l-3-3 M18 16H6l3 3',
    'shn-support':     'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M7 7l2.5 2.5 M14.5 14.5L17 17 M17 7l-2.5 2.5 M9.5 14.5L7 17',
    'shn-content':     'M7 3h7l4 4v14H7z M14 3v4h4',
    'shn-design':      'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
    'shn-plus':        'M12 5v14 M5 12h14',
    'shn-chevron':     'M6 9l6 6 6-6',
    'shn-chev-start':  'M15 6l-6 6 6 6',
    'shn-project':     'M3 6h6l2 2h10v10H3z',
    'shn-users':       'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20a6 6 0 0 1 12 0 M16.5 11.5a3 3 0 1 0 0-6 M17 14.6a5.5 5.5 0 0 1 4 5.4',
    'shn-admin':       'M12 3l7 3v5c0 5-3.4 7.6-7 9-3.6-1.4-7-4-7-9V6z M10.4 11.6v-1a1.6 1.6 0 0 1 3.2 0v1 M9.6 11.6h4.8v3.4H9.6z',
    'shn-audit':       'M8 3h8v3H8z M6 5H5v16h14V5h-1 M8.5 11l1.4 1.4L13 9.5 M8.5 16h5',
    'shn-gift':        'M20 7H4v5h16z M12 7v14 M12 7H7.5a2.5 2.5 0 0 1 0-5C9.5 2 12 5 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C14.5 2 12 5 12 7z M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
    'shn-reports':     'M4 5v14h16 M7.5 15l3.5-4.5 3 2.5 4.5-6',
    'shn-funnel':      'M4 5h16l-6 7v5l-4 2v-7z',
    'shn-retention':   'M20 12a8 8 0 1 1-2.4-5.7 M20 3.5V8h-4.5',
    'shn-flows':       'M4 6h4 M4 12h4 M4 18h4 M8 6c6 0 6 6 12 6 M8 12h12 M8 18c6 0 6-6 12-6',
    'shn-script':      'M8 6l-4 6 4 6 M16 6l4 6-4 6 M13 4l-2 16',
    'shn-plans':       'M12 3l8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 4.5 8-4.5 M12 12v9',
    'shn-search':      'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
    'shn-help':        'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M9.6 9.5a2.5 2.5 0 1 1 3 2.4v1.4 M12 16.6h.01',
    'shn-lock':        'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3',
    'shn-check':       'M5 12.5l4.5 4.5L19 7',
    'shn-menu':        'M4 7h16 M4 12h16 M4 17h16',
    'shn-hub':         'M4 11l8-6 8 6v8H4z M10 19v-5h4v5',
    /* the assistant launcher — a sparkle, redrawn at this file's 24px stroke
       scale so it sits with the rest of the rail (the panel's own FAB carries
       the same glyph at Phosphor's 256 fill scale) */
    'shn-ask':         'M10 5.5l2.3 4.4 4.4 2.3-4.4 2.3-2.3 4.4-2.3-4.4L3.3 12.2l4.4-2.3z M18.5 4v3.5 M16.75 5.75h3.5'
  };

  /* ── the model ─────────────────────────────────────────────────────
     row kinds: item  {id,fa,en,icon,href?,page?,q?,state?,lock?,sa?,tf?,te?}
                grp   {key,fa,en,icon,rows}    — collapsible, children lose their icon
                cap   {fa,en}                  — caption inside a group
                scope {fa,en,project:bool}     — the project→account divider
                note  {fa,en}
     module: {key, fa, en, icon, svc?, state?, rows}
     Scope is shown exactly where the delivery shows it: the rail separator
     splits project modules from account ones, and a pane that mixes the two
     carries one `scope` divider. */
  var MODULES = [
    { key:'analytics', fa:'آنالیتیکس', en:'Analytics', icon:'shn-acquisition', svc:'sh-svc-analytics', rows:[
      { id:'overview', fa:'نمای کلی', en:'Overview', icon:'shn-overview', href:'/overview/', page:'overview' },
      { id:'realtime', fa:'آمار لحظه‌ای', en:'Realtime Statistic', icon:'shn-realtime', href:'/realtime/', page:'realtime' },
      /* Specialized analysis — each row is a full overview scoped to one kind of
         activity, so these sit next to «نمای کلی», not inside Engagement. There is
         deliberately NO business-type framing here: any project may enable any of
         them (a news site running an exchange dashboard is none of our business).
         The old top-level «ایونت‌ها» module was dissolved into this group + Projects,
         per 04-Panel-IA-And-Stories §۸.۱ «پیکربندی → Settings، فهمیدن → Analytics». */
      { kind:'grp', key:'specialized', fa:'تحلیل تخصصی', en:'Specialized Analysis', icon:'shn-events', rows:[
        { id:'ecommerce', fa:'فروشگاهی', en:'E-commerce', href:'/events-ecommerce/', page:'events-ecommerce', state:'soon',
          tf:'<span class="tip-title">فروشگاهی</span>اورویوی فروش و تراکنش: قیف خرید، سبد، پرداخت و بازگشت مشتری.',
          te:'<span class="tip-title">E-commerce</span>The sales &amp; transaction overview: purchase funnel, cart, checkout and returning customers.' },
        { id:'media', fa:'رسانه', en:'Media', href:'/events-media/', page:'events-media',
          tf:'<span class="tip-title">رسانه</span>اورویوی محتوا و تعامل: نبض تحریریه، عمر خبر، سفر خواننده و منابع ورود.',
          te:'<span class="tip-title">Media</span>The content &amp; engagement overview: newsroom pulse, story lifespan, the reader journey and acquisition.' },
        { id:'exchange', fa:'صرافی ارز دیجیتال', en:'Crypto Exchange', href:'/events-exchange/', page:'events-exchange',
          tf:'<span class="tip-title">صرافی ارز دیجیتال</span>اورویوی صرافی از ۱۵ ایونت واقعی: قیف فعال‌سازی، KYC، واریز/برداشت، معاملات و ماندگاری کوهورت‌محور. شمارِ ایونت، نه مبلغ.',
          te:'<span class="tip-title">Crypto exchange</span>The exchange overview from 15 real events: activation funnel, KYC, deposit/withdrawal, trading and cohort retention. Event counts, not amounts.' },
        { id:'video', fa:'ویدیو', en:'Video', href:'/video-dashboard/', page:'video-dashboard', state:'soon',
          tf:'<span class="tip-title">ویدیو</span>اورویوی تماشا: شروع و تکمیل پخش، عمق تماشا، کیفیت پخش و محتوای پرتماشا.',
          te:'<span class="tip-title">Video</span>The watch overview: play starts and completions, watch depth, playback quality and top content.' },
        { id:'ads', fa:'درآمد تبلیغات', en:'Ads Revenue', href:'/ads-dashboard/', page:'ads-dashboard', state:'backlog' },
        { id:'gaming', fa:'بازی', en:'Gaming', href:'/events-gaming/', page:'events-gaming', state:'backlog' },
        { id:'ai', fa:'هوش مصنوعی / LLM', en:'AI / LLM', href:'/events-ai/', page:'events-ai', state:'backlog' },
        { kind:'note', fa:'در پروداکشن فقط داشبوردهایی دیده می‌شوند که ایونت‌هایشان به پروژه می‌رسد.', en:'In production only the dashboards whose events reach the project are shown.' }
      ]},
      { kind:'grp', key:'audience', fa:'بینش مخاطب', en:'Audience Insight', icon:'shn-audience', rows:[
        { id:'device-technology', fa:'دستگاه و فناوری', en:'Device & Technology', href:'/device-technology/', page:'device-technology', state:'soon',
          tf:'<span class="tip-title">دستگاه و فناوری</span>گزارش دستگاه، مرورگر و سیستم‌عامل بازدیدکننده‌ها (User-Agent).',
          te:'<span class="tip-title">Device &amp; Technology</span>Device, browser &amp; OS breakdown of your visitors (User-Agent).' },
        { id:'bots', fa:'ترافیک ربات‌ها', en:'Bot traffic', href:'/bot-traffic/', page:'bot-traffic', state:'backlog',
          tf:'<span class="tip-title">ترافیک ربات‌ها</span>کیفیت ترافیک: سهم ربات از بازدید، حذف پیش‌فرض ربات‌ها و گزارش ربات‌های برتر.',
          te:'<span class="tip-title">Bot traffic</span>Traffic quality: bot share of pageviews, bot-free by default, and a top-bots report.' }
      ]},
      { kind:'grp', key:'acquisition', fa:'تحلیل جذب', en:'Acquisition Analysis', icon:'shn-acquisition', rows:[
        { id:'referrers', fa:'جذب ترافیک', en:'Traffic Acquisition', href:'/referrer/', page:'referrer', state:'soon' },
        { id:'utm', fa:'کمپین‌ها', en:'Campaigns', href:'/utm/', page:'utm', state:'soon' },
        /* PM 2026-11-15 — mobile install attribution (PRD-Dashboard-07). Both rows show only for a
           project with a registered app package (MSDK-0004); a web-only project never sees them. */
        { id:'app-acquisition', fa:'جذب اپ', en:'App Acquisition', href:'/app-acquisition/', page:'app-acquisition', state:'backlog',
          tf:'<span class="tip-title">جذب اپ</span>هر نصب اپ از کدام منبع و کمپین آمده و چطور به آن وصل شده است. فقط برای پروژه‌ای که پکیج اپ دارد دیده می‌شود.',
          te:'<span class="tip-title">App Acquisition</span>Where each app install came from, down to campaign, and how it was matched. Shown only for projects with an app package.' },
        { id:'acquisition-quality', fa:'کیفیت جذب', en:'Acquisition Quality', href:'/acquisition-quality/', page:'acquisition-quality', state:'backlog',
          tf:'<span class="tip-title">کیفیت جذب</span>کاربرانی که هر منبع آورده ماندند و به کار مهم رسیدند یا نه. فقط برای پروژه‌ای که پکیج اپ دارد دیده می‌شود.',
          te:'<span class="tip-title">Acquisition Quality</span>Whether the users each source brought stayed and reached the action that matters. Shown only for projects with an app package.' }
      ]},
      /* Production keeps Engagement flat — no caption rows inside it — and the
         labels/chips below are its own (verified on staging with every feature
         flag on, 2026-09-22). Kiosk Mode is NOT in this group in production;
         it sits at the module's top level, after Specialized Analysis. */
      { kind:'grp', key:'engagement', fa:'تعامل', en:'Engagement', icon:'shn-engagement', rows:[
        { id:'pages', fa:'صفحات', en:'Pages', href:'/pages/', page:'pages', state:'new' },
        { id:'tags', fa:'برچسب‌ها', en:'Tags', href:'/tags/', page:'tags', state:'new' },
        { id:'patterns', fa:'الگوهای فعالیت', en:'Activity Patterns', href:'/user-activity-patterns/', page:'user-activity-patterns', state:'new',
          tf:'<span class="tip-title">الگوهای فعالیت</span>نقشه حرارتی زمان فعالیت کاربران — ماه، روز هفته و ساعت شبانه‌روز — برای انتخاب بهترین زمان انتشار و کمپین.',
          te:'<span class="tip-title">Activity Patterns</span>Heatmaps of when users are active — by month, weekday and hour — to pick the best time to publish and run campaigns.' },
        { id:'journey', fa:'سفر کاربر', en:'User Journey', href:'/user-journey/', page:'user-journey', state:'new', lock:true },
        { id:'replay', fa:'بازپخش نشست', en:'Session Replay', href:'/session-replay/', page:'session-replay', lock:true,
          tf:'<span class="tip-title">بازپخش نشست</span>تماشای ضبط ویدیویی نشست‌های واقعی کاربر با چیپ‌های سیگنال مهم، پلیر و تایم‌لاین رویدادها.',
          te:'<span class="tip-title">Session Replay</span>Watch video recordings of real user sessions, with important-signal chips, a player, and an event timeline.' }
      ]},
      { id:'kiosk', fa:'حالت کیوسک', en:'Kiosk Mode', icon:'shn-kiosk', href:'/kiosk-mode/', page:'kiosk-mode',
        tf:'<span class="tip-title">حالت کیوسک</span>نمایش تمام‌صفحهٔ داشبورد برای مانیتورهای دیواری — یک حالت نمایش است، نه گزارش.',
        te:'<span class="tip-title">Kiosk Mode</span>Full-screen dashboard for wall monitors — a display mode, not a report.' }
    ]},
    { key:'reports', fa:'گزارش‌ساز', en:'Reports', icon:'shn-reports', svc:'sh-svc-reports', state:'backlog', rows:[   /* PM 2026-10-28, LX-6 */
      /* Custom events leads the module (PM, 2026-08-16): it is not a report type but the raw
         material the four report types are built from, so it reads as the starting point rather
         than an afterthought appended below them. */
      /* «ایونت‌های اختصاصی» removed 2026-10-11 (PM); it returns with the event-definition / lexicon concept */
      /* PM 2026-11-05: as in Amplitude, the module starts with where your reports live (Home, Spaces), then «ساختن» with the report
         types. Before this, the report types were the only entries, so saved charts and spaces had no way in from the menu. */
      { id:'rb-home', fa:'خانه', en:'Home', icon:'shn-hub', href:'/report-builder/?view=home', page:'report-builder', q:'view=home', state:'backlog',
        tf:'<span class="tip-title">خانه</span>نقطه شروع گزارش‌ساز: آخرین گزارش‌ها و داشبوردها و میانبر ساختن.',
        te:'<span class="tip-title">Home</span>The report builder’s starting point: your latest reports and dashboards, and shortcuts to create.' },
      { id:'rb-spaces', fa:'فضاها', en:'Spaces', icon:'shn-content', href:'/report-builder/?view=spaces', page:'report-builder', q:'space', state:'backlog',
        tf:'<span class="tip-title">فضاها</span>جایی که گزارش‌ها و داشبوردهای ذخیره‌شده نگه داشته می‌شوند: فضای شخصی شما و فضاهای تیمی.',
        te:'<span class="tip-title">Spaces</span>Where saved reports and dashboards are kept: your personal space and team spaces.' },
      { kind:'cap', fa:'ساختن', en:'Create' },
      { id:'rb-trend', fa:'روند', en:'Trend', icon:'shn-overview', href:'/report-builder/?type=trend', page:'report-builder', q:'type=trend', state:'backlog',
        tf:'<span class="tip-title">روند</span>شمار هر ایونت در طول زمان، با تفکیک روی هر ویژگی — برای هر ایونتی که شاهین جمع می‌کند، از پک‌ها تا ایونت‌های اختصاصی خود شما.',
        te:'<span class="tip-title">Trend</span>Any event counted over time, broken down by any property — for everything Shahin collects, packs and your own custom events alike.' },
      { id:'rb-funnel', fa:'قیف', en:'Funnel', icon:'shn-funnel', href:'/report-builder/?type=funnel', page:'report-builder', q:'type=funnel', state:'backlog',
        tf:'<span class="tip-title">قیف</span>مسیر چندقدمی بسازید و ببینید چند نفر تا آخر می‌رسند و کجا می‌ریزند — با پنجرهٔ تبدیل و شمارش انتخابی.',
        te:'<span class="tip-title">Funnel</span>Build a multi-step path and see how many finish and where they drop — with a conversion window and your choice of counting.' },
      { id:'rb-retention', fa:'ریتنشن', en:'Retention', icon:'shn-retention', href:'/report-builder/?type=retention', page:'report-builder', q:'type=retention', state:'backlog',
        tf:'<span class="tip-title">ریتنشن</span>کسانی که کاری را کردند، در هفته‌های بعد برمی‌گردند؟ نقشهٔ کوهورت با اندازهٔ هر گروه.',
        te:'<span class="tip-title">Retention</span>Do people who did something come back in later weeks? A cohort map with each group’s size.' },
      { id:'rb-flows', fa:'مسیرها', en:'Flows', icon:'shn-flows', href:'/report-builder/?type=flows', page:'report-builder', q:'type=flows', state:'backlog',
        tf:'<span class="tip-title">مسیرها</span>کاربران بعد (یا قبل) از یک ایونت واقعا چه می‌کنند؟ کشف مسیرهای واقعی بدون فرض قبلی — مکمل قیف.',
        te:'<span class="tip-title">Flows</span>What do users actually do after (or before) an event? Discover real paths with no assumptions — the funnel’s complement.' },
      { kind:'note', fa:'گزارش‌ساز هنوز در پروداکشن نیست؛ این‌ها وایرفریم‌اند.', en:'The report builder is not in production yet — these are wireframes.' }
    ]},
    { key:'performance', fa:'کارایی', en:'Performance', icon:'shn-performance', svc:'sh-svc-performance', rows:[
      { id:'webvitals', fa:'معیارهای حیاتی وب', en:'Core Web Vitals', icon:'shn-webvitals', href:'/core-web-vitals/', page:'core-web-vitals', state:'new', lock:true,
        tf:'<span class="tip-title">معیارهای حیاتی وب</span>پایش آزمایشگاهی LCP، CLS، FCP، TTFB، INP و TBT برای آدرس‌های منتخب — بررسی روزانه، نوار بارگذاری و روند هر متریک.',
        te:'<span class="tip-title">Core Web Vitals</span>Lab tracking of LCP, CLS, FCP, TTFB, INP and TBT for selected URLs — daily checks, loading filmstrip and per-metric trends.' },
      { id:'infra', fa:'زیرساخت و شبکه', en:'Infrastructure & Network', icon:'shn-infra', href:'/performance-dashboard/#s1', page:'infra' },
      { id:'render', fa:'رندر و تعامل', en:'Render & Interaction', icon:'shn-render', href:'/performance-dashboard/#s2', page:'render' },
      { id:'rux', fa:'تجربه کاربر واقعی', en:'Real User Experience', icon:'shn-rux', href:'/real-user-experience/', page:'real-user-experience', state:'backlog' },
      { id:'uptime', fa:'پایش دردسترس‌بودن', en:'Blackbox Uptime', icon:'shn-uptime', href:'/performance-dashboard/#s3', page:'uptime', state:'backlog' }
    ]},
    /* production header: Search Console */
    { key:'seo', fa:'سئو', en:'SEO', icon:'shn-seo', svc:'sh-svc-seo', rows:[
      { id:'search', fa:'نتایج جستجو', en:'Search Results', icon:'shn-seo', href:'/seo-search-results/', page:'seo-search-results', state:'new', lock:true,
        tf:'<span class="tip-title">نتایج جستجو</span>عملکرد سایت در جستجوی گوگل: کلیک، نمایش، نرخ کلیک و جایگاه + برترین صفحه‌ها، کوئری‌ها و روزها.',
        te:'<span class="tip-title">Search Results</span>Your site\'s Google Search performance: clicks, impressions, CTR and position + top pages, queries and dates.' },
      { id:'discover', fa:'دیسکاور', en:'Discover', icon:'shn-discover', href:'/seo-discover/', page:'seo-discover', state:'new', lock:true,
        tf:'<span class="tip-title">دیسکاور</span>عملکرد سایت در فید Google Discover: کلیک، نمایش و نرخ کلیک + برترین صفحه‌ها و روزها. دیسکاور کوئری و جایگاه ندارد.',
        te:'<span class="tip-title">Discover</span>Your site\'s Google Discover performance: clicks, impressions and CTR + top pages and dates. Discover has no query or position dimension.' },
      { id:'structure', fa:'ساختار سایت', en:'Site Structure Analytics', icon:'shn-structure', href:'/seo-site-structure/', page:'seo-site-structure',
        tf:'<span class="tip-title">ساختار سایت</span>همان عملکرد جستجو به تفکیک ساختار سایت: درخت مسیرها با کلیک/نمایش/CTR/جایگاه و روند هر گره + لنز تحلیل افت.',
        te:'<span class="tip-title">Site Structure</span>Search performance broken down by site structure: the path tree with clicks/impressions/CTR/position and per-node trends + the loss-analysis lens.' },
      /* AI Visibility (GEO) — placed beside the Search Console reports for now; whether it
         becomes its own GEO module is an open PM decision, so it is one object to move */
      { id:'ai-visibility', fa:'دیده‌شدن در هوش مصنوعی', en:'AI Visibility', icon:'shn-ask', href:'/ai-visibility/', page:'ai-visibility', state:'backlog',
        tf:'<span class="tip-title">دیده‌شدن در هوش مصنوعی</span>آیا دستیارهای هوش مصنوعی (ChatGPT، AI Overview، Gemini، Perplexity و Claude) در پاسخ به پرسش‌های حوزهٔ شما نام برندتان را می‌آورند و به سایتتان استناد می‌کنند؛ هر هفته در پنج موتور اندازه‌گیری می‌شود.',
        te:'<span class="tip-title">AI Visibility</span>Whether AI assistants (ChatGPT, AI Overview, Gemini, Perplexity and Claude) name your brand and cite your site when answering prompts in your field; measured weekly across five engines.' },
      { id:'seo-lifecycle', fa:'چرخه عمر محتوا', en:'Content Lifecycle', icon:'shn-patterns', href:'/seo-lifecycle/', page:'seo-lifecycle', state:'soon',
        tf:'<span class="tip-title">چرخه عمر محتوا</span>طبقه‌بندی هر کلیدواژه و صفحه در نه برچسب چرخه عمر (رشد، همیشه‌سبز، افت، ریزش تقاضا و…) بر پایه سه پنجره ۲۸ روزه.',
        te:'<span class="tip-title">Content Lifecycle</span>Classifies every keyword and page into nine lifecycle labels (growth, stable, losing, demand drop, …) over three 28-day windows.' },
      { id:'seo-action-queue', fa:'صف اقدام', en:'Action Queue', icon:'shn-list', href:'/seo-action-queue/', page:'seo-action-queue', state:'soon',
        tf:'<span class="tip-title">صف اقدام</span>ورک‌لیست هفتگی سئو: صفحه‌های نیازمند اقدام، مرتب بر اساس کلیک در خطر، با اقدام پیشنهادی و وضعیت انجام/بعدا/نادیده.',
        te:'<span class="tip-title">Action Queue</span>The weekly SEO worklist: pages needing action, ranked by clicks at stake, each with a recommended action and done/snooze/dismiss state.' },
      { id:'seo-content-audit', fa:'ممیزی کیفیت محتوا', en:'Content Quality Audit', icon:'shn-content', href:'/seo-content-audit/', page:'seo-content-audit', state:'backlog',
        tf:'<span class="tip-title">ممیزی کیفیت محتوا</span>خزش و نمره‌دهی هوش مصنوعی به تک‌تک صفحه‌ها (۰ تا ۱۰۰ در پنج بعد) با پرچم ریسک و اقدام پیشنهادی حذف/نوایندکس/بازنویسی.',
        te:'<span class="tip-title">Content Quality Audit</span>Crawls and AI-grades every page (0–100 across five dimensions) with risk flags and remove/noindex/rewrite recommendations.' }
    ]},
    /* production header: Project management — account scope */
    { key:'projects', fa:'پروژه‌ها', en:'Projects', icon:'shn-project', rows:[
      { id:'settings', fa:'تنظیمات پروژه', en:'Project Settings', icon:'shn-settings', href:'/project-settings/', page:'project-settings' },
      /* PM 2026-10-25, AL-18: assistant availability and the assistant audit live in organization settings (project-settings/organization.html) */
      { id:'org-settings', fa:'تنظیمات سازمان', en:'Organization Settings', icon:'shn-settings', href:'/project-settings/organization.html', page:'organization-settings',
        tf:'<span class="tip-title">تنظیمات سازمان</span>تنظیم‌هایی که برای همه پروژه‌های سازمان یکی است، مثل روشن یا خاموش بودن دستیار و بازبینی پرسش‌هایش.',
        te:'<span class="tip-title">Organization Settings</span>Settings shared by every project in the organization, such as whether the assistant is on and the review of its questions.' },
      { id:'members', fa:'اعضا و دسترسی', en:'Members & Access', icon:'shn-users' },
      /* «راه‌اندازی است یا فهمیدن؟» — راه‌اندازی این‌جا، فهمیدن در آنالیتیکس.
         این دو ردیف پیش‌تر داخل ماژول سطح‌اولِ «ایونت‌ها» بودند. */
      { kind:'grp', key:'data-collection', fa:'جمع‌آوری داده', en:'Data Collection', icon:'shn-script', rows:[
        { id:'eventstart', fa:'گالری تمپلیت‌ها', en:'Template gallery', href:'/events-start/', page:'events-start', state:'soon',
          tf:'<span class="tip-title">گالری تمپلیت‌ها</span>تمپلیت‌هایی که شاهین آماده کرده: هر تمپلیت ایونت‌های خودش را دارد، شاهین اسکیمای هرکدام را می‌دهد، و با رسیدن داده داشبورد آن تمپلیت باز می‌شود.',
          te:'<span class="tip-title">Template gallery</span>The templates Shahin has prepared: each template has its own events, Shahin supplies every event’s schema, and the template’s dashboard opens once its data arrives.' },
        /* PM 2026-10-25, LX-22: the menu matches the page title and breadcrumb — «ایونت‌های پروژه» / Project Events */
        { id:'eventsettings', fa:'ایونت‌های پروژه', en:'Project Events', href:'/events-settings/', page:'events-settings', state:'backlog',   /* PM 2026-10-28, LX-6 */
          tf:'<span class="tip-title">ایونت‌های پروژه</span>هر ایونتی که این پروژه دارد، پکی یا اختصاصی، در یک فهرست: منشأ، وضعیت جمع‌آوری، اسکیما، و نام نمایشی و توضیحی که تیم شما در گزارش‌ها می‌بیند.',
          te:'<span class="tip-title">Project Events</span>Every event this project has, pack-born or custom, in one list: origin, collection status, schema, and the display name and description your team sees in reports.' }
      ]},
      /* api-v2 split the old «اعلان و پایش» console in two: the inbox (a read
         surface) and alert subscriptions. The 2026-08-02 decision not to build
         per-channel / per-category preferences was REVERSED by the PM on
         2026-11-16 (Notification module, round 1): core-api now ships
         notificationPreferences (six groups × email/SMS/Telegram + quiet hours),
         and «اخبار محصول» announcements are gated by it — hence the
         notification-settings row below. */
      { id:'notification-center', fa:'صندوق پیام', en:'Inbox', icon:'shn-bell', href:'/notification-center/', page:'notification-center', state:'soon',
        tf:'<span class="tip-title">صندوق پیام</span>همه اعلان‌هایی که شاهین درون پنل برای شما می‌گذارد، از تازه‌ترین به قدیمی‌ترین، با فیلتر خوانده‌نشده.',
        te:'<span class="tip-title">Inbox</span>Every notification Shahin leaves for you inside the panel, newest first, with an unread filter.' },
      { id:'notification-settings', fa:'تنظیمات اعلان', en:'Notification Settings', icon:'shn-settings', href:'/notification-settings/', page:'notification-settings', state:'soon',
        tf:'<span class="tip-title">تنظیمات اعلان</span>انتخاب کنید پیام‌های هر دسته از طریق ایمیل، پیامک یا تلگرام هم به شما برسد یا فقط در صندوق پیام بماند، و ساعت سکوت خودتان را بگذارید.',
        te:'<span class="tip-title">Notification Settings</span>Choose whether each kind of message also reaches you by email, SMS or Telegram, or stays in your inbox only, and set your own quiet hours.' },
      { id:'alert-subscriptions', fa:'هشدارهای من', en:'My Alerts', icon:'shn-bell', href:'/alert-subscriptions/', page:'alert-subscriptions', state:'soon',
        tf:'<span class="tip-title">هشدارهای من</span>آستانه روی بازدید یا مصرف سهمیه بگذارید و در ساعتی که خودتان انتخاب می‌کنید پیام بگیرید. هشدار فوری وجود ندارد.',
        te:'<span class="tip-title">My Alerts</span>Set a threshold on pageviews or quota usage and get a message at the hour you choose. There are no instant alerts.' },
    ]},
    { key:'billing', fa:'صورتحساب', en:'Billing', icon:'shn-billing', rows:[
      { id:'subscription', fa:'اشتراک', en:'Subscription', icon:'shn-subscription', href:'/subscription/', page:'subscription',
        tf:'<span class="tip-title">اشتراک</span>پلن‌ها بر اساس نوع پروژه (دیفالت / Asam CMS) و سرویس بازپخش نشست — سهمیهٔ ضبط و مدت نگه‌داری در هر پلن.',
        te:'<span class="tip-title">Subscription</span>Plans by project type (Default / Asam CMS) and the Session Replay service — capture quota &amp; retention per plan.' },
      { id:'enterprise-plan', fa:'پلن سازمانی', en:'Enterprise Plan', icon:'shn-plans', href:'/enterprise-plan/', page:'enterprise-plan', state:'soon',
        tf:'<span class="tip-title">پلن سازمانی</span>درخواست پلن اختصاصی برای پروژه‌هایی که سقف پلن‌های عمومی جواب‌گویشان نیست. فقط برای نوع پروژه‌های دارای امکان مذاکره دیده می‌شود.',
        te:'<span class="tip-title">Enterprise Plan</span>Request a plan built for one project when the public tiers do not fit. Visible only for project types that allow negotiation.' },
      { id:'payment-methods', fa:'روش‌های پرداخت', en:'Payment Methods', icon:'shn-transactions', href:'/payment-methods/', page:'payment-methods', state:'soon',
        tf:'<span class="tip-title">روش‌های پرداخت</span>مجوز برداشت خودکار از حساب بانکی، با سقف مشخص برای هر تراکنش. مجوز به حساب کاربری شما تعلق دارد و می‌تواند روی چند پروژه بنشیند.',
        te:'<span class="tip-title">Payment Methods</span>Authorise automatic withdrawal from your bank account with a per-transaction cap. The mandate belongs to your account and can serve several projects.' },
      { id:'invoices', fa:'فاکتورها', en:'Invoices', icon:'shn-invoices' },
      { id:'payment-result', fa:'نتیجه پرداخت', en:'Payment Result', icon:'shn-invoices', href:'/payment-result/', page:'payment-result', state:'soon',
        tf:'<span class="tip-title">نتیجه پرداخت</span>صفحه بازگشت از درگاه و وضعیت فاکتور باز. نتیجه پرداخت با استعلام سرور به سرور تعیین می‌شود، نه با بازگشت مرورگر.',
        te:'<span class="tip-title">Payment Result</span>The gateway return page and the open-invoice state. The outcome is decided by a server-to-server check, not by the browser redirect.' },
      { id:'transactions', fa:'تراکنش‌ها', en:'Transactions', icon:'shn-transactions' }
    ]},
    { key:'admin', fa:'مدیریت سامانه', en:'Admin', icon:'shn-admin', svc:'sh-svc-admin', rows:[
      { id:'projects', fa:'فهرست پروژه‌ها', en:'Project List', icon:'shn-list', href:'/admin/projects-list/', page:'admin-projects', sa:true },
      { id:'plans', fa:'پلن‌ها و انواع', en:'Plans & Types', icon:'shn-plans', sa:true },
      { id:'script-config', fa:'پیکربندی اسکریپت', en:'Script Config', icon:'shn-script', sa:true },
      { id:'users', fa:'کاربران', en:'Users', icon:'shn-users', href:'/admin/users-list/', page:'users-list', state:'soon', sa:true,
        tf:'<span class="tip-title">کاربران</span>فهرست همهٔ کاربران پلتفرم برای سوپرادمین. نام هر کاربر ورودی پروفایل اوست: امنیت، نشست‌های فعال، پروژه‌ها و نقش‌ها، و وضعیت مالی.',
        te:'<span class="tip-title">Users</span>Every user on the platform, for super-admins. A name is the way into that user\'s profile: security, active sessions, projects and roles, and financial status.' },
      { id:'announcements', fa:'اطلاعیه‌ها', en:'Announcements', icon:'shn-megaphone', href:'/admin/announcements/', page:'announcements', state:'soon', sa:true,
        tf:'<span class="tip-title">اطلاعیه‌ها</span>پیامی که تیم شاهین برای گروهی از کاربران پلتفرم می‌فرستد، مثل خبر قطعی، نگهداری یا اخبار محصول، از طریق صندوق پیام، ایمیل، پیامک و تلگرام؛ این‌جا اطلاعیه ساخته، فرستاده و تحویلش پیگیری می‌شود.',
        te:'<span class="tip-title">Announcements</span>A message the Shahin team sends to a group of platform users, such as an outage, a maintenance window or product news, through the inbox, email, SMS and Telegram. This is where an announcement is created, sent and its delivery followed.' },
      { id:'kiosk-profiles', fa:'پروفایل‌های کیوسک', en:'Kiosk Profiles', icon:'shn-kiosk', href:'/admin/kiosk-profiles/', page:'kiosk-profiles', state:'soon', sa:true,
        tf:'<span class="tip-title">پروفایل‌های کیوسک</span>همهٔ پروفایل‌های نمایشی که کاربران در حالت کیوسک ساخته‌اند، با مالک، پروژه‌ها و وضعیت پخش؛ برای پیش‌نمایش یا حذف.',
        te:'<span class="tip-title">Kiosk Profiles</span>Every display profile users have built in Kiosk Mode, with owner, projects and playback status; to preview or delete.' },
      { id:'audit-log', fa:'گزارش رخدادها', en:'Audit Log', icon:'shn-audit', href:'/admin/audit-log/', page:'audit-log', state:'soon', sa:true,
        tf:'<span class="tip-title">گزارش رخدادها</span>رد ممیزی کل پلتفرم برای سوپرادمین: هر اکشن با فاعل، موجودیت هدف، پروژه، نشست و دستگاه.',
        te:'<span class="tip-title">Audit Log</span>Platform-wide audit trail for super-admins: every action with its actor, target entity, project, session and device.' },
      { id:'enterprise-admin', fa:'صف پلن سازمانی', en:'Enterprise queue', icon:'shn-plans', href:'/admin/enterprise-admin/', page:'enterprise-admin', state:'soon', sa:true,
        tf:'<span class="tip-title">صف پلن سازمانی</span>صف درخواست‌های پلن اختصاصی برای سوپرادمین: بازبینی، رد، و صدور پیشنهاد با مهلت اعتبار.',
        te:'<span class="tip-title">Enterprise queue</span>The enterprise-request queue for super-admins: review, decline, and issue offers with a validity deadline.' },
      { id:'gift-subscription', fa:'اشتراک‌ها', en:'Subscriptions', icon:'shn-gift', href:'/admin/gift-subscription/', page:'gift-subscription', state:'soon', sa:true,
        tf:'<span class="tip-title">اشتراک‌ها</span>همهٔ اشتراک‌های پلتفرم (پولی، هدیه و آزمایشی) با پلن، وضعیت و تاریخ پایان؛ اعطا و لغو هدیه هم از همین‌جا.',
        te:'<span class="tip-title">Subscriptions</span>Every subscription on the platform (paid, gift and trial) with its plan, status and end date; gifts are granted and revoked here too.' },
      { kind:'note', fa:'قلمرو سوپرادمین داخلی، کل پلتفرم.', en:'Internal super-admin realm, platform-wide.' }
    ]},
    { key:'support', fa:'پشتیبانی', en:'Support', icon:'shn-support', rows:[
      { id:'docs', fa:'مستندات', en:'Documentation', icon:'shn-content' },
      { id:'contact', fa:'گفتگو با پشتیبانی', en:'Contact Support', icon:'shn-support' },
      { id:'design', fa:'دیزاین سیستم', en:'Design System', icon:'shn-design', href:'/design-system/', page:'design-system', state:'soon' }
    ]}
  ];
  /* rail grouping — a separator before each of these keys (design: project
     modules, then account modules, then Support pushed to the bottom) */
  var RAIL_SEP_BEFORE = { billing:true };
  var RAIL_BOTTOM = { support:true };

  var PROJECTS = ['چکاوک|Chakavak', 'پلیکان|Pelikan', 'بامداد|Bamdad', 'سارگپه|Starchap'];

  var LS_COLLAPSE = 'shahin-nav-collapsed', LS_PROJ = 'shahin-nav-project';

  function lang(){ return localStorage.getItem('shahin-lang') || 'fa'; }
  function t(fa, en){ return lang() === 'fa' ? fa : en; }
  function readLS(key, fallback){
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function writeLS(key, v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function toast(fa, en){ if (window.Shahin) Shahin.toast(fa, en); }
  function toastUnbuilt(r){
    toast('در پروداکت: «' + r.fa + '» — وایرفریم این بخش هنوز ساخته نشده',
          'In production: “' + r.en + '” — no wireframe yet');
  }

  /* ── markup helpers ── */
  function flags(r){
    var h = '';
    if (r.state === 'new') h += '<span class="sh-nav-chip" data-fa="جدید" data-en="New">جدید</span>';
    if (r.state === 'backlog') h += '<span class="sh-nav-chip backlog" data-fa="بک‌لاگ" data-en="Backlog">بک‌لاگ</span>';
    if (r.sa)              h += '<span class="sh-sa-chip">SA</span>';
    if (r.lock)            h += '<svg class="sh-ni sm sh-nav-lock"><use href="#shn-lock"/></svg>';
    return h;
  }
  /* nav rows carry NO ⓘ tooltip (standing PM rule) — a row's tf/te is its
     canonical description and surfaces in the ⌘K palette instead. */
  function desc(r){
    var d = lang() === 'fa' ? r.tf : r.te;
    if (!d) return '';
    /* the leading .tip-title span just repeats the row's own label — drop it */
    return d.replace(/<span class="tip-title">[\s\S]*?<\/span>/, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function itemHtml(r, child){
    /* children lose their icon — the indent guide carries the grouping (design rule) */
    return '<a class="sh-nav-item" data-nav="' + r.id + '">' +
      (child ? '' : '<svg class="sh-ni"><use href="#' + (r.icon || 'shn-list') + '"/></svg>') +
      '<span class="sh-nav-lbl" data-fa="' + esc(r.fa) + '" data-en="' + esc(r.en) + '">' + esc(r.fa) + '</span>' +
      flags(r) + '</a>';
  }
  function rowsHtml(rows, child){
    return rows.map(function (r) {
      if (r.kind === 'cap')  return '<div class="sh-nav-cap" data-fa="' + esc(r.fa) + '" data-en="' + esc(r.en) + '">' + esc(r.fa) + '</div>';
      if (r.kind === 'note') return '<div class="sh-nav-note" data-fa="' + esc(r.fa) + '" data-en="' + esc(r.en) + '">' + esc(r.fa) + '</div>';
      /* the delivery marks the project→account flip with one squared-dot
         divider inside the pane, not a label above every module */
      if (r.kind === 'scope')
        return '<div class="sh-scope"><span class="sq' + (r.project ? '' : ' gray') + '"></span>' +
          '<span data-fa="' + esc(r.fa) + '" data-en="' + esc(r.en) + '">' + esc(r.fa) + '</span></div>';
      if (r.kind === 'grp')
        return '<button class="sh-nav-subhead" data-sub="' + r.key + '">' +
            '<svg class="sh-ni"><use href="#' + r.icon + '"/></svg>' +
            '<span class="lbl" data-fa="' + esc(r.fa) + '" data-en="' + esc(r.en) + '">' + esc(r.fa) + '</span>' +
            '<svg class="sh-ni sm chev"><use href="#shn-chevron"/></svg></button>' +
          '<div class="sh-nav-sub" data-sub-body="' + r.key + '">' + rowsHtml(r.rows, true) + '</div>';
      return itemHtml(r, child);
    }).join('');
  }
  function flatItems(rows, acc){
    rows.forEach(function (r) {
      if (r.kind === 'grp') flatItems(r.rows, acc);
      else if (!r.kind) acc.push(r);
    });
    return acc;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;
    if (!body.classList.contains('sh-layout') || document.querySelector('.sh-rail')) return;
    var main = document.querySelector('.sh-main');
    if (!main) return;

    /* ── sprite ── */
    var sp = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">';
    for (var k in P) sp += '<symbol id="' + k + '" viewBox="0 0 24 24"><path d="' + P[k] + '"/></symbol>';
    sp += '</svg>';
    var spHost = document.createElement('div');
    spHost.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    spHost.innerHTML = sp;
    body.insertBefore(spHost, body.firstChild);

    /* ── every item, by id — the lookup behind nav and ⌘K ── */
    var DESTS = {}, OWNER = {};
    MODULES.forEach(function (m) {
      flatItems(m.rows, []).forEach(function (r) { DESTS[r.id] = r; OWNER[r.id] = m; });
    });

    /* ── the group a page sits in, by id — the middle crumb ───────────────
       Production's trail is «module / group / page» (front-cp useBreadcrumb
       walks the same sidebar tree: module label, then every titled ancestor,
       then the page). `cap` rows are deliberately skipped: they are visual
       captions inside a group, and production does not show them either —
       /analytics/engagement/pages reads «Analytics / Engagement / Pages»,
       not «… / Engagement / Content / Pages». */
    var GROUP_OF = {};
    MODULES.forEach(function (m) {
      (function walk(rows, grp) {
        rows.forEach(function (r) {
          if (r.kind === 'grp') { walk(r.rows, { fa: r.fa, en: r.en }); return; }
          if (r.kind || !r.id) return;
          if (grp) GROUP_OF[r.id] = grp;
        });
      })(m.rows, null);
    });

    /* ── active page: an item whose `q` matches the query string beats a bare
       page match (several items can share one page, e.g. /report-builder/?type=…) ── */
    var pageId = (window.SHAHIN_PAGE || {}).id, navQ = location.search;
    var activeId = null, activeMod = 'analytics', looseId = null, looseMod = null;
    MODULES.forEach(function (m) {
      flatItems(m.rows, []).forEach(function (r) {
        if (!(r.page && r.page === pageId)) return;
        if (r.q && navQ.indexOf(r.q) > -1 && !activeId) { activeId = r.id; activeMod = m.key; }
        if (!looseId) { looseId = r.id; looseMod = m.key; }
      });
    });
    if (!activeId && looseId) { activeId = looseId; activeMod = looseMod; }

    /* ── rail ── */
    var railwrap = document.createElement('div');
    railwrap.className = 'sh-railwrap';
    var rail = document.createElement('aside');
    rail.className = 'sh-rail';

    var projects = PROJECTS.map(function (p) { return { fa: p.split('|')[0], en: p.split('|')[1] }; });
    var curProj = readLS(LS_PROJ, 0);
    if (typeof curProj !== 'number' || !projects[curProj]) curProj = 0;

    var rh = '<div class="sh-rail-logo" data-go="/"><img src="' + assetUrl('brand/Logomark-White.svg') + '" alt="شاهین"></div>' +
      '<button class="sh-rail-proj" data-proj-chip></button>';
    /* «دستیار» — the second of the three launch paths in PRD-Global-Agent.md §2
       (floating button · nav entry · keyboard shortcut). It sits above the
       modules, under its own divider, because the assistant is cross-module: it
       is not one of the services, it works across all of them. Opens the panel
       in place — it never navigates and never takes over the pane, so it does
       NOT carry data-mod. Pruned below on <body data-no-ask> pages. */
    rh += '<button class="sh-railbtn sh-rail-ask" data-ask' +
      ' data-fa-label="دستیار شاهین" data-en-label="Shahin Assistant">' +
      '<svg class="sh-ni"><use href="#shn-ask"/></svg>' +
      '<span class="sh-rail-lbl" data-fa="دستیار" data-en="Assistant">دستیار</span></button>' +
      '<div class="sh-rail-sep"></div>';
    MODULES.forEach(function (m) {
      if (RAIL_BOTTOM[m.key]) return;
      if (RAIL_SEP_BEFORE[m.key]) rh += '<div class="sh-rail-sep"></div>';
      rh += railBtn(m);
    });
    rh += '<div class="sh-rail-sp"></div>';
    MODULES.forEach(function (m) { if (RAIL_BOTTOM[m.key]) rh += railBtn(m); });
    /* the wireframe hub — demo navigation, not a product module, so it sits
       under its own divider at the foot of the rail (moved out of the topbar
       on 2026-08-01 to stop that corner getting crowded) */
    rh += '<div class="sh-rail-sep"></div>' +
      '<button class="sh-railbtn sh-rail-hub" data-go="/shahinhub/"' +
        ' data-fa-label="هاب وایرفریم" data-en-label="Wireframe hub">' +
        '<svg class="sh-ni"><use href="#shn-hub"/></svg>' +
        '<span class="sh-rail-lbl" data-fa="هاب" data-en="Hub">هاب</span></button>';
    rh += '<button class="sh-rail-collapse" data-collapse aria-label="Collapse">' +
      '<span class="flip"><svg class="sh-ni"><use href="#shn-chev-start"/></svg></span></button>';
    rail.innerHTML = rh;

    function railBtn(m){
      return '<button class="sh-railbtn ' + (m.svc || '') + (m.key === activeMod ? ' active' : '') +
        '" data-mod="' + m.key + '"' +
        ' data-fa-label="' + esc(m.fa) + '" data-en-label="' + esc(m.en) + '">' +
        '<svg class="sh-ni"><use href="#' + m.icon + '"/></svg>' +
        '<span class="sh-rail-lbl" data-fa="' + esc(m.fa) + '" data-en="' + esc(m.en) + '">' + esc(m.fa) + '</span></button>';
    }

    /* ── pane ── */
    var pane = document.createElement('nav');
    pane.className = 'sh-pane';
    var ph =
      '<div class="sh-pane-top"><div class="sh-proj-row">' +
        '<div class="sh-dd" style="flex:1;min-width:0">' +
          '<button class="sh-proj" data-proj ' +
            "data-tip-fa='<span class=\"tip-title\">سوییچ پروژه</span>پروژهٔ فعال را عوض کنید؛ همهٔ گزارش‌ها به آن محدود می‌شوند.' " +
            "data-tip-en='<span class=\"tip-title\">Project switcher</span>Switch the active project; every report is scoped to it.'>" +
            '<span class="sh-proj-avatar" data-proj-letter></span>' +
            '<span class="sh-proj-txt">' +
              '<span class="sh-proj-cap" data-fa="پروژه" data-en="Project">پروژه</span>' +
              '<span class="sh-proj-name" data-proj-name></span>' +
            '</span><svg class="sh-ni sm caret"><use href="#shn-chevron"/></svg></button>' +
          '<div class="sh-dd-menu">' +
            '<input class="sh-dd-search" data-proj-search data-fa-ph="جستجوی پروژه…" data-en-ph="Search projects…">' +
            projects.map(function (p, i) {
              return '<button class="sh-dd-item' + (i === curProj ? ' cur' : '') + '" data-proj-opt="' + i + '">' +
                '<span data-fa="' + esc(p.fa) + '" data-en="' + esc(p.en) + '">' + esc(p.fa) + '</span>' +
                '<svg class="sh-ni sm check"><use href="#shn-check"/></svg></button>';
            }).join('') +
            '<div class="sh-dd-sep"></div>' +
            '<button class="sh-dd-item sh-dd-add" data-add><svg class="sh-ni sm"><use href="#shn-plus"/></svg>' +
              '<span data-fa="پروژهٔ جدید" data-en="Add New Project">پروژهٔ جدید</span></button>' +
          '</div></div>' +
        '<button class="sh-proj-add" data-add aria-label="New project"><svg class="sh-ni"><use href="#shn-plus"/></svg></button>' +
      '</div></div>' +
      '<div class="sh-pane-body">';
    MODULES.forEach(function (m) {
      ph += '<div class="sh-pane-content' + (m.key === activeMod ? ' show' : '') + '" data-mod-body="' + m.key + '">' +
        '<div class="sh-pane-title ' + (m.svc || '') + '">' + (m.svc ? '<span class="sh-svc-dot"></span>' : '') +
        '<span data-fa="' + esc(m.fa) + '" data-en="' + esc(m.en) + '">' + esc(m.fa) + '</span>' + flags(m) + '</div>' +
        rowsHtml(m.rows, false) + '</div>';
    });
    ph += '</div>' +
      '<div class="sh-pane-foot"><div class="sh-quota"' +
        " data-tip-fa='<span class=\"tip-title\">سهمیهٔ بازدید</span>سهم مصرف‌شده از سقف بازدید ماهانهٔ پلن فعلی. با پر شدن سهمیه جمع‌آوری داده متوقف می‌شود.'" +
        " data-tip-en='<span class=\"tip-title\">Pageview quota</span>How much of this plan&#39;s monthly pageview allowance is used. Collection stops when it runs out.'>" +
        '<div class="sh-quota-head"><span data-fa="سهمیهٔ بازدید" data-en="Pageview quota">سهمیهٔ بازدید</span>' +
        '<span><span data-num="48">۴۸</span><span data-fa="٪" data-en="%">٪</span></span></div>' +
        '<div class="sh-quota-bar"><i style="width:48%"></i></div>' +
        '<button class="sh-quota-up" data-upgrade data-fa="ارتقای پلن ←" data-en="Upgrade plan →">ارتقای پلن ←</button>' +
      '</div></div>';
    pane.innerHTML = ph;

    railwrap.appendChild(rail);
    railwrap.appendChild(pane);
    body.insertBefore(railwrap, main);

    /* ── scrim (tablet pane overlay + mobile drawer) ── */
    var scrim = document.createElement('div');
    scrim.className = 'sh-scrim';
    body.appendChild(scrim);

    /* ── topbar + page header — mirrors the production shell ──────────────
       Synced 2026-09-22 against front-cp `layouts/default.vue` (the 54px
       `.app-header-row`) and `components/base/HeaderPage.vue` + `BaseBreadcrumb`.
       Production splits the two things this demo used to fuse:

         header row  → the PROJECT name on the start side, nothing else;
                       search / user cluster on the end side.
         page body   → the page's own title, with the breadcrumb trail
                       directly underneath it, as the first thing in content.

       The trail is «module / group / page» and never carries the project —
       the project already sits in the header row one line above. Pages here
       keep authoring <div class="sh-page-title"> + <div class="sh-crumb">
       inside .sh-topbar, so lifting that pair into .sh-content is all it takes
       for every page to inherit the production layout, with no page edits. */
    var topbar = main.querySelector('.sh-topbar');
    var contentEl = main.querySelector('.sh-content');
    if (topbar) {
      var titleEl = topbar.querySelector('.sh-page-title');
      if (titleEl) {
        var pageFa = titleEl.getAttribute('data-fa') || titleEl.textContent.trim();
        var pageEn = titleEl.getAttribute('data-en') || pageFa;
        var mod = MODULES.filter(function (m) { return m.key === activeMod; })[0] || MODULES[0];
        var grp = activeId ? GROUP_OF[activeId] : null;

        /* Crumbs are plain text, not links — production renders v-breadcrumbs
           items with no href, so nothing here is clickable either. A page the
           nav model does not know (no activeId) gets the page name alone,
           which is exactly what production's trailFor() returns when no
           sidebar entry matches the route. */
        var trail = '';
        if (activeId) {
          trail += '<span data-fa="' + esc(mod.fa) + '" data-en="' + esc(mod.en) + '">' + esc(mod.fa) + '</span>';
          if (grp) {
            trail += '<span class="sep">/</span>' +
              '<span data-fa="' + esc(grp.fa) + '" data-en="' + esc(grp.en) + '">' + esc(grp.fa) + '</span>';
          }
          trail += '<span class="sep">/</span>';
        }
        trail += '<span class="here" data-fa="' + esc(pageFa) + '" data-en="' + esc(pageEn) + '">' + esc(pageFa) + '</span>';

        /* The authored block MOVES into the content — it is not rebuilt. Some
           pages hang their own furniture off the title row (first-entry's live
           badge, for one) and keep DOM references to it, so re-creating the
           markup here would quietly break them. */
        var host = titleEl;
        while (host.parentNode && host.parentNode !== topbar) host = host.parentNode;

        /* the page's own one-line .sh-crumb is superseded by the real trail */
        var authoredCrumb = host.querySelector('.sh-crumb');
        if (authoredCrumb) authoredCrumb.parentNode.removeChild(authoredCrumb);

        var nav = document.createElement('nav');
        nav.className = 'sh-crumbs';
        nav.innerHTML = trail;
        host.appendChild(nav);

        /* Production's HeaderPage is a two-slot row: the title/crumb block on
           the start side and an #action slot pushed to the end (that is where
           the dashboards put their date-range control). A page opts into the
           action slot by marking one element `data-page-action`; the shell
           lifts it up here so every page gets production's header row. */
        var head = document.createElement('div');
        head.className = 'sh-pagehead';
        host.className = (host.className ? host.className + ' ' : '') + 'sh-pagehead__main';
        head.appendChild(host);

        var act = (contentEl || main).querySelector('[data-page-action]');
        if (act) {
          var slot = document.createElement('div');
          slot.className = 'sh-pagehead__action';
          slot.appendChild(act);
          head.appendChild(slot);
        }

        if (contentEl) contentEl.insertBefore(head, contentEl.firstChild);
        else main.insertBefore(head, topbar.nextSibling);
      }

      /* the header row's start side: the project name, exactly as production */
      var tbProj = document.createElement('span');
      tbProj.className = 'sh-tb-proj';
      tbProj.setAttribute('data-crumb-proj', '');
      topbar.insertBefore(tbProj, topbar.firstChild);

      var burger = document.createElement('button');
      burger.className = 'sh-navburger';
      burger.setAttribute('aria-label', 'منو / Menu');
      burger.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
      topbar.insertBefore(burger, topbar.firstChild);

      var cluster = document.createElement('div');
      cluster.style.cssText = 'display:flex;align-items:center;gap:8px';
      cluster.innerHTML =
        '<button class="sh-tb-search" data-cmdk>' +
          '<svg class="sh-ni sm"><use href="#shn-search"/></svg>' +
          '<span class="lbl" data-fa="جستجو در شاهین…" data-en="Search Shahin…">جستجو در شاهین…</span>' +
          '<kbd>⌘K</kbd></button>' +
        /* api-v2 exposes notificationUnreadCount as a plain query — there is no
           subscription and no push anywhere in the schema, so the badge is a
           NUMBER refreshed by polling, not a presence dot. SH_UNREAD owns it. */
        '<button class="sh-tb-icon" data-notif aria-label="Notifications">' +
          '<svg class="sh-ni"><use href="#shn-bell"/></svg><span class="cnt" data-unread hidden></span></button>' +
        '<button class="sh-tb-icon" data-help aria-label="Help">' +
          '<svg class="sh-ni"><use href="#shn-help"/></svg></button>' +
        '<span class="sh-tb-div"></span>';
      var actions = topbar.querySelector('.sh-topbar-actions');
      if (actions) topbar.insertBefore(cluster, actions);
      else topbar.appendChild(cluster);
    }

    /* ── unread bell badge ────────────────────────────────────────────────
       `notificationUnreadCount` is a query, not a subscription: nothing in the
       api-v2 schema pushes. So the badge is polled. SH_UNREAD is the single
       owner of that number across every page — the inbox page calls
       SH_UNREAD.set(n) after a mark-read so the badge and the list never
       disagree, and any page can call SH_UNREAD.poll() to force a refresh.
       Interval is deliberately slow: a faster poll would imply a liveness the
       backend does not provide. */
    (function () {
      var POLL_MS = 60000;
      var count = (typeof window.SHAHIN_UNREAD === 'number') ? window.SHAHIN_UNREAD : 3;
      var lastAt = new Date();

      function paint() {
        document.querySelectorAll('[data-unread]').forEach(function (el) {
          if (count > 0) {
            el.hidden = false;
            el.textContent = count > 99
              ? (document.documentElement.lang === 'fa' ? '+۹۹' : '99+')
              : Number(count).toLocaleString(document.documentElement.lang === 'fa' ? 'fa-IR' : 'en-US');
          } else {
            el.hidden = true;
            el.textContent = '';
          }
        });
        document.dispatchEvent(new CustomEvent('shahin:unread', {
          detail: { count: count, checkedAt: lastAt }
        }));
      }

      window.SH_UNREAD = {
        get: function () { return count; },
        checkedAt: function () { return lastAt; },
        set: function (n) { count = Math.max(0, n | 0); lastAt = new Date(); paint(); },
        /* the wireframe stand-in for a refetch; a real page swaps in the query */
        poll: function () { lastAt = new Date(); paint(); return count; }
      };

      paint();
      document.addEventListener('shahin:lang', paint);
      setInterval(function () { window.SH_UNREAD.poll(); }, POLL_MS);
    })();

    /* ── no footer bar ──────────────────────────────────────────────────
       Production has no footer anywhere in the app shell: `layouts/default.vue`
       ends at <v-main>, and the only <v-footer> left in front-cp lives in the
       unused `components/layout/AppLayout.vue`. The demo's old status / version
       / quota / links bar was a demo-only invention, so it is gone (PM,
       2026-09-22). Quota still has its home in the nav pane's usage block. */

    /* ── command palette ── */
    var cmdk = document.createElement('div');
    cmdk.className = 'sh-cmdk';
    cmdk.innerHTML = '<div class="sh-cmdk-box">' +
      '<input class="sh-cmdk-in" data-cmdk-in>' +
      '<div class="sh-cmdk-list" data-cmdk-list></div></div>';
    body.appendChild(cmdk);

    /* ── state ── */
    if (readLS(LS_COLLAPSE, false) === true) body.classList.add('sh-nav-collapsed');

    function syncProject(){
      var p = projects[curProj];
      pane.querySelector('[data-proj-name]').textContent = t(p.fa, p.en);
      pane.querySelector('[data-proj-letter]').textContent = t(p.fa, p.en).charAt(0);
      var chip = rail.querySelector('[data-proj-chip]');
      if (chip) chip.textContent = t(p.fa, p.en).charAt(0);
      var crumb = document.querySelector('[data-crumb-proj]');
      if (crumb) crumb.textContent = t(p.fa, p.en);
      pane.querySelectorAll('[data-proj-opt]').forEach(function (b) {
        b.classList.toggle('cur', +b.getAttribute('data-proj-opt') === curProj);
      });
      var s = pane.querySelector('[data-proj-search]');
      if (s) s.placeholder = s.getAttribute(lang() === 'fa' ? 'data-fa-ph' : 'data-en-ph');
    }

    /* Browsing the rail no longer rewrites the trail: the breadcrumb describes
       the page you are ON, which is how production behaves — clicking a module
       in the rail opens its pane, it does not change the current page's crumbs. */
    function showModule(key){
      rail.querySelectorAll('.sh-railbtn').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-mod') === key);
      });
      pane.querySelectorAll('.sh-pane-content').forEach(function (p) {
        p.classList.toggle('show', p.getAttribute('data-mod-body') === key);
      });
      if (window.matchMedia('(max-width:1099px)').matches &&
          !window.matchMedia('(max-width:767px)').matches) body.classList.add('sh-pane-open');
    }
    function closeNav(){
      body.classList.remove('sh-nav-open');
      body.classList.remove('sh-pane-open');
    }
    function openItem(id){
      var r = DESTS[id];
      if (!r) return;
      /* a milestone version (?m=N) of the report builder stays in its milestone when its own menu entries are used */
      var mq = new URLSearchParams(location.search).get('m');
      if (r.href) location.href = (mq && r.page && r.page === (window.SHAHIN_PAGE || {}).id) ? r.href + (r.href.indexOf('?') > -1 ? '&' : '?') + 'm=' + mq : r.href;
      else { toastUnbuilt(r); closeNav(); }
    }

    /* ── wiring ── */
    document.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { location.href = go.getAttribute('data-go'); return; }

      /* the assistant opens in place over the current page — checked before
         data-mod so it never falls through to the module handler */
      if (e.target.closest('[data-ask]')) {
        if (window.shahinAsk && window.shahinAsk.open) window.shahinAsk.open();
        return;
      }

      var rb = e.target.closest('.sh-railbtn[data-mod]');
      if (rb) { showModule(rb.getAttribute('data-mod')); return; }

      if (e.target.closest('[data-collapse]')) {
        body.classList.toggle('sh-nav-collapsed');
        writeLS(LS_COLLAPSE, body.classList.contains('sh-nav-collapsed'));
        return;
      }
      /* the collapsed rail keeps the project chip — tapping it expands again */
      if (e.target.closest('[data-proj-chip]')) {
        body.classList.remove('sh-nav-collapsed');
        writeLS(LS_COLLAPSE, false);
        return;
      }

      var sh = e.target.closest('.sh-nav-subhead');
      if (sh) {
        sh.classList.toggle('open');
        pane.querySelector('[data-sub-body="' + sh.getAttribute('data-sub') + '"]').classList.toggle('open');
        return;
      }

      var it = e.target.closest('.sh-nav-item[data-nav]');
      if (it) { openItem(it.getAttribute('data-nav')); return; }

      var dd = e.target.closest('.sh-dd');
      if (e.target.closest('[data-proj]')) { dd.classList.toggle('open'); return; }
      var opt = e.target.closest('[data-proj-opt]');
      if (opt) {
        var nextProj = +opt.getAttribute('data-proj-opt');
        pane.querySelector('.sh-dd').classList.remove('open');
        var pick = function () {
          curProj = nextProj;
          writeLS(LS_PROJ, curProj);
          syncProject();
          toast('در پروداکت: همهٔ گزارش‌ها به پروژهٔ «' + projects[curProj].fa + '» محدود می‌شوند',
                'In production: every report is now scoped to “' + projects[curProj].en + '”');
          /* a page whose content is per project (the reports page) reloads on the new one, keeping only the role switches */
          if (window.SHAHIN_PROJECT_RELOAD) setTimeout(function () {
            try {
              var q = new URLSearchParams(location.search), keep = new URLSearchParams();
              ['role', 'prole'].forEach(function (k) { if (q.get(k) != null) keep.set(k, q.get(k)); });
              if (q.get('project') != null) keep.set('project', String(curProj));
              var qs = keep.toString();
              location.href = location.pathname + (qs ? '?' + qs : '');
            } catch (x) { location.reload(); }
          }, 350);
        };
        /* PM 2026-10-25, WS-15 / UC-14: a page with unsaved changes asks first («ذخیره» / «دور ریختن» / «انصراف»);
           without a hook the switch is immediate, as before */
        if (nextProj === curProj && window.SHAHIN_PROJECT_RELOAD) return;
        if (typeof window.shahinBeforeProjectSwitch === 'function') window.shahinBeforeProjectSwitch(pick); else pick();
        return;
      }
      if (!dd) pane.querySelectorAll('.sh-dd').forEach(function (d) { d.classList.remove('open'); });

      if (e.target.closest('[data-add]')) { location.href = '/project-creation/'; return; }
      if (e.target.closest('[data-upgrade]')) { location.href = '/subscription/'; return; }
      if (e.target.closest('[data-cmdk]')) { openCmdk(); return; }
      /* the bell opens the inbox popover in place (shahin-inbox.js binds its own
         handler on the button); it is no longer a link to a route */
      if (e.target.closest('[data-notif]')) { return; }
      if (e.target.closest('[data-help]')) { location.href = '/landing/help-center/'; return; }
      if (e.target.closest('.sh-navburger')) { body.classList.toggle('sh-nav-open'); return; }
    });

    /* shahin.js injects shahin-ask.js at runtime on every page, so the panel is
       omnipresent and the entry is live by default. The one case it must not
       render is a page that opted out via <body data-no-ask> (the retired بپرس
       page, landing pages, decks) — there the panel never exists and the button
       would be dead. Read the same attribute shahin.js reads, rather than
       probing for window.shahinAsk: that script is appended asynchronously, so
       any timing-based check races it. */
    if (body.hasAttribute('data-no-ask')) {
      var askBtn = rail.querySelector('[data-ask]');
      if (askBtn) {
        var askSep = askBtn.nextElementSibling;
        if (askSep && askSep.classList.contains('sh-rail-sep')) askSep.remove();
        askBtn.remove();
      }
    }

    scrim.addEventListener('click', closeNav);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeNav(); closeCmdk(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openCmdk(); }
    });

    /* ── command palette behaviour ── */
    var cmdkIn = cmdk.querySelector('[data-cmdk-in]'), cmdkList = cmdk.querySelector('[data-cmdk-list]');
    var cmdkRows = [], cmdkSel = 0;
    function openCmdk(){
      cmdk.classList.add('open');
      cmdkIn.placeholder = t('صفحه، گزارش یا تنظیمات…', 'Pages, reports or settings…');
      cmdkIn.value = ''; cmdkIn.focus(); renderCmdk('');
    }
    function closeCmdk(){ cmdk.classList.remove('open'); }
    function renderCmdk(q){
      var l = lang();
      q = q.trim().toLowerCase();
      cmdkRows = Object.keys(DESTS).filter(function (id) {
        var r = DESTS[id];
        return !q || (r.fa + ' ' + r.en).toLowerCase().indexOf(q) > -1;
      }).slice(0, 40);
      cmdkSel = 0;
      cmdkList.innerHTML = cmdkRows.length ? cmdkRows.map(function (id, i) {
        var r = DESTS[id], m = OWNER[id];
        var d = desc(r);
        return '<div class="sh-cmdk-row' + (i === 0 ? ' on' : '') + '" data-cmdk-row="' + id + '">' +
          '<svg class="sh-ni"><use href="#' + (r.icon || 'shn-list') + '"/></svg>' +
          '<span class="txt"><span class="nm">' + (l === 'fa' ? esc(r.fa) : esc(r.en)) + '</span>' +
          (d ? '<span class="ds">' + esc(d.slice(0, 90)) + '</span>' : '') + '</span>' +
          '<span class="path">' + (l === 'fa' ? esc(m.fa) : esc(m.en)) + '</span></div>';
      }).join('') : '<div class="sh-cmdk-empty">' + t('چیزی پیدا نشد.', 'Nothing found.') + '</div>';
    }
    cmdkIn.addEventListener('input', function () { renderCmdk(cmdkIn.value); });
    cmdkIn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!cmdkRows.length) return;
        cmdkSel = (cmdkSel + (e.key === 'ArrowDown' ? 1 : -1) + cmdkRows.length) % cmdkRows.length;
        cmdkList.querySelectorAll('.sh-cmdk-row').forEach(function (r, i) { r.classList.toggle('on', i === cmdkSel); });
        return;
      }
      if (e.key === 'Enter' && cmdkRows[cmdkSel]) { closeCmdk(); openItem(cmdkRows[cmdkSel]); }
    });
    cmdk.addEventListener('click', function (e) {
      var row = e.target.closest('[data-cmdk-row]');
      if (row) { closeCmdk(); openItem(row.getAttribute('data-cmdk-row')); return; }
      if (!e.target.closest('.sh-cmdk-box')) closeCmdk();
    });

    /* ── initial state ── */
    if (activeId) {
      var act = pane.querySelector('.sh-pane-content [data-nav="' + activeId + '"]');
      if (act) {
        act.classList.add('active');
        var sub = act.closest('.sh-nav-sub');
        if (sub) {
          sub.classList.add('open');
          pane.querySelector('[data-sub="' + sub.getAttribute('data-sub-body') + '"]').classList.add('open');
        }
      }
    }
    /* rail labels truncate at 58px, so the full name rides along as a native
       title — the pre-shell rail used a CSS flyout, which the labelled rail
       no longer needs. */
    function syncRailTitles(){
      var l = lang();
      rail.querySelectorAll('.sh-railbtn[data-fa-label]').forEach(function (b) {
        b.title = b.getAttribute(l === 'fa' ? 'data-fa-label' : 'data-en-label');
      });
    }
    syncProject();
    syncRailTitles();

    /* both are built in JS, so they re-render on a language switch */
    document.addEventListener('shahin:lang', function () { syncProject(); syncRailTitles(); });
  });
})();

/* ── inbox popover ────────────────────────────────────────────────────────
   The in-app inbox is a bell popover, not a route (PM decision 2026-08-02).
   It is loaded from here rather than from every page's <head> so that all
   pages carrying the global nav get it without touching ~87 files. The
   component finds the bell itself and binds its own click handler. */
(function () {
  if (window.SH_INBOX || document.querySelector('script[data-sh-inbox]')) { return; }
  var base = (function () {
    var me = document.querySelector('script[src*="shahin-nav.js"]');
    return me ? me.getAttribute('src').replace(/shahin-nav\.js.*$/, '') : '../assets/';
  })();
  var s = document.createElement('script');
  s.src = base + 'shahin-inbox.js';
  s.setAttribute('data-sh-inbox', '');
  document.head.appendChild(s);
})();

/* presenter notes (PM, 2026-11-15): Alt+Shift+P opens the M1 planning talk in a floating window that never
   reaches the TV; loaded from here so every demo page with the global nav has it. */
(function () {
  if (window.SH_TALK_PIP || document.querySelector('script[data-sh-talk-pip]')) { return; }
  var me = document.querySelector('script[src*="shahin-nav.js"]');
  var base = me ? me.getAttribute('src').replace(/shahin-nav\.js.*$/, '') : '../assets/';
  var s = document.createElement('script');
  s.src = base + 'shahin-talk-pip.js';
  s.setAttribute('data-sh-talk-pip', '');
  document.head.appendChild(s);
})();
