import { describe, expect, it } from "vitest";
import { CATALOGS, type Locale } from "./index";
import { en } from "./en";

const entries = Object.entries(CATALOGS) as [Locale, typeof en][];

/**
 * The compiler already guarantees every catalogue has every key, and that the
 * functions take the same arguments. What it cannot see is whether a
 * translation kept the placeholders the native layer substitutes, or dropped
 * an item out of a list. Those fail silently in front of a user, so they are
 * checked here.
 */
describe.each(entries)("%s catalogue", (_locale, catalogue) => {
  it("keeps the placeholders the tray substitutes", () => {
    expect(catalogue.tray.battery).toContain("{percent}");
    expect(catalogue.tray.batteryCharging).toContain("{percent}");
    expect(catalogue.tray.lowBatteryTitle).toContain("{device}");
    expect(catalogue.tray.lowBatteryBody).toContain("{percent}");
  });

  it("uses every argument its functions are given", () => {
    // A translation that ignores the number would show "levels" with no count.
    expect(catalogue.strip.reportedLevels(5)).toContain("5");
    expect(catalogue.dashboard.hardwareSteps(78)).toContain("78");
    expect(catalogue.dashboard.batteryResolution(5)).toContain("5");
    expect(catalogue.device.minutes(30)).toContain("30");
    expect(catalogue.device.autoShutOffDetail(90)).toContain("90");
    expect(catalogue.capabilities.batteryLevelDetail(5, 25)).toContain("5");
    expect(catalogue.capabilities.inactiveTimeDetail(90)).toContain("90");
    expect(catalogue.errors.failed("X")).toContain("X");
    expect(catalogue.conflict.title("Arctis")).toContain("Arctis");
    expect(catalogue.profiles.resultTitle("Night")).toContain("Night");
    expect(catalogue.settings.version("1.2.3")).toContain("1.2.3");
  });

  it("keeps every item of the lists the interface renders", () => {
    expect(catalogue.empty.hints).toHaveLength(en.empty.hints.length);
    expect(catalogue.audio.absent).toHaveLength(en.audio.absent.length);
    expect(catalogue.microphone.processingList).toHaveLength(
      en.microphone.processingList.length,
    );
  });

  it("has no empty strings", () => {
    const empties: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string" && value.trim() === "") empties.push(path);
      else if (Array.isArray(value))
        value.forEach((item, i) => walk(item, `${path}[${i}]`));
      else if (value && typeof value === "object")
        for (const [key, inner] of Object.entries(value))
          walk(inner, `${path}.${key}`);
    };
    walk(catalogue, "");
    expect(empties).toEqual([]);
  });

  it("names itself in its own language", () => {
    expect(catalogue.meta.name.trim()).not.toBe("");
  });
});

describe("the catalogue registry", () => {
  it("always includes English, which everything else is typed against", () => {
    expect(CATALOGS.en).toBe(en);
  });
});
