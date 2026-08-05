export type Locale = "en" | "sr";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "sr", label: "Srpski" },
];

export const LOCALE_STORAGE_KEY = "travelmap.locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "sr";
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.language || "en").toLowerCase();
  if (
    lang.startsWith("sr") ||
    lang.startsWith("hr") ||
    lang.startsWith("bs")
  ) {
    return "sr";
  }
  return "en";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : null;
}

type Dict = { [key: string]: string | Dict };

export function translate(
  dictionary: Dict,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let cursor: string | Dict | undefined = dictionary;
  for (const part of parts) {
    if (!cursor || typeof cursor === "string") {
      cursor = undefined;
      break;
    }
    cursor = cursor[part];
  }
  let text = typeof cursor === "string" ? cursor : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
