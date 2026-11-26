// Alle Zeichnungen (Wichtel, Geschenke, Tannenbaum, Lichterkette …) als SVG.

export const ELF_VARIANTS = [
  { hat: '#c8323f', hatDark: '#8f1f2a', tunic: '#3f8a55', tunicDark: '#2b6440', placket: '#f1e6d2', scarf: '#d9a63c', scarfDark: '#a87a22', hair: '#5a3a22', skin: '#f2c4a0', skinDark: '#d99c76', pants: '#8a5a36', sock: '#e9d9b8', boot: '#6e4326', eyes: '#3b2716' },
  { hat: '#3f8a55', hatDark: '#2b6440', tunic: '#c8323f', tunicDark: '#8f1f2a', placket: '#f1e6d2', scarf: '#f1e6d2', scarfDark: '#c9b99c', hair: '#d9a441', braids: true, skin: '#f0c19c', skinDark: '#d69873', pants: '#5b6c8c', sock: '#c8323f', boot: '#7a4a2a', eyes: '#2f5d3a' },
  { hat: '#2f5fa7', hatDark: '#1f417a', tunic: '#e0a33a', tunicDark: '#b47b1e', placket: '#f6ecdb', scarf: '#c8323f', scarfDark: '#8f1f2a', hair: '#2a1c14', skin: '#d79f78', skinDark: '#b77c56', pants: '#6d4a30', sock: '#2f5fa7', boot: '#553220', eyes: '#2a1a10' },
  { hat: '#e0a33a', hatDark: '#b47b1e', tunic: '#2f5fa7', tunicDark: '#1f417a', placket: '#f1e6d2', scarf: '#3f8a55', scarfDark: '#2b6440', hair: '#3a2416', braids: true, skin: '#c48a62', skinDark: '#a26a44', pants: '#8a5a36', sock: '#e9d9b8', boot: '#6e4326', eyes: '#3b2716' },
  { hat: '#c8323f', hatDark: '#8f1f2a', tunic: '#7a5a3a', tunicDark: '#57402a', placket: '#efe2cc', scarf: '#3f8a55', scarfDark: '#2b6440', hair: '#1c1410', skin: '#8f5d3e', skinDark: '#734a30', pants: '#4a5a72', sock: '#c8323f', boot: '#4a2c1a', eyes: '#1c120c' },
  { hat: '#7b4fa0', hatDark: '#583875', tunic: '#3f8a55', tunicDark: '#2b6440', placket: '#f1e6d2', scarf: '#e0a33a', scarfDark: '#b47b1e', hair: '#b4582c', braids: true, skin: '#f4caa8', skinDark: '#dba27e', pants: '#7a5232', sock: '#7b4fa0', boot: '#6e4326', eyes: '#2f5d3a' },
  { hat: '#3f8a55', hatDark: '#2b6440', tunic: '#2f5fa7', tunicDark: '#1f417a', placket: '#f1e6d2', scarf: '#c8323f', scarfDark: '#8f1f2a', hair: '#6b4428', skin: '#e3ad86', skinDark: '#c48862', pants: '#8a5a36', sock: '#e9d9b8', boot: '#5e3820', eyes: '#3b2716' },
  { hat: '#2f5fa7', hatDark: '#1f417a', tunic: '#c8323f', tunicDark: '#8f1f2a', placket: '#f6ecdb', scarf: '#e0a33a', scarfDark: '#b47b1e', hair: '#241812', braids: true, skin: '#a8714c', skinDark: '#8a5836', pants: '#5b6c8c', sock: '#e0a33a', boot: '#553220', eyes: '#1c120c' },
];

export const GIFT_VARIANTS = [
  { box: '#d7263d', shade: '#a3172b', ribbon: '#f2c14e', ribbonShade: '#c8922a' },
  { box: '#2a8a4f', shade: '#1b6237', ribbon: '#f04a5a', ribbonShade: '#b8283a' },
  { box: '#2f6fc0', shade: '#1f4f8f', ribbon: '#f5f5f5', ribbonShade: '#c9d3e0' },
  { box: '#f2c14e', shade: '#c8922a', ribbon: '#d7263d', ribbonShade: '#a3172b' },
  { box: '#8e44ad', shade: '#6a2d85', ribbon: '#f2c14e', ribbonShade: '#c8922a' },
  { box: '#f7f3ea', shade: '#d9cfbb', ribbon: '#d7263d', ribbonShade: '#a3172b' },
  { box: '#e8618c', shade: '#b84168', ribbon: '#ffffff', ribbonShade: '#e2d6dc' },
  { box: '#17808a', shade: '#0f5c63', ribbon: '#f2c14e', ribbonShade: '#c8922a' },
];

