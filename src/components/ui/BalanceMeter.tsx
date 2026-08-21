import { useT } from "@/i18n";
import { cn } from "@/lib/cn";

/**
 * The ChatMix dial position.
 *
 * Read-only by nature: the wheel is on the headset itself, so this observes it
 * and offers no way to move it. Presenting it as a draggable control would
 * promise something the hardware does not accept.
 */
export function BalanceMeter({
  game,
  chat,
  className,
}: {
  game: number;
  chat: number;
  className?: string;
}) {
  const t = useT();
  const total = game + chat;
  const gameShare = total === 0 ? 50 : (game / total) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="legend">{t.dashboard.game}</span>
        <span className="legend">{t.dashboard.chat}</span>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-panel-3"
        role="meter"
        aria-valuenow={Math.round(gameShare)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.dashboard.chatmixTitle}
      >
        <div
          className="absolute inset-y-0 left-0 bg-brass transition-[width] duration-300"
          style={{ width: `${gameShare}%` }}
        />
        {/* Centre detent: where the dial sits when it is balanced. */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ground/80" />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="readout text-[12px] text-ink-dim">{game}</span>
        <span className="readout text-[12px] text-ink-dim">{chat}</span>
      </div>
    </div>
  );
}
