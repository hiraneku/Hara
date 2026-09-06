/* Isi catatan sambutan — hanya dipakai sekali, saat catatan bawaan dibuat. */
const B=(cls,inner)=>`<div class="${cls}">${inner}</div>`;
const welcomeBody=`
${B('b-p','Ini satu-satunya catatan di Hara. Hapus saja kalau sudah selesai membaca — aplikasi memang sengaja dimulai kosong.')}
${B('b-h2','Mekanik yang bisa dicoba')}
${B('b-p','Tautan antar catatan ditulis begini: <span class="wl" data-act="Membuka Ide Produk">[[Ide Produk]]</span>. Yang belum ada catatannya tampil putus-putus — <span class="wl dead" data-act="Membuat catatan Belum Dibuat">[[Belum Dibuat]]</span> — ketuk untuk membuatnya.')}
${B('b-p','Tag ditulis <span class="tg" data-act="Membuka tag #hara">#hara</span>, bisa bersarang seperti <span class="tg" data-act="Membuka tag #proyek/hara">#proyek/hara</span>. Teks bisa <b>tebal</b>, <i>miring</i>, <span class="hl">disorot</span>, atau <code class="ic">kode</code>.')}
${B('b-todo','')}
${B('b-h2','Menulis tanpa hafal sintaks')}
${B('b-p','Di HP, bar abu-abu di atas keyboard itu <b>bar mekanik</b>. Ketuk tombolnya, jangan hafal simbolnya. Inilah yang paling menyiksa di Obsidian mobile.')}
${B('b-p','Ketuk tombol <code class="ic">/</code> di bar itu untuk membuka daftar blok — heading, kutipan, kode, tabel, gambar.')}
${B('b-cal','<div class="t"><svg class="ico"><use href="#i-info"/></svg>Callout</div>Blok penekanan seperti ini juga didukung, lewat sintaks <code class="ic">&gt; [!info]</code> atau dari menu <code class="ic">/</code>.')}
${B('b-h2','Blok, bukan berkas')}
${B('b-p','Tiap paragraf adalah blok mandiri dengan id sendiri. Di desktop, arahkan kursor ke kiri paragraf — muncul pegangan untuk menyeretnya.')}
${B('b-p','Karena unit simpannya blok, mengetik satu huruf hanya menulis ulang satu blok. Itu sebabnya <b>tidak ada batas jumlah huruf</b> di satu catatan.')}
${B('b-quote','Yang dirender hanya blok yang terlihat. Catatan satu juta kata pun tetap lancar digulir.')}
${B('b-code','1.000.000 kata  ≈  6 MB\\nKuota IndexedDB  ≈  ratusan MB – beberapa GB')}
${B('b-h2','Menyematkan blok lain')}
${B('b-p','Sematan ditulis <code class="ic">![[Catatan#^blok]]</code> dan isinya tampil langsung:')}
<div class="emb"><div class="emb-h"><svg class="ico"><use href="#i-link"/></svg>Ide Produk › blok ^a12f</div>
<div class="b-p" style="font-size:15px">Menang di HP, bukan menang di jumlah fitur.</div></div>
${B('b-div','')}
${B('b-p','Gulir terus ke bawah untuk melihat <b>backlink</b>, <b>unlinked mention</b>, dan <b>local graph</b>.')}`;

export { welcomeBody };

export const panels=`<div class="panel"><div class="panel-h"><svg class="ico"><use href="#i-link"/></svg>Backlink<span class="n">1</span></div>
  <button class="bl" data-act="Membuka Ide Produk"><div class="bl-t">Ide Produk</div>
  <div class="bl-c">Semua ide awal dikumpulkan di <b>[[Selamat datang di Hara]]</b> sebelum dipecah jadi catatan sendiri.</div></button>
  <div class="unl">Disebut tanpa tautan di 1 catatan
    <button class="btn btn-sec" data-act="Tautan dibuat">Tautkan</button></div></div>
<div class="panel"><div class="panel-h"><svg class="ico"><use href="#i-graph"/></svg>Local graph</div>
  <div class="graph">
    <svg style="position:absolute;inset:0;width:100%;height:100%" stroke="var(--border-strong)" stroke-width="1">
      <line x1="50%" y1="50%" x2="22%" y2="26%"/><line x1="50%" y1="50%" x2="80%" y2="30%"/>
      <line x1="50%" y1="50%" x2="30%" y2="80%"/><line x1="50%" y1="50%" x2="74%" y2="76%"/></svg>
    <div class="gnode me" style="left:50%;top:50%"><span class="gdot"></span><span>Selamat datang</span></div>
    <div class="gnode" style="left:22%;top:26%"><span class="gdot"></span><span>Ide Produk</span></div>
    <div class="gnode" style="left:80%;top:30%"><span class="gdot"></span><span>Belum Dibuat</span></div>
    <div class="gnode" style="left:30%;top:80%"><span class="gdot"></span><span>#hara</span></div>
    <div class="gnode" style="left:74%;top:76%"><span class="gdot"></span><span>Harian 6 Sep</span></div>
  </div></div>
<p class="note">Local graph hanya tetangga 1–2 langkah — bukan graph global 3D yang berat dan jarang berguna.</p>`;
