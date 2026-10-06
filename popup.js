'use strict';

// Keep in sync with TARGETS and DEFAULTS in content.js.
const TARGETS = ['Asia/Jerusalem', 'Europe/London'];
const DEFAULTS = { targetTz: 'Asia/Jerusalem', format: 'weekday' };

const $ = id => document.getElementById(id);
const checked = name => document.querySelector(`input[name=${name}]:checked`).value;

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
  return { targetTz: checked('targetTz'), format: checked('format') };
}

function render(cfg) {
  for (const name of ['targetTz', 'format']) {
    (document.querySelector(`input[name=${name}][value="${cfg[name]}"]`) ||
      document.querySelector(`input[name=${name}]`)).checked = true;
  }
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
  if (!TARGETS.includes(cfg.targetTz)) cfg.targetTz = DEFAULTS.targetTz;
  render(cfg);
  document.addEventListener('change', () => { renderPreview(); save(); });
  $('reset').addEventListener('click', () => { render(DEFAULTS); save(); });
});
