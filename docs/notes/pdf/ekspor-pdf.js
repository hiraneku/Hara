/* Ekspor PDF yang sudah dianotasi (Bagian B1, Tahap 2, langkah B1c; koreksi §1.5).

   Cara yang dipilih (paling pasti dan sederhana, sesuai keputusan pengguna):
   • setiap halaman dirender jadi gambar JPEG lewat pdf.js, lalu anotasi
     (coret, sorot, garis, penanda komentar) digambar di atas gambar itu;
   • gambar-gambar itu ditulis ke PDF baru oleh penulis kecil di sini;
   • komentar juga disimpan sebagai anotasi PDF asli (/Text) berisi teksnya,
     sehingga bisa dibaca di pembaca PDF mana pun.

   Batasan jujur: teks halaman di PDF hasil ekspor TIDAK bisa dipilih atau
   dicari lagi (halaman sudah berupa gambar). PDF asli tidak diubah.

   Modul ini murni (tanpa DOM) kecuali gambarAnotasiKanvas yang menerima
   konteks kanvas dari pemanggil. */

const enc = new TextEncoder();

function angka(v) {
  return Number(v).toFixed(3).replace(/\.?0+$/, '') || '0';
}

/* Teks Unicode untuk PDF: UTF-16BE dengan BOM, dalam bentuk hex. */
export function teksPdfUtf16(teks) {
  let hex = 'FEFF';
  for (let i = 0; i < teks.length; i++) {
    hex += teks.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  }
  return '<' + hex + '>';
}

/* Menulis PDF dari daftar halaman.
   halaman[i] = {
     w, h        : ukuran halaman dalam poin PDF,
     pxW, pxH    : ukuran gambar dalam piksel,
     jpeg        : Uint8Array berkas JPEG,
     komentar    : [{ x, y, teks }]   (x,y ternormalisasi 0–1, y dari atas)
   }
   Mengembalikan Uint8Array berkas PDF. */
export function tulisPdfGambar(halaman) {
  if (!Array.isArray(halaman) || halaman.length === 0) throw new Error('tidak ada halaman');
  /* objek[0] dan [1] disediakan untuk Catalog dan Pages */
  const objek = [];           /* tiap entri: string, atau { kamus, data } untuk aliran */
  const tambah = isi => { objek.push(isi); return objek.length; };
  objek.push(null, null);

  const kids = [];
  for (const h of halaman) {
    if (!(h.w > 0 && h.h > 0) || !(h.pxW > 0 && h.pxH > 0)) throw new Error('ukuran halaman tidak valid');
    if (!(h.jpeg && h.jpeg.length > 0)) throw new Error('gambar halaman kosong');
    const imgId = tambah({
      kamus: `<< /Type /XObject /Subtype /Image /Width ${h.pxW} /Height ${h.pxH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${h.jpeg.length} >>`,
      data: h.jpeg,
    });
    const isiAliran = `q ${angka(h.w)} 0 0 ${angka(h.h)} 0 0 cm /Im${imgId} Do Q`;
    const data = enc.encode(isiAliran);
    const kontenId = tambah({ kamus: `<< /Length ${data.length} >>`, data });

    const annotIds = [];
    for (const k of h.komentar || []) {
      /* kotak anotasi kecil di posisi penanda; koordinat PDF dari bawah */
      const x = k.x * h.w, yAtas = k.y * h.h;
      const y = h.h - yAtas;
      annotIds.push(tambah(
        `<< /Type /Annot /Subtype /Text /Rect [${angka(x)} ${angka(y - 18)} ${angka(x + 18)} ${angka(y)}] ` +
        `/Contents ${teksPdfUtf16(k.teks)} /T ${teksPdfUtf16('Hara')} /C [0.118 0.565 0.882] ` +
        `/Open false /Name /Comment /F 4 >>`));
    }
    const annots = annotIds.length ? ` /Annots [${annotIds.map(i => i + ' 0 R').join(' ')}]` : '';
    const pageId = tambah(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${angka(h.w)} ${angka(h.h)}] ` +
      `/Resources << /XObject << /Im${imgId} ${imgId} 0 R >> >> /Contents ${kontenId} 0 R${annots} >>`);
    kids.push(pageId);
  }
  objek[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objek[1] = `<< /Type /Pages /Kids [${kids.map(i => i + ' 0 R').join(' ')}] /Count ${kids.length} >>`;

  /* perakitan: setiap bagian dicatat posisinya untuk tabel xref */
  const bagian = [];
  let pos = 0;
  const pushBytes = b => { bagian.push(b); pos += b.length; };
  const pushStr = s => pushBytes(enc.encode(s));

  pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a,       /* %PDF-1.4 */
                            0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));                       /* %… biner */
  const offset = [];
  for (let i = 0; i < objek.length; i++) {
    const no = i + 1;
    offset[no] = pos;
    const o = objek[i];
    if (typeof o === 'string') {
      pushStr(`${no} 0 obj\n${o}\nendobj\n`);
    } else {
      pushStr(`${no} 0 obj\n${o.kamus}\nstream\n`);
      pushBytes(o.data);
      pushStr(`\nendstream\nendobj\n`);
    }
  }
  const xrefPos = pos;
  let xref = `xref\n0 ${objek.length + 1}\n0000000000 65535 f \n`;
  for (let no = 1; no <= objek.length; no++) {
    xref += String(offset[no]).padStart(10, '0') + ' 00000 n \n';
  }
  pushStr(xref);
  pushStr(`trailer\n<< /Size ${objek.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const keluar = new Uint8Array(pos);
  let p = 0;
  for (const b of bagian) { keluar.set(b, p); p += b.length; }
  return keluar;
}

/* Menggambar anotasi satu halaman di atas kanvas berukuran pxW × pxH.
   Koordinat ternormalisasi dikali ukuran piksel. Dipanggil SETELAH halaman
   dirender ke kanvas. */
export function gambarAnotasiKanvas(ctx, pxW, pxH, daftar) {
  const lebar = Math.max(2, pxW * 0.004);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const a of daftar) {
    ctx.strokeStyle = a.warna;
    ctx.fillStyle = a.warna;
    ctx.lineWidth = lebar;
    if (a.jenis === 'coret') {
      ctx.beginPath();
      a.pts.forEach((p, i) => {
        const X = p.x * pxW, Y = p.y * pxH;
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      });
      ctx.stroke();
    } else if (a.jenis === 'sorot') {
      const x = Math.min(a.x1, a.x2) * pxW, y = Math.min(a.y1, a.y2) * pxH;
      const w = Math.abs(a.x2 - a.x1) * pxW, h = Math.abs(a.y2 - a.y1) * pxH;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    } else if (a.jenis === 'garis') {
      ctx.beginPath();
      ctx.moveTo(a.x1 * pxW, a.y1 * pxH);
      ctx.lineTo(a.x2 * pxW, a.y2 * pxH);
      ctx.stroke();
    } else if (a.jenis === 'komentar') {
      const r = Math.max(6, pxW * 0.012);
      ctx.beginPath();
      ctx.arc(a.x * pxW, a.y * pxH, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, lebar / 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
