import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const DEFAULT_EMAIL = "demo@proscout.local";
export const DEFAULT_PASSWORD = "proscout";
export const DEFAULT_NAME = "Demo";

export async function ensureDefaultUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_EMAIL },
  });
  if (existing) return;

  await prisma.user.create({
    data: {
      name: DEFAULT_NAME,
      email: DEFAULT_EMAIL,
      passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 12),
    },
  });
}
