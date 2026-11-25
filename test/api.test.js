'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, EventHub } = require('../src/server');
const { openStore } = require('../src/store');

const quietLogger = { log() {}, warn() {}, error() {} };

async function startServer(t, configOverrides = {}) {
  const store = openStore(':memory:');
  const hub = new EventHub();
  const config = { port: 0, teacherPassword: '', publicUrl: 'https://wichtel.test', retentionDays: 120, ...configOverrides };
  const app = createApp({ store, config, hub, logger: quietLogger });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(() => {
    hub.closeAll();
    server.close();
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(method, url, { body, headers = {} } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers };
  }
  return { call, store, base };
}

async function createRound(call, names = ['Lena', 'Max', 'Aylin', 'Noah']) {
  const res = await call('POST', '/api/rounds', { body: { title: 'Klasse 4b', names: names.join('\n'), hint: 'Budget 5 Franken' } });
  assert.equal(res.status, 201);
  const admin = { 'x-admin-token': res.data.admin_token };
  return { code: res.data.code, admin };
}

test('Ganzer Ablauf: Runde anlegen, Kinder wählen Namen, schreiben, Auslosung, Zettel', async (t) => {
  const { call, store } = await startServer(t);
  const { code, admin } = await createRound(call);

  // Lehrperson sieht alle Kinder
  let state = await call('GET', `/api/rounds/${code}/admin`, { headers: admin });
  assert.equal(state.status, 200);
  assert.equal(state.data.children.length, 4);
  assert.equal(state.data.kid_url, `https://wichtel.test/k/${code}`);

  // Ohne Lehrer-Token kein Zugriff
  assert.equal((await call('GET', `/api/rounds/${code}/admin`)).status, 403);

  // QR-Code
  const qr = await call('GET', `/api/rounds/${code}/qr.svg`);
  assert.equal(qr.status, 200);
  assert.match(qr.headers.get('content-type'), /image\/svg\+xml/);

  // Kinder wählen ihre Namen
  const kids = (await call('GET', `/api/rounds/${code.toLowerCase()}/kids`)).data.children;
  const tokens = {};
  for (const kid of kids) {
    const res = await call('POST', `/api/rounds/${code}/kids/${kid.id}/claim`, { body: {} });
    assert.equal(res.status, 200);
    tokens[kid.id] = res.data.token;
  }

  // Ein anderes Gerät kann denselben Namen nicht nochmal wählen
  const steal = await call('POST', `/api/rounds/${code}/kids/${kids[0].id}/claim`, { body: {} });
  assert.equal(steal.status, 409);
  // Das gleiche Gerät schon
  const again = await call('POST', `/api/rounds/${code}/kids/${kids[0].id}/claim`, { body: { token: tokens[kids[0].id] } });
  assert.equal(again.status, 200);

  // Fremden Zettel lesen geht nicht
  const peek = await call('GET', `/api/rounds/${code}/kids/${kids[0].id}`, { headers: { 'x-device-token': tokens[kids[1].id] } });
  assert.equal(peek.status, 403);

  // Zwischenspeichern und fertig machen (das letzte Kind noch nicht)
  for (const kid of kids.slice(0, 3)) {
    const h = { 'x-device-token': tokens[kid.id] };
    assert.equal((await call('PUT', `/api/rounds/${code}/kids/${kid.id}/note`, { headers: h, body: { wishes: `Wunsch von ${kid.name}`, nogos: '' } })).status, 200);
    const done = await call('POST', `/api/rounds/${code}/kids/${kid.id}/done`, {
      headers: h,
      body: { wishes: `Schokolade\nComic von ${kid.name}`, nogos: 'Nüsse' },
    });
    assert.equal(done.status, 200);
    assert.equal(done.data.me.done, true);
  }

  // Auslosung ohne force: Hinweis, wer noch fehlt
  const notReady = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: {} });
  assert.equal(notReady.status, 409);
  assert.deepEqual(notReady.data.missing, ['Noah']);

  // Letztes Kind wird fertig
  const last = kids[3];
  await call('POST', `/api/rounds/${code}/kids/${last.id}/done`, {
    headers: { 'x-device-token': tokens[last.id] },
    body: { wishes: 'Lego', nogos: '' },
  });

  const drawn = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: {} });
  assert.equal(drawn.status, 200);
  assert.ok(drawn.data.round.drawn_at);
  assert.equal(drawn.data.round.parade.count, 4);
  assert.equal(drawn.data.round.parade.gift_ids.length, 4);

  // Lehrer-Übersicht ohne Zuteilungen
  assert.ok(!JSON.stringify(drawn.data).includes('giftee'));

  // Direkt nach der Auslosung ist der Zettel noch unterwegs (Wichtel laufen noch)
  const early = await call('GET', `/api/rounds/${code}/kids/${kids[0].id}`, { headers: { 'x-device-token': tokens[kids[0].id] } });
  assert.ok(early.data.reveal.in_ms > 0);
  assert.equal(early.data.reveal.giftee, null);

  // Zeit vorspulen: Parade vorbei
  const round = store.getRound(code);
  store.db.prepare('UPDATE rounds SET drawn_at = ? WHERE id = ?').run(round.drawn_at - 60000, round.id);

  const seen = new Set();
  for (const kid of kids) {
    const me = await call('GET', `/api/rounds/${code}/kids/${kid.id}`, { headers: { 'x-device-token': tokens[kid.id] } });
    assert.equal(me.data.reveal.in_ms, 0);
    const giftee = me.data.reveal.giftee;
    assert.ok(giftee);
    assert.notEqual(giftee.name, kid.name);
    assert.ok(giftee.wishes.length > 0);
    seen.add(giftee.name);
  }
  assert.equal(seen.size, 4);

  // Geöffnet markieren
  await call('POST', `/api/rounds/${code}/kids/${kids[0].id}/revealed`, { headers: { 'x-device-token': tokens[kids[0].id] }, body: {} });
  state = await call('GET', `/api/rounds/${code}/admin`, { headers: admin });
  assert.equal(state.data.children.find((c) => c.id === kids[0].id).revealed, true);

  // Paare für die Lehrperson
  const pairs = await call('GET', `/api/rounds/${code}/admin/pairs`, { headers: admin });
  assert.equal(pairs.status, 200);
  assert.equal(pairs.data.length, 4);

  // Nach der Auslosung: nicht mehr ändern / hinzufügen
  assert.equal((await call('POST', `/api/rounds/${code}/kids/${kids[0].id}/reopen`, { headers: { 'x-device-token': tokens[kids[0].id] }, body: {} })).status, 409);
  assert.equal((await call('POST', `/api/rounds/${code}/admin/children`, { headers: admin, body: { names: 'Neu' } })).status, 409);
});

