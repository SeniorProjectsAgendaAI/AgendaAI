import React, { createContext, useCallback, useContext, useState } from "react";

interface TaskEventContextType {
  /** Incremented every time any component creates, updates, or deletes a task/event. */
  refreshKey: number;
  /** Call this after any mutation so every subscriber re-fetches. */
  triggerRefresh: () => void;
}

const TaskEventContext = createContext<TaskEventContextType | undefined>(undefined);

export const TaskEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <TaskEventContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </TaskEventContext.Provider>
  );
};

export const useTaskEvents = () => {
  const context = useContext(TaskEventContext);
  if (context === undefined) {
    throw new Error("useTaskEvents must be used within a TaskEventProvider");
  }
  return context;
};
