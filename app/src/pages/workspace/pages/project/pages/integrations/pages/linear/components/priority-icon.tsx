import { getLinearPriorityLabel } from "@/config/constants/dropdowns/integrations/linear-priority.options";
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<number, string> = {
  0: "bg-stone",
  1: "bg-danger",
  2: "bg-warning",
  3: "bg-info",
  4: "bg-ash",
};

export function PriorityIcon({ priority }: { priority: number }) {
  return <span title={getLinearPriorityLabel(priority)} className={cn("size-3.5 shrink-0 rounded-[3px]", PRIORITY_COLOR[priority] ?? "bg-stone")} />;
}
