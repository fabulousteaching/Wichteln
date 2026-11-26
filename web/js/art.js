// Alle Zeichnungen (Wichtel, Geschenke, Tannenbaum, Lichterkette …) als SVG.

export const ELF_VARIANTS = [
  { hat: '#d7263d', hatDark: '#a3172b', tunic: '#2a8a4f', mitten: '#f2c14e', beard: '#ffffff', skin: '#f6c9a9', nose: '#f19a85' },
  { hat: '#2a8a4f', hatDark: '#1b6237', tunic: '#c62a3a', mitten: '#ffffff', braids: '#f0b23e', skin: '#f3c3a0', nose: '#ee927b' },
  { hat: '#c0392b', hatDark: '#8f2419', tunic: '#2f5fa7', mitten: '#d7263d', beard: '#f3f3f3', skin: '#d9a07a', nose: '#c97a5c' },
  { hat: '#1f6fb2', hatDark: '#154f82', tunic: '#d7263d', mitten: '#f2c14e', braids: '#6b3b1f', skin: '#c68b62', nose: '#b06a4b' },
  { hat: '#d7263d', hatDark: '#a3172b', tunic: '#8a5a2b', mitten: '#2a8a4f', beard: '#ffffff', skin: '#8d5a3b', nose: '#7a4630' },
  { hat: '#e0a526', hatDark: '#b07d14', tunic: '#2a8a4f', mitten: '#d7263d', braids: '#1d1d1d', skin: '#a86f48', nose: '#94593a' },
  { hat: '#7b3fa0', hatDark: '#592c75', tunic: '#2a8a4f', mitten: '#f2c14e', beard: '#eeeeee', skin: '#f6c9a9', nose: '#f19a85' },
  { hat: '#2a8a4f', hatDark: '#1b6237', tunic: '#d7263d', mitten: '#ffffff', beard: '#ffffff', skin: '#e3ac86', nose: '#d4876a' },
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
// ---------------------------------------------------------------------------

export function elfSvg(variantIndex = 0, { giftVariant = null } = {}) {
  const v = pick(ELF_VARIANTS, variantIndex);
  const id = nextId('e');
  const pants = '#3d2f4f';
  const boot = '#6b3e1f';

  const beard = v.beard
    ? `<path d="M34 78 C32 96 38 108 46 116 C50 121 55 124 60 125 C65 124 70 121 74 116 C82 108 88 96 86 78
              C78 88 70 92 60 92 C50 92 42 88 34 78Z" fill="${v.beard}"/>
       <path d="M40 104 C44 110 48 113 52 114 M80 104 C76 110 72 113 68 114 M60 98 L60 118"
             stroke="#000" stroke-opacity=".07" stroke-width="2.4" fill="none" stroke-linecap="round"/>
       <path d="M46 92 C52 96 56 95 60 93 C64 95 68 96 74 92 C70 99 64 99 60 97 C56 99 50 99 46 92Z" fill="${v.beard}"/>
       <path d="M46 92 C52 96 56 95 60 93 C64 95 68 96 74 92" stroke="#000" stroke-opacity=".08" stroke-width="1.6" fill="none"/>`
    : `<ellipse cx="60" cy="90" rx="19" ry="15" fill="${v.skin}"/>
       <circle cx="47" cy="93" r="4.2" fill="#ff7a8a" opacity=".55"/>
       <circle cx="73" cy="93" r="4.2" fill="#ff7a8a" opacity=".55"/>
       <path d="M53 99 Q60 105 67 99" stroke="#7a3b2c" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;

  const braids = v.braids
    ? `<g class="elf-braids">
         <path d="M33 82 C28 92 30 104 27 114" stroke="${v.braids}" stroke-width="8" stroke-linecap="round" fill="none"/>
         <path d="M87 82 C92 92 90 104 93 114" stroke="${v.braids}" stroke-width="8" stroke-linecap="round" fill="none"/>
         <path d="M30 90 l6 3 M29 98 l6 3 M28 106 l6 3 M90 90 l-6 3 M91 98 l-6 3 M92 106 l-6 3"
               stroke="#000" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/>
         <circle cx="27" cy="116" r="4.5" fill="${v.mitten}"/><circle cx="93" cy="116" r="4.5" fill="${v.mitten}"/>
       </g>`
    : '';

  const carry =
    giftVariant !== null
      ? `<g class="elf-carry"><g transform="translate(27 94) scale(.66)">${giftGroup(giftVariant)}</g></g>
         <g class="elf-arms-carry">
           <path d="M40 104 C34 110 31 116 30 122" stroke="${v.tunic}" stroke-width="10" stroke-linecap="round" fill="none"/>
           <path d="M80 104 C86 110 89 116 90 122" stroke="${v.tunic}" stroke-width="10" stroke-linecap="round" fill="none"/>
           <circle cx="30" cy="124" r="7" fill="${v.mitten}"/><circle cx="90" cy="124" r="7" fill="${v.mitten}"/>
         </g>`
      : '';

  return `<svg class="elf-svg" viewBox="0 0 120 170" aria-hidden="true">
    <defs>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${v.hat}"/><stop offset=".75" stop-color="${v.hat}"/><stop offset="1" stop-color="${v.hatDark}"/>
      </linearGradient>
      <radialGradient id="${id}n" cx=".35" cy=".35" r=".7">
        <stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".35" stop-color="${v.nose}"/><stop offset="1" stop-color="${v.nose}"/>
      </radialGradient>
    </defs>
    <ellipse class="elf-shadow" cx="60" cy="166" rx="30" ry="4.5" fill="#0a1428" opacity=".25"/>
    <g class="elf-leg elf-leg-l">
      <rect x="46" y="128" width="11" height="28" rx="5" fill="${pants}"/>
      <path d="M48 152 h9 a4 4 0 0 1 4 4 v4 a4 4 0 0 1 -4 4 h-12 c-7 0 -9 -3 -9 -6 c0 -4 5 -6 12 -6z" fill="${boot}"/>
    </g>
    <g class="elf-leg elf-leg-r">
      <rect x="63" y="128" width="11" height="28" rx="5" fill="${pants}"/>
      <path d="M72 152 h-9 a4 4 0 0 0 -4 4 v4 a4 4 0 0 0 4 4 h12 c7 0 9 -3 9 -6 c0 -4 -5 -6 -12 -6z" fill="${boot}"/>
    </g>
    <g class="elf-upper">
      <g class="elf-arms-free">
        <g class="elf-arm elf-arm-l">
          <path d="M42 104 C35 110 32 118 31 126" stroke="${v.tunic}" stroke-width="10" stroke-linecap="round" fill="none"/>
          <circle cx="31" cy="129" r="6.5" fill="${v.mitten}"/>
        </g>
        <g class="elf-arm elf-arm-r">
          <path d="M78 104 C85 110 88 118 89 126" stroke="${v.tunic}" stroke-width="10" stroke-linecap="round" fill="none"/>
          <circle cx="89" cy="129" r="6.5" fill="${v.mitten}"/>
        </g>
      </g>
      <path d="M40 100 C50 95 70 95 80 100 L86 132 C70 140 50 140 34 132Z" fill="${v.tunic}"/>
      <path d="M36 122 C50 128 70 128 84 122 L85 129 C70 135 50 135 35 129Z" fill="#3a2414"/>
      <rect x="54" y="122.5" width="12" height="10" rx="2" fill="none" stroke="#f2c14e" stroke-width="2.6"/>
      ${braids}
      ${beard}
      <g class="elf-hat">
        <path d="M31 84 C30 70 36 52 46 36 C54 22 64 12 78 8 C86 6 92 10 96 16 C90 14 84 15 80 20 C76 26 78 40 82 52
                 C86 62 89 72 89 84 C70 92 50 92 31 84Z" fill="url(#${id}h)"/>
        <path d="M30 80 C50 89 70 89 90 80 L90 86 C70 95 50 95 30 86Z" fill="${v.hatDark}"/>
        <circle cx="96" cy="17" r="7" fill="#fff"/>
        <circle cx="94" cy="15" r="2.5" fill="#fff" opacity=".9"/>
      </g>
      ${v.beard ? `<path d="M60 96 C54 92 46 92 41 97 C46 96 50 99 54 101 C57 102 59 100 60 98 C61 100 63 102 66 101 C70 99 74 96 79 97 C74 92 66 92 60 96Z" fill="${v.beard}" stroke="#000" stroke-opacity=".08" stroke-width="1.2"/>` : ''}
      <circle cx="60" cy="90" r="10" fill="url(#${id}n)"/>
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
