import "server-only";
import { db } from "@/lib/db";

/** Reads the singleton group display-name setting, creating the default row on first access. */
export async function getCompanyName(): Promise<string> {
  const row = await db.systemSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return row.companyName;
}

export async function setCompanyName(companyName: string) {
  return db.systemSetting.upsert({
    where: { id: "default" },
    update: { companyName },
    create: { id: "default", companyName },
  });
}
