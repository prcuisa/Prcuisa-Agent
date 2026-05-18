"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import { SendHorizonal, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 160;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSubmit();
      }
    }
  };

  const hasValue = value.trim();

  return (
    <div className="mx-3 md:mx-4">
      <div
        className={cn(
          "flex items-end gap-2 p-2 pl-4 rounded-full transition-colors duration-200",
          "bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-white/[0.08]",
          "shadow-md shadow-black/[0.04] dark:shadow-black/20"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pesan..."
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm leading-relaxed py-2",
            "placeholder:text-[#9ca3af] dark:placeholder:text-[#6b7280] focus:outline-none",
            "min-h-[24px] max-h-[160px] text-foreground"
          )}
        />
        <div className="shrink-0 mb-0.5">
          {isLoading ? (
            <button
              onClick={onStop}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                "bg-red-500 hover:bg-red-600 text-white",
                "transition-all duration-200 active:scale-95 cursor-pointer"
              )}
              aria-label="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!hasValue || disabled}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                "transition-all duration-200 active:scale-95 cursor-pointer",
                hasValue
                  ? "text-white shadow-md shadow-[#009AA5]/30"
                  : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
              )}
              style={
                hasValue
                  ? {
                      background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)",
                    }
                  : {
                      background: "var(--muted)",
                    }
              }
              aria-label="Send message"
            >
              <SendHorizonal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
