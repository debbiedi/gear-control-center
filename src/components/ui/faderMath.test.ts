import { describe, expect, it } from "vitest";
import { snap, valueFromPointer } from "./EqualizerBank";

describe("snap", () => {
  it("lands on the device's own step", () => {
    expect(snap(3.27, 0.5, -12, 12)).toBe(3.5);
    expect(snap(-0.2, 0.5, -12, 12)).toBe(-0);
  });

  it("never leaves the range the hardware accepts", () => {
    expect(snap(99, 0.5, -12, 12)).toBe(12);
    expect(snap(-99, 0.5, -12, 12)).toBe(-12);
  });
});

describe("valueFromPointer", () => {
  const track = { top: 100, height: 200 };

  it("puts the top of the track at maximum gain", () => {
    expect(valueFromPointer(100, track.top, track.height, -12, 12, 0.5)).toBe(12);
  });

  it("puts the bottom of the track at minimum gain", () => {
    expect(valueFromPointer(300, track.top, track.height, -12, 12, 0.5)).toBe(
      -12,
    );
  });

  it("puts the middle at zero — the axis is inverted, and that is easy to get backwards", () => {
    expect(valueFromPointer(200, track.top, track.height, -12, 12, 0.5)).toBe(0);
  });

  it("clamps a pointer dragged past the ends of the track", () => {
    expect(valueFromPointer(-500, track.top, track.height, -12, 12, 0.5)).toBe(12);
    expect(valueFromPointer(9999, track.top, track.height, -12, 12, 0.5)).toBe(
      -12,
    );
  });
});
