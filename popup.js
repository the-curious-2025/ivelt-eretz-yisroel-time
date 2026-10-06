'use strict';

// Keep in sync with DEFAULTS in content.js.
const DEFAULTS = { sourceTz: 'America/New_York', targetTz: 'Asia/Jerusalem', format: 'weekday' };
const FORMATS = ['weekday', 'date', 'timeFirst', 'ampm'];

const $ = id => document.getElementById(id);

function zones(extra) {
  let list = [];
  try { list = Intl.supportedValuesOf('timeZone'); } catch (e) { /* older browser */ }
  for (const z of extra) if (!list.includes(z)) list.push(z);
  return list.filter(z => z !== 'Israel').sort();
}

function zoneLabel(z) {
  if (z === 'Asia/Jerusalem') return 'Eretz Yisroel (Jerusalem)';
  return z.replace(/_/g, ' ');
}

function fillZones(select, selected) {
  select.innerHTML = '';
  for (const z of zones([DEFAULTS.sourceTz, DEFAULTS.targetTz, selected])) {
    const o = document.createElement('option');
    o.value = z;
    o.textContent = zoneLabel(z);
    select.append(o);
  }
  select.value = selected;
}

// Same output as formatTarget() in content.js, used for the examples.
function sample(format, tz) {
  const f = new Intl.DateTimeFormat('he-IL', {
    timeZone: tz, weekday: 'short', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const p = {};
  for (const { type, value } of f.formatToParts(new Date())) p[type] = value;
  const date = `${p.month}/${p.day}/${p.year}`;
  const time = `${p.hour}:${p.minute}`;
  switch (format) {
    case 'date': return `${date} ${time}`;
    case 'timeFirst': return `${time} ${date}`;
    case 'ampm': {
      const h = +p.hour;
      return `${date} ${h % 12 || 12}:${p.minute} ${h < 12 ? 'AM' : 'PM'}`;
    }
    default: return `${p.weekday} ${date} ${time}`;
  }
}

function fillFormats(selected, tz) {
  const box = $('format');
  box.querySelectorAll('.opt').forEach(el => el.remove());
  for (const f of FORMATS) {
    const label = document.createElement('label');
    label.className = 'opt';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'format';
    input.value = f;
    input.checked = f === selected;
    const text = document.createElement('bdi');
    text.textContent = sample(f, tz);
    label.append(input, text);
    box.append(label);
  }
}

function render(cfg) {
  fillZones($('sourceTz'), cfg.sourceTz);
  fillZones($('targetTz'), cfg.targetTz);
  fillFormats(cfg.format, cfg.targetTz);
}

function current() {
  const checked = document.querySelector('input[name=format]:checked');
  return {
    sourceTz: $('sourceTz').value,
    targetTz: $('targetTz').value,
    format: checked ? checked.value : DEFAULTS.format
  };
}

let statusTimer = null;
function save(cfg) {
  chrome.storage.sync.set(cfg, () => {
    $('status').textContent = '\u05E0\u05E9\u05DE\u05E8';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { $('status').textContent = ''; }, 1500);
  });
}

chrome.storage.sync.get(DEFAULTS, cfg => {
  render(cfg);

  $('sourceTz').addEventListener('change', () => save(current()));
  $('targetTz').addEventListener('change', () => {
    const cfg = current();
    fillFormats(cfg.format, cfg.targetTz);
    save(cfg);
  });
  $('format').addEventListener('change', () => save(current()));
  $('reset').addEventListener('click', () => {
    render(DEFAULTS);
    save({ ...DEFAULTS });
  });
});
