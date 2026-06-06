/**
 * Google Gemini API Service for Campus OS Note Scanner & Quick Ask
 * Uses official @google/generative-ai SDK with robust error handling and retry logic
 */

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { retryWithBackoff } from "./gemini-retry";
import { logDiagnostics, getUserFriendlyError } from "./gemini-health";

export interface ScanNotesResult {
  summary: string;
  keyPoints: string[];
  flashcards: { q: string; a: string }[];
  subject: string;
}

const MODEL = "gemini-2.5-flash";
const DEBUG = process.env.NODE_ENV === "development";

// Mock data fallback
const MOCK_SCAN_RESULTS: ScanNotesResult[] = [
  {
    subject: "Chemistry",
    summary: "Experimental details of Acid-Base Titration. Explains the determination of unknown concentration using standard solution (NaOH) and Phenolphthalein indicator.",
    keyPoints: [
      "Titration is a quantitative chemical analysis method to calculate unknown concentrations.",
      "The equivalence point is reached when the moles of acid equal the moles of base.",
      "Phenolphthalein starts colorless in acid and turns pale pink at the endpoint (neutral/light basic).",
      "Standard solution of known concentration (titrant) is added gradually from a burette.",
      "Meniscus must be read at eye level from the bottom of the curve."
    ],
    flashcards: [
      { q: "What is the endpoint of a titration?", a: "The physical point where the indicator changes color permanently." },
      { q: "Why is an indicator used?", a: "To visually detect when the reaction has run to completion (equivalence point)." },
      { q: "What is titrant?", a: "A solution of known concentration that is added incrementally from a burette." },
      { q: "What is the color of Phenolphthalein in basic solution?", a: "Bright pink / magenta color." },
      { q: "How is molarity calculated from titration?", a: "Using the formula M1 * V1 * n1 = M2 * V2 * n2." }
    ]
  },
  {
    subject: "Physics",
    summary: "Summary of Newton's Laws of Motion and mechanical equations. Specifically details inertia, force vectors, action-reaction pairs, and projectile kinematics.",
    keyPoints: [
      "First Law (Inertia): Bodies maintain uniform state of rest/motion unless acted on by external force.",
      "Second Law: Force equals mass times acceleration (F = ma). Net force drives kinetic change.",
      "Third Law: For every active force, there is an equal and opposite reactive force.",
      "Frictional resistance always combats the sliding direction vector of relative motion.",
      "Kinematic equations assume constant gravity acceleration (g = 9.8 m/s²)."
    ],
    flashcards: [
      { q: "What is Inertia?", a: "The inherent tendency of matter to resist any change in its velocity." },
      { q: "What is the SI unit of Force?", a: "Newton (N), equivalent to kg·m/s²." },
      { q: "Does a reaction force cancel an action force?", a: "No, because they act on different objects." },
      { q: "Define Static Friction", a: "The friction that keeps an object at rest and matches applied force up to a maximum threshold." },
      { q: "State the equation for projectile height", a: "y = v0*t*sin(theta) - 0.5*g*t²." }
    ]
  },
  {
    subject: "Computer Science",
    summary: "Overview of Binary Search Trees (BST). Examines structure constraints, pre/in/post-order traversal sequences, and search time complexity bounds.",
    keyPoints: [
      "Every node in a BST holds a key larger than its left subtree and smaller than its right subtree.",
      "In-order traversal produces keys in strictly sorted ascending order.",
      "Average time complexity of search, insertion, and deletion is O(log n).",
      "Skewed tree structures degrade search time complexity to a linear time O(n).",
      "Balanced trees (like AVL or Red-Black) prevent path skewing imbalances."
    ],
    flashcards: [
      { q: "What is the search complexity of a balanced BST?", a: "O(log n) average time complexity." },
      { q: "Which traversal prints a BST in sorted order?", a: "In-order traversal (Left, Root, Right)." },
      { q: "What makes a tree 'skewed'?", a: "When nodes contain only one child, forming essentially a single linked list chain." },
      { q: "Name a self-balancing binary search tree.", a: "AVL Tree or Red-Black Tree." },
      { q: "What is the maximum number of children for a BST node?", a: "Two children (hence 'binary')." }
    ]
  }
];

