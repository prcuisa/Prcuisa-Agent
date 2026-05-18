export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCall {
  id: string;
  tool: "web_search" | "page_reader";
  args: Record<string, unknown>;
  status: "loading" | "complete" | "error";
  result?: string;
}

export type StreamEvent =
  | { type: "status"; content: string }
  | { type: "tool_call"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; tool: string; content: string }
  | { type: "text"; content: string }
  | { type: "error"; content: string }
  | { type: "done" };

export type MessageRole = "user" | "assistant";

export interface DisplayMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  timestamp: number;
}
