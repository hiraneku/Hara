/* Ekstraksi sampul (cover art) dari metadata berkas audio:
   - MP3 / ID3v2  : frame APIC (atau PIC pada ID3v2.2)
   - M4A / MP4    : atom moov/udta/meta/ilst/covr/data
   - FLAC         : blok metadata PICTURE

   Pembacaan memakai `pembaca` = { ukuran, baca(offset, panjang) → Uint8Array },
   sehingga berkas besar tidak dimuat penuh ke memori. Format lain (OGG/Opus,
   WAV) tidak punya sampul di sini dan menghasilkan null. */

const MAKS_TAG = 16 * 1024 * 1024;

/* Pembaca untuk Blob/File di peramban. */
export function pembacaBlob(blob) {
  return {
    ukuran: blob.size,
    baca: async (off, len) => new Uint8Array(await blob.slice(off, off + len).arrayBuffer()),
  };
}

const ascii = (u, off, n) => {
  let s = '';
  for (let i = off; i < Math.min(u.length, off + n); i++) s += String.fromCharCode(u[i]);
  return s;
};
const u32 = (u, off) => ((u[off] << 24) | (u[off + 1] << 16) | (u[off + 2] << 8) | u[off + 3]) >>> 0;
const sinkron = (u, off) =>
  ((u[off] & 0x7f) << 21) | ((u[off + 1] & 0x7f) << 14) | ((u[off + 2] & 0x7f) << 7) | (u[off + 3] & 0x7f);

