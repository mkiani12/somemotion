/* ═══ Impersonation — «ورود به‌جای کاربر» (SUPER_ADMIN only) ═══
   One module for the whole flow, so users-list and user-profile cannot drift:
     ShahinImp.start(user)  — the entry dialog: what happens → sudo code → enter
     (session)              — banner with countdown + exit on every page, admin realm hidden,
                              sudo-guarded controls closed
     end / expiry           — back to the admin page the session started from, with a toast
   Production rules mirrored (core-api EnterImpersonationUseCase + capability audit §B):
     • target must be an ACTIVE CLIENT — anything else is AUTH.IMPERSONATION_TARGET_INVALID
     • single-use `impersonation` sudo: a fresh code on every entry
     • absolute TTL (ASM_AUTH_IMPERSONATION_TTL_MINUTES, default 5), never refreshed
     • every sudo action and every self-mutation is refused (AUTH.IMPERSONATION_FORBIDDEN),
       so the UI closes them instead of letting the admin reach a 403
     • no nesting: the entry buttons are closed while a session runs
   Demo only: ?impTtl=<seconds> on the page that starts the session shortens the window, so the
   last-minute and expiry states can be reached; ?impErr=target makes the entry fail the way a
   user suspended in the meantime would. Session state lives in sessionStorage («sh-imp»). */
