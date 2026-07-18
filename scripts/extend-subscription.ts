import { MerchantRepository } from "../src/repositories/merchantRepository";

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const daysStr = args[1] || "30";

  if (!email) {
    console.log("Usage: npx ts-node scripts/extend-subscription.ts <merchant_email> [days_to_add]");
    console.log("Example: npx ts-node scripts/extend-subscription.ts merchant@gmail.com 30");
    process.exit(1);
  }

  const days = parseInt(daysStr, 10);
  if (isNaN(days) || days <= 0) {
    console.error("Error: [days_to_add] must be a positive number.");
    process.exit(1);
  }

  const merchantRepo = new MerchantRepository();
  const merchant = await merchantRepo.getByEmail(email);

  if (!merchant) {
    console.error(`Error: No merchant found with email "${email}".`);
    process.exit(1);
  }

  const currentExpiryMs = merchant.subscriptionExpiresAt
    ? new Date(merchant.subscriptionExpiresAt).getTime()
    : Date.now();

  const baseTimeMs = Math.max(Date.now(), currentExpiryMs);
  const newExpiryDate = new Date(baseTimeMs + days * 24 * 60 * 60 * 1000);

  const updated = await merchantRepo.updateSubscription(merchant.id, "ACTIVE", newExpiryDate);

  console.log("==================================================");
  console.log("✅ SUBSCRIPTION EXTENDED SUCCESSFULLY!");
  console.log(`Merchant Name : ${updated.name}`);
  console.log(`Merchant Email: ${updated.email}`);
  console.log(`New Status    : ${updated.subscriptionStatus}`);
  console.log(`New Expiry    : ${updated.subscriptionExpiresAt?.toISOString()} (${updated.subscriptionExpiresAt?.toLocaleString()})`);
  console.log("==================================================");

  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
