# Translating

The interface ships in several languages, and adding one is a single file.

## How the language is chosen

By default the application follows the desktop: `LANG=de_DE.UTF-8` gives a
German interface. The region is dropped — there is no separate Austrian
translation to choose between — and anything with no catalogue falls back to
English.

**Settings → Interface language** overrides that, and the choice is stored in
`~/.config/headset-control-center/settings.json`. It applies immediately,
including to the tray menu and notifications.

## Adding a language

1. Copy `src/i18n/en.ts` to `src/i18n/<code>.ts`, using the two-letter code.
2. Change the first lines to:

   ```ts
   import type { Catalog } from "./en";

   export const xx: Catalog = {
     meta: { name: "Name of the language, in that language" },
     …
   ```

3. Translate the values. **Do not change any key.**
4. Register it in `src/i18n/index.ts`:

   ```ts
   import { xx } from "./xx";

   export const CATALOGS = { en, de, es, fr, tr, xx } satisfies …
   ```

5. Run the checks:

   ```bash
   npm run build   # a missing or misspelled key is a compile error
   npm test        # placeholders, list lengths, empty strings
   ```

That is the whole procedure. Because every catalogue is typed as `Catalog`, an
untranslated key cannot slip through as English text in front of someone who
does not read English — it stops the build instead.

## Things the checks enforce, and why

* **Placeholders survive.** `{percent}` and `{device}` are substituted by the
  native layer for the tray and notifications. A translation may put them
  wherever its grammar needs — `"Batterie : {percent} %"`, `"%{percent} pil"` —
  but it may not drop them.
* **Functions use their arguments.** `reportedLevels(5)` has to contain the 5.
  A translation that ignores the number would print "levels" with no count.
* **Lists keep their length.** The hint list on the empty screen and the two
  "not available" lists are rendered item by item.

## What is never translated

Readings from the device, and the words the device chooses for itself:

* Numbers and units — a decibel is a decibel
* The product name, as the hardware reports it
* Vendor and product ids, serial numbers, firmware versions
* Technical error detail coming from the native layer, which is a diagnostic
  rather than prose

Short terms the device layer supplies *are* translated — sidetone steps, the
firmware preset names — through `terms` in the catalogue, which falls back to
what the device called it. A headset whose terms nobody has translated yet
stays readable in English rather than becoming unreadable in every language.

## A note on casing

Panel legends are uppercased in CSS, and uppercasing is language-dependent:
Turkish "Pil" becomes "PİL", not "PIL". The application sets the document
language so browsers apply the right rules — nothing extra is needed in a
catalogue, but it is worth knowing why a legend may look different from a
naive `toUpperCase()`.
