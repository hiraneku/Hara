/* Isi catatan sambutan — tersedia dalam bahasa antarmuka yang dipakai
   (id/en/ja). Hanya catatan SAMBUTAN yang memakai varian bahasa ini;
   catatan pengguna lain tidak pernah diterjemahkan (keputusan produk).

   Setiap varian ditulis ASLI dalam bahasanya masing-masing, bukan
   terjemahan satu-ke-satu — struktur dan contohnya menyesuaikan bahasa
   (mis. contoh tautan memakai judul wajar dalam bahasa itu). */

const B=(cls,inner)=>`<div class="${cls}">${inner}</div>`;

const ID=`
${B('b-p','<b>Selamat datang di Hara</b> — aplikasi catatan pribadi yang berjalan sepenuhnya di perangkat ini: tanpa akun, tanpa server. Semua tulisan tersimpan lokal, tetap bisa dibuka tanpa koneksi, dan tidak pernah dikirim ke mana pun.')}
${B('b-p','Catatan ini panduan singkat. Baca santai, coba yang menarik, lalu hapus kalau sudah tidak perlu — aplikasi memang sengaja dimulai dari kosong.')}
${B('b-h2','Cukup ketik — sisanya otomatis')}
${B('b-p','Editor mengerti penanda yang kamu ketik: saat penanda ditutup, teks berubah sendiri menjadi format. Di awal baris:')}
${B('b-li','<code class="ic">#</code> lalu spasi → judul utama · <code class="ic">##</code> / <code class="ic">###</code> untuk tingkat 2–3')}
${B('b-li','<code class="ic">-</code> lalu spasi → daftar · <code class="ic">1.</code> → daftar bernomor · <code class="ic">- [ ]</code> → to-do')}
${B('b-li','<code class="ic">&gt;</code> lalu spasi → kutipan · <code class="ic">---</code> lalu Enter → garis pembatas')}
${B('b-p','Di dalam kalimat pun sama: tulis <code class="ic">#halo</code> lalu tekan spasi — langsung menjadi tag <span class="tg">#halo</span>. Penanda lain ikut berubah otomatis: <b>tebal</b>, <i>miring</i>, <span class="hl">sorotan</span>, <s>coretan</s>, dan <code class="ic">kode</code>.')}
${B('b-h2','Bantuan dekat saat menulis')}
${B('b-p','Di bagian bawah layar ada <b>bar mekanik</b>: di HP ia duduk tepat di atas keyboard, di desktop ia tetap di dasar layar. Semua perintah ada di sana — tidak perlu hafal simbol. Ketuk <code class="ic">/</code> untuk membuka daftar blok yang bisa disaring dengan mengetik.')}
${B('b-h2','Tautan antar catatan')}
${B('b-p','Ketik <code class="ic">[[</code> lalu pilih judul — tautannya tampil seperti ini: <span class="wl">[[Ide Produk]]</span>. Tautan ke catatan yang belum ada tampil putus-putus: <span class="wl dead">[[Belum Dibuat]]</span>. Ketuk tautan mati untuk langsung membuat catatannya.')}
${B('b-p','Tag <span class="tg">#hara</span> diberi warna otomatis dan bisa bersarang, misalnya <span class="tg">#proyek/hara</span>. Ketuk tag untuk melihat semua catatan yang memakainya.')}
${B('b-cal','<div class="t"><svg class="ico"><use href="#i-anchor"/></svg>Rujukan blok</div>Blok penting bisa ditandai (menu sisip → Tandai blok), lalu dirujuk dari catatan lain dengan <code class="ic">![[Judul#^id]]</code> — isinya tampil langsung di tempat rujukan.')}
${B('b-h2','Gambar, jurnal & templat')}
${B('b-p','Gambar bisa disisipkan dari menu atau galeri, lalu diatur dengan menyeret gagangnya; daftar catatan menampilkan gambar mini otomatis. Tersedia pula jurnal harian dan templat bawaan untuk mempercepat menulis rutin.')}
${B('b-h2','Membaca & menemukan kembali')}
${B('b-p','Setiap catatan punya mode baca, kendali ukuran teks, mode fokus, dan pencarian di dalam catatan. Dari kendali baca, daftar isi melompat ke judul mana pun; panel di bawah catatan menampilkan backlink, penyebutan yang belum tertaut, dan grafik lokal.')}
${B('b-h2','Privasi & kenyamanan')}
${B('b-p','Di Pengaturan (ikon roda gigi): bahasa antarmuka (Indonesia, English, 日本語), tema terang–gelap, warna aksen, dan kunci PIN per catatan. Daftar bisa diurut, diarsipkan, dan dicadangkan kapan saja.')}
${B('b-div','')}
${B('b-quote','Tidak ada akun, tidak ada awan: data ini milikmu sepenuhnya dan hanya ada di perangkat ini. Kalau suatu hari aplikasinya berhenti dikembangkan, semua tulisanmu tetap utuh di sini.')}
${B('b-p','<b>Selamat menulis.</b> Ketuk tombol <b>+</b> di bawah untuk membuat catatan pertamamu.')}`;

