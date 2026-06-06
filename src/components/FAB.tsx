import React from "react";
import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  ariaLabel?: string;
}

export const FAB: React.FC<FABProps> = ({ onClick, ariaLabel = "Add Item" }) => {
  return (
    <div className="fab-container" id="fab-position-container">
      <button
        className="fab-btn"
        onClick={onClick}
        aria-label={ariaLabel}
        id="fab-action-trigger"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
};
