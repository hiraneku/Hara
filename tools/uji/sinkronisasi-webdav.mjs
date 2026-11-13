import { validasiEndpointWebdav, bacaWebdav, tulisWebdav } from '../../docs/core/sinkronisasi-webdav.js';
let gagal = 0;
const cek = (nama, ok) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}`); if (!ok) gagal++; };
let melempar = false; try { validasiEndpointWebdav('http://example.com/sync.json'); } catch { melempar = true; }
cek('endpoint HTTP publik ditolak; sinkronisasi harus HTTPS', melempar);
cek('endpoint localhost HTTP diterima untuk server uji', validasiEndpointWebdav('http://localhost:3000/sync.json') === 'http://localhost:3000/sync.json');
melempar = false; try { validasiEndpointWebdav('https://user:pass@example.org/sync'); } catch { melempar = true; }
cek('kredensial pada URL ditolak', melempar);
const head = new Headers({ ETag: '"v1"' });
let hasil = await bacaWebdav('https://sync.example.test/file.json', null, async (_url, opts) => {
  cek('GET menggunakan cache no-store', opts.method === 'GET' && opts.cache === 'no-store');
  return { ok: true, status: 200, headers: head, json: async () => ({ format: 'hara-sync', v: 1 }) };
});
cek('GET mengembalikan envelope dan ETag', hasil.ada && hasil.etag === '"v1"' && hasil.envelope.v === 1);
hasil = await bacaWebdav('https://sync.example.test/file.json', null, async () => ({ ok: false, status: 404 }));
cek('file belum ada dikembalikan sebagai kondisi awal', !hasil.ada && hasil.etag === null);
let opsiPut;
hasil = await tulisWebdav('https://sync.example.test/file.json', { username: 'ü', password: 'sandi' }, { format: 'hara-sync' }, null,
  async (_url, opts) => { opsiPut = opts; return { ok: true, status: 201, headers: new Headers({ ETag: '"v2"' }) }; });
cek('PUT pertama memakai If-None-Match:* dan mengembalikan ETag', opsiPut.headers['If-None-Match'] === '*' && hasil.etag === '"v2"');
cek('kredensial UTF-8 hanya dikirim pada header Authorization', /^Basic /.test(opsiPut.headers.Authorization) && !JSON.stringify(opsiPut).includes('ü'));
const tabrakan = await tulisWebdav('https://sync.example.test/file.json', null, {}, '"v1"', async (_url, opts) => {
  cek('PUT pembaruan memakai If-Match ETag lama', opts.headers['If-Match'] === '"v1"');
  return { ok: false, status: 412, headers: new Headers() };
});
cek('ETag berubah menjadi konflik, tidak dianggap sukses', tabrakan.konflik);
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua tes transport WebDAV lulus');
process.exit(gagal ? 1 : 0);
