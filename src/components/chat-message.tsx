"use client";

import { motion } from "framer-motion";
import { Bot, User, Search, Globe, ChevronDown, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import type { DisplayMessage, ToolCall } from "@/lib/agent-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: DisplayMessage;
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSearch = toolCall.tool === "web_search";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="overflow-hidden" style={{ borderColor: "rgba(0, 154, 165, 0.2)", backgroundColor: "rgba(0, 154, 165, 0.04)" }}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 w-full p-3 text-left hover:bg-[rgba(0,154,165,0.06)] transition-colors cursor-pointer">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0" style={{ backgroundColor: "rgba(0, 154, 165, 0.12)" }}>
                {isSearch ? (
                  <Search className="w-3.5 h-3.5 text-[#009AA5]" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-[#009AA5]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{isSearch ? "Web Search" : "Page Reader"}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      toolCall.status === "loading"
                        ? "border-amber-500/30 text-amber-500"
                        : toolCall.status === "complete"
                          ? "border-[#009AA5]/30 text-[#009AA5]"
                          : "border-red-500/30 text-red-500"
                    }`}
                  >
                    {toolCall.status === "loading" ? "Proses" : toolCall.status === "complete" ? "Selesai" : "Error"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {isSearch ? `Query: ${String(toolCall.args.query || "")}` : `URL: ${String(toolCall.args.url || "")}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {toolCall.status === "loading" && <Loader2 className="w-4 h-4 text-[#009AA5] animate-spin" />}
                {toolCall.status === "complete" && <CheckCircle2 className="w-4 h-4 text-[#009AA5]" />}
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
          </CollapsibleTrigger>
          {toolCall.result && (
            <CollapsibleContent>
              <div className="px-3 pb-3 border-t" style={{ borderColor: "rgba(0, 154, 165, 0.1)" }}>
                <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                  {toolCall.result}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>
    </motion.div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-3 px-4 md:px-0 ${isUser ? "flex-row-reverse md:justify-end" : ""}`}
    >
      {!isUser && (
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)", boxShadow: "0 2px 8px rgba(0, 154, 165, 0.2)" }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-2 w-full">
            {message.toolCalls.map((tc) => <ToolCallCard key={tc.id} toolCall={tc} />)}
          </div>
        )}

        <Card className={isUser ? "border-transparent" : "bg-card border-border/50 shadow-sm overflow-hidden"} style={isUser ? { background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)" } : undefined}>
          <CardContent className="p-4">
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white">{message.content}</p>
            ) : message.content ? (
              <div className="text-sm leading-relaxed prose prose-sm prose-neutral dark:prose-invert max-w-none
                prose-headings:mt-4 prose-headings:mb-2
                prose-p:my-1.5
                prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
                prose-pre:my-2
                prose-blockquote:my-2
                prose-hr:my-4
                prose-a:text-[#009AA5] prose-a:no-underline hover:prose-a:underline
                prose-code:text-[#009AA5] prose-code:bg-[rgba(0,154,165,0.1)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
                prose-pre:bg-muted prose-pre:border prose-pre:border-border/50
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-3
                [&_thead]:border-b [&_thead]:border-border
                [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:bg-muted/50
                [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_td]:border-b [&_td]:border-border/50
                [&_tr:hover]:bg-muted/30
                [&_blockquote]:border-l-2 [&_blockquote]:border-[#009AA5]/40 [&_blockquote]:pl-4 [&_blockquote]:italic
                [&_strong]:text-foreground
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <span className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {isUser && (
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
