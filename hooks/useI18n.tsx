"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Locale, defaultLocale, translations } from "@/data/translations";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key) => key,
  isRTL: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const saved = localStorage.getItem("rova_locale") as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    } else if (typeof navigator !== "undefined") {
      // Auto-detect from browser if no saved preference
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (translations[browserLang]) {
        setLocaleState(browserLang);
      }
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("rova_locale", l);
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] || translations[defaultLocale]?.[key] || key,
    [locale]
  );

  const isRTL = locale === "ar";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
