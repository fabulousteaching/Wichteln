// Die Wichtel: kleine Figuren mit grossem Kopf, Kulleraugen und Zipfelmütze.
// Gezeichnet als SVG (viewBox 0 0 120 170, Füsse bei y≈166). Alle beweglichen Teile
// haben eine Klasse; die Bewegungen (Laufen, Blinzeln, Sprechen …) stehen in wichtel.css.
// Teile, die nur in bestimmten Posen sichtbar sind, sind per Attribut versteckt, damit die
// Figur auch als Bild (ohne CSS) richtig aussieht.

import { pick, giftMarkup } from './art.js';

const CREAM = '#fff6e6';
const CREAM_SHADE = '#ead9bd';

export const ELF_VARIANTS = [
  { hat: '#d83a45', hatDark: '#a82230', coat: '#3f9a63', coatDark: '#2c7648', scarf: '#f4c64f', scarfDark: '#d49f24', hair: '#7a4a28', hairDark: '#5c3519', skin: '#fbd3b4', skinDark: '#f0b690', iris: '#6b4226', sock: '#d83a45', boot: '#7b4a2b', mitten: '#f4c64f', bangs: 'round' },
  { hat: '#3f9a63', hatDark: '#2c7648', coat: '#d83a45', coatDark: '#a82230', scarf: '#fff6e6', scarfDark: '#e2d2b8', hair: '#f2bd4b', hairDark: '#d99a27', skin: '#fddcc4', skinDark: '#f3bf9f', iris: '#3f8a5a', sock: '#3f9a63', boot: '#8a5630', mitten: '#fff6e6', bangs: 'swoop', braids: true },
  { hat: '#3d7fd9', hatDark: '#2a5fae', coat: '#f0b53c', coatDark: '#cf901b', scarf: '#d83a45', scarfDark: '#a82230', hair: '#2e211a', hairDark: '#1c130e', skin: '#e3ad84', skinDark: '#cf9166', iris: '#3a2416', sock: '#3d7fd9', boot: '#5f3a22', mitten: '#d83a45', bangs: 'spiky' },
  { hat: '#f0b53c', hatDark: '#cf901b', coat: '#3d7fd9', coatDark: '#2a5fae', scarf: '#3f9a63', scarfDark: '#2c7648', hair: '#4a2c1a', hairDark: '#33190c', skin: '#c98f66', skinDark: '#b0764c', iris: '#3a2416', sock: '#f0b53c', boot: '#6b4226', mitten: '#3f9a63', bangs: 'round', braids: true },
  { hat: '#d83a45', hatDark: '#a82230', coat: '#8a5fc0', coatDark: '#6a429c', scarf: '#f4c64f', scarfDark: '#d49f24', hair: '#1f1612', hairDark: '#100b08', skin: '#9c6644', skinDark: '#82502f', iris: '#2a1a10', sock: '#f4c64f', boot: '#4f2f1c', mitten: '#f4c64f', bangs: 'curly' },
  { hat: '#8a5fc0', hatDark: '#6a429c', coat: '#3f9a63', coatDark: '#2c7648', scarf: '#f58ab0', scarfDark: '#d9648e', hair: '#d2622f', hairDark: '#aa4619', skin: '#fddcc4', skinDark: '#f3bf9f', iris: '#3f8a5a', sock: '#8a5fc0', boot: '#7b4a2b', mitten: '#f58ab0', bangs: 'swoop', braids: true },
  { hat: '#2fa39a', hatDark: '#1f7d76', coat: '#d83a45', coatDark: '#a82230', scarf: '#fff6e6', scarfDark: '#e2d2b8', hair: '#8f5a30', hairDark: '#6d4020', skin: '#eab98f', skinDark: '#d79c6f', iris: '#5a3a1c', sock: '#2fa39a', boot: '#6b4226', mitten: '#fff6e6', bangs: 'spiky' },
  { hat: '#f58ab0', hatDark: '#d9648e', coat: '#3d7fd9', coatDark: '#2a5fae', scarf: '#f4c64f', scarfDark: '#d49f24', hair: '#2a1c14', hairDark: '#170e09', skin: '#b57a50', skinDark: '#9a6139', iris: '#2a1a10', sock: '#f58ab0', boot: '#5f3a22', mitten: '#f4c64f', bangs: 'curly', braids: true },
];

let uid = 0;

