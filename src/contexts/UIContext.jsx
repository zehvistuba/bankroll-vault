import { createContext, useContext, useState } from "react";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [shareToast, setShareToast] = useState("");
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <UIContext.Provider value={{
      theme, setTheme,
      shareToast, setShareToast,
      milestoneToast, setMilestoneToast,
      showUpgrade, setShowUpgrade,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUIContext must be used inside UIProvider");
  return ctx;
}
