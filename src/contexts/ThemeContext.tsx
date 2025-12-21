import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./AuthContext";

type Theme = "light" | "dark" | "auto";
type Language = "fr" | "en" | "es" | "de";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>("light");
  const [language, setLanguageState] = useState<Language>("fr");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from Firestore when user logs in
  useEffect(() => {
    const loadPreferences = async () => {
      if (!currentUser) {
        // If not logged in, use localStorage
        const savedTheme = localStorage.getItem("theme") as Theme;
        const savedLanguage = localStorage.getItem("language") as Language;
        if (savedTheme) setThemeState(savedTheme);
        if (savedLanguage) setLanguageState(savedLanguage);
        setIsLoaded(true);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const userTheme = (data.theme || "light") as Theme;
          const userLanguage = (data.language || "fr") as Language;
          setThemeState(userTheme);
          setLanguageState(userLanguage);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
        // Fallback to localStorage
        const savedTheme = localStorage.getItem("theme") as Theme;
        const savedLanguage = localStorage.getItem("language") as Language;
        if (savedTheme) setThemeState(savedTheme);
        if (savedLanguage) setLanguageState(savedLanguage);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, [currentUser]);

  useEffect(() => {
    if (!isLoaded) return;

    // Function to determine theme based on time
    const getThemeByTime = () => {
      const hour = new Date().getHours();
      // Dark mode from 18:00 (6 PM) to 06:00 (6 AM) - 12 hours
      // Light mode from 06:00 (6 AM) to 18:00 (6 PM) - 12 hours
      return (hour >= 18 || hour < 6) ? "dark" : "light";
    };

    // Determine effective theme
    let newEffectiveTheme: "light" | "dark" = "light";

    if (theme === "auto") {
      // Use time-based automatic theme (12-hour cycle)
      newEffectiveTheme = getThemeByTime();
    } else {
      newEffectiveTheme = theme as "light" | "dark";
    }

    setEffectiveTheme(newEffectiveTheme);

    // Apply theme to document
    if (newEffectiveTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Set up interval to check time every minute when in auto mode
    if (theme === "auto") {
      const interval = setInterval(() => {
        const timeBasedTheme = getThemeByTime();
        if (timeBasedTheme !== newEffectiveTheme) {
          setEffectiveTheme(timeBasedTheme);
          if (timeBasedTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [theme, isLoaded]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    // Save to Firestore if user is logged in
    if (currentUser) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          theme: newTheme,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error saving theme preference:", error);
      }
    }
  };

  const setLanguage = async (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("language", newLanguage);

    // Save to Firestore if user is logged in
    if (currentUser) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          language: newLanguage,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, language, setLanguage, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}