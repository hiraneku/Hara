/* Lirik LRC lokal. Tidak ada unggahan/jaringan; teks disimpan di metadata lagu. */
export function parseLrc(teks) {
  const hasil = [];
  const baris = String(teks || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const barisAsli of baris) {
    const isi = barisAsli.replace(/\[[^\]]*\]/g, '').trim();
    if (!isi) continue;
    const cap = [...barisAsli.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    for (const [, menit, detik, pecahan = '0'] of cap) {
      const frac = Number(`0.${pecahan.padEnd(3, '0')}`);
      const waktu = Number(menit) * 60 + Number(detik) + frac;
      if (Number.isFinite(waktu) && Number(detik) < 60) hasil.push({ waktu, teks: isi });
    }
  }
  return hasil.sort((a, b) => a.waktu - b.waktu);
}

export function indeksLirikAktif(baris, posisi) {
  let lo = 0, hi = (baris || []).length - 1, jawab = -1;
  while (lo <= hi) {
    const tengah = (lo + hi) >> 1;
    if (baris[tengah].waktu <= posisi) { jawab = tengah; lo = tengah + 1; }
    else hi = tengah - 1;
  }
  return jawab;
}

export function lirikAktif(baris, posisi) {
  const i = indeksLirikAktif(baris, posisi);
  return i < 0 ? null : { ...baris[i], indeks: i, berikut: baris[i + 1] || null };
}