/* Tebak tipe gambar dari bytes awal (JPEG, PNG, GIF, WebP). */
export function tebakMime(u) {
  if (u.length >= 3 && u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  if (u.length >= 4 && u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (ascii(u, 0, 4) === 'GIF8') return 'image/gif';
  if (ascii(u, 0, 4) === 'RIFF' && ascii(u, 8, 4) === 'WEBP') return 'image/webp';
  return null;
}

/* Mengembalikan { mime, data } atau null. */
export async function ambilSampul(pembaca) {
  if (!pembaca || !(pembaca.ukuran > 12)) return null;
  let hasil = null;
  try {
    const kepala = await pembaca.baca(0, 12);
    if (ascii(kepala, 0, 3) === 'ID3') hasil = await dariId3(pembaca);
    else if (ascii(kepala, 0, 4) === 'fLaC') hasil = await dariFlac(pembaca);
    else if (ascii(kepala, 4, 4) === 'ftyp') hasil = await dariMp4(pembaca);
  } catch (e) {
    return null;   /* berkas rusak: anggap tanpa sampul */
  }
  if (!hasil || !hasil.data || hasil.data.length === 0) return null;
  const mime = tebakMime(hasil.data) || hasil.mime;
  if (!mime || !mime.startsWith('image/')) return null;
  return { mime, data: hasil.data };
}

/* ── ID3v2 (MP3) ── */

function takSinkron(u) {
  const out = [];
  for (let i = 0; i < u.length; i++) {
    out.push(u[i]);
    if (u[i] === 0xff && u[i + 1] === 0x00) i++;
  }
  return Uint8Array.from(out);
}

function cariAkhirTeks(b, i, enc) {
  if (enc !== 1 && enc !== 2) {
    const z = b.indexOf(0, i);
    return z < 0 ? -1 : z + 1;
  }
  for (let k = i; k + 1 < b.length; k += 2) if (b[k] === 0 && b[k + 1] === 0) return k + 2;
  return -1;
}

function bacaApic(b, v2) {
  if (b.length < 5) return null;
  const enc = b[0];
  let i;
  let mime;
  if (v2) {
    const fmt = ascii(b, 1, 3).toUpperCase();
    mime = fmt === 'JPG' ? 'image/jpeg' : fmt === 'PNG' ? 'image/png' : '';
    i = 4;
  } else {
    const z = b.indexOf(0, 1);
    if (z < 0) return null;
    mime = ascii(b, 1, z - 1).toLowerCase();
    if (mime === '-->') return null;   /* URL, bukan gambar */
    i = z + 1;
  }
  const jenis = b[i];
  const akhir = cariAkhirTeks(b, i + 1, enc);
  if (akhir < 0) return null;
  return { mime, jenis, data: b.subarray(akhir) };
}

async function dariId3(p) {
  const h = await p.baca(0, 10);
  const major = h[3];
  const flags = h[5];
  if (major < 2 || major > 4) return null;
  const ukuranTag = Math.min(sinkron(h, 6), MAKS_TAG);
  let tag = await p.baca(10, ukuranTag);
  const v2 = major === 2;
  if (flags & 0x80) tag = takSinkron(tag);
  let off = 0;
  if (!v2 && (flags & 0x40)) {
    off = major === 4 ? sinkron(tag, 0) : 4 + u32(tag, 0);   /* lewati extended header */
  }
  const hdr = v2 ? 6 : 10;
  let pilihan = null;
  let pertama = null;
  while (off + hdr <= tag.length && tag[off] !== 0) {
    let id, fsize;
    if (v2) {
      id = ascii(tag, off, 3);
      fsize = (tag[off + 3] << 16) | (tag[off + 4] << 8) | tag[off + 5];
    } else {
      id = ascii(tag, off, 4);
      fsize = major === 4 ? sinkron(tag, off + 4) : u32(tag, off + 4);
    }
    if (fsize <= 0 || off + hdr + fsize > tag.length) break;
    if (id === 'APIC' || id === 'PIC') {
      const pic = bacaApic(tag.subarray(off + hdr, off + hdr + fsize), v2);
      if (pic) {
        if (pic.jenis === 3 && !pilihan) pilihan = pic;   /* 3 = sampul depan */
        if (!pertama) pertama = pic;
      }
    }
    off += hdr + fsize;
  }
  const p2 = pilihan || pertama;
  return p2 ? { mime: p2.mime, data: p2.data } : null;
}

/* ── MP4 / M4A (atom covr) ── */

/* Cari atom bertipe `tipe` di rentang [awal, akhir) dari buffer. */
function cariAtom(b, awal, akhir, tipe) {
  let pos = awal;
  while (pos + 8 <= akhir) {
    let size = u32(b, pos);
    const jenis = ascii(b, pos + 4, 4);
    let hdr = 8;
    if (size === 1) {
      if (pos + 16 > akhir) return null;
      size = u32(b, pos + 8) * 4294967296 + u32(b, pos + 12);
      hdr = 16;
    } else if (size === 0) {
      size = akhir - pos;
    }
    if (size < hdr || pos + size > akhir) return null;
    if (jenis === tipe) return { mulai: pos + hdr, akhir: pos + size };
    pos += size;
  }
  return null;
}

async function dariMp4(p) {
  /* Cari moov di tingkat atas (bisa di akhir berkas) tanpa memuat seluruh berkas. */
  let pos = 0;
  let moov = null;
  while (pos + 8 <= p.ukuran && !moov) {
    const h = await p.baca(pos, Math.min(16, p.ukuran - pos));
    let size = u32(h, 0);
    const jenis = ascii(h, 4, 4);
    let hdr = 8;
    if (size === 1) { size = u32(h, 8) * 4294967296 + u32(h, 12); hdr = 16; }
    else if (size === 0) size = p.ukuran - pos;
    if (size < hdr) return null;
    if (jenis === 'moov') moov = { mulai: pos + hdr, panjang: size - hdr };
    pos += size;
  }
  if (!moov || moov.panjang > MAKS_TAG) return null;
  const b = await p.baca(moov.mulai, moov.panjang);
  const udta = cariAtom(b, 0, b.length, 'udta');
  if (!udta) return null;
  const meta = cariAtom(b, udta.mulai, udta.akhir, 'meta');
  if (!meta) return null;
  const ilst = cariAtom(b, meta.mulai + 4, meta.akhir, 'ilst');   /* meta: 4 byte versi/flag */
  if (!ilst) return null;
  const covr = cariAtom(b, ilst.mulai, ilst.akhir, 'covr');
  if (!covr) return null;
  const data = cariAtom(b, covr.mulai, covr.akhir, 'data');
  if (!data || data.akhir - data.mulai < 8) return null;
  const jenis = u32(b, data.mulai);   /* 13 = JPEG, 14 = PNG */
  const mime = jenis === 13 ? 'image/jpeg' : jenis === 14 ? 'image/png' : '';
  return { mime, data: b.subarray(data.mulai + 8, data.akhir) };
}

/* ── FLAC ── */

function bacaFlacPic(b) {
  if (b.length < 32) return null;
  const jenis = u32(b, 0);
  const mlen = u32(b, 4);
  const mime = ascii(b, 8, mlen).toLowerCase();
  let i = 8 + mlen;
  i += 4 + u32(b, i);          /* deskripsi */
  i += 16;                     /* lebar, tinggi, kedalaman, jumlah warna */
  const plen = u32(b, i);
  i += 4;
  return { jenis, mime, data: b.subarray(i, i + plen) };
}

async function dariFlac(p) {
  let pos = 4;
  let pertama = null;
  while (pos + 4 <= p.ukuran) {
    const h = await p.baca(pos, 4);
    const terakhir = (h[0] & 0x80) !== 0;
    const tipe = h[0] & 0x7f;
    const len = (h[1] << 16) | (h[2] << 8) | h[3];
    if (tipe === 6 && len <= MAKS_TAG) {
      const pic = bacaFlacPic(await p.baca(pos + 4, len));
      if (pic) {
        if (pic.jenis === 3) return pic;
        if (!pertama) pertama = pic;
      }
    }
    if (terakhir) break;
    pos += 4 + len;
  }
  return pertama;
}
