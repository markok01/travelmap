"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  detectBrowserLocale,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  translate,
  type Locale,
} from "@/lib/i18n/config";
import { en, type MessageTree } from "@/lib/i18n/en";
import { sr } from "@/lib/i18n/sr";

const dictionaries: Record<Locale, MessageTree> = { en, sr };

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  ready: false,
});

function applyHtmlLang(locale: Locale) {
  document.documentElement.lang = locale === "sr" ? "sr-Latn" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = readStoredLocale() ?? detectBrowserLocale();
    setLocaleState(next);
    applyHtmlLang(next);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    applyHtmlLang(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, params) => translate(dictionaries[locale], key, params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}
