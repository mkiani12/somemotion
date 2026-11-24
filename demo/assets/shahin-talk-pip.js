/* Presenter notes in a floating window (PM, 2026-11-15).
   While presenting, the demo runs full screen on the laptop and the TV shows only the demo window
   (event-platform/tv.html captures that one window). Alt+Shift+P opens the M1 planning talk in a small
   always-on-top window (Document Picture-in-Picture in Chrome/Edge; a plain popup elsewhere). That window is
   not part of the demo page, so it never reaches the TV. Pressing Alt+Shift+P again closes it.
   The current section and text size are remembered, so the notes reopen where you left off after the demo
   moves to another page (a Picture-in-Picture window closes when its page navigates). */
(function () {
  if (window.SH_TALK_PIP) { return; }
  var TALK_URL = '/event-platform/m1-planning-talk.html';
  var KEY = 'shahin-talk-pip';
  var state = { sec: 0, size: 15 };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (saved && typeof saved.sec === 'number') { state.sec = saved.sec; } if (saved && saved.size) { state.size = saved.size; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var sections = null; /* [{title, html}] */
  function load() {
    if (sections) { return Promise.resolve(sections); }
    return fetch(TALK_URL, { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'text/html');
      sections = [].slice.call(doc.querySelectorAll('section')).map(function (sec) {
        var h2 = sec.querySelector('h2[data-l="fa"]');
        var parts = [].slice.call(sec.children).filter(function (el) {
          return el.getAttribute('data-l') === 'fa' && el.tagName !== 'H2';
        }).map(function (el) {
          if (el.classList.contains('cue')) { return '<div class="cue">' + el.innerHTML + '</div>'; }
          var tag = el.tagName.toLowerCase();
          return '<' + tag + '>' + el.innerHTML + '</' + tag + '>';
        });
        return { title: h2 ? h2.textContent : '', html: parts.join('') };
      });
      return sections;
    });
  }

  var CSS = [
    ':root{--bg:#fbfaf8;--ink:#1d1b19;--mut:#6b655e;--line:#e7e2dc;--acc:#ff5c2f;--cue:#8a5a00;--cuebg:#fdf3e2;color-scheme:light}',
    '@media (prefers-color-scheme:dark){:root{--bg:#1a1917;--ink:#f2efeb;--mut:#a59e96;--line:#34302c;--cue:#f2b25a;--cuebg:#2e2414;color-scheme:dark}}',
    '*{box-sizing:border-box}html,body{margin:0;height:100%}',
    'body{background:var(--bg);color:var(--ink);font-family:Vazirmatn,Tahoma,system-ui,sans-serif;direction:rtl;display:flex;flex-direction:column}',
    '.bar{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line);flex:0 0 auto}',
    '.bar select{flex:1;min-width:0;font:600 13px Vazirmatn,Tahoma,sans-serif;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:4px 6px}',
    '.bar button{font:600 13px Vazirmatn,Tahoma,sans-serif;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:4px 9px;cursor:pointer;white-space:nowrap}',
    '.bar button:hover,.bar button:focus-visible{border-color:var(--acc);color:var(--acc);outline:none}',
    '.n{font-size:12px;color:var(--mut);white-space:nowrap}',
    '.body{flex:1 1 auto;overflow:auto;padding:4px 14px 18px;line-height:1.9}',
    '.body h3{font-size:1em;color:var(--acc);margin:16px 0 2px}',
    '.body p{margin:8px 0}.body ul{margin:4px 0 8px;padding-inline-start:20px}',
    '.body code{font-family:ui-monospace,Menlo,monospace;font-size:.88em;direction:ltr;unicode-bidi:embed}',
    '.cue{background:var(--cuebg);color:var(--cue);border-radius:6px;padding:4px 10px;margin:10px 0 6px;font-size:.88em;line-height:1.7}',
    '.err{padding:16px;color:var(--mut)}'
  ].join('');

  var win = null; /* the floating window */
  function render() {
    if (!win || win.closed) { return; }
    var d = win.document, s = sections[state.sec];
    var sel = d.getElementById('tpSel'), body = d.getElementById('tpBody');
    sel.innerHTML = sections.map(function (x, i) { return '<option value="' + i + '"' + (i === state.sec ? ' selected' : '') + '>' + x.title.replace(/</g, '&lt;') + '</option>'; }).join('');
    d.getElementById('tpN').textContent = (state.sec + 1).toLocaleString('fa-IR') + ' از ' + sections.length.toLocaleString('fa-IR');
    body.style.fontSize = state.size + 'px';
    body.innerHTML = '<h3>' + s.title.replace(/</g, '&lt;') + '</h3>' + s.html;
    body.scrollTop = 0;
    d.title = 'متن ارائه · ' + s.title;
    save();
  }
  function go(i) { state.sec = Math.max(0, Math.min(sections.length - 1, i)); render(); }
  function build(w) {
    win = w;
    var d = w.document;
    d.documentElement.lang = 'fa'; d.documentElement.dir = 'rtl';
    d.head.innerHTML = '<meta charset="utf-8"><title>متن ارائه</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600&display=swap"><style>' + CSS + '</style>';
    d.body.innerHTML = '<div class="bar"><button type="button" id="tpPrev" title="بخش قبلی">قبلی</button><select id="tpSel" aria-label="بخش ارائه"></select>' +
      '<span class="n" id="tpN"></span><button type="button" id="tpNext" title="بخش بعدی">بعدی</button>' +
      '<button type="button" id="tpSm" title="متن کوچک‌تر" aria-label="متن کوچک‌تر">A−</button><button type="button" id="tpLg" title="متن بزرگ‌تر" aria-label="متن بزرگ‌تر">A+</button></div>' +
      '<div class="body" id="tpBody"></div>';
    d.getElementById('tpPrev').onclick = function () { go(state.sec - 1); };
    d.getElementById('tpNext').onclick = function () { go(state.sec + 1); };
    d.getElementById('tpSel').onchange = function (e) { go(+e.target.value); };
    d.getElementById('tpSm').onclick = function () { state.size = Math.max(11, state.size - 1); render(); };
    d.getElementById('tpLg').onclick = function () { state.size = Math.min(26, state.size + 1); render(); };
    d.addEventListener('keydown', function (e) {
      if (e.altKey && e.shiftKey && (e.code === 'KeyP')) { e.preventDefault(); close(); return; }
      if (e.target.tagName === 'SELECT') { return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.sec + 1); }      /* RTL: left is forward */
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(state.sec - 1); }
    });
    w.addEventListener('pagehide', function () { win = null; });
    render();
  }
  function close() { if (win && !win.closed) { win.close(); } win = null; }
  function open() {
    /* the window is requested first, while the key press still counts as a user gesture; the text loads into it */
    var popup = function () { return window.open('', 'shahinTalkNotes', 'popup,width=560,height=320'); };
    var req = (window.documentPictureInPicture && documentPictureInPicture.requestWindow)
      ? documentPictureInPicture.requestWindow({ width: 560, height: 300 }).catch(function () { return popup(); })
      : Promise.resolve(popup());
    req.then(function (w) {
      if (!w) { return; }
      return load().then(function () { build(w); });
    }).catch(function () {
      if (window.Shahin && Shahin.toast) { Shahin.toast('متن ارائه بار نشد', 'The talk notes did not load'); }
    });
  }
  function toggle() { if (win && !win.closed) { close(); } else { open(); } }
  window.SH_TALK_PIP = { toggle: toggle, open: open, close: close,
    /* renders the notes into any window (used by tests) */
    mountInto: function (w) { return load().then(function () { build(w); }); } };
  document.addEventListener('keydown', function (e) {
    if (e.altKey && e.shiftKey && e.code === 'KeyP') { e.preventDefault(); toggle(); }
  });
})();
