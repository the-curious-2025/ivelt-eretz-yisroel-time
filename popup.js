'use strict';

// Keep in sync with DEFAULTS in content.js.
const DEFAULTS = { sourceTz: 'America/New_York', targetTz: 'Asia/Jerusalem', format: 'weekday' };

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

// Same output as formatTarget() in content.js, used for the preview.
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

function current() {
  const checked = document.querySelector('input[name=format]:checked');
  return {
    sourceTz: $('sourceTz').value,
    targetTz: $('targetTz').value,
    format: checked ? checked.value : DEFAULTS.format
  };
}

function render(cfg) {
  fillZones($('sourceTz'), cfg.sourceTz);
  fillZones($('targetTz'), cfg.targetTz);
  const radio = document.querySelector(`input[name=format][value="${cfg.format}"]`) ||
    document.querySelector('input[name=format]');
  radio.checked = true;
  renderPreview();
}

function renderPreview() {
  const cfg = current();
  $('preview').textContent = sample(cfg.format, cfg.targetTz);
}

let savedTimer;
function save() {
  const saved = $('saved');
  chrome.storage.sync.set(current(), () => {
    const err = chrome.runtime && chrome.runtime.lastError;
    saved.textContent = err ? 'Could not save: ' + err.message : 'Saved';
    saved.classList.toggle('error', !!err);
    saved.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => saved.classList.remove('show'), err ? 6000 : 1200);
  });
}

chrome.storage.sync.get(DEFAULTS, cfg => {
  render(cfg);
  document.addEventListener('change', () => { renderPreview(); save(); });
  $('reset').addEventListener('click', () => { render(DEFAULTS); save(); });
});
