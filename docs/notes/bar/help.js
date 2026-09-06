/* Penjelasan tiap mekanik.

   Ditulis untuk menjawab tiga hal: apa yang terjadi, bagaimana memakainya,
   dan hal yang tidak terlihat dari namanya. Bukan sekadar mengulang label. */

export const HELP = {
  /* ── riwayat ── */
  undo: {
    nama: 'Batalkan',
    apa: 'Mengembalikan catatan ke keadaan sebelum perubahan terakhir.',
    cara: 'Ketuk tombol, atau tekan Ctrl+Z (Cmd+Z di Mac).',
    tahu: 'Ketikan beruntun dihitung satu langkah — berhenti mengetik setengah detik menandai batas langkah baru. Riwayat menyimpan 100 langkah dan direset saat kamu berpindah catatan.'
  },
  redo: {
    nama: 'Ulangi',
    apa: 'Mengembalikan perubahan yang barusan dibatalkan.',
    cara: 'Ketuk tombol, atau tekan Ctrl+Shift+Z / Ctrl+Y.',
    tahu: 'Kalau kamu mengetik sesuatu yang baru setelah membatalkan, jalur ulangi terputus dan tidak bisa dipakai lagi.'
  },

  /* ── format inline ── */
  b: {
    nama: 'Tebal',
    apa: 'Menebalkan teks untuk menandai bagian penting.',
    cara: 'Blok teks lalu ketuk, atau ketuk dulu lalu mulai mengetik.',
    tahu: 'Mengetik **teks** juga langsung menebalkannya. Ketuk sekali lagi untuk melepas — bisa digabung dengan miring.'
  },
  i: {
    nama: 'Miring',
    apa: 'Memiringkan teks, biasanya untuk istilah asing atau penekanan halus.',
    cara: 'Blok teks lalu ketuk, atau ketuk dulu lalu mulai mengetik.',
    tahu: 'Mengetik *teks* juga memiringkannya.'
  },
  hl: {
    nama: 'Sorot',
    apa: 'Memberi latar berwarna pada teks, seperti stabilo.',
    cara: 'Blok teks lalu pilih menu ini.',
    tahu: 'Sintaks markdown-nya ==teks==. Berguna menandai bagian yang mau dibaca ulang.'
  },
  strike: {
    nama: 'Coret',
    apa: 'Mencoret teks tanpa menghapusnya.',
    cara: 'Blok teks lalu pilih menu ini.',
    tahu: 'Sintaks markdown-nya ~~teks~~. Cocok untuk menandai yang sudah tidak berlaku tapi ingin tetap terlihat.'
  },
  icode: {
    nama: 'Kode inline',
    apa: 'Menandai potongan kode pendek di tengah kalimat, dengan huruf monospace.',
    cara: 'Blok teks lalu pilih menu ini.',
    tahu: 'Sintaks markdown-nya `teks` (backtick). Berbeda dari Blok kode yang memakan satu baris penuh.'
  },
  clear: {
    nama: 'Hapus format',
    apa: 'Merontokkan semua format pada teks: tebal, miring, sorot, coret, kode.',
    cara: 'Blok teks lalu pilih. Tanpa memblok apa pun, seluruh blok dikembalikan jadi paragraf polos.',
    tahu: 'Tanpa seleksi, indent dan checkbox to-do ikut dibersihkan. Berguna kalau format terasa nyangkut.'
  },

  /* ── gaya paragraf ── */
  p: {
    nama: 'Teks biasa',
    apa: 'Mengembalikan blok jadi paragraf biasa.',
    cara: 'Taruh kursor di blok mana pun lalu pilih.',
    tahu: 'Menekan Backspace di awal blok berformat juga mengembalikannya jadi paragraf.'
  },
  h: {
    nama: 'Heading 1',
    apa: 'Judul terbesar, untuk bagian utama catatan.',
    cara: 'Taruh kursor di blok lalu pilih, atau ketik "# " di awal baris.',
    tahu: 'Menekan Enter di akhir heading otomatis membuat paragraf biasa, bukan heading lagi.'
  },
  h2: {
    nama: 'Heading 2',
    apa: 'Judul tingkat kedua, untuk sub-bagian.',
    cara: 'Ketik "## " di awal baris, atau pilih dari menu ini.',
    tahu: 'Memakai huruf serif seperti H1, tapi lebih kecil.'
  },
  h3: {
    nama: 'Heading 3',
    apa: 'Judul tingkat ketiga, untuk rincian di dalam sub-bagian.',
    cara: 'Ketik "### " di awal baris, atau pilih dari menu ini.',
    tahu: 'Sengaja memakai huruf sans-serif tebal supaya beda jelas dari H1 dan H2.'
  },
  quote: {
    nama: 'Kutipan',
    apa: 'Menandai teks sebagai kutipan, dengan garis di sisi kiri.',
    cara: 'Ketik "> " di awal baris, atau pilih dari menu ini.',
    tahu: 'Untuk kotak berwarna dengan label, pakai Callout.'
  },
  code: {
    nama: 'Blok kode',
    apa: 'Blok monospace untuk kode beberapa baris. Spasi dan baris dipertahankan apa adanya.',
    cara: 'Ketik "```" lalu Enter, atau pilih dari menu ini.',
    tahu: 'Markdown otomatis tidak berlaku di dalamnya — menulis **teks** di sini tetap tampil apa adanya.'
  },
  cal: {
    nama: 'Callout',
    apa: 'Kotak penekanan berwarna dengan label, untuk catatan penting atau peringatan.',
    cara: 'Pilih menu ini, lalu tentukan jenisnya: Info, Tip, Peringatan, atau Bahaya.',
    tahu: 'Bisa juga diketik langsung: "> [!tip] ". Tiap jenis punya warna sendiri.'
  },

  /* ── daftar ── */
  li: {
    nama: 'Daftar',
    apa: 'Daftar bertitik untuk butir yang urutannya tidak penting.',
    cara: 'Ketik "- " di awal baris, atau pilih dari menu ini.',
    tahu: 'Enter membuat butir baru. Enter pada butir kosong keluar dari daftar.'
  },
  ol: {
    nama: 'Daftar bernomor',
    apa: 'Daftar bernomor untuk langkah atau urutan yang penting.',
    cara: 'Ketik "1. " di awal baris, atau pilih dari menu ini.',
    tahu: 'Nomor dihitung ulang otomatis. Menyisipkan atau menghapus butir di tengah tidak merusak urutan, dan daftar yang terputus paragraf lain mulai lagi dari 1.'
  },
  todo: {
    nama: 'To-do',
    apa: 'Daftar centang untuk tugas yang bisa ditandai selesai.',
    cara: 'Ketik "- [ ] " di awal baris, atau pilih dari menu ini. Ketuk lingkarannya untuk mencentang.',
    tahu: 'Teks yang sudah dicentang otomatis dicoret dan diredupkan.'
  },

  /* ── sisipkan ── */
  wl: {
    nama: 'Tautan catatan',
    apa: 'Menautkan ke catatan lain di dalam Hara.',
    cara: 'Pilih menu ini lalu pilih catatan tujuan, atau ketik [[ untuk memunculkan daftar.',
    tahu: 'Menautkan ke nama yang belum ada catatannya akan tampil putus-putus — ketuk untuk membuatnya.'
  },
  link: {
    nama: 'Tautan web',
    apa: 'Menautkan teks ke alamat internet.',
    cara: 'Blok teks lalu ketuk. Isi alamatnya, teks yang tampil terisi otomatis.',
    tahu: 'Alamat dirapikan sendiri: "hara.app" jadi https://, dan "a@b.com" jadi mailto:. Taruh kursor di dalam tautan untuk mengubah atau melepasnya.'
  },
  img: {
    nama: 'Gambar',
    apa: 'Menyisipkan gambar dari perangkat ke dalam catatan.',
    cara: 'Pilih menu ini lalu pilih berkasnya. Arahkan ke gambar untuk memunculkan tombol hapus.',
    tahu: 'Foto besar dikecilkan otomatis ke maksimal 1600 px agar hemat ruang. Gambar disimpan terpisah di perangkat, bukan di dalam teks catatan, jadi catatan tetap ringan.'
  },
  tag: {
    nama: 'Tag',
    apa: 'Menandai catatan dengan kata kunci untuk dikelompokkan.',
    cara: 'Pilih menu ini, atau ketik # diikuti nama tag.',
    tahu: 'Tag bisa bersarang dengan garis miring, misalnya #proyek/hara.'
  },
  ref: {
    nama: 'Tandai blok',
    apa: 'Memberi id pada satu blok supaya bisa dirujuk dari catatan lain.',
    cara: 'Taruh kursor di blok lalu pilih. Rujukan langsung disalin ke papan klip.',
    tahu: 'Hasilnya berbentuk [[Judul#^a3f2]]. Pilih sekali lagi untuk melepas tandanya. Id-nya dijamin tidak kembar di seluruh catatan.'
  },
  hr: {
    nama: 'Pembatas',
    apa: 'Garis mendatar untuk memisahkan bagian catatan.',
    cara: 'Pilih menu ini. Blok teks baru otomatis dibuat setelahnya.',
    tahu: 'Garisnya bukan teks, jadi tidak ikut terhitung di jumlah huruf.'
  },
  date: {
    nama: 'Tanggal',
    apa: 'Menyisipkan tanggal hari ini sebagai teks.',
    cara: 'Taruh kursor di tempat yang diinginkan lalu pilih.',
    tahu: 'Formatnya bahasa Indonesia lengkap dengan nama hari, misalnya "Minggu, 6 September 2026".'
  },

  /* ── atur letak ── */
  in: {
    nama: 'Tambah indent',
    apa: 'Menggeser blok ke kanan untuk membuat tingkatan.',
    cara: 'Taruh kursor di blok lalu pilih, atau tekan Tab.',
    tahu: 'Sekali geser 24 piksel dan bisa ditumpuk. Berguna membuat daftar bertingkat.'
  },
  out: {
    nama: 'Kurangi indent',
    apa: 'Menggeser blok kembali ke kiri.',
    cara: 'Taruh kursor di blok lalu pilih, atau tekan Shift+Tab.',
    tahu: 'Berhenti sendiri saat blok sudah rata kiri.'
  },
  up: {
    nama: 'Naikkan blok',
    apa: 'Menukar posisi blok dengan blok di atasnya.',
    cara: 'Taruh kursor di blok lalu pilih.',
    tahu: 'Kursor ikut berpindah bersama bloknya, jadi bisa ditekan berkali-kali untuk memindahkan jauh.'
  },
  down: {
    nama: 'Turunkan blok',
    apa: 'Menukar posisi blok dengan blok di bawahnya.',
    cara: 'Taruh kursor di blok lalu pilih.',
    tahu: 'Jauh lebih ringkas daripada seleksi–potong–tempel, terutama di layar sentuh.'
  },
};

/* Penjelasan tiap kelompok, muncul di kepala menunya. */
export const HELP_GRUP = {
  huruf:  'Mengganti jenis huruf. Pilihan berlaku untuk teks yang diketik setelahnya; blok teks dulu untuk mengubah tulisan yang sudah ada. Font yang tidak ada di perangkat ditandai dan tidak akan tampil berbeda.',
  gaya:   'Mengubah peran satu blok: judul, kutipan, kode, atau callout. Berlaku ke seluruh blok tempat kursor berada.',
  tandai: 'Memberi penanda pada potongan teks yang diblok. Bisa ditumpuk, dan dilepas dengan memilih ulang.',
  daftar: 'Mengubah blok jadi daftar. Enter membuat butir baru, Enter pada butir kosong keluar dari daftar.',
  sisip:  'Menambahkan sesuatu yang baru di posisi kursor.',
  susun:  'Memindahkan blok tanpa perlu potong-tempel.',
};
