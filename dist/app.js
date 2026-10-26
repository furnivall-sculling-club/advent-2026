const calendar = document.querySelector('#calendar');
// Temporary testing default. Set PREVIEW_DEFAULT to false before December.
const PREVIEW_DEFAULT = true;
const previewParameter = new URLSearchParams(location.search).get('preview');
const preview = { checked: previewParameter === null ? PREVIEW_DEFAULT : previewParameter === '1' };
const doorOrder = [7, 18, 3, 22, 11, 1, 14, 5, 24, 9, 16, 20, 2, 13, 8, 19, 4, 23, 17, 6, 21, 10, 15, 12];
const doorColours = ["myrtle", "mauve", "myrtle", "slate", "gold", "blue", "mauve", "myrtle", "slate", "rose", "slate", "mauve", "gold", "blue", "rose", "slate", "myrtle", "gold", "blue", "mauve", "blue", "rose", "gold", "rose"];
const doorRibbons = ['bottom', 'corner-right', 'corner-left', 'corner-left', 'right', 'corner-right', 'left', 'left', 'top', 'left', 'top', 'left', 'top', 'bottom', 'corner-right', 'right', 'right', 'corner-left', 'right', 'bottom', 'corner-right', 'corner-left', 'top', 'bottom'];
const modal = document.querySelector('#door-dialog');
const icons = [
  '<path d="M20 2 10 13h6L7 23h26L24 13h6Z M20 23v6"/>',
  '<path d="M20 2v26M20 10C7 10 8 2 20 10ZM20 17C5 17 7 8 20 17ZM20 24C5 24 7 15 20 24ZM20 10C33 10 32 2 20 10ZM20 17C35 17 33 8 20 17ZM20 24C35 24 33 15 20 24Z"/>',
  '<path d="m20 1 3 10 10 1-8 7 3 10-8-6-8 6 3-10-8-7 10-1Z"/>',
  '<path d="M10 12h20v16H10ZM7 9h26v6H7ZM20 9v19M20 9C3 8 13-5 20 9Zm0 0c17-1 7-14 0 0Z"/>',
  '<circle cx="20" cy="16" r="10" stroke-dasharray="3 2"/><path d="m15 6 5 4 5-4M17 2h6l-3 8"/>',
  '<path d="M20 1v28M7 8l26 14M7 22 33 8M16 4l4 4 4-4M16 26l4-4 4 4"/>'
];
let currentYear = new Date().getFullYear();
let opened = new Set();
let previewOpened = new Set();
let activeDoor = null;
let closing = false;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const progressKey = (isPreview) => `oars-advent-${isPreview ? 'preview-' : ''}${currentYear}`;
function readSet(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(value) ? value.filter(n => Number.isInteger(n) && n >= 1 && n <= 24) : []);
  } catch { return new Set(); }
}
function readProgress() {
  opened = readSet(progressKey(false));
  previewOpened = readSet(progressKey(true));
}
readProgress();
function available(day, date = new Date()) {
  return date.getMonth() === 11 && date.getDate() >= day;
}
function save() {
  try {
    localStorage.setItem(progressKey(preview.checked), JSON.stringify([...(preview.checked ? previewOpened : opened)]));
  } catch { toast('Your browser could not save progress. You can still enjoy every door.'); }
}
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('visible'), 3500);
}

function render() {
  const now = new Date();
  if (now.getFullYear() !== currentYear) { currentYear = now.getFullYear(); readProgress(); }
  const progress = preview.checked ? previewOpened : opened;
  calendar.replaceChildren();
  for (const day of doorOrder) {
    const unlocked = preview.checked || available(day, now);
    const seen = progress.has(day);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'door' + (seen ? ' viewed' : '') + (!preview.checked && now.getMonth() === 11 && now.getDate() === day ? ' today' : '');
    button.dataset.day = day;
    button.dataset.colour = doorColours[doorOrder.indexOf(day)];
    button.dataset.ribbon = doorRibbons[doorOrder.indexOf(day)];
    button.setAttribute('aria-label', `December ${day}, ${seen ? 'opened' : unlocked ? 'ready to open' : 'locked until December ' + day}`);
    button.setAttribute('aria-disabled', String(!unlocked));
    button.innerHTML = `<span class="door-face"><span class="ribbon" aria-hidden="true"></span>${seen ? '<span class="opened-mark" aria-hidden="true">✓</span>' : ''}<span class="door-art" aria-hidden="true"><svg viewBox="0 0 40 30">${icons[(day - 1) % 6]}</svg></span><span class="number">${day.toString().padStart(2, '0')}</span></span>`;
    button.addEventListener('click', () => openDoor(day, button));
    calendar.append(button);
  }
}
function openDoor(day, button) {
  if (modal.open || closing) return;
  if (!preview.checked && !available(day)) { toast(`A little patience, crew. This door opens on ${day} December.`); return; }
  activeDoor = day;
  const origin = button.getBoundingClientRect();
  const content = window.ADVENT_CONTENT.find(item => item.day === day) || { title: 'Coming soon', body: 'Your coach’s surprise will be here soon.' };
  document.querySelector('#modal-day').textContent = `DECEMBER ${day} · ${preview.checked ? 'PREVIEW' : 'FOR THE CREW'}`;
  document.querySelector('#modal-title').textContent = content.title;
  document.querySelector('#modal-body').textContent = content.body;
  const link = document.querySelector('#modal-link');
  link.hidden = true;
  link.removeAttribute('href');
  try { const url = new URL(content.link); if (url.protocol === 'https:') { link.href = url.href; link.hidden = false; } } catch {}
  (preview.checked ? previewOpened : opened).add(day);
  save();
  // Both animations begin in the same frame; no timeout between door and message.
  modal.style.setProperty('--from-x', `${origin.left + origin.width / 2 - innerWidth / 2}px`);
  modal.style.setProperty('--from-y', `${origin.top + origin.height / 2 - innerHeight / 2}px`);
  button.classList.add('open');
  modal.showModal();
}
function closeDoor() {
  if (!modal.open || closing) return;
  if (reducedMotion()) { modal.close(); return; }
  closing = true;
  modal.classList.add('closing');
  const animation = modal.getAnimations().find(a => a.animationName === 'gift-close');
  if (animation) animation.finished.catch(() => {}).then(() => modal.close());
  else modal.close();
}
modal.addEventListener('cancel', event => { event.preventDefault(); closeDoor(); });
modal.addEventListener('close', () => {
  closing = false;
  modal.classList.remove('closing');
  render();
  calendar.querySelector(`[data-day="${activeDoor}"]`)?.focus({ preventScroll: true });
});
for (const dialog of document.querySelectorAll('dialog')) {
  const close = () => dialog === modal ? closeDoor() : dialog.close();
  dialog.querySelector('.close').onclick = close;
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
}
document.querySelector('#back').onclick = closeDoor;
window.addEventListener('storage', event => {
  if (event.key === null || event.key === progressKey(false) || event.key === progressKey(true)) {
    readProgress(); if (!modal.open) render();
  }
});
let renderedDate = new Date().toDateString();
setInterval(() => {
  const date = new Date().toDateString();
  if (date !== renderedDate && !modal.open) { renderedDate = date; render(); }
}, 10000);
render();
