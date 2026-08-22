import { useT } from "@/i18n";
import { cn } from "@/lib/cn";

/**
 * The ChatMix dial position.
 *
 * Read-only by nature: the wheel is on the headset itself, so this observes it
 * and offers no way to move it. Presenting it as a draggable control would
 * promise something the hardware does not accept.
 *
 * Drawn from the centre out, with a detent at the middle, because that is what
 * the wheel does — a bar filling from the left would suggest a level.
 */
export function BalanceMeter({
  game,
  chat,
  size = "sm",
  className,
}: {
  game: number;
  chat: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  const t = useT();
  const total = game + chat;
  // Where the wheel sits: 0 is all chat, 100 is all game, 50 is centred.
  const position = total === 0 ? 50 : (game / total) * 100;
  const offset = position - 50;
  const height = size === "lg" ? "h-3" : "h-2";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="legend">{t.dashboard.game}</span>
        <span className="legend">{t.dashboard.chat}</span>
      </div>
      <div
        className={cn("well relative w-full overflow-hidden rounded-full", height)}
        role="meter"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.dashboard.chatmixTitle}
      >
        {/* Travel from the centre, in whichever direction the wheel went. */}
        <span
          className="absolute inset-y-0 bg-brass shadow-[0_0_10px_rgba(217,164,65,0.35)] transition-[left,width] duration-300"
          style={{
            left: `${Math.min(50, position)}%`,
            width: `${Math.abs(offset)}%`,
          }}
        />
        {/* The detent the wheel clicks into. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-bright"
        />
        {/* Where the wheel is, always drawn. Centred it has no travel to show,
            and a meter that goes blank at rest reads as broken rather than as
            balanced. */}
        <span
          aria-hidden
          className="absolute top-1/2 h-[7px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass shadow-[0_0_8px_rgba(217,164,65,0.6)] transition-[left] duration-300"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="readout lit text-[12px]">{game}</span>
        <span className="readout lit text-[12px]">{chat}</span>
      </div>
    </div>
  );
}
