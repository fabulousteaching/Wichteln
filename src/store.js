'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rounds (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  admin_hash  TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  hint        TEXT    NOT NULL DEFAULT '',
  drawn_at    INTEGER,
  parade      TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id      INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  position      INTEGER NOT NULL,
  device_hash   TEXT,
  claimed_at    INTEGER,
  wishes        TEXT    NOT NULL DEFAULT '',
  nogos         TEXT    NOT NULL DEFAULT '',
  done_at       INTEGER,
  giftee_id     INTEGER,
  reveal_delay  INTEGER NOT NULL DEFAULT 0,
  revealed_at   INTEGER,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_children_round ON children(round_id, position);
`;

const CHILD_COLUMNS =
  'id, round_id, name, position, device_hash, claimed_at, wishes, nogos, done_at, giftee_id, reveal_delay, revealed_at, updated_at';

function parseParade(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapRound(row) {
  if (!row) return null;
  return { ...row, parade: parseParade(row.parade) };
}

function openStore(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);

  const stmt = {
    roundByCode: db.prepare('SELECT * FROM rounds WHERE code = ?'),
    insertRound: db.prepare(
      'INSERT INTO rounds (code, admin_hash, title, hint, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    updateRound: db.prepare('UPDATE rounds SET title = ?, hint = ?, updated_at = ? WHERE id = ?'),
    touchRound: db.prepare('UPDATE rounds SET updated_at = ? WHERE id = ?'),
    setDrawn: db.prepare('UPDATE rounds SET drawn_at = ?, parade = ?, updated_at = ? WHERE id = ?'),
    deleteRound: db.prepare('DELETE FROM rounds WHERE id = ?'),
    deleteOldRounds: db.prepare('DELETE FROM rounds WHERE updated_at < ?'),
    children: db.prepare(`SELECT ${CHILD_COLUMNS} FROM children WHERE round_id = ? ORDER BY position, id`),
    child: db.prepare(`SELECT ${CHILD_COLUMNS} FROM children WHERE round_id = ? AND id = ?`),
    maxPosition: db.prepare('SELECT COALESCE(MAX(position), -1) AS pos FROM children WHERE round_id = ?'),
    insertChild: db.prepare('INSERT INTO children (round_id, name, position, updated_at) VALUES (?, ?, ?, ?)'),
    renameChild: db.prepare('UPDATE children SET name = ?, updated_at = ? WHERE id = ?'),
    deleteChild: db.prepare('DELETE FROM children WHERE id = ?'),
    claimChild: db.prepare('UPDATE children SET device_hash = ?, claimed_at = ?, updated_at = ? WHERE id = ?'),
    releaseChild: db.prepare('UPDATE children SET device_hash = NULL, claimed_at = NULL, updated_at = ? WHERE id = ?'),
    saveNote: db.prepare('UPDATE children SET wishes = ?, nogos = ?, updated_at = ? WHERE id = ?'),
    setDone: db.prepare('UPDATE children SET done_at = ?, updated_at = ? WHERE id = ?'),
    setGiftee: db.prepare(
      'UPDATE children SET giftee_id = ?, reveal_delay = ?, revealed_at = NULL, updated_at = ? WHERE id = ?',
    ),
    setRevealed: db.prepare('UPDATE children SET revealed_at = ?, updated_at = ? WHERE id = ? AND revealed_at IS NULL'),
  };

  function transaction(fn) {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const now = () => Date.now();

  return {
    db,
    transaction,

    getRound(code) {
      return mapRound(stmt.roundByCode.get(code));
    },

    createRound({ code, adminHash, title, hint, names }) {
      return transaction(() => {
        const t = now();
        const { lastInsertRowid } = stmt.insertRound.run(code, adminHash, title, hint, t, t);
        const roundId = Number(lastInsertRowid);
        names.forEach((name, i) => stmt.insertChild.run(roundId, name, i, t));
        return mapRound(stmt.roundByCode.get(code));
      });
    },

    updateRound(round, { title, hint }) {
      stmt.updateRound.run(title, hint, now(), round.id);
    },

    touch(round) {
      stmt.touchRound.run(now(), round.id);
    },

    deleteRound(round) {
      stmt.deleteRound.run(round.id);
    },

    deleteRoundsOlderThan(timestamp) {
      return Number(stmt.deleteOldRounds.run(timestamp).changes);
    },

    listChildren(round) {
      return stmt.children.all(round.id);
    },

    getChild(round, childId) {
      return stmt.child.get(round.id, childId) || null;
    },

    addChildren(round, names) {
      return transaction(() => {
        let pos = stmt.maxPosition.get(round.id).pos;
        const t = now();
        for (const name of names) stmt.insertChild.run(round.id, name, ++pos, t);
        stmt.touchRound.run(t, round.id);
      });
    },

    renameChild(round, child, name) {
      const t = now();
      stmt.renameChild.run(name, t, child.id);
      stmt.touchRound.run(t, round.id);
    },

    deleteChild(round, child) {
      stmt.deleteChild.run(child.id);
      stmt.touchRound.run(now(), round.id);
    },

    claimChild(round, child, deviceHash) {
      const t = now();
      stmt.claimChild.run(deviceHash, t, t, child.id);
      stmt.touchRound.run(t, round.id);
    },

    releaseChild(round, child) {
      const t = now();
      stmt.releaseChild.run(t, child.id);
      stmt.touchRound.run(t, round.id);
    },

    saveNote(round, child, { wishes, nogos }) {
      const t = now();
      stmt.saveNote.run(wishes, nogos, t, child.id);
      stmt.touchRound.run(t, round.id);
    },

    setDone(round, child, done) {
      const t = now();
      stmt.setDone.run(done ? t : null, t, child.id);
      stmt.touchRound.run(t, round.id);
    },

    setRevealed(round, child) {
      const t = now();
      if (Number(stmt.setRevealed.run(t, t, child.id).changes)) stmt.touchRound.run(t, round.id);
    },

    /** assignments: Map(childId -> { gifteeId, revealDelay }) */
    saveDraw(round, assignments, parade) {
      transaction(() => {
        const t = now();
        for (const [childId, a] of assignments) stmt.setGiftee.run(a.gifteeId, a.revealDelay, t, childId);
        stmt.setDrawn.run(t, JSON.stringify(parade), t, round.id);
      });
    },

    clearDraw(round) {
      transaction(() => {
        const t = now();
        for (const c of stmt.children.all(round.id)) stmt.setGiftee.run(null, 0, t, c.id);
        stmt.setDrawn.run(null, null, t, round.id);
      });
    },

    close() {
      db.close();
    },
  };
}

module.exports = { openStore };
