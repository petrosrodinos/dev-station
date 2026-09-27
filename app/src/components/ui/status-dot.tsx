import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Status dot used across services, sessions, tabs and the rail (mockup `.dot-*`).
const statusDotVariants = cva("inline-block size-[7px] shrink-0 rounded-full", {
  variants: {
    status: {
      running: "bg-success shadow-[0_0_0_3px_var(--color-success-soft)]",
      awaiting: "bg-warning shadow-[0_0_0_3px_var(--color-warning-soft)]",
      finished: "bg-info shadow-[0_0_0_3px_var(--color-info-soft)]",
      crashed: "bg-danger shadow-[0_0_0_3px_var(--color-danger-soft)]",
      stopped: "bg-ash",
      starting: "bg-warning animate-pulse",
    },
  },
  defaultVariants: { status: "stopped" },
});

export type StatusDotStatus = NonNullable<VariantProps<typeof statusDotVariants>["status"]>;

interface StatusDotProps extends VariantProps<typeof statusDotVariants> {
  className?: string;
  title?: string;
}

export function StatusDot({ status, className, title }: StatusDotProps) {
  return <span role="img" aria-label={title ?? status ?? "status"} title={title} className={cn(statusDotVariants({ status }), className)} />;
}
