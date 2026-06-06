import React, { useState, useEffect, useRef } from "react";
import { Clock, MapPin, User, Sliders, Calendar as CalendarIcon, Trash, Edit, Check } from "lucide-react";
import { storage, ClassSchedule } from "../utils/storage";
import { formatIndianDate } from "../utils/helpers";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { FAB } from "../components/FAB";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "motion/react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL: { [key: string]: string } = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday"
};

export const Schedule: React.FC = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("Mon");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Class");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Form states
  const [subject, setSubject] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [professor, setProfessor] = useState("");

  const dayStripRef = useRef<HTMLDivElement>(null);

  // Load classes and set initial selected day to current day
  useEffect(() => {
    const data = storage.get<ClassSchedule[]>("campus_schedule", []);
    setClasses(data);

    // Get current day
    const dayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
    const currentDay = dayIndex === 0 ? "Mon" : WEEKDAYS[dayIndex - 1];
    setSelectedDay(currentDay);
    setSelectedDays([currentDay]);

    // Simple smooth auto-scrolling to current day pill
    setTimeout(() => {
      const activeEl = document.getElementById(`pill-${currentDay}`);
      if (activeEl && dayStripRef.current) {
        dayStripRef.current.scrollTo({
          left: activeEl.offsetLeft - 150,
          behavior: "smooth"
        });
      }
    }, 300);
  }, []);

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    setActiveCardId(null);
  };

  const handleCardToggle = (id: string) => {
    setActiveCardId(activeCardId === id ? null : id);
  };

  const handleAddClick = () => {
    setModalTitle("Add Class");
    setEditingClassId(null);
    setSubject("");
    setSelectedDays([selectedDay]);
    setStartTime("09:00");
    setEndTime("10:00");
    setRoom("");
    setProfessor("");
    setIsModalOpen(true);
  };

  const handleEditClick = (cls: ClassSchedule, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalTitle("Edit Class");
    setEditingClassId(cls.id);
    setSubject(cls.subject);
    setSelectedDays(cls.days);
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setRoom(cls.room);
    setProfessor(cls.professor);
    setIsModalOpen(true);
    setActiveCardId(null);
  };

  const handleDeleteClass = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = classes.filter(c => c.id !== id);
    setClasses(updated);
    storage.set("campus_schedule", updated);
    toast("Class schedule deleted.", "error");
    setActiveCardId(null);
  };

  const handleChipToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      } else {
        toast("Select at least one day", "info");
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast("Please enter a subject name.", "error");
      return;
    }
    if (selectedDays.length === 0) {
      toast("Please select at least one day.", "error");
      return;
    }

    let updatedClasses: ClassSchedule[];

    if (editingClassId) {
      // Edit mode
      updatedClasses = classes.map(c => {
        if (c.id === editingClassId) {
          return {
            ...c,
            subject: subject.trim(),
            days: selectedDays,
            startTime,
            endTime,
            room: room.trim() || "TBA",
            professor: professor.trim() || "Staff"
          };
        }
        return c;
      });
      toast("Class schedule updated!", "success");
    } else {
      // Create mode
      const newClass: ClassSchedule = {
        id: `cls-${Date.now()}`,
        subject: subject.trim(),
        days: selectedDays,
        startTime,
        endTime,
        room: room.trim() || "TBA",
        professor: professor.trim() || "Staff"
      };
      updatedClasses = [...classes, newClass];
      toast("Class added to your timetable!", "success");
    }

    setClasses(updatedClasses);
    storage.set("campus_schedule", updatedClasses);
    setIsModalOpen(false);
  };

  // Filter classes scheduled for the current selected day, and sort chronologically by starting time
  const currentClasses = classes
    .filter(c => c.days.includes(selectedDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const formattedTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    return today.toLocaleDateString('en-IN', options);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App Header */}
      <div className="app-header" id="timetable-header">
        <div className="logo-section">
          <div className="logo-icon"></div>
          <div className="logo-text">Campus OS</div>
        </div>
        <div className="header-title-container" style={{ alignItems: "flex-end" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent)" }}>Timetable</span>
          <span className="header-subtitle">{formattedTodayDate()}</span>
        </div>
      </div>

      <div className="page-content bg-base">
        {/* Day Strip Selector */}
        <div className="day-strip no-scrollbar" ref={dayStripRef} id="weekday-scroll-bar">
          {WEEKDAYS.map((day, idx) => {
            const isActive = selectedDay === day;
            return (
              <div
                key={day}
                id={`pill-${day}`}
                className={`day-pill ${isActive ? "active" : ""}`}
                onClick={() => handleDaySelect(day)}
              >
                <span className="day-name">{day}</span>
                <span className="day-date">{idx + 8}</span> {/* Just static aesthetic dates representing demo week */}
              </div>
            );
          })}
        </div>

        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "14px", color: "var(--text)" }}>
          {WEEKDAYS_FULL[selectedDay]}'s Classes
        </h3>

        {/* Classes List */}
        <div className="class-list" id="class-timetable-list">
          {currentClasses.length === 0 ? (
            <EmptyState
              icon={<Clock size={40} className="empty-icon" style={{ color: "var(--border)" }} />}
              title="No Classes Today"
              description="Enjoy your free time, complete assignments, or check out the hostel mess menu!"
            />
          ) : (
            <AnimatePresence mode="popLayout">
              {currentClasses.map((cls) => {
                const isActionsExpanded = activeCardId === cls.id;
                return (
                  <motion.div
                    key={cls.id}
                    layoutId={cls.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="card-base class-card"
                    onClick={() => handleCardToggle(cls.id)}
                    style={{ cursor: "pointer", borderLeft: isActionsExpanded ? "3px solid var(--accent)" : "1px solid var(--border)", padding: "16px" }}
                    id={`class-card-${cls.id}`}
                  >
                    <div style={{ display: "flex", gap: "16px", width: "100%", alignItems: "center" }}>
                      {/* Left timeline section */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)", paddingRight: "16px", minWidth: "64px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text2)", fontWeight: 700 }}>{cls.startTime}</span>
                        <div style={{ height: "24px", width: "2px", backgroundColor: "var(--accent)", margin: "4px 0" }}></div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text2)", fontWeight: 700 }}>{cls.endTime}</span>
                      </div>

                      {/* Right information section */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-heading)" }}>{cls.subject}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text2)" }}>
                          <span>{cls.room}</span>
                          <span>•</span>
                          <span>{cls.professor}</span>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isActionsExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            borderTop: "1px solid var(--border)",
                            marginTop: "8px",
                            paddingTop: "8px",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "10px"
                          }}
                          className="swipe-reveal-actions"
                          id={`class-actions-${cls.id}`}
                        >
                          <button
                            className="btn-delete"
                            style={{
                              background: "rgba(255, 107, 53, 0.15)",
                              borderColor: "var(--accent2)",
                              color: "var(--accent2)",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            onClick={(e) => handleEditClick(cls, e)}
                            id={`edit-class-btn-${cls.id}`}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            className="btn-delete"
                            onClick={(e) => handleDeleteClass(cls.id, e)}
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                            id={`delete-class-btn-${cls.id}`}
                          >
                            <Trash size={12} /> Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Floating Add FAB */}
      <FAB onClick={handleAddClick} ariaLabel="Add Class slot" />

      {/* Class Modal Sheet */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }} id="schedule-class-form">
          <div className="form-group">
            <label className="form-label">Subject Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Machine Learning"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              id="form-subject-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Days of Week (Multi-select)</label>
            <div className="multi-select-container">
              {WEEKDAYS.map(day => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`multi-select-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => handleChipToggle(day)}
                    id={`chip-day-${day}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                id="form-start-time"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                id="form-end-time"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Room / Laboratory</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. LH-201, LAB-4"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              id="form-room-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Professor Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dr. Amit Verma"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              id="form-professor-input"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              id="form-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="form-submit-btn"
            >
              Save Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
