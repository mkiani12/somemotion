/**
 * shahin-funnel.js — Canonical funnel component for events-* dashboards
 */
(function() {
  'use strict';

  window.shFunnel = function(domId, stages, opts) {
    opts = opts || {};
    var el = document.getElementById(domId);
    if (!el || !stages || !stages.length) return;

    function lang() {
      return (window.Shahin && window.Shahin.lang) ? window.Shahin.lang() : (localStorage.getItem('shahin-lang') || 'en');
    }
    function tok(name) {
      return getComputedStyle(document.body).getPropertyValue(name).trim();
    }
    function faNum(value) {
      return lang() === 'fa' ? String(value).replace(/\d/g, function(digit) { return '۰۱۲۳۴۵۶۷۸۹'[digit]; }).replace('.', '٫') : value;
    }
    function faLoc(value) {
      return Number(value).toLocaleString(lang() === 'fa' ? 'fa-IR' : 'en-US');
    }

    var isFa = lang() === 'fa';
    var unit = isFa ? (opts.unitFa || 'کاربر') : (opts.unitEn || 'users');
    var base = stages[0].n;
    var finalN = stages[stages.length - 1].n;
    var overallConv = (finalN / base * 100).toFixed(1);
    var data = stages.map(function(stage, index) {
      return {
        label: isFa ? stage.fa : stage.en,
        n: stage.n,
        pctOfBase: stage.n / base * 100,
        conversion: index > 0 ? stage.n / stages[index - 1].n * 100 : 100,
        tip: stage.tip
      };
    });

    var worst = null;
    data.forEach(function(item, index) {
      if (index > 0 && (!worst || item.conversion < worst.conversion)) worst = item;
    });

    var height = opts.height || 280;
    var barHeight = opts.barHeight || 96;
    var html = '<div style="display:flex;flex-direction:column;gap:16px;padding:20px 0">';
    html += '<div style="display:flex;align-items:flex-start;justify-content:center;gap:16px;min-height:' + (height - 100) + 'px">';
    data.forEach(function(item, index) {
      var barWidth = Math.max(item.pctOfBase, 4);
      html += '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1 1 0;min-width:0">';
      html += '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1.1">';
      html += '<div style="font-size:15px;font-weight:800;color:var(--sh-text)">' + faLoc(item.n) + '</div>';
      if (index > 0) html += '<div style="font-size:10px;font-weight:600;color:var(--sh-muted)">' + faNum(item.conversion.toFixed(0)) + (isFa ? '٪' : '%') + '</div>';
      html += '</div>';
      html += '<div style="width:' + barWidth + '%;height:' + barHeight + 'px;background:' + tok('--sh-c2') + ';border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.08)"' + (item.tip ? ' title="' + item.tip.replace(/"/g, '&quot;') + '"' : '') + '></div>';
      html += '<div style="font-size:11px;color:var(--sh-text-2);text-align:center;line-height:1.4;max-width:100px">' + item.label + '</div>';
      html += '</div>';
    });
    html += '</div><div style="display:flex;align-items:center;justify-content:center;gap:20px;padding-top:12px;border-top:1px solid var(--sh-border);font-size:12px;color:var(--sh-muted)">';
    html += '<div style="display:flex;align-items:baseline;gap:6px"><span>' + (isFa ? 'تبدیل کل — ' : 'Overall conversion — ') + '</span><span style="font-size:15px;font-weight:800;color:' + tok('--sh-c2') + '">' + faNum(overallConv) + (isFa ? '٪' : '%') + '</span></div>';
    if (worst) html += '<div style="display:flex;align-items:baseline;gap:6px"><span>' + (isFa ? 'بیشترین ریزش — ' + worst.label + ': ' : 'Biggest drop-off — ' + worst.label + ': ') + '</span><span style="font-size:13px;font-weight:700;color:var(--sh-bad)">' + faNum((100 - worst.conversion).toFixed(1)) + (isFa ? '٪' : '%') + '</span></div>';
    html += '</div></div>';
    el.innerHTML = html;
    if (opts.height) el.style.minHeight = height + 'px';
  };
})();
