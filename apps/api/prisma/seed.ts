import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "tester21@test.com";
  const plainPassword = "password123";

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      email,
      password: hashedPassword,
      role: "TESTER",
    },
  });

  console.log(" Seed user inserted/updated successfully");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
