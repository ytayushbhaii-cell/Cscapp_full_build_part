// ─── CSC Smart Toolkit — Translation strings ───────────────────────────────
// Flat key-value for every UI string in the app.
// Keys follow: section.subsection.key format.
// Add new keys in English first, then Hindi.

export type Lang = 'en' | 'hi';

const translations = {
  en: {
    // ── App & Branding ────────────────────────────────────────────────────────
    'app.name': 'CSC Smart Toolkit',
    'app.tagline': 'Offline • Professional • Fast',
    'app.loading': 'Loading...',

    // ── Common Actions ────────────────────────────────────────────────────────
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.reset': 'Reset',
    'action.apply': 'Apply',
    'action.done': 'Done',
    'action.back': 'Back',
    'action.share': 'Share',
    'action.export': 'Export',
    'action.delete': 'Delete',
    'action.download': 'Download',
    'action.print': 'Print',
    'action.close': 'Close',
    'action.open': 'Open',
    'action.yes': 'Yes',
    'action.no': 'No',
    'action.ok': 'OK',
    'action.retry': 'Retry',
    'action.clear': 'Clear',
    'action.add': 'Add',
    'action.remove': 'Remove',
    'action.edit': 'Edit',
    'action.select': 'Select',
    'action.selectImage': 'Select Image',
    'action.pickImage': 'Pick Image',
    'action.capture': 'Capture',
    'action.generate': 'Generate',
    'action.scan': 'Scan',
    'action.process': 'Process',
    'action.copy': 'Copy',
    'action.search': 'Search',

    // ── Common Status ─────────────────────────────────────────────────────────
    'status.loading': 'Loading...',
    'status.processing': 'Processing...',
    'status.success': 'Success',
    'status.error': 'Error',
    'status.noResults': 'No results found',
    'status.noData': 'No data',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    'status.ready': 'Ready',
    'status.saved': 'Saved',

    // ── Navigation (Drawer) ───────────────────────────────────────────────────
    'nav.dashboard': 'Dashboard',
    'nav.tools': 'Tools',
    'nav.photoTools': 'Photo Tools',
    'nav.search': 'Search',
    'nav.favorites': 'Favorites',
    'nav.recentFiles': 'Recent Files',
    'nav.mostUsed': 'Most Used',
    'nav.history': 'History',
    'nav.settings': 'Settings',

    // ── Dashboard ─────────────────────────────────────────────────────────────
    'dashboard.title': 'CSC Smart Toolkit',
    'dashboard.welcomeTitle': 'Your all-in-one offline toolkit',
    'dashboard.welcomeDesc': 'Professional tools for photo editing, documents, ID cards, QR codes & printing. All on-device — no internet needed.',
    'dashboard.quickAccess': 'Quick Access',
    'dashboard.mostUsed': 'Most Used',
    'dashboard.allTools': 'All Tools',
    'dashboard.recentFiles': 'Recent Files',
    'dashboard.noRecent': 'No recent files yet',
    'dashboard.overview': 'Overview',
    'dashboard.stats.totalTools': 'Total Tools',
    'dashboard.stats.recentFiles': 'Recent Files',
    'dashboard.stats.favorites': 'Favorites',
    'dashboard.stats.storage': 'Storage',
    'dashboard.viewAll': 'View all',

    // ── Drawer ────────────────────────────────────────────────────────────────
    'drawer.version': 'Version 1.0.0 • 100% Offline',

    // ── Tabs ──────────────────────────────────────────────────────────────────
    'tabs.favorites': 'Favorites',
    'tabs.favorites.empty': 'No favorites yet',
    'tabs.favorites.emptyDesc': 'Tap the heart icon on any tool to add it here.',
    'tabs.recent': 'Recent Files',
    'tabs.recent.empty': 'No recent files',
    'tabs.recent.emptyDesc': 'Files you work on will appear here.',
    'tabs.history': 'Usage History',
    'tabs.history.empty': 'No History Yet',
    'tabs.history.emptyDesc': 'Your tool processing history will appear here.',
    'tabs.history.clearTitle': 'Clear All History',
    'tabs.history.clearDesc': 'This will permanently delete all processing history. Continue?',
    'tabs.history.clearConfirm': 'Clear All',
    'tabs.mostUsed': 'Most Used Tools',
    'tabs.mostUsed.empty': 'No Usage Data Yet',
    'tabs.mostUsed.emptyDesc': 'Start using tools and your most-used ones will appear here automatically.',
    'tabs.mostUsed.analytics': 'Usage Analytics',
    'tabs.mostUsed.analyticsDesc': 'Top {n} tools ranked by how often you use them',
    'tabs.mostUsed.loading': 'Loading your usage statistics…',
    'tabs.search': 'Search Tools',
    'tabs.search.placeholder': 'Search for a tool...',
    'tabs.search.empty': 'No tools found for',
    'tabs.search.hint': 'Try: Crop, PDF, QR, Aadhaar, Passport...',
    'tabs.settings': 'Settings',

    // ── Recent Files columns ──────────────────────────────────────────────────
    'recent.colFile': 'FILE NAME',
    'recent.colTool': 'TOOL',
    'recent.colDate': 'DATE',
    'recent.colStatus': 'STATUS',

    // ── Search ────────────────────────────────────────────────────────────────
    'search.placeholder': 'Search tools, categories...',
    'search.noResults': 'No results found',
    'search.noResultsDesc': 'Try different keywords or browse categories from the Tools tab.',

    // ── Tools Hub ─────────────────────────────────────────────────────────────
    'tools.allTools': 'All Tools',
    'tools.count': 'tools',
    'tools.searchPlaceholder': 'Search tools...',
    'tools.categories': 'Categories',
    'tools.favorites': 'Favorites',
    'tools.recent': 'Recent',
    'tools.noResults': 'No tools found',

    // ── Category Names ────────────────────────────────────────────────────────
    'category.photoTools': 'Photo Tools',
    'category.documentTools': 'Document Tools',
    'category.aadhaarTools': 'Aadhaar Tools',
    'category.panTools': 'PAN Tools',
    'category.voterTools': 'Voter ID Tools',
    'category.dlTools': 'Driving License Tools',
    'category.passportTools': 'Passport Tools',
    'category.pdfTools': 'PDF Tools',
    'category.qrTools': 'QR & Barcode',
    'category.signatureTools': 'Signature Tools',
    'category.stampTools': 'Stamp Tools',
    'category.idCardTools': 'ID Card Generator',
    'category.printTools': 'Print Tools',
    'category.utilityTools': 'Utility Tools',

    // ── Photo Tools ───────────────────────────────────────────────────────────
    'photo.title': 'Photo Tools',
    'photo.desc': 'Professional photo editing and document photo preparation tools. Everything runs on your device.',
    'photo.searchPlaceholder': 'Search photo tools...',
    'photo.allTools': 'All Tools',
    'photo.favorites': 'Favorites',
    'photo.recent': 'Recent',

    // ── Document Tools ────────────────────────────────────────────────────────
    'docs.title': 'Document Tools',
    'docs.searchPlaceholder': 'Search document tools...',
    'docs.categories': 'All Categories',

    // ── QR Tools ──────────────────────────────────────────────────────────────
    'qr.title': 'QR & Barcode',
    'qr.searchPlaceholder': 'Search QR tools...',

    // ── Print Tools ───────────────────────────────────────────────────────────
    'print.title': 'Print Tools',

    // ── ID Card Tools ─────────────────────────────────────────────────────────
    'idcard.title': 'ID Card Generator',

    // ── Signature Tools ───────────────────────────────────────────────────────
    'sig.title': 'Signature & Stamp Tools',

    // ── Stamp Maker ───────────────────────────────────────────────────────────
    'stamp.title': 'Stamp Maker',

    // ── Utility Tools ─────────────────────────────────────────────────────────
    'utility.title': 'Utility Tools',

    // ── Language Settings ─────────────────────────────────────────────────────
    'lang.heroTitle': 'App Language',
    'lang.heroSub': 'Choose the language for the app interface',
    'lang.selectLabel': 'SELECT LANGUAGE',
    'lang.saved': 'Language saved successfully!',
    'lang.saving': 'Saving…',
    'lang.saveBtn': 'Save Language',

    // ── Settings ──────────────────────────────────────────────────────────────
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.language.desc': 'App interface language',
    'settings.theme': 'Theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System Default',
    'settings.printSize': 'Default Print Size',
    'settings.defaultFolder': 'Default Save Folder',
    'settings.backup': 'Backup & Restore',
    'settings.about': 'About',
    'settings.version': 'Version',
    'settings.sectionAppearance': 'APPEARANCE',
    'settings.sectionPreferences': 'PREFERENCES',
    'settings.sectionBackup': 'BACKUP',
    'settings.sectionAbout': 'ABOUT',
    'settings.darkMode': 'Dark Mode',
    'settings.themeSettings': 'Theme Settings',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.offline': '100% Offline',
    'settings.appVersion': 'App Version',
    'settings.privacyPolicy': 'Privacy Policy',
    'settings.noData': 'No data collected',
    'settings.offlineMode': 'Offline Mode',
    'settings.alwaysOn': 'Always On',

    // ── Common Tool Screen Labels ─────────────────────────────────────────────
    'tool.selectImage': 'Select Image',
    'tool.selectImageDesc': 'Tap below to pick a photo from your gallery',
    'tool.pickFromGallery': 'Pick from Gallery',
    'tool.takePhoto': 'Take Photo',
    'tool.result': 'Result',
    'tool.original': 'Original',
    'tool.processed': 'Processed',
    'tool.download': 'Download',
    'tool.share': 'Share',
    'tool.tryAnother': 'Try Another',
    'tool.quality': 'Quality',
    'tool.width': 'Width',
    'tool.height': 'Height',
    'tool.filename': 'File Name',
    'tool.format': 'Format',
    'tool.pages': 'Pages',
    'tool.page': 'Page',
    'tool.size': 'Size',
    'tool.preview': 'Preview',
    'tool.addMore': 'Add More',
    'tool.noImageSelected': 'No image selected',
    'tool.processingImage': 'Processing image...',
    'tool.savingFile': 'Saving file...',
    'tool.successSaved': 'File saved successfully',
    'tool.errorSave': 'Could not save file',
    'tool.errorProcess': 'Could not process image',
  },

  hi: {
    // ── App & Branding ────────────────────────────────────────────────────────
    'app.name': 'CSC स्मार्ट टूलकिट',
    'app.tagline': 'ऑफलाइन • प्रोफेशनल • तेज़',
    'app.loading': 'लोड हो रहा है...',

    // ── Common Actions ────────────────────────────────────────────────────────
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'action.reset': 'रीसेट',
    'action.apply': 'लागू करें',
    'action.done': 'हो गया',
    'action.back': 'वापस',
    'action.share': 'शेयर',
    'action.export': 'एक्सपोर्ट',
    'action.delete': 'हटाएं',
    'action.download': 'डाउनलोड',
    'action.print': 'प्रिंट',
    'action.close': 'बंद करें',
    'action.open': 'खोलें',
    'action.yes': 'हाँ',
    'action.no': 'नहीं',
    'action.ok': 'ठीक है',
    'action.retry': 'पुनः प्रयास',
    'action.clear': 'साफ करें',
    'action.add': 'जोड़ें',
    'action.remove': 'हटाएं',
    'action.edit': 'संपादित करें',
    'action.select': 'चुनें',
    'action.selectImage': 'इमेज चुनें',
    'action.pickImage': 'फोटो चुनें',
    'action.capture': 'कैप्चर',
    'action.generate': 'बनाएं',
    'action.scan': 'स्कैन करें',
    'action.process': 'प्रोसेस करें',
    'action.copy': 'कॉपी करें',
    'action.search': 'खोजें',

    // ── Common Status ─────────────────────────────────────────────────────────
    'status.loading': 'लोड हो रहा है...',
    'status.processing': 'प्रोसेस हो रहा है...',
    'status.success': 'सफलता',
    'status.error': 'त्रुटि',
    'status.noResults': 'कोई परिणाम नहीं मिला',
    'status.noData': 'कोई डेटा नहीं',
    'status.completed': 'पूर्ण',
    'status.failed': 'विफल',
    'status.ready': 'तैयार',
    'status.saved': 'सहेजा गया',

    // ── Navigation (Drawer) ───────────────────────────────────────────────────
    'nav.dashboard': 'डैशबोर्ड',
    'nav.tools': 'टूल्स',
    'nav.photoTools': 'फोटो टूल्स',
    'nav.search': 'खोजें',
    'nav.favorites': 'पसंदीदा',
    'nav.recentFiles': 'हाल की फाइलें',
    'nav.mostUsed': 'सबसे ज्यादा उपयोग',
    'nav.history': 'इतिहास',
    'nav.settings': 'सेटिंग्स',

    // ── Dashboard ─────────────────────────────────────────────────────────────
    'dashboard.title': 'CSC स्मार्ट टूलकिट',
    'dashboard.welcomeTitle': 'आपका ऑल-इन-वन ऑफलाइन टूलकिट',
    'dashboard.welcomeDesc': 'फोटो एडिटिंग, दस्तावेज़, ID कार्ड, QR कोड और प्रिंटिंग के लिए प्रोफेशनल टूल्स। सब कुछ डिवाइस पर — इंटरनेट की जरूरत नहीं।',
    'dashboard.quickAccess': 'त्वरित पहुँच',
    'dashboard.mostUsed': 'सबसे ज्यादा उपयोग',
    'dashboard.allTools': 'सभी टूल्स',
    'dashboard.recentFiles': 'हाल की फाइलें',
    'dashboard.noRecent': 'अभी तक कोई हाल की फाइल नहीं',
    'dashboard.overview': 'अवलोकन',
    'dashboard.stats.totalTools': 'कुल टूल्स',
    'dashboard.stats.recentFiles': 'हाल की फाइलें',
    'dashboard.stats.favorites': 'पसंदीदा',
    'dashboard.stats.storage': 'स्टोरेज',
    'dashboard.viewAll': 'सभी देखें',

    // ── Drawer ────────────────────────────────────────────────────────────────
    'drawer.version': 'संस्करण 1.0.0 • 100% ऑफलाइन',

    // ── Tabs ──────────────────────────────────────────────────────────────────
    'tabs.favorites': 'पसंदीदा',
    'tabs.favorites.empty': 'अभी कोई पसंदीदा नहीं',
    'tabs.favorites.emptyDesc': 'किसी भी टूल पर दिल आइकन टैप करें।',
    'tabs.recent': 'हाल की फाइलें',
    'tabs.recent.empty': 'कोई हाल की फाइल नहीं',
    'tabs.recent.emptyDesc': 'जिन फाइलों पर आप काम करेंगे वे यहाँ दिखेंगी।',
    'tabs.history': 'प्रोसेसिंग इतिहास',
    'tabs.history.empty': 'अभी कोई इतिहास नहीं',
    'tabs.history.emptyDesc': 'आपका टूल प्रोसेसिंग इतिहास यहाँ दिखेगा।',
    'tabs.history.clearTitle': 'सभी इतिहास हटाएं',
    'tabs.history.clearDesc': 'इससे सभी प्रोसेसिंग इतिहास स्थायी रूप से हट जाएगा। जारी रखें?',
    'tabs.history.clearConfirm': 'सभी हटाएं',
    'tabs.mostUsed': 'सबसे ज्यादा उपयोग',
    'tabs.mostUsed.empty': 'अभी कोई उपयोग डेटा नहीं',
    'tabs.mostUsed.emptyDesc': 'टूल्स का उपयोग करें और आपके सबसे ज्यादा उपयोग किए गए टूल्स यहाँ दिखेंगे।',
    'tabs.mostUsed.analytics': 'उपयोग विश्लेषण',
    'tabs.mostUsed.analyticsDesc': 'उपयोग के अनुसार शीर्ष {n} टूल्स',
    'tabs.mostUsed.loading': 'उपयोग आँकड़े लोड हो रहे हैं…',
    'tabs.search': 'टूल्स खोजें',
    'tabs.search.placeholder': 'टूल खोजें...',
    'tabs.search.empty': 'कोई टूल नहीं मिला',
    'tabs.search.hint': 'जैसे: क्रॉप, PDF, QR, आधार, पासपोर्ट...',
    'tabs.settings': 'सेटिंग्स',

    // ── Recent Files columns ──────────────────────────────────────────────────
    'recent.colFile': 'फाइल का नाम',
    'recent.colTool': 'टूल',
    'recent.colDate': 'तारीख',
    'recent.colStatus': 'स्थिति',

    // ── Search ────────────────────────────────────────────────────────────────
    'search.placeholder': 'टूल्स, श्रेणियाँ खोजें...',
    'search.noResults': 'कोई परिणाम नहीं मिला',
    'search.noResultsDesc': 'अलग-अलग शब्द आज़माएं या टूल्स टैब से श्रेणियाँ देखें।',

    // ── Tools Hub ─────────────────────────────────────────────────────────────
    'tools.allTools': 'सभी टूल्स',
    'tools.count': 'टूल्स',
    'tools.searchPlaceholder': 'टूल्स खोजें...',
    'tools.categories': 'श्रेणियाँ',
    'tools.favorites': 'पसंदीदा',
    'tools.recent': 'हाल का',
    'tools.noResults': 'कोई टूल नहीं मिला',

    // ── Category Names ────────────────────────────────────────────────────────
    'category.photoTools': 'फोटो टूल्स',
    'category.documentTools': 'दस्तावेज़ टूल्स',
    'category.aadhaarTools': 'आधार टूल्स',
    'category.panTools': 'PAN टूल्स',
    'category.voterTools': 'वोटर ID टूल्स',
    'category.dlTools': 'ड्राइविंग लाइसेंस टूल्स',
    'category.passportTools': 'पासपोर्ट टूल्स',
    'category.pdfTools': 'PDF टूल्स',
    'category.qrTools': 'QR और बारकोड',
    'category.signatureTools': 'हस्ताक्षर टूल्स',
    'category.stampTools': 'स्टैंप टूल्स',
    'category.idCardTools': 'ID कार्ड जेनरेटर',
    'category.printTools': 'प्रिंट टूल्स',
    'category.utilityTools': 'उपयोगिता टूल्स',

    // ── Photo Tools ───────────────────────────────────────────────────────────
    'photo.title': 'फोटो टूल्स',
    'photo.desc': 'प्रोफेशनल फोटो एडिटिंग और दस्तावेज़ फोटो तैयारी टूल्स। सब कुछ आपके डिवाइस पर।',
    'photo.searchPlaceholder': 'फोटो टूल्स खोजें...',
    'photo.allTools': 'सभी टूल्स',
    'photo.favorites': 'पसंदीदा',
    'photo.recent': 'हाल का',

    // ── Document Tools ────────────────────────────────────────────────────────
    'docs.title': 'दस्तावेज़ टूल्स',
    'docs.searchPlaceholder': 'दस्तावेज़ टूल्स खोजें...',
    'docs.categories': 'सभी श्रेणियाँ',

    // ── QR Tools ──────────────────────────────────────────────────────────────
    'qr.title': 'QR और बारकोड',
    'qr.searchPlaceholder': 'QR टूल्स खोजें...',

    // ── Print Tools ───────────────────────────────────────────────────────────
    'print.title': 'प्रिंट टूल्स',

    // ── ID Card Tools ─────────────────────────────────────────────────────────
    'idcard.title': 'ID कार्ड जेनरेटर',

    // ── Signature Tools ───────────────────────────────────────────────────────
    'sig.title': 'हस्ताक्षर और स्टैंप टूल्स',

    // ── Stamp Maker ───────────────────────────────────────────────────────────
    'stamp.title': 'स्टैंप मेकर',

    // ── Utility Tools ─────────────────────────────────────────────────────────
    'utility.title': 'उपयोगिता टूल्स',

    // ── Language Settings ─────────────────────────────────────────────────────
    'lang.heroTitle': 'ऐप की भाषा',
    'lang.heroSub': 'ऐप इंटरफेस के लिए भाषा चुनें',
    'lang.selectLabel': 'भाषा चुनें',
    'lang.saved': 'भाषा सफलतापूर्वक सहेजी गई!',
    'lang.saving': 'सहेजा जा रहा है…',
    'lang.saveBtn': 'भाषा सहेजें',

    // ── Settings ──────────────────────────────────────────────────────────────
    'settings.title': 'सेटिंग्स',
    'settings.language': 'भाषा',
    'settings.language.desc': 'ऐप इंटरफेस की भाषा',
    'settings.theme': 'थीम',
    'settings.theme.light': 'हल्का',
    'settings.theme.dark': 'गहरा',
    'settings.theme.system': 'सिस्टम डिफ़ॉल्ट',
    'settings.printSize': 'डिफ़ॉल्ट प्रिंट साइज़',
    'settings.defaultFolder': 'डिफ़ॉल्ट सेव फोल्डर',
    'settings.backup': 'बैकअप और रिस्टोर',
    'settings.about': 'के बारे में',
    'settings.version': 'संस्करण',
    'settings.sectionAppearance': 'दिखावट',
    'settings.sectionPreferences': 'प्राथमिकताएं',
    'settings.sectionBackup': 'बैकअप',
    'settings.sectionAbout': 'जानकारी',
    'settings.darkMode': 'डार्क मोड',
    'settings.themeSettings': 'थीम सेटिंग्स',
    'settings.dark': 'गहरा',
    'settings.light': 'हल्का',
    'settings.offline': '100% ऑफलाइन',
    'settings.appVersion': 'ऐप संस्करण',
    'settings.privacyPolicy': 'गोपनीयता नीति',
    'settings.noData': 'कोई डेटा एकत्र नहीं',
    'settings.offlineMode': 'ऑफलाइन मोड',
    'settings.alwaysOn': 'हमेशा चालू',

    // ── Common Tool Screen Labels ─────────────────────────────────────────────
    'tool.selectImage': 'इमेज चुनें',
    'tool.selectImageDesc': 'अपनी गैलरी से फोटो चुनने के लिए नीचे टैप करें',
    'tool.pickFromGallery': 'गैलरी से चुनें',
    'tool.takePhoto': 'फोटो लें',
    'tool.result': 'परिणाम',
    'tool.original': 'मूल',
    'tool.processed': 'संसाधित',
    'tool.download': 'डाउनलोड',
    'tool.share': 'शेयर',
    'tool.tryAnother': 'दूसरा प्रयास',
    'tool.quality': 'गुणवत्ता',
    'tool.width': 'चौड़ाई',
    'tool.height': 'ऊँचाई',
    'tool.filename': 'फाइल का नाम',
    'tool.format': 'प्रारूप',
    'tool.pages': 'पृष्ठ',
    'tool.page': 'पृष्ठ',
    'tool.size': 'आकार',
    'tool.preview': 'पूर्वावलोकन',
    'tool.addMore': 'और जोड़ें',
    'tool.noImageSelected': 'कोई इमेज नहीं चुनी',
    'tool.processingImage': 'इमेज प्रोसेस हो रही है...',
    'tool.savingFile': 'फाइल सहेजी जा रही है...',
    'tool.successSaved': 'फाइल सफलतापूर्वक सहेजी गई',
    'tool.errorSave': 'फाइल सहेजी नहीं जा सकी',
    'tool.errorProcess': 'इमेज प्रोसेस नहीं हो सकी',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
export type Translations = Record<TranslationKey, string>;

export function getTranslations(lang: Lang): Translations {
  return (translations[lang] ?? translations.en) as Translations;
}

export default translations;
