import { ImageIcon } from "@/modules/shared/components/icons";

interface ImageGeneratingPlaceholderProps {
  width?: number;
  height?: number;
}

export function ImageGeneratingPlaceholder({
  width = 1024,
  height = 1024,
}: ImageGeneratingPlaceholderProps) {
  const aspectRatio = width / height;
  // Clamp display size: max 280px wide on mobile
  const displayWidth = 280;
  const displayHeight = Math.round(displayWidth / aspectRatio);

  return (
    <div
      className="animate-shimmer rounded-2xl flex flex-col items-center justify-center gap-3 overflow-hidden"
      style={{ width: displayWidth, height: displayHeight }}
      role="status"
      aria-label="Generating image"
      aria-live="polite"
    >
      <div className="animate-breathe text-accent/60">
        <ImageIcon className="w-8 h-8" />
      </div>
      <span className="text-xs text-text-secondary/70 font-medium tracking-wide">
        Generating image…
      </span>
    </div>
  );
}