const BANGS = {
  // Stirnfransen, schauen unter dem Mützenrand hervor
  round: 'M27 66 Q27 78 35 80 Q41 77 44 71 Q47 81 56 81 Q61 77 62 71 Q66 81 76 80 Q82 77 83 71 Q88 79 93 76 L93 60 L27 60Z',
  swoop: 'M27 66 Q28 79 38 82 Q56 82 70 70 Q72 78 80 80 Q88 80 93 74 L93 60 L27 60Z',
  spiky: 'M27 66 L31 80 L38 71 L44 82 L51 71 L58 82 L64 71 L71 82 L77 71 L84 80 L93 68 L93 60 L27 60Z',
  curly: 'M27 68 a5.5 5.5 0 0 0 11 4 a5.5 5.5 0 0 0 11 2 a5.5 5.5 0 0 0 11 .5 a5.5 5.5 0 0 0 11 -.5 a5.5 5.5 0 0 0 11 -2 a5.5 5.5 0 0 0 11 -4 L93 60 L27 60Z',
};

function leg(side, v) {
  const l = side === 'l';
  const x = l ? 51 : 69;
  const boot = l
    ? `M${x - 10} 166 v-4.5 a7 7 0 0 1 7 -7 h7 a5.5 5.5 0 0 1 5.5 5.5 v6z`
    : `M${x + 10} 166 v-4.5 a7 7 0 0 0 -7 -7 h-7 a5.5 5.5 0 0 0 -5.5 5.5 v6z`;
  const sole = l ? `M${x - 10} 163.6 h19.5 v2.4 h-19.5z` : `M${x + 10} 163.6 h-19.5 v2.4 h19.5z`;
  return `<g class="elf-leg elf-leg-${side}" style="transform-origin:${x}px 146px">
      <rect x="${x - 5}" y="141" width="10" height="17" rx="3" fill="${CREAM}"/>
      <rect x="${x - 5}" y="147.5" width="10" height="3" fill="${v.sock}"/>
      <rect x="${x - 5}" y="153" width="10" height="3" fill="${v.sock}"/>
      <path d="${boot}" fill="${v.boot}"/>
      <path d="${sole}" fill="#000" opacity=".28"/>
      <rect x="${x - 6.5}" y="152.6" width="13" height="3.8" rx="1.9" fill="${CREAM}"/>
    </g>`;
}

function arm(side, v, cls = 'elf-arm') {
  const l = side === 'l';
  const s = l ? 1 : -1; // links: Hand zeigt nach links unten
  const sx = l ? 43 : 77;
  const hx = sx - s * 11.5;
  return `<g class="${cls} ${cls}-${side}" style="transform-origin:${sx}px 121px">
      <path d="M${sx} 121 Q${sx - s * 8} 128 ${sx - s * 11} 138.5" stroke="${v.coatDark}" stroke-width="10.5" stroke-linecap="round" fill="none"/>
      <circle cx="${hx}" cy="142.5" r="5.8" fill="${v.mitten}"/>
      <path d="M${hx - 4.6} 137.6 L${hx + 4.6} 139" stroke="${CREAM}" stroke-width="4" stroke-linecap="round" transform="rotate(${l ? 14 : -22} ${hx} 138.3)"/>
    </g>`;
}

