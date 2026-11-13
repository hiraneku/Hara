/* Impor dari Notion (Export → "Markdown & CSV").

   Yang ditangani:
   • Nama berkas memakai akhiran id 32 karakter hex ("Rapat 3f2a…e8.md").
     Akhiran itu dibuang dari judul catatan.
   • Tautan antar halaman "[Label](Sub%20halaman%20<id>.md)" dijadikan
     [[Judul]] atau [[Judul|Label]] bila halaman tujuannya ada di zip.
     Tautan ke halaman yang tidak ada di zip jadi teks biasa (labelnya saja).
   • Database (CSV) jadi satu catatan berisi tabel markdown.
   • Tautan http(s), gambar, dan isi blok kode tidak diubah.

   Modul ini murni (tanpa DOM, tanpa state) supaya bisa diuji di Node. */

const decodeSafe = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };

/* "a/b/Judul 3f2a….md" → "Judul" (tanpa folder, tanpa ekstensi, tanpa id Notion). */
export function namaBersihNotion(nama) {
  const dasar = String(nama || '').split(/[/\\]/).pop();
  const tanpaExt = decodeSafe(dasar.replace(/\.(md|markdown|csv|txt)$/i, ''));
  return tanpaExt.replace(/[\s\u00a0]+[0-9a-f]{32}$/i, '').trim() || 'Tanpa judul';
}

/* Judul dari baris "# …" pertama. Markup sederhana dibuang agar cocok dengan judul catatan. */
export function judulDariMarkdown(teks) {
  const m = /^#[ \t]+(.+?)[ \t]*$/m.exec(String(teks || ''));
  if (!m) return '';
  return m[1].replace(/[*_`~]/g, '').trim();
}

/* Normalisasi jalur: buang ".", selesaikan "..", tanpa "/" di depan. */
export function normJalur(p) {
  const keluar = [];
  for (const bagian of String(p || '').split('/')) {
    if (!bagian || bagian === '.') continue;
    if (bagian === '..') keluar.pop();
    else keluar.push(bagian);
  }
  return keluar.join('/');
}

const ekstensi = nama => {
  const m = /\.([A-Za-z0-9]+)$/.exec(nama || '');
  return m ? m[1].toLowerCase() : '';
};

/* entri: [{ nama: jalur lengkap dalam zip, teks }]. Mengembalikan:
   { items: [{ jalur, judul, ext }], resolve(dariJalur, target) → item | null } */
export function petaTautanNotion(entri) {
  const items = [];
  for (const e of entri || []) {
    const ext = ekstensi(e.nama);
    if (!['md', 'markdown', 'csv'].includes(ext)) continue;
    const bersih = namaBersihNotion(e.nama);
    const judul = ext === 'csv' ? bersih : (judulDariMarkdown(e.teks) || bersih);
    items.push({ jalur: normJalur(decodeSafe(e.nama)), judul, ext: ext === 'markdown' ? 'md' : ext, bersih });
  }
  const byJalur = new Map(items.map(i => [i.jalur.toLowerCase(), i]));
  /* cadangan bila folder tidak cocok: nama bersih + ekstensi, hanya bila unik */
  const hitungKunci = new Map();
  items.forEach(i => {
    const k = i.bersih.toLowerCase() + '.' + i.ext;
    hitungKunci.set(k, (hitungKunci.get(k) || 0) + 1);
  });
  const byBase = new Map(items
    .filter(i => hitungKunci.get(i.bersih.toLowerCase() + '.' + i.ext) === 1)
    .map(i => [i.bersih.toLowerCase() + '.' + i.ext, i]));

  const resolve = (dariJalur, target) => {
    const bersihTarget = String(target || '').split('#')[0].split('?')[0];
    const t = decodeSafe(bersihTarget);
    if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('/')) return null;
    const dir = String(dariJalur || '').split('/').slice(0, -1).join('/');
    const kandidat = normJalur(dir ? dir + '/' + t : t).toLowerCase();
    if (byJalur.has(kandidat)) return byJalur.get(kandidat);
    const ext = ekstensi(t);
    return byBase.get(namaBersihNotion(t).toLowerCase() + '.' + (ext === 'markdown' ? 'md' : ext)) || null;
  };
  return { items, resolve };
}

/* Ganti tautan antar halaman di isi markdown. Baris di dalam blok kode dibiarkan. */
export function tulisUlangTautan(teks, dariJalur, peta) {
  let dalamKode = false;
  return String(teks || '').split('\n').map(baris => {
    if (/^\s*(```|~~~)/.test(baris)) { dalamKode = !dalamKode; return baris; }
    if (dalamKode) return baris;
    return baris.replace(/(?<!!)\[([^\]\n]*)\]\(([^)\s]+)\)/g, (asli, label, target) => {
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(target.trim())) return asli;   /* http:, https:, mailto:, //host — biarkan */
      const bersih = target.split('#')[0].split('?')[0];
      if (!/\.(md|markdown|csv)$/i.test(bersih)) return asli;
      const hit = peta.resolve(dariJalur, target);
      if (!hit) return label || asli;
      const lbl = String(label || '').replace(/[|\[\]]/g, ' ').trim();
      return !lbl || lbl === hit.judul ? `[[${hit.judul}]]` : `[[${hit.judul}|${lbl}]]`;
    });
  }).join('\n');
}

/* CSV RFC 4180: kutip ganda, "" di dalam kutip, koma/baris baru di dalam kutip. */
export function pecahCsv(teks) {
  const s = String(teks || '').replace(/^\uFEFF/, '');
  const baris = [];
  let kolom = [];
  let sel = '';
  let dalam = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalam) {
      if (c === '"') {
        if (s[i + 1] === '"') { sel += '"'; i++; }
        else dalam = false;
      } else sel += c;
    } else if (c === '"') dalam = true;
    else if (c === ',') { kolom.push(sel); sel = ''; }
    else if (c === '\r') { /* dilewati; \n yang menyusul yang memutus baris */ }
    else if (c === '\n') { kolom.push(sel); baris.push(kolom); kolom = []; sel = ''; }
    else sel += c;
  }
  if (sel !== '' || kolom.length) { kolom.push(sel); baris.push(kolom); }
  return baris.filter(b => b.some(x => x.trim() !== ''));
}

/* CSV → tabel markdown (baris pertama = header). */
export function csvKeMarkdown(teks) {
  const baris = pecahCsv(teks);
  if (!baris.length) return '';
  const lebar = Math.max(...baris.map(b => b.length));
  const sel = c => String(c == null ? '' : c).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  const rapi = b => {
    const isi = [...b.map(sel)];
    while (isi.length < lebar) isi.push('');
    return '| ' + isi.join(' | ') + ' |';
  };
  const header = rapi(baris[0]);
  const pemisah = '| ' + Array(lebar).fill('---').join(' | ') + ' |';
  return [header, pemisah, ...baris.slice(1).map(rapi)].join('\n');
}
