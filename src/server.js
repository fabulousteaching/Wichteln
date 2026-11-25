'use strict';

const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');

const { openStore } = require('./store');
const { MIN_CHILDREN, drawCircle, paradeTiming } = require('./draw');
const {
  LIMITS,
  HttpError,
  randomCode,
  normalizeCode,
  randomToken,
  hashToken,
  tokenMatches,
  cleanText,
  parseNames,
  findDuplicate,
  qrSvg,
} = require('./util');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DAY = 24 * 60 * 60 * 1000;

function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    databasePath: env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'wichtel.db'),
    teacherPassword: env.TEACHER_PASSWORD || '',
    publicUrl: (env.PUBLIC_URL || '').replace(/\/+$/, ''),
    retentionDays: Number(env.RETENTION_DAYS) || 120,
  };
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

/** Live-Benachrichtigungen (Server-Sent Events) pro Wichtelrunde. */
class EventHub {
  constructor() {
    this.clients = new Map();
    this.heartbeat = setInterval(() => {
      for (const set of this.clients.values()) for (const res of set) res.write(': ping\n\n');
    }, 20000);
    this.heartbeat.unref();
  }

  add(code, res) {
    if (!this.clients.has(code)) this.clients.set(code, new Set());
    this.clients.get(code).add(res);
    return () => {
      const set = this.clients.get(code);
      if (!set) return;
      set.delete(res);
      if (!set.size) this.clients.delete(code);
    };
  }

  notify(code, type = 'update') {
    const set = this.clients.get(code);
    if (!set) return;
    const msg = `event: ${type}\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`;
    for (const res of set) res.write(msg);
  }

  closeAll() {
    clearInterval(this.heartbeat);
    for (const set of this.clients.values()) for (const res of set) res.end();
    this.clients.clear();
  }
}

/** Einfache Bremse gegen massenhaftes Anlegen von Runden. */
class RateLimiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  hit(key) {
    const now = Date.now();
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5000) this.hits.clear();
    return list.length <= this.max;
  }
}

