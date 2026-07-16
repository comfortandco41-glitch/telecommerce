import dotenv from "dotenv";
import app from "./app";
import { startCleanupScheduler } from "./services/cleanupService";

dotenv.config();

const port = process.env.PORT || 10000;

app.listen(port, () => {
  console.log(`[Tele-Commerce] Backend listening on port ${port}`);
  startCleanupScheduler();
});
