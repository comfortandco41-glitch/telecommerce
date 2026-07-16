const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.findFirst();
  if (!shop) {
    console.log("No shops found in the database.");
    return;
  }
  
  console.log(`Checking Telegram webhook status for Shop ID: ${shop.id}`);
  const botToken = shop.botToken;
  const telegramUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
  
  try {
    const res = await fetch(telegramUrl);
    const json = await res.json();
    console.log("Telegram Webhook Info:");
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
