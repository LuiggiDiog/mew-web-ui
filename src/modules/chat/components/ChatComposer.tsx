"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { SendIcon } from "@/modules/shared/components/icons";
import { ModelSelector } from "@/modules/chat/components/ModelSelector";

interface ChatComposerProps {
  onSend?: (text: string) => void;
}

export function ChatComposer({ onSend }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* Model selector row */}
        <div className="mb-2">
          <ModelSelector />
        </div>

        {/* Input row */}
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border border-border",
            "bg-surface px-3 py-2.5",
            "focus-within:border-accent/50 transition-colors"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message…"
            className={cn(
              "flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary",
              "resize-none outline-none leading-relaxed",
              "min-h-[24px] max-h-[160px]"
            )}
          />
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className={cn(
              "p-1.5 rounded-lg transition-colors shrink-0",
              value.trim()
                ? "text-accent hover:bg-accent/10"
                : "text-text-secondary opacity-40 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>

        <p className="text-center text-xs text-text-secondary mt-2">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
