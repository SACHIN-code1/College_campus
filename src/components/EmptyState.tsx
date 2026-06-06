import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = <FolderOpen size={48} className="empty-icon" />, 
  title, 
  description 
}) => {
  return (
    <div className="empty-state" id="empty-state-card">
      <div style={{ marginBottom: "12px" }}>{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-desc">{description}</p>
    </div>
  );
};