function createApp({ store, config, hub = new EventHub(), logger = console }) {
  const app = express();
  const createLimiter = new RateLimiter(30, 60 * 60 * 1000);

  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; " +
        "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    next();
  });

  app.get('/health', (req, res) => res.json({ ok: true }));

  // ---------------------------------------------------------------------------
  // Seiten
  // ---------------------------------------------------------------------------

  const sendPage = (file) => (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(PUBLIC_DIR, file));
  };
  app.get('/', sendPage('index.html'));
  app.get('/lehrer/:code', sendPage('lehrer.html'));
  app.get('/k/:code', sendPage('kind.html'));
  app.get('/k', (req, res) => res.redirect('/'));

  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      setHeaders(res, filePath) {
        // Schriften ändern sich nie, alles andere immer frisch prüfen (Updates sofort sichtbar)
        res.set('Cache-Control', filePath.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  function baseUrl(req) {
    if (config.publicUrl) return config.publicUrl;
    const host = req.get('host') || `localhost:${config.port}`;
    const hostname = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      // Am eigenen Computer gestartet: Tablets erreichen "localhost" nicht, also WLAN-Adresse verwenden.
      const lan = lanAddresses()[0];
      const port = (host.match(/:(\d+)$/) || [])[1];
      if (lan) return `${req.protocol}://${lan}${port ? `:${port}` : ''}`;
    }
    return `${req.protocol}://${host}`;
  }

  function loadRound(req) {
    const round = store.getRound(normalizeCode(req.params.code));
    if (!round) throw new HttpError(404, 'Diese Wichtelrunde gibt es nicht (mehr). Bitte den Code prüfen.');
    return round;
  }

  function requireAdmin(req) {
    const round = loadRound(req);
    if (!tokenMatches(req.get('x-admin-token'), round.admin_hash)) {
      throw new HttpError(403, 'Kein Zugriff. Bitte den Lehrer-Link verwenden.');
    }
    return round;
  }

  function loadChild(round, id) {
    const childId = Number.parseInt(id, 10);
    const child = Number.isFinite(childId) ? store.getChild(round, childId) : null;
    if (!child) throw new HttpError(404, 'Dieses Kind gibt es in der Wichtelrunde nicht.');
    return child;
  }

  function requireKid(req) {
    const round = loadRound(req);
    const child = loadChild(round, req.params.id);
    if (!child.device_hash || !tokenMatches(req.get('x-device-token'), child.device_hash)) {
      throw new HttpError(403, 'Dieser Name ist auf einem anderen Gerät ausgewählt. Bitte frag deine Lehrperson.');
    }
    return { round, child };
  }

  function revealInfo(round, child, children, now = Date.now()) {
    if (!round.drawn_at || !child.giftee_id) return null;
    // Erst wenn alle Wichtel vom Beamer weggelaufen sind, kommen sie auf den Tablets an.
    // (Wer später dazukommt, bekommt den Zettel sofort.)
    const revealAt = round.drawn_at + (round.parade?.total || 0) + child.reveal_delay;
    const inMs = Math.max(0, revealAt - now);
    const giftee = children.find((c) => c.id === child.giftee_id);
    return {
      in_ms: inMs,
      giftee: inMs === 0 && giftee ? { name: giftee.name, wishes: giftee.wishes, nogos: giftee.nogos } : null,
    };
  }

  function adminState(req, round) {
    const children = store.listChildren(round);
    return {
      round: {
        code: round.code,
        title: round.title,
        hint: round.hint,
        created_at: round.created_at,
        drawn_at: round.drawn_at,
        parade: round.parade,
      },
      children: children.map((c) => ({
        id: c.id,
        name: c.name,
        claimed: !!c.device_hash,
        done: !!c.done_at,
        has_note: !!(c.wishes || c.nogos),
        revealed: !!c.revealed_at,
      })),
      kid_url: `${baseUrl(req)}/k/${round.code}`,
      min_children: MIN_CHILDREN,
      server_now: Date.now(),
    };
  }

  function kidState(round, child) {
    const children = store.listChildren(round);
    return {
      round: { code: round.code, title: round.title, hint: round.hint, drawn: !!round.drawn_at },
      me: {
        id: child.id,
        name: child.name,
        wishes: child.wishes,
        nogos: child.nogos,
        done: !!child.done_at,
        revealed: !!child.revealed_at,
      },
      reveal: revealInfo(round, child, children),
    };
  }

  function readNote(body) {
    return {
      wishes: cleanText(body?.wishes, LIMITS.wishes, { multiline: true }),
      nogos: cleanText(body?.nogos, LIMITS.nogos, { multiline: true }),
    };
  }

  function changed(round) {
    hub.notify(round.code);
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------

  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Schreibende Anfragen mit Inhalt nur als JSON (erzwingt CORS-Preflight bei fremden Seiten)
    if (!['GET', 'HEAD'].includes(req.method) && req.is('application/json') === false) {
      throw new HttpError(415, 'Anfragen müssen als JSON gesendet werden.');
    }
    next();
  });

  api.get('/config', (req, res) => {
    res.json({ password_required: !!config.teacherPassword, limits: LIMITS, min_children: MIN_CHILDREN });
  });

  // ----- Neue Runde -----
  api.post('/rounds', (req, res) => {
    if (config.teacherPassword) {
      const pw = typeof req.body?.password === 'string' ? req.body.password : '';
      const a = Buffer.from(hashToken(pw), 'hex');
      const b = Buffer.from(hashToken(config.teacherPassword), 'hex');
      if (!crypto.timingSafeEqual(a, b)) throw new HttpError(401, 'Das Passwort stimmt nicht.');
    }
    if (!createLimiter.hit(req.ip || 'unknown')) {
      throw new HttpError(429, 'Zu viele neue Runden in kurzer Zeit. Bitte später nochmal versuchen.');
    }
    const title = cleanText(req.body?.title, LIMITS.title) || 'Unsere Klasse';
    const hint = cleanText(req.body?.hint, LIMITS.hint);
    const names = parseNames(req.body?.names);
    if (names.length > LIMITS.children) throw new HttpError(400, `Höchstens ${LIMITS.children} Kinder pro Runde.`);
    const dup = findDuplicate(names);
    if (dup) throw new HttpError(400, `Der Name „${dup}“ kommt doppelt vor. Bitte z. B. „${dup} M.“ schreiben.`);

    let code;
    for (let i = 0; i < 20 && (!code || store.getRound(code)); i++) code = randomCode();
    if (store.getRound(code)) throw new HttpError(500, 'Bitte nochmal versuchen.');

    const adminToken = randomToken();
    store.createRound({ code, adminHash: hashToken(adminToken), title, hint, names });
    logger.log(`Neue Wichtelrunde ${code} („${title}“, ${names.length} Kinder)`);
    res.status(201).json({ code, admin_token: adminToken });
  });

  // ----- Live-Updates -----
  api.get('/rounds/:code/events', (req, res) => {
    const round = loadRound(req);
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write(`retry: 3000\n: ${' '.repeat(2048)}\n\n`);
    const remove = hub.add(round.code, res);
    req.on('close', remove);
  });

  api.get('/rounds/:code/qr.svg', (req, res) => {
    const round = loadRound(req);
    res.type('image/svg+xml').set('Cache-Control', 'no-cache').send(qrSvg(`${baseUrl(req)}/k/${round.code}`));
  });

  // ----- Lehrperson -----
  api.get('/rounds/:code/admin', (req, res) => {
    res.json(adminState(req, requireAdmin(req)));
  });

  api.patch('/rounds/:code/admin', (req, res) => {
    const round = requireAdmin(req);
    const title = req.body?.title !== undefined ? cleanText(req.body.title, LIMITS.title) : round.title;
    const hint = req.body?.hint !== undefined ? cleanText(req.body.hint, LIMITS.hint) : round.hint;
    store.updateRound(round, { title: title || round.title, hint });
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.delete('/rounds/:code/admin', (req, res) => {
    const round = requireAdmin(req);
    store.deleteRound(round);
    hub.notify(round.code, 'deleted');
    res.json({ ok: true });
  });

  api.post('/rounds/:code/admin/children', (req, res) => {
    const round = requireAdmin(req);
    if (round.drawn_at) throw new HttpError(409, 'Nach der Auslosung können keine Kinder mehr dazukommen.');
    const names = parseNames(req.body?.names);
    if (!names.length) throw new HttpError(400, 'Bitte mindestens einen Namen eingeben.');
    const existing = store.listChildren(round);
    if (existing.length + names.length > LIMITS.children) {
      throw new HttpError(400, `Höchstens ${LIMITS.children} Kinder pro Runde.`);
    }
    const dup = findDuplicate([...existing.map((c) => c.name), ...names]);
    if (dup) throw new HttpError(400, `Der Name „${dup}“ kommt doppelt vor. Bitte z. B. „${dup} M.“ schreiben.`);
    store.addChildren(round, names);
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.patch('/rounds/:code/admin/children/:id', (req, res) => {
    const round = requireAdmin(req);
    const child = loadChild(round, req.params.id);
    const name = cleanText(req.body?.name, LIMITS.name);
    if (!name) throw new HttpError(400, 'Der Name darf nicht leer sein.');
    const others = store.listChildren(round).filter((c) => c.id !== child.id);
    if (findDuplicate([...others.map((c) => c.name), name])) throw new HttpError(400, `„${name}“ gibt es schon.`);
    store.renameChild(round, child, name);
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.delete('/rounds/:code/admin/children/:id', (req, res) => {
    const round = requireAdmin(req);
    const child = loadChild(round, req.params.id);
    if (round.drawn_at) throw new HttpError(409, 'Nach der Auslosung kann niemand mehr entfernt werden.');
    store.deleteChild(round, child);
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.post('/rounds/:code/admin/children/:id/release', (req, res) => {
    const round = requireAdmin(req);
    store.releaseChild(round, loadChild(round, req.params.id));
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.post('/rounds/:code/admin/children/:id/reopen', (req, res) => {
    const round = requireAdmin(req);
    store.setDone(round, loadChild(round, req.params.id), false);
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.post('/rounds/:code/admin/draw', (req, res) => {
    const round = requireAdmin(req);
    if (round.drawn_at) throw new HttpError(409, 'Es wurde schon ausgelost.');
    const children = store.listChildren(round);
    if (children.length < MIN_CHILDREN) {
      throw new HttpError(400, `Für die Auslosung braucht es mindestens ${MIN_CHILDREN} Kinder.`);
    }
    const missing = children.filter((c) => !c.done_at).map((c) => c.name);
    if (missing.length && !req.body?.force) {
      return res.status(409).json({ error: 'Noch nicht alle Zettel sind fertig.', missing });
    }
    const circle = drawCircle(children.map((c) => c.id));
    const giftIds = children.filter((c) => c.done_at).map((c) => c.id);
    const parade = { ...paradeTiming(giftIds.length), gift_ids: giftIds };
    const assignments = new Map();
    for (const [giver, giftee] of circle) {
      assignments.set(giver, { gifteeId: giftee, revealDelay: 300 + crypto.randomInt(2200) });
    }
    store.saveDraw(round, assignments, parade);
    logger.log(`Wichtelrunde ${round.code}: ausgelost (${children.length} Kinder)`);
    hub.notify(round.code, 'drawn');
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.post('/rounds/:code/admin/undraw', (req, res) => {
    const round = requireAdmin(req);
    store.clearDraw(round);
    changed(round);
    res.json(adminState(req, store.getRound(round.code)));
  });

  api.get('/rounds/:code/admin/pairs', (req, res) => {
    const round = requireAdmin(req);
    if (!round.drawn_at) throw new HttpError(409, 'Es wurde noch nicht ausgelost.');
    const children = store.listChildren(round);
    const byId = new Map(children.map((c) => [c.id, c]));
    res.json(
      children.map((c) => {
        const g = byId.get(c.giftee_id);
        return {
          giver: { id: c.id, name: c.name },
          giftee: g ? { id: g.id, name: g.name, wishes: g.wishes, nogos: g.nogos } : null,
        };
      }),
    );
  });

  // ----- Kinder -----
  api.get('/rounds/:code/kids', (req, res) => {
    const round = loadRound(req);
    res.json({
      round: { code: round.code, title: round.title, drawn: !!round.drawn_at },
      children: store.listChildren(round).map((c) => ({
        id: c.id,
        name: c.name,
        taken: !!c.device_hash,
        done: !!c.done_at,
      })),
    });
  });

  api.post('/rounds/:code/kids/:id/claim', (req, res) => {
    const round = loadRound(req);
    const child = loadChild(round, req.params.id);
    const offered = typeof req.body?.token === 'string' ? req.body.token : '';
    if (child.device_hash) {
      if (tokenMatches(offered, child.device_hash)) return res.json({ token: offered, state: kidState(round, child) });
      throw new HttpError(
        409,
        `„${child.name}“ wurde schon auf einem anderen Gerät ausgewählt. Wenn das du bist, frag deine Lehrperson.`,
      );
    }
    const token = randomToken();
    store.claimChild(round, child, hashToken(token));
    changed(round);
    res.json({ token, state: kidState(round, store.getChild(round, child.id)) });
  });

  api.get('/rounds/:code/kids/:id', (req, res) => {
    const { round, child } = requireKid(req);
    res.json(kidState(round, child));
  });

  api.put('/rounds/:code/kids/:id/note', (req, res) => {
    const { round, child } = requireKid(req);
    if (child.done_at) throw new HttpError(409, 'Dein Zettel ist schon verpackt.');
    store.saveNote(round, child, readNote(req.body));
    if (!child.wishes && !child.nogos) changed(round);
    res.json({ ok: true });
  });

  api.post('/rounds/:code/kids/:id/done', (req, res) => {
    const { round, child } = requireKid(req);
    if (!child.done_at) {
      store.saveNote(round, child, readNote(req.body));
      store.setDone(round, child, true);
      changed(round);
    }
    res.json(kidState(round, store.getChild(round, child.id)));
  });

  api.post('/rounds/:code/kids/:id/reopen', (req, res) => {
    const { round, child } = requireKid(req);
    if (round.drawn_at) throw new HttpError(409, 'Die Wichtel sind schon losgelaufen – jetzt kann der Zettel nicht mehr geändert werden.');
    store.setDone(round, child, false);
    changed(round);
    res.json(kidState(round, store.getChild(round, child.id)));
  });

  api.post('/rounds/:code/kids/:id/revealed', (req, res) => {
    const { round, child } = requireKid(req);
    if (round.drawn_at) {
      store.setRevealed(round, child);
      changed(round);
    }
    res.json({ ok: true });
  });

  app.use('/api', api);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Nicht gefunden.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) logger.error(err);
    if (res.headersSent) return res.end();
    const message =
      status === 400 && err.type === 'entity.parse.failed'
        ? 'Ungültige Anfrage.'
        : status >= 500
          ? 'Da ist etwas schiefgelaufen. Bitte nochmal versuchen.'
          : err.message;
    res.status(status).json({ error: message });
  });

  return app;
}

function start() {
  // Einstellungen aus einer Datei .env übernehmen (falls vorhanden)
  try {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
  } catch {
    /* keine .env-Datei */
  }
  const config = loadConfig();
  const store = openStore(config.databasePath);
  const hub = new EventHub();
  const app = createApp({ store, config, hub });

  const cleanup = () => {
    const removed = store.deleteRoundsOlderThan(Date.now() - config.retentionDays * DAY);
    if (removed) console.log(`${removed} alte Wichtelrunde(n) gelöscht (älter als ${config.retentionDays} Tage).`);
  };
  cleanup();
  setInterval(cleanup, 12 * 60 * 60 * 1000).unref();

  const server = app.listen(config.port, () => {
    console.log('');
    console.log(`🎄 Wichtel-Tool läuft:  http://localhost:${config.port}`);
    const lan = lanAddresses().map((a) => `http://${a}:${config.port}`);
    if (lan.length) console.log(`   Im gleichen WLAN:     ${lan.join('  oder  ')}`);
    if (config.teacherPassword) console.log('   Neue Runden nur mit Passwort (TEACHER_PASSWORD).');
    console.log('   Beenden mit Strg+C.');
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${config.port} ist schon belegt – läuft das Wichtel-Tool schon in einem anderen Fenster?\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  const shutdown = () => {
    hub.closeAll();
    server.close(() => {
      store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) start();

module.exports = { createApp, loadConfig, EventHub };
