import type { DiffLine } from "@/lib/diff";
import { cn } from "@/lib/utils";

const lineClass: Record<DiffLine["type"], string> = {
  add: "bg-success/[0.08] text-emerald-800 dark:text-[#b3ecd1]",
  del: "bg-danger/[0.08] text-red-800 dark:text-[#ffc9c9]",
  ctx: "text-body",
  hunk: "bg-info/[0.06] py-[3px] text-info",
  meta: "text-ash italic",
};

/** Lightweight unified diff renderer (Spec §20) — not a full review UI. */
export function DiffViewer({ lines, className }: { lines: DiffLine[]; className?: string }) {
  return (
    <div className={cn("overflow-auto rounded-md bg-canvas font-mono text-[0.7813rem] leading-[1.65]", className)}>
      <div className="min-w-fit">
        {lines.map((line, i) => (
          <div key={i} className={cn("flex whitespace-pre pr-3", lineClass[line.type])}>
            <span className="w-10 shrink-0 select-none pr-2 text-right text-stone">{line.old_ln ?? ""}</span>
            <span className="w-10 shrink-0 select-none pr-3 text-right text-stone">{line.new_ln ?? ""}</span>
            <span className="w-3 shrink-0 select-none">{line.type === "add" ? "+" : line.type === "del" ? "-" : ""}</span>
            <span>{line.text || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
