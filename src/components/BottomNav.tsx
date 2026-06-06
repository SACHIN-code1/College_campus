import React from "react";
import { NavLink } from "react-router-dom";
import { Calendar, CheckSquare, Utensils, IndianRupee, Cpu } from "lucide-react";

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav" id="bottom-navigation-bar">
      <NavLink
        to="/"
        className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
        id="nav-tab-schedule"
      >
        <Calendar />
        <span>Schedule</span>
      </NavLink>

      <NavLink
        to="/tasks"
        className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
        id="nav-tab-tasks"
      >
        <CheckSquare />
        <span>Tasks</span>
      </NavLink>

      <NavLink
        to="/mess"
        className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
        id="nav-tab-mess"
      >
        <Utensils />
        <span>Mess</span>
      </NavLink>

      <NavLink
        to="/expenses"
        className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
        id="nav-tab-expenses"
      >
        <IndianRupee />
        <span>Expenses</span>
      </NavLink>

      <NavLink
        to="/scan"
        className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}
        id="nav-tab-scan"
      >
        <Cpu />
        <span>AI Scan</span>
      </NavLink>
    </nav>
  );
};
