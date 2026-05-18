"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Loader2,
  Search,
  Globe,
  Zap,
  MessageSquare,
  Headphones,
  FlaskConical,
} from "lucide-react";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import type {
  DisplayMessage,
  ToolCall,
  StreamEvent,
  ChatMessage as ChatMessageType,
} from "@/lib/agent-types";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SUGGESTIONS = [
  {
    icon: FlaskConical,
    label: "Layanan Prcuisa Labs",
    prompt: "Apa saja layanan Prcuisa Labs?",
  },
  {
    icon: Zap,
    label: "Solusi AI untuk Bisnis",
    prompt: "Bagaimana Prcuisa Labs bisa bantu bisnis saya dengan AI?",
  },
  {
    icon: Headphones,
    label: "Konsultasi Gratis",
    prompt: "Saya mau konsultasi gratis tentang solusi digital",
  },
  {
    icon: Globe,
    label: "Cari Info Online",
    prompt: "Berita terbaru tentang perkembangan AI di Indonesia",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const updateMessage = useCallback((msgId: string, updates: Partial<DisplayMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ...updates } : m)));
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    setInput("");
    setIsLoading(true);
    setStatusText("Mencari informasi...");

    const userMsg: DisplayMessage = { id: generateId(), role: "user", content: userContent, timestamp: Date.now() };
    const assistantMsgId = generateId();
    const assistantMsg: DisplayMessage = { id: assistantMsgId, role: "assistant", content: "", toolCalls: [], isStreaming: true, timestamp: Date.now() };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const apiMessages: ChatMessageType[] = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      const toolCallsMap = new Map<string, ToolCall>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: StreamEvent;
          try { event = JSON.parse(line.slice(6).trim()); } catch { continue; }

          switch (event.type) {
            case "status":
              setStatusText(event.content);
              break;
            case "tool_call": {
              const e = event as { id: string; tool: "web_search" | "page_reader"; args: Record<string, unknown> };
              toolCallsMap.set(e.id, { id: e.id, tool: e.tool, args: e.args, status: "loading" });
              updateMessage(assistantMsgId, { content: fullContent, toolCalls: Array.from(toolCallsMap.values()) });
              scrollToBottom();
              break;
            }
            case "tool_result": {
              const e = event as { id: string; content: string };
              const tc = toolCallsMap.get(e.id);
              if (tc) { tc.status = "complete"; tc.result = e.content; toolCallsMap.set(tc.id, tc); }
              updateMessage(assistantMsgId, { content: fullContent, toolCalls: Array.from(toolCallsMap.values()) });
              scrollToBottom();
              break;
            }
            case "text": {
              fullContent += (event as { content: string }).content;
              setStatusText("");
              updateMessage(assistantMsgId, { content: fullContent });
              scrollToBottom();
              break;
            }
            case "error": {
              toast({ title: "Error", description: (event as { content: string }).content, variant: "destructive" });
              if (!fullContent) updateMessage(assistantMsgId, { content: `Terjadi kesalahan: ${(event as { content: string }).content}` });
              break;
            }
          }
        }
      }

      updateMessage(assistantMsgId, {
        content: fullContent || "Maaf, tidak bisa memberikan respons saat ini.",
        isStreaming: false,
        toolCalls: Array.from(toolCallsMap.values()),
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== "AbortError") {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        updateMessage(assistantMsgId, { content: `Koneksi error: ${err.message}`, isStreaming: false });
      } else {
        updateMessage(assistantMsgId, { content: fullContent || "Dihentikan.", isStreaming: false });
      }
    } finally {
      setIsLoading(false);
      setStatusText("");
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => abortControllerRef.current?.abort();
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)",
              boxShadow: "0 2px 8px rgba(0, 154, 165, 0.25)",
            }}
          >
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Prcuisa Labs</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : "bg-[#009AA5]"}`} />
              <span className="text-[11px] text-muted-foreground">
                {isLoading && statusText ? statusText : isLoading ? "Memproses..." : "Online"}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#e6f7f9] text-[#009AA5]">
            AI Assistant
          </span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center mb-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)",
                  boxShadow: "0 8px 32px rgba(0, 154, 165, 0.3)",
                }}
              >
                <FlaskConical className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Prcuisa Labs</h2>
              <p className="text-sm font-medium" style={{ color: "#009AA5" }}>AI · Automation · Smart Systems</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed mt-3">
                Tanya apa saja — aku akan cari info terbaru dari internet dan kasih jawaban buat kamu.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.prompt)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#e6f7f9" }}>
                    <s.icon className="w-4 h-4 text-[#009AA5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.prompt}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollRef}>
            <div ref={viewportRef} className="max-w-3xl mx-auto py-6 space-y-5 px-2 md:px-0">
              <AnimatePresence>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
              </AnimatePresence>

              {isLoading && statusText && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 md:px-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)" }}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border/50">
                    <Loader2 className="w-3.5 h-3.5 text-[#009AA5] animate-spin" />
                    <span className="text-xs text-muted-foreground">{statusText}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        )}
      </main>

      <div className="shrink-0 max-w-3xl mx-auto w-full">
        <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} onStop={handleStop} isLoading={isLoading} />
      </div>
    </div>
  );
}
