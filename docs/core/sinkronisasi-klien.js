import { segelSnapshot, bukaSnapshot } from './sinkronisasi-murni.js?v=20261105210000';
import { bacaWebdav, tulisWebdav } from './sinkronisasi-webdav.js?v=20261105210000';
import { rencanaSinkronisasi, selesaikanRencanaSinkronisasi } from './sinkronisasi-rencana.js?v=20261105210000';
const KUNCI_BASE = 'hara.sync.n6.base.v1';
const ambilSnapshotLokal = async () => {
  const { cadanganJson } = await import('../notes/data-io.js?v=20261105210000');
  return JSON.parse((await cadanganJson()).teks);
};
const terapkanSnapshotLokal = async snapshot => {
  const { siapImporJson, terapkanImporJson } = await import('../notes/data-io.js?v=20261105210000');
  return terapkanImporJson(await siapImporJson(JSON.stringify(snapshot)), 'timpa');
};
const bacaBaselineLokal = async () => (await import('./db-catatan.js?v=20261105210000')).bacaKv(KUNCI_BASE);
const tulisBaselineLokal = async paket => (await import('./db-catatan.js?v=20261105210000')).tulisKv(KUNCI_BASE, paket);

/* Satu sesi sinkronisasi: tidak menyimpan URL, kredensial, atau frasa sandi.
   Baseline lokal juga disegel dengan frasa yang sama agar tidak menambah salinan
   plaintext ke penyimpanan. Dependency injection memudahkan uji transport. */
export function buatKlienSinkronisasi({
  bacaLokal = ambilSnapshotLokal,
  terapkanLokal = terapkanSnapshotLokal,
  bacaRemote = bacaWebdav,
  tulisRemote = tulisWebdav,
  bacaBaseline = () => bacaKv(KUNCI_BASE),
  tulisBaseline = paket => tulisKv(KUNCI_BASE, paket),
} = {}) {
  let tertunda = null;
  let timerTertunda = null;
  const bersihkanTertunda = () => { clearTimeout(timerTertunda); timerTertunda = null; tertunda = null; };

  async function selesaikanPaket({ endpoint, kredensial, frasa, snapshot, etag }) {
    const envelope = await segelSnapshot(snapshot, frasa);
    const tulis = await tulisRemote(endpoint, kredensial, envelope, etag);
    if (tulis.konflik) return { status: 'remote-berubah', etag: tulis.etag };
    await terapkanLokal(snapshot);
    const baseline = await segelSnapshot(snapshot, frasa);
    await tulisBaseline(baseline);
    bersihkanTertunda();
    return { status: 'selesai', etag: tulis.etag };
  }

  async function mulai({ endpoint, kredensial, frasa, paksaBuatUlang = false }) {
    if (!String(frasa || '').trim()) throw new Error('Masukkan frasa sinkronisasi.');
    const local = await bacaLokal();
    if (!local || local.format !== 'hara-cadangan') throw new Error('Cadangan lokal tidak valid.');
    const remote = await bacaRemote(endpoint, kredensial);
    const baselineEnvelope = await bacaBaseline();
    if (!remote.ada) {
      if (baselineEnvelope && !paksaBuatUlang) return { status: 'remote-hilang' };
      return selesaikanPaket({ endpoint, kredensial, frasa, snapshot: local, etag: null });
    }

    const jauh = await bukaSnapshot(remote.envelope, frasa);
    const base = baselineEnvelope ? await bukaSnapshot(baselineEnvelope, frasa) : null;
    const plan = rencanaSinkronisasi(base, local, jauh);
    if (plan.konflik.length) {
      bersihkanTertunda();
      tertunda = { endpoint, kredensial, frasa, plan, etag: remote.etag };
      timerTertunda = setTimeout(bersihkanTertunda, 5 * 60 * 1000);
      timerTertunda.unref?.();
      return { status: 'konflik', konflik: plan.konflik.map(c => ({ id: c.id, jenis: c.jenis, lokal: c.lokal, jauh: c.jauh })) };
    }
    return selesaikanPaket({ endpoint, kredensial, frasa, snapshot: plan.hasil, etag: remote.etag });
  }

  async function pilihKonflik(pilihan) {
    if (!tertunda) throw new Error('Tidak ada resolusi konflik yang tertunda.');
    const s = tertunda;
    const snapshot = selesaikanRencanaSinkronisasi(s.plan, pilihan);
    /* ETag mencegah snapshot lain yang tiba saat dialog terbuka tertimpa. */
    return selesaikanPaket({ ...s, snapshot });
  }

  return { mulai, pilihKonflik, batalkanKonflik: () => { tertunda = null; }, adaResolusiTertunda: () => !!tertunda };
}
