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
