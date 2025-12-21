import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface UserData {
  uid: string;
  name: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  fieldOfStudy?: string;
  role?: string;
  profilePicture?: string;
  biography?: string;
  banned?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, displayName: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      // Mark this as a new signup to skip profile checks
      sessionStorage.setItem('justSignedUp', 'true');
    }
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password).then(() => {});
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check if this is a fresh signup
        const justSignedUp = sessionStorage.getItem('justSignedUp') === 'true';
        
        if (justSignedUp) {
          // For new signups, don't load or create profile - let them go to complete-profile
          console.log('New signup detected - skipping profile load');
          setUserData(null);
          setLoading(false);
          // Don't clear the flag here - it will be cleared in CompleteProfilePage
          return;
        }
        
        // Load user data from Firestore (for logins and existing users)
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data() as UserData);
          } else {
            // Legacy user detected - user exists in Auth but not in Firestore
            // This happens for users created before the CompleteProfile system
            // Create a basic profile automatically for them
            console.log('Legacy user detected, creating default profile...');
            
            const defaultUserData = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
              role: 'student',
              fieldOfStudy: 'Non spécifié',
              level: 1,
              score: 0,
              profilePicture: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            // Save the default profile to Firestore
            await setDoc(userDocRef, defaultUserData);
            setUserData(defaultUserData as UserData);
            console.log('Default profile created for legacy user');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          setUserData(null);
        }
      } else {
        // User is logged out, clear userData
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    logout,
    refreshUserData: async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data() as UserData);
          } else {
            // User hasn't completed profile yet - this is expected for new users
            setUserData(null);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          setUserData(null);
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}