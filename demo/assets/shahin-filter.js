/* ═══════════════════════════════════════════════════════════════════════════
   Shahin — GLOBAL UNIFIED FILTER (shared component)
   ---------------------------------------------------------------------------
   One source of truth for the cross-page analytics filter. Mirrors how
   shahin-nav.js injects the global sidebar: drop a mount + this script on any
   page and the SAME filter appears, wired by Shahin.megaFilters / dateRanges.

   USAGE (per page):
     <div data-shahin-filter></div>            <!-- where the bar should sit -->
     <script src="/assets/shahin-nav.js"></script>
     <script src="/assets/shahin-filter.js"></script>   <!-- before shahin.js -->
     <script src="/assets/shahin.js"></script>

   The bar = standalone date-range (.sh-daterange) + active-filter summary
   ([data-mega-summary]) + a "Filters" trigger ([data-mega-trigger]).
   The drawer (#shMega) carries ONE universal section set, identical on every
   page: Page · Referrer · UTM · Device · Location · Tag · User type · Bot.
   In production each option list populates from page context.

   Runs synchronously at parse time, so the markup exists before shahin.js's
   DOMContentLoaded boot (buildMegaFilters / buildDateRanges / buildTooltips /
   applyLang) scans and wires it. Idempotent — safe if included twice.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__shahinFilterInjected) return;
  window.__shahinFilterInjected = true;

  /* ── scoped layout styles (everything else comes from shahin-components.css) ── */
  var STYLE = ''
    + '.sh-filterhead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px}'
    + '.sh-filterhead-r{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-inline-start:auto}'
    + '.sh-factive{display:none;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 16px}'
    + '.sh-factive.has{display:flex}'
    + '.sh-fchip{display:inline-flex;align-items:center;gap:2px;background:var(--sh-surface-2);border:1px solid var(--sh-border);border-radius:var(--sh-radius-pill);padding-block:3px;padding-inline-start:11px;padding-inline-end:5px;font-size:12px;color:var(--sh-text);white-space:nowrap}'
    + '.sh-fchip-v{color:var(--sh-text-2)}'
    + '.sh-fchip-x{border:none;background:transparent;color:var(--sh-muted);cursor:pointer;font-size:11px;line-height:1;padding:2px 5px;border-radius:50%}'
    + '.sh-fchip-x:hover{color:var(--sh-bad);background:var(--sh-bad-bg)}'
    + '.sh-fclear{border:none;background:transparent;color:var(--sh-muted);cursor:pointer;font-size:12px;padding:3px 8px;margin-inline-start:auto;text-decoration:underline;text-underline-offset:2px}'
    + '.sh-fclear:hover{color:var(--sh-brand)}'
    + '#shMega .pth{font-family:ui-monospace,"SF Mono",Consolas,monospace;direction:ltr;unicode-bidi:plaintext}';

  /* ── the bar (goes into the page's [data-shahin-filter] mount) ── */
  var BAR = ''
  + '<div class="sh-filterhead">'
  +   '<div class="sh-daterange" data-daterange data-range-name="drRange">'
  +     '<button class="sh-dr-trigger" aria-haspopup="dialog" aria-expanded="false">'
  +       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>'
  +       '<span class="sh-dr-label" data-fa="۷ روز اخیر" data-en="Last 7 Days">۷ روز اخیر</span>'
  +       '<span class="sh-dr-caret">⌄</span>'
  +     '</button>'
  +     '<div class="sh-dr-pop">'
  +       '<div class="sh-dr-tabs">'
  +         '<button class="sh-dr-tab on" data-tab="range" data-fa="بازهٔ زمانی" data-en="Date Range">بازهٔ زمانی</button>'
  +         '<button class="sh-dr-tab" data-tab="compare" data-fa="مقایسه" data-en="Compare">مقایسه</button>'
  +       '</div>'
  +       '<div class="sh-dr-body" data-tab-body="range">'
  +         '<label class="sh-radio"><input type="radio" name="drRange" value="7d" data-default checked/><span data-fa="۷ روز اخیر" data-en="Last 7 Days">۷ روز اخیر</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="drRange" value="30d"/><span data-fa="۳۰ روز اخیر" data-en="Last 30 Days">۳۰ روز اخیر</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="drRange" value="3m"/><span data-fa="۳ ماه اخیر" data-en="Last 3 Months">۳ ماه اخیر</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="drRange" value="6m"/><span data-fa="۶ ماه اخیر" data-en="Last 6 Months">۶ ماه اخیر</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="drRange" value="12m"/><span data-fa="۱۲ ماه اخیر" data-en="Last 12 Months">۱۲ ماه اخیر</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="drRange" value="custom"/><span data-fa="بازهٔ دلخواه…" data-en="Custom…">بازهٔ دلخواه…</span></label>'
  +       '</div>'
  +       '<div class="sh-dr-body" data-tab-body="compare" hidden>'
  +         '<div class="sh-dr-comparerow"><span data-fa="مقایسه با دورهٔ دیگر" data-en="Compare to another period">مقایسه با دورهٔ دیگر</span>'
  +           '<span class="sh-switch" data-dr-compare-toggle role="switch" aria-label="مقایسه / Compare"><i></i></span></div>'
  +         '<div class="sh-dr-compareopts">'
  +           '<label class="sh-radio"><input type="radio" name="drCompare" value="prev" checked/><span data-fa="دورهٔ قبل" data-en="Previous Period">دورهٔ قبل</span></label>'
  +           '<label class="sh-radio"><input type="radio" name="drCompare" value="lastyear"/><span data-fa="همین دوره، سال گذشته" data-en="Same Period last year">همین دوره، سال گذشته</span></label>'
  +           '<label class="sh-radio"><input type="radio" name="drCompare" value="custom"/><span data-fa="دلخواه" data-en="Custom">دلخواه</span></label>'
  +         '</div>'
  +       '</div>'
  +     '</div>'
  +   '</div>'
  +   '<div class="sh-filterhead-r">'
  +     '<button class="sh-filterbtn" data-mega-trigger aria-haspopup="dialog" aria-expanded="false">'
  +       '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>'
  +       '<span data-fa="فیلترها" data-en="Filters">فیلترها</span>'
  +       '<span class="sh-filterbtn-badge" style="display:none">0</span>'
  +     '</button>'
  +   '</div>'
  + '</div>'
  + '<div class="sh-factive" data-mega-summary></div>';

  /* ── the drawer (#shMega) — ONE universal section set, identical everywhere ── */
  var DRAWER = ''
  + '<div class="sh-mega-overlay" id="shMega" role="dialog" aria-modal="true" aria-label="فیلترها / Filters">'
  +   '<div class="sh-mega">'
  +     '<div class="sh-mega-head">'
  +       '<span class="sh-mega-title" data-fa="فیلترها" data-en="Filters">فیلترها</span>'
  +       '<button class="sh-mega-x" data-mega-x aria-label="بستن / Close">✕</button>'
  +     '</div>'
  +     '<div class="sh-mega-body">'

  /* Section 1 — Page / URL (page_path) */
  +     '<div class="sh-mega-sec" data-sum-fa="صفحه" data-sum-en="Page">'
  +       '<span class="sh-mega-label" data-fa="صفحه / مسیر" data-en="Page / URL"'
  +         ' data-tip-fa="<span class=\'tip-title\'>صفحه / مسیر (page_path)</span>محدودکردن داده به یک یا چند صفحهٔ مشخص بر اساس مسیر URL؛ برای جداکردن رفتار یک بخش خاص از سایت."'
  +         ' data-tip-en="<span class=\'tip-title\'>Page / URL (page_path)</span>Limit the data to one or more specific pages by URL path; isolates the behaviour of one section of the site.">صفحه / مسیر</span>'
  +       '<input class="sh-mega-search" data-target="shfPageList" data-fa-ph="جستجوی مسیر صفحه…" data-en-ph="Search page path…" placeholder="جستجوی مسیر صفحه…"/>'
  +       '<div class="sh-mega-list" id="shfPageList">'
  +         '<label class="sh-cb"><input type="checkbox" value="/"/><span class="pth">/ <span data-fa="(خانه)" data-en="(home)">(خانه)</span></span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/news"/><span class="pth">/news</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/news/latest"/><span class="pth">/news/latest</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/blog"/><span class="pth">/blog</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/products"/><span class="pth">/products</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/pricing"/><span class="pth">/pricing</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/search"/><span class="pth">/search</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="/checkout"/><span class="pth">/checkout</span></label>'
  +       '</div>'
  +       '<div class="sh-mega-empty" data-fa="موردی یافت نشد" data-en="No matches" hidden>موردی یافت نشد</div>'
  +     '</div>'

  /* Section 2 — Referrer (Channels / Source / Domain) */
  +     '<div class="sh-mega-sec" data-seg-mode data-sum-fa="ارجاع‌دهنده" data-sum-en="Referrer">'
  +       '<span class="sh-mega-label" data-fa="ارجاع‌دهنده" data-en="Referrer"'
  +         ' data-tip-fa="<span class=\'tip-title\'>ارجاع‌دهنده</span>کاربر از کجا وارد شد — کانال (جستجوی ارگانیک، شبکهٔ اجتماعی، ایمیل، مستقیم)، یا یک منبع/دامنهٔ مشخص."'
  +         ' data-tip-en="<span class=\'tip-title\'>Referrer</span>Where the user came from — channel (Organic Search, Social, Email, Direct), or a specific source/domain.">ارجاع‌دهنده</span>'
  +       '<div class="sh-seg" data-panes="shfRefPanes">'
  +         '<span class="sh-seg-opt on" data-pane="channels" data-fa="کانال‌ها" data-en="Channels">کانال‌ها</span>'
  +         '<span class="sh-seg-opt" data-pane="source" data-fa="منبع" data-en="Source">منبع</span>'
  +         '<span class="sh-seg-opt" data-pane="domain" data-fa="دامنه" data-en="Domain">دامنه</span>'
  +       '</div>'
  +       '<div id="shfRefPanes" style="margin-top:10px">'
  +         '<div data-pane-body="channels"><div class="sh-mega-cols" style="grid-template-columns:1fr 1fr">'
  +           '<label class="sh-cb"><input type="checkbox" value="organic"/><span data-fa="جستجوی ارگانیک" data-en="Organic Search">جستجوی ارگانیک</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="social"/><span data-fa="شبکهٔ اجتماعی" data-en="Social">شبکهٔ اجتماعی</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="email"/><span data-fa="ایمیل" data-en="Email">ایمیل</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="direct"/><span data-fa="مستقیم" data-en="Direct">مستقیم</span></label>'
  +         '</div></div>'
  +         '<div data-pane-body="source" hidden><input class="sh-valinput" data-fa-ph="نام منبع — مثلاً google" data-en-ph="Source name — e.g. google" placeholder="نام منبع — مثلاً google"/></div>'
  +         '<div data-pane-body="domain" hidden><input class="sh-valinput" data-fa-ph="دامنهٔ ارجاع — مثلاً t.me" data-en-ph="Referring domain — e.g. t.me" placeholder="دامنهٔ ارجاع — مثلاً t.me"/></div>'
  +       '</div>'
  +     '</div>'

  /* Section 3 — UTM (Campaign / Source / Medium) */
  +     '<div class="sh-mega-sec" data-seg-mode data-sum-fa="UTM" data-sum-en="UTM">'
  +       '<span class="sh-mega-label" data-fa="UTM" data-en="UTM"'
  +         ' data-tip-fa="<span class=\'tip-title\'>UTM</span>پارامترهای کمپین در URL — کمپین، منبع یا واسط. حالت را انتخاب کنید و مقدار را وارد کنید."'
  +         ' data-tip-en="<span class=\'tip-title\'>UTM</span>Campaign parameters in the URL — campaign, source or medium. Pick the mode and type a value.">UTM</span>'
  +       '<div class="sh-seg">'
  +         '<span class="sh-seg-opt on" data-fa="کمپین" data-en="Campaign">کمپین</span>'
  +         '<span class="sh-seg-opt" data-fa="منبع" data-en="Source">منبع</span>'
  +         '<span class="sh-seg-opt" data-fa="واسط" data-en="Medium">واسط</span>'
  +       '</div>'
  +       '<input class="sh-valinput" data-fa-ph="مثلاً yalda-1405" data-en-ph="e.g. yalda-1405" placeholder="مثلاً yalda-1405"/>'
  +     '</div>'

  /* Section 4 — Device (Type / Browser / OS) */
  +     '<div class="sh-mega-sec" data-sum-fa="دستگاه" data-sum-en="Device">'
  +       '<span class="sh-mega-label" data-fa="دستگاه" data-en="Device"'
  +         ' data-tip-fa="<span class=\'tip-title\'>دستگاه</span>نوع دستگاه، مرورگر و سیستم‌عامل کاربر. برای جداکردن رفتار یا مشکلات مختص یک محیط."'
  +         ' data-tip-en="<span class=\'tip-title\'>Device</span>User device type, browser and OS. Isolates behaviour or issues specific to one environment.">دستگاه</span>'
  +       '<div class="sh-mega-cols" style="grid-template-columns:1fr 1fr 1fr">'
  +         '<div><span class="sh-mega-sublabel" data-fa="نوع" data-en="Type">نوع</span>'
  +           '<label class="sh-cb"><input type="checkbox" value="desktop"/><span data-fa="دسکتاپ" data-en="Desktop">دسکتاپ</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="mobile"/><span data-fa="موبایل" data-en="Mobile">موبایل</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="tablet"/><span data-fa="تبلت" data-en="Tablet">تبلت</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="smarttv"/><span data-fa="تلویزیون هوشمند" data-en="Smart TV">تلویزیون هوشمند</span></label>'
  +         '</div>'
  +         '<div><span class="sh-mega-sublabel" data-fa="مرورگر" data-en="Browser">مرورگر</span>'
  +           '<label class="sh-cb"><input type="checkbox" value="chrome"/><span data-fa="کروم" data-en="Chrome">کروم</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="safari"/><span data-fa="سافاری" data-en="Safari">سافاری</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="firefox"/><span data-fa="فایرفاکس" data-en="Firefox">فایرفاکس</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="edge"/><span data-fa="اج" data-en="Edge">اج</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="samsung"/><span data-fa="سامسونگ" data-en="Samsung">سامسونگ</span></label>'
  +         '</div>'
  +         '<div><span class="sh-mega-sublabel" data-fa="سیستم‌عامل" data-en="OS">سیستم‌عامل</span>'
  +           '<label class="sh-cb"><input type="checkbox" value="windows"/><span data-fa="ویندوز" data-en="Windows">ویندوز</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="macos"/><span data-fa="مک‌اواس" data-en="macOS">مک‌اواس</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="ios"/><span data-fa="iOS" data-en="iOS">iOS</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="android"/><span data-fa="اندروید" data-en="Android">اندروید</span></label>'
  +           '<label class="sh-cb"><input type="checkbox" value="linux"/><span data-fa="لینوکس" data-en="Linux">لینوکس</span></label>'
  +         '</div>'
  +       '</div>'
  +     '</div>'

  /* Section 5 — Location (geo) */
  +     '<div class="sh-mega-sec" data-sum-fa="موقعیت" data-sum-en="Location">'
  +       '<span class="sh-mega-label" data-fa="موقعیت مکانی" data-en="Location"'
  +         ' data-tip-fa="<span class=\'tip-title\'>موقعیت مکانی</span>کشور یا شهر کاربر (بر پایهٔ IP). برای دیدن تفاوت رفتار بین مناطق مختلف."'
  +         ' data-tip-en="<span class=\'tip-title\'>Location</span>User country or city (IP-based). Reveals behaviour differences across regions.">موقعیت مکانی</span>'
  +       '<input class="sh-mega-search" data-target="shfLocList" data-fa-ph="جستجوی کشور یا شهر…" data-en-ph="Search country or city…" placeholder="جستجوی کشور یا شهر…"/>'
  +       '<div class="sh-mega-cols" id="shfLocList" style="grid-template-columns:1fr 1fr 1fr;margin-top:10px">'
  +         '<label class="sh-cb"><input type="checkbox" value="ir"/><span data-fa="ایران" data-en="Iran">ایران</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="de"/><span data-fa="آلمان" data-en="Germany">آلمان</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="us"/><span data-fa="آمریکا" data-en="United States">آمریکا</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="af"/><span data-fa="افغانستان" data-en="Afghanistan">افغانستان</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="tr"/><span data-fa="ترکیه" data-en="Turkey">ترکیه</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="ae"/><span data-fa="امارات" data-en="UAE">امارات</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="ca"/><span data-fa="کانادا" data-en="Canada">کانادا</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="fr"/><span data-fa="فرانسه" data-en="France">فرانسه</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="tehran"/><span data-fa="تهران" data-en="Tehran">تهران</span></label>'
  +       '</div>'
  +       '<div class="sh-mega-empty" data-fa="موردی یافت نشد" data-en="No matches" hidden>موردی یافت نشد</div>'
  +     '</div>'

  /* Section 6 — Tag (content tags / برچسب‌ها) */
  +     '<div class="sh-mega-sec" data-sum-fa="برچسب" data-sum-en="Tag">'
  +       '<span class="sh-mega-label" data-fa="برچسب‌ها" data-en="Tags"'
  +         ' data-tip-fa="<span class=\'tip-title\'>برچسب‌ها</span>برچسب‌های محتوا که به صفحه‌ها نسبت داده شده‌اند؛ برای تحلیل عملکرد یک موضوع یا دستهٔ محتوایی."'
  +         ' data-tip-en="<span class=\'tip-title\'>Tags</span>Content tags assigned to pages; analyse the performance of a topic or content group.">برچسب‌ها</span>'
  +       '<input class="sh-mega-search" data-target="shfTagList" data-fa-ph="جستجوی برچسب…" data-en-ph="Search tag…" placeholder="جستجوی برچسب…"/>'
  +       '<div class="sh-mega-cols" id="shfTagList" style="grid-template-columns:1fr 1fr;margin-top:10px">'
  +         '<label class="sh-cb"><input type="checkbox" value="news"/><span data-fa="اخبار" data-en="News">اخبار</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="sports"/><span data-fa="ورزش" data-en="Sports">ورزش</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="economy"/><span data-fa="اقتصاد" data-en="Economy">اقتصاد</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="tech"/><span data-fa="فناوری" data-en="Technology">فناوری</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="health"/><span data-fa="سلامت" data-en="Health">سلامت</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="entertainment"/><span data-fa="سرگرمی" data-en="Entertainment">سرگرمی</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="education"/><span data-fa="آموزش" data-en="Education">آموزش</span></label>'
  +         '<label class="sh-cb"><input type="checkbox" value="politics"/><span data-fa="سیاست" data-en="Politics">سیاست</span></label>'
  +       '</div>'
  +       '<div class="sh-mega-empty" data-fa="موردی یافت نشد" data-en="No matches" hidden>موردی یافت نشد</div>'
  +     '</div>'

  /* Section 7 — User type */
  +     '<div class="sh-mega-sec" data-sum-fa="نوع کاربر" data-sum-en="User type">'
  +       '<span class="sh-mega-label" data-fa="نوع کاربر" data-en="User type"'
  +         ' data-tip-fa="<span class=\'tip-title\'>نوع کاربر</span>همهٔ کاربران، کاربران بازگشتی (قبلاً دیده‌شده) یا کاربران جدید (اولین بازدید در بازه)."'
  +         ' data-tip-en="<span class=\'tip-title\'>User type</span>All users, returning users (seen before), or new users (first visit in the range).">نوع کاربر</span>'
  +       '<div class="sh-mega-row">'
  +         '<label class="sh-radio"><input type="radio" name="shfUserType" value="all" data-default checked/><span data-fa="همهٔ کاربران" data-en="All users">همهٔ کاربران</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="shfUserType" value="returning"/><span data-fa="کاربران بازگشتی" data-en="Returning users">کاربران بازگشتی</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="shfUserType" value="new"/><span data-fa="کاربران جدید" data-en="New users">کاربران جدید</span></label>'
  +       '</div>'
  +     '</div>'

  /* Section 8 — Bot traffic */
  +     '<div class="sh-mega-sec" data-sum-fa="ربات" data-sum-en="Bots">'
  +       '<span class="sh-mega-label" data-fa="ترافیک ربات" data-en="Bot traffic"'
  +         ' data-tip-fa="<span class=\'tip-title\'>ترافیک ربات</span>به‌صورت پیش‌فرض ربات‌ها از متریک‌ها حذف می‌شوند (الزام مشترک). برای ممیزی می‌توانید آن‌ها را هم لحاظ کنید."'
  +         ' data-tip-en="<span class=\'tip-title\'>Bot traffic</span>Bots are excluded from metrics by default (shared requirement). For auditing you can include them.">ترافیک ربات</span>'
  +       '<div class="sh-mega-row">'
  +         '<label class="sh-radio"><input type="radio" name="shfBot" value="exclude" data-default checked/><span data-fa="بدون ربات" data-en="Exclude bots">بدون ربات</span></label>'
  +         '<label class="sh-radio"><input type="radio" name="shfBot" value="include"/><span data-fa="شامل ربات" data-en="Include bots">شامل ربات</span></label>'
  +       '</div>'
  +     '</div>'

  +     '</div>'  /* /sh-mega-body */
  +     '<div class="sh-mega-foot">'
  +       '<button class="sh-btn ghost" data-mega-cancel data-fa="لغو" data-en="Cancel">لغو</button>'
  +       '<div class="sh-mega-foot-r"><button class="sh-btn primary" data-mega-save data-fa="ذخیرهٔ فیلترها" data-en="Save Filters">ذخیرهٔ فیلترها</button></div>'
  +     '</div>'
  +   '</div>'
  + '</div>';

  function inject() {
    /* styles (once) */
    if (!document.getElementById('sh-filter-styles')) {
      var st = document.createElement('style');
      st.id = 'sh-filter-styles';
      st.textContent = STYLE;
      (document.head || document.documentElement).appendChild(st);
    }
    /* bar → mount(s); first mount only carries the live drawer wiring (one per page) */
    var mounts = document.querySelectorAll('[data-shahin-filter]');
    for (var i = 0; i < mounts.length; i++) {
      if (mounts[i].getAttribute('data-sh-filled')) continue;
      mounts[i].innerHTML = BAR;
      mounts[i].setAttribute('data-sh-filled', '1');
      /* `data-shahin-filter-bare` → the date range alone, no Filters button and
         no active-filter summary. Production's analytics dashboards carry only
         the range control (it lives in the page header's action slot), so a
         page syncing 1:1 with production opts in here rather than hand-rolling
         its own date picker. */
      if (mounts[i].hasAttribute('data-shahin-filter-bare')) {
        var r = mounts[i].querySelector('.sh-filterhead-r');
        if (r) r.parentNode.removeChild(r);
        var sum = mounts[i].querySelector('.sh-factive');
        if (sum) sum.parentNode.removeChild(sum);
      }
    }
    /* drawer → body (once) */
    if (!document.getElementById('shMega')) {
      var holder = document.createElement('div');
      holder.innerHTML = DRAWER;
      document.body.appendChild(holder.firstChild);
    }
    /* per-page relevance (2026-07-02): a page may drop drawer sections that are
       circular with its own dimension — e.g. the Device section on the User-agent
       page, or the Referrer section on the Referrer page. Opt-in via
       data-shahin-filter-exclude="device,referrer" on the mount; keys match the
       section's data-sum-en (lowercased). Default (no attribute) = full set. */
    var exAttr = mounts[0] && mounts[0].getAttribute('data-shahin-filter-exclude');
    if (exAttr) {
      var ex = exAttr.toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var secs = document.querySelectorAll('#shMega .sh-mega-sec');
      for (var s = 0; s < secs.length; s++) {
        var key = (secs[s].getAttribute('data-sum-en') || '').toLowerCase();
        if (ex.indexOf(key) > -1) secs[s].style.display = 'none';
      }
    }
  }

  /* run as soon as <body> exists; this is a sync body script so it does — but
     guard for the rare case it is placed in <head>. */
  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);
})();
