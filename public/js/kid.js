import { $, $$, esc, lines, api, storage, liveUpdates, startSnow, sparkle, sleep, toast, ask, reducedMotion } from './common.js';
import { elfSvg, giftSvg, hillsSvg, hollySvg, bowSvg, mountGarland, mountStars } from './art.js';
import { sound } from './sound.js';
import { renderNoteImage } from './note-image.js';

const code = decodeURIComponent(location.pathname.split('/').pop() || '').toUpperCase();
const KEY = `wichtel:kid:${code}`;

let claims = storage.get(KEY, { active: null, tokens: {} });
let me = null; // Zustand vom Server
let screen = null;
let busy = false; // läuft gerade eine Animation?
let pendingRoute = false;
let revealTimer = null;
let revealKey = '';
let imagePromise = null;
let roundTitle = '';

const saveClaims = () => storage.set(KEY, claims);
const tokenHeader = () => ({ 'X-Device-Token': claims.tokens[claims.active] || '' });
const kidUrl = (path = '') => `/api/rounds/${code}/kids/${claims.active}${path}`;

// ---------------------------------------------------------------------------
// Bildschirme
// ---------------------------------------------------------------------------

const SCREENS = ['names', 'note', 'pack', 'wait', 'reveal', 'error'];

function show(name) {
  screen = name;
  for (const s of SCREENS) $(`#screen${s[0].toUpperCase()}${s.slice(1)}`).hidden = s !== name;
  $('#switchBox').hidden = !['note', 'wait'].includes(name);
}

function showError(title, text) {
  $('#errTitle').textContent = title;
  $('#errText').textContent = text;
  show('error');
}

function setTitle(title) {
  if (!title) return;
  roundTitle = title;
  $('#classTitle').textContent = title;
  document.title = `Wichteln – ${title}`;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function init() {
  mountStars($('#stars'), 50);
  mountGarland($('#garland'));
  startSnow($('#snow'), { density: 0.7 });
  $('#ground').innerHTML = hillsSvg({ fit: 'slice' });
  $$('[data-holly]').forEach((el) => (el.innerHTML = hollySvg()));
  document.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  setupNote();
  $('#switchBtn').addEventListener('click', switchName);
  $('#saveBtn').addEventListener('click', saveImage);

  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    showError('Falscher Code', 'Bitte scanne den QR-Code an der Wandtafel nochmal.');
    return;
  }

  if (claims.active && claims.tokens[claims.active]) {
    const ok = await refreshMe();
    if (ok) route();
    else await showNames();
  } else {
    await showNames();
  }

  liveUpdates(code, onLiveUpdate);
}

async function onLiveUpdate(type) {
  if (type === 'deleted') {
    showError('Wichtelrunde beendet', 'Deine Lehrperson hat diese Wichtelrunde gelöscht.');
    return;
  }
  if (screen === 'names') {
    await loadNames();
  } else if (claims.active && screen !== 'error') {
    if (await refreshMe()) route();
  }
}

async function refreshMe() {
  try {
    me = await api('GET', kidUrl(), { headers: tokenHeader() });
    setTitle(me.round.title);
    return true;
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      if (err.status === 404 && /Wichtelrunde/.test(err.message)) {
        showError('Wichtelrunde nicht gefunden', err.message);
        return false;
      }
      delete claims.tokens[claims.active];
      claims.active = null;
      saveClaims();
      if (screen && screen !== 'names') {
        toast('Deine Lehrperson hat deinen Namen freigegeben. Tippe nochmal auf deinen Namen.', { ms: 6000 });
        await showNames();
      }
      return false;
    }
    return false;
  }
}

/** Entscheidet anhand des Zustands, was das Kind sieht. */
function route() {
  if (!me) return;
  if (busy) {
    pendingRoute = true;
    return;
  }
  const { round, reveal } = me;
  clearTimeout(revealTimer);

  if (!me.me.done) {
    if (screen !== 'note') showNote();
    else updateNoteLead();
    return;
  }
  if (!round.drawn || !reveal) {
    showWait('waiting');
    return;
  }
  if (reveal.in_ms > 0 || !reveal.giftee) {
    showWait('coming');
    revealTimer = setTimeout(async () => {
      if (await refreshMe()) route();
    }, Math.max(400, reveal.in_ms + 150));
    return;
  }
  if (screen === 'reveal') {
    updateReveal();
  } else if (me.me.revealed) {
    openReveal();
  } else {
    playArrival();
  }
}

