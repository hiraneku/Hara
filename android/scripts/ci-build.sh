#!/usr/bin/env bash
# Dijalankan oleh .github/workflows/apk.yml. Semua logika build ada di sini
# supaya file workflow tidak perlu diubah lagi di GitHub.
set -o pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${RUNNER_TEMP:-/tmp}/hara-out"
mkdir -p "$OUT"
LOG="$OUT/build-log.txt"
: > "$LOG"

RILIS_URL="https://github.com/hiraneku/Hara/releases/download/web-latest"

echo "== Versi isi ==" | tee -a "$LOG"
VERSI="$(echo "${GITHUB_SHA:-local}" | cut -c1-7)-${GITHUB_RUN_NUMBER:-0}"
printf '{"versi":"%s","dibuat":"%s","url":"%s/hara-web.zip"}\n' \
  "$VERSI" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$RILIS_URL" > "$ROOT/docs/version.json"
echo "versi: $VERSI" | tee -a "$LOG"
# Salin ulang docs/ (termasuk version.json) ke proyek Android.
npx cap sync android 2>&1 | tee -a "$LOG"

echo "== Keystore ==" | tee -a "$LOG"
if [ -n "${HARA_SEED:-}" ]; then
  FORGE="${RUNNER_TEMP:-/tmp}/forge"
  mkdir -p "$FORGE"
  (cd "$FORGE" && npm init -y >/dev/null && npm install --no-audit --no-fund node-forge@1.3.1 >/dev/null) 2>&1 | tee -a "$LOG"
  FORGE_DIR="$FORGE" node "$ROOT/android/scripts/buat-kunci.cjs" "$OUT/hara.p12" 2>&1 | tee -a "$LOG"
  test -s "$OUT/hara.p12" || { echo "Keystore gagal dibuat"; exit 1; }
  export HARA_KS_PATH="$OUT/hara.p12"
  export HARA_KS_PASS="$(echo -n "pw:$HARA_SEED" | sha256sum | cut -c1-64)"
  export HARA_KEY_PASS="$HARA_KS_PASS"
  export HARA_KEY_ALIAS=hara
  echo "Signing: keystore tetap" | tee -a "$LOG"
else
  echo "::warning::Secret HARA_SEED belum diisi. APK ditandatangani debug dan TIDAK bisa diperbarui di atas instalasi sebelumnya." | tee -a "$LOG"
fi

export HARA_VERSION_CODE="${GITHUB_RUN_NUMBER:-1}"
export HARA_VERSION_NAME="1.0.${GITHUB_RUN_NUMBER:-1}"

echo "== Gradle ==" | tee -a "$LOG"
cd "$ROOT/android"
chmod +x gradlew
if [ -n "${HARA_KS_PATH:-}" ]; then
  TASK=assembleRelease; APK=app/build/outputs/apk/release/app-release.apk
else
  TASK=assembleDebug; APK=app/build/outputs/apk/debug/app-debug.apk
fi
./gradlew --no-daemon --stacktrace "$TASK" 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}
if [ "$RC" -ne 0 ]; then
  echo "Gradle gagal (exit $RC). Lihat build-log.txt di artifact." | tee -a "$LOG"
  # Kirim inti error sebagai anotasi supaya bisa dibaca lewat API GitHub.
  DETAIL="$(grep -n -E -A12 'What went wrong|FAILURE: Build failed|error:|Caused by' "$LOG" | head -60 | tr -d '\r' | sed -e 's/%/%25/g' | awk '{printf "%s%%0A", $0}')"
  echo "::error title=Gradle gagal::${DETAIL:-lihat log}"
  exit "$RC"
fi

cp "$APK" "$OUT/Hara.apk"
echo "APK: $OUT/Hara.apk" | tee -a "$LOG"

# Paket isi web untuk pembaruan di dalam APK (hara-web.zip, index.html di akar).
python3 - "$ROOT/docs" "$OUT/hara-web.zip" <<'PY'
import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(src):
        for f in fs:
            p = os.path.join(d, f)
            z.write(p, os.path.relpath(p, src))
PY
cp "$ROOT/docs/version.json" "$OUT/version.json"
echo "web bundle: $(du -h "$OUT/hara-web.zip" | cut -f1)" | tee -a "$LOG"

# Rilis hanya untuk branch sesi.
if [ "${GITHUB_REF:-}" = "refs/heads/arena/c3f71ef0-hara" ] && [ -n "${GH_TOKEN:-}" ]; then
  NOTE="Dibangun dari commit ${GITHUB_SHA::7} (run #${GITHUB_RUN_NUMBER}). Dipakai APK untuk pembaruan isi di dalam aplikasi."

  TAG=apk-latest
  APK_NOTE="APK dibangun dari commit ${GITHUB_SHA::7} (run #${GITHUB_RUN_NUMBER}). Pembaruan isi aplikasi terjadi otomatis di dalam APK."
  cp "$OUT/Hara.apk" "$OUT/Hara-latest.apk"
  gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --prerelease --title "Hara APK (terbaru)" --notes "$APK_NOTE"
  gh release edit "$TAG" --notes "$APK_NOTE" --prerelease
  gh release upload "$TAG" "$OUT/Hara-latest.apk" --clobber

  # Isi web: zip dulu, baru version.json (supaya versi baru tidak muncul sebelum zip-nya ada).
  TAG=web-latest
  gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --prerelease --title "Isi web Hara (pembaruan APK)" --notes "$NOTE"
  gh release edit "$TAG" --notes "$NOTE" --prerelease
  gh release upload "$TAG" "$OUT/hara-web.zip" --clobber
  gh release upload "$TAG" "$OUT/version.json" --clobber
fi
echo "Selesai." | tee -a "$LOG"
