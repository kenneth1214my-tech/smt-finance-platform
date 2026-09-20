import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getServerLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/overview");

  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const subsidiaries = await db.subsidiary.findMany({ orderBy: { sortOrder: "asc" } });

  return <RegisterForm dict={dict} locale={locale} subsidiaries={subsidiaries} />;
}
