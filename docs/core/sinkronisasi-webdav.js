/* Transport WebDAV N6. Endpoint berupa URL file, semua permintaan tulis bersyarat
   dengan ETag agar perangkat lain tidak tertimpa diam-diam. Kredensial hanya
   dipakai selama permintaan dan tidak disimpan modul ini. */

export function validasiEndpointWebdav(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { throw new Error('URL WebDAV tidak valid.'); }
  const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && localhost)) throw new Error('WebDAV harus memakai HTTPS (HTTP hanya di localhost).');
  if (u.username || u.password || u.search || u.hash) throw new Error('URL endpoint tidak boleh berisi kredensial, kueri, atau fragmen.');
  return u.href.replace(/\/$/, '');
}

function authHeader(kredensial) {
  if (!kredensial) return {};
  const raw = `${String(kredensial.username || '')}:${String(kredensial.password || '')}`;
  const bytes = new TextEncoder().encode(raw);
  let biner = ''; for (const b of bytes) biner += String.fromCharCode(b);
  return { Authorization: `Basic ${btoa(biner)}` };
}

export async function bacaWebdav(endpoint, kredensial, fetchFn = globalThis.fetch) {
  const url = validasiEndpointWebdav(endpoint);
  const res = await fetchFn(url, { method: 'GET', headers: { Accept: 'application/json', ...authHeader(kredensial) }, cache: 'no-store' });
  if (res.status === 404) return { ada: false, etag: null, envelope: null };
  if (!res.ok) throw new Error(`WebDAV gagal membaca data (HTTP ${res.status}).`);
  let envelope;
  try { envelope = await res.json(); } catch { throw new Error('Data WebDAV bukan JSON yang valid.'); }
  return { ada: true, etag: res.headers?.get?.('ETag') || null, envelope };
}

export async function tulisWebdav(endpoint, kredensial, envelope, etag = null, fetchFn = globalThis.fetch) {
  const url = validasiEndpointWebdav(endpoint);
  const headers = { 'Content-Type': 'application/json', ...authHeader(kredensial) };
  headers[etag ? 'If-Match' : 'If-None-Match'] = etag || '*';
  const res = await fetchFn(url, { method: 'PUT', headers, body: JSON.stringify(envelope), cache: 'no-store' });
  if (res.status === 409 || res.status === 412) return { konflik: true, etag: res.headers?.get?.('ETag') || null };
  if (!res.ok) throw new Error(`WebDAV gagal menulis data (HTTP ${res.status}).`);
  return { konflik: false, etag: res.headers?.get?.('ETag') || null };
}
