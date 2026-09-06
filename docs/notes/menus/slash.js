/* Menu "/" — sisipkan blok. */
const SLASH=[['i-txt','Teks','','b-p'],['i-hash','Heading 1','#','b-h1'],['i-hash','Heading 2','##','b-h2'],
  ['i-hash','Heading 3','###','b-h3'],
  ['i-check2','To-do','- [ ]','b-todo'],['i-quote','Kutipan','>','b-quote'],['i-code','Kode','```','b-code'],
  ['i-txt','Daftar','-','b-li'],['i-listol','Daftar bernomor','1.','b-ol'],
  ['i-info','Callout','> [!]','b-cal'],['i-cal','Tanggal hari ini','','date'],
  ['i-txt','Pembatas','---','hr']];

export const slashMenu = () =>
  `<div class="pop-h">Sisipkan blok</div>` +
  SLASH.map(([i, n, k, c]) =>
    `<button class="pop-i" data-blk="${c}"><svg class="ico"><use href="#${i}"/></svg>${n}<span class="k">${k}</span></button>`
  ).join('');
