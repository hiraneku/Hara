/* Model sinkronisasi E2E N6. Tidak melakukan I/O jaringan atau menyentuh store.
   Transport harus menyimpan hanya envelope terenkripsi; konflik diputuskan pemakai. */

export const FORMAT_SYNC = 'hara-sync';
export const ITERASI_SYNC = 310_000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const cryptoApi = () => globalThis.crypto;
const b64 = bytes => {
  const u = new Uint8Array(bytes); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return globalThis.btoa(s);
};
const unb64 = s => {
  const raw = globalThis.atob(String(s));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};
const salin = x => x == null ? x : JSON.parse(JSON.stringify(x));

export async function turunkanKunciSinkron(frasa, salt, iterasi = ITERASI_SYNC) {
  if (typeof frasa !== 'string' || frasa.length < 12) throw new Error('Frasa sinkronisasi minimal 12 karakter.');
  if (!(salt instanceof Uint8Array) || salt.length !== 16) throw new Error('Salt sinkronisasi tidak valid.');
  if (!Number.isInteger(iterasi) || iterasi < ITERASI_SYNC || iterasi > 2_000_000) throw new Error('Parameter KDF tidak aman.');
  const material = await cryptoApi().subtle.importKey('raw', enc.encode(frasa.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return cryptoApi().subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iterasi }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function segelSnapshot(data, frasa, { salt, iterasi = ITERASI_SYNC } = {}) {
  const s = salt instanceof Uint8Array ? salt : cryptoApi().getRandomValues(new Uint8Array(16));
  const iv = cryptoApi().getRandomValues(new Uint8Array(12));
  const key = await turunkanKunciSinkron(frasa, s, iterasi);
  const plain = enc.encode(JSON.stringify(data));
  const encrypted = await cryptoApi().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(`${FORMAT_SYNC}:1`) }, key, plain);
  return { format: FORMAT_SYNC, v: 1, cipher: 'AES-GCM-256', kdf: 'PBKDF2-SHA-256', iterasi, salt: b64(s), iv: b64(iv), data: b64(encrypted) };
}

export async function bukaSnapshot(envelope, frasa) {
  if (!envelope || envelope.format !== FORMAT_SYNC || envelope.v !== 1 || envelope.cipher !== 'AES-GCM-256' || envelope.kdf !== 'PBKDF2-SHA-256') throw new Error('Format sinkronisasi tidak dikenal.');
  try {
    const salt = unb64(envelope.salt), iv = unb64(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error('parameter rusak');
    const key = await turunkanKunciSinkron(frasa, salt, envelope.iterasi);
    const plain = await cryptoApi().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(`${FORMAT_SYNC}:1`) }, key, unb64(envelope.data));
    return JSON.parse(dec.decode(plain));
  } catch {
    throw new Error('Frasa salah atau data sinkronisasi rusak.');
  }
}

const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const petaId = list => new Map((Array.isArray(list) ? list : []).filter(x => x && typeof x.id === 'string').map(x => [x.id, x]));

/* Rebase tiga arah: entri yang hanya berubah di satu sisi digabung otomatis.
   Perubahan bersamaan pada ID sama menjadi konflik eksplisit, termasuk hapus-vs-edit. */
export function rencanaGabung(base = [], lokal = [], jauh = []) {
  const b = petaId(base), l = petaId(lokal), r = petaId(jauh);
  const hasil = [], konflik = [], ids = new Set([...b.keys(), ...l.keys(), ...r.keys()]);
  for (const id of ids) {
    const bv = b.get(id), lv = l.get(id), rv = r.get(id);
    const lBerubah = !sama(lv, bv), rBerubah = !sama(rv, bv);
    if (!lBerubah && !rBerubah) { if (lv) hasil.push(salin(lv)); continue; }
    if (lBerubah && !rBerubah) { if (lv) hasil.push(salin(lv)); continue; }
    if (!lBerubah && rBerubah) { if (rv) hasil.push(salin(rv)); continue; }
    if (sama(lv, rv)) { if (lv) hasil.push(salin(lv)); continue; }
    konflik.push({ id, base: salin(bv), lokal: salin(lv), jauh: salin(rv) });
  }
  return { hasil, konflik };
}

/* Pilihan resolusi per ID: 'lokal', 'jauh', 'hapus', atau 'gabung'.
   Gabung mempertahankan perubahan blok dari kedua sisi; dua blok dengan ID sama
   tetapi isi berbeda mendapat ID baru agar tidak saling menimpa. */
export function selesaikanKonflik(rencana, pilihan = {}) {
  const hasil = (rencana?.hasil || []).map(salin);
  for (const c of rencana?.konflik || []) {
    const pilih = pilihan[c.id];
    if (pilih === 'lokal') { if (c.lokal) hasil.push(salin(c.lokal)); }
    else if (pilih === 'jauh') { if (c.jauh) hasil.push(salin(c.jauh)); }
    else if (pilih === 'gabung') {
      if (!c.lokal && !c.jauh) continue;
      if (!c.lokal) { hasil.push(salin(c.jauh)); continue; }
      if (!c.jauh) { hasil.push(salin(c.lokal)); continue; }
      const kiri = salin(c.lokal), kanan = c.jauh;
      const blocks = Array.isArray(kiri.blocks) ? kiri.blocks : [];
      const byId = new Map(blocks.map((x, i) => [x.id, i]));
      for (const block of Array.isArray(kanan.blocks) ? kanan.blocks : []) {
        const i = byId.get(block.id);
        if (i == null) { blocks.push(salin(block)); byId.set(block.id, blocks.length - 1); }
        else if (!sama(blocks[i], block)) {
          const clone = salin(block); clone.id = `${String(block.id).slice(0, 80)}-konflik-${String(c.id).slice(-8)}`;
          while (byId.has(clone.id)) clone.id += '-2';
          blocks.push(clone); byId.set(clone.id, blocks.length - 1);
        }
      }
      kiri.blocks = blocks;
      kiri.tags = [...new Set([...(kiri.tags || []), ...(kanan.tags || [])])];
      const props = [...(kiri.props || [])];
      for (const p of kanan.props || []) if (!props.some(x => x.k === p.k && x.v === p.v)) props.push(salin(p));
      kiri.props = props;
      kiri.updatedAt = Math.max(kiri.updatedAt || 0, kanan.updatedAt || 0, Date.now());
      hasil.push(kiri);
    } else throw new Error(`Konflik ${c.id} belum dipilih.`);
  }
  return hasil;
}
