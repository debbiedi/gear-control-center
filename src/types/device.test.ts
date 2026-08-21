import { describe, expect, it } from "vitest";
import {
  connectionLabel,
  connectionTone,
  formatDb,
  mixerPercent,
  profileContents,
} from "./device";

describe("mixerPercent", () => {
  it("spans the device's own range", () => {
    const base = { min: 0, max: 77, db: null, muted: false };
    expect(mixerPercent({ ...base, value: 0 })).toBe(0);
    expect(mixerPercent({ ...base, value: 77 })).toBe(100);
    // 54/77 is what the headset reports at its default position.
    expect(mixerPercent({ ...base, value: 54 })).toBe(70);
  });

  it("survives a driver reporting min === max", () => {
    expect(
      mixerPercent({ value: 5, min: 5, max: 5, db: null, muted: false }),
    ).toBe(0);
  });
});

describe("formatDb", () => {
  it("reads hundredths of a decibel", () => {
    expect(formatDb(-2300)).toBe("-23.0 dB");
    expect(formatDb(0)).toBe("0.0 dB");
    expect(formatDb(150)).toBe("+1.5 dB");
  });

  it("shows nothing rather than zero when the driver publishes no scale", () => {
    expect(formatDb(null)).toBe("—");
  });
});

describe("connection state", () => {
  it("always has a text label, never colour alone", () => {
    expect(connectionLabel("connected")).toBe("Connected");
    expect(connectionLabel("reconnecting")).toBe("Reconnecting");
    expect(connectionLabel({ error: { message: "boom" } })).toBe("Error");
  });

  it("maps transitional states to a warning tone, not a fault", () => {
    expect(connectionTone("connected")).toBe("live");
    expect(connectionTone("reconnecting")).toBe("warn");
    expect(connectionTone("disconnected")).toBe("idle");
    expect(connectionTone({ error: { message: "boom" } })).toBe("fault");
  });
});

describe("profileContents", () => {
  it("lists only what the profile actually holds", () => {
    expect(profileContents({ volume: 40 })).toEqual(["Volume"]);
    expect(profileContents({})).toEqual([]);
  });

  it("distinguishes a stored curve from a stored preset", () => {
    expect(profileContents({ equalizer: [0, 0, 0] })).toEqual([
      "Equaliser curve",
    ]);
    expect(profileContents({ equalizerPreset: 2 })).toEqual([
      "Equaliser preset",
    ]);
    // A curve is the more specific of the two and wins.
    expect(
      profileContents({ equalizer: [0], equalizerPreset: 2 }),
    ).toEqual(["Equaliser curve"]);
  });

  it("reports a stored mute as the state it will set", () => {
    expect(profileContents({ muted: true })).toEqual(["Muted"]);
    expect(profileContents({ muted: false })).toEqual(["Unmuted"]);
  });
});
