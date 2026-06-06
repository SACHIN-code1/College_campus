import React, { useState, useEffect } from "react";
import { Cpu, Camera, Send, Settings, BookOpen, ChevronLeft, ChevronRight, Bookmark, Sparkles, HelpCircle, FileText, CheckCircle2 } from "lucide-react";
import { storage, FlashcardSet, Flashcard } from "../utils/storage";
import { scanNotes, quickAsk, ScanNotesResult } from "../utils/gemini";
import { checkApiKeyAtStartup, performHealthCheck } from "../utils/gemini-health";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
}

export const AIScan: React.FC = () => {
  const { toast } = useToast();
  
  // Tab Mode
  const [activeMode, setActiveMode] = useState<"Scanner" | "Ask">("Scanner");

  // Key Settings Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [localApiKey, setLocalApiKey] = useState("");

  // Saved Decks
  const [savedDecks, setSavedDecks] = useState<FlashcardSet[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardSet | null>(null);

  // Note Scanner States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [scanResult, setScanResult] = useState<ScanNotesResult | null>(null);
  const [scannerResultTab, setScannerResultTab] = useState<"Summary" | "KeyPoints" | "Flashcards">("Summary");
  
  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Quick Ask States
  const [chatSubject, setChatSubject] = useState("Machine Learning");
  const [userQuery, setUserQuery] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Check API key at startup
    const apiKey = checkApiKeyAtStartup();
    if (apiKey) {
      // Perform health check in background (silent)
      performHealthCheck(apiKey).then(result => {
        if (!result.isHealthy) {
          console.warn("[Campus OS] Health check failed:", result.errors);
        }
      }).catch(() => {
        // Silently handle health check errors
      });
    }

    // Load saved API keys
    const storedGeminiKey = localStorage.getItem("campus_gemini_key") || "";
    const storedClaudeKey = localStorage.getItem("campus_claude_key") || "";
    setLocalApiKey(storedGeminiKey || storedClaudeKey);

    // Initial saved decks
    const loadedDecks = storage.get<FlashcardSet[]>("campus_flashcards", []);
    setSavedDecks(loadedDecks);

    // Seed chat greeting if history starts empty
    setChatHistory([
      {
        sender: "assistant",
        text: "Hey! I'm your PWA virtual helper powered by Google Gemini. Ask me any doubts, math calculations, or exam preparations. Select a subject below to ground my answering context!"
      }
    ]);
  }, []);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = localApiKey.trim();
    
    // Auto-detect and save to appropriate storage key
    if (trimmedKey.startsWith("sk-")) {
      localStorage.setItem("campus_claude_key", trimmedKey);
    } else {
      localStorage.setItem("campus_gemini_key", trimmedKey);
    }
    
    toast(trimmedKey ? "API key stored locally!" : "API key removed from local storage.", "success");
    setIsKeyModalOpen(false);
  };

  // Convert File Input to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setScanResult(null); // Clear previous results
      setActiveDeck(null); // Clear active deck viewer
    };
    reader.readAsDataURL(file);
  };

  const handleScanTrigger = async () => {
    if (!selectedImage) return;
    setIsLoadingScan(true);

    try {
      const resultObj = await scanNotes(selectedImage, toast);
      setScanResult(resultObj);
      setScannerResultTab("Summary");
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setNewDeckName(`${resultObj.subject} Prep Set`);
      toast("AI Scan Successful!", "success");
    } catch (e: any) {
      toast("Failed to process scan correctly.", "error");
    } finally {
      setIsLoadingScan(false);
    }
  };

  const handleSaveFlashcards = () => {
    if (!scanResult) return;
    
    const deckTitle = newDeckName.trim();
    if (!deckTitle) {
      toast("Please enter a valid name for your flashcards.", "error");
      return;
    }

    const newDeck: FlashcardSet = {
      id: `deck-${Date.now()}`,
      name: deckTitle,
      subject: scanResult.subject,
      summary: scanResult.summary,
      keyPoints: scanResult.keyPoints,
      flashcards: scanResult.flashcards,
      date: new Date().toISOString().split("T")[0]
    };

    const nextDecks = [...savedDecks, newDeck];
    setSavedDecks(nextDecks);
    storage.set("campus_flashcards", nextDecks);
    toast("Study deck saved inside Local Storage!", "success");
    setIsSavingDeck(false);
  };

  const handleSelectDeck = (deck: FlashcardSet) => {
    setActiveDeck(deck);
    setScanResult({
      subject: deck.subject,
      summary: deck.summary,
      keyPoints: deck.keyPoints,
      flashcards: deck.flashcards
    });
    setScannerResultTab("Flashcards");
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleQuickAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = userQuery.trim();
    if (!query) return;

    setUserQuery("");
    setChatHistory(prev => [...prev, { sender: "user", text: query }]);
    setIsGeneratingAnswer(true);

    try {
      const answer = await quickAsk(query, chatSubject, toast);
      setChatHistory(prev => [...prev, { sender: "assistant", text: answer }]);
    } catch (err) {
      toast("Unable to complete prompt response.", "error");
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  const handleDeleteSavedDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = savedDecks.filter(t => t.id !== id);
    setSavedDecks(nextSaved);
    storage.set("campus_flashcards", nextSaved);
    toast("Flashcard deck deleted.", "error");
    if (activeDeck && activeDeck.id === id) {
      setActiveDeck(null);
      setScanResult(null);
    }
  };

  // Helper custom regex formatter to parse basic markdown bold and list elements safely
  const formatMarkdown = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let isBullet = false;
      let cleanLine = line;
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        isBullet = true;
        cleanLine = line.trim().substring(2);
      }

      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const parsedText = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} style={{ color: "var(--accent)" }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="ai-bullet">
            <span className="ai-bullet-icon">•</span>
            <span>{parsedText}</span>
          </div>
        );
      }

      return (
        <p key={idx} style={{ margin: "0 0 6px 0", minHeight: "6px" }}>
          {parsedText}
        </p>
      );
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App Header */}
      <div className="app-header" id="ai-scan-header">
        <h1 className="logo-text" style={{ fontSize: "1.4rem" }}>AI Study PWA</h1>
        <button 
          className="header-action-btn"
          onClick={() => setIsKeyModalOpen(true)}
          style={{ width: "36px", height: "36px", color: localApiKey ? "var(--accent)" : "var(--text2)" }}
          id="btn-settings-api-key"
          title="Configure API Credentials"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="page-content bg-base">
        {/* Mode Selector Tabs */}
        <div className="mode-tabs" id="ai-tab-selectors">
          <div 
            className={`mode-tab ${activeMode === "Scanner" ? "active" : ""}`}
            onClick={() => setActiveMode("Scanner")}
            id="scanner-mode-tab"
          >
            Note Scanner
          </div>
          <div 
            className={`mode-tab ${activeMode === "Ask" ? "active" : ""}`}
            onClick={() => setActiveMode("Ask")}
            id="ask-mode-tab"
          >
            Quick Ask Chat
          </div>
        </div>

        {activeMode === "Scanner" ? (
          <div>
            {/* LARGE CAMERA / UPLOAD FILE INTERACTION */}
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <input
                type="file"
                id="camera-photo-input"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <label htmlFor="camera-photo-input" style={{ width: "100%" }}>
                <div className="scanner-box" id="scanner-interaction-box">
                  {selectedImage ? (
                    <img 
                      src={selectedImage} 
                      alt="Captured notes preview" 
                      className="image-preview" 
                      id="loaded-image-preview"
                    />
                  ) : (
                    <>
                      <div 
                        style={{ 
                          width: "56px", 
                          height: "56px", 
                          backgroundColor: "var(--bg3)", 
                          borderRadius: "50%", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          color: "var(--accent)",
                          boxShadow: "0 0 15px rgba(255, 214, 0, 0.1)"
                        }}
                      >
                        <Camera size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>Upload Notes Image</h4>
                        <p style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: "4px" }}>
                          Take picture of whiteboard / lectures
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* ACTION TRIGGERS */}
            {selectedImage && !isLoadingScan && !scanResult && (
              <button 
                className="btn-primary" 
                onClick={handleScanTrigger}
                style={{ marginBottom: "16px" }}
                id="btn-trigger-ai-scan-action"
              >
                Scan with Gemini
              </button>
            )}

            {/* LOADING STATE */}
            {isLoadingScan && (
              <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                <LoadingSpinner message="Gemini is analyzing your notes. Generating summary & flashcard decks..." />
              </div>
            )}

            {/* RESULTS VIEW */}
            {scanResult && !isLoadingScan && (
              <div 
                style={{ 
                  background: "var(--bg2)", 
                  border: "1px solid var(--border)", 
                  borderRadius: "14px", 
                  padding: "16px",
                  marginBottom: "20px"
                }}
                id="ai-results-block-root"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", background: "var(--accent)", color: "#000", padding: "2px 8px", borderRadius: "10px", fontWeight: 800 }}>
                    {scanResult.subject || "Study Subject"}
                  </span>
                  
                  {!activeDeck && (
                    <button
                      onClick={() => setIsSavingDeck(true)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      id="save-study-deck-button"
                    >
                      <Bookmark size={12} /> Save Set
                    </button>
                  )}
                </div>

                {/* Sub Tab selection between summary/key points/flashcards */}
                <div className="results-tabs">
                  <div 
                    className={`results-tab ${scannerResultTab === "Summary" ? "active" : ""}`}
                    onClick={() => setScannerResultTab("Summary")}
                    id="results-tab-summary"
                  >
                    Summary
                  </div>
                  <div 
                    className={`results-tab ${scannerResultTab === "KeyPoints" ? "active" : ""}`}
                    onClick={() => setScannerResultTab("KeyPoints")}
                    id="results-tab-points"
                  >
                    Key Points
                  </div>
                  <div 
                    className={`results-tab ${scannerResultTab === "Flashcards" ? "active" : ""}`}
                    onClick={() => setScannerResultTab("Flashcards")}
                    id="results-tab-flash"
                  >
                    Flashcards
                  </div>
                </div>

                <div className="ai-results-container" id="results-tab-body">
                  {scannerResultTab === "Summary" && (
                    <div className="ai-summary-text">
                      {formatMarkdown(scanResult.summary)}
                    </div>
                  )}

                  {scannerResultTab === "KeyPoints" && (
                    <div>
                      {scanResult.keyPoints.map((point, idx) => (
                        <div key={idx} className="ai-bullet">
                          <span className="ai-bullet-icon">✦</span>
                          <span style={{ fontSize: "0.9rem", color: "var(--text)" }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {scannerResultTab === "Flashcards" && (
                    <div className="flashcard-viewer" id="interactive-flashcards-box">
                      {scanResult.flashcards.length > 0 ? (
                        <>
                          <div 
                            className={`flashcard-container ${isFlipped ? "flipped" : ""}`}
                            onClick={() => setIsFlipped(!isFlipped)}
                            id="active-flashcard-tap-container"
                          >
                            <div className="flashcard-inner">
                              <div className="flashcard-front">
                                <span className="flashcard-label">Question {currentCardIndex + 1} of {scanResult.flashcards.length}</span>
                                <div className="flashcard-text">{scanResult.flashcards[currentCardIndex].q}</div>
                                <span style={{ fontSize: "0.7rem", color: "var(--text2)", marginTop: "14px", fontStyle: "italic" }}>Tap to flip</span>
                              </div>
                              <div className="flashcard-back">
                                <span className="flashcard-label" style={{ color: "var(--border)" }}>Answer Explanation</span>
                                <div className="flashcard-text" style={{ color: "var(--accent)" }}>{scanResult.flashcards[currentCardIndex].a}</div>
                                <span style={{ fontSize: "0.7rem", color: "rgba(255,214,0,0.5)", marginTop: "14px", fontStyle: "italic" }}>Tap to show question</span>
                              </div>
                            </div>
                          </div>

                          <div className="flashcard-controls">
                            <button
                              className="flashcard-btn"
                              onClick={() => {
                                setIsFlipped(false);
                                setTimeout(() => {
                                  setCurrentCardIndex(prev => Math.max(0, prev - 1));
                                }, 150);
                              }}
                              disabled={currentCardIndex === 0}
                              style={{ opacity: currentCardIndex === 0 ? 0.3 : 1 }}
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <span style={{ fontSize: "0.85rem", color: "var(--text2)", fontWeight: 700 }}>
                              {currentCardIndex + 1} / {scanResult.flashcards.length}
                            </span>
                            <button
                              className="flashcard-btn"
                              onClick={() => {
                                setIsFlipped(false);
                                setTimeout(() => {
                                  setCurrentCardIndex(prev => Math.min(scanResult.flashcards.length - 1, prev + 1));
                                }, 150);
                              }}
                              disabled={currentCardIndex === scanResult.flashcards.length - 1}
                              style={{ opacity: currentCardIndex === scanResult.flashcards.length - 1 ? 0.3 : 1 }}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <p style={{ color: "var(--text2)", textAlign: "center" }}>No flashcards parsed.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SAVED REVISION FLASHCARDS LIST */}
            <div style={{ marginTop: "24px" }} id="saved-decks-section">
              <h4 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <BookOpen size={16} style={{ color: "var(--accent)" }} />
                <span>Saved Revision Decks</span>
              </h4>

              {savedDecks.length === 0 ? (
                <EmptyState
                  icon={<FileText size={36} style={{ color: "var(--border)" }} />}
                  title="No Decks Saved"
                  description="Scan notes with Claude AI or use simulated mode to extract custom question checklists."
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {savedDecks.map(deck => {
                    const isGroupSelected = activeDeck?.id === deck.id;
                    return (
                      <div
                        key={deck.id}
                        className="card-base"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          backgroundColor: "var(--bg2)",
                          borderLeft: isGroupSelected ? "3px solid var(--accent)" : "1px solid var(--border)"
                        }}
                        onClick={() => handleSelectDeck(deck)}
                        id={`saved-deck-row-${deck.id}`}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: isGroupSelected ? "var(--accent)" : "var(--text)" }}>{deck.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text2)", marginTop: "2px" }}>
                            {deck.subject} Course | {deck.flashcards.length} revision cards
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSavedDeck(deck.id, e)}
                          id={`delete-deck-${deck.id}`}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--border)",
                            cursor: "pointer",
                            padding: "6px"
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* QUICK ASK AI CHAT ASSISTANT */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Subject grounded selection combobox */}
            <div className="form-group" style={{ marginBottom: "6px" }}>
              <label className="form-label">Active Course Context</label>
              <select
                value={chatSubject}
                onChange={(e) => setChatSubject(e.target.value)}
                className="form-select"
                id="chat-subject-combobox"
              >
                <option value="Machine Learning">💡 Machine Learning</option>
                <option value="Computer Networks">🌐 Computer Networks</option>
                <option value="Compiler Design">⚙️ Compiler Design</option>
                <option value="Mathematics">🔢 Mathematics / Calculus</option>
                <option value="Chemistry">🔬 Applied Chemistry</option>
                <option value="Hostel Life">🏡 Hostel Rules / Other</option>
              </select>
            </div>

            {/* Chat message journal window */}
            <div className="chat-window card-base" id="ai-chat-conversation-container">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.sender}`} id={`chat-bubble-${i}`}>
                  {msg.sender === "assistant" ? (
                    <div className="chat-bubble-markdown">
                      {formatMarkdown(msg.text)}
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              ))}
              {isGeneratingAnswer && (
                <div className="chat-bubble assistant" style={{ background: "transparent", border: "none" }} id="assistant-typing-pulse">
                  <div style={{ display: "flex", gap: "4px" }}>
                    <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></div>
                    <span style={{ fontSize: "0.78rem", color: "var(--text2)" }}>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input submitting region */}
            <form onSubmit={handleQuickAskSubmit} className="chat-input-row" id="quick-ask-chat-box">
              <input
                type="text"
                placeholder="Ask anything about your syllabus..."
                className="form-input"
                style={{ padding: "12px 14px", fontSize: "0.9rem" }}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                disabled={isGeneratingAnswer}
                id="query-text-input-field"
                required
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "48px", height: "48px", flexShrink: 0, padding: 0, display: "flex", alignItems: "center", justifySettle: "center", justifyContent: "center" }}
                disabled={isGeneratingAnswer}
                id="submit-question-trigger"
              >
                <Send size={18} style={{ color: "#000" }} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Save Deck Dialogue Modal */}
      <Modal isOpen={isSavingDeck} onClose={() => setIsSavingDeck(false)} title="Name Study Deck">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label">Revision Deck Name</label>
            <input
              type="text"
              className="form-input"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="e.g. ML Midsem Prep Cards"
              id="new-deck-name-input"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsSavingDeck(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveFlashcards}
              id="confirm-deck-save-cta"
            >
              Save Revision Deck
            </button>
          </div>
        </div>
      </Modal>

      {/* Discrete Local API Key Setting Drawer */}
      <Modal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} title="Google Gemini API Credentials">
        <form onSubmit={handleSaveApiKey} style={{ display: "flex", flexDirection: "column", gap: "14px" }} id="api-key-config-form">
          <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.4 }} id="api-settings-info-blurb">
            This PWA uses Google Gemini API. Your API key is stored securely in your browser's local storage only. Never shared with external servers.
          </p>

          <div className="form-group">
            <label className="form-label">Gemini API Key</label>
            <input
              type="password"
              placeholder="AIza..."
              className="form-input"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              id="settings-api-key-value-input"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setIsKeyModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 1 }}
              id="confirm-save-api-key"
            >
              Save Credentials
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