const EN=`
${B('b-p','<b>Welcome to Hara</b> — a personal notes app that runs entirely on this device: no account, no server. Everything you write is stored locally, stays readable offline, and never leaves your device.')}
${B('b-p','This note is a short tour. Read at your own pace, try what looks interesting, then delete it whenever you like — the app is meant to start from a blank page.')}
${B('b-h2','Just type — formatting follows')}
${B('b-p','The editor understands lightweight marks: as soon as a mark is closed, the text becomes real formatting. At the start of a line:')}
${B('b-li','<code class="ic">#</code> then space → main heading · <code class="ic">##</code> / <code class="ic">###</code> for level 2–3')}
${B('b-li','<code class="ic">-</code> then space → bullet list · <code class="ic">1.</code> → numbered list · <code class="ic">- [ ]</code> → to-do')}
${B('b-li','<code class="ic">&gt;</code> then space → quote · <code class="ic">---</code> then Enter → divider')}
${B('b-p','It works inside a sentence too: type <code class="ic">#halo</code> and press space — it turns into the tag <span class="tg">#halo</span> on the spot. The other marks convert as you type as well: <b>bold</b>, <i>italic</i>, <span class="hl">highlight</span>, <s>strikethrough</s>, and <code class="ic">code</code>.')}
${B('b-h2','Help is always nearby')}
${B('b-p','The <b>mechanic bar</b> sits at the bottom of the screen — right above the keyboard on a phone, at the bottom of the window on a computer. Every command lives there, so there is nothing to memorise. Tap <code class="ic">/</code> for the list of blocks; it filters as you type.')}
${B('b-h2','Linking notes together')}
${B('b-p','Type <code class="ic">[[</code> and pick a title — or write the link straight away, like <span class="wl">[[Product ideas]]</span>. Links to notes that do not exist yet are dashed: <span class="wl dead">[[Not created yet]]</span>. Tap a dashed link to create that note immediately.')}
${B('b-p','A tag such as <span class="tg">#hara</span> gets its colour automatically and can be nested, e.g. <span class="tg">#project/hara</span>. Tap a tag to see every note that uses it.')}
${B('b-cal','<div class="t"><svg class="ico"><use href="#i-anchor"/></svg>Block references</div>Any block can be marked (Insert menu → Mark block) and then referenced from another note with <code class="ic">![[Title#^id]]</code> — its content shows up right where you reference it.')}
${B('b-h2','Images, journal & templates')}
${B('b-p','Images can be added from the menu or the gallery, then arranged by dragging their handle; the note list shows a thumbnail automatically. There is also a daily journal and built-in templates for notes you write over and over.')}
${B('b-h2','Reading & finding your way back')}
${B('b-p','Every note has a reading mode, text-size controls, a focus mode, and in-note search. From the reading controls, a table of contents jumps to any heading; the panels below the note show backlinks, unlinked mentions, and a local graph.')}
${B('b-h2','Privacy & comfort')}
${B('b-p','In Settings (the gear icon): interface language (English, Indonesia, 日本語), light–dark theme, accent colour, and a PIN lock for individual notes. The list can be sorted, archived, and backed up any time.')}
${B('b-div','')}
${B('b-quote','No account, no cloud: your data is yours alone and lives only on this device. If the app ever stops being developed, everything you wrote stays intact, right here.')}
${B('b-p','<b>Happy writing.</b> Tap the <b>+</b> button below to create your first note.')}`;

