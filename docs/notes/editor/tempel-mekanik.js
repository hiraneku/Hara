/* Tempel dari LUAR aplikasi → mekanik Hara.

   Clipboard dari luar sering datang sebagai teks polos (salin dari
   WhatsApp, Notes, PDF, terminal) atau HTML yang sudah dibersihkan.
   Sebelum modul ini, teks polos selalu mendarat apa adanya sebagai
   paragraf: "1. a / 2. b / 3. c" tetap tulisan tangan yang tidak
   pernah ikut daftar bernomor, dan tautan yang disalin jadi teks mati.
   Sekarang isinya disulap jadi mekanik yang SUDAH ada di editor:

     1. a  /  1) a     → blok daftar bernomor (b-ol, nomornya otomatis)
     - a   /  * a      → blok daftar (b-li)
     - [ ] a / - [x] a → to-do (b-todo; yang [x] datang tercentang)
     # / ## / ###      → heading 1–3
     > a               → kutipan (b-quote)
     > [!info] a      → callout (data-cal + label)
     ---               → pembatas
     ``` … ```         → satu blok kode
     **a** *a* `a` ==a== ~~a~~ → format inline yang sama seperti diketik
     [[judul]] #tag    → wikilink & tag
     https://… www.… nama@email → tautan a.lk yang bisa dibuka
     [teks](https://…) dan <https://…> → tautan Hara juga

   Aturannya sengaja MENGIKUTI autoFormat() saat mengetik (editor/
   markdown.js) — paste memakai mekanik yang sama, bukan jalur kedua
   yang lama-lama berbeda perilaku.

   Fungsi di sini bekerja PER BARIS. Yang memutuskan di mana satu baris
   berakhir adalah paste.js: <br> dan elemen blok memotong baris di
   kedalaman mana pun, jadi "1. Halo" + <br> + "2. Dunia" tidak lagi
   menempel jadi satu baris. Indentasi awal diterjemahkan jadi
   padding 24px per langkah, sama dengan tombol indent.

   Yang sengaja TIDAK dilakukan:
   • tidak menyentuh paste di dalam blok kode (ditangani paste.js);
   • tidak membuat gambar/blob (jalur gambar punya penanganan sendiri);
   • markdown inline tidak diterapkan pada HTML yang sudah membawa
     strukturnya — hanya tautan telanjang yang ikut ditautkan.

   Semua teks di-escape lewat esc() dan tautan disaring tautanAman(),
   jadi clipboard berisi <script> atau javascript: tidak bisa lolos. */

import { esc } from '../../core/dom.js?v=20260918132648';

/* Karakter penutup kata tag — sama dengan TUTUP_CHAR di markdown.js. */
const TUTUP_TAG = new Set([' ', '\u00a0', '\t', ',', ';', ':', '!', '?',
  ')', ']', '}', '\u3001', '\u3002', '\uFF0C', '\uFF1A', '\uFF1B', '\uFF01', '\uFF1F']);
/* Nama tag: huruf/angka di depan (aturannya sama dengan tags.js). */
const NAMA_TAG = /^[\p{L}\p{N}][\p{L}\p{N}_\/.-]*$/u;

/* ── tautan ───────────────────────────────────────────────────────── */

/* Alamat yang boleh jadi href. Skema lain (javascript:, data:, …)
   dibuang; teksnya tetap tampil sebagai teks biasa. */
export function tautanAman(href) {
  const u = String(href == null ? '' : href).trim();
  if (!u) return '';
  return /^(https?:|mailto:|tel:)/i.test(u) ? u : '';
}

/* Alamat telanjang → href yang sah: www.x → https://www.x, surel →
   mailto:. Sama dengan rapikan() di menus/link.js. */
export function hrefDari(nilai) {
  const v = String(nilai == null ? '' : nilai);
  if (/^https?:/i.test(v)) return v;
  if (/^www\./i.test(v)) return 'https://' + v;
  if (/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(v)) return 'mailto:' + v;
  return v;
}

/* HTML tautan gaya Hara — satu bentuk untuk semua jalur tempel, sama
   persis dengan yang dibuat menus/link.js. */
export function htmlTautan(href, teks) {
  const t = String(teks == null || teks === '' ? href : teks);
  return `<a class="lk" href="${esc(href)}" target="_blank" rel="noopener">${esc(t)}</a>`;
}

/* Buang tanda baca yang menempel di ujung alamat ("lihat x.com." →
   tautannya "x.com"). Kurung/kurawal hanya dibuang bila tidak
   berpasangan — supaya alamat ber-kurung tetap utuh. */