function eye(cx, v) {
  return `<g class="elf-eye" style="transform-origin:${cx}px 91px">
        <ellipse cx="${cx}" cy="91" rx="8.6" ry="9.6" fill="#fff"/>
        <g class="elf-iris">
          <circle cx="${cx}" cy="91.6" r="6.7" fill="${v.iris}"/>
          <circle cx="${cx}" cy="91.6" r="4.1" fill="#17100c"/>
          <circle cx="${cx - 2.5}" cy="88.7" r="2.4" fill="#fff"/>
          <circle cx="${cx + 2.4}" cy="94.2" r="1.1" fill="#fff" opacity=".85"/>
        </g>
        <path d="M${cx - 8.55} 90 A8.6 9.6 0 0 1 ${cx + 8.55} 90" stroke="#3d2718" stroke-width="2.3" fill="none" stroke-linecap="round"/>
      </g>
      <path class="elf-eye-shut" opacity="0" d="M${cx - 8} 91 Q${cx} 97.5 ${cx + 8} 91" stroke="#3d2718" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
}

/**
 * @param {number} variantIndex Aussehen (Farben, Frisur)
 * @param {{ giftVariant?: number|null }} options giftVariant: Geschenk, das der Wichtel tragen kann (Klasse "carrying")
 */
export function elfSvg(variantIndex = 0, { giftVariant = null } = {}) {
  const v = pick(ELF_VARIANTS, variantIndex);
  const id = `w${++uid}`;
  const blink = (Math.random() * 4).toFixed(2);
  const look = (Math.random() * 7).toFixed(2);

  const braids = v.braids
    ? ['l', 'r']
        .map((side) => {
          const s = side === 'l' ? -1 : 1;
          const x = 60 + s * 35;
          return `<g class="elf-braid elf-braid-${side}" style="transform-origin:${x}px 96px">
            <ellipse cx="${x}" cy="101" rx="5.2" ry="5.6" fill="${v.hair}"/>
            <ellipse cx="${x + s * 1.2}" cy="109" rx="4.9" ry="5.4" fill="${v.hairDark}"/>
            <ellipse cx="${x + s * 2}" cy="116.5" rx="4.5" ry="5.2" fill="${v.hair}"/>
            <ellipse cx="${x + s * 2.6}" cy="124.5" rx="3.4" ry="4.6" fill="${v.hairDark}"/>
            <rect x="${x + s * 2.2 - 4.2}" y="119.6" width="8.4" height="3.4" rx="1.7" fill="${v.scarf}"/>
          </g>`;
        })
        .join('')
    : '';

  const carry =
    giftVariant !== null
      ? `<g class="elf-carry"><g transform="translate(34.5 107) scale(.51)">${giftMarkup(giftVariant)}</g></g>
         <g class="elf-arms-carry">
           <path d="M43 121 Q35 127 36 136" stroke="${v.coatDark}" stroke-width="10.5" stroke-linecap="round" fill="none"/>
           <path d="M77 121 Q85 127 84 136" stroke="${v.coatDark}" stroke-width="10.5" stroke-linecap="round" fill="none"/>
           <circle cx="36.5" cy="140" r="5.8" fill="${v.mitten}"/><circle cx="83.5" cy="140" r="5.8" fill="${v.mitten}"/>
         </g>`
      : '';

  return `<svg class="elf-svg" viewBox="0 0 120 170" aria-hidden="true" style="--blink:-${blink}s;--look:-${look}s">
    <defs>
      <radialGradient id="${id}s" cx=".5" cy=".42" r=".62">
        <stop offset="0" stop-color="${v.skin}"/><stop offset=".72" stop-color="${v.skin}"/><stop offset="1" stop-color="${v.skinDark}"/>
      </radialGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${v.hat}"/><stop offset=".62" stop-color="${v.hat}"/><stop offset="1" stop-color="${v.hatDark}"/>
      </linearGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${v.coat}"/><stop offset=".66" stop-color="${v.coat}"/><stop offset="1" stop-color="${v.coatDark}"/>
      </linearGradient>
    </defs>
    <ellipse class="elf-shadow" cx="60" cy="166.4" rx="27" ry="3.8" fill="#0a1428" opacity=".22" style="transform-origin:60px 166px"/>
    <g class="elf-legs">${leg('l', v)}${leg('r', v)}</g>
    <g class="elf-figure" style="transform-origin:60px 150px">
      <g class="elf-arms-free">${arm('l', v)}${arm('r', v)}</g>
      <!-- Mantel -->
      <path d="M43 113 Q60 107 77 113 L87 145 Q88 151.5 82 151.5 L38 151.5 Q32 151.5 33 145Z" fill="url(#${id}c)"/>
      <path d="M33.9 141.5 L86.1 141.5 L87 145 Q88 151.5 82 151.5 L38 151.5 Q32 151.5 33 145Z" fill="${CREAM}"/>
      <path d="M34.6 141.5 H85.4" stroke="${CREAM_SHADE}" stroke-width="1.2"/>
      <path d="M60 116 V141" stroke="${v.coatDark}" stroke-width="1.5" opacity=".55"/>
      <circle cx="60" cy="128" r="2.7" fill="#f6cf5a"/><circle cx="59.2" cy="127.2" r=".9" fill="#fff" opacity=".7"/>
      <circle cx="60" cy="136" r="2.7" fill="#f6cf5a"/><circle cx="59.2" cy="135.2" r=".9" fill="#fff" opacity=".7"/>
      <!-- Schal -->
      <g class="elf-scarf-tail" style="transform-origin:46px 119px">
        <path d="M42 118 L50 119.5 L48.2 137 L40 135.6Z" fill="${v.scarfDark}"/>
        <path d="M41.2 126 L49.3 127.4 M40.6 131 L48.8 132.4" stroke="${v.scarf}" stroke-width="2"/>
      </g>
      <path d="M39.5 111 Q60 122 80.5 111 Q83 115 81 119 Q60 130 39 119 Q37 115 39.5 111Z" fill="${v.scarf}"/>
      <path d="M40 117.5 Q60 128 80 117.5" stroke="${v.scarfDark}" stroke-width="1.4" fill="none" opacity=".7"/>
      <ellipse cx="45.5" cy="119" rx="4.6" ry="4.2" fill="${v.scarf}"/>
      ${braids}
      <g class="elf-head" style="transform-origin:60px 114px">
        <!-- spitze Ohren -->
        <g class="elf-ear elf-ear-l" style="transform-origin:29px 87px">
          <path d="M29 80 Q20 71 11 72.5 Q14 85 22 92.5 Q26 95 30 93Z" fill="${v.skinDark}"/>
          <path d="M27 82 Q21 76.5 16 76.5 Q18 84 23.5 89.5Z" fill="#f59a8c" opacity=".55"/>
        </g>
        <g class="elf-ear elf-ear-r" style="transform-origin:91px 87px">
          <path d="M91 80 Q100 71 109 72.5 Q106 85 98 92.5 Q94 95 90 93Z" fill="${v.skinDark}"/>
          <path d="M93 82 Q99 76.5 104 76.5 Q102 84 96.5 89.5Z" fill="#f59a8c" opacity=".55"/>
        </g>
        <ellipse cx="60" cy="85" rx="36" ry="32.5" fill="url(#${id}s)"/>
        <!-- Haare -->
        <path d="M24.4 78 Q22.5 68 27 62 L33 64 Q30.5 74 31 86 Q27 84 24.4 78Z" fill="${v.hair}"/>
        <path d="M95.6 78 Q97.5 68 93 62 L87 64 Q89.5 74 89 86 Q93 84 95.6 78Z" fill="${v.hair}"/>
        <path d="${BANGS[v.bangs] || BANGS.round}" fill="${v.hair}"/>
        <g class="elf-face">
          <ellipse cx="33.5" cy="101.5" rx="6.4" ry="4.3" fill="#ff6f7d" opacity=".42"/>
          <ellipse cx="86.5" cy="101.5" rx="6.4" ry="4.3" fill="#ff6f7d" opacity=".42"/>
          <g class="elf-eyes-open">${eye(45, v)}${eye(75, v)}</g>
          <g class="elf-eyes-happy" display="none">
            <path d="M37.2 93.5 Q45 82.5 52.8 93.5" stroke="#3d2718" stroke-width="3.1" fill="none" stroke-linecap="round"/>
            <path d="M67.2 93.5 Q75 82.5 82.8 93.5" stroke="#3d2718" stroke-width="3.1" fill="none" stroke-linecap="round"/>
          </g>
          <ellipse cx="60" cy="99.6" rx="3.9" ry="3.3" fill="${v.skinDark}"/>
          <ellipse cx="60" cy="100.2" rx="3.9" ry="2.7" fill="#f2877a" opacity=".5"/>
          <ellipse cx="58.8" cy="98.5" rx="1.3" ry="1" fill="#fff" opacity=".6"/>
          <path class="elf-mouth-smile" d="M54 105.6 Q60 111.6 66 105.6" stroke="#8a3528" stroke-width="2.3" stroke-linecap="round" fill="none"/>
          <g class="elf-mouth-open" display="none" style="transform-origin:60px 105px">
            <path d="M52.6 104.6 Q60 106.8 67.4 104.6 Q67 114.6 60 114.6 Q53 114.6 52.6 104.6Z" fill="#7a2230"/>
            <path d="M55.6 112 Q60 108.8 64.4 112 Q62.6 114.5 60 114.5 Q57.4 114.5 55.6 112Z" fill="#f58a90"/>
          </g>
        </g>
        <!-- Zipfelmütze -->
        <g class="elf-hat" style="transform-origin:60px 64px">
          <path d="M29 65 C30 40 46 16 66 10 C80 6 95 12 101 29 C96 22.5 89 20.5 83 23.5 C88 35 91 50 91 65Z" fill="url(#${id}h)"/>
          <path d="M83 23.5 C88 35 91 50 91 65 L80 65 C82 50 82 36 78 26Z" fill="${v.hatDark}" opacity=".35"/>
          <g class="elf-pom" style="transform-origin:99px 27px">
            <circle cx="101.5" cy="31" r="8" fill="${CREAM}"/>
            <circle cx="97.6" cy="28" r="3.2" fill="#fff"/><circle cx="105" cy="27.4" r="2.9" fill="#fff"/>
            <path d="M95.2 34.5 A8 8 0 0 0 108.6 34" stroke="${CREAM_SHADE}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          </g>
          <path d="M26.5 61.5 Q60 48.5 93.5 61.5 Q96 66 93.5 70.5 Q60 58 26.5 70.5 Q24 66 26.5 61.5Z" fill="${CREAM}"/>
          <path d="M27.5 69 Q60 56.8 92.5 69" stroke="${CREAM_SHADE}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        </g>
      </g>
      ${carry}
      <g class="elf-arm-wave" display="none" style="transform-origin:79px 122px">
        <path d="M79 122 Q90 118 100 107" stroke="${v.coatDark}" stroke-width="10.5" stroke-linecap="round" fill="none"/>
        <path d="M96.4 107.2 L103.8 112.4" stroke="${CREAM}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="103.6" cy="104.4" r="6" fill="${v.mitten}"/>
        <circle cx="99.2" cy="101.6" r="2.5" fill="${v.mitten}"/>
      </g>
    </g>
  </svg>`;
}
