package com.quickpress.partner;

import android.os.Bundle;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  var evt = new CustomEvent('qp:android-back', { cancelable: true });" +
                        "  var notCancelled = window.dispatchEvent(evt);" +
                        "  if (notCancelled) {" +
                        "    var path = window.location.pathname;" +
                        "    if (path === '/' || path === '/dashboard' || path === '/auth') {" +
                        "      return 'EXIT';" +
                        "    } else {" +
                        "      window.history.back();" +
                        "      return 'NAVIGATED_BACK';" +
                        "    }" +
                        "  }" +
                        "  return 'HANDLED';" +
                        "})()",
                        value -> {
                            if ("\"EXIT\"".equals(value)) {
                                if (System.currentTimeMillis() - lastBackPressTime < 2000) {
                                    finish();
                                } else {
                                    lastBackPressTime = System.currentTimeMillis();
                                    Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                                }
                            }
                        }
                    );
                } else {
                    finish();
                }
            }
        });
    }
}