export function potongTepi(alamat) {
  let s = String(alamat == null ? '' : alamat);
  const hitung = (t, c) => (t.split(c).length - 1);
  for (;;) {
    const akhir = s[s.length - 1];
    if (!akhir) break;
    if (/[.,;:!?]/.test(akhir)) { s = s.slice(0, -1); continue; }
    if ((akhir === ')' && hitung(s, '(') < hitung(s, ')')) ||
        (akhir === ']' && hitung(s, '[') < hitung(s, ']')) ||
        (akhir === '}' && hitung(s, '{') < hitung(s, '}'))) { s = s.slice(0, -1); continue; }
    break;
  }
  return s;
}

/* Alamat yang layak ditautkan otomatis: harus didahului awal baris,
   spasi, atau tanda baca — "lihathttps://x" bukan tautan. */
const batasKiri = ch => !ch || !/[\w@./-]/.test(ch);

/* ── inline ─────────────────────────────────────────────────────────
   Satu pola untuk semua bentuk. Urutan alternatif penting: tebal
   sebelum miring supaya "**a**" tidak dibaca "*…*", dan tautan sebelum
   tag supaya "#bagian" di dalam alamat tidak jadi tag. */
const POLA_INLINE =
  '\\*\\*(?!\\s)([^*\\n]*?[^\\s*])\\*\\*' +            /* 1  tebal */
  '|__(?!\\s)([^_\\n]*?[^\\s_])__' +                    /* 2  tebal __ */
  '|~~(?!\\s)([^~\\n]*?[^\\s~])~~' +                    /* 3  coret */
  '|==(?!\\s)([^=\\n]*?[^\\s=])==' +                    /* 4  sorot */
  '|`([^`\\n]+)`' +                                     /* 5  kode inline */
  '|\\[\\[([^\\]\\n]+)\\]\\]' +                         /* 6  wikilink */
  '|(https?:\\/\\/[^\\s<>"\'\\u0060]+)' +               /* 7  alamat */
  '|(www\\.[^\\s<>"\'\\u0060]+)' +                      /* 8  www. */
  '|([\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+)' +               /* 9  surel */
  '|(#\\p{L}[\\p{L}\\p{N}_\\/.-]*|#[\\p{N}][\\p{L}\\p{N}_\\/.-]*)' + /* 10 tag */
  '|(\\*[^*\\n]+?\\*)' +                               /* 11 miring */
  '|(\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\))' + /* 12 [teks](alamat) */
  '|(<(https?:\\/\\/[^\\s>]+)>)';                      /* 15 <alamat> */
const baruInline = () => new RegExp(POLA_INLINE, 'gu');

