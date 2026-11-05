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

### iPhone Notch, Safe-Area & Viewport Overflow Containment (Partner & Rider Apps)
1. **Global Safe-Area & Horizontal Overflow Architecture:**
   - Configured `html, body` in both `partner-frontend/src/styles.css` and `rider-frontend/src/styles.css` with `overflow-x: hidden; overflow-x: clip; overscroll-behavior-x: none; -webkit-text-size-adjust: 100%`.
   - Added WebKit media query enforcing `font-size: 16px !important` on all inputs, search boxes, textareas, and selects across both apps, permanently stopping iOS Safari/WebKit auto-zoom jumping and horizontal screen drift.
   - Standardized `.app-header-safe` (`padding-top: max(0.875rem, calc(env(safe-area-inset-top, 0px) + 0.5rem)) !important`), `.app-screen-safe`, and `.app-bottom-safe`.
2. **Partner App Headers & Bottom Navigation:**
   - Applied `app-header-safe` and flexible min-heights across all Partner sticky app bars (`DashboardHeader.tsx`, `ZomatoHubView.tsx`, `OrdersScreen.tsx`, `ManageServicesScreen.tsx`, `OrderDetailsScreen.tsx`, `PartnerProfileScreen.tsx`, `ShopManagementScreen.tsx`, `BusinessSettingsScreen.tsx`, `NotificationsScreen.tsx`, `PartnerReviewsScreen.tsx`, `PartnerHelpScreen.tsx`, `BusinessRegistrationScreen.tsx`, `MerchantPermissionsScreen.tsx`, `PartnerTopBar.tsx`, `PartnerAuthScreen.tsx`, `OtpVerificationScreen.tsx`).
   - Added safe-area bottom spacing in `PartnerBottomNav.tsx` (`pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.35rem))]`) preventing iPhone Home Indicator bar clipping.
   - Wrapped root layouts in `__root.tsx` and `PartnerLayout.tsx` with full overflow-x containment.
3. **Captain / Rider App Headers & Bottom Navigation:**
   - Updated `RiderLayout.tsx` top padding from `36px` to `52px` (`max(calc(env(safe-area-inset-top, 0px) + 14px), 52px)`) with `app-header-safe` to prevent notch/dynamic island clipping on mobile tab views.
   - Updated `RiderBottomNav.tsx` bottom padding to `max(calc(env(safe-area-inset-bottom, 0px) + 8px), 16px)`.
   - Wrapped root layouts with full width and overflow-x containment.
4. **Multi-App Compilation & iOS Native Workspace Sync:**
   - Verified compilation across `build:partner` and `build:rider` (zero errors).
   - Executed `python3 build_all_ios.py` to regenerate static assets and synchronize all 3 native Xcode platforms.

### Unified Master Finance Controller in Admin Console & Full Platform Pricing Engine
1. **Admin Console Master Financial Controller Card (`admin-frontend`):**
   - Implemented a unified, high-priority **QuickPress Master Finance Controller** directly at the top of the Rules tab in `admin-frontend/src/routes/finance-engine.tsx`.
   - Unified 7 key financial levers into a single responsive control dashboard:
     1. **Partner Payout Rate (%)**: Set partner revenue percentage (default: 85%), dynamically synchronizing platform commission (15%).
     2. **Delivery Boy / Captain Payout Rate (/KM Wise)**: Configurable Rate/KM (default: ₹8.00/km) and Base Pay (default: ₹25).
     3. **Handling Fee (₹)**: Configurable fee amount (default: ₹15) with an instant enable/disable toggle.
     4. **Surge Charges (₹)**: Configurable surge amount (default: ₹20), enable/disable toggle, and custom weather/demand notice text.
     5. **Packing / Packaging Charges (₹)**: Configurable packaging fee amount with an enable/disable toggle.
     6. **Free Delivery Minimum Order Threshold (₹)**: Dynamic free delivery qualification cart value (default: ₹149).
     7. **Below-Threshold Delivery Fee (₹)**: Extra delivery fee charged when cart value is below threshold (default: ₹30).
   - Added direct "Save Live Rules" action trigger and synchronized `DEFAULT_FINANCIAL_RULES`, `mapServerRulesToForm`, and `prepareRulesForSave`.
   - Updated TypeScript interfaces in `admin-frontend/src/api/finance-api.ts`.
2. **Backend Financial & Pricing Engine (`backend-python`):**
   - In `backend-python/app/services/unified_finance_service.py`:
     - Updated default `freeDeliveryThreshold` from `499.0` to `149.0` and `baseFee` to `30.0`.
     - Added conditional checking for `handlingFeeEnabled` and `packagingFeeEnabled` in `_calc_fee`.
     - Integrated `partnerPayoutPercent` support in settlement calculations.
     - Synchronized rider `/km` distance payout to `riderPayout.perKmRate` (default: ₹8.0/km).
   - In `backend-python/app/services/financial_engine.py`:
     - Updated fallback defaults to `freeDeliveryThreshold: 149.0`, `baseDeliveryFee: 30.0`, `standardCommissionRate: 0.15`, and `riderPerKmRate: 8.0`.
   - Updated and verified 14 unit and integration tests across `test_unified_finance_engine.py`, `test_finance_rules_precision.py`, and `test_finance_rules_and_admin_pnl.py` (100% pass rate).
3. **Customer Checkout & Bill Details (`customer-frontend`):**
   - In `customer-frontend/src/routes/checkout.tsx`:
     - Dynamically evaluates `freeDeliveryThreshold` (default: ₹149) and `baseDeliveryFee` (default: ₹30).
     - Added an interactive Free Delivery Reward Banner informing users how much more to add to unlock 100% Free Delivery (or celebrating when unlocked).
     - Separated Handling Fee and Packing / Packaging Charge in Bill Details breakdown when enabled by Admin.
   - In `customer-frontend/src/api/customer/finance-api.ts`:
     - Synchronized `FinancialRules` interface and `DEFAULT_FINANCIAL_RULES` defaults (`freeDeliveryThreshold: 149`, `fees.handlingFeeEnabled: true`, `fees.packagingFeeEnabled: false`).
4. **Verification & Cross-Platform iOS Sync:**
   - Verified builds: `build:admin`, `build:customer`, `build:partner`, and `build:rider` (all passed with zero errors).
   - Ran `python3 build_all_ios.py` to synchronize native iOS platforms across Customer, Partner, and Captain apps.
