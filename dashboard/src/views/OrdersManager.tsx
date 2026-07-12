import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Eye, X, Check, Trash } from "lucide-react";

export function OrdersManager() {
  const { selectedShopId } = useOutletContext<{ selectedShopId: string }>();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Filter orders list by query
  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    const customerName = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.toLowerCase();
    const phone = (o.deliveryPhone || "").toLowerCase();
    const address = (o.deliveryAddress || "").toLowerCase();
    const id = o.id.toLowerCase();
    return customerName.includes(term) || phone.includes(term) || address.includes(term) || id.includes(term);
  });

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
    return status.replace("_", " ");
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">Orders Directory</h2>
          <p className="page-subtitle">Inspect buyer receipts, approve payments, and track fulfillment</p>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="glass-card flex-row-between" style={{ padding: "16px 24px" }}>
        <div style={{ position: "relative", width: "350px", display: "flex", alignItems: "center" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by shopper name, phone, or ID..."
            className="form-input"
            style={{ width: "100%", paddingLeft: "42px" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table list */}
      <div className="glass-card" style={{ padding: "0" }}>
        {loading ? (
          <p style={{ padding: "24px", color: "var(--text-secondary)" }}>Loading order database records...</p>
        ) : filteredOrders.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Amount</th>
                  <th>Fulfillment</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
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
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
            No orders found matching the filter query.
          </p>
        )}
      </div>

      {/* Order Inspect Drawer Sheet */}
      {selectedOrder && (
        <div className="drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="drawer-title">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <span className="drawer-section-title">Order Reference ID</span>
                <span className="drawer-detail-value" style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--accent-color)" }}>
                  {selectedOrder.id}
                </span>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">Fulfillment Status</span>
                <div>
                  <span className={getStatusBadgeClass(selectedOrder.status)}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">Buyer Profile</span>
                <span className="drawer-detail-value">
                  {selectedOrder.customer ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName || ""}` : "Unknown"}
                  {selectedOrder.customer?.username && ` (@${selectedOrder.customer.username})`}
                </span>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">Delivery Contact Details</span>
                <span className="drawer-detail-value">
                  Phone: <strong>{selectedOrder.deliveryPhone}</strong><br />
                  Address: <strong>{selectedOrder.deliveryAddress}</strong>
                </span>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">Items Ordered</span>
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
                    <span>Total Amount Paid</span>
                    <span style={{ color: "var(--accent-color)" }}>
                      ${Number(selectedOrder.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">Bank Transfer Screenshot</span>
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
                    No receipt image was uploaded for this transaction.
                  </span>
                )}
              </div>
            </div>

            {/* Actions for Pending Verification state */}
            {selectedOrder.status === "PENDING_VERIFICATION" && (
              <div className="drawer-actions">
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "CANCELLED")}
                  className="btn btn-danger flex-gap-12"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  <Trash size={16} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "PAID")}
                  className="btn btn-success flex-gap-12"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  <Check size={16} />
                  <span>Approve Payment</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
