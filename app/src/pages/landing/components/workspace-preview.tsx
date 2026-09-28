import { GitBranch } from "lucide-react";
import { ProjectAvatar, ProjectFlag } from "@/components/ui/project-avatar";
import { StatusDot, type StatusDotStatus } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

interface MockProject {
  name: string;
  color: string;
  status: StatusDotStatus;
}

const RAIL_PROJECTS: MockProject[] = [
  { name: "Aster Labs", color: "#57c1ff", status: "running" },
  { name: "Northwind", color: "#59d499", status: "running" },
  { name: "Fintra", color: "#ffc533", status: "awaiting" },
  { name: "Reedline", color: "#ff6161", status: "stopped" },
  { name: "Marrow", color: "#8b7cf6", status: "stopped" },
];

const SESSION_TABS: MockProject[] = [
  { name: "Aster Labs — Claude Code", color: "#57c1ff", status: "running" },
  { name: "Northwind — Cursor CLI", color: "#59d499", status: "running" },
  { name: "Fintra — Claude Code", color: "#ffc533", status: "awaiting" },
];

const FILE_LINES = ["src/routes/checkout.ts", "src/lib/pricing.ts", "src/components/cart-summary.tsx", "tests/checkout.spec.ts"];

const DIFF_LINES: { type: "add" | "remove" | "context"; text: string }[] = [
  { type: "context", text: "  const total = subtotal + tax;" },
  { type: "remove", text: "- if (discount) total -= discount;" },
  { type: "add", text: "+ if (discount) total = applyDiscount(total, discount);" },
  { type: "add", text: "+ if (total < 0) throw new Error(\"Invalid total\");" },
  { type: "context", text: "  return round(total);" },
];

/** Illustrative workspace shell — real project colors, session tabs, and a diff, not a literal screenshot. */
export function WorkspacePreview({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-surface", className)}>
      <div className="flex h-9 items-center gap-1 overflow-x-auto border-b bg-canvas px-2">
        {SESSION_TABS.map((tab, i) => (
          <div
            key={tab.name}
            className={cn(
              "flex h-7 shrink-0 items-center gap-2 rounded-md px-2.5 text-[0.75rem]",
              i === 0 ? "bg-surface-elevated text-foreground" : "text-muted-foreground",
            )}
          >
            <ProjectFlag color={tab.color} />
            <span className="max-w-36 truncate">{tab.name}</span>
            <StatusDot status={tab.status} />
          </div>
        ))}
      </div>

      <div className="flex h-72 min-h-0">
        <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r py-3">
          {RAIL_PROJECTS.map((project, i) => (
            <ProjectAvatar key={project.name} name={project.name} color={project.color} size="sm" muted={i > 2} />
          ))}
        </div>

        <div className="hidden w-44 shrink-0 flex-col gap-0.5 border-r p-2 sm:flex">
          <div className="flex items-center gap-1.5 px-1 pb-2 text-[0.6875rem] text-muted-foreground">
            <GitBranch className="size-3" />
            <span>feature/checkout-fix</span>
          </div>
          {FILE_LINES.map((file, i) => (
            <div key={file} className={cn("truncate rounded-sm px-1.5 py-1 font-mono text-[0.6875rem]", i === 1 ? "bg-surface-elevated text-foreground" : "text-muted-foreground")}>
              {file}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden bg-terminal/[0.02] p-3">
          <div className="mb-2 font-mono text-[0.6875rem] text-muted-foreground">src/lib/pricing.ts</div>
          <div className="space-y-0.5 font-mono text-[0.75rem] leading-relaxed">
            {DIFF_LINES.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xs px-2",
                  line.type === "add" && "bg-success-soft text-success",
                  line.type === "remove" && "bg-danger-soft text-danger",
                  line.type === "context" && "text-body",
                )}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
