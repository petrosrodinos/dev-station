import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Row-shaped loading placeholder for lists. */
const ROW_WIDTHS = ["w-3/5", "w-4/5", "w-2/3", "w-1/2", "w-3/4", "w-2/5"];

export function ListSkeleton({ rows = 6, className, withIcon = true }: { rows?: number; className?: string; withIcon?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 p-3", className)} aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          {withIcon && <Skeleton className="size-4 rounded" />}
          <Skeleton className={cn("h-3.5", ROW_WIDTHS[i % ROW_WIDTHS.length])} />
          <Skeleton className="ml-auto h-3.5 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Card-grid placeholder matching dashboard cards. */
export function CardGridSkeleton({ cards = 4, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 xl:grid-cols-2", className)} aria-busy>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="mb-4 h-4 w-28" />
          {Array.from({ length: 4 }).map((__, j) => (
            <div key={j} className="flex items-center justify-between py-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
