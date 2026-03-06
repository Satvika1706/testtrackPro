import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("--------------------------------------------------");
  console.log("🔍 DEBUGGING PRISMA CLIENT");
  console.log("--------------------------------------------------");
  const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  
  console.log("Available Models:", models);

  if (models.includes('testCaseHistory')) {
    console.log("✅ SUCCESS: Prisma sees the history table!");
  } else {
    console.log("❌ FAILURE: Prisma DOES NOT see the history table.");
  }
  console.log("--------------------------------------------------");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());