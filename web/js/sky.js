// Leben am Nachthimmel: der Weihnachtsmann fliegt mit dem Schlitten vorbei, ab und zu fällt eine Sternschnuppe.

import { reducedMotion } from './common.js';

function reindeer(x, y, { lead = false, phase = 0 } = {}) {
  const fur = '#a9713f';
  const light = '#cf9a62';
  const legs = (px, cls) => `<g class="rd-legs ${cls}" style="transform-origin:${px}px 6px;animation-delay:${-phase}s">
      <path d="M${px - 2} 5 L${px - 5} 21" stroke="${fur}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M${px + 2} 5 L${px + 6} 20" stroke="#8d5c31" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="${px - 5.2}" cy="22" r="2.1" fill="#3a2416"/><circle cx="${px + 6.3}" cy="21" r="2.1" fill="#3a2416"/>
    </g>`;
  return `<g transform="translate(${x} ${y})">
    <g class="rd-bob" style="animation-delay:${-phase}s">
      ${legs(-11, 'rd-hind')}${legs(11, 'rd-front')}
      <ellipse cx="-19" cy="-4" rx="3.6" ry="2.6" fill="#f5ead6"/>
      <ellipse cx="0" cy="0" rx="20" ry="9.5" fill="${fur}"/>
      <ellipse cx="-2" cy="4" rx="13" ry="4.4" fill="${light}" opacity=".7"/>
      <path d="M9 -5 L20 -21 L29 -15 L19 3Z" fill="${fur}"/>
      <rect x="1" y="-10" width="5.5" height="20" rx="2" fill="#d83a45"/>
      <circle cx="3.8" cy="10.4" r="2.5" fill="#f6cf5a"/>
      <path d="M22 -25 q-3 -9 -9 -11 M19 -31 q3 -4 4 -9 M27 -26 q2 -9 9 -11 M30 -32 q-1 -4 2 -8" stroke="#e9cf9c" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="20.5" cy="-24" rx="3" ry="4.4" fill="${fur}" transform="rotate(-30 20.5 -24)"/>
      <ellipse cx="28" cy="-19" rx="9" ry="6.6" fill="${fur}" transform="rotate(-14 28 -19)"/>
      <ellipse cx="35" cy="-17" rx="5.2" ry="4.2" fill="${light}"/>
      <circle cx="29.5" cy="-21.4" r="1.4" fill="#1b1410"/>
      ${
        lead
          ? `<circle class="rd-glow" cx="40" cy="-17.6" r="8" fill="#ff5a4d" opacity=".4"/><circle cx="40" cy="-17.6" r="3.2" fill="#ff3b30"/><circle cx="39" cy="-18.6" r="1" fill="#fff" opacity=".8"/>`
          : `<circle cx="39.6" cy="-17.6" r="2.2" fill="#3a2416"/>`
      }
    </g>
  </g>`;
}

function star(x, y, r, delay) {
  const k = r * 0.28;
  return `<path class="sleigh-spark" style="animation-delay:${delay}s" d="M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k}Z" fill="#ffe9a3"/>`;
}

/** Schlitten mit Weihnachtsmann und drei Rentieren, fliegt nach rechts (viewBox 0 0 470 130). */
export function sleighSvg() {
  return `<svg class="sleigh-svg" viewBox="0 0 470 130" aria-hidden="true">
    <defs>
      <linearGradient id="slg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2434f"/><stop offset="1" stop-color="#a82230"/></linearGradient>
    </defs>
    <!-- Glitzerspur -->
    ${star(8, 70, 4, 0)}${star(22, 58, 6, -0.4)}${star(30, 82, 4.5, -0.9)}${star(44, 66, 7, -0.2)}${star(52, 90, 3.6, -0.6)}${star(16, 92, 3, -1.1)}
    <!-- Zügel -->
    <path d="M168 62 Q215 70 262 62 L400 60" stroke="#5a3a22" stroke-width="1.6" fill="none"/>
    ${reindeer(262, 66, { phase: 0.1 })}${reindeer(332, 60, { phase: 0.28 })}${reindeer(402, 64, { lead: true, phase: 0 })}
    <!-- Kufen -->
    <path d="M62 106 L160 106 Q184 106 186 84" stroke="#f6cf5a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M84 94 V106 M146 94 V106" stroke="#f6cf5a" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Geschenkesack -->
    <path d="M58 60 C44 44 56 22 76 22 C96 20 108 38 100 58Z" fill="#8a5a2b"/>
    <path d="M70 26 q8 -8 16 -1" stroke="#f6cf5a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="62" y="12" width="15" height="14" rx="2" fill="#3f9a63" transform="rotate(-14 69 19)"/>
    <rect x="80" y="9" width="13" height="15" rx="2" fill="#f0b53c" transform="rotate(10 86 16)"/>
    <!-- Weihnachtsmann -->
    <ellipse cx="124" cy="68" rx="19" ry="20" fill="#d83a45"/>
    <rect x="105" y="72" width="38" height="6" fill="#2a1c14"/><rect x="120" y="71" width="8" height="8" rx="1.5" fill="#f6cf5a"/>
    <circle cx="130" cy="40" r="11" fill="#fbd3b4"/>
    <path d="M119 42 C118 62 142 64 143 44 C138 50 126 50 119 42Z" fill="#fff"/>
    <circle cx="134.5" cy="38" r="1.4" fill="#1b1410"/><circle cx="138.5" cy="42.5" r="2.4" fill="#f2877a"/>
    <path d="M118 36 C116 22 134 18 142 31 C134 28 126 30 118 36Z" fill="#d83a45"/>
    <path d="M119 31 C112 26 104 26 99 31 C106 31 112 34 118 37Z" fill="#d83a45"/>
    <circle cx="98" cy="31.5" r="4.6" fill="#fff"/>
    <path d="M117 37 Q130 28 143 32" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path class="santa-arm" style="transform-origin:132px 62px" d="M132 62 Q150 58 166 60" stroke="#c0303c" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="168" cy="60.5" r="5" fill="#3f9a63"/>
    <!-- Schlitten -->
    <path d="M54 50 C46 74 56 94 82 96 L156 96 C174 96 182 82 180 66 C176 76 166 80 158 77 L158 70 C134 80 104 76 96 66 C90 60 88 52 84 46 C74 40 60 40 54 50Z" fill="url(#slg)"/>
    <path d="M54 50 C60 40 74 40 84 46 C88 52 90 60 96 66 C104 76 134 80 158 70" stroke="#f6cf5a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M70 84 q40 8 84 0" stroke="#f6cf5a" stroke-width="2" fill="none" opacity=".7"/>
  </svg>`;
}

