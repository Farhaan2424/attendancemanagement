import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode
} from 'react';
import { useUser } from './UserContext'; // Adjust the path if needed

// Type for user object (you might want to improve this typing)
interface UserType {
  role?: { name: string };
  // ...add additional user fields as needed
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserType | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  isAuthReady: boolean;
}

// Create the context with default null value
const AuthContext = createContext<AuthContextType | null>(null);

// Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { clearUser } = useUser();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
        logout();
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsAuthReady(true);
    // Note: logout() will also clearUser which may trigger re-render if any consumer,
    // but that's fine. We always mark auth as ready after this check.
    // eslint-disable-next-line
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    clearUser(); // Clear user data from UserContext as well
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    isAuthReady
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
