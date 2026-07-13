import crypto from "crypto";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("==========================================");
console.log(" SuperBot - Telegram Webhook Configurator ");
console.log("==========================================\n");

rl.question("1. Enter your Telegram Bot API Token: ", (botToken) => {
  rl.question("2. Enter your Shop UUID: ", (shopId) => {
    rl.question("3. Enter your Public HTTPS Tunnel URL (e.g., https://xxxx.ngrok-free.app): ", (tunnelUrl) => {
      
      const cleanTunnelUrl = tunnelUrl.replace(/\/$/, ""); // Remove trailing slash
      const expectedToken = crypto.createHash("sha256").update(botToken).digest("hex");
      const webhookUrl = `${cleanTunnelUrl}/api/v1/webhook/${shopId}`;
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${expectedToken}`;

      console.log("\n------------------------------------------");
      console.log(`- Computed Webhook Secret: ${expectedToken}`);
      console.log(`- Target Webhook URL: ${webhookUrl}`);
      console.log("------------------------------------------\n");
      console.log("Sending setWebhook request to Telegram...");

      fetch(telegramUrl)
        .then((res) => res.json())
        .then((json: any) => {
          console.log("\nTelegram API Response:");
          console.log(JSON.stringify(json, null, 2));
          rl.close();
          process.exit(0);
        })
        .catch((err) => {
          console.error("\nError calling Telegram API:", err.message);
          rl.close();
          process.exit(1);
        });
    });
  });
});
