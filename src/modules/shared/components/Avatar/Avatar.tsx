import { cn } from "@/modules/shared/utils/cn";

interface AvatarProps {
  name: string;
  role?: "user" | "assistant";
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const sizeStyles = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
};

export function Avatar({ name, role = "assistant", size = "md", className }: AvatarProps) {
  const colorClass =
    role === "user"
      ? "bg-indigo-600 text-white"
      : "bg-zinc-700 text-zinc-300";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium shrink-0",
        colorClass,
        sizeStyles[size],
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
