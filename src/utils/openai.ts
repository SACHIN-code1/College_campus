// OpenAI ChatGPT API Service for Campus OS Note Scanner & Quick Ask

export interface ScanNotesResult {
  summary: string;
  keyPoints: string[];
  flashcards: { q: string; a: string }[];
  subject: string;
}

// Simulated High-Fidelity Data for Mock Scan Fallback
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
  "default": "Hello! I'm your Campus OS study assistant powered by ChatGPT. You can ask me anything about your courses, formulas, or hostel activities. For example: 'What is the formula of standard deviation?' or 'Give me a fast way to memorize periodic table.'",
  "gravity": "Gravity sits as an attractive force acting between any two physical masses. Near Earth's crust, it accelerates everything downwards at **g ≈ 9.8 m/s²**.",
  "react": "React is a famous component-based UI library developed by Meta. It operates using a virtual DOM, state hooks like `useState`, and renders reactive updates upon data changes.",
  "poha": "Poha is a popular Indian breakfast dish cooked from flattened rice, tempered with oil, mustard seeds, curry leaves, green chillies, turmeric, roasted peanuts, and finished with coriander and fresh lemon juice!",
  "limit": "Limits in calculus explore what a mathematical function approaches as variables draw arbitrarily close to a target coordinate."
};

/**
 * Scan Notes function using OpenAI GPT-4 Vision API or mock fallback
 */
export async function scanNotes(
  base64Image: string,
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<ScanNotesResult> {
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const localKey = localStorage.getItem("campus_openai_key");
  const apiKey = envKey || localKey || "";

  if (!apiKey) {
    onToast("Running Demo mode: Mock AI results returned.", "info");
    return new Promise(resolve => {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * MOCK_SCAN_RESULTS.length);
        resolve(MOCK_SCAN_RESULTS[randomIndex]);
      }, 1500);
    });
  }

  onToast("Calling OpenAI GPT-4 Vision API...", "info");
  
  try {
    const prompt = `You are a college study assistant. Extract all key information from these handwritten/printed notes. Return a JSON object with: { summary: string (3-4 lines), keyPoints: string[] (5-8 bullets), flashcards: [{q: string, a: string}] (5 cards), subject: string (guess the subject) }. Return ONLY the raw JSON block without formatting, markdown headers, or other text outside of the JSON parsing scope.`;

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-vision",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API returned status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";
    
    // Clean potential markdown wrap
    const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const resultObj: ScanNotesResult = JSON.parse(cleanJson);
    
    return {
      summary: resultObj.summary || "Unable to extract summary.",
      keyPoints: resultObj.keyPoints || [],
      flashcards: resultObj.flashcards || [],
      subject: resultObj.subject || "Unknown"
    };

  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    onToast(`OpenAI API Error: ${error.message || "Failed"}. Reverting to Demo mock data.`, "error");
    
    // Fallback on error to keep system demo working flawlessly
    const randomIndex = Math.floor(Math.random() * MOCK_SCAN_RESULTS.length);
    return MOCK_SCAN_RESULTS[randomIndex];
  }
}

/**
 * Quick Ask function using OpenAI ChatGPT API or mock assistant answer
 */
export async function quickAsk(
  question: string,
  subject: string,
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<string> {
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const localKey = localStorage.getItem("campus_openai_key");
  const apiKey = envKey || localKey || "";

  if (!apiKey) {
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
          const capitalizedSubject = subject ? subject : "your studies";
          match = `[Demo Response] Thank you for asking about **${question}** in context of **${capitalizedSubject}**. To fetch real-time intelligence, please configure your **OpenAI API Key** in Settings (gear icon in header). Currently running on local AI heuristics!`;
        }
        resolve(match);
      }, 1000);
    });
  }

  onToast("Consulting ChatGPT...", "info");

  try {
    const contextPrompt = subject ? `(Context: This topic falls within ${subject} course) ` : "";
    const prompt = `You are a friendly, concise senior Indian college professor and course helper. Answer this query clearly. Use bolding and short bullet points where appropriate: ${contextPrompt}${question}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API returned status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response received.";

  } catch (error: any) {
    console.error("OpenAI Quick Ask Error:", error);
    onToast(`AI Connection Error: ${error.message || "Failed"}. Displaying helper answer.`, "error");
    
    return `[Local Help Error Fallback] Unable to contact the live ChatGPT server. This may be due to CORS restrictions or a missing API Key. 

Here is some general advice on **${question}**: 
- Refer to textbooks recommended by your professor.
- Check previous years' question papers (PYQs).
- Practice derivation sequences manually twice in your study notebook.`;
  }
}
