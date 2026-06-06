/**
 * Gemini API Health Check & Diagnostic Utility
 * Verifies API key, endpoint connectivity, and basic functionality
 */

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

interface HealthCheckResult {
  isHealthy: boolean;
  apiKeyValid: boolean;
  endpointReachable: boolean;
  testPromptWorks: boolean;
  errors: string[];
  diagnostics: {
    apiKeyLength: number;
    apiKeyPrefix: string;
    timestamp: string;
    modelUsed: string;
  };
}

const DEBUG = process.env.NODE_ENV === "development";

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Gemini Health] ${message}`, data || "");
  }
}

function error(message: string, data?: any) {
  console.error(`[Gemini Health ERROR] ${message}`, data || "");
}

/**
 * Validates API key format
 */
function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey && apiKey.length > 10 && !apiKey.includes(" ");
}

/**
 * Comprehensive health check
 */
export async function performHealthCheck(apiKey: string): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    isHealthy: false,
    apiKeyValid: false,
    endpointReachable: false,
    testPromptWorks: false,
    errors: [],
    diagnostics: {
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : "NONE",
      timestamp: new Date().toISOString(),
      modelUsed: "gemini-2.5-flash"
    }
  };

  // Check 1: API Key exists
  if (!apiKey) {
    result.errors.push("API key is missing or empty");
    error("API key validation failed: key is missing");
    return result;
  }

  // Check 2: API Key format
  if (!isValidApiKeyFormat(apiKey)) {
    result.errors.push("API key format appears invalid");
    error("API key validation failed: invalid format");
    return result;
  }

  result.apiKeyValid = true;
  log("✓ API key validation passed");

  // Check 3: Test API connectivity
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    log("✓ GoogleGenerativeAI instance created");

    // Try a simple text-only request first (to verify connectivity without using vision)
    const content = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Say 'healthy' if you can read this. Reply with exactly one word."
            }
          ]
        }
      ]
    });

    const response = content.response.text();
    log("✓ Test prompt succeeded:", response);

    if (response && response.length > 0) {
      result.endpointReachable = true;
      result.testPromptWorks = true;
      result.isHealthy = true;
    } else {
      result.errors.push("API responded with empty content");
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    result.errors.push(`API test failed: ${errorMsg}`);
    error("Health check failed during test prompt:", err);
    
    // Try to detect specific error types
    if (errorMsg.includes("429")) {
      result.errors.push("QUOTA_EXCEEDED: You have exceeded your API quota");
    } else if (errorMsg.includes("401") || errorMsg.includes("invalid")) {
      result.errors.push("INVALID_API_KEY: Your API key is not valid");
    } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
      result.errors.push("NETWORK_ERROR: Unable to reach Gemini servers");
    } else if (errorMsg.includes("CORS")) {
      result.errors.push("CORS_ERROR: Cross-origin request blocked");
    }
  }

  return result;
}

/**
 * Check if API key is configured at startup
 */
export function checkApiKeyAtStartup(): string | null {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const localKey = localStorage.getItem("campus_gemini_key");
  const apiKey = envKey || localKey;

  if (!apiKey) {
    error("No Gemini API key found in environment or localStorage");
    return null;
  }

  log("✓ API key loaded from", envKey ? "environment" : "localStorage");
  return apiKey;
}

/**
 * Log detailed diagnostics
 */
export function logDiagnostics(
  operation: string,
  status: number,
  responseBody: any,
  modelUsed: string,
  duration: number
) {
  if (!DEBUG) return;

  console.log(`[Gemini Diagnostics]`, {
    operation,
    status,
    model: modelUsed,
    responseBodyPreview:
      typeof responseBody === "string"
        ? responseBody.substring(0, 200)
        : JSON.stringify(responseBody).substring(0, 200),
    durationMs: duration,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get user-friendly error message from error
 */
export function getUserFriendlyError(error: any): string {
  const message = error?.message || String(error);

  if (message.includes("429")) {
    return "Your API quota has been exceeded. Please check your billing and wait before retrying.";
  } else if (message.includes("401") || message.includes("UNAUTHENTICATED")) {
    return "Invalid API key. Please verify your Gemini API key in settings.";
  } else if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
    return "You don't have permission to use this API. Please check your Google Cloud project settings.";
  } else if (message.includes("timeout")) {
    return "Request timed out. The Gemini servers are taking too long to respond. Please try again.";
  } else if (message.includes("network") || message.includes("fetch")) {
    return "Network error: Unable to reach Gemini servers. Check your internet connection.";
  } else if (message.includes("CORS")) {
    return "Cross-origin error. This may indicate a proxy or configuration issue.";
  } else if (message.includes("malformed")) {
    return "The response from Gemini was invalid. Please try again.";
  } else if (message.includes("quota")) {
    return "API quota exceeded. Please upgrade your plan or wait for quota reset.";
  }

  return `AI Error: ${message}. Please try again later.`;
}