/* Teks polos satu baris → HTML dengan format mekanik Hara. */
export function inlineKeHtml(teks) {
  const s = String(teks == null ? '' : teks);
  const re = baruInline();
  let out = '', pos = 0, m;
  while ((m = re.exec(s)) !== null) {
    out += esc(s.slice(pos, m.index));
    pos = m.index + m[0].length;
    const sebelum = m.index > 0 ? s[m.index - 1] : '';
    const sesudah = s[pos] || '';

    if (m[1] !== undefined || m[2] !== undefined) {
      out += `<b>${inlineKeHtml(m[1] !== undefined ? m[1] : m[2])}</b>`;
    } else if (m[3] !== undefined) {
      out += `<s>${inlineKeHtml(m[3])}</s>`;
    } else if (m[4] !== undefined) {
      out += `<span class="hl">${inlineKeHtml(m[4])}</span>`;
    } else if (m[5] !== undefined) {
      out += `<code class="ic">${esc(m[5])}</code>`;
    } else if (m[6] !== undefined) {
      out += `<span class="wl">${esc('[[' + m[6] + ']]')}</span>`;
    } else if (m[7] !== undefined || m[8] !== undefined) {
      const mentah = m[7] !== undefined ? m[7] : m[8];
      if (!batasKiri(sebelum)) { out += esc(mentah); continue; }
      const bersih = potongTepi(mentah);
      out += htmlTautan(hrefDari(bersih), bersih) + esc(mentah.slice(bersih.length));
    } else if (m[9] !== undefined) {
      if (!batasKiri(sebelum)) { out += esc(m[9]); continue; }
      out += htmlTautan('mailto:' + m[9], m[9]);
    } else if (m[10] !== undefined) {
      const nama = m[10].slice(1);
      const layak = NAMA_TAG.test(nama) &&
        (!sebelum || /[\s(]/.test(sebelum)) &&
        (!sesudah || TUTUP_TAG.has(sesudah));
      out += layak ? `<span class="tg">${esc(m[10])}</span>` : esc(m[10]);
    } else if (m[11] !== undefined) {
      out += `<i>${inlineKeHtml(m[11].slice(1, -1))}</i>`;
    } else if (m[12] !== undefined) {
      /* [teks](alamat) — bentuk umum saat menyalin dari aplikasi
         markdown; hasilnya tautan Hara yang sama. */
      out += htmlTautan(m[14], m[13]);
    } else if (m[15] !== undefined) {
      out += htmlTautan(m[16], m[16]);
    }
  }
  out += esc(s.slice(pos));
  return out;
}

/* Teks polos di dalam HTML clipboard: escape + tautan otomatis.
   Markdown inline TIDAK diterapkan di sini (HTML sudah membawa
   strukturnya sendiri) — hanya alamat telanjang yang ditautkan. */
export function tautkanTeks(teks) {
  const s = String(teks == null ? '' : teks);
  const re = /(https?:\/\/[^\s<>"'\u0060]+)|(www\.[^\s<>"'\u0060]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/gu;
  let out = '', pos = 0, m;
  while ((m = re.exec(s)) !== null) {
    out += esc(s.slice(pos, m.index));
    pos = m.index + m[0].length;
    const sebelum = m.index > 0 ? s[m.index - 1] : '';
    if (!batasKiri(sebelum)) { out += esc(m[0]); continue; }
    const bersih = potongTepi(m[0]);
    out += htmlTautan(hrefDari(bersih), bersih) + esc(m[0].slice(bersih.length));
  }
  out += esc(s.slice(pos));
  return out;
}

/* ── per baris ─────────────────────────────────────────────────────── */

/* Padding bawaan jenis blok daftar (lihat styles/notes.css) — indentasi
   tempelan DITAMBAHKAN di atasnya, supaya butir bersarang tetap terlihat
   bersarang, bukan sama rata dengan induknya. */
const PAD_DAFTAR = { 'b-li': 22, 'b-ol': 30, 'b-todo': 29 };
const JENIS_CAL = { info: 'info', tip: 'tip', warn: 'warn', warning: 'warn',
  peringatan: 'warn', bahaya: 'danger', danger: 'danger' };
const LABEL_CAL = { info: 'Info', tip: 'Tip', warn: 'Peringatan', danger: 'Bahaya' };

/* Indentasi awal baris = kelipatan DUA spasi — satu tab dihitung dua
   spasi, dan &nbsp; dianggap spasi (clipboard HTML sering meng-indentasi
   dengan &nbsp;). Satu spasi di awal kalimat BUKAN indentasi: spasi itu
   tetap bagian teks, kalau tidak " lanjut" yang disalin akan kehilangan
   spasinya.

   Mengembalikan { level, isi, panjang }: `isi` = teks setelah indentasi
   yang dipakai; `panjang` = jumlah karakter AWAL teks asli yang terpakai
   sebagai indentasi (dihitung pada teks asli, sebelum tab/&nbsp;
   diterjemahkan) — dipakai paste.js untuk memotong HTML ber-markup. */
export function bagiIndent(mentah) {
  const t = String(mentah == null ? '' : mentah);
  const pisah = t.match(/^([ \t\u00a0]*)([\s\S]*)$/);
  const spasi = pisah[1].replace(/\t/g, '  ').replace(/\u00a0/g, ' ');
  const level = Math.min(6, Math.floor(spasi.length / 2));
  const pakai = level * 2;
  let panjang = 0, hitung = 0;
  while (panjang < pisah[1].length && hitung < pakai) {
    hitung += pisah[1][panjang] === '\t' ? 2 : 1;
    panjang++;
  }
  return { level, isi: spasi.slice(pakai) + pisah[2], panjang };
}

/* Padding indentasi sebuah jenis blok: padding bawaan jenisnya (lihat
   styles/notes.css) DITAMBAH 24px per langkah indentasi — sama dengan
   tombol indent. Dipakai barisMekanik() dan paste.js. */
export function padUntuk(cls, level) {
  if (!level) return 0;
  return (cls === 'b-div' ? 0 : (PAD_DAFTAR[cls] || 0)) + 24 * level;
}

/* Penanda awal baris → { cls, sisa, panjang, attr?, dicek? }, null kalau
   baris ini teks biasa. Dipakai barisMekanik() DAN paste.js: penanda
   yang ikut ter-format di clipboard — mis. nomornya dicetak tebal,
   "**1.** a" — tetap diakui sebagai daftar, bukan tinggal jadi tulisan
   tangan yang tidak pernah ikut nomor otomatis.

   Satu spasi sisa dari indentasi ganjil dimaafkan di depan penanda. */
export function polaBaris(isi) {
  const t = String(isi == null ? '' : isi);

  /* callout: > [!info] … */
  const cal = t.match(/^[ ]?>\s*\[!(info|tip|warn|warning|danger|bahaya|peringatan)\]\s*([\s\S]*)$/i);
  if (cal) {
    const jenis = JENIS_CAL[cal[1].toLowerCase()];
    return { cls: 'b-cal', sisa: cal[2].trim(), panjang: t.length - cal[2].length,
      attr: { 'data-cal': jenis, 'data-cal-label': LABEL_CAL[jenis] } };
  }
  /* kutipan */
  const kutip = t.match(/^[ ]?>\s+([\s\S]*)$/);
  if (kutip) return { cls: 'b-quote', sisa: kutip[1], panjang: t.length - kutip[1].length };

  /* heading */
  const h = t.match(/^[ ]?(#{1,3})\s+([\s\S]*)$/);
  if (h) return { cls: 'b-h' + h[1].length, sisa: h[2], panjang: t.length - h[2].length };

  /* to-do: - [ ] / - [x] */
  const todo = t.match(/^[ ]?[-*+]\s+\[([ xX]?)\]\s*([\s\S]*)$/);
  if (todo) return { cls: 'b-todo', sisa: todo[2], panjang: t.length - todo[2].length,
    dicek: /[xX]/.test(todo[1]) };

  /* daftar bernomor: 1. / 1)  */
  const ol = t.match(/^[ ]?\d+[.)]\s+([\s\S]*)$/);
  if (ol) return { cls: 'b-ol', sisa: ol[1], panjang: t.length - ol[1].length };

  /* daftar butir: - / * / + */
  const ul = t.match(/^[ ]?[-*+]\s+([\s\S]*)$/);
  if (ul) return { cls: 'b-li', sisa: ul[1], panjang: t.length - ul[1].length };

  /* pembatas */
  if (/^[ ]?-{3,}\s*$/.test(t)) return { cls: 'b-div', sisa: '', panjang: t.length };

  return null;
}

/* Satu baris teks polos → { cls, html, pad?, attr?, dicek? }.
   Tidak ada pola yang cocok → paragraf biasa (perilaku lama). */
export function barisMekanik(mentah) {
  const { level, isi } = bagiIndent(mentah);
  const buat = (cls, teks, tambahan = {}) => {
    const b = { cls, html: inlineKeHtml(teks) };
    if (level > 0) b.pad = padUntuk(cls, level);
    return Object.assign(b, tambahan);
  };

  const p = polaBaris(isi);
  if (!p) return buat('b-p', isi);
  if (p.cls === 'b-div')
    return Object.assign({ cls: 'b-div', html: '' }, level > 0 ? { pad: padUntuk('b-div', level) } : {});
  const tambahan = {};
  if (p.attr) tambahan.attr = p.attr;
  if (p.cls === 'b-todo') tambahan.dicek = !!p.dicek;
  /* `asli` = baris UTUH termasuk penandanya ("1. a"). Dipakai paste.js
     saat baris tunggal disisipkan di tengah kalimat yang sudah ada:
     penandanya tidak boleh hilang begitu saja. */
  tambahan.asli = inlineKeHtml(mentah);
  return buat(p.cls, p.sisa, tambahan);
}

/* Teks polos banyak baris → daftar baris siap sisip. Pagar kode
   (``` … ```) menjadi SATU blok kode utuh; kalau pagar penutupnya tidak
   ada, barisnya diperlakukan biasa supaya tidak ada isi yang hilang. */
export function teksKeBaris(teks) {
  const garis = String(teks == null ? '' : teks).replace(/\r\n?/g, '\n').split('\n');
  const baris = [];
  for (let i = 0; i < garis.length; i++) {
    if (/^\s*```\s*$/.test(garis[i])) {
      let j = i + 1;
      const isi = [];
      while (j < garis.length && !/^\s*```\s*$/.test(garis[j])) { isi.push(garis[j]); j++; }
      if (j < garis.length) {          /* ada pagar penutup */
        baris.push({ cls: 'b-code', html: esc(isi.join('\n')) });
        i = j;
        continue;
      }
    }
    baris.push(barisMekanik(garis[i]));
  }
  return baris;
}
