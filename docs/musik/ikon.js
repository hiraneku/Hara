/* Ikon SVG garis untuk pemutar musik (24×24, mengikuti warna teks). */

const JALUR = {
  play: '<path d="M7 4.6v14.8c0 .8.9 1.3 1.6.8l11-7.4a1 1 0 0 0 0-1.6l-11-7.4C7.9 3.3 7 3.8 7 4.6z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
  prev: '<path d="M6 5.5v13"/><path d="M19 6.2v11.6c0 .8-.9 1.3-1.6.8L9.2 13.2a1 1 0 0 1 0-1.6l8.2-5.4c.7-.5 1.6 0 1.6.8z" fill="currentColor"/>',
  next: '<path d="M18 5.5v13"/><path d="M5 6.2v11.6c0 .8.9 1.3 1.6.8l8.2-5.4a1 1 0 0 0 0-1.6L6.6 5.4C5.9 4.9 5 5.4 5 6.2z" fill="currentColor"/>',
  mundur: '<path d="M11 6.5 4.5 12l6.5 5.5z" fill="currentColor"/><path d="M19.5 6.5 13 12l6.5 5.5z" fill="currentColor"/>',
  maju: '<path d="M4.5 6.5 11 12l-6.5 5.5z" fill="currentColor"/><path d="M12.5 6.5 19 12l-6.5 5.5z" fill="currentColor"/>',
  loop: '<path d="M17 2.8l3 3-3 3"/><path d="M3 11.5V10a3.5 3.5 0 0 1 3.5-3.5H20"/><path d="M7 21.2l-3-3 3-3"/><path d="M21 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4"/>',
  reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9h4.5"/>',
  ekspor: '<path d="M12 3.5v11.5"/><path d="m7.2 10.4 4.8 4.8 4.8-4.8"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  acak: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
  impor: '<path d="M12 15.5V3.5"/><path d="m7.2 8.3 4.8-4.8 4.8 4.8"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V4.8h5V7"/><path d="M6.2 7l1 12.2A1.8 1.8 0 0 0 9 20.9h6a1.8 1.8 0 0 0 1.8-1.7L17.8 7"/>',
  nota: '<path d="M9 18V5.2l11-2v12.8"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  acakOff: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/><path d="M3 3l18 18"/>',
  random: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/>',
  daftarAcak: '<path d="M3.5 7h8M3.5 12h8M3.5 17h8"/><path d="M15 7h1.5c1.2 0 1.9.6 2.6 1.6l.4.6"/><path d="M15 17h1.5c1.2 0 1.9-.6 2.6-1.6l.4-.6"/><path d="m18.5 4.5 2 2.5-2 2.5"/><path d="m18.5 14.5 2 2.5-2 2.5"/>',
  pintar: '<path d="M10 4.5l1.6 3.9 3.9 1.6-3.9 1.6L10 15.5l-1.6-3.9L4.5 10l3.9-1.6z"/><path d="M18 14v6M15 17h6"/>',
  acakUlang: '<path d="M4 9.5V8a3 3 0 0 1 3-3h11"/><path d="m15.5 2.5 2.5 2.5-2.5 2.5"/><path d="M20 14.5V16a3 3 0 0 1-3 3H6"/><path d="m8.5 21.5-2.5-2.5 2.5-2.5"/><path d="M10 10l4 4M14 10l-4 4"/>',
  urut: '<path d="M4 5.5v13c0 .8.9 1.3 1.6.8l8.6-6.5a1 1 0 0 0 0-1.6L5.6 4.7C4.9 4.2 4 4.7 4 5.5z" fill="currentColor" stroke="none"/><path d="M20.5 5v14"/>',
  satu: '<path d="M4 9.5V8a3 3 0 0 1 3-3h11"/><path d="m15.5 2.5 2.5 2.5-2.5 2.5"/><path d="M20 14.5V16a3 3 0 0 1-3 3H6"/><path d="m8.5 21.5-2.5-2.5 2.5-2.5"/><path d="M11.2 10.2 12.3 9.5v5.2"/>',
  semua: '<path d="M4 9.5V8a3 3 0 0 1 3-3h11"/><path d="m15.5 2.5 2.5 2.5-2.5 2.5"/><path d="M20 14.5V16a3 3 0 0 1-3 3H6"/><path d="m8.5 21.5-2.5-2.5 2.5-2.5"/>',
  antrean: '<path d="M3 6.5h11M3 12h11M3 17.5h6"/><path d="M16 14.5v6.5l5.2-3.25z" fill="currentColor"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  cari: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  sliders: '<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h12"/><path d="M20 18h0"/><circle cx="18" cy="18" r="2"/>',
  repeat: '<path d="M4 9.5V8a3 3 0 0 1 3-3h11"/><path d="m15.5 2.5 2.5 2.5-2.5 2.5"/><path d="M20 14.5V16a3 3 0 0 1-3 3H6"/><path d="m8.5 21.5-2.5-2.5 2.5-2.5"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  sampul: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="12" cy="12" r="3.2"/>',
  cek: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-4.8"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/>',
  eq: '<path d="M6 4v16M12 4v16M18 4v16"/><circle cx="6" cy="15" r="2.2" fill="currentColor"/><circle cx="12" cy="8" r="2.2" fill="currentColor"/><circle cx="18" cy="12" r="2.2" fill="currentColor"/>',
  pindahAtas: '<path d="m6 14 6-6 6 6"/>',
  pindahBawah: '<path d="m6 10 6 6 6-6"/>',
};

export function ikon(nama, kelas = '') {
  const isi = JALUR[nama] || '';
  return `<svg class="mus-ico ${kelas}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${isi}</svg>`;
}
