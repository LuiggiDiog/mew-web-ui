import { useEffect, useRef } from "react";
import { SendIcon, XIcon } from "@/modules/shared/components/icons";

interface MessageInlineEditorProps {
  value: string;
  disabled?: boolean;
  saveDisabled?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MessageInlineEditor({
  value,
  disabled = false,
  saveDisabled = false,
  onChange,
  onSave,
  onCancel,
}: MessageInlineEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);
  }, []);

  return (
    <div className="w-[min(82vw,30rem)] min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors focus-within:border-accent/50">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSave();
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          rows={3}
          aria-label="Edit message input"
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-text-primary outline-none min-h-20 max-h-40"
        />
        <div className="flex items-center gap-1.5 pb-0.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            aria-label="Cancel edit message"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-text-secondary transition-colors hover:border-border/60 hover:bg-surface-elevated hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            aria-label="Save edited message"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
