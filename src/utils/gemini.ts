/**
 * Google Gemini / Claude API Service for Campus OS Note Scanner & Quick Ask
 * Auto-detects API key type and uses appropriate service
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryWithBackoff } from "./gemini-retry";
import { logDiagnostics, getUserFriendlyError } from "./gemini-health";

const GEMINI_MODEL = "gemini-2.5-flash";
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

export interface ScanNotesResult {
  summary: string;
  flashcards: Array<{ question: string; answer: string }>;
  keyPoints: string[];
}

export const MOCK_SCAN_RESULTS: ScanNotesResult = {
  summary:
    "Mock summary: Variables are containers that store data values. They have a name, type, and value. Common types include integers, strings, and booleans.",
  flashcards: [
    { question: "What is a variable?", answer: "A named container that stores a data value" },
    { question: "Name three common data types.", answer: "Integer, String, Boolean" },
  ],
  keyPoints: [
    "Variables must be declared before use",
    "Variable names should be descriptive",
    "Initialization assigns a value to a variable",
  ],
};

export const MOCK_ANSWERS: Record<string, string> = {
  default:
    "I encountered an error fetching from AI services. Using knowledge base: Try breaking this concept into simpler parts. Review your textbook chapters 3-5, then practice with sample problems.",
};

function getApiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_CLAUDE_API_KEY;
  const storedGeminiKey = localStorage.getItem("campus_gemini_key");
  const storedClaudeKey = localStorage.getItem("campus_claude_key");
  
  // Prefer Claude key if both exist, otherwise use whichever is available
  const storedKey = storedClaudeKey || storedGeminiKey;
  return storedKey || envKey || "";
}

function isClaudeKey(key: string): boolean {
  return key.startsWith("sk-");
}

function isGeminiKey(key: string): boolean {
  return key.startsWith("AIza");
}

async function scanNotesWithClaude(
  base64Image: string,
  subject: string,
  onToast?: (message: string, type: string) => void
): Promise<ScanNotesResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    onToast?.("API key not configured. Using mock data.", "info");
    return MOCK_SCAN_RESULTS;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", ""),
                },
              },
              {
                type: "text",
                text: `Analyze this note image for the subject: ${subject}. Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{
  "summary": "2-3 sentence summary",
  "flashcards": [{"question": "q1", "answer": "a1"}],
  "keyPoints": ["point1", "point2"]
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || "{}";
    const result = JSON.parse(content);
    return result as ScanNotesResult;
  } catch (error) {
    logDiagnostics("scanNotesWithClaude", "failed", null, CLAUDE_MODEL, 0);
    onToast?.(getUserFriendlyError(error), "error");
    return MOCK_SCAN_RESULTS;
  }
}

async function quickAskWithClaude(
  question: string,
  subject: string,
  onToast?: (message: string, type: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    onToast?.("API key not configured.", "info");
    return MOCK_ANSWERS.default;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Subject: ${subject}\nQuestion: ${question}\n\nProvide a concise, educational answer.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text || MOCK_ANSWERS.default;
  } catch (error) {
    logDiagnostics("quickAskWithClaude", "failed", null, CLAUDE_MODEL, 0);
    onToast?.(getUserFriendlyError(error), "error");
    return MOCK_ANSWERS.default;
  }
}

function createGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

export async function scanNotes(
  base64Image: string,
  subject = "General",
  onToast?: (message: string, type: string) => void
): Promise<ScanNotesResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    onToast?.("No API key configured. Using mock data.", "info");
    return MOCK_SCAN_RESULTS;
  }

  // Auto-detect and use Claude if Claude key is provided
  if (isClaudeKey(apiKey)) {
    return scanNotesWithClaude(base64Image, subject, onToast);
  }

  // Use Gemini for Gemini keys
  if (!isGeminiKey(apiKey)) {
    onToast?.("Invalid API key format. Using mock data.", "warning");
    return MOCK_SCAN_RESULTS;
  }

  const config = {
    maxRetries: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffFactor: 2,
    timeoutMs: 60000,
  };

  return retryWithBackoff(
    async () => {
      const genAI = createGeminiClient(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const startTime = Date.now();
      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", ""),
                },
              },
              {
                text: `Analyze this note image for subject: ${subject}. Return ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence summary",
  "flashcards": [{"question": "q", "answer": "a"}],
  "keyPoints": ["point1"]
}`,
              },
            ],
          },
        ],
      });

      const duration = Date.now() - startTime;
      const text = response.response.text();

      try {
        const result = JSON.parse(text);
        logDiagnostics("scanNotes", "success", null, GEMINI_MODEL, duration);
        return result as ScanNotesResult;
      } catch {
        logDiagnostics("scanNotes", "parsing_error", text, GEMINI_MODEL, duration);
        return MOCK_SCAN_RESULTS;
      }
    },
    "scanNotes",
    config
  ).catch((error) => {
    onToast?.(getUserFriendlyError(error), "error");
    return MOCK_SCAN_RESULTS;
  });
}

export async function quickAsk(
  question: string,
  subject = "General",
  onToast?: (message: string, type: string) => void
): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    onToast?.("No API key configured.", "info");
    return MOCK_ANSWERS.default;
  }

  // Auto-detect and use Claude if Claude key is provided
  if (isClaudeKey(apiKey)) {
    return quickAskWithClaude(question, subject, onToast);
  }

  // Use Gemini for Gemini keys
  if (!isGeminiKey(apiKey)) {
    onToast?.("Invalid API key format.", "warning");
    return MOCK_ANSWERS.default;
  }

  const config = {
    maxRetries: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffFactor: 2,
    timeoutMs: 30000,
  };

  return retryWithBackoff(
    async () => {
      const genAI = createGeminiClient(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const startTime = Date.now();
      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Subject: ${subject}\nQuestion: ${question}\n\nProvide a concise answer.`,
              },
            ],
          },
        ],
      });

      const duration = Date.now() - startTime;
      const text = response.response.text();
      logDiagnostics("quickAsk", "success", null, GEMINI_MODEL, duration);
      return text;
    },
    "quickAsk",
    config
  ).catch((error) => {
    onToast?.(getUserFriendlyError(error), "error");
    return MOCK_ANSWERS.default;
  });
}
