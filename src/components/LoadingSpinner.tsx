import React from "react";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading..." }) => {
  return (
    <div className="spinner-container" id="global-loading-spinner">
      <div className="spinner" id="spinner-circle"></div>
      {message && <p style={{ color: "var(--text2)", fontSize: "0.85rem", fontWeight: 500 }}>{message}</p>}
    </div>
  );
};
