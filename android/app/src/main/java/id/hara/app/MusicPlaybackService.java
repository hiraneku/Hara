package id.hara.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/** Keeps the WebView audio process eligible for background media playback. */
public final class MusicPlaybackService extends Service {
    public static final String ACTION_START = "id.hara.app.music.START";
    public static final String ACTION_STOP = "id.hara.app.music.STOP";
    private static final String CHANNEL = "hara_music_playback";
    private static final int NOTIFICATION_ID = 8202;

    public static void start(Context context, String title, String artist) {
        Intent intent = new Intent(context, MusicPlaybackService.class).setAction(ACTION_START)
            .putExtra("title", title).putExtra("artist", artist);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, MusicPlaybackService.class));
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
            else stopForeground(true);
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        createChannel();
        String title = intent == null ? "Musik" : intent.getStringExtra("title");
        String artist = intent == null ? "Hara" : intent.getStringExtra("artist");
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pending = launch == null ? null : PendingIntent.getActivity(this, 8202, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        Notification notification = builder.setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title == null || title.isEmpty() ? "Musik" : title)
            .setContentText(artist == null || artist.isEmpty() ? "Hara" : artist)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setOngoing(true)
            .setContentIntent(pending)
            .build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIFICATION_ID, notification);
        return START_NOT_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL) != null) return;
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Pemutaran Musik", NotificationManager.IMPORTANCE_LOW));
    }
}