async function runBusy(fn) {
  busy = true;
  try {
    await fn();
  } finally {
    busy = false;
    if (pendingRoute) {
      pendingRoute = false;
      route();
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Namen wählen
// ---------------------------------------------------------------------------

let namesData = null;

async function showNames() {
  show('names');
  await loadNames();
}

async function loadNames() {
  try {
    namesData = await api('GET', `/api/rounds/${code}/kids`);
  } catch (err) {
    showError(err.status === 404 ? 'Wichtelrunde nicht gefunden' : 'Keine Verbindung', err.message);
    return;
  }
  setTitle(namesData.round.title);
  const tags = $('#tags');
  if (!namesData.children.length) {
    tags.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center">Hier sind noch keine Namen. Deine Lehrperson fügt sie gleich hinzu! ⏳</div>';
    return;
  }
  const html = namesData.children
    .map((c, i) => {
      const mine = !!claims.tokens[c.id];
      const taken = c.taken && !mine;
      const note = mine ? '⭐ auf diesem Tablet' : taken ? '🔒 schon gewählt' : '';
      return `<button type="button" class="tag ${taken ? 'taken' : ''} ${mine ? 'mine' : ''}" data-id="${c.id}" style="animation-delay:${Math.min(i * 35, 900)}ms">
        ${esc(c.name)}${note ? `<span class="tag-note">${note}</span>` : ''}</button>`;
    })
    .join('');
  if (tags.dataset.html !== html) {
    tags.innerHTML = html;
    tags.dataset.html = html;
    tags.onclick = (e) => {
      const btn = e.target.closest('.tag');
      if (btn) pickName(Number(btn.dataset.id));
    };
  }
}

async function pickName(id) {
  const child = namesData?.children.find((c) => c.id === id);
  if (!child) return;
  sound.unlock();
  if (claims.tokens[id]) {
    claims.active = id;
    saveClaims();
    if (await refreshMe()) route();
    else await loadNames();
    return;
  }
  if (child.taken) {
    toast(`„${child.name}“ wurde schon auf einem anderen Tablet gewählt. Bist du das? Dann frag deine Lehrperson.`, { type: 'error', ms: 5000 });
    return;
  }
  const ok = await ask({ title: `Bist du ${child.name}?`, text: 'Dann geht es gleich los mit deinem Wunschzettel!', ok: 'Ja, das bin ich! 🙋', cancel: 'Nein' });
  if (!ok) return;
  try {
    const res = await api('POST', `/api/rounds/${code}/kids/${id}/claim`, { body: {} });
    claims.tokens[id] = res.token;
    claims.active = id;
    saveClaims();
    me = res.state;
    route();
  } catch (err) {
    toast(err.message, { type: 'error', ms: 5000 });
    await loadNames();
  }
}

async function switchName() {
  const ok = await ask({ title: 'Name wechseln?', text: 'Du kommst zurück zur Namensliste.', ok: 'Ja', cancel: 'Abbrechen' });
  if (!ok) return;
  claims.active = null;
  saveClaims();
  me = null;
  await showNames();
}

// ---------------------------------------------------------------------------
// Schriftrolle auf- und zurollen
// ---------------------------------------------------------------------------

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function unroll(scrollEl, duration = 1500) {
  const wrap = scrollEl.querySelector('.scroll-sheet-wrap');
  wrap.style.height = '0px';
  await nextFrame();
  const h = wrap.firstElementChild.offsetHeight;
  if (reducedMotion) {
    wrap.style.height = '';
    return;
  }
  await wrap.animate([{ height: '0px' }, { height: `${h}px` }], { duration, easing: 'cubic-bezier(.45,.05,.25,1)' }).finished;
  wrap.style.height = '';
}

async function rollUp(scrollEl, duration = 900) {
  const wrap = scrollEl.querySelector('.scroll-sheet-wrap');
  const h = wrap.offsetHeight;
  wrap.style.height = `${h}px`;
  if (!reducedMotion) {
    await wrap.animate([{ height: `${h}px` }, { height: '0px' }], { duration, easing: 'cubic-bezier(.6,0,.5,1)' }).finished;
  }
  wrap.style.height = '0px';
}

// ---------------------------------------------------------------------------
// 2. Wunschzettel schreiben
// ---------------------------------------------------------------------------

let saveTimer = null;
let dirty = false;

function autogrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${Math.max(176, ta.scrollHeight)}px`;
}

function updateCounter(ta) {
  const counter = $(`#${ta.id}Count`);
  const left = 800 - ta.value.length;
  counter.textContent = left < 150 ? `noch ${left} Zeichen` : '';
}

function setupNote() {
  for (const ta of [$('#wishes'), $('#nogos')]) {
    ta.addEventListener('input', () => {
      dirty = true;
      autogrow(ta);
      updateCounter(ta);
      $('#saveState').textContent = '';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNote, 900);
    });
  }
  $('#doneBtn').addEventListener('click', onDone);
}

async function saveNote() {
  if (!dirty || !claims.active) return;
  dirty = false;
  try {
    await api('PUT', kidUrl('/note'), { headers: tokenHeader(), body: { wishes: $('#wishes').value, nogos: $('#nogos').value } });
    $('#saveState').textContent = 'Gespeichert ✓';
  } catch (err) {
    dirty = true;
    $('#saveState').textContent = err.status === 409 ? '' : 'Noch nicht gespeichert – ist das WLAN an?';
  }
}

function updateNoteLead() {
  $('#noteLead').textContent = me.round.drawn
    ? `${me.me.name}, schnell! ✨ Schreib deinen Wunschzettel – dann bringt dir ein Wichtel deinen Zettel.`
    : `Hallo ${me.me.name}! ✏️ Schreib auf, was du dir wünschst.`;
}

async function showNote() {
  await runBusy(async () => {
    updateNoteLead();
    $('#noteFrom').textContent = `von ${me.me.name}`;
    const wishes = $('#wishes');
    const nogos = $('#nogos');
    wishes.value = me.me.wishes;
    nogos.value = me.me.nogos;
    wishes.disabled = nogos.disabled = $('#doneBtn').disabled = false;
    dirty = false;
    $('#saveState').textContent = '';
    show('note');
    window.scrollTo(0, 0);
    autogrow(wishes);
    autogrow(nogos);
    updateCounter(wishes);
    updateCounter(nogos);
    await unroll($('#noteScroll'), 1600);
  });
}

async function onDone() {
  const wishes = $('#wishes').value.trim();
  const nogos = $('#nogos').value.trim();
  if (!wishes) {
    const ok = await ask({
      title: wishes || nogos ? 'Keine Wünsche?' : 'Dein Zettel ist noch leer',
      text: 'Schreib doch auf, was du dir wünschst! Dann weiss dein Wichtel, was dich freut.',
      ok: 'Trotzdem einpacken',
      cancel: 'Weiterschreiben',
    });
    if (!ok) return;
  }
  sound.unlock();
  clearTimeout(saveTimer);
  document.activeElement?.blur();
  $('#doneBtn').disabled = true;
  try {
    me = await api('POST', kidUrl('/done'), { headers: tokenHeader(), body: { wishes, nogos } });
    dirty = false;
  } catch (err) {
    $('#doneBtn').disabled = false;
    toast(err.message, { type: 'error', ms: 5000 });
    if (err.status === 403) await refreshMe();
    return;
  }
  await runBusy(packAnimation);
  route();
}

// ---------------------------------------------------------------------------
// Einpacken
// ---------------------------------------------------------------------------

function flipFrom(el, fromRect, duration = 700) {
  const to = el.getBoundingClientRect();
  const dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
  const dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
  const s = fromRect.width / to.width;
  return el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: 'none' }], {
    duration,
    easing: 'cubic-bezier(.3,.7,.3,1)',
  }).finished;
}

