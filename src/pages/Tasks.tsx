import React, { useState, useEffect } from "react";
import { FolderKanban, Clock, Calendar, Check, AlertCircle, Plus, Sparkles, SlidersHorizontal, Trash } from "lucide-react";
import { storage, Task } from "../utils/storage";
import { formatIndianDate } from "../utils/helpers";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { FAB } from "../components/FAB";
import { EmptyState } from "../components/EmptyState";
import { motion, AnimatePresence } from "motion/react";

type FilterType = "All" | "Pending" | "Due Today" | "Done";
type SortType = "dueDate" | "priority";

export const Tasks: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");
  const [sortBy, setSortBy] = useState<SortType>("dueDate");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loaded = storage.get<Task[]>("campus_tasks", []);
    setTasks(loaded);
    // Default form date to today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    storage.set("campus_tasks", newTasks);
  };

  const handleToggleCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextState = !t.completed;
        if (nextState) {
          toast("Assignment marked as completed! 🎉", "success");
        } else {
          toast("Marked as incomplete.", "info");
        }
        return { ...t, completed: nextState };
      }
      return t;
    });
    saveTasks(updated);
  };

  const handleAddClick = () => {
    setTitle("");
    setSubject("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split("T")[0]);
    setPriority("Medium");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    toast("Assignment removed.", "error");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast("Please enter a title for the assignment.", "error");
      return;
    }
    if (!subject.trim()) {
      toast("Please enter a subject category.", "error");
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      dueDate,
      priority,
      notes: notes.trim(),
      completed: false
    };

    const nextTasks = [newTask, ...tasks];
    saveTasks(nextTasks);
    setIsModalOpen(false);
    toast("New assignment added! 📁", "success");
  };

  // Helper date determinations (relative to today, June 5, 2026)
  const TODAY_STR = "2026-06-05"; // Synchronized with context metadata

  const isOverdue = (task: Task) => {
    if (task.completed) return false;
    return task.dueDate < TODAY_STR;
  };

  const isDueToday = (task: Task) => {
    if (task.completed) return false;
    return task.dueDate === TODAY_STR;
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === "Pending") return !task.completed;
    if (filter === "Done") return task.completed;
    if (filter === "Due Today") return !task.completed && (task.dueDate === TODAY_STR);
    return true; // "All"
  });

  // Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      return a.dueDate.localeCompare(b.dueDate);
    } else {
      // Priority ordering: High (3) > Medium (2) > Low (1)
      const priorityWeights = { High: 3, Medium: 2, Low: 1 };
      return priorityWeights[b.priority] - priorityWeights[a.priority];
    }
  });

  // Calculate Aggregates
  const totalCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const dueTodayCount = tasks.filter(t => !t.completed && t.dueDate === TODAY_STR).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App Header */}
      <div className="app-header" id="assignments-header">
        <h1 className="logo-text" style={{ fontSize: "1.4rem" }}>Assignments</h1>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--success)" }}>
          {doneCount}/{totalCount} Done
        </div>
      </div>

      <div className="page-content bg-base">
        {/* Statistics Row */}
        <div className="stats-strip" id="assignments-stats-strip">
          <div className="stats-card">
            <span className="stats-num" style={{ color: "var(--accent)" }}>{pendingCount}</span>
            <span className="stats-lbl">Pending</span>
          </div>
          <div className="stats-card">
            <span className="stats-num" style={{ color: "var(--accent2)" }}>{dueTodayCount}</span>
            <span className="stats-lbl">Due Today</span>
          </div>
          <div className="stats-card">
            <span className="stats-num done" style={{ color: "var(--success)" }}>{doneCount}</span>
            <span className="stats-lbl">Done</span>
          </div>
        </div>

        {/* Filter Selection Panel & Sorting Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div className="filter-strip no-scrollbar" style={{ marginBottom: 0, paddingBottom: 0 }}>
            {(["All", "Pending", "Due Today", "Done"] as FilterType[]).map(f => {
              const count = f === "All" ? totalCount : f === "Pending" ? pendingCount : f === "Due Today" ? dueTodayCount : doneCount;
              return (
                <button
                  key={f}
                  className={`filter-pill ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                  id={`filter-pill-${f.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="form-label" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="form-select"
              style={{
                width: "auto",
                padding: "4px 24px 4px 8px",
                fontSize: "0.75rem",
                borderRadius: "6px",
                backgroundColor: "var(--bg2)",
              }}
              id="sort-select-combobox"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Task Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} id="tasks-assignments-list">
          {sortedTasks.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={40} className="empty-icon" />}
              title={`No ${filter !== "All" ? filter : ""} Assignments`}
              description={filter === "Pending" ? "All clear! Enjoy rest time or study with AI Notes." : "Create assignments using the bottom '+' FAB to track college and lab due dates."}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              {sortedTasks.map(task => {
                const isTaskOverdue = isOverdue(task);
                const isTaskDueToday = isDueToday(task);
                
                let urgencyClass = "low";
                if (task.priority === "High") urgencyClass = "high";
                else if (task.priority === "Medium") urgencyClass = "medium";

                return (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.2 }}
                    className={`card-base task-card ${urgencyClass} ${task.completed ? "completed" : ""} ${isTaskOverdue ? "overdue" : ""} ${isTaskDueToday ? "due-today" : ""}`}
                    id={`task-card-${task.id}`}
                  >
                    {/* Completion Checkbox */}
                    <div 
                      className="checkbox-container" 
                      onClick={(e) => handleToggleCompleted(task.id, e)}
                      id={`checkbox-wrapper-${task.id}`}
                    >
                      <div className={`checkbox-custom ${task.completed ? "checked" : ""}`} id={`cb-box-${task.id}`}>
                        {task.completed && <Check size={12} strokeWidth={3} style={{ color: "#000" }} />}
                      </div>
                    </div>

                    {/* Task Metadata details */}
                    <div className="task-info">
                      <div className={`task-title ${task.completed ? "strikethrough" : ""}`}>
                        {task.title}
                      </div>
                      
                      <div className="task-sub-info">
                        <span className="tag-subject">{task.subject}</span>
                        
                        <span className={`tag-date ${isTaskOverdue ? "danger" : ""}`} style={{ fontWeight: isTaskDueToday || isTaskOverdue ? 700 : 500 }}>
                          <Calendar size={11} />
                          {isTaskDueToday ? "Today" : isTaskOverdue ? "Overdue" : formatIndianDate(task.dueDate)}
                        </span>

                        <span 
                          style={{ 
                            fontSize: "0.6rem", 
                            fontWeight: 800,
                            color: task.priority === "High" ? "var(--danger)" : task.priority === "Medium" ? "var(--accent2)" : "var(--text2)",
                            textTransform: "uppercase" 
                          }}
                        >
                          {task.priority} Priority
                        </span>
                      </div>

                      {task.notes && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: "4px", borderLeft: "1px solid var(--border)", paddingLeft: "6px" }}>
                          {task.notes}
                        </div>
                      )}
                    </div>

                    {/* Delete Quick Option */}
                    <button
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      id={`delete-task-${task.id}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text2)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <Trash size={14} className="hover:text-red-500" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Floating Plus FAB */}
      <FAB onClick={handleAddClick} ariaLabel="Add Assignment tracker" />

      {/* Modal Add Assignment Overlay */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Assignment">
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }} id="assignment-creation-form">
          <div className="form-group">
            <label className="form-label">Assignment Title</label>
            <input
              type="text"
              placeholder="e.g. Compiler Design Lab Manual 3"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              id="form-title-task"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Course / Subject</label>
            <input
              type="text"
              placeholder="e.g. Compiler Design"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              id="form-subject-task"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                id="form-due-date-task"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="form-select"
                id="form-priority-select"
              >
                <option value="High">🔴 High Priority</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🟢 Low Priority</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assignment Notes / Checklist</label>
            <textarea
              placeholder="Include questions, hints or references..."
              className="form-input"
              style={{ minHeight: "80px", resize: "none" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              id="form-notes-task"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              id="form-cancel-task"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="form-submit-task"
            >
              Add Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