test('Lehrperson verwaltet Kinder: hinzufügen, umbenennen, freigeben, entfernen', async (t) => {
  const { call } = await startServer(t);
  const { code, admin } = await createRound(call, ['Lena', 'Max', 'Aylin']);

  let res = await call('POST', `/api/rounds/${code}/admin/children`, { headers: admin, body: { names: 'Noah\nmax' } });
  assert.equal(res.status, 400, 'doppelter Name wird erkannt');

  res = await call('POST', `/api/rounds/${code}/admin/children`, { headers: admin, body: { names: 'Noah\nŞeyma' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.children.map((c) => c.name), ['Lena', 'Max', 'Aylin', 'Noah', 'Şeyma']);

  const lena = res.data.children[0];
  res = await call('PATCH', `/api/rounds/${code}/admin/children/${lena.id}`, { headers: admin, body: { name: 'Lena M.' } });
  assert.equal(res.data.children[0].name, 'Lena M.');

  const claim = await call('POST', `/api/rounds/${code}/kids/${lena.id}/claim`, { body: {} });
  assert.equal(claim.status, 200);
  res = await call('POST', `/api/rounds/${code}/admin/children/${lena.id}/release`, { headers: admin, body: {} });
  assert.equal(res.data.children[0].claimed, false);
  // Nach der Freigabe kann ein neues Gerät den Namen wählen
  assert.equal((await call('POST', `/api/rounds/${code}/kids/${lena.id}/claim`, { body: {} })).status, 200);

  res = await call('DELETE', `/api/rounds/${code}/admin/children/${res.data.children[4].id}`, { headers: admin });
  assert.equal(res.data.children.length, 4);

  // Auslosung mit force, obwohl niemand fertig ist
  res = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: { force: true } });
  assert.equal(res.status, 200);
  assert.equal(res.data.round.parade.count, 0);

  // Rückgängig
  res = await call('POST', `/api/rounds/${code}/admin/undraw`, { headers: admin, body: {} });
  assert.equal(res.data.round.drawn_at, null);

  // Runde löschen
  assert.equal((await call('DELETE', `/api/rounds/${code}/admin`, { headers: admin })).status, 200);
  assert.equal((await call('GET', `/api/rounds/${code}/kids`)).status, 404);
});

test('Optionales Lehrer-Passwort zum Anlegen neuer Runden', async (t) => {
  const { call } = await startServer(t, { teacherPassword: 'geheim' });
  assert.equal((await call('GET', '/api/config')).data.password_required, true);
  assert.equal((await call('POST', '/api/rounds', { body: { title: 'x', names: 'a\nb\nc' } })).status, 401);
  assert.equal((await call('POST', '/api/rounds', { body: { title: 'x', names: 'a\nb\nc', password: 'geheim' } })).status, 201);
});

test('Seiten und Live-Updates sind erreichbar', async (t) => {
  const { call, base } = await startServer(t);
  const { code } = await createRound(call);
  for (const url of ['/', `/lehrer/${code}`, `/k/${code}`]) {
    const res = await fetch(base + url);
    assert.equal(res.status, 200, url);
    assert.match(res.headers.get('content-type'), /text\/html/);
  }
  const controller = new AbortController();
  const res = await fetch(`${base}/api/rounds/${code}/events`, { signal: controller.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  controller.abort();
});
