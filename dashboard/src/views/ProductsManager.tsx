import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Search, ToggleLeft, ToggleRight, Check, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function ProductsManager() {
  const { selectedShopId, shops } = useOutletContext<{ selectedShopId: string; shops: any[] }>();
  const activeShop = shops?.find((s) => s.id === selectedShopId);
  const currencySymbol = activeShop?.currency || "USD";
  const { language, t } = useLanguage();
  
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
      alert(language === "my" ? "ဖိုင်ဆိုဒ်သည် 200KB ထက်ကျော်လွန်နေပါသည်။ ပိုမိုသေးငယ်သောပုံကို ရွေးချယ်ပေးပါရန်။" : "File exceeds 200KB limit! Please select a smaller photo.");
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
      const catRes = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catJson = await catRes.json();
      const cats = catJson.success ? catJson.data : [];
      setCategories(cats);
      if (cats.length > 0 && !newProdCatId) {
        setNewProdCatId(cats[0].id);
      }

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
    setNewProdCatId(prod.categoryId || (categories.length > 0 ? categories[0].id : ""));
    setNewProdImage(prod.images?.[0] || "");
    setProdError("");
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirm = window.confirm(
      language === "my" ? "ဤကုန်ပစ္စည်းကို ဖျက်ပစ်ရန် သေချာပါသလား?" : "Are you sure you want to delete this product?"
    );
    if (!confirm) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/shops/${selectedShopId}/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts(products.filter((p) => p.id !== productId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError("");
    setProdLoading(true);

    const payload = {
      name: newProdName,
      description: newProdDesc,
      price: parseFloat(newProdPrice),
      stock: parseInt(newProdStock, 10),
      categoryId: newProdCatId,
      images: newProdImage ? [newProdImage] : [],
    };

    const method = editingProduct ? "PUT" : "POST";
    const path = editingProduct
      ? `/api/v1/shops/${selectedShopId}/products/${editingProduct.id}`
      : `/api/v1/shops/${selectedShopId}/products`;

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save product details");
      }

      await fetchData();
      setShowProductModal(false);
    } catch (err: any) {
      setProdError(err.message || "Something went wrong saving product");
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-body" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "28px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="page-header" style={{ margin: "0" }}>
          <div>
            <h2 className="page-title">{t("products.title")}</h2>
            <p className="page-subtitle">{t("products.subtitle")}</p>
          </div>
          <button onClick={handleOpenAddModal} className="btn btn-primary flex-gap-12">
            <Plus size={16} />
            <span>{t("products.addProduct")}</span>
          </button>
        </div>

        <div className="glass-card" style={{ padding: "16px 20px" }}>
          <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={language === "my" ? "ပစ္စည်းအမည်ဖြင့် ရှာဖွေရန်..." : "Search products by name..."}
              className="form-input"
              style={{ width: "100%", paddingLeft: "42px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0" }}>
          {loading ? (
            <p style={{ padding: "24px", color: "var(--text-secondary)" }}>
              {language === "my" ? "ပစ္စည်းစာရင်းများ ယူနေသည်..." : "Loading catalog records..."}
            </p>
          ) : filteredProducts.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{language === "my" ? "ကုန်ပစ္စည်း အမည်" : "Product Item"}</th>
                    <th>{t("products.prodCategory")}</th>
                    <th>{t("products.prodPrice")}</th>
                    <th>{t("products.prodStock")}</th>
                    <th>{t("products.active")}</th>
                    <th>{t("orders.actions")}</th>
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
                              {p.stock} {language === "my" ? "ခု" : "units"}
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
              {language === "my" ? "ကုန်ပစ္စည်း မရှိသေးပါ။" : "No products available in this shop catalog."}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "700" }}>
          {language === "my" ? "အမျိုးအစား စီမံခန့်ခွဲရန်" : "Category Manager"}
        </h3>
        
        <div className="glass-card">
          <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600" }}>
            {language === "my" ? "အမျိုးအစားအသစ် ထည့်ရန်" : "Add New Category"}
          </h4>
          <form onSubmit={handleCreateCategory}>
            <div className="form-group">
              <label className="form-label">{t("products.prodCategory")}</label>
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
              <label className="form-label">
                {language === "my" ? "ဖော်ပြချက် (မဖြစ်မနေမဟုတ်ပါ)" : "Description (Optional)"}
              </label>
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
              <span>{language === "my" ? "အမျိုးအစား ဖန်တီးမည်" : "Create Category"}</span>
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600" }}>
            {language === "my" ? "အမျိုးအစားများ အားလုံး" : "All Categories"}
          </h4>
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
                    {c.isActive ? (language === "my" ? "ရောင်းသည်" : "Active") : (language === "my" ? "ပိတ်ထားသည်" : "Disabled")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {language === "my" ? "အမျိုးအစား မရှိသေးပါ။" : "No categories created yet."}
            </p>
          )}
        </div>
      </div>

      {showProductModal && (
        <div className="drawer-backdrop" style={{ justifyContent: "center", alignItems: "center" }}>
          <div className="glass-card" style={{ width: "480px", padding: "32px" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700" }}>
              {editingProduct ? t("products.modalEditTitle") : t("products.modalAddTitle")}
            </h3>
            
            {prodError && (
              <div style={{ padding: "10px", color: "var(--danger-color)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                {prodError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">{t("products.prodCategory")}</label>
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
                <label className="form-label">{t("products.prodName")}</label>
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
                <label className="form-label">{t("products.prodDesc")}</label>
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
                  <label className="form-label">{t("products.prodPrice")} ({currencySymbol})</label>
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
                  <label className="form-label">{t("products.prodStock")}</label>
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
                <label className="form-label">
                  {language === "my" ? "ပစ္စည်းပုံ (အများဆုံး 200KB)" : "Product Image Photo (Max 200KB)"}
                </label>
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
                    {language === "my" ? "ဖိုင်တင်နေသည်..." : "Uploading file..."}
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
                  {t("products.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={prodLoading}
                >
                  {prodLoading ? t("products.saving") : (editingProduct ? t("products.saveChanges") : t("products.addProduct"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
