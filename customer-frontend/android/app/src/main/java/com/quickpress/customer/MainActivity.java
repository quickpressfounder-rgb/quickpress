package com.quickpress.customer;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.content.Intent;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
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
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity implements PaymentResultWithDataListener {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Preload Razorpay Checkout SDK for instant in-app payment sheet
        try {
            Checkout.preload(getApplicationContext());
        } catch (Throwable ignored) {}

        // 1. Enable Hardware Acceleration at the Window level
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // 2. Unlock Highest Supported Display Refresh Rate (90Hz / 120Hz / 144Hz)
        unlockHighRefreshRate();

        // 3. Request Android 13+ Notification Permission and GPS Location Permission
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
                        "    if (path === '/' || path === '/home' || path === '/login') {" +
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
        handleNotificationIntent(getIntent());
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

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent != null && intent.hasExtra("orderId")) {
            String orderId = intent.getStringExtra("orderId");
            if (orderId != null && !orderId.trim().isEmpty()) {
                runOnUiThread(() -> {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null) {
                        webView.evaluateJavascript(
                            "if (window.location.pathname !== '/track/" + orderId.trim() + "') { window.location.href = '/track/" + orderId.trim() + "'; }",
                            null
                        );
                    }
                });
            }
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

                // Expose high-speed Native UPI App Launcher directly to Web JavaScript
                webView.addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public boolean openUpiApp(String uriStr, String packageName) {
                        try {
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                            intent.setData(android.net.Uri.parse(uriStr));
                            if (packageName != null && !packageName.trim().isEmpty()) {
                                intent.setPackage(packageName.trim());
                            }
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            try {
                                android.content.Intent fallback = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(uriStr));
                                fallback.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(fallback);
                                return true;
                            } catch (Exception ignored) {}
                            return false;
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public String getInstalledUpiApps() {
                        try {
                            android.content.pm.PackageManager pm = getPackageManager();
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                            intent.setData(android.net.Uri.parse("upi://pay"));

                            java.util.List<android.content.pm.ResolveInfo> activities = pm.queryIntentActivities(intent, 0);
                            org.json.JSONArray appList = new org.json.JSONArray();
                            java.util.Set<String> seenPackages = new java.util.HashSet<>();

                            String[][] popularUpi = {
                                {"com.google.android.apps.nbu.paisa.user", "Google Pay", "gpay"},
                                {"com.phonepe.app", "PhonePe", "phonepe"},
                                {"net.one97.paytm", "Paytm", "paytm"},
                                {"in.supermoney.android", "Supermoney", "supermoney"},
                                {"com.famorganizer", "FamApp", "famapp"},
                                {"com.dreamplug.androidapp", "CRED", "cred"},
                                {"in.amazon.mShop.android.shopping", "Amazon Pay", "amazonpay"},
                                {"in.org.npci.upiapp", "BHIM", "bhim"},
                                {"com.whatsapp", "WhatsApp", "whatsapp"},
                                {"com.naviapp", "Navi UPI", "navi"}
                            };

                            for (String[] upi : popularUpi) {
                                String pkg = upi[0];
                                try {
                                    pm.getPackageInfo(pkg, 0);
                                    if (!seenPackages.contains(pkg)) {
                                        seenPackages.add(pkg);
                                        org.json.JSONObject obj = new org.json.JSONObject();
                                        obj.put("packageName", pkg);
                                        obj.put("appName", upi[1]);
                                        obj.put("appId", upi[2]);
                                        appList.put(obj);
                                    }
                                } catch (android.content.pm.PackageManager.NameNotFoundException ignored) {}
                            }

                            if (activities != null) {
                                for (android.content.pm.ResolveInfo info : activities) {
                                    if (info.activityInfo != null) {
                                        String pkg = info.activityInfo.packageName;
                                        if (!seenPackages.contains(pkg)) {
                                            seenPackages.add(pkg);
                                            org.json.JSONObject obj = new org.json.JSONObject();
                                            obj.put("packageName", pkg);
                                            obj.put("appName", info.loadLabel(pm).toString());
                                            obj.put("appId", pkg.toLowerCase());
                                            appList.put(obj);
                                        }
                                    }
                                }
                            }
                            return appList.toString();
                        } catch (Exception e) {
                            return "[]";
                        }
                    }
                }, "AndroidUpiLauncher");

                // Expose Native Razorpay Checkout SDK to Web JavaScript
                webView.addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public void openRazorpay(String optionsJson) {
                        runOnUiThread(() -> {
                            try {
                                Checkout checkout = new Checkout();
                                JSONObject options = new JSONObject(optionsJson);
                                if (options.has("key")) {
                                    checkout.setKeyID(options.getString("key"));
                                }
                                checkout.open(MainActivity.this, options);
                            } catch (Exception e) {
                                sendRazorpayEvent("razorpay:error", -1, e.getMessage(), "{}");
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public String getInstalledUpiApps() {
                        try {
                            android.content.pm.PackageManager pm = getPackageManager();
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                            intent.setData(android.net.Uri.parse("upi://pay"));
                            java.util.List<android.content.pm.ResolveInfo> activities = pm.queryIntentActivities(intent, 0);
                            org.json.JSONArray appList = new org.json.JSONArray();
                            java.util.Set<String> seen = new java.util.HashSet<>();
                            if (activities != null) {
                                for (android.content.pm.ResolveInfo info : activities) {
                                    if (info.activityInfo != null && !seen.contains(info.activityInfo.packageName)) {
                                        seen.add(info.activityInfo.packageName);
                                        org.json.JSONObject o = new org.json.JSONObject();
                                        o.put("packageName", info.activityInfo.packageName);
                                        o.put("appName", info.loadLabel(pm).toString());
                                        appList.put(o);
                                    }
                                }
                            }
                            return appList.toString();
                        } catch (Exception e) {
                            return "[]";
                        }
                    }
                }, "NativeRazorpay");

                // Expose Native Android OS Notifications directly to Web JavaScript
                webView.addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public boolean showNotification(String title, String message, String orderId) {
                        try {
                            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                            if (manager == null) return false;

                            createNotificationChannels();

                            Intent intent = new Intent(MainActivity.this, MainActivity.class);
                            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                            if (orderId != null && !orderId.trim().isEmpty()) {
                                intent.putExtra("orderId", orderId.trim());
                            }

                            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                flags |= PendingIntent.FLAG_IMMUTABLE;
                            }

                            PendingIntent pendingIntent = PendingIntent.getActivity(
                                MainActivity.this,
                                (int) (System.currentTimeMillis() & 0xfffffff),
                                intent,
                                flags
                            );

                            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(MainActivity.this, "quickpress_orders")
                                .setSmallIcon(R.mipmap.ic_launcher)
                                .setContentTitle(title != null && !title.trim().isEmpty() ? title.trim() : "QuickPress")
                                .setContentText(message != null && !message.trim().isEmpty() ? message.trim() : "")
                                .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(message != null ? message.trim() : ""))
                                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                                .setDefaults(androidx.core.app.NotificationCompat.DEFAULT_ALL)
                                .setAutoCancel(true)
                                .setContentIntent(pendingIntent);

                            manager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
                            return true;
                        } catch (Exception e) {
                            return false;
                        }
                    }
                }, "AndroidNotification");
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

            NotificationChannel ordersChannel = new NotificationChannel(
                "quickpress_orders",
                "QuickPress Order Updates",
                NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("Status updates for your laundry orders");
            ordersChannel.enableVibration(true);
            ordersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(ordersChannel);
        }
    }

    @Override
    public void onPaymentSuccess(String razorpayPaymentID, PaymentData paymentData) {
        try {
            JSONObject data = new JSONObject();
            data.put("razorpay_payment_id", razorpayPaymentID);
            if (paymentData != null) {
                data.put("razorpay_order_id", paymentData.getOrderId() != null ? paymentData.getOrderId() : "");
                data.put("razorpay_signature", paymentData.getSignature() != null ? paymentData.getSignature() : "");
            }
            sendRazorpayEvent("razorpay:success", 0, "success", data.toString());
        } catch (Exception e) {
            sendRazorpayEvent("razorpay:success", 0, razorpayPaymentID, "{}");
        }
    }

    @Override
    public void onPaymentError(int code, String response, PaymentData paymentData) {
        sendRazorpayEvent("razorpay:error", code, response, "{}");
    }

    private void sendRazorpayEvent(String eventName, int code, String message, String dataJson) {
        runOnUiThread(() -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                String safeMsg = JSONObject.quote(message != null ? message : "");
                String safeData = (dataJson != null && !dataJson.isEmpty()) ? dataJson : "{}";
                String js = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: { code: " + code + ", message: " + safeMsg + ", data: " + safeData + " } }));";
                webView.evaluateJavascript(js, null);
            }
        });
    }
}
