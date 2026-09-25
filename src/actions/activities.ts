"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ACTIVITY_COLORS, isActivityColor } from "@/lib/colors";
import { activityApplies, isIsoDate } from "@/lib/dates";

export type ActivityFormState = { error: string };

export async function rememberTag(tag: string) {
  const user = await requireUser();
  const clean = tag.trim().toLowerCase();
  if (!clean || clean.length > 40) return;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { knownTags: true },
  });
  const tags = new Set((row?.knownTags ?? "").split(",").map((item) => item.trim()).filter(Boolean));
  if (tags.has(clean)) return;
  tags.add(clean);
  await prisma.user.update({
    where: { id: user.id },
    data: { knownTags: [...tags].join(",") },
  });
  revalidateHabits();
}

function revalidateHabits() {
  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/mes");
  revalidatePath("/ano");
  revalidatePath("/actividades");
  revalidatePath("/actividades/lista");
}

function readActivity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? ACTIVITY_COLORS[0]);
  const days = formData
    .getAll("days")
    .map((value) => Number(value))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  const tags = [
    ...new Set(
      formData
        .getAll("tags")
        .map((tag) => String(tag).trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 40),
    ),
  ].join(",");
  const useSchedule = formData.get("useSchedule") === "on";
  const scheduleTime = String(formData.get("scheduleTime") ?? "").trim();
  const limitDates = formData.get("limitDates") === "on";
  const onlyDate = String(formData.get("onlyDate") ?? "").trim();
  const startsOn = String(formData.get("startsOn") ?? "").trim();
  const endsOn = String(formData.get("endsOn") ?? "").trim();
  const pinned = !limitDates && isIsoDate(onlyDate);
  return {
    name,
    color,
    days: pinned ? "" : [...new Set(days)].join(","),
    tags,
    useSchedule,
    scheduleTime: useSchedule && /^\d{2}:\d{2}$/.test(scheduleTime) ? scheduleTime : null,
    startsOn: pinned ? onlyDate : limitDates && isIsoDate(startsOn) ? startsOn : null,
    endsOn: pinned ? onlyDate : limitDates && isIsoDate(endsOn) ? endsOn : null,
  };
}

function validate(input: {
  name: string;
  color: string;
  startsOn: string | null;
  endsOn: string | null;
}): string | null {
  if (input.name.length < 1 || input.name.length > 80) {
    return "El nombre debe tener entre 1 y 80 caracteres.";
  }
  if (!isActivityColor(input.color)) return "Elige un color de la lista.";
  if ((input.startsOn && !input.endsOn) || (!input.startsOn && input.endsOn)) {
    return "Indica desde y hasta, o deja las dos vacías.";
  }
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
    return "La fecha hasta tiene que ser posterior a desde.";
  }
  return null;
}

export async function clearDayTasks(date: string) {
  const user = await requireUser();
  if (!isIsoDate(date)) return;
  const activities = await prisma.activity.findMany({
    where: { userId: user.id, archivedAt: null },
  });
  for (const activity of activities) {
    if (!activityApplies(activity, date)) continue;
    if (activity.startsOn === date && activity.endsOn === date) {
      await prisma.activity.delete({ where: { id: activity.id } });
      continue;
    }
    const skipped = new Set(activity.skipDates.split(",").filter(Boolean));
    skipped.add(date);
    await prisma.activity.update({
      where: { id: activity.id },
      data: { skipDates: [...skipped].join(",") },
    });
  }
  revalidateHabits();
}

export async function createActivity(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const user = await requireUser();
  const input = readActivity(formData);
  const error = validate(input);
  if (error) return { error };

  const last = await prisma.activity.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.activity.create({
    data: {
      userId: user.id,
      name: input.name,
      color: input.color,
      days: input.days,
      tags: input.tags,
      useSchedule: input.useSchedule,
      scheduleTime: input.scheduleTime,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidateHabits();
  return { error: "" };
}

export async function updateActivity(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const input = readActivity(formData);
  const error = validate(input);
  if (error) return { error };

  const updated = await prisma.activity.updateMany({
    where: { id, userId: user.id },
    data: {
      name: input.name,
      color: input.color,
      days: input.days,
      tags: input.tags,
      useSchedule: input.useSchedule,
      scheduleTime: input.scheduleTime,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
    },
  });
  if (updated.count === 0) return { error: "No se encontró la actividad." };

  revalidateHabits();
  return { error: "" };
}

export async function setArchived(id: string, archived: boolean) {
  const user = await requireUser();
  await prisma.activity.updateMany({
    where: { id, userId: user.id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidateHabits();
}

export async function addActivityItem(activityId: string, formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text || text.length > 200) return;

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId: user.id },
    select: { id: true },
  });
  if (!activity) return;

  const last = await prisma.activityItem.findFirst({
    where: { activityId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.activityItem.create({
    data: {
      activityId,
      text,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidateHabits();
}

export async function deleteActivityItem(id: string) {
  const user = await requireUser();
  const item = await prisma.activityItem.findFirst({
    where: { id, activity: { userId: user.id } },
    select: { id: true },
  });
  if (!item) return;
  await prisma.activityItem.delete({ where: { id } });
  revalidateHabits();
}
