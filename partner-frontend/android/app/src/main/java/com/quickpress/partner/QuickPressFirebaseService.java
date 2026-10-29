package com.quickpress.partner;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.annotation.NonNull;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Native Android Firebase Cloud Messaging Service for QuickPress Partner.
 * Receives background push notifications when app is closed or minimized,
 * wakes the screen, triggers continuous loud looping order alarm,
 * and displays heads-up high-priority order dispatch alert over lockscreen.
 */
public class QuickPressFirebaseService extends FirebaseMessagingService {
    private static final String TAG = "QuickPressFCM";
    private static final String PREF_NAME = "qp_partner_prefs";
    private static final String KEY_FCM_TOKEN = "fcm_token";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM Token received: " + token);

        // Store token in SharedPreferences
        try {
            SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_FCM_TOKEN, token).apply();
        } catch (Exception e) {
            Log.w(TAG, "Failed to persist FCM token in prefs: " + e.getMessage());
        }

        // Synchronize token to backend in background thread
        syncTokenToBackend(token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Push message received from: " + remoteMessage.getFrom());

        Map<String, String> data = remoteMessage.getData();
        String title = null;
        String body = null;

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        }

        if (data != null && !data.isEmpty()) {
            if (title == null) title = data.get("title");
            if (body == null) body = data.get("body");
            if (body == null) body = data.get("description");

            String orderCode = data.get("orderCode");
            if (orderCode == null) orderCode = data.get("order_code");
            if (orderCode == null) orderCode = data.get("code");
            if (orderCode == null) orderCode = data.get("orderId");

            String amount = data.get("amount");
            if (amount == null) amount = data.get("grandTotal");
            if (amount == null) amount = data.get("total");

            String customerName = data.get("customerName");
            if (customerName == null) customerName = data.get("customer_name");

            String channelId = data.get("channel_id");
            String ringBell = data.get("ring_bell");
            String wakeScreen = data.get("wake_screen");
            String type = data.get("type");
            String kind = data.get("kind");

            boolean isUrgentOrder = "quickpress_urgent_dispatch".equals(channelId)
                || "true".equalsIgnoreCase(ringBell)
                || "true".equalsIgnoreCase(wakeScreen)
                || "new_order_offer".equals(type)
                || "order-new".equals(kind)
                || (orderCode != null && !orderCode.isEmpty());

            if (isUrgentOrder) {
                Log.d(TAG, "⚡ Triggering background order ring natively for order: " + orderCode);
                MainActivity.startOrderAlarmDirectly(
                    getApplicationContext(),
                    orderCode != null ? orderCode : "NEW",
                    amount != null ? amount : "",
                    customerName != null ? customerName : "QuickPress Customer"
                );
            }
        }
    }

    private void syncTokenToBackend(final String token) {
        new Thread(() -> {
            try {
                String apiBaseUrl = getString(R.string.api_base_url).trim().replaceAll("/+$", "");
                URL url = new URL(apiBaseUrl + "/api/notifications/fcm-token");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setDoOutput(true);

                String payload = "{\"token\":\"" + token + "\",\"device\":\"android\",\"deviceType\":\"android\",\"role\":\"partner\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.d(TAG, "Token sync HTTP response code: " + code);
                conn.disconnect();
            } catch (Exception e) {
                Log.w(TAG, "Token sync network notice: " + e.getMessage());
            }
        }).start();
    }
}
