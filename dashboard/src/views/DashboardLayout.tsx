import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, LogOut, Plus, Megaphone, MessageSquare, Settings2, CreditCard, Sun, Moon } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);

  // ...

  const fetchMerchant = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMerchantInfo(json.data.merchant);
      }
    } catch (err) {
      console.error("Failed to fetch merchant profile", err);
    }
  };

  useEffect(() => {
    fetchShops();
    fetchMerchant();
  }, []);

  const isExpired = merchantInfo?.subscriptionExpiresAt
    ? new Date(merchantInfo.subscriptionExpiresAt) < new Date() || merchantInfo.subscriptionStatus === "EXPIRED"
    : false;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopToken, setNewShopToken] = useState("");
  const [newShopCurrency, setNewShopCurrency] = useState("USD");
  const [newShopInstructions, setNewShopInstructions] = useState("");
  const [newShopWelcome, setNewShopWelcome] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const merchantName = localStorage.getItem("merchantName") || "Merchant";
  const initials = merchantName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  const fetchShops = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/shops`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShops(json.data);
        if (json.data.length > 0) {
          const stored = localStorage.getItem("selectedShopId");
          const exists = json.data.some((s: any) => s.id === stored);
          const initialShopId = exists && stored ? stored : json.data[0].id;
          setSelectedShopId(initialShopId);
          localStorage.setItem("selectedShopId", initialShopId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch shops list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleShopChange = (id: string) => {
    setSelectedShopId(id);
    localStorage.setItem("selectedShopId", id);
    // Force nested route components to reload shop specific states
    window.dispatchEvent(new Event("shopChanged"));
  };

  const handleCreateShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/shops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botToken: newShopToken,
          name: newShopName,
          currency: newShopCurrency,
          paymentInstructions: newShopInstructions,
          welcomeMessage: newShopWelcome,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to create shop");
      }

      // Add to list and set as selected
      const createdShop = json.data;
      setShops([...shops, createdShop]);
      setSelectedShopId(createdShop.id);
      localStorage.setItem("selectedShopId", createdShop.id);
      
      // Reset form states
      setNewShopName("");
      setNewShopToken("");
      setNewShopInstructions("");
      setNewShopWelcome("");
      setShowCreateModal(false);
      
      window.dispatchEvent(new Event("shopChanged"));
    } catch (err: any) {
      setCreateError(err.message || "Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-main)", height: "100vh" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>{language === "my" ? "ဒက်ရှ်ဘုတ်သို့ ဝင်ရောက်နေသည်..." : "Loading Dashboard Workspace..."}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/logo.png" alt="Tele-Commerce Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
          <span>Tele-Commerce</span>
        </div>
        <nav className="sidebar-nav">
          <Link
            to="/overview"
            className={`sidebar-item ${location.pathname.startsWith("/overview") ? "active" : ""}`}
          >
            <LayoutDashboard size={18} />
            <span>{t("sidebar.overview")}</span>
          </Link>
          <Link
            to="/orders"
            className={`sidebar-item ${location.pathname.startsWith("/orders") ? "active" : ""}`}
          >
            <ShoppingCart size={18} />
            <span>{t("sidebar.orders")}</span>
          </Link>
          <Link
            to="/products"
            className={`sidebar-item ${location.pathname.startsWith("/products") ? "active" : ""}`}
          >
            <Package size={18} />
            <span>{t("sidebar.products")}</span>
          </Link>
          <Link
            to="/broadcasts"
            className={`sidebar-item ${location.pathname.startsWith("/broadcasts") ? "active" : ""}`}
          >
            <Megaphone size={18} />
            <span>{t("sidebar.broadcasts")}</span>
          </Link>
          <Link
            to="/chat"
            className={`sidebar-item ${location.pathname.startsWith("/chat") ? "active" : ""}`}
          >
            <MessageSquare size={18} />
            <span>{t("sidebar.chat")}</span>
          </Link>
          <Link
            to="/settings"
            className={`sidebar-item ${location.pathname.startsWith("/settings") ? "active" : ""}`}
          >
            <Settings2 size={18} />
            <span>{t("sidebar.settings")}</span>
          </Link>
          <Link
            to="/subscription"
            className={`sidebar-item ${location.pathname.startsWith("/subscription") ? "active" : ""}`}
          >
            <CreditCard size={18} />
            <span>{t("sidebar.subscription")}</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-item" style={{ background: "transparent", border: "none", width: "100%", textAlign: "left" }}>
            <LogOut size={18} />
            <span>{t("sidebar.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-content">
        <header className="header">
          <div className="header-title-section">
            {shops.length > 0 ? (
              <select
                className="shop-selector"
                value={selectedShopId}
                onChange={(e) => handleShopChange(e.target.value)}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    🛍️ {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{t("onboarding.noActiveShops")}</span>
            )}
            {shops.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-secondary btn-sm flex-gap-12"
              >
                <Plus size={14} />
                <span>{t("onboarding.newShop")}</span>
              </button>
            )}
          </div>

          <div className="header-user-section">
            {/* Theme Switcher Toggle */}
            <div style={{ display: "flex", alignItems: "center", background: "var(--bg-hover)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "3px", marginRight: "12px" }}>
              <button
                type="button"
                onClick={() => setTheme("light")}
                title="Light Mode"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                  borderRadius: "16px",
                  border: "none",
                  backgroundColor: theme === "light" ? "var(--accent-color)" : "transparent",
                  color: theme === "light" ? "#FFFFFF" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                title="Dark Mode"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                  borderRadius: "16px",
                  border: "none",
                  backgroundColor: theme === "dark" ? "var(--accent-color)" : "transparent",
                  color: theme === "dark" ? "#FFFFFF" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Moon size={14} />
              </button>
            </div>

            {/* Language Switcher Toggle */}
            <div style={{ display: "flex", gap: "6px", marginRight: "16px" }}>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: language === "en" ? "var(--accent-color)" : "transparent",
                  color: language === "en" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                🇬🇧 EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("my")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: language === "my" ? "var(--accent-color)" : "transparent",
                  color: language === "my" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                🇲🇲 မြန်မာ
              </button>
            </div>

            <div className="status-badge">
              <div className="status-dot"></div>
              <span>{t("onboarding.webhookActive")}</span>
            </div>
            <div className="user-profile">
              <div className="user-avatar">{initials}</div>
              <span className="user-name">{merchantName}</span>
            </div>
          </div>
        </header>

        {isExpired && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#EF4444",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            <div>
              ⚠️ <strong>Account Expired:</strong> Your subscription expired on{" "}
              {merchantInfo?.subscriptionExpiresAt
                ? new Date(merchantInfo.subscriptionExpiresAt).toLocaleDateString()
                : "the previous billing cycle"}
              . Telegram bot automation and store modifications are currently paused.
            </div>
            <a
              href="https://t.me/TCsub_bot"
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: "#EF4444",
                color: "#ffffff",
                padding: "6px 14px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "700",
                whiteSpace: "nowrap",
                marginLeft: "16px",
              }}
            >
              Contact @TCsub_bot to Renew
            </a>
          </div>
        )}

        {/* Content Outlet */}
        {shops.length > 0 ? (
          <Outlet context={{ selectedShopId, shops }} />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" }}>
            <div className="glass-card" style={{ maxWidth: "450px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: "700" }}>{t("onboarding.welcome")}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
                {t("onboarding.onboardInstructions")}
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                {t("onboarding.createFirst")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shop Creation Modal */}
      {showCreateModal && (
        <div className="drawer-backdrop" style={{ justifyContent: "center", alignItems: "center" }}>
          <div className="glass-card" style={{ width: "500px", padding: "32px", position: "relative" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700" }}>{t("onboarding.modalTitle")}</h3>
            
            {createError && (
              <div style={{ padding: "10px", color: "var(--danger-color)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateShopSubmit}>
              <div className="form-group">
                <label className="form-label">{t("settings.shopName")}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Retro Vinyl Store"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("settings.botToken")}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="123456789:ABCdefGHI..."
                  value={newShopToken}
                  onChange={(e) => setNewShopToken(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("settings.currency")}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="$"
                  value={newShopCurrency}
                  onChange={(e) => setNewShopCurrency(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("settings.paymentInstructions")}</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "80px", fontFamily: "inherit" }}
                  placeholder="Transfer to Account XYZ..."
                  value={newShopInstructions}
                  onChange={(e) => setNewShopInstructions(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("settings.welcomeMsg")}</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "80px", fontFamily: "inherit" }}
                  placeholder="Welcome to our shop!..."
                  value={newShopWelcome}
                  onChange={(e) => setNewShopWelcome(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={createLoading}
                >
                  {t("products.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? t("onboarding.creating") : t("onboarding.createFirst")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