const JA=`
${B('b-p','<b>Hara（ハラ）へようこそ</b> — この端末だけで完結する個人ノートアプリです。アカウントもサーバーも不要。書いた内容はすべてローカルに保存され、オフラインでも読め、どこへも送信されません。')}
${B('b-p','このノートは短い案内です。気になった機能を試して、もう必要なければ削除してください。アプリは最初は空の状態で始まる設計です。')}
${B('b-h2','打つだけ — あとは自動で')}
${B('b-p','エディタは入力した記号を理解します。記号を閉じると、その場でテキストが本物の書式に変わります。行頭では:')}
${B('b-li','<code class="ic">#</code>＋スペース → 大見出し · <code class="ic">##</code> / <code class="ic">###</code> → 中・小見出し')}
${B('b-li','<code class="ic">-</code>＋スペース → 箇条書き · <code class="ic">1.</code> → 番号付きリスト · <code class="ic">- [ ]</code> → チェックリスト')}
${B('b-li','<code class="ic">&gt;</code>＋スペース → 引用 · <code class="ic">---</code>＋Enter → 区切り線')}
${B('b-p','文の途中でも同じです。<code class="ic">#halo</code> と打ってスペースを押すと、その場でタグ <span class="tg">#halo</span> に変わります。<b>太字</b>、<i>斜体</i>、<span class="hl">ハイライト</span>、<s>打消し線</s>、<code class="ic">コード</code> も入力中に自動変換されます。')}
${B('b-h2','書いているそばにヘルプ')}
${B('b-p','画面の下にあるのが<b>メカニックバー</b>です。スマホではキーボードのすぐ上、パソコンではウィンドウの下に表示されます。操作はすべてここに揃っているので、記号を覚える必要はありません。<code class="ic">/</code> を押すとブロックの一覧が開き、入力しながら絞り込めます。')}
${B('b-h2','ノート同士をつなぐ')}
${B('b-p','<code class="ic">[[</code> と入力してタイトルを選ぶか、<span class="wl">[[アイデア]]</span> のように直接書くこともできます。まだ存在しないノートへのリンクは破線で表示されます（例：<span class="wl dead">[[まだ作っていないノート]]</span>）。破線のリンクをタップすると、そのノートをすぐ作成できます。')}
${B('b-p','<span class="tg">#hara</span> のように書くとタグになり、自動で色が付きます。タップすると、同じタグのノートを一覧表示できます。スラッシュで区切る階層タグにも対応しています。')}
${B('b-cal','<div class="t"><svg class="ico"><use href="#i-anchor"/></svg>ブロック参照</div>大事なブロックはマーク（挿入メニュー → ブロックをマーク）しておくと、別のノートから <code class="ic">![[タイトル#^id]]</code> で参照できます。参照した内容はその場に表示されます。')}
${B('b-h2','画像・ジャーナル・テンプレート')}
${B('b-p','画像は挿入メニューやギャラリーから追加でき、ハンドルをドラッグして配置や大きさを調整します。ノート一覧にはサムネイルが自動で表示されます。毎日のジャーナルや、繰り返し使う書き方のためのテンプレートもあります。')}
${B('b-h2','読み返す・見つけ直す')}
${B('b-p','すべてのノートに表示モード、文字サイズの調整、集中モード、ノート内検索があります。表示モードの操作から目次で見出しへジャンプでき、ノートの下のパネルではバックリンク、未リンクの言及、ローカルグラフを確認できます。')}
${B('b-h2','プライバシーと使いやすさ')}
${B('b-p','設定（歯車アイコン）では、表示言語（日本語 / English / Indonesia）、テーマの切り替え、アクセントカラー、ノートごとのPINロックを変更できます。一覧の並べ替え、アーカイブ、バックアップにも対応しています。')}
${B('b-div','')}
${B('b-quote','アカウントもクラウドもありません。データはこの端末だけにあり、アプリの開発が止まっても、あなたが書いたものはここに残り続けます。')}
${B('b-p','<b>よい執筆を。</b>下の <b>+</b> ボタンから、最初のノートを作ってみてください。')}`;

export const ISI_WELCOME = { id: ID, en: EN, ja: JA };
export const JUDUL_WELCOME = {
  id: 'Selamat datang di Hara',
  en: 'Welcome to Hara',
  ja: 'Hara へようこそ',
};
export const isiWelcome = b => ISI_WELCOME[b] || ISI_WELCOME.id;
export const judulWelcome = b => JUDUL_WELCOME[b] || JUDUL_WELCOME.id;

/* Versi ISI catatan sambutan. Saat isi (di bahasa mana pun) diperbarui,
   angka ini dinaikkan supaya catatan sambutan tersinkron kembali.
   Bahasa penyimpanan dicatat di field `welcomeLang` pada catatan. */
export const WELCOME_V = 4;
