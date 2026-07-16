const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const NEW_TUNNEL_URL = "https://logs-cabinet-survey-cbs.trycloudflare.com";

async function main() {
  const shop = await prisma.shop.findFirst();
  if (!shop) {
    console.log("No shops found in the database.");
    return;
  }
  
  const botToken = shop.botToken;
  const shopId = shop.id;
  const secretToken = crypto.createHash("sha256").update(botToken).digest("hex");
  const webhookUrl = `${NEW_TUNNEL_URL}/api/v1/webhook/${shopId}`;
  
  const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}&allowed_updates=${JSON.stringify(["message", "callback_query"])}`;
  
  console.log(`Setting webhook to: ${webhookUrl}`);
  console.log(`Secret token: ${secretToken}`);
  
  try {
    const res = await fetch(telegramUrl);
    const json = await res.json();
    console.log("Telegram API Response:");
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error connecting to Telegram:", err.message);
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