function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

async function packAnimation() {
  const name = me.me.name;
  const scrollEl = $('#noteScroll');
  const top = scrollEl.getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'auto' : 'smooth' });
  await sleep(450);
  await rollUp(scrollEl, 1000);
  const fromRect = scrollEl.getBoundingClientRect();

  // Bühne vorbereiten
  const v = me.me.id; // gleiches Geschenk wie an der Wandtafel
  $('#packBody').innerHTML = giftSvg(v, { part: 'body' });
  $('#packLid').innerHTML = giftSvg(v, { part: 'lid' });
  $('#packBow').innerHTML = bowSvg();
  $('#packTag').hidden = true;
  $('#packTag').textContent = name;
  const bundle = $('#packBundle');
  const ribbon = $('#packRibbon');
  const bow = $('#packBow');
  const box = $('#packBox');
  const lid = $('#packLid');
  for (const el of [bundle, ribbon, bow, box, lid]) el.getAnimations().forEach((a) => a.cancel());
  bundle.style.visibility = '';
  ribbon.style.transform = 'scaleY(0)';
  bow.style.transform = 'scale(0)';
  box.style.transform = 'scale(0)';
  $('#packLead').innerHTML = 'Dein Zettel wird eingepackt … 🎀';
  show('pack');
  window.scrollTo(0, 0);
  await nextFrame();

  await flipFrom(bundle, fromRect, 700);

  // Schleife umbinden
  await ribbon.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' }).finished;
  sound.pop();
  await bow.animate(
    [{ transform: 'scale(0) rotate(-40deg)' }, { transform: 'scale(1.3) rotate(10deg)', offset: 0.6 }, { transform: 'scale(1) rotate(0)' }],
    { duration: 550, easing: 'ease-out', fill: 'forwards' },
  ).finished;
  ribbon.style.transform = bow.style.transform = '';

  // Geschenk erscheint, Deckel geht auf
  await box.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.12)', offset: 0.7 }, { transform: 'scale(1)' }], {
    duration: 550,
    easing: 'ease-out',
    fill: 'forwards',
  }).finished;
  box.style.transform = '';
  const lidOpen = 'translate(36px, -120px) rotate(24deg)';
  await lid.animate([{ transform: 'none' }, { transform: lidOpen }], { duration: 420, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' }).finished;

  // Rolle fällt hinein
  await bundle.animate([{ transform: 'none' }, { transform: 'translate(0, -20px) rotate(-4deg)', offset: 0.25 }, { transform: 'translate(0, 262px) scale(.5) rotate(-8deg)' }], {
    duration: 800,
    easing: 'cubic-bezier(.5,0,.8,.6)',
    fill: 'forwards',
  }).finished;
  bundle.style.visibility = 'hidden';

  // Deckel zu
  await lid.animate([{ transform: lidOpen }, { transform: 'translate(0, 6px) rotate(0)', offset: 0.7 }, { transform: 'none' }], {
    duration: 450,
    easing: 'ease-in',
    fill: 'forwards',
  }).finished;
  sound.wrapped();
  const c = center(box);
  sparkle(c.x, c.y, { count: 22, spread: 170 });
  const tag = $('#packTag');
  tag.hidden = false;
  tag.animate([{ transform: 'rotate(8deg) scale(0)' }, { transform: 'rotate(8deg) scale(1.2)', offset: 0.7 }, { transform: 'rotate(8deg) scale(1)' }], { duration: 450 });
  $('#packLead').innerHTML = `Super, ${esc(name)}! 🎉 Dein Wunschzettel ist eingepackt!`;
  await sleep(1800);

  // Ab zum Wichtelbaum an der Wandtafel
  $('#packLead').innerHTML = 'Er fliegt jetzt zum Wichtelbaum an der Wandtafel! ✨';
  await sleep(500);
  const fly = box.animate(
    [
      { transform: 'none' },
      { transform: 'translateY(16px) scale(1.05, .92)', offset: 0.12 },
      { transform: 'translateY(-60px) rotate(-6deg)', offset: 0.35 },
      { transform: 'translateY(-120vh) rotate(10deg) scale(.5)' },
    ],
    { duration: 1900, easing: 'cubic-bezier(.45,0,.75,.5)', fill: 'forwards' },
  );
  const trail = setInterval(() => {
    const p = center(box);
    sparkle(p.x, p.y + 60, { count: 4, spread: 40 });
  }, 120);
  await fly.finished;
  clearInterval(trail);
  lid.getAnimations().forEach((a) => a.cancel());
  bundle.getAnimations().forEach((a) => a.cancel());
  box.getAnimations().forEach((a) => a.cancel());
  screen = 'packed';
}

// ---------------------------------------------------------------------------
// 3. Warten
// ---------------------------------------------------------------------------

function showWait(mode) {
  const card = $('#waitCard');
  const key = `${mode}`;
  if (screen === 'wait' && card.dataset.mode === key) return;
  card.dataset.mode = key;
  if (mode === 'waiting') {
    card.innerHTML = `
      <div class="wait-gift">${giftSvg(me.me.id)}</div>
      <h2>Dein Zettel liegt unter dem Wichtelbaum! 🎄</h2>
      <p>Schau an die Wandtafel – dort siehst du dein Geschenk.</p>
      <p>Sobald alle fertig sind, schickt deine Lehrperson die Wichtel los<span class="dots"></span></p>
      <p><button type="button" class="btn-link" id="reopenBtn">✏️ Ich möchte meinen Zettel nochmal ändern</button></p>`;
    $('#reopenBtn').addEventListener('click', reopen);
  } else {
    card.innerHTML = `
      <div class="wait-gift">${giftSvg(me.me.id + 3)}</div>
      <h2>Die Wichtel sind unterwegs! 👀</h2>
      <p>Schau an die Wandtafel!</p>
      <p>Gleich kommt ein Wichtel zu dir<span class="dots"></span></p>`;
  }
  show('wait');
}

async function reopen() {
  try {
    me = await api('POST', kidUrl('/reopen'), { headers: tokenHeader(), body: {} });
    route();
  } catch (err) {
    toast(err.message, { type: 'error', ms: 5000 });
    if (await refreshMe()) route();
  }
}

// ---------------------------------------------------------------------------
// 4. Der Wichtel bringt den Zettel
// ---------------------------------------------------------------------------

function revealHtml() {
  const g = me.reveal.giftee;
  const wishes = lines(g.wishes);
  const nogos = lines(g.nogos);
  const list = (items, cls, empty) =>
    items.length ? `<ul class="wish-list ${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p class="wish-empty">${empty}</p>`;
  return `
    <div class="scroll-holly left">${hollySvg()}</div>
    <div class="scroll-holly right">${hollySvg()}</div>
    <div class="secret">🤫 Psst … streng geheim!</div>
    <p class="reveal-for">Du wichtelst für</p>
    <h2 class="reveal-name" id="revealName">${esc(g.name)}</h2>
    <div class="note-label"><span class="emoji">🎁</span> Das wünscht sich ${esc(g.name)}:</div>
    ${list(wishes, '', `${esc(g.name)} hat noch nichts aufgeschrieben. Schau später nochmal hier rein!`)}
    <div class="note-label"><span class="emoji">🙈</span> Darüber würde sich ${esc(g.name)} gar nicht freuen:</div>
    ${list(nogos, 'nogo', '–')}
    ${me.round.hint ? `<div class="hint-box">📌 ${esc(me.round.hint)}</div>` : ''}`;
}

function currentRevealKey() {
  const g = me.reveal?.giftee;
  return g ? JSON.stringify([g.name, g.wishes, g.nogos, me.round.hint, me.round.title]) : '';
}

function prepareImage() {
  const g = me.reveal.giftee;
  imagePromise = renderNoteImage({ name: g.name, wishes: g.wishes, nogos: g.nogos, hint: me.round.hint, title: me.round.title }).catch(() => null);
}

function updateReveal() {
  const key = currentRevealKey();
  if (key === revealKey) return;
  revealKey = key;
  $('#revealSheet').innerHTML = revealHtml();
  prepareImage();
}

async function openReveal() {
  await runBusy(async () => {
    revealKey = currentRevealKey();
    $('#revealSheet').innerHTML = revealHtml();
    $('#revealActions').hidden = true;
    show('reveal');
    window.scrollTo(0, 0);
    await unroll($('#revealScroll'), 1500);
    $('#revealActions').hidden = false;
    prepareImage();
  });
}

function makeBundle() {
  const el = document.createElement('div');
  el.className = 'pack-bundle';
  el.innerHTML = `<div class="scroll-roll r1"></div><div class="scroll-roll r2"></div>
    <div class="pack-ribbon"></div><div class="pack-bow">${bowSvg()}</div>`;
  return el;
}

async function playArrival() {
  await runBusy(async () => {
    const name = me.me.name;
    show(null);
    $('#switchBox').hidden = true;
    window.scrollTo(0, 0);
    const arrival = $('#arrival');
    arrival.innerHTML = '';
    arrival.hidden = false;

    const vw = window.innerWidth;
    const elfVariant = Math.floor(Math.random() * 8);
    const giftVariant = Math.floor(Math.random() * 8);
    const elf = document.createElement('div');
    elf.className = 'elf walking carrying';
    elf.innerHTML = elfSvg(elfVariant, { giftVariant });
    elf.style.left = '0';
    arrival.appendChild(elf);

    const elfW = 180;
    const stopX = Math.round(vw / 2 - 85);
    const giftX = Math.round(vw / 2 + 85);
    sound.jingleBells();
    await elf.animate([{ transform: `translateX(${-elfW}px)` }, { transform: `translateX(${stopX}px)` }], {
      duration: reducedMotion ? 10 : Math.max(2200, (stopX + elfW) * 4.2),
      easing: 'cubic-bezier(.25,.1,.5,1)',
      fill: 'forwards',
    }).finished;
    elf.classList.remove('walking');

    // Geschenk abstellen
    const gift = document.createElement('div');
    gift.className = 'arrival-gift';
    gift.style.left = `${giftX}px`;
    gift.innerHTML = `<div class="gift-body">${giftSvg(giftVariant, { part: 'body' })}</div><div class="gift-lid">${giftSvg(giftVariant, { part: 'lid' })}</div>`;
    arrival.appendChild(gift);
    // Tippen ist sofort möglich, auch während der Wichtel das Geschenk noch abstellt
    const tapped = new Promise((resolve) => gift.addEventListener('click', resolve, { once: true }));
    let isTapped = false;
    tapped.then(() => (isTapped = true));
    elf.classList.remove('carrying');
    await gift.animate(
      [{ transform: `translate(${stopX - giftX}px, -70px) scale(.75)` }, { transform: `translate(${(stopX - giftX) / 2}px, -110px) scale(.9)`, offset: 0.5 }, { transform: 'none' }],
      { duration: 650, easing: 'ease-in-out' },
    ).finished;
    sound.pop();
    elf.classList.add('waving');

    const speech = document.createElement('div');
    speech.className = 'speech';
    speech.style.left = `${stopX}px`;
    speech.textContent = `Für dich, ${name}! 🎁`;
    const hint = document.createElement('div');
    hint.className = 'tap-hint';
    hint.style.left = `${giftX}px`;
    hint.innerHTML = 'Tippe auf<br>das Geschenk! 👇';
    if (!isTapped) {
      arrival.appendChild(speech);
      await Promise.race([sleep(900), tapped]);
    }
    if (!isTapped) {
      arrival.appendChild(hint);
      gift.classList.add('wiggle');
    }
    await tapped;
    sound.unlock();
    sound.magic();
    speech.remove();
    hint.remove();
    gift.classList.remove('wiggle');

    // Deckel fliegt weg, Rolle steigt heraus
    const lid = gift.querySelector('.gift-lid');
    lid.animate([{ transform: 'none' }, { transform: 'translate(90px, -300px) rotate(60deg)', opacity: 0 }], {
      duration: 800,
      easing: 'cubic-bezier(.2,.8,.3,1)',
      fill: 'forwards',
    });
    const gc = center(gift);
    sparkle(gc.x, gc.y - 30, { count: 26, spread: 180 });

    const bundle = makeBundle();
    bundle.style.left = `${giftX}px`;
    bundle.style.bottom = 'calc(7vh + 60px)';
    arrival.insertBefore(bundle, gift);
    const riseTo = -Math.round(window.innerHeight * 0.3);
    await bundle.animate([{ transform: 'translateY(40px) scale(.4)' }, { transform: `translateY(${riseTo}px) scale(1)` }], {
      duration: 1000,
      easing: 'cubic-bezier(.2,.9,.3,1)',
      fill: 'forwards',
    }).finished;

    // Schleife auf
    sound.pop();
    const rib = bundle.querySelector('.pack-ribbon');
    const bw = bundle.querySelector('.pack-bow');
    rib.animate([{ transform: 'none' }, { transform: 'scaleY(0)', opacity: 0 }], { duration: 350, fill: 'forwards' });
    await bw.animate([{ transform: 'none' }, { transform: 'translate(40px,-80px) rotate(80deg) scale(.4)', opacity: 0 }], { duration: 450, fill: 'forwards' }).finished;

    // Zettel vorbereiten (noch zugerollt) und die Rolle dorthin fliegen lassen
    revealKey = currentRevealKey();
    $('#revealSheet').innerHTML = revealHtml();
    $('#revealActions').hidden = true;
    const wrap = $('#revealScroll .scroll-sheet-wrap');
    wrap.style.height = '0px';
    show('reveal');
    $('#switchBox').hidden = true;
    const scrollEl = $('#revealScroll');
    scrollEl.style.visibility = 'hidden';
    await nextFrame();
    const target = scrollEl.getBoundingClientRect();
    const from = bundle.getBoundingClientRect();
    const dx = target.left + target.width / 2 - (from.left + from.width / 2);
    const dy = target.top + target.height / 2 - (from.top + from.height / 2);
    const s = target.width / from.width;
    const base = `translateY(${riseTo}px)`;
    await bundle.animate([{ transform: base }, { transform: `translate(${dx}px, ${riseTo + dy}px) scale(${s})` }], {
      duration: 700,
      easing: 'cubic-bezier(.4,0,.2,1)',
      fill: 'forwards',
    }).finished;
    scrollEl.style.visibility = '';
    bundle.remove();

    // Wichtel winkt und läuft weiter
    elf.classList.remove('waving');
    elf.classList.add('walking');
    gift.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
    elf
      .animate([{ transform: `translateX(${stopX}px)` }, { transform: `translateX(${vw + 40}px)` }], { duration: 2600, easing: 'ease-in', fill: 'forwards' })
      .finished.then(() => {
        arrival.hidden = true;
        arrival.innerHTML = '';
      });

    await unroll(scrollEl, 1900);
    $('#revealName')?.classList.add('shine');
    sound.wrapped();
    const nc = center($('#revealName'));
    sparkle(nc.x, nc.y, { count: 24, spread: 200 });
    $('#revealActions').hidden = false;
    prepareImage();
    api('POST', kidUrl('/revealed'), { headers: tokenHeader(), body: {} }).catch(() => {});
    me.me.revealed = true;
  });
}

// ---------------------------------------------------------------------------
// Als Bild speichern
// ---------------------------------------------------------------------------

function fileName() {
  const n = (me.reveal?.giftee?.name || 'Zettel').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-');
  return `Wichtelzettel-${n}.png`;
}

async function saveImage() {
  if (!imagePromise) prepareImage();
  const blob = await imagePromise;
  if (!blob) {
    toast('Das Bild konnte nicht erstellt werden. Mach stattdessen ein Bildschirmfoto 📸', { type: 'error', ms: 6000 });
    return;
  }
  const file = new File([blob], fileName(), { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mein Wichtelzettel' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  await ask({
    title: '📷 Bild speichern',
    html: `<img class="save-preview" src="${url}" alt="Wichtelzettel">
      <p class="modal-text" style="margin-top:1rem">Halte den Finger lange auf das Bild und wähle <b>„Zu Fotos hinzufügen“</b> bzw. <b>„Bild speichern“</b>.</p>
      <p style="text-align:center"><a class="btn btn-green" href="${url}" download="${esc(fileName())}">⬇️ Herunterladen</a></p>`,
    ok: 'Fertig',
    cancel: '',
  });
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

init().catch((err) => {
  console.error(err);
  showError('Hoppla!', 'Da ist etwas schiefgelaufen. Bitte lade die Seite neu.');
});
