// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";
import { NO_CAPABILITIES as NONE, snapshotOf as snapshot } from "@/test/fixtures";
import type { Capabilities } from "@/types/device";

/**
 * The application's one rule, checked: a section exists only if the connected
 * device can do something there. This was previously guaranteed by reading the
 * code.
 */
const sidebar = (capabilities: Capabilities | null) =>
  render(
    <Sidebar view="dashboard" onNavigate={() => {}} snapshot={snapshot(capabilities)} />,
  );

afterEach(cleanup);

describe("Sidebar", () => {
  it("offers no equaliser for a device that has none", () => {
    sidebar(NONE);
    expect(screen.queryByText("Equaliser")).toBeNull();
    // Dashboard and Device are not device-dependent and always stand.
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Device")).toBeTruthy();
  });

  it("offers the equaliser once the device reports one", () => {
    sidebar({
      ...NONE,
      equalizer: {
        bands: 10,
        frequencies: [],
        min_db: -12,
        max_db: 12,
        step_db: 0.5,
        hardware: true,
        preset_names: [],
      },
    });
    expect(screen.getByText("Equaliser")).toBeTruthy();
  });

  it("hides audio and microphone from a device that exposes neither", () => {
    sidebar(NONE);
    expect(screen.queryByText("Audio")).toBeNull();
    expect(screen.queryByText("Microphone")).toBeNull();
  });

  it("shows every section when nothing is connected, so the window is not empty", () => {
    sidebar(null);
    for (const section of ["Dashboard", "Audio", "Microphone", "Equaliser", "Device"]) {
      expect(screen.getByText(section)).toBeTruthy();
    }
  });

});
