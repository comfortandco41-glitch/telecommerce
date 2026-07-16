import rateLimit from "express-rate-limit";

// Limit login and registration attempts per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protect the Telegram Webhook endpoint per shopId to prevent flooding
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Limit each shopId to 120 updates per minute
  keyGenerator: (req) => {
    return req.params.shopId || "global-webhook-limit-key";
  },
  message: {
    success: false,
    message: "Rate limit exceeded for this shop webhook.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
