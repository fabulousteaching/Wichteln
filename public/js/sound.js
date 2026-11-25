// Kleine Weihnachtsklänge, direkt im Browser erzeugt (keine Audiodateien nötig).

import { storage } from './common.js';

let ctx = null;
let master = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1567.98, A4: 440, G4: 392, C4: 261.63 };

/** Glockenklang: Grundton + unharmonische Obertöne mit Ausklingen. */
function bell(freq, at = 0, { dur = 1.4, vol = 0.18 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const partials = [
    [1, 1],
    [2.0, 0.45],
    [2.76, 0.3],
    [5.4, 0.12],
  ];
  for (const [mult, amp] of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * amp, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mult ** 0.4);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }
}

/** Schellen (Schlittenglöckchen): kurzes, hohes Rauschen. */
function jingle(at = 0, vol = 0.12) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const len = 0.25;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.05));
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const bp = ac.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 9000;
  bp.gain.value = 8;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(hp).connect(bp).connect(g).connect(master);
  src.start(t);
}

const KEY = 'wichtel:sound';

export const sound = {
  get enabled() {
    return storage.get(KEY, true);
  },
  set enabled(v) {
    storage.set(KEY, !!v);
  },

  /** Muss einmal nach einem Tippen/Klick aufgerufen werden (Browser-Regel). */
  unlock() {
    if (this.enabled) audio();
  },

  pling() {
    if (!this.enabled) return;
    const notes = [NOTE.E6, NOTE.G6, NOTE.C6, NOTE.D6, NOTE.A5];
    bell(notes[Math.floor(Math.random() * notes.length)], 0, { dur: 1.2, vol: 0.12 });
  },

  pop() {
    if (!this.enabled) return;
    bell(NOTE.C6, 0, { dur: 0.6, vol: 0.12 });
    bell(NOTE.G6, 0.06, { dur: 0.8, vol: 0.08 });
  },

  wrapped() {
    if (!this.enabled) return;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((n, i) => bell(n, i * 0.11, { dur: 1.6, vol: 0.14 }));
    jingle(0.45, 0.08);
  },

  magic() {
    if (!this.enabled) return;
    [NOTE.G5, NOTE.B5, NOTE.D6, NOTE.G6, NOTE.D6, NOTE.G6].forEach((n, i) => bell(n, i * 0.08, { dur: 1.3, vol: 0.1 }));
  },

  /** „Jingle Bells“-Refrain (traditionell, gemeinfrei) mit Schellen. */
  jingleBells() {
    if (!this.enabled) return;
    const q = 0.24;
    const melody = [
      ['E5', 1], ['E5', 1], ['E5', 2],
      ['E5', 1], ['E5', 1], ['E5', 2],
      ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5], ['E5', 4],
      ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5],
      ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5],
      ['E5', 1], ['D5', 1], ['D5', 1], ['E5', 1], ['D5', 2], ['G5', 2],
    ];
    let t = 0;
    for (const [n, len] of melody) {
      bell(NOTE[n], t, { dur: 1.1, vol: 0.13 });
      t += len * q;
    }
    for (let b = 0; b < t; b += q * 2) jingle(b, 0.07);
  },
};
