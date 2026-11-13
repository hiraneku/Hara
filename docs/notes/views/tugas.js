/* Layar Tugas & Reminder (Bagian B9) + matriks prioritas (K7),
   kalender bulanan (K9), dan kalender .ics (K8).

   Semua tenggat hidup di dalam isi catatan (lihat pengingat.js), sehingga
   layar ini tidak pernah bisa berbeda dari catatan aslinya. Matriks dan
   kalender hanya membaca; ekspor/impor ICS memakai ics.js. */

import { state, save } from '../../core/store.js?v=20261105210000';
import { kejadianAcaraPadaTanggal, labelWaktuAcara, normalisasiAcara, timestampDariDinding } from '../kalender-acara-murni.js?v=20261113230700';
import { benturanJadwal, normalisasiBlokJadwal, ringkasanPekan, tafsirAcaraCepat } from '../kalender-produktivitas-murni.js?v=20261113230400';
import { esc } from '../../core/dom.js?v=20261105210000';
import { tugasMendatang, tenggatHariIni, tenggatTodo, sisaWaktu, chipTenggat, jadwalUlang, ulangSetelahCentang, uraiTugas } from '../pengingat.js?v=20261105210000';
import { kuadranTugas, jatuhPada } from '../kalender.js?v=20261105210000';
import { bangunIcs, uraiIcs, barisTodoDariAcara } from '../ics.js?v=20261105210000';
import { rowFor } from './row.js?v=20261105210000';
import { terlihat } from '../kunci.js?v=20261105210000';
import { t as tr, bahasaSekarang } from '../../core/i18n.js?v=20261105210000';
import { hariBerjurnal } from '../jurnal-tanggal.js?v=20261105210000';
import { toast } from '../../core/toast.js?v=20261105210000';
import { touch, makeNote } from '../note-model.js?v=20261105210000';
import { go, cur } from '../../core/router.js?v=20261105210000';
import { flush } from '../../core/autosave.js?v=20261105210000';
import { openNote } from '../model.js?v=20261105210000';

const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt && terlihat(n));
const awalHari = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* Keadaan tampilan kalender (bukan data): bulan yang dilihat & hari dipilih. */
const sekarangAwal = () => awalHari(Date.now());
let kalPilih = sekarangAwal();
const PREF_KALENDER_KUNCI = 'hara.kalender.tampilan.v1';
const prefKalDefault = { mode: 'bulan', awalMinggu: 1, nomorMinggu: false, kepadatan: 'ringkas' };
const bacaPrefKal = () => {
  try {
    const v=JSON.parse(localStorage.getItem(PREF_KALENDER_KUNCI)||'{}');
    return { mode:['bulan','agenda','hari','minggu','tahun'].includes(v.mode)?v.mode:'bulan',
      awalMinggu:v.awalMinggu===0?0:1, nomorMinggu:!!v.nomorMinggu,
      kepadatan:v.kepadatan==='nyaman'?'nyaman':'ringkas' };
  } catch { return { ...prefKalDefault }; }
};
let prefKal = bacaPrefKal();
let kueriKalender = '';
let filterKalender = 'semua';
let kategoriKalender = 'semua';
let acaraEditId = '';
const LAPISAN_KUNCI = 'hara.kalender.lapisan.v1';
const lapisanDefault = { tenggat: true, acara: true, jurnal: true, blok: true };
const bacaLapisan = () => {
  try { return { ...lapisanDefault, ...JSON.parse(localStorage.getItem(LAPISAN_KUNCI) || '{}') }; }
  catch { return { ...lapisanDefault }; }
};
let lapisan = bacaLapisan();
const isoHari = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const zonaLokal = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function ubahLapisanKalender(kunci, aktif) {
  if (!Object.hasOwn(lapisanDefault, kunci)) return;
  lapisan[kunci] = !!aktif;
  try { localStorage.setItem(LAPISAN_KUNCI, JSON.stringify(lapisan)); } catch { /* preferensi sesi tetap berlaku */ }
  if (cur === 'task') go('task');
}

export function ubahTampilanKalender(kunci, nilai) {
  if (kunci === 'mode' && ['bulan','agenda','hari','minggu','tahun'].includes(nilai)) prefKal.mode = nilai;
  else if (kunci === 'awalMinggu' && ['0','1'].includes(String(nilai))) prefKal.awalMinggu = Number(nilai);
  else if (kunci === 'nomorMinggu') prefKal.nomorMinggu = !!nilai;
  else if (kunci === 'kepadatan' && ['ringkas','nyaman'].includes(nilai)) prefKal.kepadatan = nilai;
  else if (kunci === 'filter') filterKalender = ['semua','acara','tenggat','blok'].includes(nilai) ? nilai : 'semua';
  else if (kunci === 'kategori') kategoriKalender = ['semua','personal','work','study','other'].includes(nilai) ? nilai : 'semua';
  else return;
  try { localStorage.setItem(PREF_KALENDER_KUNCI, JSON.stringify(prefKal)); } catch { /* pengaturan sesi tetap berlaku */ }
  if (cur === 'task') go('task');
}

export function cariKalender(teks) {
  kueriKalender = String(teks || '').trim().slice(0, 100);
  if (cur === 'task') go('task');
}

export function bukaEditAcara(id) {
  acaraEditId = id || '';
  if (cur === 'task') go('task');
};

export function pindahAcaraKalender(id, targetMs) {
  const index=state.acaraKalender.findIndex(a=>a.id===id), asal=state.acaraKalender[index];
  if(!asal||!Number.isFinite(Number(targetMs)))return false;
  const target=isoHari(Number(targetMs)), awal=asal.sepanjangHari?asal.tanggalMulai:bagianZona(asal.mulai,asal.zonaWaktu).tanggal;
  const dateMs=iso=>{const [y,m,d]=iso.split('-').map(Number);return Date.UTC(y,m-1,d);};
  const selisih=Math.round((dateMs(target)-dateMs(awal))/86400000);if(!selisih)return false;
  const geserIso=iso=>{const d=new Date(dateMs(iso));d.setUTCDate(d.getUTCDate()+selisih);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;};
  const baru={...asal};
  if(asal.sepanjangHari){baru.tanggalMulai=geserIso(asal.tanggalMulai);baru.tanggalAkhir=geserIso(asal.tanggalAkhir);}
  else{
    const a=bagianZona(asal.mulai,asal.zonaWaktu),b=bagianZona(asal.selesai,asal.zonaWaktu);
    baru.mulai=timestampDariDinding(geserIso(a.tanggal),a.jam,asal.zonaWaktu);
    baru.selesai=timestampDariDinding(geserIso(b.tanggal),b.jam,asal.zonaWaktu);
    if(baru.mulai===null||baru.selesai===null)return toast(tr('Waktu acara tidak valid pada tanggal tujuan'));
  }
  if(!window.confirm(`${tr('Pindahkan acara')} “${asal.judul}” ke ${judulTanggal(Number(targetMs),{day:'numeric',month:'long',year:'numeric'})}?`))return false;
  baru.diubah=Date.now();state.acaraKalender[index]=baru;save();if(cur==='task')go('task');
  toast(tr('Acara dipindahkan'),{label:tr('Urungkan'),cb:()=>{state.acaraKalender[index]=asal;save();if(cur==='task')go('task');}});
  return true;
}

