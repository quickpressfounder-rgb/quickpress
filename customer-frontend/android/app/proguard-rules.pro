# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Razorpay SDK Proguard Rules
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !class/merging/vertical*,!class/merging/horizontal*
-keepclasseswithmembers class * {
    public void onPaymentSuccess(...);
    public void onPaymentError(...);
}

# Preserve WebView JavascriptInterface annotations and bridge methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.quickpress.customer.MainActivity {
    public *;
}

