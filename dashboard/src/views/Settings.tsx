import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Save, Settings2, ShieldCheck, AlertCircle } from "lucide-react";

export function Settings() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();
  
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  
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
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update settings");
      }

      setMessage({ type: "success", text: "Settings saved successfully! Bot welcome messages and payment templates are now live." });
      
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
        <p style={{ color: "var(--text-secondary)" }}>Loading shop settings configuration...</p>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title flex-gap-12" style={{ display: "flex", alignItems: "center" }}>
            <Settings2 size={24} style={{ color: "var(--accent-color)" }} />
            <span>Shop Configuration</span>
          </h2>
          <p className="page-subtitle">Customize shop branding, payment guidelines, currency preferences, and bot credentials</p>
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
            <label className="form-label">Shop Identification Name</label>
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
              <label className="form-label">Telegram Bot API Token</label>
              <input
                type="password"
                className="form-input"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                required
              />
              <span className="form-helper" style={{ display: "block", marginTop: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                Get this from Telegram's official @BotFather account.
              </span>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Store Currency</label>
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
            <label className="form-label">Telegram Welcome Message</label>
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
            <label className="form-label">Payment Instructions / Bank Transfer Guidelines</label>
            <textarea
              className="form-input"
              style={{ minHeight: "120px", fontFamily: "inherit" }}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Display bank accounts, e-wallets (KBZPay, WavePay, etc.), and checkout terms."
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
            <button type="submit" className="btn btn-primary flex-gap-12" disabled={saving}>
              <Save size={16} />
              <span>{saving ? "Saving Changes..." : "Save Preferences"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
