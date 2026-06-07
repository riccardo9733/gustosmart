import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  // 1. Legge il locale dal cookie NEXT_LOCALE
  let locale = cookieStore.get("NEXT_LOCALE")?.value;

  // 2. Se il cookie non è impostato, rileva la lingua dall'header Accept-Language
  if (!locale) {
    const acceptLanguage = headersList.get("accept-language") || "";
    if (acceptLanguage.includes("en")) {
      locale = "en";
    } else if (acceptLanguage.includes("es")) {
      locale = "es";
    } else if (acceptLanguage.includes("fr")) {
      locale = "fr";
    } else {
      locale = "it"; // Default
    }
  }

  // Valida che il locale sia tra quelli supportati, altrimenti fallback su 'it'
  const supportedLocales = ["it", "en", "es", "fr"];
  if (!supportedLocales.includes(locale)) {
    locale = "it";
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