export function kecualikanKejadianKalender(id,tanggal) {
  const i=state.acaraKalender.findIndex(a=>a.id===id),asal=state.acaraKalender[i];
  if(!asal?.pengulangan||!/^\d{4}-\d{2}-\d{2}$/.test(String(tanggal)))return false;
  const daftar=[...(asal.pengulangan.kecuali||[])];if(daftar.includes(tanggal))return false;
  if(!window.confirm(`${tr('Lewati kejadian ini')} “${asal.judul}” pada ${tanggal}?`))return false;
  state.acaraKalender[i]={...asal,pengulangan:{...asal.pengulangan,kecuali:[...daftar,tanggal]}};save();if(cur==='task')go('task');
  toast(tr('Kejadian dilewati'),{label:tr('Urungkan'),cb:()=>{state.acaraKalender[i]=asal;save();if(cur==='task')go('task');}});return true;
}

export function hapusAcaraKalender(id) {
  const index = state.acaraKalender.findIndex(a => a.id === id);
  if (index < 0) return;
  const [dihapus] = state.acaraKalender.splice(index, 1);
  save(); acaraEditId = '';
  if (cur === 'task') go('task');
  toast(tr('Acara dihapus'), { label: tr('Urungkan'), cb: () => {
    if (!state.acaraKalender.some(a => a.id === dihapus.id)) {
      state.acaraKalender.splice(Math.min(index, state.acaraKalender.length), 0, dihapus);
      save(); if (cur === 'task') go('task');
    }
  } });
}

