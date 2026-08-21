import { create } from "zustand";
import { deviceService } from "@/services/device";
import { en, type Catalog } from "./en";
import { de } from "./de";
import { es } from "./es";
import { fr } from "./fr";
import { tr } from "./tr";

/**
 * Languages the interface ships in.
 *
 * Adding one is a single file typed as `Catalog` and one entry here — the
 * type makes the compiler check that nothing was left untranslated.
 */
export const CATALOGS = {
  en,
  de,
  es,
  fr,
  tr,
} satisfies Record<string, Catalog>;

export type Locale = keyof typeof CATALOGS;
export type LocalePreference = Locale | "system";

export const LOCALE_NAMES = Object.fromEntries(
  Object.entries(CATALOGS).map(([code, catalogue]) => [code, catalogue.meta.name]),
) as Record<Locale, string>;

function isLocale(value: string): value is Locale {
  return value in CATALOGS;
}

/**
 * What the desktop asked for.
 *
 * The webview reports the environment's language list, so `LANG=de_DE.UTF-8`
 * arrives here as `de-DE`. Region is dropped: there is no separate Austrian
 * translation to choose between, and falling back to English because the tag
 * was not an exact match would be the wrong answer.
 */
export function detectLocale(): Locale {
  const tags =
    typeof navigator !== "undefined"
      ? navigator.languages?.length
        ? navigator.languages
        : [navigator.language]
      : [];
  for (const tag of tags) {
    const base = tag.toLowerCase().split("-")[0];
    if (base && isLocale(base)) return base;
  }
  return "en";
}

export function resolveLocale(preference: LocalePreference): Locale {
  return preference === "system" ? detectLocale() : preference;
}

interface I18nStore {
  preference: LocalePreference;
  locale: Locale;
  t: Catalog;
  /** Read the stored preference and apply it. */
  init: () => Promise<void>;
  setPreference: (preference: LocalePreference) => Promise<void>;
}

/**
 * Hand the native layer its own strings.
 *
 * The tray menu and the low-battery notification are drawn by Rust, but their
 * text lives here with everything else — one catalogue per language rather
 * than two that drift apart.
 */
async function publishNativeStrings(t: Catalog) {
  try {
    await deviceService.setNativeStrings(t.tray);
  } catch (error) {
    // A tray that stayed in the previous language is a blemish, not a fault.
    console.warn("could not publish native strings", error);
  }
}

/**
 * Tell the document what language it is in.
 *
 * The panel legends are uppercased in CSS, and uppercasing is not the same in
 * every language: Turkish "Pil" becomes "PİL", not "PIL". Browsers only apply
 * those rules when they know the language.
 */
function applyDocumentLanguage(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export const useI18n = create<I18nStore>((set) => ({
  preference: "system",
  locale: "en",
  t: en,

  init: async () => {
    let preference: LocalePreference = "system";
    try {
      const settings = await deviceService.getSettings();
      if (settings.locale === "system" || isLocale(settings.locale)) {
        preference = settings.locale;
      }
    } catch {
      // No stored settings yet: the system's language is the right default.
    }
    const locale = resolveLocale(preference);
    const t = CATALOGS[locale];
    set({ preference, locale, t });
    applyDocumentLanguage(locale);
    await publishNativeStrings(t);
  },

  setPreference: async (preference) => {
    const locale = resolveLocale(preference);
    const t = CATALOGS[locale];
    set({ preference, locale, t });
    applyDocumentLanguage(locale);
    await publishNativeStrings(t);
    try {
      const settings = await deviceService.getSettings();
      await deviceService.setSettings({ ...settings, locale: preference });
    } catch (error) {
      console.warn("could not store the language preference", error);
    }
  },
}));

/** The catalogue for the active language. */
export function useT(): Catalog {
  return useI18n((s) => s.t);
}

/**
 * Translate a short term the device layer supplies — a sidetone step, a
 * firmware preset name — falling back to what the device called it.
 *
 * Falling back rather than showing a key means an unfamiliar device is
 * readable in English instead of unreadable in every language.
 */
export function term(raw: string, t: Catalog): string {
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  return (t.terms as Record<string, string>)[key] ?? raw;
}
