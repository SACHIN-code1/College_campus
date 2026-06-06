import React, { useState, useEffect, useRef } from "react";
import { Utensils, Star, ThumbsUp, ThumbsDown, Edit2, Clock, Check } from "lucide-react";
import { storage, MessMenu, DayMessMenu, MealSlot } from "../utils/storage";
import { useToast } from "../components/Toast";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL: { [key: string]: string } = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday"
};

interface SlotConfig {
  key: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  time: string;
  emoji: string;
}

const SLOTS_CONFIG: SlotConfig[] = [
  { key: "Breakfast", time: "7:30 - 9:00 AM", emoji: "🍳" },
  { key: "Lunch", time: "12:30 - 2:30 PM", emoji: "🍱" },
  { key: "Snacks", time: "5:00 - 6:00 PM", emoji: "☕" },
  { key: "Dinner", time: "7:30 - 9:30 PM", emoji: "🍛" }
];

export const MessMenuComponent: React.FC = () => {
  const { toast } = jestToastHack(); // Safeguard import or custom toast fetch
  const { toast: mainToast } = useToast();
  const [menu, setMenu] = useState<MessMenu>({});
  const [selectedDay, setSelectedDay] = useState<string>("Mon");
  const [editingSlot, setEditingSlot] = useState<string | null>(null); // e.g. "Lunch" or null
  const [editValue, setEditValue] = useState("");

  const dayStripRef = useRef<HTMLDivElement>(null);

  // Fallback if useToast not fully loaded
  function jestToastHack() {
    try { return { toast: mainToast }; } catch { return { toast: (m: string) => console.log(m) }; }
  }

  // Get current actual day name
  const dayIndex = new Date().getDay(); // 0 Sun, 1 Mon...
  const todayDayName = dayIndex === 0 ? "Mon" : WEEKDAYS[dayIndex - 1];

  useEffect(() => {
    const loaded = storage.get<MessMenu>("campus_mess", {});
    setMenu(loaded);

    setSelectedDay(todayDayName);

    // Auto-scroll to today
    setTimeout(() => {
      const activeEl = document.getElementById(`mess-pill-${todayDayName}`);
      if (activeEl && dayStripRef.current) {
        dayStripRef.current.scrollTo({
          left: activeEl.offsetLeft - 150,
          behavior: "smooth"
        });
      }
    }, 300);
  }, [todayDayName]);

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    setEditingSlot(null);
  };

  const handleStarToggle = (slotKey: "Breakfast" | "Lunch" | "Snacks" | "Dinner") => {
    if (!menu[selectedDay]) return;

    const updatedMenu = { ...menu };
    const slot = updatedMenu[selectedDay][slotKey];
    slot.starred = !slot.starred;

    setMenu(updatedMenu);
    storage.set("campus_mess", updatedMenu);
    mainToast(slot.starred ? `${slotKey} marked as favorite! ⭐` : `Removed ${slotKey} from favorites.`, "success");
  };

  const handleRating = (slotKey: "Breakfast" | "Lunch" | "Snacks" | "Dinner", direction: "up" | "down") => {
    if (!menu[selectedDay]) return;

    const updatedMenu = { ...menu };
    const slot = updatedMenu[selectedDay][slotKey];

    const currentRating = slot.myRating;

    if (currentRating === direction) {
      // Retracting vote
      slot.myRating = undefined;
      if (direction === "up") slot.likes = Math.max(0, slot.likes - 1);
      else slot.dislikes = Math.max(0, slot.dislikes - 1);
      mainToast("Vote removed.", "info");
    } else {
      // Switching or adding vote
      if (currentRating) {
        // Swap previous
        if (currentRating === "up") slot.likes = Math.max(0, slot.likes - 1);
        else slot.dislikes = Math.max(0, slot.dislikes - 1);
      }

      slot.myRating = direction;
      if (direction === "up") {
        slot.likes += 1;
        mainToast("Liked this meal! 👍", "success");
      } else {
        slot.dislikes += 1;
        mainToast("Disliked this meal. 👎", "error");
      }
    }

    setMenu(updatedMenu);
    storage.set("campus_mess", updatedMenu);
  };

  const handleStartEdit = (slotKey: string, currentItems: string) => {
    setEditingSlot(slotKey);
    setEditValue(currentItems);
  };

  const handleSaveEdit = (slotKey: "Breakfast" | "Lunch" | "Snacks" | "Dinner") => {
    if (!menu[selectedDay]) return;

    const trimmed = editValue.trim();
    if (!trimmed) {
      mainToast("Menu items cannot be completely empty.", "error");
      return;
    }

    const updatedMenu = { ...menu };
    updatedMenu[selectedDay][slotKey].items = trimmed;

    setMenu(updatedMenu);
    storage.set("campus_mess", updatedMenu);
    setEditingSlot(null);
    mainToast(`${slotKey} menu updated successfully!`, "success");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent, slotKey: "Breakfast" | "Lunch" | "Snacks" | "Dinner") => {
    if (e.key === "Enter") {
      handleSaveEdit(slotKey);
    } else if (e.key === "Escape") {
      setEditingSlot(null);
    }
  };

  const currentDayMenu: DayMessMenu | undefined = menu[selectedDay];
  const isSelectedDayToday = selectedDay === todayDayName;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App Header */}
      <div className="app-header" id="mess-menu-header">
        <h1 className="logo-text" style={{ fontSize: "1.4rem" }}>Hostel Mess</h1>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)" }}>
          {isSelectedDayToday ? "🔴 Live Today" : "Weekly Schedule"}
        </div>
      </div>

      <div className="page-content bg-base">
        {/* Weekly Day Selection Strip */}
        <div className="day-strip no-scrollbar" ref={dayStripRef} id="mess-weekday-strip">
          {WEEKDAYS.map((day, idx) => {
            const isActive = selectedDay === day;
            const isPillToday = day === todayDayName;
            return (
              <div
                key={day}
                id={`mess-pill-${day}`}
                className={`day-pill ${isActive ? "active" : ""}`}
                onClick={() => handleDaySelect(day)}
                style={{
                  border: isPillToday && !isActive ? "1px solid var(--accent)" : undefined,
                  position: "relative"
                }}
              >
                <span className="day-name">{day}</span>
                <span className="day-date">{idx + 8}</span>
                {isPillToday && (
                  <div 
                    style={{ 
                      width: "5px", 
                      height: "5px", 
                      borderRadius: "50%", 
                      backgroundColor: isActive ? "#000" : "var(--accent)", 
                      position: "absolute", 
                      bottom: "4px" 
                    }} 
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Highlight Banner / Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>
            {WEEKDAYS_FULL[selectedDay]}'s Dining Menu
          </h3>
          {isSelectedDayToday && (
            <span style={{ fontSize: "0.75rem", background: "rgba(255, 214, 0, 0.15)", color: "var(--accent)", padding: "4px 8px", borderRadius: "12px", fontWeight: 700 }}>
              Today's Menu
            </span>
          )}
        </div>

        {/* Meal Slots list */}
        <div 
          className="mess-slot-container" 
          id="hostel-meals-slots-container"
          style={{
            padding: isSelectedDayToday ? "4px" : "0",
            borderRadius: "16px",
          }}
        >
          {currentDayMenu ? (
            SLOTS_CONFIG.map(slotCfg => {
              const slotData: MealSlot = currentDayMenu[slotCfg.key];
              const isSlotEditing = editingSlot === slotCfg.key;
              
              return (
                <div 
                  key={slotCfg.key} 
                  className={`card-base mess-slot-card ${isSelectedDayToday ? "today-highlight" : ""}`}
                  id={`slot-${slotCfg.key}`}
                >
                  {/* Slot Sub-header */}
                  <div className="mess-slot-header">
                    <div className="mess-slot-title">
                      <span>{slotCfg.emoji}</span>
                      <span>{slotCfg.key}</span>
                    </div>
                    <div className="mess-slot-time">
                      <Clock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                      <span>{slotCfg.time}</span>
                    </div>
                  </div>

                  {/* Inline Editable Meal Content */}
                  <div style={{ flex: 1, padding: "4px 0" }}>
                    {isSlotEditing ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          className="mess-edit-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, slotCfg.key)}
                          onBlur={() => handleSaveEdit(slotCfg.key)}
                          autoFocus
                          id={`input-edit-${slotCfg.key}`}
                        />
                        <button
                          onClick={() => handleSaveEdit(slotCfg.key)}
                          style={{
                            background: "var(--accent)",
                            border: "none",
                            color: "#000",
                            borderRadius: "6px",
                            padding: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="mess-item-display"
                        onClick={() => handleStartEdit(slotCfg.key, slotData.items)}
                        title="Tap to edit this meal"
                        id={`display-text-${slotCfg.key}`}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}
                      >
                        <span style={{ flex: 1 }}>{slotData.items}</span>
                        <Edit2 size={12} style={{ color: "var(--border)", marginTop: "3px", flexShrink: 0 }} />
                      </div>
                    )}
                  </div>

                  {/* Rating Actions Panel */}
                  <div className="mess-actions">
                    <div className="rating-group">
                      <button 
                        className={`rating-btn ${slotData.myRating === "up" ? "active up" : ""}`}
                        onClick={() => handleRating(slotCfg.key, "up")}
                        id={`btn-like-${slotCfg.key}`}
                      >
                        <ThumbsUp size={14} />
                        <span>{slotData.likes}</span>
                      </button>
                      
                      <button 
                        className={`rating-btn ${slotData.myRating === "down" ? "active down" : ""}`}
                        onClick={() => handleRating(slotCfg.key, "down")}
                        id={`btn-dislike-${slotCfg.key}`}
                      >
                        <ThumbsDown size={14} />
                        <span>{slotData.dislikes}</span>
                      </button>
                    </div>

                    <button 
                      className={`fav-btn-star ${slotData.starred ? "active" : ""}`}
                      onClick={() => handleStarToggle(slotCfg.key)}
                      id={`btn-star-${slotCfg.key}`}
                    >
                      <Star size={16} fill={slotData.starred ? "var(--accent)" : "none"} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Utensils size={40} style={{ color: "var(--border)", marginBottom: "12px" }} />
              <p style={{ color: "var(--text2)" }}>Loading dining menu...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