let uid = 0;
const nextId = (p) => `${p}${++uid}`;

export function pick(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

// ---------------------------------------------------------------------------
// Geschenk (viewBox 0 0 100 100, Boden bei y=96)
// ---------------------------------------------------------------------------

function giftBodyMarkup(v, id) {
  return `
    <rect x="12" y="44" width="76" height="52" rx="4" fill="url(#${id}b)"/>
    <rect x="70" y="44" width="18" height="52" rx="3" fill="${v.shade}" opacity=".35"/>
    <rect x="44" y="44" width="12" height="52" fill="${v.ribbon}"/>
    <rect x="52" y="44" width="4" height="52" fill="${v.ribbonShade}" opacity=".7"/>
    <rect x="12" y="44" width="76" height="6" fill="#000" opacity=".12"/>`;
}

function giftLidMarkup(v, id) {
  return `
    <rect x="7" y="32" width="86" height="15" rx="4" fill="url(#${id}l)"/>
    <rect x="44" y="32" width="12" height="15" fill="${v.ribbon}"/>
    <rect x="52" y="32" width="4" height="15" fill="${v.ribbonShade}" opacity=".7"/>
    <g class="gift-bow">
      <path d="M50 33 C40 14 22 16 26 27 C29 35 42 35 50 33Z" fill="${v.ribbon}"/>
      <path d="M50 33 C60 14 78 16 74 27 C71 35 58 35 50 33Z" fill="${v.ribbon}"/>
      <path d="M50 33 C43 24 33 22 31 27" stroke="${v.ribbonShade}" stroke-width="2" fill="none" opacity=".8"/>
      <path d="M50 33 C57 24 67 22 69 27" stroke="${v.ribbonShade}" stroke-width="2" fill="none" opacity=".8"/>
      <path d="M48 35 L38 50 L44 49 L46 55 L50 37Z" fill="${v.ribbonShade}"/>
      <path d="M52 35 L62 50 L56 49 L54 55 L50 37Z" fill="${v.ribbonShade}"/>
      <ellipse cx="50" cy="33" rx="6" ry="5" fill="${v.ribbon}" stroke="${v.ribbonShade}" stroke-width="1.5"/>
    </g>`;
}

function giftDefs(v, id) {
  return `<defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${v.box}"/><stop offset="1" stop-color="${v.shade}"/>
      </linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${v.box}"/><stop offset="1" stop-color="${v.shade}"/>
      </linearGradient>
    </defs>`;
}

/** part: 'all' | 'body' | 'lid' */
export function giftSvg(variantIndex = 0, { part = 'all', className = '' } = {}) {
  const v = pick(GIFT_VARIANTS, variantIndex);
  const id = nextId('g');
  const body = part === 'lid' ? '' : giftBodyMarkup(v, id);
  const lid = part === 'body' ? '' : giftLidMarkup(v, id);
  return `<svg class="gift-svg ${className}" viewBox="0 0 100 100" aria-hidden="true">${giftDefs(v, id)}${body}${lid}</svg>`;
}

function giftGroup(variantIndex) {
  const v = pick(GIFT_VARIANTS, variantIndex);
  const id = nextId('g');
  return `${giftDefs(v, id)}${giftBodyMarkup(v, id)}${giftLidMarkup(v, id)}`;
}

// ---------------------------------------------------------------------------
// Wichtel (viewBox 0 0 120 170, Füsse bei y≈166)
// Handgemacht: Filzgesicht mit Kulleraugen, gestrickte Zipfelmütze, Strickjacke, Schal
// ---------------------------------------------------------------------------

export function elfSvg(variantIndex = 0, { giftVariant = null } = {}) {
  const v = pick(ELF_VARIANTS, variantIndex);
  const id = nextId('e');
  const stitch = 'stroke="#fff8ec" stroke-opacity=".75" stroke-width=".9" stroke-dasharray="1.6 1.4" fill="none" stroke-linecap="round"';

  const braids = v.braids
    ? `<path d="M31 92 C26 102 28 114 25 124" stroke="${v.hair}" stroke-width="7.5" stroke-linecap="round" fill="none"/>
       <path d="M89 92 C94 102 92 114 95 124" stroke="${v.hair}" stroke-width="7.5" stroke-linecap="round" fill="none"/>
       <path d="M27 100 l5 2 M27 107 l5 2 M26 114 l5 2 M93 100 l-5 2 M93 107 l-5 2 M94 114 l-5 2" stroke="#000" stroke-opacity=".2" stroke-width="1.6" stroke-linecap="round"/>
       <circle cx="25" cy="126" r="3.6" fill="${v.scarf}"/><circle cx="95" cy="126" r="3.6" fill="${v.scarf}"/>`
    : '';

  const legs = (side) => {
    const l = side === 'l';
    const x = l ? 48 : 62;
    const toe = l ? `M${x - 2} 155 h12 a3.5 3.5 0 0 1 3.5 3.5 v4 a3.5 3.5 0 0 1 -3.5 3.5 h-13 c-6 0 -8 -2.5 -8 -5.5 c0 -3.5 4 -5.5 9 -5.5z`
                  : `M${x + 12} 155 h-12 a3.5 3.5 0 0 0 -3.5 3.5 v4 a3.5 3.5 0 0 0 3.5 3.5 h13 c6 0 8 -2.5 8 -5.5 c0 -3.5 -4 -5.5 -9 -5.5z`;
    return `<g class="elf-leg elf-leg-${side}">
      <rect x="${x}" y="140" width="10" height="17" rx="4" fill="${v.sock}"/>
      <path d="M${x} 145 h10 M${x} 149 h10 M${x} 153 h10" stroke="#000" stroke-opacity=".1" stroke-width="1.4"/>
      <path d="${toe}" fill="url(#${id}boot)"/>
      <path d="M${x + 1} 158.5 h8" ${stitch}/>
      <path d="M${l ? x - 6 : x + 2} 165 h${l ? 16 : 16}" stroke="#2a180c" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>
    </g>`;
  };

  const carry =
    giftVariant !== null
      ? `<g class="elf-carry"><g transform="translate(28 99) scale(.64)">${giftGroup(giftVariant)}</g></g>
         <g class="elf-arms-carry">
           <path d="M38 121 C32 126 30 131 30 136" stroke="url(#${id}sleeve)" stroke-width="10" stroke-linecap="round" fill="none"/>
           <path d="M82 121 C88 126 90 131 90 136" stroke="url(#${id}sleeve)" stroke-width="10" stroke-linecap="round" fill="none"/>
           <circle cx="30" cy="138" r="5.6" fill="url(#${id}hand)"/><circle cx="90" cy="138" r="5.6" fill="url(#${id}hand)"/>
         </g>`
      : '';

  return `<svg class="elf-svg" viewBox="0 0 120 170" aria-hidden="true">
    <defs>
      <radialGradient id="${id}face" cx=".45" cy=".55" r=".65">
        <stop offset="0" stop-color="${v.skin}"/><stop offset=".6" stop-color="${v.skin}"/><stop offset="1" stop-color="${v.skinDark}"/>
      </radialGradient>
      <radialGradient id="${id}hand" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${v.skin}"/><stop offset="1" stop-color="${v.skinDark}"/></radialGradient>
      <radialGradient id="${id}nose" cx=".38" cy=".32" r=".75">
        <stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".3" stop-color="${v.skin}"/><stop offset="1" stop-color="${v.skinDark}"/>
      </radialGradient>
      <linearGradient id="${id}hat" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${v.hatDark}"/><stop offset=".35" stop-color="${v.hat}"/><stop offset=".7" stop-color="${v.hat}"/><stop offset="1" stop-color="${v.hatDark}"/>
      </linearGradient>
      <linearGradient id="${id}body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${v.tunicDark}"/><stop offset=".3" stop-color="${v.tunic}"/><stop offset=".7" stop-color="${v.tunic}"/><stop offset="1" stop-color="${v.tunicDark}"/>
      </linearGradient>
      <linearGradient id="${id}sleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v.tunic}"/><stop offset="1" stop-color="${v.tunicDark}"/></linearGradient>
      <linearGradient id="${id}boot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v.boot}"/><stop offset="1" stop-color="#2e1a0e"/></linearGradient>
      <radialGradient id="${id}pom" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4dccd"/></radialGradient>
      <pattern id="${id}knit" width="5" height="4.4" patternUnits="userSpaceOnUse">
        <path d="M0 .4 L2.5 3.6 L5 .4" stroke="#000" stroke-opacity=".16" stroke-width=".9" fill="none"/>
      </pattern>
      <pattern id="${id}rib" width="3.2" height="10" patternUnits="userSpaceOnUse">
        <path d="M1.6 0 V10" stroke="#000" stroke-opacity=".2" stroke-width="1.1"/>
      </pattern>
    </defs>
    <ellipse class="elf-shadow" cx="60" cy="166" rx="27" ry="4" fill="#0a1428" opacity=".28"/>
    ${legs('l')}
    ${legs('r')}
    <g class="elf-upper">
      <g class="elf-arms-free">
        <g class="elf-arm elf-arm-l">
          <path d="M40 121 C34 127 32 134 32 141" stroke="url(#${id}sleeve)" stroke-width="10" stroke-linecap="round" fill="none"/>
          <circle cx="32" cy="143.5" r="5.4" fill="url(#${id}hand)"/>
        </g>
        <g class="elf-arm elf-arm-r">
          <path d="M80 121 C86 127 88 134 88 141" stroke="url(#${id}sleeve)" stroke-width="10" stroke-linecap="round" fill="none"/>
          <circle cx="88" cy="143.5" r="5.4" fill="url(#${id}hand)"/>
        </g>
      </g>
      <!-- kurze Hose -->
      <path d="M44 134 h32 l2 10 c-6 2 -11 2 -15 0 l-3 -5 l-3 5 c-4 2 -9 2 -15 0z" fill="${v.pants}"/>
      <!-- Strickjacke -->
      <path d="M41 116 C48 111 72 111 79 116 L83 141 C70 146 50 146 37 141Z" fill="url(#${id}body)"/>
      <path d="M41 116 C48 111 72 111 79 116 L83 141 C70 146 50 146 37 141Z" fill="url(#${id}knit)"/>
      <path d="M56 113 h8 l1 31 c-3 .6 -7 .6 -10 0z" fill="${v.placket}"/>
      <path d="M56 113 h8 l1 31 c-3 .6 -7 .6 -10 0z" fill="url(#${id}rib)" opacity=".5"/>
      <path d="M38.5 139.5 C50 144 70 144 81.5 139.5" ${stitch}/>
      <circle cx="60.2" cy="126" r="2.6" fill="${v.hat}"/><path d="M58.9 124.7 l2.6 2.6 M61.5 124.7 l-2.6 2.6" stroke="#fff8ec" stroke-width=".8"/>
      <circle cx="60.4" cy="135" r="2.6" fill="${v.scarf}"/><path d="M59.1 133.7 l2.6 2.6 M61.7 133.7 l-2.6 2.6" stroke="#fff8ec" stroke-width=".8"/>
      <!-- Schal -->
      <path d="M38 109 C48 115 72 115 82 109 L82 116 C72 122 48 122 38 116Z" fill="${v.scarf}"/>
      <path d="M38 109 C48 115 72 115 82 109 L82 116 C72 122 48 122 38 116Z" fill="url(#${id}rib)"/>
      <path d="M68 116 l7 1 l-2 19 l-7 -1z" fill="${v.scarfDark}"/>
      <path d="M68 116 l7 1 l-2 19 l-7 -1z" fill="url(#${id}rib)"/>
      <path d="M66.5 135 l-1 4 M68.5 135.3 l-.6 4 M70.5 135.6 l-.3 4 M72.5 135.9 l0 4" stroke="${v.scarfDark}" stroke-width="1.3" stroke-linecap="round"/>
      ${braids}
      <!-- Kopf aus Filz -->
      <ellipse cx="60" cy="88" rx="30" ry="27" fill="url(#${id}face)"/>
      <path d="M33 88 C33 96 34 101 37 104 M87 88 C87 96 86 101 83 104" stroke="${v.hair}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M36 76 C41 82 46 80 50 76 C55 81 62 81 66 76 C70 81 77 82 84 76 L84 72 L36 72Z" fill="${v.hair}"/>
      <ellipse cx="42" cy="99" rx="5.2" ry="3.2" fill="#ff7b6b" opacity=".32"/>
      <ellipse cx="78" cy="99" rx="5.2" ry="3.2" fill="#ff7b6b" opacity=".32"/>
      <!-- Kulleraugen -->
      <g class="elf-eyes">
        <ellipse cx="48" cy="89" rx="8.2" ry="9" fill="#fffdf8"/>
        <ellipse cx="72" cy="89" rx="8.2" ry="9" fill="#fffdf8"/>
        <ellipse cx="48" cy="89" rx="8.2" ry="9" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1"/>
        <ellipse cx="72" cy="89" rx="8.2" ry="9" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1"/>
        <circle cx="50" cy="90" r="5.6" fill="${v.eyes}"/><circle cx="74" cy="90" r="5.6" fill="${v.eyes}"/>
        <circle cx="50" cy="90" r="3" fill="#0b0705"/><circle cx="74" cy="90" r="3" fill="#0b0705"/>
        <circle cx="52.2" cy="87.6" r="1.8" fill="#fff"/><circle cx="76.2" cy="87.6" r="1.8" fill="#fff"/>
        <circle cx="48.4" cy="92.4" r=".9" fill="#fff" opacity=".8"/><circle cx="72.4" cy="92.4" r=".9" fill="#fff" opacity=".8"/>
      </g>
      <g class="elf-lid" opacity="0">
        <ellipse cx="48" cy="89" rx="8.8" ry="9.6" fill="${v.skin}"/><ellipse cx="72" cy="89" rx="8.8" ry="9.6" fill="${v.skin}"/>
      </g>
      <!-- Knubbelnase und Lächeln -->
      <ellipse cx="60.5" cy="100" rx="6" ry="5.4" fill="url(#${id}nose)"/>
      <path d="M55 107.5 Q60.5 111.5 66 107.5" stroke="#6b3324" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <!-- gestrickte Zipfelmütze -->
      <g class="elf-hat">
        <path d="M30 76 C30 60 38 44 50 30 C60 18 72 10 86 8 C93 7 98 10 101 15 C95 13 89 14 86 19 C82 26 84 40 87 52 C89 60 90 68 90 76Z" fill="url(#${id}hat)"/>
        <path d="M30 76 C30 60 38 44 50 30 C60 18 72 10 86 8 C93 7 98 10 101 15 C95 13 89 14 86 19 C82 26 84 40 87 52 C89 60 90 68 90 76Z" fill="url(#${id}knit)"/>
        <path d="M27 71 C45 65 75 65 93 71 L93 81 C75 76 45 76 27 81Z" fill="${v.hatDark}"/>
        <path d="M27 71 C45 65 75 65 93 71 L93 81 C75 76 45 76 27 81Z" fill="url(#${id}rib)"/>
        <path d="M28 79.5 C45 74.5 75 74.5 92 79.5" ${stitch}/>
        <g class="elf-pom">
          <circle cx="101" cy="16" r="7.5" fill="url(#${id}pom)"/>
          <circle cx="96.5" cy="13" r="3.2" fill="#fff"/><circle cx="104.5" cy="12.5" r="3" fill="#f6f1e8"/>
          <circle cx="105.5" cy="19.5" r="3" fill="#ece4d6"/><circle cx="97.5" cy="20.5" r="2.8" fill="#efe8db"/>
        </g>
      </g>
      ${carry}
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Tannenbaum (viewBox 0 0 300 440)
// ---------------------------------------------------------------------------

export function treeSvg() {
  const id = nextId('t');
  const tiers = [
    { top: 60, bottom: 160, half: 62 },
    { top: 110, bottom: 240, half: 92 },
    { top: 170, bottom: 320, half: 118 },
    { top: 235, bottom: 395, half: 142 },
  ];
  const cx = 150;
  let foliage = '';
  for (const t of tiers) {
    const l = cx - t.half;
    const r = cx + t.half;
    const b = t.bottom;
    const waves = 6;
    let edge = '';
    for (let i = 0; i <= waves; i++) {
      const x = r - ((r - l) * i) / waves;
      const xm = x + (r - l) / waves / 2;
      edge += i === 0 ? '' : ` Q${xm.toFixed(1)} ${b + 14} ${x.toFixed(1)} ${b}`;
    }
    foliage += `<path d="M${cx} ${t.top} C${cx + 18} ${t.top + 30} ${r - 20} ${b - 30} ${r} ${b}${edge} C${l + 20} ${b - 30} ${cx - 18} ${t.top + 30} ${cx} ${t.top}Z" fill="url(#${id}g)"/>`;
    let snow = '';
    for (let i = 0; i < waves; i++) {
      const x0 = r - ((r - l) * i) / waves;
      const x1 = r - ((r - l) * (i + 1)) / waves;
      const xm = (x0 + x1) / 2;
      snow += `<path d="M${x0.toFixed(1)} ${b - 2} Q${xm.toFixed(1)} ${b + 10} ${x1.toFixed(1)} ${b - 2} Q${xm.toFixed(1)} ${b + 2} ${x0.toFixed(1)} ${b - 2}Z" fill="#fff" opacity=".85"/>`;
    }
    foliage += snow;
  }

  const garlands = [
    `M95 150 Q150 185 205 140`,
    `M75 228 Q150 270 228 215`,
    `M55 305 Q150 350 250 292`,
    `M40 380 Q150 420 262 370`,
  ]
    .map((d) => `<path d="${d}" stroke="#f2c14e" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>`)
    .join('');

  const ornaments = [
    [120, 140, '#d7263d'], [180, 160, '#2f6fc0'], [150, 205, '#f2c14e'], [100, 230, '#e8618c'], [205, 225, '#d7263d'],
    [130, 270, '#f5f5f5'], [190, 285, '#f2c14e'], [80, 300, '#2f6fc0'], [235, 300, '#e8618c'], [150, 330, '#d7263d'],
    [105, 360, '#f2c14e'], [200, 360, '#2f6fc0'], [60, 380, '#d7263d'], [250, 378, '#f5f5f5'], [160, 390, '#e8618c'],
  ]
    .map(
      ([x, y, c], i) =>
        `<g class="ornament" style="animation-delay:${(i * 0.37) % 3}s"><circle cx="${x}" cy="${y}" r="9" fill="${c}"/>` +
        `<circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#fff" opacity=".7"/><rect x="${x - 3}" y="${y - 12}" width="6" height="4" rx="1" fill="#c8922a"/></g>`,
    )
    .join('');

  const lightColors = ['#ffe28a', '#ff8a8a', '#9ee6ff', '#b6ff9e', '#ffc46b'];
  let lights = '';
  const lightPoints = [
    [110, 120], [160, 118], [140, 175], [85, 200], [215, 195], [120, 250], [175, 245], [65, 270], [240, 265],
    [105, 315], [200, 320], [45, 345], [255, 340], [130, 365], [185, 400], [90, 405], [230, 405],
  ];
  lightPoints.forEach(([x, y], i) => {
    const c = lightColors[i % lightColors.length];
    lights += `<circle class="tree-light" style="animation-delay:${((i * 0.53) % 2.4).toFixed(2)}s" cx="${x}" cy="${y}" r="4.5" fill="${c}" filter="url(#${id}glow)"/>`;
  });

  return `<svg class="tree-svg" viewBox="0 0 300 440" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2f9d57"/><stop offset=".55" stop-color="#1b7240"/><stop offset="1" stop-color="#0f4a29"/>
      </linearGradient>
      <radialGradient id="${id}s" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff6c2" stop-opacity=".95"/><stop offset=".4" stop-color="#ffd75e" stop-opacity=".45"/><stop offset="1" stop-color="#ffd75e" stop-opacity="0"/>
      </radialGradient>
      <filter id="${id}glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="150" cy="428" rx="135" ry="12" fill="#0a1428" opacity=".18"/>
    <rect x="132" y="388" width="36" height="44" rx="4" fill="#6b3e1f"/>
    <rect x="132" y="388" width="12" height="44" rx="4" fill="#8a5a2b"/>
    ${foliage}
    ${garlands}
    ${ornaments}
    ${lights}
    <circle class="tree-star-glow" cx="150" cy="52" r="46" fill="url(#${id}s)"/>
    <path class="tree-star" d="M150 20 L159 43 L184 44 L164 59 L171 83 L150 69 L129 83 L136 59 L116 44 L141 43Z" fill="#ffd34e" stroke="#e0a526" stroke-width="3" stroke-linejoin="round"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Lichterkette oben am Bildschirmrand
// ---------------------------------------------------------------------------

export function garlandSvg(width) {
  const colors = ['#ff4d5e', '#ffd34e', '#4ddf7f', '#5fb6ff', '#ff8ad8', '#ffa64d'];
  const sag = 34;
  const span = Math.max(160, Math.min(260, width / 6));
  const arcs = Math.max(2, Math.round(width / span));
  const w = width / arcs;
  let wire = '';
  let bulbs = '';
  let n = 0;
  for (let a = 0; a < arcs; a++) {
    const x0 = a * w;
    const x1 = x0 + w;
    const cxp = x0 + w / 2;
    wire += `<path d="M${x0} 4 Q${cxp} ${4 + sag * 2} ${x1} 4" stroke="#1e2a1c" stroke-width="2.5" fill="none"/>`;
    const per = 4;
    for (let i = 1; i <= per; i++) {
      const t = i / (per + 1);
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cxp + t * t * x1;
      const y = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * (4 + sag * 2) + t * t * 4;
      const c = colors[n % colors.length];
      const rot = (t - 0.5) * -30;
      bulbs += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})">
        <rect x="-3.5" y="0" width="7" height="7" rx="1.5" fill="#3b4a38"/>
        <ellipse class="bulb" style="animation-delay:${((n * 0.41) % 2.2).toFixed(2)}s;color:${c}" cx="0" cy="15" rx="6" ry="9.5" fill="${c}"/>
        <ellipse cx="-2" cy="12" rx="1.8" ry="3.2" fill="#fff" opacity=".55"/>
      </g>`;
      n++;
    }
  }
  return `<svg class="garland-svg" width="${width}" height="${sag + 40}" viewBox="0 0 ${width} ${sag + 40}" aria-hidden="true">${wire}${bulbs}</svg>`;
}