const MOCK_ANSWERS: { [keyword: string]: string } = {
  "default": "Hello! I'm your Campus OS study assistant powered by Google Gemini. You can ask me anything about your courses, formulas, or hostel activities.",
  "gravity": "Gravity is an attractive force between masses. Near Earth, it accelerates at **g ≈ 9.8 m/s²**.",
  "react": "React is a component-based UI library using virtual DOM and hooks.",
  "poha": "Poha is a popular Indian breakfast made from flattened rice, tempered with mustard seeds and spices.",
  "limit": "Limits in calculus explore function behavior near target values."
};

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Gemini API] ${message}`, data || "");
  }
}

function error(message: string, data?: any) {
  console.error(`[Gemini API ERROR] ${message}`, data || "");
}

/**
 * Get API key from environment or localStorage
 */
function getApiKey(): string | null {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const localKey = localStorage.getItem("campus_gemini_key");
  return envKey || localKey;
}

/**
 * Create Gemini client with proper error handling
 */
function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    log("✓ Gemini client created successfully");
    return client;
  } catch (err: any) {
    error("Failed to create Gemini client:", err);
    throw new Error(`Failed to initialize Gemini: ${err?.message}`);
  }
}

/**
 * Scan notes using Gemini vision API
 */
export async function scanNotes(
  base64Image: string,
  onToast: (msg: string, type: "success" | "error" | "info") => void
): Promise<ScanNotesResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    log("No API key found, using demo mode");
    onToast("Running Demo mode: Mock AI results returned.", "info");
    return new Promise(resolve => {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * MOCK_SCAN_RESULTS.length);
        resolve(MOCK_SCAN_RESULTS[randomIndex]);
      }, 1500);
    });
  }

  const prompt = `You are a college study assistant. Extract all key information from these handwritten/printed notes. Return a JSON object with: { summary: string (3-4 lines), keyPoints: string[] (5-8 bullets), flashcards: [{q: string, a: string}] (5 cards), subject: string (guess the subject) }. Return ONLY the raw JSON block without formatting, markdown headers, or other text outside of the JSON parsing scope.`;

  return retryWithBackoff(
    async (signal: AbortSignal) => {
      const startTime = Date.now();
      log("Starting note scan with Gemini...");

      try {
        const client = createGeminiClient(apiKey);
        const model = client.getGenerativeModel({
          model: MODEL,
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
              threshold: HarmBlockThreshold.BLOCK_NONE
            }
          ]
        });

        // Clean base64
        const cleanBase64 = base64Image.replace(
          /^data:image\/(png|jpeg|jpg);base64,/,
          ""
        );

        onToast("Analyzing notes with Gemini...", "info");

        const response = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: cleanBase64
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ]
        });

        const duration = Date.now() - startTime;
        const rawText = response.response.text();

        logDiagnostics("scanNotes", 200, rawText, MODEL, duration);
        log("✓ Note scan completed successfully");

        // Parse JSON response
        const cleanJson = rawText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        try {
          const resultObj: ScanNotesResult = JSON.parse(cleanJson);

          return {
            summary: resultObj.summary || "Unable to extract summary.",
            keyPoints: resultObj.keyPoints || [],
            flashcards: resultObj.flashcards || [],
            subject: resultObj.subject || "Unknown"
          };
        } catch (parseErr: any) {
          error("Failed to parse Gemini JSON response:", parseErr);
          throw new Error(
            `Invalid Gemini response format: ${parseErr?.message}`
          );
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        logDiagnostics("scanNotes", err?.status || 0, err?.message, MODEL, duration);
        throw err;
      }
    },
    "Note Scan",
    { timeoutMs: 60000 } // 60 seconds for image processing
  )
    .then(result => {
      onToast("✓ AI Scan Successful!", "success");
      return result;
    })
    .catch(err => {
      const userFriendlyMsg = getUserFriendlyError(err);
      error("Note scan failed:", err);
      onToast(userFriendlyMsg, "error");

      // Fallback to mock data
      log("Falling back to mock data");
      const randomIndex = Math.floor(Math.random() * MOCK_SCAN_RESULTS.length);
      return MOCK_SCAN_RESULTS[randomIndex];
    });
}

/**
 * Quick ask using Gemini text API
 */
export async function quickAsk(
  question: string,
  subject: string,
  onToast: (msg: string, type: "success" | "error" | "info") => void
): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    log("No API key found, using demo mode");
    return new Promise(resolve => {
      setTimeout(() => {
        const qLower = question.toLowerCase();
        let match = MOCK_ANSWERS["default"];
        for (const [key, answer] of Object.entries(MOCK_ANSWERS)) {
          if (qLower.includes(key) && key !== "default") {
            match = answer;
            break;
          }
        }
        if (match === MOCK_ANSWERS["default"]) {
          const capitalizedSubject = subject || "your studies";
          match = `[Demo] Answering about **${question}** in **${capitalizedSubject}**. Configure your Gemini API Key in settings to enable live responses.`;
        }
        resolve(match);
      }, 1000);
    });
  }

  const contextPrompt = subject
    ? `(Context: This topic falls within ${subject} course) `
    : "";
  const prompt = `You are a friendly, concise senior Indian college professor and course helper. Answer this query clearly. Use bolding and short bullet points where appropriate: ${contextPrompt}${question}`;

  return retryWithBackoff(
    async (signal: AbortSignal) => {
      const startTime = Date.now();
      log("Starting quick ask with Gemini...");

      try {
        const client = createGeminiClient(apiKey);
        const model = client.getGenerativeModel({ model: MODEL });

        onToast("Consulting Gemini...", "info");

        const response = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        });

        const duration = Date.now() - startTime;
        const answer = response.response.text();

        logDiagnostics("quickAsk", 200, answer, MODEL, duration);
        log("✓ Quick ask completed successfully");

        return answer || "No response received.";
      } catch (err: any) {
        const duration = Date.now() - startTime;
        logDiagnostics("quickAsk", err?.status || 0, err?.message, MODEL, duration);
        throw err;
      }
    },
    "Quick Ask",
    { timeoutMs: 30000 } // 30 seconds for text generation
  )
    .then(result => {
      log("✓ Quick ask successful");
      return result;
    })
    .catch(err => {
      const userFriendlyMsg = getUserFriendlyError(err);
      error("Quick ask failed:", err);
      onToast(userFriendlyMsg, "error");

      // Fallback helper response
      return `I encountered an error answering your question. Here's some general advice on **${question}**: 
- Refer to textbooks recommended by your professor
- Check previous years' question papers (PYQs)  
- Practice concepts manually twice in your study notebook`;
    });
}
