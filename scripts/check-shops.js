const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany({
    include: {
      merchant: true
    }
  });
  console.log("Current Shops in Database:");
  console.log(JSON.stringify(shops, (key, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (key === "botToken") {
      return value ? `${value.slice(0, 6)}...${value.slice(-6)}` : null;
    }
    return value;
  }, 2));
}

main()
  .catch((err) => {
    console.error("Error fetching shops:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
