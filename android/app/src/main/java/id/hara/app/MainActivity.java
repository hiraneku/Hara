package id.hara.app;

import android.os.Bundle;
import android.view.ActionMode;
import android.view.Menu;
import android.view.MenuItem;
import android.view.SubMenu;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.util.LinkedHashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private static final int MENU_HARA = 0x484152;
    private static final Map<String, String> SELECTION_ACTIONS = new LinkedHashMap<>();
    static {
        SELECTION_ACTIONS.put("Tebal", "b");
        SELECTION_ACTIONS.put("Miring", "i");
        SELECTION_ACTIONS.put("Garis bawah", "u");
        SELECTION_ACTIONS.put("Coret", "strike");
        SELECTION_ACTIONS.put("Sorot", "hl");
        SELECTION_ACTIONS.put("Kode inline", "icode");
        SELECTION_ACTIONS.put("Warna teks", "warna");
        SELECTION_ACTIONS.put("Tautan web", "link");
        SELECTION_ACTIONS.put("Tape", "tape");
        SELECTION_ACTIONS.put("Jadikan kartu", "kartu");
        SELECTION_ACTIONS.put("Ubah struktur teks", "struktur");
        SELECTION_ACTIONS.put("Hapus format", "clear");
    }

    private volatile boolean selectionInsideHaraEditor = false;
    private ActionMode haraSelectionMode;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioLibraryPlugin.class);
        registerPlugin(MusicControlsPlugin.class);
        super.onCreate(savedInstanceState);
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            /* Interface ini hanya menyampaikan status seleksi; tidak menyediakan
               akses data/native action kepada JavaScript halaman. */
            bridge.getWebView().addJavascriptInterface(new HaraSelectionBridge(), "HaraNative");
        }
    }

    private final class HaraSelectionBridge {
        @JavascriptInterface
        public void setTextSelectionActive(boolean active) {
            selectionInsideHaraEditor = active;
        }
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        super.onActionModeStarted(mode);
        if (!selectionInsideHaraEditor || mode == null || mode == haraSelectionMode) return;
        Bridge bridge = getBridge();
        WebView webView = bridge == null ? null : bridge.getWebView();
        if (webView == null) return;

        haraSelectionMode = mode;
        /* Menu native asal sengaja tidak dibersihkan: Copy, Select all, Share,
           Search/Translate, dan tindakan sistem dari WebView tetap tersedia.
           Aksi Hara dimasukkan dalam satu submenu native—bukan toolbar DOM kedua. */
        SubMenu hara = mode.getMenu().addSubMenu(Menu.NONE, MENU_HARA, Menu.NONE, "Hara");
        for (Map.Entry<String, String> action : SELECTION_ACTIONS.entrySet()) {
            final String namaAksi = action.getValue();
            hara.add(Menu.NONE, MENU_HARA + hara.size() + 1, Menu.NONE, action.getKey())
                .setOnMenuItemClickListener(item -> {
                    jalankanAksiSeleksi(mode, webView, namaAksi);
                    return true;
                });
        }
        webView.evaluateJavascript(
            "window.haraSetNativeSelectionToolbar && window.haraSetNativeSelectionToolbar(true)",
            null
        );
    }

    private void jalankanAksiSeleksi(ActionMode mode, WebView webView, String action) {
        /* `action` hanya berasal dari konstanta di atas; tidak ada teks note
           atau input halaman yang disisipkan ke JavaScript. */
        webView.evaluateJavascript(
            "window.haraNativeSelectionAction && window.haraNativeSelectionAction('" + action + "')",
            result -> {
                if (haraSelectionMode == mode) mode.finish();
            }
        );
    }

    @Override
    public void onActionModeFinished(ActionMode mode) {
        if (mode == haraSelectionMode) {
            haraSelectionMode = null;
            selectionInsideHaraEditor = false;
            Bridge bridge = getBridge();
            WebView webView = bridge == null ? null : bridge.getWebView();
            if (webView != null) {
                webView.evaluateJavascript(
                    "window.haraSetNativeSelectionToolbar && window.haraSetNativeSelectionToolbar(false)",
                    null
                );
            }
        }
        super.onActionModeFinished(mode);
    }
}
