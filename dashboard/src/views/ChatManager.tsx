import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { MessageSquare, Send, User, MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function ChatManager() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();
  const { language, t } = useLanguage();

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [limit, setLimit] = useState(5);
  const [totalMessages, setTotalMessages] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  // Scroll support chat thread to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  const fetchCustomers = async () => {
    if (!selectedShopId) return;
    setLoadingCustomers(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCustomers(json.data);
        if (json.data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load customer list", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchChatHistory = async (customLimit?: number) => {
    if (!selectedShopId || !selectedCustomerId) return;
    setLoadingMessages(true);
    try {
      const currentLimit = customLimit ?? limit;
      const res = await fetch(
        `${API_URL}/api/v1/shops/${selectedShopId}/customers/${selectedCustomerId}/messages?limit=${currentLimit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setMessages(json.data);
        if (json.pagination) {
          setTotalMessages(json.pagination.total);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat history log", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Poll for new messages every 4 seconds to simulate real-time socket chat!
  useEffect(() => {
    fetchCustomers();
    setSelectedCustomerId("");
    setMessages([]);
    setLimit(5);

    window.addEventListener("shopChanged", fetchCustomers);
    return () => {
      window.removeEventListener("shopChanged", fetchCustomers);
    };
  }, [selectedShopId]);

  useEffect(() => {
    shouldScrollToBottomRef.current = true;
    fetchChatHistory(limit);

    const interval = setInterval(() => {
      if (selectedShopId && selectedCustomerId) {
        // Soft refresh without loading spinner
        fetch(
          `${API_URL}/api/v1/shops/${selectedShopId}/customers/${selectedCustomerId}/messages?limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              setMessages(json.data);
              if (json.pagination) {
                setTotalMessages(json.pagination.total);
              }
            }
          })
          .catch((err) => console.error("Poll chat error:", err));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedCustomerId, limit]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending || !selectedCustomerId) return;

    setSending(true);
    const msgText = text;
    setText(""); // Optimistic clear

    try {
      const res = await fetch(
        `${API_URL}/api/v1/shops/${selectedShopId}/customers/${selectedCustomerId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: msgText }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to dispatch support message");
      }

      shouldScrollToBottomRef.current = true;
      setMessages((prev) => [...prev, json.data]);
      setTotalMessages((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || "Error sending message");
      setText(msgText); // Restore input on fail
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = () => {
    shouldScrollToBottomRef.current = false;
    setLimit((prev) => prev + 5);
  };

  const getSelectedCustomer = () => {
    return customers.find((c) => c.id === selectedCustomerId);
  };

  return (
    <div className="page-body" style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <div className="page-header" style={{ marginBottom: "16px" }}>
        <div>
          <h2 className="page-title flex-gap-12" style={{ display: "flex", alignItems: "center" }}>
            <MessageSquare size={24} style={{ color: "var(--accent-color)" }} />
            <span>{t("chat.title")}</span>
          </h2>
          <p className="page-subtitle">{t("chat.subtitle")}</p>
        </div>
      </div>

      <div className="glass-card" style={{ flex: 1, padding: "0", display: "flex", overflow: "hidden" }}>
        {/* Customers Sidebar */}
        <div style={{ width: "300px", borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{t("chat.shoppersList")}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingCustomers ? (
              <p style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                {language === "my" ? "စုံစမ်းမေးမြန်းသူစာရင်း ယူနေသည်..." : "Loading shoppers..."}
              </p>
            ) : customers.length > 0 ? (
              customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setLimit(5);
                    setSelectedCustomerId(c.id);
                  }}
                  className={`chat-customer-item ${selectedCustomerId === c.id ? "active" : ""}`}
                >
                  <div className="chat-customer-avatar">
                    <User size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.firstName} {c.lastName || ""}
                    </div>
                    {c.username && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{c.username}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>{t("chat.noShoppers")}</p>
            )}
          </div>
        </div>

        {/* Chat Threads Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(255, 255, 255, 0.01)" }}>
          {selectedCustomerId ? (
            <>
              {/* Active Header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px", background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="chat-customer-avatar" style={{ margin: "0" }}>
                  <User size={18} />
                </div>
                <div>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "14px" }}>
                    {getSelectedCustomer()?.firstName} {getSelectedCustomer()?.lastName || ""}
                  </span>
                  {getSelectedCustomer()?.phone && (
                    <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)" }}>
                      📞 {getSelectedCustomer()?.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Message History Thread */}
              <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                {loadingMessages && messages.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    {language === "my" ? "မက်ဆေ့ခ်ျမှတ်တမ်း ယူနေသည်..." : "Loading chat logs..."}
                  </p>
                ) : messages.length > 0 ? (
                  <>
                    {messages.length < totalMessages && (
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        className="btn"
                        style={{
                          alignSelf: "center",
                          fontSize: "12px",
                          padding: "6px 12px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-secondary)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          marginBottom: "8px",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                      >
                        {t("chat.loadMore")} ({totalMessages - messages.length} {language === "my" ? "ကျန်ရှိ" : "remaining"})
                      </button>
                    )}
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: m.sender === "ADMIN" ? "flex-end" : "flex-start",
                          maxWidth: "60%",
                        }}
                      >
                        <div
                          style={{
                            background: m.sender === "ADMIN" ? "var(--accent-color)" : "rgba(255, 255, 255, 0.05)",
                            border: m.sender === "ADMIN" ? "none" : "1px solid var(--border-color)",
                            color: "var(--text-primary)",
                            padding: "10px 16px",
                            borderRadius: "14px",
                            borderBottomRightRadius: m.sender === "ADMIN" ? "2px" : "14px",
                            borderBottomLeftRadius: m.sender === "ADMIN" ? "14px" : "2px",
                            fontSize: "13.5px",
                            lineHeight: "1.5",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {m.text}
                        </div>
                        <span
                          style={{
                            display: "block",
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            marginTop: "4px",
                            textAlign: m.sender === "ADMIN" ? "right" : "left",
                          }}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    <MessageCircle size={32} style={{ marginBottom: "8px" }} />
                    <p style={{ fontSize: "13px" }}>
                      {language === "my" ? "မက်ဆေ့ခ်ျ မရှိသေးပါ။ အောက်တွင် ပထမဆုံး စာတိုရိုက်ပြီး ပို့နိုင်ပါသည်။" : "No support messages yet. Type below to send the first message!"}
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer Panel */}
              <form onSubmit={handleSendMessage} style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", background: "rgba(255, 255, 255, 0.01)" }}>
                <input
                  type="text"
                  placeholder={language === "my" ? "ဝယ်ယူသူ တယ်လီဂရမ်သို့ စာပြန်ရန်..." : "Type a support reply to send to customer's Telegram..."}
                  className="form-input"
                  style={{ flex: 1 }}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={sending}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: "0 18px" }} disabled={sending}>
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <MessageSquare size={48} style={{ marginBottom: "16px", color: "rgba(255, 255, 255, 0.1)" }} />
              <p style={{ fontSize: "14px" }}>{t("chat.noMessages")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
