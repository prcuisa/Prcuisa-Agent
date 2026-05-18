"use client";

import { motion } from "framer-motion";
import { Search, Globe, ChevronDown, ChevronRight, Loader2, Check, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DisplayMessage, ToolCall } from "@/lib/agent-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: DisplayMessage;
  logoSrc: string;
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSearch = toolCall.tool === "web_search";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-1"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border border-[#009AA5]/15 bg-[#009AA5]/[0.03] overflow-hidden dark:bg-[#009AA5]/[0.06]">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 w-full p-2 text-left hover:bg-[#009AA5]/[0.05] dark:hover:bg-[#009AA5]/[0.08] transition-colors cursor-pointer">
              <div className="flex items-center justify-center w-5 h-5 rounded-md shrink-0 bg-[#009AA5]/10">
                {isSearch ? (
                  <Search className="w-2.5 h-2.5 text-[#009AA5]" />
                ) : (
                  <Globe className="w-2.5 h-2.5 text-[#009AA5]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-foreground">
                    {isSearch ? "Searching..." : "Reading..."}
                  </span>
                  {toolCall.status === "loading" && (
                    <span className="flex gap-0.5">
                      <span className="typing-dot w-0.5 h-0.5 rounded-full bg-[#009AA5]" />
                      <span className="typing-dot w-0.5 h-0.5 rounded-full bg-[#009AA5]" />
                      <span className="typing-dot w-0.5 h-0.5 rounded-full bg-[#009AA5]" />
                    </span>
                  )}
                  {toolCall.status === "complete" && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-[#009AA5]/20 text-[#009AA5] h-3">
                      Done
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {isSearch ? String(toolCall.args.query || "") : String(toolCall.args.url || "")}
                </p>
              </div>
              <div className="flex items-center shrink-0">
                {toolCall.status === "loading" && <Loader2 className="w-3 h-3 text-[#009AA5] animate-spin" />}
                {toolCall.status === "complete" && <Check className="w-3 h-3 text-[#009AA5]" />}
                {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            </button>
          </CollapsibleTrigger>
          {toolCall.result && (
            <CollapsibleContent>
              <div className="px-2 pb-2 border-t border-[#009AA5]/10">
                <div className="mt-1.5 p-2 rounded-md bg-muted/50 text-[11px] text-muted-foreground leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                  {toolCall.result}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </motion.div>
  );
}

export function ChatMessage({ message, logoSrc }: ChatMessageProps) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn("flex py-0.5", isUser ? "justify-end px-3 md:px-6" : "justify-start px-3 md:px-3")}
    >
      {/* ── Bot: Avatar + Bubble ── */}
      {!isUser && (
        <div className="flex gap-2 max-w-[85%] md:max-w-[75%]">
          {/* Avatar */}
          <div className="shrink-0 self-end mb-5">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-[#009AA5]/20">
              <Image src={logoSrc} alt="Prcuisa Labs" width={32} height={32} className="object-cover" />
            </div>
          </div>

          {/* Bubble area */}
          <div className="flex flex-col min-w-0">
            {/* Sender name */}
            <span className="text-[11px] font-semibold text-[#009AA5] ml-1 mb-0.5">Prcuisa Labs</span>

            {/* Tool calls */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mb-1 space-y-1">
                {message.toolCalls.map((tc) => (
                  <ToolCallCard key={tc.id} toolCall={tc} />
                ))}
              </div>
            )}

            {/* Message bubble */}
            {message.content && (
              <div className="tg-bubble-bot px-2.5 py-[6px] relative">
                <div className="text-[13.5px] leading-[1.45] text-foreground/90 chat-markdown pr-10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                {/* Timestamp inside bubble */}
                <span className="absolute bottom-1 right-2 text-[10px] text-foreground/30 select-none leading-none">
                  {time}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── User: Bubble only (no avatar, Telegram style) ── */}
      {isUser && message.content && (
        <div className="max-w-[80%] md:max-w-[65%] min-w-[80px]">
          <div className="tg-bubble-user px-2.5 py-[6px] relative">
            <p className="text-[13.5px] leading-[1.45] text-white whitespace-pre-wrap break-words pr-16">
              {message.content}
            </p>
            {/* Timestamp + checkmarks inside bubble */}
            <div className="absolute bottom-1 right-2 flex items-center gap-0.5 select-none">
              <CheckCheck className="w-3 h-3 text-white/50" />
              <span className="text-[10px] text-white/50 leading-none">{time}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
