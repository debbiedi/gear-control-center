import { create } from "zustand";
import { useI18n } from "@/i18n";
import { deviceService } from "@/services/device";
import type { DiscoveredDevice, Snapshot } from "@/types/device";

interface DeviceStore {
  snapshot: Snapshot | null;
  discovered: DiscoveredDevice[];
  /** True only during the first load, so the shell does not flash an empty state. */
  initialising: boolean;
  scanning: boolean;
  lastActionError: string | null;

  start: () => () => void;
  refresh: () => Promise<void>;
  scan: () => Promise<void>;
  connect: (deviceId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setMockMode: (enabled: boolean) => Promise<void>;
  run: (label: string, action: () => Promise<void>) => Promise<void>;
  clearActionError: () => void;
}

function describe(error: unknown, label: string): string {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const kind = (error as { kind: string }).kind;
    const detail = (error as { detail?: unknown }).detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object"
          ? Object.values(detail).filter(Boolean).join(" ")
          : "";
    const t = useI18n.getState().t;
    const base: Record<string, string> = {
      unsupported: t.errors.unsupported,
      busy: t.errors.busy,
      offline: t.errors.offline,
      not_connected: t.errors.notConnected,
      transport: t.errors.transport,
      protocol: t.errors.protocol,
      invalid_parameter: t.errors.invalidParameter,
    };
    return [base[kind] ?? t.errors.failed(label), message]
      .filter(Boolean)
      .join(" ");
  }
  // The technical detail from the native layer stays as it came: it is a
  // diagnostic, and translating a message we did not write would be a guess.
  return `${useI18n.getState().t.errors.failed(label)} ${String(error)}`;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  snapshot: null,
  discovered: [],
  initialising: true,
  scanning: false,
  lastActionError: null,

  /**
   * Boot the store and keep it current. Returns a teardown function.
   *
   * State arrives as a push from the native reader, which also opens devices
   * as they appear. The one explicit read here is so the window has something
   * to draw before the first event lands.
   */
  start: () => {
    let unlisten: (() => void) | null = null;
    let stopped = false;

    void (async () => {
      const off = await deviceService.onSnapshot((snapshot) =>
        set({ snapshot, initialising: false }),
      );
      if (stopped) off();
      else unlisten = off;
    })();

    void (async () => {
      await get().scan();
      await get().refresh();
      set({ initialising: false });
    })();

    return () => {
      stopped = true;
      unlisten?.();
    };
  },

  refresh: async () => {
    try {
      set({ snapshot: await deviceService.snapshot() });
    } catch (error) {
      set({
        lastActionError: describe(
          error,
          useI18n.getState().t.actions.readingState,
        ),
      });
    }
  },

  scan: async () => {
    set({ scanning: true });
    try {
      set({ discovered: await deviceService.discover() });
    } catch (error) {
      set({
        lastActionError: describe(
          error,
          useI18n.getState().t.actions.scanning,
        ),
      });
    } finally {
      set({ scanning: false });
    }
  },

  connect: async (deviceId) => {
    try {
      await deviceService.connect(deviceId);
      set({ lastActionError: null });
    } catch (error) {
      set({
        lastActionError: describe(
          error,
          useI18n.getState().t.actions.connecting,
        ),
      });
    }
    await get().refresh();
  },

  disconnect: async () => {
    await deviceService.disconnect();
    await get().refresh();
  },

  setMockMode: async (enabled) => {
    await deviceService.setMockMode(enabled);
    await get().scan();
    const available = get().discovered.find((d) => !d.unavailable);
    if (available) await get().connect(available.info.id);
    else await get().refresh();
  },

  /**
   * Run a device command and surface its outcome.
   *
   * State is re-read from the device afterwards rather than assumed, so the
   * interface can never show a setting the hardware did not accept.
   */
  run: async (label, action) => {
    try {
      await action();
      set({ lastActionError: null });
    } catch (error) {
      set({ lastActionError: describe(error, label) });
    }
    await get().refresh();
  },

  clearActionError: () => set({ lastActionError: null }),
}));
