/**
 * Health check and diagnostic utilities for Gemini/Claude API
 * Validates API keys and provides user-friendly error messages
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface HealthCheckResult {
  isHealthy: boolean;
  apiKeyValid: boolean;
  endpointReachable: boolean;
  testPromptWorks: boolean;
  errors: string[];
  diagnostics: Record<string, any>;
}

function isClaudeKey(key: string): boolean {
  const match = key.startsWith("sk-") || key.startsWith("sk_");
  console.log("[Debug] Checking Claude key for:", key.substring(0, 10) + "...", "Result:", match);
  return match;
}

function isGeminiKey(key: string): boolean {
  const match = key.startsWith("AIza");
  console.log("[Debug] Checking Gemini key for:", key.substring(0, 10) + "...", "Result:", match);
  return match;
}

export async function performHealthCheck(apiKey: string): Promise<HealthCheckResult> {
  const errors: string[] = [];
  const diagnostics: Record<string, any> = {};

  console.log("[Debug] Health check starting with key:", apiKey.substring(0, 10) + "...");

  // Check if it's a Claude key
  if (isClaudeKey(apiKey)) {
    console.log("[Debug] Detected Claude key, format is valid");
    // Note: Cannot test Claude API from browser due to CORS restrictions
    // Just validate the key format here
    return {
      isHealthy: true,
      apiKeyValid: true,
      endpointReachable: true,  // Assume reachable, will be tested on first API call
      testPromptWorks: true,
      errors: [],
      diagnostics: { service: "Claude", note: "Will be tested on first API call" },
    };
  }

  // Validate Gemini key format
  if (!isGeminiKey(apiKey)) {
    console.log("[Debug] Invalid key format - not Claude or Gemini");
    errors.push("Invalid API key format");
    return {
      isHealthy: false,
      apiKeyValid: false,
      endpointReachable: false,
      testPromptWorks: false,
      errors,
      diagnostics: { message: "Key must start with AIza (Gemini) or sk- (Claude)" },
    };
  }

  // Test Gemini API
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: "Say 'Health check passed' in one word." }],
        },
      ],
    });

    const text = response.response.text();
    diagnostics.testResponse = text.substring(0, 50);

    return {
      isHealthy: true,
      apiKeyValid: true,
      endpointReachable: true,
      testPromptWorks: true,
      errors: [],
      diagnostics: { service: "Gemini", ...diagnostics },
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (errorMsg.includes("API key not valid")) {
      errors.push("API test failed: Invalid Gemini API key");
    } else if (errorMsg.includes("429")) {
      errors.push("API quota exceeded");
    } else if (errorMsg.includes("500") || errorMsg.includes("503")) {
      errors.push("API service temporarily unavailable");
    } else {
      errors.push("API test failed: " + errorMsg.substring(0, 100));
    }

    errors.push("NETWORK_ERROR: Unable to reach Gemini servers");

    return {
      isHealthy: false,
      apiKeyValid: false,
      endpointReachable: false,
      testPromptWorks: false,
      errors,
      diagnostics: { service: "Gemini", error: errorMsg },
    };
  }
}

export function checkApiKeyAtStartup(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_CLAUDE_API_KEY;
  const storedGeminiKey = localStorage.getItem("campus_gemini_key");
  const storedClaudeKey = localStorage.getItem("campus_claude_key");
  
  // Prefer the Claude key if both exist, otherwise use whichever is available
  const storedKey = storedClaudeKey || storedGeminiKey;
  const apiKey = storedKey || envKey;

  console.log("[Debug] checkApiKeyAtStartup - envKey exists:", !!envKey, "storedClaudeKey exists:", !!storedClaudeKey, "storedGeminiKey exists:", !!storedGeminiKey);

  if (apiKey) {
    console.log("[Campus OS] API key loaded, first 10 chars:", apiKey.substring(0, 10));
    return apiKey;
  }

  console.warn("[Campus OS] No API key configured. Using mock data mode.");
  return null;
}

export function logDiagnostics(
  operation: string,
  status: "success" | "failed" | "parsing_error",
  responseBody: string | null,
  modelUsed: string,
  duration: number
): void {
  if (import.meta.env.DEV) {
    const timestamp = new Date().toISOString();
    console.log(`[Campus OS Debug] ${timestamp}`, {
      operation,
      status,
      model: modelUsed,
      duration: `${duration}ms`,
      response: responseBody?.substring(0, 100) || "N/A",
    });
  }
}

export function getUserFriendlyError(error: any): string {
  const errorStr = error?.message || String(error);

  if (errorStr.includes("429")) {
    return "API quota exceeded. Please try again later or use a different API key.";
  }
  if (errorStr.includes("401") || errorStr.includes("not valid") || errorStr.includes("UNAUTHENTICATED")) {
    return "Invalid or expired API key. Please configure your credentials.";
  }
  if (errorStr.includes("403") || errorStr.includes("permission")) {
    return "Permission denied. Your API key may not have access to this resource.";
  }
  if (errorStr.includes("timeout") || errorStr.includes("Timeout")) {
    return "Request took too long. Please try again or check your internet connection.";
  }
  if (errorStr.includes("network") || errorStr.includes("Network") || errorStr.includes("CORS")) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (errorStr.includes("malformed")) {
    return "Invalid request format. Please try with a different note image.";
  }

  return "An error occurred. Please check your API key and try again.";
}
