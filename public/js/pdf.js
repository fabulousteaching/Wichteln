// Ganz kleiner PDF-Baukasten: jede Seite ist ein JPEG-Bild in voller Seitengrösse.
// (Reicht für Druckvorlagen und braucht keine fremde Bibliothek.)

const encoder = new TextEncoder();

/** PDF-Textstring als UTF-16BE (damit Umlaute im Titel stimmen). */
function pdfText(value) {
  let hex = 'FEFF';
  for (let i = 0; i < value.length; i++) hex += value.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

function pdfDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `(D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())})`;
}

/**
 * @param {{ jpeg: Uint8Array, width: number, height: number }[]} pages
 * @param {{ title?: string, widthPt?: number, heightPt?: number, duplex?: boolean }} options
 * @returns {Blob}
 */
export function imagesToPdf(pages, { title = '', widthPt = 595.28, heightPt = 841.89, duplex = false } = {}) {
  const chunks = [];
  const offsets = [];
  let offset = 0;
  const push = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const object = (num, ...parts) => {
    offsets[num] = offset;
    push(`${num} 0 obj\n`);
    parts.forEach(push);
    push('\nendobj\n');
  };

  push('%PDF-1.7\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // Kennzeichnung "enthält Binärdaten"

  const pageNum = (i) => 4 + i * 3;
  const kids = pages.map((_, i) => `${pageNum(i)} 0 R`).join(' ');
  const viewer = duplex ? ' /ViewerPreferences << /Duplex /DuplexFlipLongEdge >>' : '';
  object(1, `<< /Type /Catalog /Pages 2 0 R${viewer} >>`);
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  object(3, `<< /Title ${pdfText(title)} /Creator (Wichteln) /CreationDate ${pdfDate()} >>`);

  pages.forEach((page, i) => {
    const n = pageNum(i);
    const w = widthPt.toFixed(2);
    const h = heightPt.toFixed(2);
    object(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    object(n + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    object(
      n + 2,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
      page.jpeg,
      '\nendstream',
    );
  });

  const count = 3 + pages.length * 3;
  const xref = offset;
  let table = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= count; i++) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${count + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
