import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Eye, X, Download } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function OrdersManager() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();
  const { language, t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  const fetchOrders = async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOrders(json.data);
        // Refresh currently open drawer details if any
        if (selectedOrder) {
          const fresh = json.data.find((o: any) => o.id === selectedOrder.id);
          if (fresh) {
            setSelectedOrder(fresh);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load orders list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    window.addEventListener("shopChanged", fetchOrders);
    return () => {
      window.removeEventListener("shopChanged", fetchOrders);
    };
  }, [selectedShopId]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update order status");
      }

      await fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error executing order status update");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter orders list by query and date range
  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    const customerName = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.toLowerCase();
    const phone = (o.deliveryPhone || "").toLowerCase();
    const address = (o.deliveryAddress || "").toLowerCase();
    const id = o.id.toLowerCase();
    const matchesSearch = customerName.includes(term) || phone.includes(term) || address.includes(term) || id.includes(term);
    if (!matchesSearch) return false;

    const orderDate = new Date(o.createdAt);
    if (startDate && orderDate < new Date(startDate + "T00:00:00")) {
      return false;
    }
    if (endDate && orderDate > new Date(endDate + "T23:59:59")) {
      return false;
    }

    return true;
  });

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders to export matching the current filters.");
      return;
    }

    const headers = ["Order ID", "Customer Name", "Customer Phone", "Order Date", "Amount ($)", "Status", "Delivery Address"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.customer ? `${o.customer.firstName} ${o.customer.lastName || ""}`.trim() : "Unknown",
      o.deliveryPhone || "",
      new Date(o.createdAt).toLocaleString(),
      Number(o.totalAmount).toFixed(2),
      o.status,
      `"${(o.deliveryAddress || "").replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${startDate || "all"}_to_${endDate || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "badge badge-pending";
      case "PENDING_VERIFICATION":
        return "badge badge-verification";
      case "PAID":
        return "badge badge-paid";
      case "SHIPPED":
        return "badge badge-shipped";
      case "CANCELLED":
        return "badge badge-cancelled";
      default:
        return "badge";
    }
  };

  const getStatusLabel = (status: string) => {
    if (language === "my") {
      switch (status) {
        case "PENDING":
          return "မပြည့်စုံသေးသော";
        case "PENDING_VERIFICATION":
          return "စစ်ဆေးဆဲ";
        case "PAID":
          return "ငွေချေပြီး";
        case "SHIPPED":
          return "ပို့ဆောင်ပြီး";
        case "CANCELLED":
          return "ပယ်ဖျက်ပြီး";
        default:
          return status;
      }
    }
    return status.replace("_", " ");
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("orders.title")}</h2>
          <p className="page-subtitle">{t("orders.subtitle")}</p>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="glass-card flex-row-between" style={{ padding: "16px 24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ position: "relative", width: "350px", display: "flex", alignItems: "center" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder={language === "my" ? "ဝယ်ယူသူအမည်၊ ဖုန်းဖြင့်ရှာဖွေရန်..." : "Search by shopper name, phone, or ID..."}
            className="form-input"
            style={{ width: "100%", paddingLeft: "42px" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date Filter & Export Option */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label className="form-label" style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>{t("orders.dateFrom")}:</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: "6px 12px", fontSize: "13px" }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label className="form-label" style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>{t("orders.dateTo")}:</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: "6px 12px", fontSize: "13px" }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="btn btn-secondary"
              style={{ padding: "8px 12px", fontSize: "12px", height: "38px" }}
            >
              {language === "my" ? "ရှင်းလင်းမည်" : "Clear"}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: "13px", height: "38px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Download size={15} />
            <span>{t("orders.exportCsv")}</span>
          </button>
        </div>
      </div>

      {/* Orders Table list */}
      <div className="glass-card" style={{ padding: "0" }}>
        {loading ? (
          <p style={{ padding: "24px", color: "var(--text-secondary)" }}>
            {language === "my" ? "အော်ဒါမှတ်တမ်းများ ယူနေသည်..." : "Loading order database records..."}
          </p>
        ) : filteredOrders.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("overview.orderId")}</th>
                  <th>{t("overview.customer")}</th>
                  <th>{t("overview.date")}</th>
                  <th>{t("overview.amount")}</th>
                  <th>{t("overview.status")}</th>
                  <th style={{ textAlign: "right" }}>{t("orders.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--accent-color)" }}>
                      #{o.id.slice(-8).toUpperCase()}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: "600" }}>
                          {o.customer ? `${o.customer.firstName} ${o.customer.lastName || ""}` : "Unknown"}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{o.deliveryPhone}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: "600" }}>${Number(o.totalAmount).toFixed(2)}</td>
                    <td>
                      <span className={getStatusBadgeClass(o.status)}>{getStatusLabel(o.status)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button onClick={() => setSelectedOrder(o)} className="btn btn-secondary btn-sm flex-gap-12" style={{ display: "inline-flex" }}>
                        <Eye size={12} />
                        <span>{language === "my" ? "စစ်ဆေးရန်" : "Inspect"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
            {language === "my" ? "ရှာဖွေမှုနှင့် ကိုက်ညီသော အော်ဒါမရှိပါ။" : "No orders found matching the filter query."}
          </p>
        )}
      </div>

      {/* Order Inspect Drawer Sheet */}
      {selectedOrder && (
        <div className="drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="drawer-title">{language === "my" ? "အော်ဒါ အသေးစိတ်" : "Order Details"}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <span className="drawer-section-title">{language === "my" ? "အော်ဒါ ID" : "Order Reference ID"}</span>
                <span className="drawer-detail-value" style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--accent-color)" }}>
                  {selectedOrder.id}
                </span>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">{t("overview.status")}</span>
                <div>
                  <span className={getStatusBadgeClass(selectedOrder.status)}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">{language === "my" ? "ဝယ်ယူသူ ကိုယ်ရေးအကျဉ်း" : "Buyer Profile"}</span>
                <span className="drawer-detail-value">
                  {selectedOrder.customer ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName || ""}` : "Unknown"}
                  {selectedOrder.customer?.username && ` (@${selectedOrder.customer.username})`}
                </span>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">{language === "my" ? "ပို့ဆောင်မည့် လိပ်စာနှင့် ဖုန်း" : "Delivery Contact Details"}</span>
                <span className="drawer-detail-value">
                  {language === "my" ? "ဖုန်း-" : "Phone:"} <strong>{selectedOrder.deliveryPhone}</strong><br />
                  {language === "my" ? "လိပ်စာ-" : "Address:"} <strong>{selectedOrder.deliveryAddress}</strong>
                </span>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">{t("orders.items")}</span>
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px" }}>
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex-row-between" style={{ padding: "6px 0", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <span>
                        {item.product?.name || "Product Item"} x{item.quantity}
                      </span>
                      <span style={{ fontWeight: "600" }}>
                        ${(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex-row-between" style={{ paddingTop: "10px", fontWeight: "700", fontSize: "14px" }}>
                    <span>{language === "my" ? "စုစုပေါင်းကျသင့်ငွေ" : "Total Amount Paid"}</span>
                    <span style={{ color: "var(--accent-color)" }}>
                      ${Number(selectedOrder.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">{t("overview.paymentVerification")}</span>
                {selectedOrder.bankScreenshotUrl ? (
                  <a href={selectedOrder.bankScreenshotUrl} target="_blank" rel="noreferrer">
                    <img
                      src={selectedOrder.bankScreenshotUrl}
                      alt="Payment Receipt screenshot"
                      className="receipt-image-preview"
                      onError={(e) => {
                        (e.target as any).src = "https://placehold.co/400x300/1F2937/FFFFFF?text=Image+Load+Error";
                      }}
                    />
                  </a>
                ) : (
                  <span className="drawer-detail-value" style={{ color: "var(--text-muted)" }}>
                    {language === "my" ? "ပြေစာပုံတင်ထားခြင်းမရှိပါ။" : "No receipt image was uploaded for this transaction."}
                  </span>
                )}
              </div>
            </div>

            {/* Actions for updating order status */}
            <div className="drawer-actions" style={{ padding: "20px 24px", borderTop: "1px solid var(--border-color)", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                <label className="form-label" style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>{language === "my" ? "အော်ဒါအခြေအနေ ပြောင်းရန်" : "Update Order Status"}</label>
                <select
                  className="form-input"
                  style={{ width: "100%" }}
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
                  <option value="PAID">{language === "my" ? "PAID (ငွေလွှဲအတည်ပြုပြီး အင်ဗွိုက်စ်ပို့ရန်)" : "PAID (Approve Payment & Send Invoice)"}</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
