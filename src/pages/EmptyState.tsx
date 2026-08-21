import { Headphones, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDeviceStore } from "@/stores/deviceStore";

/**
 * What the window shows when nothing is plugged in.
 *
 * The application launches and stays usable with no hardware present; the
 * checklist is ordered by how often each item is the actual cause, and the
 * simulated device is offered last so it never looks like the normal path.
 */
export function EmptyState() {
  const scanning = useDeviceStore((s) => s.scanning);
  const scan = useDeviceStore((s) => s.scan);
  const setMockMode = useDeviceStore((s) => s.setMockMode);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-[440px] text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-panel border border-line bg-panel">
          <Headphones size={22} className="text-ink-faint" />
        </div>

        <h1 className="text-[17px] font-semibold tracking-tight text-ink">
          No compatible device detected
        </h1>
        <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-relaxed text-ink-dim">
          Nothing this application knows how to talk to is connected right now.
        </p>

        <ul className="mx-auto mt-5 space-y-2 text-left text-[13px] text-ink-dim">
          {[
            "Check that the wireless dongle is plugged in.",
            "Switch the headset on and wait a few seconds for it to pair.",
            "Close any other software that controls the headset — only one application can hold the device at a time.",
          ].map((hint) => (
            <li key={hint} className="flex gap-2.5">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
              <span>{hint}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex items-center justify-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => void scan()}
            disabled={scanning}
            icon={<RefreshCw size={14} className={scanning ? "animate-spin" : ""} />}
          >
            {scanning ? "Scanning" : "Scan again"}
          </Button>
          <Button variant="ghost" onClick={() => void setMockMode(true)}>
            Use a simulated device
          </Button>
        </div>
      </div>
    </div>
  );
}
