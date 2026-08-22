import { Headphones, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useDeviceStore } from "@/stores/deviceStore";

/**
 * What the window shows when nothing is plugged in.
 *
 * The application launches and stays usable with no hardware present; the
 * checklist is ordered by how often each item is the actual cause, and the
 * simulated device is offered last so it never looks like the normal path.
 */
export function EmptyState() {
  const t = useT();
  const scanning = useDeviceStore((s) => s.scanning);
  const scan = useDeviceStore((s) => s.scan);
  const setMockMode = useDeviceStore((s) => s.setMockMode);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-[440px] text-center">
        <div className="well mx-auto mb-5 flex size-14 items-center justify-center rounded-panel">
          <Headphones size={22} className="text-ink-faint" />
        </div>

        <h1 className="text-[17px] font-semibold tracking-tight text-ink">
          {t.empty.title}
        </h1>
        <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-relaxed text-ink-dim">
          {t.empty.lede}
        </p>

        <ul className="mx-auto mt-5 space-y-2 text-left text-[13px] text-ink-dim">
          {t.empty.hints.map((hint) => (
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
            {scanning ? t.empty.scanning : t.empty.scanAgain}
          </Button>
          <Button variant="ghost" onClick={() => void setMockMode(true)}>
            {t.empty.useSimulated}
          </Button>
        </div>
      </div>
    </div>
  );
}
