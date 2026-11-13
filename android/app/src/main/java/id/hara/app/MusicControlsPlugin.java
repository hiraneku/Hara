package id.hara.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
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
    private BroadcastReceiver noisyReceiver;
    private boolean noisyReceiverRegistered = false;
    private boolean playbackServiceRunning = false;
    private String serviceTitle = "";
    private String serviceArtist = "";
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private volatile boolean keepFocusDuringTransient = false;
    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        String state = change == AudioManager.AUDIOFOCUS_GAIN ? "gain"
            : change == AudioManager.AUDIOFOCUS_LOSS ? "loss"
            : change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ? "transient"
            : change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK ? "duck" : "unknown";
        if ("transient".equals(state) || "duck".equals(state)) keepFocusDuringTransient = true;
        else keepFocusDuringTransient = false;
        notifyListeners("audioFocus", new JSObject().put("state", state));
    };

    private boolean requestFocusInternal() {
        if (audioManager == null) audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            if (audioFocusRequest == null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(focusListener)
                    .setWillPauseWhenDucked(true)
                    .build();
            }
            return audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
        return audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
            == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void abandonFocusInternal() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= 26 && audioFocusRequest != null) audioManager.abandonAudioFocusRequest(audioFocusRequest);
        else audioManager.abandonAudioFocus(focusListener);
    }

    private void listenForNoisyAudio() {
        if (noisyReceiverRegistered) return;
        noisyReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                    keepFocusDuringTransient = false;
                    notifyListeners("audioFocus", new JSObject().put("state", "noisy"));
                }
            }
        };
        IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        if (Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(noisyReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else getContext().registerReceiver(noisyReceiver, filter);
        noisyReceiverRegistered = true;
    }

    @Override
    public void handleOnDestroy() {
        if (noisyReceiverRegistered && noisyReceiver != null) {
            try { getContext().unregisterReceiver(noisyReceiver); } catch (IllegalArgumentException ignored) {}
            noisyReceiverRegistered = false;
        }
        abandonFocusInternal();
        MusicPlaybackService.stop(getContext());
        if (session != null) { session.release(); session = null; }
        super.handleOnDestroy();
    }

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
    public void requestAudioFocus(PluginCall call) {
        boolean granted = requestFocusInternal();
        call.resolve(new JSObject().put("granted", granted));
    }

    @PluginMethod
    public void abandonAudioFocus(PluginCall call) {
        abandonFocusInternal();
        call.resolve();
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
            if ("playing".equals(state)) {
                listenForNoisyAudio();
                if (!playbackServiceRunning || !title.equals(serviceTitle) || !artist.equals(serviceArtist)) {
                    MusicPlaybackService.start(getContext(), title, artist);
                    playbackServiceRunning = true;
                    serviceTitle = title;
                    serviceArtist = artist;
                }
                if (!requestFocusInternal()) notifyListeners("audioFocus", new JSObject().put("state", "denied"));
            } else {
                if (!keepFocusDuringTransient) {
                    abandonFocusInternal();
                    if (playbackServiceRunning) MusicPlaybackService.stop(getContext());
                    playbackServiceRunning = false;
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Kontrol media Android tidak dapat diperbarui", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            keepFocusDuringTransient = false;
            abandonFocusInternal();
            if (playbackServiceRunning) MusicPlaybackService.stop(getContext());
            playbackServiceRunning = false;
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
