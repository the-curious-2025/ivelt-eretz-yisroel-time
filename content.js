// ivelt Eretz Yisroel Time
// Rewrites forum dates from New York time to Eretz Yisroel time.
//
// Two ways a date is found:
//  1. <time datetime="..."> elements (phpBB 3.3). The attribute holds the exact
//     moment with its offset, so this path is always correct.
//  2. Plain text such as "Mon Oct 06, 2025 3:15 pm", "Today, 3:15 pm" or the same
//     with Yiddish/Hebrew month names. The text is read as New York wall time.
(() => {
  'use strict';

  const DEFAULTS = { sourceTz: 'America/New_York', targetTz: 'Asia/Jerusalem', format: 'weekday' };
  let cfg = { ...DEFAULTS };
  const DONE = 'data-ey-time';
  const ORIG = 'data-ey-orig';

  // Never touch what users wrote in their posts, signatures or quotes.
  const SKIP = 'script,style,textarea,input,select,option,code,pre,blockquote,' +
    '.content,.signature,[contenteditable],[' + DONE + ']';

  // ---------- time zone math ----------

  const dtfCache = {};
  function partsIn(ms, tz) {
    const f = dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
    const p = {};
    for (const { type, value } of f.formatToParts(new Date(ms))) p[type] = value;
    return { y: +p.year, m: +p.month - 1, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
  }

  // Minutes the zone is ahead of UTC at the given moment.
  function tzOffset(ms, tz) {
    const p = partsIn(ms, tz);
    const asUtc = Date.UTC(p.y, p.m, p.d, p.h, p.mi, p.s);
    return (asUtc - (ms - (((ms % 1000) + 1000) % 1000))) / 60000;
  }

  // Wall clock time in `tz` -> UTC milliseconds (handles DST changes).
  function wallToUtc(y, m, d, h, mi, tz) {
    const guess = Date.UTC(y, m, d, h, mi);
    let utc = guess - tzOffset(guess, tz) * 60000;
    utc = guess - tzOffset(utc, tz) * 60000;
    return utc;
  }

  // Formats offered in the settings popup.
  //   weekday: "\u05D9\u05D5\u05DD \u05D1\u05F3 10/06/2025 22:15"   date: "10/06/2025 22:15"
  //   timeFirst: "22:15 10/06/2025"         ampm: "10/06/2025 10:15 PM"
  let outFmt = null;
  function buildFormatter() {
    outFmt = new Intl.DateTimeFormat('he-IL', {
      timeZone: cfg.targetTz, weekday: 'short',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  }
  function formatTarget(ms) {
    const p = {};
    for (const { type, value } of outFmt.formatToParts(new Date(ms))) p[type] = value;
    const date = `${p.month}/${p.day}/${p.year}`;
    const time = `${p.hour}:${p.minute}`;
    switch (cfg.format) {
      case 'date': return `${date} ${time}`;
      case 'timeFirst': return `${time} ${date}`;
      case 'ampm': {
        const h = +p.hour;
        return `${date} ${h % 12 || 12}:${p.minute} ${h < 12 ? 'AM' : 'PM'}`;
      }
      default: return `${p.weekday} ${date} ${time}`;
    }
  }
  function targetLabel() {
    if (cfg.targetTz === 'Asia/Jerusalem') return 'Eretz Yisroel time';
    return cfg.targetTz.split('/').pop().replace(/_/g, ' ');
  }

  // ---------- text parsing ----------

  const NIKUD = '[\\u0591-\\u05C7]*';
  const HEB = '\\u05D0-\\u05EA';
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fuzzyHeb = w => w.split('').map(esc).join(NIKUD);

  function wordAlt(words) {
    const latin = words.filter(w => /^[a-z.]+$/i.test(w)).sort((a, b) => b.length - a.length);
    const heb = words.filter(w => !/^[a-z.]+$/i.test(w)).sort((a, b) => b.length - a.length);
    const parts = [];
    if (latin.length) parts.push(`(?<![a-z])(?:${latin.map(esc).join('|')})(?![a-z])`);
    if (heb.length) parts.push(`(?<![${HEB}])\u05D1?${NIKUD}(?:${heb.map(fuzzyHeb).join('|')})(?![${HEB}])`);
    return parts.join('|');
  }

  // English, Yiddish and Hebrew spellings.
  const MONTHS = [
    ['january', 'jan', '\u05D9\u05D0\u05E0\u05D5\u05D0\u05E8', '\u05D9\u05E0\u05D5\u05D0\u05E8'],
    ['february', 'feb', '\u05E4\u05E2\u05D1\u05E8\u05D5\u05D0\u05E8', '\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8'],
    ['march', 'mar', '\u05DE\u05E2\u05E8\u05E5', '\u05DE\u05D0\u05E8\u05E5', '\u05DE\u05E8\u05E5', '\u05DE\u05E8\u05E1'],
    ['april', 'apr', '\u05D0\u05E4\u05E8\u05D9\u05DC', '\u05D0\u05E4\u05BC\u05E8\u05D9\u05DC'],
    ['may', '\u05DE\u05D9\u05D9', '\u05DE\u05D0\u05D9'],
    ['june', 'jun', '\u05D9\u05D5\u05E0\u05D9'],
    ['july', 'jul', '\u05D9\u05D5\u05DC\u05D9'],
    ['august', 'aug', '\u05D0\u05D5\u05D9\u05D2\u05D5\u05E1\u05D8', '\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8'],
    ['september', 'sept', 'sep', '\u05E1\u05E2\u05E4\u05D8\u05E2\u05DE\u05D1\u05E2\u05E8', '\u05E1\u05E2\u05E4\u05D8\u05E2\u05DE\u05D1\u05E8', '\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8'],
    ['october', 'oct', '\u05D0\u05E7\u05D8\u05D0\u05D1\u05E2\u05E8', '\u05D0\u05E7\u05D8\u05D0\u05D1\u05E8', '\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8'],
    ['november', 'nov', '\u05E0\u05D0\u05D5\u05D5\u05E2\u05DE\u05D1\u05E2\u05E8', '\u05E0\u05D0\u05D5\u05D5\u05E2\u05DE\u05D1\u05E8', '\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8'],
    ['december', 'dec', '\u05D3\u05E2\u05E6\u05E2\u05DE\u05D1\u05E2\u05E8', '\u05D3\u05E2\u05E6\u05E2\u05DE\u05D1\u05E8', '\u05D3\u05E6\u05DE\u05D1\u05E8']
  ];
  const MONTH_RE = new RegExp(MONTHS.map(m => `(${wordAlt(m)})`).join('|'), 'i');

  const WEEKDAYS = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    'sun', 'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat',
    '\u05D6\u05D5\u05E0\u05D8\u05D0\u05D2', '\u05DE\u05D0\u05E0\u05D8\u05D0\u05D2', '\u05D3\u05D9\u05E0\u05E1\u05D8\u05D0\u05D2', '\u05DE\u05D9\u05D8\u05D5\u05D5\u05D0\u05DA', '\u05D3\u05D0\u05E0\u05E2\u05E8\u05E9\u05D8\u05D0\u05D2', '\u05E4\u05E8\u05D9\u05D9\u05D8\u05D0\u05D2', '\u05E9\u05D1\u05EA \u05E7\u05D5\u05D3\u05E9', '\u05E9\u05D1\u05EA',
    '\u05D9\u05D5\u05DD \u05E8\u05D0\u05E9\u05D5\u05DF', '\u05D9\u05D5\u05DD \u05E9\u05E0\u05D9', '\u05D9\u05D5\u05DD \u05E9\u05DC\u05D9\u05E9\u05D9', '\u05D9\u05D5\u05DD \u05E8\u05D1\u05D9\u05E2\u05D9', '\u05D9\u05D5\u05DD \u05D7\u05DE\u05D9\u05E9\u05D9', '\u05D9\u05D5\u05DD \u05E9\u05D9\u05E9\u05D9', '\u05E8\u05D0\u05E9\u05D5\u05DF', '\u05E9\u05E0\u05D9',
    '\u05E9\u05DC\u05D9\u05E9\u05D9', '\u05E8\u05D1\u05D9\u05E2\u05D9', '\u05D7\u05DE\u05D9\u05E9\u05D9', '\u05E9\u05D9\u05E9\u05D9'
  ];
  const WEEKDAY_END_RE = new RegExp(`(?:${wordAlt(WEEKDAYS)})[,.\\s]*$`, 'i');

  const AMPM = 'a\\.?m\\.?|p\\.?m\\.?|\u05E4\u05D0\u05E8\u05DE\u05D9\u05D8\u05D0\u05D2|\u05E0\u05D0\u05DB\u05DE\u05D9\u05D8\u05D0\u05D2|\u05DC\u05E4\u05E0\u05D4["\u05F4]\u05E6|\u05D0\u05D7\u05D4["\u05F4]\u05E6';
  const TIME_RE = new RegExp(`(?<![\\d:])(\\d{1,2}):(\\d{2})(?::\\d{2})?(?!\\d)(?:\\s*(${AMPM})(?![a-z]))?`, 'i');
  const YEAR_RE = /(?<!\d)((?:19|20)\d{2})(?!\d)/;
  const NUM_DATE_RE = /(?<!\d)(\d{1,4})([./-])(\d{1,2})\2(\d{2,4})(?!\d)/;
  const REL_RE = new RegExp(`(?<![a-z])(today|yesterday)(?![a-z])|(?<![${HEB}])(\u05D4\u05D9\u05D9\u05E0\u05D8|\u05E0\u05E2\u05DB\u05D8\u05DF|\u05D4\u05D9\u05D5\u05DD|\u05D0\u05EA\u05DE\u05D5\u05DC)(?![${HEB}])`, 'i');
  const SRC_TZ_RE = /UTC\s*[-\u2212]\s*0?[45](?::00)?(?!\d)|\b(?:EST|EDT)\b|America\/New[ _]York/;

  // Returns { start, end, ms } for the date found in `text`, or null.
  function parse(text) {
    const t = TIME_RE.exec(text);
    if (!t) return null;
    let h = +t[1];
    const mi = +t[2];
    if (h > 23 || mi > 59) return null;
    if (t[3]) {
      if (h > 12 || h === 0) return null;
      const pm = /^(p|\u05E0\u05D0\u05DB|\u05D0\u05D7\u05D4)/i.test(t[3]);
      h = (h % 12) + (pm ? 12 : 0);
    }

    let y, m, d;
    const spans = [[t.index, t.index + t[0].length]];

    const mm = MONTH_RE.exec(text);
    const rel = REL_RE.exec(text);
    const num = NUM_DATE_RE.exec(text);

    if (mm) {
      m = mm.slice(1).findIndex(Boolean);
      const mEnd = mm.index + mm[0].length;
      spans.push([mm.index, mEnd]);
      const after = /^[\s,.]*(\d{1,2})(?![\d:])/.exec(text.slice(mEnd));
      const before = /(\d{1,2})(?:st|nd|rd|th)?\.?\s*$/i.exec(text.slice(0, mm.index));
      if (after) {
        d = +after[1];
        spans.push([mEnd, mEnd + after[0].length]);
      } else if (before) {
        d = +before[1];
        spans.push([before.index, mm.index]);
      } else return null;
      const yr = YEAR_RE.exec(text);
      if (!yr) return null;
      y = +yr[1];
      spans.push([yr.index, yr.index + yr[0].length]);
    } else if (rel) {
      const ny = partsIn(Date.now(), cfg.sourceTz);
      const day = new Date(Date.UTC(ny.y, ny.m, ny.d));
      if (/yesterday|\u05E0\u05E2\u05DB\u05D8\u05DF|\u05D0\u05EA\u05DE\u05D5\u05DC/i.test(rel[0])) day.setUTCDate(day.getUTCDate() - 1);
      y = day.getUTCFullYear(); m = day.getUTCMonth(); d = day.getUTCDate();
      spans.push([rel.index, rel.index + rel[0].length]);
    } else if (num) {
      const a = +num[1], b = +num[3], c = +num[4];
      if (num[1].length === 4) { y = a; m = b - 1; d = c; }          // 2025-10-06
      else if (num[2] === '/') { m = a - 1; d = b; y = c; }          // 10/06/2025 (US)
      else { d = a; m = b - 1; y = c; }                               // 06.10.2025
      if (y < 100) y += 2000;
      spans.push([num.index, num.index + num[0].length]);
    } else return null;

    if (!(m >= 0 && m <= 11 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100)) return null;

    let start = Math.min(...spans.map(s => s[0]));
    const end = Math.max(...spans.map(s => s[1]));
    const wd = WEEKDAY_END_RE.exec(text.slice(0, start));
    if (wd) start = wd.index;
    if (end - start > 70) return null; // pieces too far apart, probably not one date

    return { start, end, ms: wallToUtc(y, m, d, h, mi, cfg.sourceTz) };
  }

  // ---------- DOM ----------
  // Converted pieces keep their original text in data-ey-orig, so the page can be
  // re-rendered when the settings change. No title/tooltip is added on purpose.

  function handleTime(el) {
    if (el.hasAttribute(DONE) || (el.parentElement && el.parentElement.closest(SKIP))) return;
    const ms = Date.parse(el.getAttribute('datetime'));
    if (isNaN(ms)) return;
    el.setAttribute(ORIG, el.textContent);
    el.setAttribute(DONE, '1');
    el.textContent = formatTarget(ms);
  }

  function replacePart(node, start, end, text) {
    const v = node.nodeValue;
    const span = document.createElement('span');
    span.setAttribute(DONE, '1');
    span.setAttribute(ORIG, v.slice(start, end));
    span.textContent = text;
    const frag = document.createDocumentFragment();
    if (start > 0) frag.append(v.slice(0, start));
    frag.append(span);
    if (end < v.length) frag.append(v.slice(end));
    node.replaceWith(frag);
  }

  function handleText(node) {
    const v = node.nodeValue;
    if (!v || v.length > 200) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP) || parent.closest('time[datetime]')) return;

    // Footer note like "All times are UTC-05:00".
    const tz = cfg.sourceTz === DEFAULTS.sourceTz && SRC_TZ_RE.exec(v);
    if (tz) {
      replacePart(node, tz.index, tz.index + tz[0].length, targetLabel());
      return;
    }
    if (!/\d:\d\d/.test(v)) return;

    const r = parse(v);
    if (r) replacePart(node, r.start, r.end, formatTarget(r.ms));
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) { handleText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('time[datetime]')) handleTime(root);
    root.querySelectorAll('time[datetime]').forEach(handleTime);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(handleText);
  }

  // Put back the forum's original text everywhere.
  function restoreAll() {
    document.querySelectorAll('[' + DONE + ']').forEach(el => {
      const orig = el.getAttribute(ORIG) || '';
      if (el.tagName === 'TIME') {
        el.textContent = orig;
        el.removeAttribute(DONE);
        el.removeAttribute(ORIG);
      } else {
        const parent = el.parentNode;
        el.replaceWith(orig);
        if (parent) parent.normalize();
      }
    });
  }

  function applySettings(stored) {
    cfg = { ...DEFAULTS, ...stored };
    try {
      buildFormatter();
    } catch (e) { // unknown time zone name
      cfg = { ...DEFAULTS };
      buildFormatter();
    }
  }

  function start() {
    scan(document.body);

    // Content loaded later (quick reply, AJAX pagination, etc.)
    let pending = [];
    let timer = null;
    new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) pending.push(n);
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          const batch = pending;
          pending = [];
          batch.forEach(n => { if (n.isConnected) scan(n); });
        }, 50);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  const storage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  if (storage) {
    storage.get(DEFAULTS, stored => {
      applySettings(stored);
      start();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const next = { ...cfg };
      for (const k of Object.keys(changes)) next[k] = changes[k].newValue;
      applySettings(next);
      restoreAll();
      scan(document.body);
    });
  } else {
    applySettings({});
    start();
  }

  // Exposed for testing only.
  if (window.__ivTest) window.__ivTest({ applySettings, restoreAll, scan });
})();
