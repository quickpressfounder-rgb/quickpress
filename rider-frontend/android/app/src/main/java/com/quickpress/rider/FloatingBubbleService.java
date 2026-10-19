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
import android.graphics.Outline;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewOutlineProvider;
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

        try {
            if (Build.VERSION.SDK_INT >= 34) { // Android 14+ (API 34)
                startForeground(
                    NOTIFICATION_ID,
                    createNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                );
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    createNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                );
            } else {
                startForeground(NOTIFICATION_ID, createNotification());
            }
        } catch (Throwable t) {
            android.util.Log.e("FloatingBubbleService", "Safe startForeground catch: " + t.getMessage(), t);
        }

        try {
            showBubble();
            isRunning = true;
        } catch (Throwable t) {
            android.util.Log.e("FloatingBubbleService", "Safe showBubble catch: " + t.getMessage(), t);
        }

        return START_STICKY;
    }

    @SuppressLint("ClickableViewAccessibility")
    private void showBubble() {
        if (bubbleView != null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(this)) {
                return;
            }
        }

        // Overlay Window Layout Parameters (Exact 74dp Rapido Captain Bubble Size)
        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        int bubbleSize = dpToPx(74);
        params = new WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 16;
        params.y = dpToPx(180);

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
        } catch (Throwable e) {
            android.util.Log.e("FloatingBubbleService", "Safe addView catch: " + e.getMessage(), e);
            bubbleView = null;
        }
    }

    private void snapToEdge() {
        if (bubbleView == null || windowManager == null) return;
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int middle = screenWidth / 2;

        if (params.x + (bubbleView.getWidth() / 2) < middle) {
            params.x = dpToPx(8); // Snap to Left
        } else {
            params.x = screenWidth - bubbleView.getWidth() - dpToPx(8); // Snap to Right
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
        intent.putExtra("route", "/dashboard");
        startActivity(intent);
    }

    /**
     * Creates a circular Rapido Captain floating bubble containing:
     * 1. 74dp circular pure white background with elevation shadow & NO stroke/outline
     * 2. Iconic Rapido-style yellow pill badge with "quickpress"
     * 3. Bold black "Captain" text centered underneath
     */
    private View createBubbleLayout() {
        Context context = this;
        int bubbleSize = dpToPx(74);

        android.widget.FrameLayout root = new android.widget.FrameLayout(context);
        root.setLayoutParams(new WindowManager.LayoutParams(bubbleSize, bubbleSize));

        // 1. Pure White Circular Container with elevation shadow & NO stroke/outline
        android.widget.FrameLayout circleContainer = new android.widget.FrameLayout(context);
        android.widget.FrameLayout.LayoutParams circleParams = new android.widget.FrameLayout.LayoutParams(
            bubbleSize, bubbleSize
        );
        circleContainer.setLayoutParams(circleParams);

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.WHITE);
        bg.setStroke(0, Color.TRANSPARENT); // Zero outline / pure white background
        circleContainer.setBackground(bg);
        circleContainer.setElevation(dpToPx(8));

        // Circular clipping to guarantee ZERO square corner bleed
        circleContainer.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                outline.setOval(0, 0, view.getWidth(), view.getHeight());
            }
        });
        circleContainer.setClipToOutline(true);

        // 2. Official QuickPress Captain Logo (HD Circular Cropped & Zoomed)
        ImageView logoView = new ImageView(context);
        int pad = dpToPx(3);
        logoView.setPadding(pad, pad, pad, pad);
        logoView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logoView.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                outline.setOval(0, 0, view.getWidth(), view.getHeight());
            }
        });
        logoView.setClipToOutline(true);

        try {
            int resId = getResources().getIdentifier("bubble_captain_logo", "drawable", getPackageName());
            if (resId != 0) {
                logoView.setImageResource(resId);
            } else {
                logoView.setImageResource(R.mipmap.ic_launcher_round);
            }
        } catch (Throwable t) {
            logoView.setImageResource(R.mipmap.ic_launcher);
        }

        android.widget.FrameLayout.LayoutParams logoParams = new android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT
        );
        logoParams.gravity = Gravity.CENTER;
        circleContainer.addView(logoView, logoParams);
        root.addView(circleContainer);

        return root;
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
