import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Search, ToggleLeft, ToggleRight, Check, Edit, Trash2 } from "lucide-react";

export function ProductsManager() {
  const { selectedShopId, shops } = useOutletContext<{ selectedShopId: string; shops: any[] }>();
  const activeShop = shops?.find((s) => s.id === selectedShopId);
  const currencySymbol = activeShop?.currency || "USD";
  
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New Category form states
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  // New Product form modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdCatId, setNewProdCatId] = useState("");
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState("");
  
  // Edit & Delete Product states
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Image Upload states
  const [newProdImage, setNewProdImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit stock inline states
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
  const token = localStorage.getItem("token");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      alert("File exceeds 200KB limit! Please select a smaller photo.");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setNewProdImage(json.data.url);
        } else {
          alert(json.message || "Failed to upload image.");
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert("Network error uploading image");
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchData = async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      // 1. Fetch Categories
      const catRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catJson = await catRes.json();
      const cats = catJson.success ? catJson.data : [];
      setCategories(cats);
      if (cats.length > 0) {
        setNewProdCatId(cats[0].id);
      }

      // 2. Fetch Products
      const prodRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prodJson = await prodRes.json();
      setProducts(prodJson.success ? prodJson.data : []);
    } catch (err) {
      console.error("Failed to load catalog data", err);
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCategories([...categories, json.data]);
        setNewCatName("");
        setNewCatDesc("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCatLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setNewProdName("");
    setNewProdDesc("");
    setNewProdPrice("");
    setNewProdStock("");
    setNewProdImage("");
    setProdError("");
    if (categories.length > 0) {
      setNewProdCatId(categories[0].id);
    }
    setShowProductModal(true);
  };

  const handleStartEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setNewProdName(prod.name);
    setNewProdDesc(prod.description || "");
    setNewProdPrice(prod.price.toString());
    setNewProdStock(prod.stock.toString());
    setNewProdCatId(prod.categoryId);
    setNewProdImage(prod.images?.[0] || "");
    setProdError("");
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? / ဤပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?")) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts(products.filter((p) => p.id !== productId));
      } else {
        alert(json.message || "Failed to delete product");
      }
    } catch (err) {
      console.error("Failed to delete product", err);
      alert("Network error deleting product");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError("");
    if (!newProdCatId) {
      setProdError("Please create a category first before adding products.");
      return;
    }
    setProdLoading(true);

    const payload = {
      categoryId: newProdCatId,
      name: newProdName,
      description: newProdDesc,
      price: Number(newProdPrice),
      stock: Number(newProdStock),
      images: newProdImage ? [newProdImage] : [],
    };

    try {
      if (editingProduct) {
        // Edit product
        const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products/${editingProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update product");
        }

        setProducts(products.map((p) => (p.id === editingProduct.id ? json.data : p)));
      } else {
        // Create new
        const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to create product");
        }

        setProducts([...products, json.data]);
      }

      setNewProdName("");
      setNewProdDesc("");
      setNewProdPrice("");
      setNewProdStock("");
      setNewProdImage("");
      setEditingProduct(null);
      setShowProductModal(false);
    } catch (err: any) {
      setProdError(err.message || "Failed to save product catalog record");
    } finally {
      setProdLoading(false);
    }
  };

  const handleToggleProductActive = async (productId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts(
          products.map((p) => (p.id === productId ? { ...p, isActive: !currentActive } : p))
        );
      }
    } catch (err) {
      console.error("Failed to toggle product active state", err);
    }
  };

  const handleUpdateStockInline = async (productId: string) => {
    const val = parseInt(editingStockValue, 10);
    if (isNaN(val)) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: val }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts(products.map((p) => (p.id === productId ? { ...p, stock: val } : p)));
        setEditingStockId(null);
      }
    } catch (err) {
      console.error("Failed to update stock", err);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-body" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "28px" }}>
      {/* Product Catalog List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="page-header" style={{ margin: "0" }}>
          <div>
            <h2 className="page-title">Product Catalog</h2>
            <p className="page-subtitle">Add products, edit details, and modify inventory quantities</p>
          </div>
          <button onClick={handleOpenAddModal} className="btn btn-primary flex-gap-12">
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>

        {/* Product Search Bar */}
        <div className="glass-card" style={{ padding: "16px 20px" }}>
          <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search products by name..."
              className="form-input"
              style={{ width: "100%", paddingLeft: "42px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Products Table list */}
        <div className="glass-card" style={{ padding: "0" }}>
          {loading ? (
            <p style={{ padding: "24px", color: "var(--text-secondary)" }}>Loading catalog records...</p>
          ) : filteredProducts.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Item</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const categoryName =
                      categories.find((c) => c.id === p.categoryId)?.name || "Uncategorized";
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: "600" }}>{p.name}</td>
                        <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          {categoryName}
                        </td>
                        <td style={{ fontWeight: "600" }}>{currencySymbol} {Number(p.price).toFixed(2)}</td>
                        <td>
                          {editingStockId === p.id ? (
                            <div className="flex-gap-12" style={{ width: "110px" }}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ padding: "4px 8px", width: "60px", fontSize: "13px" }}
                                value={editingStockValue}
                                onChange={(e) => setEditingStockValue(e.target.value)}
                              />
                              <button
                                onClick={() => handleUpdateStockInline(p.id)}
                                style={{ background: "transparent", border: "none", color: "var(--success-color)", cursor: "pointer" }}
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingStockId(p.id);
                                setEditingStockValue(p.stock.toString());
                              }}
                              style={{
                                cursor: "pointer",
                                textDecoration: "underline dashed var(--text-muted)",
                                fontWeight: "600",
                              }}
                              title="Click to edit stock level"
                            >
                              {p.stock} units
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleProductActive(p.id, p.isActive)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: p.isActive ? "var(--success-color)" : "var(--text-muted)" }}
                          >
                            {p.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                        </td>
                        <td>
                          <div className="flex-gap-12" style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleStartEditProduct(p)}
                              style={{ background: "transparent", border: "none", color: "var(--accent-color)", cursor: "pointer" }}
                              title="Edit product"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              style={{ background: "transparent", border: "none", color: "var(--danger-color)", cursor: "pointer" }}
                              title="Delete product"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
              No products available in this shop catalog.
            </p>
          )}
        </div>
      </div>

      {/* Category Manager Sidebar Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "700" }}>Category Manager</h3>
        
        {/* Create Category form */}
        <div className="glass-card">
          <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600" }}>Add New Category</h4>
          <form onSubmit={handleCreateCategory}>
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Vinyl Records"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Collector pressings..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm flex-gap-12" style={{ width: "100%", marginTop: "6px" }} disabled={catLoading}>
              <Plus size={14} />
              <span>Create Category</span>
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="glass-card">
          <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600" }}>All Categories</h4>
          {categories.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {categories.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ fontWeight: "500" }}>{c.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                    {c.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No categories created yet.</p>
          )}
        </div>
      </div>

      {/* Add Product Modal Overlay */}
      {showProductModal && (
        <div className="drawer-backdrop" style={{ justifyContent: "center", alignItems: "center" }}>
          <div className="glass-card" style={{ width: "480px", padding: "32px" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700" }}>
              {editingProduct ? "Edit Product Item" : "Add New Product Item"}
            </h3>
            
            {prodError && (
              <div style={{ padding: "10px", color: "var(--danger-color)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                {prodError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Category Selection</label>
                <select
                  className="shop-selector"
                  style={{ width: "100%" }}
                  value={newProdCatId}
                  onChange={(e) => setNewProdCatId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Appetite for Destruction Vinyl"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "80px", fontFamily: "inherit" }}
                  placeholder="Product description info..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="29.99"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stock Level</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="10"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label className="form-label">Product Image Photo (Max 200KB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="form-input"
                  style={{ padding: "8px", fontSize: "13px" }}
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                    Uploading file...
                  </span>
                )}
                {newProdImage && (
                  <div style={{ marginTop: "8px" }}>
                    <img
                      src={newProdImage}
                      alt="Uploaded product preview"
                      style={{ height: "60px", width: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="btn btn-secondary"
                  disabled={prodLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={prodLoading}
                >
                  {prodLoading ? "Saving..." : (editingProduct ? "Save Changes" : "Add Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
