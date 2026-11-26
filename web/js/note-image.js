// Zeichnet den Wichtelzettel als PNG-Bild (zum Speichern in der Galerie).

import { hollySvg, giftSvg } from './art.js';
import { elfSvg } from './elf.js';
import { lines } from './common.js';
import { FONT_UI, FONT_HAND, FONT_TITLE, loadFonts, svgImage, wrap, roundRect, drawRoll } from './canvas-kit.js';

const W = 1080;
const PAPER_X = 90;
const PAPER_W = W - PAPER_X * 2;
const PAD = 70;
const TEXT_W = PAPER_W - PAD * 2;

/**
 * @param {{ name: string, wishes: string, nogos: string, hint?: string, title?: string }} note
 * @returns {Promise<Blob>}
 */
export async function renderNoteImage(note) {
  await loadFonts();

  const measure = document.createElement('canvas').getContext('2d');
  const wishes = lines(note.wishes);
  const nogos = lines(note.nogos);

  // ---- Layout berechnen ----
  const blocks = [];
  let y = 0;
  const add = (block) => {
    blocks.push({ ...block, y });
    y += block.h;
  };

  add({ type: 'secret', h: 56 });
  add({ type: 'for', h: 64 });

  let nameSize = 140;
  measure.font = `700 ${nameSize}px ${FONT_TITLE}`;
  while (measure.measureText(note.name).width > TEXT_W && nameSize > 60) {
    nameSize -= 6;
    measure.font = `700 ${nameSize}px ${FONT_TITLE}`;
  }
  add({ type: 'name', h: nameSize * 1.15 + 20, size: nameSize });

  const section = (label, items, kind) => {
    measure.font = `600 38px ${FONT_UI}`;
    const labelLines = wrap(measure, label, TEXT_W);
    add({ type: 'label', h: labelLines.length * 48 + 18, lines: labelLines });
    measure.font = `400 42px ${FONT_HAND}`;
    if (!items.length) {
      add({ type: 'empty', h: 60, text: kind === 'wish' ? 'Noch nichts aufgeschrieben' : '–' });
    } else {
      for (const item of items) {
        const itemLines = wrap(measure, item, TEXT_W - 56);
        add({ type: 'item', kind, h: itemLines.length * 50 + 14, lines: itemLines });
      }
    }
    y += 24;
  };
  section(`🎁 Das wünscht sich ${note.name}:`, wishes, 'wish');
  section(`🙈 Darüber würde sich ${note.name} gar nicht freuen:`, nogos, 'nogo');

  if (note.hint) {
    measure.font = `400 34px ${FONT_UI}`;
    const hintLines = wrap(measure, `📌 ${note.hint}`, TEXT_W - 56);
    y += 10;
    add({ type: 'hint', h: hintLines.length * 46 + 44, lines: hintLines });
  }

  const contentH = y;
  const ROLL_H = 64;
  const paperTop = 150;
  const paperH = contentH + PAD * 2 + 40;
  const H = paperTop + paperH + 260;

  // ---- Zeichnen ----
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Nachthimmel
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a1230');
  sky.addColorStop(0.5, '#152a5c');
  sky.addColorStop(1, '#2b4c88');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = 0.35 + rnd() * 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, rnd() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Schneehügel unten
  ctx.fillStyle = '#dbe7f8';
  ctx.beginPath();
  ctx.moveTo(0, H - 150);
  ctx.bezierCurveTo(W * 0.3, H - 210, W * 0.6, H - 120, W, H - 180);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, H - 90);
  ctx.bezierCurveTo(W * 0.35, H - 140, W * 0.7, H - 70, W, H - 110);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  // Papier
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fdf4de';
  ctx.fillRect(PAPER_X, paperTop, PAPER_W, paperH);
  ctx.restore();
  const edge = ctx.createLinearGradient(PAPER_X, 0, PAPER_X + PAPER_W, 0);
  edge.addColorStop(0, 'rgba(170,130,70,.18)');
  edge.addColorStop(0.06, 'rgba(170,130,70,0)');
  edge.addColorStop(0.94, 'rgba(170,130,70,0)');
  edge.addColorStop(1, 'rgba(170,130,70,.18)');
  ctx.fillStyle = edge;
  ctx.fillRect(PAPER_X, paperTop, PAPER_W, paperH);
  drawRoll(ctx, PAPER_X - 24, paperTop - ROLL_H / 2, PAPER_W + 48, ROLL_H);
  drawRoll(ctx, PAPER_X - 24, paperTop + paperH - ROLL_H / 2, PAPER_W + 48, ROLL_H);

  const [holly, elf, gift] = await Promise.all([
    svgImage(hollySvg(), 180, 120),
    svgImage(elfSvg(0), 190, 270),
    svgImage(giftSvg(3), 170, 170),
  ]);
  if (holly) {
    ctx.drawImage(holly, PAPER_X + 6, paperTop + 30, 150, 100);
    ctx.save();
    ctx.translate(PAPER_X + PAPER_W - 6, paperTop + 30);
    ctx.scale(-1, 1);
    ctx.drawImage(holly, 0, 0, 150, 100);
    ctx.restore();
  }

  const left = PAPER_X + PAD;
  const top = paperTop + PAD + 20;
  ctx.textBaseline = 'alphabetic';
  for (const b of blocks) {
    const by = top + b.y;
    switch (b.type) {
      case 'secret':
        ctx.font = `600 32px ${FONT_UI}`;
        ctx.fillStyle = '#a3172b';
        ctx.textAlign = 'center';
        ctx.fillText('🤫 Psst … streng geheim!', W / 2, by + 36);
        break;
      case 'for':
        ctx.font = `400 50px ${FONT_HAND}`;
        ctx.fillStyle = '#3b2a1a';
        ctx.textAlign = 'center';
        ctx.fillText('Ich wichtle für', W / 2, by + 48);
        break;
      case 'name':
        ctx.font = `700 ${b.size}px ${FONT_TITLE}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(163,23,43,.25)';
        ctx.fillText(note.name, W / 2, by + b.size * 0.98 + 4);
        ctx.fillStyle = '#d7263d';
        ctx.fillText(note.name, W / 2, by + b.size * 0.98);
        break;
      case 'label':
        ctx.font = `600 38px ${FONT_UI}`;
        ctx.fillStyle = '#3b2a1a';
        ctx.textAlign = 'left';
        b.lines.forEach((l, i) => ctx.fillText(l, left, by + 40 + i * 48));
        break;
      case 'empty':
        ctx.font = `400 40px ${FONT_HAND}`;
        ctx.fillStyle = 'rgba(29,58,122,.5)';
        ctx.textAlign = 'left';
        ctx.fillText(b.text, left + 56, by + 42);
        break;
      case 'item':
        ctx.textAlign = 'left';
        if (b.kind === 'wish') {
          ctx.font = `400 40px ${FONT_UI}`;
          ctx.fillStyle = '#c8922a';
          ctx.fillText('★', left + 8, by + 44);
        } else {
          ctx.font = `700 36px ${FONT_UI}`;
          ctx.fillStyle = '#d7263d';
          ctx.fillText('✕', left + 10, by + 43);
        }
        ctx.font = `400 42px ${FONT_HAND}`;
        ctx.fillStyle = '#1d3a7a';
        b.lines.forEach((l, i) => ctx.fillText(l, left + 56, by + 44 + i * 50));
        ctx.strokeStyle = 'rgba(70,110,170,.3)';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, by + b.h - 2);
        ctx.lineTo(left + TEXT_W, by + b.h - 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      case 'hint':
        ctx.save();
        roundRect(ctx, left, by, TEXT_W, b.h - 10, 22);
        ctx.fillStyle = 'rgba(242,193,78,.22)';
        ctx.fill();
        ctx.setLineDash([12, 9]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#c8922a';
        ctx.stroke();
        ctx.restore();
        ctx.font = `400 34px ${FONT_UI}`;
        ctx.fillStyle = '#3b2a1a';
        ctx.textAlign = 'left';
        b.lines.forEach((l, i) => ctx.fillText(l, left + 28, by + 52 + i * 46));
        break;
      default:
        break;
    }
  }

  // Fusszeile mit Wichtel und Geschenk
  if (gift) ctx.drawImage(gift, 70, H - 200, 150, 150);
  if (elf) ctx.drawImage(elf, W - 230, H - 285, 180, 256);
  ctx.font = `600 34px ${FONT_UI}`;
  ctx.fillStyle = '#2b4c88';
  ctx.textAlign = 'center';
  ctx.fillText(note.title ? `Wichteln · ${note.title}` : 'Wichteln', W / 2, H - 50);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
