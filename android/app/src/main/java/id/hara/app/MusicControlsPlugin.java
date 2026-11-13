package id.hara.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Native Android MediaSession untuk kontrol pemutar pada shade notifikasi dan layar kunci. */
@CapacitorPlugin(name = "MusicControls")
public final class MusicControlsPlugin extends Plugin {
    private MediaSession session;

    private MediaSession sesi() {
        if (session != null) return session;
        session = new MediaSession(getContext(), "HaraMusic");
        session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { kirimAksi("play", null); }
            @Override public void onPause() { kirimAksi("pause", null); }
            @Override public void onStop() { kirimAksi("stop", null); }
            @Override public void onSkipToPrevious() { kirimAksi("previous", null); }
            @Override public void onSkipToNext() { kirimAksi("next", null); }
            @Override public void onSeekTo(long position) { kirimAksi("seekTo", position); }
            @Override public void onRewind() { kirimAksi("rewind", null); }
            @Override public void onFastForward() { kirimAksi("forward", null); }
        });

        Intent buka = getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName());
        if (buka != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pending = PendingIntent.getActivity(getContext(), 8201, buka, flags);
            session.setSessionActivity(pending);
        }
        return session;
    }

    private void kirimAksi(String action, Long positionMs) {
        JSObject data = new JSObject().put("action", action);
        if (positionMs != null) data.put("positionMs", positionMs);
        notifyListeners("mediaAction", data);
    }

    @PluginMethod
    public void update(PluginCall call) {
        try {
            MediaSession media = sesi();
            JSObject data = call.getData();
            String title = data.optString("title", "Musik");
            String artist = data.optString("artist", "Hara");
            String album = data.optString("album", "Musik");
            String state = data.optString("state", "paused");
            long durationMs = Math.max(0, data.optLong("durationMs", 0L));
            long positionMs = Math.max(0, data.optLong("positionMs", 0L));
            float playbackRate = (float) Math.max(0.1, Math.min(4.0, data.optDouble("playbackRate", 1.0)));

            media.setMetadata(new android.media.MediaMetadata.Builder().putString(android.media.MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(android.media.MediaMetadata.METADATA_KEY_ALBUM, album)
                .putString(android.media.MediaMetadata.METADATA_KEY_DISPLAY_TITLE, title)
                .putString(android.media.MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, artist)
                .putLong(android.media.MediaMetadata.METADATA_KEY_DURATION, durationMs)
                .build());

            long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_STOP | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_SEEK_TO | PlaybackState.ACTION_FAST_FORWARD | PlaybackState.ACTION_REWIND;
            int playbackState = "playing".equals(state) ? PlaybackState.STATE_PLAYING
                : "buffering".equals(state) ? PlaybackState.STATE_BUFFERING
                : PlaybackState.STATE_PAUSED;
            media.setPlaybackState(new PlaybackState.Builder()
                .setActions(actions)
                .setState(playbackState, positionMs, playbackState == PlaybackState.STATE_PLAYING ? playbackRate : 0f)
                .build());
            media.setActive(true);
            call.resolve();
        } catch (Exception e) {
            call.reject("Kontrol media Android tidak dapat diperbarui", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            if (session != null) {
                session.setPlaybackState(new PlaybackState.Builder().setState(PlaybackState.STATE_NONE, 0, 0f).build());
                session.setActive(false);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Kontrol media Android tidak dapat dihentikan", e);
        }
    }
}
