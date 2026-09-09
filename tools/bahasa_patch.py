# -*- coding: utf-8 -*-
"""Helper terjemahan ronde fitur bahasa (dijalankan dari heredoc):

    from bahasa_patch import patch_berkas, tambah_kamus, bungkus, tambah_import

- patch_berkas(berkas, {old: new})  : ganti substring persis, lapor bila tak ada.
- bungkus(berkas, {kata})           : 'Kata' atau "Kata" -> t('Kata') bila persis
                                       (tidak menyentuh yang sudah dibungkus t()).
- tambah_import(berkas, baris)      : sisipkan baris import setelah import terakhir.
- tambah_kamus({kunci: nilai})      : tambah entri EN ke docs/core/bahasa-en.js;
                                       nilai str atau {one, other} utk jamak. """

import re


def patch_berkas(berkas, pairs):
    s = open(berkas, encoding='utf-8').read()
    for old, new in pairs.items():
        if old not in s:
            print('!! TIDAK KETEMU di', berkas, ':', old[:80].replace('\n', '\\n'))
        else:
            s = s.replace(old, new)
    open(berkas, 'w', encoding='utf-8').write(s)


def bungkus(berkas, kata):
    """'X' atau "X" -> t('X') untuk X persis di daftar `kata`.
    Lookbehind (?<![\w.(']) melindungi kode (t('X') tak disentuh)."""
    s = open(berkas, encoding='utf-8').read()
    n = 0
    for k in sorted(kata, key=len, reverse=True):
        q = re.escape(k)
        pola = re.compile("(?<![\\w.('])(['\"])(" + q + ")\\1")
        esc_k = k.replace("\\", "\\\\").replace("'", "\\'")
        s, jum = pola.subn("t('" + esc_k + "')", s)
        n += jum
    open(berkas, 'w', encoding='utf-8').write(s)
    return n


def tambah_import(berkas, kode='import { t } from \'../../core/i18n.js?v=20260909041737\';'):
    s = open(berkas, encoding='utf-8').read()
    if 'from \'../../core/i18n.js' in s or 'from "../../core/i18n.js' in s:
        return
    baris = s.split('\n')
    akhir = -1
    for i, b in enumerate(baris):
        if b.startswith('import '):
            akhir = i
    baris.insert(akhir + 1, kode)
    open(berkas, 'w', encoding='utf-8').write('\n'.join(baris))


def tambah_kamus(enmap, berkas='docs/core/bahasa-en.js'):
    s = open(berkas, encoding='utf-8').read()
    idx = s.rstrip().rfind('};')
    ada = set()
    for ln in s.splitlines():
        if ':' in ln:
            k = ln.split(':', 1)[0].strip().strip("'\"")
            if k:
                ada.add(k)
    baris = []
    for k, v in enmap.items():
        if k in ada:
            continue
        if isinstance(v, dict):
            one = json_dumps(v.get('one', ''))
            other = json_dumps(v.get('other', ''))
            baris.append("  " + json_dumps(k) + ": { one: " + one + ", other: " + other + " },")
        else:
            baris.append("  " + json_dumps(k) + ": " + json_dumps(v) + ",")
    if baris:
        s = s[:idx] + '\n' + '\n'.join(baris) + '\n' + s[idx:]
    open(berkas, 'w', encoding='utf-8').write(s)


def json_dumps(v):
    import json
    return json.dumps(v, ensure_ascii=False)