export function mountGarland(el) {
  const render = () => {
    el.innerHTML = garlandSvg(Math.max(320, window.innerWidth));
  };
  render();
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(render, 150);
  });
}

// ---------------------------------------------------------------------------
// Landschaft: Schneehügel mit kleinem Dorf
// ---------------------------------------------------------------------------

export function hillsSvg({ width = 1600, height = 460, village = true, fit = 'none' } = {}) {
  const id = nextId('h');
  const houses = village
    ? [
        [170, 112, 1], [235, 104, 0.85], [300, 118, 1.1], [1010, 90, 0.9], [1080, 98, 1], [1150, 88, 0.8],
      ]
        .map(([x, y, s], i) => {
          const wall = i % 2 ? '#3a3157' : '#43386a';
          return `<g transform="translate(${x} ${y}) scale(${s})">
            <rect x="-18" y="-22" width="36" height="24" fill="${wall}"/>
            <path d="M-23 -20 L0 -40 L23 -20Z" fill="#2b2444"/>
            <path d="M-24 -19 L0 -41 L24 -19 L20 -19 L0 -36 L-20 -19Z" fill="#eef4ff"/>
            <rect x="-11" y="-15" width="8" height="8" fill="#ffd77a" class="window"/>
            <rect x="4" y="-15" width="8" height="8" fill="#ffcf5e" class="window"/>
            <rect x="8" y="-38" width="5" height="10" fill="#2b2444"/>
          </g>`;
        })
        .join('')
    : '';
  const pines = village
    ? [[90, 128], [120, 122], [380, 126], [420, 132], [930, 100], [960, 96], [1230, 92], [1270, 100], [1330, 110]]
        .map(
          ([x, y]) =>
            `<path d="M${x} ${y - 40} L${x + 13} ${y - 14} L${x + 7} ${y - 14} L${x + 16} ${y} L${x - 16} ${y} L${x - 7} ${y - 14} L${x - 13} ${y - 14}Z" fill="#2c3f63"/>` +
            `<path d="M${x} ${y - 40} L${x + 6} ${y - 28} L${x - 6} ${y - 28}Z" fill="#e9f1ff"/>`,
        )
        .join('')
    : '';
  const par = fit === 'slice' ? 'xMidYMax slice' : 'none';
  return `<svg class="hills-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="${par}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb8de"/><stop offset="1" stop-color="#7f98c4"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dbe7f8"/><stop offset="1" stop-color="#b7c9e6"/></linearGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eef4fd"/><stop offset="1" stop-color="#d6e3f5"/></linearGradient>
    </defs>
    <path d="M0 150 C180 70 330 110 470 120 C640 135 760 60 960 80 C1150 100 1300 60 ${width} 100 L${width} ${height} L0 ${height}Z" fill="url(#${id}a)"/>
    ${pines}
    ${houses}
    <path d="M0 190 C220 140 420 170 640 165 C880 160 1080 120 1300 140 C1440 152 1530 150 ${width} 145 L${width} ${height} L0 ${height}Z" fill="url(#${id}b)"/>
    <path d="M0 240 C260 200 520 225 800 215 C1080 205 1330 200 ${width} 215 L${width} ${height} L0 ${height}Z" fill="url(#${id}c)"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Kleinigkeiten
// ---------------------------------------------------------------------------

export function hollySvg(className = '') {
  return `<svg class="holly-svg ${className}" viewBox="0 0 120 80" aria-hidden="true">
    <path d="M60 44 C46 30 30 34 14 22 C18 30 12 34 16 40 C10 42 10 48 6 52 C24 50 38 58 60 44Z" fill="#1f7a46"/>
    <path d="M60 44 C46 30 30 34 14 22" stroke="#135330" stroke-width="2" fill="none"/>
    <path d="M60 44 C74 30 90 34 106 22 C102 30 108 34 104 40 C110 42 110 48 114 52 C96 50 82 58 60 44Z" fill="#2a8a4f"/>
    <path d="M60 44 C74 30 90 34 106 22" stroke="#135330" stroke-width="2" fill="none"/>
    <circle cx="54" cy="48" r="8" fill="#d7263d"/><circle cx="66" cy="49" r="8" fill="#c0392b"/><circle cx="60" cy="40" r="8" fill="#e0353f"/>
    <circle cx="51" cy="45" r="2.4" fill="#fff" opacity=".6"/><circle cx="57" cy="37" r="2.4" fill="#fff" opacity=".6"/><circle cx="63" cy="46" r="2.4" fill="#fff" opacity=".6"/>
  </svg>`;
}

export function bowSvg(color = '#d7263d', shade = '#a3172b') {
  return `<svg viewBox="20 10 60 48" aria-hidden="true">
    <path d="M50 33 C40 14 22 16 26 27 C29 35 42 35 50 33Z" fill="${color}"/>
    <path d="M50 33 C60 14 78 16 74 27 C71 35 58 35 50 33Z" fill="${color}"/>
    <path d="M50 33 C43 24 33 22 31 27 M50 33 C57 24 67 22 69 27" stroke="${shade}" stroke-width="2" fill="none" opacity=".8"/>
    <path d="M48 35 L38 52 L44 51 L46 57 L50 37Z M52 35 L62 52 L56 51 L54 57 L50 37Z" fill="${shade}"/>
    <ellipse cx="50" cy="33" rx="6" ry="5" fill="${color}" stroke="${shade}" stroke-width="1.5"/>
  </svg>`;
}

export function pencilSvg() {
  return `<svg class="pencil-svg" viewBox="0 0 40 40" aria-hidden="true">
    <g transform="rotate(-40 20 20)">
      <rect x="6" y="15" width="22" height="10" fill="#f2c14e"/>
      <rect x="6" y="15" width="22" height="3.5" fill="#ffd970"/>
      <rect x="2" y="15" width="5" height="10" rx="1.5" fill="#f08aa0"/>
      <rect x="6" y="15" width="3" height="10" fill="#c9cdd6"/>
      <path d="M28 15 L37 20 L28 25Z" fill="#f4d7b0"/>
      <path d="M34 18.3 L37 20 L34 21.7Z" fill="#3b2a1a"/>
    </g>
  </svg>`;
}

export function checkSvg() {
  return `<svg class="check-svg" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#2a8a4f" stroke="#fff" stroke-width="3"/>
    <path d="M12 21 L18 27 L29 14" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function starSvg(color = '#ffd34e') {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 L25 14 L38 15 L28 24 L31 37 L20 30 L9 37 L12 24 L2 15 L15 14Z" fill="${color}"/></svg>`;
}

/** Sternenhimmel als Hintergrund-Ebene. */
export function mountStars(el, count = 70) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 55;
    const s = Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1.4;
    const d = (Math.random() * 4).toFixed(2);
    html += `<i style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${s}px;height:${s}px;animation-delay:${d}s"></i>`;
  }
  el.innerHTML = html;
}
