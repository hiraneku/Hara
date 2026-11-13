import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../../docs/styles/notes.css', import.meta.url), 'utf8');
assert.match(css, /\.kal-nav-utama\{grid-template-columns:36px minmax\(0,1fr\) 36px auto 36px/);
assert.match(css, /\.kal-cari-input\{grid-column:1\/-1\}/);
assert.match(css, /\.kal-hari\.kal-pilih:hover/);
assert.match(css, /\.kal-acara-btn:focus-visible/);
assert.match(css, /@media\(max-width:420px\)/);
assert.match(css, /\.kal-linimasa-item>time\{padding:0 2px\}/);
console.log('ok tata letak kalender punya kontrol responsif, fokus terlihat, dan susunan layar sempit');
