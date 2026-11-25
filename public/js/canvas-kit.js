// Gemeinsame Zeichen-Helfer für Bilder und PDF (Canvas).

export const FONT_UI = "'Fredoka', system-ui, sans-serif";
export const FONT_HAND = "'Patrick Hand', 'Fredoka', cursive";
export const FONT_TITLE = "'Mountains of Christmas', 'Fredoka', cursive";

/** Sorgt dafür, dass die Schriften geladen sind, bevor auf das Canvas gezeichnet wird. */
export async function loadFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`700 120px ${FONT_TITLE}`),
    document.fonts.load(`600 40px ${FONT_UI}`),
    document.fonts.load(`400 40px ${FONT_UI}`),
    document.fonts.load(`400 40px ${FONT_HAND}`),
    // Umlaute & Sonderzeichen (Ş, ć …) liegen in eigenen Schriftdateien
    document.fonts.load(`600 40px ${FONT_UI}`, 'ŞşćčğıŁł'),
    document.fonts.load(`400 40px ${FONT_HAND}`, 'ŞşćčğıŁł'),
  ]).catch(() => {});
}

export function svgImage(svg, w, h) {
  const markup = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

export function wrap(ctx, text, maxWidth) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (let word of words) {
      // sehr lange Wörter notfalls trennen
      while (ctx.measureText(word).width > maxWidth) {
        let i = word.length - 1;
        while (i > 1 && ctx.measureText(`${word.slice(0, i)}-`).width > maxWidth) i--;
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(`${word.slice(0, i)}-`);
        word = word.slice(i);
      }
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawRoll(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#c9a56a');
  g.addColorStop(0.22, '#f3dfae');
  g.addColorStop(0.42, '#fff3d4');
  g.addColorStop(0.7, '#e8cd94');
  g.addColorStop(1, '#b48a4f');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  for (const ex of [x + 6, x + w - 6]) {
    const rg = ctx.createRadialGradient(ex, y + h / 2, 1, ex, y + h / 2, h / 2);
    rg.addColorStop(0, '#8a6532');
    rg.addColorStop(0.25, '#e9d09c');
    rg.addColorStop(0.45, '#b8904f');
    rg.addColorStop(0.7, '#f0dbab');
    rg.addColorStop(1, '#b48a4f');
    ctx.beginPath();
    ctx.ellipse(ex, y + h / 2, h * 0.34, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
  }
}
