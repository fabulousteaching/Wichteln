// Die Wichtelhütte: gemütliche Holzhütte mit Kamin. Hier bringt der Wichtel den Zettel.
// Die Hütte besteht aus einzelnen Teilen (Wand, Boden, Kamin, Fenster, Baum, Teppich), die je nach
// Bildschirmgrösse platziert werden. So steht der Kamin immer in der Mitte, hoch wie quer.

import { treeSvg, giftSvg } from './art.js';

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

function wallTile() {
  // 3 Holzbalken übereinander, nahtlos kachelbar
  const rows = [
    { y: 0, c: '#7d4c2b', seam: 150 },
    { y: 72, c: '#74452a', seam: 430 },
    { y: 144, c: '#814f2d', seam: 290 },
  ];
  let g = '';
  for (const r of rows) {
    g += `<rect x="0" y="${r.y}" width="600" height="72" fill="${r.c}"/>
      <rect x="0" y="${r.y}" width="600" height="5" fill="#9a6a40" opacity=".55"/>
      <rect x="0" y="${r.y + 66}" width="600" height="6" fill="#2e190c" opacity=".7"/>
      <path d="M0 ${r.y + 22} C120 ${r.y + 16} 220 ${r.y + 30} 360 ${r.y + 22} S540 ${r.y + 18} 600 ${r.y + 22}" stroke="#5c341b" stroke-width="1.6" fill="none" opacity=".5"/>
      <path d="M0 ${r.y + 44} C140 ${r.y + 50} 260 ${r.y + 38} 400 ${r.y + 46} S560 ${r.y + 48} 600 ${r.y + 44}" stroke="#5c341b" stroke-width="1.3" fill="none" opacity=".4"/>
      <rect x="${r.seam}" y="${r.y + 4}" width="3" height="62" fill="#2e190c" opacity=".55"/>
      <ellipse cx="${(r.seam + 210) % 600}" cy="${r.y + 34}" rx="9" ry="5" fill="#4d2a14" opacity=".55"/>
      <ellipse cx="${(r.seam + 210) % 600}" cy="${r.y + 34}" rx="4" ry="2" fill="#2e190c" opacity=".6"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="216" viewBox="0 0 600 216">${g}</svg>`;
}

function floorTile() {
  const rows = [
    { y: 0, c: '#a9713f', seam: 210 },
    { y: 40, c: '#9f6938', seam: 470 },
    { y: 80, c: '#ad7643', seam: 90 },
  ];
  let g = '';
  for (const r of rows) {
    g += `<rect x="0" y="${r.y}" width="560" height="40" fill="${r.c}"/>
      <rect x="0" y="${r.y + 37}" width="560" height="3" fill="#5f3a1c" opacity=".6"/>
      <rect x="${r.seam}" y="${r.y}" width="2.5" height="38" fill="#5f3a1c" opacity=".5"/>
      <path d="M0 ${r.y + 18} C160 ${r.y + 12} 300 ${r.y + 26} 560 ${r.y + 18}" stroke="#7d4c26" stroke-width="1.2" fill="none" opacity=".45"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120" viewBox="0 0 560 120">${g}</svg>`;
}

function stonePattern(id) {
  // Natursteinmauer: versetzte Reihen, unterschiedlich breite Steine, nahtlos kachelbar (200 × 132)
  const tones = ['#c2b3a0', '#b3a28e', '#cbbdaa', '#a99885', '#bcab97', '#d1c4b2', '#b8a691'];
  const rows = [
    [[2, 66], [72, 52], [128, 70]],
    [[-28, 62], [38, 74], [116, 52], [172, 62]],
    [[2, 46], [52, 78], [134, 64]],
  ];
  let g = '';
  let n = 0;
  rows.forEach((row, r) => {
    const y = 2 + r * 44;
    for (const [x, w] of row) {
      const c = tones[n++ % tones.length];
      const h = 40;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}"/>
        <rect x="${x + 6}" y="${y + 4}" width="${w - 20}" height="5" rx="2.5" fill="#fff" opacity=".2"/>
        <rect x="${x + 3}" y="${y + h - 8}" width="${w - 6}" height="6" rx="3" fill="#000" opacity=".1"/>
        <circle cx="${x + w * 0.62}" cy="${y + 22}" r="2" fill="#000" opacity=".08"/>`;
    }
  });
  return `<pattern id="${id}" width="200" height="132" patternUnits="userSpaceOnUse">
      <rect width="200" height="132" fill="#6a5d52"/>${g}
    </pattern>`;
}

function stocking(x, color, shade, delay) {
  return `<g class="cabin-stocking" style="transform-origin:${x}px 204px;animation-delay:${delay}s">
      <path d="M${x} 196 V208" stroke="#f6cf5a" stroke-width="2.5"/>
      <path d="M${x - 13} 222 h26 v38 c0 8 6 12 14 14 c12 3 14 20 0 22 h-26 c-12 0 -16 -8 -14 -20z" fill="${color}"/>
      <path d="M${x - 13} 252 q13 8 26 0" stroke="${shade}" stroke-width="5" fill="none" opacity=".8"/>
      <ellipse cx="${x + 24}" cy="287" rx="9" ry="7" fill="${shade}" opacity=".8"/>
      <rect x="${x - 16}" y="206" width="32" height="18" rx="7" fill="#fff6e6"/>
    </g>`;
}

function candle(x, top, color) {
  return `<g>
      <circle class="cabin-candle-glow" cx="${x}" cy="${top - 12}" r="26" fill="#ffc861" opacity=".35"/>
      <rect x="${x - 8}" y="${top}" width="16" height="${150 - top}" rx="3" fill="${color}"/>
      <rect x="${x - 8}" y="${top}" width="5" height="${150 - top}" rx="2.5" fill="#fff" opacity=".25"/>
      <path d="M${x} ${top} v-5" stroke="#3a2416" stroke-width="1.6"/>
      <path class="cabin-candle-flame" style="transform-origin:${x}px ${top - 4}px" d="M${x} ${top - 22} C${x + 7} ${top - 12} ${x + 5} ${top - 4} ${x} ${top - 4} C${x - 5} ${top - 4} ${x - 7} ${top - 12} ${x} ${top - 22}Z" fill="#ffd75e"/>
      <path d="M${x} ${top - 13} C${x + 3} ${top - 9} ${x + 2} ${top - 5} ${x} ${top - 5} C${x - 2} ${top - 5} ${x - 3} ${top - 9} ${x} ${top - 13}Z" fill="#fff6c9"/>
    </g>`;
}

/** Kamin aus Naturstein mit brennendem Feuer (viewBox 0 0 640 700). Der Kaminzug reicht nach oben aus dem Bild. */
function fireplaceSvg() {
  const flame = 'M-74 0 C-88 -52 -42 -70 -50 -128 C-24 -108 -14 -84 -2 -160 C16 -96 38 -108 42 -62 C58 -94 82 -52 74 0Z';
  let sparks = '';
  for (let i = 0; i < 9; i++) {
    const x = 250 + ((i * 53) % 140);
    sparks += `<circle class="cabin-spark" cx="${x}" cy="610" r="${2 + (i % 3)}" fill="#ffd27a" style="animation-delay:${(-i * 0.47).toFixed(2)}s;--dx:${((i % 5) - 2) * 9}px"/>`;
  }
  let garland = '';
  // Tannengirlande am Sims: drei Bögen
  for (const [x0, x1] of [[52, 232], [232, 412], [412, 592]]) {
    const xm = (x0 + x1) / 2;
    garland += `<path d="M${x0} 190 Q${xm} 262 ${x1} 190" stroke="#1f6b3c" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M${x0} 190 Q${xm} 262 ${x1} 190" stroke="#2f9156" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="7 9"/>`;
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * xm + t * t * x1;
      const y = (1 - t) * (1 - t) * 190 + 2 * (1 - t) * t * 262 + t * t * 190;
      garland +=
        i % 2
          ? `<circle class="tree-light" style="animation-delay:${(i * 0.37).toFixed(2)}s" cx="${x.toFixed(1)}" cy="${(y + 3).toFixed(1)}" r="4.5" fill="#ffe28a"/>`
          : `<circle cx="${x.toFixed(1)}" cy="${(y + 2).toFixed(1)}" r="5" fill="#d83a45"/><circle cx="${(x - 1.5).toFixed(1)}" cy="${(y + 0.5).toFixed(1)}" r="1.5" fill="#fff" opacity=".6"/>`;
    }
  }
  const bow = (x) => `<g transform="translate(${x} 190)"><path d="M0 0 C-10 -14 -24 -10 -20 0 C-24 10 -10 12 0 0Z M0 0 C10 -14 24 -10 20 0 C24 10 10 12 0 0Z" fill="#d83a45"/><path d="M-3 2 L-9 20 L-3 17 L0 6Z M3 2 L9 20 L3 17 L0 6Z" fill="#a82230"/><circle r="5" fill="#e8525e"/></g>`;

  return `<svg class="cabin-fireplace-svg" viewBox="0 0 640 700" aria-hidden="true">
    <defs>
      ${stonePattern('cst')}
      <radialGradient id="cfg" cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#ffb347" stop-opacity=".95"/><stop offset=".45" stop-color="#ff7a2e" stop-opacity=".4"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>
      <linearGradient id="cbox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#170b07"/><stop offset="1" stop-color="#3a1a0e"/></linearGradient>
      <linearGradient id="cwood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6436"/><stop offset="1" stop-color="#6b4226"/></linearGradient>
      <clipPath id="cbx"><path d="M170 668 V400 A150 76 0 0 1 470 400 V668Z"/></clipPath>
    </defs>
    <!-- Kaminzug -->
    <rect x="118" y="-1800" width="404" height="1960" fill="url(#cst)"/>
    <rect x="118" y="-1800" width="14" height="1960" fill="#000" opacity=".18"/><rect x="508" y="-1800" width="14" height="1960" fill="#000" opacity=".22"/>
    <!-- Kranz -->
    <g transform="translate(320 62)">
      <circle r="50" fill="none" stroke="#1f6b3c" stroke-width="30"/>
      <circle r="50" fill="none" stroke="#2f9156" stroke-width="18" stroke-dasharray="9 8"/>
      ${[0, 55, 110, 200, 250, 305].map((a, i) => `<circle cx="${(50 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(50 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="5.5" fill="${i % 2 ? '#ffe28a' : '#d83a45'}" ${i % 2 ? `class="tree-light" style="animation-delay:${i * 0.4}s"` : ''}/>`).join('')}
      <g transform="translate(0 50)"><path d="M0 0 C-14 -18 -32 -12 -26 0 C-32 12 -14 16 0 0Z M0 0 C14 -18 32 -12 26 0 C32 12 14 16 0 0Z" fill="#d83a45"/><path d="M-4 3 L-13 28 L-4 23 L0 8Z M4 3 L13 28 L4 23 L0 8Z" fill="#a82230"/><circle r="6.5" fill="#e8525e"/></g>
    </g>
    <!-- Kaminumrandung -->
    <rect x="70" y="200" width="500" height="470" fill="url(#cst)"/>
    <rect x="70" y="200" width="500" height="26" fill="#000" opacity=".3"/>
    <rect x="70" y="200" width="12" height="470" fill="#000" opacity=".16"/><rect x="558" y="200" width="12" height="470" fill="#000" opacity=".2"/>
    <!-- Feuerraum -->
    <path d="M170 668 V400 A150 76 0 0 1 470 400 V668Z" fill="url(#cbox)"/>
    <path d="M170 668 V400 A150 76 0 0 1 470 400 V668" fill="none" stroke="#8d7f70" stroke-width="16"/>
    <path d="M170 668 V400 A150 76 0 0 1 470 400 V668" fill="none" stroke="#d5c8b7" stroke-width="16" stroke-dasharray="44 6"/>
    <g clip-path="url(#cbx)">
      <ellipse class="cabin-fire-glow" cx="320" cy="610" rx="210" ry="190" fill="url(#cfg)"/>
      ${sparks}
      <!-- Scheite -->
      <g>
        <rect x="236" y="632" width="150" height="26" rx="13" fill="#5a3418" transform="rotate(-9 311 645)"/>
        <rect x="258" y="634" width="150" height="26" rx="13" fill="#6b4020" transform="rotate(8 333 647)"/>
        <ellipse cx="408" cy="656" rx="9" ry="12" fill="#c79460" transform="rotate(8 408 656)"/><ellipse cx="408" cy="656" rx="4" ry="6" fill="#8a5a2b" transform="rotate(8 408 656)"/>
        <ellipse cx="237" cy="657" rx="9" ry="12" fill="#c79460" transform="rotate(-9 237 657)"/><ellipse cx="237" cy="657" rx="4" ry="6" fill="#8a5a2b" transform="rotate(-9 237 657)"/>
      </g>
      <!-- Flammen -->
      <g transform="translate(320 652)">
        <path class="cabin-flame cabin-flame-1" d="${flame}" fill="#f2542d"/>
        <g transform="translate(4 0) scale(.76)"><path class="cabin-flame cabin-flame-2" d="${flame}" fill="#ff8a2a"/></g>
        <g transform="translate(-3 0) scale(.52)"><path class="cabin-flame cabin-flame-3" d="${flame}" fill="#ffc23d"/></g>
        <g transform="translate(2 0) scale(.28)"><path class="cabin-flame cabin-flame-4" d="${flame}" fill="#fff0a8"/></g>
      </g>
      <ellipse cx="320" cy="664" rx="120" ry="10" fill="#ff7a2e" opacity=".55"/>
    </g>
    <!-- Feuerböcke -->
    <path d="M214 668 V612 M426 668 V612" stroke="#1d1410" stroke-width="7" stroke-linecap="round"/>
    <circle cx="214" cy="606" r="8" fill="#1d1410"/><circle cx="426" cy="606" r="8" fill="#1d1410"/>
    <!-- Socken -->
    ${stocking(108, '#d83a45', '#a82230', 0)}${stocking(532, '#3f9a63', '#2c7648', -1.3)}
    <!-- Sims -->
    <rect x="56" y="186" width="528" height="16" rx="3" fill="#59351c"/>
    <rect x="36" y="150" width="568" height="40" rx="6" fill="url(#cwood)"/>
    <rect x="36" y="150" width="568" height="7" rx="3.5" fill="#c08a55" opacity=".7"/>
    <path d="M60 170 C200 164 360 178 580 170" stroke="#5a341b" stroke-width="1.6" fill="none" opacity=".5"/>
    ${garland}${bow(52)}${bow(232)}${bow(412)}${bow(592)}
    <!-- Kerzen und Geschenke auf dem Sims -->
    ${candle(92, 96, '#fff6e6')}${candle(124, 114, '#d83a45')}${candle(540, 104, '#fff6e6')}
    <g transform="translate(456 106) scale(.46)"><rect x="12" y="44" width="76" height="52" rx="4" fill="#3d7fd9"/><rect x="7" y="32" width="86" height="15" rx="4" fill="#5593e6"/><rect x="44" y="32" width="12" height="64" fill="#fff6e6"/><path d="M50 33 C40 14 22 16 26 27 C29 35 42 35 50 33Z M50 33 C60 14 78 16 74 27 C71 35 58 35 50 33Z" fill="#fff6e6"/></g>
    <g transform="translate(160 118) scale(.34)"><rect x="12" y="44" width="76" height="52" rx="4" fill="#f0b53c"/><rect x="7" y="32" width="86" height="15" rx="4" fill="#f6c95e"/><rect x="44" y="32" width="12" height="64" fill="#d83a45"/><path d="M50 33 C40 14 22 16 26 27 C29 35 42 35 50 33Z M50 33 C60 14 78 16 74 27 C71 35 58 35 50 33Z" fill="#d83a45"/></g>
    <!-- Kaminplatte -->
    <rect x="24" y="664" width="592" height="36" rx="6" fill="#9c8d7c"/>
    <rect x="24" y="664" width="592" height="9" rx="4.5" fill="#d5c8b7"/>
    <rect x="24" y="690" width="592" height="10" rx="5" fill="#000" opacity=".25"/>
  </svg>`;
}

/** Fenster mit Blick in die verschneite Nacht (viewBox 0 0 300 340). */
function windowSvg() {
  let flakes = '';
  for (let i = 0; i < 16; i++) {
    const x = 44 + ((i * 47) % 212);
    flakes += `<circle class="cabin-flake" cx="${x}" cy="30" r="${1.6 + (i % 3) * 0.7}" fill="#fff" style="animation-duration:${4.5 + (i % 5)}s;animation-delay:${(-i * 0.83).toFixed(2)}s"/>`;
  }
  const curtain = (flip) => `<g ${flip ? 'transform="translate(300 0) scale(-1 1)"' : ''}>
      <path d="M14 18 H96 C92 90 70 150 34 196 C30 226 26 262 18 292 H14Z" fill="#c8323f"/>
      <path d="M40 18 C40 80 34 140 22 190 M66 18 C64 70 56 120 42 164" stroke="#a82230" stroke-width="5" fill="none" opacity=".7"/>
      <path d="M14 18 H96 C92 90 70 150 34 196 C30 226 26 262 18 292 H14Z" fill="url(#cdots)" opacity=".5"/>
      <rect x="14" y="190" width="26" height="9" rx="4.5" fill="#f6cf5a"/>
    </g>`;
  return `<svg class="cabin-window-svg" viewBox="0 0 300 340" aria-hidden="true">
    <defs>
      <linearGradient id="cnight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1535"/><stop offset="1" stop-color="#2b4c88"/></linearGradient>
      <clipPath id="cglass"><rect x="36" y="36" width="228" height="248" rx="4"/></clipPath>
      <pattern id="cdots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.4" fill="#fff"/><circle cx="14" cy="14" r="2.4" fill="#fff"/></pattern>
    </defs>
    <rect x="22" y="22" width="256" height="276" rx="8" fill="#5a341b"/>
    <rect x="36" y="36" width="228" height="248" rx="4" fill="url(#cnight)"/>
    <g clip-path="url(#cglass)">
      <circle cx="214" cy="84" r="20" fill="#f6e7b8"/><circle cx="214" cy="84" r="34" fill="#f6e7b8" opacity=".18"/>
      <circle cx="70" cy="70" r="1.6" fill="#fff"/><circle cx="118" cy="56" r="1.2" fill="#fff"/><circle cx="160" cy="96" r="1.4" fill="#fff"/><circle cx="92" cy="118" r="1.2" fill="#fff"/>
      <!-- der Weihnachtsmann fliegt ab und zu vorbei -->
      <g class="cabin-window-santa">
        <path d="M0 0 h26 q8 0 9 -8 q-3 3 -7 2 v-4 q-10 4 -18 -2 q-3 -3 -4 -7 q-6 -2 -8 3 q-3 9 2 16z" fill="#d83a45"/>
        <circle cx="14" cy="-16" r="4.5" fill="#fbd3b4"/><path d="M10 -18 q4 -8 9 -1z" fill="#d83a45"/><path d="M10 -15 q4 8 9 0z" fill="#fff"/>
        <path d="M2 4 h24 q8 0 9 -7" stroke="#f6cf5a" stroke-width="1.6" fill="none"/>
        <path d="M30 -6 h22" stroke="#5a3a22" stroke-width="1"/>
        <ellipse cx="60" cy="-6" rx="9" ry="4.5" fill="#a9713f"/><circle cx="70" cy="-12" r="3.6" fill="#a9713f"/><circle cx="73.5" cy="-11.5" r="1.6" fill="#ff3b30"/>
        <path d="M55 -3 l-3 8 M64 -3 l3 8 M68 -15 l-2 -6 M71 -15 l3 -6" stroke="#a9713f" stroke-width="1.8" stroke-linecap="round"/>
      </g>
      <path d="M36 236 C90 206 150 226 200 214 C230 208 250 214 264 210 V284 H36Z" fill="#b7c9e6"/>
      <path d="M92 222 l-12 26 h24z M92 208 l-9 20 h18z M232 206 l-11 24 h22z M232 194 l-8 18 h16z" fill="#22365c"/>
      <path d="M36 256 C100 236 180 256 264 240 V284 H36Z" fill="#f2f6fd"/>
      ${flakes}
      <path d="M36 36 h60 q-40 10 -60 50z M264 36 h-50 q34 8 50 40z M36 284 v-30 q16 22 44 30z" fill="#fff" opacity=".35"/>
    </g>
    <rect x="145" y="36" width="10" height="248" fill="#5a341b"/><rect x="36" y="150" width="228" height="10" fill="#5a341b"/>
    <rect x="145" y="36" width="3" height="248" fill="#8a5a33" opacity=".7"/><rect x="36" y="150" width="228" height="3" fill="#8a5a33" opacity=".7"/>
    ${curtain(false)}${curtain(true)}
    <rect x="6" y="10" width="288" height="10" rx="5" fill="#3d2414"/><circle cx="6" cy="15" r="8" fill="#3d2414"/><circle cx="294" cy="15" r="8" fill="#3d2414"/>
    <rect x="10" y="296" width="280" height="18" rx="5" fill="#9a6436"/><rect x="10" y="296" width="280" height="5" rx="2.5" fill="#c08a55"/>
    <rect x="18" y="314" width="264" height="8" rx="4" fill="#3d2414" opacity=".6"/>
  </svg>`;
}

function rugSvg() {
  return `<svg viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true">
    <ellipse cx="300" cy="86" rx="290" ry="72" fill="#2a1009" opacity=".35"/>
    <ellipse cx="300" cy="80" rx="288" ry="70" fill="#a82230"/>
    <ellipse cx="300" cy="80" rx="280" ry="66" fill="#c0303f"/>
    <ellipse cx="300" cy="80" rx="250" ry="56" fill="none" stroke="#f6e7cc" stroke-width="6" stroke-dasharray="18 12" stroke-linecap="round"/>
    <ellipse cx="300" cy="80" rx="214" ry="45" fill="#d0414f"/>
    <ellipse cx="300" cy="80" rx="176" ry="34" fill="none" stroke="#2c7648" stroke-width="7"/>
    <ellipse cx="300" cy="80" rx="128" ry="22" fill="#e0a93f"/>
    <ellipse cx="300" cy="76" rx="100" ry="12" fill="#fff" opacity=".12"/>
  </svg>`;
}

/**
 * Baut die Hütte in das Element und passt sie an die Bildschirmgrösse an.
 * @returns {{ layout: () => void }}
 */
export function mountCabin(el) {
  el.innerHTML = `
    <div class="cabin-wall"></div>
    <div class="cabin-beam"></div>
    <div class="cabin-window">${windowSvg()}</div>
    <div class="cabin-fireplace">${fireplaceSvg()}</div>
    <div class="cabin-floor"><div class="cabin-floor-shade"></div><div class="cabin-floor-light"></div></div>
    <div class="cabin-tree">${treeSvg()}
      <div class="cabin-tree-gift g1">${giftSvg(2)}</div><div class="cabin-tree-gift g2">${giftSvg(4)}</div><div class="cabin-tree-gift g3">${giftSvg(1)}</div>
    </div>
    <div class="cabin-rug">${rugSvg()}</div>
    <div class="cabin-glow"></div>
    <div class="cabin-vignette"></div>`;
  el.querySelector('.cabin-wall').style.backgroundImage = svgUrl(wallTile());
  el.querySelector('.cabin-floor').style.backgroundImage = svgUrl(floorTile());

  const fp = el.querySelector('.cabin-fireplace');
  const win = el.querySelector('.cabin-window');
  const tree = el.querySelector('.cabin-tree');
  const rug = el.querySelector('.cabin-rug');
  const floor = el.querySelector('.cabin-floor');
  const px = (n) => `${Math.round(n)}px`;

  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const floorH = H * 0.24;
    floor.style.height = px(floorH);
    el.style.setProperty('--floor', px(floorH));

    // Kamin: mittig, steht auf dem Boden
    const fpH = Math.min(H * 0.6, W * 1.04);
    const fpW = (fpH * 640) / 700;
    const fpBottom = floorH - fpH * 0.035;
    Object.assign(fp.style, { width: px(fpW), height: px(fpH), left: px((W - fpW) / 2), bottom: px(fpBottom) });
    el.style.setProperty('--fire-x', px(W / 2));
    el.style.setProperty('--fire-y', px(H - fpBottom - fpH * 0.13));

    // Fenster links und Baum rechts, wenn Platz ist
    const side = (W - fpW) / 2;
    if (side >= 150) {
      const ww = Math.min(side - 28, 330, H * 0.36);
      Object.assign(win.style, { display: '', width: px(ww), height: px((ww * 340) / 300), left: px((side - ww) / 2 + 4), top: px(Math.max(H * 0.2, 150)) });
    } else {
      win.style.display = 'none';
    }
    if (side >= 130) {
      const tw = Math.min(side + 6, 320, H * 0.4);
      Object.assign(tree.style, { display: '', width: px(tw), height: px((tw * 440) / 300), right: px(Math.max(-10, (side - tw) / 2 - 6)), bottom: px(floorH * 0.7) });
    } else {
      tree.style.display = 'none';
    }

    // Teppich vor dem Kamin
    const rw = Math.min(W * 0.96, Math.max(fpW * 1.3, 420));
    const rh = Math.min(floorH * 0.74, rw * 0.24);
    Object.assign(rug.style, { width: px(rw), height: px(rh), left: px((W - rw) / 2), bottom: px(floorH * 0.07) });
  }

  layout();
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(layout, 120);
  });
  return { layout };
}
