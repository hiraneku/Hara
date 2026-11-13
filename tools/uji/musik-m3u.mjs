import assert from 'node:assert/strict';
import { buatM3U, cocokkanM3U, parseM3U } from '../../docs/musik/m3u.js';

const songs = [
  { id: 'a', nama: 'Night Song.mp3', artis: 'Test Artist', durasi: 150, lokasi: '/private/audio/Night Song.mp3' },
  { id: 'b', nama: 'Judul metadata', namaBerkas: 'Second Track.flac', artis: 'Other Artist', durasi: 81, lokasi: 'content://secret/private/file' },
];
const parsed = parseM3U('\uFEFF#EXTM3U\r\n#EXTINF:150,Test Artist — Night Song\r\nMusic/Night%20Song.mp3\r\n#EXTINF:81,Missing Song\r\nmissing.mp3\r\n');
assert.equal(parsed.length, 2);
assert.equal(parsed[0].path, 'Night Song.mp3');
const matched = cocokkanM3U(parsed, songs);
assert.equal(matched[0].lagu.id, 'a');
assert.equal(matched[1].lagu, null);
assert.equal(cocokkanM3U([{ path: 'Second%20Track.flac', judul: 'Second Track' }], songs)[0].lagu.id, 'b');
const text = buatM3U({ nama: 'List', lagu: ['a', 'b'] }, songs);
assert.match(text, /^#EXTM3U/m);
assert.match(text, /#EXTINF:150,Test Artist — Night Song\.mp3/);
assert.ok(!text.includes('/private/audio'));
assert.ok(!text.includes('content://'));
assert.equal(parseM3U(text).length, 2);
assert.throws(() => parseM3U('x'.repeat(2_000_001)), /besar/);
assert.equal(cocokkanM3U([{ path: 'Night Song.mp3', judul: 'Night Song' }], [...songs, { ...songs[0], id: 'duplicate' }])[0].ambigu, true);
console.log('musik-m3u: semua uji lulus');
