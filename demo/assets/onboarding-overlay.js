/* ═══════════════════════════════════════════════════════════════════
   ONBOARDING VIDEO — reusable engine (global)
   Mounts a real product screen-recording + synced orange rings + callouts
   into any container, SAME-DOCUMENT (so muted autoplay is reliable).
   Pairs with /assets/onboarding-overlay.css (.ob-ring / .ob-callout).

   OnboardingVideo.mount(containerEl, { src, beats, lang, controls })
     • container should be position:relative with the video's aspect-ratio.
     • returns { play(), setLang(l), video }.
   OnboardingVideo.SR_BEATS — the Session Replay onboarding beats (single source).
   ═══════════════════════════════════════════════════════════════════ */
window.OnboardingVideo = (function () {
  var SR_BEATS = [
    { s:1.5, e:6,  l:2,  t:17, w:34, h:10, num:1,
      en:{t:'Session info', b:'The user’s real session — date and time, total duration, page count, click count, browser and OS, plus the events or errors that occurred in the session.'},
      fa:{t:'اطلاعات نشست', b:'نشست واقعی کاربر؛ تاریخ و زمان، مدت کل نشست، تعداد صفحات، تعداد کلیک، مرورگر و سیستم‌عامل، به علاوه رویدادها یا خطاهایی که در هر نشست وجود داشته است.'} },
    { s:7,  e:12, l:23, t:12, w:12, h:18, num:2,
      en:{t:'Sort sessions', b:'Reorder the session list by newest or oldest session, and by longest or shortest duration.'},
      fa:{t:'ترتیب نشست‌ها', b:'تغییر ترتیب لیست نشست‌ها بر اساس جدیدترین یا قدیمی‌ترین نشست، و طولانی‌ترین یا کوتاه‌ترین مدت.'} },
    { s:19, e:26, l:37, t:18, w:35, h:50, num:3,
      en:{t:'Watch the session', b:'Replay the user’s real session like a video — exactly what they saw and did. Play/pause, change speed (0.5×–4×), and skip inactivity to jump past idle time.'},
      fa:{t:'تماشای نشست', b:'نشست واقعی کاربر را مثل ویدیو بازپخش کنید — همان چیزی که دید و انجام داد. پخش/مکث، تغییر سرعت (۰٫۵ تا ۴ برابر)، و «رد بی‌تحرکی» برای پرش از زمان‌های بی‌حرکت.'} },
    { s:27.5, e:31.5, l:37, t:86, w:40, h:9, num:4,
      en:{t:'Events & timeline', b:'The timeline marks every key moment — clicks, navigations, network errors, and dead/rage clicks — each as a colored dot. Click any marker to jump straight to that moment in the replay.'},
      fa:{t:'رویدادها و نوار زمان', b:'نوار زمان هر لحظه کلیدی را علامت می‌زند — کلیک، ناوبری، خطای شبکه، و کلیک بی‌اثر/خشمگین — هرکدام یک نقطه رنگی. روی هر مارکر بزنید تا مستقیم به همان لحظه بازپخش بپرید.'} },
    { s:32.5, e:35.5, l:77.5, t:18.5, w:21.5, h:43, num:5,
      en:{t:'Info tab', b:'The Info tab shows the session details — session ID, duration, first visit, device and OS, browser, country, and the user’s referrer source.'},
      fa:{t:'تب اطلاعات', b:'تب «اطلاعات» جزئیات نشست را نشان می‌دهد — شناسه نشست، مدت، اولین بازدید، دستگاه و سیستم‌عامل، مرورگر، کشور، و منبع ورود (ارجاع‌دهنده) کاربر.'} },
    { s:37, e:42, l:77.5, t:18.5, w:21.5, h:30, num:6,
      en:{t:'Errors', b:'The Errors tab gathers every error in this session — network failures and JavaScript errors — with the exact request and status code, so you can pinpoint what broke without guessing.'},
      fa:{t:'خطاها', b:'تب «خطاها» همه خطاهای این نشست را جمع می‌کند — خطاهای شبکه و جاوااسکریپت — همراه با درخواست و کد وضعیت دقیق، تا بدون حدس بفهمید چه چیزی خراب شده.'} },
    { s:43, e:46, l:1.5, t:6, w:17.5, h:22, num:7,
      en:{t:'Date range', b:'Set the time window for the sessions you see — today, the last 7 or 30 days, last month, or a custom range — to focus on a specific release, campaign, or incident.'},
      fa:{t:'بازه زمانی', b:'بازه زمانی نشست‌هایی که می‌بینید را تنظیم کنید — امروز، ۷ یا ۳۰ روز گذشته، ماه گذشته، یا بازه دلخواه — تا روی یک انتشار، کمپین، یا رویداد خاص تمرکز کنید.'} },
    { s:49, e:62, l:52.3, t:1.5, w:47.2, h:97.5, num:8,
      en:{t:'Advanced filters', b:'Narrow thousands of sessions to exactly the ones you need — by event (JS/network error, rage/dead/error click, quick-back, excessive scroll), landing/visited/exit page, location, device, browser and OS, referrer channel/source/domain, UTM campaign, and session duration or pages-per-session.'},
      fa:{t:'فیلتر پیشرفته', b:'از میان هزاران نشست همان‌هایی را که می‌خواهید جدا کنید — بر اساس رویداد (خطای JS/شبکه، کلیک خشمگین/بی‌اثر/خطا، بازگشت سریع، اسکرول زیاد)، صفحه ورود/بازدید/خروج، موقعیت، دستگاه، مرورگر و سیستم‌عامل، کانال/منبع/دامنه ارجاع، کمپین UTM، و مدت یا تعداد صفحه نشست.'} }
  ];

  function mount(stage, opts) {
    opts = opts || {};
    var beats = opts.beats || SR_BEATS;
    var clang = opts.lang || 'en';
    var vid = document.createElement('video');
    vid.src = opts.src || '/assets/media/sr-onboarding-real-en.webm';
    vid.autoplay = true; vid.loop = true; vid.muted = true; vid.defaultMuted = true;
    vid.setAttribute('muted',''); vid.setAttribute('playsinline',''); vid.playsInline = true;
    if (opts.controls !== false) vid.controls = true;
    vid.className = 'ob-video';
    var ovl = document.createElement('div'); ovl.className = 'ob-ovl';
    var ring = document.createElement('div'); ring.className = 'ob-ring';
    var callout = document.createElement('div'); callout.className = 'ob-callout';
    ovl.appendChild(ring); ovl.appendChild(callout);
    stage.appendChild(vid); stage.appendChild(ovl);

    var cur = -1;
    function place(b) {
      var W = stage.clientWidth, H = stage.clientHeight;
      var rx = b.l/100*W, ry = b.t/100*H, rw = b.w/100*W, rh = b.h/100*H;
      ring.style.left = rx+'px'; ring.style.top = ry+'px'; ring.style.width = rw+'px'; ring.style.height = rh+'px'; ring.classList.add('on');
      var txt = (clang==='fa') ? b.fa : b.en;
      callout.innerHTML = '<div class="ch"><span class="n">'+b.num+'</span>'+txt.t+'</div><div class="cb">'+txt.b+'</div>';
      callout.classList.add('on'); callout.style.left = '-9999px';
      var cw = callout.offsetWidth, ch = callout.offsetHeight, gap = 14, cx, cy, cxc = rx+rw/2;
      if (cxc < W/2) { cx = rx+rw+gap; if (cx+cw > W-8) cx = rx-cw-gap; }
      else { cx = rx-cw-gap; if (cx < 8) cx = rx+rw+gap; }
      cy = ry+rh/2-ch/2;
      if (cx < 8 || cx+cw > W-8) { cx = Math.max(8, Math.min(cxc-cw/2, W-cw-8)); cy = (ry+rh+gap+ch > H-8) ? ry-ch-gap : ry+rh+gap; }
      cx = Math.max(8, Math.min(cx, W-cw-8)); cy = Math.max(8, Math.min(cy, H-ch-8));
      callout.style.left = cx+'px'; callout.style.top = cy+'px';
    }
    function hide() { ring.classList.remove('on'); callout.classList.remove('on'); }
    function tick() {
      var tt = vid.currentTime, idx = -1;
      for (var i=0; i<beats.length; i++) { if (tt>=beats[i].s && tt<beats[i].e) { idx = i; break; } }
      if (idx < 0) { if (cur!==-1) { hide(); cur = -1; } return; }
      if (idx !== cur) { cur = idx; place(beats[idx]); }
    }
    vid.addEventListener('timeupdate', tick);
    addEventListener('resize', function () { if (cur>=0) place(beats[cur]); });
    function tryPlay() { try { var p = vid.play(); if (p && p.catch) p.catch(function(){}); } catch(e){} }
    vid.addEventListener('canplay', tryPlay); tryPlay();

    return {
      play: function () { vid.muted = true; tryPlay(); },
      setLang: function (l) { clang = (l==='fa')?'fa':'en'; if (cur>=0) place(beats[cur]); },
      video: vid
    };
  }
  return { mount: mount, SR_BEATS: SR_BEATS };
})();
