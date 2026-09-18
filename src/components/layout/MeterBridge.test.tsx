// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MeterBridge } from "./MeterBridge";
import { NO_CAPABILITIES, snapshotOf } from "@/test/fixtures";

afterEach(cleanup);

const WITH_BATTERY = {
  ...NO_CAPABILITIES,
  chatmix: true,
  battery: { steps: 5 },
};

describe("MeterBridge", () => {
  it("names the connection in words, not only in colour", () => {
    render(<MeterBridge snapshot={snapshotOf(NO_CAPABILITIES)} />);
    expect(screen.getByText("Connected")).toBeTruthy();
  });

  it("reads the battery at the resolution the device reports", () => {
    render(
      <MeterBridge
        snapshot={snapshotOf(WITH_BATTERY, {
          state: {
            connection: "connected",
            powered_on: true,
            battery: { percent: 75, charging: false },
            chatmix: { game: 100, chat: 40 },
            sidetone_level: null,
            inactive_minutes: null,
            equalizer_db: null,
            equalizer_preset: null,
            dpi_presets: null,
            dpi_active: null,
            polling_rate: null,
            lighting: null,
          },
        })}
      />,
    );
    expect(screen.getByText("5 reported levels")).toBeTruthy();
    expect(screen.getByLabelText("Battery 75%")).toBeTruthy();
  });

  it("shows no battery while the headset is off rather than the last figure", () => {
    render(
      <MeterBridge
        snapshot={snapshotOf(WITH_BATTERY, {
          state: {
            connection: "connected",
            powered_on: false,
            battery: null,
            chatmix: null,
            sidetone_level: null,
            inactive_minutes: null,
            equalizer_db: null,
            equalizer_preset: null,
            dpi_presets: null,
            dpi_active: null,
            polling_rate: null,
            lighting: null,
          },
        })}
      />,
    );
    expect(screen.queryByText(/reported levels/)).toBeNull();
    expect(screen.getAllByText("Not reported while off").length).toBe(2);
  });

  it("says nothing at all when there is no device, rather than zero", () => {
    render(<MeterBridge snapshot={snapshotOf(null)} />);
    expect(screen.getByText("No device")).toBeTruthy();
    expect(screen.queryByText(/Not supported/)).toBeNull();
  });
});
