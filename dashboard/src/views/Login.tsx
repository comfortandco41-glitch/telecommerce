import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Clock, MessageSquare, Layers } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function Login() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const path = isRegister ? "/api/v1/auth/register" : "/api/v1/auth/login";
    const body = isRegister ? { email, password, name } : { email, password };

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Authentication failed");
      }

      // Save credentials in storage
      localStorage.setItem("token", json.data.token);
      localStorage.setItem("merchantName", json.data.merchant.name);
      localStorage.setItem("merchantEmail", json.data.merchant.email);

      navigate("/overview");
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        
        {/* Left Side: SaaS Product Showcase */}
        <div className="auth-showcase">
          <div>
            <div className="showcase-brand">
              <img src="/logo.png" alt="Tele-Commerce Logo" className="showcase-logo" />
              <h1 className="showcase-title">{t("brandName")}</h1>
            </div>
            
            <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", color: "var(--accent-color)", display: "block", marginBottom: "8px" }}>
              {t("authShowcase.tagline")}
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", lineHeight: "1.3", margin: "0 0 32px" }}>
              {t("authShowcase.headline")}
            </h2>
            
            <div className="showcase-features">
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Bot size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-heading">{t("authShowcase.botAutoTitle")}</h3>
                  <p className="feature-desc">{t("authShowcase.botAutoDesc")}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Clock size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-heading">{t("authShowcase.receiptTitle")}</h3>
                  <p className="feature-desc">{t("authShowcase.receiptDesc")}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <MessageSquare size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-heading">{t("authShowcase.supportTitle")}</h3>
                  <p className="feature-desc">{t("authShowcase.supportDesc")}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Layers size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-heading">{t("authShowcase.limitTitle")}</h3>
                  <p className="feature-desc">{t("authShowcase.limitDesc")}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="showcase-footer">
            <span>Powered by Tele-Commerce Bot Engine v2.0</span>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="auth-form-side">
          <div className="auth-card">
            {/* Language Switcher */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginBottom: "16px" }}>
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
                  fontSize: "11px",
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
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                🇲🇲 မြန်မာ
              </button>
            </div>

            <div className="auth-header" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <img src="/logo.png" alt="Tele-Commerce Logo" style={{ width: "64px", height: "64px", objectFit: "contain", marginBottom: "16px" }} />
              <h2 className="auth-title" style={{ margin: "0 0 4px" }}>{t("brandName")}</h2>
              <p className="auth-subtitle">
                {isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  marginBottom: "18px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="form-group">
                  <label className="form-label">{t("auth.name")}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t("auth.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{t("auth.email")}</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("auth.password")}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }} disabled={loading}>
                {loading
                  ? t(isRegister ? "auth.registering" : "auth.signingIn")
                  : isRegister
                  ? t("auth.registerBtn")
                  : t("auth.loginBtn")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
              {isRegister ? t("auth.alreadyHaveAccount") : t("auth.newToBrand")}{" "}
              <span
                style={{ color: "var(--accent-color)", cursor: "pointer", fontWeight: "600" }}
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
              >
                {isRegister ? t("auth.loginBtn") : t("auth.registerBtn")}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
