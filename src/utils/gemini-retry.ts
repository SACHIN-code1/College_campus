/**
 * Retry Logic with Exponential Backoff
 * Handles transient failures intelligently
 */

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  timeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffFactor: 2,
  timeoutMs: 30000 // 30 second timeout
};

const DEBUG = process.env.NODE_ENV === "development";

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Retry Logic] ${message}`, data || "");
  }
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  const message = (error?.message || String(error)).toLowerCase();

  // DO NOT RETRY these errors
  const NON_RETRYABLE = [
    "401", // Invalid API key
    "403", // Permission denied
    "invalid api key",
    "unauthenticated",
    "permission_denied",
    "malformed",
    "json"
  ];

  for (const nonRetryable of NON_RETRYABLE) {
    if (message.includes(nonRetryable)) {
      log(`✗ Non-retryable error detected: ${nonRetryable}`);
      return false;
    }
  }

  // RETRY these errors
  const RETRYABLE = ["429", "500", "502", "503", "timeout", "network", "econnreset", "etimedout"];

  for (const retryable of RETRYABLE) {
    if (message.includes(retryable)) {
      log(`✓ Retryable error detected: ${retryable}`);
      return true;
    }
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffFactor, attemptNumber),
    config.maxDelayMs
  );
  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  operationName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, fullConfig.timeoutMs);

    try {
      log(`[Attempt ${attempt + 1}/${fullConfig.maxRetries + 1}] ${operationName}...`);
      const result = await operation(abortController.signal);
      clearTimeout(timeoutId);
      log(`✓ ${operationName} succeeded on attempt ${attempt + 1}`);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const errorMessage =
        error?.message || error?.error?.message || String(error);

      if (!isRetryableError(error)) {
        log(`✗ Non-retryable error (${errorMessage}), giving up`);
        throw error;
      }

      if (attempt === fullConfig.maxRetries) {
        log(`✗ Max retries (${fullConfig.maxRetries}) exceeded`);
        throw error;
      }

      const delayMs = calculateBackoffDelay(attempt, fullConfig);
      log(
        `⚠ ${operationName} failed (${errorMessage}), retrying in ${delayMs}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Create an AbortSignal with timeout
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}
