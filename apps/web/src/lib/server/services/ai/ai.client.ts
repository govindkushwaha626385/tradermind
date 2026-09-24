// ──────────────────────────────────────────────
// TradeMind — AI Client
//
// Unified abstraction over multiple AI providers.
// Fallback chain: Gemini 2.0 Flash Lite / Flash → Groq Llama 3.3
// Both providers are free-tier with generous limits.
// Supports: Text generation, Multi-turn Chat, and Vision (Chart analysis).
// ──────────────────────────────────────────────

export type AiProvider = 'gemini' | 'groq';

export interface AiGenerateOptions {
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiChatOptions {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiVisionOptions {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiGenerateResult {
  text: string;
  provider: AiProvider;
  tokensUsed: number;
}

// ── Gemini provider (Text) ───────────────────

async function generateWithGemini(opts: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 400,
      topP: 0.85,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const promptTokens: number = data?.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens: number = data?.usageMetadata?.candidatesTokenCount ?? 0;

    if (!text) throw new Error('Gemini returned empty response');

    return { text: text.trim(), provider: 'gemini', tokensUsed: promptTokens + outputTokens };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Gemini provider (Multi-turn Chat) ─────────

async function chatWithGemini(opts: AiChatOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = opts.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    systemInstruction: {
      parts: [{ text: opts.systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      maxOutputTokens: opts.maxOutputTokens ?? 800,
      topP: 0.85,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Chat API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const promptTokens: number = data?.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens: number = data?.usageMetadata?.candidatesTokenCount ?? 0;

    if (!text) throw new Error('Gemini chat returned empty response');

    return { text: text.trim(), provider: 'gemini', tokensUsed: promptTokens + outputTokens };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Gemini provider (Vision / Chart Analysis) ──

async function generateVisionWithGemini(opts: AiVisionOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Clean base64 if it has data URL prefix
  const cleanBase64 = opts.imageBase64.includes(',')
    ? opts.imageBase64.split(',')[1]
    : opts.imageBase64;

  const body = {
    contents: [
      {
        parts: [
          { text: opts.prompt },
          {
            inlineData: {
              mimeType: opts.mimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 1200,
      topP: 0.9,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Vision error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const promptTokens: number = data?.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens: number = data?.usageMetadata?.candidatesTokenCount ?? 0;

    if (!text) throw new Error('Gemini vision returned empty response');

    return { text: text.trim(), provider: 'gemini', tokensUsed: promptTokens + outputTokens };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Groq provider (Text Fallback) ─────────────

async function generateWithGroq(opts: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const body = {
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert trading coach and behavioral psychologist specializing in retail traders. Be concise and actionable. Respond only in valid JSON when asked.',
      },
      { role: 'user', content: opts.prompt },
    ],
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxOutputTokens ?? 400,
    top_p: 0.85,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const tokensUsed: number = data?.usage?.total_tokens ?? 0;

    if (!text) throw new Error('Groq returned empty response');

    return { text: text.trim(), provider: 'groq', tokensUsed };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Groq provider (Chat Fallback) ─────────────

async function chatWithGroq(opts: AiChatOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [
    { role: 'system', content: opts.systemPrompt },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const body = {
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages,
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.maxOutputTokens ?? 800,
    top_p: 0.85,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Chat error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const tokensUsed: number = data?.usage?.total_tokens ?? 0;

    if (!text) throw new Error('Groq returned empty response');

    return { text: text.trim(), provider: 'groq', tokensUsed };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Public: Text generation with fallback ─────

export async function aiGenerate(opts: AiGenerateOptions): Promise<AiGenerateResult | null> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateWithGemini(opts);
    } catch (err) {
      console.warn('[AI] Gemini failed, trying Groq fallback:', (err as Error).message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await generateWithGroq(opts);
    } catch (err) {
      console.warn('[AI] Groq fallback also failed:', (err as Error).message);
    }
  }

  return null;
}

// ── Public: Multi-turn Chat with fallback ─────

export async function aiChat(opts: AiChatOptions): Promise<AiGenerateResult | null> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await chatWithGemini(opts);
    } catch (err) {
      console.warn('[AI] Gemini Chat failed, trying Groq fallback:', (err as Error).message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await chatWithGroq(opts);
    } catch (err) {
      console.warn('[AI] Groq Chat fallback also failed:', (err as Error).message);
    }
  }

  return null;
}

// ── Public: Chart Image Vision Analysis ───────

export async function aiVision(opts: AiVisionOptions): Promise<AiGenerateResult | null> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateVisionWithGemini(opts);
    } catch (err) {
      console.error('[AI] Gemini Vision analysis failed:', (err as Error).message);
    }
  }

  return null;
}

/**
 * Check if at least one AI provider is configured
 */
export function isAiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}
