import express from "express";
import cors from "cors";
import { WebhookController } from "./controllers/webhookController";
import { CategoryController } from "./controllers/categoryController";
import { ProductController } from "./controllers/productController";
import { handleRegister, handleLogin, handleMe } from "./controllers/authController";
import { handleGetShops, handleCreateShop, handleUpdateShop } from "./controllers/shopController";
import { handleGetOrders, handleUpdateStatus } from "./controllers/orderController";
import { handleGetCustomers } from "./controllers/customerController";
import { handleGetBroadcasts, handleCreateBroadcast } from "./controllers/broadcastController";
import { handleGetChatHistory, handleSendSupportMessage } from "./controllers/chatController";
import { handleUpload } from "./controllers/uploadController";
import { authMiddleware } from "./middlewares/authMiddleware";
import { shopAccessMiddleware } from "./middlewares/shopAccessMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";

// Global BigInt JSON serialization patch
if (typeof (BigInt.prototype as any).toJSON !== "function") {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const app = express();

const corsOrigin = [
  process.env.FRONTEND_URL || "https://dashboard.superbot.app",
  "http://localhost:5173",
];
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Controller setup
const webhookController = new WebhookController();
const categoryController = new CategoryController();
const productController = new ProductController();

// Public Webhook Route (Webhook secret header validation is handled in the controller)
app.post("/api/v1/webhook/:shopId", webhookController.handleWebhook);

// Auth Routes
app.post("/api/v1/auth/register", handleRegister);
app.post("/api/v1/auth/login", handleLogin);
app.get("/api/v1/auth/me", authMiddleware, handleMe);
app.get("/api/v1/shops", authMiddleware, handleGetShops);
app.post("/api/v1/shops", authMiddleware, handleCreateShop);
app.put("/api/v1/shops/:shopId", authMiddleware, shopAccessMiddleware, handleUpdateShop);

// Category Routes (Secure)
app.post(
  "/api/v1/shops/:shopId/categories",
  authMiddleware,
  shopAccessMiddleware,
  categoryController.createCategory
);
app.get(
  "/api/v1/shops/:shopId/categories",
  authMiddleware,
  shopAccessMiddleware,
  categoryController.getCategories
);
app.put(
  "/api/v1/shops/:shopId/categories/:categoryId",
  authMiddleware,
  shopAccessMiddleware,
  categoryController.updateCategory
);

// Product Routes (Secure)
app.post(
  "/api/v1/shops/:shopId/products",
  authMiddleware,
  shopAccessMiddleware,
  productController.createProduct
);
app.get(
  "/api/v1/shops/:shopId/products",
  authMiddleware,
  shopAccessMiddleware,
  productController.getProducts
);
app.put(
  "/api/v1/shops/:shopId/products/:productId",
  authMiddleware,
  shopAccessMiddleware,
  productController.updateProduct
);

// Order Routes (Secure)
app.get(
  "/api/v1/shops/:shopId/orders",
  authMiddleware,
  shopAccessMiddleware,
  handleGetOrders
);
app.put(
  "/api/v1/shops/:shopId/orders/:orderId/status",
  authMiddleware,
  shopAccessMiddleware,
  handleUpdateStatus
);

// Customer Routes (Secure)
app.get(
  "/api/v1/shops/:shopId/customers",
  authMiddleware,
  shopAccessMiddleware,
  handleGetCustomers
);

// Support Chat Routes (Secure)
app.get(
  "/api/v1/shops/:shopId/customers/:customerId/messages",
  authMiddleware,
  shopAccessMiddleware,
  handleGetChatHistory
);
app.post(
  "/api/v1/shops/:shopId/customers/:customerId/messages",
  authMiddleware,
  shopAccessMiddleware,
  handleSendSupportMessage
);

// Image Upload Route (Secure)
app.post(
  "/api/v1/shops/:shopId/upload",
  authMiddleware,
  shopAccessMiddleware,
  handleUpload
);

// Broadcast Routes (Secure)
app.get(
  "/api/v1/shops/:shopId/broadcasts",
  authMiddleware,
  shopAccessMiddleware,
  handleGetBroadcasts
);
app.post(
  "/api/v1/shops/:shopId/broadcasts",
  authMiddleware,
  shopAccessMiddleware,
  handleCreateBroadcast
);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "healthy" });
});

// Mount error handler
app.use(errorMiddleware);

export default app;
