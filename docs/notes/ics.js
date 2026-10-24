/* Kalender terbuka .ics (RFC 5545) — K8.

   Ekspor: setiap to-do yang belum selesai dan punya tenggat menjadi VEVENT.
   - tanpa jam  → acara seharian (VALUE=DATE);
   - dengan jam → acara 1 jam, waktu lokal mengambang (tanpa zona);
   - berulang   → RRULE (harian / mingguan / bulanan).
   Impor: membaca VEVENT, lalu tiap acara jadi satu to-do di catatan baru
   dengan tanggal dalam bentuk yyyy-mm-dd (dikenali mekanik tenggat Hara).
   Aturan berulang pada impor tidak diterjemahkan; hanya kejadian pertama.

   Murni: tidak menyentuh state. Penyimpanan ada di tugas.js. */

import { tenggatTodo } from './pengingat.js?v=20261025001200';

const pad = n => String(n).padStart(2, '0');
const tglIso = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const jamIso = d => `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const utcStamp = ms => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

/* Escape nilai teks sesuai RFC 5545 §3.3.11. */
export const escIcs = s => String(s)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/* Pembukaan lipatan: baris > 75 karakter dipotong dan dilanjutkan dengan spasi. */
export const lipatBaris = baris => {
  if (baris.length <= 75) return baris;
  const potong = [];
  let sisa = baris;
  potong.push(sisa.slice(0, 75)); sisa = sisa.slice(75);
  while (sisa.length) { potong.push(' ' + sisa.slice(0, 74)); sisa = sisa.slice(74); }
  return potong.join('\r\n');
};

const RRULE_HARI = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const aturanKeRrule = a => {
  if (!a) return null;
  if (a.jenis === 'harian') return 'FREQ=DAILY';
  if (a.jenis === 'mingguan') return `FREQ=WEEKLY;BYDAY=${RRULE_HARI[a.hari]}`;
  if (a.jenis === 'bulanan') return `FREQ=MONTHLY;BYMONTHDAY=${a.tgl}`;
  return null;
};

/* Prioritas Hara (! / !! / !!!) → PRIORITY iCalendar (1 = tertinggi). */
const PRIORITAS_ICS = { 3: 1, 2: 5, 1: 9 };

/* Membangun seluruh berkas .ics dari daftar catatan. Mengembalikan string. */
export function bangunIcs(notes, sekarang = Date.now()) {
  const stamp = utcStamp(sekarang);
  const baris = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hara//Tugas//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  (notes || []).forEach(n => {
    if (n.archived || n.deletedAt) return;
    tenggatTodo(n).forEach(x => {
      const mulai = new Date(x.waktu);
      const [jam, menit] = x.jam ? x.jam.split(':').map(Number) : [null, null];
      if (jam !== null) mulai.setHours(jam, menit, 0, 0);
      const ringkas = (x.sisa || polosTeks(x.blok.content) || 'To-do').trim();
      const rrule = aturanKeRrule(x.aturan);
      baris.push('BEGIN:VEVENT');
      baris.push(`UID:hara-${n.id}-${x.bid}@hara.local`);
      baris.push(`DTSTAMP:${stamp}`);
      if (jam === null) {
        const akhir = new Date(x.waktu); akhir.setDate(akhir.getDate() + 1);
        baris.push(`DTSTART;VALUE=DATE:${tglIso(mulai)}`);
        baris.push(`DTEND;VALUE=DATE:${tglIso(akhir)}`);
      } else {
        const akhir = new Date(mulai.getTime() + 3600000);
        baris.push(`DTSTART:${tglIso(mulai)}T${jamIso(mulai)}`);
        baris.push(`DTEND:${tglIso(akhir)}T${jamIso(akhir)}`);
      }
      if (rrule) baris.push(`RRULE:${rrule}`);
      baris.push(lipatBaris(`SUMMARY:${escIcs(ringkas)}`));
      baris.push(lipatBaris(`DESCRIPTION:${escIcs('Dari catatan: ' + (n.title || 'Tanpa judul'))}`));
      if (x.prioritas) baris.push(`PRIORITY:${PRIORITAS_ICS[x.prioritas]}`);
      baris.push('END:VEVENT');
    });
  });
  baris.push('END:VCALENDAR');
  return baris.join('\r\n') + '\r\n';
}

const polosTeks = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/* Membaca .ics → daftar acara { judul, tgl (Date lokal awal hari), jam|null }.
   Toleran: acara tanpa DTSTART dilewati; pelipatan baris dibuka. */
export function uraiIcs(teks) {
  const sorot = String(teks || '').replace(/\r?\n[ \t]/g, '');
  const acara = [];
  let ev = null;
  for (const raw of sorot.split(/\r?\n/)) {
    const l = raw.trim();
    if (l === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (l === 'END:VEVENT') { if (ev && ev.tgl) acara.push(ev); ev = null; continue; }
    if (!ev) continue;
    const titik = l.indexOf(':');
    if (titik < 0) continue;
    const nama = l.slice(0, titik).split(';')[0].toUpperCase();
    const nilai = l.slice(titik + 1);
    if (nama === 'SUMMARY') ev.judul = nilai.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
    else if (nama === 'DTSTART') {
      const m = nilai.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
      if (m) {
        ev.tgl = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
        ev.jam = m[4] ? `${m[4]}:${m[5]}` : null;
      }
    }
  }
  return acara.map(a => ({ judul: a.judul || 'Acara', tgl: a.tgl, jam: a.jam || null }));
}

/* Satu baris to-do Hara dari acara impor, dengan tanggal yang dikenali. */
export const barisTodoDariAcara = a => {
  const d = new Date(a.tgl);
  const tgl = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const judul = String(a.judul).replace(/\s+/g, ' ').trim();
  return a.jam ? `${tgl} jam ${a.jam} ${judul}` : `${tgl} ${judul}`;
};
