import { QuickActions } from "@/modules/chat/components/QuickActions";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-6 text-center px-4 py-12 max-w-md w-full">
      <div className="space-y-2">
        <h2 className="text-xl font-medium text-text-primary">
          Good morning.
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          What are we working on?
        </p>
      </div>

      <QuickActions />
    </div>
  );
}
