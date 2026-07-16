import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Save, Settings2, ShieldCheck, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function Settings() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();
  const { language, t } = useLanguage();
  
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  const fetchShopDetails = async () => {
    if (!selectedShopId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/shops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const currentShop = json.data.find((s: any) => s.id === selectedShopId);
        if (currentShop) {
          setName(currentShop.name);
          setBotToken(currentShop.botToken);
          setCurrency(currentShop.currency);
          setPaymentInstructions(currentShop.paymentInstructions);
          setWelcomeMessage(currentShop.welcomeMessage);
          setFaqs(currentShop.faqs || []);
        }
      }
    } catch (err) {
      console.error("Failed to load shop configuration details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopDetails();

    window.addEventListener("shopChanged", fetchShopDetails);
    return () => {
      window.removeEventListener("shopChanged", fetchShopDetails);
    };
  }, [selectedShopId]);

  const handleAddFaq = () => {
    if (faqs.length >= 10) return;
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const handleRemoveFaq = (index: number) => {
    const newFaqs = [...faqs];
    newFaqs.splice(index, 1);
    setFaqs(newFaqs);
  };

  const handleFaqChange = (index: number, field: "question" | "answer", val: string) => {
    const newFaqs = [...faqs];
    newFaqs[index] = {
      ...newFaqs[index],
      [field]: val,
    };
    setFaqs(newFaqs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          botToken,
          currency,
          paymentInstructions,
          welcomeMessage,
          faqs,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update settings");
      }

      setMessage({
        type: "success",
        text: language === "my"
          ? "ဆိုင်ဆက်တင်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။"
          : "Settings saved successfully! Bot welcome messages and payment templates are now live."
      });
      
      // Update sidebar shop title list
      window.dispatchEvent(new Event("shopChanged"));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Something went wrong saving settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-body">
        <p style={{ color: "var(--text-secondary)" }}>
          {language === "my" ? "ဆိုင်အချက်အလက်များ ယူနေသည်..." : "Loading shop settings configuration..."}
        </p>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title flex-gap-12" style={{ display: "flex", alignItems: "center" }}>
            <Settings2 size={24} style={{ color: "var(--accent-color)" }} />
            <span>{t("settings.title")}</span>
          </h2>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
      </div>

      {message && (
        <div className={`glass-card flex-gap-12 ${message.type === "success" ? "border-success" : "border-danger"}`} style={{ padding: "16px 20px", display: "flex", alignItems: "center", marginBottom: "20px" }}>
          {message.type === "success" ? (
            <ShieldCheck size={20} style={{ color: "var(--success-color)" }} />
          ) : (
            <AlertCircle size={20} style={{ color: "var(--danger-color)" }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: "500", color: message.type === "success" ? "var(--success-color)" : "var(--danger-color)" }}>
            {message.text}
          </span>
        </div>
      )}

      <div className="glass-card" style={{ maxWidth: "800px" }}>
        <form onSubmit={handleSubmit} className="flex-col-gap-24">
          <div className="form-group">
            <label className="form-label">{t("settings.shopName")}</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Telegram Corner Store"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">{t("settings.botToken")}</label>
              <input
                type="password"
                className="form-input"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                required
              />
              <span className="form-helper" style={{ display: "block", marginTop: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                {language === "my" ? "@BotFather ထံမှ ရရှိလာသော ဘော့တ် တိုကင်ကို ထည့်သွင်းပါ" : "Get this from Telegram's official @BotFather account."}
              </span>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t("settings.currency")}</label>
              <input
                type="text"
                className="form-input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD, MMK, THB, etc."
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t("settings.welcomeMsg")}</label>
            <textarea
              className="form-input"
              style={{ minHeight: "100px", fontFamily: "inherit" }}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome customers and explain how to browse products."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("settings.paymentInstructions")}</label>
            <textarea
              className="form-input"
              style={{ minHeight: "120px", fontFamily: "inherit" }}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Display bank accounts, e-wallets (KBZPay, WavePay, etc.), and checkout terms."
              required
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px", marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>{t("settings.faqsTitle")}</h4>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  {t("settings.faqsSubtitle")}
                </p>
              </div>
              {faqs.length < 10 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  onClick={handleAddFaq}
                >
                  {t("settings.addFaq")}
                </button>
              )}
            </div>

            {faqs.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "13px" }}>
                {t("settings.noFaqs")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-color)" }}>FAQ #{idx + 1}</span>
                      <button
                        type="button"
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          color: "var(--danger-color)",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                        onClick={() => handleRemoveFaq(idx)}
                      >
                        {t("settings.remove")}
                      </button>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("settings.faqQuestion")}</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: "8px 12px", fontSize: "13px" }}
                        value={faq.question}
                        onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                        placeholder="e.g. How do I make a payment? / ငွေဘယ်လိုလွှဲရမလဲ?"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("settings.faqAnswer")}</label>
                      <textarea
                        className="form-input"
                        style={{ padding: "8px 12px", fontSize: "13px", minHeight: "60px", fontFamily: "inherit" }}
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                        placeholder="e.g. You can transfer to KBZPay: 09123456789. / KBZPay ဖုန်း ၀၉၁၂၃၄၅၆၇၈၉ သို့ လွှဲနိုင်ပါသည်။"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
            <button type="submit" className="btn btn-primary flex-gap-12" disabled={saving}>
              <Save size={16} />
              <span>{saving ? t("settings.savingPrefs") : t("settings.savePrefs")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
