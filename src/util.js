'use strict';

const crypto = require('node:crypto');
const qrcode = require('qrcode-generator');

// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L), damit Kinder den Code auch abtippen können.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

const LIMITS = {
  title: 60,
  hint: 240,
  name: 30,
  wishes: 800,
  nogos: 800,
  children: 60,
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

function normalizeCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

function randomToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function tokenMatches(token, hash) {
  if (typeof token !== 'string' || !token || typeof hash !== 'string' || !hash) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Entfernt Steuerzeichen, vereinheitlicht Zeilenumbrüche und kürzt auf die erlaubte Länge. */
function cleanText(value, max, { multiline = false } = {}) {
  let text = typeof value === 'string' ? value : '';
  text = text.normalize('NFC').replace(/\r\n?/g, '\n');
  // eslint-disable-next-line no-control-regex
  text = text.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '');
  if (multiline) {
    text = text
      .split('\n')
      .map((line) => line.replace(/\s+$/u, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  } else {
    text = text.replace(/\s+/gu, ' ');
  }
  text = text.trim();
  return [...text].slice(0, max).join('');
}

/** Liest eine Namensliste (Array oder Text mit einem Namen pro Zeile / mit Komma getrennt). */
function parseNames(value) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(/[\n,;]+/);
  const names = [];
  for (const entry of raw) {
    const name = cleanText(entry, LIMITS.name);
    if (name) names.push(name);
  }
  return names;
}

function findDuplicate(names) {
  const seen = new Set();
  for (const name of names) {
    const key = name.toLocaleLowerCase('de-CH');
    if (seen.has(key)) return name;
    seen.add(key);
  }
  return null;
}

/** QR-Code als schlichtes, gut scannbares SVG. */
function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 2;
  const size = count + quiet * 2;
  let d = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path d="${d}" fill="#14251b"/></svg>`
  );
}

module.exports = {
  CODE_ALPHABET,
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
};
