import { cn } from "@/modules/shared/utils/cn";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface overflow-hidden",
        className
      )}
    >
      <div className="px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </section>
  );
}
