import React, { useState, useEffect } from "react";
import { IndianRupee, Users, PlusCircle, ArrowUpRight, ArrowDownLeft, Trash, Calendar, Tag, ShieldCheck, Check } from "lucide-react";
import { storage, Group, Expense } from "../utils/storage";
import { formatIndianDate, calculateBalancesAndSettlements, Settlement } from "../utils/helpers";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { FAB } from "../components/FAB";
import { motion, AnimatePresence } from "motion/react";

export const Expenses: React.FC = () => {
  const { toast } = useToast();
  
  // Storage lists
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState("Raj, Priya, Arjun, Me");

  // New Expense Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("Me");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [category, setCategory] = useState<'Food' | 'Travel' | 'Stationery' | 'Misc'>("Food");
  const [expenseDate, setExpenseDate] = useState("");

  // Load baseline on mount
  useEffect(() => {
    const loadedGroups = storage.get<Group[]>("campus_groups", []);
    setGroups(loadedGroups);
    
    const loadedExpenses = storage.get<Expense[]>("campus_expenses", []);
    setExpenses(loadedExpenses);

    if (loadedGroups.length > 0) {
      setSelectedGroupId(loadedGroups[0].id);
    }
    
    setExpenseDate(new Date().toISOString().split("T")[0]);
  }, []);

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  // Prefill the splitter check-list with all group members when opening the modal or switching groups
  useEffect(() => {
    if (activeGroup) {
      setSplitAmong(activeGroup.members);
      setPaidBy(activeGroup.members.includes("Me") ? "Me" : activeGroup.members[0]);
    }
  }, [activeGroup, isExpenseModalOpen]);

  const handleGroupSelect = (id: string) => {
    setSelectedGroupId(id);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast("Please enter a group name.", "error");
      return;
    }

    const parsedMembers = newGroupMembers
      .split(",")
      .map(m => m.trim())
      .filter(m => m.length > 0);

    if (parsedMembers.length < 2) {
      toast("Please add at least 2 members.", "error");
      return;
    }

    // Ensure 'Me' is present for user perspective tracking
    if (!parsedMembers.includes("Me")) {
      parsedMembers.push("Me");
    }

    const newGroup: Group = {
      id: `grp-${Date.now()}`,
      name: newGroupName.trim(),
      members: parsedMembers
    };

    const nextGroups = [...groups, newGroup];
    setGroups(nextGroups);
    storage.set("campus_groups", nextGroups);
    setSelectedGroupId(newGroup.id);
    setIsGroupModalOpen(false);
    toast(`Group "${newGroup.name}" created successfully! 👥`, "success");

    // Reset forms
    setNewGroupName("");
    setNewGroupMembers("Raj, Priya, Arjun, Me");
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;

    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      toast("Please enter an expense description.", "error");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast("Please enter a valid amount greater than zero.", "error");
      return;
    }
    if (splitAmong.length === 0) {
      toast("Please check at least one person to split with.", "error");
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      groupId: activeGroup.id,
      description: description.trim(),
      amount: parsedAmount,
      paidBy: paidBy,
      splitAmong: splitAmong,
      category: category,
      date: expenseDate || new Date().toISOString().split("T")[0]
    };

    const nextExpenses = [newExpense, ...expenses];
    setExpenses(nextExpenses);
    storage.set("campus_expenses", nextExpenses);
    
    setIsExpenseModalOpen(false);
    toast("Expense added and split calculated! 💰", "success");

    // Reset forms
    setDescription("");
    setAmount("");
  };

  const handleDeleteExpense = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(nextExpenses);
    storage.set("campus_expenses", nextExpenses);
    toast("Expense deleted.", "error");
  };

  const handleSplitCheckboxToggle = (member: string) => {
    if (splitAmong.includes(member)) {
      setSplitAmong(splitAmong.filter(m => m !== member));
    } else {
      setSplitAmong([...splitAmong, member]);
    }
  };

  /**
   * Automated settlement marks.
   * Generates a virtual balancing transaction: 'from' person pays 'to' person.
   * Represented in expenses list as a special settlement expense.
   */
  const handleMarkSettled = (settlement: Settlement) => {
    if (!activeGroup) return;

    const settlementExpense: Expense = {
      id: `exp-settle-${Date.now()}`,
      groupId: activeGroup.id,
      description: `Settle: ${settlement.from} ➔ ${settlement.to}`,
      amount: settlement.amount,
      paidBy: settlement.from, // The debtor paid
      splitAmong: [settlement.to], // Only the creditor received/shared it
      category: "Misc",
      date: new Date().toISOString().split("T")[0]
    };

    const nextExpenses = [settlementExpense, ...expenses];
    setExpenses(nextExpenses);
    storage.set("campus_expenses", nextExpenses);
    toast(`Settled! Registered that ${settlement.from} paid ₹${settlement.amount} to ${settlement.to}.`, "success");
  };

  // Filter expenses belonging to active group
  const activeGroupExpenses = expenses.filter(exp => exp.groupId === selectedGroupId);

  const totalGroupSpend = activeGroupExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Compute live balances and optimal settlements
  const groupMembers = activeGroup ? activeGroup.members : [];
  const { balances, settlements } = calculateBalancesAndSettlements(groupMembers, activeGroupExpenses);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* App Header */}
      <div className="app-header" id="expenses-screen-header">
        <h1 className="logo-text" style={{ fontSize: "1.4rem" }}>Bill Splitter</h1>
        <button 
          className="header-action-btn"
          onClick={() => setIsGroupModalOpen(true)}
          style={{ width: "36px", height: "36px" }}
          id="btn-trigger-add-group"
          title="Create New Group"
        >
          <PlusCircle size={18} />
        </button>
      </div>

      <div className="page-content bg-base">
        {/* Dynamic Groups Selection Bar */}
        <div className="group-picker-strip no-scrollbar" id="groups-scroll-rail">
          {groups.map(g => (
            <button
              key={g.id}
              className={`group-pill ${selectedGroupId === g.id ? "active" : ""}`}
              onClick={() => handleGroupSelect(g.id)}
              id={`group-pill-${g.id}`}
            >
              <Users size={12} style={{ display: "inline", marginRight: "5px" }} />
              <span>{g.name}</span>
            </button>
          ))}
          {groups.length === 0 && (
            <span style={{ color: "var(--text2)", fontSize: "0.8rem", padding: "8px" }}>No expense groups.</span>
          )}
        </div>

        {activeGroup ? (
          <div>
            {/* Total Spend Summary Banner */}
            <div className="total-spend-box" id="spend-stats-banner">
              <span style={{ fontSize: "0.8rem", color: "var(--text2)", textTransform: "uppercase" }}>Total Group Spend</span>
              <span className="total-spend-val">₹{totalGroupSpend.toLocaleString("en-IN")}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--accent)" }}>{activeGroup.name} ({activeGroup.members.length} members)</span>
            </div>

            {/* Balances list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              <span className="form-label">Active Net Balances</span>
              <div className="balances-row no-scrollbar">
                {activeGroup.members.map(member => {
                  const bal = balances[member] || 0;
                  const isPositive = bal > 0.1;
                  const isNegative = bal < -0.1;
                  return (
                    <div 
                      key={member}
                      className={`balance-chip ${isPositive ? "positive" : isNegative ? "negative" : ""}`}
                      id={`balance-pill-${member}`}
                    >
                      {member === "Me" ? "You" : member}: {bal > 0 ? "+" : ""}₹{bal}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settlements Action Section */}
            {settlements.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <span className="form-label" style={{ display: "block", marginBottom: "8px" }}>Suggested Settlements</span>
                {settlements.map((settle, i) => {
                  const isMeDebtor = settle.from === "Me";
                  const isMeCreditor = settle.to === "Me";
                  
                  return (
                    <div className="settlement-card" key={settle.id || i} id={`settlement-card-${i}`}>
                      <div className="settle-text">
                        {isMeDebtor ? (
                          <span>You owe <strong className="settle-highlight">{settle.to}</strong></span>
                        ) : isMeCreditor ? (
                          <span><strong className="settle-highlight">{settle.from}</strong> owes You</span>
                        ) : (
                          <span><strong>{settle.from}</strong> owes <strong>{settle.to}</strong></span>
                        )}
                        <span style={{ marginLeft: "6px", fontSize: "1rem", fontWeight: 800, color: "var(--accent)" }}>
                          ₹{settle.amount}
                        </span>
                      </div>
                      <button
                        className="btn-settle"
                        onClick={() => handleMarkSettled(settle)}
                        id={`btn-action-settle-${i}`}
                      >
                        Settle Debt
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List of expenses */}
            <div className="expenses-section-title">
              <span>Expenses Ledger</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text2)", fontWeight: 500 }}>
                {activeGroupExpenses.length} transactions
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} id="ledger-list-box">
              {activeGroupExpenses.length === 0 ? (
                <EmptyState
                  icon={<IndianRupee size={42} className="empty-icon" />}
                  title="No Expenses Tracked Yet"
                  description="Tap the floating '+' button to add tea stalls, hostel food bills, or shared auto expenses!"
                />
              ) : (
                <AnimatePresence mode="popLayout">
                  {activeGroupExpenses.map(exp => {
                    const isSettleRecord = exp.description.startsWith("Settle:");
                    return (
                      <motion.div
                        key={exp.id}
                        layoutId={exp.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className="card-base expense-item-card"
                        style={{
                          background: isSettleRecord ? "rgba(0, 224, 150, 0.02)" : "var(--bg3)",
                          borderStyle: isSettleRecord ? "dashed" : "solid",
                          borderColor: isSettleRecord ? "rgba(0, 224, 150, 0.25)" : "var(--border)"
                        }}
                        id={`expense-card-${exp.id}`}
                      >
                        <div className="expense-item-top">
                          <div>
                            <div className="expense-item-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {isSettleRecord && <ShieldCheck size={14} style={{ color: "var(--success)" }} />}
                              <span>{exp.description}</span>
                            </div>
                            <div className="expense-item-meta">
                              <span>Paid by {exp.paidBy === "Me" ? "You" : exp.paidBy}</span>
                            </div>
                          </div>
                          
                          <div style={{ textAlign: "right" }}>
                            <div className="expense-item-amt" style={{ color: isSettleRecord ? "var(--success)" : "var(--accent)" }}>
                              ₹{exp.amount}
                            </div>
                            <div className="tag-date" style={{ justifyContent: "flex-end", marginTop: "2px" }}>
                              <Calendar size={10} />
                              <span>{formatIndianDate(exp.date)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="expense-item-bottom">
                          <span className="tag-category">
                            <Tag size={9} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />
                            {exp.category}
                          </span>
                          
                          <span style={{ fontSize: "0.7rem", color: "var(--text2)" }}>
                            Split among: {exp.splitAmong.map(m => m === "Me" ? "You" : m).join(", ")}
                          </span>

                          <button
                            onClick={(e) => handleDeleteExpense(exp.id, e)}
                            id={`trash-expense-${exp.id}`}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text2)",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            <Trash size={12} className="hover:text-red-500" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Users size={48} className="empty-icon" />}
            title="Create an Expense Squad"
            description="Create custom roommate clusters to split laundry bills, canteen treats, or travel fares instantly."
          />
        )}
      </div>

      {/* Floating bill addition FAB */}
      <FAB onClick={() => setIsExpenseModalOpen(true)} ariaLabel="Add Expense" />

      {/* Expense Modal Overlay Form */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Split Shared Bill">
        {activeGroup ? (
          <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "14px" }} id="add-bill-form">
            <div className="form-group">
              <label className="form-label">Expense Description</label>
              <input
                type="text"
                placeholder="e.g. Zomato dinner, Canteen Chai"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                id="bill-desc-input"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 240"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  id="bill-amount-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="form-select"
                  id="bill-category-select"
                >
                  <option value="Food">🍔 Food</option>
                  <option value="Travel">🚗 Travel</option>
                  <option value="Stationery">✏️ Stationery</option>
                  <option value="Misc">📦 Misc</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Paid By</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="form-select"
                  id="bill-paid-by-select"
                >
                  {activeGroup.members.map(m => (
                    <option key={m} value={m}>
                      {m === "Me" ? "You" : m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expense Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  id="bill-date-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Split Among (Multiple Checkbox)</label>
              <div 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "8px", 
                  background: "var(--bg3)", 
                  padding: "12px", 
                  borderRadius: "10px",
                  border: "1px solid var(--border)"
                }}
              >
                {activeGroup.members.map(m => {
                  const isChecked = splitAmong.includes(m);
                  return (
                    <div 
                      key={m} 
                      style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                      onClick={() => handleSplitCheckboxToggle(m)}
                    >
                      <div className={`checkbox-custom ${isChecked ? "checked" : ""}`} style={{ width: "18px", height: "18px" }}>
                        {isChecked && <Check size={10} strokeWidth={3} style={{ color: "#000" }} />}
                      </div>
                      <span style={{ fontSize: "0.9rem" }}>{m === "Me" ? "You" : m}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsExpenseModalOpen(false)}
                id="cancel-add-bill"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                id="submit-add-bill"
              >
                Split Bill
              </button>
            </div>
          </form>
        ) : (
          <p style={{ color: "var(--text2)" }}>Please create an expense group first.</p>
        )}
      </Modal>

      {/* Group Creation Sheet Modal */}
      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Create Bill Squad">
        <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "14px" }} id="create-group-form">
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Room 204, Canteen Gang"
              className="form-input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              id="group-name-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Members (Comma separated, Case sensitive)</label>
            <input
              type="text"
              className="form-input"
              value={newGroupMembers}
              onChange={(e) => setNewGroupMembers(e.target.value)}
              id="group-members-input"
              required
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text2)", lineHeight: 1.4 }}>
              * 'Me' represents you. Separate names precisely with commas (e.g. "Raj, Priya, Arjun, Me").
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsGroupModalOpen(false)}
              id="cancel-create-group"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="submit-create-group"
            >
              Create Squad
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
