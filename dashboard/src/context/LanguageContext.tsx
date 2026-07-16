import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "my";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    brandName: "Tele-Commerce",
    // Auth & Login
    auth: {
      loginTitle: "Log in to Shop Dashboard",
      registerTitle: "Register a Merchant Account",
      email: "Email Address",
      password: "Password",
      name: "Merchant Full Name",
      loginBtn: "Log In",
      registerBtn: "Register Account",
      alreadyHaveAccount: "Already have an account?",
      newToBrand: "New to Tele-Commerce?",
      signingIn: "Signing In...",
      registering: "Registering...",
      emailPlaceholder: "e.g. merchant@telecommerce.app",
      namePlaceholder: "e.g. John Doe",
      passwordPlaceholder: "At least 6 characters"
    },
    // Sidebar Navigation
    sidebar: {
      overview: "Overview",
      orders: "Orders",
      products: "Products",
      broadcasts: "Broadcasts",
      chat: "Support Chat",
      settings: "Settings",
      subscription: "Subscription",
      logout: "Log Out"
    },
    // Overview Dashboard
    overview: {
      title: "Performance Overview",
      subtitle: "Track your store's sales metrics, order status counts, and latest support history",
      totalRevenue: "Total Revenue",
      totalOrders: "Total Orders",
      avgOrderValue: "Avg Order Value",
      totalCustomers: "Total Customers",
      latestOrders: "Latest Orders",
      orderId: "Order ID",
      customer: "Customer",
      status: "Status",
      amount: "Amount",
      date: "Date",
      noOrders: "No orders received yet.",
      paymentVerification: "Payment Verification Requests",
      noReceipts: "No pending verification screenshots.",
      approvePayment: "Approve Payment",
      reject: "Reject",
      processing: "Processing...",
      ordersOverTime: "Orders Over Time"
    },
    // Orders View
    orders: {
      title: "Orders List",
      subtitle: "View, filter, export, and manage order payment verifications and invoice statuses",
      searchPlaceholder: "Search by customer name, phone, address...",
      exportCsv: "Export CSV",
      clearFilters: "Clear Filters",
      dateFrom: "From Date",
      dateTo: "To Date",
      statusAll: "All Statuses",
      items: "Items",
      actions: "Actions",
      markPaid: "Mark Paid",
      viewInvoice: "View Invoice",
      noInvoice: "No invoice",
      statusPending: "PENDING",
      statusPendingVerification: "VERIFICATION",
      statusPaid: "PAID",
      statusShipped: "SHIPPED",
      statusCancelled: "CANCELLED"
    },
    // Products View
    products: {
      title: "Products Catalog",
      subtitle: "Manage product details, pricing, stocks, categories, and inventory items",
      addProduct: "Add Product",
      searchPlaceholder: "Search by product name or description...",
      filterCategory: "All Categories",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      price: "Price",
      stock: "Stock",
      status: "Status",
      edit: "Edit",
      delete: "Delete",
      active: "Active",
      inactive: "Inactive",
      modalAddTitle: "Create New Product",
      modalEditTitle: "Edit Product Details",
      prodName: "Product Name",
      prodDesc: "Product Description",
      prodPrice: "Price",
      prodStock: "Stock Quantity",
      prodCategory: "Product Category",
      prodImages: "Images URLs (comma separated)",
      prodIsActive: "Product is Active (Visible in Telegram Bot)",
      saveChanges: "Save Product",
      creating: "Creating...",
      saving: "Saving...",
      cancel: "Cancel"
    },
    // Support Chat View
    chat: {
      title: "Customer Support Chat",
      subtitle: "Interact directly with buyers, review automated alerts, and respond to support queries",
      shoppersList: "Shoppers Inbox",
      noShoppers: "No active support chats found.",
      typeMessage: "Type a message here...",
      send: "Send",
      loadMore: "Load More History",
      systemAlert: "System Alert",
      noMessages: "Select a shopper to view chat history."
    },
    // Settings View
    settings: {
      title: "Shop Configuration",
      subtitle: "Customize shop branding, payment guidelines, currency preferences, and bot credentials",
      shopName: "Shop Identification Name",
      botToken: "Telegram Bot API Token",
      currency: "Store Currency",
      welcomeMsg: "Telegram Welcome Message",
      paymentInstructions: "Payment Instructions / Bank Guidelines",
      faqsTitle: "Frequently Asked Questions (FAQs)",
      faqsSubtitle: "Add up to 10 frequently asked questions to help customers automatically in the bot chat",
      addFaq: "Add FAQ",
      remove: "Remove",
      faqQuestion: "Question",
      faqAnswer: "Answer",
      noFaqs: "No FAQs configured yet. Click \"+ Add FAQ\" to configure automated responses.",
      savePrefs: "Save Preferences",
      savingPrefs: "Saving Changes..."
    },
    // Onboarding welcome layout
    onboarding: {
      welcome: "Welcome to Tele-Commerce!",
      onboardInstructions: "You haven't initialized any shop bots yet. Create your first shop bot below to start selling products inside Telegram.",
      createFirst: "Create First Shop Bot",
      modalTitle: "Create Your First Shop Bot",
      creating: "Creating...",
      noActiveShops: "No active shops",
      newShop: "New Shop",
      webhookActive: "Webhook Active"
    }
  },
  my: {
    brandName: "Tele-Commerce",
    // Auth & Login
    auth: {
      loginTitle: "ဒက်ရှ်ဘုတ်သို့ ဝင်ရောက်ရန်",
      registerTitle: "အကောင့်အသစ် ဖွင့်လှစ်ရန်",
      email: "အီးမေးလ် လိပ်စာ",
      password: "လျှို့ဝှက်နံပါတ်",
      name: "ဆိုင်ရှင် အမည်အပြည့်အစုံ",
      loginBtn: "လော့ဂ်အင် ဝင်မည်",
      registerBtn: "အကောင့်ဖွင့်မည်",
      alreadyHaveAccount: "အကောင့်ရှိပြီးသားလား?",
      newToBrand: "အကောင့်မရှိသေးဘူးလား?",
      signingIn: "ဝင်ရောက်နေသည်...",
      registering: "အကောင့်ဖွင့်နေသည်...",
      emailPlaceholder: "ဥပမာ- merchant@telecommerce.app",
      namePlaceholder: "ဥပမာ- မောင်မောင်",
      passwordPlaceholder: "အနည်းဆုံး ၆ လုံး"
    },
    // Sidebar Navigation
    sidebar: {
      overview: "ပင်မစာမျက်နှာ",
      orders: "အော်ဒါများ",
      products: "ကုန်ပစ္စည်းများ",
      broadcasts: "သတင်းထုတ်ပြန်ချက်",
      chat: "စုံစမ်းမေးမြန်းမှုများ",
      settings: "ဆက်တင်များ",
      subscription: "ဝန်ဆောင်မှုအဆင့်မြှင့်တင်ရန်",
      logout: "ထွက်ရန်"
    },
    // Overview Dashboard
    overview: {
      title: "အရောင်းမှတ်တမ်းများ",
      subtitle: "ဆိုင်၏ အရောင်းစာရင်း၊ အော်ဒါအခြေအနေများနှင့် နောက်ဆုံးမက်ဆေ့ခ်ျများကို ဤနေရာတွင် စစ်ဆေးပါ",
      totalRevenue: "စုစုပေါင်း ဝင်ငွေ",
      totalOrders: "စုစုပေါင်း အော်ဒါ",
      avgOrderValue: "ပျမ်းမျှ အော်ဒါတန်ဖိုး",
      totalCustomers: "စုစုပေါင်း ဝယ်ယူသူ",
      latestOrders: "နောက်ဆုံးရ အော်ဒါများ",
      orderId: "အော်ဒါ ID",
      customer: "ဝယ်ယူသူ",
      status: "အခြေအနေ",
      amount: "ကျသင့်ငွေ",
      date: "ရက်စွဲ",
      noOrders: "အော်ဒါ မရှိသေးပါ။",
      paymentVerification: "အတည်ပြုရန်စောင့်ဆိုင်းနေသော ငွေလွှဲပြေစာများ",
      noReceipts: "စစ်ဆေးရန်ကျန်သော ငွေလွှဲပြေစာ မရှိပါ။",
      approvePayment: "ငွေလက်ခံရရှိမှု အတည်ပြုမည်",
      reject: "ပယ်ဖျက်မည်",
      processing: "ဆောင်ရွက်နေသည်...",
      ordersOverTime: "အော်ဒါစာရင်း မှတ်တမ်း"
    },
    // Orders View
    orders: {
      title: "အော်ဒါစာရင်းစုစုပေါင်း",
      subtitle: "အော်ဒါများအားလုံးကို စစ်ဆေးခြင်း၊ ရှာဖွေခြင်း၊ CSV အဖြစ် ဒေါင်းလုဒ်ဆွဲခြင်းနှင့် စီမံခန့်ခွဲခြင်းများ လုပ်ဆောင်နိုင်သည်",
      searchPlaceholder: "ဝယ်ယူသူအမည်၊ ဖုန်းနံပါတ် သို့မဟုတ် လိပ်စာဖြင့် ရှာဖွေပါ...",
      exportCsv: "CSV အဖြစ်ဒေါင်းလုဒ်လုပ်ရန်",
      clearFilters: "ရက်စွဲပြန်ပြင်ရန်",
      dateFrom: "စတင်သည့်ရက်",
      dateTo: "ကုန်ဆုံးသည့်ရက်",
      statusAll: "အခြေအနေအားလုံး",
      items: "ကုန်ပစ္စည်းများ",
      actions: "လုပ်ဆောင်ချက်",
      markPaid: "ငွေလွှဲအတည်ပြုမည်",
      viewInvoice: "အင်ဗွိုက်စ်ကြည့်ရန်",
      noInvoice: "မရှိပါ",
      statusPending: "မပြည့်စုံသေးသော",
      statusPendingVerification: "စစ်ဆေးဆဲ",
      statusPaid: "ငွေချေပြီး",
      statusShipped: "ပို့ဆောင်ပြီး",
      statusCancelled: "ပယ်ဖျက်ပြီး"
    },
    // Products View
    products: {
      title: "ကုန်ပစ္စည်းများ စာရင်း",
      subtitle: "ကုန်ပစ္စည်းအချက်အလက်၊ စျေးနှုန်း၊ စတော့အရည်အတွက်နှင့် အမျိုးအစားများကို စီမံခန့်ခွဲပါ",
      addProduct: "ကုန်ပစ္စည်းအသစ်ထည့်ရန်",
      searchPlaceholder: "ပစ္စည်းအမည် သို့မဟုတ် ဖော်ပြချက်ဖြင့် ရှာဖွေပါ...",
      filterCategory: "အမျိုးအစားအားလုံး",
      inStock: "စတော့ရှိသည်",
      outOfStock: "စတော့ကုန်သွားသည်",
      price: "စျေးနှုန်း",
      stock: "စတော့",
      status: "အခြေအနေ",
      edit: "ပြင်ဆင်ရန်",
      delete: "ဖျက်ရန်",
      active: "ရောင်းမည်",
      inactive: "မရောင်းသေးပါ",
      modalAddTitle: "ကုန်ပစ္စည်းအသစ် ဖန်တီးမည်",
      modalEditTitle: "ကုန်ပစ္စည်းအချက်အလက် ပြင်ဆင်မည်",
      prodName: "ကုန်ပစ္စည်း အမည်",
      prodDesc: "ကုန်ပစ္စည်း ဖော်ပြချက်",
      prodPrice: "စျေးနှုန်း",
      prodStock: "စတော့ အရေအတွက်",
      prodCategory: "ကုန်ပစ္စည်း အမျိုးအစား",
      prodImages: "ပုံများ၏ URL လင့်ခ်များ (ကော်မာဖြင့် ခွဲခြားပါ)",
      prodIsActive: "ကုန်ပစ္စည်းကို ရောင်းမည် (တယ်လီဂရမ်တွင် ပြသရန်)",
      saveChanges: "ကုန်ပစ္စည်း သိမ်းဆည်းမည်",
      creating: "ဖန်တီးနေသည်...",
      saving: "သိမ်းဆည်းနေသည်...",
      cancel: "မလုပ်တော့ပါ"
    },
    // Support Chat View
    chat: {
      title: "ဝယ်ယူသူ စုံစမ်းမေးမြန်းမှု ချက်တင်",
      subtitle: "ဝယ်ယူသူများနှင့် တိုက်ရိုက် စကားပြောဆိုပြီး မေးမြန်းမှုများကို ဖြေကြားပါ",
      shoppersList: "မေးမြန်းသူများ စာရင်း",
      noShoppers: "မက်ဆေ့ခ်ျ မရှိသေးပါ။",
      typeMessage: "စာရိုက်ရန်...",
      send: "ပို့မည်",
      loadMore: "အဟောင်းများ ပြန်ဖတ်ရန်",
      systemAlert: "စနစ် အသိပေးချက်",
      noMessages: "စကားပြောရန် ဝယ်ယူသူကို ရွေးချယ်ပေးပါ။"
    },
    // Settings View
    settings: {
      title: "ဆိုင်၏ ဆက်တင်များ",
      subtitle: "ဆိုင်အမည်၊ ငွေပေးချေမှု လမ်းညွှန်ချက်များ၊ ငွေကြေးအမျိုးအစားနှင့် တယ်လီဂရမ်ဘော့တ်များကို ပြင်ဆင်ပါ",
      shopName: "ဆိုင်အမည်",
      botToken: "တယ်လီဂရမ်ဘော့တ် API Token",
      currency: "ငွေကြေး အမျိုးအစား",
      welcomeMsg: "တယ်လီဂရမ် နှုတ်ခွန်းဆက်စာတို",
      paymentInstructions: "ငွေပေးချေမှု လမ်းညွှန်ချက်များနှင့် ဘဏ်အကောင့်များ",
      faqsTitle: "အမေးများသော မေးခွန်းများ (FAQs)",
      faqsSubtitle: "ဝယ်ယူသူများ အလွယ်တကူ ကိုယ်တိုင်ဖတ်ရှုနိုင်ရန် အမေးများသောမေးခွန်းများ (၁၀) ခုအထိ ထည့်သွင်းနိုင်သည်",
      addFaq: "FAQ ထည့်မည်",
      remove: "ဖယ်ရှားမည်",
      faqQuestion: "မေးခွန်း",
      faqAnswer: "အဖြေ",
      noFaqs: "အမေးများသော မေးခွန်းများ မထည့်ရသေးပါ။ 'FAQ ထည့်မည်' ကို နှိပ်ပြီး ထည့်သွင်းပါ။",
      savePrefs: "သိမ်းဆည်းမည်",
      savingPrefs: "သိမ်းဆည်းနေသည်..."
    },
    // Onboarding welcome layout
    onboarding: {
      welcome: "Tele-Commerce မှ ကြိုဆိုပါသည်!",
      onboardInstructions: "သင့်တွင် တယ်လီဂရမ်ဆိုင် ဘော့တ် မရှိသေးပါ။ အရောင်းစတင်ရန် အောက်ပါခလုတ်ကို နှိပ်ပြီး ဆိုင်ဘော့တ် တစ်ခုကို အရင်ဖန်တီးပါ",
      createFirst: "ဘော့တ် ဖန်တီးမည်",
      modalTitle: "ပထမဆုံး တယ်လီဂရမ်ဆိုင်ဘော့တ် ဖန်တီးမည်",
      creating: "ဖန်တီးနေသည်...",
      noActiveShops: "ဆိုင် မရှိသေးပါ",
      newShop: "ဆိုင်အသစ်",
      webhookActive: "ချိတ်ဆက်မှု အဆင်ပြေသည်"
    }
  }
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved === "my" ? "my" : "en") as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  // Translation helper resolving dot-notation keys (e.g. t("auth.loginTitle"))
  const t = (key: string): string => {
    const keys = key.split(".");
    let current: any = translations[language];

    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        return key; // Fallback to key name if translation is missing
      }
    }

    return typeof current === "string" ? current : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
