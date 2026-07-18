import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Clock, MessageSquare, Layers } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function Login() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (isForgotPassword) {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || json.message || "Failed to process request");
        }

        setSuccessMsg(json.message || "Instructions sent to your email.");
      } catch (err: any) {
        setError(err.message || "Failed to connect to server");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegister) {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || json.message || "Failed to register account");
        }

        // Save credentials in storage and redirect immediately
        localStorage.setItem("token", json.data.token);
        localStorage.setItem("merchantName", json.data.merchant.name);
        localStorage.setItem("merchantEmail", json.data.merchant.email);

        navigate("/overview");
      } catch (err: any) {
        setError(err.message || "Failed to connect to server");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || json.message || "Authentication failed");
        }

        localStorage.setItem("token", json.data.token);
        localStorage.setItem("merchantName", json.data.merchant.name);
        localStorage.setItem("merchantEmail", json.data.merchant.email);

        navigate("/overview");
      } catch (err: any) {
        setError(err.message || "Failed to connect to server");
      } finally {
        setLoading(false);
      }
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
                  <h3 className="feature-title">{t("authShowcase.botAutoTitle")}</h3>
                  <p className="feature-description">{t("authShowcase.botAutoDesc")}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Clock size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">{t("authShowcase.receiptTitle")}</h3>
                  <p className="feature-description">{t("authShowcase.receiptDesc")}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <MessageSquare size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">{t("authShowcase.supportTitle")}</h3>
                  <p className="feature-description">{t("authShowcase.supportDesc")}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Layers size={20} />
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">{t("authShowcase.limitTitle")}</h3>
                  <p className="feature-description">{t("authShowcase.limitDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side: Glassmorphism Form Card */}
        <div className="auth-form-side">
          <div className="auth-card">
            
            {/* Language Selector */}
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: language === "en" ? "var(--accent-color)" : "transparent",
                  color: language === "en" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                🇺🇸 English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("my")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
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

            {successMsg && (
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10B981",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  marginBottom: "18px",
                  textAlign: "center",
                }}
              >
                {successMsg}
              </div>
            )}

            <div className="auth-header" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <img src="/logo.png" alt="Tele-Commerce Logo" style={{ width: "64px", height: "64px", objectFit: "contain", marginBottom: "16px" }} />
              <h2 className="auth-title" style={{ margin: "0 0 4px" }}>{t("brandName")}</h2>
              <p className="auth-subtitle">
                {isForgotPassword
                  ? t("auth.forgotPasswordTitle")
                  : isRegister
                  ? t("auth.registerTitle")
                  : t("auth.loginTitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {isRegister && !isForgotPassword && (
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

              {!isForgotPassword && (
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0 }}>{t("auth.password")}</label>
                    {!isRegister && (
                      <span
                        style={{ color: "var(--accent-color)", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError("");
                          setSuccessMsg("");
                        }}
                      >
                        {t("auth.forgotPassword")}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    className="form-input"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }} disabled={loading}>
                {loading
                  ? t(isForgotPassword ? "auth.sendingReset" : isRegister ? "auth.registering" : "auth.signingIn")
                  : isForgotPassword
                  ? t("auth.sendResetBtn")
                  : isRegister
                  ? t("auth.registerBtn")
                  : t("auth.loginBtn")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
              {isForgotPassword ? (
                <span
                  style={{ color: "var(--accent-color)", cursor: "pointer", fontWeight: "600" }}
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  ← {t("auth.backToLogin")}
                </span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                  <div>
                    {isRegister ? t("auth.alreadyHaveAccount") : t("auth.newToBrand")}{" "}
                    <span
                      style={{ color: "var(--accent-color)", cursor: "pointer", fontWeight: "600" }}
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setIsForgotPassword(false);
                        setError("");
                        setSuccessMsg("");
                      }}
                    >
                      {isRegister ? t("auth.loginBtn") : t("auth.registerBtn")}
                    </span>
                  </div>

                  {!isRegister && (
                    <div>
                      <span
                        style={{
                          color: "var(--accent-color)",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "13px",
                          textDecoration: "underline",
                        }}
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError("");
                          setSuccessMsg("");
                        }}
                      >
                        🔑 {t("auth.forgotPassword")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
