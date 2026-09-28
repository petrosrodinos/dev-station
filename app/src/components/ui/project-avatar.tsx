import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { projectInitials } from "@/lib/project";
import { IDENTICON_GRID, identiconCells } from "@/lib/identicon";

const projectAvatarVariants = cva("relative flex shrink-0 select-none items-center justify-center font-semibold text-[#0a0a0a] transition-[border-radius] duration-150", {
  variants: {
    size: {
      xs: "size-5 rounded-[5px] text-[0.5625rem]",
      sm: "size-7 rounded-md text-[0.6875rem]",
      md: "size-9 rounded-lg text-[0.8125rem]",
      lg: "size-10 rounded-full text-[0.8125rem]",
    },
    muted: {
      true: "opacity-45 outline-1 outline-dashed outline-offset-2 outline-hairline-strong",
      false: "",
    },
  },
  defaultVariants: { size: "md", muted: false },
});

interface ProjectAvatarProps extends VariantProps<typeof projectAvatarVariants> {
  name: string;
  color: string;
  /** When set, a generated identicon replaces the initials. */
  seed?: string | null;
  className?: string;
}

/** Colored project icon — the project's color is reused everywhere the project is referenced (Spec §5). */
export function ProjectAvatar({ name, color, seed, size, muted, className }: ProjectAvatarProps) {
  return (
    <span className={cn(projectAvatarVariants({ size, muted }), className)} style={{ backgroundColor: color }} aria-hidden>
      {seed ? (
        <svg viewBox={`0 0 ${IDENTICON_GRID} ${IDENTICON_GRID}`} className="size-[60%] fill-[#0a0a0a]/80" shapeRendering="crispEdges">
          {identiconCells(seed).map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
          ))}
        </svg>
      ) : (
        projectInitials(name)
      )}
    </span>
  );
}

/** Thin vertical project color flag used on session tabs and list rows. */
export function ProjectFlag({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block h-4 w-[3px] shrink-0 rounded-sm", className)} style={{ backgroundColor: color }} aria-hidden />;
}
