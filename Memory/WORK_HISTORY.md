# QuickPress — Engineering Work History

## Session: November 4, 2026

### Customer App Cart & Checkout Redesign & iOS Viewport Optimization
1. **Removed QuickPress Club & Surge Pricing Banners (Image 1):**
   - Removed Section 6.5 (`Add QuickPress Club (3 Months)`) and the active Surge Alert Banner (`Kasganj High Demand & Peak Hours Active`) from `customer-frontend/src/routes/checkout.tsx`.
2. **Simplified Delivery Speed Upgrade Card (Image 2):**
   - Retained the primary heading (`Express Priority Pickup & Delivery`) and price pill (`+₹{expressFee}`).
   - Removed the sub-description line (`⚡ Nearest Captain in 15 mins • Priority fast wash & delivery in 12–24 hrs`).
3. **Removed Special Care Instructions (Image 3):**
   - Completely removed Section 5 (`Special Care Instructions (Optional)`) from `customer-frontend/src/routes/checkout.tsx` and `customer-frontend/src/routes/cart.tsx`.
4. **Resolved Real Service Image in Cart & Checkout (Image 4):**
   - Integrated bundled service category assets (`washFoldImg`, `dryCleanImg`, `steamIronImg`, `premiumImg`, `shoesImg`, `curtainImg`, `blanketImg`, `carpetImg`, `expressImg`, `bagLeatherImg`) into `checkout.tsx`, `cart.tsx`, and `partner.$partnerId.tsx`.
   - Cart item rows now dynamically display the exact same crisp, authentic service photography shown on the live Services and Home pages.
5. **Added Clear Cart Button in Sticky Header (Image 5):**
   - Added circular red `Trash2` button on the right side of the top header in both `checkout.tsx` and `cart.tsx`.
   - One-click triggers `cart.clear()`, resets persistent cart state, issues feedback toast, and transitions to the friendly empty cart state.
6. **Build Verification & iOS Sync:**
   - Compiled with `npm run build:customer` (zero errors).
   - Synchronized static assets to `customer-frontend/ios/App/App/public` via `build_all_ios.py`.


### Customer App Checkout Header Clean, Payment Flow Fix, Native iOS Notifications & App Icon
1. **Header & Section Cleanups (Image 1 & 2):**
   - Removed `• QuickPress • Express Delivery` subtitle from the checkout top header in `customer-frontend/src/routes/checkout.tsx`.
   - Removed `⚡ Express Active` badge from the Delivery Speed Upgrade section.
2. **Fixed "Proceed to Payment":**
   - Eliminated blocking form validations in `checkout.tsx`: name, phone, and pickup address now auto-fallback to active location (e.g. Kasganj address) and user profile so customers are never blocked.
   - Smoothly launches `BlinkitPaymentDrawer` with 100% working payment options (Razorpay UPI, Cards, NetBanking, COD).
3. **Real Native iPhone Notifications Integration:**
   - Installed and registered `@capacitor/local-notifications` in the iOS Capacitor workspace.
   - Wired native iOS banner/sound notifications on order confirmation in `checkout.tsx` and updated `customer-frontend/src/lib/notifications.ts` to trigger native notifications in iOS Notification Center and Lock Screen.
