# ERROR_HANDLING.md - Error Management and Logging

This document defines the custom error class hierarchy, express error middleware, and logging protocols.

---

## 1. Custom Error Classes

We use a hierarchy of custom error classes extending a base `AppError`. This allows developers to throw semantic errors that the middleware converts into standard JSON payloads.

```
                  +-------------------------+
                  |        AppError         | (Base Class)
                  +-------------------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+--------------+        +--------------+        +--------------+
| NotFoundError|        |ValidationError|       |Unauthorized  |
| (HTTP 404)   |        | (HTTP 400)   |        | (HTTP 401)   |
+--------------+        +--------------+        +--------------+
```

### Reference Implementation
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: any;

  constructor(message: string, statusCode: number, errorCode: string, details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, 400, "BAD_REQUEST", details);
  }
}
```

---

## 2. Express Error-Handling Middleware

All routers mount a single global error handler at the end of the app loading process:

```typescript
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errors";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If semantic application error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details
      }
    });
  }

  // Unhandled / system errors
  console.error("UNHANDLED_EXCEPTION:", err.stack);
  
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later."
    }
  });
}
```

---

## 3. Webhook Error Isolation (Defensive Processing)

Because Telegram updates are handled in background tasks, uncaught exceptions will crash the Node.js event loop if left unmanaged.

### Webhook Task Wrapper Requirement
Every background handler process must wrap execution inside a safe execution wrapper:

```typescript
export async function handleWebhookAsynchronously(updatePayload: any, shopId: string) {
  try {
    await webhookService.process(updatePayload, shopId);
    
    // Mark database log completed
    await db.webhookLog.update({
      where: { updateId: updatePayload.update_id },
      data: { isProcessed: true }
    });
  } catch (err: any) {
    // Prevent process exit. Log failure in DB.
    console.error(`Error processing webhook update ${updatePayload.update_id}:`, err);
    
    await db.webhookLog.update({
      where: { updateId: updatePayload.update_id },
      data: { 
        isProcessed: false,
        errorMessage: err.message || String(err)
      }
    });
  }
}
```
This pattern isolates errors, writes logs to PostgreSQL, and keeps the server active.
