import { useEffect } from "react";
import "./Toast.css";

const Icon = ({ d, size = 16, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
    error: "M18 6 6 18M6 6l12 12",
    warning: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  };

  return (
    <div className={`app-toast toast-${type}`}>
      <div className="toast-icon">
        <Icon d={icons[type] || icons.success} size={18} />
      </div>
      <div className="toast-content">{message}</div>
      <button className="toast-close-btn" onClick={onClose}>×</button>
    </div>
  );
}
