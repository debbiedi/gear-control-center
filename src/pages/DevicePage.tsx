import { Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CapabilityTable } from "@/components/ui/CapabilityTable";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { useT } from "@/i18n";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import type { Snapshot } from "@/types/device";

const hex = (n: number) => `0x${n.toString(16).padStart(4, "0")}`;

/** Unknown properties read N/A. Nothing here is filled in from a lookup table. */
function Spec({
  label,
  value,
  absent,
}: {
  label: string;
  value: string | null;
  absent: string;
}) {
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
        {value ?? absent}
      </span>
    </div>
  );
}

export function DevicePage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
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
      run(t.actions.settingAutoShutOff, () =>
        deviceService.setInactiveTime(value),
      ),
  );

  return (
    <div className="space-y-4 p-6">
      {device && !device.verified && (
        <Notice tone="warn" title={t.device.unverifiedTitle}>
          <p>{t.device.unverifiedBody}</p>
          <p className="mt-2">{t.device.unverifiedHelp}</p>
        </Notice>
      )}

      <Panel
        legend={t.device.hardwareLegend}
        title={t.device.identityTitle}
        description={
          device?.is_mock
            ? t.device.simulatedDescription
            : t.device.realDescription
        }
        actions={
          <Button
            onClick={() => void scan()}
            disabled={scanning}
            icon={<RefreshCw size={14} className={scanning ? "animate-spin" : ""} />}
          >
            {scanning ? t.device.scanning : t.device.rescan}
          </Button>
        }
      >
        {device ? (
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
            <div>
              <Spec
                label={t.device.product}
                value={device.name}
                absent={t.device.notAvailable}
              />
              <Spec
                label={t.device.vendorId}
                value={hex(device.vendor_id)}
                absent={t.device.notAvailable}
              />
              <Spec
                label={t.device.productId}
                value={hex(device.product_id)}
                absent={t.device.notAvailable}
              />
              <Spec
                label={t.device.connection}
                value={device.connection}
                absent={t.device.notAvailable}
              />
            </div>
            <div>
              <Spec
                label={t.device.serial}
                value={device.serial}
                absent={t.device.notAvailable}
              />
              <Spec
                label={t.device.firmware}
                value={device.firmware_version}
                absent={t.device.notAvailable}
              />
              <Spec
                label={t.device.revision}
                value={device.hardware_revision}
                absent={t.device.notAvailable}
              />
              <Spec
                label={t.device.source}
                value={device.is_mock ? t.device.simulated : t.device.physical}
                absent={t.device.notAvailable}
              />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            {t.device.nothingToReport}
          </p>
        )}
        {device && !device.is_mock && (
          <p className="mt-4 text-[12.5px] leading-snug text-ink-dim">
            {t.device.naExplain}
          </p>
        )}
      </Panel>

      <Panel
        legend={t.device.detectedLegend}
        title={t.device.detectedTitle}
        description={t.device.detectedDescription}
      >
        {discovered.length === 0 ? (
          <p className="text-[13px] text-ink-dim">
            {scanning ? t.device.scanningEllipsis : t.device.nothingFound}
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
                    {d.unavailable ?? t.device.available}
                  </p>
                </div>
                <Button
                  onClick={() => void connect(d.info.id)}
                  disabled={!!d.unavailable || d.info.id === device?.id}
                  icon={<Plug size={14} />}
                >
                  {d.info.id === device?.id ? t.device.connected : t.device.connect}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {inactive && (
        <Panel
          legend={t.device.powerLegend}
          title={t.device.autoShutOffTitle}
          description={t.device.autoShutOffDescription}
        >
          <div className="max-w-[520px] space-y-4">
            <Slider
              label={t.device.idleTimeout}
              value={minutes}
              min={0}
              max={inactive.max_minutes}
              step={5}
              onChange={setMinutes}
              readout={minutes === 0 ? t.device.never : t.device.minutes(minutes)}
              detail={t.device.autoShutOffDetail(inactive.max_minutes)}
            />
            {snapshot?.state?.inactive_minutes === null && (
              <p className="text-[12.5px] leading-snug text-ink-dim">
                {t.device.autoShutOffUnknown}
              </p>
            )}
          </div>
        </Panel>
      )}

      {snapshot?.capabilities && (
        <Panel
          legend={t.device.capabilitiesLegend}
          title={t.device.capabilitiesTitle}
          description={t.device.capabilitiesDescription}
        >
          <CapabilityTable capabilities={snapshot.capabilities} />
        </Panel>
      )}
    </div>
  );
}
