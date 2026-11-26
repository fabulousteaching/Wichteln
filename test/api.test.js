'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const GUARD = '<?php http_response_code(404); exit; ?>\n';

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Startet den eingebauten PHP-Server mit einem leeren Datenordner. */
async function startServer(t, env = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wichtel-test-'));
  const port = await freePort();
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'web', 'test/router.php'], {
    cwd: ROOT,
    env: { ...process.env, WICHTEL_DATA_DIR: dataDir, PUBLIC_URL: 'https://wichtel.test', TEACHER_PASSWORD: '', ...env },
    stdio: 'ignore',
  });
  t.after(() => {
    proc.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${base}/api/config`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  async function call(method, url, { body, headers = {} } = {}) {
    const hasBody = method !== 'GET';
    const res = await fetch(base + url, {
      method,
      headers: { ...(hasBody ? { 'content-type': 'application/json' } : {}), ...headers },
      body: hasBody ? JSON.stringify(body ?? {}) : undefined,
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
  const roundFile = (code) => path.join(dataDir, 'rounds', `${code}.json.php`);
  const editRound = (code, fn) => {
    const file = roundFile(code);
    const round = JSON.parse(fs.readFileSync(file, 'utf8').slice(GUARD.length));
    fn(round);
    fs.writeFileSync(file, GUARD + JSON.stringify(round));
  };
  return { call, base, dataDir, roundFile, editRound };
}

async function createRound(call, names = ['Lena', 'Max', 'Aylin', 'Noah']) {
  const res = await call('POST', '/api/rounds', { body: { title: 'Klasse 4b', names: names.join('\n'), hint: 'Budget 5 Franken' } });
  assert.equal(res.status, 201);
  const admin = { 'x-admin-token': res.data.admin_token };
  return { code: res.data.code, admin };
}

test('Ganzer Ablauf: Runde anlegen, Kinder wählen Namen, schreiben, Auslosung, Zettel', async (t) => {
  const { call, editRound, roundFile } = await startServer(t);
  const { code, admin } = await createRound(call);

  // Lehrperson sieht alle Kinder
  let state = await call('GET', `/api/rounds/${code}/admin`, { headers: admin });
  assert.equal(state.status, 200);
  assert.equal(state.data.children.length, 4);
  assert.equal(state.data.kid_url, `https://wichtel.test/k/${code}`);

  // Ohne Lehrer-Token kein Zugriff
  assert.equal((await call('GET', `/api/rounds/${code}/admin`)).status, 403);

  // Datenfile ist geschützt: direkt ausgeführt gibt es nichts aus
  assert.equal(execFileSync('php', [roundFile(code)]).toString(), '');
  assert.ok(fs.readFileSync(roundFile(code), 'utf8').includes('Lena'));

  // Kleine Abfrage, ob sich etwas geändert hat
  const v1 = (await call('GET', `/api/rounds/${code}/version`)).data.v;

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

  // Version hat sich geändert
  assert.notEqual((await call('GET', `/api/rounds/${code}/version`)).data.v, v1);

  // Zeit vorspulen: Parade vorbei
  editRound(code, (round) => {
    round.drawn_at -= 60000;
  });

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

test('Abwesende Kinder: Auslosung ohne sie, Wünsche durch die Lehrperson, Zettel abrufbar', async (t) => {
  const { call } = await startServer(t);
  const { code, admin } = await createRound(call, ['Lena', 'Max', 'Aylin', 'Noah']);
  const kids = (await call('GET', `/api/rounds/${code}/kids`)).data.children;
  const [lena, max, aylin, noah] = kids;

  // Drei Kinder sind da und werden fertig, Noah fehlt
  for (const kid of [lena, max, aylin]) {
    const token = (await call('POST', `/api/rounds/${code}/kids/${kid.id}/claim`, { body: {} })).data.token;
    await call('POST', `/api/rounds/${code}/kids/${kid.id}/done`, { headers: { 'x-device-token': token }, body: { wishes: 'Lego', nogos: '' } });
  }
  let res = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: {} });
  assert.equal(res.status, 409);
  assert.deepEqual(res.data.missing, ['Noah']);

  // Wünsche bearbeiten geht nur bei abwesenden Kindern
  res = await call('PUT', `/api/rounds/${code}/admin/children/${noah.id}/note`, { headers: admin, body: { wishes: 'x', nogos: '' } });
  assert.equal(res.status, 409);
  assert.equal((await call('PUT', `/api/rounds/${code}/admin/children/${lena.id}/note`, { headers: admin, body: { wishes: 'x', nogos: '' } })).status, 409);

  // Als abwesend markieren: nur mit Lehrer-Token
  assert.equal((await call('POST', `/api/rounds/${code}/admin/children/${noah.id}/absent`, { body: { absent: true } })).status, 403);
  res = await call('POST', `/api/rounds/${code}/admin/children/${noah.id}/absent`, { headers: admin, body: { absent: true } });
  assert.equal(res.status, 200);
  const noahState = () => res.data.children.find((c) => c.id === noah.id);
  assert.equal(noahState().absent, true);
  assert.equal(noahState().done, false);
  assert.equal((await call('GET', `/api/rounds/${code}/kids`)).data.children.find((c) => c.id === noah.id).absent, true);

  // Lehrperson trägt die Wünsche ein und kann sie wieder lesen und ändern
  res = await call('PUT', `/api/rounds/${code}/admin/children/${noah.id}/note`, { headers: admin, body: { wishes: 'Fussball\nComic', nogos: 'Socken' } });
  assert.equal(res.status, 200);
  assert.equal(noahState().has_note, true);
  assert.equal(noahState().done, true);
  const note = await call('GET', `/api/rounds/${code}/admin/children/${noah.id}/note`, { headers: admin });
  assert.deepEqual([note.data.wishes, note.data.nogos], ['Fussball\nComic', 'Socken']);

  // Jetzt geht die Auslosung ohne "force", und auch für Noah liegt ein Geschenk bereit
  res = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: {} });
  assert.equal(res.status, 200);
  assert.equal(res.data.round.parade.count, 4);

  // Zuteilung: Noah wichtelt für jemanden, und wer für Noah wichtelt, sieht die Wünsche der Lehrperson
  const pairs = (await call('GET', `/api/rounds/${code}/admin/pairs`, { headers: admin })).data;
  const noahPair = pairs.find((p) => p.giver.id === noah.id);
  assert.equal(noahPair.giver.absent, true);
  assert.ok(noahPair.giftee.name);
  assert.equal(pairs.find((p) => p.giftee.id === noah.id).giftee.wishes, 'Fussball\nComic');

  // Wünsche lassen sich auch nach der Auslosung noch anpassen
  res = await call('PUT', `/api/rounds/${code}/admin/children/${noah.id}/note`, { headers: admin, body: { wishes: 'Fussball', nogos: '' } });
  assert.equal(res.status, 200);
  const after = (await call('GET', `/api/rounds/${code}/admin/pairs`, { headers: admin })).data;
  assert.equal(after.find((p) => p.giftee.id === noah.id).giftee.wishes, 'Fussball');

  // Kommt Noah doch und tippt seinen Namen an, gilt er wieder als anwesend
  assert.equal((await call('POST', `/api/rounds/${code}/kids/${noah.id}/claim`, { body: {} })).status, 200);
  res = await call('GET', `/api/rounds/${code}/admin`, { headers: admin });
  assert.equal(noahState().absent, false);
});

