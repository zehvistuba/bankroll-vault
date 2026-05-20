import { useState } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="tooltip-container"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <Info size={13} className="tooltip-icon" />
      {open && (
        <div className="tooltip-content animate-fade-in">
          {text}
        </div>
      )}
    </div>
  );
}
