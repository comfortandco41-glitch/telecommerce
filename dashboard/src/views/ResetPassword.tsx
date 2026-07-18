import React, { useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tokenParam } = useParams();
  const { language, setLanguage, t } = useLanguage();

  const getTokenFromUrl = (): string => {
    if (tokenParam) return tokenParam;
    const fromSearch = searchParams.get("token");
    if (fromSearch) return fromSearch;

    // Fallback: regex search anywhere in window.location.href or hash
    const match = window.location.href.match(/token=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : "";
  };

  const token = getTokenFromUrl();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing from the URL.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ justifyContent: "center" }}>
        <div className="auth-form-side" style={{ maxWidth: "440px", width: "100%" }}>
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

            <div className="auth-header" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <img src="/logo.png" alt="Tele-Commerce Logo" style={{ width: "64px", height: "64px", objectFit: "contain", marginBottom: "16px" }} />
              <h2 className="auth-title" style={{ margin: "0 0 4px" }}>{t("brandName")}</h2>
              <p className="auth-subtitle">{t("auth.resetPasswordTitle")}</p>
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

            {success ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <CheckCircle size={48} color="#10B981" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>
                  Password Reset Complete!
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
                  Your password has been updated successfully. You can now log in with your new password.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => navigate("/login")}
                >
                  {t("auth.backToLogin")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {!token && (
                  <div
                    style={{
                      backgroundColor: "rgba(234, 179, 8, 0.1)",
                      border: "1px solid rgba(234, 179, 8, 0.3)",
                      color: "#EAB308",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "13px",
                      marginBottom: "18px",
                      textAlign: "center",
                    }}
                  >
                    No reset token found in URL. Please use the link sent to your email.
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t("auth.newPassword")}</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder={t("auth.newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "12px" }}
                  disabled={loading || !token}
                >
                  {loading ? "Resetting Password..." : t("auth.resetBtn")}
                </button>

                <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px" }}>
                  <span
                    style={{ color: "var(--accent-color)", cursor: "pointer", fontWeight: "600" }}
                    onClick={() => navigate("/login")}
                  >
                    {t("auth.backToLogin")}
                  </span>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
