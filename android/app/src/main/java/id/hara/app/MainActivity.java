package id.hara.app;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Isi aplikasi dimuat dari https://hiraneku.github.io/Hara/ . Tanpa ini WebView
        // menyimpan salinan lama (cache HTTP), jadi pembaruan tidak langsung terlihat.
        // Hanya cache HTTP yang dibersihkan; catatan (localStorage/IndexedDB) tetap aman.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().clearCache(true);
            getBridge().getWebView().getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        }
    }
}
