import { useState, useEffect } from "react";
import { CreditCard, Award, Flame, Zap, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function Subscription() {
  const { t } = useLanguage();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setMerchant(json.data.merchant);
        }
      } catch (err) {
        console.error("Failed to load merchant subscription info", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  };

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className="page-body">
        <p style={{ color: "var(--text-secondary)" }}>Loading subscription configuration...</p>
      </div>
    );
  }

  const daysLeft = merchant?.subscriptionExpiresAt ? getDaysRemaining(merchant.subscriptionExpiresAt) : 0;

  return (
    <div className="page-body">
      <div className="page-header" style={{ marginBottom: "28px" }}>
        <div>
          <h2 className="page-title flex-gap-12" style={{ display: "flex", alignItems: "center" }}>
            <CreditCard size={24} style={{ color: "var(--accent-color)" }} />
            <span>Subscription Plans</span>
          </h2>
          <p className="page-subtitle">Manage billing parameters, trial periods, and explore subscription licenses</p>
        </div>
      </div>

      {/* Current License Status banner */}
      <div className="glass-card flex-gap-12" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", padding: "20px 28px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: "12px", borderRadius: "12px" }}>
            <Award size={28} style={{ color: "var(--accent-color)" }} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Current Account State</span>
            <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{merchant?.subscriptionStatus === "EXPIRED" || daysLeft === 0 ? "Account Expired" : merchant?.subscriptionStatus === "TRIAL" ? "14-Day Free Trial" : "Premium Active"}</span>
              <span className={daysLeft > 0 ? "badge badge-success" : "badge badge-danger"} style={{ fontSize: "11px", padding: "3px 8px", backgroundColor: daysLeft > 0 ? undefined : "rgba(239, 68, 68, 0.2)", color: daysLeft > 0 ? undefined : "#EF4444" }}>
                {daysLeft > 0 ? `${daysLeft} Days Remaining` : "Expired"}
              </span>
            </h3>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Expires On</span>
          <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
            {merchant?.subscriptionExpiresAt ? formatDate(merchant.subscriptionExpiresAt) : "No active subscription"}
          </span>
        </div>
      </div>

      {/* Contact Info Banner */}
      <div 
        className="glass-card" 
        style={{ 
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(147, 51, 234, 0.05) 100%)",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          borderRadius: "12px",
          padding: "16px 24px",
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          color: "var(--text-primary)",
          fontWeight: "600",
          fontSize: "14px",
          boxShadow: "0 4px 20px rgba(168, 85, 247, 0.05)"
        }}
      >
        <div style={{ background: "var(--accent-color)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}>
          i
        </div>
        <div>
          {t("subscription.contactInfo")}
        </div>
      </div>

      {/* Subscription Pricing Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", maxWidth: "1100px" }}>
        
        {/* Tier 1 */}
        <div className="glass-card pricing-card" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Starter Plan</span>
            <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "700" }}>1 Month License</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
            <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)" }}>30,000</span>
            <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>MMK / month</span>
          </div>
          <ul style={{ listStyle: "none", padding: "0", margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", flex: 1, fontSize: "13.5px", color: "var(--text-secondary)" }}>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> 1 Active Storefront Bot</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Up to 100 Product Catalog Items</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Bilingual Customer Service Chat</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Supabase Backup & Sync</li>
          </ul>
          <button className="btn btn-secondary" style={{ width: "100%" }}>Choose Starter</button>
        </div>

        {/* Tier 2 (Highlighted/Popular Plan) */}
        <div className="glass-card pricing-card" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", border: "1px solid var(--accent-color)", boxShadow: "0 8px 30px rgba(168, 85, 247, 0.05)" }}>
          <div style={{ position: "absolute", top: "-12px", right: "20px", background: "var(--accent-color)", color: "#fff", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", padding: "4px 10px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Flame size={10} />
            <span>Most Popular</span>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent-color)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quarterly Saver</span>
            <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "700" }}>3 Months License</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
            <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)" }}>85,000</span>
            <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>MMK / 3mo</span>
            <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--success-color)", fontWeight: "600", background: "rgba(34, 197, 94, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>Save 6%</span>
          </div>
          <ul style={{ listStyle: "none", padding: "0", margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", flex: 1, fontSize: "13.5px", color: "var(--text-secondary)" }}>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> 1 Active Storefront Bot</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Up to 100 Product Catalog Items</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Bilingual Customer Service Chat</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Supabase Backup & Sync</li>
            <li className="flex-gap-12" style={{ fontWeight: "600", color: "var(--text-primary)" }}><Zap size={16} style={{ color: "var(--accent-color)" }} /> Priority Support Assistance</li>
          </ul>
          <button className="btn btn-primary" style={{ width: "100%" }}>Choose Quarterly</button>
        </div>

        {/* Tier 3 */}
        <div className="glass-card pricing-card" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Super Value Plan</span>
            <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "700" }}>6 Months License</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
            <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)" }}>160,000</span>
            <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>MMK / 6mo</span>
            <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--success-color)", fontWeight: "600", background: "rgba(34, 197, 94, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>Save 11%</span>
          </div>
          <ul style={{ listStyle: "none", padding: "0", margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", flex: 1, fontSize: "13.5px", color: "var(--text-secondary)" }}>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> 1 Active Storefront Bot</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Up to 100 Product Catalog Items</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Bilingual Customer Service Chat</li>
            <li className="flex-gap-12"><ShieldCheck size={16} style={{ color: "var(--success-color)" }} /> Supabase Backup & Sync</li>
            <li className="flex-gap-12" style={{ fontWeight: "600", color: "var(--text-primary)" }}><Zap size={16} style={{ color: "var(--accent-color)" }} /> Priority Support Assistance</li>
          </ul>
          <button className="btn btn-secondary" style={{ width: "100%" }}>Choose Half-Year</button>
        </div>

      </div>
    </div>
  );
}
