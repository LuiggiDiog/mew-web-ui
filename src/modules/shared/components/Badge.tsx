import { cn } from "@/modules/shared/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "local" | "external";
  className?: string;
}

const variantStyles = {
  default: "bg-surface-elevated text-text-secondary",
  success: "bg-emerald-500/15 text-emerald-400",
  error: "bg-red-500/15 text-red-400",
  warning: "bg-amber-500/15 text-amber-400",
  local: "bg-indigo-500/15 text-indigo-400",
  external: "bg-zinc-700/50 text-zinc-400",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
