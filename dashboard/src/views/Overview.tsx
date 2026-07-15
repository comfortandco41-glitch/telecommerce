import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { DollarSign, Users, BarChart3, AlertCircle } from "lucide-react";

export function Overview() {
  const { selectedShopId, shops } = useOutletContext<{ selectedShopId: string; shops: any[] }>();
  const activeShop = shops?.find((s) => s.id === selectedShopId);
  const currencySymbol = activeShop?.currency || "USD";

  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      // 1. Fetch Orders
      const ordersRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersJson = await ordersRes.json();
      const fetchedOrders = ordersJson.success ? ordersJson.data : [];
      setOrders(fetchedOrders);

      // 2. Fetch Customers
      const customersRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customersJson = await customersRes.json();
      setCustomers(customersJson.success ? customersJson.data : []);
    } catch (err) {
      console.error("Failed to load overview data metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to parent shop selector updates
    window.addEventListener("shopChanged", fetchData);
    return () => {
      window.removeEventListener("shopChanged", fetchData);
    };
  }, [selectedShopId]);

  // Calculations: Real sales include both PAID and SHIPPED orders
  const paidOrders = orders.filter((o) => o.status === "PAID" || o.status === "SHIPPED");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  
  const activeCustomerCount = customers.length;
  
  // Real conversion rate: Unique customer accounts who purchased at least once / total customer audience
  const purchasingCustomerIds = new Set(
    paidOrders.map((o) => o.customerId).filter(Boolean)
  );
  
  const conversionRate =
    activeCustomerCount > 0
      ? ((purchasingCustomerIds.size / activeCustomerCount) * 100).toFixed(1)
      : "0.0";

  const pendingVerificationCount = orders.filter(
    (o) => o.status === "PENDING_VERIFICATION"
  ).length;

  // Process Sales Chart (Aggregate by Day of week or Date)
  const getSalesChartData = () => {
    const dayMap: { [key: string]: number } = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    paidOrders.forEach((o) => {
      const date = new Date(o.createdAt);
      const day = date.toLocaleDateString("en-US", { weekday: "short" });
      if (dayMap[day] !== undefined) {
        dayMap[day] += Number(o.totalAmount);
      }
    });

    const maxVal = Math.max(...Object.values(dayMap), 100);

    return Object.keys(dayMap).map((day) => ({
      day,
      amount: dayMap[day],
      percentage: (dayMap[day] / maxVal) * 100,
    }));
  };

  const chartData = getSalesChartData();

  if (loading) {
    return (
      <div className="page-body">
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading shop metrics...</p>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">Shop Overview</h2>
          <p className="page-subtitle">Real-time analytical insights and revenue summary</p>
        </div>
      </div>

      {/* Analytics Card Grids */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="flex-row-between">
            <span className="metric-label">Total Revenue</span>
            <DollarSign size={18} style={{ color: "var(--accent-color)" }} />
          </div>
          <h3 className="metric-value">{currencySymbol} {totalRevenue.toFixed(2)}</h3>
          <div className="metric-footer">
            <span className="metric-trend-up">★ Paid orders sum</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="flex-row-between">
            <span className="metric-label">Active Customers</span>
            <Users size={18} style={{ color: "var(--accent-color)" }} />
          </div>
          <h3 className="metric-value">{activeCustomerCount}</h3>
          <div className="metric-footer">
            <span className="metric-trend-up">★ Registered chat users</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="flex-row-between">
            <span className="metric-label">Conversion Rate</span>
            <BarChart3 size={18} style={{ color: "var(--accent-color)" }} />
          </div>
          <h3 className="metric-value">{conversionRate}%</h3>
          <div className="metric-footer">
            <span className="metric-trend-up">★ Purchases per visitor</span>
          </div>
        </div>

        <div
          className={`glass-card metric-card ${
            pendingVerificationCount > 0 ? "metric-glowing-amber" : ""
          }`}
        >
          <div className="flex-row-between">
            <span className="metric-label">Receipts Pending</span>
            <AlertCircle
              size={18}
              style={{
                color: pendingVerificationCount > 0 ? "var(--warning-color)" : "var(--text-muted)",
              }}
            />
          </div>
          <h3
            className="metric-value"
            style={{
              color: pendingVerificationCount > 0 ? "var(--warning-color)" : "var(--text-primary)",
            }}
          >
            {pendingVerificationCount}
          </h3>
          <div className="metric-footer">
            <span
              style={{
                color: pendingVerificationCount > 0 ? "var(--warning-color)" : "var(--text-muted)",
                fontWeight: pendingVerificationCount > 0 ? "600" : "400",
              }}
            >
              {pendingVerificationCount > 0 ? "● Action required" : "✓ All clean"}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Velocity Chart */}
      <div className="glass-card" style={{ padding: "32px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: "700" }}>Weekly Sales Velocity</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "24px" }}>
          Aggregated revenue aggregated across the current week
        </p>

        <div className="chart-container">
          {chartData.map((data) => (
            <div key={data.day} className="chart-bar-wrapper">
              <div
                className="chart-bar"
                style={{
                  height: `${data.percentage}%`,
                  boxShadow: data.amount > 0 ? "0 0 12px rgba(99, 102, 241, 0.4)" : "none",
                }}
              />
              <span className="chart-bar-label">{data.day}</span>
              <span style={{ fontSize: "11px", fontWeight: "600", marginTop: "2px" }}>
                {data.amount > 0 ? `${currencySymbol} ${data.amount.toFixed(0)}` : "-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
