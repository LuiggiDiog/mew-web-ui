import { Badge } from "@/modules/shared/components/Badge";
import type { Provider } from "@/modules/providers/types";

interface ProviderBadgeProps {
  provider: Provider;
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={provider.isActive ? "success" : "default"}>
        {provider.isActive ? "Active" : "Inactive"}
      </Badge>
      <Badge variant={provider.type === "local" ? "local" : "external"}>
        {provider.type}
      </Badge>
    </div>
  );
}
