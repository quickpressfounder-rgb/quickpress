package com.quickpress.partner;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
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
import java.util.ArrayList;
import java.util.List;

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

        // 3. Request Android 13+ Notification Permission & Urgent Channels
        requestDevicePermissions();
        createNotificationChannels();

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
        // 4. API Reachability Auto-Fix for Live Railway Production
        startPeriodicApiFix();
    }

    @Override
    public void onStart() {
        super.onStart();
        optimizeWebView();
        startPeriodicApiFix();
    }

    @Override
    public void onResume() {
        super.onResume();
        unlockHighRefreshRate();
        optimizeWebView();
        startPeriodicApiFix();
    }

    private void injectApiUrlFix() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                String script = 
                    "(function() {" +
                    "  window.__QUICKPRESS_CONFIG__ = { API_BASE_URL: 'https://quickpress-api-production.up.railway.app' };" +
                    "  if (!window.__qp_fetch_patched) {" +
                    "    window.__qp_fetch_patched = true;" +
                    "    var _origFetch = window.fetch;" +
                    "    window.fetch = function(input, init) {" +
                    "      if (typeof input === 'string') {" +
                    "        input = input.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');" +
                    "        if (input.startsWith('/api/')) {" +
                    "          input = 'https://quickpress-api-production.up.railway.app' + input;" +
                    "        }" +
                    "      } else if (input && input.url) {" +
                    "        try {" +
                    "          var newUrl = input.url.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');" +
                    "          if (newUrl.startsWith('/api/')) { newUrl = 'https://quickpress-api-production.up.railway.app' + newUrl; }" +
                    "          input = new Request(newUrl, input);" +
                    "        } catch(e) {}" +
                    "      }" +
                    "      return _origFetch.call(this, input, init);" +
                    "    };" +
                    "    var _origOpen = XMLHttpRequest.prototype.open;" +
                    "    XMLHttpRequest.prototype.open = function(method, url) {" +
                    "      if (typeof url === 'string') {" +
                    "        url = url.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, 'quickpress-api-production.up.railway.app');" +
                    "        if (url.startsWith('/api/')) { url = 'https://quickpress-api-production.up.railway.app' + url; }" +
                    "      }" +
                    "      return _origOpen.apply(this, arguments);" +
                    "    };" +
                    "  }" +
                    "})();";
                webView.evaluateJavascript(script, null);
            }
        } catch (Exception ignored) {}
    }

    private void startPeriodicApiFix() {
        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        int[] delays = new int[]{50, 150, 300, 600, 1000, 1500, 2500, 4000, 6000, 9000, 15000};
        for (int delay : delays) {
            handler.postDelayed(this::injectApiUrlFix, delay);
        }
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
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

                WebSettings settings = webView.getSettings();
                settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setGeolocationEnabled(true);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

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

    private void requestDevicePermissions() {
        List<String> perms = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.POST_NOTIFICATIONS);
            }
        }
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(android.Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(android.Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!perms.isEmpty()) {
            requestPermissions(perms.toArray(new String[0]), 1001);
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            // 1. High-Priority Urgent Dispatch Channel for Partner (Locksceen + Alarm Sound + Vibration)
            NotificationChannel urgentChannel = new NotificationChannel(
                "quickpress_urgent_dispatch",
                "QuickPress Urgent Order Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            urgentChannel.setDescription("Loud alerts for incoming orders requiring store acceptance");
            urgentChannel.enableVibration(true);
            urgentChannel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500, 1000});
            urgentChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            urgentChannel.setBypassDnd(true);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (defaultSoundUri == null) {
                defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
            urgentChannel.setSound(defaultSoundUri, audioAttributes);
            manager.createNotificationChannel(urgentChannel);

            // 2. Standard Orders Channel
            NotificationChannel ordersChannel = new NotificationChannel(
                "quickpress_orders",
                "QuickPress Order Updates",
                NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("Status updates for store orders");
            ordersChannel.enableVibration(true);
            ordersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(ordersChannel);
        }
    }
}
