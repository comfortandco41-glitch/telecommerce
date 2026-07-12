import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, Send, Calendar, AlertCircle } from "lucide-react";

export function BroadcastComposer() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();

  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form states
  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      // 2. Fetch audience customer segment count
      const custRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const custJson = await custRes.json();
      setSubscribersCount(custJson.success ? custJson.data.length : 0);
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
            {subscribersCount} subscribers
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Messages will deliver to these customers.
          </span>
        </div>

        {/* Form composer card */}
        <div className="glass-card">
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
              <label className="form-label">Message Content</label>
              <textarea
                className="form-input"
                style={{ minHeight: "120px", fontFamily: "inherit", resize: "vertical" }}
                placeholder="Write message details (supports raw text / links)..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
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
              disabled={sendLoading}
            >
              <Send size={14} />
              <span>{sendLoading ? "Queuing..." : "Queue Broadcast"}</span>
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
