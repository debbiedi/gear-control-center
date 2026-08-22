import { useEffect, useRef, useState } from "react";

/**
 * Move a reading to its new value instead of swapping it.
 *
 * A meter's needle travels; a number that jumps from 75 to 50 reads as a
 * glitch rather than as something that happened. The steps shown along the way
 * are still only values the device could have reported — the animation walks
 * between two readings, it does not invent a resolution.
 */
export function useCountUp(target: number, durationMs = 420): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease out: fast off the mark, settling rather than stopping dead.
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(origin + (target - origin) * eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else from.current = target;
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      from.current = target;
    };
  }, [target, durationMs]);

  return value;
}
