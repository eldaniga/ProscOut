"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isIsoDate } from "@/lib/dates";

export async function toggleCheck(activityId: string, date: string) {
  const user = await requireUser();
  if (!isIsoDate(date)) return;

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId: user.id },
    select: { id: true },
  });
  if (!activity) return;

  const existing = await prisma.check.findUnique({
    where: { activityId_date: { activityId, date } },
  });

  if (existing) {
    await prisma.check.delete({ where: { id: existing.id } });
  } else {
    await prisma.check.create({ data: { activityId, date } });
  }

  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/mes");
  revalidatePath("/ano");
  revalidatePath("/alimentacion");
}

export async function setCheckTime(activityId: string, date: string, formData: FormData) {
  const user = await requireUser();
  if (!isIsoDate(date)) return;
  const raw = String(formData.get("time") ?? "").trim();
  if (raw && !/^\d{2}:\d{2}$/.test(raw)) return;

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId: user.id },
    select: { id: true },
  });
  if (!activity) return;

  await prisma.check.upsert({
    where: { activityId_date: { activityId, date } },
    create: { activityId, date, time: raw || null },
    update: { time: raw || null },
  });

  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/mes");
  revalidatePath("/ano");
}
