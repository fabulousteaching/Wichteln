import { $, esc, api, ApiError, storage, liveUpdates, startSnow, sparkle, sleep, toast, ask, askText, copyText, reducedMotion } from './common.js';
import { elfSvg, giftSvg, treeSvg, hillsSvg, pencilSvg, checkSvg, mountGarland, mountStars } from './art.js';
import { sound } from './sound.js';

const STAGE_W = 1600;
const STAGE_H = 900;
const GROUND_H = 460;

const code = decodeURIComponent(location.pathname.split('/').pop() || '').toUpperCase();
const stage = $('#stage');
const slotsEl = $('#slots');

let token = null;
let state = null;
let layoutKey = '';
const slots = new Map(); // childId -> { el, x, y, s, row, giftEl, status }
const knownStatus = new Map(); // childId -> zuletzt gesehener Status
let parading = false;
let drawerOpen = false;
let scale = 1;

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function readToken() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const fromHash = hash.get('t');
  const key = `wichtel:admin:${code}`;
  if (fromHash) {
    storage.set(key, fromHash);
    // Token nicht in der Adresszeile stehen lassen (Beamer!)
    history.replaceState(null, '', location.pathname);
  }
  return fromHash || storage.get(key);
}

function rememberRound() {
  const list = storage.get('wichtel:rounds', []);
  const entry = { code, title: state.round.title, created_at: state.round.created_at, count: state.children.length };
  const idx = list.findIndex((r) => r.code === code);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.unshift(entry);
  storage.set('wichtel:rounds', list.slice(0, 30));
}

function showError(title, text) {
  stage.hidden = true;
  $('#toolbar').hidden = true;
  $('#errorView').hidden = false;
  $('#errorTitle').textContent = title;
  $('#errorText').textContent = text;
}

function fitStage() {
  scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.setProperty('--scale', scale.toFixed(4));
  $('#ground').style.height = `${Math.round(GROUND_H * scale)}px`;
}

function toStageViewport(x, y) {
  const r = stage.getBoundingClientRect();
  return { x: r.left + x * scale, y: r.top + y * scale };
}

async function init() {
  mountStars($('#stars'));
  mountGarland($('#garland'));
  startSnow($('#snow'));
  $('#ground').innerHTML = hillsSvg({ width: STAGE_W, height: GROUND_H });
  fitStage();
  window.addEventListener('resize', fitStage);

  token = readToken();
  if (!code || !token) {
    showError(
      'Lehrer-Link fehlt',
      'Diese Seite braucht den geheimen Lehrer-Link, den du beim Erstellen der Wichtelrunde bekommen hast. Öffne die Runde über die Startseite (auf dem Gerät, auf dem du sie erstellt hast) oder verwende den Lehrer-Link.',
    );
    return;
  }

  $('#tree').innerHTML = treeSvg();
  updateSoundButton();
  setupToolbar();

  try {
    state = await api('GET', `/api/rounds/${code}/admin`, { headers: { 'X-Admin-Token': token } });
  } catch (err) {
    if (err.status === 403) {
      showError('Kein Zugriff', 'Der Lehrer-Link stimmt nicht. Bitte öffne die Runde mit dem richtigen Lehrer-Link.');
    } else if (err.status === 404) {
      showError('Runde nicht gefunden', 'Diese Wichtelrunde gibt es nicht (mehr).');
    } else {
      showError('Verbindungsproblem', err.message);
    }
    return;
  }

  stage.hidden = false;
  $('#toolbar').hidden = false;
  rememberRound();
  setupQr();
  render({ initial: true });

  liveUpdates(code, async (type) => {
    if (type === 'deleted') {
      showError('Runde gelöscht', 'Diese Wichtelrunde wurde gelöscht.');
      return;
    }
    await refresh();
  });

  $('#goButton').addEventListener('click', onGo);
}

async function refresh() {
  try {
    const next = await api('GET', `/api/rounds/${code}/admin`, { headers: { 'X-Admin-Token': token } });
    const justDrawn = !state.round.drawn_at && next.round.drawn_at;
    state = next;
    if (justDrawn && next.server_now - next.round.drawn_at < 5000 && !parading) {
      render();
      runParade();
      return;
    }
    render();
  } catch (err) {
    if (err.status === 404) showError('Runde nicht gefunden', 'Diese Wichtelrunde gibt es nicht (mehr).');
  }
}

