import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const usersToSeed = [
    {
      email: "admin1@gmail.com",
      username: "admin1",
      plainPassword: "Admin@12345",
      role: "ADMIN" as const,
      isEmailVerified: true,
    },
   
  ];

  for (const user of usersToSeed) {
    const hashedPassword = await bcrypt.hash(user.plainPassword, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        password: hashedPassword,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        verificationToken: null,
      },
      create: {
        email: user.email,
        username: user.username,
        password: hashedPassword,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        verificationToken: null,
      },
    });
  }

  console.log("Seed users inserted/updated successfully");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
