"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { SendIcon, ImageIcon, StopIcon } from "@/modules/shared/components/icons";
import { ModelSelector } from "@/modules/chat/components/ModelSelector";
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

interface ChatComposerProps {
  onSend?: (text: string) => void;
  onSendImage?: (prompt: string, width: number, height: number) => void;
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
  const { imageMode, imageWidth, imageHeight, toggleImageMode, setImageDimensions, previewMode, togglePreviewMode } =
    useChatStore();

  const activePreset =
    IMAGE_PRESETS.find((p) => p.width === imageWidth && p.height === imageHeight) ??
    IMAGE_PRESETS[0];

  const previewWidth = Math.max(256, Math.round(activePreset.width / 2 / 8) * 8);
  const previewHeight = Math.max(256, Math.round(activePreset.height / 2 / 8) * 8);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    if (imageMode) {
      onSendImage?.(trimmed, imageWidth, imageHeight);
    } else {
      onSend?.(trimmed);
    }
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, onSend, onSendImage, imageMode, imageWidth, imageHeight, disabled]);

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

        {/* Model selector - only shown in text mode */}
        {!imageMode && (
          <div className="mb-2">
            <ModelSelector />
          </div>
        )}

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

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={imageMode ? "Describe an image…" : "Message…"}
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
            <p className="text-center text-xs text-text-secondary mt-1.5">
              {previewMode
                ? `${previewWidth}×${previewHeight} preview → ${activePreset.width}×${activePreset.height} · ComfyUI`
                : `${activePreset.width}×${activePreset.height} · ComfyUI`}
            </p>
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
