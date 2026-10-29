package com.quickpress.rider;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;
    public static boolean isCaptainOnline = false;

    private static final int NOTIFICATION_ID_URGENT_ORDER = 9001;
    private static MediaPlayer backgroundAlarmPlayer = null;
    private static PowerManager.WakeLock orderAlarmWakeLock = null;
    private static boolean isAlarmRinging = false;

    public void startFloatingBubbleInternal() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    Intent intent = new Intent(this, FloatingBubbleService.class);
                    intent.setAction(FloatingBubbleService.ACTION_START);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent);
                    } else {
                        startService(intent);
                    }
                }
            }
        } catch (Throwable t) {
            android.util.Log.e("MainActivity", "startFloatingBubbleInternal error: " + t.getMessage(), t);
        }
    }

    public void stopFloatingBubbleInternal() {
        try {
            Intent intent = new Intent(this, FloatingBubbleService.class);
            intent.setAction(FloatingBubbleService.ACTION_STOP);
            stopService(intent);
        } catch (Throwable t) {
            android.util.Log.e("MainActivity", "stopFloatingBubbleInternal error: " + t.getMessage(), t);
        }
    }

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

        // 5. Check if launched from Floating Bubble with route
        handleIncomingRoute(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingRoute(intent);
    }

    private void handleIncomingRoute(Intent intent) {
        if (intent == null) return;
        final String route = intent.getStringExtra("route");
        if (route != null && !route.isEmpty()) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.postDelayed(() -> {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  if (window.__qpNavigate) { window.__qpNavigate('" + route + "'); }" +
                        "  else { window.dispatchEvent(new CustomEvent('qp:navigate', { detail: { route: '" + route + "' } })); }" +
                        "})()",
                        null
                    );
                }, 400);
            }
        }
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
        // User requested: "aager quickpress rider app open kare to buble open na ho"
        // Hide bubble whenever app is in the foreground
        stopFloatingBubbleInternal();
        unlockHighRefreshRate();
        optimizeWebView();
        startPeriodicApiFix();
    }

    @Override
    public void onPause() {
        super.onPause();
        // User requested: "jisa hi app minimze kare to buble show hone lage"
        // When app is minimized to background, show floating bubble if captain is online
        if (isCaptainOnline) {
            startFloatingBubbleInternal();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (isCaptainOnline) {
            startFloatingBubbleInternal();
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (isCaptainOnline) {
            startFloatingBubbleInternal();
        }
    }

    @Override
    public void onDestroy() {
        stopBackgroundOrderRingDirectly(this);
        super.onDestroy();
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

    public static synchronized void startOrderAlarmDirectly(final Context context, final String orderCode, final String amount, final String customerName, final String pickupAddress) {
        try {
            if (isAlarmRinging) return;
            isAlarmRinging = true;

            // 1. Wake screen up and keep active for 25 seconds
            try {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    if (orderAlarmWakeLock == null) {
                        orderAlarmWakeLock = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                            PowerManager.ACQUIRE_CAUSES_WAKEUP |
                            PowerManager.ON_AFTER_RELEASE,
                            "quickpress:captain_order_wakeup"
                        );
                    }
                    if (!orderAlarmWakeLock.isHeld()) {
                        orderAlarmWakeLock.acquire(25000);
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

            // 4. Post Urgent Heads-Up Order Notification over Lockscreen with FullScreenIntent
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                Intent viewIntent = new Intent(context, MainActivity.class);
                viewIntent.setAction("com.quickpress.rider.ACTION_VIEW_OFFER");
                viewIntent.putExtra("route", "/orders");
                viewIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                PendingIntent viewPendingIntent = PendingIntent.getActivity(
                    context, 201, viewIntent, flags
                );

                String displayCode = (orderCode != null && !orderCode.trim().isEmpty()) ? orderCode.trim() : "NEW";
                String priceText = (amount != null && !amount.trim().isEmpty()) ? ("₹" + amount.trim() + " · ") : "";
                String descText = priceText + (pickupAddress != null ? pickupAddress : "Kasganj Hub") + " • Tap to accept";

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "quickpress_urgent_dispatch")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("🚨 NEW TRIP OFFER #" + displayCode)
                    .setContentText(descText)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setFullScreenIntent(viewPendingIntent, true)
                    .setContentIntent(viewPendingIntent)
                    .setOngoing(true)
                    .setAutoCancel(false)
                    .addAction(R.mipmap.ic_launcher, "OPEN OFFER", viewPendingIntent);

                manager.notify(NOTIFICATION_ID_URGENT_ORDER, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
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
                // Hardware layer composition
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                // Disable bounce rubber-banding to keep 120 FPS steady
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

                WebSettings settings = webView.getSettings();
                settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setGeolocationEnabled(true);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Register Native Captain Bridge for Floating Bubble, Background GPS, and Screen Wakeup
                webView.addJavascriptInterface(new QuickPressRiderBridge(), "QuickPressNativeBridge");

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

            // 1. High-Priority Urgent Dispatch Channel for Rider (Locksceen + Alarm Sound + Vibration)
            NotificationChannel urgentChannel = new NotificationChannel(
                "quickpress_urgent_dispatch",
                "QuickPress Urgent Order Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            urgentChannel.setDescription("Loud alerts for incoming trip offers and assignments");
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
            ordersChannel.setDescription("Status updates for active trips and deliveries");
            ordersChannel.enableVibration(true);
            ordersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(ordersChannel);
        }
    }

    /**
     * Native Android Captain Bridge:
     * Handles Floating Overlay Bubble (Rapido style), Auto-Foreground on Incoming Order,
     * Background GPS Location, and Battery Optimization Whitelist.
     */
    public class QuickPressRiderBridge {

        @JavascriptInterface
        public void setCaptainOnlineStatus(boolean online) {
            isCaptainOnline = online;
            if (!online) {
                runOnUiThread(MainActivity.this::stopFloatingBubbleInternal);
            }
        }

        @JavascriptInterface
        public void startFloatingBubble() {
            isCaptainOnline = true;
            // Note: Bubble will show automatically when app is minimized (onPause / onUserLeaveHint)
        }

        @JavascriptInterface
        public void stopFloatingBubble() {
            isCaptainOnline = false;
            runOnUiThread(MainActivity.this::stopFloatingBubbleInternal);
        }

        @JavascriptInterface
        public boolean isFloatingBubbleRunning() {
            return FloatingBubbleService.isRunning;
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
                        Intent intent = new Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getPackageName())
                        );
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
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
        public boolean isBackgroundLocationGranted() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                return checkSelfPermission(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
            }
            return isLocationGranted();
        }

        @JavascriptInterface
        public void requestBackgroundLocationPermission() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    requestPermissions(new String[]{android.Manifest.permission.ACCESS_BACKGROUND_LOCATION}, 1004);
                } else {
                    requestLocationPermission();
                }
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
        public void bringAppToFront(final String targetRoute) {
            runOnUiThread(() -> {
                try {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        PowerManager.WakeLock wl = pm.newWakeLock(
                            PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                            PowerManager.ACQUIRE_CAUSES_WAKEUP |
                            PowerManager.ON_AFTER_RELEASE,
                            "quickpress:captain_order_wakeup"
                        );
                        wl.acquire(15000);
                    }

                    Intent intent = new Intent(MainActivity.this, MainActivity.class);
                    intent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK |
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                    );
                    if (targetRoute != null && !targetRoute.isEmpty()) {
                        intent.putExtra("route", targetRoute);
                    }
                    startActivity(intent);

                    // Also notify the active webview
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null && targetRoute != null) {
                        webView.evaluateJavascript(
                            "(function() {" +
                            "  if (window.__qpNavigate) { window.__qpNavigate('" + targetRoute + "'); }" +
                            "  else { window.dispatchEvent(new CustomEvent('qp:navigate', { detail: { route: '" + targetRoute + "' } })); }" +
                            "})()",
                            null
                        );
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void stopBackgroundOrderRing() {
            stopBackgroundOrderRingDirectly(MainActivity.this);
        }

        @JavascriptInterface
        public String getNativeFcmToken() {
            try {
                SharedPreferences prefs = getSharedPreferences(QuickPressFirebaseService.PREF_NAME, Context.MODE_PRIVATE);
                String token = prefs.getString(QuickPressFirebaseService.KEY_FCM_TOKEN, null);
                if (token != null && !token.isEmpty()) {
                    return token;
                }
            } catch (Exception ignored) {}

            try {
                FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        try {
                            SharedPreferences prefs = getSharedPreferences(QuickPressFirebaseService.PREF_NAME, Context.MODE_PRIVATE);
                            prefs.edit().putString(QuickPressFirebaseService.KEY_FCM_TOKEN, task.getResult()).apply();
                        } catch (Exception ignored) {}
                    }
                });
            } catch (Exception ignored) {}
            return "";
        }
    }
}
