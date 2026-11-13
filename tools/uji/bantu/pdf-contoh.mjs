/* Pembuat PDF contoh untuk uji (bukan uji sendiri). Menghasilkan PDF valid dengan
   `jumlah` halaman, ukuran 300×400, dan teks "Halaman N" di tiap halaman. */
export function buatPdf(jumlah) {
  const obj = [];
  const kids = [];
  for (let i = 0; i < jumlah; i++) kids.push(`${3 + i * 2} 0 R`);
  const fontNo = 3 + jumlah * 2;
  obj[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  obj[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${jumlah} >>`;
  for (let i = 0; i < jumlah; i++) {
    const pg = 3 + i * 2, ct = pg + 1;
    const teks = `BT /F1 24 Tf 40 300 Td (Halaman ${i + 1}) Tj ET`;
    obj[pg] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Contents ${ct} 0 R /Resources << /Font << /F1 ${fontNo} 0 R >> >> >>`;
    obj[ct] = `<< /Length ${teks.length} >>\nstream\n${teks}\nendstream`;
  }
  obj[fontNo] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  let s = '%PDF-1.4\n';
  const off = [];
  for (let n = 1; n <= fontNo; n++) { off[n] = s.length; s += `${n} 0 obj\n${obj[n]}\nendobj\n`; }
  const xref = s.length;
  s += `xref\n0 ${fontNo + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= fontNo; n++) s += String(off[n]).padStart(10, '0') + ' 00000 n \n';
  s += `trailer\n<< /Size ${fontNo + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}