test('Abwesend ohne Wünsche: Auslosung läuft trotzdem, Markierung lässt sich zurücknehmen', async (t) => {
  const { call } = await startServer(t);
  const { code, admin } = await createRound(call, ['Lena', 'Max', 'Aylin']);
  const kids = (await call('GET', `/api/rounds/${code}/kids`)).data.children;
  for (const kid of kids) {
    assert.equal((await call('POST', `/api/rounds/${code}/admin/children/${kid.id}/absent`, { headers: admin, body: { absent: true } })).status, 200);
  }
  let res = await call('POST', `/api/rounds/${code}/admin/children/${kids[0].id}/absent`, { headers: admin, body: { absent: false } });
  assert.equal(res.data.children[0].absent, false);
  res = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: {} });
  assert.equal(res.status, 409);
  assert.deepEqual(res.data.missing, ['Lena']);
  await call('POST', `/api/rounds/${code}/admin/children/${kids[0].id}/absent`, { headers: admin, body: { absent: true } });
  res = await call('POST', `/api/rounds/${code}/admin/draw`, { headers: admin, body: {} });
  assert.equal(res.status, 200);
  assert.equal(res.data.round.parade.count, 3);
});

test('Optionales Lehrer-Passwort zum Anlegen neuer Runden', async (t) => {
  const { call } = await startServer(t, { TEACHER_PASSWORD: 'geheim' });
  assert.equal((await call('GET', '/api/config')).data.password_required, true);
  assert.equal((await call('POST', '/api/rounds', { body: { title: 'x', names: 'a\nb\nc' } })).status, 401);
  assert.equal((await call('POST', '/api/rounds', { body: { title: 'x', names: 'a\nb\nc', password: 'geheim' } })).status, 201);
});

test('Seiten sind erreichbar, interne Ordner nicht', async (t) => {
  const { call, base } = await startServer(t);
  const { code } = await createRound(call);
  for (const url of ['/', `/lehrer/${code}`, `/k/${code}`]) {
    const res = await fetch(base + url);
    assert.equal(res.status, 200, url);
    assert.match(res.headers.get('content-type'), /text\/html/);
  }
  for (const url of ['/wichtel-app/wichtel.php', `/data/rounds/${code}.json.php`]) {
    assert.equal((await fetch(base + url)).status, 403, url);
  }
  assert.equal((await call('GET', '/api/rounds/XXXXX/version')).status, 404);
});

test('Nur JSON-Anfragen; PUT/PATCH/DELETE auch als POST mit Kopfzeile', async (t) => {
  const { call, base } = await startServer(t);
  const { code, admin } = await createRound(call);
  const form = await fetch(`${base}/api/rounds`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
  assert.equal(form.status, 415);
  const kids = (await call('GET', `/api/rounds/${code}/kids`)).data.children;
  const res = await call('POST', `/api/rounds/${code}/admin/children/${kids[0].id}`, {
    headers: { ...admin, 'x-http-method-override': 'PATCH' },
    body: { name: 'Lena S.' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.children[0].name, 'Lena S.');
});

test('Zwei Tablets wählen gleichzeitig denselben Namen: nur eines gewinnt', async (t) => {
  const { call } = await startServer(t);
  const { code } = await createRound(call);
  const kid = (await call('GET', `/api/rounds/${code}/kids`)).data.children[0];
  const results = await Promise.all(Array.from({ length: 8 }, () => call('POST', `/api/rounds/${code}/kids/${kid.id}/claim`, { body: {} })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 7);
});
