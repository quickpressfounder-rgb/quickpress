package com.quickpress.rider;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Enable Hardware Acceleration at the Window level
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // 2. Unlock Highest Supported Display Refresh Rate (90Hz / 120Hz / 144Hz)
        unlockHighRefreshRate();

        // 3. Android Back Button Interception with Double-Tap to Exit
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

    @Override
    public void onStart() {
        super.onStart();
        optimizeWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        unlockHighRefreshRate();
        optimizeWebView();
    }

    /**
     * Configures the Android display manager to run at 120Hz / highest available FPS.
     */
    private void unlockHighRefreshRate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode maxMode = null;
                float maxRate = 60.0f;
                for (Display.Mode mode : modes) {
                    if (mode.getRefreshRate() > maxRate) {
                        maxRate = mode.getRefreshRate();
                        maxMode = mode;
                    }
                }
                if (maxMode != null) {
                    WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
                    layoutParams.preferredDisplayModeId = maxMode.getModeId();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        layoutParams.preferredRefreshRate = maxRate;
                    }
                    getWindow().setAttributes(layoutParams);
                }
            } catch (Exception ignored) {
                // Device does not support dynamic mode switching
            }
        }
    }

    /**
     * Configures Android WebView for 120 FPS compositor pipeline, pre-rasterization,
     * and zero touch jitter.
     */
    private void optimizeWebView() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                // Hardware layer composition
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                // Disable bounce rubber-banding to keep 120 FPS steady
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

                WebSettings settings = webView.getSettings();
                settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);

                // Safely enable offscreen pre-rasterization via reflection if supported by Chromium engine
                try {
                    java.lang.reflect.Method m = webView.getClass().getMethod("setOffscreenPreRaster", boolean.class);
                    m.invoke(webView, true);
                } catch (Throwable ignored) {}
            }
        } catch (Exception ignored) {
            // Best effort webview tuning
        }
    }
}
