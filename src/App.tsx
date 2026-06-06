/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { BottomNav } from "./components/BottomNav";
import { Schedule } from "./pages/Schedule";
import { Tasks } from "./pages/Tasks";
import { MessMenuComponent as MessMenu } from "./pages/MessMenu";
import { Expenses } from "./pages/Expenses";
import { AIScan } from "./pages/AIScan";
import { seedLocalStorage } from "./utils/storage";
import { AnimatePresence, motion } from "motion/react";

// Slide transitions between screens using motion
const PageTransitionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ x: 25, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -25, opacity: 0 }}
        transition={{ duration: 0.16 }}
        style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  // Pre-populate with beautiful Indian college prep defaults on boot
  useEffect(() => {
    seedLocalStorage();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <div className="app-container" id="campus-os-applet-root">
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <PageTransitionWrapper>
                    <Schedule />
                  </PageTransitionWrapper>
                } 
              />
              <Route 
                path="/tasks" 
                element={
                  <PageTransitionWrapper>
                    <Tasks />
                  </PageTransitionWrapper>
                } 
              />
              <Route 
                path="/mess" 
                element={
                  <PageTransitionWrapper>
                    <MessMenu />
                  </PageTransitionWrapper>
                } 
              />
              <Route 
                path="/expenses" 
                element={
                  <PageTransitionWrapper>
                    <Expenses />
                  </PageTransitionWrapper>
                } 
              />
              <Route 
                path="/scan" 
                element={
                  <PageTransitionWrapper>
                    <AIScan />
                  </PageTransitionWrapper>
                } 
              />
            </Routes>
          </div>
          
          {/* Persistent Sticky Bottom Control Navigation */}
          <BottomNav />
        </div>
      </Router>
    </ToastProvider>
  );
}
