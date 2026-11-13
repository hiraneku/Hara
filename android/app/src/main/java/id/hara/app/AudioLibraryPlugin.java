package id.hara.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Semua audio di MediaStore, ditambah WebM/WebA yang diindeks sebagai video. */
@CapacitorPlugin(
    name = "AudioLibrary",
    permissions = {
        @Permission(alias = "media", strings = {
            Manifest.permission.READ_MEDIA_AUDIO,
            Manifest.permission.READ_MEDIA_VIDEO
        }),
        @Permission(alias = "legacyMedia", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public final class AudioLibraryPlugin extends Plugin {

    private boolean punyaIzinAudio() {
        String izin = Build.VERSION.SDK_INT >= 33
            ? Manifest.permission.READ_MEDIA_AUDIO
            : Manifest.permission.READ_EXTERNAL_STORAGE;
        return ContextCompat.checkSelfPermission(getContext(), izin) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean punyaIzinVideo() {
        if (Build.VERSION.SDK_INT < 33) return punyaIzinAudio();
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject statusIzin() {
        boolean audio = punyaIzinAudio();
        boolean video = punyaIzinVideo();
        return new JSObject().put("granted", audio || video).put("audioGranted", audio).put("videoGranted", video);
    }

    @PluginMethod
    public void checkAccess(PluginCall call) {
        call.resolve(statusIzin());
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (punyaIzinAudio() && punyaIzinVideo()) {
                call.resolve(statusIzin());
                return;
            }
            requestPermissionForAlias("media", call, "selesaiMintaAkses");
        } else {
            if (punyaIzinAudio()) {
                call.resolve(statusIzin());
                return;
            }
            requestPermissionForAlias("legacyMedia", call, "selesaiMintaAkses");
        }
    }

    @PermissionCallback
    private void selesaiMintaAkses(PluginCall call) {
        call.resolve(statusIzin());
    }

    @PluginMethod
    public void listAudio(PluginCall call) {
        boolean audioGranted = punyaIzinAudio();
        boolean videoGranted = punyaIzinVideo();
        if (!audioGranted && !videoGranted) {
            call.resolve(new JSObject().put("granted", false).put("audioGranted", false)
                .put("videoGranted", false).put("songs", new JSArray()));
            return;
        }

        JSArray songs = new JSArray();
        Context context = getContext();
        try {
            if (audioGranted) bacaKoleksiAudio(context, songs);
            if (videoGranted) bacaWebmPerangkat(context, songs);
            call.resolve(new JSObject().put("granted", true).put("audioGranted", audioGranted)
                .put("videoGranted", videoGranted).put("songs", songs));
        } catch (Exception e) {
            call.reject("Tidak dapat membaca pustaka audio perangkat", e);
        }
    }

    private void bacaKoleksiAudio(Context context, JSArray songs) throws Exception {
        Uri koleksi = Build.VERSION.SDK_INT >= 29
            ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String[] kolom = kolomAudio();
        try (Cursor c = context.getContentResolver().query(
            koleksi, kolom, null, null, MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC")) {
            if (c == null) return;
            int idI = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            int judulI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
            int namaI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
            int artisI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
            int albumI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
            int durasiI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
            int ukuranI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
            int mimeI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
            int ditambahI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED);
            int albumIdI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID);
            int lokasiI = Build.VERSION.SDK_INT >= 29
                ? c.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH) : -1;

            while (c.moveToNext()) {
                long id = c.getLong(idI);
                String nama = c.isNull(namaI) ? "" : c.getString(namaI);
                String judul = c.isNull(judulI) ? "" : c.getString(judulI);
                if (judul.trim().isEmpty()) judul = nama;
                JSObject lagu = buatLagu(
                    "audio:" + id, ContentUris.withAppendedId(koleksi, id), judul, nama,
                    c.isNull(artisI) ? "" : c.getString(artisI),
                    c.isNull(albumI) ? "" : c.getString(albumI),
                    c.isNull(durasiI) ? 0 : c.getLong(durasiI),
                    c.isNull(ukuranI) ? 0 : c.getLong(ukuranI),
                    c.isNull(mimeI) ? "audio/*" : c.getString(mimeI),
                    c.isNull(ditambahI) ? 0 : c.getLong(ditambahI),
                    c.isNull(albumIdI) ? 0 : c.getLong(albumIdI),
                    lokasiI >= 0 && !c.isNull(lokasiI) ? c.getString(lokasiI) : ""
                );
                songs.put(lagu);
            }
        }
    }

    /* Android sering mengindeks .webm/.weba pada koleksi video, bukan audio.
       Ambil wadah WebM/WebA saja agar video biasa tidak memenuhi pustaka Musik. */
    private void bacaWebmPerangkat(Context context, JSArray songs) throws Exception {
        Uri koleksi = Build.VERSION.SDK_INT >= 29
            ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            : MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        String[] kolom = kolomVideo();
        try (Cursor c = context.getContentResolver().query(
            koleksi, kolom, null, null, MediaStore.Video.Media.TITLE + " COLLATE NOCASE ASC")) {
            if (c == null) return;
            int idI = c.getColumnIndexOrThrow(MediaStore.Video.Media._ID);
            int judulI = c.getColumnIndexOrThrow(MediaStore.Video.Media.TITLE);
            int namaI = c.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME);
            int durasiI = c.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION);
            int ukuranI = c.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE);
            int mimeI = c.getColumnIndexOrThrow(MediaStore.Video.Media.MIME_TYPE);
            int ditambahI = c.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_ADDED);
            int lokasiI = Build.VERSION.SDK_INT >= 29
                ? c.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH) : -1;

            while (c.moveToNext()) {
                String nama = c.isNull(namaI) ? "" : c.getString(namaI);
                String mime = c.isNull(mimeI) ? "" : c.getString(mimeI);
                if (!wadahWebm(mime, nama)) continue;
                long id = c.getLong(idI);
                String judul = c.isNull(judulI) ? "" : c.getString(judulI);
                if (judul.trim().isEmpty()) judul = nama;
                songs.put(buatLagu(
                    "video:" + id, ContentUris.withAppendedId(koleksi, id), judul, nama,
                    "", "WebM", c.isNull(durasiI) ? 0 : c.getLong(durasiI),
                    c.isNull(ukuranI) ? 0 : c.getLong(ukuranI), mime.isEmpty() ? "video/webm" : mime,
                    c.isNull(ditambahI) ? 0 : c.getLong(ditambahI), 0,
                    lokasiI >= 0 && !c.isNull(lokasiI) ? c.getString(lokasiI) : ""
                ));
            }
        }
    }

    private boolean wadahWebm(String mime, String nama) {
        String tipe = mime == null ? "" : mime.toLowerCase(java.util.Locale.ROOT);
        String file = nama == null ? "" : nama.toLowerCase(java.util.Locale.ROOT);
        return tipe.equals("video/webm") || tipe.equals("audio/webm") || tipe.equals("audio/x-matroska")
            || file.endsWith(".webm") || file.endsWith(".weba") || file.endsWith(".mka");
    }

    private JSObject buatLagu(String id, Uri uri, String judul, String nama, String artis, String album,
        long durasi, long ukuran, String mime, long ditambah, long albumId, String lokasi) {
        return new JSObject()
            .put("id", id)
            .put("uri", uri.toString())
            .put("title", judul)
            .put("displayName", nama)
            .put("artist", artis)
            .put("album", album)
            .put("duration", durasi)
            .put("size", ukuran)
            .put("mimeType", mime)
            .put("dateAdded", ditambah)
            .put("albumId", albumId)
            .put("location", lokasi);
    }

    private String[] kolomAudio() {
        if (Build.VERSION.SDK_INT >= 29) {
            return new String[] {
                MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.DISPLAY_NAME, MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM, MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE, MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DATE_ADDED, MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.MediaColumns.RELATIVE_PATH
            };
        }
        return new String[] {
            MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.DISPLAY_NAME, MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM, MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE, MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.DATE_ADDED, MediaStore.Audio.Media.ALBUM_ID
        };
    }

    private String[] kolomVideo() {
        if (Build.VERSION.SDK_INT >= 29) {
            return new String[] {
                MediaStore.Video.Media._ID, MediaStore.Video.Media.TITLE,
                MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION,
                MediaStore.Video.Media.SIZE, MediaStore.Video.Media.MIME_TYPE,
                MediaStore.Video.Media.DATE_ADDED, MediaStore.MediaColumns.RELATIVE_PATH
            };
        }
        return new String[] {
            MediaStore.Video.Media._ID, MediaStore.Video.Media.TITLE,
            MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.SIZE, MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.DATE_ADDED
        };
    }
}
