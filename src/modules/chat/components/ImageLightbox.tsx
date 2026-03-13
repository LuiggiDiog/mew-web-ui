"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { XIcon, DownloadIcon } from "@/modules/shared/components/icons";

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

async function downloadImage(src: string) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = src.split("/").pop() ?? "image.png";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, "_blank");
  }
}

export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            downloadImage(src);
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 outline-none"
          aria-label="Download image"
        >
          <DownloadIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 outline-none"
          aria-label="Close"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Generated image"
          className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
