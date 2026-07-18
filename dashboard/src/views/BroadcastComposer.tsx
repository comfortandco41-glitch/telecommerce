import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, Send, Calendar, AlertCircle } from "lucide-react";

export function BroadcastComposer() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();

  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [monthlyUsed, setMonthlyUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Form states
  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState<"ALL" | "BUYERS">("ALL");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const buyersCount = customers.filter(c => c.orders && c.orders.some((o: any) => o.status !== "CANCELLED")).length;
  const activeAudienceCount = targetAudience === "BUYERS" ? buyersCount : customers.length;

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    if (!selectedShopId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // 1. Fetch campaigns logs
      const listRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/broadcasts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listJson = await listRes.json();
      setBroadcasts(listJson.success ? listJson.data : []);
      if (listJson.meta && typeof listJson.meta.monthlyUsed === "number") {
        setMonthlyUsed(listJson.meta.monthlyUsed);
      }

      // 2. Fetch audience customer list
      const custRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const custJson = await custRes.json();
      setCustomers(custJson.success ? custJson.data : []);
    } catch (err) {
      console.error("Failed to load broadcast views details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    window.addEventListener("shopChanged", fetchData);
    return () => {
      window.removeEventListener("shopChanged", fetchData);
    };
  }, [selectedShopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (monthlyUsed >= 15) {
      setError("Monthly limit reached (15/15 campaigns used). Reset on 1st of next month.");
      return;
    }

    if (messageText.trim().length < 5) {
      setError("Broadcast message must be at least 5 characters long.");
      return;
    }

    setSendLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/broadcasts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageText,
          mediaUrl: mediaUrl.trim() || undefined,
          targetAudience,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to dispatch broadcast");
      }

      setSuccess(
        scheduledAt
          ? "Campaign successfully scheduled!"
          : "Campaign queued and dispatching in the background!"
      );
      setMessageText("");
      setMediaUrl("");
      setTargetAudience("ALL");
      setScheduledAt("");

      // Refresh list
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to queue campaign");
    } finally {
      setSendLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "badge badge-pending";
      case "SENDING":
        return "badge badge-verification";
      case "SENT":
        return "badge badge-paid";
      case "FAILED":
        return "badge badge-cancelled";
      default:
        return "badge";
    }
  };

  return (
    <div className="page-body" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "28px" }}>
      {/* Compose & Campaign Logs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="page-header" style={{ margin: "0" }}>
          <div>
            <h2 className="page-title">Megaphone Broadcasts</h2>
            <p className="page-subtitle">Send news, coupons, or catalogs directly to all bot chat subscribers</p>
          </div>
        </div>

        {/* Campaign Table Logs */}
        <div className="glass-card" style={{ padding: "0" }}>
          <h3 style={{ margin: "20px", fontSize: "15px", fontWeight: "700" }}>Past Campaigns</h3>
          {loading ? (
            <p style={{ padding: "24px", color: "var(--text-secondary)" }}>Loading database logs...</p>
          ) : broadcasts.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date Created</th>
                    <th>Message Text Preview</th>
                    <th>Delivered</th>
                    <th>Fails</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.messageText}
                      </td>
                      <td style={{ fontWeight: "600" }}>{b.sentCount} chats</td>
                      <td style={{ color: b.failedCount > 0 ? "var(--danger-color)" : "inherit" }}>
                        {b.failedCount}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(b.status)}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
              No marketing campaigns dispatched yet.
            </p>
          )}
        </div>
      </div>

      {/* Campaign Form Composer Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "700" }}>Campaign Composer</h3>

        {/* Monthly Quota Badge */}
        <div
          className="glass-card"
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: monthlyUsed >= 15 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border-color)",
            backgroundColor: monthlyUsed >= 15 ? "rgba(239, 68, 68, 0.08)" : "transparent",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            📢 Monthly Quota
          </span>
          <span
            className={monthlyUsed >= 15 ? "badge badge-danger" : "badge badge-paid"}
            style={{
              fontSize: "12px",
              fontWeight: "700",
              padding: "4px 10px",
              backgroundColor: monthlyUsed >= 15 ? "#EF4444" : undefined,
              color: monthlyUsed >= 15 ? "#fff" : undefined,
            }}
          >
            {monthlyUsed} / 15 Used
          </span>
        </div>

        {/* Audience size card */}
        <div
          className="glass-card"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            padding: "20px",
          }}
        >
          <div className="flex-row-between">
            <span className="metric-label" style={{ color: "#A5B4FC" }}>Active Audience</span>
            <Users size={18} style={{ color: "#A5B4FC" }} />
          </div>
          <h3 className="metric-value" style={{ margin: "8px 0 4px", fontSize: "28px" }}>
            {activeAudienceCount} subscribers
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Messages will deliver to these customers.
          </span>
        </div>

        {/* Form composer card */}
        <div className="glass-card">
          {monthlyUsed >= 15 && (
            <div style={{ padding: "12px", color: "#EAB308", background: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
              ⚠️ <strong>Monthly Limit Reached (15/15):</strong> You have reached the maximum broadcast campaigns allowed per month. Your quota will reset on the 1st of next month.
            </div>
          )}
          {error && (
            <div style={{ padding: "10px", color: "var(--danger-color)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "10px", color: "var(--success-color)", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Target Audience Segment</label>
              <select
                className="form-input"
                value={targetAudience}
                onChange={(e: any) => setTargetAudience(e.target.value)}
                style={{ cursor: "pointer" }}
                disabled={monthlyUsed >= 15}
              >
                <option value="ALL">All Bot Subscribers ({customers.length})</option>
                <option value="BUYERS">Previous Buyers Only ({buyersCount})</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Message Content</label>
              <textarea
                className="form-input"
                style={{ minHeight: "120px", fontFamily: "inherit", resize: "vertical" }}
                placeholder="Write message details (supports raw text / links)..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={monthlyUsed >= 15}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Media Attachment URL (Optional)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://images.unsplash.com/photo-..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={monthlyUsed >= 15}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Scheduled Dispatch (Optional)</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Calendar size={14} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
                <input
                  type="datetime-local"
                  className="form-input"
                  style={{ width: "100%", paddingLeft: "36px" }}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={monthlyUsed >= 15}
                />
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Leave blank to dispatch immediately.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary flex-gap-12"
              style={{ width: "100%", marginTop: "12px" }}
              disabled={sendLoading || monthlyUsed >= 15}
            >
              <Send size={14} />
              <span>
                {sendLoading
                  ? "Dispatching..."
                  : monthlyUsed >= 15
                  ? "Monthly Limit Reached (15/15)"
                  : scheduledAt
                  ? "Schedule Campaign"
                  : "Dispatch Broadcast"}
              </span>
            </button>
          </form>
        </div>

        <div className="glass-card" style={{ padding: "16px", border: "1px dashed var(--border-color)" }}>
          <div className="flex-gap-12" style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
            <AlertCircle size={14} />
            <span>Throttled Queue Rules</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.5", margin: "0" }}>
            To respect Telegram API limits, dispatches pause for 40ms between recipients, capping speeds at 25/second. Large campaigns may take several minutes to finalize.
          </p>
        </div>
      </div>
    </div>
  );
}
