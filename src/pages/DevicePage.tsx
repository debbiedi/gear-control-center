import { Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CapabilityTable } from "@/components/ui/CapabilityTable";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import type { Snapshot } from "@/types/device";

const hex = (n: number) => `0x${n.toString(16).padStart(4, "0")}`;

/** Unknown properties read N/A. Nothing here is filled in from a lookup table. */
function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <span className="text-[13px] text-ink-dim">{label}</span>
      <span
        className={
          value
            ? "readout selectable text-[13px] text-ink"
            : "readout text-[13px] text-ink-faint"
        }
      >
        {value ?? "N/A"}
      </span>
    </div>
  );
}

export function DevicePage({ snapshot }: { snapshot: Snapshot | null }) {
  const discovered = useDeviceStore((s) => s.discovered);
  const scanning = useDeviceStore((s) => s.scanning);
  const scan = useDeviceStore((s) => s.scan);
  const connect = useDeviceStore((s) => s.connect);
  const run = useDeviceStore((s) => s.run);
  const device = snapshot?.device ?? null;
  const inactive = snapshot?.capabilities?.inactive_time ?? null;

  const [minutes, setMinutes] = useDeviceValue(
    snapshot?.state?.inactive_minutes ?? 0,
    (value) =>
      run("Setting the auto shut-off timer", () =>
        deviceService.setInactiveTime(value),
      ),
  );

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend="Hardware"
        title="Identity"
        description={
          device?.is_mock
            ? "A simulated device — these values are fixed, not read from hardware."
            : "Read from the connected device."
        }
        actions={
          <Button
            onClick={() => void scan()}
            disabled={scanning}
            icon={<RefreshCw size={14} className={scanning ? "animate-spin" : ""} />}
          >
            {scanning ? "Scanning" : "Rescan"}
          </Button>
        }
      >
        {device ? (
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
            <div>
              <Spec label="Product" value={device.name} />
              <Spec label="Vendor ID" value={hex(device.vendor_id)} />
              <Spec label="Product ID" value={hex(device.product_id)} />
              <Spec label="Connection" value={device.connection} />
            </div>
            <div>
              <Spec label="Serial number" value={device.serial} />
              <Spec label="Firmware version" value={device.firmware_version} />
              <Spec label="Hardware revision" value={device.hardware_revision} />
              <Spec
                label="Source"
                value={device.is_mock ? "Simulated" : "Physical device"}
              />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            No device is connected, so there is nothing to report.
          </p>
        )}
        {device && !device.is_mock && (
          <p className="mt-4 text-[12.5px] leading-snug text-ink-dim">
            Fields marked N/A are not exposed by this headset over its control
            interface. They are left empty rather than filled in from a
            product database.
          </p>
        )}
      </Panel>

      <Panel
        legend="Detected"
        title="Devices on this system"
        description="Every supported device found, including ones that cannot currently be opened."
      >
        {discovered.length === 0 ? (
          <p className="text-[13px] text-ink-dim">
            {scanning ? "Scanning…" : "Nothing found."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {discovered.map((d) => (
              <li
                key={d.info.id}
                className="flex items-center justify-between gap-4 rounded-md border border-line bg-panel-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {d.info.name}
                  </p>
                  <p className="readout mt-0.5 truncate text-[12px] text-ink-faint">
                    {hex(d.info.vendor_id)}:{hex(d.info.product_id)} ·{" "}
                    {d.unavailable ?? "Available"}
                  </p>
                </div>
                <Button
                  onClick={() => void connect(d.info.id)}
                  disabled={!!d.unavailable || d.info.id === device?.id}
                  icon={<Plug size={14} />}
                >
                  {d.info.id === device?.id ? "Connected" : "Connect"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {inactive && (
        <Panel
          legend="Power"
          title="Auto shut-off"
          description="How long the headset waits, with no audio and no movement, before switching itself off to save battery."
        >
          <div className="max-w-[520px] space-y-4">
            <Slider
              label="Idle timeout"
              value={minutes}
              min={0}
              max={inactive.max_minutes}
              step={5}
              onChange={setMinutes}
              readout={minutes === 0 ? "Never" : `${minutes} min`}
              detail={`The headset accepts 0 to ${inactive.max_minutes} minutes. Zero disables the timer entirely.`}
            />
            {snapshot?.state?.inactive_minutes === null && (
              <p className="text-[12.5px] leading-snug text-ink-dim">
                The headset does not report its current timeout, so this starts
                at zero after a reconnect and shows what this application has
                sent since.
              </p>
            )}
          </div>
        </Panel>
      )}

      {snapshot?.capabilities && (
        <Panel
          legend="Capabilities"
          title="What this device can do"
          description="Reported by the hardware, not assumed from its model name."
        >
          <CapabilityTable capabilities={snapshot.capabilities} />
        </Panel>
      )}
    </div>
  );
}