export function isiPratinjauAcaraCepat(container) {
  const teks=container?.querySelector('[data-kal-cepat-teks]')?.value||'';
  const hasil=tafsirAcaraCepat(teks,zonaLokal());
  const preview=container?.querySelector('[data-kal-cepat-hasil]');
  if(!preview)return false;
  if(!hasil){preview.textContent=tr('Tanggal atau waktu tidak dikenali. Perbaiki teks atau isi formulir secara manual.');preview.hidden=false;return false;}
  const form=container.querySelector('[data-kal-acara-form]');
  if(!form)return false;
  const set=(nama,nilai)=>{const el=form.elements.namedItem(nama);if(el)el.value=nilai??'';};
  set('judul',hasil.judul);set('zonaWaktu',hasil.zonaWaktu);set('tanggalMulai',hasil.tanggalMulai);set('tanggalAkhir',hasil.tanggalMulai);
  const sepanjang=form.elements.namedItem('sepanjangHari');
  sepanjang.checked=hasil.sepanjangHari;
  form.querySelector('.kal-waktu').hidden=hasil.sepanjangHari;
  form.querySelectorAll('.kal-waktu input').forEach(x=>{x.required=!hasil.sepanjangHari;});
  const j=hasil.jamMulai;
  if(j){const [h,m]=j.split(':').map(Number),total=h*60+m+hasil.durasiMenit,end=`${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`,d=new Date(`${hasil.tanggalMulai}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+Math.floor(total/1440));const endDate=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;set('jamMulai',j);set('jamAkhir',end);set('tanggalAkhir',endDate);}
  const ulang=hasil.pengulangan;
  set('frekuensiUlang',ulang?.frekuensi||'');
  for(const cb of form.querySelectorAll('[name=hariUlang]'))cb.checked=!!ulang?.hari?.includes(Number(cb.value));
  set('sampaiUlang',ulang?.sampai||'');
  const ulangan=ulang?` · ${tr(ulang.frekuensi==='harian'?'Setiap hari':ulang.frekuensi==='mingguan'?'Setiap minggu':'Setiap bulan')}`:'';
  preview.textContent=`${tr('Pratinjau')}: ${hasil.judul} · ${hasil.tanggalMulai}${j?` ${j}`:` · ${tr('Sepanjang hari')}`}${ulangan}. ${tr('Periksa atau ubah detail, lalu simpan untuk mengonfirmasi.')}`;
  preview.hidden=false;
  return true;
}

export function terapkanTemplatAcara(container) {
  const id=container?.querySelector('[data-kal-templat-pilihan]')?.value;
  const map=new Map([
    ['rapat',{judul:'Rapat',kategori:'work',mulai:'09:00',selesai:'10:00'}],
    ['kelas',{judul:'Kelas',kategori:'study',mulai:'09:00',selesai:'10:30'}],
    ['olahraga',{judul:'Olahraga',kategori:'personal',mulai:'07:00',selesai:'08:00'}],
    ['belajar',{judul:'Sesi belajar',kategori:'study',mulai:'19:00',selesai:'19:45'}],
  ]);
  const t=map.get(id),form=container?.querySelector('[data-kal-acara-form]');if(!t||!form)return false;
  form.elements.namedItem('judul').value=tr(t.judul);form.elements.namedItem('kategori').value=t.kategori;
  form.elements.namedItem('jamMulai').value=t.mulai;form.elements.namedItem('jamAkhir').value=t.selesai;
  const allDay=form.elements.namedItem('sepanjangHari');allDay.checked=false;
  const waktu=form.querySelector('.kal-waktu');waktu.hidden=false;waktu.querySelectorAll('input[type=time]').forEach(x=>x.required=true);
  const preview=container.querySelector('[data-kal-cepat-hasil]');
  if(preview){preview.textContent=`${tr('Pratinjau')}: ${tr(t.judul)} · ${form.elements.namedItem('tanggalMulai').value} ${t.mulai}–${t.selesai}. ${tr('Periksa atau ubah detail, lalu simpan untuk mengonfirmasi.')}`;preview.hidden=false;}
  return true;
}

export function simpanAcaraKalender(form) {
  const data = new FormData(form), sepanjangHari = data.get('sepanjangHari') === 'on';
  const zonaWaktu = String(data.get('zonaWaktu') || zonaLokal());
  const frekuensi=data.get('frekuensiUlang'),sampai=data.get('sampaiUlang');
  if(frekuensi&&sampai&&sampai<String(data.get('tanggalMulai')||'')){toast(tr('Tanggal akhir pengulangan harus sama atau setelah tanggal mulai'));return false;}
  const input = {
    id: acaraEditId || undefined, judul: data.get('judul'), kategori: data.get('kategori'),
    sepanjangHari, zonaWaktu,
    persiapanMenit:Number(data.get('persiapanMenit'))||0,perjalananMenit:Number(data.get('perjalananMenit'))||0,
    ...(frekuensi?{pengulangan:{frekuensi,interval:1,hari:data.getAll('hariUlang').map(Number),sampai:sampai||null}}:{}),
  };
  if (sepanjangHari) {
    input.tanggalMulai = data.get('tanggalMulai');
    input.tanggalAkhir = data.get('tanggalAkhir') || input.tanggalMulai;
  } else {
    input.mulai = timestampDariDinding(data.get('tanggalMulai'), data.get('jamMulai'), zonaWaktu);
    input.selesai = timestampDariDinding(data.get('tanggalAkhir') || data.get('tanggalMulai'), data.get('jamAkhir'), zonaWaktu);
  }
  const valid = normalisasiAcara(input);
  if (!valid) { toast(tr('Periksa judul, tanggal, zona waktu, dan rentang acara')); return false; }
  if (acaraEditId) {
    const i = state.acaraKalender.findIndex(a => a.id === acaraEditId);
    if (i >= 0) state.acaraKalender[i] = { ...valid, dibuat: state.acaraKalender[i].dibuat, diubah: Date.now() };
    else state.acaraKalender.push(valid);
  } else state.acaraKalender.push(valid);
  state.acaraKalender.sort((a, b) => a.sepanjangHari ? (b.sepanjangHari ? a.tanggalMulai.localeCompare(b.tanggalMulai) : -1) : b.sepanjangHari ? 1 : a.mulai - b.mulai);
  acaraEditId = '';
  save(); toast(tr('Acara disimpan'));
  if (cur === 'task') go('task');
  return true;
}

/* ── kartu tenggat ── */

/* K4·K6: tunda / jadwal ulang langsung dari kartu (sekali-jalan saja). */
const PILIHAN_TUNDA = [['hari', 'Hari ini'], ['besok', 'Besok'], ['minggu depan', 'Minggu depan']];

const kartuTenggat = (x, penanda) => {
  const bisaTunda = !x.berulang && jadwalUlang(x.blok.content, 'besok') !== null;
  const sudahSelesai = !!(x.blok.meta && x.blok.meta.checked);
  return `<div class="tdg-item">
  <div class="tdg-main-row">
    <button type="button" class="tobox-btn${sudahSelesai ? ' on' : ''}"
      data-todo-cek="${esc(x.n.id)}" data-todo-bid="${esc(x.bid)}"
      aria-label="${sudahSelesai ? tr('Tandai belum selesai') : tr('Tandai selesai')}">
      <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>
    </button>
    <button class="row" data-todo-lompat="${x.n.id}" data-todo-bid="${x.bid}"
      title="${tr('Buka di catatan')} «${esc(x.n.title || tr('Tanpa judul'))}»">
      <div class="row-b">
        <div class="row-t" style="display:flex;align-items:center;gap:8px;min-width:0">
          <span class="tdg-chip">${x.prioritas ? '<b class="tdg-prio" aria-label="' + tr('prioritas') + '">' + '!'.repeat(x.prioritas) + '</b> ' : ''}${x.berulang ? '↻ ' : ''}${esc(chipTenggat(x))}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${sudahSelesai ? 'text-decoration:line-through;opacity:.65' : ''}">${esc(
            x.sisa || (x.blok.content || '').replace(/<[^>]*>/g, ' ').trim()
              || tr('Tanpa isi'))}</span></div>
        <div class="row-s">${esc(x.n.title || tr('Tanpa judul'))} · ${esc(penanda)}</div>
      </div>
    </button>
  </div>
  ${bisaTunda ? `<div class="tdg-tunda" role="group" aria-label="${tr('Jadwal ulang')}">
    ${PILIHAN_TUNDA.map(([kode, label]) => `<button class="tdg-btn" type="button"
      data-tunda="${esc(kode)}" data-note="${esc(x.n.id)}" data-bid="${esc(x.bid)}">${tr(label)}</button>`).join('')}
  </div>` : ''}
</div>`;
};

/**
 * Centang / batalkan centang to-do langsung dari daftar (Catatan / Tugas / Reminder)
 * tanpa perlu membuka editor catatan. Mendukung tugas berulang & Urungkan.
 */
export function toggleTodoDariDaftar(noteId, bid) {
  const n = state.notes.find(x => x.id === noteId);
  const b = n && (n.blocks || []).find(x => x.id === bid && x.type === 'todo');
  if (!n || !b) return false;
  const sblm = JSON.parse(JSON.stringify(b.meta || {}));
  b.meta = { ...(b.meta || {}) };
  const akanCentang = !b.meta.checked;

  if (akanCentang) {
    const nx = ulangSetelahCentang(b.content || '', Number(b.meta.ulangKe) || 0);
    if (nx) {
      b.meta.ulangKe = nx;
      b.meta.checked = false;
      delete b.meta.done;
      touch(n);
      save();
      if (cur === 'notes' || cur === 'task' || cur === 'rem') go(cur);
      toast(tr('Berulang · berikutnya') + ' ' + new Date(nx).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
      return true;
    }
    b.meta.checked = true;
    b.meta.done = Date.now();
  } else {
    b.meta.checked = false;
    delete b.meta.done;
  }

  touch(n);
  save();
  if (cur === 'notes' || cur === 'task' || cur === 'rem') go(cur);
  toast(akanCentang ? tr('Tugas selesai') : tr('Dikembalikan ke belum selesai'), {
    label: tr('Urungkan'),
    fn: () => {
      b.meta = sblm;
      touch(n);
      save();
      if (cur === 'notes' || cur === 'task' || cur === 'rem') go(cur);
    },
  });
  return true;
}

/* Menjadwalkan ulang satu to-do. Model diubah lalu disimpan; layar
   Tugas/Reminder digambar ulang supaya daftarnya langsung benar. */
export function tundaTodo(noteId, bid, pilihan) {
  const n = state.notes.find(x => x.id === noteId);
  const b = n && (n.blocks || []).find(x => x.id === bid);
  if (!b) return toast(tr('To-do tidak ditemukan'));
  const baru = jadwalUlang(b.content, pilihan);
  if (baru === null) return toast(tr('Tidak bisa dijadwal ulang'));
  b.content = baru;
  touch(n);
  save();
  toast(tr('Dijadwal ulang'));
  if (cur === 'task' || cur === 'rem') go(cur);
}

/* ── K7 · matriks prioritas ── */
const KUADRAN = [
  ['kerjakan', 'Kerjakan sekarang', 'mendesak & penting'],
  ['jadwalkan', 'Jadwalkan', 'penting, belum mendesak'],
  ['cepat', 'Selesaikan cepat', 'mendesak, tidak terlalu penting'],
  ['nanti', 'Nanti', 'belum mendesak, tidak penting'],
];

const matriksHtml = daftar => {
  const q = kuadranTugas(tugasMendatang(daftar));
  const total = KUADRAN.reduce((s, [k]) => s + q[k].length, 0);
  if (!total) return '';
  const sel = (items) => items.length
    ? items.slice(0, 6).map(x => `<button class="mtx-i" type="button" data-todo-lompat="${x.n.id}" data-todo-bid="${x.bid}"
        title="${esc(x.n.title || tr('Tanpa judul'))}">${esc(x.sisa || tr('Tanpa isi'))}</button>`).join('')
      + (items.length > 6 ? `<span class="mtx-lagi">+${items.length - 6}</span>` : '')
    : `<span class="mtx-kosong">—</span>`;
  return `<div class="sec" style="margin-top:22px"><h2>${tr('Matriks prioritas')}</h2></div>
    <div class="mtx">${KUADRAN.map(([k, judul, ket]) => `
      <section class="mtx-q mtx-${k}" aria-label="${esc(tr(judul))}">
        <header><b>${esc(tr(judul))}</b><small>${esc(tr(ket))}</small></header>
        <div class="mtx-isi">${sel(q[k])}</div>
      </section>`).join('')}</div>`;
};

const bagianZona = (ms, zona) => {
  const p = new Intl.DateTimeFormat('en', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const v = Object.fromEntries(p.map(x => [x.type, x.value]));
  return { tanggal: `${v.year}-${v.month}-${v.day}`, jam: `${v.hour}:${v.minute}` };
};
const formAcaraHtml = () => {
  const acara = state.acaraKalender.find(a => a.id === acaraEditId);
  const zona = acara?.zonaWaktu || zonaLokal();
  const awal = acara?.sepanjangHari ? { tanggal: acara.tanggalMulai, jam: '09:00' } : acara ? bagianZona(acara.mulai, zona) : { tanggal: isoHari(kalPilih), jam: '09:00' };
  const akhir = acara?.sepanjangHari ? { tanggal: acara.tanggalAkhir, jam: '10:00' } : acara ? bagianZona(acara.selesai, zona) : { tanggal: isoHari(kalPilih), jam: '10:00' };
  const zonaPilihan = [...new Set([zona, 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'])];
  const rule=acara?.pengulangan||{},hariUlang=rule.hari||[];
  return `<details class="kal-form-detail" ${acara ? 'open' : ''}><summary>${acara ? tr('Edit acara') : tr('Tambah acara')}</summary>
    ${!acara?`<div class="kal-templat"><label>${tr('Templat acara')}<select data-kal-templat-pilihan><option value="">${tr('Pilih templat')}</option>${[['rapat','Rapat'],['kelas','Kelas'],['olahraga','Olahraga'],['belajar','Belajar']].map(([v,l])=>`<option value="${v}">${tr(l)}</option>`).join('')}</select></label><button type="button" class="btn" data-kal-templat>${tr('Gunakan templat')}</button></div>
    <div class="kal-cepat"><label>${tr('Tambah cepat')}<input type="text" maxlength="500" data-kal-cepat-teks placeholder="${tr('Contoh: Rapat tim Jumat jam 10')}"></label><button type="button" class="btn" data-kal-cepat-tafsir>${tr('Pratinjau')}</button><p class="kal-cepat-hasil" data-kal-cepat-hasil aria-live="polite" hidden></p></div>`:''}
    <form class="kal-acara-form" data-kal-acara-form>
      <label>${tr('Judul')}<input name="judul" maxlength="240" required value="${esc(acara?.judul || '')}" placeholder="${tr('Nama acara')}"></label>
      <div class="kal-form-grid">
        <label>${tr('Mulai')}<input type="date" name="tanggalMulai" required value="${awal.tanggal}"></label>
        <label>${tr('Sampai')}<input type="date" name="tanggalAkhir" required value="${akhir.tanggal}"></label>
      </div>
      <div class="kal-form-grid kal-waktu" ${acara?.sepanjangHari ? 'hidden' : ''}>
        <label>${tr('Jam mulai')}<input type="time" name="jamMulai" value="${awal.jam}" ${acara?.sepanjangHari ? '' : 'required'}></label>
        <label>${tr('Jam selesai')}<input type="time" name="jamAkhir" value="${akhir.jam}" ${acara?.sepanjangHari ? '' : 'required'}></label>
        <label>${tr('Persiapan (menit)')}<input type="number" name="persiapanMenit" min="0" max="1440" step="5" value="${Number(acara?.persiapanMenit)||0}"></label>
        <label>${tr('Perjalanan (menit)')}<input type="number" name="perjalananMenit" min="0" max="1440" step="5" value="${Number(acara?.perjalananMenit)||0}"></label>
      </div>
      <label class="kal-centang"><input type="checkbox" name="sepanjangHari" data-kal-sepanjang ${acara?.sepanjangHari ? 'checked' : ''}> ${tr('Sepanjang hari')}</label>
      <div class="kal-form-grid">
        <label>${tr('Kategori')}<select name="kategori">
          ${[['personal','Pribadi'],['work','Kerja'],['study','Belajar'],['other','Lainnya']].map(([v,l]) => `<option value="${v}" ${(acara?.kategori || 'personal') === v ? 'selected' : ''}>${tr(l)}</option>`).join('')}
        </select></label>
        <label>${tr('Zona waktu')}<select name="zonaWaktu">${zonaPilihan.map(z => `<option value="${esc(z)}" ${z === zona ? 'selected' : ''}>${esc(z)}${z === zonaLokal() ? ` · ${tr('lokal')}` : ''}</option>`).join('')}</select></label>
      </div>
      <fieldset class="kal-ulang"><legend>${tr('Pengulangan')}</legend>
        <label>${tr('Frekuensi')}<select name="frekuensiUlang"><option value="">${tr('Tidak berulang')}</option><option value="harian" ${rule.frekuensi==='harian'?'selected':''}>${tr('Setiap hari')}</option><option value="mingguan" ${rule.frekuensi==='mingguan'?'selected':''}>${tr('Setiap minggu')}</option><option value="bulanan" ${rule.frekuensi==='bulanan'?'selected':''}>${tr('Setiap bulan')}</option></select></label>
        <label>${tr('Berulang sampai')}<input type="date" name="sampaiUlang" value="${esc(rule.sampai||'')}"></label>
        <div class="kal-ulangan-hari" role="group" aria-label="${tr('Hari dalam minggu')}">${[['1','Sen'],['2','Sel'],['3','Rab'],['4','Kam'],['5','Jum'],['6','Sab'],['0','Min']].map(([v,l])=>`<label><input type="checkbox" name="hariUlang" value="${v}" ${hariUlang.includes(Number(v))?'checked':''}>${tr(l)}</label>`).join('')}</div>
      </fieldset>
      <p class="kal-form-hint">${tr('Jam ditafsirkan pada zona waktu yang dipilih. Tanggal acara sepanjang hari tidak bergeser antar-zona.')}</p>
      <div class="kal-form-aksi"><button class="btn btn-pri" type="submit">${acara ? tr('Simpan perubahan') : tr('Simpan acara')}</button>${acara ? `<button class="btn" type="button" data-kal-batal-edit>${tr('Batal')}</button>` : ''}</div>
    </form></details>`;
};
const kartuAcara = acara => `<div class="kal-acara kal-acara-${esc(acara.kategori)}" ${acara.adalahKejadianUlang?'':`draggable="true" data-kal-seret="${esc(acara.id)}"`} title="${tr(acara.adalahKejadianUlang?'Kejadian berulang dikelola lewat aksi rangkaian atau pengecualian':'Seret acara ke tanggal lain untuk memindahkannya')}">
  <div class="kal-acara-teks"><b>${esc(acara.judul)}</b><span>${esc(labelWaktuAcara(acara, bahasaSekarang()))} · ${tr(acara.kategori === 'work' ? 'Kerja' : acara.kategori === 'study' ? 'Belajar' : acara.kategori === 'personal' ? 'Pribadi' : 'Lainnya')}${acara.adalahKejadianUlang?` · ${tr('Pengulangan')}`:''}</span></div>
  <div class="kal-acara-aksi"><button type="button" class="kal-acara-btn" data-kal-edit="${esc(acara.id)}">${tr(acara.adalahKejadianUlang?'Edit rangkaian':'Edit')}</button>${acara.adalahKejadianUlang?`<button type="button" class="kal-acara-btn" data-kal-kecualikan="${esc(acara.id)}" data-kal-kejadian="${esc(acara.kejadianTanggal)}">${tr('Lewati kejadian ini')}</button>`:''}<button type="button" class="kal-acara-btn" data-kal-hapus="${esc(acara.id)}">${tr(acara.adalahKejadianUlang?'Hapus rangkaian':'Hapus')}</button></div>
</div>`;
const kartuBlokJadwal = blok => {
  const awal=bagianZona(blok.mulai,blok.zonaWaktu),akhir=bagianZona(blok.selesai,blok.zonaWaktu);
  const asal=blok.tipe==='tugas'?state.notes.find(n=>n.id===blok.noteId)?.blocks?.find(b=>b.id===blok.blockId):null;
  const selesai=!!(asal?.meta?.checked);
  return `<div class="kal-blok kal-blok-${blok.tipe}${selesai?' kal-blok-selesai':''}"><div class="kal-blok-teks"><b>${esc(blok.judul)}</b><span>${esc(awal.tanggal)} · ${esc(awal.jam)}–${esc(akhir.jam)} · ${tr(blok.tipe==='tugas'?'Blok tugas':'Waktu fokus')}${selesai?` · ${tr('Tugas selesai — blok tetap tersimpan')}`:''}</span></div><button type="button" class="kal-acara-btn" data-kal-blok-hapus="${esc(blok.id)}" aria-label="${tr('Hapus blok jadwal')} ${esc(blok.judul)}">${tr('Hapus')}</button></div>`;
};
const formBlokJadwalHtml = daftar => {
  const semua=semuaToDoJadwal(daftar),tanggal=isoHari(kalPilih),zona=zonaLokal();
  const zones=[...new Set([zona,'Asia/Jakarta','Asia/Makassar','Asia/Jayapura','UTC'])];
  return `<details class="kal-blok-detail"><summary>${tr('Jadwalkan waktu tugas atau fokus')}</summary><form class="kal-blok-form" data-kal-blok-form>
    <label>${tr('Jenis blok')}<select name="tipe"><option value="tugas">${tr('Blok tugas')}</option><option value="fokus">${tr('Waktu fokus')}</option></select></label>
    <label>${tr('Tugas terbuka')}<select name="taskRef"><option value="">${semua.length?tr('Pilih tugas'):`${tr('Belum ada tugas terbuka')}`}</option>${semua.map(x=>`<option value="${esc(JSON.stringify([x.n.id,x.bid]))}">${esc(x.judul)} · ${esc(x.n.title||tr('Tanpa judul'))}</option>`).join('')}</select></label>
    <label>${tr('Judul blok fokus')}<input name="judul" maxlength="240" placeholder="${tr('Contoh: Belajar tanpa gangguan')}"></label>
    <div class="kal-form-grid"><label>${tr('Tanggal mulai')}<input type="date" name="tanggalMulai" value="${tanggal}" required></label><label>${tr('Tanggal selesai')}<input type="date" name="tanggalAkhir" value="${tanggal}" required></label></div>
    <div class="kal-form-grid"><label>${tr('Jam mulai')}<input type="time" name="jamMulai" value="09:00" required></label><label>${tr('Jam selesai')}<input type="time" name="jamAkhir" value="10:00" required></label></div>
    <label>${tr('Zona waktu')}<select name="zonaWaktu">${zones.map(z=>`<option value="${esc(z)}" ${z===zona?'selected':''}>${esc(z)}</option>`).join('')}</select></label>
    <p class="kal-form-hint">${tr('Jadwal blok terpisah dari tenggat; menyelesaikan tugas tidak menghapus riwayat blok.')}</p>
    <button class="btn btn-pri" type="submit">${tr('Simpan blok jadwal')}</button>
  </form></details>`;
};
export function simpanBlokJadwal(form) {
  const data=new FormData(form),tipe=data.get('tipe'),zonaWaktu=String(data.get('zonaWaktu')||zonaLokal());
  const mulai=timestampDariDinding(data.get('tanggalMulai'),data.get('jamMulai'),zonaWaktu),selesai=timestampDariDinding(data.get('tanggalAkhir'),data.get('jamAkhir'),zonaWaktu);
  let source={};
  if(tipe==='tugas'){
    let ref;try{ref=JSON.parse(data.get('taskRef')||'null');}catch{}
    const note=Array.isArray(ref)?state.notes.find(n=>n.id===ref[0]):null,block=note?.blocks?.find(b=>b.id===ref[1]&&b.type==='todo'&&!(b.meta&&b.meta.checked));
    if(!note||!block){toast(tr('Pilih tugas yang masih terbuka'));return false;}
    const polos=String(block.content||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
    source={noteId:note.id,blockId:block.id,judul:uraiTugas(polos)?.sisa||polos||tr('Tanpa isi')};
  } else if(tipe==='fokus') source={judul:data.get('judul')};
  const blok=normalisasiBlokJadwal({tipe,judul:source.judul,mulai,selesai,zonaWaktu,...(tipe==='tugas'?{noteId:source.noteId,blockId:source.blockId}:{})});
  if(!blok){toast(tr('Periksa judul, tugas, tanggal, dan rentang waktu blok'));return false;}
  const benturan=benturanJadwal({mulai:blok.mulai,selesai:blok.selesai,zonaWaktu:blok.zonaWaktu},{acara:state.acaraKalender||[],blok:state.blokKalender||[]});
  if(benturan.length){const sebab=benturan.slice(0,5).map(x=>`• ${x.judul} (${new Date(x.mulai).toLocaleTimeString(localeKalender(),{hour:'2-digit',minute:'2-digit'})})`).join('\n');if(!window.confirm(`${tr('Benturan jadwal ditemukan')}\n${sebab}\n${tr('Tidak ada agenda yang dipindahkan otomatis. Tetap simpan blok ini?')}`))return false;}
  state.blokKalender=state.blokKalender||[];state.blokKalender.push(blok);save();if(cur==='task')go('task');toast(tr('Blok jadwal disimpan'));return true;
}
export function hapusBlokJadwal(id) {
  const i=(state.blokKalender||[]).findIndex(b=>b.id===id);if(i<0)return;
  const [blok]=state.blokKalender.splice(i,1);save();if(cur==='task')go('task');
  toast(tr('Blok jadwal dihapus'),{label:tr('Urungkan'),cb:()=>{if(!state.blokKalender.some(b=>b.id===id)){state.blokKalender.splice(Math.min(i,state.blokKalender.length),0,blok);save();if(cur==='task')go('task');}}});
}

const tambahHari = (ms, jumlah) => { const d = new Date(ms); d.setDate(d.getDate() + jumlah); return awalHari(d.getTime()); };
const awalMingguMs = ms => { const d = new Date(ms), mundur = (d.getDay() - prefKal.awalMinggu + 7) % 7; d.setDate(d.getDate() - mundur); return awalHari(d.getTime()); };
const nomorMinggu = ms => { const d = new Date(Date.UTC(new Date(ms).getFullYear(), new Date(ms).getMonth(), new Date(ms).getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const awal = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - awal) / 86400000) + 1) / 7); };
const localeKalender = () => ({ id: 'id-ID', en: 'en-US', ja: 'ja-JP' })[bahasaSekarang()] || 'id-ID';
const judulTanggal = (ms, opsi = {}) => new Date(ms).toLocaleDateString(localeKalender(), opsi);
const semuaTenggat = daftar => daftar.flatMap(n => tenggatTodo(n).map(x => ({ n, ...x })));
const teksTugas = x => `${x.sisa || x.blok.content || ''} ${x.n.title || ''}`.replace(/<[^>]*>/g, ' ').toLocaleLowerCase();
const cocokCari = teks => !kueriKalender || String(teks || '').toLocaleLowerCase().includes(kueriKalender.toLocaleLowerCase());
const cocokKategori = acara => kategoriKalender === 'semua' || acara.kategori === kategoriKalender;
const semuaToDoJadwal = daftar => daftar.flatMap(n=>(n.blocks||[]).filter(b=>b?.type==='todo'&&!(b.meta&&b.meta.checked)).map(b=>{
  const polos=String(b.content||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  const parsed=uraiTugas(polos),judul=(parsed?.sisa||polos||tr('Tanpa isi')).slice(0,240);
  return {n,bid:b.id,blok:b,judul};
}));
const blokHariTampil=(ms,blok)=>lapisan.blok&&['semua','blok'].includes(filterKalender)
  ? blok.filter(b=>{
      const iso=isoHari(ms),a=timestampDariDinding(iso,'00:00',b.zonaWaktu),d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);const besok=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`,z=timestampDariDinding(besok,'00:00',b.zonaWaktu);
      return a!==null&&z!==null&&b.mulai<z&&b.selesai>a&&cocokCari(b.judul);
    }) : [];
