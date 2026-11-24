/* Single source of truth for this page's versions.
   RULES: never delete an entry; every modification = append a new version.
   2026-08-15 — PM decision: this page STAYS in the nav as its own destination.
   An earlier same-day change had folded it into `events-settings/v9.html` and
   dropped it from the nav; the PM reversed that. v9 keeps the merged surface,
   and this page remains the setup entry point under Projects › Data Collection.
   Each vN.html includes this file then sets its own `version` id.
   2026-11-03 — PM decision: v5 and v6 are removed from the switcher; their files stay on disk.
   2026-11-03 — PM decision: v8 is the final version, so v7 and v1 leave the demo; their files moved to
   ../trash/events-start-v7-v1-2026-11/ rather than destroyed.
   2026-11-14 — PM decision: v10 is the final version; v5, v6, v8 and v9 leave the demo (files in ../trash/events-start-v5-v9-2026-11/).
   The milestone-1 version moves onto v10 (v10.html?m=1) and, like v9/v10, shows Shahin's templates by industry and by use case.
   2026-11-14 — PM decision: the page «داشبوردهای آماده» is renamed «گالری تمپلیت‌ها» (Template gallery) in v11; v10 stays in the
   switcher and the milestone-1 version moves onto v11 (v11.html?m=1).
   2026-11-14 — PM decision: a template's page has no «پیش‌نمایش داشبورد» (dashboard preview) in v12; collection status is said
   once, on the template's event cards. The milestone-1 version moves onto v12 (v12.html?m=1).
   2026-11-14 — PM decision: the switcher has only two versions, milestone 1 and the final version (v12); v10 and v11 leave
   the demo (files in ../trash/events-start-v10-v11-2026-11/).
   2026-11-16 — PM decision («دیزاینش رو عینا با امپلیتود یکی کن»): v13 follows Amplitude's template gallery. The industry and
   use-case chip rows and the card tags are gone; «کاربرد» and «صنعت» are nav categories under «ساخته شاهین», as Amplitude's
   «Created by Amplitude ▸ Use Case / Industry», and the All view stacks «کاربرد (N)» then «صنعت (N)». The collection summary
   sits in Amplitude's banner slot. The milestone-1 version moves onto v13 (v13.html?m=1); v12 stayed for comparison until the PM pruned it (below).
   2026-11-16 — PM: the template page follows Amplitude's starter too, but WITHOUT the dashboard preview (the 2026-11-14 decision stands):
   back link and actions on one row, the name with one grey badge, packs as collapsible groups, and each event a role card whose foot
   strip is the bound event with its status or the action («کد را اضافه کردم» / «افزودن ایونت»), as Amplitude's «+ Add event».
   2026-11-16 — PM decision: v12 leaves the switcher (it was the old chip-filter design, kept only for comparison and not part of any
   later milestone); the switcher has the milestone-1 cut and v13, the full version. v12.html stays on disk because open MR !1915 edits it. */
window.SHAHIN_PAGE_META = {
  id: 'events-start',
  title: { fa: 'راه‌اندازی ایونت‌ها', en: 'Events setup' },
  latest: 'v13',   /* PM 2026-11-03, gallery like Amplitude's template gallery ▸ Industry; PM 2026-11-14, renamed «گالری تمپلیت‌ها» */
  versions: [
    { id: 'm1', labelFa: 'مایل‌استون ۱ · وضعیت جمع‌آوری', labelEn: 'M1 · Collection status', file: 'v13.html?m=1',
      fa: 'مایل‌استون ۱ · فیچر ۲ (تصمیم PM، ۱۴۰۵/۰۸/۱۲): فقط وضعیت واقعی هر ایونت در هر پروژه، دکمه «کد را اضافه کردم»، کارت خلاصه و فیلترهای وضعیت؛ جستجو، «اخیرا دیده‌شده»، لینک قالب‌های گزارش‌ساز و ذخیره به‌عنوان داشبورد پنهان‌اند. نسخه کامل v13 است.',
      en: 'Milestone 1 · feature 2 (PM decision, 2026-11-03): only each event\'s real per-project status, the «I added the code» handshake, the summary card and the status filters; search, recently viewed, the builder-templates link and save-as-dashboard are hidden. v13 is the full version.' },
    { id: 'v13', fa: 'نسخه ۱۳ — گالری عینا مثل امپلیتود (تصمیم PM، ۱۴۰۵/۰۸/۲۵): ردیف چیپ‌های صنعت و کاربرد و تگ کارت‌ها حذف شدند؛ «کاربرد» و «صنعت» دسته‌های منوی کناری زیر «ساخته شاهین»‌اند و خلاصه جمع‌آوری در جای بنر بالای گالری امپلیتود است. صفحه هر تمپلیت هم به سبک صفحه تمپلیت امپلیتود است، بدون پیش‌نمایش داشبورد.',
      en: 'V13 — the gallery exactly as Amplitude’s (PM decision, 2026-11-16): the industry and use-case chip rows and the card tags are gone; «Use case» and «Industry» are side-nav categories under «Created by Shahin», and the collection summary sits in the slot of Amplitude’s banner. Each template’s page follows Amplitude’s starter page too, without the dashboard preview.', file: 'v13.html' },
  ]
};
