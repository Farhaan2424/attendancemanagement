import React, { createContext, useState, useContext, useEffect } from 'react';

// Define the shape of the user context
interface UserContextType {
  user: any | null;
  setUser: (userData: any) => void;
  clearUser: () => void;
}

// Create the context with a default null value
const UserContext = createContext<UserContextType | null>(null);

// Define the UserProvider component to manage user state
export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<any | null>(null);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const setUser = (userData: any) => {
    setUserState(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const clearUser = () => {
    setUserState(null);
    localStorage.removeItem("user");
  };

  const value = {
    user,
    setUser,
    clearUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
