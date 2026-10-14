package com.quickpress.rider;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Floating Bubble Overlay Service for QuickPress Rider.
 * Provides a floating on-screen bubble (like Rapido Captain / Zomato Rider)
 * that stays on top of Google Maps, Home screen, or any other app.
 *
 * Tapping the bubble immediately brings the app to the foreground and
 * routes to the Orders / Trips section (/orders).
 */
public class FloatingBubbleService extends Service {

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String CHANNEL_ID = "qp_floating_bubble_channel";
    public static final int NOTIFICATION_ID = 9021;

    public static boolean isRunning = false;

    private WindowManager windowManager;
    private View bubbleView;
    private WindowManager.LayoutParams params;

    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;
    private long touchStartTime;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, createNotification());
        showBubble();
        isRunning = true;
        return START_STICKY;
    }

    @SuppressLint("ClickableViewAccessibility")
    private void showBubble() {
        if (bubbleView != null) return;

        // Overlay Window Layout Parameters
        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 20;
        params.y = 250;

        bubbleView = createBubbleLayout();

        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (bubbleView != null && windowManager != null) {
                            windowManager.updateViewLayout(bubbleView, params);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        // If user moved finger less than 15px and tapped quickly, consider it a Click!
                        if (duration < 350 && diffX < 15 && diffY < 15) {
                            openOrdersScreen();
                        } else {
                            // Snap to closest screen edge (Left or Right) like Rapido / Messenger
                            snapToEdge();
                        }
                        return true;
                }
                return false;
            }
        });

        try {
            windowManager.addView(bubbleView, params);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void snapToEdge() {
        if (bubbleView == null || windowManager == null) return;
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int middle = screenWidth / 2;

        if (params.x + (bubbleView.getWidth() / 2) < middle) {
            params.x = 10; // Snap to Left
        } else {
            params.x = screenWidth - bubbleView.getWidth() - 10; // Snap to Right
        }

        try {
            windowManager.updateViewLayout(bubbleView, params);
        } catch (Exception ignored) {}
    }

    private void openOrdersScreen() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        intent.putExtra("route", "/orders");
        startActivity(intent);
    }

    private View createBubbleLayout() {
        Context context = this;
        int dp64 = dpToPx(64);

        LinearLayout container = new LinearLayout(context);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);
        container.setLayoutParams(new LinearLayout.LayoutParams(dp64, dp64));

        // Background: Round white pill/circle with golden-yellow Rapido-style border
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.WHITE);
        bg.setStroke(dpToPx(3), Color.parseColor("#F59E0B")); // Amber / Rapido Yellow
        container.setBackground(bg);
        container.setElevation(dpToPx(6));

        // Inner Yellow pill badge with "QuickPress"
        TextView badgeText = new TextView(context);
        badgeText.setText("quickpress");
        badgeText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 8);
        badgeText.setTextColor(Color.parseColor("#B45309")); // Dark amber
        badgeText.setGravity(Gravity.CENTER);
        badgeText.setTypeface(null, android.graphics.Typeface.BOLD);

        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setColor(Color.parseColor("#FEF3C7")); // Light amber pill
        badgeBg.setCornerRadius(dpToPx(6));
        badgeText.setBackground(badgeBg);
        badgeText.setPadding(dpToPx(4), dpToPx(1), dpToPx(4), dpToPx(1));

        // Subtitle: "Captain" in Bold Black
        TextView titleText = new TextView(context);
        titleText.setText("Captain");
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        titleText.setTextColor(Color.parseColor("#09090B"));
        titleText.setGravity(Gravity.CENTER);
        titleText.setTypeface(null, android.graphics.Typeface.BOLD);

        // Green Online Dot
        ImageView dot = new ImageView(context);
        GradientDrawable dotBg = new GradientDrawable();
        dotBg.setShape(GradientDrawable.OVAL);
        dotBg.setColor(Color.parseColor("#10B981")); // Emerald Green
        dot.setBackground(dotBg);
        LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(dpToPx(5), dpToPx(5));
        dotParams.topMargin = dpToPx(2);
        dot.setLayoutParams(dotParams);

        container.addView(badgeText);
        container.addView(titleText);
        container.addView(dot);

        return container;
    }

    private int dpToPx(int dp) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            getResources().getDisplayMetrics()
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "QuickPress Captain On-Duty Overlay",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows floating overlay bubble while navigating or on other apps");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.putExtra("route", "/orders");
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("QuickPress Captain is ON DUTY")
            .setContentText("Tap floating bubble anytime to open trip offers")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        if (bubbleView != null && windowManager != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {}
            bubbleView = null;
        }
    }
}
