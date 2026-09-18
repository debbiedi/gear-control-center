// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import { useDeviceStore } from "@/stores/deviceStore";
import {
  MOUSE_CAPABILITIES,
  NO_CAPABILITIES as NONE,
  snapshotOf as snapshot,
} from "@/test/fixtures";
import type { Capabilities, DeviceSummary } from "@/types/device";

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

const MOUSE = MOUSE_CAPABILITIES;

function summary(
  id: string,
  name: string,
  extra: Partial<DeviceSummary> = {},
): DeviceSummary {
  return {
    id,
    name,
    connection: "connected",
    battery: { percent: 60, charging: false },
    poweredOn: true,
    verified: true,
    ...extra,
  };
}

const TWO = [summary("d", "Arctis 7+"), summary("m", "Aerox 3 Wireless")];

/** The sidebar with a given set of open devices, and one of them selected. */
const withDevices = (devices: DeviceSummary[], selected: string | null) =>
  render(
    <Sidebar
      view="dashboard"
      onNavigate={() => {}}
      snapshot={snapshot(NONE, { devices, selected })}
    />,
  );

describe("Sidebar sections for a pointing device", () => {
  it("offers the sensor and lighting sections to a mouse", () => {
    sidebar(MOUSE);
    expect(screen.getByText("Sensor")).toBeTruthy();
    expect(screen.getByText("Lighting")).toBeTruthy();
  });

  it("offers neither to a device that has no sensor and no lighting", () => {
    // A sensor page for a headset is a promise the software cannot keep.
    sidebar(NONE);
    expect(screen.queryByText("Sensor")).toBeNull();
    expect(screen.queryByText("Lighting")).toBeNull();
  });

  it("does not offer the equaliser to a mouse", () => {
    sidebar(MOUSE);
    expect(screen.queryByText("Equaliser")).toBeNull();
  });
});

describe("Sidebar device picker", () => {
  it("stays out of the way when there is nothing to choose between", () => {
    withDevices([TWO[0]], "d");
    expect(screen.queryByRole("radiogroup", { name: "Devices" })).toBeNull();
  });

  it("lists both devices and marks the selected one", () => {
    withDevices(TWO, "m");
    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(2);
    expect(options[0].getAttribute("aria-checked")).toBe("false");
    expect(options[1].getAttribute("aria-checked")).toBe("true");
  });

  it("switches device when one is picked", () => {
    const selectDevice = vi.fn().mockResolvedValue(undefined);
    const restore = useDeviceStore.getState().selectDevice;
    useDeviceStore.setState({ selectDevice });

    withDevices(TWO, "d");
    fireEvent.click(screen.getByText("Aerox 3 Wireless"));
    expect(selectDevice).toHaveBeenCalledWith("m");

    useDeviceStore.setState({ selectDevice: restore });
  });

  it("says a device is off rather than showing its last known battery", () => {
    // A level left on screen from before it was switched off reads as live.
    withDevices(
      [TWO[0], summary("m", "Aerox 3 Wireless", { poweredOn: false, battery: null })],
      "d",
    );
    expect(screen.getByText(/Off/)).toBeTruthy();
    expect(screen.getByText(/60%/)).toBeTruthy();
  });

  it("marks a device this build has not been verified against", () => {
    withDevices(
      [TWO[0], summary("m", "Aerox 3 Wireless (wired)", { verified: false })],
      "d",
    );
    expect(screen.getByText(/Read-only/)).toBeTruthy();
  });
});
