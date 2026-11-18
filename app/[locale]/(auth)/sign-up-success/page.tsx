import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { parseRedirectParam } from "@/lib/utils/validation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect: requested } = await searchParams;
  const destination = parseRedirectParam(typeof requested === "string" ? requested : null);
  redirect({
    href: destination ? { pathname: "/login", query: { redirect: destination } } : "/login",
    locale: await getLocale(),
  });
}
