import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService, userService } from '../services';
import { getApiError } from '../services/api';
import { User, Student, Hod } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  student: Student | null;
  hod: Hod | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [hod, setHod] = useState<Hod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsInitializing(false);
        return;
      }
      const res = await userService.getMe();
      const data = res.data.data;
      setUser(data.user);
      setStudent(data.student || null);
      setHod(data.hod || null);
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setStudent(null);
      setHod(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login({ email, password });
      const { access_token, refresh_token } = res.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      await refreshUser();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      await authService.register(data);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setStudent(null);
    setHod(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        hod,
        isLoading,
        isInitializing,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
