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
  impor: '<path d="M12 15.5V3.5"/><path d="m7.2 8.3 4.8-4.8 4.8 4.8"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V4.8h5V7"/><path d="M6.2 7l1 12.2A1.8 1.8 0 0 0 9 20.9h6a1.8 1.8 0 0 0 1.8-1.7L17.8 7"/>',
  nota: '<path d="M9 18V5.2l11-2v12.8"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  cari: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
};

export function ikon(nama, kelas = '') {
  const isi = JALUR[nama] || '';
  return `<svg class="mus-ico ${kelas}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${isi}</svg>`;
}
