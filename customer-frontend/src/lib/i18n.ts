/**
 * QuickPress Internationalization (i18n) runtime.
 *
 * Supports 10 Indian & Global Languages:
 *   • "en-IN" — English (India) [Default]
 *   • "hi-IN" — हिन्दी (Hindi)
 *   • "pa-IN" — ਪੰਜਾਬੀ (Punjabi)
 *   • "mr-IN" — मराठी (Marathi)
 *   • "gu-IN" — ગુજરાતી (Gujarati)
 *   • "bn-IN" — বাংলা (Bengali)
 *   • "te-IN" — తెలుగు (Telugu)
 *   • "ta-IN" — தமிழ் (Tamil)
 *   • "kn-IN" — ಕನ್ನಡ (Kannada)
 *   • "ur-IN" — اردو (Urdu)
 *
 * Centralized, reactive translation resources with automatic English fallback
 * and real-time DOM Google Translate injection.
 */

import { useEffect, useState } from "react";

export type LanguageCode =
  | "en-IN"
  | "hi-IN"
  | "pa-IN"
  | "mr-IN"
  | "gu-IN"
  | "bn-IN"
  | "te-IN"
  | "ta-IN"
  | "kn-IN"
  | "ur-IN";

export interface SupportedLanguageInfo {
  id: LanguageCode;
  label: string;
  nativeName: string;
  subtitle: string;
  shortCode: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguageInfo[] = [
  { id: "en-IN", label: "English (India)", nativeName: "English", subtitle: "Default application language", shortCode: "en" },
  { id: "hi-IN", label: "हिन्दी (Hindi)", nativeName: "हिन्दी", subtitle: "राष्ट्रीय भाषा", shortCode: "hi" },
  { id: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)", nativeName: "ਪੰਜਾਬੀ", subtitle: "ਪੰਜਾਬੀ ਬੋਲੀ", shortCode: "pa" },
  { id: "mr-IN", label: "मराठी (Marathi)", nativeName: "मराठी", subtitle: "महाराष्ट्र राजभाषा", shortCode: "mr" },
  { id: "gu-IN", label: "ગુજરાતી (Gujarati)", nativeName: "ગુજરાતી", subtitle: "ગુજરાતી ભાષા", shortCode: "gu" },
  { id: "bn-IN", label: "বাংলা (Bengali)", nativeName: "বাংলা", subtitle: "বাংলা ভাষা", shortCode: "bn" },
  { id: "te-IN", label: "తెలుగు (Telugu)", nativeName: "తెలుగు", subtitle: "తెలుగు భాష", shortCode: "te" },
  { id: "ta-IN", label: "தமிழ் (Tamil)", nativeName: "தமிழ்", subtitle: "தமிழ் மொழி", shortCode: "ta" },
  { id: "kn-IN", label: "ಕನ್ನಡ (Kannada)", nativeName: "ಕನ್ನಡ", subtitle: "ಕನ್ನಡ ಭಾಷೆ", shortCode: "kn" },
  { id: "ur-IN", label: "اردو (Urdu)", nativeName: "اردو", subtitle: "اردو زبان", shortCode: "ur" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en-IN";

const LANGUAGE_STORAGE_KEY = "quickpress:language";

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  "en-IN": {
    "app.name": "QuickPress",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.retry": "Try again",
    "common.offline": "You're offline",
    "common.soon": "Coming soon",
    "common.close": "Close",

    "profile.title": "My Profile",
    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "settings.notifications": "Notifications",
    "settings.language": "Language",
    "settings.syncing": "Syncing your preferences…",

    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",

    "notify.push.label": "Push notifications",
    "notify.push.note": "Pickup, wash, rider arrival & delivery alerts on this device",

    "profile.edit": "Edit Profile",
    "profile.saveChanges": "Save Changes",
    "profile.account": "Account",
    "profile.support": "Support",
    "profile.logout": "Logout",
    "profile.logoutConfirm": "Logout of QuickPress?",
    "profile.logoutNote": "You'll need to sign in again to book pickups and track your orders.",

    "account.personal": "Personal Information",
    "account.personalNote": "Name, phone, email",
    "account.addresses": "Manage Addresses",
    "account.payments": "Payment Methods",
    "account.orders": "My Orders",
    "account.history": "Order History",
    "account.invoices": "Invoices",
    "account.services": "Saved Services",
    "account.stores": "Favourite Laundry Stores",

    "support.help": "Help Center",
    "support.call": "Call Support",
    "support.faq": "FAQ",
    "support.report": "Report an Issue",
  },
  "hi-IN": {
    "app.name": "क्विकप्रेस",
    "common.save": "सुरक्षित करें",
    "common.cancel": "रद्द करें",
    "common.retry": "पुनः प्रयास करें",
    "common.offline": "आप ऑफ़लाइन हैं",
    "common.soon": "जल्द आ रहा है",
    "common.close": "बंद करें",

    "profile.title": "मेरी प्रोफाइल",
    "settings.title": "सेटिंग्स",
    "settings.appearance": "थीम एवं रूप",
    "settings.notifications": "सूचनाएं (Notifications)",
    "settings.language": "भाषा (Language)",
    "settings.syncing": "प्राथमिकताएं सिंक हो रही हैं…",

    "theme.light": "लाइट (Light)",
    "theme.dark": "डार्क (Dark)",
    "theme.system": "सिस्टम (System)",

    "notify.push.label": "पुश नोटिफिकेशन",
    "notify.push.note": "इस डिवाइस पर पिकअप, धुलाई, राइडर आगमन और डिलीवरी अलर्ट",

    "profile.edit": "प्रोफ़ाइल संपादित करें",
    "profile.saveChanges": "परिवर्तन सहेजें",
    "profile.account": "खाता (Account)",
    "profile.support": "सहायता एवं समर्थन",
    "profile.logout": "लॉगआउट",
    "profile.logoutConfirm": "क्विकप्रेस से लॉगआउट करें?",
    "profile.logoutNote": "पिकअप बुक करने और अपने ऑर्डर ट्रैक करने के लिए आपको फिर से साइन इन करना होगा।",

    "account.personal": "व्यक्तिगत जानकारी",
    "account.personalNote": "नाम, फ़ोन, ईमेल",
    "account.addresses": "पते प्रबंधित करें",
    "account.payments": "भुगतान के तरीके",
    "account.orders": "मेरे ऑर्डर",
    "account.history": "ऑर्डर इतिहास",
    "account.invoices": "बिल और रसीदें",
    "account.services": "सहेजी गई सेवाएं",
    "account.stores": "पसंदीदा लॉन्ड्री स्टोर्स",

    "support.help": "सहायता केंद्र",
    "support.call": "कॉल सपोर्ट",
    "support.faq": "अक्सर पूछे जाने वाले प्रश्न (FAQ)",
    "support.report": "समस्या दर्ज करें",
  },
  "pa-IN": {
    "app.name": "ਕਵਿੱਕਪ੍ਰੈੱਸ",
    "common.save": "ਸੰਭਾਲੋ",
    "common.cancel": "ਰੱਦ ਕਰੋ",
    "common.retry": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "common.offline": "ਤੁਸੀਂ ਔਫਲਾਈਨ ਹੋ",
    "common.soon": "ਜਲਦੀ ਆ ਰਿਹਾ ਹੈ",
    "common.close": "ਬੰਦ ਕਰੋ",

    "profile.title": "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ",
    "settings.title": "ਸੈਟਿੰਗਾਂ",
    "settings.appearance": "ਦਿੱਖ ਅਤੇ ਥੀਮ",
    "settings.notifications": "ਸੂਚਨਾਵਾਂ (Notifications)",
    "settings.language": "ਭਾਸ਼ਾ (Language)",
    "settings.syncing": "ਸੈਟਿੰਗਾਂ ਸਿੰਕ ਹੋ ਰਹੀਆਂ ਹਨ…",

    "theme.light": "ਲਾਈਟ",
    "theme.dark": "ਡਾਰਕ",
    "theme.system": "ਸਿਸਟਮ",

    "notify.push.label": "ਪੁਸ਼ ਸੂਚਨਾਵਾਂ",
    "notify.push.note": "ਇਸ ਡਿਵਾਈਸ 'ਤੇ ਪਿਕਅੱਪ, ਧੁਲਾਈ ਅਤੇ ਡਿਲਿਵਰੀ ਅਲਰਟ",

    "profile.edit": "ਪ੍ਰੋਫਾਈਲ ਸੰਪਾਦਿਤ ਕਰੋ",
    "profile.saveChanges": "ਤਬਦੀਲੀਆਂ ਸੰਭਾਲੋ",
    "profile.account": "ਖਾਤਾ",
    "profile.support": "ਸਹਾਇਤਾ",
    "profile.logout": "ਲਾਗ ਆਉਟ",
    "profile.logoutConfirm": "ਕਵਿੱਕਪ੍ਰੈੱਸ ਤੋਂ ਲਾਗ ਆਉਟ ਕਰਨਾ ਹੈ?",
    "profile.logoutNote": "ਪਿਕਅੱਪ ਬੁੱਕ ਕਰਨ ਲਈ ਤੁਹਾਨੂੰ ਦੁਬਾਰਾ ਸਾਈਨ ਇਨ ਕਰਨਾ ਪਵੇਗਾ।",

    "account.personal": "ਨਿੱਜੀ ਜਾਣਕਾਰੀ",
    "account.personalNote": "ਨਾਮ, ਫ਼ੋਨ, ਈਮੇਲ",
    "account.addresses": "ਪਤੇ ਸੰਭਾਲੋ",
    "account.payments": "ਭੁਗਤਾਨ ਵਿਧੀਆਂ",
    "account.orders": "ਮੇਰੇ ਆਰਡਰ",
    "account.history": "ਆਰਡਰ ਇਤਿਹਾਸ",
    "account.invoices": "ਰਸੀਦਾਂ",
    "account.services": "ਸੁਰੱਖਿਅਤ ਸੇਵਾਵਾਂ",
    "account.stores": "ਮਨਪਸੰਦ ਸਟੋਰ",

    "support.help": "ਸਹਾਇਤਾ ਕੇਂਦਰ",
    "support.call": "ਕਾਲ ਸਹਾਇਤਾ",
    "support.faq": "ਅਕਸਰ ਪੁੱਛੇ ਜਾਂਦੇ ਸਵਾਲ",
    "support.report": "ਸਮੱਸਿਆ ਦਰਜ ਕਰੋ",
  },
  "mr-IN": {
    "app.name": "क्विकप्रेस",
    "common.save": "जतन करा",
    "common.cancel": "रद्द करा",
    "common.retry": "पुन्हा प्रयत्न करा",
    "common.offline": "तुम्ही ऑफलाइन आहात",
    "common.soon": "लवकरच येत आहे",
    "common.close": "बंद करा",

    "profile.title": "माझे प्रोफाइल",
    "settings.title": "सेटिंग्ज",
    "settings.appearance": "थीम व रंगसंगती",
    "settings.notifications": "सूचना (Notifications)",
    "settings.language": "भाषा (Language)",
    "settings.syncing": "सेटिंग्ज समक्रमित होत आहेत…",

    "theme.light": "लाइट",
    "theme.dark": "डार्क",
    "theme.system": "सिस्टम",

    "notify.push.label": "पुश सूचना",
    "notify.push.note": "या डिव्हाइसवर पिकअप, कपडे धुलाई आणि डिलिव्हरी अलर्ट",

    "profile.edit": "प्रोफाइल संपादित करा",
    "profile.saveChanges": "बदल जतन करा",
    "profile.account": "खाते",
    "profile.support": "मदत आणि सहाय्य",
    "profile.logout": "लॉगआउट",
    "profile.logoutConfirm": "क्विकप्रेसमधून लॉगआउट करायचे?",
    "profile.logoutNote": "पिकअप बुक करण्यासाठी तुम्हाला पुन्हा साइन इन करावे लागेल.",

    "account.personal": "वैयक्तिक माहिती",
    "account.personalNote": "नाव, फोन, ईमेल",
    "account.addresses": "पत्ते व्यवस्थापित करा",
    "account.payments": "पेमेंट पद्धती",
    "account.orders": "माझे ऑर्डर्स",
    "account.history": "ऑर्डर इतिहास",
    "account.invoices": "बिले आणि पावत्या",
    "account.services": "जतन केलेल्या सेवा",
    "account.stores": "आवडते लाँड्री स्टोअर्स",

    "support.help": "मदत केंद्र",
    "support.call": "कॉल सपोर्ट",
    "support.faq": "सतत विचारले जाणारे प्रश्न",
    "support.report": "समस्या नोंदवा",
  },
  "gu-IN": {
    "app.name": "ક્વિકપ્રેસ",
    "common.save": "સાચવો",
    "common.cancel": "રદ કરો",
    "common.retry": "ફરી પ્રયાસ કરો",
    "common.offline": "તમે ઑફલાઇન છો",
    "common.soon": "ટૂંક સમયમાં",
    "common.close": "બંધ કરો",

    "profile.title": "મારી પ્રોફાઇલ",
    "settings.title": "સેટિંગ્સ",
    "settings.appearance": "થીમ અને દેખાવ",
    "settings.notifications": "સૂચનાઓ (Notifications)",
    "settings.language": "ભાષા (Language)",
    "settings.syncing": "સેટિંગ્સ સિંક થઈ રહી છે…",

    "theme.light": "લાઇટ",
    "theme.dark": "ડાર્ક",
    "theme.system": "સિસ્ટમ",

    "notify.push.label": "પુશ નોટિફિકેશન",
    "notify.push.note": "આ ડિવાઇસ પર પિકઅપ, વૉશ અને ડિલિવરી અપડેટ્સ",

    "profile.edit": "પ્રોફાઇલ સંપાદિત કરો",
    "profile.saveChanges": "ફેરફારો સાચવો",
    "profile.account": "ખાતું",
    "profile.support": "સહાય",
    "profile.logout": "લૉગ આઉટ",
    "profile.logoutConfirm": "ક્વિકપ્રેસમાંથી લૉગ આઉટ કરવું છે?",
    "profile.logoutNote": "પિકઅપ બુક કરવા માટે તમારે ફરીથી સાઇન ઇન કરવું પડશે.",

    "account.personal": "વ્યક્તિગત માહિતી",
    "account.personalNote": "નામ, ફોન, ઇમેઇલ",
    "account.addresses": "સરનામાં મેનેજ કરો",
    "account.payments": "ચુકવણી પદ્ધતિઓ",
    "account.orders": "મારા ઓર્ડર્સ",
    "account.history": "ઓર્ડર ઇતિહાસ",
    "account.invoices": "ઇનવૉઇસ અને રસીદો",
    "account.services": "સાચવેલી સેવાઓ",
    "account.stores": "મનપસંદ લૉન્ડ્રી સ્ટોર્સ",

    "support.help": "સહાય કેન્દ્ર",
    "support.call": "કૉલ સપોર્ટ",
    "support.faq": "વારંવાર પૂછાતા પ્રશ્નો",
    "support.report": "સમસ્યા નોંધાવો",
  },
  "bn-IN": {
    "app.name": "কুইকপ্রেস",
    "common.save": "সংরক্ষণ করুন",
    "common.cancel": "বাতিল করুন",
    "common.retry": "আবার চেষ্টা করুন",
    "common.offline": "আপনি অফলাইনে আছেন",
    "common.soon": "শীঘ্রই আসছে",
    "common.close": "বন্ধ করুন",

    "profile.title": "আমার প্রোফাইল",
    "settings.title": "সেটিংস",
    "settings.appearance": "থিম এবং চেহারা",
    "settings.notifications": "বিজ্ঞপ্তি (Notifications)",
    "settings.language": "ভাষা (Language)",
    "settings.syncing": "সেটিংস সিঙ্ক হচ্ছে…",

    "theme.light": "লাইট",
    "theme.dark": "ডার্ক",
    "theme.system": "সিস্টেম",

    "notify.push.label": "পুশ নোটিফিকেশন",
    "notify.push.note": "এই ডিভাইসে পিকআপ, ধোয়া এবং ডেলিভারি সতর্কতা",

    "profile.edit": "প্রোফাইল সম্পাদনা করুন",
    "profile.saveChanges": "পরিবর্তন সংরক্ষণ করুন",
    "profile.account": "অ্যাকাউন্ট",
    "profile.support": "সহায়তা",
    "profile.logout": "লগআউট",
    "profile.logoutConfirm": "কুইকপ্রেস থেকে লগআউট করবেন?",
    "profile.logoutNote": "পিকআপ বুক করতে আপনাকে আবার সাইন ইন করতে হবে।",

    "account.personal": "ব্যক্তিগত তথ্য",
    "account.personalNote": "নাম, ফোন, ইমেইল",
    "account.addresses": "ঠিকানা পরিচালনা করুন",
    "account.payments": "পেমেন্ট পদ্ধতি",
    "account.orders": "আমার অর্ডার",
    "account.history": "অর্ডার ইতিহাস",
    "account.invoices": "বিল ও রসিদ",
    "account.services": "সংরক্ষিত সেবা",
    "account.stores": "প্রিয় লন্ড্রি স্টোর",

    "support.help": "সহায়তা কেন্দ্র",
    "support.call": "কল সহায়তা",
    "support.faq": "সাধারণ জিজ্ঞাসা",
    "support.report": "সমস্যা জানান",
  },
  "te-IN": {
    "app.name": "క్విక్‌ప్రెస్",
    "common.save": "భద్రపరచు",
    "common.cancel": "రద్దు చేయి",
    "common.retry": "మళ్ళీ ప్రయత్నించండి",
    "common.offline": "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు",
    "common.soon": "త్వరలో వస్తుంది",
    "common.close": "మూసివేయి",

    "profile.title": "నా ప్రొఫైల్",
    "settings.title": "సెట్టింగ్‌లు",
    "settings.appearance": "థీమ్ & రూపురేఖలు",
    "settings.notifications": "నోటిఫికేషన్‌లు",
    "settings.language": "భాష (Language)",
    "settings.syncing": "సెట్టింగ్‌లు సింక్ అవుతున్నాయి…",

    "theme.light": "లైట్",
    "theme.dark": "డార్క్",
    "theme.system": "సిస్టమ్",

    "notify.push.label": "పుష్ నోటిఫికేషన్‌లు",
    "notify.push.note": "ఈ పరికరంలో పికప్, వాష్ మరియు డెలివరీ హెచ్చరికలు",

    "profile.edit": "ప్రొఫైల్ సవరించండి",
    "profile.saveChanges": "మార్పులను సేవ్ చేయండి",
    "profile.account": "ఖాతా",
    "profile.support": "మద్దతు",
    "profile.logout": "లాగౌట్",
    "profile.logoutConfirm": "క్విక్‌ప్రెస్ నుండి లాగౌట్ చేయాలా?",
    "profile.logoutNote": "పికప్ బుక్ చేయడానికి మీరు మళ్ళీ సైన్ ఇన్ చేయాలి.",

    "account.personal": "వ్యక్తిగత సమాచారం",
    "account.personalNote": "పేరు, ఫోన్, ఈమెయిల్",
    "account.addresses": "చిరునామాలు",
    "account.payments": "చెల్లింపు పద్ధతులు",
    "account.orders": "నా ఆర్డర్‌లు",
    "account.history": "ఆర్డర్ హిస్టరీ",
    "account.invoices": "ఇన్‌వాయిస్‌లు",
    "account.services": "సేవ్ చేసిన సేవలు",
    "account.stores": "ఇష్టమైన లాండ్రీ స్టోర్‌లు",

    "support.help": "సహాయ కేంద్రం",
    "support.call": "కాల్ సపోర్ట్",
    "support.faq": "తరచుగా అడిగే ప్రశ్నలు",
    "support.report": "సమస్యను నివేదించండి",
  },
  "ta-IN": {
    "app.name": "குவிக்பிரஸ்",
    "common.save": "சேமி",
    "common.cancel": "ரத்துசெய்",
    "common.retry": "மீண்டும் முயற்சி செய்",
    "common.offline": "நீங்கள் ஆஃப்லைனில் உள்ளீர்கள்",
    "common.soon": "விரைவில் வருகிறது",
    "common.close": "மூடு",

    "profile.title": "என் சுயவிவரம்",
    "settings.title": "அமைப்புகள்",
    "settings.appearance": "தோற்றம் மற்றும் தீம்",
    "settings.notifications": "அறிவிப்புகள்",
    "settings.language": "மொழி (Language)",
    "settings.syncing": "அமைப்புகள் ஒத்திசைக்கப்படுகின்றன…",

    "theme.light": "லைட்",
    "theme.dark": "டார்க்",
    "theme.system": "சிஸ்டம்",

    "notify.push.label": "புஷ் அறிவிப்புகள்",
    "notify.push.note": "இந்த சாதனத்தில் பிக்-அப், சலவை மற்றும் டெலிவரி விழிப்பூட்டல்கள்",

    "profile.edit": "சுயவிவரத்தை திருத்து",
    "profile.saveChanges": "மாற்றங்களைச் சேமி",
    "profile.account": "கணக்கு",
    "profile.support": "ஆதரவு",
    "profile.logout": "வெளியேறு",
    "profile.logoutConfirm": "குவிக்பிரஸிலிருந்து வெளியேற வேண்டுமா?",
    "profile.logoutNote": "பிக்-அப் பதிவு செய்ய மீண்டும் உள்நுழைய வேண்டும்.",

    "account.personal": "தனிப்பட்ட தகவல்",
    "account.personalNote": "பெயர், தொலைபேசி, மின்னஞ்சல்",
    "account.addresses": "முகவரிகள்",
    "account.payments": "பணம் செலுத்தும் முறைகள்",
    "account.orders": "என் ஆர்டர்கள்",
    "account.history": "ஆர்டர் வரலாறு",
    "account.invoices": "விலைப்பட்டியல்கள்",
    "account.services": "சேமித்த சேவைகள்",
    "account.stores": "விருப்பமான லாண்ட்ரி கடைகள்",

    "support.help": "உதவி மையம்",
    "support.call": "அழைப்பு ஆதரவு",
    "support.faq": "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    "support.report": "சிக்கலைப் புகாரளிக்கவும்",
  },
  "kn-IN": {
    "app.name": "ಕ್ವಿಕ್‌ಪ್ರೆಸ್",
    "common.save": "ಉಳಿಸಿ",
    "common.cancel": "ರದ್ದುಮಾಡಿ",
    "common.retry": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "common.offline": "ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ",
    "common.soon": "ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ",
    "common.close": "ಮುಚ್ಚಿ",

    "profile.title": "ನನ್ನ ಪ್ರೊಫೈಲ್",
    "settings.title": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "settings.appearance": "ಗೋಚರತೆ ಮತ್ತು ಥೀಮ್",
    "settings.notifications": "ಅಧಿಸೂಚನೆಗಳು",
    "settings.language": "ಭಾಷೆ (Language)",
    "settings.syncing": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಸಿಂಕ್ ಆಗುತ್ತಿವೆ…",

    "theme.light": "ಲೈಟ್",
    "theme.dark": "ಡಾರ್ಕ್",
    "theme.system": "ಸಿಸ್ಟಮ್",

    "notify.push.label": "ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು",
    "notify.push.note": "ಈ ಸಾಧನದಲ್ಲಿ ಪಿಕಪ್, ವಾಶ್ ಮತ್ತು ವಿತರಣಾ ಎಚ್ಚರಿಕೆಗಳು",

    "profile.edit": "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ",
    "profile.saveChanges": "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
    "profile.account": "ಖಾತೆ",
    "profile.support": "ಬೆಂಬಲ",
    "profile.logout": "ಲಾಗ್ ಔಟ್",
    "profile.logoutConfirm": "ಕ್ವಿಕ್‌ಪ್ರೆಸ್‌ನಿಂದ ಲಾಗ್ ಔಟ್ ಮಾಡುವುದೇ?",
    "profile.logoutNote": "ಪಿಕಪ್ ಬುಕ್ ಮಾಡಲು ನೀವು ಮತ್ತೆ ಸೈನ್ ಇನ್ ಮಾಡಬೇಕು.",

    "account.personal": "ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ",
    "account.personalNote": "ಹೆಸರು, ಫೋನ್, ಇಮೇಲ್",
    "account.addresses": "ವಿಳಾಸಗಳು",
    "account.payments": "ಪಾವತಿ ವಿಧಾನಗಳು",
    "account.orders": "ನನ್ನ ಆದೇಶಗಳು",
    "account.history": "ಆದೇಶ ಇತಿಹಾಸ",
    "account.invoices": "ಇನ್‌ವಾಯ್ಸ್‌ಗಳು",
    "account.services": "ಉಳಿಸಿದ ಸೇವೆಗಳು",
    "account.stores": "ನೆಚ್ಚಿನ ಲಾಂಡ್ರಿ ಅಂಗಡಿಗಳು",

    "support.help": "ಸಹಾಯ ಕೇಂದ್ರ",
    "support.call": "ಕರೆ ಬೆಂಬಲ",
    "support.faq": "ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು",
    "support.report": "ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ",
  },
  "ur-IN": {
    "app.name": "کوئیک پریس",
    "common.save": "محفوظ کریں",
    "common.cancel": "منسوخ کریں",
    "common.retry": "دوبارہ کوشش کریں",
    "common.offline": "آپ آف لائن ہیں",
    "common.soon": "جلد آرہا ہے",
    "common.close": "بند کریں",

    "profile.title": "میرا پروفائل",
    "settings.title": "ترتیبات",
    "settings.appearance": "ظاہری شکل و تھیم",
    "settings.notifications": "اطلاعات (Notifications)",
    "settings.language": "زبان (Language)",
    "settings.syncing": "ترتیبات مطابقت پذیر ہو رہی ہیں…",

    "theme.light": "لائٹ",
    "theme.dark": "ڈارک",
    "theme.system": "سسٹم",

    "notify.push.label": "پش اطلاعات",
    "notify.push.note": "اس ڈیوائس پر پک اپ، دھلائی اور ترسیل کے الرٹس",

    "profile.edit": "پروفائل میں ترمیم کریں",
    "profile.saveChanges": "تبدیلیاں محفوظ کریں",
    "profile.account": "اکاؤنٹ",
    "profile.support": "مدد اور معاونت",
    "profile.logout": "لاگ آؤٹ",
    "profile.logoutConfirm": "کیا آپ کوئیک پریس سے لاگ آؤٹ کرنا چاہتے ہیں؟",
    "profile.logoutNote": "پک اپ بک کرنے کے لیے آپ کو دوبارہ سائن ان کرنا ہوگا۔",

    "account.personal": "ذاتی معلومات",
    "account.personalNote": "نام، فون، ای میل",
    "account.addresses": "پتے",
    "account.payments": "ادائیگی کے طریقے",
    "account.orders": "میرے آرڈرز",
    "account.history": "آرڈر کی تاریخ",
    "account.invoices": "رسیدیں",
    "account.services": "محفوظ کردہ خدمات",
    "account.stores": "پسندیدہ لانڈری اسٹورز",

    "support.help": "امدادی مرکز",
    "support.call": "کال سپورٹ",
    "support.faq": "اکثر پوچھے گئے سوالات",
    "support.report": "مسئلہ رپورٹ کریں",
  },
};

const listeners = new Set<(lang: LanguageCode) => void>();

export function isLanguageCode(value: unknown): value is LanguageCode {
  if (typeof value !== "string") return false;
  return SUPPORTED_LANGUAGES.some((lang) => lang.id === value || lang.shortCode === value);
}

export function getGoogleLangCode(code: string | null | undefined): string {
  if (!code) return "en";
  const clean = code.trim().toLowerCase();
  for (const item of SUPPORTED_LANGUAGES) {
    if (item.id.toLowerCase() === clean || item.shortCode === clean || clean.startsWith(item.shortCode)) {
      return item.shortCode;
    }
  }
  return "en";
}

export function normalizeLanguage(code: string | null | undefined): LanguageCode {
  if (!code) return DEFAULT_LANGUAGE;
  const clean = code.trim().toLowerCase();
  for (const item of SUPPORTED_LANGUAGES) {
    if (item.id.toLowerCase() === clean || item.shortCode === clean || clean.startsWith(item.shortCode)) {
      return item.id;
    }
  }
  return DEFAULT_LANGUAGE;
}

/** Read stored language code from localStorage, fallback to DEFAULT_LANGUAGE ('en-IN'). */
export function readStoredLanguage(): LanguageCode {
  if (typeof localStorage === "undefined") return DEFAULT_LANGUAGE;
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(raw) ? normalizeLanguage(raw) : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Apply Google Translate cookie and trigger DOM translation */
export function applyGoogleTranslate(language: string) {
  if (typeof document === "undefined") return;
  const target = getGoogleLangCode(language);
  const cookieVal = `/en/${target}`;

  try {
    // 1. Set cookie for current path and root
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (typeof window !== "undefined" && window.location.hostname) {
      const host = window.location.hostname;
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${host};`;
      const parts = host.split(".");
      if (parts.length > 2) {
        document.cookie = `googtrans=${cookieVal}; path=/; domain=.${parts.slice(-2).join(".")};`;
      }
    }

    // 2. Trigger Google Translate combo dropdown if already loaded in DOM
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (select) {
      select.value = target;
      select.dispatchEvent(new Event("change"));
    }
  } catch (e) {
    console.warn("Failed to apply google translate cookie:", e);
  }
}

/** Store language locally and notify all listeners. */
export function setLanguageLocally(language: string): LanguageCode {
  const code = normalizeLanguage(language);
  const googleTarget = getGoogleLangCode(code);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      if (typeof document !== "undefined") {
        document.documentElement.lang = googleTarget;
      }
    } catch {
      /* ignore */
    }
  }
  for (const listener of listeners) {
    listener(code);
  }
  applyGoogleTranslate(code);
  return code;
}

/** Switch language application-wide (triggers i18n listeners + Google DOM translator) */
export function switchAppLanguage(language: string, reloadOnMismatch = true): LanguageCode {
  const code = setLanguageLocally(language);
  const googleTarget = getGoogleLangCode(code);
  applyGoogleTranslate(code);

  if (typeof window !== "undefined" && reloadOnMismatch) {
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (select) {
      select.value = googleTarget;
      select.dispatchEvent(new Event("change"));
    } else {
      // Reload page to let Google Translate initialize with the new cookie
      setTimeout(() => {
        window.location.reload();
      }, 150);
    }
  }
  return code;
}

/** Translate key to string in the given or current language with English fallback. */
export function translate(key: string, explicitLang?: LanguageCode): string {
  const lang = explicitLang || readStoredLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANGUAGE];
  if (dict && dict[key]) return dict[key];
  return TRANSLATIONS[DEFAULT_LANGUAGE][key] || key;
}

export const t = translate;

/** React hook for reactive i18n support in components. */
export function useLanguage(): {
  language: LanguageCode;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
} {
  const [lang, setLang] = useState<LanguageCode>(readStoredLanguage);

  useEffect(() => {
    const handler = (next: LanguageCode) => setLang(next);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    language: lang,
    setLanguage: (next) => switchAppLanguage(next),
    t: (key: string) => translate(key, lang),
  };
}
