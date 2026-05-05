//Ankush & james
import React, { createContext, useCallback, useContext, useState } from "react";

type CreateType = "task" | "event" | null;

interface CreateModalContextType {
  activeCreate: CreateType;
  openCreate: (type: "task" | "event") => void;
  closeCreate: () => void;
}

const CreateModalContext = createContext<CreateModalContextType | undefined>(undefined);

export const CreateModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCreate, setActiveCreate] = useState<CreateType>(null);

  const openCreate = useCallback((type: "task" | "event") => {
    setActiveCreate(type);
  }, []);

  const closeCreate = useCallback(() => {
    setActiveCreate(null);
  }, []);

  return (
    <CreateModalContext.Provider value={{ activeCreate, openCreate, closeCreate }}>
      {children}
    </CreateModalContext.Provider>
  );
};

export const useCreateModal = () => {
  const context = useContext(CreateModalContext);
  if (context === undefined) {
    throw new Error("useCreateModal must be used within a CreateModalProvider");
  }
  return context;
};
