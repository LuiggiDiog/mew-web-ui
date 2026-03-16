"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { SendIcon, ImageIcon, StopIcon, AttachIcon, XIcon } from "@/modules/shared/components/icons";
import { ModelSelector } from "@/modules/chat/components/ModelSelector";
import { ImageProfileSelector } from "@/modules/chat/components/ImageProfileSelector";
import { useChatStore } from "@/modules/chat/store/chatStore";

type ImagePreset = {
  label: string;
  width: number;
  height: number;
};

const IMAGE_PRESETS: ImagePreset[] = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "16:9", width: 1024, height: 576 },
  { label: "9:16", width: 576, height: 1024 },
  { label: "4:3", width: 1024, height: 768 },
  { label: "3:4", width: 768, height: 1024 },
];

const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

interface ChatComposerProps {
  onSend?: (text: string) => void;
  onSendImage?: (prompt: string, width: number, height: number, referenceImage?: string, denoise?: number) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
}

export function ChatComposer({
  onSend,
  onSendImage,
  onStop,
  disabled = false,
  streaming = false,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    imageMode,
    imageWidth,
    imageHeight,
    toggleImageMode,
    setImageDimensions,
    previewMode,
    togglePreviewMode,
    referenceImage,
    referenceImageName,
    imageDenoise,
    setReferenceImage,
    setImageDenoise,
    clearReferenceImage,
  } = useChatStore();

  const activePreset =
    IMAGE_PRESETS.find((p) => p.width === imageWidth && p.height === imageHeight) ??
    IMAGE_PRESETS[0];

  const previewWidth = Math.max(256, Math.round(activePreset.width / 2 / 8) * 8);
  const previewHeight = Math.max(256, Math.round(activePreset.height / 2 / 8) * 8);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
        alert("Image must be smaller than 10MB.");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result;
        if (typeof result === "string") {
          setReferenceImage(result, file.name);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [setReferenceImage],
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    if (imageMode) {
      onSendImage?.(
        trimmed,
        imageWidth,
        imageHeight,
        referenceImage ?? undefined,
        referenceImage ? imageDenoise : undefined,
      );
      clearReferenceImage();
    } else {
      onSend?.(trimmed);
    }
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, onSend, onSendImage, imageMode, imageWidth, imageHeight, disabled, referenceImage, imageDenoise, clearReferenceImage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* Image mode indicator pill */}
        {imageMode && (
          <div className="mb-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent rounded-full px-2.5 py-0.5 text-xs font-medium">
              <ImageIcon className="w-3 h-3" />
              Image mode
            </span>
          </div>
        )}

        {/* Reference image preview strip */}
        {imageMode && referenceImage && (
          <div className="mb-2 flex items-center gap-2 px-1 py-1.5 rounded-lg bg-surface border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referenceImage}
              alt="Reference"
              className="h-10 w-10 rounded-md object-cover shrink-0"
            />
            <span className="flex-1 min-w-0 text-xs text-text-secondary truncate">
              {referenceImageName ?? "Reference image"}
            </span>
            <button
              type="button"
              onClick={clearReferenceImage}
              disabled={disabled}
              className="shrink-0 p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors outline-none"
              aria-label="Remove reference image"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Model selector - only shown in text mode */}
        {!imageMode && (
          <div className="mb-2">
            <ModelSelector />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Input row */}
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border",
            imageMode
              ? "border-accent/40 shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_0_12px_rgba(99,102,241,0.06)]"
              : "border-border",
            "bg-surface px-3 py-2.5",
            "focus-within:border-accent/50 transition-all duration-200"
          )}
        >
          <button
            type="button"
            onClick={toggleImageMode}
            disabled={disabled}
            className={cn(
              "p-1.5 rounded-lg transition-colors shrink-0 outline-none",
              imageMode
                ? "text-accent bg-accent/10"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
              disabled && "opacity-40 cursor-not-allowed"
            )}
            aria-label="Toggle image mode"
            aria-pressed={imageMode}
            title={imageMode ? "Switch to text mode" : "Switch to image mode"}
          >
            <ImageIcon />
          </button>

          {/* Attach button — only in image mode */}
          {imageMode && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={cn(
                "p-1.5 rounded-lg transition-colors shrink-0 outline-none",
                referenceImage
                  ? "text-accent bg-accent/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
                disabled && "opacity-40 cursor-not-allowed"
              )}
              aria-label="Attach reference image"
              title="Attach reference image for image-to-image"
            >
              <AttachIcon />
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              imageMode
                ? referenceImage
                  ? "Describe the changes..."
                  : "Describe an image…"
                : "Message…"
            }
            className={cn(
              "flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary",
              "resize-none outline-none leading-relaxed",
              "min-h-6 max-h-40"
            )}
          />
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              disabled={!onStop}
              title="Stop generation"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0 outline-none",
                onStop
                  ? "text-text-secondary bg-surface-elevated hover:text-text-primary hover:bg-border/40"
                  : "text-text-secondary opacity-40 cursor-not-allowed"
              )}
              aria-label="Stop generation"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className={cn(
                "p-1.5 rounded-lg transition-colors shrink-0 outline-none",
                value.trim() && !disabled
                  ? "text-accent hover:bg-accent/10"
                  : "text-text-secondary opacity-40 cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          )}
        </div>

        {imageMode ? (
          <div className="mt-2">
            <div className="flex items-center justify-center gap-1">
              {IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setImageDimensions(preset.width, preset.height)}
                  disabled={disabled}
                  className={cn(
                    "px-2.5 py-0.5 rounded-md text-xs transition-colors outline-none",
                    activePreset.label === preset.label
                      ? "bg-accent/15 text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <span className="w-px h-3 bg-border/50 mx-1" />
              <button
                type="button"
                onClick={togglePreviewMode}
                disabled={disabled}
                title={previewMode ? "Draft mode on — generates at half resolution" : "Enable draft mode for faster preview"}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs transition-colors outline-none",
                  previewMode
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-text-secondary hover:text-text-primary",
                  disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                ⚡ Draft
              </button>
            </div>

            {/* Denoise slider — only shown when reference image is attached */}
            {referenceImage && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <span className="text-xs text-text-secondary shrink-0">Strength</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={imageDenoise}
                  onChange={(e) => setImageDenoise(Number(e.target.value))}
                  disabled={disabled}
                  className="flex-1 accent-accent h-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Generation strength"
                />
                <span className="text-xs text-text-secondary w-8 text-right shrink-0">
                  {imageDenoise.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <p className="text-xs text-text-secondary">
                {referenceImage
                  ? `img2img · strength ${imageDenoise.toFixed(2)} · ${activePreset.width}×${activePreset.height} ·`
                  : previewMode
                    ? `${previewWidth}×${previewHeight} → ${activePreset.width}×${activePreset.height} ·`
                    : `${activePreset.width}×${activePreset.height} ·`}
              </p>
              <ImageProfileSelector />
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-text-secondary mt-2">
            Shift + Enter for new line
          </p>
        )}
      </div>
    </div>
  );
}
