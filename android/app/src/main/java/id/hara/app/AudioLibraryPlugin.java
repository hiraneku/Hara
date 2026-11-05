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
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Membaca semua audio yang diindeks MediaStore, tanpa filter IS_MUSIC.
 *  WebView hanya menerima metadata dan content:// URI; berkas audio dibaca
 *  melalui pemetaan content URI milik Capacitor saat benar-benar diputar. */
@CapacitorPlugin(
    name = "AudioLibrary",
    permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "legacyAudio", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public final class AudioLibraryPlugin extends Plugin {

    private String aliasAkses() {
        return Build.VERSION.SDK_INT >= 33 ? "audio" : "legacyAudio";
    }

    private String izinAkses() {
        return Build.VERSION.SDK_INT >= 33
            ? Manifest.permission.READ_MEDIA_AUDIO
            : Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private boolean punyaIzin() {
        return ContextCompat.checkSelfPermission(getContext(), izinAkses()) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void checkAccess(PluginCall call) {
        call.resolve(new JSObject().put("granted", punyaIzin()));
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (punyaIzin()) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }
        requestPermissionForAlias(aliasAkses(), call, "selesaiMintaAkses");
    }

    @PermissionCallback
    private void selesaiMintaAkses(PluginCall call) {
        call.resolve(new JSObject().put("granted", punyaIzin()));
    }

    @PluginMethod
    public void listAudio(PluginCall call) {
        if (!punyaIzin()) {
            call.resolve(new JSObject().put("granted", false).put("songs", new JSArray()));
            return;
        }

        Uri koleksi = Build.VERSION.SDK_INT >= 29
            ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String[] kolom = kolomAudio();
        JSArray songs = new JSArray();
        Context context = getContext();

        try (Cursor c = context.getContentResolver().query(
            koleksi,
            kolom,
            null,       // Tidak membatasi IS_MUSIC: semua baris audio MediaStore disertakan.
            null,
            MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC"
        )) {
            if (c != null) {
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
                    ? c.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
                    : -1;

                while (c.moveToNext()) {
                    long id = c.getLong(idI);
                    Uri uri = ContentUris.withAppendedId(koleksi, id);
                    String nama = c.isNull(namaI) ? "" : c.getString(namaI);
                    String judul = c.isNull(judulI) ? "" : c.getString(judulI);
                    if (judul.trim().isEmpty()) judul = nama;

                    JSObject lagu = new JSObject();
                    lagu.put("id", Long.toString(id));
                    lagu.put("uri", uri.toString());
                    lagu.put("title", judul);
                    lagu.put("displayName", nama);
                    lagu.put("artist", c.isNull(artisI) ? "" : c.getString(artisI));
                    lagu.put("album", c.isNull(albumI) ? "" : c.getString(albumI));
                    lagu.put("duration", c.isNull(durasiI) ? 0 : c.getLong(durasiI));
                    lagu.put("size", c.isNull(ukuranI) ? 0 : c.getLong(ukuranI));
                    lagu.put("mimeType", c.isNull(mimeI) ? "audio/*" : c.getString(mimeI));
                    lagu.put("dateAdded", c.isNull(ditambahI) ? 0 : c.getLong(ditambahI));
                    lagu.put("albumId", c.isNull(albumIdI) ? 0 : c.getLong(albumIdI));
                    lagu.put("location", lokasiI >= 0 && !c.isNull(lokasiI) ? c.getString(lokasiI) : "");
                    songs.put(lagu);
                }
            }
            call.resolve(new JSObject().put("granted", true).put("songs", songs));
        } catch (Exception e) {
            call.reject("Tidak dapat membaca pustaka audio perangkat", e);
        }
    }

    private String[] kolomAudio() {
        if (Build.VERSION.SDK_INT >= 29) {
            return new String[] {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.MediaColumns.RELATIVE_PATH
            };
        }
        return new String[] {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.DATE_ADDED,
            MediaStore.Audio.Media.ALBUM_ID
        };
    }
}
