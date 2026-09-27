import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { projectInitials } from "@/lib/project";

const projectAvatarVariants = cva("relative flex shrink-0 select-none items-center justify-center font-semibold text-[#0a0a0a] transition-[border-radius] duration-150", {
  variants: {
    size: {
      xs: "size-5 rounded-[5px] text-[9px]",
      sm: "size-7 rounded-md text-[11px]",
      md: "size-9 rounded-lg text-[13px]",
      lg: "size-10 rounded-full text-[13px]",
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
  className?: string;
}

/** Colored project icon — the project's color is reused everywhere the project is referenced (Spec §5). */
export function ProjectAvatar({ name, color, size, muted, className }: ProjectAvatarProps) {
  return (
    <span className={cn(projectAvatarVariants({ size, muted }), className)} style={{ backgroundColor: color }} aria-hidden>
      {projectInitials(name)}
    </span>
  );
}

/** Thin vertical project color flag used on session tabs and list rows. */
export function ProjectFlag({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block h-4 w-[3px] shrink-0 rounded-sm", className)} style={{ backgroundColor: color }} aria-hidden />;
}
