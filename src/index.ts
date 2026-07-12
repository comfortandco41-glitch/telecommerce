import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const port = process.env.PORT || 10000;

app.listen(port, () => {
  console.log(`[SuperBot] Backend listening on port ${port}`);
});
