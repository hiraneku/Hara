/* Uji jembatan kontrol media Android: metadata, posisi, dan aksi notifikasi. */
let listener, focusListener;
const calls = [];
const plugin = {
  addListener: async (name, fn) => { if (name === 'mediaAction') listener = fn; if (name === 'audioFocus') focusListener = fn; return { remove: async () => {} }; },
  update: async data => { calls.push(['update', data]); },
  clear: async () => { calls.push(['clear']); },
};
globalThis.window = { Capacitor: { getPlatform: () => 'android', registerPlugin: name => name === 'MusicControls' ? plugin : null } };
const K = await import('../../docs/musik/kontrol-notif.js');
let prev = 0, next = 0, play = 0, pause = 0, seek = 0;
K.pasangKontrolNotifikasi({
  play: () => { play++; }, pause: () => { pause++; },
  previous: () => { prev++; }, next: () => { next++; },
  seekTo: ms => { seek = ms; },
});
await new Promise(r => setTimeout(r, 0));
K.sinkronkanKontrolNotifikasi({ id: 'x', nama: 'WebM 01', artis: 'Artis', album: 'Album' }, {
  id: 'x', status: 'putar', judul: 'WebM 01', durasi: 90, posisi: 12.5, tempo: 1.1,
});
await new Promise(r => setTimeout(r, 0));
const data = calls.find(x => x[0] === 'update')?.[1];
let gagal = 0;
function cek(n, ok) { console.log(`${ok ? 'OK  ' : 'FAIL'} ${n}`); if (!ok) gagal++; }
cek('metadata, durasi, posisi, dan status terkirim ke native', data?.title === 'WebM 01' && data.artist === 'Artis' && data.album === 'Album' && data.durationMs === 90000 && data.positionMs === 12500 && data.state === 'playing');
listener?.({ action: 'play' });
listener?.({ action: 'pause' });
listener?.({ action: 'previous' });
listener?.({ action: 'next' });
listener?.({ action: 'seekTo', positionMs: 41000 });
cek('aksi kontrol notifikasi diteruskan ke pemutar', play === 1 && pause === 1 && prev === 1 && next === 1 && seek === 41000);
focusListener?.({ state: 'transient' });
focusListener?.({ state: 'gain' });
cek('gangguan audio singkat menjeda lalu melanjutkan playback', pause === 2 && play === 2);
K.sinkronkanKontrolNotifikasi(null, { status: 'kosong' });
await new Promise(r => setTimeout(r, 0));
cek('MediaSession native dibersihkan saat tidak ada lagu', calls.some(x => x[0] === 'clear'));
process.exit(gagal ? 1 : 0);
