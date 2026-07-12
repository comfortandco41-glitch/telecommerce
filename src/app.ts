import express from "express";
import cors from "cors";
import { WebhookController } from "./controllers/webhookController";
import { CategoryController } from "./controllers/categoryController";
import { ProductController } from "./controllers/productController";
import { errorMiddleware } from "./middlewares/errorMiddleware";

// Global BigInt JSON serialization patch
if (typeof (BigInt.prototype as any).toJSON !== "function") {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const app = express();

app.use(cors());
app.use(express.json());

// Controller setup
const webhookController = new WebhookController();
const categoryController = new CategoryController();
const productController = new ProductController();

// Routes
app.post("/api/v1/webhook/:shopId", webhookController.handleWebhook);

// Category Routes
app.post("/api/v1/shops/:shopId/categories", categoryController.createCategory);
app.get("/api/v1/shops/:shopId/categories", categoryController.getCategories);
app.put("/api/v1/shops/:shopId/categories/:categoryId", categoryController.updateCategory);

// Product Routes
app.post("/api/v1/shops/:shopId/products", productController.createProduct);
app.get("/api/v1/shops/:shopId/products", productController.getProducts);
app.put("/api/v1/shops/:shopId/products/:productId", productController.updateProduct);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "healthy" });
});

// Mount error handler
app.use(errorMiddleware);

export default app;
