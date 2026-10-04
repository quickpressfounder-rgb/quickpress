package com.quickpress.customer;

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
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

                WebSettings settings = webView.getSettings();
                settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setGeolocationEnabled(true);

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
                }, "NativeRazorpay");
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