(function () {
  'use strict';
  if (window.ShahinImp) return;

  var KEY = 'sh-imp', ENDED = 'sh-imp-ended';
  var TTL = 300, WARN_AT = 60;

  function lang(){ return document.documentElement.lang === 'en' ? 'en' : 'fa'; }
  function pick(f, e){ return lang() === 'fa' ? f : e; }
  function faNum(s){ return String(s).replace(/\d/g, function(d){ return String.fromCharCode(0x06F0 + Number(d)); }); }
  function num(s){ return lang() === 'fa' ? faNum(s) : String(s); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function icon(n){ return window.SH_ICON ? SH_ICON(n) : ''; }
  function toast(fa, en, opts){ if (window.Shahin && Shahin.toast) Shahin.toast(fa, en, opts); }
  function read(k){ try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function write(k, v){ try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function session(){
    var s = read(KEY);
    if (s && s.exp > Date.now()) return s;
    if (s) { write(KEY, null); write(ENDED, { why: 'expired', nameFa: s.nameFa, nameEn: s.nameEn }); }
    return null;
  }

  /* ── eligibility: the same rule the backend enforces ── */
  function eligible(u){
    if (session()) return { ok: false,
      fa: 'یک جلسهٔ «ورود به‌جای کاربر» همین حالا باز است. اول از آن خارج شوید.',
      en: 'An impersonation session is already open. Exit it first.' };
    if (u.role && u.role !== 'CLIENT') return { ok: false,
      fa: 'فقط می‌توانید به‌جای کاربر عادی وارد شوید، نه ادمین‌ها.',
      en: 'You can only sign in as a regular user, not as an admin.' };
    if (u.status && u.status !== 'ACTIVE') return { ok: false,
      fa: 'فقط حساب فعال قابل ورود است. این حساب ' + (u.statusFa || '') + ' است.',
      en: 'Only an active account can be entered. This one is ' + (u.statusEn || '').toLowerCase() + '.' };
    return { ok: true };
  }

  /* ── entry dialog ── */
  var ov, target;
  var CHECKS = [
    { i: 'eye',         fa: 'محصول را دقیقاً همان‌طور می‌بینید که این کاربر می‌بیند: پروژه‌ها، داشبوردها و تنظیماتش.', en: 'You see the product exactly as this user does: their projects, dashboards and settings.' },
    { i: 'lock-simple', fa: 'کارهای امنیتی و مالی (رمز، راه‌های تماس، دسترسی اعضا، پرداخت، حذف) در این حالت بسته‌اند.', en: 'Security and billing actions (password, contacts, member access, payments, deletion) are closed in this mode.' },
    { i: 'timer',       fa: 'جلسه پنج دقیقه است و تمدید نمی‌شود؛ برای ادامه باید دوباره وارد شوید.', en: 'The session lasts five minutes and cannot be extended; to continue, enter again.' },
    { i: 'list-checks', fa: 'ورود و خروج شما با نام خودتان در گزارش رخدادها ثبت می‌شود.', en: 'Your entry and exit are recorded under your own name in the audit log.' }
  ];

  function build(){
    ov = document.createElement('div');
    ov.className = 'sh-imp-ov';
    ov.innerHTML =
      '<div class="sh-imp-modal" role="dialog" aria-modal="true" aria-labelledby="sh-imp-t">' +
        '<div class="sh-imp-head"><div><div class="sh-imp-title" id="sh-imp-t"></div><div class="sh-imp-sub" id="sh-imp-s"></div></div>' +
        '<button class="sh-imp-x" type="button" data-imp-close>' + icon('x') + '</button></div>' +
        '<div class="sh-imp-body">' +
          '<div class="sh-imp-step" data-step="what"><div class="sh-imp-who" id="sh-imp-who"></div><ul class="sh-imp-list" id="sh-imp-list"></ul>' +
            '<div class="sh-imp-actions"><button class="sh-btn ghost" type="button" data-imp-close data-l="cancel"></button>' +
            '<button class="sh-btn primary" type="button" id="sh-imp-next"></button></div></div>' +
          '<div class="sh-imp-step" data-step="otp"><p class="sh-imp-hint" id="sh-imp-otp-hint"></p>' +
            '<div class="sh-otp" id="sh-imp-otp">' + [1,2,3,4].map(function(n){ return '<input inputmode="numeric" maxlength="4" data-n="' + n + '"/>'; }).join('') + '</div>' +
            '<div class="sh-imp-err" id="sh-imp-err" role="alert"></div>' +
            '<p class="sh-imp-hint" id="sh-imp-resend"></p>' +
            '<div class="sh-imp-actions"><button class="sh-btn ghost" type="button" data-imp-close data-l="cancel"></button>' +
            '<button class="sh-btn primary" type="button" id="sh-imp-go"></button></div></div>' +
        '</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e){
      if (e.target === ov || e.target.closest('[data-imp-close]')) close();
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && ov.classList.contains('open')) close(); });
    ov.querySelector('#sh-imp-next').addEventListener('click', function(){ step('otp'); });
    ov.querySelector('#sh-imp-go').addEventListener('click', submit);
    var otp = ov.querySelector('#sh-imp-otp');
    otp.addEventListener('input', function(e){
      /* a Persian keyboard types «۱۲۳» (or Arabic «١٢٣»): fold them to Latin before keeping digits only */
      var d = e.target.value.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, function(c){ return String((c.charCodeAt(0) & 0xF)); })
                             .replace(/\D/g, '');
      /* several digits at once (fast typing, autofill): spill them into the boxes that follow */
      var box = e.target;
      e.target.value = d.charAt(0);
      for (var k = 1; k < d.length && box.nextElementSibling; k++) { box = box.nextElementSibling; box.value = d.charAt(k); }
      ov.querySelector('#sh-imp-err').classList.remove('on'); otp.classList.remove('bad');
      if (box.value && box.nextElementSibling) box.nextElementSibling.focus(); else if (box.value) box.focus();
    });
    otp.addEventListener('paste', function(e){
      var d = (e.clipboardData.getData('text') || '').replace(/[\u06F0-\u06F9\u0660-\u0669]/g, function(c){ return String((c.charCodeAt(0) & 0xF)); }).replace(/\D/g, '');
      if (!d) return;
      e.preventDefault();
      otp.querySelectorAll('input').forEach(function(i, n){ i.value = d.charAt(n) || ''; });
    });
    otp.addEventListener('keydown', function(e){
      if (e.key === 'Backspace' && !e.target.value && e.target.previousElementSibling) e.target.previousElementSibling.focus();
      if (e.key === 'Enter') submit();
    });
    document.addEventListener('shahin:lang', function(){ if (ov.classList.contains('open')) paint(); });
  }

  function paint(){
    var u = target, q = function(s){ return ov.querySelector(s); };
    q('#sh-imp-t').textContent = pick('ورود به‌جای کاربر', 'Sign in as this user');
    q('#sh-imp-s').textContent = pick('ابزار عیب‌یابی: مشکل را همان‌جا که کاربر می‌بیند ببینید.', 'A diagnostic tool: see the problem where the user sees it.');
    q('[data-imp-close].sh-imp-x').setAttribute('aria-label', pick('بستن', 'Close'));
    q('#sh-imp-who').innerHTML = icon('user-switch') + '<div><b>' + esc(pick(u.nameFa, u.nameEn)) + '</b><span>' + esc(u.contact || '') + '</span></div>';
    q('#sh-imp-list').innerHTML = CHECKS.map(function(c){ return '<li>' + icon(c.i) + '<span>' + pick(c.fa, c.en) + '</span></li>'; }).join('');
    ov.querySelectorAll('[data-l="cancel"]').forEach(function(b){ b.textContent = pick('انصراف', 'Cancel'); });
    q('#sh-imp-next').textContent = pick('ادامه', 'Continue');
    q('#sh-imp-otp-hint').textContent = pick('کد پیامک‌شده به شمارهٔ خودتان را وارد کنید. این کد فقط برای همین یک بار ورود است.', 'Enter the code sent to your own phone. It is good for this one entry only.');
    q('#sh-imp-resend').textContent = pick('کدی دریافت نکردید؟ ' + faNum('01:59') + ' تا ارسال دوباره', 'No code? 01:59 until resend');
    q('#sh-imp-go').textContent = pick('ورود به حساب کاربر', 'Sign in as user');
    ov.querySelectorAll('#sh-imp-otp input').forEach(function(i){ i.setAttribute('aria-label', pick('رقم ', 'Digit ') + num(i.getAttribute('data-n'))); });
  }

  function step(k){
    ov.querySelectorAll('.sh-imp-step').forEach(function(s){ s.classList.toggle('on', s.getAttribute('data-step') === k); });
    if (k === 'otp') { var f = ov.querySelector('#sh-imp-otp input'); if (f) f.focus(); }
    else ov.querySelector('#sh-imp-next').focus();
  }

  var opener = null;
  function open(u){
    if (!ov) build();
    target = u; opener = document.activeElement;
    ov.querySelectorAll('#sh-imp-otp input').forEach(function(i){ i.value = ''; });
    ov.querySelector('#sh-imp-err').classList.remove('on'); ov.querySelector('#sh-imp-otp').classList.remove('bad');
    paint(); ov.classList.add('open'); step('what');
  }
  function close(){ ov.classList.remove('open'); if (opener && opener.focus) opener.focus(); }

  function fail(fa, en){
    var e = ov.querySelector('#sh-imp-err');
    e.textContent = pick(fa, en); e.classList.add('on');
  }

  function submit(){
    var ins = ov.querySelectorAll('#sh-imp-otp input'), code = '';
    ins.forEach(function(i){ code += i.value; });
    if (code.length < 4) { ov.querySelector('#sh-imp-otp').classList.add('bad'); return fail('کد چهاررقمی را کامل وارد کنید.', 'Enter the full four-digit code.'); }
    var q = new URLSearchParams(location.search);
    /* AUTH.IMPERSONATION_TARGET_INVALID — the backend re-checks the target at entry time */
    if (q.get('impErr') === 'target') {
      return fail('ورود انجام نشد: این حساب دیگر فعال نیست یا کاربر عادی نیست. صفحه را تازه کنید تا وضعیت فعلی‌اش را ببینید.',
                  'Could not sign in: this account is no longer active or is not a regular user. Refresh the page to see its current state.');
    }
    var ttl = Math.max(15, Number(q.get('impTtl')) || TTL);
    write(KEY, { id: target.id, nameFa: target.nameFa, nameEn: target.nameEn, exp: Date.now() + ttl * 1000,
                 back: location.pathname + location.search.replace(/[?&]imp(Ttl|Err)=[^&]*/g, '').replace(/^&/, '?') });
    location.href = target.landing || '/overview/';
  }

  function start(u){
    var el = eligible(u);
    if (!el.ok) { toast(el.fa, el.en, { tone: 'warn' }); return; }
    open(u);
  }

  /* ── active session ── */
  var bar, timer, warned = false;
  var GUARDED = '[data-sudo], #mb-add, #mb-empty-add, .mb-act button, [data-act="impersonate"]';
  var BLOCK_FA = 'در حالت «ورود به‌جای کاربر» این کار بسته است، چون تأیید امنیتی لازم دارد. از جلسه خارج شوید تا با حساب خودتان انجامش دهید.';
  var BLOCK_EN = 'This action is closed while you are signed in as a user, because it needs a security check. Exit the session to do it as yourself.';

  function mmss(sec){ var m = Math.floor(sec / 60), s = sec % 60; return num(m + ':' + (s < 10 ? '0' : '') + s); }

  function drawBar(s){
    var left = Math.max(0, Math.round((s.exp - Date.now()) / 1000));
    bar.className = 'sh-imp-bar' + (left <= WARN_AT ? ' ending' : '');
    bar.innerHTML = icon('user-switch') +
      '<div class="sh-imp-bar-tx">' + pick('شما به‌جای ', 'You are signed in as ') + '<b>' + esc(pick(s.nameFa, s.nameEn)) + '</b>' +
        pick(' وارد شده‌اید', '') + '<span class="sh-imp-bar-note"> · ' + pick('کارهای امنیتی و مالی بسته است', 'security and billing actions are closed') + '</span></div>' +
      '<span class="sh-imp-clock" role="timer" aria-label="' + pick('زمان باقی‌مانده', 'Time left') + '">' + icon('timer') + mmss(left) + '</span>' +
      '<button class="sh-imp-exit" type="button">' + icon('sign-out') + '<span>' + pick('خروج و بازگشت', 'Exit and go back') + '</span></button>';
    bar.querySelector('.sh-imp-exit').setAttribute('aria-label', pick('خروج از حساب کاربر و بازگشت به پنل مدیریت', 'Exit the user\'s account and return to the admin panel'));
    bar.querySelector('.sh-imp-exit').addEventListener('click', function(){ end('exit'); });
    return left;
  }

  function tick(){
    var s = read(KEY);
    if (!s) return;
    var left = drawBar(s);
    if (left <= WARN_AT && !warned && !s.warned) {
      warned = true; s.warned = true; write(KEY, s);
      toast('یک دقیقه تا پایان جلسه مانده و تمدید نمی‌شود.', 'One minute left in this session; it cannot be extended.', { tone: 'warn' });
    }
    if (left <= 0) end('expired');
  }

  function end(why){
    var s = read(KEY); clearInterval(timer);
    write(KEY, null);
    if (s) write(ENDED, { why: why, nameFa: s.nameFa, nameEn: s.nameEn });
    location.href = (s && s.back) || '/admin/users-list/';
  }

  function guard(e){
    var t = e.target.closest && e.target.closest(GUARDED);
    if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toast(BLOCK_FA, BLOCK_EN, { tone: 'warn' });
  }

  function mark(){
    document.querySelectorAll(GUARDED).forEach(function(el){
      el.setAttribute('aria-disabled', 'true'); el.classList.add('sh-imp-guarded');
      el.title = pick(BLOCK_FA, BLOCK_EN);
    });
  }

  /* the account menu shows who the product thinks you are: the user, not the admin */
  function asUser(s){
    var b = document.querySelector('.sh-user-btn');
    if (!b) return;
    var n = b.querySelector('.sh-uname'), r = b.querySelector('.sh-urole'), a = b.querySelector('.sh-uavatar');
    if (n) { n.setAttribute('data-fa', s.nameFa); n.setAttribute('data-en', s.nameEn); n.textContent = pick(s.nameFa, s.nameEn); }
    if (r) { r.setAttribute('data-fa', 'کاربر عادی'); r.setAttribute('data-en', 'Regular user'); r.textContent = pick('کاربر عادی', 'Regular user'); }
    if (a) a.textContent = s.nameEn.split(' ').map(function(w){ return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function runSession(s){
    document.documentElement.classList.add('sh-imp');
    asUser(s); setTimeout(function(){ asUser(s); }, 0);
    bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    document.body.insertBefore(bar, document.body.firstChild);
    bar.setAttribute('aria-label', pick('جلسهٔ ورود به‌جای کاربر', 'Impersonation session'));
    drawBar(s);
    timer = setInterval(tick, 1000);
    ['click', 'change', 'submit'].forEach(function(t){ document.addEventListener(t, guard, true); });
    mark();
    /* rows re-render on language switch and on their own state changes */
    new MutationObserver(function(){ mark(); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('shahin:lang', function(){ drawBar(read(KEY) || s); mark(); });
  }

  function afterEnd(){
    var e = read(ENDED);
    if (!e) return;
    write(ENDED, null);
    var nf = e.nameFa, ne = e.nameEn;
    setTimeout(function(){
      if (e.why === 'expired') toast('زمان جلسهٔ ورود به‌جای ' + nf + ' تمام شد. شما با حساب خودتان برگشتید.', 'The session as ' + ne + ' timed out. You are back on your own account.', { tone: 'warn', closable: true });
      else toast('از حساب ' + nf + ' خارج شدید و با حساب خودتان برگشتید.', 'You left ' + ne + '\'s account and are back on your own.', { tone: 'good' });
    }, 300);
  }

  window.ShahinImp = { start: start, eligible: eligible, active: function(){ return !!session(); } };

  function boot(){
    var raw = read(KEY);
    /* a page opened after the window closed: the cookie is gone, so the user lands back on admin */
    if (raw && raw.exp <= Date.now()) return end('expired');
    if (raw) runSession(raw); else afterEnd();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