const jurnalPeta = (mulai, jumlah, tahunCache = new Map()) => {
  const terlihatCatatan = state.notes.filter(n => terlihat(n));
  const hasil = new Map();
  for (let i = 0; i < jumlah; i++) {
    const ms = tambahHari(mulai, i), d = new Date(ms), k = `${d.getFullYear()}-${d.getMonth()}`;
    if (!tahunCache.has(k)) tahunCache.set(k, hariBerjurnal(terlihatCatatan, d.getFullYear(), d.getMonth(), bahasaSekarang()));
    if (tahunCache.get(k).has(d.getDate())) hasil.set(isoHari(ms), true);
  }
  return hasil;
};
const catatanTenggatHari = (ms, daftarTenggat) => lapisan.tenggat && ['semua','tenggat'].includes(filterKalender)
  ? daftarTenggat.filter(x => jatuhPada(x, ms) && cocokCari(teksTugas(x))) : [];
const acaraHariTampil = (ms, acara) => lapisan.acara && ['semua','acara'].includes(filterKalender)
  ? acara.flatMap(a => kejadianAcaraPadaTanggal(a, isoHari(ms)))
    .filter(a => cocokKategori(a) && cocokCari(a.judul)) : [];
const kontrolLapisanHtml = () => `<div class="kal-lapisan" role="group" aria-label="${tr('Tampilkan lapisan kalender')}">
  ${[['tenggat','Tenggat & pengingat'],['acara','Acara'],['blok','Blok jadwal'],['jurnal','Jurnal']].map(([k,l]) => `<label class="kal-layer"><input type="checkbox" data-kal-lapisan="${k}" ${lapisan[k] ? 'checked' : ''}><span class="kal-layer-dot kal-layer-${k}"></span>${tr(l)}</label>`).join('')}
</div>`;
const kontrolCariHtml = () => `<details class="kal-filter-detail" ${kueriKalender||filterKalender!=='semua'||kategoriKalender!=='semua'?'open':''}><summary>${tr('Cari & filter')}</summary><form class="kal-cari" data-kal-cari-form role="search">
  <label class="kal-cari-input"><span aria-hidden="true">⌕</span><input type="search" name="q" value="${esc(kueriKalender)}" placeholder="${tr('Cari acara atau tugas')}" aria-label="${tr('Cari acara atau tugas')}"></label>
  <select data-kal-filter aria-label="${tr('Filter jenis agenda')}">${[['semua','Semua'],['acara','Acara'],['tenggat','Tenggat'],['blok','Blok jadwal']].map(([v,l])=>`<option value="${v}" ${filterKalender===v?'selected':''}>${tr(l)}</option>`).join('')}</select>
  <select data-kal-kategori aria-label="${tr('Kategori acara')}">${[['semua','Semua kategori'],['personal','Pribadi'],['work','Kerja'],['study','Belajar'],['other','Lainnya']].map(([v,l])=>`<option value="${v}" ${kategoriKalender===v?'selected':''}>${tr(l)}</option>`).join('')}</select>
  <button type="submit" class="kal-cari-tombol">${tr('Cari')}</button>
</form></details>`;
const kontrolPreferensiHtml = () => `<details class="kal-prefs"><summary>${tr('Tampilan kalender')}</summary><div class="kal-prefs-isi">
  <label>${tr('Awal minggu')}<select data-kal-pref="awalMinggu"><option value="1" ${prefKal.awalMinggu===1?'selected':''}>${tr('Senin')}</option><option value="0" ${prefKal.awalMinggu===0?'selected':''}>${tr('Minggu')}</option></select></label>
  <label class="kal-pref-centang"><input type="checkbox" data-kal-pref="nomorMinggu" ${prefKal.nomorMinggu?'checked':''}> ${tr('Tampilkan nomor minggu')}</label>
  <label>${tr('Kepadatan')}<select data-kal-pref="kepadatan"><option value="ringkas" ${prefKal.kepadatan==='ringkas'?'selected':''}>${tr('Ringkas')}</option><option value="nyaman" ${prefKal.kepadatan==='nyaman'?'selected':''}>${tr('Nyaman')}</option></select></label>
</div></details>`;
const judulRentang = mode => {
  const d = new Date(kalPilih);
  if (mode === 'bulan') return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString(localeKalender(), { month: 'long', year: 'numeric' });
  if (mode === 'tahun') return String(d.getFullYear());
  if (mode === 'hari') return judulTanggal(kalPilih, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const awal = mode === 'minggu' ? awalMingguMs(kalPilih) : kalPilih;
  const akhir = tambahHari(awal, mode === 'minggu' ? 6 : 29);
  const a = new Date(awal), b = new Date(akhir);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString(localeKalender(),{month:'long',year:'numeric'})}`
    : `${judulTanggal(awal,{day:'numeric',month:'short'})} – ${judulTanggal(akhir,{day:'numeric',month:'short',year:'numeric'})}`;
};
const kerangkaKalender = isi => `<section class="card kal kal-${prefKal.kepadatan}" id="kal-bagian" aria-label="${tr('Kalender')}">
    <div class="kal-head kal-nav-utama">
      <button type="button" class="kal-nav" data-kal="prev" aria-label="${tr('Sebelumnya')}">‹</button>
      <b class="kal-rentang">${esc(judulRentang(prefKal.mode))}</b>
      <button type="button" class="kal-nav" data-kal="next" aria-label="${tr('Berikutnya')}">›</button>
      <button type="button" class="kal-today" data-kal="today">${tr('Hari ini')}</button>
      <label class="kal-lompat" title="${tr('Pilih tanggal')}"><svg class="kal-lompat-ikon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M7.5 3.5v3M16.5 3.5v3M4 9h16M8 12.5h.01M12 12.5h.01M16 12.5h.01M8 16h.01M12 16h.01"/></svg><input type="date" data-kal-tanggal aria-label="${tr('Pilih tanggal')}" value="${isoHari(kalPilih)}"></label>
    </div>
    <nav class="kal-mode" aria-label="${tr('Tampilan kalender')}">${[['bulan','Bulan'],['agenda','Agenda'],['hari','Hari'],['minggu','Minggu'],['tahun','Tahun']].map(([v,l])=>`<button type="button" data-kal-mode="${v}" aria-pressed="${prefKal.mode===v}">${tr(l)}</button>`).join('')}</nav>
    ${kontrolLapisanHtml()}${kontrolCariHtml()}${kontrolPreferensiHtml()}${isi}
  </section>`;

/* ── K9 · kalender bulanan + tampilan Tahap 2 ── */
const kalenderHtml = daftar => {
  const tenggat = semuaTenggat(daftar), acara = state.acaraKalender || [];
  const cacheJurnal = new Map();
  const adaJurnal = ms => jurnalPeta(ms, 1, cacheJurnal).has(isoHari(ms));
  const isiHari = ms => ({
    acara: acaraHariTampil(ms, acara).sort((a,b)=>a.sepanjangHari?(b.sepanjangHari?a.tanggalMulai.localeCompare(b.tanggalMulai):-1):b.sepanjangHari?1:a.mulai-b.mulai),
    tugas: catatanTenggatHari(ms, tenggat),
    blok: blokHariTampil(ms,state.blokKalender||[]).sort((a,b)=>a.mulai-b.mulai),
  });
  let isi = '';
  if (prefKal.mode === 'bulan') {
    const d = new Date(kalPilih), tahun = d.getFullYear(), bulan = d.getMonth();
    const pertama = new Date(tahun, bulan, 1), jumlah = new Date(tahun, bulan + 1, 0).getDate();
    const awalan = (pertama.getDay() - prefKal.awalMinggu + 7) % 7;
    const offsetHari = prefKal.awalMinggu === 1 ? 0 : -1;
    const hariLabel = Array.from({length:7},(_,i)=>new Date(2024,0,1+i+offsetHari).toLocaleDateString(localeKalender(),{weekday:'narrow'}));
    const berjurnal = hariBerjurnal(state.notes.filter(n=>terlihat(n)),tahun,bulan,bahasaSekarang());
    const sel=[];
    for(let i=0;i<awalan;i++)sel.push('<span class="kal-kosong" aria-hidden="true"></span>');
    for(let tgl=1;tgl<=jumlah;tgl++){
      const ms=new Date(tahun,bulan,tgl).getTime(), {acara:ea,tugas:et,blok:eb}=isiHari(ms), jurnal=lapisan.jurnal&&berjurnal.has(tgl), count=ea.length+et.length+eb.length;
      const kelas=['kal-hari']; if(ms===sekarangAwal())kelas.push('kal-kini');if(ms===kalPilih)kelas.push('kal-pilih');if(count)kelas.push('kal-ada');
      sel.push(`<button type="button" class="${kelas.join(' ')}" data-kal-hari="${ms}" data-kal-drop="${ms}" aria-label="${esc(judulTanggal(ms,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}${et.length?' · '+et.length+' '+tr('tenggat'):''}${ea.length?' · '+ea.length+' '+tr('acara'):''}${eb.length?' · '+eb.length+' '+tr('Blok jadwal'):''}${jurnal?' · '+tr('ada jurnal'):''}" aria-pressed="${ms===kalPilih}"><span>${tgl}</span>${count?`<i class="kal-titik">${count>9?'9+':count}</i>`:''}${ea.length?'<i class="kal-acara-titik" aria-hidden="true"></i>':''}${eb.length?'<i class="kal-blok-titik" aria-hidden="true"></i>':''}${jurnal?'<i class="kal-jurnal-titik" aria-hidden="true"></i>':''}</button>`);
    }
    while(sel.length%7)sel.push('<span class="kal-kosong" aria-hidden="true"></span>');
    const rows=[];
    for(let i=0;i<sel.length;i+=7){
      const tanggalMinggu=tambahHari(awalHari(pertama.getTime()),i/7*7-awalan);
      rows.push(`${prefKal.nomorMinggu?`<span class="kal-minggu-no" aria-label="${tr('Minggu')} ${nomorMinggu(tanggalMinggu)}">${nomorMinggu(tanggalMinggu)}</span>`:''}${sel.slice(i,i+7).join('')}`);
    }
    isi=`<div class="kal-grid${prefKal.nomorMinggu?' kal-grid-nomor':''}" role="grid" aria-label="${esc(judulRentang('bulan'))}">
      ${prefKal.nomorMinggu?'<span class="kal-dow kal-dow-no">#</span>':''}${hariLabel.map(h=>`<span class="kal-dow">${esc(h)}</span>`).join('')}
      ${rows.join('')}</div>
      <section class="kal-detail" aria-live="polite"><div class="kal-judul">${esc(judulTanggal(kalPilih,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</div>
      ${lapisan.jurnal?`<div class="kal-jurnal-status">${adaJurnal(kalPilih)?tr('Jurnal tersedia'):tr('Belum ada jurnal untuk tanggal ini.')}</div><button type="button" class="kal-jurnal" data-kal-jurnal="${kalPilih}">${tr(adaJurnal(kalPilih)?'Buka jurnal':'Buat jurnal')}</button>`:''}
      ${isiHari(kalPilih).acara.map(kartuAcara).join('')}${isiHari(kalPilih).tugas.map(x=>kartuTenggat(x,sisaWaktu(x.waktu))).join('')}${isiHari(kalPilih).blok.map(kartuBlokJadwal).join('')}
      ${!isiHari(kalPilih).acara.length&&!isiHari(kalPilih).tugas.length&&!isiHari(kalPilih).blok.length?`<p class="dm-kosong">${tr('Tidak ada agenda pada tanggal ini.')}</p>`:''}
      ${lapisan.acara?formAcaraHtml():''}${lapisan.blok?formBlokJadwalHtml(daftar):''}</section>`;
  } else if (prefKal.mode === 'tahun') {
    const year=new Date(kalPilih).getFullYear(), months=[];
    for(let m=0;m<12;m++){
      const start=new Date(year,m,1), days=new Date(year,m+1,0).getDate(), lead=(start.getDay()-prefKal.awalMinggu+7)%7, cells=[];
      for(let i=0;i<lead;i++)cells.push('<span></span>');
      let eventCount=0,taskCount=0,blockCount=0;
      for(let day=1;day<=days;day++){
        const ms=new Date(year,m,day).getTime(),{acara:ea,tugas:et,blok:eb}=isiHari(ms);eventCount+=ea.length;taskCount+=et.length;blockCount+=eb.length;
        const n=ea.length+et.length+eb.length;
        cells.push(`<button type="button" data-kal-tahun-tanggal="${ms}" data-kal-drop="${ms}" aria-label="${esc(judulTanggal(ms,{day:'numeric',month:'long',year:'numeric'}))}${n?' · '+n+' '+tr('agenda'):''}">${day}${n?'<i></i>':''}</button>`);
      }
      const title=start.toLocaleDateString(localeKalender(),{month:'long'});
      months.push(`<section class="kal-mini-bulan"><button type="button" data-kal-bulan="${m}" class="kal-mini-judul">${esc(title)} <small>${eventCount+taskCount+blockCount}</small></button><div class="kal-mini-grid">${cells.join('')}</div></section>`);
    }
    isi=`<div class="kal-tahun">${months.join('')}</div>`;
  } else {
    const count=prefKal.mode==='minggu'?7:prefKal.mode==='agenda'?30:1;
    const start=prefKal.mode==='minggu'?awalMingguMs(kalPilih):kalPilih;
    const journalMap=jurnalPeta(start,count,cacheJurnal), groups=[];
    const pekan=ringkasanPekan({tanggalMulai:isoHari(awalMingguMs(kalPilih)),tugas:tenggat.map(x=>({...x,jatuhTanggal:isoHari(x.waktu)})),blok:state.blokKalender||[],acara});
    const rincianPadat=pekan.padat.map(x=>`<li>${esc(new Date(`${x.tanggal}T12:00:00`).toLocaleDateString(localeKalender(),{weekday:'short',day:'numeric',month:'short'}))}: ${(x.menit/60).toFixed(1)} ${tr('jam terjadwal')} — ${esc(x.sebab.join(', '))}</li>`).join('');
    const ringkasanHtml=prefKal.mode==='minggu'?`<section class="kal-ringkasan-pekan" aria-label="${tr('Ringkasan pekan')}"><b>${tr('Ringkasan pekan')}</b><span>${pekan.agenda} ${tr('Agenda')} · ${pekan.blokTugas} ${tr('Blok tugas')} · ${pekan.tanpaBlok} ${tr('Tugas tanpa blok')} · ${pekan.bentrok} ${tr('Benturan')} · ${pekan.padat.length} ${tr('Hari padat')}</span>${rincianPadat?`<details><summary>${tr('Penyebab jadwal padat')}</summary><ul>${rincianPadat}</ul></details>`:''}</section>`:'';
    for(let i=0;i<count;i++){
      const ms=tambahHari(start,i), {acara:ea,tugas:et,blok:eb}=isiHari(ms), journal=journalMap.has(isoHari(ms));
      if(prefKal.mode==='agenda'&&!ea.length&&!et.length&&!eb.length&&!journal)continue;
      const data=[...ea.map(a=>({kind:'event',at:a.sepanjangHari?-Infinity:a.mulai,html:kartuAcara(a),time:a.sepanjangHari?tr('Sepanjang hari'):bagianZona(a.mulai,a.zonaWaktu).jam})),
        ...et.map(x=>({kind:'task',at:x.waktu,html:kartuTenggat(x,sisaWaktu(x.waktu)),time:x.jam||tr('Tenggat')})),
        ...eb.map(b=>({kind:'block',at:b.mulai,html:kartuBlokJadwal(b),time:bagianZona(b.mulai,b.zonaWaktu).jam}))].sort((a,b)=>a.at-b.at);
      groups.push(`<section class="kal-hari-agenda"><header><button type="button" class="kal-hari-pilih" data-kal-hari="${ms}" data-kal-drop="${ms}">${esc(judulTanggal(ms,{weekday:'long',day:'numeric',month:'long',year:prefKal.mode==='agenda'?'numeric':undefined}))}</button>${prefKal.mode==='minggu'&&prefKal.nomorMinggu?`<small>${tr('Minggu')} ${nomorMinggu(ms)}</small>`:''}</header>
        ${journal&&lapisan.jurnal?`<button type="button" class="kal-agenda-jurnal" data-kal-jurnal="${ms}">${tr('Jurnal tersedia')} · ${tr('Buka jurnal')}</button>`:''}
        ${data.map(x=>`<div class="kal-linimasa-item"><time>${esc(x.time)}</time>${x.html}</div>`).join('')||`<p class="kal-agenda-kosong">${tr('Tidak ada agenda pada tanggal ini.')}</p>`}</section>`);
    }
    isi=`${ringkasanHtml}<div class="kal-linimasa kal-linimasa-${prefKal.mode}">${groups.join('')||`<p class="kal-agenda-kosong">${tr('Tidak ada hasil pada rentang tanggal ini.')}</p>`}</div>${lapisan.acara?formAcaraHtml():''}${lapisan.blok?formBlokJadwalHtml(daftar):''}`;
  }
  return kerangkaKalender(isi);
};

/* Navigasi kalender: ganti bulan atau kembali ke hari ini. Dipanggil dari index.js. */
export function geserKalender(aksi, ms) {
  if (aksi === 'prev' || aksi === 'next') {
    const arah=aksi==='next'?1:-1, d=new Date(kalPilih), hari=d.getDate();
    if(prefKal.mode==='hari')d.setDate(hari+arah);
    else if(prefKal.mode==='minggu')d.setDate(hari+7*arah);
    else if(prefKal.mode==='agenda')d.setDate(hari+30*arah);
    else { d.setDate(1); d.setMonth(d.getMonth()+arah*(prefKal.mode==='tahun'?12:1)); d.setDate(Math.min(hari,new Date(d.getFullYear(),d.getMonth()+1,0).getDate())); }
    kalPilih=awalHari(d.getTime());
  } else if (aksi === 'today') kalPilih = sekarangAwal();
  else if (aksi === 'pilih' && ms) kalPilih = awalHari(Number(ms));
  if (cur === 'task') go('task');
}

export function pilihBulanKalender(bulan) {
  const d=new Date(kalPilih), hari=d.getDate();
  d.setDate(1);d.setMonth(Number(bulan));
  d.setDate(Math.min(hari,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  kalPilih=awalHari(d.getTime());prefKal.mode='bulan';
  try { localStorage.setItem(PREF_KALENDER_KUNCI, JSON.stringify(prefKal)); } catch {}
  if(cur==='task')go('task');
}

export function pilihTanggalTahun(ms) {
  kalPilih=awalHari(Number(ms));prefKal.mode='bulan';
  try { localStorage.setItem(PREF_KALENDER_KUNCI, JSON.stringify(prefKal)); } catch {}
  if(cur==='task')go('task');
}

/* B8 lanjutan: dari jurnal, buka layar Tugas dengan tanggal itu terpilih di kalender.
   ms bisa tengah hari; dipangkas ke awal hari supaya cocok dengan sel kalender. */
export function tampilkanKalenderTanggal(ms) {
  kalPilih = awalHari(Number(ms));
  go('task');
  /* kalender ada di bawah daftar tugas. Gulir ke kartunya supaya tombol Buka jurnal
     langsung terlihat (di HP tidak tertutup bilah navigasi bawah). */
  setTimeout(() => document.getElementById('kal-bagian')?.scrollIntoView({ block: 'start' }), 0);
}

/* ── K8 · ekspor & impor .ics ── */
export function unduhIcs() {
  const teks = bangunIcs(aktif());
  if (!teks.includes('BEGIN:VEVENT')) return toast(tr('Belum ada tenggat untuk diekspor'));
  const url = URL.createObjectURL(new Blob([teks], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'hara-tugas.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(tr('Kalender diunduh'));
}

/* Acara dari berkas .ics → satu catatan baru berisi to-do. */
export async function imporIcs(berkas) {
  if (!berkas) return;
  const acara = uraiIcs(await berkas.text());
  if (!acara.length) return toast(tr('Tidak ada acara di berkas .ics'));
  flush();
  const n = makeNote({
    title: tr('Impor kalender'),
    blocks: acara.map(a => ({ type: 'todo', content: barisTodoDariAcara(a) })),
  });
  state.seq++;
  state.notes.unshift(n);
  save();
  toast(tr('Diimpor') + ' ' + acara.length);
  openNote(n.id);
}

/* ── tampilan ── */
const aksiIcsHtml = () => `<div class="ics-aksi">
    <button class="btn" type="button" data-ics-unduh>${tr('Unduh kalender (.ics)')}</button>
    <label class="btn" style="cursor:pointer">${tr('Impor .ics')}
      <input type="file" accept=".ics,text/calendar" data-ics-impor hidden></label>
  </div>`;

export const tugasView = () => {
  /* tugasMendatang() sudah mengecualikan to-do yang dicentang (checked),
     jadi cukup tampilkan apa adanya — sematan tidak menghapus tenggat. */
  const daftar = aktif();
  const tunggak = tugasMendatang(daftar);
  return `<div class="page">
    <div class="sec"><h2>${tr('Mendatang · 7 hari')}</h2></div>
    ${aksiIcsHtml()}
    ${tunggak.length
      ? `<div class="card">${tunggak.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')}</div>`
      : `<div class="empty" style="padding:40px 20px"><h3>${tr('Tenang — tidak ada tenggat')}</h3>
         <p>${tr('Tulis to-do dengan tenggat di awal baris:')} <b style="font-family:var(--mono);font-weight:500">${tr('besok lari pagi')}</b>, <b style="font-family:var(--mono);font-weight:500">${tr('jumat lapor pajak')}</b>, atau <b style="font-family:var(--mono);font-weight:500">2026-12-31 target</b>.</p>
         <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan baru')}</button></div>`}
    ${matriksHtml(daftar)}
    ${kalenderHtml(daftar)}
    <div class="sec" style="margin-top:22px"><h2>${tr('Catatan berisi to-do')}</h2></div>
    <div class="card">${daftar.filter(n => (n.blocks || []).some(b => b.type === 'todo')).map(rowFor).join('') || `<p class="dm-kosong" style="padding:14px 16px">${tr('Belum ada catatan berisi to-do.')}</p>`}</div>
  </div>`;
};

export const reminderView = () => {
  const daftar = aktif();
  const tuntas = tenggatHariIni(daftar).filter(x => x.blok.meta && x.blok.meta.done);
  const tunggak = tenggatHariIni(daftar).filter(x => !(x.blok.meta && x.blok.meta.done));
  return `<div class="page">
    <div class="sec"><h2>${tr('Perlu perhatian')}</h2></div>
    ${tunggak.length
      ? `<div class="card">${tunggak.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')}</div>`
      : `<div class="empty" style="padding:40px 20px"><h3>${tr('Semua beres')}</h3>
         <p>${tr('Tidak ada to-do yang jatuh tempo hari ini. Tenggat lewat pun akan muncul di sini sampai kamu menuntaskannya.')}</p></div>`}
    <div class="sec" style="margin-top:22px"><h2>${tr('Baru selesai')}</h2></div>
    ${tuntas.length
      ? `<div class="card">${tuntas.slice(0, 8).map(x => kartuTenggat(x, tr('selesai') + ' ' + sisaWaktu(x.blok.meta.done))).join('')}</div>`
      : `<p class="dm-kosong" style="padding:2px 2px 6px">${tr('Belum ada yang selesai hari ini.')}</p>`}
  </div>`;
};
