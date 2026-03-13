"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { SendIcon, ImageIcon } from "@/modules/shared/components/icons";
import { ModelSelector } from "@/modules/chat/components/ModelSelector";

interface ChatComposerProps {
  onSend?: (text: string) => void;
  onSendImage?: (prompt: string, size: "small" | "large") => void;
  disabled?: boolean;
}

export function ChatComposer({
  onSend,
  onSendImage,
  disabled = false,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [imageSize, setImageSize] = useState<"small" | "large">("small");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    if (imageMode) {
      onSendImage?.(trimmed, imageSize);
    } else {
      onSend?.(trimmed);
    }
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, onSend, onSendImage, imageMode, imageSize, disabled]);

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
        {/* Model selector — only shown in text mode */}
        {!imageMode && (
          <div className="mb-2">
            <ModelSelector />
          </div>
        )}

        {/* Input row */}
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border",
            imageMode ? "border-accent/40" : "border-border",
            "bg-surface px-3 py-2.5",
            "focus-within:border-accent/50 transition-colors"
          )}
        >
          <button
            type="button"
            onClick={() => setImageMode((m) => !m)}
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
        </div>

        {imageMode ? (
          <div className="flex items-center justify-center gap-1 mt-2">
            <button
              type="button"
              onClick={() => setImageSize("small")}
              disabled={disabled}
              className={cn(
                "px-2.5 py-0.5 rounded-md text-xs transition-colors outline-none",
                imageSize === "small"
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              512
            </button>
            <span className="text-text-secondary/40 text-xs">·</span>
            <button
              type="button"
              onClick={() => setImageSize("large")}
              disabled={disabled}
              className={cn(
                "px-2.5 py-0.5 rounded-md text-xs transition-colors outline-none",
                imageSize === "large"
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              1024
            </button>
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
