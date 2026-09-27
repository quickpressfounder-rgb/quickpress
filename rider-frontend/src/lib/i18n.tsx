import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type LanguageCode = "en" | "hi" | "te" | "kn" | "ta" | "mr" | "bn" | "ml";

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam" },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  // 1. English
  en: {
    "app.name": "quickpress",
    "app.partner": "DELIVERY PARTNER",
    "lang.selectTitle": "Select language",
    "lang.selectSub": "Select one from below",
    "lang.proceed": "Proceed",

    // Slides
    "slides.skip": "Skip",
    "slides.continue": "Continue",
    "slides.getStarted": "Get Started",
    "slides.1.badge": "0% COMMISSION",
    "slides.1.title": "Zero Commission, 100% Earnings",
    "slides.1.subtitle": "All your earnings go straight to your wallet. Zero platform deductions!",
    "slides.1.highlight": "Daily Direct Bank Payouts 💰",
    "slides.2.badge": "SMART DISPATCH",
    "slides.2.title": "Live Ride & Delivery Dispatches",
    "slides.2.subtitle": "Receive instant orders on your mobile with live GPS tracking.",
    "slides.2.highlight": "High Demand in Work Zones 📍",
    "slides.3.badge": "FULL FLEXIBILITY",
    "slides.3.title": "Flexible Working Hours",
    "slides.3.subtitle": "Work whenever you want. Turn ON DUTY and earn on your schedule.",
    "slides.3.highlight": "Be Your Own Boss 🛵",

    // Auth
    "auth.signIn": "Sign in to your account",
    "auth.loginOrCreate": "Login or create an account",
    "auth.enterPhone": "Enter mobile number",
    "auth.validPhone": "Enter a valid 10 digit mobile number",
    "auth.lostPhone": "Lost your phone number?",
    "auth.reachUs": "Reach us",
    "auth.whatsApp": "Get OTP on WhatsApp",
    "auth.whatsAppSub": "Fast & instant verification",
    "auth.continue": "Continue",
    "auth.termsNotice": "By continuing, you agree to our Terms and Conditions",

    // OTP
    "otp.title": "Enter 6-digit OTP",
    "otp.sentTo": "Sent to",
    "otp.changeNumber": "Change Number",
    "otp.didntReceive": "Didn't receive code?",
    "otp.resendIn": "Resend in",
    "otp.resendOtp": "Resend OTP",
    "otp.verifyContinue": "Verify & Continue",
    "otp.secureBadge": "QuickPress Captain 100% Secure Verification",

    // Dashboard
    "dash.onDuty": "ON DUTY",
    "dash.offDuty": "OFF DUTY",
    "dash.searching": "Searching nearby rides...",
    "dash.todayEarnings": "Today's Earnings",
    "dash.zeroCommission": "Zero Commission Benefit",
    "dash.knowMore": "Know more",
    "dash.workZone": "More orders inside Work Zone",
    "dash.workZoneSub": "Stay within 2.5 km of Hub for faster dispatches",
    "dash.goOnDuty": "GO ON DUTY TO START EARNING",

    // Navigation
    "nav.dashboard": "Home",
    "nav.orders": "Orders",
    "nav.wallet": "Earnings",
    "nav.earnings": "Earnings",
    "nav.leaderboard": "Leaderboard",
    "nav.incentives": "Incentives",
    "nav.profile": "Profile",

    // Profile
    "profile.title": "Captain Profile & Settings",
    "profile.totalTrips": "Total Trips",
    "profile.cityHub": "City Hub",
    "profile.kycStatus": "KYC Status",
    "profile.verified": "VERIFIED ✓",
    "profile.underReview": "UNDER REVIEW ⏳",
    "profile.vehicleDetails": "Vehicle & Documents",
    "profile.bankDetails": "Bank & Settlement Payouts",
    "profile.operationalSettings": "Operational Settings",
    "profile.soundAlerts": "Audio & Siren Alerts",
    "profile.routeBooking": "Home Route Booking",
    "profile.guidelines": "Captain Guidelines & SOP",
    "profile.support": "24/7 Captain Helpline & SOS",
    "profile.logout": "Logout Captain Account",

    // Orders
    "orders.title": "Live Orders",
    "orders.liveQueue": "Live Order Queue",
    "orders.noOrders": "No orders in queue right now",
    "orders.waitingNotice": "Stay in your Work Zone to receive instant dispatches",
    "orders.accept": "Accept Ride",
    "orders.reject": "Reject",

    // Wallet & Earnings
    "wallet.title": "Earnings & Wallet",
    "wallet.balance": "Total Wallet Balance",
    "wallet.today": "Today's Earnings",
    "wallet.thisWeek": "This Week's Earnings",
    "wallet.lifetime": "Lifetime Earnings",
    "wallet.cashout": "Instant UPI Cashout",
    "wallet.passbook": "Passbook Ledger",
    "wallet.noTxn": "No transactions found",
    "earnings.title": "Earnings & Wallet",
    "earnings.availableBalance": "Available Balance",
    "earnings.passbook": "Passbook & Ledger",
    "earnings.todayEarnings": "Today's Earnings",
    "earnings.thisWeek": "This Week",
    "earnings.lifetime": "Lifetime Earnings",
    "earnings.totalTransferred": "Total Transferred",
    "earnings.cashout": "Request Settlement Payout",
    "earnings.synced": "Wallet & Passbook Updated 🟢",

    // Leaderboard
    "leaderboard.title": "City Leaderboard",
    "leaderboard.sub": "Top Captains in City",
    "leaderboard.today": "Today",
    "leaderboard.weekly": "Weekly",
    "leaderboard.allTime": "All Time",
    "leaderboard.yourRank": "Your Rank",
    "leaderboard.trips": "Trips",

    // Incentives
    "incentives.title": "Incentives & Targets",
    "incentives.dailyMilestone": "Daily Milestone Slabs",
    "incentives.weeklyStreak": "6-Day Duty Streak",
    "incentives.specialQuests": "Special Quests & Surges",
    "incentives.completed": "Completed",
    "incentives.remaining": "Remaining",
  },

  // 2. Hindi
  hi: {
    "app.name": "क्विकप्रेस",
    "app.partner": "डिलीवरी पार्टनर",
    "lang.selectTitle": "भाषा चुनें",
    "lang.selectSub": "नीचे दी गई भाषा में से एक चुनें",
    "lang.proceed": "आगे बढ़ें (Proceed)",

    // Slides
    "slides.skip": "छोड़ें (Skip)",
    "slides.continue": "जारी रखें",
    "slides.getStarted": "शुरू करें",
    "slides.1.badge": "0% कमीशन",
    "slides.1.title": "जीरो कमीशन, 100% आपकी कमाई",
    "slides.1.subtitle": "जितनी डिलीवरी और राइड्स करोगे, पूरी कमाई सीधा आपके वॉलेट में आएगी। कोई कटौती नहीं!",
    "slides.1.highlight": "दैनिक बैंक भुगतान गारंटी 💰",
    "slides.2.badge": "स्मार्ट डिस्पैच",
    "slides.2.title": "लाइव राइड और डिलीवरी ऑर्डर्स",
    "slides.2.subtitle": "कस्बे में लाइव जीपीएस ट्रैकिंग के साथ सीधे मोबाइल पर तुरंत ऑर्डर पाएं।",
    "slides.2.highlight": "वर्क ज़ोन में भारी मांग 📍",
    "slides.3.badge": "पूरी आज़ादी",
    "slides.3.title": "अपनी मर्जी के काम के घंटे",
    "slides.3.subtitle": "जब मन चाहे ऑन ड्यूटी हो जाओ, जब चाहे ब्रेक लो। अपनी मर्जी से कमाओ!",
    "slides.3.highlight": "खुद के मालिक बनें 🛵",

    // Auth
    "auth.signIn": "अपने खाते में साइन इन करें",
    "auth.loginOrCreate": "लॉगिन करें या नया खाता बनाएं",
    "auth.enterPhone": "मोबाइल नंबर दर्ज करें",
    "auth.validPhone": "10 अंकों का मान्य मोबाइल नंबर दर्ज करें",
    "auth.lostPhone": "फोन नंबर बदल गया?",
    "auth.reachUs": "संपर्क करें",
    "auth.whatsApp": "व्हाट्सएप पर ओटीपी पाएं",
    "auth.whatsAppSub": "तेज़ और तुरंत सत्यापन",
    "auth.continue": "आगे बढ़ें (Continue)",
    "auth.termsNotice": "जारी रखकर, आप हमारे नियम और शर्तों से सहमत होते हैं",

    // OTP
    "otp.title": "6 अंकों का ओटीपी दर्ज करें",
    "otp.sentTo": "भेजा गया नंबर:",
    "otp.changeNumber": "नंबर बदलें",
    "otp.didntReceive": "कोड नहीं मिला?",
    "otp.resendIn": "पुनः भेजें:",
    "otp.resendOtp": "ओटीपी दोबारा भेजें",
    "otp.verifyContinue": "सत्यापित करें और आगे बढ़ें",
    "otp.secureBadge": "क्विकप्रेस कैप्टन 100% सुरक्षित सत्यापन",

    // Dashboard
    "dash.onDuty": "ऑन ड्यूटी (ON DUTY)",
    "dash.offDuty": "ऑफ ड्यूटी (OFF DUTY)",
    "dash.searching": "आस-पास राइड्स खोजी जा रही हैं...",
    "dash.todayEarnings": "आज की कमाई",
    "dash.zeroCommission": "जीरो कमीशन लाभ",
    "dash.knowMore": "और जानें",
    "dash.workZone": "वर्क ज़ोन के अंदर अधिक ऑर्डर्स",
    "dash.workZoneSub": "तेज़ डिस्पैच के लिए हब के 2.5 किमी के दायरे में रहें",
    "dash.goOnDuty": "कमाई शुरू करने के लिए ऑन ड्यूटी जाएं",

    // Navigation
    "nav.dashboard": "होम",
    "nav.orders": "ऑर्डर्स",
    "nav.wallet": "कमाई (वॉलेट)",
    "nav.leaderboard": "लीडरबोर्ड",
    "nav.incentives": "टारगेट व बोनस",
    "nav.profile": "प्रोफाइल",

    // Profile
    "profile.title": "कैप्टन प्रोफाइल व सेटिंग्स",
    "profile.totalTrips": "कुल राइड्स",
    "profile.cityHub": "शहर हब",
    "profile.kycStatus": "केवाईसी स्थिति",
    "profile.verified": "सत्यापित ✓",
    "profile.underReview": "जांच जारी ⏳",
    "profile.vehicleDetails": "वाहन व दस्तावेज विवरण",
    "profile.bankDetails": "बैंक व यूपीआई भुगतान विवरण",
    "profile.operationalSettings": "कार्य संचालन सेटिंग्स",
    "profile.soundAlerts": "ऑडियो व सायरन अलर्ट",
    "profile.routeBooking": "घर का रूट बुकिंग",
    "profile.guidelines": "कैप्टन नियम व दिशानिर्देश",
    "profile.support": "24/7 कैप्टन हेल्पलाइन व SOS",
    "profile.logout": "कैप्टन अकाउंट लॉगआउट करें",

    // Orders
    "orders.title": "लाइव ऑर्डर्स",
    "orders.liveQueue": "लाइव ऑर्डर कतार",
    "orders.noOrders": "अभी कतार में कोई नया ऑर्डर नहीं है",
    "orders.waitingNotice": "तुरंत ऑर्डर पाने के लिए वर्क ज़ोन में रहें",
    "orders.accept": "राइड स्वीकार करें",
    "orders.reject": "अस्वीकार",

    // Wallet & Earnings
    "nav.earnings": "कमाई (Earnings)",
    "wallet.title": "कमाई और पासबुक",
    "wallet.balance": "कुल वॉलेट बैलेंस",
    "wallet.today": "आज की कमाई",
    "wallet.thisWeek": "इस सप्ताह की कमाई",
    "wallet.lifetime": "कुल जीवन भर की कमाई",
    "wallet.cashout": "तुरंत यूपीआई बैंक निकासी",
    "wallet.passbook": "पासबुक खाता बही",
    "wallet.noTxn": "कोई लेनदेन नहीं मिला",
    "earnings.title": "कमाई और पासबुक",
    "earnings.availableBalance": "उपलब्ध बैलेंस",
    "earnings.passbook": "पासबुक लेजर",
    "earnings.todayEarnings": "आज की कमाई",
    "earnings.thisWeek": "इस सप्ताह",
    "earnings.lifetime": "कुल जीवन भर की कमाई",
    "earnings.totalTransferred": "ट्रांसफर की गई राशि",
    "earnings.cashout": "निकासी अनुरोध",
    "earnings.synced": "वॉलेट व पासबुक अपडेट 🟢",

    // Leaderboard
    "leaderboard.title": "सिटी लीडरबोर्ड",
    "leaderboard.sub": "शहर के टॉप कैप्टन",
    "leaderboard.today": "आज",
    "leaderboard.weekly": "साप्ताहिक",
    "leaderboard.allTime": "अब तक",
    "leaderboard.yourRank": "आपकी रैंक",
    "leaderboard.trips": "राइड्स",

    // Incentives
    "incentives.title": "इंसेंटिव व दैनिक टारगेट",
    "incentives.dailyMilestone": "दैनिक माइलस्टोन स्लैब",
    "incentives.weeklyStreak": "6-दिन ड्यूटी स्ट्रीक बोनस",
    "incentives.specialQuests": "विशेष क्वेस्ट व सर्ज बोनस",
    "incentives.completed": "पूरा हुआ",
    "incentives.remaining": "बाकी",
  },

  // 3. Telugu
  te: {
    "app.name": "క్విక్‌ప్రెస్",
    "app.partner": "డెలివరీ భాగస్వామి",
    "lang.selectTitle": "భాషను ఎంచుకోండి",
    "lang.selectSub": "క్రింది నుండి ఒకదాన్ని ఎంచుకోండి",
    "lang.proceed": "కొనసాగించండి (Proceed)",

    // Slides
    "slides.skip": "దాటవేయి",
    "slides.continue": "కొనసాగించండి",
    "slides.getStarted": "ప్రారంభించండి",
    "slides.1.badge": "0% కమీషన్",
    "slides.1.title": "జీరో కమీషన్, 100% మీ ఆదాయం",
    "slides.1.subtitle": "మీ సంపాదన అంతా నేరుగా మీ వాలెట్‌కు చేరుతుంది. ఎటువంటి కమీషన్ ఉండదు!",
    "slides.1.highlight": "రోజువారీ బ్యాంక్ చెల్లింపులు 💰",
    "slides.2.badge": "స్మార్ట్ ఆర్డర్లు",
    "slides.2.title": "లైవ్ రైడ్ & డెలివరీ ఆర్డర్‌లు",
    "slides.2.subtitle": "లైవ్ జీపీఎస్ ద్వారా మీ మొబైల్‌కు తక్షణ ఆర్డర్‌లను పొందండి.",
    "slides.2.highlight": "వర్క్ జోన్‌లో ఎక్కువ డిమాండ్ 📍",
    "slides.3.badge": "పూర్తి స్వేచ్ఛ",
    "slides.3.title": "మీకు నచ్చిన సమయాల్లో పని చేయండి",
    "slides.3.subtitle": "మీకు ఇష్టమైనప్పుడు ఆన్ డ్యూటీ అవ్వండి, ఆదాయం పొందండి.",
    "slides.3.highlight": "స్వతంత్రంగా సంపాదించండి 🛵",

    // Auth
    "auth.signIn": "మీ ఖాతాలోకి సైన్ ఇన్ చేయండి",
    "auth.loginOrCreate": "లాగిన్ చేయండి లేదా కొత్త ఖాతాను సృష్టించండి",
    "auth.enterPhone": "మొబైల్ నంబర్‌ను నమోదు చేయండి",
    "auth.validPhone": "సరైన 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి",
    "auth.lostPhone": "ఫోన్ నంబర్ పోయిందా?",
    "auth.reachUs": "మమ్మల్ని సంప్రదించండి",
    "auth.whatsApp": "వాట్సాప్‌లో OTP పొందండి",
    "auth.whatsAppSub": "వేగవంతమైన ధృవీకరణ",
    "auth.continue": "కొనసాగించండి",
    "auth.termsNotice": "కొనసాగించడం ద్వారా, మీరు నిబంధనలు మరియు షరతులకు అంగీకరిస్తున్నారు",

    // OTP
    "otp.title": "6 అంకెల OTP నమోదు చేయండి",
    "otp.sentTo": "పంపబడిన నంబర్:",
    "otp.changeNumber": "నంబర్ మార్చండి",
    "otp.didntReceive": "కోడ్ రాలేదా?",
    "otp.resendIn": "మళ్ళీ పంపే సమయం:",
    "otp.resendOtp": "OTP మళ్ళీ పంపండి",
    "otp.verifyContinue": "ధృవీకరించి కొనసాగించండి",
    "otp.secureBadge": "క్విక్‌ప్రెస్ 100% సురక్షిత ధృవీకరణ",

    // Dashboard
    "dash.onDuty": "ఆన్ డ్యూటీ",
    "dash.offDuty": "ఆఫ్ డ్యూటీ",
    "dash.searching": "రైడ్‌ల కోసం వెతుకుతోంది...",
    "dash.todayEarnings": "ఈ రోజు సంపాదన",
    "dash.zeroCommission": "జీరో కమీషన్ ప్రయోజనం",
    "dash.knowMore": "మరింత తెలుసుకోండి",
    "dash.workZone": "వర్క్ జోన్‌లో ఎక్కువ ఆర్డర్‌లు",
    "dash.workZoneSub": "వేగవంతమైన ఆర్డర్‌ల కోసం హబ్ దగ్గర ఉండండి",
    "dash.goOnDuty": "సంపాదించడానికి ఆన్ డ్యూటీ అవ్వండి",
  },

  // 4. Kannada
  kn: {
    "app.name": "ಕ್ವಿಕ್‌ಪ್ರೆಸ್",
    "app.partner": "ಡೆಲಿವರಿ ಪಾಲುದಾರ",
    "lang.selectTitle": "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    "lang.selectSub": "ಕೆಳಗಿನವುಗಳಿಂದ ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    "lang.proceed": "ಮುಂದುವರಿಯಿರಿ (Proceed)",

    // Slides
    "slides.skip": "ಬಿಟ್ಟುಬಿಡಿ",
    "slides.continue": "ಮುಂದುವರಿಯಿರಿ",
    "slides.getStarted": "ಪ್ರಾರಂಭಿಸಿ",
    "slides.1.badge": "0% ಕಮಿಷನ್",
    "slides.1.title": "ಶೂನ್ಯ ಕಮಿಷನ್, 100% ನಿಮ್ಮ ಗಳಿಕೆ",
    "slides.1.subtitle": "ನಿಮ್ಮ ಎಲ್ಲಾ ಗಳಿಕೆಗಳು ನೇರವಾಗಿ ನಿಮ್ಮ ಖಾತೆಗೆ ಜಮೆಯಾಗುತ್ತವೆ.",
    "slides.1.highlight": "ದೈನಂದಿನ ಬ್ಯಾಂಕ್ ಪಾವತಿಗಳು 💰",
    "slides.2.badge": "ಸ್ಮಾರ್ಟ್ ಡಿಸ್ಪ್ಯಾಚ್",
    "slides.2.title": "ಲೈವ್ ರೈಡ್ ಮತ್ತು ಡೆಲಿವರಿ ಆರ್ಡರ್‌ಗಳು",
    "slides.2.subtitle": "ಲೈವ್ ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಮೂಲಕ ತಕ್ಷಣ ಆರ್ಡರ್‌ಗಳನ್ನು ಪಡೆಯಿರಿ.",
    "slides.2.highlight": "ವರ್ಕ್ ಜೋನ್‌ನಲ್ಲಿ ಹೆಚ್ಚಿನ ಬೇಡಿಕೆ 📍",
    "slides.3.badge": "ಸಂಪೂರ್ಣ ಸ್ವಾತಂತ್ರ್ಯ",
    "slides.3.title": "ನಿಮ್ಮ ಅನುಕೂಲಕ್ಕೆ ತಕ್ಕಂತೆ ಕೆಲಸ ಮಾಡಿ",
    "slides.3.subtitle": "ನಿಮಗೆ ಬೇಕಾದಾಗ ಆನ್ ಡ್ಯೂಟಿ ಆಗಿ, ಸ್ವತಂತ್ರವಾಗಿ ಗಳಿಸಿ.",
    "slides.3.highlight": "ನಿಮ್ಮದೇ ಬಾಸ್ ಆಗಿರಿ 🛵",

    // Auth
    "auth.signIn": "ನಿಮ್ಮ ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ",
    "auth.loginOrCreate": "ಲಾಗಿನ್ ಮಾಡಿ ಅಥವಾ ಖಾತೆ ರಚಿಸಿ",
    "auth.enterPhone": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
    "auth.validPhone": "ಮಾನ್ಯ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ",
    "auth.lostPhone": "ಫೋನ್ ಸಂಖ್ಯೆ ಕಳೆದುಹೋಗಿದೆಯೇ?",
    "auth.reachUs": "ಸಹಾಯ ಪಡೆಯಿರಿ",
    "auth.whatsApp": "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ OTP ಪಡೆಯಿರಿ",
    "auth.whatsAppSub": "ತ್ವರಿತ ದೃಢೀಕರಣ",
    "auth.continue": "ಮುಂದುವರಿಯಿರಿ",
    "auth.termsNotice": "ಮುಂದುವರಿಯುವ ಮೂಲಕ, ನೀವು ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳನ್ನು ಒಪ್ಪುತ್ತೀರಿ",

    // OTP
    "otp.title": "6 ಅಂಕಿಗಳ OTP ನಮೂದಿಸಿ",
    "otp.sentTo": "ಕಳುಹಿಸಲಾದ ಸಂಖ್ಯೆ:",
    "otp.changeNumber": "ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ",
    "otp.didntReceive": "ಕೋಡ್ ಬಂದಿಲ್ಲವೇ?",
    "otp.resendIn": "ಮರುಕಳುಹಿಸುವ ಸಮಯ:",
    "otp.resendOtp": "OTP ಮರುಕಳುಹಿಸಿ",
    "otp.verifyContinue": "ದೃಢೀಕರಿಸಿ ಮುಂದುವರಿಯಿರಿ",
    "otp.secureBadge": "ಕ್ವಿಕ್‌ಪ್ರೆಸ್ 100% ಸುರಕ್ಷಿತ ದೃಢೀಕರಣ",

    // Dashboard
    "dash.onDuty": "ಆನ್ ಡ್ಯೂಟಿ",
    "dash.offDuty": "ಆಫ್ ಡ್ಯೂಟಿ",
    "dash.searching": "ರೈಡ್‌ಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    "dash.todayEarnings": "ಇಂದಿನ ಗಳಿಕೆ",
    "dash.zeroCommission": "ಶೂನ್ಯ ಕಮಿಷನ್ ಲಾಭ",
    "dash.knowMore": "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ",
    "dash.workZone": "ವರ್ಕ್ ಜೋನ್‌ನಲ್ಲಿ ಹೆಚ್ಚಿನ ಆರ್ಡರ್‌ಗಳು",
    "dash.workZoneSub": "ವೇಗದ ಆರ್ಡರ್‌ಗಳಿಗಾಗಿ ಹಬ್ ಬಳಿ ಇರಿ",
    "dash.goOnDuty": "ಗಳಿಕೆಯನ್ನು ಪ್ರಾರಂಭಿಸಲು ಆನ್ ಡ್ಯೂಟಿ ಆಗಿ",
  },

  // 5. Tamil
  ta: {
    "app.name": "குவிக்பிரஸ்",
    "app.partner": "டெலிவரி பார்ட்னர்",
    "lang.selectTitle": "மொழியைத் தேர்ந்தெடுக்கவும்",
    "lang.selectSub": "கீழே உள்ளவற்றில் ஒன்றைத் தேர்ந்தெடுக்கவும்",
    "lang.proceed": "தொடரவும் (Proceed)",

    // Slides
    "slides.skip": "தவிர்",
    "slides.continue": "தொடரவும்",
    "slides.getStarted": "தொடங்கவும்",
    "slides.1.badge": "0% கமிஷன்",
    "slides.1.title": "பூஜ்ஜிய கமிஷன், 100% உங்கள் வருமானம்",
    "slides.1.subtitle": "உங்கள் வருமானம் அனைத்தும் நேரடியாக உங்கள் வங்கிக் கணக்கில் சேரும்.",
    "slides.1.highlight": "தினசரி வங்கிப் பணம் செலுத்துதல் 💰",
    "slides.2.badge": "ஸ்மார்ட் ஆர்டர்கள்",
    "slides.2.title": "நேரலை ரைடு மற்றும் டெலிவரி ஆர்டர்கள்",
    "slides.2.subtitle": "ஜிபிஎஸ் மூலம் உங்கள் மொபைலில் உடனடி ஆர்டர்களைப் பெறுங்கள்.",
    "slides.2.highlight": "வொர்க் சோனில் அதிக தேவை 📍",
    "slides.3.badge": "முழு சுதந்திரம்",
    "slides.3.title": "உங்கள் விருப்பப்படி வேலை நேரம்",
    "slides.3.subtitle": "நீங்கள் விரும்பும் போது ஆன் டியூட்டி ஆகி சம்பாதிக்கலாம்.",
    "slides.3.highlight": "சுயமாக சம்பாதிக்கவும் 🛵",

    // Auth
    "auth.signIn": "உங்கள் கணக்கில் உள்நுழையவும்",
    "auth.loginOrCreate": "உள்நுழையவும் அல்லது கணக்கை உருவாக்கவும்",
    "auth.enterPhone": "மொபைல் எண்ணை உள்ளிடவும்",
    "auth.validPhone": "சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்",
    "auth.lostPhone": "தொலைபேசி எண் தொலைந்துவிட்டதா?",
    "auth.reachUs": "தொடர்பு கொள்ளவும்",
    "auth.whatsApp": "வாட்ஸ்அப்பில் OTP பெறவும்",
    "auth.whatsAppSub": "விரைவான சரிபார்ப்பு",
    "auth.continue": "தொடரவும்",
    "auth.termsNotice": "தொடர்வதன் மூலம், எங்கள் விதிமுறைகளை ஏற்கிறீர்கள்",

    // OTP
    "otp.title": "6 இலக்க OTP ஐ உள்ளிடவும்",
    "otp.sentTo": "அனுப்பப்பட்ட எண்:",
    "otp.changeNumber": "எண்ணை மாற்றவும்",
    "otp.didntReceive": "குறியீடு வரவில்லையா?",
    "otp.resendIn": "மீண்டும் அனுப்ப நேரம்:",
    "otp.resendOtp": "OTP ஐ மீண்டும் அனுப்பவும்",
    "otp.verifyContinue": "சரிபார்த்து தொடரவும்",
    "otp.secureBadge": "குவிக்பிரஸ் 100% பாதுகாப்பான சரிபார்ப்பு",

    // Dashboard
    "dash.onDuty": "ஆன் டியூட்டி",
    "dash.offDuty": "ஆஃப் டியூட்டி",
    "dash.searching": "சவாரிகளைத் தேடுகிறது...",
    "dash.todayEarnings": "இன்றைய வருமானம்",
    "dash.zeroCommission": "பூஜ்ஜிய கமிஷன் நன்மை",
    "dash.knowMore": "மேலும் அறிய",
    "dash.workZone": "வொர்க் சோனில் அதிக ஆர்டர்கள்",
    "dash.workZoneSub": "விரைவான ஆர்டர்களுக்கு ஹப் அருகில் இருங்கள்",
    "dash.goOnDuty": "சம்பாதிக்க ஆன் டியூட்டி செல்லவும்",
  },

  // 6. Marathi
  mr: {
    "app.name": "क्विकप्रेस",
    "app.partner": "डिलिव्हरी पार्टनर",
    "lang.selectTitle": "भाषा निवडा",
    "lang.selectSub": "खालीलपैकी एक भाषा निवडा",
    "lang.proceed": "पुढे चला (Proceed)",

    // Slides
    "slides.skip": "वगळा",
    "slides.continue": "पुढे जा",
    "slides.getStarted": "सुरू करा",
    "slides.1.badge": "0% कमिशन",
    "slides.1.title": "झिरो कमिशन, 100% तुमची कमाई",
    "slides.1.subtitle": "तुमची सर्व कमाई थेट तुमच्या वॉलेटमध्ये जमा होईल. कोणतीही कपात नाही!",
    "slides.1.highlight": "दररोज बँक पेआउट्स 💰",
    "slides.2.badge": "स्मार्ट डिस्पॅच",
    "slides.2.title": "लाईव्ह राइड आणि डिलिव्हरी ऑर्डर्स",
    "slides.2.subtitle": "थेट जीपीएस ट्रॅकिंगसह थेट मोबाईलवर त्वरित ऑर्डर्स मिळवा.",
    "slides.2.highlight": "वर्क झोनमध्ये जास्त मागणी 📍",
    "slides.3.badge": "पूर्ण स्वातंत्र्य",
    "slides.3.title": "तुमच्या सोयीनुसार कामाचे तास",
    "slides.3.subtitle": "जेव्हा हवे तेव्हा ऑन ड्युटी व्हा आणि स्वतःच्या मर्जीने कमवा.",
    "slides.3.highlight": "स्वतःचे बॉस बना 🛵",

    // Auth
    "auth.signIn": "तुमच्या खात्यात साइन इन करा",
    "auth.loginOrCreate": "लॉगिन करा किंवा नवीन खाते तयार करा",
    "auth.enterPhone": "मोबाईल नंबर प्रविष्ट करा",
    "auth.validPhone": "वैध 10 अंकी मोबाईल नंबर प्रविष्ट करा",
    "auth.lostPhone": "फोन नंबर हरवला?",
    "auth.reachUs": "संपर्क साधा",
    "auth.whatsApp": "व्हॉट्सॲपवर OTP मिळवा",
    "auth.whatsAppSub": "जलद आणि सोपे सत्यापन",
    "auth.continue": "पुढे जा (Continue)",
    "auth.termsNotice": "पुढे चालू ठेवून, आपण अटी आणि शर्तींशी सहमत आहात",

    // OTP
    "otp.title": "6 अंकी OTP प्रविष्ट करा",
    "otp.sentTo": "पाठवलेला नंबर:",
    "otp.changeNumber": "नंबर बदला",
    "otp.didntReceive": "कोड मिळाला नाही?",
    "otp.resendIn": "पुन्हा पाठवा:",
    "otp.resendOtp": "OTP पुन्हा पाठवा",
    "otp.verifyContinue": "सत्यापित करा आणि पुढे जा",
    "otp.secureBadge": "क्विकप्रेस 100% सुरक्षित सत्यापन",

    // Dashboard
    "dash.onDuty": "ऑन ड्युटी",
    "dash.offDuty": "ऑफ ड्युटी",
    "dash.searching": "जवळपास राइड्स शोधत आहे...",
    "dash.todayEarnings": "आजची कमाई",
    "dash.zeroCommission": "झिरो कमिशन फायदा",
    "dash.knowMore": "अधिक माहिती",
    "dash.workZone": "वर्क झोनमध्ये अधिक ऑर्डर्स",
    "dash.workZoneSub": "जलद ऑर्डर्ससाठी हबजवळ राहा",
    "dash.goOnDuty": "कमाई सुरू करण्यासाठी ऑन ड्युटी जा",
  },

  // 7. Bengali
  bn: {
    "app.name": "কুইকপ্রেস",
    "app.partner": "ডেলিভারি পার্টনার",
    "lang.selectTitle": "ভাষা নির্বাচন করুন",
    "lang.selectSub": "নিচে থেকে একটি বেছে নিন",
    "lang.proceed": "এগিয়ে যান (Proceed)",

    // Slides
    "slides.skip": "এড়িয়ে যান",
    "slides.continue": "চালিয়ে যান",
    "slides.getStarted": "শুরু করুন",
    "slides.1.badge": "০% কমিশন",
    "slides.1.title": "জিরো কমিশন, ১০০% আপনার উপার্জন",
    "slides.1.subtitle": "আপনার সমস্ত উপার্জন সরাসরি আপনার অ্যাকাউন্টে যাবে। কোনো কমিশন কাটা হবে না!",
    "slides.1.highlight": "প্রতিদিন ব্যাংক পেআউট 💰",
    "slides.2.badge": "স্মার্ট অর্ডার",
    "slides.2.title": "লাইভ রাইড এবং ডেলিভারি অর্ডার",
    "slides.2.subtitle": "লাইভ জিপিএস ট্র্যাকিং সহ আপনার মোবাইলে সরাসরি অর্ডার পান।",
    "slides.2.highlight": "ওয়ার্ক জোনে উচ্চ চাহিদা 📍",
    "slides.3.badge": "সম্পূর্ণ স্বাধীনতা",
    "slides.3.title": "আপনার ইচ্ছামত কাজের সময়",
    "slides.3.subtitle": "যখন ইচ্ছা অন ডিউটি হন এবং নিজের সুবিধামত আয় করুন।",
    "slides.3.highlight": "নিজের বস নিজেই হন 🛵",

    // Auth
    "auth.signIn": "আপনার অ্যাকাউন্টে সাইন ইন করুন",
    "auth.loginOrCreate": "লগইন করুন বা একটি অ্যাকাউন্ট তৈরি করুন",
    "auth.enterPhone": "মোবাইল নম্বর লিখুন",
    "auth.validPhone": "সঠিক ১০ সংখ্যার মোবাইল নম্বর লিখুন",
    "auth.lostPhone": "ফোন নম্বর হারিয়ে গেছে?",
    "auth.reachUs": "যোগাযোগ করুন",
    "auth.whatsApp": "হোয়াটসঅ্যাপে OTP পান",
    "auth.whatsAppSub": "দ্রুত এবং সহজ যাচাইকরণ",
    "auth.continue": "এগিয়ে যান",
    "auth.termsNotice": "চালিয়ে যাওয়ার মাধ্যমে, আপনি শর্তাবলী সম্মত হন",

    // OTP
    "otp.title": "৬ সংখ্যার OTP লিখুন",
    "otp.sentTo": "পাঠানো হয়েছে:",
    "otp.changeNumber": "নম্বর পরিবর্তন করুন",
    "otp.didntReceive": "কোড পাননি?",
    "otp.resendIn": "পুনরায় পাঠানোর সময়:",
    "otp.resendOtp": "OTP আবার পাঠান",
    "otp.verifyContinue": "যাচাই করুন এবং এগিয়ে যান",
    "otp.secureBadge": "কুইকপ্রেস ১০০% নিরাপদ যাচাইকরণ",

    // Dashboard
    "dash.onDuty": "অন ডিউটি",
    "dash.offDuty": "অফ ডিউটি",
    "dash.searching": "রাইড খোঁজা হচ্ছে...",
    "dash.todayEarnings": "আজকের উপার্জন",
    "dash.zeroCommission": "জিরো কমিশন সুবিধা",
    "dash.knowMore": "আরো জানুন",
    "dash.workZone": "ওয়ার্ক জোনে বেশি অর্ডার",
    "dash.workZoneSub": "দ্রুত অর্ডারের জন্য হাবের কাছাকাছি থাকুন",
    "dash.goOnDuty": "আয় শুরু করতে অন ডিউটি যান",
  },

  // 8. Malayalam
  ml: {
    "app.name": "ക്വിക്ക്പ്രസ്സ്",
    "app.partner": "ഡെലിവറി പാർട്ണർ",
    "lang.selectTitle": "ഭാഷ തിരഞ്ഞെടുക്കുക",
    "lang.selectSub": "താഴെ നൽകിയിരിക്കുന്നതിൽ ഒന്ന് തിരഞ്ഞെടുക്കുക",
    "lang.proceed": "തുടരുക (Proceed)",

    // Slides
    "slides.skip": "ഒഴിവാക്കുക",
    "slides.continue": "തുടരുക",
    "slides.getStarted": "ആരംഭിക്കുക",
    "slides.1.badge": "0% കമ്മീഷൻ",
    "slides.1.title": "സീറോ കമ്മീഷൻ, 100% നിങ്ങളുടെ വരുമാനം",
    "slides.1.subtitle": "നിങ്ങളുടെ എല്ലാ വരുമാനവും നേരിട്ട് നിങ്ങളുടെ അക്കൗണ്ടിലേക്ക് എത്തും.",
    "slides.1.highlight": "ദിവസേനയുള്ള ബാങ്ക് പേഔട്ടുകൾ 💰",
    "slides.2.badge": "സ്മാർട്ട് ഓർഡറുകൾ",
    "slides.2.title": "ലൈവ് റൈഡ് & ഡെലിവറി ഓർഡറുകൾ",
    "slides.2.subtitle": "ലൈവ് ജിപിഎസ് വഴി നിങ്ങളുടെ മൊബൈലിൽ നേരിട്ട് ഓർഡറുകൾ സ്വീകരിക്കുക.",
    "slides.2.highlight": "വർക്ക് സോണിൽ ഉയർന്ന ഡിമാൻഡ് 📍",
    "slides.3.badge": "പൂർണ്ണ സ്വാതന്ത്ര്യം",
    "slides.3.title": "നിങ്ങൾക്ക് ഇഷ്ടമുള്ള സമയത്ത് ജോലി ചെയ്യുക",
    "slides.3.subtitle": "നിങ്ങൾക്ക് ഇഷ്ടമുള്ളപ്പോൾ ഓൺ ഡ്യൂട്ടി ആയി വരുമാനം നേടുക.",
    "slides.3.highlight": "സ്വന്തം ബോസ് ആകുക 🛵",

    // Auth
    "auth.signIn": "നിങ്ങളുടെ അക്കൗണ്ടിലേക്ക് സൈൻ ഇൻ ചെയ്യുക",
    "auth.loginOrCreate": "ലോഗിൻ ചെയ്യുക അല്ലെങ്കിൽ അക്കൗണ്ട് ഉണ്ടാക്കുക",
    "auth.enterPhone": "മൊബൈൽ നമ്പർ നൽകുക",
    "auth.validPhone": "സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക",
    "auth.lostPhone": "ഫോൺ നമ്പർ നഷ്ടപ്പെട്ടോ?",
    "auth.reachUs": "ഞങ്ങളെ ബന്ധപ്പെടുക",
    "auth.whatsApp": "വാട്ട്‌സ്ആപ്പിൽ OTP നേടുക",
    "auth.whatsAppSub": "വേഗത്തിലുള്ള വെരിഫിക്കേഷൻ",
    "auth.continue": "തുടരുക",
    "auth.termsNotice": "തുടരുന്നതിലൂടെ, നിങ്ങൾ നിബന്ധനകൾ അംഗീകരിക്കുന്നു",

    // OTP
    "otp.title": "6 അക്ക OTP നൽകുക",
    "otp.sentTo": "അയച്ച നമ്പർ:",
    "otp.changeNumber": "നമ്പർ മാറ്റുക",
    "otp.didntReceive": "കോഡ് ലഭിച്ചില്ലേ?",
    "otp.resendIn": "വീണ്ടും അയക്കാൻ സമയം:",
    "otp.resendOtp": "OTP വീണ്ടും അയക്കുക",
    "otp.verifyContinue": "പരിശോധിച്ച് തുടരുക",
    "otp.secureBadge": "ക്വിക്ക്പ്രസ്സ് 100% സുരക്ഷിത വെരിഫിക്കേഷൻ",

    // Dashboard
    "dash.onDuty": "ഓൺ ഡ്യൂട്ടി",
    "dash.offDuty": "ഓഫ് ഡ്യൂട്ടി",
    "dash.searching": "റൈഡുകൾക്കായി തിരയുന്നു...",
    "dash.todayEarnings": "ഇന്നത്തെ വരുമാനം",
    "dash.zeroCommission": "സീറോ കമ്മീഷൻ നേട്ടം",
    "dash.knowMore": "കൂടുതലറിയുക",
    "dash.workZone": "വർക്ക് സോണിൽ കൂടുതൽ ഓർഡറുകൾ",
    "dash.workZoneSub": "വേഗത്തിലുള്ള ഓർഡറുകൾക്കായി ഹബ്ബിന് സമീപം നിൽക്കുക",
    "dash.goOnDuty": "വരുമാനം നേടാൻ ഓൺ ഡ്യൂട്ടി ആകുക",
  },
};

const STORAGE_KEY = "qp.captain.selected_language";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  selectedLanguageObj: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  selectedLanguageObj: SUPPORTED_LANGUAGES[0],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY) as LanguageCode;
      if (saved && TRANSLATIONS[saved]) return saved;
    }
    return "en";
  });

  const setLanguage = (newLang: LanguageCode) => {
    if (TRANSLATIONS[newLang]) {
      setLangState(newLang);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, newLang);
      }
    }
  };

  const selectedLanguageObj = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const t = useMemo(() => {
    return (key: string, fallback?: string): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
      if (dict && dict[key]) return dict[key];
      if (TRANSLATIONS.en && TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];
      return fallback || key;
    };
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        selectedLanguageObj,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
