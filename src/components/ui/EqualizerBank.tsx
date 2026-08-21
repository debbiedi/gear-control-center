import { useRef } from "react";
import { cn } from "@/lib/cn";

interface BankProps {
  bands: number[];
  frequencies: number[];
  minDb: number;
  maxDb: number;
  stepDb: number;
  onChange: (index: number, db: number) => void;
  disabled?: boolean;
}

const TRACK_H = 190;

function formatHz(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : String(hz);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Snap to the device's own step so the interface cannot ask for 3.27 dB.
 *
 * Exported for testing: the axis is inverted (upwards is louder, screen
 * coordinates grow downwards) and getting that backwards is the kind of bug
 * that looks fine in a screenshot.
 */
export function snap(value: number, step: number, min: number, max: number) {
  return clamp(Math.round(value / step) * step, min, max);
}

/** Position within a vertical track, as a value. `top` and `height` are the
 * track's bounds; `clientY` is where the pointer is. */
export function valueFromPointer(
  clientY: number,
  top: number,
  height: number,
  min: number,
  max: number,
  step: number,
) {
  const t = 1 - (clientY - top) / height;
  return snap(min + t * (max - min), step, min, max);
}

function Fader({
  value,
  min,
  max,
  step,
  label,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (db: number) => void;
  disabled?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const fraction = (value - min) / (max - min);

  const fromClientY = (clientY: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(valueFromPointer(clientY, rect.top, rect.height, min, max, step));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const big = step * 4;
    const moves: Record<string, number | "min" | "max"> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: big,
      PageDown: -big,
      Home: "min",
      End: "max",
    };
    const move = moves[e.key];
    if (move === undefined) return;
    e.preventDefault();
    if (move === "min") onChange(min);
    else if (move === "max") onChange(max);
    else onChange(snap(value + move, step, min, max));
  };

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span className="readout text-[11px] text-ink-dim">
        {value > 0 ? `+${value}` : value}
      </span>
      <div
        ref={track}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-orientation="vertical"
        aria-label={`${label} band`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value > 0 ? "+" : ""}${value} decibels at ${label}`}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          if (disabled) return;
          // Capture on the track, not on whatever child was under the finger,
          // so a drag that starts on the cap keeps reporting to the track.
          e.currentTarget.setPointerCapture(e.pointerId);
          fromClientY(e.clientY);
        }}
        onPointerMove={(e) => {
          if (disabled || e.buttons === 0) return;
          fromClientY(e.clientY);
        }}
        className={cn(
          "relative w-6 rounded-full",
          disabled ? "cursor-not-allowed" : "cursor-ns-resize",
        )}
        style={{ height: TRACK_H }}
      >
        {/* A milled slot: recessed, with the light coming from above. */}
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-full w-[5px] -translate-x-1/2 rounded-full bg-ground shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.04)]"
        />
        {/* Travel from the 0 dB centre, so a cut reads as a cut. */}
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 w-[5px] -translate-x-1/2 rounded-full",
            disabled ? "bg-line-bright" : "bg-brass shadow-[0_0_6px_rgba(217,164,65,0.35)]",
          )}
          style={{
            bottom: `${Math.min(fraction, 0.5) * 100}%`,
            height: `${Math.abs(fraction - 0.5) * 100}%`,
          }}
        />
        {/* Cap, with a grip line across it as a real fader has. */}
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 flex h-4 w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-[3px] border",
            disabled
              ? "border-line bg-panel-3"
              : "border-line-bright bg-gradient-to-b from-[#f2f5f6] to-[#b9c2c6] shadow-[0_2px_4px_rgba(0,0,0,0.65)]",
          )}
          style={{ bottom: `${fraction * 100}%` }}
        >
          <span
            className={cn(
              "h-px w-3.5",
              disabled ? "bg-line-bright" : "bg-[#5c6669]",
            )}
          />
        </span>
      </div>
      <span className="readout text-[11px] text-ink-faint">{label}</span>
    </div>
  );
}

/**
 * The ten-band bank, drawn at the resolution the headset accepts.
 *
 * The curve behind the faders is the same data, not a decoration: it is drawn
 * from the identical values and shares the faders' geometry, so a handle and
 * its point on the curve always agree.
 */
export function EqualizerBank({
  bands,
  frequencies,
  minDb,
  maxDb,
  stepDb,
  onChange,
  disabled,
}: BankProps) {
  const n = bands.length;
  const points = bands
    .map((db, i) => {
      const x = ((i + 0.5) / n) * 100;
      const y = 100 - ((db - minDb) / (maxDb - minDb)) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="relative">
      {/* Grid lines at 0 dB and the two extremes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{ top: 22, height: TRACK_H }}
      >
        {[0, 50, 100].map((pct) => (
          <span
            key={pct}
            className={cn(
              "absolute inset-x-0 h-px",
              pct === 50 ? "bg-line-bright" : "bg-line",
            )}
            style={{ top: `${pct}%` }}
          />
        ))}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* The area between the curve and 0 dB, so a flat curve still reads
              as a curve sitting on the centre line rather than as nothing. */}
          <polygon
            points={`0,50 ${points} 100,50`}
            fill="var(--color-brass)"
            fillOpacity={disabled ? 0.04 : 0.1}
          />
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-brass)"
            strokeOpacity={disabled ? 0.25 : 0.7}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {bands.map((db, i) => (
          <Fader
            key={frequencies[i] ?? i}
            value={db}
            min={minDb}
            max={maxDb}
            step={stepDb}
            label={formatHz(frequencies[i] ?? i)}
            disabled={disabled}
            onChange={(next) => onChange(i, next)}
          />
        ))}
      </div>
    </div>
  );
}
