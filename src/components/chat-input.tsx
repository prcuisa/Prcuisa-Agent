"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import { SendHorizonal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 200;
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

  return (
    <div className="relative flex items-end gap-2 p-3 md:p-4 mx-4 md:mx-0 mb-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tulis pesan kamu di sini..."
        disabled={disabled || isLoading}
        className={cn(
          "flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed",
          "placeholder:text-muted-foreground/60 focus-visible:ring-0",
          "min-h-[24px] max-h-[200px] shadow-none"
        )}
        rows={1}
      />
      <div className="shrink-0 mb-0.5">
        {isLoading ? (
          <Button
            onClick={onStop}
            size="icon"
            variant="outline"
            className="w-9 h-9 rounded-xl border-red-400/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            size="icon"
            disabled={!value.trim() || disabled}
            className="w-9 h-9 rounded-xl text-white shadow-sm disabled:opacity-40 disabled:shadow-none transition-all"
            style={{
              background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)",
              boxShadow: "0 2px 8px rgba(0, 154, 165, 0.3)",
            }}
          >
            <SendHorizonal className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