4. **Custom App Logo Integration (Image 3):**
   - Converted the user's official yellow QuickPress brand logo (`1024x1024`) to PNG and updated:
     - `customer-frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
     - `customer-frontend/public/app-icon.png`
     - `customer-frontend/public/apple-touch-icon.png`
     - `customer-frontend/public/logo.png`
     - `customer-frontend/public/quickpress-brand-logo.png`
     - `customer-frontend/public/favicon.png`

### Set App Display Name to "QuickPress"
1. **Config & Info.plist Update:**
   - Changed `appName` in `customer-frontend/capacitor.config.ts` from `"QuickPress Customer"` to `"QuickPress"`.
   - Updated `CFBundleDisplayName` in `customer-frontend/ios/App/App/Info.plist` to `"QuickPress"`.
   - Updated `customer-frontend/ios/App/App/capacitor.config.json` to `"QuickPress"`.
   - The app now displays solely as **"QuickPress"** beneath the iOS app icon on iPhone home screens and in Xcode.
2. **Build & Sync:**
   - Ran `python3 build_all_ios.py customer` and verified successful sync with Xcode native workspace.

### Native iPhone Startup Device Permissions (Notification + Location) & System Tray Notifications
1. **Direct Native Device Permissions on Startup:**
   - Implemented `requestStartupDevicePermissions()` in `customer-frontend/src/lib/notifications.ts` invoked immediately in `customer-frontend/src/routes/__root.tsx` on initial mount.
   - Triggers native iOS system alerts directly (`UNUserNotificationCenter` alert + `CLLocationManager` location alert) without showing any extra intermediate page or modal.
   - Guarded with `localStorage` key `qp_startup_permissions_requested_v2` so it runs once on first launch and never pesters the user repeatedly.
   - On location grant, automatically reverse geocodes coordinates to initialize default customer address in state and storage.
2. **Outside System Notifications & Foreground Presentation:**
   - Configured `LocalNotifications` plugin in `customer-frontend/capacitor.config.ts` and `capacitor.config.json`.
   - Updated `triggerMobileOsNotification` to dispatch with `foreground: true` and `sound: "default"` so iOS `UNUserNotificationCenter` displays banners, plays the notification chime, and shows in Notification Center/Lock Screen whether the app is active, backgrounded, or minimized.
   - Patched `LocalNotificationsPlugin.swift` `resolveSound` to cleanly route `sound: "default"` to `UNNotificationSound.default`.
   - Added `NSLocationAlwaysAndWhenInUseUsageDescription` in `customer-frontend/ios/App/App/Info.plist`.
3. **Build & Capacitor Sync:**
   - Verified frontend compilation via `npm run build:customer`.
   - Regenerated production static bundle and synchronized Capacitor iOS platform via `python3 build_all_ios.py customer`.

### Notifications Page Banner Removal
1. **Removed "Order Bell & Live Alerts" Banner:**
   - Removed the duplicate push notification enable card and button from `customer-frontend/src/routes/notifications.tsx`.
   - Notification permissions are now handled cleanly and automatically at initial startup directly via native device pop-ups, keeping the Notifications tab interface clean and uncluttered.

### Firebase Native Background Push Notification Integration (Customer, Partner & Rider Apps)
1. **Firebase Configuration Assets Placed:**
   - Placed user-supplied `GoogleService-Info.plist` into each native iOS application target:
     - `customer-frontend/ios/App/App/GoogleService-Info.plist` (Bundle ID: `com.quickpress.customer`)
     - `partner-frontend/ios/App/App/GoogleService-Info.plist` (Bundle ID: `com.quickpress.partner`)
     - `rider-frontend/ios/App/App/GoogleService-Info.plist` (Bundle ID: `com.quickpress.rider`)
   - Placed unified `google-services.json` (project `quickpress-b1e19`) into each Android application target:
     - `customer-frontend/android/app/google-services.json`
     - `partner-frontend/android/app/google-services.json`
     - `rider-frontend/android/app/google-services.json`
2. **Capacitor Push Notifications Plugin Integration:**
   - Installed `@capacitor/push-notifications@8.1.3` across all 3 frontends (`customer-frontend`, `partner-frontend`, `rider-frontend`).
   - Configured `PushNotifications: { presentationOptions: ["badge", "sound", "alert"] }` in `capacitor.config.ts` for all 3 apps.
3. **iOS Remote Notifications Delegation & Info.plist:**
   - Added remote notifications lifecycle callbacks in `AppDelegate.swift` across all 3 apps (`didRegisterForRemoteNotificationsWithDeviceToken` and `didFailToRegisterForRemoteNotificationsWithError`) to forward APNs device tokens to Capacitor's notification bridge.
   - Added `UIBackgroundModes` with `remote-notification` key to `Info.plist` across all 3 iOS targets for true lock-screen and background push delivery.
4. **Native Device Token Syncing & Foreground Alert Listeners:**
   - Created `src/api/core/native-push.ts` in each app:
     - Customer: `customer-frontend/src/api/core/native-push.ts` (syncs role `customer` to backend `/api/notifications/fcm-token`, triggers local notification banner and audio chimes).
     - Partner: `partner-frontend/src/api/core/native-push.ts` (syncs role `partner` to backend `/api/notifications/fcm-token`, triggers partner order audio alert and toast).
     - Rider / Captain: `rider-frontend/src/api/core/native-push.ts` (syncs role `rider` to backend `/api/notifications/fcm-token`, triggers captain order alert sound and toast).
   - Hooked `initCapacitorPush()` into initial mount in `__root.tsx` across all 3 applications.
5. **Full Multi-App Build & iOS Native Workspace Synchronization:**
   - Successfully verified builds: `build:customer`, `build:partner`, and `build:rider` with zero errors.
   - Ran `python3 build_all_ios.py` to regenerate SSR fallbacks, static HTML, and synchronize assets and plugins for Customer, Partner, and Captain iOS apps.
