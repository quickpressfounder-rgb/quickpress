package com.quickpress.partner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    public static final int NOTIFICATION_ID_STORE_STATUS = 1001;
    public static final int NOTIFICATION_ID_URGENT_ORDER = 2001;

    private long lastBackPressTime = 0;
    private static MediaPlayer backgroundAlarmPlayer = null;
    private static PowerManager.WakeLock orderAlarmWakeLock = null;
    public static boolean isAlarmRinging = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Enable Hardware Acceleration at the Window level and Keep Screen On for Merchant Orders
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Turn Screen On & Show Over Lockscreen for Incoming Orders (Zomato / Swiggy style)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // 2. Unlock Highest Supported Display Refresh Rate (90Hz / 120Hz / 144Hz)
        unlockHighRefreshRate();

        // 3. Request Android 13+ Notification Permission & Urgent Channels
        requestDevicePermissions();
        createNotificationChannels();

        // 4. Initialize FCM Push Registration
        try {
            com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        String token = task.getResult();
                        android.util.Log.d("MainActivity", "FCM token retrieved: " + token);
                        getSharedPreferences("qp_partner_prefs", Context.MODE_PRIVATE)
                            .edit().putString("fcm_token", token).apply();
                    }
                });
        } catch (Throwable t) {
            android.util.Log.w("MainActivity", "FCM init notice: " + t.getMessage());
        }

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

        // 5. Handle Intent Actions (Go Online, Accept Order, etc.)
        handleActionIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleActionIntent(intent);
    }

    @Override
    public void onDestroy() {
        stopBackgroundOrderRingNative();
        super.onDestroy();
    }

    private void handleActionIntent(Intent intent) {
        if (intent == null) return;
        final String action = intent.getStringExtra("qp_action");
        if (action == null) return;

        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        handler.postDelayed(() -> {
            try {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) return;

                if ("go_online".equals(action)) {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  window.dispatchEvent(new CustomEvent('qp:partner:go_online'));" +
                        "})();",
                        null
                    );
                } else if ("accept_order".equals(action)) {
                    final String code = intent.getStringExtra("order_code");
                    stopBackgroundOrderRingNative();
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  window.dispatchEvent(new CustomEvent('qp:partner:accept_order', { detail: { code: '" + (code != null ? code : "") + "' } }));" +
                        "})();",
                        null
                    );
                } else if ("view_order".equals(action)) {
                    final String code = intent.getStringExtra("order_code");
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  window.dispatchEvent(new CustomEvent('qp:partner:view_order', { detail: { code: '" + (code != null ? code : "") + "' } }));" +
                        "})();",
                        null
                    );
                }
            } catch (Exception ignored) {}
        }, 300);
    }

    public static synchronized void stopBackgroundOrderRingDirectly(final Context context) {
        try {
            isAlarmRinging = false;
            if (backgroundAlarmPlayer != null) {
                try {
                    if (backgroundAlarmPlayer.isPlaying()) {
                        backgroundAlarmPlayer.stop();
                    }
                    backgroundAlarmPlayer.release();
                } catch (Exception ignored) {}
                backgroundAlarmPlayer = null;
            }

            try {
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.cancel();
                }
            } catch (Exception ignored) {}

            if (orderAlarmWakeLock != null && orderAlarmWakeLock.isHeld()) {
                try {
                    orderAlarmWakeLock.release();
                } catch (Exception ignored) {}
                orderAlarmWakeLock = null;
            }

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(NOTIFICATION_ID_URGENT_ORDER);
            }
        } catch (Exception ignored) {}
    }

    public static synchronized void startOrderAlarmDirectly(final Context context, final String orderCode, final String amount, final String customerName) {
        try {
            if (isAlarmRinging) return;
            isAlarmRinging = true;

            // 1. Wake screen up and keep active
            try {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    if (orderAlarmWakeLock == null) {
                        orderAlarmWakeLock = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                            PowerManager.ACQUIRE_CAUSES_WAKEUP |
                            PowerManager.ON_AFTER_RELEASE,
                            "quickpress:merchant_order_wakeup"
                        );
                    }
                    if (!orderAlarmWakeLock.isHeld()) {
                        orderAlarmWakeLock.acquire(25000); // 25 seconds bright wakeup
                    }
                }
            } catch (Exception ignored) {}

            // 2. Play continuous loud looping alarm via MediaPlayer on STREAM_ALARM
            try {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }

                if (backgroundAlarmPlayer != null) {
                    try {
                        if (backgroundAlarmPlayer.isPlaying()) {
                            backgroundAlarmPlayer.stop();
                        }
                        backgroundAlarmPlayer.release();
                    } catch (Exception ignored) {}
                    backgroundAlarmPlayer = null;
                }

                backgroundAlarmPlayer = new MediaPlayer();
                backgroundAlarmPlayer.setDataSource(context, alarmUri);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    backgroundAlarmPlayer.setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    );
                } else {
                    backgroundAlarmPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                }
                backgroundAlarmPlayer.setLooping(true);
                backgroundAlarmPlayer.prepare();
                backgroundAlarmPlayer.start();
            } catch (Exception audioErr) {
                audioErr.printStackTrace();
            }

            // 3. Continuous repeating vibration
            try {
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    long[] pattern = new long[]{0, 800, 400, 800, 400};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(pattern, 0));
                    } else {
                        v.vibrate(pattern, 0);
                    }
                }
            } catch (Exception ignored) {}

            // 4. Post Urgent Heads-Up Order Notification over Lockscreen with Action Buttons
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                Intent viewIntent = new Intent(context, MainActivity.class);
                viewIntent.setAction("com.quickpress.partner.ACTION_VIEW_ORDER");
                viewIntent.putExtra("qp_action", "view_order");
                viewIntent.putExtra("order_code", orderCode);
                viewIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                PendingIntent viewPendingIntent = PendingIntent.getActivity(
                    context, 201, viewIntent, flags
                );

                Intent acceptIntent = new Intent(context, MainActivity.class);
                acceptIntent.setAction("com.quickpress.partner.ACTION_ACCEPT_ORDER");
                acceptIntent.putExtra("qp_action", "accept_order");
                acceptIntent.putExtra("order_code", orderCode);
                acceptIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                PendingIntent acceptPendingIntent = PendingIntent.getActivity(
                    context, 202, acceptIntent, flags
                );

                String displayCode = (orderCode != null && !orderCode.trim().isEmpty()) ? orderCode.trim() : "NEW";
                String priceText = (amount != null && !amount.trim().isEmpty()) ? ("₹" + amount.trim() + " · ") : "";
                String descText = priceText + "Tap to accept within 5 minutes";

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "quickpress_urgent_dispatch")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("🚨 NEW ORDER #" + displayCode + " RECEIVED")
                    .setContentText(descText)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setFullScreenIntent(viewPendingIntent, true)
                    .setContentIntent(viewPendingIntent)
                    .setOngoing(true)
                    .setAutoCancel(false)
                    .addAction(R.mipmap.ic_launcher, "ACCEPT ORDER", acceptPendingIntent)
                    .addAction(R.mipmap.ic_launcher, "VIEW", viewPendingIntent);

                manager.notify(NOTIFICATION_ID_URGENT_ORDER, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopBackgroundOrderRingNative() {
        runOnUiThread(() -> stopBackgroundOrderRingDirectly(MainActivity.this));
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
                String apiBaseUrl = getString(R.string.api_base_url).trim().replaceAll("/+$", "");
                String hostOnly = apiBaseUrl.replaceFirst("^https?://", "");
                String script = 
                    "(function() {" +
                    "  var _base = '" + apiBaseUrl + "';" +
                    "  window.__QUICKPRESS_CONFIG__ = { API_BASE_URL: _base };" +
                    "  if (!window.__qp_fetch_patched) {" +
                    "    window.__qp_fetch_patched = true;" +
                    "    var _origFetch = window.fetch;" +
                    "    window.fetch = function(input, init) {" +
                    "      if (typeof input === 'string') {" +
                    "        input = input.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, '" + hostOnly + "');" +
                    "        if (input.startsWith('/api/')) {" +
                    "          input = _base + input;" +
                    "        }" +
                    "      } else if (input && input.url) {" +
                    "        try {" +
                    "          var newUrl = input.url.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, '" + hostOnly + "');" +
                    "          if (newUrl.startsWith('/api/')) { newUrl = _base + newUrl; }" +
                    "          input = new Request(newUrl, input);" +
                    "        } catch(e) {}" +
                    "      }" +
                    "      return _origFetch.call(this, input, init);" +
                    "    };" +
                    "    var _origOpen = XMLHttpRequest.prototype.open;" +
                    "    XMLHttpRequest.prototype.open = function(method, url) {" +
                    "      if (typeof url === 'string') {" +
                    "        url = url.replace(/quickpress-api-production-3292\\.up\\.railway\\.app/g, '" + hostOnly + "');" +
                    "        if (url.startsWith('/api/')) { url = _base + url; }" +
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
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Register Native Merchant Bridge for Physical WakeLock & Battery Optimization
                QuickPressMerchantBridge merchantBridge = new QuickPressMerchantBridge();
                webView.addJavascriptInterface(merchantBridge, "QuickPressNativeBridge");
                webView.addJavascriptInterface(merchantBridge, "QuickPressMerchantBridge");

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

            // 3. Persistent Store Status Channel (Silent, low priority, lockscreen public)
            NotificationChannel statusChannel = new NotificationChannel(
                "quickpress_store_status",
                "QuickPress Store Status",
                NotificationManager.IMPORTANCE_LOW
            );
            statusChannel.setDescription("Persistent status notification when store is online or offline");
            statusChannel.setShowBadge(false);
            statusChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            statusChannel.setSound(null, null);
            statusChannel.enableVibration(false);
            manager.createNotificationChannel(statusChannel);
        }
    }

    /**
     * Native Android Merchant Bridge:
     * Handles Lockscreen Wakeup, Battery Optimization Whitelisting, and Overlay Permissions.
     */
    public class QuickPressMerchantBridge {
        @JavascriptInterface
        public void wakeScreen() {
            runOnUiThread(() -> {
                try {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        PowerManager.WakeLock wl = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                            PowerManager.ACQUIRE_CAUSES_WAKEUP |
                            PowerManager.ON_AFTER_RELEASE,
                            "quickpress:merchant_order_wakeup"
                        );
                        wl.acquire(20000); // 20 seconds bright wakeup
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public boolean isBatteryOptimizationIgnored() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
            }
            return true;
        }

        @JavascriptInterface
        public void requestIgnoreBatteryOptimization() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                        if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            startActivity(intent);
                        }
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                            startActivity(intent);
                        } catch (Exception ignored) {}
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean canDrawOverlays() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return Settings.canDrawOverlays(MainActivity.this);
            }
            return true;
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        if (!Settings.canDrawOverlays(MainActivity.this)) {
                            Intent intent = new Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:" + getPackageName())
                            );
                            startActivity(intent);
                        }
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public boolean areNotificationsEnabled() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                return manager != null && manager.areNotificationsEnabled();
            }
            return true;
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                    } else {
                        intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                    }
                    startActivity(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public boolean isLocationGranted() {
            return checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                   checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            runOnUiThread(() -> {
                requestPermissions(new String[]{
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION
                }, 1002);
            });
        }

        @JavascriptInterface
        public boolean isCameraGranted() {
            return checkSelfPermission(android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestCameraPermission() {
            runOnUiThread(() -> {
                requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 1003);
            });
        }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void requestAllPermissions() {
            runOnUiThread(() -> {
                requestDevicePermissions();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                        try {
                            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            startActivity(intent);
                        } catch (Exception ignored) {}
                    }
                }
            });
        }

        @JavascriptInterface
        public void postStoreStatusNotification(final String title, final String body, final boolean isOffline) {
            runOnUiThread(() -> {
                try {
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager == null) return;

                    Intent openIntent = new Intent(MainActivity.this, MainActivity.class);
                    openIntent.setAction(Intent.ACTION_MAIN);
                    openIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                    openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent openPendingIntent = PendingIntent.getActivity(
                        MainActivity.this, 100, openIntent, flags
                    );

                    String notifTitle = (title != null && !title.trim().isEmpty())
                        ? title.trim()
                        : (isOffline ? "🔴 Your store is temporarily offline" : "🟢 Your store is Online");
                    String notifBody = (body != null && !body.trim().isEmpty())
                        ? body.trim()
                        : (isOffline ? "Go online now to receive orders" : "Accepting incoming customer orders");

                    NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, "quickpress_store_status")
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(notifTitle)
                        .setContentText(notifBody)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setContentIntent(openPendingIntent)
                        .setOngoing(isOffline)
                        .setAutoCancel(!isOffline)
                        .setOnlyAlertOnce(true);

                    if (isOffline) {
                        Intent goOnlineIntent = new Intent(MainActivity.this, MainActivity.class);
                        goOnlineIntent.setAction("com.quickpress.partner.ACTION_GO_ONLINE");
                        goOnlineIntent.putExtra("qp_action", "go_online");
                        goOnlineIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                        PendingIntent goOnlinePendingIntent = PendingIntent.getActivity(
                            MainActivity.this, 101, goOnlineIntent, flags
                        );

                        builder.addAction(R.mipmap.ic_launcher, "Go Online", goOnlinePendingIntent);
                    }

                    manager.notify(NOTIFICATION_ID_STORE_STATUS, builder.build());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void clearStoreStatusNotification() {
            runOnUiThread(() -> {
                try {
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) {
                        manager.cancel(NOTIFICATION_ID_STORE_STATUS);
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void startBackgroundOrderRing(final String orderCode, final String amount, final String customerName) {
            runOnUiThread(() -> startOrderAlarmDirectly(MainActivity.this, orderCode, amount, customerName));
        }

        @JavascriptInterface
        public void stopBackgroundOrderRing() {
            stopBackgroundOrderRingNative();
        }

        @JavascriptInterface
        public String getNativeFcmToken() {
            try {
                return getSharedPreferences("qp_partner_prefs", Context.MODE_PRIVATE)
                    .getString("fcm_token", "");
            } catch (Exception e) {
                return "";
            }
        }
    }
}
