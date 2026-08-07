"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { localeTags, normalizeLocale, type StoreLocale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: StoreLocale;
  href: (path: string) => string;
  switchLocale: (locale: StoreLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "nexora-store-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<StoreLocale>("it");
  useEffect(() => {
    const urlLocale = new URLSearchParams(window.location.search).get("lang");
    const next = normalizeLocale(urlLocale || window.localStorage.getItem(STORAGE_KEY) || navigator.language);
    Promise.resolve().then(() => {
      setLocale(next);
      document.documentElement.lang = localeTags[next];
    });
  }, []);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    href(path) {
      const [withoutHash, hash = ""] = path.split("#", 2);
      const [pathname, query = ""] = withoutHash.split("?", 2);
      const params = new URLSearchParams(query);
      params.set("lang", locale);
      return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
    },
    switchLocale(next) {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `nexora_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.location.assign(url.toString());
    },
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
