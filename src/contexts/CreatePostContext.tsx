import { createContext, useContext, useState, ReactNode } from "react";

interface CreatePostContextType {
  isOpen: boolean;
  openCreatePost: () => void;
  closeCreatePost: () => void;
}

const CreatePostContext = createContext<CreatePostContextType | undefined>(undefined);

export function CreatePostProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCreatePost = () => setIsOpen(true);
  const closeCreatePost = () => setIsOpen(false);

  return (
    <CreatePostContext.Provider value={{ isOpen, openCreatePost, closeCreatePost }}>
      {children}
    </CreatePostContext.Provider>
  );
}

export function useCreatePost() {
  const context = useContext(CreatePostContext);
  if (context === undefined) {
    throw new Error("useCreatePost must be used within a CreatePostProvider");
  }
  return context;
}
