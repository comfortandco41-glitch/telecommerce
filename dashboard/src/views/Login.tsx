import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Login() {
  const navigate = useNavigate();
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
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2 className="auth-title">SuperBot</h2>
          <p className="auth-subtitle">
            {isRegister ? "Register a Merchant Account" : "Log in to Shop Dashboard"}
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
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }} disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
          {isRegister ? "Already have an account?" : "New to SuperBot?"}{" "}
          <span
            style={{ color: "var(--accent-color)", cursor: "pointer", fontWeight: "600" }}
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Sign In" : "Register here"}
          </span>
        </div>
      </div>
    </div>
  );
}
