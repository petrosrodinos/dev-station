import { cn } from "@/lib/utils";

// Static class lists so Tailwind can see every value; pieces pick deterministically from them.
const POSITIONS = ["left-[4%]", "left-[11%]", "left-[18%]", "left-[26%]", "left-[33%]", "left-[41%]", "left-[48%]", "left-[55%]", "left-[62%]", "left-[70%]", "left-[78%]", "left-[86%]", "left-[93%]"];
const DELAYS = ["[animation-delay:0ms]", "[animation-delay:120ms]", "[animation-delay:260ms]", "[animation-delay:400ms]", "[animation-delay:540ms]", "[animation-delay:700ms]"];
const COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-info", "bg-danger"];
const SHAPES = ["h-2 w-1", "h-1.5 w-2.5", "size-1.5 rounded-full", "h-2.5 w-1.5"];
const PIECES = 39;

/** Purely decorative burst that falls once over its (relatively positioned) parent. */
export function Confetti({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className={cn(
            "animate-confetti absolute top-0 rounded-[1px] opacity-0",
            POSITIONS[i % POSITIONS.length],
            DELAYS[(i * 5) % DELAYS.length],
            COLORS[(i * 3) % COLORS.length],
            SHAPES[(i * 7) % SHAPES.length],
          )}
        />
      ))}
    </div>
  );
}
