import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./views/Login";
import { DashboardLayout } from "./views/DashboardLayout";
import { Overview } from "./views/Overview";
import { OrdersManager } from "./views/OrdersManager";
import { ProductsManager } from "./views/ProductsManager";
import { BroadcastComposer } from "./views/BroadcastComposer";

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="orders" element={<OrdersManager />} />
          <Route path="products" element={<ProductsManager />} />
          <Route path="broadcasts" element={<BroadcastComposer />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
