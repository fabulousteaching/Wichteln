// Wichtelkarten für die Lehrperson: pro Kind ein Blatt (doppelseitig drucken).
// Vorderseite: Name des Kindes, das wichtelt. Rückseite: geheim, für wen es wichtelt.

import { elfSvg, hollySvg, giftSvg } from './art.js';
import { lines } from './common.js';
import { FONT_UI, FONT_HAND, FONT_TITLE, loadFonts, svgImage, wrap, roundRect } from './canvas-kit.js';
import { imagesToPdf } from './pdf.js';

// Gezeichnet wird in einem Raster von 1488 × 2104 (A4 hochkant), ausgegeben mit 150 dpi.
const W = 1488;
const H = 2104;
const OUT_W = 1240;
const OUT_H = 1754;
const M = 70; // Abstand des Rahmens zum Rand

function fitFont(ctx, text, weightFamily, maxSize, minSize, maxWidth) {
  let size = maxSize;
  ctx.font = `${weightFamily.replace('{s}', size)}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 4;
    ctx.font = `${weightFamily.replace('{s}', size)}`;
  }
  return size;
}

function frame(ctx, color, art) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // gestreifter Rahmen (wie eine Zuckerstange)
  ctx.save();
  roundRect(ctx, M, M, W - 2 * M, H - 2 * M, 46);
  ctx.lineWidth = 24;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.setLineDash([46, 30]);
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  roundRect(ctx, M + 30, M + 30, W - 2 * M - 60, H - 2 * M - 60, 30);
  ctx.lineWidth = 4;
  ctx.strokeStyle = color === '#d7263d' ? '#2a8a4f' : '#d7263d';
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.restore();
  // Stechpalme in den Ecken
  if (art.holly) {
    const hw = 230;
    const hh = 154;
    const corner = (x, y, sx, sy) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      ctx.drawImage(art.holly, 0, 0, hw, hh);
      ctx.restore();
    };
    corner(M + 18, M + 14, 1, 1);
    corner(W - M - 18, M + 14, -1, 1);
  }
}

function star(ctx, x, y, r, color) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Vorderseite
// ---------------------------------------------------------------------------

function drawFront(ctx, art, { name, title }) {
  frame(ctx, '#d7263d', art);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `600 58px ${FONT_UI}`;
  ctx.fillStyle = '#17603a';
  ctx.fillText(title ? `Wichteln · ${title}` : 'Wichteln', W / 2, 300);

  for (const [x, y, r] of [[300, 520, 26], [1190, 470, 34], [1240, 640, 18], [250, 700, 20], [1150, 1560, 24], [330, 1490, 30]]) {
    star(ctx, x, y, r, '#f2c14e');
  }

  ctx.font = `400 78px ${FONT_HAND}`;
  ctx.fillStyle = '#3b2a1a';
  ctx.fillText('Wichtelkarte von', W / 2, 760);

  const size = fitFont(ctx, name, `700 {s}px ${FONT_TITLE}`, 330, 90, W - 2 * M - 220);
  ctx.font = `700 ${size}px ${FONT_TITLE}`;
  const nameY = 760 + 60 + size * 0.95;
  ctx.fillStyle = 'rgba(163,23,43,.22)';
  ctx.fillText(name, W / 2, nameY + 8);
  ctx.fillStyle = '#d7263d';
  ctx.fillText(name, W / 2, nameY);

  // Wichtel überreicht das Geschenk
  const artTop = nameY + 90;
  if (art.gift) ctx.drawImage(art.gift, W / 2 - 290, artTop + 70, 260, 260);
  if (art.elf) ctx.drawImage(art.elf, W / 2 + 10, artTop, 230, 326);

  ctx.textAlign = 'center';
  ctx.font = `400 96px ${FONT_HAND}`;
  ctx.fillStyle = '#1d3a7a';
  ctx.fillText('Dreh mich um!', W / 2, artTop + 460);
  ctx.font = `600 46px ${FONT_UI}`;
  ctx.fillStyle = '#a3172b';
  ctx.fillText('Hinten steht, für wen du wichtelst. Psst! 🤫', W / 2, artTop + 540);

  ctx.font = `400 34px ${FONT_UI}`;
  ctx.fillStyle = '#7a6a55';
  const note = wrap(ctx, 'Für die Lehrperson: Diese Seite zu dir halten. Die Rückseite ist geheim und nur für das Kind.', W - 2 * M - 240);
  note.forEach((l, i) => ctx.fillText(l, W / 2, H - M - 130 + i * 46));
}

// ---------------------------------------------------------------------------
// Rückseite
// ---------------------------------------------------------------------------

function layoutBack(ctx, data, s) {
  const textW = W - 2 * M - 220;
  const blocks = [];
  let y = 0;
  const add = (b) => {
    blocks.push({ ...b, y });
    y += b.h;
  };
  add({ type: 'secret', h: 80 * s });
  add({ type: 'for', h: 110 * s, size: 88 * s });
  const nameSize = fitFont(ctx, data.giftee, `700 {s}px ${FONT_TITLE}`, Math.round(280 * s), 70, textW);
  add({ type: 'name', h: nameSize * 1.12 + 30 * s, size: nameSize });

  const section = (label, items, kind, empty) => {
    const ls = 56 * s;
    ctx.font = `600 ${ls}px ${FONT_UI}`;
    const labelLines = wrap(ctx, label, textW);
    add({ type: 'label', h: labelLines.length * ls * 1.22 + 22 * s, size: ls, lines: labelLines });
    const is = 64 * s;
    ctx.font = `400 ${is}px ${FONT_HAND}`;
    if (!items.length) {
      add({ type: 'empty', h: is * 1.4, size: is, text: empty });
    } else {
      for (const item of items) {
        const itemLines = wrap(ctx, item, textW - 80 * s);
        add({ type: 'item', kind, h: itemLines.length * is * 1.2 + 22 * s, size: is, lines: itemLines });
      }
    }
    y += 40 * s;
  };
  section(`🎁 Das wünscht sich ${data.giftee}:`, lines(data.wishes), 'wish', 'Noch nichts aufgeschrieben.');
  section(`🙈 Darüber würde sich ${data.giftee} gar nicht freuen:`, lines(data.nogos), 'nogo', '–');

  if (data.hint) {
    const hs = 48 * s;
    ctx.font = `400 ${hs}px ${FONT_UI}`;
    const hintLines = wrap(ctx, `📌 ${data.hint}`, textW - 80 * s);
    y += 10 * s;
    add({ type: 'hint', h: hintLines.length * hs * 1.3 + 60 * s, size: hs, lines: hintLines });
  }
  return { blocks, height: y, textW };
}

function drawBack(ctx, art, data) {
  frame(ctx, '#2a8a4f', art);
  const top = 300;
  const bottom = H - M - 170;
  let s = 1;
  let layout = layoutBack(ctx, data, s);
  while (layout.height > bottom - top && s > 0.42) {
    s -= 0.04;
    layout = layoutBack(ctx, data, s);
  }
  // Inhalt vertikal etwas mittiger setzen, wenn Platz ist
  const offset = Math.max(0, Math.min(140, (bottom - top - layout.height) / 3));
  const left = M + 110;
  const textW = layout.textW;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, bottom + 20);
  ctx.clip();
  for (const b of layout.blocks) {
    const by = top + offset + b.y;
    switch (b.type) {
      case 'secret':
        ctx.textAlign = 'center';
        ctx.font = `600 ${54 * s}px ${FONT_UI}`;
        ctx.fillStyle = '#a3172b';
        ctx.fillText('🤫 Psst … streng geheim!', W / 2, by + 58 * s);
        break;
      case 'for':
        ctx.textAlign = 'center';
        ctx.font = `400 ${b.size}px ${FONT_HAND}`;
        ctx.fillStyle = '#3b2a1a';
        ctx.fillText(`${data.giver}, du wichtelst für`, W / 2, by + b.size * 0.95);
        break;
      case 'name':
        ctx.textAlign = 'center';
        ctx.font = `700 ${b.size}px ${FONT_TITLE}`;
        ctx.fillStyle = 'rgba(163,23,43,.22)';
        ctx.fillText(data.giftee, W / 2, by + b.size * 0.98 + 6);
        ctx.fillStyle = '#d7263d';
        ctx.fillText(data.giftee, W / 2, by + b.size * 0.98);
        break;
      case 'label':
        ctx.textAlign = 'left';
        ctx.font = `600 ${b.size}px ${FONT_UI}`;
        ctx.fillStyle = '#3b2a1a';
        b.lines.forEach((l, i) => ctx.fillText(l, left, by + b.size + i * b.size * 1.22));
        break;
      case 'empty':
        ctx.textAlign = 'left';
        ctx.font = `400 ${b.size}px ${FONT_HAND}`;
        ctx.fillStyle = 'rgba(29,58,122,.5)';
        ctx.fillText(b.text, left + 80 * s, by + b.size);
        break;
      case 'item':
        ctx.textAlign = 'left';
        if (b.kind === 'wish') {
          ctx.font = `400 ${b.size * 0.9}px ${FONT_UI}`;
          ctx.fillStyle = '#c8922a';
          ctx.fillText('★', left + 10 * s, by + b.size);
        } else {
          ctx.font = `700 ${b.size * 0.8}px ${FONT_UI}`;
          ctx.fillStyle = '#d7263d';
          ctx.fillText('✕', left + 14 * s, by + b.size * 0.98);
        }
        ctx.font = `400 ${b.size}px ${FONT_HAND}`;
        ctx.fillStyle = '#1d3a7a';
        b.lines.forEach((l, i) => ctx.fillText(l, left + 80 * s, by + b.size + i * b.size * 1.2));
        ctx.save();
        ctx.strokeStyle = 'rgba(70,110,170,.35)';
        ctx.setLineDash([12, 10]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left, by + b.h - 4);
        ctx.lineTo(left + textW, by + b.h - 4);
        ctx.stroke();
        ctx.restore();
        break;
      case 'hint':
        ctx.save();
        roundRect(ctx, left, by, textW, b.h - 14 * s, 30 * s);
        ctx.fillStyle = 'rgba(242,193,78,.2)';
        ctx.fill();
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#c8922a';
        ctx.stroke();
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.font = `400 ${b.size}px ${FONT_UI}`;
        ctx.fillStyle = '#3b2a1a';
        b.lines.forEach((l, i) => ctx.fillText(l, left + 40 * s, by + 30 * s + b.size + i * b.size * 1.3));
        break;
      default:
        break;
    }
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = `400 34px ${FONT_UI}`;
  ctx.fillStyle = '#7a6a55';
  ctx.fillText(`Wichteln${data.title ? ` · ${data.title}` : ''} · Stand ${data.stamp}`, W / 2, H - M - 70);
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error('Bild konnte nicht erstellt werden.'));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      'image/jpeg',
      0.82,
    );
  });
}

/**
 * Erstellt das doppelseitige PDF.
 * @param {{ title: string, hint: string, pairs: Array<{ giver: { name: string }, giftee: { name: string, wishes: string, nogos: string } | null }>, onProgress?: (done: number, total: number) => void }} input
 * @returns {Promise<Blob>}
 */
export async function buildCardsPdf({ title, hint, pairs, onProgress = () => {} }) {
  await loadFonts();
  const [holly, elf, gift] = await Promise.all([
    svgImage(hollySvg(), 230, 154),
    svgImage(elfSvg(0), 280, 397),
    svgImage(giftSvg(0), 300, 300),
  ]);
  const art = { holly, elf, gift };

  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(OUT_W / W, 0, 0, OUT_H / H, 0, 0);
  const stamp = new Date().toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const list = pairs
    .filter((p) => p.giftee)
    .sort((a, b) => a.giver.name.localeCompare(b.giver.name, 'de-CH', { sensitivity: 'base' }));

  const pages = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    drawFront(ctx, art, { name: p.giver.name, title });
    pages.push({ jpeg: await canvasToJpeg(canvas), width: OUT_W, height: OUT_H });
    drawBack(ctx, art, { giver: p.giver.name, giftee: p.giftee.name, wishes: p.giftee.wishes, nogos: p.giftee.nogos, hint, title, stamp });
    pages.push({ jpeg: await canvasToJpeg(canvas), width: OUT_W, height: OUT_H });
    onProgress(i + 1, list.length);
  }
  return imagesToPdf(pages, { title: `Wichtelkarten${title ? ` – ${title}` : ''}`, duplex: true });
}
