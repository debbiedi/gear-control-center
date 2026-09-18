import { useState } from "react";
import { cn } from "@/lib/cn";
import { hexToRgb, rgbToHex, type Rgb } from "@/types/device";

/**
 * A row of colours to pick from, plus the hex of whatever is set.
 *
 * Drawn here rather than handed to `<input type="color">` for the same reason
 * the select was replaced: the native control opens a GTK dialog this
 * stylesheet cannot reach, and the closed swatch is themed by the desktop. The
 * hex field is the escape hatch for anything not on the row.
 */
const SWATCHES: string[] = [
  "#ff0000",
  "#ff6a00",
  "#ffd300",
  "#39ff14",
  "#00e5b0",
  "#00b4ff",
  "#2b4bff",
  "#8b3dff",
  "#ff2d95",
  "#ffffff",
  "#8a8f98",
  "#000000",
];

const HEX = /^#[0-9a-f]{6}$/i;

export function ColorField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: Rgb;
  onChange: (rgb: Rgb) => void;
  disabled?: boolean;
}) {
  const hex = rgbToHex(value);
  const [draft, setDraft] = useState(hex);
  const [shown, setShown] = useState(hex);

  // The device's own value wins whenever it changes underneath, so a half-typed
  // hex never survives a reading that says otherwise. Adjusted during render
  // rather than in an effect: React re-runs this pass before painting, so the
  // field never shows the stale value for a frame.
  if (hex !== shown) {
    setShown(hex);
    setDraft(hex);
  }

  const commit = (next: string) => {
    setDraft(next);
    if (HEX.test(next)) onChange(hexToRgb(next));
  };

  return (
    <div className={cn(disabled && "opacity-50")}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="legend">{label}</span>
        <span className="readout text-[13px] uppercase lit">{hex}</span>
      </div>

      <div
        role="group"
        aria-label={label}
        className="mb-2.5 flex flex-wrap gap-1.5"
      >
        {SWATCHES.map((swatch) => {
          const current = swatch.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={swatch}
              type="button"
              disabled={disabled}
              aria-label={swatch}
              aria-pressed={current}
              onClick={() => commit(swatch)}
              style={{ background: swatch }}
              className={cn(
                "size-7 rounded-md border transition-transform",
                // The chosen one is marked by a ring and a lift, not by colour
                // alone — the control is made of colours.
                current
                  ? "-translate-y-0.5 border-ink ring-2 ring-brass"
                  : "border-line hover:-translate-y-0.5",
              )}
            />
          );
        })}
      </div>

      <input
        type="text"
        value={draft}
        disabled={disabled}
        spellCheck={false}
        aria-label={`${label} (hex)`}
        onChange={(e) => commit(e.target.value)}
        className={cn(
          "well readout w-[11ch] rounded-md px-2.5 py-1.5 text-[13px] uppercase",
          "text-ink outline-none focus:ring-2 focus:ring-brass",
          !HEX.test(draft) && "ring-2 ring-fault",
        )}
      />
    </div>
  );
}
