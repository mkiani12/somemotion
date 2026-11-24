/* ══ In-app inbox — the bell popover ═════════════════════════════════════════
   PM decision 2026-08-02: the inbox is a popover anchored to the topbar bell,
   not a standalone route. That matches how Mixpanel, Amplitude and GA4 surface
   in-app notifications, and it is why /notification-center/ v1–v4 are frozen.

   Backed by notification.graphql, and the schema's limits shape the UI:
     • notificationInbox(input:{filter:{unreadOnly}, lastId, limit})
       → { docs, metaData:{ filter, limit, hasMore } }
       Sort is FIXED newest-first — the input carries no sort field, so this
       component exposes no sort control.
       metaData has no totalCount and no offset, so paging is a «بارگذاری بیشتر»
       driven by hasMore. Never a pager, never "showing X of Y".
     • notificationUnreadCount — a plain query. Nothing in the schema pushes, so
       the badge is polled (SH_UNREAD in shahin-nav.js owns the number).
     • markNotificationRead(id) → Boolean · markAllNotificationsRead → Int
     • The only filter that exists is unreadOnly. No category, channel or date
       filter exists — do not add one.

   Every one of those constraints is disclosed through the ⓘ tooltips only.
   No explanatory banners in the body (PM decision 2026-08-02), and no metric
   cards anywhere in this component.

   Public API:
     SH_INBOX.open() / .close() / .toggle()
     SH_INBOX.setData(rows)   — replace the sample rows
     SH_INBOX.setState(s)     — '' | 'loading' | 'empty' | 'error'

   2026-11-16 (Notification module round 1): announcement rows may carry
   `kind` ('service' | 'product_news'), shown as plain text in the row meta —
   service notices reach everyone, product news follows the user's Product news
   switch. The header gains a settings link to /notification-settings/.
*/
(function () {
  'use strict';

  var PAGE = 8;                 /* the limit this client asks for */
  var state = '';               /* '' | 'loading' | 'empty' | 'error' */
  var unreadOnly = false;
  var shown = PAGE;
  var rows = [];
  var host = null, pop = null;

  function L() { return document.documentElement.lang === 'fa' ? 'fa' : 'en'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ico(name) { return window.SH_ICON ? SH_ICON(name) : ''; }

  /* ── sample rows — NotificationInboxItemType shape, id-only guaranteed ──
     Two rows carry subject:null on purpose: the schema allows body-only
     notifications and the row has to render from what exists. */
  var SAMPLE = [
    /* Block C (2026-10-24, gap audit 49b A21): a chart alert from the report builder links back to its chart, opened with the alert restated */
    { id: 'n0', subject: 'هشدار نمودار: بازدید روزانه از آستانه پایین‌تر رفت', subjectEn: 'Chart alert: daily pageviews went below the threshold',
      body: 'هشدار «بازدید روزانه» روی گزارش‌ساز فعال شد؛ مقدار دیروز از آستانه‌ای که گذاشته بودید پایین‌تر بود.',
      bodyEn: 'The “Daily pageviews” alert in the report builder fired; yesterday’s value was below the threshold you set.',
      read: false, minutes: 12, sourceType: 'alert', sourceModule: 'Reports', sourceAction: 'alert.triggered', href: '/report-builder/v12.html?alert=al1' },
    { id: 'n1', subject: 'بازدید روزانه خبرگزاری نمونه زیر آستانه شما ماند', subjectEn: 'Daily pageviews at Sample News stayed under your threshold',
      body: 'در ۲۴ ساعت منتهی به ساعت دریافت شما ۲۶٬۴۱۰ بازدید ثبت شد، در حالی که آستانه اشتراک شما ۳۰٬۰۰۰ بازدید است.',
      bodyEn: 'The 24 hours ending at your delivery time recorded 26,410 pageviews, against your threshold of 30,000.',
      read: false, minutes: 4, sourceType: 'alert', sourceModule: 'Analytics', sourceAction: 'alert.triggered' },
    { id: 'n2', subject: 'گزارش هفتگی سئو آماده شد', subjectEn: 'The weekly SEO report is ready',
      body: 'ممیزی کیفیت محتوا روی ۱٬۲۴۰ نشانی تمام شد. چهارده صفحه تازه وارد وضعیت پرریسک شده‌اند.',
      bodyEn: 'The content-quality audit finished across 1,240 URLs. Fourteen pages moved into the at-risk band.',
      read: false, minutes: 26, sourceType: 'event', sourceModule: 'SEO', sourceAction: 'report.ready' },
    { id: 'n3', subject: null, subjectEn: null,
      body: 'فیلتر تازه Session Replay بر اساس رویداد سفارشی منتشر شد. از این پس نشست‌ها را با هر رویدادی که خودتان تعریف کرده‌اید می‌توانید محدود کنید.',
      bodyEn: 'A new Session Replay filter based on custom events shipped. You can now narrow sessions by any event you define.',
      read: false, minutes: 120, sourceType: 'announcement', kind: 'product_news', sourceModule: 'Session Replay', sourceAction: 'release.published' },
    { id: 'n4', subject: 'مصرف سهمیه فروشگاه نمونه به ۸۴ درصد رسید', subjectEn: 'Sample Shop quota usage reached 84 percent',
      body: 'از سقف بازدید ماهانه پلن، ۸۴ درصد مصرف شده و تا پایان دوره صورتحساب یازده روز باقی است.',
      bodyEn: 'You have consumed 84% of the plan’s monthly pageview cap with eleven days left in the billing period.',
      read: false, minutes: 190, sourceType: 'alert', sourceModule: 'Billing', sourceAction: 'quota.threshold' },
    { id: 'n5', subject: 'دعوت‌نامه عضو تازه پذیرفته شد', subjectEn: 'A new member accepted their invitation',
      body: 'مهسا رضایی دعوت‌نامه پروژه خبرگزاری نمونه را با نقش تحلیل‌گر پذیرفت.',
      bodyEn: 'Mahsa Rezaei accepted the Sample News invitation as an Analyst.',
      read: true, minutes: 380, sourceType: 'event', sourceModule: 'Account', sourceAction: 'member.invited' },
    { id: 'n6', subject: 'اندازه‌گیری Core Web Vitals روی صفحه‌های تازه تمام شد', subjectEn: 'Core Web Vitals measurement finished on the new pages',
      body: 'سی‌ودو نشانی تازه به فهرست پایش اضافه شد و نخستین اندازه‌گیری آزمایشگاهی آن‌ها ثبت شده است.',
      bodyEn: 'Thirty-two new URLs joined the watch list and their first lab measurement is recorded.',
      read: true, minutes: 540, sourceType: 'event', sourceModule: 'Performance', sourceAction: 'crawl.finished' },
    { id: 'n7', subject: null, subjectEn: null,
      body: 'ماژول ترافیک ربات‌ها به‌روز شد. خزنده‌های هوش مصنوعی حالا جدا از بقیه ربات‌ها شمرده می‌شوند.',
      bodyEn: 'The bot-traffic module was updated. AI crawlers are now counted separately from other bots.',
      read: true, minutes: 1500, sourceType: 'announcement', kind: 'product_news', sourceModule: 'Analytics', sourceAction: 'release.published' },
    { id: 'n8', subject: 'بازدید هفتگی وبلاگ نمونه از آستانه گذشت', subjectEn: 'Sample Blog weekly pageviews crossed your threshold',
      body: 'هفت روز منتهی به ساعت دریافت شما ۴۱۲٬۰۰۰ بازدید داشت، بالاتر از آستانه ۴۰۰٬۰۰۰.',
      bodyEn: 'The seven days ending at your delivery time saw 412,000 pageviews, above your 400,000 threshold.',
      read: true, minutes: 2600, sourceType: 'alert', sourceModule: 'Analytics', sourceAction: 'alert.triggered' },
    { id: 'n9', subject: 'اتصال Google Search Console تایید شد', subjectEn: 'Google Search Console connection confirmed',
      body: 'دسترسی برای دامنه shahin.live برقرار شد و نخستین همگام‌سازی داده انجام شده است.',
      bodyEn: 'Access for shahin.live is live and the first data sync has completed.',
      read: true, minutes: 4300, sourceType: 'event', sourceModule: 'SEO', sourceAction: 'gsc.connected' },
    { id: 'n10', subject: 'فاکتور مرداد صادر شد', subjectEn: 'The August invoice was issued',
      body: 'فاکتور دوره جاری صادر شد و تا سررسید هفت روز فرصت پرداخت دارید.',
      bodyEn: 'The current period’s invoice was issued; you have seven days until it is due.',
      read: true, minutes: 7000, sourceType: 'event', sourceModule: 'Billing', sourceAction: 'invoice.issued' },
    { id: 'n11', subject: 'ضبط نشست برای پروژه وبلاگ نمونه روشن شد', subjectEn: 'Session recording switched on for Sample Blog',
      body: 'ضبط با نرخ نمونه‌گیری ده درصد شروع شد و نخستین نشست‌ها در دسترس‌اند.',
      bodyEn: 'Recording started at a 10% sampling rate and the first sessions are available.',
      read: true, minutes: 9800, sourceType: 'event', sourceModule: 'Session Replay', sourceAction: 'recording.enabled' },
    /* 2026-11-16: retitled in place (same position and read state) as the service-notice sample */
    { id: 'n12', subject: 'نگه‌داری برنامه‌ریزی‌شده درگاه پیامک', subjectEn: 'Scheduled maintenance of the SMS gateway',
      body: 'جمعه شب از ساعت ۰۱:۰۰ تا ۰۲:۰۰ بامداد ارسال پیامک متوقف می‌شود و پیامک‌های این بازه بعد از آن فرستاده می‌شوند. ایمیل، تلگرام و صندوق پیام کار می‌کنند.',
      bodyEn: 'SMS sending pauses Friday night from 01:00 to 02:00; messages from that window are sent right after. Email, Telegram and the inbox keep working.',
      read: true, minutes: 13000, sourceType: 'announcement', kind: 'service', sourceModule: 'Platform', sourceAction: 'maintenance.scheduled' }
  ];

  function num(n) {
    var s = String(n);
    return L() === 'fa' ? s.replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }) : s;
  }
  function ago(min) {
    var fa = L() === 'fa';
    if (min < 60) { return fa ? (num(min) + ' دقیقه پیش') : (min + ' min ago'); }
    var h = Math.round(min / 60);
    if (h < 24) { return fa ? (num(h) + ' ساعت پیش') : (h + ' h ago'); }
    var d = Math.round(h / 24);
    if (d < 7) { return fa ? (num(d) + ' روز پیش') : (d + ' d ago'); }
    var w = Math.round(d / 7);
    return fa ? (num(w) + ' هفته پیش') : (w + ' w ago');
  }
  var SRC = {
    alert:        { fa: 'هشدار',  en: 'Alert',        icon: 'bell-ringing' },
    announcement: { fa: 'اطلاعیه', en: 'Announcement', icon: 'megaphone' },
    event:        { fa: 'رویداد', en: 'Event',        icon: 'broadcast' }
  };
  /* announcement kind — plain text in the meta line, never a coloured badge */
  var KIND = {
    service:      { fa: 'اطلاع‌رسانی خدماتی', en: 'Service notice' },
    product_news: { fa: 'اخبار محصول',        en: 'Product news' }
  };

  function scoped() { return unreadOnly ? rows.filter(function (r) { return !r.read; }) : rows; }
  function unread() { return rows.filter(function (r) { return !r.read; }).length; }

  /* ── the ⓘ copy — the ONLY place the backend's limits are explained ── */
  var TIP_TITLE_FA = "<span class='tip-title'>صندوق پیام</span>پیام‌ها همیشه از تازه‌ترین به قدیمی‌ترین می‌آیند و این ترتیب قابل تغییر نیست.<br><b>شمار کل:</b> سرور تعداد کل پیام‌ها را برنمی‌گرداند، پس صفحه‌به‌صفحه بارگذاری می‌شود.<br><b>تازه‌سازی:</b> شمار روی زنگوله هر دقیقه بررسی می‌شود، نه لحظه‌ای.";
  var TIP_TITLE_EN = "<span class='tip-title'>Inbox</span>Messages always arrive newest first and that order cannot be changed.<br><b>Total:</b> the server does not return a message total, so the list loads a page at a time.<br><b>Refresh:</b> the bell count is checked every minute, not instantly.";
  var TIP_FILTER_FA = "<span class='tip-title'>خوانده‌نشده</span>تنها فیلتر موجود همین است. فیلتر دسته، کانال یا تاریخ وجود ندارد.";
  var TIP_FILTER_EN = "<span class='tip-title'>Unread</span>This is the only filter available. There is no category, channel or date filter.";
  var TIP_MORE_FA = "<span class='tip-title'>بارگذاری بیشتر</span>هر بار هشت پیام تازه می‌آید. وقتی پیام قدیمی‌تری نمانده باشد این دکمه ناپدید می‌شود.";
  var TIP_MORE_EN = "<span class='tip-title'>Load more</span>Eight more messages arrive each time. The button disappears when nothing older remains.";

  function rowHtml(r) {
    var s = SRC[r.sourceType] || SRC.event;
    var subject = L() === 'fa' ? r.subject : (r.subjectEn === undefined ? r.subject : r.subjectEn);
    var body = L() === 'fa' ? r.body : (r.bodyEn || r.body);
    var head = subject
      ? '<div class="sh-inbox-subj">' + esc(subject) + '</div><div class="sh-inbox-txt">' + esc(body) + '</div>'
      /* subject is nullable in the schema — body-only rows lead with the body */
      : '<div class="sh-inbox-subj">' + esc(body) + '</div>';
    return '<div class="sh-inbox-row' + (r.read ? '' : ' unread') + '" data-row="' + r.id + '">' +
      '<span class="sh-inbox-ic ' + r.sourceType + '">' + ico(s.icon) + '</span>' +
      '<span class="sh-inbox-body">' + head +
        '<div class="sh-inbox-meta">' + (L() === 'fa' ? s.fa : s.en) + ' · ' +
          (KIND[r.kind] ? ((L() === 'fa' ? KIND[r.kind].fa : KIND[r.kind].en) + ' · ') : '') +
          esc(r.sourceModule) + ' · ' + ago(r.minutes) +
          (r.href ? ' · <a class="sh-inbox-link" href="' + esc(r.href) + '">' + (L() === 'fa' ? 'دیدن روی نمودار' : 'View on chart') + '</a>' : '') + '</div>' +
      '</span></div>';
  }

  function emptyHtml(kind) {
    var fa = L() === 'fa';
    var m = {
      empty:  { i: 'bell-slash',      t: fa ? 'پیامی ندارید' : 'No messages',
                h: fa ? 'هر خبری که شاهین برایتان داشته باشد همین‌جا می‌نشیند.' : 'Anything Shahin has for you will land here.' },
      unread: { i: 'check-circle',    t: fa ? 'همه را خوانده‌اید' : 'You are all caught up',
                h: fa ? 'پیام خوانده‌نشده‌ای نمانده است.' : 'Nothing unread is left.' },
      error:  { i: 'warning-circle',  t: fa ? 'پیام‌ها بارگذاری نشد' : 'Messages could not load',
                h: fa ? 'ارتباط با سرور برقرار نشد.' : 'We could not reach the server.' }
    }[kind];
    return '<div class="sh-inbox-empty">' + ico(m.i) +
      '<div class="sh-inbox-empty-t">' + m.t + '</div>' +
      '<div class="sh-inbox-empty-h">' + m.h + '</div>' +
      (kind === 'error'
        ? '<button class="sh-inbox-act" data-retry style="margin-top:10px">' + (fa ? 'تلاش دوباره' : 'Try again') + '</button>'
        : '') + '</div>';
  }

  function skeletonHtml() {
    var out = '';
    for (var i = 0; i < 5; i++) {
      out += '<div class="sh-inbox-sk"><i style="width:28px;height:28px;border-radius:8px"></i>' +
        '<span style="flex:1"><i style="height:11px;width:' + (58 + i * 6) + '%"></i>' +
        '<i style="height:9px;width:' + (88 - i * 4) + '%;margin-top:7px"></i>' +
        '<i style="height:8px;width:34%;margin-top:7px"></i></span></div>';
    }
    return out;
  }

  function render() {
    if (!pop) { return; }
    var fa = L() === 'fa';
    var list = scoped();
    var slice = list.slice(0, shown);
    var hasMore = list.length > shown;          /* the metaData.hasMore stand-in */
    var u = unread();

    var bodyHtml;
    if (state === 'loading') { bodyHtml = skeletonHtml(); }
    else if (state === 'error') { bodyHtml = emptyHtml('error'); }
    else if (!rows.length) { bodyHtml = emptyHtml('empty'); }
    else if (!list.length) { bodyHtml = emptyHtml('unread'); }
    else { bodyHtml = slice.map(rowHtml).join(''); }

    pop.innerHTML =
      '<div class="sh-inbox-head">' +
        '<span class="sh-inbox-title" data-tip-fa="' + esc(TIP_TITLE_FA) + '" data-tip-en="' + esc(TIP_TITLE_EN) + '">' +
          (fa ? 'صندوق پیام' : 'Inbox') + '</span>' +
        '<span class="sp"></span>' +
        '<button class="sh-inbox-act" data-markall' + (u ? '' : ' disabled') + '>' +
          (fa ? 'خواندن همه' : 'Mark all read') + '</button>' +
        '<a class="sh-inbox-act sh-inbox-set" href="/notification-settings/" aria-label="' + (fa ? 'تنظیمات اعلان' : 'Notification settings') +
          '" title="' + (fa ? 'تنظیمات اعلان' : 'Notification settings') + '">' + ico('sliders-horizontal') + '</a>' +
      '</div>' +
      '<div class="sh-inbox-tabs">' +
        '<span class="sh-seg" data-tip-fa="' + esc(TIP_FILTER_FA) + '" data-tip-en="' + esc(TIP_FILTER_EN) + '">' +
          '<button class="sh-seg-opt' + (unreadOnly ? '' : ' on') + '" data-scope="all">' + (fa ? 'همه' : 'All') + '</button>' +
          '<button class="sh-seg-opt' + (unreadOnly ? ' on' : '') + '" data-scope="unread">' +
            (fa ? 'خوانده‌نشده' : 'Unread') + (u ? (' · ' + num(u)) : '') + '</button>' +
        '</span>' +
      '</div>' +
      '<div class="sh-inbox-list">' + bodyHtml + '</div>' +
      (hasMore && state === ''
        ? '<div class="sh-inbox-foot"><button class="sh-inbox-act" data-more' +
            ' data-tip-fa="' + esc(TIP_MORE_FA) + '" data-tip-en="' + esc(TIP_MORE_EN) + '">' +
            (fa ? 'بارگذاری بیشتر' : 'Load more') + '</button><span class="sp"></span></div>'
        : '');

    if (window.SH_UNREAD && state !== 'error') { SH_UNREAD.set(u); }
    if (window.Shahin && Shahin.tooltips) { Shahin.tooltips(); }
  }

  function open() { if (pop) { pop.classList.add('open'); render(); } }
  function close() { if (pop) { pop.classList.remove('open'); } }
  function toggle() { if (pop) { pop.classList.contains('open') ? close() : open(); } }

  function mount() {
    var bell = document.querySelector('[data-notif]');
    if (!bell || bell.closest('.sh-inbox-wrap')) { return; }

    var wrap = document.createElement('span');
    wrap.className = 'sh-inbox-wrap';
    bell.parentNode.insertBefore(wrap, bell);
    wrap.appendChild(bell);

    pop = document.createElement('div');
    pop.className = 'sh-inbox';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'صندوق پیام / Inbox');
    wrap.appendChild(pop);
    host = wrap;

    bell.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });

    pop.addEventListener('click', function (e) {
      e.stopPropagation();
      var t;
      if ((t = e.target.closest('[data-scope]'))) {
        unreadOnly = t.getAttribute('data-scope') === 'unread';
        shown = PAGE; render(); return;
      }
      if (e.target.closest('[data-markall]')) {
        var n = unread();
        rows.forEach(function (r) { r.read = true; });
        render();
        if (window.Shahin && n) {
          Shahin.toast(num(n) + ' پیام خوانده‌شده علامت خورد', n + ' messages marked read');
        }
        return;
      }
      if (e.target.closest('[data-more]')) { shown += PAGE; render(); return; }
      if (e.target.closest('[data-retry]')) { state = ''; shown = PAGE; render(); return; }
      if ((t = e.target.closest('[data-row]'))) {
        var id = t.getAttribute('data-row');
        rows.forEach(function (r) { if (r.id === id) { r.read = true; } });
        render();
      }
    });

    document.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
    document.addEventListener('shahin:lang', function () { if (pop.classList.contains('open')) { render(); } });
  }

  window.SH_INBOX = {
    open: open, close: close, toggle: toggle,
    setData: function (r) { rows = r || []; shown = PAGE; render(); },
    setState: function (s) { state = s || ''; shown = PAGE; render(); },
    unread: unread
  };

  function boot() {
    mount();
    var st = new URLSearchParams(location.search).get('inbox');
    rows = (st === 'empty') ? [] : SAMPLE.map(function (r) { return Object.assign({}, r); });
    if (st === 'loading' || st === 'error') { state = st; }
    if (window.SH_UNREAD && state !== 'error') { SH_UNREAD.set(unread()); }
    if (st) { setTimeout(open, 60); }
  }

  /* The popover ships on every page via shahin-nav.js, and most pages do not
     include the Phosphor subset themselves — so pull it in when it is absent
     rather than shipping hand-drawn fallback glyphs. */
  function withIcons(next) {
    if (window.SH_ICON) { next(); return; }
    var me = document.querySelector('script[src*="shahin-inbox.js"]');
    var base = me ? me.getAttribute('src').replace(/shahin-inbox\.js.*$/, '') : '../assets/';
    var s = document.createElement('script');
    s.src = base + 'sh-icons.js';
    s.onload = next;
    s.onerror = next;          /* icons are decoration; never block the inbox */
    document.head.appendChild(s);
  }

  function start() { withIcons(boot); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 30); });
  } else { setTimeout(start, 30); }
})();