// ---------------------------------------------------------------------------
// QR-Code
// ---------------------------------------------------------------------------

function setupQr() {
  $('#qrImg').src = `/api/rounds/${code}/qr.svg?v=${Date.now()}`;
  $('#qrUrl').textContent = state.kid_url.replace(/^https?:\/\//, '');
  $('#qrCode').textContent = code;
}

// ---------------------------------------------------------------------------
// Darstellung
// ---------------------------------------------------------------------------

function statusOf(child) {
  if (state.round.drawn_at) return child.revealed ? 'revealed' : 'drawn';
  if (child.done) return 'done';
  if (child.claimed) return 'writing';
  return 'open';
}

/** Verteilt die Namensschilder in Reihen auf der Schneewiese. */
function computeLayout(n) {
  const xMin = 80;
  const xMax = 1520;
  const width = xMax - xMin;
  const yBack = 622;
  const yFront = 872;
  let rows = 1;
  let g = 1;
  let caps = [];
  let scales = [];
  const scalesFor = (r) => Array.from({ length: r }, (_, i) => g * (r === 1 ? 1 : 0.8 + (0.2 * i) / (r - 1)));
  for (;;) {
    scales = scalesFor(rows);
    caps = scales.map((s) => Math.floor(width / (156 * s)));
    if (caps.reduce((a, b) => a + b, 0) >= n) break;
    if (rows < 4) rows++;
    else g -= 0.05;
    if (g < 0.4) break;
  }
  const counts = Array(rows).fill(Math.floor(n / rows));
  for (let i = 0; i < n % rows; i++) counts[rows - 1 - i]++;
  // Überläufe nach vorne schieben
  for (let i = 0; i < rows; i++) {
    while (counts[i] > caps[i] && i < rows - 1) {
      counts[i]--;
      counts[i + 1]++;
    }
  }
  const out = [];
  for (let r = 0; r < rows; r++) {
    const y = rows === 1 ? 800 : yBack + ((yFront - yBack) * r) / (rows - 1);
    const step = width / counts[r];
    for (let j = 0; j < counts[r]; j++) {
      const k = out.length;
      const jitterX = ((k * 37) % 17) - 8;
      const jitterY = ((k * 53) % 11) - 5;
      out.push({ x: xMin + step * (j + 0.5) + jitterX, y: y + jitterY, s: scales[r], row: r });
    }
  }
  return out;
}

function buildSlots() {
  slotsEl.innerHTML = '';
  slots.clear();
  const layout = computeLayout(state.children.length);
  state.children.forEach((child, i) => {
    const pos = layout[i];
    const el = document.createElement('div');
    el.className = 'slot';
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.zIndex = String(10 + pos.row * 10);
    el.innerHTML = `
      <div class="slot-inner" style="--s:${pos.s}">
        <div class="ground-shadow"></div>
        <div class="stick"></div>
        <div class="sign"><span class="sign-name"></span><span class="sign-status"></span></div>
        <div class="slot-gift" hidden>${giftSvg(child.id)}</div>
      </div>`;
    slotsEl.appendChild(el);
    slots.set(child.id, { el, ...pos, giftEl: el.querySelector('.slot-gift'), status: null, child });
  });
}

function setSlotStatus(slot, status, { animate }) {
  const prev = slot.status;
  slot.status = status;
  slot.el.classList.remove('open', 'writing', 'done', 'drawn', 'revealed');
  slot.el.classList.add(status);
  const icon = slot.el.querySelector('.sign-status');
  icon.innerHTML = status === 'writing' ? pencilSvg() : status === 'revealed' ? checkSvg() : '';

  const gift = slot.giftEl;
  if (status === 'done') {
    if (prev !== 'done') {
      gift.hidden = false;
      gift.classList.remove('idle');
      if (animate && !reducedMotion) {
        gift.classList.add('drop');
        setTimeout(() => {
          gift.classList.remove('drop');
          gift.classList.add('idle');
          const p = toStageViewport(slot.x + 28 * slot.s, slot.y - 30 * slot.s);
          sparkle(p.x, p.y, { count: 12, spread: 70 * scale + 20 });
          sound.pling();
        }, 620);
        setTimeout(() => gift.classList.remove('drop'), 950);
      } else {
        gift.classList.add('idle');
      }
    }
  } else if (!(parading && prev === 'done')) {
    gift.hidden = true;
  }
}

function render({ initial = false } = {}) {
  const { round, children } = state;
  $('#classTitle').textContent = round.title;
  document.title = `Wichteln – ${round.title}`;

  const key = children.map((c) => `${c.id}:${c.name}`).join('|');
  if (key !== layoutKey) {
    layoutKey = key;
    buildSlots();
  }
  for (const child of children) {
    const slot = slots.get(child.id);
    slot.el.querySelector('.sign-name').textContent = child.name;
    const status = statusOf(child);
    // Nur echte Änderungen animieren (z. B. ein Geschenk, das gerade eingepackt wurde)
    const before = knownStatus.get(child.id);
    knownStatus.set(child.id, status);
    if (parading && slot.status === 'done') continue;
    if (status !== slot.status) setSlotStatus(slot, status, { animate: !initial && before !== undefined && before !== status });
  }

  const total = children.length;
  const done = children.filter((c) => c.done).length;
  const allDone = total >= state.min_children && done === total;

  if (round.drawn_at) {
    $('#status').hidden = true;
    $('#qrCard').classList.add('small');
    if (!parading) showFinalMessage();
  } else {
    $('#status').hidden = false;
    $('#stageMessage').hidden = true;
    $('#qrCard').classList.toggle('small', false);
    $('#statusText').textContent =
      total === 0
        ? 'Noch keine Kinder – über ⚙️ hinzufügen'
        : allDone
          ? `Alle ${total} Wunschzettel sind eingepackt! 🎉`
          : `${done} von ${total} Wunschzetteln sind eingepackt`;
    $('#progressBar').style.width = total ? `${(done / total) * 100}%` : '0';
    const btn = $('#goButton');
    btn.classList.toggle('ready', allDone);
    btn.classList.toggle('waiting', !allDone);
    btn.textContent = allDone ? '🎅 Wichtel losschicken!' : '🎅 Wichtel losschicken';
  }

  if (drawerOpen) renderDrawer();
}

function showFinalMessage() {
  const total = state.children.length;
  const opened = state.children.filter((c) => c.revealed).length;
  const msg = $('#stageMessage');
  const html =
    opened === total
      ? `Alle haben ihren Wichtelzettel! 🎉<small>Psst … nicht verraten, für wen ihr wichtelt! 🤫</small>`
      : `Die Wichtel sind bei euren Tablets! 📲<small>${opened} von ${total} Zetteln sind schon geöffnet</small>`;
  if (msg.innerHTML !== html) msg.innerHTML = html;
  msg.hidden = false;
}

// ---------------------------------------------------------------------------
// Auslosung + Wichtel-Parade
// ---------------------------------------------------------------------------

async function onGo() {
  sound.unlock();
  const missing = state.children.filter((c) => !c.done);
  if (state.children.length < state.min_children) {
    toast(`Für die Auslosung braucht es mindestens ${state.min_children} Kinder.`, { type: 'error' });
    return;
  }
  let force = false;
  if (missing.length) {
    const names = missing.map((c) => c.name).join(', ');
    const ok = await ask({
      title: 'Noch nicht alle sind fertig',
      text: `Diese Kinder haben ihren Zettel noch nicht eingepackt: ${names}. Trotzdem jetzt auslosen? (Sie können ihren Wunschzettel danach noch schreiben.)`,
      ok: 'Trotzdem losschicken',
      cancel: 'Noch warten',
    });
    if (!ok) return;
    force = true;
  }
  const btn = $('#goButton');
  btn.disabled = true;
  try {
    state = await api('POST', `/api/rounds/${code}/admin/draw`, { headers: { 'X-Admin-Token': token }, body: { force } });
    render();
    runParade();
  } catch (err) {
    toast(err.message, { type: 'error' });
    await refresh();
  } finally {
    btn.disabled = false;
  }
}

function walk(el, from, to, y, s, duration, delay = 0) {
  const W = 104;
  const H = 148;
  const t = (x) => `translate(${x - W / 2}px, ${y - H}px) scale(${s})`;
  return el.animate([{ transform: t(from) }, { transform: t(to) }], { duration, delay, easing: 'linear', fill: 'forwards' }).finished;
}

async function elfRun(slot, giftVariant, startDelay, timing, elfIndex) {
  const dir = slot.row % 2 === 0 ? 1 : -1;
  const x0 = dir > 0 ? -90 : STAGE_W + 90;
  const x1 = dir > 0 ? STAGE_W + 90 : -90;
  const xg = slot.x + 28 * slot.s;
  const pickMs = 700;
  const speed = Math.abs(x1 - x0) / Math.max(1500, timing.cycle - pickMs);
  const d1 = Math.abs(xg - x0) / speed;
  const d2 = Math.abs(x1 - xg) / speed;

  const elf = document.createElement('div');
  elf.className = `elf walking${dir < 0 ? ' facing-left' : ''}`;
  elf.style.transformOrigin = '50% 100%';
  elf.style.zIndex = String(15 + slot.row * 10);
  elf.innerHTML = elfSvg(elfIndex, { giftVariant });
  elf.style.transform = `translate(${x0 - 52}px, ${slot.y - 148}px) scale(${slot.s})`;
  elf.style.position = 'absolute';
  elf.style.left = '0';
  elf.style.top = '0';
  elf.style.width = '104px';
  elf.style.height = '148px';
  await sleep(startDelay);
  slotsEl.appendChild(elf);

  await walk(elf, x0, xg, slot.y, slot.s, d1);
  elf.classList.remove('walking');
  // Bücken, Geschenk aufheben, Hüpfer
  const W = 104;
  const H = 148;
  const at = (dy, sx, sy) => `translate(${xg - W / 2}px, ${slot.y - H + dy}px) scale(${slot.s * sx}, ${slot.s * sy})`;
  const bend = elf.animate([{ transform: at(0, 1, 1) }, { transform: at(0, 1.08, 0.86) }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
  await bend.finished;
  slot.giftEl.hidden = true;
  elf.classList.add('carrying');
  const p = toStageViewport(xg, slot.y - 40 * slot.s);
  sparkle(p.x, p.y, { count: 8, spread: 50 * scale + 15 });
  sound.pling();
  await elf.animate(
    [{ transform: at(0, 1.08, 0.86) }, { transform: at(-26, 0.96, 1.06), offset: 0.45 }, { transform: at(0, 1, 1) }],
    { duration: pickMs - 220, easing: 'ease-in-out', fill: 'forwards' },
  ).finished;
  elf.classList.add('walking');
  await walk(elf, xg, x1, slot.y, slot.s, d2);
  elf.remove();
}

async function runParade() {
  if (parading) return;
  parading = true;
  const round = state.round;
  const timing = round.parade || { lead: 900, stagger: 400, cycle: 6500, total: 9000, gift_ids: [] };
  $('#status').hidden = true;
  const msg = $('#stageMessage');
  msg.innerHTML = 'Die Wichtel kommen! 🎅';
  msg.hidden = false;
  msg.classList.remove('pop');
  void msg.offsetWidth;
  msg.classList.add('pop');
  sound.jingleBells();

  // Alle Geschenke, die bei der Auslosung da waren, werden abgeholt
  const ids = (timing.gift_ids || []).filter((id) => slots.has(id));
  for (const id of ids) {
    const slot = slots.get(id);
    slot.giftEl.hidden = false;
    slot.status = 'done';
  }
  const order = [...ids].sort(() => Math.random() - 0.5);
  const runs = order.map((id, i) =>
    elfRun(slots.get(id), id, timing.lead + i * timing.stagger, timing, Math.floor(Math.random() * 8)),
  );

  setTimeout(() => {
    msg.innerHTML = 'Die Wichtel holen eure Wunschzettel ab … 🎁';
  }, timing.lead + 2500);

  await Promise.all(runs);
  msg.innerHTML = 'Die Wichtel laufen zu euren Tablets! 🏃💨<small>Gleich kommt bei jedem ein Zettel an …</small>';
  msg.classList.remove('pop');
  void msg.offsetWidth;
  msg.classList.add('pop');
  await sleep(Math.max(1500, timing.total - (timing.lead + Math.max(0, order.length - 1) * timing.stagger + timing.cycle)) + 2500);
  parading = false;
  for (const slot of slots.values()) slot.status = null;
  sound.magic();
  render();
}

// ---------------------------------------------------------------------------
// Werkzeugleiste
// ---------------------------------------------------------------------------

function updateSoundButton() {
  $('#soundBtn').textContent = sound.enabled ? '🔊' : '🔇';
}

function setupToolbar() {
  $('#soundBtn').addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    updateSoundButton();
    if (sound.enabled) {
      sound.unlock();
      sound.pling();
    }
  });
  $('#fullBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  $('#adminBtn').addEventListener('click', openDrawer);
  document.addEventListener('click', () => sound.unlock(), { once: true });
}

// ---------------------------------------------------------------------------
// Verwaltung (Seitenleiste)
// ---------------------------------------------------------------------------

let drawerEl = null;
let overlayEl = null;

function openDrawer() {
  if (drawerOpen) return;
  drawerOpen = true;
  overlayEl = document.createElement('div');
  overlayEl.className = 'drawer-overlay';
  overlayEl.addEventListener('click', closeDrawer);
  drawerEl = document.createElement('aside');
  drawerEl.className = 'drawer';
  drawerEl.addEventListener('click', onDrawerClick);
  document.body.append(overlayEl, drawerEl);
  renderDrawer(true);
}

function closeDrawer() {
  drawerOpen = false;
  drawerEl?.remove();
  overlayEl?.remove();
  drawerEl = overlayEl = null;
}

function chip(child) {
  if (state.round.drawn_at) {
    return child.revealed ? '<span class="chip chip-revealed">📬 geöffnet</span>' : child.done ? '<span class="chip chip-done">🎁 eingepackt</span>' : '<span class="chip chip-open">noch kein Zettel</span>';
  }
  if (child.done) return '<span class="chip chip-done">🎁 eingepackt</span>';
  if (child.claimed) return '<span class="chip chip-writing">✏️ schreibt</span>';
  return '<span class="chip chip-open">wartet</span>';
}

function renderDrawer(full = false) {
  if (!drawerEl) return;
  const { round, children } = state;
  const drawn = !!round.drawn_at;
  const teacherLink = teacherUrl();
  const listHtml = children
    .map(
      (c) => `
      <div class="kid-row" data-id="${c.id}">
        <span class="k-name" data-act="rename" title="Umbenennen">${esc(c.name)}</span>
        ${chip(c)}
        ${c.claimed ? `<button class="icon-btn" data-act="release" title="Tablet freigeben (z. B. wenn das Kind das Gerät wechselt)">🔓</button>` : ''}
        ${!drawn && c.done ? `<button class="icon-btn" data-act="reopen" title="Zettel wieder öffnen">✏️</button>` : ''}
        ${!drawn ? `<button class="icon-btn" data-act="delete" title="Entfernen">🗑️</button>` : ''}
      </div>`,
    )
    .join('');

  if (!full && drawerEl.querySelector('#kidList')) {
    drawerEl.querySelector('#kidList').innerHTML = listHtml || '<p>Noch keine Kinder.</p>';
    drawerEl.querySelector('#kidCount').textContent = String(children.length);
    drawerEl.querySelector('#afterDraw').hidden = !drawn;
    drawerEl.querySelector('#addSection').hidden = drawn;
    return;
  }

  drawerEl.innerHTML = `
    <div class="drawer-head">
      <h2>⚙️ Verwaltung</h2>
      <button class="btn btn-ghost btn-small" data-act="close">Schliessen ✕</button>
    </div>

    <h3>🎄 Wichtelrunde</h3>
    <div class="section">
      <label class="field"><span>Name der Klasse</span><input class="input" id="dTitle" maxlength="60" value="${esc(round.title)}"></label>
      <label class="field"><span>Hinweis für alle <small>Steht auf jedem Wichtelzettel, z. B. Datum und Budget</small></span>
        <textarea class="textarea" id="dHint" maxlength="240" style="min-height:4.5em">${esc(round.hint)}</textarea></label>
      <button class="btn btn-green btn-small" data-act="save-round">Speichern</button>
    </div>

    <h3>👧👦 Kinder (<span id="kidCount">${children.length}</span>)</h3>
    <div class="section">
      <div id="kidList">${listHtml || '<p>Noch keine Kinder.</p>'}</div>
      <div id="addSection" ${drawn ? 'hidden' : ''}>
        <label class="field" style="margin-top:12px"><span>Kinder hinzufügen <small>Ein Name pro Zeile</small></span>
          <textarea class="textarea" id="dAdd" style="min-height:5em" placeholder="Lena&#10;Max"></textarea></label>
        <button class="btn btn-green btn-small" data-act="add">Hinzufügen</button>
      </div>
      <p style="font-size:.88rem;opacity:.75;margin:.8rem 0 0">🔓 = Tablet freigeben: Hat ein Kind aus Versehen den falschen Namen gewählt oder das Gerät gewechselt, kann es den Namen danach neu antippen.</p>
    </div>

    <h3>🔗 Links</h3>
    <div class="section">
      <div class="field"><span>Für die Kinder</span>
        <div class="link-row"><code>${esc(state.kid_url)}</code><button class="icon-btn" data-act="copy-kid">📋</button></div></div>
      <div class="field"><span>Lehrer-Link (geheim!)</span>
        <div class="link-row"><code>${esc(teacherLink)}</code><button class="icon-btn" data-act="copy-teacher">📋</button></div>
        <div class="warn">Mit diesem Link kannst du die Runde auf einem anderen Gerät öffnen (z. B. am Beamer-Computer). Nicht an die Kinder weitergeben!</div></div>
    </div>

    <div id="afterDraw" ${drawn ? '' : 'hidden'}>
      <h3>🤫 Nach der Auslosung</h3>
      <div class="section">
        <p style="margin-top:0">Falls ein Kind vergisst, für wen es wichtelt:</p>
        <button class="btn btn-gold btn-small" data-act="pairs">🔒 Zuteilung anzeigen</button>
        <p style="margin-bottom:0"><button class="btn-link" data-act="undraw">Auslosung rückgängig machen …</button></p>
      </div>
    </div>

    <h3>🗑️ Aufräumen</h3>
    <div class="section">
      <p style="margin-top:0;font-size:.95rem">Runden werden nach 120 Tagen ohne Änderung automatisch gelöscht.</p>
      <button class="btn btn-danger btn-small" data-act="delete-round">Wichtelrunde löschen</button>
      <a class="btn btn-ghost btn-small" href="/" style="margin-left:6px">🏠 Startseite</a>
    </div>`;
}

function teacherUrl() {
  const base = state.kid_url.replace(/\/k\/[^/]*$/, '');
  return `${base}/lehrer/${code}#t=${token}`;
}

async function adminCall(method, path, body) {
  try {
    state = await api(method, `/api/rounds/${code}/admin${path}`, { headers: { 'X-Admin-Token': token }, body });
    render();
    return true;
  } catch (err) {
    toast(err.message, { type: 'error', ms: 5000 });
    return false;
  }
}

async function onDrawerClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.closest('[data-id]')?.dataset.id;
  const child = id ? state.children.find((c) => String(c.id) === id) : null;

  switch (act) {
    case 'close':
      closeDrawer();
      break;
    case 'save-round':
      if (await adminCall('PATCH', '', { title: $('#dTitle').value, hint: $('#dHint').value })) toast('Gespeichert ✓');
      break;
    case 'add': {
      const names = $('#dAdd').value;
      if (!names.trim()) return;
      if (await adminCall('POST', '/children', { names })) {
        $('#dAdd').value = '';
        toast('Hinzugefügt ✓');
      }
      break;
    }
    case 'rename': {
      const name = await askText({ title: 'Name ändern', value: child.name, maxLength: 30 });
      if (name && name.trim() && name !== child.name) await adminCall('PATCH', `/children/${child.id}`, { name });
      break;
    }
    case 'release':
      if (
        await ask({
          title: `Tablet von ${child.name} freigeben?`,
          text: 'Danach kann der Name auf einem anderen Gerät neu angetippt werden. Der Wunschzettel bleibt erhalten.',
          ok: 'Freigeben',
        })
      ) {
        await adminCall('POST', `/children/${child.id}/release`, {});
      }
      break;
    case 'reopen':
      await adminCall('POST', `/children/${child.id}/reopen`, {});
      break;
    case 'delete':
      if (await ask({ title: `${child.name} entfernen?`, text: 'Der Wunschzettel wird ebenfalls gelöscht.', ok: 'Entfernen', danger: true })) {
        await adminCall('DELETE', `/children/${child.id}`);
      }
      break;
    case 'copy-kid':
      toast((await copyText(state.kid_url)) ? 'Link kopiert ✓' : 'Kopieren ging nicht');
      break;
    case 'copy-teacher':
      toast((await copyText(teacherUrl())) ? 'Lehrer-Link kopiert ✓' : 'Kopieren ging nicht');
      break;
    case 'pairs':
      await showPairs();
      break;
    case 'undraw':
      if (
        await ask({
          title: 'Auslosung rückgängig machen?',
          text: 'Alle Zuteilungen werden gelöscht und die Wichtel können neu losgeschickt werden. Kinder, die ihren Zettel schon gesehen haben, bekommen dann eine neue Person.',
          ok: 'Rückgängig machen',
          danger: true,
        })
      ) {
        if (await adminCall('POST', '/undraw', {})) {
          for (const slot of slots.values()) slot.status = null;
          render();
        }
      }
      break;
    case 'delete-round':
      if (
        await ask({
          title: 'Wichtelrunde wirklich löschen?',
          text: 'Alle Namen und Wunschzettel werden endgültig gelöscht.',
          ok: 'Endgültig löschen',
          danger: true,
        })
      ) {
        try {
          await api('DELETE', `/api/rounds/${code}/admin`, { headers: { 'X-Admin-Token': token } });
          storage.remove(`wichtel:admin:${code}`);
          storage.set('wichtel:rounds', storage.get('wichtel:rounds', []).filter((r) => r.code !== code));
          location.href = '/';
        } catch (err) {
          toast(err.message, { type: 'error' });
        }
      }
      break;
    default:
      break;
  }
}

async function showPairs() {
  const sure = await ask({
    title: '🔒 Geheime Zuteilung',
    text: 'Achtung: Nicht am Beamer anzeigen! Die Liste verrät, wer für wen wichtelt.',
    ok: 'Anzeigen',
  });
  if (!sure) return;
  try {
    const pairs = await api('GET', `/api/rounds/${code}/admin/pairs`, { headers: { 'X-Admin-Token': token } });
    const html = `<ul class="pairs">${pairs
      .map(
        (p) => `<li><div class="p-line">${esc(p.giver.name)} 🎁 → ${esc(p.giftee?.name ?? '?')}</div>
          ${p.giftee && (p.giftee.wishes || p.giftee.nogos) ? `<div class="p-details">${p.giftee.wishes ? `Wünsche: ${esc(p.giftee.wishes)}` : ''}${p.giftee.nogos ? `\nLieber nicht: ${esc(p.giftee.nogos)}` : ''}</div>` : ''}</li>`,
      )
      .join('')}</ul>`;
    await ask({ title: 'Wer wichtelt für wen?', html, ok: 'Schliessen', cancel: '', wide: true });
  } catch (err) {
    toast(err.message, { type: 'error' });
  }
}

init().catch((err) => {
  console.error(err);
  showError('Fehler', err instanceof ApiError ? err.message : 'Da ist etwas schiefgelaufen. Bitte Seite neu laden.');
});