/**
 * Lässt den Weihnachtsmann in Abständen über den Himmel fliegen.
 * @param {{ first?: number, every?: [number, number] }} options Zeiten in Sekunden
 */
export function startSky({ first = 6, every = [38, 64] } = {}) {
  if (reducedMotion) return { stop() {} };
  const layer = document.createElement('div');
  layer.className = 'sky-fly';
  layer.setAttribute('aria-hidden', 'true');
  const anchor = document.querySelector('.moon') || document.querySelector('.sky-stars');
  if (anchor) anchor.after(layer);
  else document.body.prepend(layer);

  let stopped = false;
  let dir = 1;
  const timers = [];
  const later = (fn, s) => timers.push(setTimeout(fn, s * 1000));
  const visible = () => document.visibilityState === 'visible' && !document.body.classList.contains('in-cabin');

  function flySanta() {
    if (stopped) return;
    if (visible()) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.max(190, Math.min(430, vw * 0.27));
      const h = (w * 130) / 470;
      const el = document.createElement('div');
      el.className = 'sleigh';
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.innerHTML = `<div class="sleigh-inner${dir < 0 ? ' flip' : ''}">${sleighSvg()}</div>`;
      layer.appendChild(el);
      const y0 = vh * (0.2 + Math.random() * 0.14);
      const arc = vh * (0.07 + Math.random() * 0.06);
      const from = dir > 0 ? -w - 30 : vw + 30;
      const to = dir > 0 ? vw + 30 : -w - 30;
      const frames = [];
      const N = 10;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = from + (to - from) * t;
        const y = y0 - arc * Math.sin(Math.PI * t);
        const slope = (-arc * Math.PI * Math.cos(Math.PI * t)) / Math.abs(to - from);
        const angle = Math.atan(slope) * (180 / Math.PI) * dir;
        frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${angle.toFixed(2)}deg)` });
      }
      const duration = Math.max(11000, Math.min(19000, (vw + w) * 11));
      el.animate(frames, { duration, easing: 'linear' }).finished.then(() => el.remove(), () => el.remove());
      dir = -dir;
    }
    later(flySanta, every[0] + Math.random() * (every[1] - every[0]));
  }

  function shootingStar() {
    if (stopped) return;
    if (visible()) {
      const el = document.createElement('i');
      el.className = 'shooting-star';
      const x = window.innerWidth * (0.1 + Math.random() * 0.7);
      const y = window.innerHeight * (0.04 + Math.random() * 0.22);
      const len = 160 + Math.random() * 140;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      layer.appendChild(el);
      el.animate(
        [
          { transform: 'rotate(24deg) translateX(0) scaleX(.2)', opacity: 0 },
          { transform: `rotate(24deg) translateX(${len * 0.3}px) scaleX(1)`, opacity: 1, offset: 0.25 },
          { transform: `rotate(24deg) translateX(${len}px) scaleX(.4)`, opacity: 0 },
        ],
        { duration: 900, easing: 'ease-out' },
      ).finished.then(() => el.remove(), () => el.remove());
    }
    later(shootingStar, 9 + Math.random() * 16);
  }

  later(flySanta, first);
  later(shootingStar, 3 + Math.random() * 5);

  return {
    stop() {
      stopped = true;
      timers.forEach(clearTimeout);
      layer.remove();
    },
  };
}
