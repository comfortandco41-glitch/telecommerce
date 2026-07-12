import express from "express";
import cors from "cors";
import { WebhookController } from "./controllers/webhookController";
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

// Routes
app.post("/api/v1/webhook/:shopId", webhookController.handleWebhook);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "healthy" });
});

// Mount error handler
app.use(errorMiddleware);

export default app;
