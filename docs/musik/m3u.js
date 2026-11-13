/* M3U import/export for playlist metadata only. Never exports private content:// or
   absolute device paths; imported references must resolve to this local library. */
const norm = s => String(s || '').normalize('NFKC').toLocaleLowerCase().replace(/\.[a-z0-9]{1,8}$/i, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const basename = s => {
  let value = String(s || '').trim().replace(/\\/g, '/').split('/').pop() || '';
  try { value = decodeURIComponent(value); } catch { /* retain literal filename */ }
  return value;
};

export function parseM3U(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('Berkas M3U terlalu besar atau bukan teks');
  const entries = [];
  let info = null;
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      const m = line.slice(8).match(/^(-?\d+)\s*,\s*(.*)$/);
      info = m ? { durasi: Math.max(0, Number(m[1]) || 0), judul: m[2].trim() } : { durasi: 0, judul: '' };
    } else if (line.startsWith('#')) continue;
    else {
      entries.push({ path: basename(line), judul: info?.judul || basename(line).replace(/\.[^.]+$/, ''), durasi: info?.durasi || 0 });
      info = null;
      if (entries.length > 5000) throw new Error('Playlist berisi terlalu banyak lagu');
    }
  }
  return entries;
}

export function cocokkanM3U(entries, songs) {
  const list = Array.isArray(songs) ? songs : [];
  const keySong = song => new Set([norm(song.nama), norm(song.namaBerkas || ''), norm(song.artis ? `${song.artis} ${song.nama}` : ''), norm(basename(song.lokasi || ''))].filter(Boolean));
  const keys = list.map(song => ({ song, keys: keySong(song) }));
  return entries.map(entry => {
    const wanted = [norm(entry.judul), norm(entry.path)];
    const hits = keys.filter(x => wanted.some(k => k && x.keys.has(k)));
    return { ...entry, lagu: hits.length === 1 ? hits[0].song : null, ambigu: hits.length > 1 };
  });
}

export function buatM3U(playlist, songs) {
  const byId = new Map((songs || []).map(x => [x.id, x]));
  const lines = ['#EXTM3U', '# HARA-PLAYLIST: metadata saja; audio tidak disertakan'];
  for (const id of playlist?.lagu || []) {
    const song = byId.get(id);
    if (!song) continue;
    const title = [song.artis, song.nama].filter(Boolean).join(' — ').replace(/[\r\n]/g, ' ').replaceAll(',', ' ');
    const seconds = Math.max(0, Math.round(Number(song.durasi) || 0));
    /* Basename only: do not leak Android URI or private absolute paths. */
    const file = basename(song.namaBerkas || song.nama || song.id).replace(/[\r\n]/g, '_') || `track-${lines.length}`;
    lines.push(`#EXTINF:${seconds},${title}`, file);
  }
  return `${lines.join('\n')}\n`;
}
