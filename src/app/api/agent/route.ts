import { NextRequest } from "next/server";

// ─── Config ───────────────────────────────────────────────────
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NVIDIA_API_KEY = () => process.env.NVIDIA_API_KEY || "";
const NVIDIA_MODEL = () => process.env.NVIDIA_MODEL || "openai/gpt-oss-20b";
const SEARCH_API_URL = "https://api.tavily.com/search";

// ─── System Prompt ───────────────────────────────────────────
const SYSTEM_PROMPT = `Kamu adalah asisten AI dari **Prcuisa Labs** — lab riset & pengembangan teknologi AI dari Indonesia.

## Info Prcuisa Labs
- Website: https://prcuisa.com
- Email: prcuisa@gmail.com
- Layanan: AI Automation, Custom Software, Smart Tech Installation, CRM, Digital Systems, Custom PC, QR Tools

## Cara Menjawab

### Format
- Gunakan Bahasa Indonesia, santai tapi profesional.
- Gunakan markdown untuk format jawaban.
- Jangan pernah menulis kode Python/JavaScript/Bash kecuali user meminta contoh kode.

### Struktur Jawaban
Untuk pertanyaan yang butuh penjelasan panjang, ikuti format ini:

1. **Paragraf pembuka** — 1-2 kalimat langsung menjawab pertanyaan.
2. **Poin-poin penting** — Gunakan bullet list atau numbered list (maks 5-7 poin). Setiap poin: **judul bold** diikuti 1 kalimat penjelasan.
3. **Penutup singkat** — 1 kalimat saran atau tawaran bantuan lebih lanjut.

### Yang HARUS Dihindari
- Jangan tulis tabel markdown yang lebar (melebihi 3 kolom). Gunakan bullet list sebagai gantinya.
- Jangan tulis blok kode kecuali user minta.
- Jangan tulis lebih dari 5 heading per jawaban.
- Jangan tulis emoji berlebihan (maks 2-3 emoji per jawaban).
- Jangan copy-paste data pencarian mentah. Ringkas dan parafrase.
- Jangan tulis "Langkah-langkah" panjang dengan sub-sub numbering bertingkat.

### Contoh Format Jawaban yang Benar

**Pembuka singkat:**
Untuk memulai proyek otomasi, berikut langkah-langkah utamanya:

**Poin penting:**
- **Tentukan tujuan** — Apa yang ingin diotomasi (customer support, leads, dll).
- **Pilih tools** — WhatsApp Business API, Zapier, atau custom development.
- **Desain alur** — Buat flowchart trigger-action sederhana.
- **Implementasi** — Koding atau setup no-code, lalu integrasi API.
- **Testing** — Uji di staging sebelum go live.

**Penutup:**
Kalau butuh bantuan implementasi, langsung hubungi prcuisa@gmail.com atau kunjungi prcuisa.com.`;

// ─── Web Search (Tavily) ─────────────────────────────────────
async function webSearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch(SEARCH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        include_answer: false,
      }),
    });

    if (!res.ok) return "";

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) return "";

    return results
      .map(
        (r: { title: string; url: string; content: string }, i: number) =>
          `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content.slice(0, 200)}`
      )
      .join("\n\n");
  } catch {
    return "";
  }
}

// ─── LLM Streaming via raw fetch (no SDK dependency) ────────
async function* streamLLM(messages: Array<{ role: string; content: string }>) {
  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY()}`,
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL(),
      messages,
      temperature: 1,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from LLM");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const json = trimmed.slice(6);
      if (json === "[DONE]") return;

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

// ─── API Route ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!NVIDIA_API_KEY()) {
      return new Response(JSON.stringify({ error: "NVIDIA_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          const lastMessage = messages[messages.length - 1]?.content || "";

          // ── STEP 1: Web Search ──
          send({ type: "status", content: "Mencari informasi..." });

          const searchResult = await webSearch(lastMessage);

          if (searchResult) {
            send({
              type: "tool_call",
              id: "search_1",
              tool: "web_search",
              args: { query: lastMessage },
            });
            send({
              type: "tool_result",
              id: "search_1",
              tool: "web_search",
              content: searchResult.split("\n\n").length + " hasil ditemukan",
            });
          }

          // ── STEP 2: LLM Answer (streaming) ──
          send({ type: "status", content: "Menyusun jawaban..." });

          const systemContent = searchResult
            ? `${SYSTEM_PROMPT}\n\n## Data Referensi (hasil pencarian)\n${searchResult}\n\nJawab pertanyaan user berdasarkan data di atas. Ringkas dan parafrase.`
            : SYSTEM_PROMPT;

          const conversation = [
            { role: "system", content: systemContent },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ];

          for await (const text of streamLLM(conversation)) {
            send({ type: "text", content: text });
          }

          send({ type: "done" });
        } catch (error: unknown) {
          const err = error as Error;
          send({ type: "error", content: err.message || "Terjadi kesalahan" });
          send({ type: "done" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
