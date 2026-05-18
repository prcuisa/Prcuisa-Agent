"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  Globe,
  Zap,
  Headphones,
  Beaker,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
    icon: Beaker,
    label: "Layanan Prcuisa Labs",
    description: "Lihat semua layanan yang tersedia",
    prompt: "Apa saja layanan Prcuisa Labs?",
  },
  {
    icon: Zap,
    label: "Solusi AI",
    description: "Bantuan AI untuk bisnis kamu",
    prompt: "Bagaimana Prcuisa Labs bisa bantu bisnis saya dengan AI?",
  },
  {
    icon: Headphones,
    label: "Konsultasi Gratis",
    description: "Diskusi solusi digital secara gratis",
    prompt: "Saya mau konsultasi gratis tentang solusi digital",
  },
  {
    icon: Globe,
    label: "Cari Info Online",
    description: "Cari berita & info terbaru",
    prompt: "Berita terbaru tentang perkembangan AI di Indonesia",
  },
];

export default function Home() {
  const { theme, resolvedTheme } = useTheme();
  const emptySubscribe = () => () => {};
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const isDark = mounted && resolvedTheme === "dark";
  const logoSrc = isDark ? "/prcuisa-logo-dark.png" : "/prcuisa-logo.png";

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

  const updateMessage = useCallback(
    (msgId: string, updates: Partial<DisplayMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    setInput("");
    setIsLoading(true);
    setStatusText("Mencari informasi...");

    const userMsg: DisplayMessage = {
      id: generateId(),
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };
    const assistantMsgId = generateId();
    const assistantMsg: DisplayMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      toolCalls: [],
      isStreaming: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const apiMessages: ChatMessageType[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorDetail = errorData.error;
          if (errorData.hint) errorDetail += `. ${errorData.hint}`;
        } catch {}
        throw new Error(errorDetail);
      }

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
          try {
            event = JSON.parse(line.slice(6).trim());
          } catch {
            continue;
          }

          switch (event.type) {
            case "status":
              setStatusText(event.content);
              break;
            case "tool_call": {
              const e = event as {
                id: string;
                tool: "web_search" | "page_reader";
                args: Record<string, unknown>;
              };
              toolCallsMap.set(e.id, {
                id: e.id,
                tool: e.tool,
                args: e.args,
                status: "loading",
              });
              updateMessage(assistantMsgId, {
                content: fullContent,
                toolCalls: Array.from(toolCallsMap.values()),
              });
              scrollToBottom();
              break;
            }
            case "tool_result": {
              const e = event as { id: string; content: string };
              const tc = toolCallsMap.get(e.id);
              if (tc) {
                tc.status = "complete";
                tc.result = e.content;
                toolCallsMap.set(tc.id, tc);
              }
              updateMessage(assistantMsgId, {
                content: fullContent,
                toolCalls: Array.from(toolCallsMap.values()),
              });
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
              const errorMsg = (event as { content: string }).content;
              console.error("[Chat Error]", errorMsg);
              toast({
                title: "Error",
                description: errorMsg,
                variant: "destructive",
              });
              if (!fullContent) {
                updateMessage(assistantMsgId, {
                  content: `⚠️ **Terjadi kesalahan:**\n\n${errorMsg}\n\n---\n*Tips: Cek konfigurasi di /api/agent atau pastikan environment variables sudah benar.*`,
                });
              }
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
        console.error("[Fetch Error]", err);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
        updateMessage(assistantMsgId, {
          content: `⚠️ **Koneksi error:** ${err.message}\n\n---\n*Tips: Buka /api/agent di browser untuk cek status konfigurasi.*`,
          isStreaming: false,
        });
      } else {
        updateMessage(assistantMsgId, {
          content: fullContent || "Dihentikan.",
          isStreaming: false,
        });
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
      {/* ── Header ── */}
      <header className="shrink-0 glass z-10 border-b border-border/30">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
          {/* Left: Logo + Name + Status */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-[#009AA5]/30 overflow-hidden shrink-0">
              <Image
                src={logoSrc}
                alt="Prcuisa Labs"
                width={36}
                height={36}
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-foreground tracking-tight font-heading">
                Prcuisa Labs
              </h1>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    isLoading
                      ? "bg-amber-400 animate-pulse"
                      : "bg-[#009AA5]"
                  )}
                />
                <span className="text-[11px] text-muted-foreground">
                  {isLoading && statusText
                    ? statusText
                    : isLoading
                      ? "Memproses..."
                      : "Online"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* ── Chat Area ── */}
      <main className="flex-1 overflow-hidden">
        {!hasMessages ? (
          /* ── Welcome Screen ── */
          <div className="flex flex-col items-center justify-center h-full px-6 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <div className="w-20 h-20 mx-auto mb-5 relative">
                <div
                  className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #009AA5 0%, #0ea5e9 100%)",
                  }}
                />
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-[#009AA5]/20">
                  <Image
                    src={logoSrc}
                    alt="Prcuisa Labs"
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1 font-heading">
                Prcuisa Labs
              </h2>
              <p className="text-sm font-semibold gradient-text">
                AI · Automation · Smart Systems
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed mt-3">
                Tanya apa saja — aku akan cari info terbaru dari internet dan
                kasih jawaban buat kamu.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md"
            >
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.prompt)}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-[#e5e7eb] dark:border-white/[0.08] bg-white dark:bg-[#1f2937] backdrop-blur-sm hover:border-[#009AA5]/30 dark:hover:border-[#009AA5]/40 transition-all duration-200 text-left group cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#e6f7f9] dark:bg-[#009AA5]/10"
                  >
                    <s.icon className="w-5 h-5 text-[#009AA5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          /* ── Message List ── */
          <ScrollArea className="h-full" ref={scrollRef}>
            <div
              ref={viewportRef}
              className="chat-bg max-w-3xl mx-auto py-4 space-y-1 px-2 md:px-0"
            >
              <AnimatePresence>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} logoSrc={logoSrc} />
                ))}
              </AnimatePresence>

              {/* Typing Indicator (Telegram style) */}
              {isLoading && statusText && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 md:px-3 py-0.5"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-[#009AA5]/20 self-end mb-4">
                    <Image src={logoSrc} alt="Prcuisa Labs" width={32} height={32} className="object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-[#009AA5] ml-1 mb-0.5">Prcuisa Labs</span>
                    <div className="tg-bubble-bot px-3 py-2.5 inline-flex items-center gap-1.5">
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#009AA5]" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#009AA5]" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#009AA5]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        )}
      </main>

      {/* ── Input Area ── */}
      <div className="shrink-0 max-w-3xl mx-auto w-full pb-4">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
